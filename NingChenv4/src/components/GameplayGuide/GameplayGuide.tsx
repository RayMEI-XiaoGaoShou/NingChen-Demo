import { ROUND_EVENTS } from '../../data/rounds'
import { ROUND_START_RICH_BRIEFINGS } from '../../data/roundStartRichBriefings'
import { getRoundStartCampaignDisplay } from '../../game/campaignDisplayEngine'
import { buildFengDaozhiAdvisorKit } from '../../game/fengDaozhiGuide'
import { useGameStore } from '../../stores/gameStore'
import { PageUtilityActions } from '../PageUtilityActions/PageUtilityActions'
import './GameplayGuide.css'

interface GameplayGuideProps {
    mode: 'entry' | 'overlay'
    onClose?: () => void
}

export function GameplayGuide({ mode, onClose }: GameplayGuideProps) {
    const advancePrologue = useGameStore(state => state.advancePrologue)
    const closeGameplayGuide = useGameStore(state => state.closeGameplayGuide)
    const currentRound = useGameStore(state => state.currentRound)
    const npcs = useGameStore(state => state.npcs)
    const intelProgress = useGameStore(state => state.intelProgress)
    const difficulty = useGameStore(state => state.difficulty)
    const fengDaozhiGuideSeen = useGameStore(state => state.fengDaozhiGuideSeen)
    const shuCampaign = useGameStore(state => state.shuCampaign)
    const huainanCampaign = useGameStore(state => state.huainanCampaign)
    const isOverlay = mode === 'overlay'
    const currentRoundAdvisorKit = buildFengDaozhiAdvisorKit({
        round: currentRound,
        npcs,
        intelProgress,
        difficulty,
    })
    const showCurrentRoundAdvisorSummary = isOverlay && Boolean(fengDaozhiGuideSeen[currentRoundAdvisorKit.key])
    const event = ROUND_EVENTS[currentRound - 1]
    const campaignDisplay = getRoundStartCampaignDisplay(currentRound, shuCampaign, huainanCampaign)
    const roundBriefing = campaignDisplay.briefing ?? ROUND_START_RICH_BRIEFINGS[currentRound] ?? event?.briefing ?? ''
    const roundBriefingParagraphs = roundBriefing
        .split(/\n+/)
        .map(paragraph => paragraph.trim())
        .filter(Boolean)

    return (
        <div className={`page-container gameplay-guide-page ${isOverlay ? 'overlay-mode' : 'entry-mode'} animate-fade-in`}>
            {!isOverlay && (
                <div className="page-utility-row narrative-utility-row animate-slide-up">
                    <PageUtilityActions />
                </div>
            )}

            <div className="glass-panel gameplay-guide-shell animate-slide-up">
                <div className="gameplay-guide-hero">
                    <h1 className="guide-title">信息摘要</h1>
                </div>

                {showCurrentRoundAdvisorSummary && (
                    <section className="guide-feng-daozhi-summary" aria-label="本回合冯道之锦囊摘要">
                        <span className="guide-section-kicker">本回合冯道之锦囊摘要</span>
                        <p>{currentRoundAdvisorKit.court.summary}</p>
                        <p>{currentRoundAdvisorKit.external.summary}</p>
                    </section>
                )}

                <section className="guide-round-briefing-summary" aria-label="本回合朝堂简报">
                    <span className="guide-section-kicker">本回合朝堂简报</span>
                    <div className="guide-round-briefing-copy">
                        {roundBriefingParagraphs.map(paragraph => (
                            <p key={paragraph}>{paragraph}</p>
                        ))}
                    </div>
                </section>

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
