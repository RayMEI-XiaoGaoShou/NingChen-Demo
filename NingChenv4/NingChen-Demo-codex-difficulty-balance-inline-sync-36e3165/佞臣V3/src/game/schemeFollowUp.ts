import type {
    NorthSchemeParseResult,
    SchemeAction,
    SchemeFollowUp,
    SchemeFollowUpParseResult,
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
    const statementReply = forceStatementReplyText(reply)
    const terminalQuestion = extractTerminalQuestion(reply)
    if (terminalQuestion) return `${statementReply} ${terminalQuestion}`.trim()

    return `${statementReply}（稍作停顿）${fallbackQuestion}`.trim()
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

export function shouldBlockSettlementForFollowUp(actions: SchemeAction[], followUpSubmitting: boolean): boolean {
    if (followUpSubmitting) return true
    return actions.some(action => action.followUp?.status === 'available')
}
