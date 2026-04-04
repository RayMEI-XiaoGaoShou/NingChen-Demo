import { getPolicyQuestionForRound } from '../data/policyQuestions'
import { INITIAL_RELATIONSHIP_EDGES, RELATIONSHIP_STRUCTURES } from '../data/npcRelationships'
import { getRoundIntel } from '../data/roundIntel'
import { ROUND_EVENTS } from '../data/rounds'
import { isDisasterRound } from '../data/roundRuleConfig'
import {
    applyDimensionChanges,
    applyNaturalGrowth,
    buildPolicyAftereffect,
    calculatePolicyEffect,
    checkFactionCollapse,
    checkDeathCondition,
    checkEarlyInvasion,
    getEventImpact,
} from './nationEngine'
import { applyRelationshipShock, combineStructureEffects } from './relationshipEngine'
import { settleScheme, type FactionVector, type SchemeResult } from './schemeEngine'
import { evaluateHuainanCampaignOutcome, evaluateShuCampaignOutcome, tickCampaignFallout } from './campaignEngine'
import { deriveCampaignMomentumGain } from './campaignMomentum'
import { deriveCampaignPreparedBonus } from './campaignPreparedBonus'
import { deriveHuainanCarryBonus, deriveShuGainBias } from './campaignCarryover'
import { derivePolicyCampaignMomentum } from './policyCampaignMomentum'
import { calculateCompositePower } from './types'
import type {
    AiNativeSummary,
    CampaignState,
    CourtFactionId,
    DelayedBacklash,
    Faction,
    FactionCollapseReport,
    GameDifficulty,
    GameResult,
    NationDimensions,
    NPC,
    PlayerDangerStage,
    PolicyAftereffect,
    PolicyReasonParseResult,
    RelationshipEdge,
    RelationshipReport,
    SchemeAction,
} from './types'

export interface PolicySettlementReport {
    sourceRound: number
    topic: string
    optionLabel: string
    optionContent: string
    reason: string
    effects: Partial<NationDimensions>
    effectSummary: string
    legitimacyTone: 'up' | 'down' | 'steady'
    focusMatched: boolean
    scoringFocus?: string
}

export interface ExternalActionReport {
    npcId: string
    npcName: string
    action: 'secession' | 'rebellion'
    outcome: string
    nationEffects: Partial<NationDimensions>
}

export interface JudgeFacts {
    eventImpactSummary: string
    factionSummary: string
    relationshipSummary: string
    externalSummary: string
    northSummary: string
    southSummary: string
    invasionSummary: string
    survivalSummary: string
    aiNativeSummary: AiNativeSummary
}

export interface RoundSettlementResult {
    schemeResults: SchemeResult[]
    updatedNpcs: NPC[]
    factionsAfter: Faction[]
    relationshipsAfter: RelationshipEdge[]
    northStatsAfter: NationDimensions
    southStatsAfter: NationDimensions
    northPowerAfter: number
    southPowerAfter: number
    trustChanges: Record<string, number>
    intelUnlocks: Record<string, number>
    relationshipReports: RelationshipReport[]
    externalActionReports: ExternalActionReport[]
    factionCollapseReports: FactionCollapseReport[]
    deathTriggered: boolean
    deathKiller: string | null
    playerDangerStage: PlayerDangerStage
    invasionTriggered: boolean
    invasionPoliticalRatio: number
    gameResult: GameResult
    summaryText: string
    policyReport: PolicySettlementReport | null
    policyAftereffect: PolicyAftereffect | null
    delayedBacklash: DelayedBacklash[]
    judgeFacts: JudgeFacts
    shuCampaign: CampaignState
    huainanCampaign: CampaignState
    campaignReports: string[]
    shuMomentum: number
    huainanMomentum: number
}

