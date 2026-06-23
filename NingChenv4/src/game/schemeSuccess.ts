import { fallbackNorthParseFromSpeech } from './aiNativeEngine'
import { getDifficultyProfile } from './difficulty'
import type {
    GameDifficulty,
    NorthSchemeParseResult,
    NPC,
    SchemeAction,
    SchemeType,
} from './types'

export function resolveNorthParse(
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

function roundValue(value: number): number {
    return Math.round(value * 1000) / 1000
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
}
