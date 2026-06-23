import { useMemo, useState } from 'react'
import { getDifficultyProfile } from '../../game/difficulty'
import { hasSavedGameSnapshot, loadGameSnapshot } from '../../game/saveEngine'
import type { GameDifficulty } from '../../game/types'
import { useGameStore } from '../../stores/gameStore'
import { useMediaStore } from '../../stores/mediaStore'
import './Cover.css'

const DIFFICULTY_OPTIONS: GameDifficulty[] = ['easy', 'normal', 'hard', 'hell']

export function Cover() {
    const startNewGame = useGameStore(state => state.startNewGame)
    const loadLatestSave = useGameStore(state => state.loadLatestSave)
    const { isMuted, audioReady, setMuted, requestPlayback } = useMediaStore()
    const [showDifficulty, setShowDifficulty] = useState(false)
    const [selectedDifficulty, setSelectedDifficulty] = useState<GameDifficulty>('normal')
    const hasSave = useMemo(() => hasSavedGameSnapshot(), [])
    const latestSave = useMemo(() => loadGameSnapshot(), [])

    return (
        <div className="cover-page animate-fade-in">
            <video
                className="cover-video"
                src="/cover-menu-bg-v2.mp4"
                autoPlay
                muted
                loop
                playsInline
            />
            <div className="cover-overlay" />
            <button
                className="cover-audio-control"
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
            <div className="cover-content">
                <div className="cover-title-wrap animate-slide-up">
                    <h1 className="cover-title">佞臣</h1>
                    <p className="cover-subtitle">世事漫随流水，算来一梦浮生</p>
                </div>

                <div className="cover-actions animate-slide-up animate-delay-2">
                    {!showDifficulty ? (
                        <>
                            <button className="btn-primary cover-action" onClick={() => setShowDifficulty(true)}>
                                开始游戏
                            </button>
                            <button
                                className="btn-secondary cover-action"
                                disabled={!hasSave}
                                onClick={() => {
                                    loadLatestSave()
                                }}
                            >
                                加载存档
                            </button>
                            {latestSave && (
                                <p className="cover-save-hint">
                                    当前存档：第 {latestSave.currentRound} 回合 · {latestSave.currentPhase}
                                </p>
                            )}
                        </>
                    ) : (
                        <div className="cover-difficulty-panel glass-panel">
                            <div className="cover-difficulty-header">
                                <span className="cover-kicker">选择难度</span>
                            </div>
                            <div className="cover-difficulty-options">
                                {DIFFICULTY_OPTIONS.map(option => {
                                    const profile = getDifficultyProfile(option)
                                    const active = option === selectedDifficulty
                                    return (
                                        <button
                                            key={option}
                                            type="button"
                                            className={`cover-difficulty-chip${active ? ' active' : ''}`}
                                            onClick={() => setSelectedDifficulty(option)}
                                        >
                                            {profile.label}
                                        </button>
                                    )
                                })}
                            </div>
                            <div className="cover-difficulty-actions">
                                <button className="btn-secondary cover-inline-btn" onClick={() => setShowDifficulty(false)}>
                                    返回
                                </button>
                                <button
                                    className="btn-primary cover-inline-btn"
                                    onClick={() => startNewGame(selectedDifficulty)}
                                >
                                    确认
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
