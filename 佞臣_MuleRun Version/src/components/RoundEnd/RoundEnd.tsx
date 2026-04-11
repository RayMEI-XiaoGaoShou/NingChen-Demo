import { useGameStore } from '../../stores/gameStore'
import { ROUND_EVENTS } from '../../data/rounds'
import { PageUtilityActions } from '../PageUtilityActions/PageUtilityActions'
import './RoundEnd.css'

export function RoundEnd() {
    const { currentRound, nextPhase, openGameplayGuide } = useGameStore()
    const event = ROUND_EVENTS[currentRound - 1]

    return (
        <div className="page-container round-end animate-fade-in">
            <div className="page-utility-row animate-slide-up">
                <PageUtilityActions onOpenGuide={() => openGameplayGuide('gameplay')} />
            </div>

            <div className="round-end-modal glass-panel decree-panel animate-slide-up">
                <div className="round-end-header">
                    <span className="page-eyebrow">回合收束</span>
                    <span className="round-label">第 <span className="highlight-number">{currentRound}</span> 回合 · 终</span>
                    <div className="divider-line"></div>
                </div>

                <div className="summary-section animate-slide-up animate-delay-1">
                    <div className="quote-mark">“</div>
                    <p className="summary-text">{event?.summary}</p>
                    <div className="quote-mark end">”</div>
                </div>

                {event?.hook && (
                    <div className="hook-card gold-panel animate-slide-up animate-delay-2">
                        <span className="hook-icon">钩</span>
                        <p className="hook-text">{event.hook}</p>
                    </div>
                )}

                <div className="action-footer animate-slide-up animate-delay-4">
                    <button className="btn-primary btn-next-round" onClick={nextPhase}>
                        {currentRound >= 20 ? '去看终局' : '翻入下一回'}
                    </button>
                </div>
            </div>
        </div>
    )
}
