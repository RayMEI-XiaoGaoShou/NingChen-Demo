import { getSchemeByType } from '../data/schemes'
import { getMilitarySpilloverStrength, isOmenAvailableForNpc, roundSupportsExternalAction } from '../data/roundRuleConfig'
import { isCourtDispositionExecutor } from './courtDisposition'
import { isExternalEscalationOpen, isTerminalExternalNpc } from './externalStatus'
import {
    applyDimensionRelevance,
    addFactionEffect,
    deriveNationEffectFromFactionEffects,
    getDimensionRelevance,
    getIntrigueNationGate,
    getLowRiskNationDamping,
    getOpeningSchemeNationScale,
    mergeDimensions,
    normalizeDimensions,
    scaleDimensions,
    scaleVector,
    semanticScale,
    softenEarlyNorthNationEffects,
} from './schemeEffectUtils'
import { calculateParsedSuccessRate, resolveNorthParse } from './schemeSuccess'
import {
    applySchemeFollowUpToNorthParse,
    getSchemeFollowUpEffectMultiplier,
    getSchemeFollowUpSuccessRateDelta,
} from './schemeFollowUp'
import { deriveDelayedBacklash } from './schemeBacklash'
import { generateFeedback } from './schemeFeedback'
import {
    buildSchemeCausalEventDraft,
    buildSchemeImpactTrace,
    type SchemeCausalEventDraft,
    type SchemeImpactTrace,
    type SchemeImpactSource,
    type SchemeNationImpactSource,
} from './schemeCausalEvent'
import {
    getFailureTemplate,
    getSuccessTemplate,
    scalePersonEffects,
    type FactionVector,
    type PersonEffects,
} from './schemeTemplates'
import { buildSchemeNpcActionNarrative } from './schemeNpcAction'
import type {
    CourtFactionId,
    DelayedBacklash,
    GameDifficulty,
    NationDimensions,
    NPC,
    NorthSchemeParseResult,
    SchemeAction,
    SchemeType,
} from './types'
export { calculateParsedSuccessRate } from './schemeSuccess'
export type { FactionVector, PersonEffects } from './schemeTemplates'

export interface SchemeResult {
    trustChange: number
    relatedTrustChange: number
    northDimensionChanges: Partial<NationDimensions>
    feedbackText: string
    success: boolean
    personEffects: PersonEffects
    factionEffects: Partial<Record<CourtFactionId, FactionVector>>
    nationEffects: Partial<NationDimensions>
    specialAction: 'secession' | 'rebellion' | null
    northParse: NorthSchemeParseResult
    delayedBacklash: DelayedBacklash[]
    npcAction?: SchemeNpcActionNarrative | null
    relatedImpactSummary?: string | null
    impactTrace?: SchemeImpactTrace | null
    causalEvent?: SchemeCausalEventDraft | null
}

export interface SchemeNpcActionNarrative {
    text: string
    source: 'ai' | 'fallback'
    kind?: 'move' | 'counter' | 'attitude' | 'intel'
}

export interface SchemeContext {
    round: number
    unlockedSecrets: number
    difficulty?: GameDifficulty
    northParse?: NorthSchemeParseResult
}

export function getAvailableSchemesForTrust(trust: number): SchemeType[] {
    const schemes: SchemeType[] = ['probe', 'advise']
    if (trust >= 30) schemes.push('slander')
    if (trust >= 50) schemes.push('alienate', 'frame')
    if (trust >= 70) schemes.push('proxy', 'appeal')
    return schemes
}

export function getAvailableSchemesForNpc(
    npc: NPC,
    context: Partial<SchemeContext> = {},
): SchemeType[] {
    const { round = 1, unlockedSecrets = 0 } = context
    if (isTerminalExternalNpc(npc)) return []

    const base = getAvailableSchemesForTrust(npc.trust)
        .filter(type => !(npc.powerBase === 'external' && type === 'proxy'))
        .filter(type => type !== 'proxy' || isCourtDispositionExecutor(npc.id))
    const canEscalateExternalAction =
        npc.powerBase === 'external' &&
        npc.isAlive &&
        isExternalEscalationOpen(npc.externalStatus)

    if (round === 1) {
        return base.filter(type => type === 'probe' || type === 'advise' || type === 'slander')
    }

    if (isOmenAvailableForNpc(round, npc)) {
        base.push('omen')
    }

    if (
        canEscalateExternalAction &&
        npc.trust >= 72 &&
        npc.loyaltyToCourt <= 35 &&
        unlockedSecrets >= 2 &&
        roundSupportsExternalAction(round, 'secession')
    ) {
        base.push('secession')
    }

    if (
        canEscalateExternalAction &&
        npc.trust >= 85 &&
        npc.loyaltyToCourt <= 18 &&
        unlockedSecrets >= 3 &&
        roundSupportsExternalAction(round, 'rebellion')
    ) {
        base.push('rebellion')
    }

    return Array.from(new Set(base))
}

function getTrustThreshold(schemeType: SchemeType): number {
    return getSchemeByType(schemeType)?.trustThreshold ?? 0
}

