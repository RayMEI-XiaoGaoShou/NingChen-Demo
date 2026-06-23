import { addFactionEffect } from './schemeEffectUtils'
import type {
    AlignmentBias,
    CourtFactionId,
    ExternalStatus,
    NPC,
    NorthSchemeParseResult,
    SchemeAction,
    SchemeType,
} from './types'

export interface PersonEffects {
    trustDelta: number
    relatedTrustDelta: number
    loyaltyDelta: number
    relatedLoyaltyDelta: number
    militaryPowerDelta: number
    relatedMilitaryPowerDelta?: number
    alignmentShift: AlignmentBias | null
    intelDelta: number
    externalStatus: ExternalStatus | null
}

export interface FactionVector {
    militaryPower: number
    courtInfluence: number
    internalStability: number
}

export interface SchemeSuccessTemplate {
    person: PersonEffects
    factionEffects: Partial<Record<CourtFactionId, FactionVector>>
    specialAction: 'secession' | 'rebellion' | null
}

export interface SchemeFailureTemplate {
    person: PersonEffects
    factionEffects: Partial<Record<CourtFactionId, FactionVector>>
}

const EMPTY_NORTH_PARSE: NorthSchemeParseResult = {
    characterFit: 0,
    eventFit: 0,
    structuralPenetration: 0,
    executability: 0,
    exposureRisk: 0,
    financeRelevance: 0,
    grainRelevance: 0,
    militaryRelevance: 0,
    socialOrderRelevance: 0,
    governanceRelevance: 0,
    dominantIntent: 'neutral',
    evidence: [],
}

