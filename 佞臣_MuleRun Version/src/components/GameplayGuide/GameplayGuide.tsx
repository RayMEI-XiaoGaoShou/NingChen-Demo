import { GAMEPLAY_GUIDE_SECTIONS } from '../../data/prologueContent'
import { useGameStore } from '../../stores/gameStore'
import { PageUtilityActions } from '../PageUtilityActions/PageUtilityActions'
import './GameplayGuide.css'

interface GameplayGuideProps {
    mode: 'entry' | 'overlay'
    onClose?: () => void
}

const GUIDE_SUMMARY = '这是一场围绕人物、关系、势力与国力展开的二十回合权谋博弈。'

function getGuideSections() {
    return GAMEPLAY_GUIDE_SECTIONS.map((section, sectionIndex) => {
        if (sectionIndex === 1) {
            return {
                ...section,
                bullets: section.bullets.map((bullet, bulletIndex) => {
                    if (bulletIndex === 2) return '三次施计：每回合必须对三位不同北周朝堂人物或地方军头出手。'
                    if (bulletIndex === 4) return '计谋回报：看北周群臣如何真实回应你的这一步。'
                    return bullet
                }),
            }
        }

        if (sectionIndex === 2) {
            return {
                ...section,
                intro: '真正优秀的计谋，需要先影响人心，再影响该角色所在势力，最后才会对国力产生影响',
                bullets: section.bullets.map((bullet, bulletIndex) =>
                    bulletIndex === 2
                        ? '最后才有资格影响国力：不是每句话都能产生你想要的正面影响，慎之，慎之'
                        : bullet,
                ),
            }
        }

        return section
    })
}

export function GameplayGuide({ mode, onClose }: GameplayGuideProps) {
    const advancePrologue = useGameStore(state => state.advancePrologue)
    const closeGameplayGuide = useGameStore(state => state.closeGameplayGuide)
    const isOverlay = mode === 'overlay'
    const guideSections = getGuideSections()

    return (
        <div className={`page-container gameplay-guide-page ${isOverlay ? 'overlay-mode' : 'entry-mode'} animate-fade-in`}>
            {!isOverlay && (
                <div className="page-utility-row narrative-utility-row animate-slide-up">
                    <PageUtilityActions />
                </div>
            )}

            <div className="glass-panel gameplay-guide-shell animate-slide-up">
                <div className="gameplay-guide-hero">
                    <span className="guide-kicker">玩法总览</span>
                    <h1 className="guide-title">先明规则，再入局</h1>
                    <p className="guide-summary">{GUIDE_SUMMARY}</p>
                </div>

                <div className="guide-section-list">
                    {guideSections.map((section, index) => (
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