function deriveNationEffectFromExternalPerson(
    targetNpc: NPC,
    personEffects: PersonEffects,
    parse: NorthSchemeParseResult,
): Partial<NationDimensions> {
    if (targetNpc.powerBase !== 'external') return {}

    const loyaltyShock = Math.max(0, -personEffects.loyaltyDelta)
    const forceFactor = targetNpc.militaryPower / 40
    const financeScale = semanticScale(Math.max(parse.financeRelevance, parse.grainRelevance * 0.55), 0.36, 0.55, 1.1)
    const grainScale = semanticScale(Math.max(parse.grainRelevance, parse.militaryRelevance * 0.35), 0.4, 0.55, 1.2)
    const militaryScale = semanticScale(parse.militaryRelevance, 0.46, 0.55, 1.25)
    const socialScale = 0.45 + parse.socialOrderRelevance * 0.7
    const governanceScale = 0.5 + parse.governanceRelevance * 0.7

    return normalizeDimensions({
        finance: financeScale === 0 ? 0 : -(loyaltyShock * 0.05 * forceFactor * financeScale),
        grain: grainScale === 0 ? 0 : -(loyaltyShock * 0.04 * forceFactor * grainScale),
        military: militaryScale === 0 ? 0 : -(loyaltyShock * 0.08 * forceFactor * militaryScale),
        socialOrder: -(loyaltyShock * 0.05 * forceFactor * socialScale),
        governance: -(loyaltyShock * 0.08 * forceFactor * governanceScale),
    })
}

function deriveNationEffectFromExternalMilitaryShift(
    npc: NPC | null | undefined,
    militaryPowerDelta: number,
    parse: NorthSchemeParseResult,
): Partial<NationDimensions> {
    if (!npc || npc.powerBase !== 'external' || militaryPowerDelta === 0) return {}

    const magnitude = Math.abs(militaryPowerDelta)
    const militaryScale = 0.68 + parse.militaryRelevance * 0.46
    const grainScale = 0.56 + parse.grainRelevance * 0.44
    const financeScale = 0.48 + parse.financeRelevance * 0.34
    const governanceScale = 0.46 + parse.governanceRelevance * 0.34
    const socialScale = 0.42 + parse.socialOrderRelevance * 0.3

    if (militaryPowerDelta > 0) {
        return normalizeDimensions({
            finance: -(magnitude * 0.18 * financeScale),
            grain: -(magnitude * 0.22 * grainScale),
            military: -(magnitude * 0.34 * militaryScale),
            governance: -(magnitude * 0.12 * governanceScale),
        })
    }

    return normalizeDimensions({
        grain: -(magnitude * 0.18 * grainScale),
        military: -(magnitude * 0.32 * militaryScale),
        governance: parse.governanceRelevance >= 0.44 ? -(magnitude * 0.14 * governanceScale) : 0,
        socialOrder: parse.socialOrderRelevance >= 0.5 ? -(magnitude * 0.1 * socialScale) : 0,
    })
}

function getAgendaRelevance(parse: NorthSchemeParseResult): number {
    return Math.max(
        parse.financeRelevance,
        parse.grainRelevance,
        parse.militaryRelevance,
        parse.socialOrderRelevance,
        parse.governanceRelevance,
    )
}

const NATION_DIMENSION_KEYS = ['finance', 'grain', 'military', 'socialOrder', 'governance'] as const
type NationDimensionKey = typeof NATION_DIMENSION_KEYS[number]

function getSchemeQuality(parse: NorthSchemeParseResult): number {
    return (
        parse.characterFit
        + parse.eventFit
        + parse.structuralPenetration
        + parse.executability
    ) / 4
}

function getRankProminenceMultiplier(rank: number, dimensionCount: number): number {
    if (dimensionCount <= 2) return rank === 0 ? 1.1 : 0.98
    if (rank === 0) return 1.24
    if (rank === 1) return 1.1
    return Math.max(0.7, 0.9 - (rank - 2) * 0.08)
}

function buildRankedAdviceImpact(params: {
    parse: NorthSchemeParseResult
    baseChanges: Partial<Record<NationDimensionKey, number>>
    thresholds: Record<NationDimensionKey, number>
    minScale: number
    maxScale: number
}): Partial<NationDimensions> {
    const candidates = NATION_DIMENSION_KEYS
        .map(dimension => {
            const base = params.baseChanges[dimension] ?? 0
            const threshold = params.thresholds[dimension]
            const relevance = getDimensionRelevance(params.parse, dimension)
            if (base === 0 || relevance < threshold) return null
            return { dimension, base, relevance, threshold }
        })
        .filter((candidate): candidate is {
            dimension: NationDimensionKey
            base: number
            relevance: number
            threshold: number
        } => Boolean(candidate))
        .sort((a, b) => b.relevance - a.relevance)

    if (candidates.length === 0) return {}

    const quality = getSchemeQuality(params.parse)
    const qualityGate = clamp((quality - 0.58) / 0.3, 0, 1)
    const qualityMultiplier = clamp(0.88 + quality * 0.34, 0.92, 1.18)
    const complexityMultiplier = candidates.length > 2
        ? clamp(1 + (candidates.length - 2) * 0.11 * qualityGate, 1, 1.36)
        : 1

    const changes: Partial<NationDimensions> = {}
    candidates.forEach((candidate, rank) => {
        const semanticMultiplier = semanticScale(
            candidate.relevance,
            candidate.threshold,
            params.minScale,
            params.maxScale,
        )
        const prominenceMultiplier = getRankProminenceMultiplier(rank, candidates.length)
        changes[candidate.dimension] = candidate.base * semanticMultiplier * prominenceMultiplier * qualityMultiplier * complexityMultiplier
    })

    return normalizeDimensions(changes)
}

