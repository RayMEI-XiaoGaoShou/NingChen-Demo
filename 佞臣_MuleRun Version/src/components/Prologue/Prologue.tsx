import { PROLOGUE_SECTIONS } from '../../data/prologueContent'
import { MAP_ASSETS } from '../../data/mediaAssets'
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
                    你将以萧宝颖之身潜入北周，表面身份是邺城朝中的翰林编修，在朝局与刀锋之间替南陈争取时间。
                    十年之局被拆作二十回合，每一步都可能决定旧约能否兑现。
                </p>
                <div className="prologue-meta">
                    <span className="prologue-chip">十年拆作二十回合</span>
                    <span className="prologue-chip">半岁一局</span>
                    <span className="prologue-chip">以身入局</span>
                </div>
            </div>

            <div className="prologue-sections">
                {PROLOGUE_SECTIONS.map((section, index) => (
                    <div key={section.title} className="prologue-section-group">
                        <section
                            className={`glass-panel prologue-section animate-slide-up animate-delay-${Math.min(index + 1, 4)}`}
                        >
                            <h2 className="prologue-section-title">{section.title}</h2>
                            <div className="prologue-section-body">
                                {section.paragraphs.map(paragraph => (
                                    <p key={paragraph}>{paragraph}</p>
                                ))}
                            </div>
                        </section>
                        {index === 0 && (
                            <section className="gold-panel prologue-map-card animate-slide-up animate-delay-2">
                                <div className="prologue-map-header">
                                    <h3 className="prologue-map-title">南北形势图</h3>
                                    <span className="prologue-map-label">{MAP_ASSETS.initial.label}</span>
                                </div>
                                <img
                                    className="prologue-map-image"
                                    src={MAP_ASSETS.initial.src}
                                    alt="南北初局地图"
                                />
                            </section>
                        )}
                    </div>
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
