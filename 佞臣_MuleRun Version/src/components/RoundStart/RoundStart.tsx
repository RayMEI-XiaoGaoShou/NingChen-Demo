import { useGameStore } from '../../stores/gameStore'
import { ROUND_EVENTS } from '../../data/rounds'
import { ROUND_CONTEXT_NOTES } from '../../data/roundContext'
import { FIRST_ROUND_GUIDE_CONTENT } from '../../data/prologueContent'
import { getRoundStartCampaignDisplay } from '../../game/campaignDisplayEngine'
import { RadarChart } from '../RadarChart/RadarChart'
import { FirstRoundGuideModal } from '../FirstRoundGuide/FirstRoundGuideModal'
import { getRoundAdvisorHint } from '../../game/roundIntelEngine'
import './RoundStart.css'

function getPreviousChronicle(round: number, lastSummary: string | null): string {
    if (round === 1 || !lastSummary) {
        return '前局未曾落墨。今朝诸议尚在铺陈，真正危险的不是谁先出声，而是谁先把下一步国策说成定论。'
    }

    return `上回合揭卷之后，${lastSummary} 朝中并未因此平静，旧波未尽，新局已在殿上悄然换气。`
}

function getCurrentChronicle(northDescription: string | undefined, southDescription: string | undefined): string[] {
    return [
        northDescription
            ? `北地朝堂这边，${northDescription}`
            : '北地朝堂这边，群臣都在等一个能压住满殿争论的说法。',
        southDescription
            ? `而在江左，${southDescription}`
            : '而在江左，女帝并未停手，所有新政都在等你于北地多争得半分时间。',
    ]
}

function getMissionText(round: number, activeCampaignSummary: string | null, advisorHint: string | null) {
    return {
        scan: round === 1 ? '先看天下形势图与国力雷达，知道这一局是南北双线拉扯。' : '先看地图与雷达的变化，确认本回合局势是收紧还是松动。',
        stakes: activeCampaignSummary ?? '再读朝局简报与南北风云，判断本回合真正会动摇朝局的是哪一股力。',
        action: advisorHint ?? '最后记住冯道之一语，再入朝锁人落子。',
    }
}

export function RoundStart() {
    const {
        currentRound,
        nextPhase,
        northStats,
        southStats,
        npcs,
        lastPolicyAftereffect,
        lastSettlement,
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
    const mission = getMissionText(currentRound, activeCampaignSummary, advisorHint)
    const chronicleLines = getCurrentChronicle(event?.northDescription, event?.southDescription)

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
                <div className="round-heading-block">
                    <span className="page-eyebrow">回合开场</span>
                    <div className="round-heading-main">
                        <span className="round-label">第 {currentRound} 回合</span>
                        <span className="round-time">{event?.timeLabel}</span>
                    </div>
                </div>
                <h1 className="event-title">{eventTitle}</h1>
            </div>

            <div className="page-mission-strip animate-slide-up animate-delay-1">
                <div className="page-mission-item">
                    <span className="page-mission-label">先看什么</span>
                    <p className="page-mission-text">{mission.scan}</p>
                </div>
                <div className="page-mission-item">
                    <span className="page-mission-label">为什么重要</span>
                    <p className="page-mission-text">{mission.stakes}</p>
                </div>
                <div className="page-mission-item">
                    <span className="page-mission-label">下一步做什么</span>
                    <p className="page-mission-text">{mission.action}</p>
                </div>
            </div>

            <section className="decree-panel round-chronicle animate-slide-up animate-delay-2">
                <div className="round-chronicle-head">
                    <span className="round-chronicle-kicker">朝局简报</span>
                    <h3 className="section-title">卷首记事</h3>
                </div>
                <div className="round-chronicle-body">
                    <div className="chronicle-block">
                        <span className="chronicle-label">上回合余波</span>
                        <p>{getPreviousChronicle(currentRound, lastSettlement?.summaryText ?? null)}</p>
                    </div>
                    <div className="chronicle-block">
                        <span className="chronicle-label">本回合新局</span>
                        {chronicleLines.map(line => (
                            <p key={line}>{line}</p>
                        ))}
                    </div>
                </div>
            </section>

            <div className="round-strategy-grid animate-slide-up animate-delay-3">
                <section className="gold-panel round-map-card">
                    <div className="round-core-head">
                        <div>
                            <span className="round-core-kicker">天下形势图</span>
                            <h3 className="section-title">这一回合的大势落点</h3>
                        </div>
                        <span className="round-core-meta">{campaignMap.label}</span>
                    </div>
                    <img
                        className="aid-map-image"
                        src={campaignMap.src}
                        alt={`当前战局地图：${campaignMap.label}`}
                    />
                    <p className="round-core-caption">
                        先看地理重心是否南移、边线是否收紧，再决定入朝时该顺着哪一股声势说话。
                    </p>
                </section>

                <section className="glass-panel round-radars-card">
                    <div className="round-core-head">
                        <div>
                            <span className="round-core-kicker">国力仪盘</span>
                            <h3 className="section-title">南北两朝的硬底子</h3>
                        </div>
                        <span className="round-core-meta">地图看走向，雷达看底盘</span>
                    </div>
                    <div className="power-dashboard">
                        <div className="radar-section">
                            <RadarChart data={northStats} size={288} label="北周五维" />
                        </div>
                        <div className="radar-section">
                            <RadarChart data={southStats} size={288} label="南陈五维" />
                        </div>
                    </div>
                </section>
            </div>

            <div className="event-descriptions animate-slide-up animate-delay-3">
                <div className="gold-panel event-card north">
                    <h4 className="faction-title">北地风云</h4>
                    <p>{event?.northDescription}</p>
                </div>
                <div className="gold-panel event-card south">
                    <h4 className="faction-title">江左回声</h4>
                    <p>{event?.southDescription}</p>
                </div>
            </div>

            <div className="round-notes-grid animate-slide-up animate-delay-4">
                <div className="glass-panel note-card">
                    <h3 className="section-title">史官旁注</h3>
                    <ul className="context-list">
                        {contextNotes.map((note, index) => (
                            <li key={`${currentRound}-context-${index}`}>{note}</li>
                        ))}
                    </ul>
                </div>

                <div className="advisor-panel">
                    <div className="advisor-title">冯道之一语</div>
                    <p className="advisor-copy">
                        <strong>{advisorHint || event?.hint || '先看谁急，后看谁稳。'}</strong>
                    </p>
                    {activeCampaignSummary && <p className="advisor-copy">{activeCampaignSummary}</p>}
                </div>

                {(previousPolicyAftereffect || recentBacklash.length > 0) && (
                    <div className="glass-panel note-card">
                        <h3 className="section-title">余波未尽</h3>
                        {previousPolicyAftereffect && <p className="round-note-text">{previousPolicyAftereffect.summary}</p>}
                        {recentBacklash.length > 0 && <p className="round-note-text">{recentBacklash[0].summary}</p>}
                    </div>
                )}
            </div>

            <div className="enter-action animate-slide-up animate-delay-4">
                <button className="btn-primary btn-enter" onClick={nextPhase}>
                    入朝观局
                </button>
            </div>
        </div>
    )
}
