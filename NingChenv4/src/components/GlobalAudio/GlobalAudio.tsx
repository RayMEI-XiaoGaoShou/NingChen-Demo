import { useCallback, useEffect, useRef } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { useMediaStore } from '../../stores/mediaStore'
import { getBgmTrackPath, type BgmTrackKey } from '../../data/mediaAssets'

export const BGM_BASE_VOLUME = 0.34
export const BGM_DUCKED_VOLUME = 0.16
export const BGM_DUCK_FADE_MS = 160
export const BGM_RESTORE_FADE_MS = 320

function getTargetBgmVolume(isVoiceDuckingActive: boolean) {
    return isVoiceDuckingActive ? BGM_DUCKED_VOLUME : BGM_BASE_VOLUME
}

function resolveTrack(
    prologueStep: string,
    helpOverlayOpen: boolean,
    currentPhase: string,
): BgmTrackKey {
    if (
        helpOverlayOpen ||
        prologueStep === 'COVER' ||
        prologueStep === 'PROLOGUE' ||
        prologueStep === 'GAMEPLAY_GUIDE' ||
        prologueStep === 'CHARACTER_BIOS'
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
        case 'EMPRESS_REPLY':
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
        voiceDuckingCount,
        setCurrentTrack,
        setAudioReady,
    } = useMediaStore()

    const audioRef = useRef<HTMLAudioElement | null>(null)
    const readyRef = useRef(false)
    const mutedRef = useRef(isMuted)
    const trackRef = useRef<BgmTrackKey | null>(currentTrack)
    const voiceDuckingActiveRef = useRef(voiceDuckingCount > 0)
    const volumeAnimationRef = useRef<number | null>(null)

    const cancelVolumeAnimation = useCallback(() => {
        if (volumeAnimationRef.current === null) return
        window.cancelAnimationFrame(volumeAnimationRef.current)
        volumeAnimationRef.current = null
    }, [])

    const applyBgmVolume = useCallback((targetVolume: number, durationMs: number) => {
        const audio = audioRef.current
        if (!audio) return

        cancelVolumeAnimation()

        const clampedTarget = Math.max(0, Math.min(1, targetVolume))
        const startVolume = audio.volume
        if (durationMs <= 0 || Math.abs(startVolume - clampedTarget) < 0.001) {
            audio.volume = clampedTarget
            return
        }

        const startedAt = window.performance.now()
        const tick = (now: number) => {
            const progress = Math.min(1, (now - startedAt) / durationMs)
            const easedProgress = 1 - Math.pow(1 - progress, 3)
            audio.volume = startVolume + (clampedTarget - startVolume) * easedProgress

            if (progress < 1) {
                volumeAnimationRef.current = window.requestAnimationFrame(tick)
            } else {
                volumeAnimationRef.current = null
            }
        }

        volumeAnimationRef.current = window.requestAnimationFrame(tick)
    }, [cancelVolumeAnimation])

    useEffect(() => {
        mutedRef.current = isMuted
    }, [isMuted])

    useEffect(() => {
        trackRef.current = currentTrack
    }, [currentTrack])

    useEffect(() => {
        const isVoiceDuckingActive = voiceDuckingCount > 0
        voiceDuckingActiveRef.current = isVoiceDuckingActive
        applyBgmVolume(
            getTargetBgmVolume(isVoiceDuckingActive),
            isVoiceDuckingActive ? BGM_DUCK_FADE_MS : BGM_RESTORE_FADE_MS,
        )
    }, [applyBgmVolume, voiceDuckingCount])

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
        audio.volume = getTargetBgmVolume(voiceDuckingActiveRef.current)
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
            cancelVolumeAnimation()
            audio.removeEventListener('canplay', handleCanPlay)
            audio.removeEventListener('canplaythrough', handleCanPlay)
            audio.pause()
        }
    }, [cancelVolumeAnimation])

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
            cancelVolumeAnimation()
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

        applyBgmVolume(getTargetBgmVolume(voiceDuckingActiveRef.current), 0)
        attemptPlayback()
    }, [applyBgmVolume, cancelVolumeAnimation, currentTrack, isMuted, playbackRequestToken, setAudioReady])

    return <audio ref={audioRef} style={{ display: 'none' }} />
}