export function getSuccessTemplate(
    action: SchemeAction,
    targetNpc: NPC,
    relatedNpc?: NPC | null,
    parse?: NorthSchemeParseResult,
): SchemeSuccessTemplate {
    const emptyPerson: PersonEffects = {
        trustDelta: 0,
        relatedTrustDelta: 0,
        loyaltyDelta: 0,
        relatedLoyaltyDelta: 0,
        militaryPowerDelta: 0,
        relatedMilitaryPowerDelta: 0,
        alignmentShift: null,
        intelDelta: 0,
        externalStatus: null,
    }

    let factionEffects: Partial<Record<CourtFactionId, FactionVector>> = {}
    const safeParse = parse ?? EMPTY_NORTH_PARSE
    const routesDamageToRelatedNpc =
        Boolean(relatedNpc) && (action.schemeType === 'slander' || action.schemeType === 'alienate')
    const factionPressureNpc = routesDamageToRelatedNpc ? relatedNpc : targetNpc

    switch (action.schemeType) {
        case 'probe':
            return {
                person: { ...emptyPerson, trustDelta: 3, intelDelta: 1 },
                factionEffects,
                specialAction: null,
            }
        case 'advise':
            return {
                person: {
                    ...emptyPerson,
                    trustDelta: targetNpc.powerBase === 'court' ? 6 : 5,
                    loyaltyDelta: targetNpc.powerBase === 'external' ? -6 : 0,
                    militaryPowerDelta: deriveExternalAdviceMilitaryGain(targetNpc, safeParse),
                    alignmentShift: targetNpc.powerBase === 'external' ? (targetNpc.alignmentBias === 'self' ? 'self' : targetNpc.alignmentBias) : null,
                },
                factionEffects,
                specialAction: null,
            }
        case 'slander':
            if (!routesDamageToRelatedNpc && targetNpc.powerBase === 'court') {
                factionEffects = addFactionEffect(factionEffects, targetNpc.factionId as CourtFactionId, {
                    internalStability: -1.8,
                    courtInfluence: -0.9,
                })
            }
            if (relatedNpc?.powerBase === 'court') {
                factionEffects = addFactionEffect(factionEffects, relatedNpc.factionId as CourtFactionId, {
                    internalStability: -1.2,
                })
            }
            return {
                person: {
                    ...emptyPerson,
                    trustDelta: 2,
                    relatedTrustDelta: -5,
                    relatedLoyaltyDelta: relatedNpc?.powerBase === 'external' ? -4 : 0,
                    relatedMilitaryPowerDelta: deriveRelatedExternalMilitaryLoss('slander', relatedNpc, safeParse),
                },
                factionEffects: addCourtLeaderPressureEffect(
                    factionEffects,
                    'slander',
                    factionPressureNpc,
                    safeParse,
                ),
                specialAction: null,
            }
        case 'alienate':
            if (!routesDamageToRelatedNpc && targetNpc.powerBase === 'court') {
                factionEffects = addFactionEffect(factionEffects, targetNpc.factionId as CourtFactionId, {
                    internalStability: -2.4,
                    courtInfluence: -1.2,
                })
            }
            if (relatedNpc?.powerBase === 'court') {
                factionEffects = addFactionEffect(factionEffects, relatedNpc.factionId as CourtFactionId, {
                    internalStability: -2.1,
                    courtInfluence: -0.6,
                })
            }
            return {
                person: {
                    ...emptyPerson,
                    trustDelta: 2,
                    relatedTrustDelta: -8,
                    loyaltyDelta: targetNpc.powerBase === 'external' ? -6 : 0,
                    relatedLoyaltyDelta: relatedNpc?.powerBase === 'external' ? -6 : 0,
                    relatedMilitaryPowerDelta: deriveRelatedExternalMilitaryLoss('alienate', relatedNpc, safeParse),
                    alignmentShift: targetNpc.powerBase === 'external' ? 'self' : null,
                },
                factionEffects: addCourtLeaderPressureEffect(
                    factionEffects,
                    'alienate',
                    factionPressureNpc,
                    safeParse,
                ),
                specialAction: null,
            }
        case 'frame':
            const selfTrapPotential = parse?.selfTrapPotential ?? 0
            const scapegoatClarity = parse?.scapegoatClarity ?? 0
            const trapFactor = getFrameTrapFactor(safeParse)
            if (targetNpc.powerBase === 'court') {
                factionEffects = addFactionEffect(factionEffects, targetNpc.factionId as CourtFactionId, {
                    internalStability: -2.8 * trapFactor,
                    courtInfluence: -1.6 * clamp(0.84 + trapFactor * 0.24, 0.84, 1.24),
                })
            }
            return {
                person: {
                    ...emptyPerson,
                    trustDelta: clamp(0.8 + selfTrapPotential * 0.8 + scapegoatClarity * 0.35, 1, 3),
                    loyaltyDelta: targetNpc.powerBase === 'external' ? -8 * trapFactor : 0,
                    militaryPowerDelta: deriveExternalFrameMilitaryLoss(targetNpc, safeParse),
                    alignmentShift: targetNpc.powerBase === 'external' ? 'self' : null,
                },
                factionEffects: addCourtLeaderPressureEffect(factionEffects, 'frame', targetNpc, safeParse),
                specialAction: null,
            }
        case 'proxy':
            return {
                person: {
                    ...emptyPerson,
                    trustDelta: 7,
                    relatedTrustDelta: -10,
                    loyaltyDelta: targetNpc.powerBase === 'external' ? -5 : 0,
                    relatedLoyaltyDelta: relatedNpc?.powerBase === 'external' ? -10 : 0,
                },
                factionEffects,
                specialAction: null,
            }
        case 'appeal':
            if (targetNpc.powerBase === 'court') {
                factionEffects = addFactionEffect(factionEffects, targetNpc.factionId as CourtFactionId, {
                    courtInfluence: 1.2,
                })
            }
            return {
                person: { ...emptyPerson, trustDelta: 5 },
                factionEffects,
                specialAction: null,
            }
        case 'omen':
            return {
                person: targetNpc.powerBase === 'external'
                    ? {
                        ...emptyPerson,
                        trustDelta: 1,
                        ...deriveExternalOmenPersonEffects(targetNpc, safeParse),
                    }
                    : { ...emptyPerson, trustDelta: 1 },
                factionEffects: addCourtLeaderPressureEffect(factionEffects, 'omen', targetNpc, safeParse),
                specialAction: null,
            }
        case 'secession':
            return {
                person: {
                    ...emptyPerson,
                    trustDelta: 4,
                    loyaltyDelta: -16,
                    alignmentShift: 'self',
                    externalStatus: 'secession',
                },
                factionEffects,
                specialAction: 'secession',
            }
        case 'rebellion':
            return {
                person: {
                    ...emptyPerson,
                    trustDelta: 3,
                    loyaltyDelta: -22,
                    alignmentShift: 'self',
                    externalStatus: 'rebellion',
                },
                factionEffects,
                specialAction: 'rebellion',
            }
        default:
            return {
                person: emptyPerson,
                factionEffects,
                specialAction: null,
            }
    }
}

