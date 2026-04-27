import { getRoundCampaignEventContext } from './campaignDisplayEngine'
import { getInvasionPressurePresentation, getPlayerDangerPresentation } from './pressureEngine'
import type { ExternalActionReport } from './externalActionResolution'
import type { SchemeResult } from './schemeEngine'
import type { JudgeFacts, PolicySettlementReport, SettlementKeyChangeHighlight } from './settlementTypes'
import type {
    AiNativeSummary,
    BorrowedBladeReport,
    CampaignState,
    DelayedBacklash,
    Faction,
    FactionCollapseReport,
    NationDimensions,
    NPC,
    PlayerDangerStage,
    PolicyAftereffect,
    RelationshipReport,
} from './types'

export function summarizeDimensions(changes: Partial<NationDimensions>): string {
    const names: Record<keyof NationDimensions, string> = {
        finance: '财政',
        grain: '粮赋',
        military: '军事',
        socialOrder: '民生秩序',
        governance: '统治穿透力',
    }

    return Object.entries(changes)
        .map(([key, value]) => `${names[key as keyof NationDimensions]}${(value ?? 0) >= 0 ? '+' : ''}${(value ?? 0).toFixed(1)}`)
        .join('，')
}

export function buildJudgeFacts(params: {
    round: number
    beforeFactions: Faction[]
    afterFactions: Faction[]
    relationshipReports: RelationshipReport[]
    beforeNorth: NationDimensions
    afterNorth: NationDimensions
    afterSouth: NationDimensions
    externalActionReports: ExternalActionReport[]
    factionCollapseReports: FactionCollapseReport[]
    invasionCheck: {
        politicalWillRatio: number
        warCapabilityMet: number
        windowLabel: string
        pressureSummary: string
    }
    deathCheck: {
        triggered: boolean
        killerName: string | null
        nextStage: PlayerDangerStage
        summary: string
    }
    pressureUpdate: {
        playerSuspicionHeat: number
        invasionPressure: number
        suspicionDelta: { value: number; reasons: string[] }
        invasionDelta: { value: number; reasons: string[] }
    }
    policyReport: PolicySettlementReport | null
    policyAftereffect: PolicyAftereffect | null
    schemeResults: SchemeResult[]
    delayedBacklash: DelayedBacklash[]
    shuCampaign: CampaignState
    huainanCampaign: CampaignState
}): JudgeFacts {
    const event = getRoundCampaignEventContext(params.round, params.shuCampaign, params.huainanCampaign)
    const eventImpactSummary = `主线事件「${event.eventName}」继续发酵；${event.eventBriefing}`

    const northDelta = summarizeDimensions(diffDimensions(params.afterNorth, params.beforeNorth))
    const relationshipSummary = summarizeRelationshipReports(params.relationshipReports)
    const collapseSummary = summarizeFactionCollapseReports(params.factionCollapseReports)
    const southSummary = params.policyReport
        ? `南陈问政依“${params.policyReport.optionContent}”施行，${params.policyReport.effectSummary}。${params.policyAftereffect ? `其后效为：${params.policyAftereffect.summary}` : ''}`
        : '南陈本回合无额外问政回批收益。'
    const aiNativeSummary = buildAiNativeSummaryV2(params.schemeResults, params.delayedBacklash, params.policyReport, params.policyAftereffect)
    const playerPressure = getPlayerDangerPresentation(params.pressureUpdate.playerSuspicionHeat, params.deathCheck.nextStage)
    const invasionPressure = getInvasionPressurePresentation(params.pressureUpdate.invasionPressure)
    const suspicionReason = params.pressureUpdate.suspicionDelta.reasons[0] ? `；${params.pressureUpdate.suspicionDelta.reasons[0]}` : ''
    const invasionReason = params.pressureUpdate.invasionDelta.reasons[0] ? `；${params.pressureUpdate.invasionDelta.reasons[0]}` : ''

    return {
        eventImpactSummary,
        factionSummary: summarizeFactionChanges(params.beforeFactions, params.afterFactions)
            + (relationshipSummary ? `；${relationshipSummary}` : '')
            + (collapseSummary ? `；${collapseSummary}` : ''),
        relationshipSummary,
        externalSummary: summarizeExternalState(params.externalActionReports),
        northSummary: northDelta || '北周五维无明显波动。',
        southSummary,
        invasionSummary: `${invasionPressure.label}；${params.invasionCheck.windowLabel}；${params.invasionCheck.pressureSummary}${invasionReason}。`,
        survivalSummary: `${playerPressure.label}；${params.deathCheck.summary}${suspicionReason}`,
        aiNativeSummary,
    }
}

