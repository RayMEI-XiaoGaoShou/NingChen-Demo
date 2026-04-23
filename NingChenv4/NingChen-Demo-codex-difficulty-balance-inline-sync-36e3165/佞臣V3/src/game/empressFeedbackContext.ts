import type { NationDimensions, PlayerDangerStage, PolicyAftereffect, PolicyReasonParseResult } from './types'

export type EmpressPolicyDomain = 'military' | 'finance' | 'grain' | 'governance' | 'socialOrder'
export type EmpressReasonQuality = 'high' | 'medium' | 'low'

export interface EmpressFeedbackPolicyReport {
    sourceRound: number
    topic: string
    question: string
    optionLabel: string
    optionContent: string
    reason: string
    effects: Partial<NationDimensions>
    effectSummary: string
    legitimacyTone: 'up' | 'down' | 'steady'
    focusMatched: boolean
    scoringFocus?: string
}

export interface EmpressFeedbackContext {
    sourceRound: number
    topic: string
    question: string
    optionLabel: string
    optionContent: string
    reason: string
    effectSummary: string
    legitimacyTone: 'up' | 'down' | 'steady'
    legitimacySummary: string
    focusMatched: boolean
    scoringFocus?: string
    policyDomain: EmpressPolicyDomain
    policyDomainLabel: string
    reasonQuality: EmpressReasonQuality
    reasonQualitySummary: string
    policyParseSummary: string
    weakestDimension: EmpressPolicyDomain
    weakestDimensionLabel: string
    strongestDimension: EmpressPolicyDomain
    strongestDimensionLabel: string
    recoveringDimension: EmpressPolicyDomain
    recoveringDimensionLabel: string
    statePrioritySummary: string
    northMirrorSummary: string
    warWindow: boolean
    warWindowSummary: string
    playerDangerStage: PlayerDangerStage
    playerPositionSummary: string
    recentAftereffectSummary?: string
}

const DIMENSION_LABELS: Record<EmpressPolicyDomain, string> = {
    military: '军事',
    finance: '财政',
    grain: '粮赋',
    governance: '治理',
    socialOrder: '民生秩序',
}

const TOPIC_DOMAIN_HINTS: Array<{ pattern: RegExp; domain: EmpressPolicyDomain }> = [
    { pattern: /征蜀|征淮南|战役方略|练兵|边镇|战略选择|征蜀方略|淮南战役方略|终局国策/, domain: 'military' },
    { pattern: /战时财政|财政/, domain: 'finance' },
    { pattern: /仓储|粮|流民|灾年/, domain: 'grain' },
    { pattern: /民生|流民|久战之治/, domain: 'socialOrder' },
    { pattern: /新君初政|新地治理|蜀中布局|寺院兼并|情报体制|检籍|非常时体制|经营/, domain: 'governance' },
]

function asPolicyDomain(key: keyof NationDimensions): EmpressPolicyDomain {
    if (key === 'military' || key === 'finance' || key === 'grain' || key === 'governance' || key === 'socialOrder') {
        return key
    }
    return 'governance'
}

function getDominantPositiveDimension(effects: Partial<NationDimensions>): EmpressPolicyDomain {
    const ordered = (Object.entries(effects) as Array<[keyof NationDimensions, number | undefined]>)
        .filter(([, value]) => typeof value === 'number' && value > 0)
        .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))

    return ordered.length > 0 ? asPolicyDomain(ordered[0][0]) : 'governance'
}

function getWeakestAndStrongestDimension(stats: NationDimensions): {
    weakest: EmpressPolicyDomain
    strongest: EmpressPolicyDomain
} {
    const ordered = (Object.entries(stats) as Array<[keyof NationDimensions, number]>)
        .sort(([, a], [, b]) => a - b)
    return {
        weakest: asPolicyDomain(ordered[0][0]),
        strongest: asPolicyDomain(ordered[ordered.length - 1][0]),
    }
}

function resolvePolicyDomain(report: EmpressFeedbackPolicyReport): EmpressPolicyDomain {
    const topic = `${report.topic} ${report.question}`
    const matched = TOPIC_DOMAIN_HINTS.find(item => item.pattern.test(topic))
    if (matched) return matched.domain
    return getDominantPositiveDimension(report.effects)
}

function summarizeReasonQuality(
    parse: PolicyReasonParseResult | null | undefined,
    focusMatched: boolean,
): {
    quality: EmpressReasonQuality
    summary: string
    parseSummary: string
} {
    if (!parse) {
        return {
            quality: 'low',
            summary: '这条附言只把方向略略点到，仍欠一层更细的落地与代价交代。',
            parseSummary: '附言结构：方向略有着落，但论证与落地仍偏薄。',
        }
    }

    const composite =
        parse.focusAlignment * 0.34
        + parse.executionClarity * 0.28
        + parse.costAwareness * 0.2
        + parse.legitimacyAlignment * 0.18

    if (composite >= 0.66 && focusMatched) {
        return {
            quality: 'high',
            summary: '这条附言切中题眼，也把落地与代价说得较明，足够让朕顺势落笔。',
            parseSummary: '附言结构：切题、能落地，也知道代价落在何处。',
        }
    }

    if (composite <= 0.44 || !focusMatched) {
        return {
            quality: 'low',
            summary: '这条附言态度虽明，论证却还偏空，朕可借其意，却不能尽照其笔。',
            parseSummary: '附言结构：方向未必全错，但落点与代价仍说得不够稳。',
        }
    }

    return {
        quality: 'medium',
        summary: '这条附言方向不错，只是仍有一层执行与代价未曾说透，须由朕替你收束。',
        parseSummary: '附言结构：方向可用，但仍要替你把路径和分寸再压实一层。',
    }
}

