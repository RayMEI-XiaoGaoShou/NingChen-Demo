import { useEffect } from 'react'

export const AUTO_PAGE_SCROLL_SPEEDS = {
    prologue: 20,
    characterBios: 12,
} as const

interface AutoPageScrollOptions {
    enabled?: boolean
    pixelsPerSecond: number
    startDelayMs?: number
}

export function getAutoScrollTargetY({
    startY,
    elapsedMs,
    pixelsPerSecond,
}: {
    startY: number
    elapsedMs: number
    pixelsPerSecond: number
}) {
    return startY + (elapsedMs / 1000) * pixelsPerSecond
}

export function useAutoPageScroll({
    enabled = true,
    pixelsPerSecond,
    startDelayMs = 1200,
}: AutoPageScrollOptions) {
    useEffect(() => {
        if (!enabled || pixelsPerSecond <= 0) return
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

        let frameId = 0
        let timeoutId = 0
        let startTimestamp: number | null = null
        let startY = 0
        let pausedByPlayer = false

        const cancelFrame = () => {
            if (frameId) window.cancelAnimationFrame(frameId)
            frameId = 0
        }

        const pauseForPlayer = () => {
            pausedByPlayer = true
            cancelFrame()
            if (timeoutId) window.clearTimeout(timeoutId)
        }

        const pauseForScrollbarDrag = (event: MouseEvent) => {
            if (event.clientX >= document.documentElement.clientWidth) pauseForPlayer()
        }

        const isAtPageEnd = () =>
            window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2

        const step = (timestamp: number) => {
            if (pausedByPlayer || isAtPageEnd()) return

            if (startTimestamp === null) {
                startTimestamp = timestamp
                startY = window.scrollY
            }

            window.scrollTo({
                top: getAutoScrollTargetY({
                    startY,
                    elapsedMs: timestamp - startTimestamp,
                    pixelsPerSecond,
                }),
                left: 0,
                behavior: 'auto',
            })

            frameId = window.requestAnimationFrame(step)
        }

        const beginAutoScroll = () => {
            if (pausedByPlayer || isAtPageEnd()) return
            frameId = window.requestAnimationFrame(step)
        }

        const pauseEvents = ['wheel', 'touchstart', 'keydown'] as const
        pauseEvents.forEach(eventName => {
            window.addEventListener(eventName, pauseForPlayer, { passive: true })
        })
        window.addEventListener('mousedown', pauseForScrollbarDrag)
        timeoutId = window.setTimeout(beginAutoScroll, startDelayMs)

        return () => {
            pauseEvents.forEach(eventName => {
                window.removeEventListener(eventName, pauseForPlayer)
            })
            window.removeEventListener('mousedown', pauseForScrollbarDrag)
            cancelFrame()
            if (timeoutId) window.clearTimeout(timeoutId)
        }
    }, [enabled, pixelsPerSecond, startDelayMs])
}
