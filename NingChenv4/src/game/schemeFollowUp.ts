import type {
    NorthSchemeParseResult,
    SchemeAction,
    SchemeFollowUp,
    SchemeFollowUpParseResult,
    SchemeType,
} from './types'

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
}

function toFiniteNumber(value: unknown, fallback = 0): number {
    const numeric = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(numeric) ? numeric : fallback
}

function cleanEvidence(input: unknown): string[] {
    if (!Array.isArray(input)) return []
    return input
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map(item => item.trim())
        .slice(0, 3)
}

export function normalizeSchemeFollowUpParse(input: unknown): SchemeFollowUpParseResult {
    const candidate = (input ?? {}) as Partial<SchemeFollowUpParseResult>
    return {
        clarificationFit: clamp(toFiniteNumber(candidate.clarificationFit), 0, 1),
        npcInterestFit: clamp(toFiniteNumber(candidate.npcInterestFit), 0, 1),
        pressureControl: clamp(toFiniteNumber(candidate.pressureControl), 0, 1),
        contradictionRisk: clamp(toFiniteNumber(candidate.contradictionRisk), 0, 1),
        exposureRiskDelta: clamp(toFiniteNumber(candidate.exposureRiskDelta), -0.12, 0.18),
        successRateDelta: clamp(toFiniteNumber(candidate.successRateDelta), -0.08, 0.12),
        effectMultiplierDelta: clamp(toFiniteNumber(candidate.effectMultiplierDelta), -0.1, 0.18),
        evidence: cleanEvidence(candidate.evidence),
    }
}

export function getSchemeFollowUpEffectMultiplier(followUp?: SchemeFollowUp): number {
    if (followUp?.status !== 'answered' || !followUp.parse) {
        return 1
    }

    return clamp(1 + followUp.parse.effectMultiplierDelta, 0.9, 1.18)
}

export function getSchemeFollowUpSuccessRateDelta(followUp?: SchemeFollowUp): number {
    if (followUp?.status !== 'answered' || !followUp.parse) {
        return 0
    }

    return followUp.parse.successRateDelta
}

export type SchemeFollowUpImpactTone = 'positive' | 'neutral' | 'negative'

export interface SchemeFollowUpImpactPresentation {
    tone: SchemeFollowUpImpactTone
    text: string
}

export function getSchemeFollowUpImpactPresentation(followUp?: SchemeFollowUp): SchemeFollowUpImpactPresentation | null {
    if (followUp?.status !== 'answered' || !followUp.parse) return null

    const parse = followUp.parse
    const impactScore =
        parse.successRateDelta * 3 +
        parse.effectMultiplierDelta * 2 +
        (parse.clarificationFit - 0.5) * 0.24 +
        (parse.npcInterestFit - 0.5) * 0.2 +
        (parse.pressureControl - 0.5) * 0.18 -
        parse.contradictionRisk * 0.28 -
        Math.max(0, parse.exposureRiskDelta) * 1.4

    if (impactScore >= 0.08) {
        return {
            tone: 'positive',
            text: '补答贴住对方关切，此计更容易落地。',
        }
    }

    if (impactScore <= -0.08) {
        return {
            tone: 'negative',
            text: '补答露出破绽，对方疑心反而更重。',
        }
    }

    return {
        tone: 'neutral',
        text: '补答稳住了话头，计谋仍按原势推进。',
    }
}

