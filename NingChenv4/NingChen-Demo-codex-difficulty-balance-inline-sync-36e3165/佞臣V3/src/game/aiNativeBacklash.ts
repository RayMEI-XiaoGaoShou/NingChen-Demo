import type { DelayedBacklash, NationDimensions, NPC } from './types'

export function applyDelayedBacklashToState(params: {
    backlog: DelayedBacklash[]
    currentRound: number
    npcs: NPC[]
    northStats: NationDimensions
}): {
    npcs: NPC[]
    northStats: NationDimensions
    appliedBacklash: DelayedBacklash[]
} {
    const active = params.backlog.filter(item => params.currentRound === item.sourceRound + 1)
    if (active.length === 0) {
        return {
            npcs: params.npcs,
            northStats: params.northStats,
            appliedBacklash: [],
        }
    }

    const npcs = params.npcs.map(npc => ({ ...npc }))
    const northStats = { ...params.northStats }

    for (const backlash of active) {
        const npc = npcs.find(item => item.id === backlash.npcId)
        if (npc) {
            if (backlash.type === 'guarded') {
                npc.trust = Math.max(0, npc.trust - Math.max(2, Math.round(backlash.intensity * 5)))
            } else if (backlash.type === 'shock') {
                npc.trust = Math.max(0, npc.trust - Math.max(4, Math.round(backlash.intensity * 7)))
            } else if (backlash.type === 'exposed') {
                npc.trust = Math.max(0, npc.trust - Math.max(1, Math.round(backlash.intensity * 4)))
            }
        }

        if (backlash.type === 'misdirected' || backlash.type === 'shock') {
            northStats.governance = Math.max(0, roundOne(northStats.governance - backlash.intensity * (backlash.type === 'shock' ? 1.6 : 0.9)))
            northStats.socialOrder = Math.max(0, roundOne(northStats.socialOrder - backlash.intensity * (backlash.type === 'shock' ? 1.2 : 0.7)))
            northStats.military = Math.max(0, roundOne(northStats.military - backlash.intensity * (backlash.type === 'shock' ? 1.1 : 0.4)))
        }

        if ((backlash.type === 'exposed' || backlash.type === 'shock') && npc) {
            npc.trust = Math.max(0, npc.trust - Math.max(2, Math.round(backlash.intensity * (backlash.type === 'shock' ? 8 : 5))))
        }
    }

    return { npcs, northStats, appliedBacklash: active }
}

function roundOne(value: number): number {
    return Math.round(value * 10) / 10
}
