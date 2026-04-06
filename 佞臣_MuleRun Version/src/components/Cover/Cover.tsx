import { useMemo, useState } from 'react'
import { getDifficultyProfile } from '../../game/difficulty'
import { hasSavedGameSnapshot, loadGameSnapshot } from '../../game/saveEngine'
import type { GameDifficulty } from '../../game/types'
import { useGameStore } from '../../stores/gameStore'
import './Cover.css'

const DIFFICULTY_OPTIONS: GameDifficulty[] = ['easy', 'normal', 'hard', 'hell']

export function Cover() {
    const startNewGame = useGameStore(state => state.startNewGame)
    const loadLatestSave = useGameStore(state => state.loadLatestSave)
    const [showDifficulty, setShowDifficulty] = useState(false)
    const [selectedDifficulty, setSelectedDifficulty] = useState<GameDifficulty>('normal')
    const hasSave = useMemo(() => hasSavedGameSnapshot(), [])
    const latestSave = useMemo(() => loadGameSnapshot(), [])
    const currentProfile = getDifficultyProfile(selectedDifficulty)

    return (
        <div className="cover-page animate-fade-in">
            <video
                className="cover-video"
                src="/cover-menu-bg.mp4"
                autoPlay
                muted
                loop
                playsInline
            />
            <div className="cover-overlay" />
            <div className="cover-content">
                <div className="cover-title-wrap animate-slide-up">
                    <span className="cover-kicker">十年长局 二十回合</span>
                    <h1 className="cover-title">佞臣</h1>
                    <p className="cover-subtitle">以身入局，借北周之朝局，为南陈争十年之机。</p>
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
                                <p>{currentProfile.description}</p>
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
                                    进入序章
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