export function applySchemeFollowUpToNorthParse(
    baseParse: NorthSchemeParseResult,
    followUp?: SchemeFollowUp,
): NorthSchemeParseResult {
    const baseEvidence = [...baseParse.evidence]

    if (followUp?.status !== 'answered' || !followUp.parse) {
        return {
            ...baseParse,
            evidence: baseEvidence,
        }
    }

    const parse = followUp.parse
    const mergedEvidence = Array.from(
        new Set([...baseEvidence, ...parse.evidence].filter((item): item is string => typeof item === 'string' && item.trim().length > 0)),
    ).slice(0, 3)

    return {
        ...baseParse,
        characterFit: clamp(
            baseParse.characterFit + (parse.clarificationFit - 0.5) * 0.08 + (parse.npcInterestFit - 0.5) * 0.05 - parse.contradictionRisk * 0.03,
            0,
            1,
        ),
        eventFit: clamp(
            baseParse.eventFit + (parse.clarificationFit + parse.npcInterestFit) * 0.03 - parse.contradictionRisk * 0.02,
            0,
            1,
        ),
        structuralPenetration: clamp(
            baseParse.structuralPenetration + (parse.pressureControl - 0.5) * 0.04 + (parse.clarificationFit - 0.5) * 0.02 - parse.contradictionRisk * 0.02,
            0,
            1,
        ),
        executability: clamp(baseParse.executability + parse.pressureControl * 0.06 - parse.contradictionRisk * 0.05, 0, 1),
        exposureRisk: clamp(baseParse.exposureRisk + parse.exposureRiskDelta, 0, 1),
        evidence: mergedEvidence,
    }
}

export function extractFinalQuestion(reply: string): string | null {
    const trimmed = reply.trim()
    if (!trimmed) return null

    const questionMarks = ['?', '\uFF1F']
    const boundaryPunctuation = ['.', '!', '?', '\u3002', '\uFF01', '\uFF1F', '\n', '\r']
    const lastQuestionIndex = Math.max(...questionMarks.map(mark => trimmed.lastIndexOf(mark)))
    if (lastQuestionIndex < 0) return null

    let startIndex = 0
    for (let index = lastQuestionIndex - 1; index >= 0; index -= 1) {
        const char = trimmed[index]
        if (boundaryPunctuation.includes(char)) {
            startIndex = index + 1
            break
        }
    }

    return trimmed.slice(startIndex, lastQuestionIndex + 1).trim()
}

