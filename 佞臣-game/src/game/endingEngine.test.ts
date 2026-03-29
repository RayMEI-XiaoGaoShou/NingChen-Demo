import { describe, expect, it } from 'vitest'
import { INITIAL_FACTIONS } from '../data/factions'
import { INITIAL_NPCS } from '../data/npcs'
import type { GameResult } from './types'
import { buildEndingReport } from './endingEngine'

function makeReport(gameResult: GameResult, northPower: number, southPower: number) {
    return buildEndingReport({
        gameResult,
        northPower,
        southPower,
        npcs: INITIAL_NPCS.map(npc => ({ ...npc })),
        factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
        intelProgress: Object.fromEntries(INITIAL_NPCS.map(npc => [npc.id, 0])),
        lastSettlement: {
            externalActionReports: [],
            relationshipReports: [],
            deathKiller: null,
            invasionTriggered: false,
        } as any,
    })
}

describe('endingEngine', () => {
    it('classifies a narrow power win as 险胜 and a large collapse win as 大胜', () => {
        const narrowWin = makeReport('VICTORY', 61.2, 63.4)
        const bigWin = buildEndingReport({
            gameResult: 'VICTORY',
            northPower: 40,
            southPower: 66,
            npcs: INITIAL_NPCS.map(npc => ({
                ...npc,
                isAlive: npc.id === 'hebaboguì' ? false : npc.isAlive,
                externalStatus: npc.id === 'erzhulié' ? 'secession' : npc.externalStatus,
            })),
            factions: INITIAL_FACTIONS.map(faction => ({
                ...faction,
                courtInfluence: faction.id === 'emperor' ? 12 : faction.courtInfluence,
                internalStability: faction.id === 'empress' ? 18 : faction.internalStability,
            })),
            intelProgress: Object.fromEntries(INITIAL_NPCS.map(npc => [npc.id, npc.id === 'zongai' ? 3 : 0])),
            lastSettlement: {
                externalActionReports: [{ npcId: 'erzhulié', npcName: '尔朱烈', action: 'secession', outcome: '草原附从坐地自雄。', nationEffects: {} }],
                relationshipReports: [{ edgeId: 'x', edgeLabel: '西线', structureId: 'west_command_triangle', structureName: '西线主帅三角', summary: '西线主帅链条失衡。' }],
                deathKiller: null,
                invasionTriggered: false,
            } as any,
        })

        expect(narrowWin.tier).toBe('险胜')
        expect(bigWin.tier).toBe('大胜')
    })
})
