import type { DelayedBacklash, NPC, NorthSchemeParseResult, SchemeAction } from './types'

export function deriveDelayedBacklash(
    action: SchemeAction,
    targetNpc: NPC,
    success: boolean,
    parse: NorthSchemeParseResult,
    round: number,
): DelayedBacklash[] {
    const highWeightTarget = /丞相|太后|燕王|中常侍|上柱国|节度/.test(targetNpc.title) || targetNpc.canExecute
    const agendaRelevance = getAgendaRelevance(parse)
    const courtAgendaRelevance = Math.max(parse.governanceRelevance, parse.socialOrderRelevance)
    const canTriggerMisdirected =
        ['advise', 'slander', 'alienate', 'frame', 'proxy', 'omen'].includes(action.schemeType)
        && (
            courtAgendaRelevance >= 0.22
            || (action.schemeType !== 'advise' && agendaRelevance >= 0.28)
            || parse.dominantIntent === 'induce'
            || parse.dominantIntent === 'divide'
        )
        && (targetNpc.canExecute || targetNpc.powerBase === 'external' || highWeightTarget)

    if (parse.exposureRisk >= 0.82 && highWeightTarget) {
        return [{
            npcId: targetNpc.id,
            npcName: targetNpc.name,
            type: 'shock',
            intensity: roundValue(0.74 + parse.exposureRisk * 0.24),
            summary: `${targetNpc.name}近来口风愈紧，朝中借边议兵之声亦随之转烈。`,
            sourceRound: round,
        }]
    }

    if (parse.exposureRisk >= 0.58) {
        return [{
            npcId: targetNpc.id,
            npcName: targetNpc.name,
            type: 'guarded',
            intensity: roundValue(0.4 + parse.exposureRisk * 0.35),
            summary: `${targetNpc.name}表面仍循旧章，然近来言语间已多了一层提防。`,
            sourceRound: round,
        }]
    }

    if (success && canTriggerMisdirected && parse.structuralPenetration < 0.2 && parse.eventFit < 0.25) {
        return [{
            npcId: targetNpc.id,
            npcName: targetNpc.name,
            type: 'misdirected',
            intensity: roundValue(0.34 + (1 - parse.eventFit) * 0.3),
            summary: '朝议虽似略有转动，实则主战与安内的借口已悄悄换了方向。',
            sourceRound: round,
        }]
    }

    if (!success && parse.exposureRisk >= 0.42) {
        return [{
            npcId: targetNpc.id,
            npcName: targetNpc.name,
            type: 'exposed',
            intensity: roundValue(0.28 + parse.exposureRisk * 0.25),
            summary: '朝中虽未明言，萧郎近日行止却似已多惹几分注目。',
            sourceRound: round,
        }]
    }

    if (action.schemeType === 'rebellion' && parse.exposureRisk >= 0.36) {
        return [{
            npcId: targetNpc.id,
            npcName: targetNpc.name,
            type: 'exposed',
            intensity: roundValue(0.3 + parse.exposureRisk * 0.22),
            summary: `${targetNpc.name}虽未当场失色，然边镇间已有暗线记下了你的话锋。`,
            sourceRound: round,
        }]
    }

    return []
}

function getAgendaRelevance(parse: NorthSchemeParseResult): number {
    return Math.max(
        parse.financeRelevance,
        parse.grainRelevance,
        parse.militaryRelevance,
        parse.socialOrderRelevance,
        parse.governanceRelevance,
    )
}

function roundValue(value: number): number {
    return Math.round(value * 100) / 100
}
