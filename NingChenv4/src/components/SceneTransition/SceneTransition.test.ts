// @ts-expect-error Vitest runs this contract test in Node; the app tsconfig omits Node types.
import { readFileSync } from 'fs'
import { describe, expect, it, vi } from 'vitest'
import {
    SCENE_TRANSITION_TIMINGS,
    createSceneTransitionController,
    resolveSceneTransitionTiming,
    type SceneTransitionState,
} from './SceneTransition'

const sceneTransitionStyles = readFileSync(new URL('./SceneTransition.css', import.meta.url), 'utf8')

function cssRule(selector: string) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const match = sceneTransitionStyles.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`))
    return match?.[1] ?? ''
}

describe('SceneTransition controller', () => {
    it('starts covering, calls onCovered once at the covered point, then returns idle', async () => {
        vi.useFakeTimers()
        const states: SceneTransitionState[] = []
        const onCovered = vi.fn()
        const controller = createSceneTransitionController({
            setState: state => states.push(state),
        })

        const transition = controller.runSceneTransition({
            variant: 'to-empress-letter',
            onCovered,
        })

        expect(states.at(-1)).toEqual({ phase: 'covering', variant: 'to-empress-letter' })
        expect(onCovered).not.toHaveBeenCalled()

        await vi.advanceTimersByTimeAsync(SCENE_TRANSITION_TIMINGS['to-empress-letter'].coverMs)

        expect(states.at(-1)).toEqual({ phase: 'covered', variant: 'to-empress-letter' })
        expect(onCovered).toHaveBeenCalledTimes(1)

        await vi.advanceTimersByTimeAsync(
            SCENE_TRANSITION_TIMINGS['to-empress-letter'].holdMs +
            SCENE_TRANSITION_TIMINGS['to-empress-letter'].revealMs,
        )
        await transition

        expect(states.at(-1)).toEqual({ phase: 'idle' })
        vi.useRealTimers()
    })

    it('keeps overlapping requests on the active transition instead of firing a second onCovered', async () => {
        vi.useFakeTimers()
        const onCovered = vi.fn()
        const skippedCovered = vi.fn()
        const controller = createSceneTransitionController({
            setState: () => undefined,
        })

        const first = controller.runSceneTransition({
            variant: 'from-empress-letter',
            onCovered,
        })
        const second = controller.runSceneTransition({
            variant: 'to-empress-letter',
            onCovered: skippedCovered,
        })

        expect(second).toBe(first)

        await vi.advanceTimersByTimeAsync(SCENE_TRANSITION_TIMINGS['from-empress-letter'].coverMs)

        expect(onCovered).toHaveBeenCalledTimes(1)
        expect(skippedCovered).not.toHaveBeenCalled()

        await vi.runAllTimersAsync()
        await first
        vi.useRealTimers()
    })

    it('uses shorter reduced-motion timing while preserving the covered callback', () => {
        const normal = resolveSceneTransitionTiming('to-empress-letter', false)
        const reduced = resolveSceneTransitionTiming('to-empress-letter', true)

        expect(reduced.coverMs).toBeLessThan(normal.coverMs)
        expect(reduced.holdMs).toBeGreaterThan(0)
        expect(reduced.revealMs).toBeLessThan(normal.revealMs)
    })

    it('uses slower narrated pacing for empress transitions', () => {
        expect(SCENE_TRANSITION_TIMINGS['to-empress-letter']).toEqual({
            coverMs: 620,
            holdMs: 260,
            revealMs: 820,
        })
        expect(SCENE_TRANSITION_TIMINGS['from-empress-letter']).toEqual({
            coverMs: 580,
            holdMs: 250,
            revealMs: 770,
        })
        expect(SCENE_TRANSITION_TIMINGS['to-settlement']).toEqual({
            coverMs: 560,
            holdMs: 240,
            revealMs: 760,
        })

        const toEmpressTotal = Object.values(SCENE_TRANSITION_TIMINGS['to-empress-letter'])
            .reduce((sum, value) => sum + value, 0)
        const fromEmpressTotal = Object.values(SCENE_TRANSITION_TIMINGS['from-empress-letter'])
            .reduce((sum, value) => sum + value, 0)
        const toSettlementTotal = Object.values(SCENE_TRANSITION_TIMINGS['to-settlement'])
            .reduce((sum, value) => sum + value, 0)
        const reduced = resolveSceneTransitionTiming('to-empress-letter', true)
        const reducedTotal = reduced.coverMs + reduced.holdMs + reduced.revealMs

        expect(toEmpressTotal).toBe(1700)
        expect(fromEmpressTotal).toBe(1600)
        expect(toSettlementTotal).toBe(1560)
        expect(reducedTotal).toBeLessThan(500)
    })
})

describe('SceneTransition visual layering contract', () => {
    it('keeps CSS timing variables synchronized with the narrated pacing', () => {
        expect(cssRule('.scene-transition')).toContain('--scene-cover-ms: 620ms')
        expect(cssRule('.scene-transition')).toContain('--scene-hold-ms: 260ms')
        expect(cssRule('.scene-transition')).toContain('--scene-reveal-ms: 820ms')
        expect(cssRule('.scene-transition--from-empress-letter')).toContain('--scene-cover-ms: 580ms')
        expect(cssRule('.scene-transition--from-empress-letter')).toContain('--scene-hold-ms: 250ms')
        expect(cssRule('.scene-transition--from-empress-letter')).toContain('--scene-reveal-ms: 770ms')
        expect(cssRule('.scene-transition--to-settlement')).toContain('--scene-cover-ms: 560ms')
        expect(cssRule('.scene-transition--to-settlement')).toContain('--scene-hold-ms: 240ms')
        expect(cssRule('.scene-transition--to-settlement')).toContain('--scene-reveal-ms: 760ms')
    })

    it('lets the back cloud read through instead of being washed out by the front cloud', () => {
        expect(cssRule('.scene-transition__cloud--back')).toContain('mix-blend-mode: normal')
        expect(cssRule('.scene-transition__cloud--back')).toContain('contrast(1.1) saturate(1.14) brightness(0.96)')
        expect(cssRule('.scene-transition__cloud--front')).toContain('mix-blend-mode: normal')
        expect(cssRule('.scene-transition__side')).toContain('mix-blend-mode: normal')
        expect(cssRule('.scene-transition__cloud--front')).not.toContain('mix-blend-mode: screen')
        expect(cssRule('.scene-transition__side')).not.toContain('mix-blend-mode: screen')

        expect(cssRule('.scene-transition--covered .scene-transition__cloud--front')).toContain('opacity: 0.58')
        expect(cssRule('.scene-transition--covered .scene-transition__side')).toContain('opacity: 0.38')
        expect(sceneTransitionStyles).toContain('opacity: 0.58;')
        expect(sceneTransitionStyles).toContain('opacity: 0.38;')
    })

    it('keeps mist layers synchronized without cover delays', () => {
        expect(cssRule('.scene-transition--covering .scene-transition__cloud--front'))
            .toContain('animation-delay: 0ms')
        expect(cssRule('.scene-transition--covering .scene-transition__cloud--front'))
            .toContain('animation-duration: calc(var(--scene-cover-ms) * 0.95)')
        expect(cssRule('.scene-transition--covering .scene-transition__side--left'))
            .toContain('animation-delay: 0ms')
        expect(cssRule('.scene-transition--covering .scene-transition__side--right'))
            .toContain('animation-delay: 0ms')
        expect(cssRule('.scene-transition--covering .scene-transition__side--left'))
            .toContain('animation-duration: calc(var(--scene-cover-ms) * 0.96)')
        expect(cssRule('.scene-transition--revealing .scene-transition__cloud--front'))
            .toContain('animation-duration: calc(var(--scene-reveal-ms) * 0.88)')
        expect(cssRule('.scene-transition--revealing .scene-transition__side--left'))
            .toContain('animation-duration: calc(var(--scene-reveal-ms) * 0.86)')
        expect(sceneTransitionStyles).toContain('30% {')
        expect(sceneTransitionStyles).not.toContain('42% {')
    })
})
