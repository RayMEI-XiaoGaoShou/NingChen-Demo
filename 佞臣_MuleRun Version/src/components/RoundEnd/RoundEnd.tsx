// ========================================
// 回合收束页
// ========================================

import { useGameStore } from '../../stores/gameStore'
import { ROUND_EVENTS } from '../../data/rounds'
import './RoundEnd.css'

export function RoundEnd() {
    const { currentRound, nextPhase } = useGameStore()
    const event = ROUND_EVENTS[currentRound - 1]

    return (
        <div className="page-container round-end animate-fade-in">
            <div className="round-end-modal glass-panel decree-panel animate-slide-up">
                <div className="round-end-header">
                    <span className="page-eyebrow">回合收束</span>
                    <span className="round-label">第 <span className="highlight-number">{currentRound}</span> 回合 · 终</span>
                    <div className="divider-line"></div>
                </div>

                <div className="summary-section animate-slide-up animate-delay-1">
                    <div className="quote-mark">「</div>
                    <p className="summary-text">{event?.summary}</p>
                    <div className="quote-mark end">」</div>
                </div>

                {event?.hook && (
                    <div className="hook-card gold-panel animate-slide-up animate-delay-2">
                        <span className="hook-icon">知</span>
                        <p className="hook-text">{event.hook}</p>
                    </div>
                )}

                <p className="round-end-note animate-slide-up animate-delay-3">
                    这一页不是结束，而是揭卷之后的停顿。等你翻过这一月，下一回合的朝局就会带着这些余波重新压到殿上。
                </p>

                <div className="action-footer animate-slide-up animate-delay-4">
                    <button className="btn-primary btn-next-round" onClick={nextPhase}>
                        {currentRound >= 20 ? '观 看 结 局' : '翻 月'}
                    </button>
                </div>
            </div>
        </div>
    )
}
