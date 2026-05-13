import { describe, expect, it } from 'vitest'
import type { NPC } from './types'
import {
    deriveCourtFavorHit,
    resolveCourtDispositionProxy,
} from './courtDispositionEngine'

function actor(overrides: Partial<NPC>): NPC {
    return {
        id: 'yuwendi',
        name: '宇文棣',
        factionId: 'emperor',
        powerBase: 'court',
        title: '',
        publicPersona: '',
        publicStance: '',
        personality: '',
        softSpot: '',
        triggerPoint: '',
        schemeHooks: '',
        trust: 75,
        isAlive: true,
        canExecute: true,
        militaryPower: 20,
        loyaltyToCourt: 80,
        alignmentBias: 'emperor',
        externalStatus: 'loyal',
        availableSchemes: [],
        highRounds: [],
        secretThreads: [],
        emperorFavor: 78,
        empressDowagerFavor: 22,
        courtStatus: 'active',
        deathCause: null,
        deathByNpcId: null,
        deathByNpcName: null,
        deathRound: null,
        ...overrides,
    }
}

describe('courtDispositionEngine favor hits', () => {
    it('lets slander through an emperor-side listener reduce the target emperor favor only', () => {
        expect(
            deriveCourtFavorHit({
                schemeType: 'slander',
                actorNpc: actor({ factionId: 'emperor' }),
                targetNpc: actor({ id: 'zuting', name: '祖珽', emperorFavor: 40, empressDowagerFavor: 74 }),
                success: true,
                parse: {
                    suspicionTransmission: 0.72,
                    fractureTransmission: 0,
                    legitimacyCrack: 0,
                    omenPolarity: 'vague_or_ceremonial',
                } as any,
            }),
        ).toEqual({ emperorFavorDelta: -8, empressDowagerFavorDelta: 0 })
    })

    it('lets frame hit both favor tracks more strongly than omen', () => {
        const frame = deriveCourtFavorHit({
            schemeType: 'frame',
            actorNpc: actor({ id: 'hebaqí', name: '贺拔琪', factionId: 'empress' }),
            targetNpc: actor({ id: 'zuting', name: '祖珽', emperorFavor: 40, empressDowagerFavor: 74 }),
            success: true,
            parse: {
                selfTrapPotential: 0.86,
                scapegoatClarity: 0.81,
                legitimacyCrack: 0,
                omenPolarity: 'vague_or_ceremonial',
            } as any,
        })
        const omen = deriveCourtFavorHit({
            schemeType: 'omen',
            actorNpc: actor({ id: 'zongai', name: '宗艾', factionId: 'emperor' }),
            targetNpc: actor({ id: 'zuting', name: '祖珽', emperorFavor: 40, empressDowagerFavor: 74 }),
            success: true,
            parse: {
                selfTrapPotential: 0,
                scapegoatClarity: 0,
                legitimacyCrack: 0.88,
                omenPolarity: 'destabilizing',
            } as any,
        })

        expect(frame.emperorFavorDelta).toBeLessThan(omen.emperorFavorDelta)
        expect(frame.empressDowagerFavorDelta).toBeLessThan(omen.empressDowagerFavorDelta)
        expect(frame).toEqual({ emperorFavorDelta: -8, empressDowagerFavorDelta: -8 })
        expect(omen).toEqual({ emperorFavorDelta: -6, empressDowagerFavorDelta: -7 })
    })
})

describe('courtDispositionEngine proxy resolution', () => {
    it('dismisses a court target once both favor tracks fall to 35 or below', () => {
        const result = resolveCourtDispositionProxy({
            round: 12,
            actorNpc: actor({ id: 'hebaqí', name: '贺拔琪', factionId: 'empress' }),
            targetNpc: actor({
                id: 'zuting',
                name: '祖珽',
                emperorFavor: 35,
                empressDowagerFavor: 34,
                courtStatus: 'active',
            }),
            success: true,
            parse: { proxyTransmission: 0.82 } as any,
        })

        expect(result?.outcome).toBe('dismissed')
        expect(result?.targetUpdates.courtStatus).toBe('dismissed')
        expect(result?.targetUpdates.isAlive).toBe(true)
    })

    it('executes a court target once both favor tracks fall to 18 or below', () => {
        const result = resolveCourtDispositionProxy({
            round: 12,
            actorNpc: actor({ id: 'zongai', name: '宗艾', factionId: 'emperor' }),
            targetNpc: actor({
                id: 'yuwendi',
                name: '宇文棣',
                emperorFavor: 18,
                empressDowagerFavor: 16,
                courtStatus: 'active',
            }),
            success: true,
            parse: { proxyTransmission: 0.9 } as any,
        })

        expect(result?.outcome).toBe('executed')
        expect(result?.targetUpdates.courtStatus).toBe('executed')
        expect(result?.targetUpdates.isAlive).toBe(false)
        expect(result?.targetUpdates.deathCause).toBe('court_execution')
    })

    it('refuses non-executors even if the target is already actionable', () => {
        const result = resolveCourtDispositionProxy({
            round: 12,
            actorNpc: actor({ id: 'zuting', name: '祖珽', factionId: 'empress' }),
            targetNpc: actor({
                id: 'yuwendi',
                name: '宇文棣',
                emperorFavor: 18,
                empressDowagerFavor: 16,
                courtStatus: 'active',
            }),
            success: true,
            parse: { proxyTransmission: 0.9 } as any,
        })

        expect(result?.outcome).toBe('failed')
        expect(result?.targetUpdates.courtStatus).toBe('active')
    })
})