function stripTrailingClosers(text: string): string {
    return text.replace(/[\s"'”’）》】]+$/g, '').trim()
}

function closeAsStatement(text: string): string {
    const trimmed = text.trim()
    if (!trimmed) return ''
    if (/[。.!！；;]$/.test(trimmed)) return trimmed
    if (/[,，、:：…-]+$/.test(trimmed)) return `${trimmed.replace(/[,，、:：…-]+$/g, '')}。`
    return `${trimmed}。`
}

export function extractTerminalQuestion(reply: string): string | null {
    const trimmed = stripTrailingClosers(reply)
    const finalQuestion = extractFinalQuestion(trimmed)
    if (!finalQuestion) return null

    return trimmed.endsWith(finalQuestion)
        ? finalQuestion.replace(/^（[^）]{1,16}）/, '').trim()
        : null
}

export function forceStatementReplyText(reply: string): string {
    const trimmed = reply.trim()
    const terminalQuestion = extractTerminalQuestion(trimmed)
    if (!terminalQuestion) return closeAsStatement(trimmed)

    const questionStart = trimmed.lastIndexOf(terminalQuestion)
    const beforeQuestion = questionStart > 0 ? trimmed.slice(0, questionStart) : ''
    const lastStatementBoundary = Math.max(
        beforeQuestion.lastIndexOf('。'),
        beforeQuestion.lastIndexOf('.'),
        beforeQuestion.lastIndexOf('！'),
        beforeQuestion.lastIndexOf('!'),
        beforeQuestion.lastIndexOf('；'),
        beforeQuestion.lastIndexOf(';'),
    )
    const statement = lastStatementBoundary >= 0
        ? beforeQuestion.slice(0, lastStatementBoundary + 1)
        : beforeQuestion.replace(/[,，、:：…-]+$/g, '')

    if (statement || questionStart > 0) {
        return closeAsStatement(statement || trimmed.slice(0, questionStart))
    }

    const questionMarkIndex = Math.max(trimmed.lastIndexOf('?'), trimmed.lastIndexOf('\uFF1F'))
    const questionPrefix = questionMarkIndex >= 0 ? trimmed.slice(0, questionMarkIndex) : trimmed
    const clauseBoundary = Math.max(
        questionPrefix.lastIndexOf('，'),
        questionPrefix.lastIndexOf(','),
        questionPrefix.lastIndexOf('、'),
        questionPrefix.lastIndexOf('：'),
        questionPrefix.lastIndexOf(':'),
    )

    return closeAsStatement(clauseBoundary > 0 ? questionPrefix.slice(0, clauseBoundary) : questionPrefix)
}

export function forceQuestionCandidateReplyText(reply: string, fallbackQuestion: string): string {
    const terminalQuestion = extractTerminalQuestion(reply)
    if (terminalQuestion) return `${forceStatementReplyText(reply)} ${terminalQuestion}`.trim()

    const embeddedQuestion = extractFinalQuestion(reply)
    if (embeddedQuestion) {
        const statementReply = forceStatementReplyText(removeQuestionSegment(reply, embeddedQuestion))
        return `${statementReply} ${embeddedQuestion}`.trim()
    }

    return `${forceStatementReplyText(reply)} ${fallbackQuestion}`.trim()
}

function removeQuestionSegment(reply: string, question: string): string {
    const questionStart = reply.lastIndexOf(question)
    if (questionStart < 0) return reply

    return `${reply.slice(0, questionStart)}${reply.slice(questionStart + question.length)}`.trim()
}

function removeAllQuestionSegments(reply: string): string {
    let next = reply
    let guard = 0

    while (guard < 6) {
        const question = extractFinalQuestion(next)
        if (!question) return next

        const stripped = removeQuestionSegment(next, question)
        if (stripped === next) return next
        next = stripped
        guard += 1
    }

    return next
}

export function sanitizeSchemeFollowUpFinalReplyText(reply: string): string {
    const cleaned = reply
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/[\r\n]+/g, ' ')
        .replace(/\bJSON\b/gi, '')
        .replace(/\bsystem\b/gi, '')
        .trim()

    if (!cleaned) return ''
    if (/[{}\[\]`]/.test(cleaned)) return ''

    const statementOnly = closeAsStatement(removeAllQuestionSegments(cleaned))
        .replace(/^[\s"'“”‘’）)》]+/u, '')
        .trim()
    if (!statementOnly || /[?？]/.test(statementOnly)) return ''

    return statementOnly
}

type FollowUpAnchorDimension = 'finance' | 'grain' | 'military' | 'socialOrder' | 'governance'

function getDominantFollowUpDimension(parse?: NorthSchemeParseResult): FollowUpAnchorDimension | null {
    if (!parse) return null

    const dimensions: Array<{ dimension: FollowUpAnchorDimension; relevance: number }> = [
        { dimension: 'finance', relevance: parse.financeRelevance },
        { dimension: 'grain', relevance: parse.grainRelevance },
        { dimension: 'military', relevance: parse.militaryRelevance },
        { dimension: 'socialOrder', relevance: parse.socialOrderRelevance },
        { dimension: 'governance', relevance: parse.governanceRelevance },
    ]
    const best = dimensions.reduce((current, candidate) => candidate.relevance > current.relevance ? candidate : current)

    return best.relevance >= 0.45 ? best.dimension : null
}

function pickFollowUpAnchor(playerSpeech = '', parse?: NorthSchemeParseResult): string {
    if (/粮|粟|仓|漕|运|饷|军需/.test(playerSpeech)) return '粮道与军需'
    if (/兵|军|械|营|关|戍|调度|征发/.test(playerSpeech)) return '军令与兵械'
    if (/账|度支|库|钱|税|户籍|支账/.test(playerSpeech)) return '度支账册'
    if (/州|县|吏|文书|诏|政令|案牍/.test(playerSpeech)) return '州县文书'
    if (/谣|口供|证词|人证|旧案|案/.test(playerSpeech)) return '口供案牍'
    if (/民|士心|人心|风声|流言/.test(playerSpeech)) return '人心风声'

    switch (getDominantFollowUpDimension(parse)) {
        case 'grain':
            return '粮道与军需'
        case 'military':
            return '军令与兵械'
        case 'finance':
            return '度支账册'
        case 'governance':
            return '州县文书'
        case 'socialOrder':
            return '人心风声'
        default:
            return '实据与落点'
    }
}

export function buildContextualFallbackFollowUpQuestion(params: {
    schemeType: SchemeType
    targetNpcName?: string
    relatedNpcName?: string | null
    playerSpeech?: string
    northParse?: NorthSchemeParseResult
}): string {
    const anchor = pickFollowUpAnchor(params.playerSpeech, params.northParse)
    const targetName = params.targetNpcName?.trim() || '此人'
    const relatedName = params.relatedNpcName?.trim()

    switch (params.schemeType) {
        case 'probe':
            return `你既把话递到这里，先拿哪一处${anchor}来试我的虚实？`
        case 'advise':
            return `若真按你这策走，第一刀该落在哪一处${anchor}上？`
        case 'slander':
            return relatedName
                ? `你要我疑到${relatedName}身上，先拿哪一处${anchor}作实据？`
                : `你要我起疑，先拿哪一处${anchor}作实据？`
        case 'alienate':
            return relatedName
                ? `若要撬开我与${relatedName}之间的裂缝，先从哪一处${anchor}下手？`
                : `若要撬开这层嫌隙，先从哪一处${anchor}下手？`
        case 'frame':
            return `${targetName}若要自露破绽，你准备先把哪一处${anchor}递到案前？`
        case 'proxy':
            return relatedName
                ? `若要借势压向${relatedName}，你要我先把哪一处${anchor}递到御前？`
                : `若要借势收网，你要我先把哪一处${anchor}递到御前？`
        case 'appeal':
            return `你来求援，最先要我替你扛住哪一处${anchor}的风险？`
        case 'omen':
            return `${targetName}若被这句谶语缠住，先会在哪一处${anchor}上失措？`
        case 'secession':
            return `若真要自保割据，第一步是扣住哪一处${anchor}？`
        case 'rebellion':
            return `若真要起事，第一声军令该落在哪一处${anchor}？`
        default:
            return `你这番话，最先要我盯住哪一处${anchor}？`
    }
}

function getSchemeTypeBonus(action: SchemeAction): number {
    switch (action.schemeType) {
        case 'probe':
            return 0.1
        case 'advise':
            return 0.09
        case 'slander':
            return 0.08
        case 'alienate':
            return 0.08
        case 'frame':
            return 0.07
        case 'proxy':
            return 0.06
        case 'omen':
            return 0.05
        default:
            return 0
    }
}

function getNorthParseQuality(parse: NorthSchemeParseResult): number {
    return clamp(
        parse.characterFit * 0.24 +
            parse.eventFit * 0.22 +
            parse.structuralPenetration * 0.18 +
            parse.executability * 0.22 +
            (1 - parse.exposureRisk) * 0.14,
        0,
        1,
    )
}

export function selectSchemeFollowUpCandidateId(actions: SchemeAction[]): string | null {
    let bestId: string | null = null
    let bestScore = 0.25

    for (const action of actions) {
        if (!action.id || !action.northParse || action.followUp) continue

        const quality = getNorthParseQuality(action.northParse)
        const proximityScore = 1 - Math.min(1, Math.abs(quality - 0.56) / 0.56)
        const extremePenalty = quality > 0.8
            ? (quality - 0.8) * 1.5
            : quality < 0.32
                ? (0.32 - quality) * 1.5
                : 0
        const score = proximityScore + getSchemeTypeBonus(action) - extremePenalty

        if (score > bestScore) {
            bestScore = score
            bestId = action.id
        }
    }

    return bestId
}

export function selectRequiredSchemeFollowUpCandidateId(actions: SchemeAction[]): string | null {
    return selectSchemeFollowUpCandidateId(actions) ?? actions.find(action =>
        Boolean(action.id && action.northParse && !action.followUp)
    )?.id ?? null
}

export function getVisibleAvailableSchemeFollowUpId(
    actions: Array<{ id?: string; followUp?: { status: SchemeFollowUp['status'] } }>,
): string | null {
    const hasResolvedFollowUp = actions.some(action =>
        action.followUp?.status === 'answered' || action.followUp?.status === 'skipped'
    )
    if (hasResolvedFollowUp) return null

    return actions.find(action =>
        Boolean(action.id && action.followUp?.status === 'available')
    )?.id ?? null
}

export function shouldBlockSettlementForFollowUp(actions: SchemeAction[], followUpSubmitting: boolean): boolean {
    if (followUpSubmitting) return true
    return Boolean(getVisibleAvailableSchemeFollowUpId(actions))
}
