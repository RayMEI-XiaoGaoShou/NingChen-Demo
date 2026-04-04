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

    const shuSignal =
        params.parse.grainRelevance * 0.38
        + params.parse.governanceRelevance * 0.34
        + params.parse.militaryRelevance * 0.28
    const huainanSignal =
        params.parse.militaryRelevance * 0.4
        + params.parse.grainRelevance * 0.34
        + params.parse.financeRelevance * 0.26
    const omenLegitimacySignal =
        params.schemeType === 'omen'
            ? params.parse.governanceRelevance * 0.8 + params.parse.socialOrderRelevance * 0.2
            : 0
    const battleSignal =
        params.round <= 10
            ? Math.max(shuSignal, omenLegitimacySignal)
            : params.round <= 16
                ? Math.max(huainanSignal, omenLegitimacySignal)
                : 0

    const qualityGate =
        params.parse.characterFit >= 0.48
        && params.parse.eventFit >= 0.45
        && params.parse.structuralPenetration >= 0.38

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
            ? 1.6
            : lowRiskAdviceGate
                ? 1.6
                : 1

    const momentumBaseline = omenGate ? 0.03 : lowRiskAdviceGate ? 0.19 : 0.32
    const expertAdviceBoost =
        lowRiskAdviceGate
        && battleSignal >= 0.78
        && params.parse.characterFit >= 0.72
        && params.parse.eventFit >= 0.7
        && params.parse.structuralPenetration >= 0.7
            ? 0.1
            : 0
    const baseGain = Math.min(1.8, roundValue((battleSignal - momentumBaseline) * typeMultiplier + expertAdviceBoost))

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
