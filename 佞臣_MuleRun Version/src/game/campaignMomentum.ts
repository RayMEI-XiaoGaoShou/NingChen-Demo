import type { NorthSchemeParseResult, SchemeType } from './types'

export interface CampaignMomentumGainResult {
    shuMomentumGain: number
    huainanMomentumGain: number
}

export function deriveCampaignMomentumGain(params: {
    round: number
    schemeType: SchemeType
    success: boolean
    parse?: NorthSchemeParseResult | null
}): CampaignMomentumGainResult {
    if (!params.success || !params.parse) {
        return { shuMomentumGain: 0, huainanMomentumGain: 0 }
    }

    const baseBattleSignal =
        params.parse.militaryRelevance * 0.35
        + params.parse.grainRelevance * 0.35
        + params.parse.governanceRelevance * 0.3
    const omenLegitimacySignal =
        params.schemeType === 'omen'
            ? params.parse.governanceRelevance * 0.8 + params.parse.socialOrderRelevance * 0.2
            : 0
    const battleSignal = Math.max(baseBattleSignal, omenLegitimacySignal)

    const qualityGate =
        params.parse.characterFit >= 0.45
        && params.parse.eventFit >= 0.4
        && params.parse.structuralPenetration >= 0.35

    const omenGate =
        params.schemeType === 'omen'
        && params.parse.governanceRelevance >= 0.7
        && params.parse.eventFit >= 0.65
        && params.parse.structuralPenetration >= 0.55
    const lowRiskAdviceGate =
        params.schemeType === 'advise'
        && params.parse.executability >= 0.45

    if (!qualityGate || (!omenGate && battleSignal < 0.42)) {
        return { shuMomentumGain: 0, huainanMomentumGain: 0 }
    }

    const typeMultiplier =
        omenGate
            ? 1.25
            : lowRiskAdviceGate
                ? 1.1
                : 1

    const momentumBaseline = omenGate ? 0.1 : 0.35
    const baseGain = Math.min(1.4, roundValue((battleSignal - momentumBaseline) * typeMultiplier))

    if (params.round <= 10) {
        return { shuMomentumGain: baseGain, huainanMomentumGain: 0 }
    }

    if (params.round <= 16) {
        return { shuMomentumGain: 0, huainanMomentumGain: baseGain }
    }

    return { shuMomentumGain: 0, huainanMomentumGain: 0 }
}

function roundValue(value: number): number {
    return Math.round(value * 10) / 10
}