export function getFailureTemplate(
    action: SchemeAction,
    targetNpc: NPC,
): SchemeFailureTemplate {
    const commonPenalty: Record<SchemeType, number> = {
        probe: -4,
        advise: -3,
        slander: -6,
        alienate: -6,
        frame: -7,
        proxy: -10,
        appeal: -3,
        omen: -7,
        secession: -9,
        rebellion: -12,
    }

    const factionEffects =
        targetNpc.powerBase === 'court' && (action.schemeType === 'secession' || action.schemeType === 'rebellion')
            ? addFactionEffect({}, targetNpc.factionId as CourtFactionId, { courtInfluence: 0.6 })
            : {}

    return {
        person: {
            trustDelta: commonPenalty[action.schemeType],
            relatedTrustDelta: 0,
            loyaltyDelta: action.schemeType === 'secession' || action.schemeType === 'rebellion' ? 4 : 0,
            relatedLoyaltyDelta: 0,
            militaryPowerDelta: 0,
            relatedMilitaryPowerDelta: 0,
            alignmentShift: null,
            intelDelta: 0,
            externalStatus: null,
        },
        factionEffects,
    }
}

export function scalePersonEffects(person: PersonEffects, multiplier: number): PersonEffects {
    return {
        ...person,
        trustDelta: Math.round(person.trustDelta * multiplier),
        relatedTrustDelta: Math.round(person.relatedTrustDelta * multiplier),
        loyaltyDelta: Math.round(person.loyaltyDelta * multiplier),
        relatedLoyaltyDelta: Math.round(person.relatedLoyaltyDelta * multiplier),
        militaryPowerDelta: round(person.militaryPowerDelta * multiplier),
        relatedMilitaryPowerDelta: round((person.relatedMilitaryPowerDelta ?? 0) * multiplier),
    }
}

function deriveExternalOmenPersonEffects(
    targetNpc: NPC,
    parse: NorthSchemeParseResult,
): Pick<PersonEffects, 'loyaltyDelta' | 'militaryPowerDelta'> {
    if (targetNpc.powerBase !== 'external') {
        return {
            loyaltyDelta: 0,
            militaryPowerDelta: 0,
        }
    }

    const omenPolarity = parse.omenPolarity ?? 'vague_or_ceremonial'
    if (omenPolarity === 'legitimizing') {
        return {
            loyaltyDelta: 0,
            militaryPowerDelta: 0,
        }
    }

    const accusationClarity = parse.omenAccusationClarity ?? 0
    const sanctionLeverage = parse.centralSanctionLeverage ?? 0
    const legitimacyCrack = parse.legitimacyCrack ?? Math.max(parse.governanceRelevance, parse.socialOrderRelevance) * 0.75
    const suspicionDirection = parse.suspicionDirection ?? Math.max(parse.governanceRelevance, parse.socialOrderRelevance) * 0.7
    const omenQuality = clamp(
        accusationClarity * 0.34
            + sanctionLeverage * 0.3
            + legitimacyCrack * 0.18
            + suspicionDirection * 0.14
            + parse.structuralPenetration * 0.04
            + parse.eventFit * 0.04
            - parse.exposureRisk * 0.24,
        0,
        1,
    )
    const polarityFactor = omenPolarity === 'vague_or_ceremonial' ? 0.34 : 1
    const sanctionStrength = omenQuality * polarityFactor

    return {
        militaryPowerDelta: -roundValue(clamp(Math.max(0, sanctionStrength - 0.34) * 1.35, 0, 1.1)),
        loyaltyDelta: -roundValue(clamp(1.8 + sanctionStrength * 3.2, 1.6, 5.2)),
    }
}

function deriveExternalAdviceMilitaryGain(
    targetNpc: NPC,
    parse: NorthSchemeParseResult,
): number {
    if (targetNpc.powerBase !== 'external') return 0
    if ((parse.advicePolarity ?? 'neutral_or_vague') !== 'pro_target_anti_state') return 0

    const targetBenefit = Math.max(0, parse.targetBenefit ?? 0)
    const stateRisk = Math.max(0, -(parse.stateBenefit ?? 0))
    const consolidationSignal =
        parse.militaryRelevance * 0.44
        + parse.grainRelevance * 0.26
        + parse.governanceRelevance * 0.12
        + targetBenefit * 0.12
        + stateRisk * 0.06

    if (targetBenefit < 0.45 || stateRisk < 0.18 || consolidationSignal < 0.62) {
        return 0
    }

    return roundValue(clamp(0.55 + (consolidationSignal - 0.62) * 3.8, 0.55, 1.85))
}

