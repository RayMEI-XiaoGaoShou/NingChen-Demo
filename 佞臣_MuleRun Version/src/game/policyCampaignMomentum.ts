import type { NationDimensions, PolicyReasonParseResult } from './types'

export interface PolicyCampaignMomentumGain {
    shuMomentumGain: number
    huainanMomentumGain: number
}

export function derivePolicyCampaignMomentum(params: {
    round: number
    effects: Partial<NationDimensions>
    policyParse?: PolicyReasonParseResult | null
}): PolicyCampaignMomentumGain {
    const parse = params.policyParse
    if (!parse) {
        return { shuMomentumGain: 0, huainanMomentumGain: 0 }
    }

    const focusGate = parse.focusAlignment >= 0.55 && parse.executionClarity >= 0.55
    const parseSignal =
        parse.focusAlignment * 0.38
        + parse.executionClarity * 0.34
        + parse.costAwareness * 0.2
        + parse.legitimacyAlignment * 0.08

    const positiveEffects = {
        finance: Math.max(0, params.effects.finance ?? 0),
        grain: Math.max(0, params.effects.grain ?? 0),
        military: Math.max(0, params.effects.military ?? 0),
        governance: Math.max(0, params.effects.governance ?? 0),
    }

    const shuSignal =
        positiveEffects.grain * 0.38
        + positiveEffects.governance * 0.3
        + positiveEffects.finance * 0.18
        + positiveEffects.military * 0.14
    const huainanSignal =
        positiveEffects.military * 0.34
        + positiveEffects.grain * 0.28
        + positiveEffects.finance * 0.24
        + positiveEffects.governance * 0.14

    if (!focusGate || parseSignal < 0.52) {
        return { shuMomentumGain: 0, huainanMomentumGain: 0 }
    }

    if (params.round <= 10) {
        if (shuSignal < 1.15) {
            return { shuMomentumGain: 0, huainanMomentumGain: 0 }
        }

        return {
            shuMomentumGain: roundOneDecimal(Math.min(1.2, (shuSignal - 0.95) * (0.42 + parseSignal * 0.42))),
            huainanMomentumGain: 0,
        }
    }

    if (params.round <= 16) {
        if (huainanSignal < 1.1) {
            return { shuMomentumGain: 0, huainanMomentumGain: 0 }
        }

        return {
            shuMomentumGain: 0,
            huainanMomentumGain: roundOneDecimal(Math.min(1.2, (huainanSignal - 0.92) * (0.42 + parseSignal * 0.42))),
        }
    }

    return { shuMomentumGain: 0, huainanMomentumGain: 0 }
}

function roundOneDecimal(value: number): number {
    return Math.round(value * 10) / 10
}
