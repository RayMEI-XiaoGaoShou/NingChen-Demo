import { useCallback, useEffect, useRef } from 'react'
import { stopAllGameSfx } from '../../audio/gameSfx'
import { useGameStore } from '../../stores/gameStore'
import { useMediaStore, type BgmSceneContext } from '../../stores/mediaStore'
import { getBgmTrackPath, type BgmTrackKey } from '../../data/mediaAssets'

export const BGM_BASE_VOLUME = 0.34
export const BGM_DUCKED_VOLUME = 0.16
export const BGM_DUCK_FADE_MS = 160
export const BGM_RESTORE_FADE_MS = 320
export const BGM_TRACK_FADE_MS = 600

function getTargetBgmVolume(isVoiceDuckingActive: boolean) {
    return isVoiceDuckingActive ? BGM_DUCKED_VOLUME : BGM_BASE_VOLUME
}

interface ResolveTrackInput {
    prologueStep: string
    helpOverlayOpen: boolean
    currentPhase: string
    bgmSceneContext: BgmSceneContext | null
}

export function resolveTrack({
    prologueStep,
    helpOverlayOpen,
    currentPhase,
    bgmSceneContext,
}: ResolveTrackInput): BgmTrackKey | null {
    if (prologueStep === 'OPENING_CINEMATIC') {
        return null
    }

    if (
        helpOverlayOpen ||
        prologueStep === 'COVER' ||
        prologueStep === 'GAMEPLAY_GUIDE' ||
        prologueStep === 'CHARACTER_BIOS'
    ) {
        return 'coverEnding'
    }

    switch (currentPhase) {
        case 'PROLOGUE':
            return prologueStep === 'INGAME' ? 'roundCourtOverview' : 'coverEnding'
        case 'ROUND_START':
            return 'roundCourtOverview'
        case 'COURT_OBSERVE':
            if (bgmSceneContext === 'court-focus' || bgmSceneContext === 'court-scheme') {
                return 'courtDetailScheme'
            }
            if (bgmSceneContext === 'external-focus' || bgmSceneContext === 'external-scheme') {
                return 'externalDetailScheme'
            }
            return 'roundCourtOverview'
        case 'SCHEME_FEEDBACK':
            return 'schemeFeedback'
        case 'DOWAGER_CREATION':
        case 'EMPRESS_LETTER':
            return 'empressQuestion'
        case 'DOWAGER_REVIEW':
        case 'EMPRESS_REPLY':
            return 'empressReply'
        case 'SETTLEMENT':
            return 'settlement'
        case 'ENDING':
        default:
            return 'coverEnding'
    }
}