function deriveExternalFrameMilitaryLoss(
    targetNpc: NPC,
    parse: NorthSchemeParseResult,
): number {
    if (targetNpc.powerBase !== 'external') return 0

    const sanctionSignal = Math.max(
        parse.centralSanctionLeverage ?? 0,
        parse.governanceRelevance * 0.96,
        parse.militaryRelevance * 0.88,
        parse.grainRelevance * 0.8,
    )
    const trapSignal =
        (parse.selfTrapPotential ?? 0) * 0.38
        + (parse.scapegoatClarity ?? 0) * 0.34
        + sanctionSignal * 0.28

    if (trapSignal < 0.58 || sanctionSignal < 0.34) {
        return 0
    }

    return -roundValue(clamp(0.6 + (trapSignal - 0.58) * 4, 0.6, 2.1))
}

function deriveRelatedExternalMilitaryLoss(
    schemeType: SchemeType,
    relatedNpc: NPC | null | undefined,
    parse: NorthSchemeParseResult,
): number {
    if (!relatedNpc || relatedNpc.powerBase !== 'external') return 0
    if (schemeType !== 'slander' && schemeType !== 'alienate') return 0

    const transmission = schemeType === 'slander'
        ? parse.suspicionTransmission ?? 0
        : parse.fractureTransmission ?? 0
    const logisticsSignal =
        parse.militaryRelevance * 0.42
        + parse.grainRelevance * 0.28
        + parse.governanceRelevance * 0.18
        + transmission * 0.12
    const threshold = schemeType === 'slander' ? 0.62 : 0.58

    if (transmission < (schemeType === 'slander' ? 0.52 : 0.48) || logisticsSignal < threshold) {
        return 0
    }

    const minLoss = schemeType === 'slander' ? 0.5 : 0.7
    const maxLoss = schemeType === 'slander' ? 1.5 : 2
    return -roundValue(clamp(minLoss + (logisticsSignal - threshold) * 3.6, minLoss, maxLoss))
}

function getCourtLeaderPressureFactionId(npc: NPC | null | undefined): CourtFactionId | null {
    if (!npc || npc.powerBase !== 'court') return null
    if (npc.name === '贺拔琪') return 'empress'
    if (npc.name === '宗艾') return 'emperor'
    return null
}

function addCourtLeaderPressureEffect(
    bucket: Partial<Record<CourtFactionId, FactionVector>>,
    schemeType: SchemeType,
    npc: NPC | null | undefined,
    parse: NorthSchemeParseResult,
): Partial<Record<CourtFactionId, FactionVector>> {
    const factionId = getCourtLeaderPressureFactionId(npc)
    if (!factionId) return bucket
    if (!['slander', 'alienate', 'frame', 'omen'].includes(schemeType)) return bucket

    const agendaPressure = Math.max(parse.governanceRelevance, parse.socialOrderRelevance)
    let signal = 0
    let threshold = 0.6
    let schemeFactor = 1

    if (schemeType === 'slander') {
        signal = (parse.suspicionTransmission ?? 0) * 0.58 + agendaPressure * 0.42
        threshold = 0.6
        schemeFactor = 1
    } else if (schemeType === 'alienate') {
        signal = (parse.fractureTransmission ?? 0) * 0.56 + agendaPressure * 0.44
        threshold = 0.58
        schemeFactor = 1.08
    } else if (schemeType === 'frame') {
        signal = getFrameTrapFactor(parse) * 0.44 + agendaPressure * 0.38 + (parse.scapegoatClarity ?? 0) * 0.18
        threshold = 0.92
        schemeFactor = 1.06
    } else {
        if ((parse.omenPolarity ?? 'vague_or_ceremonial') !== 'destabilizing') return bucket
        signal =
            Math.max(parse.legitimacyCrack ?? 0, parse.suspicionDirection ?? 0) * 0.64
            + agendaPressure * 0.36
        threshold = 0.62
        schemeFactor = 1.12
    }

    if (signal < threshold) return bucket

    const normalized = (signal - threshold) / Math.max(0.01, 1 - threshold)
    const courtInfluenceLoss = roundValue(clamp((1.7 + normalized * 1.5) * schemeFactor, 1.7, 3.2))
    const internalStabilityLoss = roundValue(clamp((0.72 + normalized * 0.68) * schemeFactor, 0.72, 1.7))

    return addFactionEffect(bucket, factionId, {
        courtInfluence: -courtInfluenceLoss,
        internalStability: -internalStabilityLoss,
    })
}

function getFrameTrapFactor(parse: NorthSchemeParseResult): number {
    const selfTrapPotential = parse.selfTrapPotential ?? 0
    const scapegoatClarity = parse.scapegoatClarity ?? 0
    return clamp(0.72 + selfTrapPotential * 0.42 + scapegoatClarity * 0.5, 0.72, 1.46)
}

function roundValue(value: number): number {
    return Math.round(value * 100) / 100
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
}

function round(value: number): number {
    return Math.round(value * 10) / 10
}
