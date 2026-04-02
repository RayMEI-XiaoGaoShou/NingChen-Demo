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
    if (npc.alignmentBias === 'self') return '自立'
    return '摇摆'
}

function getExternalPostureLabel(npc: NPC): string {
    if (npc.externalStatus === 'rebellion') return '反叛'
    if (npc.externalStatus === 'secession') return '割据'
    if (npc.loyaltyToCourt <= 35 || npc.alignmentBias === 'self') return '离心'
    if (npc.externalStatus === 'watchful') return '观望'
    return '忠顺'
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
    const courtFactions = factions
    const courtNpcs = npcs.filter(npc => npc.powerBase === 'court')
    const externalNpcs = npcs.filter(npc => npc.powerBase === 'external' && npc.isAlive)
    const { emperorInfluence, empressInfluence, ratio: warRatio } = getCourtBalance(courtFactions, npcs, currentRound)

    const invasionRisk =
        warRatio >= 1.2
            ? { label: '南征在即', className: 'risk-critical' }
            : warRatio >= 0.8
                ? { label: '南征议起', className: 'risk-warning' }
                : { label: '安内占优', className: 'risk-safe' }

    const dangerNpcs = npcs.filter(npc =>
        npc.canExecute &&
        npc.powerBase === 'court' &&
        npc.trust <= 25 &&
        (factions.find(faction => faction.id === npc.factionId)?.courtInfluence ?? 0) >= 55)

    const safetyRisk =
        dangerNpcs.some(npc => npc.trust <= 15)
            ? { label: '祸在旦夕', className: 'risk-critical' }
            : dangerNpcs.length > 0
                ? { label: '暗流涌动', className: 'risk-warning' }
                : { label: '朝中无虞', className: 'risk-safe' }

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
                <h2 className="page-title">本 局 观 势</h2>

                <div className="glass-panel status-bar">
                    <div className="status-item">
                        <span className="status-label">北周国力</span>
                        <span className={`status-value power-level-${powerLabel}`}>{powerLabel}</span>
                    </div>
                    <div className="status-item">
                        <span className="status-label">南征风险</span>
                        <span className={`status-value ${invasionRisk.className}`}>{invasionRisk.label}</span>
                    </div>
                    <div className="status-item">
                        <span className="status-label">自身安全</span>
                        <span className={`status-value ${safetyRisk.className}`}>{safetyRisk.label}</span>
                    </div>
                </div>
            </div>

            <div className="section-container animate-slide-up animate-delay-1">
                <h3 className="section-heading">朝堂势力分布</h3>
                <div className="faction-grid">
                    {courtFactions.map(faction => {
                        const combinedStrength = faction.id === 'emperor' ? emperorInfluence : empressInfluence
                        return (
                            <div key={faction.id} className={`gold-panel faction-card faction-${faction.id}`}>
                                <div className="faction-card-header">
                                    <span className="faction-name">{faction.name}</span>
                                    <span className="faction-value">综合实力 {combinedStrength.toFixed(1)}</span>
                                </div>
                                <div className="faction-bar">
                                    <div
                                        className="faction-fill"
                                        style={{ width: `${Math.max(12, Math.min(100, combinedStrength))}%` }}
                                    />
                                </div>
                                <div className="faction-metrics">
                                    <span>权势 {faction.courtInfluence}</span>
                                    <span>军事实力 {faction.militaryPower}</span>
                                    <span>内部稳定度 {faction.internalStability}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="section-container animate-slide-up animate-delay-1">
                <h3 className="section-heading">地方军头</h3>
                <p className="section-subheading">
                    他们不属于后党或帝党，于中枢朝局影响有限，却手握地方兵权，是北周不可忽视的外镇力量。
                </p>
                <div className="external-grid">
                    {externalNpcs.map((npc, index) => (
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
                                <div className="external-stats">
                                    <span>军力 {npc.militaryPower}</span>
                                    <span>忠诚 {npc.loyaltyToCourt}</span>
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

            <div className="section-container animate-slide-up animate-delay-2">
                <h3 className="section-heading">朝堂势力</h3>
                <div className="npc-grid">
                    {courtNpcs.map((npc, index) => (
                        <button
                            key={npc.id}
                            className={`npc-card trust-${getTrustLevel(npc.trust)} animate-slide-up ${!npc.isAlive ? 'dead' : ''}`}
                            style={{ animationDelay: `${0.2 + index * 0.05}s` }}
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
                                <span className="npc-faction">{npc.factionId === 'emperor' ? '帝党' : '后党'}</span>
                                {npc.isAlive && (
                                    <span className="npc-reaction">
                                        {getNpcRoundReaction(currentRound, npc, intelProgress[npc.id] ?? 0)}
                                    </span>
                                )}
                            </div>
                            <div className="npc-trust-badge">
                                {getTrustLabel(npc.trust)}
                            </div>
                            {!npc.isAlive && <div className="npc-dead-overlay">已 殁</div>}
                        </button>
                    ))}
                </div>
            </div>

            <div className="action-footer animate-slide-up animate-delay-4">
                <div className="scheme-counter">
                    今日可用计谋：<span className="highlight-number">{maxSchemes - schemeCount}</span> / {maxSchemes}
                </div>
                <button className="btn-primary" onClick={nextPhase} disabled={schemeCount >= maxSchemes}>
                    {schemeCount >= maxSchemes ? '无计可施' : '开始施计'}
                </button>
            </div>
        </div>
    )
}
