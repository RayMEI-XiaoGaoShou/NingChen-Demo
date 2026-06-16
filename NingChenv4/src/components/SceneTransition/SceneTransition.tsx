import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react'
import './SceneTransition.css'

export type SceneTransitionVariant =
    | 'to-empress-letter'
    | 'from-empress-letter'
    | 'to-settlement'
    | 'north-court-entry'
    | 'north-dark-cloud'
export type SceneTransitionPhase = 'idle' | 'covering' | 'covered' | 'revealing'
export type SceneTransitionState =
    | { phase: 'idle' }
    | { phase: Exclude<SceneTransitionPhase, 'idle'>; variant: SceneTransitionVariant }

export interface SceneTransitionTiming {
    coverMs: number
    holdMs: number
    revealMs: number
}

export interface RunSceneTransitionOptions {
    variant: SceneTransitionVariant
    onCovered: () => void
}

interface SceneTransitionControllerOptions {
    setState: (state: SceneTransitionState) => void
    getReducedMotion?: () => boolean
    setTimeoutFn?: typeof setTimeout
    clearTimeoutFn?: typeof clearTimeout
}

interface SceneTransitionContextValue {
    state: SceneTransitionState
    runSceneTransition: (options: RunSceneTransitionOptions) => Promise<void>
}

type TimerHandle = ReturnType<typeof setTimeout>

export const SCENE_TRANSITION_TIMINGS: Record<SceneTransitionVariant, SceneTransitionTiming> = {
    'to-empress-letter': {
        coverMs: 620,
        holdMs: 260,
        revealMs: 820,
    },
    'from-empress-letter': {
        coverMs: 580,
        holdMs: 250,
        revealMs: 770,
    },
    'to-settlement': {
        coverMs: 560,
        holdMs: 240,
        revealMs: 760,
    },
    'north-court-entry': {
        coverMs: 760,
        holdMs: 280,
        revealMs: 1000,
    },
    'north-dark-cloud': {
        coverMs: 500,
        holdMs: 180,
        revealMs: 650,
    },
}

const REDUCED_MOTION_TIMING: SceneTransitionTiming = {
    coverMs: 90,
    holdMs: 70,
    revealMs: 120,
}

const FALLBACK_SCENE_TRANSITION_CONTEXT: SceneTransitionContextValue = {
    state: { phase: 'idle' },
    runSceneTransition: async options => {
        options.onCovered()
    },
}

const SceneTransitionContext = createContext<SceneTransitionContextValue | null>(null)

export function resolveSceneTransitionTiming(
    variant: SceneTransitionVariant,
    reducedMotion = false,
): SceneTransitionTiming {
    return reducedMotion ? REDUCED_MOTION_TIMING : SCENE_TRANSITION_TIMINGS[variant]
}

export function createSceneTransitionController({
    setState,
    getReducedMotion = () => false,
    setTimeoutFn = setTimeout,
    clearTimeoutFn = clearTimeout,
}: SceneTransitionControllerOptions) {
    let activePromise: Promise<void> | null = null
    const timers: TimerHandle[] = []

    const schedule = (callback: () => void, delay: number) => {
        const timer = setTimeoutFn(callback, delay)
        timers.push(timer)
        return timer
    }

    const clearTimers = () => {
        while (timers.length > 0) {
            const timer = timers.pop()
            if (timer) clearTimeoutFn(timer)
        }
    }

    const runSceneTransition = (options: RunSceneTransitionOptions): Promise<void> => {
        if (activePromise) return activePromise

        const timing = resolveSceneTransitionTiming(options.variant, getReducedMotion())
        activePromise = new Promise(resolve => {
            setState({ phase: 'covering', variant: options.variant })

            schedule(() => {
                setState({ phase: 'covered', variant: options.variant })
                options.onCovered()

                schedule(() => {
                    setState({ phase: 'revealing', variant: options.variant })

                    schedule(() => {
                        setState({ phase: 'idle' })
                        activePromise = null
                        resolve()
                    }, timing.revealMs)
                }, timing.holdMs)
            }, timing.coverMs)
        })

        return activePromise
    }

    return {
        runSceneTransition,
        dispose() {
            clearTimers()
            activePromise = null
            setState({ phase: 'idle' })
        },
    }
}

function prefersReducedMotion() {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function SceneTransitionProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<SceneTransitionState>({ phase: 'idle' })
    const controllerRef = useRef<ReturnType<typeof createSceneTransitionController> | null>(null)

    if (!controllerRef.current) {
        controllerRef.current = createSceneTransitionController({
            setState,
            getReducedMotion: prefersReducedMotion,
        })
    }

    const runSceneTransition = useCallback((options: RunSceneTransitionOptions) => {
        return controllerRef.current?.runSceneTransition(options) ?? Promise.resolve()
    }, [])

    useEffect(() => {
        return () => controllerRef.current?.dispose()
    }, [])

    const value = useMemo<SceneTransitionContextValue>(() => ({
        state,
        runSceneTransition,
    }), [runSceneTransition, state])

    return (
        <SceneTransitionContext.Provider value={value}>
            {children}
        </SceneTransitionContext.Provider>
    )
}

export function useSceneTransition() {
    const context = useContext(SceneTransitionContext)
    return context ?? FALLBACK_SCENE_TRANSITION_CONTEXT
}

export function SceneTransitionLayer() {
    const { state } = useSceneTransition()

    if (state.phase === 'idle') return null

    const isNorthCourtEntry = state.variant === 'north-court-entry'

    return (
        <div
            className={`scene-transition scene-transition--${state.variant} scene-transition--${state.phase}`}
            data-phase={state.phase}
            data-variant={state.variant}
            aria-hidden="true"
        >
            {isNorthCourtEntry ? (
                <>
                    <div className="scene-transition__north-scrim" />
                    <div className="scene-transition__north-door scene-transition__north-door--left" />
                    <div className="scene-transition__north-door scene-transition__north-door--right" />
                    <div className="scene-transition__north-foreground" />
                </>
            ) : (
                <>
                    <div className="scene-transition__wash" />
                    <div className="scene-transition__cloud scene-transition__cloud--back" />
                    <div className="scene-transition__side scene-transition__side--left" />
                    <div className="scene-transition__side scene-transition__side--right" />
                    <div className="scene-transition__grain" />
                    <div className="scene-transition__cloud scene-transition__cloud--front" />
                </>
            )}
        </div>
    )
}
