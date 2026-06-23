import { describe, expect, it } from 'vitest'
import { INITIAL_FACTIONS } from '../data/factions'
import { INITIAL_NPCS } from '../data/npcs'
import type { GameResult } from './types'
import { buildEndingReport } from './endingEngine'
import endingEngineSource from './endingEngine.ts?raw'

function makeReport(gameResult: GameResult, northPower: number, southPower: number) {
    return buildEndingReport({
        gameResult,
        currentRound: 20,
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
        },
    })
}

describe('endingEngine', () => {
    it('maps victory tiers to planned titles', () => {
        const narrowWin = makeReport('VICTORY', 61.2, 63.4)
        const steadyWin = makeReport('VICTORY', 61.2, 70.4)
        const bigWin = makeReport('VICTORY', 40, 66)

        expect(narrowWin.tier).toBe('险胜')
        expect(narrowWin.title).toBe('悬崖之上')
        expect(steadyWin.tier).toBe('稳胜')
        expect(steadyWin.title).toBe('十年一剑')
        expect(bigWin.tier).toBe('大胜')
        expect(bigWin.title).toBe('天下归陈')
    })

    it('maps power-failure tiers to planned titles', () => {
        const narrowLoss = makeReport('DEFEAT_POWER', 61.2, 58.4)
        const steadyLoss = makeReport('DEFEAT_POWER', 61.2, 50.4)
        const heavyLoss = makeReport('DEFEAT_POWER', 61.2, 42)

        expect(narrowLoss.tier).toBe('险败')
        expect(narrowLoss.title).toBe('天不假时')
        expect(steadyLoss.tier).toBe('惜败')
        expect(steadyLoss.title).toBe('一步之遥')
        expect(heavyLoss.tier).toBe('惨败')
        expect(heavyLoss.title).toBe('功亏十年')
    })

    it('uses planned title and extra metadata for early invasion and death endings', () => {
        const invasion = buildEndingReport({
            gameResult: 'DEFEAT_INVASION',
            currentRound: 11,
            northPower: 68,
            southPower: 49,
            npcs: INITIAL_NPCS.map(npc => ({ ...npc })),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: Object.fromEntries(INITIAL_NPCS.map(npc => [npc.id, 0])),
            lastSettlement: {
                externalActionReports: [],
                relationshipReports: [],
                deathKiller: null,
                invasionTriggered: true,
            },
        })

        const death = buildEndingReport({
            gameResult: 'DEFEAT_DEATH',
            currentRound: 9,
            northPower: 62,
            southPower: 51,
            npcs: INITIAL_NPCS.map(npc => ({ ...npc })),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: Object.fromEntries(INITIAL_NPCS.map(npc => [npc.id, 0])),
            lastSettlement: {
                externalActionReports: [],
                relationshipReports: [],
                deathKiller: '贺拔琪',
                invasionTriggered: false,
            },
        })

        expect(invasion.title).toBe('大江东去')
        expect(invasion.triggerRound).toBe(11)
        expect(invasion.invasionDriver).toBeTruthy()
        expect(death.title).toBe('弃子求安')
        expect(death.sceneLabel).toContain('贺拔琪')
        expect(death.epilogueLines[0]).toContain('南陈女帝')
    })

    it('describes court execution without reusing old borrowed-blade phrasing', () => {
        const report = buildEndingReport({
            gameResult: 'VICTORY',
            currentRound: 20,
            northPower: 56,
            southPower: 62,
            npcs: INITIAL_NPCS.map(npc => npc.id === 'yuwendi'
                ? {
                    ...npc,
                    isAlive: false,
                    courtStatus: 'executed',
                    deathCause: 'court_execution',
                    deathByNpcName: '祖廷',
                } as any
                : { ...npc }),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: Object.fromEntries(INITIAL_NPCS.map(npc => [npc.id, 0])),
            lastSettlement: {
                externalActionReports: [],
                relationshipReports: [],
                deathKiller: null,
                invasionTriggered: false,
            },
        })

        expect(report.npcFates.some(item => item.summary.includes('已被处决'))).toBe(true)
        expect(report.npcFates.some(item => item.summary.includes('借刀之局'))).toBe(false)
    })

    it('describes dismissed court targets as removed but not dead', () => {
        const report = buildEndingReport({
            gameResult: 'VICTORY',
            currentRound: 20,
            northPower: 56,
            southPower: 62,
            npcs: INITIAL_NPCS.map(npc => npc.id === 'zuting'
                ? {
                    ...npc,
                    isAlive: true,
                    courtStatus: 'dismissed',
                } as any
                : { ...npc }),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: Object.fromEntries(INITIAL_NPCS.map(npc => [npc.id, 0])),
            lastSettlement: {
                externalActionReports: [],
                relationshipReports: [],
                deathKiller: null,
                invasionTriggered: false,
            },
        })

        const fate = report.npcFates.find(item => item.npcId === 'zuting')
        expect(fate?.summary).toContain('已被罢黜')
        expect(fate?.summary).not.toContain('死')
        expect(fate?.summary).not.toContain('处决')
    })

    it('keeps Weichi Mu in the ending focus list when he is removed by court disposition', () => {
        const report = buildEndingReport({
            gameResult: 'VICTORY',
            currentRound: 20,
            northPower: 56,
            southPower: 62,
            npcs: INITIAL_NPCS.map(npc => npc.id === 'weichimù'
                ? {
                    ...npc,
                    isAlive: true,
                    courtStatus: 'dismissed',
                } as any
                : { ...npc }),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: Object.fromEntries(INITIAL_NPCS.map(npc => [npc.id, 0])),
            lastSettlement: {
                externalActionReports: [],
                relationshipReports: [],
                deathKiller: null,
                invasionTriggered: false,
            },
        })

        const fate = report.npcFates.find(item => item.npcId === 'weichimù')
        expect(fate?.summary).toContain('已被罢黜')
    })


    it('describes a living rebellion target as open rebellion rather than secession', () => {
        expect(endingEngineSource).toContain("if (npc.externalStatus === 'rebellion')")
        expect(endingEngineSource).toContain('已举兵明旗')
        expect(endingEngineSource).toContain("if (npc.externalStatus === 'secession')")
        expect(endingEngineSource).toContain('坐实割据')
    })
})
