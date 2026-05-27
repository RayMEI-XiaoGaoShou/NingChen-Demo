import { getRoundIntel } from '../data/roundIntel'
import { getRoundPublicStatement, type RoundStatementContext } from '../data/roundPublicStatements'
import {
    getCourtDispositionOpportunity,
    isCourtDispositionTarget,
    normalizeCourtDispositionNpc,
    type CourtDispositionNpc,
} from './courtDisposition'
import { getNpcSelfReference } from './npcVoiceProfile'
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
    const candidates = npcs
        .filter(npc => npc.isAlive && isCourtDispositionTarget(npc.id))
        .map(npc => normalizeCourtDispositionNpc(npc))
        .filter(npc => npc.courtStatus === 'active')
        .map(npc => ({ npc, opportunity: getCourtDispositionOpportunity(npc) }))

    const actionable =
        candidates.find(item => item.opportunity === 'executable')
        ?? candidates.find(item => item.opportunity === 'dismissible')
        ?? candidates.find(item => item.npc.emperorFavor <= 35 || item.npc.empressDowagerFavor <= 35)

    if (!actionable) return null

    if (actionable.opportunity === 'executable') {
        return `另有一人皇帝恩宠与太后眷顾皆尽，两边都不愿保，可处决：${actionable.npc.name}。`
    }
    if (actionable.opportunity === 'dismissible') {
        return `另有一人皇帝恩宠与太后眷顾皆薄，可罢黜：${actionable.npc.name}。`
    }
    return buildSingleFavorAdvisorHint(actionable.npc)
}

function buildSingleFavorAdvisorHint(npc: CourtDispositionNpc): string {
    if (npc.emperorFavor <= 35) return `另有一人御前恩宠已薄，若再失帘前眷顾便可图罢黜：${npc.name}。`
    return `另有一人帘前眷顾将尽，若再失皇帝恩宠便可图罢黜：${npc.name}。`
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

    if (intelDepth >= 2) {
        return buildDeepStatement(publicStatement, intel?.reactions[npc.id], npc, intelDepth)
    }

    return buildHintStatement(publicStatement, intel?.reactions[npc.id], npc)
}

function buildPublicStatement(round: number, npc: NPC, context: RoundStatementContext): string {
    return getRoundPublicStatement(round, npc.name, context)
        ?? '此事尚需再看，不可先把话说满。'
}

function buildHintStatement(base: string, reaction: string | undefined, npc: NPC): string {
    const selfRef = getNpcSelfReference(npc) ?? npc.name
    const clue = trimSentence(reaction || npc.softSpot)
    const careVerb = selfRef === npc.name ? '最在意' : '真正上心的'
    return `${base} 至于${selfRef}${careVerb}，多半还是${clue}。`
}

function buildDeepStatement(base: string, reaction: string | undefined, npc: NPC, intelDepth: number): string {
    const selfRef = getNpcSelfReference(npc) ?? npc.name
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
