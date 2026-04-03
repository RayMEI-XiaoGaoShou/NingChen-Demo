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

    const battleSignal =
        params.parse.militaryRelevance * 0.35
        + params.parse.grainRelevance * 0.35
        + params.parse.governanceRelevance * 0.3

    const qualityGate =
        params.parse.characterFit >= 0.45
        && params.parse.eventFit >= 0.4
        && params.parse.structuralPenetration >= 0.35

    if (!qualityGate || battleSignal < 0.42) {
        return { shuMomentumGain: 0, huainanMomentumGain: 0 }
    }

    const baseGain = Math.min(1.2, roundValue(battleSignal - 0.35))

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