function deriveCourtAdviceImpact(
    action: SchemeAction,
    targetNpc: NPC,
    success: boolean,
    parse: NorthSchemeParseResult,
): Partial<NationDimensions> {
    if (!success || action.schemeType !== 'advise' || targetNpc.powerBase !== 'court') return {}

    const agendaRelevance = getAgendaRelevance(parse)
    if (agendaRelevance < 0.24) return {}
    const advicePolarity = parse.advicePolarity ?? 'neutral_or_vague'
    const stateBenefit = parse.stateBenefit ?? 0
    const targetBenefit = parse.targetBenefit ?? 0

    if (advicePolarity === 'pro_state') {
        const supportScale = clamp(0.72 + Math.max(0, stateBenefit) * 0.55, 0.72, 1.22)
        return buildRankedAdviceImpact({
            parse,
            baseChanges: {
                finance: 0.18 * supportScale,
                grain: 0.18 * supportScale,
                military: 0.16 * supportScale,
                socialOrder: 0.18 * supportScale,
                governance: 0.72 * supportScale,
            },
            thresholds: {
                finance: 0.44,
                grain: 0.4,
                military: 0.42,
                socialOrder: 0.34,
                governance: 0.36,
            },
            minScale: 0.66,
            maxScale: 1.18,
        })
    }

    if (advicePolarity === 'neutral_or_vague') {
        return applyDimensionRelevance({
            socialOrder: -0.08,
            governance: -0.12,
        }, parse, {
            socialOrder: 0.44,
            governance: 0.48,
        }, {
            socialOrder: { min: 0.48, max: 0.82 },
            governance: { min: 0.48, max: 0.82 },
        })
    }

    const sabotageScale = clamp(0.78 + Math.max(0, targetBenefit) * 0.18 + Math.max(0, -stateBenefit) * 0.3, 0.78, 1.18)
    return buildRankedAdviceImpact({
        parse,
        baseChanges: {
            finance: -0.26 * sabotageScale,
            grain: -0.34 * sabotageScale,
            military: -0.38 * sabotageScale,
            socialOrder: -0.22 * sabotageScale,
            governance: -0.36 * sabotageScale,
        },
        thresholds: {
            finance: 0.5,
            grain: 0.46,
            military: 0.46,
            socialOrder: 0.4,
            governance: 0.42,
        },
        minScale: 0.68,
        maxScale: 1.18,
    })
}

function deriveOmenLegitimacyImpact(
    action: SchemeAction,
    targetNpc: NPC,
    success: boolean,
    parse: NorthSchemeParseResult,
): Partial<NationDimensions> {
    if (!success || action.schemeType !== 'omen' || targetNpc.powerBase !== 'court') return {}

    const legitimacyRelevance = Math.max(parse.governanceRelevance, parse.socialOrderRelevance)
    if (legitimacyRelevance < 0.22) return {}
    const omenPolarity = parse.omenPolarity ?? 'vague_or_ceremonial'
    const legitimacyDirection = parse.legitimacyDirection ?? 0

    if (omenPolarity === 'legitimizing') {
        const supportScale = clamp(0.8 + Math.max(0, legitimacyDirection) * 0.6, 0.8, 1.3)
        return applyDimensionRelevance({
            socialOrder: 0.42 * supportScale,
            governance: 0.86 * supportScale,
        }, parse, {
            socialOrder: 0.34,
            governance: 0.36,
        }, {
            socialOrder: { min: 0.82, max: 1.18 },
            governance: { min: 0.88, max: 1.24 },
        })
    }

    if (omenPolarity === 'vague_or_ceremonial') {
        return applyDimensionRelevance({
            socialOrder: -0.06,
            governance: -0.1,
        }, parse, {
            socialOrder: 0.42,
            governance: 0.46,
        }, {
            socialOrder: { min: 0.45, max: 0.72 },
            governance: { min: 0.45, max: 0.72 },
        })
    }

    const destabilizeScale = clamp(0.82 + Math.max(0, -legitimacyDirection) * 0.64, 0.82, 1.34)
    return applyDimensionRelevance({
        socialOrder: -0.26 * destabilizeScale,
        governance: -0.62 * destabilizeScale,
    }, parse, {
        socialOrder: 0.32,
        governance: 0.34,
    }, {
        socialOrder: { min: 0.74, max: 1.08 },
        governance: { min: 0.8, max: 1.18 },
    })
}

function getCourtIntrigueFactionDamping(
    action: SchemeAction,
    targetNpc: NPC,
    relatedNpc: NPC | null,
    parse: NorthSchemeParseResult,
    difficulty: GameDifficulty,
): number {
    if (action.schemeType !== 'alienate') return 1
    if (targetNpc.powerBase !== 'court' || relatedNpc?.powerBase !== 'court') return 1

    const agendaRelevance = Math.max(parse.governanceRelevance, parse.socialOrderRelevance)
    const intrigueSignal =
        parse.structuralPenetration * 0.55
        + agendaRelevance * 0.7
        + parse.characterFit * 0.1

    const base =
        difficulty === 'easy'
            ? 0.14
            : difficulty === 'normal'
                ? 0
                : difficulty === 'hard'
                    ? 0
                    : 0

    return clamp(base + intrigueSignal, 0.08, 1)
}

function getFrameTrapFactor(parse: NorthSchemeParseResult): number {
    const selfTrapPotential = parse.selfTrapPotential ?? 0
    const scapegoatClarity = parse.scapegoatClarity ?? 0
    return clamp(0.72 + selfTrapPotential * 0.42 + scapegoatClarity * 0.5, 0.72, 1.46)
}

export function previewSchemeSuccess(
    action: SchemeAction,
    targetNpc: NPC,
    existingActionsOnTarget: number,
    roll: number,
    context: Partial<SchemeContext> = {},
): boolean {
    const rawParse = resolveNorthParse(action, targetNpc, context.round ?? 1, null, context.northParse)
    const parse = applySchemeFollowUpToNorthParse(rawParse, action.followUp)
    const successRate = calculateParsedSuccessRate(
        action.schemeType,
        targetNpc.trust,
        getTrustThreshold(action.schemeType),
        existingActionsOnTarget > 0,
        parse,
        context.difficulty ?? 'normal',
    )
    const finalSuccessRate = clamp(
        successRate + getSchemeFollowUpSuccessRateDelta(action.followUp),
        0.05,
        0.98,
    )
    return roll < finalSuccessRate
}

