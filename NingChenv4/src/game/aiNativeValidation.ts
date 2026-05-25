import type {
    AdvicePolarity,
    NorthDominantIntent,
    NorthSchemeParseResult,
    OmenPolarity,
    PolicyReasonParseResult,
    PolicyStance,
} from './types'

const NORTH_INTENTS: NorthDominantIntent[] = ['neutral', 'induce', 'threaten', 'divide', 'empathize', 'strategize']
const POLICY_STANCES: PolicyStance[] = ['neutral', 'balanced', 'aggressive', 'conservative', 'expedient']
const ADVICE_POLARITIES: AdvicePolarity[] = ['pro_state', 'pro_target_anti_state', 'neutral_or_vague']
const OMEN_POLARITIES: OmenPolarity[] = ['legitimizing', 'destabilizing', 'vague_or_ceremonial']

export function clamp01(value: unknown): number {
    const numeric = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(numeric)) return 0
    return Math.max(0, Math.min(1, Math.round(numeric * 100) / 100))
}

function clampSigned(value: unknown): number {
    const numeric = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(numeric)) return 0
    return Math.max(-1, Math.min(1, Math.round(numeric * 100) / 100))
}

function isNorthIntent(value: unknown): value is NorthDominantIntent {
    return typeof value === 'string' && NORTH_INTENTS.includes(value as NorthDominantIntent)
}

function isPolicyStance(value: unknown): value is PolicyStance {
    return typeof value === 'string' && POLICY_STANCES.includes(value as PolicyStance)
}

function isAdvicePolarity(value: unknown): value is AdvicePolarity {
    return typeof value === 'string' && ADVICE_POLARITIES.includes(value as AdvicePolarity)
}

function isOmenPolarity(value: unknown): value is OmenPolarity {
    return typeof value === 'string' && OMEN_POLARITIES.includes(value as OmenPolarity)
}

function cleanEvidence(input: unknown): string[] {
    return Array.isArray(input)
        ? input.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 3)
        : []
}

export function normalizeNorthSchemeParse(input: unknown): NorthSchemeParseResult {
    const candidate = (input ?? {}) as Partial<NorthSchemeParseResult>
    return {
        characterFit: clamp01(candidate.characterFit),
        eventFit: clamp01(candidate.eventFit),
        structuralPenetration: clamp01(candidate.structuralPenetration),
        executability: clamp01(candidate.executability),
        exposureRisk: clamp01(candidate.exposureRisk),
        financeRelevance: clamp01(candidate.financeRelevance),
        grainRelevance: clamp01(candidate.grainRelevance),
        militaryRelevance: clamp01(candidate.militaryRelevance),
        socialOrderRelevance: clamp01(candidate.socialOrderRelevance),
        governanceRelevance: clamp01(candidate.governanceRelevance),
        dominantIntent: isNorthIntent(candidate.dominantIntent) ? candidate.dominantIntent : 'neutral',
        omenAccusationClarity: clamp01(candidate.omenAccusationClarity),
        centralSanctionLeverage: clamp01(candidate.centralSanctionLeverage),
        stateBenefit: clampSigned(candidate.stateBenefit),
        targetBenefit: clampSigned(candidate.targetBenefit),
        factionBenefit: clampSigned(candidate.factionBenefit),
        advicePolarity: isAdvicePolarity(candidate.advicePolarity) ? candidate.advicePolarity : 'neutral_or_vague',
        legitimacyDirection: clampSigned(candidate.legitimacyDirection),
        omenPolarity: isOmenPolarity(candidate.omenPolarity) ? candidate.omenPolarity : 'vague_or_ceremonial',
        selfTrapPotential: clamp01(candidate.selfTrapPotential),
        scapegoatClarity: clamp01(candidate.scapegoatClarity),
        omenAnchorStrength: clamp01(candidate.omenAnchorStrength),
        legitimacyCrack: clamp01(candidate.legitimacyCrack),
        suspicionDirection: clamp01(candidate.suspicionDirection),
        suspicionTransmission: clamp01(candidate.suspicionTransmission),
        fractureTransmission: clamp01(candidate.fractureTransmission),
        proxyTransmission: clamp01(candidate.proxyTransmission),
        evidence: cleanEvidence(candidate.evidence),
    }
}

export function normalizePolicyReasonParse(input: unknown): PolicyReasonParseResult {
    const candidate = (input ?? {}) as Partial<PolicyReasonParseResult>
    return {
        focusAlignment: clamp01(candidate.focusAlignment),
        executionClarity: clamp01(candidate.executionClarity),
        costAwareness: clamp01(candidate.costAwareness),
        legitimacyAlignment: clamp01(candidate.legitimacyAlignment),
        policyStance: isPolicyStance(candidate.policyStance) ? candidate.policyStance : 'neutral',
        evidence: cleanEvidence(candidate.evidence),
    }
}

function isRecord(input: unknown): input is Record<string, unknown> {
    return typeof input === 'object' && input !== null
}

function hasCoercibleNumberField(input: Record<string, unknown>, field: string): boolean {
    const value = input[field]
    const numeric = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(numeric)
}

function hasStructuredNumberShape(input: unknown, fields: string[]): boolean {
    return isRecord(input) && fields.every(field => hasCoercibleNumberField(input, field))
}

export function hasNorthSchemeParseShape(input: unknown): boolean {
    return hasStructuredNumberShape(input, [
        'characterFit',
        'eventFit',
        'structuralPenetration',
        'executability',
        'exposureRisk',
    ])
}

export function hasSchemeFollowUpParseShape(input: unknown): boolean {
    return hasStructuredNumberShape(input, [
        'clarificationFit',
        'npcInterestFit',
        'pressureControl',
        'contradictionRisk',
        'exposureRiskDelta',
        'successRateDelta',
        'effectMultiplierDelta',
    ])
}

export function hasPolicyReasonParseShape(input: unknown): boolean {
    return hasStructuredNumberShape(input, [
        'focusAlignment',
        'executionClarity',
        'costAwareness',
        'legitimacyAlignment',
    ])
}
