import type { BattleReport, RoundHistoryEntry, SchemeType } from './types'

export function buildBattleReport(history: RoundHistoryEntry[]): BattleReport {
    if (history.length === 0) {
        return {
            pivotMoments: ['本局尚无足够回合数据可供复盘。'],
            schemeSummary: ['你还未留下足够多的施计轨迹。'],
            policySummary: ['南陈问政尚未形成清晰路线。'],
            dangerMoments: ['本局尚未形成明确危局节点。'],
        }
    }

    const pivots = [...history]
        .sort((a, b) => disruptionScore(b) - disruptionScore(a))
        .slice(0, 3)
        .map(item => `第 ${item.round} 回合「${item.eventName}」：${item.summary}`)

    const mostTargeted = [...history]
        .flatMap(item => item.keyTargets)
        .reduce<Record<string, number>>((acc, name) => {
            acc[name] = (acc[name] ?? 0) + 1
            return acc
        }, {})
    const topTargets = Object.entries(mostTargeted)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([name, count]) => `${name} 被你重点经营 ${count} 次`)

    const policyRounds = history.filter(item => item.policyTopic && item.policyOption)
    const policySummary = policyRounds.length > 0
        ? policyRounds.slice(-3).map(item => `第 ${item.round} 回合围绕「${item.policyTopic}」采纳了 ${item.policyOption}`)
        : ['本局几乎没有形成清晰的南陈施政路线。']

    const dangerRounds = history
        .filter(item => item.invasionTriggered || item.factionCollapseCount > 0)
        .slice(-3)
        .map(item => {
            const parts: string[] = []
            if (item.invasionTriggered) parts.push('提前南征威胁成形')
            if (item.factionCollapseCount > 0) parts.push(`朝堂势力出现 ${item.factionCollapseCount} 处崩口/崩盘`)
            return `第 ${item.round} 回合：${parts.join('，')}`
        })

    return {
        pivotMoments: pivots,
        schemeSummary: topTargets.length > 0 ? topTargets : ['本局施计分布较散，没有形成单一强攻对象。'],
        policySummary,
        dangerMoments: dangerRounds.length > 0 ? dangerRounds : ['本局未出现明确的体系级危局节点。'],
    }
}

export function buildRoundHistoryEntry(params: {
    round: number
    eventName: string
    schemeCount: number
    schemeSuccessCount: number
    keyTargets: string[]
    schemeDetails?: Array<{
        targetNpcId: string
        targetNpcName: string
        schemeType: SchemeType
        success: boolean
    }>
    policyTopic?: string
    policyOption?: string
    externalActionCount: number
    relationshipBreakCount: number
    factionCollapseCount: number
    invasionTriggered: boolean
    northPower: number
    southPower: number
    summary: string
}): RoundHistoryEntry {
    return {
        round: params.round,
        eventName: params.eventName,
        schemeCount: params.schemeCount,
        schemeSuccessCount: params.schemeSuccessCount,
        keyTargets: params.keyTargets,
        schemeDetails: params.schemeDetails,
        policyTopic: params.policyTopic,
        policyOption: params.policyOption,
        externalActionCount: params.externalActionCount,
        relationshipBreakCount: params.relationshipBreakCount,
        factionCollapseCount: params.factionCollapseCount,
        invasionTriggered: params.invasionTriggered,
        northPower: params.northPower,
        southPower: params.southPower,
        summary: params.summary,
    }
}

function disruptionScore(entry: RoundHistoryEntry): number {
    return (
        entry.externalActionCount * 3 +
        entry.relationshipBreakCount * 2 +
        entry.factionCollapseCount * 2 +
        (entry.invasionTriggered ? 3 : 0) +
        entry.schemeSuccessCount
    )
}
