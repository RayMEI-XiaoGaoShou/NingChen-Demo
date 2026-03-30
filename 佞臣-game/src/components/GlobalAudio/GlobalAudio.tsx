import { useEffect, useRef } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { useMediaStore } from '../../stores/mediaStore'
import { getBgmTrackPath, type BgmTrackKey } from '../../data/mediaAssets'

function resolveTrack(
    prologueStep: string,
    helpOverlayOpen: boolean,
    currentPhase: string,
): BgmTrackKey {
    if (helpOverlayOpen || prologueStep === 'PROLOGUE' || prologueStep === 'GAMEPLAY_GUIDE') {
        return 'bgm4'
    }

    switch (currentPhase) {
        case 'ROUND_START':
        case 'COURT_OBSERVE':
            return 'bgm1'
        case 'SCHEME_PHASE':
        case 'SCHEME_FEEDBACK':
            return 'bgm2'
        case 'EMPRESS_LETTER':
            return 'bgm3'
        case 'SETTLEMENT':
        case 'ROUND_END':
        case 'ENDING':
        default:
            return 'bgm4'
    }
}

export function GlobalAudio() {
    const currentPhase = useGameStore(state => state.currentPhase)
    const prologueStep = useGameStore(state => state.prologueStep)
    const helpOverlayOpen = useGameStore(state => state.helpOverlayOpen)
    const {
        isMuted,
        currentTrack,
        playbackRequestToken,
        setCurrentTrack,
        setAudioReady,
    } = useMediaStore()

    const audioRef = useRef<HTMLAudioElement | null>(null)
    const readyRef = useRef(false)
    const mutedRef = useRef(isMuted)
    const trackRef = useRef<BgmTrackKey | null>(currentTrack)

    useEffect(() => {
        mutedRef.current = isMuted
    }, [isMuted])

    useEffect(() => {
        trackRef.current = currentTrack
    }, [currentTrack])

    const attemptPlayback = () => {
        const audio = audioRef.current
        const track = trackRef.current
        if (!audio || !track || mutedRef.current) return

        const nextSrc = getBgmTrackPath(track)
        const resolvedSrc = new URL(nextSrc, window.location.origin).toString()
        if (audio.src !== resolvedSrc) {
            audio.src = nextSrc
        }

        audio.play()
            .then(() => {
                readyRef.current = true
                setAudioReady(true)
            })
            .catch(() => {
                readyRef.current = false
                setAudioReady(false)
            })
    }

    useEffect(() => {
        audioRef.current = new Audio()
        audioRef.current.loop = true
        audioRef.current.preload = 'auto'
        audioRef.current.volume = 0.52

        return () => {
            audioRef.current?.pause()
            audioRef.current = null
        }
    }, [])

    useEffect(() => {
        setCurrentTrack(resolveTrack(prologueStep, helpOverlayOpen, currentPhase))
    }, [currentPhase, helpOverlayOpen, prologueStep, setCurrentTrack])

    useEffect(() => {
        const handlePointerDown = () => {
            if (!mutedRef.current && !readyRef.current) {
                attemptPlayback()
            }
        }

        window.addEventListener('pointerdown', handlePointerDown, { passive: true })
        return () => {
            window.removeEventListener('pointerdown', handlePointerDown)
        }
    }, [])

    useEffect(() => {
        const audio = audioRef.current
        if (!audio || !currentTrack) return

        if (isMuted) {
            audio.pause()
            readyRef.current = false
            setAudioReady(false)
            return
        }

        attemptPlayback()
    }, [currentTrack, isMuted, playbackRequestToken, setAudioReady])

    return null
}
