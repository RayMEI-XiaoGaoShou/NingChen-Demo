import { useGameStore } from '../../stores/gameStore'
import { ROUND_EVENTS } from '../../data/rounds'
import { ROUND_START_RICH_BRIEFINGS } from '../../data/roundStartRichBriefings'
import { ROUND_CONTEXT_NOTES } from '../../data/roundContext'
import { FIRST_ROUND_GUIDE_CONTENT } from '../../data/prologueContent'
import { getRoundStartCampaignDisplay } from '../../game/campaignDisplayEngine'
import { RadarChart } from '../RadarChart/RadarChart'
import { FirstRoundGuideModal } from '../FirstRoundGuide/FirstRoundGuideModal'
import { getRoundAdvisorHint } from '../../game/roundIntelEngine'
import { buildDominantExternalStageHint } from '../../game/externalActionHint'
import { buildOmenAdvisorHint } from '../../game/fengDaozhiHint'
import { NpcPortrait } from '../NpcPortrait/NpcPortrait'
import { PageUtilityActions } from '../PageUtilityActions/PageUtilityActions'
import './RoundStart.css'

function stripAdvisorPrefix(text: string | null | undefined): string {
    if (!text) return ''

    let cleaned = text.trim()

    cleaned = cleaned
        .replace(/^冯道之密语[：:\s-]*/u, '')
        .replace(/^密语[：:\s-]*/u, '')
        .replace(/^[·•\s]*【[^】]+】[：:\s-]*/u, '')
        .replace(/^[·•\s：:\-]+/u, '')
        .trim()

    return cleaned
}

function buildRoundStartTitle(currentRound: number, eventTitle?: string, timeLabel?: string): string {
    const titleParts = [`第 ${currentRound} 回合`]

    if (eventTitle) titleParts.push(eventTitle)
    else if (timeLabel) titleParts.push(timeLabel)

    return titleParts.join(' · ')
}

export function shouldUseCompactRoundStartLayout(currentRound: number) {
    return currentRound >= 1
}