export function buildSettlementKeyChangeHighlights(params: {
    beforeNpcs: NPC[]
    afterNpcs: NPC[]
    beforeFactions: Faction[]
    afterFactions: Faction[]
}): SettlementKeyChangeHighlight[] {
    const highlights: SettlementKeyChangeHighlight[] = []

    for (const after of params.afterNpcs) {
        const before = params.beforeNpcs.find(npc => npc.id === after.id)
        if (!before) continue

        if (after.powerBase === 'external') {
            const trustDelta = round(after.trust - before.trust)
            const loyaltyDelta = round(after.loyaltyToCourt - before.loyaltyToCourt)
            const militaryDelta = round(after.militaryPower - before.militaryPower)
            const statusChanged = after.externalStatus !== before.externalStatus
            const shouldShow =
                Math.abs(trustDelta) >= 3 ||
                Math.abs(loyaltyDelta) >= 3 ||
                Math.abs(militaryDelta) >= 2 ||
                statusChanged

            if (shouldShow) {
                const deltas = [
                    trustDelta !== 0 ? `信任${signed(trustDelta)}` : '',
                    loyaltyDelta !== 0 ? `忠诚${signed(loyaltyDelta)}` : '',
                    militaryDelta !== 0 ? `军力${signed(militaryDelta)}` : '',
                    statusChanged ? `状态转为${getExternalStatusNarrativeLabel(after.externalStatus)}` : '',
                ].filter(Boolean)
                const reason = statusChanged
                    ? '这已经不只是态度松动，而是地方军头公开改变了与中枢的关系。'
                    : '这说明你的计谋已经从言语层面传到地方军头的资源、兵势或离心程度上。'

                highlights.push({
                    id: `external-${after.id}`,
                    category: 'external',
                    title: `${after.name}动向`,
                    text: `${after.name}：${deltas.join('，')}。${reason}`,
                    tone: loyaltyDelta < 0 || militaryDelta < 0 || statusChanged ? 'negative' : 'positive',
                })
            }
        }

        if (after.powerBase === 'court') {
            const emperorDelta = round((after.emperorFavor ?? 100) - (before.emperorFavor ?? 100))
            const dowagerDelta = round((after.empressDowagerFavor ?? 100) - (before.empressDowagerFavor ?? 100))
            const statusChanged = Boolean(
                after.courtStatus &&
                after.courtStatus !== 'active' &&
                after.courtStatus !== before.courtStatus,
            )
            const shouldShow = Math.abs(emperorDelta) >= 4 || Math.abs(dowagerDelta) >= 4 || statusChanged

            if (shouldShow) {
                const deltas = [
                    emperorDelta !== 0 ? `皇帝恩宠${signed(emperorDelta)}` : '',
                    dowagerDelta !== 0 ? `太后眷顾${signed(dowagerDelta)}` : '',
                    statusChanged ? `状态转为${getCourtStatusNarrativeLabel(after.courtStatus)}` : '',
                ].filter(Boolean)
                highlights.push({
                    id: `court-${after.id}`,
                    category: 'court',
                    title: `${after.name}处境`,
                    text: `${after.name}：${deltas.join('，')}。这类变化意味着他在御前或帘前的庇护正在改变，后续借刀、罢黜或处置的空间也会随之变化。`,
                    tone: emperorDelta < 0 || dowagerDelta < 0 || statusChanged ? 'negative' : 'positive',
                })
            }
        }
    }

    for (const after of params.afterFactions) {
        const before = params.beforeFactions.find(faction => faction.id === after.id)
        if (!before) continue

        const influenceDelta = round(after.courtInfluence - before.courtInfluence)
        const stabilityDelta = round(after.internalStability - before.internalStability)
        const militaryDelta = round(after.militaryPower - before.militaryPower)
        const shouldShow =
            Math.abs(influenceDelta) >= 0.8 ||
            Math.abs(stabilityDelta) >= 0.8 ||
            Math.abs(militaryDelta) >= 0.8

        if (!shouldShow) continue

        const deltas = [
            influenceDelta !== 0 ? `朝堂影响${signed(influenceDelta)}` : '',
            stabilityDelta !== 0 ? `内部稳定${signed(stabilityDelta)}` : '',
            militaryDelta !== 0 ? `军事实力${signed(militaryDelta)}` : '',
        ].filter(Boolean)

        highlights.push({
            id: `faction-${after.id}`,
            category: 'faction',
            title: `${after.name}消长`,
            text: `${after.name}：${deltas.join('，')}。这代表本回合的计谋已经影响到派系层面的调度、声势或内聚力。`,
            tone: influenceDelta < 0 || stabilityDelta < 0 || militaryDelta < 0 ? 'negative' : 'positive',
        })
    }

    return dedupeHighlights(highlights).slice(0, 8)
}

