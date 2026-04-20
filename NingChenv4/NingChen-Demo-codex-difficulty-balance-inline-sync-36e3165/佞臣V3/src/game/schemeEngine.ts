import { getSchemeByType } from '../data/schemes'
import { getMilitarySpilloverStrength, isOmenAvailableForNpc, roundSupportsExternalAction } from '../data/roundRuleConfig'
import { fallbackNorthParseFromSpeech } from './aiNativeEngine'
import { isCourtDispositionExecutor } from './courtDisposition'
import { getDifficultyProfile } from './difficulty'
import { isTerminalExternalNpc } from './externalStatus'
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

export interface PersonEffects {
    trustDelta: number
    relatedTrustDelta: number
    loyaltyDelta: number
    relatedLoyaltyDelta: number
    militaryPowerDelta: number
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

const EMPTY_VECTOR: FactionVector = {
    militaryPower: 0,
    courtInfluence: 0,
    internalStability: 0,
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
        (npc.externalStatus === 'loyal' || npc.externalStatus === 'watchful')

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

function calculateSuccessRate(
    schemeType: SchemeType,
    trust: number,
    trustThreshold: number,
    sameNpcSameRound: boolean,
    difficulty: GameDifficulty = 'normal',
): number {
    const profile = getDifficultyProfile(difficulty)
    let rate = profile.scheme.baseRate
    const trustBonus = Math.min(
        Math.max(trust - trustThreshold, 0) / 100,
        roundValue(profile.scheme.baseRate * 0.18),
    )
    rate += trustBonus

    if (sameNpcSameRound) {
        rate -= 0.18
    }

    const schemeModifiers: Record<SchemeType, number> = {
        probe: profile.scheme.probeModifier,
        advise: profile.scheme.adviseModifier,
        slander: 0.02,
        alienate: -0.06,
        frame: -0.08,
        proxy: -0.12,
        appeal: 0.12,
        omen: -0.18,
        secession: -0.08,
        rebellion: -0.18,
    }

    return clamp(rate + schemeModifiers[schemeType], 0.08, 0.96)
}

function calculateOmenSuccessRate(
    sameNpcSameRound: boolean,
    parse: NorthSchemeParseResult,
    difficulty: GameDifficulty = 'normal',
): number {
    const profile = getDifficultyProfile(difficulty)
    let rate = profile.scheme.baseRate + 0.08
    const anchorStrength = clamp(
        parse.omenAnchorStrength ?? (parse.structuralPenetration * 0.7 + parse.eventFit * 0.3),
        0,
        1,
    )
    const legitimacyCrack = clamp(
        parse.legitimacyCrack ?? Math.max(parse.governanceRelevance, parse.socialOrderRelevance) * 1.05,
        0,
        1,
    )
    const suspicionDirection = clamp(
        parse.suspicionDirection ?? (Math.max(parse.governanceRelevance, parse.socialOrderRelevance) * 0.9),
        0,
        1,
    )

    if (sameNpcSameRound) {
        rate -= 0.12
    }

    const omenSignal =
        anchorStrength * 0.16
        + legitimacyCrack * 0.14
        + suspicionDirection * 0.1
        + parse.eventFit * 0.08
        + parse.structuralPenetration * 0.06
        - parse.exposureRisk * 0.16

    return clamp(rate + omenSignal, 0.14, 0.94)
}

function getNorthParse(
    action: SchemeAction,
    targetNpc: NPC,
    round: number,
    relatedNpc: NPC | null,
    contextParse?: NorthSchemeParseResult,
): NorthSchemeParseResult {
    return contextParse
        ?? action.northParse
        ?? fallbackNorthParseFromSpeech({
            speech: action.playerSpeech,
            npc: targetNpc,
            round,
            schemeType: action.schemeType,
            relatedNpc,
            omenSpeechInput: action.omenSpeechInput,
        })
}

function makeVector(partial?: Partial<FactionVector>): FactionVector {
    return {
        militaryPower: round(partial?.militaryPower ?? 0),
        courtInfluence: round(partial?.courtInfluence ?? 0),
        internalStability: round(partial?.internalStability ?? 0),
    }
}

function scaleVector(vector: FactionVector, multiplier: number): FactionVector {
    return makeVector({
        militaryPower: vector.militaryPower * multiplier,
        courtInfluence: vector.courtInfluence * multiplier,
        internalStability: vector.internalStability * multiplier,
    })
}

function scaleDimensions(
    changes: Partial<NationDimensions>,
    multiplier: number,
): Partial<NationDimensions> {
    const scaled: Partial<NationDimensions> = {}
    for (const [key, value] of Object.entries(changes) as Array<[keyof NationDimensions, number | undefined]>) {
        if (value === undefined || value === 0) continue
        scaled[key] = round(value * multiplier)
    }
    return scaled
}

function mergeDimensions(
    left: Partial<NationDimensions>,
    right: Partial<NationDimensions>,
): Partial<NationDimensions> {
    const merged: Partial<NationDimensions> = { ...left }
    for (const key of Object.keys(right) as Array<keyof NationDimensions>) {
        merged[key] = round((merged[key] ?? 0) + (right[key] ?? 0))
    }
    return merged
}

function getOpeningSchemeNationScale(round: number): number {
    if (round <= 6) return 0.42
    if (round <= 12) return 0.72
    return 1
}

function getLowRiskNationDamping(
    schemeType: SchemeType,
    difficulty: GameDifficulty,
    round: number,
): number {
    if (schemeType !== 'advise' && schemeType !== 'probe') return 1

    if (schemeType === 'probe') {
        if (difficulty === 'easy') {
            return round <= 6 ? 0.96 : round <= 12 ? 0.98 : 1
        }

        if (difficulty === 'normal') {
            return round <= 6 ? 0.56 : round <= 12 ? 0.66 : 0.74
        }

        if (difficulty === 'hard') {
            return round <= 6 ? 0.5 : round <= 12 ? 0.6 : 0.7
        }

        return round <= 6 ? 0.46 : round <= 12 ? 0.56 : 0.66
    }

    if (difficulty === 'easy') {
        return round <= 6 ? 0.92 : round <= 12 ? 0.96 : 1
    }

    if (difficulty === 'normal') {
        return round <= 6 ? 0.52 : round <= 12 ? 0.62 : 0.72
    }

    if (difficulty === 'hard') {
        return round <= 6 ? 0.46 : round <= 12 ? 0.56 : 0.68
    }

    return round <= 6 ? 0.42 : round <= 12 ? 0.52 : 0.64
}

function getIntrigueTransmission(
    schemeType: SchemeType,
    parse: NorthSchemeParseResult,
): number {
    if (schemeType === 'slander') return parse.suspicionTransmission ?? 0
    if (schemeType === 'alienate') return parse.fractureTransmission ?? 0
    if (schemeType === 'proxy') return parse.proxyTransmission ?? 0
    return 1
}

function getIntrigueNationGate(
    schemeType: SchemeType,
    parse: NorthSchemeParseResult,
): number {
    const transmission = getIntrigueTransmission(schemeType, parse)

    if (schemeType === 'slander') {
        if (transmission < 0.28) return 0
        return clamp(0.1 + transmission * 0.95, 0.1, 1)
    }

    if (schemeType === 'alienate') {
        if (transmission < 0.24) return 0
        return clamp(0.18 + transmission * 0.92, 0.18, 1)
    }

    if (schemeType === 'proxy') {
        if (transmission < 0.26) return 0
        return clamp(0.14 + transmission * 0.96, 0.14, 1)
    }

    return 1
}

function softenEarlyNorthNationEffects(
    changes: Partial<NationDimensions>,
    roundNumber: number,
): Partial<NationDimensions> {
    const financeScale = roundNumber <= 6 ? 0.58 : roundNumber <= 12 ? 0.8 : 1
    const grainScale = roundNumber <= 6 ? 0.68 : roundNumber <= 12 ? 0.86 : 1
    const militaryScale = roundNumber <= 6 ? 0.74 : roundNumber <= 12 ? 0.9 : 1
    const governanceScale = roundNumber <= 6 ? 0.45 : roundNumber <= 12 ? 0.72 : 1
    const socialOrderScale = roundNumber <= 6 ? 0.5 : roundNumber <= 12 ? 0.78 : 1

    return {
        ...changes,
        finance: changes.finance !== undefined ? round((changes.finance ?? 0) * financeScale) : changes.finance,
        grain: changes.grain !== undefined ? round((changes.grain ?? 0) * grainScale) : changes.grain,
        military: changes.military !== undefined ? round((changes.military ?? 0) * militaryScale) : changes.military,
        governance: changes.governance !== undefined ? round((changes.governance ?? 0) * governanceScale) : changes.governance,
        socialOrder: changes.socialOrder !== undefined ? round((changes.socialOrder ?? 0) * socialOrderScale) : changes.socialOrder,
    }
}

function addFactionEffect(
    bucket: Partial<Record<CourtFactionId, FactionVector>>,
    factionId: CourtFactionId,
    delta: Partial<FactionVector>,
): Partial<Record<CourtFactionId, FactionVector>> {
    const current = bucket[factionId] ?? EMPTY_VECTOR
    return {
        ...bucket,
        [factionId]: makeVector({
            militaryPower: current.militaryPower + (delta.militaryPower ?? 0),
            courtInfluence: current.courtInfluence + (delta.courtInfluence ?? 0),
            internalStability: current.internalStability + (delta.internalStability ?? 0),
        }),
    }
}

function deriveNationEffectFromFactionEffects(
    factionEffects: Partial<Record<CourtFactionId, FactionVector>>,
): Partial<NationDimensions> {
    let result: Partial<NationDimensions> = {}

    for (const vector of Object.values(factionEffects)) {
        if (!vector) continue
        result = mergeDimensions(result, {
            finance: -(Math.max(0, -vector.internalStability) * 0.28 + Math.max(0, -vector.militaryPower) * 0.18),
            grain: -(Math.max(0, -vector.militaryPower) * 0.16),
            military: -(Math.abs(vector.militaryPower) * 0.24),
            socialOrder: -(Math.abs(vector.courtInfluence) * 0.18 + Math.max(0, -vector.internalStability) * 0.22),
            governance: -(Math.abs(vector.courtInfluence) * 0.3 + Math.abs(vector.internalStability) * 0.24),
        })
    }

    return normalizeDimensions(result)
}

function getDimensionRelevance(
    parse: NorthSchemeParseResult,
    dimension: keyof NationDimensions,
): number {
    switch (dimension) {
        case 'finance':
            return parse.financeRelevance
        case 'grain':
            return parse.grainRelevance
        case 'military':
            return parse.militaryRelevance
        case 'socialOrder':
            return parse.socialOrderRelevance
        case 'governance':
            return parse.governanceRelevance
    }
}

function semanticScale(
    relevance: number,
    threshold: number,
    minScale: number,
    maxScale: number,
): number {
    if (relevance < threshold) return 0
    const normalized = (relevance - threshold) / Math.max(0.01, 1 - threshold)
    return round(minScale + normalized * (maxScale - minScale))
}

function applyDimensionRelevance(
    changes: Partial<NationDimensions>,
    parse: NorthSchemeParseResult,
    thresholds: Partial<Record<keyof NationDimensions, number>>,
    scales: Partial<Record<keyof NationDimensions, { min: number; max: number }>>,
): Partial<NationDimensions> {
    const next: Partial<NationDimensions> = {}
    for (const [dimension, value] of Object.entries(changes) as Array<[keyof NationDimensions, number | undefined]>) {
        if (value === undefined || value === 0) continue
        const threshold = thresholds[dimension]
        const scaleRange = scales[dimension]
        if (threshold === undefined || !scaleRange) {
            next[dimension] = value
            continue
        }
        const scale = semanticScale(getDimensionRelevance(parse, dimension), threshold, scaleRange.min, scaleRange.max)
        if (scale === 0) continue
        next[dimension] = round(value * scale)
    }
    return normalizeDimensions(next)
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
        alignmentShift: null,
        intelDelta: 0,
        externalStatus: null,
    }

    let factionEffects: Partial<Record<CourtFactionId, FactionVector>> = {}

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
                },
                factionEffects,
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
                    alignmentShift: targetNpc.powerBase === 'external' ? 'self' : null,
                },
                factionEffects,
                specialAction: null,
            }
        case 'frame':
            const selfTrapPotential = parse?.selfTrapPotential ?? 0
            const scapegoatClarity = parse?.scapegoatClarity ?? 0
            const trapFactor = getFrameTrapFactor(parse ?? {
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
            })
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
                    alignmentShift: targetNpc.powerBase === 'external' ? 'self' : null,
                },
                factionEffects,
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
                        ...deriveExternalOmenPersonEffects(targetNpc, parse ?? {
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
                        }),
                    }
                    : { ...emptyPerson, trustDelta: 1 },
                factionEffects,
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
    }
}

