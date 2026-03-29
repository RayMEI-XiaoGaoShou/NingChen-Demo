// ========================================
// 回合开始页 — P4 更新
// 新增北周五维雷达图 + 南北相对国力播报
// ========================================

import { useGameStore } from '../../stores/gameStore'
import { ROUND_EVENTS } from '../../data/rounds'
import { ROUND_CONTEXT_NOTES } from '../../data/roundContext'
import { HISTORICAL_AID } from '../../data/historicalAid'
import { FIRST_ROUND_GUIDE_CONTENT } from '../../data/prologueContent'
import { RadarChart } from '../RadarChart/RadarChart'
import { FirstRoundGuideModal } from '../FirstRoundGuide/FirstRoundGuideModal'
import { getRelativePowerLabel, getRelativePowerLevel } from '../../game/relativePower'
import { getRoundAdvisorHint } from '../../game/roundIntelEngine'
import './RoundStart.css'

export function RoundStart() {
    const { currentRound, nextPhase, northStats, southStats, northPower, southPower, npcs, lastPolicyAftereffect, firstRoundGuideSeen, markFirstRoundGuideSeen, openGameplayGuide } = useGameStore()
    const event = ROUND_EVENTS[currentRound - 1]
    const contextNotes = ROUND_CONTEXT_NOTES[currentRound] ?? []
    const aid = HISTORICAL_AID[currentRound]
    const relativeLabel = getRelativePowerLabel(northPower, southPower)
    const relativeLevel = getRelativePowerLevel(northPower, southPower)
    const advisorHint = getRoundAdvisorHint(currentRound, npcs)
    const previousPolicyAftereffect =
        lastPolicyAftereffect && lastPolicyAftereffect.sourceRound === currentRound - 1
            ? lastPolicyAftereffect
            : null

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

            <h1 className="event-title animate-slide-up animate-delay-1">{event?.eventName}</h1>

            <div className="glass-panel briefing-card animate-slide-up animate-delay-2">
                <h3 className="section-title">📜 朝局简报</h3>
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

            {/* 北周五维 + 南北国力相对播报 */}
            <div className="power-dashboard animate-slide-up animate-delay-3">
                <div className="radar-section">
                    <RadarChart data={northStats} size={220} label="北周国力五维" />
                </div>
                <div className="radar-section">
                    <RadarChart data={southStats} size={220} label="南陈国力五维" />
                </div>
                <div className="relative-power-section glass-panel">
                    <h4 className="section-title">南陈相对北周</h4>
                    <span className={`relative-badge level-${relativeLevel}`}>{relativeLabel}</span>
                    <p className="relative-hint">
                        {relativeLevel === 'danger' ? '南陈实力远不及北周，需加倍努力削弱北方。'
                            : relativeLevel === 'warning' ? '差距仍在，但可以有所作为。'
                                : relativeLevel === 'neutral' ? '南北势均力敌，局势微妙。'
                                    : '南陈已逐渐占据主动。'}
                    </p>
                </div>
            </div>

            {aid && (
                <div className="historical-aid-grid animate-slide-up animate-delay-3">
                    <div className="glass-panel aid-card">
                        <h3 className="section-title">🧭 历史辅助</h3>
                        <p><strong>地理提示：</strong>{aid.geoHint}</p>
                        <p><strong>势力提示：</strong>{aid.factionHint}</p>
                        <p><strong>战略提示：</strong>{aid.strategyHint}</p>
                    </div>
                    <div className="gold-panel map-card">
                        <h3 className="section-title">🗺 方位示意</h3>
                        <div className="map-schematic">
                            <span className={`map-node north ${aid.hotspots.includes('关中') ? 'hot' : ''}`}>关中</span>
                            <span className={`map-node northeast ${aid.hotspots.includes('河北') ? 'hot' : ''}`}>河北</span>
                            <span className={`map-node northwest ${aid.hotspots.includes('河西') || aid.hotspots.includes('陇右') ? 'hot' : ''}`}>河西/陇右</span>
                            <span className={`map-node prairie ${aid.hotspots.includes('草原') ? 'hot' : ''}`}>草原</span>
                            <span className={`map-node center ${aid.hotspots.includes('淮南') || aid.hotspots.includes('寿春') ? 'hot' : ''}`}>淮南/寿春</span>
                            <span className={`map-node southwest ${aid.hotspots.includes('荆益') || aid.hotspots.includes('蜀地') || aid.hotspots.includes('益州') ? 'hot' : ''}`}>荆益/蜀地</span>
                            <span className={`map-node south ${aid.hotspots.includes('建康') ? 'hot' : ''}`}>南陈/建康</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="glass-panel hint-card animate-slide-up animate-delay-4">
                <h3 className="section-title">🎐 冯道之锦囊</h3>
                <p>{advisorHint || event?.hint}</p>
            </div>

            {previousPolicyAftereffect && (
                <div className="glass-panel aftereffect-card animate-slide-up animate-delay-4">
                    <h3 className="section-title">🕊 上回合问政余波</h3>
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

            <div className="enter-action animate-slide-up animate-delay-4">
                <button className="btn-primary btn-enter" onClick={nextPhase}>
                    入 朝
                </button>
            </div>
        </div>
    )
}