export function generateSummary(
    schemeResults: SchemeResult[],
    externalActionReports: ExternalActionReport[],
    borrowedBladeReports: BorrowedBladeReport[],
    northDelta: number,
    southDelta: number,
): string {
    const successCount = schemeResults.filter(result => result.success).length
    const dispositionSummary = borrowedBladeReports.length > 0
        ? `朝堂收网${borrowedBladeReports.length}次，${borrowedBladeReports.map(report => report.summary).join('')}`
        : ''
    const actionSummary = externalActionReports.length > 0
        ? `另有${externalActionReports.length}股外部势力明牌动作。`
        : '外部势力尚未彻底明牌。'

    return `本回合${schemeResults.length}次计谋中${successCount}次奏效。${dispositionSummary}${actionSummary}北周综合国力${directionLabel(northDelta)}（${signed(northDelta)}），南陈综合国力${directionLabel(southDelta)}（${signed(southDelta)}）。`
}

export function buildAiNativeSummary(
    schemeResults: SchemeResult[],
    delayedBacklash: DelayedBacklash[],
    policyReport: PolicySettlementReport | null,
    policyAftereffect: PolicyAftereffect | null,
): AiNativeSummary {
    const schemeHints = schemeResults
        .filter(result => result.success)
        .map(result => {
            if (result.northParse.structuralPenetration >= 0.62) {
                return '这步话头借到了权力链条，影响不止停在人物层。'
            }
            if (result.northParse.characterFit >= 0.62) {
                return '这步说辞贴住了对方心结，因此格外容易得手。'
            }
            return ''
        })
        .filter(Boolean)
        .slice(0, 2)

    const backlashHints = delayedBacklash
        .map(item => item.summary)
        .slice(0, 2)

    const policyHints = policyReport?.reason.trim()
        ? [
            policyReport.focusMatched
                ? '附言切中此题真正关节，因此南陈收益更稳。'
                : '附言虽表态鲜明，但仍有几分失之宽泛。',
            policyAftereffect?.focusMatched
                ? '这道问政的余波也会延续到下一回合。'
                : '',
        ].filter(Boolean)
        : []

    return {
        schemeHints,
        backlashHints,
        policyHints,
    }
}

