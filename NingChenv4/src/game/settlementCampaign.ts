import { applyDimensionChanges } from './nationEngine'
import { evaluateHuainanCampaignOutcome, evaluateShuCampaignOutcome, tickCampaignFallout } from './campaignEngine'
import { deriveCampaignPreparedBonus } from './campaignPreparedBonus'
import { deriveHuainanCarryBonus, deriveShuGainBias } from './campaignCarryover'
import { deriveMainlineHuainanBonus, deriveMainlineShuBonus } from './mainlineCampaignBonus'
import type { SchemeResult } from './schemeEngine'
import type { PolicySettlementReport } from './settlementTypes'
import type {
    CampaignState,
    Faction,
    GameDifficulty,
    NationDimensions,
    NPC,
    PolicyReasonParseResult,
    SchemeAction,
} from './types'

export interface CampaignSettlementState {
    northStats: NationDimensions
    southStats: NationDimensions
    shuCampaign: CampaignState
    huainanCampaign: CampaignState
    campaignReports: string[]
}

export function cloneCampaign(campaign?: CampaignState): CampaignState {
    return campaign
        ? {
            ...campaign,
            resolvedState: campaign.resolvedState ?? campaign.state,
            ongoingNorthImpact: { ...campaign.ongoingNorthImpact },
            ongoingSouthImpact: { ...campaign.ongoingSouthImpact },
        }
        : {
            state: 'idle',
            resolvedState: null,
            sourceRound: null,
            summary: '',
            ongoingNorthImpact: {},
            ongoingSouthImpact: {},
            remainingRounds: 0,
        }
}

export function applyCampaignFalloutForRound(params: {
    round: number
    northStats: NationDimensions
    southStats: NationDimensions
    shuCampaign: CampaignState
    huainanCampaign: CampaignState
}): CampaignSettlementState {
    let northStats = params.northStats
    let southStats = params.southStats
    let shuCampaign = params.shuCampaign
    let huainanCampaign = params.huainanCampaign
    const campaignReports: string[] = []

    if (params.round >= 11 && params.round <= 12) {
        const fallout = tickCampaignFallout(shuCampaign)
        if (fallout.applied) {
            northStats = applyDimensionChanges(northStats, fallout.northImpact)
            southStats = applyDimensionChanges(southStats, fallout.southImpact)
            shuCampaign = fallout.nextCampaign
            if (fallout.nextCampaign.state !== 'idle') {
                campaignReports.push('蜀地方向的战后余波仍在发酵。')
            }
        }
    }

    if (params.round >= 17 && params.round <= 18) {
        const fallout = tickCampaignFallout(huainanCampaign)
        if (fallout.applied) {
            northStats = applyDimensionChanges(northStats, fallout.northImpact)
            southStats = applyDimensionChanges(southStats, fallout.southImpact)
            huainanCampaign = fallout.nextCampaign
            if (fallout.nextCampaign.state !== 'idle') {
                campaignReports.push('淮南方向的战后余波尚未平息。')
            }
        }
    }

    return {
        northStats,
        southStats,
        shuCampaign,
        huainanCampaign,
        campaignReports,
    }
}

