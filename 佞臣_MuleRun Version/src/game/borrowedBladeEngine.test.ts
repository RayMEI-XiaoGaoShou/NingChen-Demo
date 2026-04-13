import { describe, expect, it } from 'vitest'
import { INITIAL_NPCS } from '../data/npcs'
import type { NPC } from './types'
import {
    BORROWED_BLADE_TARGET_IDS,
    advanceBorrowedBladeStage,
    canUseBorrowedBladeDisposalStage,
    getHighestBorrowedBladeStageLabel,
    initialBorrowedBladeStages,
    resolveBorrowedBladeProxy,
} from './borrowedBladeEngine'

function makeNpc(overrides: Partial<NPC>): NPC {
    return {
        id: 'zuting',
        name: '祖廷',
        factionId: 'empress',
        powerBase: 'court',
        title: '右丞相',
        publicPersona: '',
        publicStance: '',
        personality: '',
        softSpot: '',
        triggerPoint: '',
        schemeHooks: '',
        trust: 80,
        isAlive: true,
        disposalStage: 'safe',
        deathCause: null,
        deathByNpcId: null,
        deathByNpcName: null,
        deathRound: null,
        canExecute: true,
        militaryPower: 20,
        loyaltyToCourt: 80,
        alignmentBias: 'empress',
        externalStatus: 'loyal',
        availableSchemes: ['probe', 'advise', 'slander', 'alienate', 'frame', 'proxy'],
        highRounds: [],
        secretThreads: [],
        ...overrides,
    }
}

describe('borrowedBladeEngine target scope', () => {
    it('only enables disposal stages for the first five supported court targets', () => {
        expect(BORROWED_BLADE_TARGET_IDS).toEqual([
            'zuting',
            'zongai',
            'yuwendi',
            'linghuelvguang',
            'weichimù',
        ])
        expect(canUseBorrowedBladeDisposalStage('zuting')).toBe(true)
        expect(canUseBorrowedBladeDisposalStage('hebaqi')).toBe(false)
    })

    it('starts supported targets at safe', () => {
        const stages = initialBorrowedBladeStages()
        expect(stages.zuting).toBe('safe')
        expect(stages['weichimù']).toBe('safe')
    })

    it('uses the real 尉迟暮 npc id from formal data', () => {
        const weichimu = INITIAL_NPCS.find(npc => npc.name === '尉迟暮')

        expect(weichimu).toBeDefined()
        expect(BORROWED_BLADE_TARGET_IDS).toContain(weichimu!.id)
        expect(canUseBorrowedBladeDisposalStage(weichimu!.id)).toBe(true)
        expect(initialBorrowedBladeStages()[weichimu!.id]).toBe('safe')
    })
})

describe('borrowed blade stage advancement', () => {
    it('lets slander move a supported target from safe to questioned', () => {
        expect(
            advanceBorrowedBladeStage('safe', {
                schemeType: 'slander',
                success: true,
                transmission: 0.62,
                scapegoat: 0,
                legitimacyCrack: 0,
            }),
        ).toBe('questioned')
    })

    it('lets alienate move a questioned target to isolated', () => {
        expect(
            advanceBorrowedBladeStage('questioned', {
                schemeType: 'alienate',
                success: true,
                transmission: 0.74,
                scapegoat: 0,
                legitimacyCrack: 0,
            }),
        ).toBe('isolated')
    })

    it('lets frame move an isolated target toward disposable when blame clearly falls back on them', () => {
        expect(
            advanceBorrowedBladeStage('isolated', {
                schemeType: 'frame',
                success: true,
                transmission: 0,
                scapegoat: 0.82,
                legitimacyCrack: 0,
            }),
        ).toBe('disposable')
    })
})

describe('borrowed blade proxy resolution', () => {
    it('only allows kill at disposable stage with enough actor power and public cover', () => {
        const actor = makeNpc({ id: 'linghuelvguang', name: '令狐律光', trust: 86, militaryPower: 72 })
        const target = makeNpc({ id: 'yuwendi', name: '宇文棣', disposalStage: 'disposable' })

        const result = resolveBorrowedBladeProxy({
            round: 12,
            actorNpc: actor,
            targetNpc: target,
            success: true,
            parse: {
                characterFit: 0.72,
                eventFit: 0.7,
                structuralPenetration: 0.74,
                executability: 0.71,
                exposureRisk: 0.2,
                financeRelevance: 0.1,
                grainRelevance: 0.18,
                militaryRelevance: 0.46,
                socialOrderRelevance: 0.4,
                governanceRelevance: 0.54,
                dominantIntent: 'divide',
                proxyTransmission: 0.82,
                evidence: [],
            },
        })

        expect(result?.outcome).toBe('kill')
        expect(result?.kill).toBe(true)
    })

    it('builds an advisor-facing hint from the highest exposed target', () => {
        const hint = getHighestBorrowedBladeStageLabel([
            makeNpc({ id: 'zuting', name: '祖廷', disposalStage: 'isolated' }),
            makeNpc({ id: 'yuwendi', name: '宇文棣', disposalStage: 'questioned' }),
        ])

        expect(hint).toContain('祖廷')
        expect(hint).toContain('已被孤立')
    })
})
