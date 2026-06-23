import type { ExternalActionReport } from './externalActionResolution'
import type { SchemeResult } from './schemeEngine'
import type { BorrowedBladeReport } from './types'
import { classifyBorrowedBladeOutcome, classifyExternalActionOutcome } from './schemePostResolutionOutcome'

export function attachBorrowedBladePostResolution(
    result: SchemeResult,
    report: BorrowedBladeReport,
): SchemeResult {
    const outcomeCode = classifyBorrowedBladeOutcome(report.outcome)
    const actionMechanism = getBorrowedBladeActionMechanism(outcomeCode)
    const damageMechanism = getBorrowedBladeDamageMechanism(outcomeCode)
    const motionText = buildBorrowedBladeMotionText(report, outcomeCode)

    return {
        ...result,
        npcAction: result.npcAction
            ? { ...result.npcAction, text: motionText }
            : { text: motionText, source: 'fallback' },
        causalEvent: {
            ...(result.causalEvent ?? {
                actorNpcId: report.actorNpcId,
                actorNpcName: report.actorNpcName,
                relatedNpcId: report.targetNpcId,
                relatedNpcName: report.targetNpcName,
                schemeType: 'proxy' as const,
                success: result.success,
                motionSource: 'fallback' as const,
                primaryDimensions: [],
                secondaryDimensions: [],
                effectSummary: [],
            }),
            motionText,
            postResolutionEvent: {
                kind: 'borrowed_blade',
                outcome: report.outcome,
                outcomeCode,
                summary: report.summary,
                actionMechanism,
                counterAction: ['御前/帘前处置'],
                damageMechanism,
            },
        },
    }
}

export function attachExternalActionPostResolution(
    result: SchemeResult,
    report: ExternalActionReport,
): SchemeResult {
    if (!result.causalEvent) return result

    const outcomeCode = classifyExternalActionOutcome(report)
    const actionMechanism = getExternalActionMechanism(outcomeCode)
    const counterAction = getExternalCounterAction(outcomeCode)
    const damageMechanism = getExternalDamageMechanism(outcomeCode)
    const motionText = buildExternalActionMotionText(report, outcomeCode)

    return {
        ...result,
        npcAction: result.npcAction
            ? { ...result.npcAction, text: motionText }
            : result.npcAction,
        causalEvent: {
            ...result.causalEvent,
            motionText,
            postResolutionEvent: {
                kind: 'external_action',
                outcome: report.action,
                outcomeCode,
                summary: report.outcome,
                actionMechanism,
                counterAction,
                damageMechanism,
            },
        },
    }
}

type BorrowedBladeOutcomeCode = ReturnType<typeof classifyBorrowedBladeOutcome>
type ExternalActionOutcomeCode = ReturnType<typeof classifyExternalActionOutcome>

function buildBorrowedBladeMotionText(
    report: BorrowedBladeReport,
    outcomeCode: BorrowedBladeOutcomeCode,
): string {
    if (outcomeCode === 'borrowed_blade_executed') {
        return `${report.summary}${report.targetNpcName}旧属、案牍与派系政务随之断档，相关权责一时受阻。`
    }
    if (outcomeCode === 'borrowed_blade_dismissed') {
        return `${report.summary}${report.targetNpcName}府署案牍与旧属人手随之被收，相关职权一时断档。`
    }
    if (outcomeCode === 'borrowed_blade_blocked_by_protection') {
        return `${report.summary}${report.targetNpcName}两边庇护未破，尚未收网，只在朝议中添了一层压力。`
    }
    return `${report.summary}此事未成正式处置，只留下虚张声势与反噬风险。`
}

function buildExternalActionMotionText(
    report: ExternalActionReport,
    outcomeCode: ExternalActionOutcomeCode,
): string {
    if (outcomeCode === 'secession_established') {
        return `${report.outcome}${report.npcName}随即扣留贡赋、另设调度，名义仍奉北周号令，实则州郡自雄；贡赋迟滞、中枢调度不通，使北周相关调度受损。`
    }
    if (outcomeCode === 'secession_hesitation') {
        return `${report.outcome}${report.npcName}未敢明牌，只把贡赋与调令按下观望；地方离心、诏令迟滞，使北周相关调度受损。`
    }
    if (outcomeCode === 'rebellion_established') {
        return `${report.outcome}${report.npcName}起兵后截断驿路，迫使北周改调平叛军；兵粮折损、州县震动，使北周相关调度受损。`
    }
    return `${report.outcome}平叛军虽将其旋即剿灭，北周仍为此折损兵粮、军令改道、州县震动。`
}

function getBorrowedBladeActionMechanism(outcomeCode: BorrowedBladeOutcomeCode): string[] {
    if (outcomeCode === 'borrowed_blade_executed') return ['处决', '收网']
    if (outcomeCode === 'borrowed_blade_dismissed') return ['罢黜', '收权']
    if (outcomeCode === 'borrowed_blade_blocked_by_protection') return ['施压', '尚未收网']
    return []
}

function getBorrowedBladeDamageMechanism(outcomeCode: BorrowedBladeOutcomeCode): string[] {
    if (outcomeCode === 'borrowed_blade_executed' || outcomeCode === 'borrowed_blade_dismissed') {
        return ['职权断档', '派系震动', '政务受阻']
    }
    if (outcomeCode === 'borrowed_blade_blocked_by_protection') {
        return ['两边庇护尚未同时崩塌']
    }
    return []
}

function getExternalActionMechanism(outcomeCode: ExternalActionOutcomeCode): string[] {
    if (outcomeCode === 'secession_established') return ['扣留贡赋', '另设调度', '拖延调令']
    if (outcomeCode === 'secession_hesitation') return ['未敢明牌', '暂观朝局', '按下贡赋']
    if (outcomeCode === 'rebellion_established') return ['起兵', '击退平叛', '截断驿路']
    return ['起兵', '旋即被剿', '平叛折损']
}

function getExternalCounterAction(outcomeCode: ExternalActionOutcomeCode): string[] {
    if (outcomeCode === 'secession_established' || outcomeCode === 'secession_hesitation') {
        return ['追索税粮', '遣吏查问']
    }
    return ['调兵平叛']
}

function getExternalDamageMechanism(outcomeCode: ExternalActionOutcomeCode): string[] {
    if (outcomeCode === 'secession_established') return ['贡赋迟滞', '中枢调度不通', '州郡自雄']
    if (outcomeCode === 'secession_hesitation') return ['地方离心', '诏令迟滞', '调度损耗']
    if (outcomeCode === 'rebellion_established') return ['兵粮折损', '州县震动', '军令改道']
    return ['平叛折损', '兵粮折损', '州县震动']
}
