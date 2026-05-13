import { useGameStore } from '../../stores/gameStore'
import { useUiStore } from '../../stores/uiStore'
import { getTrustLabel, getTrustLevel } from '../../game/types'
import type { NPC, SchemeType } from '../../game/types'
import { SCHEMES } from '../../data/schemes'
import { getAvailableSchemesForNpc } from '../../game/schemeEngine'
import { buildExternalLineProgress } from '../../game/externalLineProgress'
import { getExternalTerminalSummary, isTerminalExternalNpc } from '../../game/externalStatus'
import {
    getCourtStatusLabel as getCoreCourtStatusLabel,
    isCourtDispositionTarget as isCourtDispositionTargetId,
    normalizeCourtDispositionNpc,
} from '../../game/courtDisposition'
import {
    getExternalPostureLabel as getSharedExternalPostureLabel,
    getExternalTiltLabel as getSharedExternalTiltLabel,
} from '../../game/explainability'
import { roundSupportsExternalAction } from '../../data/roundRuleConfig'
import { NpcPortrait } from '../NpcPortrait/NpcPortrait'
import './NPCDetail.css'

function getExternalTiltLabel(npc: NPC): string { return getSharedExternalTiltLabel(npc.alignmentBias) }

function getExternalPostureLabel(npc: NPC): string { return getSharedExternalPostureLabel(npc) }

type CourtStatus = 'active' | 'dismissed' | 'executed'
type CourtDispositionNpc = NPC & {
    emperorFavor: number
    empressDowagerFavor: number
    courtStatus?: CourtStatus
}

function isCourtDispositionTarget(npc: NPC): boolean {
    return isCourtDispositionTargetId(npc.id)
}

function getCourtStatus(npc: NPC): CourtStatus {
    return (npc as CourtDispositionNpc).courtStatus ?? 'active'
}

function getCourtStatusLabel(status: CourtStatus): string {
    return getCoreCourtStatusLabel(status)
}

function getCourtFavor(npc: NPC) {
    const courtNpc = normalizeCourtDispositionNpc(npc) as CourtDispositionNpc
    return {
        emperorFavor: courtNpc.emperorFavor,
        empressDowagerFavor: courtNpc.empressDowagerFavor,
    }
}

export function NPCDetail() {
    const { npcs, intelProgress, currentRound, difficulty } = useGameStore()
    const { showNpcDetail, detailNpcId, closeNpcDetail } = useUiStore()

    if (!showNpcDetail || !detailNpcId) return null

    const npc = npcs.find(n => n.id === detailNpcId)
    if (!npc) return null

    const trustLevel = getTrustLevel(npc.trust)
    const trustLabel = getTrustLabel(npc.trust)
    const isTerminalExternal = isTerminalExternalNpc(npc)
    const courtStatus = getCourtStatus(npc)
    const isTerminalCourt = isCourtDispositionTarget(npc) && courtStatus !== 'active'
    const courtFavor = getCourtFavor(npc)
    const availableSchemeTypes: SchemeType[] = isTerminalCourt ? [] : getAvailableSchemesForNpc(npc, {
        round: currentRound,
        unlockedSecrets: intelProgress[npc.id] ?? 0,
    })
    const knownIntelCount = intelProgress[npc.id] ?? 0
    const knownIntel = npc.secretThreads.slice(0, knownIntelCount)
    const externalProgress = npc.powerBase === 'external'
        ? buildExternalLineProgress({
            npc,
            unlockedSecrets: knownIntelCount,
            difficulty,
            round: currentRound,
            externalActionEnabled: roundSupportsExternalAction(
                currentRound,
                npc.highActionBias === 'rebellion' ? 'rebellion' : 'secession',
            ),
        })
        : null

    const factionNames: Record<string, string> = {
        emperor: '帝党',
        empress: '后党',
        longxi: '陇右勋贵',
        prairie: '内附草原',
    }

    return (
        <div className="npc-detail-overlay" onClick={closeNpcDetail}>
            <div className="npc-detail-modal" onClick={event => event.stopPropagation()}>
                <button className="close-btn" onClick={closeNpcDetail}>×</button>

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

                {isCourtDispositionTarget(npc) && (
                    <div className={`npc-detail-section court-favor-section ${isTerminalCourt ? 'court-terminal-section' : ''}`}>
                        <h4>宫中风向</h4>
                        <div className="detail-metrics">
                            <span className="metric-chip court-favor-chip">皇帝恩宠 {courtFavor.emperorFavor}</span>
                            <span className="metric-chip court-favor-chip">太后眷顾 {courtFavor.empressDowagerFavor}</span>
                            <span className={`metric-chip court-status-chip court-status-${courtStatus}`}>
                                {getCourtStatusLabel(courtStatus)}
                            </span>
                        </div>
                        {isTerminalCourt && (
                            <p className="dim court-terminal-copy">
                                {courtStatus === 'dismissed'
                                    ? '已经退出朝堂处置链，不再适合继续布局。'
                                    : '已走死亡终态，不再适合继续布局。'}
                            </p>
                        )}
                    </div>
                )}

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
                    </div>
                </div>

                {npc.powerBase === 'external' && (
                    <div className="npc-detail-section">
                        <h4>外部筹码</h4>
                        <div className="detail-metrics">
                            <span className="metric-chip">军力 {npc.militaryPower}</span>
                            <span className="metric-chip">忠诚 {npc.loyaltyToCourt}</span>
                            <span className="metric-chip">倾向：{getExternalTiltLabel(npc)}</span>
                            <span className="metric-chip">态势：{getExternalPostureLabel(npc)}</span>
                        </div>
                        {externalProgress && (
                            <>
                                <p>{externalProgress.summary}</p>
                                <div className="detail-metrics">
                                    <span className="metric-chip">阶段：{externalProgress.phase}</span>
                                    <span className="metric-chip">目标：{externalProgress.targetLabel}</span>
                                    <span className="metric-chip">下一手：{externalProgress.nextMoveLabel}</span>
                                </div>
                                <p className="dim">{externalProgress.gapText}</p>
                            </>
                        )}
                        {isTerminalExternal && (
                            <p className="dim">{getExternalTerminalSummary(npc.externalStatus)}</p>
                        )}
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

                {!isTerminalCourt ? (
                    <div className="npc-detail-section">
                        <h4>可用计谋</h4>
                        <div className="scheme-tags">
                            {SCHEMES.map(scheme => {
                                const available = availableSchemeTypes.includes(scheme.type)
                                return (
                                    <span key={scheme.type} className={`scheme-tag ${available ? '' : 'locked'}`}>
                                        {scheme.name}{!available && ' 🔒'}
                                    </span>
                                )
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="npc-detail-section court-terminal-note">
                        <h4>处置结果</h4>
                        <p className="dim">此人已离开可操作名单，后续不再显示可用计谋。</p>
                    </div>
                )}
            </div>
        </div>
    )
}
