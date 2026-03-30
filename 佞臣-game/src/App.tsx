// ========================================
// 《佞臣》App 根组件
// 基于 Zustand 状态切换页面（不使用 react-router）
// ========================================

import { useEffect, useState } from 'react'
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
import { GlobalAudio } from './components/GlobalAudio/GlobalAudio'
import { useMediaStore } from './stores/mediaStore'
import { buildPersistedSnapshot, clearGameSnapshot, loadGameSnapshot, saveGameSnapshot, type PersistedGameSnapshot } from './game/saveEngine'

function App() {
    const currentPhase = useGameStore(s => s.currentPhase)
    const prologueStep = useGameStore(s => s.prologueStep)
    const helpOverlayOpen = useGameStore(s => s.helpOverlayOpen)
    const hydrateSnapshot = useGameStore(s => s.hydrateSnapshot)
    const resetGame = useGameStore(s => s.resetGame)
    const { isMuted, audioReady, setMuted, requestPlayback } = useMediaStore()
    const [resumeSnapshot, setResumeSnapshot] = useState<PersistedGameSnapshot | null>(null)

    useEffect(() => {
        const snapshot = loadGameSnapshot()
        if (snapshot) {
            setResumeSnapshot(snapshot)
        }
    }, [])

    useEffect(() => {
        const unsubscribe = useGameStore.subscribe(state => {
            const snapshot = buildPersistedSnapshot(state)
            if (snapshot) saveGameSnapshot(snapshot)
            else clearGameSnapshot()
        })
        return unsubscribe
    }, [])

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
        if (prologueStep === 'PROLOGUE') {
            return <Prologue />
        }

        if (prologueStep === 'GAMEPLAY_GUIDE') {
            return <GameplayGuide mode="entry" />
        }

        return renderPhase()
    }

    return (
        <div className="app">
            <header className="app-header">
                <span className="app-header-spacer" />
                <span className="app-logo">佞 臣</span>
                <button
                    className="btn-audio"
                    onClick={() => {
                        if (isMuted) {
                            setMuted(false)
                            requestPlayback()
                            return
                        }
                        if (!audioReady) {
                            requestPlayback()
                            return
                        }
                        setMuted(true)
                    }}
                >
                    {isMuted || !audioReady ? '开声' : '静音'}
                </button>
            </header>
            <main className="app-content">
                {resumeSnapshot && (
                    <div className="resume-overlay">
                        <div className="resume-panel glass-panel">
                            <h3>发现上局存档</h3>
                            <p>存档停在第 {resumeSnapshot.currentRound} 回合 · {resumeSnapshot.currentPhase}</p>
                            <div className="resume-actions">
                                <button
                                    className="btn-primary"
                                    onClick={() => {
                                        hydrateSnapshot(resumeSnapshot)
                                        setResumeSnapshot(null)
                                    }}
                                >
                                    继续上局
                                </button>
                                <button
                                    className="btn-secondary"
                                    onClick={() => {
                                        clearGameSnapshot()
                                        resetGame()
                                        setResumeSnapshot(null)
                                    }}
                                >
                                    重新开局
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {!resumeSnapshot && renderContent()}
                {helpOverlayOpen && (
                    <div className="help-overlay">
                        <div className="help-overlay-panel">
                            <GameplayGuide mode="overlay" />
                        </div>
                    </div>
                )}
            </main>
            <GlobalAudio />
            {/* NPC 详情弹窗（全局浮层） */}
            <NPCDetail />
        </div>
    )
}

export default App