export function resolveCampaignOutcomesForRound(params: {
    round: number
    difficulty: GameDifficulty
    northStats: NationDimensions
    southStats: NationDimensions
    updatedNpcs: NPC[]
    factionsAfter: Faction[]
    schemes: SchemeAction[]
    schemeResults: SchemeResult[]
    policyReport: PolicySettlementReport | null
    policyParse: PolicyReasonParseResult | null
    policyMomentumGain: { shuMomentumGain: number; huainanMomentumGain: number }
    shuMomentum: number
    huainanMomentum: number
    shuCampaign: CampaignState
    huainanCampaign: CampaignState
}): CampaignSettlementState {
    let northStats = params.northStats
    let southStats = params.southStats
    let shuCampaign = params.shuCampaign
    let huainanCampaign = params.huainanCampaign
    const campaignReports: string[] = []

    if (params.round === 10) {
        const shuPreparedBonus = deriveCampaignPreparedBonus({
            campaign: 'shu',
            momentum: params.shuMomentum,
            recentBattleSignal: deriveRecentBattleSignal('shu', params.schemeResults, params.policyReport, params.policyParse),
            policyMomentum: params.policyMomentumGain.shuMomentumGain,
        })
        const shuGainBias = deriveShuGainBias(params.difficulty, Math.min(5, params.shuMomentum), shuPreparedBonus)
        const mainlineShuPreparednessBonus = deriveMainlineShuBonus({
            difficulty: params.difficulty,
            schemeSignals: collectMainlineShuSignals(params.schemes, params.schemeResults),
            commandSignal: deriveMainlineCommandSignal(params.schemes, params.schemeResults),
            preparedBonus: shuPreparedBonus,
            existingMomentum: params.shuMomentum,
        })
        const evaluation = evaluateShuCampaignOutcome({
            round: params.round,
            difficulty: params.difficulty,
            southStats,
            northStats,
            northPressurePenalty: deriveNorthPressurePenalty(params.updatedNpcs, params.factionsAfter, 'shu'),
            policyBoost: derivePolicyBoost(params.policyReport),
            preparednessBonus: mainlineShuPreparednessBonus,
            momentumBonus: Math.min(5, params.shuMomentum) + shuPreparedBonus + shuGainBias,
        })
        northStats = applyDimensionChanges(northStats, evaluation.instantNorthImpact)
        southStats = applyDimensionChanges(southStats, evaluation.instantSouthImpact)
        shuCampaign = {
            state: evaluation.state,
            resolvedState: evaluation.resolvedState ?? evaluation.state,
            sourceRound: evaluation.sourceRound,
            summary: evaluation.summary,
            ongoingNorthImpact: evaluation.ongoingNorthImpact,
            ongoingSouthImpact: evaluation.ongoingSouthImpact,
            remainingRounds: evaluation.remainingRounds,
        }
        campaignReports.push(evaluation.summary)
    }

    if (params.round === 16) {
        const huainanPreparedBonus = deriveCampaignPreparedBonus({
            campaign: 'huainan',
            momentum: params.huainanMomentum,
            recentBattleSignal: deriveRecentBattleSignal('huainan', params.schemeResults, params.policyReport, params.policyParse),
            policyMomentum: params.policyMomentumGain.huainanMomentumGain,
        })
        const huainanCarryBonus = deriveHuainanCarryBonus(shuCampaign.resolvedState ?? shuCampaign.state, params.difficulty)
        const mainlineHuainanBonus = deriveMainlineHuainanBonus({
            difficulty: params.difficulty,
            shuResolvedState: shuCampaign.resolvedState ?? shuCampaign.state,
            schemeSignals: collectMainlineHuainanSignals(params.schemes, params.schemeResults),
            commandSignal: deriveMainlineHuainanCommandSignal(params.schemes, params.schemeResults),
            preparedBonus: huainanPreparedBonus,
        })
        const evaluation = evaluateHuainanCampaignOutcome({
            round: params.round,
            difficulty: params.difficulty,
            southStats,
            northStats,
            northPressurePenalty: deriveNorthPressurePenalty(params.updatedNpcs, params.factionsAfter, 'huainan'),
            policyBoost: derivePolicyBoost(params.policyReport),
            momentumBonus: Math.min(5, params.huainanMomentum) + huainanPreparedBonus + huainanCarryBonus + mainlineHuainanBonus,
        })
        northStats = applyDimensionChanges(northStats, evaluation.instantNorthImpact)
        southStats = applyDimensionChanges(southStats, evaluation.instantSouthImpact)
        huainanCampaign = {
            state: evaluation.state,
            resolvedState: evaluation.resolvedState ?? evaluation.state,
            sourceRound: evaluation.sourceRound,
            summary: evaluation.summary,
            ongoingNorthImpact: evaluation.ongoingNorthImpact,
            ongoingSouthImpact: evaluation.ongoingSouthImpact,
            remainingRounds: evaluation.remainingRounds,
        }
        campaignReports.push(evaluation.summary)
    }

    return {
        northStats,
        southStats,
        shuCampaign,
        huainanCampaign,
        campaignReports,
    }
}

function derivePolicyBoost(policyReport: PolicySettlementReport | null): number {
    if (!policyReport) return 0
    const total = Object.values(policyReport.effects).reduce((sum, value) => sum + (value ?? 0), 0)
    return Math.max(0, Math.min(6, total / 2.5 + (policyReport.focusMatched ? 1 : 0)))
}

function deriveRecentBattleSignal(
    campaign: 'shu' | 'huainan',
    schemeResults: SchemeResult[],
    policyReport: PolicySettlementReport | null,
    policyParse: PolicyReasonParseResult | null,
): number {
    const schemeSignal = Math.max(
        0,
        ...schemeResults
            .filter(result => result.success)
            .map(result => {
                if (campaign === 'shu') {
                    return (
                        result.northParse.grainRelevance * 0.38 +
                        result.northParse.governanceRelevance * 0.34 +
                        result.northParse.militaryRelevance * 0.28
                    )
                }

                return (
                    result.northParse.militaryRelevance * 0.4 +
                    result.northParse.grainRelevance * 0.34 +
                    result.northParse.financeRelevance * 0.26
                )
            }),
    )

    if (!policyReport || !policyParse) {
        return round(schemeSignal)
    }

    const policyEffectSignal =
        campaign === 'shu'
            ? Math.max(0, policyReport.effects.grain ?? 0) * 0.45
            + Math.max(0, policyReport.effects.governance ?? 0) * 0.35
            + Math.max(0, policyReport.effects.finance ?? 0) * 0.2
            : Math.max(0, policyReport.effects.military ?? 0) * 0.4
            + Math.max(0, policyReport.effects.grain ?? 0) * 0.3
            + Math.max(0, policyReport.effects.finance ?? 0) * 0.3

    const policySignal =
        policyEffectSignal > 0
            ? (
                policyParse.focusAlignment * 0.42 +
                policyParse.executionClarity * 0.36 +
                policyParse.costAwareness * 0.22
            ) * Math.min(1, policyEffectSignal / 1)
            : 0

    return round(Math.max(schemeSignal, policySignal))
}

