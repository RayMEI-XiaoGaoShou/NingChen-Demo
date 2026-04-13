import { MAP_ASSETS } from '../../data/mediaAssets'
import { PROLOGUE_PAGE_SECTIONS } from '../../data/prologuePageContent'
import { AUTO_PAGE_SCROLL_SPEEDS, useAutoPageScroll } from '../../hooks/useAutoPageScroll'
import { useGameStore } from '../../stores/gameStore'
import { PageUtilityActions } from '../PageUtilityActions/PageUtilityActions'
import './Prologue.css'

export function Prologue() {
    const advancePrologue = useGameStore(state => state.advancePrologue)
    useAutoPageScroll({ pixelsPerSecond: AUTO_PAGE_SCROLL_SPEEDS.prologue })

    return (
        <div
            className="page-container prologue-page animate-fade-in"
            data-auto-scroll-speed={AUTO_PAGE_SCROLL_SPEEDS.prologue}
        >
            <div className="page-utility-row narrative-utility-row animate-slide-up">
                <PageUtilityActions />
            </div>

            <div className="prologue-hero animate-slide-up">
                <span className="prologue-kicker">背景序章</span>
                <h1 className="prologue-title">日暮途远，人间何世</h1>
            </div>

            <div className="prologue-sections">
                {PROLOGUE_PAGE_SECTIONS.map((section, index) => (
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
