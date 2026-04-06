import { useGameStore } from '../../stores/gameStore'
import { useUiStore } from '../../stores/uiStore'
import { FIRST_ROUND_GUIDE_CONTENT } from '../../data/prologueContent'
import { getPowerLabel, getTrustLabel, getTrustLevel, type NPC } from '../../game/types'
import { getCourtBalance } from '../../game/nationEngine'
import { getNpcRoundReaction } from '../../game/roundIntelEngine'
import { FirstRoundGuideModal } from '../FirstRoundGuide/FirstRoundGuideModal'
import { NpcPortrait } from '../NpcPortrait/NpcPortrait'
import './CourtView.css'

function getExternalTiltLabel(npc: NPC): string {
    if (npc.alignmentBias === 'emperor') return '偏帝党'
    if (npc.alignmentBias === 'empress') return '偏后党'
    if (npc.alignmentBias === 'self') return '自立心重'
    return '两边观望'
}

function getExternalPostureLabel(npc: NPC): string {
    if (npc.externalStatus === 'rebellion') return '已露反迹'
    if (npc.externalStatus === 'secession') return '割据将成'
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
        summary: '后党认为，摄政秩序、中枢调度与地方控制一旦失手，南征就只会把国家更快推向失控。',
    }
}

function getAdvisorAside(dangerNpcs: NPC[], schemeRoom: number): string {
    if (dangerNpcs.length > 0) {
        return `先盯 ${dangerNpcs[0].name}。此人位高而疑心重，若再任其顺势发言，容易把本回合的朝议往对你不利的方向推。`
    }

    if (schemeRoom <= 1) {
        return '本回合可落子的次数不多，宁可挑真正会牵动朝局的人，也别把计谋浪费在声量太小的人身上。'
    }

    return '先分清谁在争议程、谁在争兵权、谁只是在借局势抬身价。看清这一层，再决定今日先动谁。'
}

