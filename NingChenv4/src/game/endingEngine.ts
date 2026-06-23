import { checkFactionCollapse } from './nationEngine'
import { normalizeCourtDispositionNpc } from './courtDisposition'
import type { EndingNpcFate, EndingReport, Faction, GameResult, NPC } from './types'

const DEATH_ENDING_TITLES: Record<string, string> = {
    祖廷: '鸟尽弓藏',
    宇文棣: '宗室清道',
    令狐律光: '国法无私',
    贺拔琪: '弃子求安',
    贺拔伯圭: '蝼蚁之死',
}

export function buildEndingReport(input: {
    gameResult: GameResult
    currentRound: number
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

    const deathKiller = input.lastSettlement?.deathKiller ?? null
    const sceneLabel = buildSceneLabel(input.gameResult, deathKiller)
    const invasionDriver = input.gameResult === 'DEFEAT_INVASION' ? pickInvasionDriver(input.npcs) : null
    const standoutNpc = input.gameResult === 'VICTORY' ? pickStandoutNpc(input.npcs) : null
    const northFailureSummary = input.gameResult === 'VICTORY'
        ? buildNorthFailureSummary(collapses, externalBreaks, relationshipBreaks, powerGap)
        : null

    return {
        title: buildTitle(input.gameResult, tier, deathKiller),
        tier,
        causeSummary: buildCauseSummary({
            gameResult: input.gameResult,
            powerGap,
            collapseCount: collapses.length,
            externalBreakCount: externalBreaks.length,
            relationshipBreakCount: relationshipBreaks.length,
            deathKiller,
        }),
        factionOutlook: buildFactionOutlook(input.factions, collapses),
        npcFates: buildNpcFates(input.npcs, input.factions),
        statsSummary: [
            `南陈较北周最终高出 ${signed(powerGap)} 点综合国力。`,
            `本局共解锁 ${revealedIntel} 条暗线线索。`,
            `外部军头明牌 ${externalBreaks.length} 次，关系结构失衡 ${relationshipBreaks.length} 次。`,
        ],
        openingLines: buildOpeningLines(input.gameResult, tier, deathKiller, input.currentRound, powerGap),
        epilogueLines: buildEpilogueLines(input.gameResult, tier, deathKiller),
        sceneLabel,
        invasionDriver,
        triggerRound: input.gameResult === 'DEFEAT_INVASION' ? input.currentRound : null,
        standoutNpc,
        northFailureSummary,
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
        if (powerGap >= 5 || collapseMomentum >= 1) return '稳胜'
        return '险胜'
    }

    if (gameResult === 'DEFEAT_DEATH' || gameResult === 'DEFEAT_INVASION') return '惨败'
    if (powerGap > -5) return '险败'
    if (powerGap > -15) return '惜败'
    return '惨败'
}

function buildTitle(gameResult: GameResult, tier: EndingReport['tier'], deathKiller: string | null): string {
    if (gameResult === 'VICTORY') {
        if (tier === '大胜') return '天下归陈'
        if (tier === '稳胜') return '十年一剑'
        return '悬崖之上'
    }

    if (gameResult === 'DEFEAT_POWER') {
        if (tier === '惨败') return '功亏十年'
        if (tier === '惜败') return '一步之遥'
        return '天不假时'
    }

    if (gameResult === 'DEFEAT_INVASION') return '大江东去'

    return DEATH_ENDING_TITLES[deathKiller ?? ''] ?? '身死朝堂'
}

function buildOpeningLines(
    gameResult: GameResult,
    tier: EndingReport['tier'],
    deathKiller: string | null,
    currentRound: number,
    powerGap: number,
): string[] {
    if (gameResult === 'DEFEAT_DEATH') {
        return [
            `建文${currentRound}年，佞臣萧宝颖死于邺城。`,
            `${deathKiller ?? '朝中权臣'}终于收紧了那只悬在你头上的手，将你从局中抹去。`,
            '你经营多年的暗线与心计都来不及交代，只在夜色里一并沉没。',
        ]
    }

    if (gameResult === 'DEFEAT_INVASION') {
        return [
            `建文${currentRound}年秋，北周水陆大军提早南下。`,
            '南陈虽据长江天险，却终究未及养成国力，仓促应敌，处处被动。',
            '江风自东而来，吹散了十年卧薪尝胆的旧愿。',
        ]
    }

    if (gameResult === 'DEFEAT_POWER') {
        const tone =
            tier === '惨败'
                ? '女帝发下北伐之令，却只见人心犹疑、国力未继。'
                : tier === '惜败'
                    ? '你已把北周搅得风雨如晦，却仍差最后一口气。'
                    : '胜负只差临门一脚，偏偏天命不肯再向南朝偏一寸。'

        return [
            '天嘉十年，北伐的号角终究未能吹成定局。',
            tone,
            `二十回合过后，南陈仍落后 ${round(Math.abs(powerGap))} 点综合国力。`,
        ]
    }

    const winTone =
        tier === '大胜'
            ? '北周四方离心，旧有秩序接连崩坍，南陈大军遂得从容北上。'
            : tier === '稳胜'
                ? '十年隐忍终于化作可见胜势，北伐不再只是纸上空谈。'
                : '你是在悬崖边上把局势硬生生掰了回来。'

    return [
        '天嘉十年，女帝一声令下，南陈铁骑渡淮北上。',
        winTone,
        `终局之时，南陈反超北周 ${signed(powerGap)} 点综合国力。`,
    ]
}

function buildEpilogueLines(
    gameResult: GameResult,
    tier: EndingReport['tier'],
    deathKiller: string | null,
): string[] {
    if (gameResult === 'DEFEAT_DEATH') {
        return [
            `南陈女帝闻讯，只知你死于${deathKiller ?? '邺城'}。`,
            '她独坐含章殿，良久无言，只命人撤去案上已经写到一半的北伐草诏。',
        ]
    }

    if (gameResult === 'DEFEAT_INVASION') {
        return [
            '南陈的火光最终映在江面，像一封无人再读的密信。',
            '乱军之中，再无人能为萧宝颖留下名字。',
        ]
    }

    if (gameResult === 'DEFEAT_POWER') {
        return [
            '这十年的布子并非全无价值，只是还不够改写天下。',
            tier === '险败' ? '你已看见彼岸，却终究没能踏上去。' : '史书不会为差一点的人多留一页。',
        ]
    }

    return [
        '含章殿前，女帝亲迎义弟归国。',
        '萧宝颖卸下佞臣之面，十年伪装终于在这一刻尽数落幕。',
    ]
}

function buildSceneLabel(gameResult: GameResult, deathKiller: string | null): string | null {
    if (gameResult !== 'DEFEAT_DEATH') return null
    const title = DEATH_ENDING_TITLES[deathKiller ?? ''] ?? '身死朝堂'
    return `${deathKiller ?? '无名权臣'} · ${title}`
}

function buildCauseSummary(input: {
    gameResult: GameResult
    powerGap: number
    collapseCount: number
    externalBreakCount: number
    relationshipBreakCount: number
    deathKiller: string | null
}): string[] {
    const causes: string[] = []

    if (input.gameResult === 'DEFEAT_DEATH' && input.deathKiller) {
        causes.push(`你的伪装最终被 ${input.deathKiller} 识破，并引来正式处置。`)
    }
    if (input.gameResult === 'DEFEAT_INVASION') {
        causes.push('北周在政治意愿与可战能力同时达标后，提前发起南征。')
    }
    if (input.collapseCount > 0) {
        causes.push(`终局前已有 ${input.collapseCount} 条朝堂势力出现崩口或失衡。`)
    }
    if (input.externalBreakCount > 0) {
        causes.push(`外部军头共有 ${input.externalBreakCount} 次明牌动作，把地方裂口抬上了台面。`)
    }
    if (input.relationshipBreakCount > 0) {
        causes.push(`关键关系结构共失衡 ${input.relationshipBreakCount} 次，北周朝局开始自相撕扯。`)
    }
    if (input.gameResult === 'VICTORY') {
        causes.push(`南陈最终反超北周 ${signed(input.powerGap)} 点，足以改写天下判断。`)
    } else if (input.gameResult === 'DEFEAT_POWER') {
        causes.push(`二十回合结束时，南陈仍落后 ${round(Math.abs(input.powerGap))} 点综合国力。`)
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
            const stateLabel = collapse.severity === 'collapse' ? '崩盘' : '崩口'
            return `${collapse.factionName}：${collapse.reasons.join('、')}，终局已现${stateLabel}之势。`
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
    const focusNames = ['宇文棣', '贺拔琪', '祖廷', '令狐律光', '尉迟暮', '贺拔伯圭', '尔朱烈']
    const focusNpcs = focusNames
        .map(name => npcs.find(npc => npc.name === name))
        .filter((npc): npc is NPC => Boolean(npc))
    const candidates = focusNpcs.length > 0 ? focusNpcs : [...npcs]
        .sort((a, b) => (b.militaryPower + b.trust + b.loyaltyToCourt) - (a.militaryPower + a.trust + a.loyaltyToCourt))
        .slice(0, 6)

    return candidates.map(npc => ({
            npcId: npc.id,
            npcName: npc.name,
            summary: summarizeNpcFateWithBorrowedBlade(npc, factions),
        }))
}

function summarizeNpcFateWithBorrowedBlade(npc: NPC, factions: Faction[]): string {
    const courtNpc = normalizeCourtDispositionNpc(npc)
    if (courtNpc.courtStatus === 'dismissed') {
        return `${courtNpc.name}已被罢黜离席，性命尚存，却不再是终局桌上的执棋人。`
    }
    if (courtNpc.courtStatus === 'executed' || (npc as { deathCause?: string | null }).deathCause === 'court_execution') {
        return `${courtNpc.name}已被处决，${npc.deathByNpcName ?? '太后或御前'}借朝堂名分正式收网。`
    }

    return summarizeNpcFate(npc, factions)
}

function summarizeNpcFate(npc: NPC, factions: Faction[]): string {
    if (!npc.isAlive) {
        return `${npc.name}未能活到终局，被这场权局提前吞没。`
    }
    if (npc.externalStatus === 'rebellion') {
        return `${npc.name}已举兵明旗，终局时站上了与朝廷对冲的台面。`
    }
    if (npc.externalStatus === 'secession') {
        return `${npc.name}坐实割据，名义奉朝而实控一方。`
    }
    if (npc.powerBase === 'external') {
        return `${npc.name}仍在边地保有筹码，继续待价而沽。`
    }

    const faction = factions.find(item => item.id === npc.factionId)
    if ((faction?.courtInfluence ?? 0) >= 60) {
        return `${npc.name}所处一线仍能支撑其地位，依旧留在终局桌上。`
    }
    return `${npc.name}虽保住性命，但所倚一线已显疲态。`
}

function pickInvasionDriver(npcs: NPC[]): string {
    const candidate = [...npcs]
        .filter(npc => npc.isAlive && npc.powerBase === 'court')
        .sort((a, b) => (b.militaryPower + b.trust) - (a.militaryPower + a.trust))[0]

    return candidate?.name ?? '北周南征主战派'
}

function pickStandoutNpc(npcs: NPC[]): string | null {
    const candidate = [...npcs]
        .filter(npc => npc.isAlive)
        .sort((a, b) => (b.trust + b.militaryPower + b.loyaltyToCourt) - (a.trust + a.militaryPower + a.loyaltyToCourt))[0]

    return candidate?.name ?? null
}

function buildNorthFailureSummary(
    collapses: Array<{ factionId: string; factionName: string; severity: 'breach' | 'collapse'; reasons: string[]; summary: string }>,
    externalBreaks: Array<{ npcId: string; npcName: string; action: 'secession' | 'rebellion'; outcome: string }>,
    relationshipBreaks: Array<{ structureName: string; summary: string }>,
    powerGap: number,
): string {
    if (collapses.length > 0) {
        return `${collapses[0].factionName}率先失衡，北周中枢自此再难捏合。`
    }
    if (externalBreaks.length > 0) {
        return `${externalBreaks[0].npcName}的明牌动作撕开了北周地方裂口。`
    }
    if (relationshipBreaks.length > 0) {
        return `${relationshipBreaks[0].structureName}失衡之后，朝局机器开始自损。`
    }
    return `南陈最终反超 ${signed(powerGap)} 点国力，北周再无余裕阻挡北伐。`
}

function signed(value: number): string {
    return `${value >= 0 ? '+' : ''}${round(value)}`
}

function round(value: number): number {
    return Math.round(value * 10) / 10
}
