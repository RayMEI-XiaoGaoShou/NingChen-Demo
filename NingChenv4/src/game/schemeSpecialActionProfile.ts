import type { NPC, NorthSchemeParseResult, SchemeType } from './types'

export interface SpecialSchemeActionProfile {
    targetMisstep: string
    observerScope: string
    damageMechanism: string
    promptLine: string
}

export function deriveSpecialSchemeActionProfile(input: {
    schemeType: SchemeType
    targetNpc: NPC
    parse: NorthSchemeParseResult
}): SpecialSchemeActionProfile | null {
    if (input.schemeType === 'frame') {
        return deriveFrameProfile(input.targetNpc, input.parse)
    }

    if (input.schemeType === 'omen') {
        return deriveOmenProfile(input.targetNpc)
    }

    return null
}

function deriveFrameProfile(targetNpc: NPC, parse: NorthSchemeParseResult): SpecialSchemeActionProfile {
    const observerScope = targetNpc.factionId === 'emperor'
        ? '御前与帝党众人'
        : targetNpc.factionId === 'empress'
            ? '帘前与后党众人'
            : '北周朝堂'
    const targetMisstep = (parse.selfTrapPotential ?? 0) >= 0.72
        ? '急于自辩并切割身边案牍'
        : '仓促压住口风'
    const damageMechanism = Math.max(parse.governanceRelevance, parse.socialOrderRelevance) >= 0.6
        ? '案牍壅塞、风声坐大，州县与中枢权责随之推诿'
        : '旧案被重新翻检，朝中疑心被坐实'

    return {
        targetMisstep,
        observerScope,
        damageMechanism,
        promptLine: `设局嫁祸落地链：目标先${targetMisstep}；${observerScope}随后借此追看；损失机制是${damageMechanism}。`,
    }
}

function deriveOmenProfile(targetNpc: NPC): SpecialSchemeActionProfile {
    const external = targetNpc.powerBase === 'external'
    const observerScope = external ? '中枢、御史与监军' : '御前、帘前与朝堂公议'
    const targetMisstep = external ? '先封口压谣又急调亲兵守仓' : '急令压住谶纬风声并自证名分'
    const damageMechanism = external
        ? '粮道、军需与监军压力拖慢转运'
        : '名分疑云坐大，案牍与权责被迫复核'

    return {
        targetMisstep,
        observerScope,
        damageMechanism,
        promptLine: `谶纬落地链：目标${targetMisstep}；${observerScope}随即反馈；损失机制是${damageMechanism}。`,
    }
}