export function CourtView() {
    const {
        currentRound,
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
    } = useGameStore()
    const { openNpcDetail } = useUiStore()

    const powerLabel = getPowerLabel(northPower)
    const courtNpcs = npcs.filter(npc => npc.powerBase === 'court')
    const externalNpcs = npcs.filter(npc => npc.powerBase === 'external' && npc.isAlive)
    const emperorMembers = courtNpcs.filter(npc => npc.factionId === 'emperor')
    const empressMembers = courtNpcs.filter(npc => npc.factionId === 'empress')
    const longxiMembers = externalNpcs.filter(npc => npc.factionId === 'longxi')
    const prairieMembers = externalNpcs.filter(npc => npc.factionId === 'prairie')
    const { emperorInfluence, empressInfluence, ratio: warRatio } = getCourtBalance(factions, npcs, currentRound)

    const invasionRisk =
        warRatio >= 1.2
            ? { label: '南征箭在弦上', className: 'risk-critical' }
            : warRatio >= 0.8
                ? { label: '南征议势升温', className: 'risk-warning' }
                : { label: '朝廷仍偏安内', className: 'risk-safe' }

    const dangerNpcs = npcs.filter(npc =>
        npc.canExecute &&
        npc.powerBase === 'court' &&
        npc.trust <= 25 &&
        (factions.find(faction => faction.id === npc.factionId)?.courtInfluence ?? 0) >= 55)

    const safetyRisk =
        dangerNpcs.some(npc => npc.trust <= 15)
            ? { label: '祸在帷幄', className: 'risk-critical' }
            : dangerNpcs.length > 0
                ? { label: '暗流渐涌', className: 'risk-warning' }
                : { label: '朝中尚可周旋', className: 'risk-safe' }

    const adviserAside = getAdvisorAside(dangerNpcs, maxSchemes - schemeCount)

    return (
        <div className="page-container court-view animate-fade-in">
            {currentRound === 1 && !firstRoundGuideSeen.court_observe && (
                <FirstRoundGuideModal
                    title={FIRST_ROUND_GUIDE_CONTENT.court_observe.title}
                    body={FIRST_ROUND_GUIDE_CONTENT.court_observe.body}
                    onClose={() => markFirstRoundGuideSeen('court_observe')}
                />
            )}

            <div className="page-utility-row utility-split animate-slide-up">
                <button className="btn-utility-secondary" onClick={prevPhase}>上一页</button>
                <button className="btn-help" onClick={() => openGameplayGuide('gameplay')}>
                    玩法说明
                </button>
            </div>

            <div className="court-header animate-slide-up">
                <span className="page-eyebrow">朝堂观察</span>
                <h2 className="page-title">先辨阵营，再锁人心</h2>

                <div className="page-mission-strip">
                    <div className="page-mission-item">
                        <span className="page-mission-label">先看什么</span>
                        <p className="page-mission-text">先看帝党与后党的朝议方向，再看哪些人手握执行力、最可能改变局面。</p>
                    </div>
                    <div className="page-mission-item">
                        <span className="page-mission-label">为什么重要</span>
                        <p className="page-mission-text">朝堂人物决定议程，地方军头决定兵权与外线压力，今天该动谁必须从这两层一起判断。</p>
                    </div>
                    <div className="page-mission-item">
                        <span className="page-mission-label">下一步做什么</span>
                        <p className="page-mission-text">看定目标后进入施计页落子，本回合还有 {maxSchemes - schemeCount} 次可用计谋。</p>
                    </div>
                </div>

                <div className="glass-panel status-bar">
                    <div className="status-item">
                        <span className="status-label">北周国力</span>
                        <span className={`status-value power-level-${powerLabel}`}>{powerLabel}</span>
                    </div>
                    <div className="status-item">
                        <span className="status-label">南征风向</span>
                        <span className={`status-value ${invasionRisk.className}`}>{invasionRisk.label}</span>
                    </div>
                    <div className="status-item">
                        <span className="status-label">自身安危</span>
                        <span className={`status-value ${safetyRisk.className}`}>{safetyRisk.label}</span>
                    </div>
                </div>
            </div>

            <div className="advisor-panel animate-slide-up animate-delay-1">
                <div className="advisor-title">冯道之旁批</div>
                <p className="advisor-copy">{adviserAside}</p>
            </div>

            <div className="court-main-grid animate-slide-up animate-delay-2">
                <section className="court-column">
                    <div className="section-heading-wrap">
                        <h3 className="section-heading">朝堂势力</h3>
                        <p className="section-subheading">帝党争议程，后党稳中枢。看清阵营逻辑，再看阵营里谁最值得动。</p>
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
                                        <span className="faction-value">综合势能 {group.influence.toFixed(1)}</span>
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
                                    {group.members.map((npc, index) => (
                                        <button
                                            key={npc.id}
                                            className={`npc-card trust-${getTrustLevel(npc.trust)} animate-slide-up ${!npc.isAlive ? 'dead' : ''}`}
                                            style={{ animationDelay: `${0.12 + index * 0.04}s` }}
                                            onClick={() => openNpcDetail(npc.id)}
                                            disabled={!npc.isAlive}
                                        >
                                            <NpcPortrait
                                                name={npc.name}
                                                className="npc-avatar-placeholder"
                                                framed
                                                positionY="18%"
                                                zoom={1.28}
                                            />
                                            <div className="npc-info">
                                                <span className="npc-name">{npc.name}</span>
                                                <span className="npc-title">{npc.title}</span>
                                                <span className="npc-faction">{group.faction?.name}</span>
                                                {npc.isAlive && (
                                                    <span className="npc-reaction">
                                                        {getNpcRoundReaction(currentRound, npc, intelProgress[npc.id] ?? 0)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="npc-trust-badge">
                                                {getTrustLabel(npc.trust)}
                                            </div>
                                            {!npc.isAlive && <div className="npc-dead-overlay">已死</div>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </section>

                <section className="court-column">
                    <div className="section-heading-wrap">
                        <h3 className="section-heading">地方军头</h3>
                        <p className="section-subheading">左看陇右勋贵，右看内附草原。兵权、忠诚与姿态，一眼就该看清。</p>
                    </div>

                    {[
                        {
                            id: 'longxi',
                            title: '陇右勋贵',
                            summary: '西线重兵在握，最在意的是边线主导权与战后接管权。',
                            members: longxiMembers,
                        },
                        {
                            id: 'prairie',
                            title: '内附草原势力',
                            summary: '表面受朝廷节制，实则始终在看自己的价码与退路。',
                            members: prairieMembers,
                        },
                    ].map(group => (
                        <div key={group.id} className="glass-panel external-block">
                            <div className="external-block-head">
                                <div>
                                    <span className="faction-name">{group.title}</span>
                                    <p className="section-subheading">{group.summary}</p>
                                </div>
                            </div>

                            <div className="external-grid">
                                {group.members.map((npc, index) => (
                                    <button
                                        key={npc.id}
                                        className="glass-panel external-card animate-slide-up"
                                        style={{ animationDelay: `${0.14 + index * 0.05}s` }}
                                        onClick={() => openNpcDetail(npc.id)}
                                    >
                                        <NpcPortrait
                                            name={npc.name}
                                            className="external-portrait"
                                            framed
                                            positionY="18%"
                                            zoom={1.28}
                                        />
                                        <div className="external-main">
                                            <div className="external-card-header">
                                                <div className="external-name">{npc.name}</div>
                                                <div className="external-title">{npc.title}</div>
                                            </div>
                                            <div className="external-kpi-row">
                                                <div className="external-kpi">
                                                    <span className="external-kpi-label">军力</span>
                                                    <strong className="external-kpi-value">{npc.militaryPower}</strong>
                                                </div>
                                                <div className="external-kpi">
                                                    <span className="external-kpi-label">忠诚</span>
                                                    <strong className="external-kpi-value">{npc.loyaltyToCourt}</strong>
                                                </div>
                                            </div>
                                            <div className="external-stats">
                                                <span>{getExternalTiltLabel(npc)}</span>
                                                <span>{getExternalPostureLabel(npc)}</span>
                                            </div>
                                            <span className="npc-reaction external-reaction">
                                                {getNpcRoundReaction(currentRound, npc, intelProgress[npc.id] ?? 0)}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
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
