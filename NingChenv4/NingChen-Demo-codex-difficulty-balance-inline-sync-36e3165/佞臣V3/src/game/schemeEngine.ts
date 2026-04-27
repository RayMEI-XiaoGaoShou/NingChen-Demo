import { getSchemeByType } from '../data/schemes'
import { getMilitarySpilloverStrength, isOmenAvailableForNpc, roundSupportsExternalAction } from '../data/roundRuleConfig'
import { isCourtDispositionExecutor } from './courtDisposition'
import { isExternalEscalationOpen, isTerminalExternalNpc } from './externalStatus'
import {
    addFactionEffect,
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
import type {
    AlignmentBias,
    CourtFactionId,
    DelayedBacklash,
    ExternalStatus,
    GameDifficulty,
    NationDimensions,
    NPC,
    NorthSchemeParseResult,
    SchemeAction,
    SchemeType,
} from './types'
export { calculateParsedSuccessRate } from './schemeSuccess'

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

const SCHEME_NAMES: Record<SchemeType, string> = {
    probe: '试探',
    advise: '献策',
    slander: '谗言',
    alienate: '离间',
    frame: '设局嫁祸',
    proxy: '借刀',
    appeal: '求援',
    omen: '谶纬',
    secession: '煽动割据',
    rebellion: '煽动造反',
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

function getSuccessTemplate(
    action: SchemeAction,
    targetNpc: NPC,
    relatedNpc?: NPC | null,
    parse?: NorthSchemeParseResult,
): {
    person: PersonEffects
    factionEffects: Partial<Record<CourtFactionId, FactionVector>>
    specialAction: 'secession' | 'rebellion' | null
} {
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
            if (targetNpc.powerBase === 'court') {
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
                    addCourtLeaderPressureEffect(factionEffects, 'slander', targetNpc, safeParse),
                    'slander',
                    relatedNpc,
                    safeParse,
                ),
                specialAction: null,
            }
        case 'alienate':
            if (targetNpc.powerBase === 'court') {
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
                    addCourtLeaderPressureEffect(factionEffects, 'alienate', targetNpc, safeParse),
                    'alienate',
                    relatedNpc,
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

function getFailureTemplate(
    action: SchemeAction,
    targetNpc: NPC,
): {
    person: PersonEffects
    factionEffects: Partial<Record<CourtFactionId, FactionVector>>
} {
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

function scalePersonEffects(person: PersonEffects, multiplier: number): PersonEffects {
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

function generateFeedback(action: SchemeAction, npc: NPC, success: boolean, parse: NorthSchemeParseResult): string {
    const name = SCHEME_NAMES[action.schemeType]

    if (action.schemeType === 'omen' && success && npc.powerBase === 'external') {
        const omenLines = [
            `${npc.name}听罢便知中枢已起疑，粮道与军需多半要先紧一圈，御史监军也会跟着盯得更密；边镇兵势只是受了小挫，真正更重的是他心里那口怨气。`,
            `${npc.name}虽未当场失色，却已明白中枢这道谶纬会把朝里的猜忌引到边镇上来：先卡粮道与军需，再加御史监军，兵势只挨一点折，忠心却更难再稳。`,
            `${npc.name}一下就听出这不是空泛天象，而是中枢要借疑心收紧粮道、军需与眼线，再把御史监军压下去；边镇兵势未必大损，心里却先松了一层。`,
        ]
        return randomPick(omenLines)
    }

    if (action.schemeType === 'frame') {
        if (success) {
            const trapLines = [
                `${npc.name}先是一怔，旋即像是意识到自己话说得过了，你知道这步${name}已逼他露了口风。`,
                `${npc.name}神色微变，像是忽然察觉自己正往你设下的局里走去，可已来不及全身而退。`,
                `${npc.name}话里那点破绽已被你轻轻带出来，这步${name}最要命的嫌疑，终究还是会落回他自己身上。`,
            ]

            if (((parse.selfTrapPotential ?? 0) + (parse.scapegoatClarity ?? 0)) / 2 >= 0.55) {
                return randomPick(trapLines)
            }
        } else {
            const failTrapLines = [
                `${npc.name}没有顺着你的话失态，反而把口风收得更紧，你知道这步${name}没能把他逼进局里。`,
                `${npc.name}神色一沉便不再接话，显然已觉出你想借题让他背嫌疑。`,
            ]

            if ((parse.selfTrapPotential ?? 0) >= 0.28 || (parse.scapegoatClarity ?? 0) >= 0.28) {
                return randomPick(failTrapLines)
            }
        }
    }

    if (success) {
        const successLines = [
            `${npc.name}略作沉吟，显然已被你的${name}拨动了算盘。`,
            `${npc.name}不曾明言应允，但神色一松，你知道这步${name}已押中其心结。`,
            `${npc.name}听罢只淡淡应了一声，话没说透，路却已悄悄转了方向。`,
        ]
        return randomPick(successLines)
    }

    const failLines = [
        `${npc.name}听后并未接茬，反倒多看了你一眼，你知道这步${name}落空了。`,
        `${npc.name}面色微冷，显然已对你的意图起了戒心。`,
        `${npc.name}既不应承也不发怒，只把话题轻轻拨开，这比翻脸更说明问题。`,
    ]
    return randomPick(failLines)
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

function deriveDelayedBacklash(
    action: SchemeAction,
    targetNpc: NPC,
    success: boolean,
    parse: NorthSchemeParseResult,
    round: number,
): DelayedBacklash[] {
    const highWeightTarget = /丞相|太后|燕王|中常侍|上柱国|节度/.test(targetNpc.title) || targetNpc.canExecute
    const agendaRelevance = getAgendaRelevance(parse)
    const courtAgendaRelevance = Math.max(parse.governanceRelevance, parse.socialOrderRelevance)
    const canTriggerMisdirected =
        ['advise', 'slander', 'alienate', 'frame', 'proxy', 'omen'].includes(action.schemeType)
        && (
            courtAgendaRelevance >= 0.22
            || (action.schemeType !== 'advise' && agendaRelevance >= 0.28)
            || parse.dominantIntent === 'induce'
            || parse.dominantIntent === 'divide'
        )
        && (targetNpc.canExecute || targetNpc.powerBase === 'external' || highWeightTarget)

    if (parse.exposureRisk >= 0.82 && highWeightTarget) {
        return [{
            npcId: targetNpc.id,
            npcName: targetNpc.name,
            type: 'shock',
            intensity: roundValue(0.74 + parse.exposureRisk * 0.24),
            summary: `${targetNpc.name}近来口风愈紧，朝中借边议兵之声亦随之转烈。`,
            sourceRound: round,
        }]
    }

    if (parse.exposureRisk >= 0.58) {
        return [{
            npcId: targetNpc.id,
            npcName: targetNpc.name,
            type: 'guarded',
            intensity: roundValue(0.4 + parse.exposureRisk * 0.35),
            summary: `${targetNpc.name}表面仍循旧章，然近来言语间已多了一层提防。`,
            sourceRound: round,
        }]
    }

    if (success && canTriggerMisdirected && parse.structuralPenetration < 0.2 && parse.eventFit < 0.25) {
        return [{
            npcId: targetNpc.id,
            npcName: targetNpc.name,
            type: 'misdirected',
            intensity: roundValue(0.34 + (1 - parse.eventFit) * 0.3),
            summary: '朝议虽似略有转动，实则主战与安内的借口已悄悄换了方向。',
            sourceRound: round,
        }]
    }

    if (!success && parse.exposureRisk >= 0.42) {
        return [{
            npcId: targetNpc.id,
            npcName: targetNpc.name,
            type: 'exposed',
            intensity: roundValue(0.28 + parse.exposureRisk * 0.25),
            summary: '朝中虽未明言，萧郎近日行止却似已多惹几分注目。',
            sourceRound: round,
        }]
    }

    if (action.schemeType === 'rebellion' && parse.exposureRisk >= 0.36) {
        return [{
            npcId: targetNpc.id,
            npcName: targetNpc.name,
            type: 'exposed',
            intensity: roundValue(0.3 + parse.exposureRisk * 0.22),
            summary: `${targetNpc.name}虽未当场失色，然边镇间已有暗线记下了你的话锋。`,
            sourceRound: round,
        }]
    }

    return []
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

function randomPick<T>(list: T[]): T {
    return list[Math.floor(Math.random() * list.length)]
}
