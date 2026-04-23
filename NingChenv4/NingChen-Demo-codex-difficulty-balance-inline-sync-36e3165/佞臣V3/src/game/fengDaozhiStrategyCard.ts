import type { NPC, PlayerDangerStage, SchemeType } from './types'

export type FengDaozhiAdvisoryMode = '探路' | '顺推' | '借势' | '递刀' | '收口' | '留后手'

export interface FengDaozhiStrategyCard {
    strategicFocus: string
    bestAngle: string
    redLine: string
    advisoryMode: FengDaozhiAdvisoryMode
    advisoryModeGuidance: string
}

type TargetRole = 'court' | 'external' | 'hybrid_external'

export function buildFengDaozhiStrategyCard(params: {
    npc: NPC
    schemeType: SchemeType
    unlockedSecrets: number
    playerDangerStage: PlayerDangerStage
    currentPublicStatement?: string
    campaignSummary?: string
    relatedNpc?: NPC | null
}): FengDaozhiStrategyCard {
    const role = getTargetRole(params.npc)
    const battleWindow = Boolean(params.campaignSummary?.trim())
    const hasPublicStatement = Boolean(params.currentPublicStatement?.trim())
    const advisoryMode = chooseAdvisoryMode({
        schemeType: params.schemeType,
        playerDangerStage: params.playerDangerStage,
        unlockedSecrets: params.unlockedSecrets,
        battleWindow,
        hasPublicStatement,
        role,
    })

    return {
        strategicFocus: describeStrategicFocus({
            schemeType: params.schemeType,
            role,
            relatedNpc: params.relatedNpc,
        }),
        bestAngle: describeBestAngle({
            role,
            schemeType: params.schemeType,
            currentPublicStatement: params.currentPublicStatement,
            battleWindow,
            relatedNpc: params.relatedNpc,
        }),
        redLine: describeRedLine({
            schemeType: params.schemeType,
            playerDangerStage: params.playerDangerStage,
        }),
        advisoryMode,
        advisoryModeGuidance: describeAdvisoryModeGuidance(advisoryMode),
    }
}

function getTargetRole(npc: NPC): TargetRole {
    if (npc.id === 'duguwenyue') return 'hybrid_external'
    return npc.powerBase === 'external' ? 'external' : 'court'
}

function chooseAdvisoryMode(params: {
    schemeType: SchemeType
    playerDangerStage: PlayerDangerStage
    unlockedSecrets: number
    battleWindow: boolean
    hasPublicStatement: boolean
    role: TargetRole
}): FengDaozhiAdvisoryMode {
    if (params.playerDangerStage === 'under_review') {
        return params.schemeType === 'probe' || params.schemeType === 'advise' || params.schemeType === 'appeal'
            ? '收口'
            : '留后手'
    }

    if (params.schemeType === 'probe' || params.unlockedSecrets === 0) {
        return '探路'
    }

    switch (params.schemeType) {
        case 'advise':
            return params.hasPublicStatement || params.battleWindow ? '借势' : '顺推'
        case 'slander':
        case 'alienate':
            return params.role === 'court' ? '递刀' : '借势'
        case 'frame':
        case 'proxy':
            return '递刀'
        case 'appeal':
            return params.role === 'court' ? '顺推' : params.battleWindow ? '借势' : '顺推'
        case 'omen':
            return '借势'
        case 'secession':
        case 'rebellion':
            return params.battleWindow ? '借势' : '递刀'
        default:
            return '顺推'
    }
}

