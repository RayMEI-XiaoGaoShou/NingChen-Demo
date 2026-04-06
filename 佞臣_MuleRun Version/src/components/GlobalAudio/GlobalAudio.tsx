import { useEffect, useRef } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { useMediaStore } from '../../stores/mediaStore'
import { getBgmTrackPath, type BgmTrackKey } from '../../data/mediaAssets'

function resolveTrack(
    prologueStep: string,
    helpOverlayOpen: boolean,
    currentPhase: string,
): BgmTrackKey {
    if (
        helpOverlayOpen ||
        prologueStep === 'COVER' ||
        prologueStep === 'PROLOGUE' ||
        prologueStep === 'GAMEPLAY_GUIDE'
    ) {
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
        const audio = audioRef.current
        if (!audio) return

        audio.loop = true
        audio.preload = 'auto'
        audio.volume = 0.52
        audio.autoplay = true
        audio.setAttribute('playsinline', 'true')

        const handleCanPlay = () => {
            if (!mutedRef.current && !readyRef.current) {
                attemptPlayback()
            }
        }

        audio.addEventListener('canplay', handleCanPlay)
        audio.addEventListener('canplaythrough', handleCanPlay)

        return () => {
            audio.removeEventListener('canplay', handleCanPlay)
            audio.removeEventListener('canplaythrough', handleCanPlay)
            audio.pause()
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

        const handleVisibilityResume = () => {
            if (document.visibilityState === 'visible' && !mutedRef.current && !readyRef.current) {
                attemptPlayback()
            }
        }

        window.addEventListener('pointerdown', handlePointerDown, { passive: true })
        window.addEventListener('keydown', handlePointerDown)
        window.addEventListener('focus', handlePointerDown)
        window.addEventListener('pageshow', handlePointerDown)
        document.addEventListener('visibilitychange', handleVisibilityResume)
        return () => {
            window.removeEventListener('pointerdown', handlePointerDown)
            window.removeEventListener('keydown', handlePointerDown)
            window.removeEventListener('focus', handlePointerDown)
            window.removeEventListener('pageshow', handlePointerDown)
            document.removeEventListener('visibilitychange', handleVisibilityResume)
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

        const nextSrc = getBgmTrackPath(currentTrack)
        const resolvedSrc = new URL(nextSrc, window.location.origin).toString()
        if (audio.src !== resolvedSrc) {
            audio.src = nextSrc
            audio.load()
        }

        attemptPlayback()
    }, [currentTrack, isMuted, playbackRequestToken, setAudioReady])

    return <audio ref={audioRef} style={{ display: 'none' }} />
}
