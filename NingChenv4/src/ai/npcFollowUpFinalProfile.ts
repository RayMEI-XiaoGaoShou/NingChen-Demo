import type { NPC, NorthSchemeParseResult, SchemeFollowUpParseResult, SchemeType } from '../game/types'

const PRESSURE_SCHEMES = new Set<SchemeType>([
    'slander',
    'alienate',
    'frame',
    'proxy',
    'omen',
    'secession',
    'rebellion',
])

export interface NpcFollowUpFinalProfile {
    followUpResultTone: string
    clarifiedConcern: string
    remainingSuspicion: string
    closureMode: string
}

export function describeNpcFollowUpFinalProfile(params: {
    npc: NPC
    schemeType: SchemeType
    followUpParse: SchemeFollowUpParseResult
    northParse?: NorthSchemeParseResult
}): NpcFollowUpFinalProfile {
    const { npc, schemeType, followUpParse } = params
    const highPressure = PRESSURE_SCHEMES.has(schemeType)
    const tone = deriveFollowUpResultTone(followUpParse)
    const clarifiedConcern = describeClarifiedConcern(schemeType, followUpParse)
    const remainingSuspicion = describeRemainingSuspicion(schemeType, followUpParse, highPressure)
    const closureMode = describeClosureMode({
        trust: npc.trust,
        followUpParse,
        resultTone: tone,
        highPressure,
    })

    return {
        followUpResultTone: tone,
        clarifiedConcern,
        remainingSuspicion,
        closureMode,
    }
}

function deriveFollowUpResultTone(parse: SchemeFollowUpParseResult): string {
    if (
        parse.clarificationFit >= 0.72 &&
        parse.npcInterestFit >= 0.66 &&
        parse.pressureControl >= 0.58 &&
        parse.contradictionRisk <= 0.3
    ) {
        return '这句补答把最要命的疑点压下去了一层，局面已被你稳住。'
    }

    if (
        parse.contradictionRisk >= 0.68 ||
        (parse.clarificationFit <= 0.34 && parse.npcInterestFit <= 0.38)
    ) {
        return '这句补答越描越黑，听着更像急着替自己找补。'
    }

    if (
        parse.clarificationFit >= 0.5 ||
        parse.npcInterestFit >= 0.5 ||
        parse.pressureControl >= 0.52
    ) {
        return '这句补答止住了一部分局面，但还没真把对方心里的刺拔干净。'
    }

    return '这句补答没有真正压住关节点，只是把话又往下接了一层。'
}

function describeClarifiedConcern(schemeType: SchemeType, parse: SchemeFollowUpParseResult): string {
    const pathDriven = parse.clarificationFit >= parse.npcInterestFit

    switch (schemeType) {
        case 'probe':
            return pathDriven
                ? '你把自己究竟想试探哪一层口风收窄了些。'
                : '你让这番试探看起来更像在问局，而不是在乱摸底。'
        case 'advise':
            return pathDriven
                ? '你把这策如何落地说得更清了。'
                : '你把这策究竟对他有什么好处说得更实了。'
        case 'slander':
        case 'alienate':
            return pathDriven
                ? '你把疑心该落到谁身上、该顺哪条旧账往上推，说得更明了。'
                : '你把这番话为何合乎他的旧疑旧怨，说得更顺了。'
        case 'frame':
            return pathDriven
                ? '你把嫌疑为何会落回那人头上、局是怎样合拢的，说得更清了。'
                : '你把这局为何能逼得对方失态自辩，说得更像样了。'
        case 'proxy':
            return pathDriven
                ? '你把为何要借他之手、由头从何而来，说得更稳了。'
                : '你把这把刀落下去之后，为什么更合他的盘算，说得更顺了。'
        case 'appeal':
            return pathDriven
                ? '你把这次求援到底要他替你担什么险，说得更清了。'
                : '你把这次出手究竟能换来什么，说得更像一笔账了。'
        case 'omen':
            return pathDriven
                ? '你把这句征兆究竟指向谁、该从哪里起疑，说得更明了。'
                : '你把这句谶言为何会触到他心里那层名分与祸福，说得更顺了。'
        case 'secession':
            return pathDriven
                ? '你把局面为何会逼到自保与离心，说得更清了。'
                : '你把这条退路为何对他更像活路，说得更实了。'
        case 'rebellion':
            return pathDriven
                ? '你把事势为何会逼到起兵这一步，说得更像不得不然。'
                : '你把此举对他而言为何不只是冒险、而是求活，说得更重了。'
        default:
            return '你把这番话里最该说透的那层意思，补得更明白些。'
    }
}

function describeRemainingSuspicion(
    schemeType: SchemeType,
    parse: SchemeFollowUpParseResult,
    highPressure: boolean,
): string {
    if (parse.contradictionRisk >= 0.65) {
        return highPressure
            ? '可他仍会觉得你这番补话太像临急遮掩，心里的账不会因此轻下。'
            : '可他仍会觉得你这番补话前后有缝，还不足以让他尽信。'
    }

    if (parse.npcInterestFit <= 0.42) {
        return highPressure
            ? '可他仍会怀疑，你更像借这道口子动局，而不是真替他着想。'
            : '可他仍会觉得，你这番解释更多是在替自己圆场。'
    }

    if (parse.pressureControl <= 0.42) {
        return schemeType === 'omen'
            ? '可他仍担心你把风声越引越大，这句谶言未必就能稳稳压住。'
            : '可他仍担心这番话会把风声再往外引，不敢立刻全接。'
    }

    return '疑心虽被压下一层，却未必就此消净，他多半还会留一手再看。'
}

function describeClosureMode(params: {
    trust: number
    followUpParse: SchemeFollowUpParseResult
    resultTone: string
    highPressure: boolean
}): string {
    const { trust, followUpParse, resultTone, highPressure } = params

    if (resultTone.includes('越描越黑')) {
        return '收束方式：越描越黑，疑心更深；结尾应短、冷、硬，不再留新的缝。'
    }

    if (
        trust >= 60 &&
        followUpParse.clarificationFit >= 0.72 &&
        followUpParse.npcInterestFit >= 0.66 &&
        followUpParse.contradictionRisk <= 0.32
    ) {
        return '收束方式：暂时信你，顺手给一步；可略松半口，但仍不必写成立刻尽信。'
    }

    if (highPressure || trust <= 35 || followUpParse.contradictionRisk >= 0.48) {
        return '收束方式：表面揭过，暗里记账；可给台阶，但不能把锋芒真正放下。'
    }

    return '收束方式：收了疑，但未尽信；应把局面稳住，却仍让防心留在话尾。'
}