export function settleScheme(
    action: SchemeAction,
    targetNpc: NPC,
    relatedNpc: NPC | null,
    existingActionsOnTarget: number,
    context: Partial<SchemeContext> = {},
): SchemeResult {
    const { round = 1, unlockedSecrets = 0, difficulty = 'normal' } = context
    const roll = action.resolutionRoll ?? Math.random()
    const schemeAllowed = isSchemeAllowed(action.schemeType, targetNpc, round, unlockedSecrets)
    const rawNorthParse = resolveNorthParse(action, targetNpc, round, relatedNpc, context.northParse)
    const northParse = applySchemeFollowUpToNorthParse(rawNorthParse, action.followUp)
    const success = schemeAllowed && previewSchemeSuccess(
        action,
        targetNpc,
        existingActionsOnTarget,
        roll,
        context,
    )
    const followUpEffectMultiplier = success ? getSchemeFollowUpEffectMultiplier(action.followUp) : 1
    const personMultiplier = success
        ? clamp(0.9 + northParse.characterFit * 0.85 + northParse.executability * 0.35, 0.8, 2.1) * followUpEffectMultiplier
        : clamp(0.95 + northParse.exposureRisk * 0.45 - northParse.executability * 0.15, 0.9, 1.35)
    const factionMultiplier = success
        ? clamp(0.85 + northParse.eventFit * 0.55 + northParse.structuralPenetration * 1.0, 0.75, 2.4) * followUpEffectMultiplier
        : clamp(0.9 + northParse.exposureRisk * 0.2, 0.9, 1.3)
    const nationMultiplier = success && northParse.structuralPenetration >= 0.45
        ? clamp(0.68 + northParse.structuralPenetration * 0.9 + northParse.eventFit * 0.2, 0.7, 2.05)
        : success
            ? 0.5
            : 1
    const tunedNationMultiplier = success
        ? roundValue(nationMultiplier * getOpeningSchemeNationScale(round) * followUpEffectMultiplier)
        : nationMultiplier

    const template: {
        person: PersonEffects
        factionEffects: Partial<Record<CourtFactionId, FactionVector>>
        specialAction: 'secession' | 'rebellion' | null
    } = success
        ? getSuccessTemplate(action, targetNpc, relatedNpc, northParse)
        : { ...getFailureTemplate(action, targetNpc), specialAction: null }

    let personEffects = scalePersonEffects(template.person, personMultiplier)
    let factionEffects: Partial<Record<CourtFactionId, FactionVector>> = {}
    const factionDamping = getCourtIntrigueFactionDamping(action, targetNpc, relatedNpc, northParse, difficulty)
    for (const [factionId, vector] of Object.entries(template.factionEffects) as Array<[CourtFactionId, FactionVector | undefined]>) {
        if (!vector) continue
        factionEffects[factionId] = scaleVector(vector, factionMultiplier * factionDamping)
    }

    const relatedSemanticImpact = deriveRelatedNpcSemanticImpact(action, relatedNpc, success, northParse)
    personEffects = {
        ...personEffects,
        relatedLoyaltyDelta: Math.round(
            personEffects.relatedLoyaltyDelta + (relatedSemanticImpact.personEffects.relatedLoyaltyDelta ?? 0),
        ),
        relatedMilitaryPowerDelta: roundPersonDelta(
            (personEffects.relatedMilitaryPowerDelta ?? 0)
            + (relatedSemanticImpact.personEffects.relatedMilitaryPowerDelta ?? 0),
        ),
    }
    for (const [factionId, vector] of Object.entries(relatedSemanticImpact.factionEffects) as Array<[CourtFactionId, FactionVector | undefined]>) {
        if (!vector) continue
        factionEffects = addFactionEffect(factionEffects, factionId, {
            militaryPower: (vector.militaryPower ?? 0) * factionMultiplier * factionDamping,
            courtInfluence: (vector.courtInfluence ?? 0) * factionMultiplier * factionDamping,
            internalStability: (vector.internalStability ?? 0) * factionMultiplier * factionDamping,
        })
    }

    let nationImpactSources: SchemeNationImpactSource[] = []
    const factionNationEffects = deriveNationEffectFromFactionEffectsForScheme(action, factionEffects, northParse)
    let nationEffects = factionNationEffects
    nationImpactSources = appendNationImpactSources(nationImpactSources, factionNationEffects, 'faction_ripple')

    nationEffects = mergeDimensions(nationEffects, relatedSemanticImpact.nationEffects)
    nationImpactSources = appendNationImpactSources(nationImpactSources, relatedSemanticImpact.nationEffects, 'related_npc')

    const externalLoyaltyEffects = deriveNationEffectFromExternalPerson(targetNpc, personEffects, northParse)
    nationEffects = mergeDimensions(nationEffects, externalLoyaltyEffects)
    nationImpactSources = appendNationImpactSources(nationImpactSources, externalLoyaltyEffects, 'external_loyalty')

    const targetMilitaryShiftEffects = deriveNationEffectFromExternalMilitaryShift(targetNpc, personEffects.militaryPowerDelta, northParse)
    nationEffects = mergeDimensions(nationEffects, targetMilitaryShiftEffects)
    nationImpactSources = appendNationImpactSources(nationImpactSources, targetMilitaryShiftEffects, 'external_military')

    const relatedMilitaryShiftEffects = deriveNationEffectFromExternalMilitaryShift(relatedNpc, personEffects.relatedMilitaryPowerDelta ?? 0, northParse)
    nationEffects = mergeDimensions(nationEffects, relatedMilitaryShiftEffects)
    nationImpactSources = appendNationImpactSources(nationImpactSources, relatedMilitaryShiftEffects, 'external_military')

    const courtAdviceImpact = deriveCourtAdviceImpact(action, targetNpc, success, northParse)
    nationEffects = mergeDimensions(nationEffects, courtAdviceImpact)
    nationImpactSources = appendNationImpactSources(nationImpactSources, courtAdviceImpact, 'player_direct')

    const omenLegitimacyImpact = deriveOmenLegitimacyImpact(action, targetNpc, success, northParse)
    nationEffects = mergeDimensions(nationEffects, omenLegitimacyImpact)
    nationImpactSources = appendNationImpactSources(nationImpactSources, omenLegitimacyImpact, 'player_direct')

    const strategicSpillover = deriveStrategicSpillover(action, targetNpc, relatedNpc, round, success, northParse)
    const intrigueGate = getIntrigueNationGate(action.schemeType, northParse)
    nationEffects = mergeDimensions(
        nationEffects,
        strategicSpillover,
    )
    nationImpactSources = appendNationImpactSources(nationImpactSources, strategicSpillover, 'strategic_spillover')
    if (action.schemeType === 'slander' || action.schemeType === 'alienate' || action.schemeType === 'proxy') {
        nationEffects = scaleDimensions(nationEffects, intrigueGate)
        nationImpactSources = scaleNationImpactSources(nationImpactSources, intrigueGate)
    }
    nationEffects = scaleDimensions(nationEffects, tunedNationMultiplier)
    nationImpactSources = scaleNationImpactSources(nationImpactSources, tunedNationMultiplier)
    nationEffects = scaleDimensions(nationEffects, getLowRiskNationDamping(action.schemeType, difficulty, round))
    nationImpactSources = scaleNationImpactSources(nationImpactSources, getLowRiskNationDamping(action.schemeType, difficulty, round))
    nationEffects = softenEarlyNorthNationEffects(nationEffects, round)
    nationImpactSources = softenEarlyNationImpactSources(nationImpactSources, round)

    if (template.specialAction === 'secession') {
        const specialEffects = scaleDimensions({
            finance: -(targetNpc.militaryPower / 16),
            grain: -(targetNpc.militaryPower / 20),
            military: -(targetNpc.militaryPower / 14),
            socialOrder: -(targetNpc.militaryPower / 22),
            governance: -(targetNpc.militaryPower / 16),
        }, Math.max(factionMultiplier, tunedNationMultiplier))
        nationEffects = mergeDimensions(nationEffects, specialEffects)
        nationImpactSources = appendNationImpactSources(nationImpactSources, specialEffects, 'special_action')
    }

    if (template.specialAction === 'rebellion') {
        const specialEffects = scaleDimensions({
            finance: -(targetNpc.militaryPower / 9),
            grain: -(targetNpc.militaryPower / 12),
            military: -(targetNpc.militaryPower / 7),
            socialOrder: -(targetNpc.militaryPower / 10),
            governance: -(targetNpc.militaryPower / 9),
        }, Math.max(factionMultiplier, tunedNationMultiplier))
        nationEffects = mergeDimensions(nationEffects, specialEffects)
        nationImpactSources = appendNationImpactSources(nationImpactSources, specialEffects, 'special_action')
    }

    const feedbackText = generateFeedback(action, targetNpc, success, northParse)
    const delayedBacklash = deriveDelayedBacklash(action, targetNpc, success, northParse, round)
    const impactTrace = buildSchemeImpactTrace({
        targetNpc,
        relatedNpc,
        personEffects,
        factionEffects,
        nationEffects,
        nationImpactSources,
        relatedImpactSummary: relatedSemanticImpact.summary,
    })
    const npcAction = buildSchemeNpcActionNarrative({
        action,
        result: {
            success,
            personEffects,
            factionEffects,
            nationEffects,
            specialAction: template.specialAction,
            relatedImpactSummary: relatedSemanticImpact.summary,
        },
        targetNpc,
        relatedNpc,
    })
    const causalEvent = buildSchemeCausalEventDraft({
        action,
        targetNpc,
        relatedNpc,
        success,
        motionText: npcAction?.text,
        motionSource: npcAction?.source ?? 'fallback',
        impactTrace,
        eventKind: getCausalEventKindForNpcAction(npcAction?.kind),
        visibility: getCausalEventVisibilityForNpcAction(action.schemeType, npcAction?.kind),
    })

    return {
        trustChange: personEffects.trustDelta,
        relatedTrustChange: personEffects.relatedTrustDelta,
        northDimensionChanges: nationEffects,
        feedbackText,
        success,
        personEffects,
        factionEffects,
        nationEffects,
        specialAction: template.specialAction,
        northParse,
        delayedBacklash,
        npcAction,
        relatedImpactSummary: relatedSemanticImpact.summary,
        impactTrace,
        causalEvent,
    }
}

