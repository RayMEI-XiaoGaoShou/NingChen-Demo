import { getCampaignMomentumLabel } from './explainability'
import type { NorthSchemeParseResult, SchemeType } from './types'

export interface CampaignMomentumGainResult {
    shuMomentumGain: number
    huainanMomentumGain: number
}

export type CampaignMomentumTheater = 'shu' | 'huainan'

export interface CampaignMomentumSurface {
    theater: CampaignMomentumTheater
    theaterLabel: string
    value: number
    label: string
    summary: string
}

export interface CampaignMomentumContributionSnapshot {
    round: number
    schemeType: SchemeType
    success?: boolean
    parse?: NorthSchemeParseResult | null
    before?: number
    gain: number
    after: number
    theater?: CampaignMomentumTheater | null
}

const MOMENTUM_SUMMARIES: Record<string, string> = {
    '筹势未成': '这一步更像是在朝中造势，还没真正推动到前线战局。',
    '局势微动': '这一步已让前线的战备稍有松动，局势开始微微倾斜。',
    '已见成势': '这一步切中了当前战局的要害，战役风向已经出现明显偏转。',
    '得手在即': '前线局势已大幅倾斜，只差最后的契机便可收局。',
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
    const strategicPreparationGate =
        params.parse.structuralPenetration >= 0.42
        && (
            (params.schemeType === 'advise' && params.parse.executability >= 0.5 && battleSignal >= 0.32)
            || (params.schemeType === 'probe' && battleSignal >= 0.44)
            || (params.schemeType === 'omen' && omenLegitimacySignal >= 0.46 && params.parse.governanceRelevance >= 0.48)
        )

    const omenGate =
        params.schemeType === 'omen'
        && params.parse.governanceRelevance >= 0.7
        && params.parse.eventFit >= 0.65
        && params.parse.structuralPenetration >= 0.55
    const lowRiskAdviceGate =
        params.schemeType === 'advise'
        && params.parse.executability >= 0.45

    if ((!qualityGate && !strategicPreparationGate) || (!omenGate && battleSignal < 0.42 && !strategicPreparationGate)) {
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

export function getCampaignMomentumSurface(
    round: number,
    shuMomentum: number,
    huainanMomentum: number,
): CampaignMomentumSurface {
    const theater = getCampaignMomentumTheater(round)
    const value = theater === 'shu' ? shuMomentum : huainanMomentum
    const label = getCampaignMomentumLabel(normalizeMomentumValue(value))

    return {
        theater,
        theaterLabel: theater === 'shu' ? '蜀地方向' : '淮南方向',
        value,
        label,
        summary: getCampaignMomentumSummary(label),
    }
}

export function explainCampaignMomentumContribution(
    input: CampaignMomentumContributionSnapshot,
): string {
    const theater = input.theater ?? getCampaignMomentumTheater(input.round)
    const theaterLabel = theater === 'shu' ? '蜀地方向' : '淮南方向'
    const success = input.success ?? input.gain > 0

    if (!success || input.gain <= 0) {
        const reasons = buildMomentumReasons(input.parse, theater)
        const prefix = reasons.length > 0 ? `${reasons.join('，')}，` : ''
        return `${theaterLabel}：${prefix}但没有真正触及当前战局的关键，战役动量未变。`
    }

    const surfaceLabel = getCampaignMomentumLabel(normalizeMomentumValue(input.after))
    const reasons = buildMomentumReasons(input.parse, theater)
    const prefix = reasons.length > 0 ? `${reasons.join('，')}，` : ''
    return `${theaterLabel}：${prefix}因此战役动量来到「${surfaceLabel}」——${getCampaignMomentumSummary(surfaceLabel)}`
}

export function getCampaignMomentumSummary(label: string): string {
    return MOMENTUM_SUMMARIES[label] ?? '这一步虽然说动了人，但没有真正触及当前战局的关键，战役动量未变。'
}

function getCampaignMomentumTheater(round: number): CampaignMomentumTheater {
    return round <= 10 ? 'shu' : 'huainan'
}

function normalizeMomentumValue(value: number): number {
    return Math.max(0, Math.min(1, value))
}

function buildMomentumReasons(
    parse: NorthSchemeParseResult | null | undefined,
    theater: CampaignMomentumTheater,
): string[] {
    if (!parse) return []

    const reasons: string[] = []

    if (theater === 'shu') {
        if (parse.grainRelevance >= 0.55) reasons.push('粮道与战备被真正撬动')
        if (parse.governanceRelevance >= 0.55) reasons.push('中枢调度与接管线被说到了')
        if (parse.militaryRelevance >= 0.55) reasons.push('前线军令也被带了起来')
    } else {
        if (parse.militaryRelevance >= 0.55) reasons.push('前线军令与渡口攻守被说到了')
        if (parse.grainRelevance >= 0.55) reasons.push('粮道与转运节次被真正撬动')
        if (parse.governanceRelevance >= 0.55) reasons.push('州郡接管与战后稳控也被顾到了')
    }

    if (parse.eventFit >= 0.6) reasons.push('又正对着当前时局')
    if (parse.structuralPenetration >= 0.6) reasons.push('话头也穿到了战局关键处')

    return reasons.slice(0, 3)
}

function roundValue(value: number): number {
    return Math.round(value * 10) / 10
}
