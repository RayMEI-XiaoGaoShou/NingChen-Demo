import { useGameStore } from '../../stores/gameStore'
import { ROUND_EVENTS } from '../../data/rounds'
import { ROUND_CONTEXT_NOTES } from '../../data/roundContext'
import { FIRST_ROUND_GUIDE_CONTENT } from '../../data/prologueContent'
import { getRoundStartCampaignDisplay } from '../../game/campaignDisplayEngine'
import { RadarChart } from '../RadarChart/RadarChart'
import { FirstRoundGuideModal } from '../FirstRoundGuide/FirstRoundGuideModal'
import { getRoundAdvisorHint } from '../../game/roundIntelEngine'
import './RoundStart.css'

export function RoundStart() {
    const {
        currentRound,
        nextPhase,
        northStats,
        southStats,
        npcs,
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
    const advisorHint = getRoundAdvisorHint(currentRound, npcs)
    const previousPolicyAftereffect =
        lastPolicyAftereffect && lastPolicyAftereffect.sourceRound === currentRound - 1
            ? lastPolicyAftereffect
            : null
    const campaignDisplay = getRoundStartCampaignDisplay(currentRound, shuCampaign, huainanCampaign)
    const campaignMap = campaignDisplay.map
    const activeCampaignSummary = campaignDisplay.summary
    const eventTitle = campaignDisplay.eventName ?? event?.eventName

    return (
        <div className="page-container round-start animate-fade-in">
            {currentRound === 1 && !firstRoundGuideSeen.round_start && (
                <FirstRoundGuideModal
                    title={FIRST_ROUND_GUIDE_CONTENT.round_start.title}
                    body={FIRST_ROUND_GUIDE_CONTENT.round_start.body}
                    onClose={() => markFirstRoundGuideSeen('round_start')}
                />
            )}

            <div className="page-utility-row animate-slide-up">
                <button className="btn-help" onClick={() => openGameplayGuide('gameplay')}>
                    玩法说明
                </button>
            </div>

            <div className="round-header animate-slide-up">
                <span className="round-label">第 {currentRound} 回合</span>
                <span className="round-time">{event?.timeLabel}</span>
            </div>

            <h1 className="event-title animate-slide-up animate-delay-1">{eventTitle}</h1>

            <div className="glass-panel briefing-card animate-slide-up animate-delay-2">
                <h3 className="section-title">朝局简报</h3>
                <p>{event?.briefing}</p>
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
                    <h4 className="faction-title">北朝风云</h4>
                    <p>{event?.northDescription}</p>
                </div>
                <div className="gold-panel event-card south">
                    <h4 className="faction-title">南陈暗影</h4>
                    <p>{event?.southDescription}</p>
                </div>
            </div>

            <div className="power-dashboard animate-slide-up animate-delay-3">
                <div className="radar-section">
                    <RadarChart data={northStats} size={220} label="北周国力五维" />
                </div>
                <div className="radar-section">
                    <RadarChart data={southStats} size={220} label="南陈国力五维" />
                </div>
            </div>

            <div className="historical-aid-grid animate-slide-up animate-delay-3">
                <div className="gold-panel aid-map-card">
                    <div className="aid-map-header">
                        <h3 className="section-title">天下形势图</h3>
                    </div>
                    <img
                        className="aid-map-image"
                        src={campaignMap.src}
                        alt={`当前战局地图：${campaignMap.label}`}
                    />
                </div>
            </div>

            <div className="glass-panel hint-card animate-slide-up animate-delay-4">
                <h3 className="section-title">冯道之锦囊</h3>
                <p>{advisorHint || event?.hint}</p>
            </div>

            {previousPolicyAftereffect && (
                <div className="glass-panel aftereffect-card animate-slide-up animate-delay-4">
                    <h3 className="section-title">上回合问政余波</h3>
                    <p>{previousPolicyAftereffect.summary}</p>
                    <div className="aftereffect-tags">
                        {Object.entries(previousPolicyAftereffect.effects).map(([dim, value]) => {
                            if (!value) return null
                            const dimNames: Record<string, string> = {
                                finance: '财政',
                                grain: '粮赋',
                                military: '军事',
                                socialOrder: '民生秩序',
                                governance: '统治穿透力',
                            }
                            return (
                                <span
                                    key={`aftereffect-${dim}`}
                                    className={`aftereffect-tag ${value > 0 ? 'positive' : 'negative'}`}
                                >
                                    南陈{dimNames[dim]} {value > 0 ? '+' : ''}{value.toFixed(1)}
                                </span>
                            )
                        })}
                    </div>
                </div>
            )}

            {recentBacklash.length > 0 && (
                <div className="glass-panel aftereffect-card animate-slide-up animate-delay-4">
                    <h3 className="section-title">朝中余波</h3>
                    <p>{recentBacklash[0].summary}</p>
                </div>
            )}

            {activeCampaignSummary && (
                <div className="glass-panel aftereffect-card animate-slide-up animate-delay-4">
                    <h3 className="section-title">战局回响</h3>
                    <p>{activeCampaignSummary}</p>
                </div>
            )}

            <div className="enter-action animate-slide-up animate-delay-4">
                <button className="btn-primary btn-enter" onClick={nextPhase}>
                    入朝
                </button>
            </div>
        </div>
    )
}