function getCausalEventKindForNpcAction(
    kind: SchemeNpcActionNarrative['kind'] | undefined,
): SchemeCausalEventDraft['eventKind'] | null {
    switch (kind) {
        case 'move':
            return 'visible_impact'
        case 'counter':
            return 'failure'
        case 'attitude':
            return 'trust_only'
        case 'intel':
            return 'intel_progress'
        default:
            return null
    }
}

function getCausalEventVisibilityForNpcAction(
    schemeType: SchemeType,
    kind: SchemeNpcActionNarrative['kind'] | undefined,
): SchemeCausalEventDraft['visibility'] | null {
    switch (kind) {
        case 'move':
            return 'public'
        case 'counter':
            return isHardSchemeType(schemeType) ? 'public' : 'south_intel_only'
        case 'attitude':
            return 'private'
        case 'intel':
            return 'south_intel_only'
        default:
            return null
    }
}

function isHardSchemeType(schemeType: SchemeType): boolean {
    return schemeType === 'slander'
        || schemeType === 'alienate'
        || schemeType === 'frame'
        || schemeType === 'proxy'
        || schemeType === 'omen'
        || schemeType === 'secession'
        || schemeType === 'rebellion'
}

function isSchemeAllowed(
    schemeType: SchemeType,
    npc: NPC,
    round: number,
    unlockedSecrets: number,
): boolean {
    if (schemeType === 'omen') {
        return isOmenAvailableForNpc(round, npc)
    }

    if (schemeType === 'secession' || schemeType === 'rebellion') {
        return getAvailableSchemesForNpc(npc, { round, unlockedSecrets }).includes(schemeType)
    }

    return true
}