function buildAiNativeSummaryV2(
    schemeResults: SchemeResult[],
    delayedBacklash: DelayedBacklash[],
    policyReport: PolicySettlementReport | null,
    policyAftereffect: PolicyAftereffect | null,
): AiNativeSummary {
    const schemeHints = Array.from(new Set(
        schemeResults
            .filter(result => result.success)
            .map(result => {
                if (result.northParse.structuralPenetration >= 0.62) {
                    return '这步说辞顺着权势链条发力，影响已经穿到朝局层。'
                }
                if (result.northParse.characterFit >= 0.62) {
                    return '这步说辞贴住了对方心绪，因此格外容易得手。'
                }
                return ''
            })
            .filter(Boolean),
    )).slice(0, 2)

    const backlashHints = delayedBacklash
        .map(item => item.summary)
        .slice(0, 2)

    const policyHints = policyReport?.reason.trim()
        ? [
            policyReport.focusMatched
                ? '附言切中此题真正关节，因此南陈收益更稳。'
                : '附言虽表态鲜明，但仍有几分失之宽泛。',
            policyAftereffect?.focusMatched
                ? '这道问政的余波也会延续到下一回合。'
                : '',
        ].filter(Boolean)
        : []

    return {
        schemeHints,
        backlashHints,
        policyHints,
    }
}

function diffDimensions(after: NationDimensions, before: NationDimensions): Partial<NationDimensions> {
    return {
        finance: round(after.finance - before.finance),
        grain: round(after.grain - before.grain),
        military: round(after.military - before.military),
        socialOrder: round(after.socialOrder - before.socialOrder),
        governance: round(after.governance - before.governance),
    }
}

function summarizeFactionChanges(before: Faction[], after: Faction[]): string {
    return after.map(faction => {
        const previous = before.find(item => item.id === faction.id)
        if (!previous) return `${faction.name}维持现状`
        const parts: string[] = []
        const influence = round(faction.courtInfluence - previous.courtInfluence)
        const stability = round(faction.internalStability - previous.internalStability)
        const military = round(faction.militaryPower - previous.militaryPower)
        if (influence !== 0) parts.push(`朝堂影响${influence > 0 ? '+' : ''}${influence}`)
        if (stability !== 0) parts.push(`稳定${stability > 0 ? '+' : ''}${stability}`)
        if (military !== 0) parts.push(`军权${military > 0 ? '+' : ''}${military}`)
        return parts.length > 0 ? `${faction.name}${parts.join('、')}` : `${faction.name}维持现状`
    }).join('；')
}

function summarizeExternalState(reports: ExternalActionReport[]): string {
    if (reports.length === 0) return '外部人物尚未彻底明牌，更多仍在观望试价。'
    return reports.map(report => `${report.npcName}${report.action === 'rebellion' ? '举兵' : '坐大'}：${report.outcome}`).join('；')
}

function summarizeRelationshipReports(reports: RelationshipReport[]): string {
    if (reports.length === 0) return ''
    return reports.map(report => report.summary).join('；')
}

function summarizeFactionCollapseReports(reports: FactionCollapseReport[]): string {
    if (reports.length === 0) return ''
    return reports.map(report => report.summary).join('；')
}

function dedupeHighlights(highlights: SettlementKeyChangeHighlight[]): SettlementKeyChangeHighlight[] {
    const seen = new Set<string>()
    return highlights.filter(item => {
        if (seen.has(item.id)) return false
        seen.add(item.id)
        return true
    })
}

function getExternalStatusNarrativeLabel(status: NPC['externalStatus']): string {
    if (status === 'secession') return '已割据'
    if (status === 'rebellion') return '已造反'
    return '仍属中枢'
}

function getCourtStatusNarrativeLabel(status: NPC['courtStatus']): string {
    if (status === 'dismissed') return '已被罢黜'
    if (status === 'executed') return '已被处决'
    return '仍在朝'
}

function directionLabel(value: number): string {
    if (value > 0) return '上升'
    if (value < 0) return '下降'
    return '持平'
}

function signed(value: number): string {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}`
}

function round(value: number): number {
    return Math.round(value * 10) / 10
}
