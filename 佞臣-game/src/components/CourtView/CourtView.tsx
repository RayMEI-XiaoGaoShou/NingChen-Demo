// ========================================
// 朝局观察页 — P1 更新
// 展示实时国力标签 + 势力条形图 + 南征/安全风险
// ========================================

import { useGameStore } from '../../stores/gameStore'
import { useUiStore } from '../../stores/uiStore'
import { FIRST_ROUND_GUIDE_CONTENT } from '../../data/prologueContent'
import { getAlignmentLabel, getExternalStatusLabel, getLoyaltyLabel, getPowerLabel, getTrustLabel, getTrustLevel } from '../../game/types'
import { getCourtBalance } from '../../game/nationEngine'
import { getNpcRoundReaction } from '../../game/roundIntelEngine'
import { FirstRoundGuideModal } from '../FirstRoundGuide/FirstRoundGuideModal'
import './CourtView.css'

export function CourtView() {
    const {
        currentRound, nextPhase, northPower, schemeCount, maxSchemes,
        npcs, factions,
        intelProgress,
        prevPhase,
        firstRoundGuideSeen,
        markFirstRoundGuideSeen,
        openGameplayGuide,
    } = useGameStore()
    const { openNpcDetail } = useUiStore()

    const powerLabel = getPowerLabel(northPower)
    const courtFactions = factions
    const externalNpcs = npcs.filter(n => n.powerBase === 'external' && n.isAlive)
    const { emperorInfluence, empressInfluence, ratio: warRatio } = getCourtBalance(courtFactions, npcs, currentRound)

    let invasionRisk: { label: string; className: string }
    if (warRatio >= 1.2) {
        invasionRisk = { label: '🚨 南征在即', className: 'risk-critical' }
    } else if (warRatio >= 0.8) {
        invasionRisk = { label: '⚠️ 南征议起', className: 'risk-warning' }
    } else {
        invasionRisk = { label: '✅ 安内占优', className: 'risk-safe' }
    }

    // 自身安全评估
    const dangerNpcs = npcs.filter(n =>
        n.canExecute &&
        n.powerBase === 'court' &&
        n.trust <= 25 &&
        (factions.find(f => f.id === n.factionId)?.courtInfluence ?? 0) >= 55)
    let safetyRisk: { label: string; className: string }
    if (dangerNpcs.some(n => n.trust <= 15)) {
        safetyRisk = { label: '🚨 祸在旦夕', className: 'risk-critical' }
    } else if (dangerNpcs.length > 0) {
        safetyRisk = { label: '⚠️ 暗流涌动', className: 'risk-warning' }
    } else {
        safetyRisk = { label: '✅ 朝中无虞', className: 'risk-safe' }
    }

    return (
        <div className="page-container court-view animate-fade-in">
            {currentRound === 1 && !firstRoundGuideSeen.court_observe && (
                <FirstRoundGuideModal
                    title={FIRST_ROUND_GUIDE_CONTENT.court_observe.title}
                    body={FIRST_ROUND_GUIDE_CONTENT.court_observe.body}
                    onClose={() => markFirstRoundGuideSeen('court_observe')}
                />
            )}
            <div className="page-utility-row animate-slide-up">
                <button className="btn-help" onClick={() => openGameplayGuide('gameplay')}>
                    玩法说明
                </button>
            </div>
            <div className="court-header animate-slide-up">
                <button className="btn-back btn-back-inline" onClick={prevPhase}>上一页</button>
                <h2 className="page-title">朝 局 观 察</h2>

                {/* 顶部状态栏 */}
                <div className="glass-panel status-bar">
                    <div className="status-item">
                        <span className="status-label">北周国力</span>
                        <span className={`status-value power-level-${getPowerLabel(northPower)}`}>
                            {powerLabel}
                        </span>
                    </div>
                    <div className="status-item">
                        <span className="status-label">南征风险</span>
                        <span className={`status-value ${invasionRisk.className}`}>
                            {invasionRisk.label}
                        </span>
                    </div>
                    <div className="status-item">
                        <span className="status-label">自身安全</span>
                        <span className={`status-value ${safetyRisk.className}`}>
                            {safetyRisk.label}
                        </span>
                    </div>
                </div>
            </div>

            {/* 四方势力 */}
            <div className="section-container animate-slide-up animate-delay-1">
                <h3 className="section-heading">朝堂势力分布</h3>
                <div className="faction-grid">
                    {courtFactions.map(f => (
                        <div key={f.id} className={`gold-panel faction-card faction-${f.id}`}>
                            <div className="faction-card-header">
                                <span className="faction-name">{f.name}</span>
                                <span className="faction-value">
                                    {f.courtInfluence} 权势 · {f.internalStability} 稳度
                                </span>
                            </div>
                            <div className="faction-bar">
                                <div
                                    className="faction-fill"
                                    style={{ width: `${f.courtInfluence}%` }}
                                />
                            </div>
                            <div className="faction-secondary">
                                军事实力 {f.militaryPower} · 综合声量 {f.id === 'emperor' ? emperorInfluence.toFixed(1) : empressInfluence.toFixed(1)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="section-container animate-slide-up animate-delay-1">
                <h3 className="section-heading">外部权力人物</h3>
                <div className="external-grid">
                    {externalNpcs.map(npc => (
                        <div key={npc.id} className="glass-panel external-card">
                            <div className="external-card-header">
                                <div>
                                    <div className="external-name">{npc.name}</div>
                                    <div className="external-title">{npc.title}</div>
                                </div>
                                <span className={`external-bias bias-${npc.alignmentBias}`}>{getAlignmentLabel(npc.alignmentBias)}</span>
                            </div>
                            <div className="external-stats">
                                <span>军力 {npc.militaryPower}</span>
                                <span>忠诚 {npc.loyaltyToCourt}</span>
                                <span>{getLoyaltyLabel(npc.loyaltyToCourt)}</span>
                                <span>{getExternalStatusLabel(npc.externalStatus)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 可互动 NPC 列表 */}
            <div className="section-container animate-slide-up animate-delay-2">
                <h3 className="section-heading">群臣列传</h3>
                <div className="npc-grid">
                    {npcs.map((npc, index) => (
                        <button
                            key={npc.id}
                            className={`npc-card trust-${getTrustLevel(npc.trust)} animate-slide-up ${!npc.isAlive ? 'dead' : ''}`}
                            style={{ animationDelay: `${0.2 + index * 0.05}s` }}
                            onClick={() => openNpcDetail(npc.id)}
                            disabled={!npc.isAlive}
                        >
                            <div className="npc-avatar-placeholder">
                                {npc.name.charAt(0)}
                            </div>
                            <div className="npc-info">
                                <span className="npc-name">{npc.name}</span>
                                <span className="npc-title">{npc.title}</span>
                                <span className="npc-faction">
                                    {npc.factionId === 'emperor' ? '帝党'
                                        : npc.factionId === 'empress' ? '后党'
                                            : npc.factionId === 'longxi' ? '陇右系'
                                                : '草原系'}
                                </span>
                                {npc.powerBase === 'external' && (
                                    <span className="npc-submeta">
                                        忠诚 {getLoyaltyLabel(npc.loyaltyToCourt)} · {getAlignmentLabel(npc.alignmentBias)} · {getExternalStatusLabel(npc.externalStatus)}
                                    </span>
                                )}
                                {npc.isAlive && (
                                    <span className="npc-reaction">
                                        {getNpcRoundReaction(currentRound, npc, intelProgress[npc.id] ?? 0)}
                                    </span>
                                )}
                            </div>
                            <div className="npc-trust-badge">
                                {getTrustLabel(npc.trust)}
                            </div>
                            {!npc.isAlive && <div className="npc-dead-overlay">已 故</div>}
                        </button>
                    ))}
                </div>
            </div>

            <div className="action-footer animate-slide-up animate-delay-4">
                <div className="scheme-counter">
                    今日可用计谋：<span className="highlight-number">{maxSchemes - schemeCount}</span> / {maxSchemes}
                </div>
                <button
                    className="btn-primary"
                    onClick={nextPhase}
                    disabled={schemeCount >= maxSchemes}
                >
                    {schemeCount >= maxSchemes ? '无计可施' : '开始施计'}
                </button>
            </div>
        </div>
    )
}