export function RoundStart() {
    const {
        currentRound,
        nextPhase,
        northStats,
        southStats,
        difficulty,
        npcs,
        intelProgress,
        lastPolicyAftereffect,
        recentBacklash,
        firstRoundGuideSeen,
        markFirstRoundGuideSeen,
        openGameplayGuide,
        shuCampaign,
        huainanCampaign,
    } = useGameStore()

    const event = ROUND_EVENTS[currentRound - 1]
    const contextNotes = ROUND_CONTEXT_NOTES[currentRound] ?? []
    const externalStageHint = buildDominantExternalStageHint({
        round: currentRound,
        npcs,
        intelProgress,
        difficulty,
    })
    const omenAdvisorHint = buildOmenAdvisorHint(currentRound)
    const courtAdvisorHint = [getRoundAdvisorHint(currentRound, npcs, null), omenAdvisorHint]
        .filter(Boolean)
        .join(' ')
    const previousPolicyAftereffect =
        lastPolicyAftereffect && lastPolicyAftereffect.sourceRound === currentRound - 1
            ? lastPolicyAftereffect
            : null
    const campaignDisplay = getRoundStartCampaignDisplay(currentRound, shuCampaign, huainanCampaign)
    const campaignMap = campaignDisplay.map
    const activeCampaignSummary = campaignDisplay.summary
    const eventTitle = campaignDisplay.eventName ?? event?.eventName
    const roundBriefing = campaignDisplay.briefing ?? ROUND_START_RICH_BRIEFINGS[currentRound] ?? event?.briefing ?? ''
    const courtHintText = stripAdvisorPrefix(courtAdvisorHint || event?.hint)
    const externalHintText = stripAdvisorPrefix(externalStageHint)
    const roundTitleLine = buildRoundStartTitle(currentRound, eventTitle, event?.timeLabel)
    const roundBriefingParagraphs = roundBriefing.split('\n').filter(Boolean)
    const aftereffectSummary = [
        activeCampaignSummary,
        previousPolicyAftereffect?.summary,
        recentBacklash[0]?.summary,
    ].filter((item): item is string => Boolean(item))
    const showCompactLayout = shouldUseCompactRoundStartLayout(currentRound)
    const guideModal = currentRound === 1 && !firstRoundGuideSeen.round_start ? (
        <FirstRoundGuideModal
            title={FIRST_ROUND_GUIDE_CONTENT.round_start.title}
            body={FIRST_ROUND_GUIDE_CONTENT.round_start.body}
            onClose={() => markFirstRoundGuideSeen('round_start')}
        />
    ) : null

    if (showCompactLayout) {
        return (
            <div className="page-container round-start round-start-compact page-enter">
                {guideModal}

                <div className="roundstart-toolbar animate-slide-up">
                    <div className="roundstart-toolbar-actions">
                        <PageUtilityActions onOpenGuide={() => openGameplayGuide('gameplay')} />
                    </div>
                </div>

                <div className="roundstart-title-wrap animate-slide-up animate-delay-1">
                    <h1 className="roundstart-title-line">{roundTitleLine}</h1>
                </div>

                <section className="glass-panel roundstart-briefing-card animate-slide-up animate-delay-2">
                    <div className="roundstart-briefing-copy">
                        <h2 className="roundstart-section-title">朝堂简报</h2>
                        {roundBriefingParagraphs.map(paragraph => (
                            <p key={paragraph}>{paragraph}</p>
                        ))}
                    </div>

                    <div className="roundstart-briefing-sidebands">
                        <article className="gold-panel roundstart-briefing-band">
                            <h3 className="roundstart-band-title">北周风云</h3>
                            <p>{event?.northDescription}</p>
                        </article>
                        <article className="gold-panel roundstart-briefing-band">
                            <h3 className="roundstart-band-title">南陈时局</h3>
                            <p>{event?.southDescription}</p>
                        </article>
                    </div>
                </section>

                <section className="roundstart-intelligence-grid animate-slide-up animate-delay-3">
                    <article className="glass-panel roundstart-power-card">
                        <h2 className="roundstart-section-title">国力对照</h2>
                        <div className="roundstart-radar-stack">
                            <div className="roundstart-radar-item">
                                <span className="roundstart-radar-label">北周</span>
                                <RadarChart data={northStats} size={244} />
                            </div>
                            <div className="roundstart-radar-item">
                                <span className="roundstart-radar-label">南陈</span>
                                <RadarChart data={southStats} size={244} />
                            </div>
                        </div>
                    </article>

                    <article className="gold-panel roundstart-map-card">
                        <h2 className="roundstart-section-title">天下形势图</h2>
                        <img
                            className="roundstart-map-image"
                            src={campaignMap.src}
                            alt={`当前战局地图：${campaignMap.label}`}
                        />
                    </article>

                    <article className="glass-panel roundstart-hint-card">
                        <NpcPortrait
                            name="冯道之"
                            alt="冯道之画像"
                            className="roundstart-advisor-portrait roundstart-advisor-portrait-large"
                            positionY="18%"
                        />
                        <div className="roundstart-hint-content">
                            <h2 className="roundstart-section-title">冯道之锦囊</h2>
                            <div className="roundstart-hint-copy">
                                <p className="roundstart-hint-line">
                                    <span className="roundstart-hint-label">朝堂势力：</span>
                                    <span className="roundstart-hint-text">{courtHintText}</span>
                                </p>
                                {externalHintText && (
                                    <p className="roundstart-hint-line">
                                        <span className="roundstart-hint-label">地方军头：</span>
                                        <span className="roundstart-hint-text">{externalHintText}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                    </article>
                </section>

                <div className="roundstart-bottom-stack animate-slide-up animate-delay-4">
                    {aftereffectSummary.length > 0 && (
                        <section className="glass-panel roundstart-aftereffect-strip">
                            <h2 className="roundstart-section-title">上回合余波</h2>
                            <div className="roundstart-aftereffect-copy">
                                {aftereffectSummary.map(item => (
                                    <p key={item}>{item}</p>
                                ))}
                            </div>
                        </section>
                    )}

                    <div className="roundstart-action-bar">
                        <button className="btn-primary roundstart-enter-btn" onClick={nextPhase}>
                            入朝
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="page-container round-start page-enter">
            {guideModal}

            <div className="page-utility-row animate-slide-up">
                <PageUtilityActions onOpenGuide={() => openGameplayGuide('gameplay')} />
            </div>

            <div className="round-header animate-slide-up">
                <span className="round-label">第 {currentRound} 回合</span>
                <span className="round-time">{event?.timeLabel}</span>
            </div>

            <h1 className="event-title animate-slide-up animate-delay-1">{eventTitle}</h1>

            <div className="glass-panel briefing-card animate-slide-up animate-delay-2">
                <h3 className="section-title">朝堂简报</h3>
                {roundBriefingParagraphs.map(paragraph => (
                    <p key={paragraph}>{paragraph}</p>
                ))}
                {contextNotes.length > 0 && (
                    <ul className="context-list">
                        {contextNotes.map((note, index) => (
                            <li key={`${currentRound}-context-${index}`}>{note}</li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="event-descriptions animate-slide-up animate-delay-3">
                <div className="gold-panel event-card north">
                    <h4 className="faction-title">北周风云</h4>
                    <p>{event?.northDescription}</p>
                </div>
                <div className="gold-panel event-card south">
                    <h4 className="faction-title">南陈暗线</h4>
                    <p>{event?.southDescription}</p>
                </div>
            </div>

            <div className="round-strategy-grid animate-slide-up animate-delay-3">
                <div className="historical-aid-grid">
                    <div className="gold-panel aid-map-card round-map-card">
                        <div className="aid-map-header">
                            <h3 className="section-title">天下形势图</h3>
                        </div>
                        <img className="aid-map-image" src={campaignMap.src} alt={`当前战局地图：${campaignMap.label}`} />
                    </div>
                </div>

                <div className="round-side-stack">
                    <div className="glass-panel round-radars-card">
                        <h3 className="section-title">南北国力对照</h3>
                        <div className="power-dashboard">
                            <div className="radar-section">
                                <RadarChart data={northStats} size={300} label="北周国力五维" />
                            </div>
                            <div className="radar-section">
                                <RadarChart data={southStats} size={300} label="南陈国力五维" />
                            </div>
                        </div>
                    </div>

                    {activeCampaignSummary && (
                        <div className="glass-panel aftereffect-card">
                            <h3 className="section-title">战局回响</h3>
                            <p>{activeCampaignSummary}</p>
                        </div>
                    )}

                    {previousPolicyAftereffect && (
                        <div className="glass-panel aftereffect-card">
                            <h3 className="section-title">上回合问政余波</h3>
                            <p>{previousPolicyAftereffect.summary}</p>
                            <div className="aftereffect-tags">
                                {Object.entries(previousPolicyAftereffect.effects).map(([dim, value]) => {
                                    if (!value) return null

                                    const dimNames: Record<string, string> = {
                                        finance: '财政',
                                        grain: '粮秣',
                                        military: '军事',
                                        socialOrder: '民生秩序',
                                        governance: '治理穿透力',
                                    }

                                    return (
                                        <span
                                            key={`aftereffect-${dim}`}
                                            className={`aftereffect-tag ${value > 0 ? 'positive' : 'negative'}`}
                                        >
                                            南陈{dimNames[dim]} {value > 0 ? '+' : ''}
                                            {value.toFixed(1)}
                                        </span>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {recentBacklash.length > 0 && (
                        <div className="glass-panel aftereffect-card">
                            <h3 className="section-title">朝中余波</h3>
                            <p>{recentBacklash[0].summary}</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="glass-panel hint-card animate-slide-up animate-delay-4">
                <NpcPortrait
                    name="冯道之"
                    alt="冯道之画像"
                    className="roundstart-advisor-portrait roundstart-advisor-portrait-large"
                    positionY="18%"
                />
                <h3 className="section-title">冯道之锦囊</h3>
                <p>
                    <strong>朝堂势力：</strong>
                    {courtHintText}
                </p>
                {externalHintText && (
                    <p>
                        <strong>地方军头：</strong>
                        {externalHintText}
                    </p>
                )}
            </div>

            <div className="enter-action animate-slide-up animate-delay-4">
                <button className="btn-primary btn-enter" onClick={nextPhase}>
                    入朝
                </button>
            </div>
        </div>
    )
}
