import { useGameStore } from '../../stores/gameStore'
import { useUiStore } from '../../stores/uiStore'
import { getAlignmentLabel, getExternalStatusLabel, getLoyaltyLabel, getTrustLabel, getTrustLevel } from '../../game/types'
import { SCHEMES } from '../../data/schemes'
import { getAvailableSchemesForNpc } from '../../game/schemeEngine'
import { NpcPortrait } from '../NpcPortrait/NpcPortrait'
import './NPCDetail.css'

export function NPCDetail() {
    const { npcs, intelProgress, currentRound } = useGameStore()
    const { showNpcDetail, detailNpcId, closeNpcDetail } = useUiStore()

    if (!showNpcDetail || !detailNpcId) return null

    const npc = npcs.find(n => n.id === detailNpcId)
    if (!npc) return null

    const trustLevel = getTrustLevel(npc.trust)
    const trustLabel = getTrustLabel(npc.trust)
    const availableSchemeTypes = getAvailableSchemesForNpc(npc, {
        round: currentRound,
        unlockedSecrets: intelProgress[npc.id] ?? 0,
    })
    const knownIntelCount = intelProgress[npc.id] ?? 0
    const knownIntel = npc.secretThreads.slice(0, knownIntelCount)

    const factionNames: Record<string, string> = {
        emperor: '帝党',
        empress: '后党',
        longxi: '陇右勋贵',
        prairie: '内附草原',
    }

    return (
        <div className="npc-detail-overlay" onClick={closeNpcDetail}>
            <div className="npc-detail-modal" onClick={e => e.stopPropagation()}>
                <button className="close-btn" onClick={closeNpcDetail}>✕</button>

                <div className="npc-detail-header">
                    <h2 className="npc-detail-name">{npc.name}</h2>
                    <span className="npc-detail-title">{npc.title}</span>
                    <span className={`npc-detail-faction faction-${npc.factionId}`}>
                        {factionNames[npc.factionId]}
                    </span>
                </div>

                <div className="npc-detail-portrait-wrap">
                    <NpcPortrait name={npc.name} className="npc-detail-portrait" />
                </div>

                <div className={`trust-badge trust-${trustLevel}`}>
                    {trustLabel}
                </div>

                <div className="npc-detail-section">
                    <h4>公开人设</h4>
                    <p>{npc.publicPersona}</p>
                </div>

                <div className="npc-detail-section">
                    <h4>公开政治立场</h4>
                    <p>{npc.publicStance}</p>
                </div>

                <div className="npc-detail-section">
                    <h4>性格与行事风格</h4>
                    <p>{npc.personality}</p>
                </div>

                <div className="npc-detail-section">
                    <h4>可撬动点</h4>
                    <div className="detail-metrics">
                        <span className="metric-chip">打动：{npc.softSpot}</span>
                        <span className="metric-chip">激怒：{npc.triggerPoint}</span>
                        <span className="metric-chip">适合计谋：{npc.schemeHooks}</span>
                    </div>
                </div>

                {npc.powerBase === 'external' && (
                    <div className="npc-detail-section">
                        <h4>外部筹码</h4>
                        <div className="detail-metrics">
                            <span className="metric-chip">军力 {npc.militaryPower}</span>
                            <span className="metric-chip">忠诚 {npc.loyaltyToCourt}</span>
                            <span className="metric-chip">{getLoyaltyLabel(npc.loyaltyToCourt)}</span>
                            <span className="metric-chip">{getAlignmentLabel(npc.alignmentBias)}</span>
                            <span className="metric-chip">{getExternalStatusLabel(npc.externalStatus)}</span>
                        </div>
                    </div>
                )}

                <div className="npc-detail-section">
                    <h4>已知情报</h4>
                    {knownIntel.length > 0 ? (
                        <div className="detail-metrics">
                            {knownIntel.map((item, index) => (
                                <span key={`${npc.id}-intel-${index}`} className="metric-chip">{item}</span>
                            ))}
                        </div>
                    ) : (
                        <p className="dim">暂无（试探成功后会逐步揭露）</p>
                    )}
                </div>

                <div className="npc-detail-section">
                    <h4>可用计谋</h4>
                    <div className="scheme-tags">
                        {SCHEMES.map(s => {
                            const available = availableSchemeTypes.includes(s.type)
                            return (
                                <span key={s.type} className={`scheme-tag ${available ? '' : 'locked'}`}>
                                    {s.name}{!available && ' 🔒'}
                                </span>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
