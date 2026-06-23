import { useEffect, useState } from 'react'
import { MAP_ASSETS } from '../../data/mediaAssets'
import { PROLOGUE_PAGE_SECTIONS } from '../../data/prologuePageContent'
import { AUTO_PAGE_SCROLL_SPEEDS, useAutoPageScroll } from '../../hooks/useAutoPageScroll'
import { useGameStore } from '../../stores/gameStore'
import { PageUtilityActions } from '../PageUtilityActions/PageUtilityActions'
import './Prologue.css'

export function Prologue() {
    const advancePrologue = useGameStore(state => state.advancePrologue)
    const [isMapExpanded, setIsMapExpanded] = useState(false)
    useAutoPageScroll({ pixelsPerSecond: AUTO_PAGE_SCROLL_SPEEDS.prologue })

    useEffect(() => {
        if (!isMapExpanded) return

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsMapExpanded(false)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isMapExpanded])

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
                                </div>
                                <button
                                    type="button"
                                    className="prologue-map-button"
                                    onClick={() => setIsMapExpanded(true)}
                                    aria-label="放大南北形势图"
                                >
                                    <img
                                        className="prologue-map-image"
                                        src={MAP_ASSETS.initial.src}
                                        alt="南北初局地图"
                                    />
                                    <span className="prologue-map-zoom-hint">点按放大</span>
                                </button>
                            </section>
                        )}
                    </div>
                ))}
            </div>

            {isMapExpanded && (
                <div
                    className="prologue-map-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-label="南北形势图放大查看"
                    onClick={() => setIsMapExpanded(false)}
                >
                    <button
                        type="button"
                        className="prologue-map-overlay-close"
                        onClick={() => setIsMapExpanded(false)}
                    >
                        关闭
                    </button>
                    <img
                        className="prologue-map-image prologue-map-image--expanded"
                        src={MAP_ASSETS.initial.src}
                        alt="南北形势图放大视图"
                        onClick={event => event.stopPropagation()}
                    />
                </div>
            )}

            <div className="prologue-actions animate-slide-up animate-delay-4">
                <button className="btn-primary prologue-button" onClick={advancePrologue}>
                    继续
                </button>
            </div>
        </div>
    )
}
