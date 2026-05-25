import type { SchemePostResolutionEvent } from './schemeCausalEvent'
import { resolvePostResolutionOutcomeCode } from './schemePostResolutionOutcome'

export interface PostResolutionNarrativeValidation {
    accepted: boolean
    reasons: string[]
}

export function validatePostResolutionNarrative(input: {
    text: string
    postResolutionEvent?: SchemePostResolutionEvent | null
}): PostResolutionNarrativeValidation {
    const event = input.postResolutionEvent
    const outcomeCode = resolvePostResolutionOutcomeCode(event)
    if (!event || !outcomeCode) return { accepted: true, reasons: [] }

    const text = input.text.trim()
    const reasons: string[] = []

    switch (outcomeCode) {
        case 'borrowed_blade_executed':
            if (!hasBorrowedBladeExecution(text)) reasons.push('missing_borrowed_blade_executed_outcome')
            break
        case 'borrowed_blade_dismissed':
            if (hasBorrowedBladeExecution(text)) reasons.push('overstated_borrowed_blade_execution')
            if (!hasBorrowedBladeDismissal(text)) reasons.push('missing_borrowed_blade_dismissed_outcome')
            break
        case 'borrowed_blade_blocked_by_protection':
            if (hasBorrowedBladeFormalDisposal(text)) reasons.push('blocked_borrowed_blade_overstated_as_disposal')
            if (!hasBorrowedBladeBlockedProtection(text)) reasons.push('missing_borrowed_blade_blocked_protection')
            break
        case 'borrowed_blade_failed':
            if (hasBorrowedBladeFormalDisposal(text)) reasons.push('failed_borrowed_blade_overstated_as_disposal')
            break
        case 'secession_established':
            if (hasOpenRebellionOrUsurpation(text)) reasons.push('secession_overstated_as_rebellion')
            if (!hasSecessionBoundary(text)) reasons.push('missing_secession_boundary')
            if (!hasSecessionMechanism(text)) reasons.push('missing_secession_mechanism')
            break
        case 'secession_hesitation':
            if (hasEstablishedSecessionOrRebellion(text)) reasons.push('secession_hesitation_overstated')
            if (!hasSecessionHesitation(text)) reasons.push('missing_secession_hesitation')
            break
        case 'rebellion_established':
            if (hasCrushedRebellion(text)) reasons.push('established_rebellion_written_as_crushed')
            if (!hasRebellionConflict(text)) reasons.push('missing_rebellion_conflict')
            break
        case 'rebellion_crushed':
            if (hasEstablishedRebellionOutcome(text)) reasons.push('crushed_rebellion_reversed_as_established')
            if (!hasRebellionConflict(text) || !hasCrushedRebellion(text)) reasons.push('missing_crushed_rebellion_outcome')
            break
        default:
            break
    }

    return { accepted: reasons.length === 0, reasons }
}

function hasBorrowedBladeExecution(text: string): boolean {
    return /处决|伏诛|赐死|弃市|收网|落下最后一手/u.test(text)
}

function hasBorrowedBladeDismissal(text: string): boolean {
    return /罢黜|免职|夺职|收权|府署被收|案牍.*被收|正式罢黜/u.test(text)
}

function hasBorrowedBladeFormalDisposal(text: string): boolean {
    return hasBorrowedBladeExecution(text) || hasBorrowedBladeDismissal(text) || /正式收网/u.test(text)
}

function hasBorrowedBladeBlockedProtection(text: string): boolean {
    return /施压|添压|添.*压力|尚未收网|未能收网|庇护未破|庇护尚未|两边庇护|双庇护/u.test(text)
}

function hasOpenRebellionOrUsurpation(text: string): boolean {
    return /称帝|建国|明旗反周|公开反周|起兵|发檄/u.test(text)
}

function hasSecessionBoundary(text: string): boolean {
    return /名义.*(?:北周|朝廷|号令)|明面仍奉|仍奉(?:北周|朝廷)|尚奉/u.test(text)
}

function hasSecessionMechanism(text: string): boolean {
    return /割据|另设调度|扣留贡赋|私置|州郡自雄|地方自雄|实则/u.test(text)
}

function hasSecessionHesitation(text: string): boolean {
    return /未敢明牌|暂观朝局|仍未敢|离心|观望|按下/u.test(text)
}

function hasEstablishedSecessionOrRebellion(text: string): boolean {
    return /坐实.*割据|已成割据|起兵|发檄|明旗反周|公开反周|击退平叛/u.test(text)
}

function hasRebellionConflict(text: string): boolean {
    return /起兵|发檄|截断驿路|据守关隘|击退平叛|明旗反周|割据一方|平叛|被剿/u.test(text)
}

function hasCrushedRebellion(text: string): boolean {
    return /被剿|旋即|平叛军|未坐大|折损兵粮|平叛折损|剿灭/u.test(text)
}

function hasEstablishedRebellionOutcome(text: string): boolean {
    return /击退平叛|割据一方|明旗反周之势已成|坐大成势|已坐大/u.test(text)
}