function deriveNationEffectFromFactionEffectsForScheme(
    action: SchemeAction,
    factionEffects: Partial<Record<CourtFactionId, FactionVector>>,
    parse: NorthSchemeParseResult,
): Partial<NationDimensions> {
    const base = deriveNationEffectFromFactionEffects(factionEffects)
    if (action.schemeType !== 'slander' && action.schemeType !== 'alienate') return base

    return applyDimensionRelevance(base, parse, {
        finance: 0.5,
        grain: 0.46,
        military: 0.46,
        socialOrder: 0.4,
        governance: 0.42,
    }, {
        finance: { min: 0.82, max: 1.08 },
        grain: { min: 0.82, max: 1.08 },
        military: { min: 0.82, max: 1.08 },
        socialOrder: { min: 0.82, max: 1.08 },
        governance: { min: 0.82, max: 1.08 },
    })
}

function appendNationImpactSources(
    sources: SchemeNationImpactSource[],
    changes: Partial<NationDimensions>,
    source: SchemeImpactSource,
): SchemeNationImpactSource[] {
    const next = [...sources]
    for (const dimension of NATION_DIMENSION_KEYS) {
        const value = changes[dimension]
        if (!value) continue
        next.push({
            dimension,
            value,
            source,
            label: '',
        })
    }
    return next
}

function scaleNationImpactSources(
    sources: SchemeNationImpactSource[],
    scale: number,
): SchemeNationImpactSource[] {
    if (scale === 1) return sources
    return sources
        .map(source => ({
            ...source,
            value: roundValue(source.value * scale),
        }))
        .filter(source => source.value !== 0)
}

function softenEarlyNationImpactSources(
    sources: SchemeNationImpactSource[],
    roundNumber: number,
): SchemeNationImpactSource[] {
    if (roundNumber > 12) return sources
    return sources
        .map(source => ({
            ...source,
            value: getSoftenedNationImpactValue(source.dimension, source.value, roundNumber),
        }))
        .filter(source => source.value !== 0)
}

function getSoftenedNationImpactValue(
    dimension: NationDimensionKey,
    value: number,
    roundNumber: number,
): number {
    const earlyScale: Record<NationDimensionKey, number> = {
        finance: roundNumber <= 6 ? 0.58 : 0.8,
        grain: roundNumber <= 6 ? 0.68 : 0.86,
        military: roundNumber <= 6 ? 0.74 : 0.9,
        governance: roundNumber <= 6 ? 0.45 : 0.72,
        socialOrder: roundNumber <= 6 ? 0.5 : 0.78,
    }
    return roundValue(value * earlyScale[dimension])
}

function isMilitaryActor(npc: NPC | null | undefined): boolean {
    if (!npc) return false
    return npc.militaryPower >= 40 || /节度使|都督|将军|大司马|上柱国/.test(npc.title)
}

interface RelatedNpcSemanticImpact {
    personEffects: Partial<Pick<PersonEffects, 'relatedLoyaltyDelta' | 'relatedMilitaryPowerDelta'>>
    factionEffects: Partial<Record<CourtFactionId, FactionVector>>
    nationEffects: Partial<NationDimensions>
    summary: string | null
}

const EMPTY_RELATED_SEMANTIC_IMPACT: RelatedNpcSemanticImpact = {
    personEffects: {},
    factionEffects: {},
    nationEffects: {},
    summary: null,
}

const RELATED_IMPACT_THRESHOLDS: Record<NationDimensionKey, number> = {
    finance: 0.5,
    grain: 0.46,
    military: 0.46,
    socialOrder: 0.38,
    governance: 0.42,
}

const RELATED_IMPACT_LABELS: Record<NationDimensionKey, string> = {
    finance: '度支账册',
    grain: '粮道',
    military: '军需军令',
    socialOrder: '地方风声',
    governance: '中枢调度',
}

