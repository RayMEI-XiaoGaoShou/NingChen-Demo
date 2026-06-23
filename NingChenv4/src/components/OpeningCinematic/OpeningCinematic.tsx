import { useCallback, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useGameStore } from '../../stores/gameStore'
import './OpeningCinematic.css'

const DEFAULT_OPENING_CINEMATIC_VIDEO_SRC = '/videos/ningchen-opening-20260623-web.mp4'
const configuredOpeningCinematicVideoSrc = import.meta.env.VITE_OPENING_CINEMATIC_VIDEO_SRC?.trim()

export const OPENING_CINEMATIC_VIDEO_SRC = configuredOpeningCinematicVideoSrc || DEFAULT_OPENING_CINEMATIC_VIDEO_SRC

interface OpeningCinematicProps {
    onComplete?: () => void
}

export function OpeningCinematic({ onComplete }: OpeningCinematicProps) {
    const advancePrologue = useGameStore(state => state.advancePrologue)
    const [showSkipConfirm, setShowSkipConfirm] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [playbackBlocked, setPlaybackBlocked] = useState(false)
    const videoRef = useRef<HTMLVideoElement | null>(null)
    const completeCinematic = useCallback(() => {
        if (onComplete) onComplete()
        else advancePrologue()
    }, [advancePrologue, onComplete])

    const tryPlayOpeningCinematic = useCallback(() => {
        const video = videoRef.current
        if (!video) return

        video.volume = 1
        void video.play()
            .then(() => {
                setPlaybackBlocked(false)
            })
            .catch(() => {
                setPlaybackBlocked(true)
                setIsLoading(false)
            })
    }, [])

    useLayoutEffect(() => {
        const video = videoRef.current
        if (!video || typeof window === 'undefined') return

        tryPlayOpeningCinematic()

        return undefined
    }, [tryPlayOpeningCinematic])

    const requestSkipConfirmation = useCallback(() => {
        setShowSkipConfirm(true)
    }, [])

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            requestSkipConfirmation()
        }
    }

    return (
        <div
            className="opening-cinematic-page"
            role="button"
            tabIndex={0}
            aria-label="片头动画，点击可选择是否跳过"
            onClick={requestSkipConfirmation}
            onKeyDown={handleKeyDown}
        >
            <video
                ref={videoRef}
                className="opening-cinematic-video"
                src={OPENING_CINEMATIC_VIDEO_SRC}
                autoPlay
                playsInline
                preload="auto"
                onCanPlay={() => {
                    setIsLoading(false)
                    tryPlayOpeningCinematic()
                }}
                onEnded={completeCinematic}
                onError={() => {
                    setIsLoading(false)
                    setPlaybackBlocked(true)
                }}
                onPlaying={() => {
                    setIsLoading(false)
                    setPlaybackBlocked(false)
                }}
                onWaiting={() => setIsLoading(true)}
            />

            {(isLoading || playbackBlocked) && (
                <div className={`opening-cinematic-loading${playbackBlocked ? ' playback-blocked' : ''}`} aria-live="polite">
                    {playbackBlocked ? (
                        <button
                            type="button"
                            className="opening-cinematic-play"
                            onClick={event => {
                                event.stopPropagation()
                                tryPlayOpeningCinematic()
                            }}
                        >
                            点击播放
                        </button>
                    ) : (
                        <div className="opening-cinematic-loading-copy">
                            <span>片头载入中</span>
                        </div>
                    )}
                </div>
            )}

            {showSkipConfirm && (
                <div className="opening-cinematic-confirm-layer" aria-hidden={false}>
                    <div
                        className="opening-cinematic-confirm"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="opening-cinematic-confirm-title"
                        onClick={event => event.stopPropagation()}
                    >
                        <h2 id="opening-cinematic-confirm-title">确认跳过</h2>
                        <div className="opening-cinematic-confirm-actions">
                            <button type="button" className="opening-cinematic-confirm-secondary" onClick={() => setShowSkipConfirm(false)}>
                                否
                            </button>
                            <button type="button" className="opening-cinematic-confirm-primary" onClick={completeCinematic}>
                                是
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
