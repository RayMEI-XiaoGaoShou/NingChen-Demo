import { PROLOGUE_SECTIONS } from '../../data/prologueContent'
import { useGameStore } from '../../stores/gameStore'
import './Prologue.css'

export function Prologue() {
    const advancePrologue = useGameStore(state => state.advancePrologue)

    return (
        <div className="page-container prologue-page animate-fade-in">
            <div className="prologue-hero animate-slide-up">
                <span className="prologue-kicker">背景序章</span>
                <h1 className="prologue-title">纷乱之世</h1>
                <p className="prologue-summary">
                    你将以萧宝颖之身潜入北周，在朝局与刀锋之间替南陈争取时间。整场局势被拆成一年两回合，共20回合，每一步都可能决定十年之诺能否兑现。
                </p>
                <div className="prologue-meta">
                    <span className="prologue-chip">一年两回合</span>
                    <span className="prologue-chip">共 20 回合</span>
                    <span className="prologue-chip">以身入局</span>
                </div>
            </div>

            <div className="prologue-sections">
                {PROLOGUE_SECTIONS.map((section, index) => (
                    <section
                        key={section.title}
                        className={`glass-panel prologue-section animate-slide-up animate-delay-${Math.min(index + 1, 4)}`}
                    >
                        <h2 className="prologue-section-title">{section.title}</h2>
                        <div className="prologue-section-body">
                            {section.paragraphs.map(paragraph => (
                                <p key={paragraph}>{paragraph}</p>
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            <div className="prologue-actions animate-slide-up animate-delay-4">
                <button className="btn-primary prologue-button" onClick={advancePrologue}>
                    继续
                </button>
            </div>
        </div>
    )
}
