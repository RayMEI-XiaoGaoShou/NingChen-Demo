import type {
    BorrowedBladeDisposalStage,
    BorrowedBladeOutcome,
    BorrowedBladeReport,
    NPC,
    NorthSchemeParseResult,
    SchemeType,
} from './types'

export const BORROWED_BLADE_TARGET_IDS = [
    'zuting',
    'zongai',
    'yuwendi',
    'linghuelvguang',
    'weichimu',
] as const

const DISPOSAL_STAGE_ORDER: BorrowedBladeDisposalStage[] = ['safe', 'questioned', 'isolated', 'disposable']

export function canUseBorrowedBladeDisposalStage(npcId: string): boolean {
    return BORROWED_BLADE_TARGET_IDS.includes(npcId as (typeof BORROWED_BLADE_TARGET_IDS)[number])
}

export function initialBorrowedBladeStages(): Record<string, BorrowedBladeDisposalStage> {
    return Object.fromEntries(
        BORROWED_BLADE_TARGET_IDS.map(id => [id, 'safe']),
    ) as Record<string, BorrowedBladeDisposalStage>
}

export function getBorrowedBladeStage(npc: NPC): BorrowedBladeDisposalStage {
    if (!canUseBorrowedBladeDisposalStage(npc.id)) return 'safe'
    return npc.disposalStage ?? 'safe'
}

export function normalizeBorrowedBladeNpc<T extends NPC>(npc: T): T {
    if (!canUseBorrowedBladeDisposalStage(npc.id)) return npc
    return {
        ...npc,
        disposalStage: npc.disposalStage ?? 'safe',
        deathCause: npc.deathCause ?? null,
        deathByNpcId: npc.deathByNpcId ?? null,
        deathByNpcName: npc.deathByNpcName ?? null,
        deathRound: npc.deathRound ?? null,
    }
}

export function advanceBorrowedBladeStage(
    current: BorrowedBladeDisposalStage,
    input: {
        schemeType: SchemeType
        success: boolean
        transmission: number
        scapegoat: number
        legitimacyCrack: number
        omenPolarity?: NorthSchemeParseResult['omenPolarity']
    },
): BorrowedBladeDisposalStage {
    if (!input.success) return current

    if (input.schemeType === 'slander' && input.transmission >= 0.5) {
        return advanceStage(current, 1)
    }

    if (input.schemeType === 'alienate' && input.transmission >= 0.55) {
        return advanceStage(current, current === 'safe' ? 1 : 2)
    }

    if (input.schemeType === 'frame' && input.scapegoat >= 0.58) {
        return advanceStage(current, current === 'isolated' ? 3 : 2)
    }

    if (
        input.schemeType === 'omen'
        && input.omenPolarity === 'destabilizing'
        && input.legitimacyCrack >= 0.62
    ) {
        return advanceStage(current, current === 'isolated' ? 3 : 2)
    }

    return current
}

export function resolveBorrowedBladeProxy(params: {
    round: number
    actorNpc: NPC
    targetNpc: NPC
    parse: NorthSchemeParseResult
    success: boolean
}): { outcome: BorrowedBladeOutcome; nextStage: BorrowedBladeDisposalStage; kill: boolean; summary: string } | null {
    if (!params.success || !canUseBorrowedBladeDisposalStage(params.targetNpc.id) || !params.targetNpc.isAlive) {
        return null
    }

    const currentStage = getBorrowedBladeStage(params.targetNpc)
    const transmission = params.parse.proxyTransmission ?? 0
    const actorReady = params.actorNpc.trust >= 68 && (params.actorNpc.canExecute || params.actorNpc.militaryPower >= 48)
    const heavyReady = params.actorNpc.trust >= 76 && (params.actorNpc.canExecute || params.actorNpc.militaryPower >= 58)
    const killReady =
        currentStage === 'disposable'
        && params.round >= 10
        && params.actorNpc.trust >= 82
        && transmission >= 0.74
        && (params.actorNpc.canExecute || params.actorNpc.militaryPower >= 62)

    if (!actorReady || transmission < 0.34) {
        return {
            outcome: 'failed',
            nextStage: currentStage,
            kill: false,
            summary: `${params.actorNpc.name}并未真正接过这把刀，${params.targetNpc.name}暂时还没被推上正式处置台面。`,
        }
    }

    if (killReady) {
        return {
            outcome: 'kill',
            nextStage: 'disposable',
            kill: true,
            summary: `${params.actorNpc.name}顺着你铺好的局势与口实，终于把刀落到了${params.targetNpc.name}身上。`,
        }
    }

    if (currentStage === 'isolated' || currentStage === 'disposable') {
        const nextStage = heavyReady && transmission >= 0.58 ? 'disposable' : currentStage
        return {
            outcome: 'heavy',
            nextStage,
            kill: false,
            summary: `${params.actorNpc.name}已被你推到出手边缘，${params.targetNpc.name}眼下已被正式卷入处置链。`,
        }
    }

    const nextStage = currentStage === 'safe' ? 'questioned' : 'isolated'
    return {
        outcome: 'light',
        nextStage,
        kill: false,
        summary: `${params.actorNpc.name}开始顺着你的话把矛头对向${params.targetNpc.name}，但离真正动刀还差一步。`,
    }
}

export function buildBorrowedBladeReport(input: {
    actorNpc: NPC
    targetNpc: NPC
    outcome: BorrowedBladeOutcome
    summary: string
}): BorrowedBladeReport {
    return {
        actorNpcId: input.actorNpc.id,
        actorNpcName: input.actorNpc.name,
        targetNpcId: input.targetNpc.id,
        targetNpcName: input.targetNpc.name,
        outcome: input.outcome,
        summary: input.summary,
    }
}

export function getHighestBorrowedBladeStageLabel(npcs: NPC[]): string | null {
    const dangerous = npcs
        .filter(npc => npc.isAlive && canUseBorrowedBladeDisposalStage(npc.id))
        .map(npc => ({ npc, stage: getBorrowedBladeStage(npc) }))
        .filter(item => item.stage !== 'safe')
        .sort((a, b) => DISPOSAL_STAGE_ORDER.indexOf(b.stage) - DISPOSAL_STAGE_ORDER.indexOf(a.stage))

    if (dangerous.length === 0) return null

    const top = dangerous[0]
    const label =
        top.stage === 'questioned'
            ? '已被盯上'
            : top.stage === 'isolated'
                ? '已被孤立'
                : '已成可处置目标'
    return `${top.npc.name}${label}`
}

function advanceStage(current: BorrowedBladeDisposalStage, minIndex: number): BorrowedBladeDisposalStage {
    const currentIndex = DISPOSAL_STAGE_ORDER.indexOf(current)
    return DISPOSAL_STAGE_ORDER[Math.max(currentIndex, minIndex)]
}