export function settleRound(params: {
    round: number
    difficulty?: GameDifficulty
    schemes: SchemeAction[]
    northStats: NationDimensions
    southStats: NationDimensions
    npcs: NPC[]
    factions: Faction[]
    relationships?: RelationshipEdge[]
    intelProgress: Record<string, number>
    playerDangerStage?: PlayerDangerStage
    policyOptionIndex: number | null
    policyReason: string
    policyParse?: PolicyReasonParseResult | null
    shuCampaign?: CampaignState
    huainanCampaign?: CampaignState
    shuMomentum?: number
    huainanMomentum?: number
}): RoundSettlementResult {
    const { round, schemes, policyOptionIndex, policyReason, policyParse, intelProgress, difficulty = 'normal' } = params

    let northStats = { ...params.northStats }
    let southStats = { ...params.southStats }
    let shuCampaign = cloneCampaign(params.shuCampaign)
    let huainanCampaign = cloneCampaign(params.huainanCampaign)
    let shuMomentum = params.shuMomentum ?? 0
    let huainanMomentum = params.huainanMomentum ?? 0
    let updatedNpcs = params.npcs.map(npc => ({ ...npc }))
    let factionsAfter = params.factions.map(faction => ({ ...faction }))
    let relationshipsAfter = (params.relationships ?? INITIAL_RELATIONSHIP_EDGES).map(edge => ({ ...edge }))
    const trustChanges: Record<string, number> = {}
    const intelUnlocks: Record<string, number> = {}
    const relationshipReports: RelationshipReport[] = []
    const externalActionReports: ExternalActionReport[] = []
    let factionCollapseReports: FactionCollapseReport[] = []
    let policyReport: PolicySettlementReport | null = null
    let policyAftereffect: PolicyAftereffect | null = null
    let policyMomentumGain = { shuMomentumGain: 0, huainanMomentumGain: 0 }
    let delayedBacklash: DelayedBacklash[] = []
    const campaignReports: string[] = []

    northStats = applyDimensionChanges(northStats, getEventImpact(round))

    if (round >= 11 && round <= 12) {
        const fallout = tickCampaignFallout(shuCampaign)
        if (fallout.applied) {
            northStats = applyDimensionChanges(northStats, fallout.northImpact)
            southStats = applyDimensionChanges(southStats, fallout.southImpact)
            shuCampaign = fallout.nextCampaign
            if (fallout.nextCampaign.state !== 'idle') {
                campaignReports.push('蜀地方向余波仍在继续发酵。')
            }
        }
    }

    if (round >= 17 && round <= 18) {
        const fallout = tickCampaignFallout(huainanCampaign)
        if (fallout.applied) {
            northStats = applyDimensionChanges(northStats, fallout.northImpact)
            southStats = applyDimensionChanges(southStats, fallout.southImpact)
            huainanCampaign = fallout.nextCampaign
            if (fallout.nextCampaign.state !== 'idle') {
                campaignReports.push('淮南方向的战果余波尚未停歇。')
            }
        }
    }

    const eventIntelUnlocks = getRoundIntel(round)?.autoUnlocks ?? {}
    for (const [npcId, count] of Object.entries(eventIntelUnlocks)) {
        intelUnlocks[npcId] = (intelUnlocks[npcId] ?? 0) + (count ?? 0)
    }

    const schemeResults: SchemeResult[] = []
    const actionsPerNpc: Record<string, number> = {}

    for (const action of schemes) {
        const targetNpc = updatedNpcs.find(npc => npc.id === action.targetNpcId)
        const relatedNpc = action.relatedNpcId
            ? updatedNpcs.find(npc => npc.id === action.relatedNpcId) ?? null
            : null

        if (!targetNpc) continue

        const result = settleScheme(
            action,
            targetNpc,
            relatedNpc,
            actionsPerNpc[action.targetNpcId] ?? 0,
            {
                round,
                unlockedSecrets: intelProgress[action.targetNpcId] ?? 0,
                difficulty,
            },
        )

        schemeResults.push(result)
        delayedBacklash = delayedBacklash.concat(result.delayedBacklash)

        applyPersonEffects(targetNpc, result.personEffects.trustDelta, result.personEffects.loyaltyDelta, result.personEffects.alignmentShift, result.personEffects.externalStatus)
        trustChanges[targetNpc.id] = (trustChanges[targetNpc.id] ?? 0) + result.personEffects.trustDelta

        if (relatedNpc) {
            applyPersonEffects(relatedNpc, result.personEffects.relatedTrustDelta, result.personEffects.relatedLoyaltyDelta, null, null)
            if (result.personEffects.relatedTrustDelta !== 0) {
                trustChanges[relatedNpc.id] = (trustChanges[relatedNpc.id] ?? 0) + result.personEffects.relatedTrustDelta
            }
        }

        if (result.personEffects.intelDelta > 0) {
            intelUnlocks[targetNpc.id] = (intelUnlocks[targetNpc.id] ?? 0) + result.personEffects.intelDelta
        }

        factionsAfter = applyFactionEffects(factionsAfter, result.factionEffects)
        northStats = applyDimensionChanges(northStats, result.nationEffects)

        const relationshipShock = deriveRelationshipShock(action, result, targetNpc, relatedNpc, relationshipsAfter)
        if (relationshipShock) {
            const resolved = applyRelationshipShock({
                edges: relationshipsAfter,
                structures: RELATIONSHIP_STRUCTURES,
                edgeId: relationshipShock.edgeId,
                delta: relationshipShock.delta,
                source: relationshipShock.source,
            })
            relationshipsAfter = resolved.edges
            relationshipReports.push(...resolved.reports)

            if (resolved.triggeredStructures.length > 0) {
                const extraEffects = combineStructureEffects(resolved.triggeredStructures)
                factionsAfter = applyFactionEffects(factionsAfter, extraEffectsToFactionVectors(extraEffects))
                northStats = applyDimensionChanges(northStats, extraEffects.nation ?? {})
            }
        }

        if (result.specialAction && result.success && targetNpc.powerBase === 'external' && targetNpc.isAlive) {
            const report = resolveExternalAction(targetNpc, result.specialAction)
            if (report) {
                externalActionReports.push(report.report)
                northStats = applyDimensionChanges(northStats, report.report.nationEffects)
                factionsAfter = applyFactionEffects(factionsAfter, report.factionPenalty)
            }
        }

        const momentumGain = deriveCampaignMomentumGain({
            round,
            schemeType: action.schemeType,
            success: result.success,
            parse: result.northParse ?? null,
        })
        shuMomentum = Math.round((shuMomentum + momentumGain.shuMomentumGain) * 10) / 10
        huainanMomentum = Math.round((huainanMomentum + momentumGain.huainanMomentumGain) * 10) / 10

        actionsPerNpc[action.targetNpcId] = (actionsPerNpc[action.targetNpcId] ?? 0) + 1
    }

    const previousCollapseReports = checkFactionCollapse(params.factions)
    factionCollapseReports = filterNewFactionCollapseReports(previousCollapseReports, checkFactionCollapse(factionsAfter))
    if (factionCollapseReports.length > 0) {
        const collapsePenalty = deriveFactionCollapsePenalty(factionCollapseReports)
        factionsAfter = applyFactionEffects(factionsAfter, collapsePenalty.factionPenalty)
        northStats = applyDimensionChanges(northStats, collapsePenalty.nationPenalty)
        updatedNpcs = applyFactionCollapseNpcDrift(updatedNpcs, factionCollapseReports)
    }

    const deathCheck = checkDeathCondition(updatedNpcs, factionsAfter, round, params.playerDangerStage ?? 'safe')
    const invasionCheck = checkEarlyInvasion(
        northStats,
        factionsAfter,
        updatedNpcs,
        isDisasterRound(round),
        round,
    )

    if (policyOptionIndex !== null) {
        const question = getPolicyQuestionForRound(round, {
            shuCampaignState: shuCampaign.state,
            huainanCampaignState: huainanCampaign.state,
        })
        const option = question?.options[policyOptionIndex]
        if (question && option) {
            const legitimacyTone = option.legitimacyEffect ?? 'steady'
            const policyEffect = calculatePolicyEffect(option.effects, policyReason, {
                legitimacyEffect: legitimacyTone,
                aiScoringFocus: question.aiScoringFocus,
                policyParse: policyParse ?? undefined,
                round,
            }, difficulty)
            southStats = applyDimensionChanges(southStats, policyEffect)
            policyAftereffect = buildPolicyAftereffect({
                round,
                topic: question.topic,
                nextRoundFeedback: question.nextRoundFeedback,
                legitimacyEffect: legitimacyTone,
                immediateEffects: policyEffect,
                difficulty,
                reasonText: policyReason,
                aiScoringFocus: question.aiScoringFocus,
                policyParse: policyParse ?? undefined,
            })
            policyReport = {
                sourceRound: round,
                topic: question.topic,
                optionLabel: option.label,
                optionContent: option.content,
                reason: policyReason,
                effects: policyEffect,
                effectSummary: summarizeDimensions(policyEffect),
                legitimacyTone,
                focusMatched: policyAftereffect.focusMatched,
                scoringFocus: question.aiScoringFocus,
            }

            policyMomentumGain = derivePolicyCampaignMomentum({
                round,
                effects: policyEffect,
                policyParse: policyParse ?? null,
            })
            shuMomentum = Math.round((shuMomentum + policyMomentumGain.shuMomentumGain) * 10) / 10
            huainanMomentum = Math.round((huainanMomentum + policyMomentumGain.huainanMomentumGain) * 10) / 10
        }
    }

    if (round === 10) {
        const shuPreparedBonus = deriveCampaignPreparedBonus({
            campaign: 'shu',
            momentum: shuMomentum,
            recentBattleSignal: deriveRecentBattleSignal('shu', schemeResults, policyReport, policyParse ?? null),
            policyMomentum: policyMomentumGain.shuMomentumGain,
        })
        const shuGainBias = deriveShuGainBias(difficulty, Math.min(5, shuMomentum), shuPreparedBonus)
        const evaluation = evaluateShuCampaignOutcome({
            round,
            difficulty,
            southStats,
            northStats,
            northPressurePenalty: deriveNorthPressurePenalty(updatedNpcs, factionsAfter, 'shu'),
            policyBoost: derivePolicyBoost(policyReport),
            momentumBonus: Math.min(5, shuMomentum) + shuPreparedBonus + shuGainBias,
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

    if (round === 16) {
        const huainanPreparedBonus = deriveCampaignPreparedBonus({
            campaign: 'huainan',
            momentum: huainanMomentum,
            recentBattleSignal: deriveRecentBattleSignal('huainan', schemeResults, policyReport, policyParse ?? null),
            policyMomentum: policyMomentumGain.huainanMomentumGain,
        })
        const huainanCarryBonus = deriveHuainanCarryBonus(shuCampaign.resolvedState ?? shuCampaign.state, difficulty)
        const evaluation = evaluateHuainanCampaignOutcome({
            round,
            difficulty,
            southStats,
            northStats,
            northPressurePenalty: deriveNorthPressurePenalty(updatedNpcs, factionsAfter, 'huainan'),
            policyBoost: derivePolicyBoost(policyReport),
            momentumBonus: Math.min(5, huainanMomentum) + huainanPreparedBonus + huainanCarryBonus,
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

    northStats = applyNaturalGrowth(northStats, true, difficulty)
    southStats = applyNaturalGrowth(southStats, false, difficulty)

    const northPowerAfter = calculateCompositePower(northStats)
    const southPowerAfter = calculateCompositePower(southStats)

    let gameResult: GameResult = 'NONE'
    if (deathCheck.triggered) {
        gameResult = 'DEFEAT_DEATH'
    } else if (invasionCheck.triggered) {
        gameResult = 'DEFEAT_INVASION'
    } else if (round >= 20) {
        gameResult = southPowerAfter > northPowerAfter ? 'VICTORY' : 'DEFEAT_POWER'
    }

    const summaryText = generateSummary(
        schemeResults,
        externalActionReports,
        northPowerAfter - calculateCompositePower(params.northStats),
        southPowerAfter - calculateCompositePower(params.southStats),
    )
    const judgeFacts = buildJudgeFacts({
        round,
        beforeFactions: params.factions,
        afterFactions: factionsAfter,
        relationshipReports,
        beforeNorth: params.northStats,
        afterNorth: northStats,
        afterSouth: southStats,
        externalActionReports,
        factionCollapseReports,
        invasionCheck,
        deathCheck,
        policyReport,
        policyAftereffect,
        schemeResults,
        delayedBacklash,
    })

    return {
        schemeResults,
        updatedNpcs,
        factionsAfter,
        relationshipsAfter,
        northStatsAfter: northStats,
        southStatsAfter: southStats,
        northPowerAfter,
        southPowerAfter,
        trustChanges,
        intelUnlocks,
        relationshipReports,
        externalActionReports,
        factionCollapseReports,
        deathTriggered: deathCheck.triggered,
        deathKiller: deathCheck.killerName,
        playerDangerStage: deathCheck.nextStage,
        invasionTriggered: invasionCheck.triggered,
        invasionPoliticalRatio: invasionCheck.politicalWillRatio,
        gameResult,
        summaryText,
        policyReport,
        policyAftereffect,
        delayedBacklash,
        judgeFacts,
        shuCampaign,
        huainanCampaign,
        campaignReports,
        shuMomentum,
        huainanMomentum,
    }
}

function applyPersonEffects(
    npc: NPC,
    trustDelta: number,
    loyaltyDelta: number,
    alignmentShift: NPC['alignmentBias'] | null,
    externalStatus: NPC['externalStatus'] | null,
) {
    npc.trust = clamp(npc.trust + trustDelta)
    npc.loyaltyToCourt = clamp(npc.loyaltyToCourt + loyaltyDelta)

    if (alignmentShift) {
        npc.alignmentBias = alignmentShift
    }

    if (externalStatus) {
        npc.externalStatus = externalStatus
    } else if (npc.powerBase === 'external' && npc.loyaltyToCourt <= 40 && npc.externalStatus === 'loyal') {
        npc.externalStatus = 'watchful'
    }
}

function applyFactionEffects(
    factions: Faction[],
    factionEffects: Partial<Record<CourtFactionId, FactionVector>>,
): Faction[] {
    return factions.map(faction => {
        const delta = factionEffects[faction.id]
        if (!delta) return faction

        return {
            ...faction,
            militaryPower: clamp(faction.militaryPower + delta.militaryPower),
            courtInfluence: clamp(faction.courtInfluence + delta.courtInfluence),
            internalStability: clamp(faction.internalStability + delta.internalStability),
        }
    })
}

function resolveExternalAction(targetNpc: NPC, action: 'secession' | 'rebellion'): {
    report: ExternalActionReport
    factionPenalty: Partial<Record<CourtFactionId, FactionVector>>
} | null {
    if (!targetNpc.isAlive) return null

    const leverage =
        targetNpc.militaryPower * 0.9 +
        targetNpc.trust * 0.18 +
        Math.max(0, 40 - targetNpc.loyaltyToCourt) * 0.9 +
        (targetNpc.highActionBias === action ? 8 : -4)

    if (action === 'secession') {
        if (leverage >= 58) {
            targetNpc.externalStatus = 'secession'
            const damage = damageByMilitaryTier(targetNpc.militaryPower, 'secession')
            return {
                report: {
                    npcId: targetNpc.id,
                    npcName: targetNpc.name,
                    action,
                    outcome: `${targetNpc.name}借乱局坐实地方自雄，明面仍奉朝廷，实则已成割据。`,
                    nationEffects: damage,
                },
                factionPenalty: linkedFactionPenalty(targetNpc, 1.4, 1.1),
            }
        }

        targetNpc.externalStatus = 'watchful'
        targetNpc.loyaltyToCourt = clamp(targetNpc.loyaltyToCourt + 6)
        return {
            report: {
                npcId: targetNpc.id,
                npcName: targetNpc.name,
                action,
                outcome: `${targetNpc.name}权衡之后仍未敢明牌，只是离心更重，暂观朝局。`,
                nationEffects: {
                    governance: -0.8,
                    socialOrder: -0.5,
                },
            },
            factionPenalty: linkedFactionPenalty(targetNpc, 0.6, 0.4),
        }
    }

    if (leverage >= 72) {
        targetNpc.externalStatus = 'secession'
        const damage = damageByMilitaryTier(targetNpc.militaryPower, 'rebellion')
        return {
            report: {
                npcId: targetNpc.id,
                npcName: targetNpc.name,
                action,
                outcome: `${targetNpc.name}举兵之后击退平叛军，转而据地自守，北周不得不承认其割据之实。`,
                nationEffects: damage,
            },
            factionPenalty: linkedFactionPenalty(targetNpc, 2.4, 2.1),
        }
    }

    const fallbackForce = Math.max(18, targetNpc.militaryPower)
    targetNpc.isAlive = false
    targetNpc.externalStatus = 'rebellion'
    targetNpc.militaryPower = 0
    return {
        report: {
            npcId: targetNpc.id,
            npcName: targetNpc.name,
            action,
            outcome: `${targetNpc.name}起兵旋即为平叛军所剿，虽未坐大，却已逼北周为此折损兵粮。`,
            nationEffects: downshiftDamage(damageByMilitaryTier(fallbackForce, 'rebellion')),
        },
        factionPenalty: linkedFactionPenalty(targetNpc, 1.8, 1.5),
    }
}

function linkedFactionPenalty(
    npc: NPC,
    courtInfluenceLoss: number,
    militaryLoss: number,
): Partial<Record<CourtFactionId, FactionVector>> {
    if (npc.alignmentBias === 'emperor' || npc.alignmentBias === 'empress') {
        return {
            [npc.alignmentBias]: {
                militaryPower: -militaryLoss,
                courtInfluence: -courtInfluenceLoss,
                internalStability: -1.2,
            },
        }
    }

    if (npc.alignmentBias === 'swing') {
        return {
            emperor: {
                militaryPower: -round(militaryLoss * 0.5),
                courtInfluence: -round(courtInfluenceLoss * 0.5),
                internalStability: -0.6,
            },
            empress: {
                militaryPower: -round(militaryLoss * 0.5),
                courtInfluence: -round(courtInfluenceLoss * 0.5),
                internalStability: -0.6,
            },
        }
    }

    return {}
}

function summarizeDimensions(changes: Partial<NationDimensions>): string {
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

function cloneCampaign(campaign?: CampaignState): CampaignState {
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

function deriveNorthPressurePenalty(
    npcs: NPC[],
    factions: Faction[],
    campaign: 'shu' | 'huainan',
): number {
    let penalty = 0
    const watchfulOrWorse = npcs.filter(npc =>
        npc.powerBase === 'external' && npc.isAlive && npc.externalStatus !== 'loyal',
    ).length
    penalty += watchfulOrWorse * 1.2
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

function buildJudgeFacts(params: {
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
    policyReport: PolicySettlementReport | null
    policyAftereffect: PolicyAftereffect | null
    schemeResults: SchemeResult[]
    delayedBacklash: DelayedBacklash[]
}): JudgeFacts {
    const event = ROUND_EVENTS[params.round - 1]
    const eventImpactSummary = event
        ? `主线事件「${event.eventName}」继续发酵；${event.briefing}`
        : '本回合主线事件照旧推进。'

    const northDelta = summarizeDimensions(diffDimensions(params.afterNorth, params.beforeNorth))
    const relationshipSummary = summarizeRelationshipReports(params.relationshipReports)
    const collapseSummary = summarizeFactionCollapseReports(params.factionCollapseReports)
    const southSummary = params.policyReport
        ? `南陈问政依“${params.policyReport.optionContent}”施行，${params.policyReport.effectSummary}。${params.policyAftereffect ? `其后效为：${params.policyAftereffect.summary}` : ''}`
        : '南陈本回合无额外问政回批收益。'
    const aiNativeSummary = buildAiNativeSummaryV2(params.schemeResults, params.delayedBacklash, params.policyReport, params.policyAftereffect)

    return {
        eventImpactSummary,
        factionSummary: summarizeFactionChanges(params.beforeFactions, params.afterFactions)
            + (relationshipSummary ? `；${relationshipSummary}` : '')
            + (collapseSummary ? `；${collapseSummary}` : ''),
        relationshipSummary,
        externalSummary: summarizeExternalState(params.externalActionReports),
        northSummary: northDelta || '北周五维无明显波动。',
        southSummary,
        invasionSummary: `${params.invasionCheck.windowLabel}；${params.invasionCheck.pressureSummary}；可战条件满足 ${params.invasionCheck.warCapabilityMet} 项；比值 ${params.invasionCheck.politicalWillRatio.toFixed(2)}。`,
        survivalSummary: params.deathCheck.summary,
        aiNativeSummary,
    }
}

function deriveRelationshipShock(
    action: SchemeAction,
    result: SchemeResult,
    targetNpc: NPC,
    relatedNpc: NPC | null,
    edges: RelationshipEdge[],
): { edgeId: string; delta: number; source: string } | null {
    if (!result.success) return null

    const shockByScheme: Partial<Record<SchemeAction['schemeType'], number>> = {
        slander: -1.1,
        alienate: -1.4,
        frame: -0.8,
        proxy: -1.2,
    }
    const delta = shockByScheme[action.schemeType]
    if (!delta || !relatedNpc) return null

    const matchedEdge = edges.find(edge =>
        (edge.fromNpcId === targetNpc.id && edge.toNpcId === relatedNpc.id) ||
        (edge.fromNpcId === relatedNpc.id && edge.toNpcId === targetNpc.id),
    )

    return matchedEdge ? { edgeId: matchedEdge.id, delta, source: action.schemeType } : null
}

function extraEffectsToFactionVectors(
    effect: ReturnType<typeof combineStructureEffects>,
): Partial<Record<CourtFactionId, FactionVector>> {
    const mapped: Partial<Record<CourtFactionId, FactionVector>> = {}
    if (effect.emperor) {
        mapped.emperor = {
            militaryPower: effect.emperor.militaryPower ?? 0,
            courtInfluence: effect.emperor.courtInfluence ?? 0,
            internalStability: effect.emperor.internalStability ?? 0,
        }
    }
    if (effect.empress) {
        mapped.empress = {
            militaryPower: effect.empress.militaryPower ?? 0,
            courtInfluence: effect.empress.courtInfluence ?? 0,
            internalStability: effect.empress.internalStability ?? 0,
        }
    }
    return mapped
}

function generateSummary(
    schemeResults: SchemeResult[],
    externalActionReports: ExternalActionReport[],
    northDelta: number,
    southDelta: number,
): string {
    const successCount = schemeResults.filter(result => result.success).length
    const actionSummary = externalActionReports.length > 0
        ? `另有${externalActionReports.length}股外部势力明牌动作。`
        : '外部势力尚未彻底明牌。'

    return `本回合${schemeResults.length}次计谋中${successCount}次奏效。${actionSummary}北周综合国力${directionLabel(northDelta)}（${signed(northDelta)}），南陈综合国力${directionLabel(southDelta)}（${signed(southDelta)}）。`
}

function directionLabel(value: number): string {
    if (value > 0) return '上升'
    if (value < 0) return '下降'
    return '持平'
}

function signed(value: number): string {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}`
}

function clamp(value: number): number {
    return Math.max(0, Math.min(100, round(value)))
}

function round(value: number): number {
    return Math.round(value * 10) / 10
}

function deriveFactionCollapsePenalty(reports: FactionCollapseReport[]): {
    factionPenalty: Partial<Record<CourtFactionId, FactionVector>>
    nationPenalty: Partial<NationDimensions>
} {
    const factionPenalty: Partial<Record<CourtFactionId, FactionVector>> = {}
    const nationPenalty: Partial<NationDimensions> = {}

    for (const report of reports) {
        const isCollapse = report.severity === 'collapse'
        factionPenalty[report.factionId] = {
            militaryPower: (factionPenalty[report.factionId]?.militaryPower ?? 0) + (isCollapse ? -2.2 : -1.1),
            courtInfluence: (factionPenalty[report.factionId]?.courtInfluence ?? 0) + (isCollapse ? -2.4 : -1.2),
            internalStability: (factionPenalty[report.factionId]?.internalStability ?? 0) + (isCollapse ? -2.6 : -1.3),
        }
        nationPenalty.governance = round((nationPenalty.governance ?? 0) + (isCollapse ? -1.4 : -0.6))
        nationPenalty.socialOrder = round((nationPenalty.socialOrder ?? 0) + (isCollapse ? -1.1 : -0.5))
        nationPenalty.military = round((nationPenalty.military ?? 0) + (isCollapse ? -0.8 : -0.3))
    }

    return { factionPenalty, nationPenalty }
}

function filterNewFactionCollapseReports(
    previousReports: FactionCollapseReport[],
    currentReports: FactionCollapseReport[],
): FactionCollapseReport[] {
    const previousSeverity = new Map(previousReports.map(report => [report.factionId, report.severity]))
    return currentReports.filter(report => {
        const previous = previousSeverity.get(report.factionId)
        if (!previous) return true
        return previous === 'breach' && report.severity === 'collapse'
    })
}

function applyFactionCollapseNpcDrift(npcs: NPC[], reports: FactionCollapseReport[]): NPC[] {
    if (reports.length === 0) return npcs

    const byFaction = new Map(reports.map(report => [report.factionId, report]))
    return npcs.map(npc => {
        if (npc.powerBase !== 'court') return npc
        const report = byFaction.get(npc.factionId as CourtFactionId)
        if (!report) return npc

        return {
            ...npc,
            trust: clamp(npc.trust + (report.severity === 'collapse' ? -2 : -1)),
            loyaltyToCourt: clamp(npc.loyaltyToCourt + (report.severity === 'collapse' ? -4 : -2)),
        }
    })
}

function damageByMilitaryTier(
    militaryPower: number,
    action: 'secession' | 'rebellion',
): Partial<NationDimensions> {
    const tier = militaryPower <= 35 ? 'light' : militaryPower <= 44 ? 'mid' : militaryPower <= 54 ? 'heavy' : 'extreme'
    const tables: Record<'secession' | 'rebellion', Record<'light' | 'mid' | 'heavy' | 'extreme', NationDimensions>> = {
        secession: {
            light: { finance: -2, grain: -1, military: -2, socialOrder: -1, governance: -3 },
            mid: { finance: -2, grain: -1, military: -2, socialOrder: -2, governance: -4 },
            heavy: { finance: -3, grain: -2, military: -3, socialOrder: -2, governance: -4 },
            extreme: { finance: -4, grain: -3, military: -4, socialOrder: -3, governance: -5 },
        },
        rebellion: {
            light: { finance: -3, grain: -2, military: -3, socialOrder: -2, governance: -4 },
            mid: { finance: -3, grain: -2, military: -4, socialOrder: -3, governance: -5 },
            heavy: { finance: -4, grain: -3, military: -5, socialOrder: -4, governance: -6 },
            extreme: { finance: -5, grain: -4, military: -6, socialOrder: -5, governance: -7 },
        },
    }
    return tables[action][tier]
}

function downshiftDamage(damage: Partial<NationDimensions>): Partial<NationDimensions> {
    const adjusted: Partial<NationDimensions> = {}
    for (const [key, value] of Object.entries(damage) as Array<[keyof NationDimensions, number | undefined]>) {
        adjusted[key] = value ? Math.min(-1, value + 1) : value
    }
    return adjusted
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

    const policyHints = policyReport
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

    const policyHints = policyReport
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
