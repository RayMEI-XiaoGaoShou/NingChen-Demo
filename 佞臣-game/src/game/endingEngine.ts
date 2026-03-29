import { checkFactionCollapse } from './nationEngine'
import type { EndingNpcFate, EndingReport, Faction, GameResult, NPC } from './types'

export function buildEndingReport(input: {
    gameResult: GameResult
    northPower: number
    southPower: number
    npcs: NPC[]
    factions: Faction[]
    intelProgress: Record<string, number>
    lastSettlement: {
        externalActionReports?: Array<{ npcId: string; npcName: string; action: 'secession' | 'rebellion'; outcome: string }>
        relationshipReports?: Array<{ structureName: string; summary: string }>
        deathKiller?: string | null
        invasionTriggered?: boolean
    } | null
}): EndingReport {
    const powerGap = round(input.southPower - input.northPower)
    const collapses = checkFactionCollapse(input.factions)
    const externalBreaks = input.lastSettlement?.externalActionReports ?? []
    const relationshipBreaks = input.lastSettlement?.relationshipReports ?? []
    const revealedIntel = Object.values(input.intelProgress).reduce((sum, value) => sum + value, 0)

    const tier = resolveTier(
        input.gameResult,
        powerGap,
        collapses.length,
        externalBreaks.length,
        relationshipBreaks.length,
    )

    return {
        title: buildTitle(input.gameResult, tier),
        tier,
        causeSummary: buildCauseSummary(input.gameResult, powerGap, collapses.length, externalBreaks.length, relationshipBreaks.length, input.lastSettlement?.deathKiller ?? null),
        factionOutlook: buildFactionOutlook(input.factions, collapses),
        npcFates: buildNpcFates(input.npcs, input.factions),
        statsSummary: [
            `南陈较北周最终高出 ${signed(powerGap)} 点综合国力`,
            `本局共解锁 ${revealedIntel} 条暗线线索`,
            `外部人物明牌 ${externalBreaks.length} 次，关系结构失衡 ${relationshipBreaks.length} 次`,
        ],
    }
}

function resolveTier(
    gameResult: GameResult,
    powerGap: number,
    collapseCount: number,
    externalBreakCount: number,
    relationshipBreakCount: number,
): EndingReport['tier'] {
    if (gameResult === 'VICTORY') {
        const collapseMomentum = collapseCount + externalBreakCount + relationshipBreakCount
        if (powerGap >= 15 || collapseMomentum >= 3) return '大胜'
        if (powerGap >= 6 || collapseMomentum >= 1) return '稳胜'
        return '险胜'
    }

    if (gameResult === 'DEFEAT_DEATH' || gameResult === 'DEFEAT_INVASION') return '惨败'
    if (powerGap >= -5) return '险败'
    if (powerGap >= -15) return '惜败'
    return '惨败'
}

function buildTitle(gameResult: GameResult, tier: EndingReport['tier']): string {
    if (gameResult === 'VICTORY') return `${tier}收局`
    if (gameResult === 'DEFEAT_DEATH') return `${tier}殒身`
    if (gameResult === 'DEFEAT_INVASION') return `${tier}失守`
    return `${tier}失势`
}

function buildCauseSummary(
    gameResult: GameResult,
    powerGap: number,
    collapseCount: number,
    externalBreakCount: number,
    relationshipBreakCount: number,
    deathKiller: string | null,
): string[] {
    const causes: string[] = []

    if (gameResult === 'DEFEAT_DEATH' && deathKiller) {
        causes.push(`你最终死于 ${deathKiller} 的正式处置链。`)
    }
    if (gameResult === 'DEFEAT_INVASION') {
        causes.push('北周在政治意愿与可战能力同时达标后提前南征。')
    }

    if (collapseCount > 0) {
        causes.push(`终局前已有 ${collapseCount} 条朝堂势力出现崩口或失衡。`)
    }
    if (externalBreakCount > 0) {
        causes.push(`外部强人共有 ${externalBreakCount} 次明牌动作，把地方裂口抬上了台面。`)
    }
    if (relationshipBreakCount > 0) {
        causes.push(`关键关系结构共失衡 ${relationshipBreakCount} 次，朝堂机器开始自行打架。`)
    }

    if (gameResult === 'VICTORY') {
        causes.push(`南陈最终反超北周 ${signed(powerGap)} 点，胜负差距已经足以改写天下判断。`)
    } else if (gameResult === 'DEFEAT_POWER') {
        causes.push(`二十回合结束时，南陈仍落后 ${round(Math.abs(powerGap))} 点综合国力。`)
    }

    return causes.slice(0, 4)
}

function buildFactionOutlook(
    factions: Faction[],
    collapses: Array<{ factionId: string; factionName: string; severity: 'breach' | 'collapse'; reasons: string[]; summary: string }>,
): string[] {
    return factions.map(faction => {
        const collapse = collapses.find(item => item.factionId === faction.id)
        if (collapse) {
            return `${collapse.factionName}：${collapse.reasons.join('、')}，终局已现${collapse.severity === 'collapse' ? '崩盘' : '崩口'}之势。`
        }
        if (faction.courtInfluence >= 65) {
            return `${faction.name}：终局仍握有较强朝堂话语权。`
        }
        if (faction.courtInfluence >= 40) {
            return `${faction.name}：仍有立足之地，但已难独断全局。`
        }
        return `${faction.name}：声势大衰，只能勉强维持存在。`
    })
}

function buildNpcFates(npcs: NPC[], factions: Faction[]): EndingNpcFate[] {
    const focusIds = ['yuwendi', 'hebaqí', 'zuting', 'linghuelvguang', 'hebaboguì', 'erzhulié']
    return focusIds
        .map(id => npcs.find(npc => npc.id === id))
        .filter((npc): npc is NPC => Boolean(npc))
        .map(npc => ({
            npcId: npc.id,
            npcName: npc.name,
            summary: summarizeNpcFate(npc, factions),
        }))
}

function summarizeNpcFate(npc: NPC, factions: Faction[]): string {
    if (!npc.isAlive) {
        return `${npc.name}未能活到终局，被这场权局提前吞没。`
    }
    if (npc.externalStatus === 'rebellion') {
        return `${npc.name}已举兵明牌，终局站上了与朝廷对冲的台面。`
    }
    if (npc.externalStatus === 'secession') {
        return `${npc.name}坐实割据，名义奉朝而实控一方。`
    }

    if (npc.powerBase === 'external') {
        return `${npc.name}仍在边地保有筹码，继续待价而沽。`
    }

    const faction = factions.find(item => item.id === npc.factionId)
    if ((faction?.courtInfluence ?? 0) >= 60) {
        return `${npc.name}所属一线尚能支撑其地位，仍留在终局桌上。`
    }
    return `${npc.name}虽然保住性命，但所属一线已显疲态。`
}

function signed(value: number): string {
    return `${value >= 0 ? '+' : ''}${round(value)}`
}

function round(value: number): number {
    return Math.round(value * 10) / 10
}
