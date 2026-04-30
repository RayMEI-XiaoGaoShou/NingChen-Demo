import type {
    NorthSchemeParseResult,
    NpcMemoryLedger,
    OmenEchoFeedback,
    RelationMemoryLedger,
    SchemeAction,
    SchemeFollowUp,
    SchemeFollowUpAnswerMetadata,
    SchemeFollowUpParseResult,
} from '../game/types'

export interface NpcFeedbackRecord {
    id: string
    npcId: string
    npcName: string
    schemeType: string
    schemeName: string
    playerSpeech: string
    feedback: string
    omenEcho?: OmenEchoFeedback
    isLoading: boolean
    source: string
}

interface AddSchemeState {
    schemeCount: number
    maxSchemes: number
    currentSchemes: SchemeAction[]
}

type AddSchemePatch = Pick<AddSchemeState, 'currentSchemes' | 'schemeCount'>

export function buildAddSchemePatch(state: AddSchemeState, scheme: SchemeAction): AddSchemePatch | null {
    if (state.schemeCount >= state.maxSchemes) return null
    if (state.currentSchemes.some(item => item.targetNpcId === scheme.targetNpcId)) return null

    return {
        currentSchemes: [...state.currentSchemes, scheme],
        schemeCount: state.schemeCount + 1,
    }
}

export function appendNpcFeedback(
    feedbacks: NpcFeedbackRecord[],
    feedback: NpcFeedbackRecord,
): NpcFeedbackRecord[] {
    return [...feedbacks, feedback]
}

export function updateNpcFeedbackText(
    feedbacks: NpcFeedbackRecord[],
    feedbackId: string,
    text: string,
    source?: string,
): NpcFeedbackRecord[] {
    return feedbacks.map(feedback =>
        feedback.id === feedbackId
            ? { ...feedback, feedback: text, isLoading: false, source: source ?? feedback.source }
            : feedback,
    )
}

export function updateNpcFeedbackOmenEcho(
    feedbacks: NpcFeedbackRecord[],
    feedbackId: string,
    omenEcho: OmenEchoFeedback,
): NpcFeedbackRecord[] {
    return feedbacks.map(feedback =>
        feedback.id === feedbackId ? { ...feedback, omenEcho } : feedback,
    )
}

export function markSchemeParsePendingIds(pendingIds: string[], actionId: string): string[] {
    return pendingIds.includes(actionId) ? pendingIds : [...pendingIds, actionId]
}

export function attachNorthSchemeParse(
    schemes: SchemeAction[],
    actionId: string,
    northParse: NorthSchemeParseResult,
): SchemeAction[] {
    return schemes.map(action =>
        action.id === actionId ? { ...action, northParse } : action,
    )
}

export function removePendingSchemeParseId(pendingIds: string[], actionId: string): string[] {
    return pendingIds.filter(id => id !== actionId)
}

export function setSchemeFollowUpOnActions(
    schemes: SchemeAction[],
    actionId: string,
    followUp: SchemeFollowUp,
): SchemeAction[] {
    return schemes.map(action => {
        if (action.id === actionId) return { ...action, followUp }
        if (followUp.status === 'available' && action.followUp?.status === 'available') {
            return { ...action, followUp: undefined }
        }
        return action
    })
}

export function answerSchemeFollowUpOnActions(
    schemes: SchemeAction[],
    actionId: string,
    playerReply: string,
    parse: SchemeFollowUpParseResult,
    finalNpcReply: string,
    metadata: SchemeFollowUpAnswerMetadata = {},
): SchemeAction[] {
    return schemes.map(action => {
        if (action.id !== actionId) return action

        const currentFollowUp = action.followUp
        if (!currentFollowUp) return action

        return {
            ...action,
            followUp: {
                ...currentFollowUp,
                questionText: currentFollowUp.questionText,
                playerReply,
                parse,
                finalNpcReply,
                ...metadata,
                status: 'answered',
            },
        }
    })
}

export function skipSchemeFollowUpOnActions(
    schemes: SchemeAction[],
    actionId: string,
): SchemeAction[] {
    return schemes.map(action => {
        if (action.id !== actionId || !action.followUp) return action

        return {
            ...action,
            followUp: {
                ...action.followUp,
                status: 'skipped',
            },
        }
    })
}

export function patchNpcMemoryLedgerForSchemeNpcAction(
    ledger: NpcMemoryLedger,
    params: {
        action: SchemeAction
        round: number
        previousMotionText?: string | null
        nextMotionText: string
    },
): NpcMemoryLedger {
    const entries = ledger[params.action.targetNpcId]
    if (!entries?.length) return ledger

    const previousSummaryNeedle = params.previousMotionText
        ? stripTailPunctuation(params.previousMotionText)
        : ''
    const nextSummary = buildCausalMemorySummary(params.round, params.nextMotionText)
    let changed = false
    const nextEntries = entries.map(entry => {
        const sameScheme = entry.sourceRound === params.round && entry.schemeType === params.action.schemeType
        if (!sameScheme) return entry
        const isHardCausalMemory = entry.tags?.includes('pressure') && entry.tags?.includes('hard')
        const mentionsPreviousMotion = previousSummaryNeedle.length > 0 && entry.summary.includes(previousSummaryNeedle)
        if (!isHardCausalMemory && !mentionsPreviousMotion) return entry

        changed = true
        return {
            ...entry,
            summary: nextSummary,
        }
    })

    return changed
        ? { ...ledger, [params.action.targetNpcId]: nextEntries }
        : ledger
}

export function patchRelationMemoryLedgerForSchemeNpcAction(
    ledger: RelationMemoryLedger,
    params: {
        action: SchemeAction
        round: number
        nextMotionText: string
    },
): RelationMemoryLedger {
    if (!params.action.relatedNpcId) return ledger
    const entries = ledger[params.action.targetNpcId]
    if (!entries?.length) return ledger

    const nextSummary = buildCausalMemorySummary(params.round, params.nextMotionText)
    let changed = false
    const nextEntries = entries.map(entry => {
        if (
            entry.sourceRound !== params.round
            || entry.holderNpcId !== params.action.targetNpcId
            || entry.subjectNpcId !== params.action.relatedNpcId
        ) {
            return entry
        }

        changed = true
        return {
            ...entry,
            summary: nextSummary,
        }
    })

    return changed
        ? { ...ledger, [params.action.targetNpcId]: nextEntries }
        : ledger
}

function buildCausalMemorySummary(round: number, text: string): string {
    return `第${round}回合，${stripTailPunctuation(text)}。`
}

function stripTailPunctuation(text: string): string {
    return text.replace(/[。！？；，、\s]+$/u, '')
}