function describeLegitimacyTone(tone: 'up' | 'down' | 'steady'): string {
    if (tone === 'up') return '名分站得住，可借此收束人心与政理。'
    if (tone === 'down') return '此策虽可行，却更易牵动名分与人心，落笔必须更谨慎。'
    return '此策在名分上无大起落，重心仍在处置本身的轻重缓急。'
}

function describeStatePriority(weakest: EmpressPolicyDomain, warWindow: boolean): string {
    const base = {
        finance: '江南眼下最急的仍是财用，轻易动不得虚名太盛的急策。',
        grain: '江南眼下最急的是粮赋根基，诸策都得先问能不能养得住。',
        military: '江南眼下最急的是兵备，任何良策都要先看能不能撑住前线。',
        socialOrder: '江南眼下最急的是民生秩序，治国不能先把人心逼散。',
        governance: '江南眼下最急的是治理穿透，若诏令落不下去，再好的策也只是纸上。',
    }[weakest]

    return warWindow
        ? `${base}如今又逢兵事将逼到前线，节奏与后勤都比虚张声势更紧。`
        : base
}

function isWarWindowRound(round: number, report: EmpressFeedbackPolicyReport): boolean {
    return round === 10 || round === 16 || /征蜀|征淮南|战役|久战|战略选择|方略/.test(`${report.topic}${report.question}`)
}

function describeWarWindow(warWindow: boolean): string {
    return warWindow
        ? '眼下已是战焦临身之时，节奏、后勤与代价都比空泛气魄更重要。'
        : '眼下尚可先稳国本，再看锋线，不必句句都往战场上赶。'
}

function describePlayerPosition(stage: PlayerDangerStage): string {
    if (stage === 'under_review') {
        return '萧宝颖眼下在北周处境逼仄，回批宜更短、更稳，重在提醒其先自保。'
    }
    if (stage === 'under_watch') {
        return '萧宝颖眼下已在北周被人留意，回批宜更收束，不宜把话说得太满。'
    }
    return '萧宝颖眼下在北周尚可周旋，回批可多一分期许，但仍不能轻许重诺。'
}

export function buildEmpressFeedbackContext(params: {
    currentRound: number
    policyReport: EmpressFeedbackPolicyReport
    policyAftereffect?: PolicyAftereffect | null
    policyParse?: PolicyReasonParseResult | null
    southStatsAfter: NationDimensions
    northEventName: string
    northEventBriefing: string
    northSummary: string
    invasionSummary?: string
    playerDangerStage: PlayerDangerStage
}): EmpressFeedbackContext {
    const policyDomain = resolvePolicyDomain(params.policyReport)
    const { weakest, strongest } = getWeakestAndStrongestDimension(params.southStatsAfter)
    const recovering = getDominantPositiveDimension(params.policyReport.effects)
    const warWindow = isWarWindowRound(params.currentRound, params.policyReport)
    const reasonQuality = summarizeReasonQuality(params.policyParse, params.policyReport.focusMatched)

    return {
        sourceRound: params.policyReport.sourceRound,
        topic: params.policyReport.topic,
        question: params.policyReport.question,
        optionLabel: params.policyReport.optionLabel,
        optionContent: params.policyReport.optionContent,
        reason: params.policyReport.reason,
        effectSummary: params.policyReport.effectSummary,
        legitimacyTone: params.policyReport.legitimacyTone,
        legitimacySummary: describeLegitimacyTone(params.policyReport.legitimacyTone),
        focusMatched: params.policyReport.focusMatched,
        scoringFocus: params.policyReport.scoringFocus,
        policyDomain,
        policyDomainLabel: DIMENSION_LABELS[policyDomain],
        reasonQuality: reasonQuality.quality,
        reasonQualitySummary: reasonQuality.summary,
        policyParseSummary: reasonQuality.parseSummary,
        weakestDimension: weakest,
        weakestDimensionLabel: DIMENSION_LABELS[weakest],
        strongestDimension: strongest,
        strongestDimensionLabel: DIMENSION_LABELS[strongest],
        recoveringDimension: recovering,
        recoveringDimensionLabel: DIMENSION_LABELS[recovering],
        statePrioritySummary: describeStatePriority(weakest, warWindow),
        northMirrorSummary: `北方眼下是《${params.northEventName}》：${params.northEventBriefing} ${params.northSummary}`.trim(),
        warWindow,
        warWindowSummary: describeWarWindow(warWindow),
        playerDangerStage: params.playerDangerStage,
        playerPositionSummary: describePlayerPosition(params.playerDangerStage),
        recentAftereffectSummary: params.policyAftereffect?.summary,
    }
}
