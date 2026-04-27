import { getSchemeByType } from '../data/schemes'
import { getMilitarySpilloverStrength, isOmenAvailableForNpc, roundSupportsExternalAction } from '../data/roundRuleConfig'
import { isCourtDispositionExecutor } from './courtDisposition'
import { isExternalEscalationOpen, isTerminalExternalNpc } from './externalStatus'
import {
    applyDimensionRelevance,
    deriveNationEffectFromFactionEffects,
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
    getFailureTemplate,
    getSuccessTemplate,
    scalePersonEffects,
    type FactionVector,
    type PersonEffects,
} from './schemeTemplates'
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
        return applyDimensionRelevance({
            finance: 0.18 * supportScale,
            grain: 0.16 * supportScale,
            socialOrder: 0.18 * supportScale,
            governance: 0.58 * supportScale,
        }, parse, {
            finance: 0.44,
            grain: 0.4,
            socialOrder: 0.34,
            governance: 0.36,
        }, {
            finance: { min: 0.68, max: 1.06 },
            grain: { min: 0.68, max: 1.08 },
            socialOrder: { min: 0.66, max: 1.04 },
            governance: { min: 0.78, max: 1.2 },
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
    return applyDimensionRelevance({
        finance: -0.25 * sabotageScale,
        grain: -0.18 * sabotageScale,
        socialOrder: -0.2 * sabotageScale,
        governance: -0.78 * sabotageScale,
    }, parse, {
        finance: 0.5,
        grain: 0.46,
        socialOrder: 0.4,
        governance: 0.42,
    }, {
        finance: { min: 0.72, max: 1.02 },
        grain: { min: 0.72, max: 1.08 },
        socialOrder: { min: 0.68, max: 1.02 },
        governance: { min: 0.8, max: 1.18 },
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

    const personEffects = scalePersonEffects(template.person, personMultiplier)
    let factionEffects: Partial<Record<CourtFactionId, FactionVector>> = {}
    const factionDamping = getCourtIntrigueFactionDamping(action, targetNpc, relatedNpc, northParse, difficulty)
    for (const [factionId, vector] of Object.entries(template.factionEffects) as Array<[CourtFactionId, FactionVector | undefined]>) {
        if (!vector) continue
        factionEffects[factionId] = scaleVector(vector, factionMultiplier * factionDamping)
    }

    let nationEffects = deriveNationEffectFromFactionEffects(factionEffects)
    nationEffects = mergeDimensions(nationEffects, deriveNationEffectFromExternalPerson(targetNpc, personEffects, northParse))
    nationEffects = mergeDimensions(
        nationEffects,
        deriveNationEffectFromExternalMilitaryShift(targetNpc, personEffects.militaryPowerDelta, northParse),
    )
    nationEffects = mergeDimensions(
        nationEffects,
        deriveNationEffectFromExternalMilitaryShift(relatedNpc, personEffects.relatedMilitaryPowerDelta ?? 0, northParse),
    )
    nationEffects = mergeDimensions(nationEffects, deriveCourtAdviceImpact(action, targetNpc, success, northParse))
    nationEffects = mergeDimensions(nationEffects, deriveOmenLegitimacyImpact(action, targetNpc, success, northParse))
    const strategicSpillover = deriveStrategicSpillover(action, targetNpc, relatedNpc, round, success, northParse)
    const intrigueGate = getIntrigueNationGate(action.schemeType, northParse)
    nationEffects = mergeDimensions(
        nationEffects,
        strategicSpillover,
    )
    if (action.schemeType === 'slander' || action.schemeType === 'alienate' || action.schemeType === 'proxy') {
        nationEffects = scaleDimensions(nationEffects, intrigueGate)
    }
    nationEffects = scaleDimensions(nationEffects, tunedNationMultiplier)
    nationEffects = scaleDimensions(nationEffects, getLowRiskNationDamping(action.schemeType, difficulty, round))
    nationEffects = softenEarlyNorthNationEffects(nationEffects, round)

    if (template.specialAction === 'secession') {
        nationEffects = mergeDimensions(nationEffects, scaleDimensions({
            finance: -(targetNpc.militaryPower / 16),
            grain: -(targetNpc.militaryPower / 20),
            military: -(targetNpc.militaryPower / 14),
            socialOrder: -(targetNpc.militaryPower / 22),
            governance: -(targetNpc.militaryPower / 16),
        }, Math.max(factionMultiplier, tunedNationMultiplier)))
    }

    if (template.specialAction === 'rebellion') {
        nationEffects = mergeDimensions(nationEffects, scaleDimensions({
            finance: -(targetNpc.militaryPower / 9),
            grain: -(targetNpc.militaryPower / 12),
            military: -(targetNpc.militaryPower / 7),
            socialOrder: -(targetNpc.militaryPower / 10),
            governance: -(targetNpc.militaryPower / 9),
        }, Math.max(factionMultiplier, tunedNationMultiplier)))
    }

    const feedbackText = generateFeedback(action, targetNpc, success, northParse)
    const delayedBacklash = deriveDelayedBacklash(action, targetNpc, success, northParse, round)

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
    }
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

function isMilitaryActor(npc: NPC | null | undefined): boolean {
    if (!npc) return false
    return npc.militaryPower >= 40 || /节度使|都督|将军|大司马|上柱国/.test(npc.title)
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

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
}


