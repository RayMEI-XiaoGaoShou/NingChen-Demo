import { getRoundIntel } from '../data/roundIntel'
import { getRoundPublicStatement, type RoundStatementContext } from '../data/roundPublicStatements'
import { getHighestBorrowedBladeStageLabel } from './borrowedBladeEngine'
import type { NPC } from './types'

type HintNpc = Pick<NPC, 'id' | 'name' | 'isAlive'>

export function getHighlightedNpcIds(round: number, npcs: HintNpc[]): string[] {
    const intel = getRoundIntel(round)
    if (!intel) return []

    const aliveIds = new Set(npcs.filter(npc => npc.isAlive).map(npc => npc.id))
    return intel.coreNpcIds.filter(id => aliveIds.has(id))
}

export function buildAdvisorHint(
    input: { coreNpcIds: string[]; reactions: Record<string, string> },
    npcs: HintNpc[],
): string {
    const aliveLookup = new Map(npcs.filter(npc => npc.isAlive).map(npc => [npc.id, npc]))
    const aliveCore = input.coreNpcIds
        .map(id => aliveLookup.get(id))
        .filter((npc): npc is HintNpc => Boolean(npc))

    if (aliveCore.length === 0) {
        return '冯道之密语【朝局】：今朝明线纷乱，先看谁还站得稳，再顺着最先露出的裂缝下手。'
    }

    const focusNames = aliveCore.slice(0, 3).map(npc => npc.name).join('、')
    const leads = aliveCore.slice(0, 3).map(npc => {
        const reaction = trimSentence(input.reactions[npc.id] ?? '各怀算盘，未必与表面言辞相同')
        return `${npc.name}：${reaction}`
    })

    return `冯道之密语【朝局】：此回合先盯 ${focusNames}。${leads.join('；')}。`
}

export function getRoundAdvisorHint(round: number, npcs: HintNpc[], externalStageHint?: string | null): string {
    const intel = getRoundIntel(round)
    const borrowedBladeHint = buildBorrowedBladeAdvisorHint(npcs as NPC[])

    if (!intel) {
        const fallback = '冯道之密语【朝局】：局势未明，先看谁最急、谁最稳，再沿着人心裂处落子。'
        return [fallback, externalStageHint, borrowedBladeHint].filter(Boolean).join(' ')
    }

    const baseHint = buildAdvisorHint(
        {
            coreNpcIds: intel.coreNpcIds,
            reactions: intel.reactions as Record<string, string>,
        },
        npcs,
    )

    return [baseHint, externalStageHint, borrowedBladeHint].filter(Boolean).join(' ')
}

export function buildBorrowedBladeAdvisorHint(npcs: NPC[]): string | null {
    const label = getHighestBorrowedBladeStageLabel(npcs)
    return label ? `另有一人已被推到借刀边缘：${label}。` : null
}

export function getNpcRoundReaction(
    round: number,
    npc: NPC,
    intelDepth = 0,
    context: RoundStatementContext = {},
): string {
    const intel = getRoundIntel(round)
    const publicStatement = buildPublicStatement(round, npc, context)

    if (intelDepth <= 0) {
        return publicStatement
    }

    if (intelDepth >= 3) {
        return buildDeepStatement(publicStatement, intel?.reactions[npc.id], npc, intelDepth)
    }

    return buildHintStatement(publicStatement, intel?.reactions[npc.id], npc)
}

function buildPublicStatement(round: number, npc: NPC, context: RoundStatementContext): string {
    return getRoundPublicStatement(round, npc.name, context)
        ?? '此事尚需再看，不可先把话说满。'
}

function buildHintStatement(base: string, reaction: string | undefined, npc: NPC): string {
    const selfRef = getSelfReference(npc)
    const clue = trimSentence(reaction || npc.softSpot)
    const careVerb = selfRef === npc.name ? '最在意' : '真正上心的'
    return `${base} 至于${selfRef}${careVerb}，多半还是${clue}。`
}

function buildDeepStatement(base: string, reaction: string | undefined, npc: NPC, intelDepth: number): string {
    const selfRef = getSelfReference(npc)
    const reactionClue = trimSentence(reaction || npc.publicStance)
    const secretIndex = Math.min(intelDepth - 1, Math.max(npc.secretThreads.length - 1, 0))
    const secretClue = trimSentence(npc.secretThreads[secretIndex] || npc.triggerPoint)
    const memoryVerb = selfRef === npc.name ? '不会轻易忘' : '从不会轻易忘'
    const planVerb = selfRef === npc.name ? '心里真正盘算的' : '真正盘算的'
    return `${base} ${selfRef}${planVerb}，往往还在${reactionClue}；至于${secretClue}这层旧账，${selfRef}${memoryVerb}。`
}

function trimSentence(text: string): string {
    const first = text
        .replace(/[“”"']/g, '')
        .split(/[；。！？]/)[0]
        ?.trim() ?? ''

    if (!first) return '眼前这盘棋的轻重'
    return first
}

function matchesNpc(npc: NPC, options: { ids?: string[]; names?: string[] }): boolean {
    const id = npc.id.toLowerCase()
    return (
        options.ids?.some(candidate => id === candidate.toLowerCase()) ||
        options.names?.includes(npc.name) ||
        false
    )
}

function getSelfReference(npc: NPC): string {
    if (matchesNpc(npc, { ids: ['yuwendi'], names: ['宇文棣'] })) return '孤'
    if (matchesNpc(npc, { ids: ['hebaqi', 'hebaqí'], names: ['贺拔琪'] })) return '本宫'
    if (matchesNpc(npc, { ids: ['zuting'], names: ['祖廷'] })) return '本相'
    if (
        matchesNpc(npc, {
            ids: ['linghuelvguang', 'hebabogui', 'hebaboguì', 'weichimu', 'weichimù'],
            names: ['令狐律光', '贺拔伯圭', '尉迟暮'],
        })
    ) {
        return '本公'
    }
    if (matchesNpc(npc, { ids: ['zongai'], names: ['宗艾'] })) return '奴婢'
    if (matchesNpc(npc, { ids: ['duguwenyue'], names: ['独孤文约'] })) return '本侯'
    if (matchesNpc(npc, { ids: ['erzhulie', 'erzhulié'], names: ['尔朱烈'] })) return '本节度'
    if (matchesNpc(npc, { ids: ['ansiming'], names: ['安思明'] })) return '本节帅'
    return npc.name
}
