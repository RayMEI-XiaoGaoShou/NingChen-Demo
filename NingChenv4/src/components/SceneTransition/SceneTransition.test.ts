// @ts-expect-error Vitest runs this contract test in Node; the app tsconfig omits Node types.
import { readFileSync } from 'fs'
import { describe, expect, it, vi } from 'vitest'
import {
    SCENE_TRANSITION_TIMINGS,
    createSceneTransitionController,
    resolveSceneTransitionTiming,
    type SceneTransitionState,
} from './SceneTransition'

const sceneTransitionStyles = readFileSync(new URL('./SceneTransition.css', import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const sceneTransitionSource = readFileSync(new URL('./SceneTransition.tsx', import.meta.url), 'utf8')

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
        expect(SCENE_TRANSITION_TIMINGS['north-court-entry']).toEqual({
            coverMs: 760,
            holdMs: 280,
            revealMs: 1000,
        })
        expect(SCENE_TRANSITION_TIMINGS['north-dark-cloud']).toEqual({
            coverMs: 500,
            holdMs: 180,
            revealMs: 650,
        })

        const toEmpressTotal = Object.values(SCENE_TRANSITION_TIMINGS['to-empress-letter'])
            .reduce((sum, value) => sum + value, 0)
        const fromEmpressTotal = Object.values(SCENE_TRANSITION_TIMINGS['from-empress-letter'])
            .reduce((sum, value) => sum + value, 0)
        const toSettlementTotal = Object.values(SCENE_TRANSITION_TIMINGS['to-settlement'])
            .reduce((sum, value) => sum + value, 0)
        const northCourtEntryTotal = Object.values(SCENE_TRANSITION_TIMINGS['north-court-entry'])
            .reduce((sum, value) => sum + value, 0)
        const northDarkCloudTotal = Object.values(SCENE_TRANSITION_TIMINGS['north-dark-cloud'])
            .reduce((sum, value) => sum + value, 0)
        const reduced = resolveSceneTransitionTiming('to-empress-letter', true)
        const reducedTotal = reduced.coverMs + reduced.holdMs + reduced.revealMs

        expect(toEmpressTotal).toBe(1700)
        expect(fromEmpressTotal).toBe(1600)
        expect(toSettlementTotal).toBe(1560)
        expect(northCourtEntryTotal).toBe(2040)
        expect(northDarkCloudTotal).toBe(1330)
        expect(northDarkCloudTotal).toBeLessThan(toSettlementTotal)
        expect(reducedTotal).toBeLessThan(500)
    })
})

