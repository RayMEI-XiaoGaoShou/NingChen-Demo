import { Suspense, lazy, useEffect } from 'react'
import { PhaseErrorBoundary } from './components/ErrorBoundary/PhaseErrorBoundary'
import { PhaseCrashFallback, SettlementCrashFallback } from './components/ErrorBoundary/PhaseFallback'
import { GlobalAudio } from './components/GlobalAudio/GlobalAudio'
import { NPCDetail } from './components/NPCDetail/NPCDetail'
import { buildPersistedSnapshot, saveGameSnapshot } from './game/saveEngine'
import { useGameStore } from './stores/gameStore'
import { useMediaStore } from './stores/mediaStore'

const Cover = lazy(() => import('./components/Cover/Cover').then(module => ({ default: module.Cover })))
const CourtView = lazy(() => import('./components/CourtView/CourtView').then(module => ({ default: module.CourtView })))
const EmpressLetter = lazy(() => import('./components/EmpressLetter/EmpressLetter').then(module => ({ default: module.EmpressLetter })))
const EmpressReply = lazy(() => import('./components/EmpressReply/EmpressReply').then(module => ({ default: module.EmpressReply })))
const Ending = lazy(() => import('./components/Ending/Ending').then(module => ({ default: module.Ending })))
const CharacterBios = lazy(() => import('./components/CharacterBios/CharacterBios').then(module => ({ default: module.CharacterBios })))
const GameplayGuide = lazy(() => import('./components/GameplayGuide/GameplayGuide').then(module => ({ default: module.GameplayGuide })))
const Prologue = lazy(() => import('./components/Prologue/Prologue').then(module => ({ default: module.Prologue })))
const RoundEnd = lazy(() => import('./components/RoundEnd/RoundEnd').then(module => ({ default: module.RoundEnd })))
const RoundStart = lazy(() => import('./components/RoundStart/RoundStart').then(module => ({ default: module.RoundStart })))
const SchemeFeedback = lazy(() => import('./components/SchemeFeedback/SchemeFeedback').then(module => ({ default: module.SchemeFeedback })))
const SchemePanel = lazy(() => import('./components/SchemePanel/SchemePanel').then(module => ({ default: module.SchemePanel })))
const Settlement = lazy(() => import('./components/Settlement/Settlement').then(module => ({ default: module.Settlement })))

export function shouldUseRoundStartFullscreenShell(
    prologueStep: string,
    currentPhase: string,
    currentRound: number,
) {
    return prologueStep === 'INGAME' && (currentPhase === 'ROUND_START' || currentPhase === 'PROLOGUE') && currentRound >= 1
}

export function shouldHideGlobalHeader(prologueStep: string, currentPhase: string) {
    const isNarrativeEntryStep =
        prologueStep === 'PROLOGUE' ||
        prologueStep === 'GAMEPLAY_GUIDE' ||
        prologueStep === 'CHARACTER_BIOS'
    const isKnownRoundPage =
        currentPhase === 'ROUND_START' ||
        currentPhase === 'COURT_OBSERVE' ||
        currentPhase === 'SCHEME_PHASE' ||
        currentPhase === 'EMPRESS_LETTER' ||
        currentPhase === 'SCHEME_FEEDBACK' ||
        currentPhase === 'EMPRESS_REPLY' ||
        currentPhase === 'SETTLEMENT' ||
        currentPhase === 'ROUND_END'

    return (
        prologueStep === 'COVER' ||
        isNarrativeEntryStep ||
        isKnownRoundPage ||
        (!isNarrativeEntryStep && currentPhase !== 'ENDING')
    )
}

function PhaseLoadingFallback() {
    return (
        <div className="app-phase-loading" role="status" aria-live="polite">
            <div className="app-phase-loading-panel glass-panel">
                <span className="app-phase-loading-kicker">页面载入中</span>
                <h2 className="app-phase-loading-title">正在展开这一页</h2>
                <p className="app-phase-loading-copy">朝局与回信已经在路上，稍候片刻。</p>
            </div>
        </div>
    )
}

