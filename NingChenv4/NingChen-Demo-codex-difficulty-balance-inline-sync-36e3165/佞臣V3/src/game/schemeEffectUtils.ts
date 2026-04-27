import type { FactionVector } from './schemeEngine'
import type {
    CourtFactionId,
    GameDifficulty,
    NationDimensions,
    NorthSchemeParseResult,
    SchemeType,
} from './types'

const EMPTY_VECTOR: FactionVector = {
    militaryPower: 0,
    courtInfluence: 0,
    internalStability: 0,
}

export function makeVector(partial?: Partial<FactionVector>): FactionVector {
    return {
        militaryPower: round(partial?.militaryPower ?? 0),
        courtInfluence: round(partial?.courtInfluence ?? 0),
        internalStability: round(partial?.internalStability ?? 0),
    }
}

export function scaleVector(vector: FactionVector, multiplier: number): FactionVector {
    return makeVector({
        militaryPower: vector.militaryPower * multiplier,
        courtInfluence: vector.courtInfluence * multiplier,
        internalStability: vector.internalStability * multiplier,
    })
}

export function scaleDimensions(
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

export function mergeDimensions(
    left: Partial<NationDimensions>,
    right: Partial<NationDimensions>,
): Partial<NationDimensions> {
    const merged: Partial<NationDimensions> = { ...left }
    for (const key of Object.keys(right) as Array<keyof NationDimensions>) {
        merged[key] = round((merged[key] ?? 0) + (right[key] ?? 0))
    }
    return merged
}

export function getOpeningSchemeNationScale(round: number): number {
    if (round <= 6) return 0.42
    if (round <= 12) return 0.72
    return 1
}

export function getLowRiskNationDamping(
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

export function getIntrigueTransmission(
    schemeType: SchemeType,
    parse: NorthSchemeParseResult,
): number {
    if (schemeType === 'slander') return parse.suspicionTransmission ?? 0
    if (schemeType === 'alienate') return parse.fractureTransmission ?? 0
    if (schemeType === 'proxy') return parse.proxyTransmission ?? 0
    return 1
}

export function getIntrigueNationGate(
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

export function softenEarlyNorthNationEffects(
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

export function addFactionEffect(
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

export function deriveNationEffectFromFactionEffects(
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

export function getDimensionRelevance(
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

export function semanticScale(
    relevance: number,
    threshold: number,
    minScale: number,
    maxScale: number,
): number {
    if (relevance < threshold) return 0
    const normalized = (relevance - threshold) / Math.max(0.01, 1 - threshold)
    return round(minScale + normalized * (maxScale - minScale))
}

export function applyDimensionRelevance(
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

export function normalizeDimensions(changes: Partial<NationDimensions>): Partial<NationDimensions> {
    const normalized: Partial<NationDimensions> = {}
    for (const [key, value] of Object.entries(changes) as Array<[keyof NationDimensions, number | undefined]>) {
        if (!value) continue
        normalized[key] = round(value)
    }
    return normalized
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
}

function round(value: number): number {
    return Math.round(value * 10) / 10
}