function collectMainlineShuSignals(schemes: SchemeAction[], schemeResults: SchemeResult[]): number[] {
    return schemeResults
        .map((result, index) => ({ result, action: schemes[index] }))
        .filter(item => item.result.success)
        .filter(item => item.action?.schemeType === 'advise' || item.action?.schemeType === 'probe')
        .map(item => round(
            item.result.northParse.grainRelevance * 0.38
            + item.result.northParse.governanceRelevance * 0.36
            + item.result.northParse.militaryRelevance * 0.16
            + item.result.northParse.executability * 0.1,
        ))
}

function deriveMainlineCommandSignal(schemes: SchemeAction[], schemeResults: SchemeResult[]): number {
    const strongest = schemeResults
        .map((result, index) => ({ result, action: schemes[index] }))
        .filter(item => item.result.success)
        .filter(item => item.action?.schemeType === 'advise' || item.action?.schemeType === 'probe')
        .map(item => round(
            item.result.northParse.governanceRelevance * 0.4
            + item.result.northParse.structuralPenetration * 0.32
            + item.result.northParse.executability * 0.18
            + item.result.northParse.eventFit * 0.1,
        ))

    return strongest.length > 0 ? Math.max(...strongest) : 0
}

function collectMainlineHuainanSignals(schemes: SchemeAction[], schemeResults: SchemeResult[]): number[] {
    return schemeResults
        .map((result, index) => ({ result, action: schemes[index] }))
        .filter(item => item.result.success)
        .filter(item => item.action?.schemeType === 'advise' || item.action?.schemeType === 'probe')
        .map(item => round(
            item.result.northParse.militaryRelevance * 0.34
            + item.result.northParse.grainRelevance * 0.28
            + item.result.northParse.financeRelevance * 0.22
            + item.result.northParse.executability * 0.16,
        ))
}

function deriveMainlineHuainanCommandSignal(schemes: SchemeAction[], schemeResults: SchemeResult[]): number {
    const strongest = schemeResults
        .map((result, index) => ({ result, action: schemes[index] }))
        .filter(item => item.result.success)
        .filter(item => item.action?.schemeType === 'advise' || item.action?.schemeType === 'probe')
        .map(item => round(
            item.result.northParse.militaryRelevance * 0.3
            + item.result.northParse.structuralPenetration * 0.28
            + item.result.northParse.executability * 0.18
            + item.result.northParse.eventFit * 0.14
            + item.result.northParse.governanceRelevance * 0.1,
        ))

    return strongest.length > 0 ? Math.max(...strongest) : 0
}

function deriveNorthPressurePenalty(
    npcs: NPC[],
    factions: Faction[],
    campaign: 'shu' | 'huainan',
): number {
    let penalty = 0
    const lowLoyaltyExternal = npcs.filter(npc =>
        npc.powerBase === 'external'
        && npc.isAlive
        && npc.externalStatus !== 'secession'
        && npc.externalStatus !== 'rebellion'
        && npc.loyaltyToCourt <= 60,
    ).length
    penalty += lowLoyaltyExternal * 1.2
    penalty += npcs.filter(npc =>
        npc.powerBase === 'external' && npc.isAlive && npc.externalStatus === 'secession',
    ).length * 2.6
    penalty += npcs.filter(npc =>
        npc.powerBase === 'external' && npc.isAlive && npc.externalStatus === 'rebellion',
    ).length * 3.4

    const emperor = factions.find(faction => faction.id === 'emperor')
    const empress = factions.find(faction => faction.id === 'empress')
    if ((emperor?.internalStability ?? 100) <= 25) penalty += 2
    if ((empress?.internalStability ?? 100) <= 25) penalty += 2
    if ((emperor?.courtInfluence ?? 100) <= 22) penalty += 1.6
    if ((empress?.courtInfluence ?? 100) <= 22) penalty += 1.6

    if (campaign === 'shu') {
        penalty += npcs.filter(npc => /河西|陇右|诸军事/.test(npc.title) && npc.trust <= 25).length * 0.8
    } else {
        penalty += npcs.filter(npc => /河南|河北|节度使|诸军事/.test(npc.title) && npc.trust <= 25).length * 0.8
    }

    return round(penalty)
}

function round(value: number): number {
    return Math.round(value * 10) / 10
}