function GuideOverlayFallback() {
    return (
        <div className="app-guide-loading" role="status" aria-live="polite">
            <span className="app-guide-loading-kicker">玩法说明</span>
            <p className="app-guide-loading-copy">正在调出冯道之替你整理好的提要。</p>
        </div>
    )
}

function App() {
    const currentPhase = useGameStore(state => state.currentPhase)
    const prologueStep = useGameStore(state => state.prologueStep)
    const currentRound = useGameStore(state => state.currentRound)
    const helpOverlayOpen = useGameStore(state => state.helpOverlayOpen)
    const { isMuted, audioReady, setMuted, requestPlayback } = useMediaStore()
    const isCoverStep = prologueStep === 'COVER'
    const isRoundStartFullscreenStep = shouldUseRoundStartFullscreenShell(prologueStep, currentPhase, currentRound)
    const isCourtStageStep = prologueStep === 'INGAME' && currentPhase === 'COURT_OBSERVE'
    const hideGlobalHeader = shouldHideGlobalHeader(prologueStep, currentPhase)

    useEffect(() => {
        const unsubscribe = useGameStore.subscribe(state => {
            const snapshot = buildPersistedSnapshot(state)
            if (snapshot) saveGameSnapshot(snapshot)
        })
        return unsubscribe
    }, [])

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }, [currentPhase, prologueStep])

    const renderPhase = () => {
        switch (currentPhase) {
            case 'ROUND_START':
                return <RoundStart />
            case 'COURT_OBSERVE':
                return <CourtView />
            case 'SCHEME_PHASE':
                return <SchemePanel />
            case 'EMPRESS_LETTER':
                return <EmpressLetter />
            case 'SCHEME_FEEDBACK':
                return <SchemeFeedback />
            case 'EMPRESS_REPLY':
                return <EmpressReply />
            case 'SETTLEMENT':
                return <Settlement />
            case 'ROUND_END':
                return <RoundEnd />
            case 'ENDING':
                return <Ending />
            default:
                return <RoundStart />
        }
    }

    const renderContent = () => {
        if (isCoverStep) {
            return <Cover />
        }

        if (prologueStep === 'PROLOGUE') {
            return <Prologue />
        }

        if (prologueStep === 'GAMEPLAY_GUIDE') {
            return <GameplayGuide mode="entry" />
        }

        if (prologueStep === 'CHARACTER_BIOS') {
            return <CharacterBios />
        }

        return renderPhase()
    }

    const errorFallback = currentPhase === 'SETTLEMENT'
        ? <SettlementCrashFallback />
        : <PhaseCrashFallback phaseName={currentPhase} />

    return (
        <div className={`app${isCoverStep ? ' app-cover-shell' : ''}${isRoundStartFullscreenStep ? ' app-roundstart-shell' : ''}${isCourtStageStep ? ' app-court-shell' : ''}`}>
            {!hideGlobalHeader && (
                <header className="app-header">
                    <span className="app-header-spacer" />
                    <span className="app-logo">佞臣</span>
                    <button
                        className="btn-audio"
                        onClick={() => {
                            if (isMuted || !audioReady) {
                                setMuted(false)
                                requestPlayback()
                                return
                            }

                            setMuted(true)
                        }}
                    >
                        {isMuted ? '开声' : '静音'}
                    </button>
                </header>
            )}
            <PhaseErrorBoundary resetKey={`${prologueStep}:${currentPhase}`} phaseName={currentPhase} fallback={errorFallback}>
                <>
                    <main className={`app-content${isCoverStep ? ' app-content-cover' : ''}${isCourtStageStep ? ' app-content-court' : ''}`}>
                        <Suspense fallback={<PhaseLoadingFallback />}>
                            {renderContent()}
                        </Suspense>
                        {helpOverlayOpen && (
                            <div className="help-overlay">
                                <div className="help-overlay-panel">
                                    <Suspense fallback={<GuideOverlayFallback />}>
                                        <GameplayGuide mode="overlay" />
                                    </Suspense>
                                </div>
                            </div>
                        )}
                    </main>
                    <GlobalAudio />
                    <NPCDetail />
                </>
            </PhaseErrorBoundary>
        </div>
    )
}

export default App
