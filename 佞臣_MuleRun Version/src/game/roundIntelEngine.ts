import { getRoundIntel, type RoundTheme } from '../data/roundIntel'
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
        return '冯道之密语：今朝明线已乱，先看谁还站得住，再拣其裂隙下手。'
    }

    const leads = aliveCore.slice(0, 3).map(npc => {
        const reaction = trimSentence(input.reactions[npc.id] ?? '各怀算盘，未必与表面言辞相同')
        return `${npc.name}${reaction}`
    })

    return `冯道之密语：此回合先盯${aliveCore.slice(0, 3).map(npc => npc.name).join('、')}；${leads.join('；')}`
}

export function getRoundAdvisorHint(round: number, npcs: HintNpc[], externalStageHint?: string | null): string {
    const intel = getRoundIntel(round)
    const borrowedBladeHint = buildBorrowedBladeAdvisorHint(npcs as NPC[])
    if (!intel) {
        const fallback = '冯道之密语：局势未明，先看谁最急、谁最稳，再顺着人心裂处落子。'
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

export function getNpcRoundReaction(round: number, npc: NPC, intelDepth = 0): string {
    const intel = getRoundIntel(round)
    const publicStatement = buildPublicStatement(intel?.theme, npc)

    if (intelDepth <= 0) {
        return publicStatement
    }

    if (intelDepth >= 3) {
        return buildDeepStatement(publicStatement, intel?.reactions[npc.id], npc, intelDepth)
    }

    return buildHintStatement(publicStatement, intel?.reactions[npc.id], npc)
}

function buildPublicStatement(theme: RoundTheme | undefined, npc: NPC): string {
    const selfRef = getSelfReference(npc)
    const intro = getIntro(npc)
    const stance = resolveThemeStance(theme, npc)
    return `${selfRef}${intro}${stance}`
}

function buildHintStatement(base: string, reaction: string | undefined, npc: NPC): string {
    const selfRef = getSelfReference(npc)
    const clue = trimSentence(reaction || npc.softSpot)
    const careVerb = selfRef === npc.name ? '在意' : '上心'
    return `${base} 至于真正会让${selfRef}${careVerb}的，多半还是${clue}。`
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

function getSelfReference(npc: NPC): string {
    switch (npc.id) {
        case 'yuwendi':
            return '孤'
        case 'hebaqi':
            return '哀家'
        case 'zuting':
            return '本相'
        case 'linghuelvguang':
        case 'hebabogui':
            return '本公'
        case 'weichimu':
            return '本公'
        case 'zongai':
            return '奴婢'
        case 'duguwenyue':
            return '本侯'
        case 'erzhulie':
        case 'ansiming':
            return '本节度'
        default:
            return npc.name
    }
}

function getIntro(npc: NPC): string {
    switch (npc.id) {
        case 'yuwendi':
        case 'hebaqi':
        case 'zuting':
        case 'linghuelvguang':
            return '以为，'
        case 'weichimu':
            return '只道，'
        case 'zongai':
            return '私心以为，'
        case 'hebabogui':
        case 'duguwenyue':
        case 'erzhulie':
        case 'ansiming':
            return '看来，'
        default:
            return '以为，'
    }
}

function resolveThemeStance(theme: RoundTheme | undefined, npc: NPC): string {
    switch (theme) {
        case 'southDebate':
            return southDebate(npc)
        case 'huainanFriction':
            return huainanFriction(npc)
        case 'springDrought':
            return springDrought(npc)
        case 'steppeRaid':
        case 'steppeTribute':
        case 'steppeBlackmail':
            return northernBorder(npc)
        case 'hexiHarassment':
        case 'yizhouRevolt':
        case 'westCampaignDebate':
        case 'chenShuCampaign':
        case 'westPostwar':
            return westernFront(npc)
        case 'autumnFloodAudit':
        case 'epidemicOmens':
        case 'northernLandGrab':
        case 'grandPurge':
            return internalCrisis(npc)
        case 'southWarRenewed':
        case 'huainanCampaign':
        case 'prolongedWar':
        case 'finalShowdown':
            return southernWar(npc)
        case 'regencyStruggle':
            return regencyStruggle(npc)
        default:
            return '此事尚需再看，不可先把话说满。'
    }
}

function southDebate(npc: NPC): string {
    if (npc.id === 'yuwendi') return '新朝方定，更该先声夺人，对陈不可再示弱。'
    if (npc.id === 'hebaqi') return '国政未稳，凡大战略都须在朝廷掌握之中。'
    if (npc.id === 'zuting') return '仓廪、诏令、中枢未理顺，妄言南征，只会先乱自家。'
    if (npc.id === 'weichimu') return '若朝廷真要打，兵、粮、令三样，缺一样都不成。'
    if (npc.id === 'linghuelvguang') return '国家根本未固，先安内而后图远，方是正道。'
    if (npc.id === 'zongai') return '陛下也在听众臣所言，谁忠谁躁，宫中自会记着。'
    return npc.powerBase === 'external'
        ? '朝中爱争什么便争什么，只要别误了边地与本部的实利。'
        : '朝廷大议，不可只争声势，不问后果。'
}

function huainanFriction(npc: NPC): string {
    if (npc.id === 'yuwendi') return '淮南边衅既起，正说明对陈不可再以姑息了之。'
    if (npc.id === 'weichimu') return '边线既动，就该先补兵补粮，别让前线空吃亏。'
    if (npc.id === 'zuting') return '流民、边报、转运皆要控在中枢，方不至有人借题生事。'
    if (npc.id === 'zongai') return '边事轻重，终归要让陛下先听明白，再论谁是谁非。'
    if (npc.id === 'hebaqi') return '一场小摩擦而已，朝廷若自乱阵脚，才是真中敌计。'
    return npc.powerBase === 'external'
        ? '淮南若真要闹大，朝廷总该拿出些筹码，不然谁会为朝廷效死。'
        : '边事既起，更要慎看谁在借势，谁在稳局。'
}

function springDrought(npc: NPC): string {
    if (npc.id === 'zuting') return '灾年先问仓廪与赋役，不先稳百姓，朝廷拿什么谈远图。'
    if (npc.id === 'hebaqi') return '眼下最要紧的是定人心、稳朝纲，不可使灾情再生政变。'
    if (npc.id === 'linghuelvguang') return '河北、河南既旱，妄动大战，只会先把国家拖垮。'
    if (npc.id === 'yuwendi') return '赈灾自要做，但也不能因此把国家锐气一并做没了。'
    return npc.powerBase === 'external'
        ? '中原若连灾年都调度不灵，边地自当先顾边地。'
        : '灾年最见根本，谁真能稳局，百官自会看在眼里。'
}

function northernBorder(npc: NPC): string {
    if (npc.id === 'linghuelvguang') return '北边未稳，谁还鼓噪别线大战，便是不识轻重。'
    if (npc.id === 'erzhulie' || npc.id === 'ansiming') return '边地既危，朝廷若要人出力，总该先让边军心里有数。'
    if (npc.id === 'zongai') return '北边军情，陛下不会不问，谁敢欺上瞒下，宫中自会记账。'
    if (npc.id === 'yuwendi') return '北顾固要紧，可国家大势也不能被边风牵着走。'
    return npc.powerBase === 'external'
        ? '边事一起，谁真正守边、谁只会坐朝空谈，也该分个明白。'
        : '边患当前，最忌各自争功，不顾全局。'
}

function westernFront(npc: NPC): string {
    if (npc.id === 'hebabogui') return '河西与蜀地这盘棋，终究还是得让懂西线的人来下。'
    if (npc.id === 'duguwenyue') return '平西线要的是章法，不是谁嗓门大，谁就配独揽大局。'
    if (npc.id === 'zuting') return '帅权可议，粮权与接管权却不可轻离中枢。'
    if (npc.id === 'hebaqi') return '谁能平事，朝廷自会用谁，但谁也别想借乱自成气候。'
    if (npc.id === 'yuwendi') return '西线可救，却不能让旁人借此另立一座权势高台。'
    return npc.powerBase === 'external'
        ? '西线既乱，谁真能收拾残局，朝廷迟早要给个说法。'
        : '西征若起，更要防功未成而权先外流。'
}

function internalCrisis(npc: NPC): string {
    if (npc.id === 'zuting') return '乱象既起，便该整仓、整簿、整人，先把国家机器重新拧紧。'
    if (npc.id === 'hebaqi') return '越是人心浮动，越不能任由流言与私议坏了朝廷分寸。'
    if (npc.id === 'yuwendi') return '地方既坏成这样，更证明积弊已深，岂能再粉饰太平。'
    if (npc.id === 'linghuelvguang') return '地方未宁、民心未定，谁若仍只顾争功，便是误国。'
    if (npc.id === 'zongai') return '宫中听得见外头风声，天命与人心，从来都不是小事。'
    return npc.powerBase === 'external'
        ? '朝中若借整饬之名把手伸过了界，边地也自有边地的难处。'
        : '乱局当前，最怕的不是病根重，而是人人都想借病收权。'
}

function southernWar(npc: NPC): string {
    if (npc.id === 'weichimu') return '前线既开，朝廷就该把兵粮与号令一并补足，别让将士空耗。'
    if (npc.id === 'yuwendi') return '战既已开，朝廷更当同心，不可再让掣肘之论坏了军心。'
    if (npc.id === 'linghuelvguang') return '救淮南可以，可都城与北边也不能因此全成空架子。'
    if (npc.id === 'zuting') return '久战之时，更见谁在耗国、谁在稳国，账都要一笔一笔算清。'
    if (npc.id === 'hebaqi') return '大战之际，更需有人压住全局，不可让人人只顾自家战功。'
    return npc.powerBase === 'external'
        ? '主力既南顾，边地与地方自然更该先把自家根基守稳。'
        : '战事越大，越见朝堂谁能担事、谁只会争嘴。'
}

function regencyStruggle(npc: NPC): string {
    if (npc.id === 'zongai') return '归政之议，终究也要让陛下先明白谁真忠、谁借忠邀名。'
    if (npc.id === 'yuwendi') return '归政本是正理，宗室若连这一步都不敢说，还谈什么社稷。'
    if (npc.id === 'hebaqi') return '国事未定，归政岂可只凭一时之气便妄动根本。'
    if (npc.id === 'zuting') return '归政须有次第，不可一纸空话便把政务系统全数搅乱。'
    return npc.powerBase === 'external'
        ? '朝中谁掌权，边地未必真在乎，只怕中枢借换局来掣地方。'
        : '名分之争最伤根本，谁若只图一时之胜，迟早要反噬。'
}