function deriveRelatedNpcSemanticImpact(
    action: SchemeAction,
    relatedNpc: NPC | null,
    success: boolean,
    parse: NorthSchemeParseResult,
): RelatedNpcSemanticImpact {
    if (!success || !relatedNpc) return EMPTY_RELATED_SEMANTIC_IMPACT
    if (action.schemeType !== 'slander' && action.schemeType !== 'alienate') return EMPTY_RELATED_SEMANTIC_IMPACT

    const transmission = action.schemeType === 'slander'
        ? parse.suspicionTransmission ?? 0
        : parse.fractureTransmission ?? 0
    const minTransmission = action.schemeType === 'slander' ? 0.5 : 0.48
    if (transmission < minTransmission) return EMPTY_RELATED_SEMANTIC_IMPACT

    const focusDimensions = getRelatedImpactFocusDimensions(parse)
    if (focusDimensions.length === 0) return EMPTY_RELATED_SEMANTIC_IMPACT

    const militaryLogisticsSignal =
        parse.militaryRelevance * 0.42
        + parse.grainRelevance * 0.34
        + parse.governanceRelevance * 0.16
        + parse.socialOrderRelevance * 0.08
        + transmission * 0.18
    const hasOperationalMilitaryFocus = focusDimensions.some(item => item.dimension === 'military' || item.dimension === 'grain')

    if (isMilitaryActor(relatedNpc) && hasOperationalMilitaryFocus && militaryLogisticsSignal >= 0.58) {
        return deriveRelatedMilitarySemanticImpact({
            relatedNpc,
            focusDimensions,
            transmission,
            logisticsSignal: militaryLogisticsSignal,
        })
    }

    if (relatedNpc.powerBase === 'court' && (relatedNpc.factionId === 'emperor' || relatedNpc.factionId === 'empress')) {
        return deriveRelatedCourtSemanticImpact({
            relatedNpc,
            focusDimensions,
            transmission,
        })
    }

    return EMPTY_RELATED_SEMANTIC_IMPACT
}

function getRelatedImpactFocusDimensions(parse: NorthSchemeParseResult): Array<{
    dimension: NationDimensionKey
    relevance: number
}> {
    return NATION_DIMENSION_KEYS
        .map(dimension => ({
            dimension,
            relevance: getDimensionRelevance(parse, dimension),
        }))
        .filter(item => item.relevance >= RELATED_IMPACT_THRESHOLDS[item.dimension])
        .sort((a, b) => b.relevance - a.relevance)
}

function deriveRelatedMilitarySemanticImpact(params: {
    relatedNpc: NPC
    focusDimensions: Array<{ dimension: NationDimensionKey; relevance: number }>
    transmission: number
    logisticsSignal: number
}): RelatedNpcSemanticImpact {
    const magnitude = clamp(0.45 + (params.logisticsSignal - 0.58) * 2.2, 0.45, 1.3)
    const nationMagnitude = clamp(0.72 + params.transmission * 0.5, 0.72, 1.2)
    const nationEffects: Partial<NationDimensions> = {}

    for (const item of params.focusDimensions) {
        const prominence = item === params.focusDimensions[0] ? 1.16 : item === params.focusDimensions[1] ? 1 : 0.78
        const scale = nationMagnitude * semanticScale(
            item.relevance,
            RELATED_IMPACT_THRESHOLDS[item.dimension],
            0.72,
            1.18,
        ) * prominence

        if (item.dimension === 'finance') nationEffects.finance = -0.14 * scale
        if (item.dimension === 'grain') nationEffects.grain = -0.35 * scale
        if (item.dimension === 'military') nationEffects.military = -0.45 * scale
        if (item.dimension === 'socialOrder') nationEffects.socialOrder = -0.16 * scale
        if (item.dimension === 'governance') nationEffects.governance = -0.2 * scale
    }

    let factionEffects: Partial<Record<CourtFactionId, FactionVector>> = {}
    if (params.relatedNpc.powerBase === 'court' && (params.relatedNpc.factionId === 'emperor' || params.relatedNpc.factionId === 'empress')) {
        factionEffects = addFactionEffect(factionEffects, params.relatedNpc.factionId, {
            militaryPower: -0.45 * magnitude,
            internalStability: -0.18 * magnitude,
        })
    }

    const summary = `${params.relatedNpc.name}的${describeRelatedImpactFocus(params.focusDimensions)}受牵动`
    return {
        personEffects: {
            relatedLoyaltyDelta: params.relatedNpc.powerBase === 'external'
                ? -Math.round(clamp(0.6 + params.transmission * 1.0, 0.6, 1.6))
                : 0,
            relatedMilitaryPowerDelta: -roundPersonDelta(magnitude),
        },
        factionEffects,
        nationEffects: normalizeDimensions(nationEffects),
        summary,
    }
}

function deriveRelatedCourtSemanticImpact(params: {
    relatedNpc: NPC
    focusDimensions: Array<{ dimension: NationDimensionKey; relevance: number }>
    transmission: number
}): RelatedNpcSemanticImpact {
    const factionId = params.relatedNpc.factionId as CourtFactionId
    let factionDelta: FactionVector = emptyFactionDelta()
    const nationEffects: Partial<NationDimensions> = {}

    for (const item of params.focusDimensions) {
        const prominence = item === params.focusDimensions[0] ? 1.14 : item === params.focusDimensions[1] ? 0.94 : 0.72
        const signal = semanticScale(
            item.relevance,
            RELATED_IMPACT_THRESHOLDS[item.dimension],
            0.7,
            1.2,
        ) * clamp(0.82 + params.transmission * 0.35, 0.82, 1.14) * prominence

        if (item.dimension === 'finance') {
            factionDelta = mergeFactionDelta(factionDelta, { internalStability: -0.85 * signal })
            nationEffects.finance = (nationEffects.finance ?? 0) - 0.28 * signal
        }
        if (item.dimension === 'grain') {
            factionDelta = mergeFactionDelta(factionDelta, { militaryPower: -0.62 * signal, internalStability: -0.18 * signal })
            nationEffects.grain = (nationEffects.grain ?? 0) - 0.22 * signal
        }
        if (item.dimension === 'military') {
            factionDelta = mergeFactionDelta(factionDelta, { militaryPower: -0.72 * signal })
            nationEffects.military = (nationEffects.military ?? 0) - 0.26 * signal
        }
        if (item.dimension === 'socialOrder') {
            factionDelta = mergeFactionDelta(factionDelta, { courtInfluence: -0.32 * signal, internalStability: -0.42 * signal })
            nationEffects.socialOrder = (nationEffects.socialOrder ?? 0) - 0.18 * signal
        }
        if (item.dimension === 'governance') {
            factionDelta = mergeFactionDelta(factionDelta, { courtInfluence: -0.46 * signal, internalStability: -0.32 * signal })
            nationEffects.governance = (nationEffects.governance ?? 0) - 0.22 * signal
        }
    }

    return {
        personEffects: {},
        factionEffects: {
            [factionId]: factionDelta,
        },
        nationEffects: normalizeDimensions(nationEffects),
        summary: `${params.relatedNpc.name}所在${params.relatedNpc.factionId === 'emperor' ? '帝党' : '后党'}的${describeRelatedImpactFocus(params.focusDimensions)}受牵动`,
    }
}

