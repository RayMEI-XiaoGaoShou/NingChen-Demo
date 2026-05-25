import { getPolicyQuestionForRound } from '../data/policyQuestions'
import { INITIAL_RELATIONSHIP_EDGES, RELATIONSHIP_STRUCTURES } from '../data/npcRelationships'
import { getRoundIntel } from '../data/roundIntel'
import {
    applyDimensionChanges,
    applyNaturalGrowth,
    buildPolicyAftereffect,
    calculatePolicyEffect,
    checkFactionCollapse,
    getEventImpact,
} from './nationEngine'
import { applyRelationshipShock, combineStructureEffects } from './relationshipEngine'
import { settleScheme, type SchemeResult } from './schemeEngine'
import type { FactionVector } from './schemeTemplates'
import {
    deriveCampaignMomentumGain,
    getCampaignMomentumSurface,
    type CampaignMomentumSurface,
} from './campaignMomentum'
import { isTerminalCourtDispositionNpc, seedCourtDispositionNpc } from './courtDisposition'
import {
    deriveCourtDispositionNationDamage,
    deriveCourtFavorHit,
    resolveCourtDispositionProxy,
} from './courtDispositionEngine'
import { derivePolicyCampaignMomentum } from './policyCampaignMomentum'
import { buildSchemeOutcomeExplanation, type SchemeOutcomeExplanation } from './schemeOutcomeExplanation'
import { resolveExternalAction, type ExternalActionReport } from './externalActionResolution'
import { attachBorrowedBladePostResolution, attachExternalActionPostResolution } from './schemePostResolutionEvent'
import {
    applyCourtDispositionUpdates,
    applyCourtFavorHitToNpc,
    applyFactionCollapseNpcDrift,
    applyFactionEffects,
    applyPersonEffects,
    deriveFactionCollapsePenalty,
    deriveRelationshipShock,
    extraEffectsToFactionVectors,
    filterNewFactionCollapseReports,
} from './roundSettlementEffects'
import { deriveSettlementPressureFlow } from './settlementPressure'
import {
    applyCampaignFalloutForRound,
    cloneCampaign,
    resolveCampaignOutcomesForRound,
} from './settlementCampaign'
import {
    buildJudgeFacts,
    buildSettlementKeyChangeHighlights,
    generateSummary,
    summarizeDimensions,
} from './settlementNarrative'
import type { JudgeFacts, PolicySettlementReport, SettlementKeyChangeHighlight } from './settlementTypes'
import { calculateCompositePower } from './types'
import type {
    BorrowedBladeReport,
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
export type { JudgeFacts, PolicySettlementReport, SettlementKeyChangeHighlight } from './settlementTypes'
export { buildAiNativeSummary } from './settlementNarrative'

export type { ExternalActionReport } from './externalActionResolution'

export interface RoundSettlementResult {
    processedSchemes: SchemeAction[]
    schemeResults: SchemeResult[]
    schemeOutcomeExplanations: SchemeOutcomeExplanation[]
    keyChangeHighlights: SettlementKeyChangeHighlight[]
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
    borrowedBladeReports: BorrowedBladeReport[]
    factionCollapseReports: FactionCollapseReport[]
    deathTriggered: boolean
    deathKiller: string | null
    playerDangerStage: PlayerDangerStage
    playerSuspicionHeat: number
    playerSuspicionDelta: number
    playerSuspicionReasons: string[]
    invasionTriggered: boolean
    invasionPoliticalRatio: number
    invasionPressure: number
    invasionPressureDelta: number
    invasionPressureReasons: string[]
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
    campaignMomentumSurface: CampaignMomentumSurface
}

function hasPolicyReasonText(reason: string): boolean {
    return reason.trim().length > 0
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
    playerSuspicionHeat?: number
    invasionPressure?: number
    policyOptionIndex: number | null
    policyReason: string
    policyParse?: PolicyReasonParseResult | null
    shuCampaign?: CampaignState
    huainanCampaign?: CampaignState
    shuMomentum?: number
    huainanMomentum?: number
}): RoundSettlementResult {
    const { round, schemes, policyOptionIndex, policyReason, policyParse, intelProgress, difficulty = 'normal' } = params
    const trimmedPolicyReason = policyReason.trim()
    const hasPolicyReason = hasPolicyReasonText(trimmedPolicyReason)

    let northStats = { ...params.northStats }
    let southStats = { ...params.southStats }
    let shuCampaign = cloneCampaign(params.shuCampaign)
    let huainanCampaign = cloneCampaign(params.huainanCampaign)
    let shuMomentum = params.shuMomentum ?? 0
    let huainanMomentum = params.huainanMomentum ?? 0
    let updatedNpcs: NPC[] = params.npcs.map(npc => seedCourtDispositionNpc({ ...npc }))
    let factionsAfter = params.factions.map(faction => ({ ...faction }))
    let relationshipsAfter = (params.relationships ?? INITIAL_RELATIONSHIP_EDGES).map(edge => ({ ...edge }))
    const trustChanges: Record<string, number> = {}
    const intelUnlocks: Record<string, number> = {}
    const relationshipReports: RelationshipReport[] = []
    const externalActionReports: ExternalActionReport[] = []
    const borrowedBladeReports: BorrowedBladeReport[] = []
    let factionCollapseReports: FactionCollapseReport[] = []
    let policyReport: PolicySettlementReport | null = null
    let policyAftereffect: PolicyAftereffect | null = null
    let policyMomentumGain = { shuMomentumGain: 0, huainanMomentumGain: 0 }
    let delayedBacklash: DelayedBacklash[] = []
    const campaignReports: string[] = []

    northStats = applyDimensionChanges(northStats, getEventImpact(round))

    const campaignFallout = applyCampaignFalloutForRound({
        round,
        northStats,
        southStats,
        shuCampaign,
        huainanCampaign,
    })
    northStats = campaignFallout.northStats
    southStats = campaignFallout.southStats
    shuCampaign = campaignFallout.shuCampaign
    huainanCampaign = campaignFallout.huainanCampaign
    campaignReports.push(...campaignFallout.campaignReports)

    const eventIntelUnlocks = getRoundIntel(round)?.autoUnlocks ?? {}
    for (const [npcId, count] of Object.entries(eventIntelUnlocks)) {
        intelUnlocks[npcId] = (intelUnlocks[npcId] ?? 0) + (count ?? 0)
    }

    const schemeResults: SchemeResult[] = []
    const schemeOutcomeExplanations: SchemeOutcomeExplanation[] = []
    const processedSchemes: SchemeAction[] = []
    const actionsPerNpc: Record<string, number> = {}

    for (const action of schemes) {
        const targetNpc = updatedNpcs.find(npc => npc.id === action.targetNpcId)
        const relatedNpc = action.relatedNpcId
            ? updatedNpcs.find(npc => npc.id === action.relatedNpcId) ?? null
            : null

        if (!targetNpc) continue
        if (isTerminalCourtDispositionNpc(targetNpc)) continue
        const schemeNeedsSecondTarget = action.schemeType === 'slander' || action.schemeType === 'alienate' || action.schemeType === 'proxy'
        if (schemeNeedsSecondTarget && (!relatedNpc || isTerminalCourtDispositionNpc(relatedNpc))) continue
        const activeRelatedNpc = relatedNpc && !isTerminalCourtDispositionNpc(relatedNpc) ? relatedNpc : null
        const targetBefore = { ...targetNpc }
        const relatedBefore = activeRelatedNpc ? { ...activeRelatedNpc } : null
        const factionsBeforeAction = factionsAfter.map(faction => ({ ...faction }))

        const unlockedSecretsBeforeAction = (intelProgress[action.targetNpcId] ?? 0) + (intelUnlocks[action.targetNpcId] ?? 0)

        let result = settleScheme(
            action,
            targetNpc,
            activeRelatedNpc,
            actionsPerNpc[action.targetNpcId] ?? 0,
            {
                round,
                unlockedSecrets: unlockedSecretsBeforeAction,
                difficulty,
            },
        )

        schemeResults.push(result)
        processedSchemes.push(action)
        delayedBacklash = delayedBacklash.concat(result.delayedBacklash)

        applyPersonEffects(
            targetNpc,
            result.personEffects.trustDelta,
            result.personEffects.loyaltyDelta,
            result.personEffects.militaryPowerDelta,
            result.personEffects.alignmentShift,
            result.personEffects.externalStatus,
        )
        trustChanges[targetNpc.id] = (trustChanges[targetNpc.id] ?? 0) + result.personEffects.trustDelta

        if (activeRelatedNpc) {
            applyPersonEffects(
                activeRelatedNpc,
                result.personEffects.relatedTrustDelta,
                result.personEffects.relatedLoyaltyDelta,
                result.personEffects.relatedMilitaryPowerDelta ?? 0,
                null,
                null,
            )
            if (result.personEffects.relatedTrustDelta !== 0) {
                trustChanges[activeRelatedNpc.id] = (trustChanges[activeRelatedNpc.id] ?? 0) + result.personEffects.relatedTrustDelta
            }
        }

        if (result.personEffects.intelDelta > 0) {
            intelUnlocks[targetNpc.id] = (intelUnlocks[targetNpc.id] ?? 0) + result.personEffects.intelDelta
        }

        if (action.schemeType === 'slander' && activeRelatedNpc && activeRelatedNpc.isAlive) {
            applyCourtFavorHitToNpc(
                activeRelatedNpc,
                deriveCourtFavorHit({
                    schemeType: 'slander',
                    actorNpc: targetNpc,
                    targetNpc: activeRelatedNpc,
                    success: result.success,
                    parse: result.northParse,
                }),
            )
        }

        if (action.schemeType === 'alienate' && activeRelatedNpc && activeRelatedNpc.isAlive) {
            applyCourtFavorHitToNpc(
                activeRelatedNpc,
                deriveCourtFavorHit({
                    schemeType: 'alienate',
                    actorNpc: targetNpc,
                    targetNpc: activeRelatedNpc,
                    success: result.success,
                    parse: result.northParse,
                }),
            )
        }

        if (action.schemeType === 'frame' && targetNpc.isAlive) {
            applyCourtFavorHitToNpc(
                targetNpc,
                deriveCourtFavorHit({
                    schemeType: 'frame',
                    actorNpc: targetNpc,
                    targetNpc,
                    success: result.success,
                    parse: result.northParse,
                }),
            )
            northStats = applyDimensionChanges(
                northStats,
                deriveCourtDispositionNationDamage({
                    schemeType: 'frame',
                    success: result.success,
                    parse: result.northParse,
                }),
            )
        }

        if (action.schemeType === 'omen' && targetNpc.isAlive) {
            applyCourtFavorHitToNpc(
                targetNpc,
                deriveCourtFavorHit({
                    schemeType: 'omen',
                    actorNpc: targetNpc,
                    targetNpc,
                    success: result.success,
                    parse: result.northParse,
                }),
            )
            northStats = applyDimensionChanges(
                northStats,
                deriveCourtDispositionNationDamage({
                    schemeType: 'omen',
                    success: result.success,
                    parse: result.northParse,
                }),
            )
        }

        if (action.schemeType === 'proxy' && activeRelatedNpc && activeRelatedNpc.isAlive) {
            const proxyResolution = resolveCourtDispositionProxy({
                round,
                actorNpc: targetNpc,
                targetNpc: activeRelatedNpc,
                parse: result.northParse,
                success: result.success,
            })

            if (proxyResolution) {
                applyCourtDispositionUpdates(activeRelatedNpc, proxyResolution.targetUpdates)
                northStats = applyDimensionChanges(northStats, proxyResolution.nationPenalty)
                factionsAfter = applyFactionEffects(factionsAfter, proxyResolution.factionPenalty as Partial<Record<CourtFactionId, FactionVector>>)
                borrowedBladeReports.push(
                    {
                        actorNpcId: targetNpc.id,
                        actorNpcName: targetNpc.name,
                        targetNpcId: activeRelatedNpc.id,
                        targetNpcName: activeRelatedNpc.name,
                        outcome: proxyResolution.outcome,
                        summary: proxyResolution.summary,
                    },
                )
                result = attachBorrowedBladePostResolution(result, borrowedBladeReports[borrowedBladeReports.length - 1])
                schemeResults[schemeResults.length - 1] = result
            }
        }

        factionsAfter = applyFactionEffects(factionsAfter, result.factionEffects)
        northStats = applyDimensionChanges(northStats, result.nationEffects)

        const relationshipShock = deriveRelationshipShock(action, result, targetNpc, activeRelatedNpc, relationshipsAfter)
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
                result = attachExternalActionPostResolution(result, report.report)
                schemeResults[schemeResults.length - 1] = result
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
        schemeOutcomeExplanations.push(buildSchemeOutcomeExplanation({
            action,
            result,
            targetBefore,
            targetAfter: { ...targetNpc },
            relatedBefore,
            relatedAfter: activeRelatedNpc ? { ...activeRelatedNpc } : null,
            factionsBefore: factionsBeforeAction,
            factionsAfter: factionsAfter.map(faction => ({ ...faction })),
        }))

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

    const {
        pressureUpdate,
        deathCheck,
        invasionCheck,
    } = deriveSettlementPressureFlow({
        round,
        difficulty,
        previousPlayerSuspicionHeat: params.playerSuspicionHeat,
        previousInvasionPressure: params.invasionPressure,
        playerDangerStage: params.playerDangerStage,
        schemes: processedSchemes,
        schemeResults,
        npcsBefore: params.npcs,
        npcsAfter: updatedNpcs,
        factionsBefore: params.factions,
        factionsAfter,
        northBefore: params.northStats,
        northAfter: northStats,
        delayedBacklash,
    })

    if (policyOptionIndex !== null) {
        const question = getPolicyQuestionForRound(round, {
            shuCampaignState: shuCampaign.state,
            huainanCampaignState: huainanCampaign.state,
        })
        const option = question?.options[policyOptionIndex]
        if (question && option) {
            const legitimacyTone = option.legitimacyEffect ?? 'steady'
            const activePolicyParse = hasPolicyReason ? policyParse ?? undefined : undefined
            const policyEffect = calculatePolicyEffect(option.effects, trimmedPolicyReason, {
                legitimacyEffect: legitimacyTone,
                aiScoringFocus: question.aiScoringFocus,
                policyParse: activePolicyParse,
                round,
            }, difficulty)
            southStats = applyDimensionChanges(southStats, policyEffect)
            policyAftereffect = hasPolicyReason
                ? buildPolicyAftereffect({
                    round,
                    topic: question.topic,
                    nextRoundFeedback: question.nextRoundFeedback,
                    legitimacyEffect: legitimacyTone,
                    immediateEffects: policyEffect,
                    difficulty,
                    reasonText: trimmedPolicyReason,
                    aiScoringFocus: question.aiScoringFocus,
                    policyParse: activePolicyParse,
                })
                : null
            policyReport = {
                sourceRound: round,
                topic: question.topic,
                question: question.question,
                optionLabel: option.label,
                optionContent: option.content,
                reason: trimmedPolicyReason,
                effects: policyEffect,
                effectSummary: summarizeDimensions(policyEffect),
                legitimacyTone,
                focusMatched: Boolean(policyAftereffect?.focusMatched),
                scoringFocus: question.aiScoringFocus,
                policyParse: hasPolicyReason ? policyParse ?? null : null,
            }

            policyMomentumGain = derivePolicyCampaignMomentum({
                round,
                effects: policyEffect,
                policyParse: hasPolicyReason ? policyParse ?? null : null,
            })
            shuMomentum = Math.round((shuMomentum + policyMomentumGain.shuMomentumGain) * 10) / 10
            huainanMomentum = Math.round((huainanMomentum + policyMomentumGain.huainanMomentumGain) * 10) / 10
        }
    }

    const campaignOutcomes = resolveCampaignOutcomesForRound({
        round,
        difficulty,
        northStats,
        southStats,
        updatedNpcs,
        factionsAfter,
        schemes,
        schemeResults,
        policyReport,
        policyParse: hasPolicyReason ? policyParse ?? null : null,
        policyMomentumGain,
        shuMomentum,
        huainanMomentum,
        shuCampaign,
        huainanCampaign,
    })
    northStats = campaignOutcomes.northStats
    southStats = campaignOutcomes.southStats
    shuCampaign = campaignOutcomes.shuCampaign
    huainanCampaign = campaignOutcomes.huainanCampaign
    campaignReports.push(...campaignOutcomes.campaignReports)

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
        borrowedBladeReports,
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
        pressureUpdate,
        policyReport,
        policyAftereffect,
        schemeResults,
        delayedBacklash,
        shuCampaign,
        huainanCampaign,
    })
    const keyChangeHighlights = buildSettlementKeyChangeHighlights({
        beforeNpcs: params.npcs,
        afterNpcs: updatedNpcs,
        beforeFactions: params.factions,
        afterFactions: factionsAfter,
    })
    const campaignMomentumSurface = getCampaignMomentumSurface(round, shuMomentum, huainanMomentum)

    return {
        processedSchemes,
        schemeResults,
        schemeOutcomeExplanations,
        keyChangeHighlights,
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
        borrowedBladeReports,
        factionCollapseReports,
        deathTriggered: deathCheck.triggered,
        deathKiller: deathCheck.killerName,
        playerDangerStage: deathCheck.nextStage,
        playerSuspicionHeat: pressureUpdate.playerSuspicionHeat,
        playerSuspicionDelta: pressureUpdate.suspicionDelta.value,
        playerSuspicionReasons: pressureUpdate.suspicionDelta.reasons,
        invasionTriggered: invasionCheck.triggered,
        invasionPoliticalRatio: invasionCheck.politicalWillRatio,
        invasionPressure: pressureUpdate.invasionPressure,
        invasionPressureDelta: pressureUpdate.invasionDelta.value,
        invasionPressureReasons: pressureUpdate.invasionDelta.reasons,
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
        campaignMomentumSurface,
    }
}
