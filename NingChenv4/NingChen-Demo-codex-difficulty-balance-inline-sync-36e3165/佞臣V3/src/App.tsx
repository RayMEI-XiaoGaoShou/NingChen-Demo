import { useEffect } from 'react'
import { Cover } from './components/Cover/Cover'
import { CourtView } from './components/CourtView/CourtView'
import { EmpressLetter } from './components/EmpressLetter/EmpressLetter'
import { Ending } from './components/Ending/Ending'
import { PhaseErrorBoundary } from './components/ErrorBoundary/PhaseErrorBoundary'
import { PhaseCrashFallback, SettlementCrashFallback } from './components/ErrorBoundary/PhaseFallback'
import { CharacterBios } from './components/CharacterBios/CharacterBios'
import { GameplayGuide } from './components/GameplayGuide/GameplayGuide'
import { GlobalAudio } from './components/GlobalAudio/GlobalAudio'
import { NPCDetail } from './components/NPCDetail/NPCDetail'
import { Prologue } from './components/Prologue/Prologue'
import { RoundEnd } from './components/RoundEnd/RoundEnd'
import { RoundStart } from './components/RoundStart/RoundStart'
import { SchemeFeedback } from './components/SchemeFeedback/SchemeFeedback'
import { SchemePanel } from './components/SchemePanel/SchemePanel'
import { Settlement } from './components/Settlement/Settlement'
import { buildPersistedSnapshot, saveGameSnapshot } from './game/saveEngine'
import { useGameStore } from './stores/gameStore'
import { useMediaStore } from './stores/mediaStore'

export function shouldUseRoundStartFullscreenShell(
    prologueStep: string,
    currentPhase: string,
    currentRound: number,
) {
    return prologueStep === 'INGAME' && currentPhase === 'ROUND_START' && currentRound >= 1
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
        currentPhase === 'SETTLEMENT' ||
        currentPhase === 'ROUND_END'

    return (
        prologueStep === 'COVER' ||
        isNarrativeEntryStep ||
        isKnownRoundPage ||
        (!isNarrativeEntryStep && currentPhase !== 'ENDING')
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
        <div className={`app${isCoverStep ? ' app-cover-shell' : ''}${isRoundStartFullscreenStep ? ' app-roundstart-shell' : ''}`}>
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
                    <main className={`app-content${isCoverStep ? ' app-content-cover' : ''}`}>
                        {renderContent()}
                        {helpOverlayOpen && (
                            <div className="help-overlay">
                                <div className="help-overlay-panel">
                                    <GameplayGuide mode="overlay" />
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