function describeStrategicFocus(params: {
    schemeType: SchemeType
    role: TargetRole
    relatedNpc?: NPC | null
}): string {
    const relatedName = params.relatedNpc?.name
    switch (params.schemeType) {
        case 'probe':
            return '这回合先摸他真正介意的那层，不必急着一口气求成。'
        case 'advise':
            return params.role === 'court'
                ? '这回合先替他理顺眼前利害，再看能否顺手牵到中枢节奏。'
                : '这回合先把实利、退路和能落到手里的东西摆实，再谈站位。'
        case 'slander':
            return params.role === 'court'
                ? `优先把疑心压到${relatedName ?? '那人'}的庇护与门路上，让他觉得此事该往上递。`
                : `优先打${relatedName ?? '那人'}的忠诚与站位，再带动外部离心。`
        case 'alienate':
            return params.role === 'court'
                ? `优先让${relatedName ?? '那人'}的旧怨坐实，动摇他与那一边的协作。`
                : `优先把${relatedName ?? '那人'}与中枢或同线人的裂缝挑明，再谈后续站位。`
        case 'frame':
            return params.role === 'court'
                ? '先给出能落回他本人身上的嫌疑与失态由头。'
                : '先让中枢起疑，再拖动军需、忠诚与对外状态。'
        case 'proxy':
            return '给够由头，让这把刀像是他自己愿意抬起来的。'
        case 'appeal':
            return params.role === 'court'
                ? '先换门路、背书与遮护，再谈出手。'
                : params.role === 'hybrid_external'
                    ? '先换位置与分量，再谈军需、退路和价码。'
                    : '先换价码、兵粮与退路，不必急着讨口头忠心。'
        case 'omen':
            return params.role === 'court'
                ? '先打名分与人心，再看谁会把这事往上递。'
                : params.role === 'hybrid_external'
                    ? '先放大中枢疑心与西线站位，再牵到粮道、军需与忠诚。'
                    : '先放大中枢疑心，再牵到粮道、军需与忠诚。'
        case 'secession':
            return '先把忠诚压到自保一侧，再顺势松开割据念头。'
        case 'rebellion':
            return '先写出局势逼迫与活路稀薄，再看能否把起事说成不得不然。'
        default:
            return '先把这回合最该动的那层盘稳，再决定要不要继续加码。'
    }
}

function describeBestAngle(params: {
    role: TargetRole
    schemeType: SchemeType
    currentPublicStatement?: string
    battleWindow: boolean
    relatedNpc?: NPC | null
}): string {
    if (params.currentPublicStatement?.trim()) {
        return `最好顺着他本回合明着说出口的那层立场反手一拧：${params.currentPublicStatement.trim()}`
    }

    if (params.relatedNpc?.name && (params.schemeType === 'slander' || params.schemeType === 'alienate')) {
        return `最好围着${params.relatedNpc.name}去写，把人、路和后果扣实。`
    }

    if (params.battleWindow) {
        return params.role === 'court'
            ? '最好顺着本回合朝局风向、调度节奏与谁在借势揽权去落笔。'
            : '最好顺着战区、粮道、边镇人心与中枢调度去落笔。'
    }

    return params.role === 'court'
        ? '最好顺着他最在意的权柄、脸面、站位和谁在绕过他去落笔。'
        : params.role === 'hybrid_external'
            ? '最好顺着他的政治位置、西线分量与退路去落笔，不止盯着兵粮。'
            : '最好顺着他最在意的兵、粮、地盘、退路与被谁看轻去落笔。'
}

function describeRedLine(params: {
    schemeType: SchemeType
    playerDangerStage: PlayerDangerStage
}): string {
    if (params.playerDangerStage === 'under_review') {
        return '这回合不要把话说满，更不要像替旁人探口风。'
    }

    switch (params.schemeType) {
        case 'probe':
            return '不可一下把真实目的全摊出来，试探最怕手先伸得太深。'
        case 'advise':
            return '不可只讲大义，不讲他本人究竟能拿到什么。'
        case 'slander':
        case 'alienate':
            return '不可只扔情绪，必须落到人、路和后果。'
        case 'frame':
            return '不可替他平静洗白，要让他像是被逼着解释。'
        case 'proxy':
            return '不可写成你在遥控他，这把刀必须像他自己要抬。'
        case 'appeal':
            return '不可空手谈忠义，至少要让他看见价码、门路或退路。'
        case 'omen':
            return '不可只写怪力乱神，要落回名分、人心或中枢动作。'
        case 'secession':
        case 'rebellion':
            return '不可把话说得像孤注一掷，除非局真被逼到尽头。'
        default:
            return '不可把话写得又满又虚，宁可窄一点，也要像能落地。'
    }
}

function describeAdvisoryModeGuidance(mode: FengDaozhiAdvisoryMode): string {
    switch (mode) {
        case '探路':
            return '代拟重心是摸清对方真正介意什么，语气偏试探、留余地。'
        case '顺推':
            return '代拟重心是顺着对方已有松口往下走，不主动加压。'
        case '借势':
            return '代拟重心是把本回合局势中的一件事挂到对方利益或恐惧上。'
        case '递刀':
            return '代拟重心是给出一把可执行的由头，让对方能顺势动手。'
        case '收口':
            return '代拟重心是巩固已有成果，此回合不再加码。'
        case '留后手':
            return '代拟重心是留一条退路，不把话说满。'
        default:
            return '代拟重心是顺着局面，把最有用的一层话先落下去。'
    }
}