export function previewSchemeSuccess(
    action: SchemeAction,
    targetNpc: NPC,
    existingActionsOnTarget: number,
    roll: number,
    context: Partial<SchemeContext> = {},
): boolean {
    const rawParse = getNorthParse(action, targetNpc, context.round ?? 1, null, context.northParse)
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
    const rawNorthParse = getNorthParse(action, targetNpc, round, relatedNpc, context.northParse)
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

function normalizeDimensions(changes: Partial<NationDimensions>): Partial<NationDimensions> {
    const normalized: Partial<NationDimensions> = {}
    for (const [key, value] of Object.entries(changes) as Array<[keyof NationDimensions, number | undefined]>) {
        if (!value) continue
        normalized[key] = round(value)
    }
    return normalized
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

export function calculateParsedSuccessRate(
    schemeType: SchemeType,
    trust: number,
    trustThreshold: number,
    sameNpcSameRound: boolean,
    parse: NorthSchemeParseResult,
    difficulty: GameDifficulty = 'normal',
): number {
    if (schemeType === 'omen') {
        return calculateOmenSuccessRate(sameNpcSameRound, parse, difficulty)
    }

    const profile = getDifficultyProfile(difficulty)
    const baseRate = calculateSuccessRate(
        schemeType,
        trust,
        trustThreshold,
        sameNpcSameRound,
        difficulty,
    )
    const characterBoost =
        parse.characterFit * profile.scheme.characterFitWeight * 0.5
        + parse.executability * profile.scheme.executabilityWeight * 0.5
    const eventBoost = parse.eventFit * profile.scheme.eventFitWeight * 0.5
    return clamp(
        baseRate + characterBoost + eventBoost - parse.exposureRisk * profile.scheme.exposurePenaltyWeight,
        0.05,
        0.98,
    )
}

function deriveDelayedBacklash(
    action: SchemeAction,
    targetNpc: NPC,
    success: boolean,
    parse: NorthSchemeParseResult,
    round: number,
): DelayedBacklash[] {
    const highWeightTarget = /涓炵浉|澶悗|鐕曠帇|涓父渚峾涓婃煴鍥絴鑺傚害/.test(targetNpc.title) || targetNpc.canExecute
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
