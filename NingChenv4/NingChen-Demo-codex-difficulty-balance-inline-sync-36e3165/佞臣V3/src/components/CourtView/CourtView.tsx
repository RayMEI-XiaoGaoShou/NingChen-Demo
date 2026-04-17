import { useGameStore } from '../../stores/gameStore'
import { useUiStore } from '../../stores/uiStore'
import { FIRST_ROUND_GUIDE_CONTENT } from '../../data/prologueContent'
import { getPowerLabel, getTrustLabel, getTrustLevel, type NPC } from '../../game/types'
import { getCourtBalance } from '../../game/nationEngine'
import { getExternalTerminalLabel, isTerminalExternalNpc } from '../../game/externalStatus'
import { getNpcRoundReaction } from '../../game/roundIntelEngine'
import { buildExternalLineProgress } from '../../game/externalLineProgress'
import { roundSupportsExternalAction } from '../../data/roundRuleConfig'
import { FirstRoundGuideModal } from '../FirstRoundGuide/FirstRoundGuideModal'
import { NpcPortrait } from '../NpcPortrait/NpcPortrait'
import { PageUtilityActions } from '../PageUtilityActions/PageUtilityActions'
import './CourtView.css'

function getExternalTiltLabel(npc: NPC): string {
    if (npc.alignmentBias === 'emperor') return '偏帝党'
    if (npc.alignmentBias === 'empress') return '偏后党'
    if (npc.alignmentBias === 'self') return '自立心重'
    return '两边观望'
}

function getExternalPostureLabel(npc: NPC): string {
    if (npc.externalStatus === 'rebellion') return '已反叛'
    if (npc.externalStatus === 'secession') return '已割据'
    if (npc.loyaltyToCourt <= 35 || npc.alignmentBias === 'self') return '离心已显'
    if (npc.externalStatus === 'watchful') return '持重观局'
    return '表面恭顺'
}

function getFactionDoctrine(factionId: 'emperor' | 'empress') {
    if (factionId === 'emperor') {
        return {
            title: '帝党：力主南征',
            summary: '帝党觉得，通过南征重塑皇室威严，统一全国军事调度，是小皇帝收权的必经之路。',
        }
    }

    return {
        title: '后党：优先安内',
        summary: '后党认为，先稳摄政秩序、中枢调度与地方控制，再谈大举南征，才不至于把全局推向失控。',
    }
}

function getExternalBlocDoctrine(factionId: 'longxi' | 'prairie') {
    if (factionId === 'longxi') {
        return {
            title: '陇右勋贵',
            summary: '虎据陇右的军事贵族，家族把持地方军政数十载，控遏与西域的商贸往来，部下精锐私兵唯领袖马首是瞻',
        }
    }

    return {
        title: '内附草原势力',
        summary: '被高官厚禄引诱而归附北周的草原部落族长，然草原狼的野心岂是区区财帛、官位能满足的？',
    }
}

function getDisplayedNpcTitle(npc: NPC): string {
    const titleMap: Record<string, string> = {
        weichimu: '上柱国、梁国公、都督河南诸军事【驻扎彭城】',
        'weichimù': '上柱国、梁国公、都督河南诸军事【驻扎彭城】',
        linghuelvguang: '上柱国、秦国公、都督河北诸军事【驻扎邺城】',
        duguwenyue: '后将军、上柱国、澜侯【驻扎天水】',
        hebabogui: '卫将军、上柱国、北地公、都督河西陇右诸军事【驻扎金城郡】',
        'hebaboguì': '卫将军、上柱国、北地公、都督河西陇右诸军事【驻扎金城郡】',
        erzhulie: '北庭节度使、上柱国【驻扎雁门】',
        'erzhulié': '北庭节度使、上柱国【驻扎雁门】',
        ansiming: '卢龙节度使、上柱国【驻扎范阳】',
    }

    return titleMap[npc.id] ?? npc.title
}

const LOYALTY_TOOLTIP = '忠诚度表示此人对北周朝廷的服从与归附程度，越低越容易离心。'
const TRUST_TOOLTIP = '信任度表示此人对你的个人信任程度，越高越容易被你说动。'
const WAR_TREND_TOOLTIP = '南征风向由帝党与后党在本回合的势力对比推导而来。帝党越强，朝中越容易转向主战。'
const SAFETY_RISK_TOOLTIP = '自身安危由低信任且有朝堂影响力的可执行角色共同决定。越多人戒备你、位置越高，风险越重。'