export function GlobalAudio() {
    const currentPhase = useGameStore(state => state.currentPhase)
    const prologueStep = useGameStore(state => state.prologueStep)
    const helpOverlayOpen = useGameStore(state => state.helpOverlayOpen)
    const {
        isMuted,
        currentTrack,
        bgmSceneContext,
        playbackRequestToken,
        voiceDuckingCount,
        sfxPlaybackLockCount,
        setCurrentTrack,
        setAudioReady,
    } = useMediaStore()

    const audioRef = useRef<HTMLAudioElement | null>(null)
    const readyRef = useRef(false)
    const mutedRef = useRef(isMuted)
    const audioBlockedRef = useRef(sfxPlaybackLockCount > 0)
    const trackRef = useRef<BgmTrackKey | null>(currentTrack)
    const voiceDuckingActiveRef = useRef(voiceDuckingCount > 0)
    const volumeAnimationRef = useRef<number | null>(null)
    const trackTransitionActiveRef = useRef(false)

    const cancelVolumeAnimation = useCallback(() => {
        if (volumeAnimationRef.current === null) return
        window.cancelAnimationFrame(volumeAnimationRef.current)
        volumeAnimationRef.current = null
    }, [])

    const applyBgmVolume = useCallback((targetVolume: number, durationMs: number, onComplete?: () => void) => {
        const audio = audioRef.current
        if (!audio) return

        cancelVolumeAnimation()

        const clampedTarget = Math.max(0, Math.min(1, targetVolume))
        const startVolume = audio.volume
        if (durationMs <= 0 || Math.abs(startVolume - clampedTarget) < 0.001) {
            audio.volume = clampedTarget
            onComplete?.()
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
                onComplete?.()
            }
        }

        volumeAnimationRef.current = window.requestAnimationFrame(tick)
    }, [cancelVolumeAnimation])

    useEffect(() => {
        mutedRef.current = isMuted
        if (isMuted) stopAllGameSfx()
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
        if (!audio || !track || mutedRef.current || audioBlockedRef.current || trackTransitionActiveRef.current) return

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
        const isAudioBlocked = sfxPlaybackLockCount > 0
        audioBlockedRef.current = isAudioBlocked

        const audio = audioRef.current
        if (!audio) return

        if (isAudioBlocked) {
            cancelVolumeAnimation()
            audio.pause()
            readyRef.current = false
            setAudioReady(false)
            return
        }

        if (!isMuted && currentTrack) {
            attemptPlayback()
        }
    }, [cancelVolumeAnimation, currentTrack, isMuted, setAudioReady, sfxPlaybackLockCount])

    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return

        audio.loop = true
        audio.preload = 'auto'
        audio.volume = getTargetBgmVolume(voiceDuckingActiveRef.current)
        audio.autoplay = true
        audio.setAttribute('playsinline', 'true')

        const handleCanPlay = () => {
            if (!mutedRef.current && !audioBlockedRef.current && !readyRef.current) {
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
        const resolvedTrack = resolveTrack({
            prologueStep,
            helpOverlayOpen,
            currentPhase,
            bgmSceneContext,
        })
        setCurrentTrack(resolvedTrack)
    }, [bgmSceneContext, currentPhase, helpOverlayOpen, prologueStep, setCurrentTrack])

    useEffect(() => {
        const handlePointerDown = () => {
            if (!mutedRef.current && !audioBlockedRef.current && !readyRef.current) {
                attemptPlayback()
            }
        }

        const handleVisibilityResume = () => {
            if (document.visibilityState === 'visible' && !mutedRef.current && !audioBlockedRef.current && !readyRef.current) {
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
        if (!audio) return

        if (!currentTrack) {
            cancelVolumeAnimation()
            audio.pause()
            readyRef.current = false
            setAudioReady(false)
            return
        }

        if (isMuted || sfxPlaybackLockCount > 0) {
            cancelVolumeAnimation()
            audio.pause()
            readyRef.current = false
            setAudioReady(false)
            return
        }

        const nextSrc = getBgmTrackPath(currentTrack)
        const resolvedSrc = new URL(nextSrc, window.location.origin).toString()
        if (audio.src !== resolvedSrc) {
            const switchTrack = () => {
                const activeAudio = audioRef.current
                if (!activeAudio || trackRef.current !== currentTrack || mutedRef.current || audioBlockedRef.current) {
                    trackTransitionActiveRef.current = false
                    return
                }

                activeAudio.src = nextSrc
                activeAudio.load()
                activeAudio.volume = 0
                trackTransitionActiveRef.current = false
                attemptPlayback()
                applyBgmVolume(getTargetBgmVolume(voiceDuckingActiveRef.current), BGM_TRACK_FADE_MS)
            }

            if (readyRef.current && !audio.paused && audio.volume > 0.001) {
                trackTransitionActiveRef.current = true
                applyBgmVolume(0, BGM_TRACK_FADE_MS, switchTrack)
            } else {
                trackTransitionActiveRef.current = true
                switchTrack()
            }
            return
        }

        applyBgmVolume(getTargetBgmVolume(voiceDuckingActiveRef.current), 0)
        attemptPlayback()
    }, [applyBgmVolume, cancelVolumeAnimation, currentTrack, isMuted, playbackRequestToken, setAudioReady, sfxPlaybackLockCount])

    return <audio ref={audioRef} style={{ display: 'none' }} />
}