describe('SceneTransition visual layering contract', () => {
    it('locks page scrolling while a scene transition overlay is mounted', () => {
        expect(sceneTransitionStyles).toContain('html:has(.scene-transition),')
        expect(sceneTransitionStyles).toContain('body:has(.scene-transition)')
        expect(cssRule('body:has(.scene-transition)')).toContain('overflow: hidden')
    })

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
        expect(cssRule('.scene-transition--north-court-entry')).toContain('--scene-cover-ms: 760ms')
        expect(cssRule('.scene-transition--north-court-entry')).toContain('--scene-hold-ms: 280ms')
        expect(cssRule('.scene-transition--north-court-entry')).toContain('--scene-reveal-ms: 1000ms')
        expect(cssRule('.scene-transition--north-court-entry')).toContain("--scene-left-door-art: url('/images/ui/scene-transition/north-court-entry-left-door.webp')")
        expect(cssRule('.scene-transition--north-court-entry')).toContain("--scene-right-door-art: url('/images/ui/scene-transition/north-court-entry-right-door.webp')")
        expect(cssRule('.scene-transition--north-court-entry')).toContain("--scene-foreground-art: url('/images/ui/scene-transition/north-court-entry-foreground.webp')")
        expect(cssRule('.scene-transition--north-court-entry')).toContain('--scene-door-height: calc(100dvh + 24px)')
        expect(cssRule('.scene-transition--north-court-entry')).toContain('--scene-door-bleed: -12px')
        expect(cssRule('.scene-transition--north-court-entry')).toContain('--scene-door-open-offset: 50%')
        expect(cssRule('.scene-transition--north-court-entry')).toContain('--scene-door-overlap: clamp(8px, 0.6vw, 16px)')
        expect(cssRule('.scene-transition--north-dark-cloud')).toContain('--scene-cover-ms: 500ms')
        expect(cssRule('.scene-transition--north-dark-cloud')).toContain('--scene-hold-ms: 180ms')
        expect(cssRule('.scene-transition--north-dark-cloud')).toContain('--scene-reveal-ms: 650ms')
    })

    it('reuses the empress cloud stack with black-gold north cloud assets', () => {
        expect(sceneTransitionSource).toContain("'north-dark-cloud'")
        expect(sceneTransitionSource).toContain("state.variant === 'north-court-entry'")
        expect(cssRule('.scene-transition')).toContain("--scene-cloud-back-art: url('/images/ui/scene-transition/scene-cloud-back.webp')")
        expect(cssRule('.scene-transition')).toContain("--scene-cloud-front-art: url('/images/ui/scene-transition/scene-cloud-front.webp')")
        expect(cssRule('.scene-transition--north-dark-cloud')).toContain("--scene-cloud-back-art: url('/images/ui/scene-transition/north-dark-cloud-back.webp')")
        expect(cssRule('.scene-transition--north-dark-cloud')).toContain("--scene-cloud-front-art: url('/images/ui/scene-transition/north-dark-cloud-front.webp')")
        expect(cssRule('.scene-transition__cloud--back')).toContain('background-image: var(--scene-cloud-back-art)')
        expect(cssRule('.scene-transition__cloud--front')).toContain('background-image: var(--scene-cloud-front-art)')
        expect(cssRule('.scene-transition__side')).toContain('background: var(--scene-cloud-front-art) center / cover no-repeat')
    })

    it('renders a dedicated north court entry stack instead of the generic cloud stack', () => {
        expect(sceneTransitionSource).toContain("state.variant === 'north-court-entry'")
        expect(sceneTransitionSource).toContain('scene-transition__north-scrim')
        expect(sceneTransitionSource).toContain('scene-transition__north-door scene-transition__north-door--left')
        expect(sceneTransitionSource).toContain('scene-transition__north-door scene-transition__north-door--right')
        expect(sceneTransitionSource).toContain('scene-transition__north-foreground')
        expect(sceneTransitionSource.indexOf('scene-transition__north-scrim'))
            .toBeLessThan(sceneTransitionSource.indexOf('scene-transition__north-door scene-transition__north-door--left'))
        expect(sceneTransitionSource.indexOf('scene-transition__north-door scene-transition__north-door--right'))
            .toBeLessThan(sceneTransitionSource.indexOf('scene-transition__north-foreground'))
    })

    it('uses independent height-driven left and right door sprites for north court entry', () => {
        expect(sceneTransitionStyles).toContain('.scene-transition__north-door')
        expect(sceneTransitionStyles).toContain('.scene-transition__north-door--left')
        expect(sceneTransitionStyles).toContain('.scene-transition__north-door--right')
        expect(cssRule('.scene-transition__north-door')).not.toContain('top: 50%')
        expect(cssRule('.scene-transition__north-door')).toContain('bottom: var(--scene-door-bleed)')
        expect(cssRule('.scene-transition__north-door')).toContain('height: var(--scene-door-height)')
        expect(cssRule('.scene-transition__north-door--left')).toContain('background-image: var(--scene-left-door-art)')
        expect(cssRule('.scene-transition__north-door--left')).toContain('left: 0')
        expect(cssRule('.scene-transition__north-door--left')).toContain('width: calc(var(--scene-door-height) * 866 / 1174)')
        expect(cssRule('.scene-transition__north-door--left')).toContain('transform: translate3d(calc(-1 * var(--scene-door-open-offset)), 0, 0)')
        expect(cssRule('.scene-transition__north-door--right')).toContain('background-image: var(--scene-right-door-art)')
        expect(cssRule('.scene-transition__north-door--right')).toContain('right: 0')
        expect(cssRule('.scene-transition__north-door--right')).toContain('width: calc(var(--scene-door-height) * 862 / 1170)')
        expect(cssRule('.scene-transition__north-door--right')).toContain('transform: translate3d(var(--scene-door-open-offset), 0, 0)')
        expect(sceneTransitionStyles).not.toContain('aspect-ratio: 748 / 1431')
        expect(sceneTransitionStyles).not.toContain('aspect-ratio: 732 / 1404')
        expect(sceneTransitionStyles).not.toContain('north-court-entry-gate.png')
        expect(sceneTransitionStyles).not.toContain('clip-path: polygon')
        expect(sceneTransitionStyles).toContain('sceneNorthDoorLeftCover')
        expect(sceneTransitionStyles).toContain('sceneNorthDoorRightReveal')
    })

    it('overlaps the north court entry doors while fully covered so no center gap can show through', () => {
        const leftCoveredRule = cssRule('.scene-transition--north-court-entry.scene-transition--covered .scene-transition__north-door--left')
        const rightCoveredRule = cssRule('.scene-transition--north-court-entry.scene-transition--covered .scene-transition__north-door--right')

        expect(leftCoveredRule).toContain('left: calc(50% + var(--scene-door-overlap))')
        expect(leftCoveredRule).toContain('transform: translate3d(-100%, 0, 0)')
        expect(rightCoveredRule).toContain('right: calc(50% + var(--scene-door-overlap))')
        expect(rightCoveredRule).toContain('transform: translate3d(100%, 0, 0)')
        expect(sceneTransitionStyles).toContain('--scene-door-overlap: clamp(8px, 0.6vw, 16px)')
        expect(sceneTransitionStyles).not.toContain('translate3d(0, 0, 0) scale(1.01)')
        expect(sceneTransitionStyles).not.toContain('translate3d(-100%, -50%, 0) scale(var(--scene-door-scale))')
        expect(sceneTransitionStyles).not.toContain('translate3d(100%, -50%, 0) scale(var(--scene-door-scale))')
    })

    it('uses a dedicated foreground frame and black scrim for the north court entry scene cut', () => {
        expect(cssRule('.scene-transition--north-court-entry')).toContain('background: transparent')
        expect(cssRule('.scene-transition__north-scrim')).toContain('inset: 0')
        expect(cssRule('.scene-transition__north-scrim')).toContain('z-index: 1')
        expect(cssRule('.scene-transition__north-scrim')).toContain('background: #000')
        expect(cssRule('.scene-transition__north-scrim')).toContain('opacity: 0')
        expect(cssRule('.scene-transition__north-foreground')).toContain('inset: 0')
        expect(cssRule('.scene-transition__north-foreground')).toContain('z-index: 6')
        expect(cssRule('.scene-transition__north-foreground')).toContain('background-image: var(--scene-foreground-art)')
        expect(cssRule('.scene-transition__north-foreground')).toContain('background-size: cover')
        expect(cssRule('.scene-transition--north-court-entry.scene-transition--covering .scene-transition__north-scrim'))
            .toContain('animation: sceneNorthScrimCover var(--scene-cover-ms) ease-out forwards')
        expect(cssRule('.scene-transition--north-court-entry.scene-transition--revealing .scene-transition__north-scrim'))
            .toContain('animation: sceneNorthScrimReveal var(--scene-reveal-ms) ease-in forwards')
        expect(sceneTransitionStyles).toContain('@keyframes sceneNorthScrimCover')
        expect(sceneTransitionStyles).toContain('to {\n        opacity: 1;')
        expect(sceneTransitionStyles).toContain('@keyframes sceneNorthScrimReveal')
        expect(sceneTransitionStyles).toContain('to {\n        opacity: 0;')
        expect(sceneTransitionStyles).not.toContain('sceneNorthEdgeCover')
        expect(sceneTransitionStyles).not.toContain('sceneNorthEdgeReveal')
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
