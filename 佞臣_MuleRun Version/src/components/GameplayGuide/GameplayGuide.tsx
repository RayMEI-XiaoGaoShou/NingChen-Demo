import { GAMEPLAY_GUIDE_SECTIONS } from '../../data/prologueContent'
import { useGameStore } from '../../stores/gameStore'
import './GameplayGuide.css'

interface GameplayGuideProps {
    mode: 'entry' | 'overlay'
    onClose?: () => void
}

export function GameplayGuide({ mode, onClose }: GameplayGuideProps) {
    const advancePrologue = useGameStore(state => state.advancePrologue)
    const closeGameplayGuide = useGameStore(state => state.closeGameplayGuide)
    const isOverlay = mode === 'overlay'

    return (
        <div className={`page-container gameplay-guide-page ${isOverlay ? 'overlay-mode' : 'entry-mode'} animate-fade-in`}>
            <div className="glass-panel gameplay-guide-shell animate-slide-up">
                <div className="gameplay-guide-hero">
                    <span className="guide-kicker">玩法总览</span>
                    <h1 className="guide-title">先明规则，再入局</h1>
                    <p className="guide-summary">
                        这是一场围绕人物、关系、势力与国力展开的二十回合权谋局。看清目标，比急着落子更重要。
                    </p>
                </div>

                <div className="guide-section-list">
                    {GAMEPLAY_GUIDE_SECTIONS.map((section, index) => (
                        <section
                            key={section.title}
                            className={`glass-panel guide-section animate-slide-up animate-delay-${Math.min(index + 1, 4)}`}
                        >
                            <h2 className="guide-section-title">{section.title}</h2>
                            {section.intro && <p className="guide-section-intro">{section.intro}</p>}
                            <ul className="guide-bullets">
                                {section.bullets.map(bullet => (
                                    <li key={bullet}>{bullet}</li>
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>

                <div className="guide-actions">
                    {isOverlay ? (
                        <button
                            className="btn-secondary guide-button-secondary"
                            onClick={() => {
                                if (onClose) onClose()
                                else closeGameplayGuide()
                            }}
                        >
                            返回原页
                        </button>
                    ) : (
                        <button className="btn-primary guide-button" onClick={advancePrologue}>
                            查看北周群像
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