function mergeFactionDelta(
    left: FactionVector,
    right: Partial<FactionVector>,
): FactionVector {
    return {
        militaryPower: roundValue((left.militaryPower ?? 0) + (right.militaryPower ?? 0)),
        courtInfluence: roundValue((left.courtInfluence ?? 0) + (right.courtInfluence ?? 0)),
        internalStability: roundValue((left.internalStability ?? 0) + (right.internalStability ?? 0)),
    }
}

function emptyFactionDelta(): FactionVector {
    return {
        militaryPower: 0,
        courtInfluence: 0,
        internalStability: 0,
    }
}

function describeRelatedImpactFocus(focusDimensions: Array<{ dimension: NationDimensionKey }>): string {
    return focusDimensions
        .slice(0, 2)
        .map(item => RELATED_IMPACT_LABELS[item.dimension])
        .join('与')
}

function deriveStrategicSpillover(
    action: SchemeAction,
    targetNpc: NPC,
    relatedNpc: NPC | null,
    round: number,
    success: boolean,
    parse: NorthSchemeParseResult,
): Partial<NationDimensions> {
    if (!success) return {}
    if (!['alienate', 'frame', 'slander', 'advise'].includes(action.schemeType)) return {}
    if (action.schemeType === 'omen' || action.schemeType === 'probe' || action.schemeType === 'appeal') return {}

    const spilloverStrength = getMilitarySpilloverStrength(round)
    if (spilloverStrength <= 0) return {}

    const militaryActors = [targetNpc, relatedNpc].filter((npc): npc is NPC => isMilitaryActor(npc))
    if (militaryActors.length === 0) return {}

    const strategicRelevance = Math.max(
        parse.militaryRelevance,
        parse.grainRelevance,
        parse.governanceRelevance,
        parse.socialOrderRelevance,
    )
    const canSpillFromAdvise = action.schemeType !== 'advise' || strategicRelevance >= 0.34
    if (!canSpillFromAdvise) return {}

    const baseForce = militaryActors.reduce((sum, npc) => sum + npc.militaryPower, 0) / militaryActors.length
    const forceFactor = baseForce >= 70 ? 1.15 : baseForce >= 50 ? 1 : 0.78
    const speechFactor = 1 + parse.eventFit * 0.35 + parse.structuralPenetration * 0.45 + strategicRelevance * 0.2
    const scale = spilloverStrength * forceFactor * speechFactor

    switch (action.schemeType) {
        case 'alienate': {
            const courtSplitRelevance = Math.max(parse.governanceRelevance, parse.socialOrderRelevance)
            const intrigueScale = clamp(0.25 + courtSplitRelevance * 0.85, 0.25, 1)
            return applyDimensionRelevance({
                military: -0.58 * scale * intrigueScale,
                grain: -0.34 * scale * intrigueScale,
                governance: -0.24 * scale * intrigueScale,
            }, parse, {
                military: 0.42,
                grain: 0.38,
                governance: 0.32,
            }, {
                military: { min: 0.7, max: 1.25 },
                grain: { min: 0.7, max: 1.2 },
                governance: { min: 0.65, max: 1.1 },
            })
        }
        case 'frame':
            const trapFactor = getFrameTrapFactor(parse)
            return applyDimensionRelevance({
                military: -0.6 * scale * trapFactor,
                grain: -0.4 * scale * trapFactor,
                socialOrder: -0.4 * scale * trapFactor,
                governance: -0.6 * scale * trapFactor,
            }, parse, {
                military: 0.42,
                grain: 0.38,
                socialOrder: 0.34,
                governance: 0.32,
            }, {
                military: { min: 0.68, max: 1.18 },
                grain: { min: 0.65, max: 1.15 },
                socialOrder: { min: 0.65, max: 1.1 },
                governance: { min: 0.72, max: 1.18 },
            })
        case 'slander':
            return applyDimensionRelevance({
                military: -0.4 * scale,
                socialOrder: -0.3 * scale,
                governance: -0.4 * scale,
            }, parse, {
                military: 0.44,
                socialOrder: 0.34,
                governance: 0.32,
            }, {
                military: { min: 0.62, max: 1.05 },
                socialOrder: { min: 0.65, max: 1.05 },
                governance: { min: 0.68, max: 1.08 },
            })
        case 'advise':
            return applyDimensionRelevance({
                military: -0.35 * scale,
                grain: -0.45 * scale,
                governance: -0.35 * scale,
            }, parse, {
                military: 0.46,
                grain: 0.4,
                governance: 0.34,
            }, {
                military: { min: 0.65, max: 1.1 },
                grain: { min: 0.72, max: 1.18 },
                governance: { min: 0.62, max: 1.02 },
            })
        default:
            return {}
    }
}

function roundValue(value: number): number {
    return Math.round(value * 100) / 100
}

function roundPersonDelta(value: number): number {
    return Math.round(value * 10) / 10
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
}


