import { describe, expect, it } from 'vitest'
import { deriveHuainanCarryBonus, deriveShuGainBias } from './campaignCarryover'

describe('campaignCarryover', () => {
    it('gives shu a stronger single-gain conversion bias on normal when prep is real', () => {
        expect(deriveShuGainBias('normal', 4.8, 1.6)).toBeGreaterThan(1)
    })

    it('keeps shu gain bias off on non-normal difficulties', () => {
        expect(deriveShuGainBias('easy', 4.8, 1.6)).toBe(0)
        expect(deriveShuGainBias('hard', 4.8, 1.6)).toBe(0)
    })

    it('lets shu gained help huainan more than shu stalemate', () => {
        expect(deriveHuainanCarryBonus('gained', 'normal')).toBeGreaterThan(
            deriveHuainanCarryBonus('stalemate', 'normal'),
        )
    })

    it('does not let shu failed help huainan', () => {
        expect(deriveHuainanCarryBonus('failed', 'normal')).toBe(0)
    })
})
