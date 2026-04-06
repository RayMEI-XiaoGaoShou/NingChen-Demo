import { useEffect } from 'react'
import { useGameStore } from './stores/gameStore'
import { RoundStart } from './components/RoundStart/RoundStart'
import { CourtView } from './components/CourtView/CourtView'
import { SchemePanel } from './components/SchemePanel/SchemePanel'
import { EmpressLetter } from './components/EmpressLetter/EmpressLetter'
import { SchemeFeedback } from './components/SchemeFeedback/SchemeFeedback'
import { Settlement } from './components/Settlement/Settlement'
import { RoundEnd } from './components/RoundEnd/RoundEnd'
import { Ending } from './components/Ending/Ending'
import { NPCDetail } from './components/NPCDetail/NPCDetail'
import { Prologue } from './components/Prologue/Prologue'
import { GameplayGuide } from './components/GameplayGuide/GameplayGuide'
import { Cover } from './components/Cover/Cover'
import { GlobalAudio } from './components/GlobalAudio/GlobalAudio'
import { PhaseErrorBoundary } from './components/ErrorBoundary/PhaseErrorBoundary'
import { PhaseCrashFallback, SettlementCrashFallback } from './components/ErrorBoundary/PhaseFallback'
import { useMediaStore } from './stores/mediaStore'
import { buildPersistedSnapshot, saveGameSnapshot } from './game/saveEngine'

function App() {
    const currentPhase = useGameStore(s => s.currentPhase)
    const prologueStep = useGameStore(s => s.prologueStep)
    const helpOverlayOpen = useGameStore(s => s.helpOverlayOpen)
    const { isMuted, audioReady, setMuted, requestPlayback } = useMediaStore()

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
        if (prologueStep === 'COVER') {
            return <Cover />
        }

        if (prologueStep === 'PROLOGUE') {
            return <Prologue />
        }

        if (prologueStep === 'GAMEPLAY_GUIDE') {
            return <GameplayGuide mode="entry" />
        }

        return renderPhase()
    }

    const errorFallback = currentPhase === 'SETTLEMENT'
        ? <SettlementCrashFallback />
        : <PhaseCrashFallback phaseName={currentPhase} />

    return (
        <div className="app">
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
            <PhaseErrorBoundary resetKey={`${prologueStep}:${currentPhase}`} phaseName={currentPhase} fallback={errorFallback}>
                <>
                    <main className="app-content">
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