export function CourtView() {
    const {
        currentRound,
        difficulty,
        nextPhase,
        northPower,
        schemeCount,
        maxSchemes,
        npcs,
        factions,
        intelProgress,
        prevPhase,
        firstRoundGuideSeen,
        markFirstRoundGuideSeen,
        openGameplayGuide,
        shuCampaign,
        huainanCampaign,
    } = useGameStore()
    const { openNpcDetail } = useUiStore()

    const powerLabel = getPowerLabel(northPower)
    const courtNpcs = npcs.filter(npc => npc.powerBase === 'court')
    const externalNpcs = npcs.filter(npc => npc.powerBase === 'external' && npc.isAlive)
    const emperorMembers = courtNpcs.filter(npc => npc.factionId === 'emperor')
    const empressMembers = courtNpcs.filter(npc => npc.factionId === 'empress')
    const longxiMembers = externalNpcs.filter(npc => npc.factionId === 'longxi')
    const prairieMembers = externalNpcs.filter(npc => npc.factionId === 'prairie')
    const externalProgressMap = Object.fromEntries(
        externalNpcs.map(npc => [
            npc.id,
            buildExternalLineProgress({
                npc,
                unlockedSecrets: intelProgress[npc.id] ?? 0,
                difficulty,
                round: currentRound,
                externalActionEnabled: roundSupportsExternalAction(
                    currentRound,
                    npc.highActionBias === 'rebellion' ? 'rebellion' : 'secession',
                ),
            }),
        ]),
    )
    const { emperorInfluence, empressInfluence, ratio: warRatio } = getCourtBalance(factions, npcs, currentRound)

    const invasionRisk =
        warRatio >= 1.2
            ? { label: '南征箭在弦上', className: 'risk-critical' }
            : warRatio >= 0.8
                ? { label: '南征议势升温', className: 'risk-warning' }
                : { label: '朝廷仍偏安内', className: 'risk-safe' }

    const dangerNpcs = npcs.filter(
        npc =>
            npc.canExecute &&
            npc.powerBase === 'court' &&
            npc.trust <= 25 &&
            (factions.find(faction => faction.id === npc.factionId)?.courtInfluence ?? 0) >= 55,
    )

    const safetyRisk =
        dangerNpcs.some(npc => npc.trust <= 15)
            ? { label: '祸在帷幄', className: 'risk-critical' }
            : dangerNpcs.length > 0
                ? { label: '暗流渐浓', className: 'risk-warning' }
                : { label: '朝中尚可周旋', className: 'risk-safe' }

    return (
        <div className="page-container court-view page-enter">
            {currentRound === 1 && !firstRoundGuideSeen.court_observe && (
                <FirstRoundGuideModal
                    title={FIRST_ROUND_GUIDE_CONTENT.court_observe.title}
                    body={FIRST_ROUND_GUIDE_CONTENT.court_observe.body}
                    onClose={() => markFirstRoundGuideSeen('court_observe')}
                />
            )}

            <div className="page-utility-row utility-split animate-slide-up">
                <button className="btn-utility-secondary" onClick={prevPhase}>
                    上一页
                </button>
                <PageUtilityActions onOpenGuide={() => openGameplayGuide('gameplay')} />
            </div>

            <div className="court-header animate-slide-up">
                <h2 className="page-title">朝堂局势</h2>

                <div className="glass-panel status-bar">
                    <div className="status-item">
                        <span className="status-label">北周国力</span>
                        <span className={`status-value power-level-${powerLabel}`}>{powerLabel}</span>
                    </div>
                    <div className="status-item">
                        <span className="status-label">
                            南征风向
                            <span
                                className="status-help status-help-seal"
                                title={WAR_TREND_TOOLTIP}
                                aria-label={WAR_TREND_TOOLTIP}
                            >
                                ?
                            </span>
                        </span>
                        <span className={`status-value ${invasionRisk.className}`}>{invasionRisk.label}</span>
                    </div>
                    <div className="status-item">
                        <span className="status-label">
                            自身安危
                            <span
                                className="status-help status-help-seal"
                                title={SAFETY_RISK_TOOLTIP}
                                aria-label={SAFETY_RISK_TOOLTIP}
                            >
                                ?
                            </span>
                        </span>
                        <span className={`status-value ${safetyRisk.className}`}>{safetyRisk.label}</span>
                    </div>
                </div>
            </div>

            <div className="court-main-grid animate-slide-up animate-delay-2">
                <section className="court-column">
                    <div className="section-heading-wrap">
                        <h3 className="section-heading">朝堂势力</h3>
                    </div>

                    {[
                        {
                            id: 'emperor' as const,
                            influence: emperorInfluence,
                            faction: factions.find(faction => faction.id === 'emperor'),
                            members: emperorMembers,
                        },
                        {
                            id: 'empress' as const,
                            influence: empressInfluence,
                            faction: factions.find(faction => faction.id === 'empress'),
                            members: empressMembers,
                        },
                    ].map(group => {
                        const doctrine = getFactionDoctrine(group.id)
                        return (
                            <div key={group.id} className={`gold-panel faction-block faction-${group.id}`}>
                                <div className="faction-summary-card">
                                    <div className="faction-card-header">
                                        <div>
                                            <span className="faction-name">{doctrine.title}</span>
                                            <p className="faction-doctrine">{doctrine.summary}</p>
                                        </div>
                                        <span className="faction-value">综合实力 {group.influence.toFixed(1)}</span>
                                    </div>
                                    <div className="faction-bar">
                                        <div
                                            className="faction-fill"
                                            style={{ width: `${Math.max(12, Math.min(100, group.influence))}%` }}
                                        />
                                    </div>
                                    <div className="faction-metrics">
                                        <span>朝堂影响 {group.faction?.courtInfluence ?? 0}</span>
                                        <span>军事实力 {group.faction?.militaryPower ?? 0}</span>
                                        <span>内部稳定 {group.faction?.internalStability ?? 0}</span>
                                    </div>
                                </div>

                                <div className="npc-grid">
                                    {group.members.map((npc, index) => {
                                        const displayedTitle = getDisplayedNpcTitle(npc)
                                        const knownIntel = intelProgress[npc.id] ?? 0
                                        return (
                                            <button
                                                key={npc.id}
                                                className={`npc-card trust-${getTrustLevel(npc.trust)} animate-slide-up ${!npc.isAlive ? 'dead' : ''}`}
                                                style={{ animationDelay: `${0.12 + index * 0.04}s` }}
                                                onClick={() => openNpcDetail(npc.id)}
                                                disabled={!npc.isAlive}
                                            >
                                                <NpcPortrait
                                                    name={npc.name}
                                                    className="npc-card-portrait"
                                                    positionY="14%"
                                                    zoom={1.1}
                                                />
                                                <div className="npc-card-main">
                                                    <div className="npc-card-head">
                                                        <div className="npc-head-copy">
                                                            <span className="npc-name">{npc.name}</span>
                                                            <span className="npc-title">{displayedTitle}</span>
                                                        </div>
                                                        <div className="npc-attitude">
                                                            <div className="npc-trust-badge">{getTrustLabel(npc.trust)}</div>
                                                        </div>
                                                    </div>
                                                    <div className="npc-meta-row">
                                                        <span className="npc-meta-chip">{group.faction?.name}</span>
                                                        <span className="npc-meta-chip">
                                                            暗线已明：{knownIntel}/{npc.secretThreads.length}
                                                        </span>
                                                    </div>
                                                    {npc.isAlive && (
                                                        <span className="npc-reaction">
                                                            {getNpcRoundReaction(currentRound, npc, knownIntel, {
                                                                shuCampaignState: shuCampaign.resolvedState ?? shuCampaign.state,
                                                                huainanCampaignState: huainanCampaign.resolvedState ?? huainanCampaign.state,
                                                            })}
                                                        </span>
                                                    )}
                                                </div>
                                                {!npc.isAlive && <div className="npc-dead-overlay">已死</div>}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </section>

                <section className="court-column">
                    <div className="section-heading-wrap">
                        <h3 className="section-heading">地方军头</h3>
                    </div>

                    {[
                        {
                            id: 'longxi',
                            members: longxiMembers,
                        },
                        {
                            id: 'prairie',
                            members: prairieMembers,
                        },
                    ].map(group => {
                        const doctrine = getExternalBlocDoctrine(group.id as 'longxi' | 'prairie')
                        return (
                        <div key={group.id} className={`gold-panel faction-block faction-${group.id} external-block`}>
                            <div className="faction-summary-card faction-summary-card-external">
                                <div className="faction-card-header">
                                    <div>
                                        <span className="faction-name">{doctrine.title}</span>
                                        <p className="faction-doctrine">{doctrine.summary}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="external-grid">
                                {group.members.map((npc, index) => {
                                    const progress = externalProgressMap[npc.id]
                                    const displayedTitle = getDisplayedNpcTitle(npc)
                                    const isTerminal = isTerminalExternalNpc(npc)
                                    return (
                                        <button
                                            key={npc.id}
                                            className={`external-card animate-slide-up ${isTerminal ? 'dead' : ''}`}
                                            style={{ animationDelay: `${0.14 + index * 0.05}s` }}
                                            onClick={() => openNpcDetail(npc.id)}
                                            disabled={isTerminal}
                                        >
                                            <NpcPortrait
                                                name={npc.name}
                                                className="external-card-portrait"
                                                positionY="14%"
                                                zoom={1.08}
                                            />
                                            <div className="external-main">
                                                <div className="external-card-header">
                                                    <div className="external-name">{npc.name}</div>
                                                    <div className="external-title npc-title">{displayedTitle}</div>
                                                </div>
                                                <div className="external-kpi-row">
                                                    <div className="external-kpi">
                                                        <span className="external-kpi-label">军力</span>
                                                        <strong className="external-kpi-value">{npc.militaryPower}</strong>
                                                    </div>
                                                    <div
                                                        className="external-kpi external-kpi-explained"
                                                        title={LOYALTY_TOOLTIP}
                                                        aria-label={LOYALTY_TOOLTIP}
                                                    >
                                                        <span className="external-kpi-label">忠诚度（对朝廷）</span>
                                                        <strong className="external-kpi-value">{npc.loyaltyToCourt}</strong>
                                                    </div>
                                                    <div
                                                        className="external-kpi external-kpi-explained"
                                                        title={TRUST_TOOLTIP}
                                                        aria-label={TRUST_TOOLTIP}
                                                    >
                                                        <span className="external-kpi-label">信任度（对主角）</span>
                                                        <strong className="external-kpi-value">{npc.trust}</strong>
                                                    </div>
                                                </div>
                                                <div className="external-stats">
                                                    <span>{getExternalTiltLabel(npc)}</span>
                                                    <span>{getExternalPostureLabel(npc)}</span>
                                                </div>
                                                {!isTerminal && (
                                                    <span className="npc-reaction external-reaction">
                                                        {getNpcRoundReaction(currentRound, npc, intelProgress[npc.id] ?? 0, {
                                                            shuCampaignState: shuCampaign.resolvedState ?? shuCampaign.state,
                                                            huainanCampaignState: huainanCampaign.resolvedState ?? huainanCampaign.state,
                                                        })}
                                                    </span>
                                                )}
                                                {!isTerminal && progress && (
                                                    <span className="npc-reaction external-reaction external-progress-copy">
                                                        {progress.gapText}
                                                    </span>
                                                )}
                                            </div>
                                            {isTerminal && (
                                                <div className="npc-dead-overlay">{getExternalTerminalLabel(npc.externalStatus)}</div>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )})}
                </section>
            </div>

            <div className="action-footer animate-slide-up animate-delay-4">
                <div className="scheme-counter">
                    今日可用计谋：<span className="highlight-number">{maxSchemes - schemeCount}</span> / {maxSchemes}
                </div>
                <button className="btn-primary" onClick={nextPhase} disabled={schemeCount >= maxSchemes}>
                    {schemeCount >= maxSchemes ? '今日已无可落之子' : '看定人选，去落子'}
                </button>
            </div>
        </div>
    )
}
