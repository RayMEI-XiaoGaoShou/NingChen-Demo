import type {
    BorrowedBladeOutcomeCode,
    ExternalActionOutcomeCode,
    PostResolutionOutcomeCode,
    SchemePostResolutionEvent,
} from './schemeCausalEvent'
import type { BorrowedBladeOutcome } from './types'

export function classifyBorrowedBladeOutcome(outcome: BorrowedBladeOutcome): BorrowedBladeOutcomeCode {
    switch (outcome) {
        case 'executed':
            return 'borrowed_blade_executed'
        case 'dismissed':
            return 'borrowed_blade_dismissed'
        case 'pressure':
            return 'borrowed_blade_blocked_by_protection'
        default:
            return 'borrowed_blade_failed'
    }
}

export function classifyExternalActionOutcome(input: {
    action: 'secession' | 'rebellion'
    outcome?: string
    outcomeCode?: ExternalActionOutcomeCode | string
}): ExternalActionOutcomeCode {
    if (isExternalActionOutcomeCode(input.outcomeCode)) return input.outcomeCode

    const outcome = input.outcome ?? ''
    if (input.action === 'secession') {
        return /未敢明牌|暂观朝局|仍未敢|离心更重/u.test(outcome)
            ? 'secession_hesitation'
            : 'secession_established'
    }

    return /旋即|所剿|被剿|未坐大/u.test(outcome)
        ? 'rebellion_crushed'
        : 'rebellion_established'
}

export function resolvePostResolutionOutcomeCode(
    event: SchemePostResolutionEvent | null | undefined,
): PostResolutionOutcomeCode | null {
    if (!event) return null
    if (isPostResolutionOutcomeCode(event.outcomeCode)) return event.outcomeCode

    if (event.kind === 'borrowed_blade') {
        return classifyBorrowedBladeOutcome(event.outcome as BorrowedBladeOutcome)
    }

    if (event.outcome === 'secession' || event.outcome === 'rebellion') {
        return classifyExternalActionOutcome({
            action: event.outcome,
            outcome: event.summary,
        })
    }

    return null
}

function isPostResolutionOutcomeCode(value: unknown): value is PostResolutionOutcomeCode {
    return isBorrowedBladeOutcomeCode(value) || isExternalActionOutcomeCode(value)
}

function isBorrowedBladeOutcomeCode(value: unknown): value is BorrowedBladeOutcomeCode {
    return value === 'borrowed_blade_failed'
        || value === 'borrowed_blade_blocked_by_protection'
        || value === 'borrowed_blade_dismissed'
        || value === 'borrowed_blade_executed'
}

function isExternalActionOutcomeCode(value: unknown): value is ExternalActionOutcomeCode {
    return value === 'secession_established'
        || value === 'secession_hesitation'
        || value === 'rebellion_established'
        || value === 'rebellion_crushed'
}
