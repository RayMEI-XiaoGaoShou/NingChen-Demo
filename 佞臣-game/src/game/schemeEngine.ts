import { getSchemeByType } from '../data/schemes'
import { getMilitarySpilloverStrength, isOmenAvailableForNpc, roundSupportsExternalAction } from '../data/roundRuleConfig'
import { fallbackNorthParseFromSpeech } from './aiNativeEngine'
import type {
    AlignmentBias,
    CourtFactionId,
    DelayedBacklash,
    ExternalStatus,
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
    frame: '放风构陷',
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
    const base = getAvailableSchemesForTrust(npc.trust)

    if (round === 1) {
        return base.filter(type => type === 'probe' || type === 'advise' || type === 'slander')
    }

    if (isOmenAvailableForNpc(round, npc)) {
        base.push('omen')
    }

    if (
        npc.powerBase === 'external' &&
        npc.isAlive &&
        npc.externalStatus !== 'rebellion' &&
        npc.trust >= 72 &&
        npc.loyaltyToCourt <= 35 &&
        unlockedSecrets >= 2 &&
        roundSupportsExternalAction(round, 'secession')
    ) {
        base.push('secession')
    }

    if (
        npc.powerBase === 'external' &&
        npc.isAlive &&
        npc.externalStatus !== 'rebellion' &&
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
): number {
    let rate = 0.62
    const trustBonus = Math.min(Math.max(trust - trustThreshold, 0) / 100, 0.24)
    rate += trustBonus

    if (sameNpcSameRound) {
        rate -= 0.18
    }

    const schemeModifiers: Record<SchemeType, number> = {
        probe: 0.18,
        advise: 0.14,
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
            relatedNpc,
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

function softenEarlyNorthNationEffects(
    changes: Partial<NationDimensions>,
    roundNumber: number,
): Partial<NationDimensions> {
    const governanceScale = roundNumber <= 6 ? 0.45 : roundNumber <= 12 ? 0.72 : 1
    const socialOrderScale = roundNumber <= 6 ? 0.5 : roundNumber <= 12 ? 0.78 : 1

    return {
        ...changes,
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

function deriveNationEffectFromExternalPerson(targetNpc: NPC, personEffects: PersonEffects): Partial<NationDimensions> {
    if (targetNpc.powerBase !== 'external') return {}

    const loyaltyShock = Math.max(0, -personEffects.loyaltyDelta)
    const forceFactor = targetNpc.militaryPower / 40
    return normalizeDimensions({
        finance: -(loyaltyShock * 0.06 * forceFactor),
        grain: -(loyaltyShock * 0.04 * forceFactor),
        military: -(loyaltyShock * 0.08 * forceFactor),
        socialOrder: -(loyaltyShock * 0.06 * forceFactor),
        governance: -(loyaltyShock * 0.1 * forceFactor),
    })
}

function getSuccessTemplate(
    action: SchemeAction,
    targetNpc: NPC,
    relatedNpc?: NPC | null,
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
            if (targetNpc.powerBase === 'court') {
                factionEffects = addFactionEffect(factionEffects, targetNpc.factionId as CourtFactionId, {
                    courtInfluence: 2.2,
                    internalStability: -0.8,
                })
            }
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
            if (targetNpc.powerBase === 'court') {
                factionEffects = addFactionEffect(factionEffects, targetNpc.factionId as CourtFactionId, {
                    internalStability: -2.8,
                    courtInfluence: -1.6,
                })
            }
            return {
                person: {
                    ...emptyPerson,
                    trustDelta: 1,
                    loyaltyDelta: targetNpc.powerBase === 'external' ? -8 : 0,
                    alignmentShift: targetNpc.powerBase === 'external' ? 'self' : null,
                },
                factionEffects,
                specialAction: null,
            }
        case 'proxy':
            if (relatedNpc?.powerBase === 'court') {
                factionEffects = addFactionEffect(factionEffects, relatedNpc.factionId as CourtFactionId, {
                    militaryPower: -2.2,
                    internalStability: -2.2,
                    courtInfluence: -1.1,
                })
            }
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
            if (targetNpc.powerBase === 'court') {
                factionEffects = addFactionEffect(factionEffects, targetNpc.factionId as CourtFactionId, {
                    internalStability: -1.8,
                    courtInfluence: -1.2,
                })
            }
            return {
                person: { ...emptyPerson, trustDelta: 1 },
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
    }
}

export function previewSchemeSuccess(
    action: SchemeAction,
    targetNpc: NPC,
    existingActionsOnTarget: number,
    roll: number,
    context: Partial<SchemeContext> = {},
): boolean {
    const trustThreshold = getTrustThreshold(action.schemeType)
    const parse = getNorthParse(action, targetNpc, context.round ?? 1, null, context.northParse)
    const successRate = calculateParsedSuccessRate(action.schemeType, targetNpc.trust, trustThreshold, existingActionsOnTarget > 0, parse)
    return roll < successRate
}

export function settleScheme(
    action: SchemeAction,
    targetNpc: NPC,
    relatedNpc: NPC | null,
    existingActionsOnTarget: number,
    context: Partial<SchemeContext> = {},
): SchemeResult {
    const { round = 1, unlockedSecrets = 0 } = context
    const roll = action.resolutionRoll ?? Math.random()
    const schemeAllowed = isSchemeAllowed(action.schemeType, targetNpc, round, unlockedSecrets)
    const northParse = getNorthParse(action, targetNpc, round, relatedNpc, context.northParse)
    const success = schemeAllowed && previewSchemeSuccess(action, targetNpc, existingActionsOnTarget, roll, context)
    const personMultiplier = success
        ? clamp(0.9 + northParse.characterFit * 0.85 + northParse.executability * 0.35, 0.8, 2.1)
        : clamp(0.95 + northParse.exposureRisk * 0.45 - northParse.executability * 0.15, 0.9, 1.35)
    const factionMultiplier = success
        ? clamp(0.85 + northParse.eventFit * 0.55 + northParse.structuralPenetration * 1.0, 0.75, 2.4)
        : clamp(0.9 + northParse.exposureRisk * 0.2, 0.9, 1.3)
    const nationMultiplier = success && northParse.structuralPenetration >= 0.45
        ? clamp(0.8 + northParse.structuralPenetration * 1.4 + northParse.eventFit * 0.4, 0.8, 2.8)
        : success
            ? 0.65
            : 1
    const tunedNationMultiplier = success
        ? roundValue(nationMultiplier * getOpeningSchemeNationScale(round))
        : nationMultiplier

    const template: {
        person: PersonEffects
        factionEffects: Partial<Record<CourtFactionId, FactionVector>>
        specialAction: 'secession' | 'rebellion' | null
    } = success
        ? getSuccessTemplate(action, targetNpc, relatedNpc)
        : { ...getFailureTemplate(action, targetNpc), specialAction: null }

    const personEffects = scalePersonEffects(template.person, personMultiplier)
    let factionEffects: Partial<Record<CourtFactionId, FactionVector>> = {}
    for (const [factionId, vector] of Object.entries(template.factionEffects) as Array<[CourtFactionId, FactionVector | undefined]>) {
        if (!vector) continue
        factionEffects[factionId] = scaleVector(vector, factionMultiplier)
    }

    let nationEffects = deriveNationEffectFromFactionEffects(factionEffects)
    nationEffects = mergeDimensions(nationEffects, deriveNationEffectFromExternalPerson(targetNpc, personEffects))
    nationEffects = mergeDimensions(
        nationEffects,
        scaleDimensions(deriveMilitarySpillover(action, targetNpc, relatedNpc, round, success, northParse), tunedNationMultiplier),
    )
    nationEffects = scaleDimensions(nationEffects, tunedNationMultiplier)
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

    const feedbackText = generateFeedback(action, targetNpc, success)
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

function generateFeedback(action: SchemeAction, npc: NPC, success: boolean): string {
    const name = SCHEME_NAMES[action.schemeType]

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
    return npc.militaryPower >= 40 || /诸军事|节度使|将军|都督/.test(npc.title)
}

function hasWarLogisticsLanguage(text: string): boolean {
    return /(兵|军|粮|饷|边|镇|征|战|运|调|平叛|淮南|河西|河北|寿春|漕|后勤|兵权)/.test(text)
}

function deriveMilitarySpillover(
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

    const warSpeech = hasWarLogisticsLanguage(action.playerSpeech)
    const canSpillFromAdvise = action.schemeType !== 'advise' || warSpeech
    if (!canSpillFromAdvise) return {}

    const baseForce = militaryActors.reduce((sum, npc) => sum + npc.militaryPower, 0) / militaryActors.length
    const forceFactor = baseForce >= 70 ? 1.15 : baseForce >= 50 ? 1 : 0.78
    const speechFactor = 1 + parse.eventFit * 0.35 + parse.structuralPenetration * 0.45 + (warSpeech ? 0.2 : 0)
    const scale = spilloverStrength * forceFactor * speechFactor

    switch (action.schemeType) {
        case 'alienate':
            return normalizeDimensions({
                military: -0.8 * scale,
                grain: -0.5 * scale,
                governance: -0.4 * scale,
            })
        case 'frame':
            return normalizeDimensions({
                military: -0.6 * scale,
                grain: -0.4 * scale,
                socialOrder: -0.4 * scale,
                governance: -0.6 * scale,
            })
        case 'slander':
            return normalizeDimensions({
                military: -0.4 * scale,
                socialOrder: -0.3 * scale,
                governance: -0.4 * scale,
            })
        case 'advise':
            return normalizeDimensions({
                military: -0.35 * scale,
                grain: -0.45 * scale,
                governance: -0.35 * scale,
            })
        default:
            return {}
    }
}

function calculateParsedSuccessRate(
    schemeType: SchemeType,
    trust: number,
    trustThreshold: number,
    sameNpcSameRound: boolean,
    parse: NorthSchemeParseResult,
): number {
    const baseRate = calculateSuccessRate(schemeType, trust, trustThreshold, sameNpcSameRound)
    const characterBoost = parse.characterFit * 0.18 + parse.executability * 0.12
    const eventBoost = parse.eventFit * 0.12
    return clamp(baseRate + characterBoost + eventBoost - parse.exposureRisk * 0.08, 0.05, 0.98)
}

function deriveDelayedBacklash(
    action: SchemeAction,
    targetNpc: NPC,
    success: boolean,
    parse: NorthSchemeParseResult,
    round: number,
): DelayedBacklash[] {
    const highWeightTarget = /丞相|太后|燕王|中常侍|上柱国|节度/.test(targetNpc.title) || targetNpc.canExecute

    if (parse.exposureRisk >= 0.82 && highWeightTarget) {
        return [{
            npcId: targetNpc.id,
            npcName: targetNpc.name,
            type: 'shock',
            intensity: roundValue(0.74 + parse.exposureRisk * 0.24),
            summary: `${targetNpc.name}近来口风骤紧，朝中借边议兵之声亦随之转炽。`,
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

    if (success && parse.structuralPenetration < 0.2 && parse.eventFit < 0.25) {
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
            summary: `${targetNpc.name}虽未当场失色，然边镇间已有人暗自记下了你的话锋。`,
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
