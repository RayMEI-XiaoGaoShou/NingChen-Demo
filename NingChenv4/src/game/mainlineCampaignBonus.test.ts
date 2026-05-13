import { describe, expect, it } from 'vitest'
import { deriveMainlineHuainanBonus, deriveMainlineShuBonus } from './mainlineCampaignBonus'

describe('mainlineCampaignBonus', () => {
    it('rewards governance and grain heavy mainline advice on normal', () => {
        expect(deriveMainlineShuBonus({
            difficulty: 'normal',
            schemeSignals: [0.78, 0.66],
            commandSignal: 0.72,
            preparedBonus: 1.2,
            existingMomentum: 4.8,
        })).toBeGreaterThan(0)
    })

    it('does not hand out a bonus for weak generic lines', () => {
        expect(deriveMainlineShuBonus({
            difficulty: 'normal',
            schemeSignals: [0.22, 0.18],
            commandSignal: 0.2,
            preparedBonus: 0,
            existingMomentum: 0,
        })).toBe(0)
    })

    it('stays off outside normal difficulty', () => {
        expect(deriveMainlineShuBonus({
            difficulty: 'easy',
            schemeSignals: [0.78, 0.66],
            commandSignal: 0.72,
            preparedBonus: 1.2,
            existingMomentum: 4.8,
        })).toBe(0)
    })

    it('rewards layered shu preparation that has already accumulated across earlier rounds', () => {
        expect(deriveMainlineShuBonus({
            difficulty: 'normal',
            schemeSignals: [0.64, 0.58],
            commandSignal: 0.63,
            preparedBonus: 1,
            existingMomentum: 4.9,
        })).toBeGreaterThan(0)
    })

    it('gives a stronger breakthrough bonus to sustained ten-round mainline preparation', () => {
        expect(deriveMainlineShuBonus({
            difficulty: 'normal',
            schemeSignals: [0.7, 0.6, 0.5],
            commandSignal: 0.9,
            preparedBonus: 1.2,
            existingMomentum: 11.7,
        })).toBeGreaterThanOrEqual(3)
    })

    it('rewards continued mainline huainan preparation after shu is gained', () => {
        expect(deriveMainlineHuainanBonus({
            difficulty: 'normal',
            shuResolvedState: 'gained',
            schemeSignals: [0.76, 0.67],
            commandSignal: 0.72,
            preparedBonus: 1.2,
        })).toBeGreaterThan(0)
    })

    it('does not hand out huainan continuation without an earlier shu breakthrough', () => {
        expect(deriveMainlineHuainanBonus({
            difficulty: 'normal',
            shuResolvedState: 'stalemate',
            schemeSignals: [0.76, 0.67],
            commandSignal: 0.72,
            preparedBonus: 1.2,
        })).toBe(0)
    })
})
