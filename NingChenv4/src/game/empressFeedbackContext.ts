import type { NationDimensions, PlayerDangerStage, PolicyAftereffect, PolicyReasonParseResult } from './types'
import { adjustConcernOpeningForSafety, getEmpressConcernTemplate, getPlayerDangerConcernOverlay } from './empressConcernTemplates'

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
    worldIntelSummary?: string
    warWindow: boolean
    warWindowSummary: string
    playerDangerStage: PlayerDangerStage
    playerPositionSummary: string
    recentAftereffectSummary?: string
    concernTitle: string
    concernOpening: string
    concernClosingHint: string
    playerConcernOverlay: string
    policyImplementationHint: string
}

const DIMENSION_LABELS: Record<EmpressPolicyDomain, string> = {
    military: '军事',
    finance: '财政',
    grain: '粮赋',
    governance: '治理',
    socialOrder: '民生秩序',
}

const TOPIC_DOMAIN_HINTS: Array<{ pattern: RegExp; domain: EmpressPolicyDomain }> = [
    { pattern: /征蜀|征淮南|战役方略|练兵|边镇|战略选择|征蜀方略|淮南战役方略|北伐总策/, domain: 'military' },
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
        return '此信宜更短、更稳，不明写北边细节，也不把双方关系说满。'
    }
    if (stage === 'under_watch') {
        return '北来书信终究不稳妥，回批宜更收束，不宜把话说得太满。'
    }
    return '可略多一分期许，但仍不能轻许重诺，不写只有萧宝颖才可能知道的北庭细节。'
}

function describePolicyImplementationHint(report: EmpressFeedbackPolicyReport, parse: PolicyReasonParseResult | null | undefined): string {
    const questionText = `${report.topic}${report.question}${report.optionContent}`
    const strongReason = Boolean(parse && parse.focusAlignment >= 0.58 && parse.executionClarity >= 0.5)
    const costAware = Boolean(parse && parse.costAwareness >= 0.52)
    const carefulPrefix = strongReason
        ? '这条附言可转成具体政令：'
        : report.reason.trim()
            ? '这条附言可借其意，但仍需朕替你收束：'
            : '本回合无附言，政令只按所选方向落地：'

    if (/流民|编户|屯田/.test(questionText)) {
        return `${carefulPrefix}令州县先分口粮、再编户籍，把南渡之人安进田亩与差役，不使沿江州郡彼此推诿。`
    }
    if (/灾|赈|粮价|寺院|佛寺/.test(questionText)) {
        return `${carefulPrefix}先开官仓稳人心，再核寺院与豪右所占田户，${costAware ? '给地方留出缓冲，不让赈济变成新怨。' : '但仍要防地方借赈济之名侵吞户籍。'}`
    }
    if (/练兵|军|战|征蜀|淮南|北伐|边镇/.test(questionText)) {
        return `${carefulPrefix}先定粮道与军籍，再责成都督府、州郡诸司分头承办，使兵事有节奏而不至空耗民力。`
    }
    if (/仓|漕|粮道|财政|财赋|国库|度支/.test(questionText)) {
        return `${carefulPrefix}令度支与州县先清账册，再定转运次序，把钱粮从纸面账目压到可调可用的仓廪。`
    }
    if (/情报|密探|耳目|间商/.test(questionText)) {
        return `${carefulPrefix}以边郡、商旅与密探分线取信，先求可核验的北朝动向，不让虚报牵着朝议走。`
    }
    if (/检籍|土断|兼并|田亩|隐户/.test(questionText)) {
        return `${carefulPrefix}先从州县册籍与田亩契据入手，分层核隐户、抑兼并，让清查能落地而不先激起旧族合力反扑。`
    }
    if (/新君|新地|治理|接管|体制|官制/.test(questionText)) {
        return `${carefulPrefix}先定官署责任，再压实州县执行，让诏令不只停在建康案头，也能落到地方。`
    }
    return `${carefulPrefix}先明责任，再定次第，让此策不止是一句方向，而能变成州县和官署可执行的事。`
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
    worldIntelSummary?: string
    invasionSummary?: string
    playerDangerStage: PlayerDangerStage
}): EmpressFeedbackContext {
    const policyDomain = resolvePolicyDomain(params.policyReport)
    const { weakest, strongest } = getWeakestAndStrongestDimension(params.southStatsAfter)
    const recovering = getDominantPositiveDimension(params.policyReport.effects)
    const warWindow = isWarWindowRound(params.currentRound, params.policyReport)
    const reasonQuality = summarizeReasonQuality(params.policyParse, params.policyReport.focusMatched)
    const concern = getEmpressConcernTemplate(params.policyReport.sourceRound)
    const concernOpening = adjustConcernOpeningForSafety(concern.opening, params.playerDangerStage)
    const worldIntelSummary = params.worldIntelSummary?.trim()
    const northMirrorSummary = `北方眼下是《${params.northEventName}》：${params.northEventBriefing} ${params.northSummary}${worldIntelSummary ? ` 北来消息：${worldIntelSummary}` : ''}`.trim()

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
        northMirrorSummary,
        worldIntelSummary,
        warWindow,
        warWindowSummary: describeWarWindow(warWindow),
        playerDangerStage: params.playerDangerStage,
        playerPositionSummary: describePlayerPosition(params.playerDangerStage),
        recentAftereffectSummary: params.policyAftereffect?.summary,
        concernTitle: concern.title,
        concernOpening,
        concernClosingHint: concern.closingHint,
        playerConcernOverlay: getPlayerDangerConcernOverlay(params.playerDangerStage),
        policyImplementationHint: describePolicyImplementationHint(params.policyReport, params.policyParse),
    }
}
