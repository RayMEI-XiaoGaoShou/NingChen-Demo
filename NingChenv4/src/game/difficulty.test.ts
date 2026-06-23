import { describe, expect, it } from 'vitest'
import { getDifficultyProfile } from './difficulty'

describe('difficulty profiles', () => {
    it('returns normal as the default playable profile', () => {
        expect(getDifficultyProfile('normal').id).toBe('normal')
        expect(getDifficultyProfile('normal').scheme.baseRate).toBe(0.53)
        expect(getDifficultyProfile('normal').southGrowthMultiplier).toBe(0.8)
        expect(getDifficultyProfile('normal').policyImmediateMultiplier).toBe(0.74)
        expect(getDifficultyProfile('normal').policyAftereffectMultiplier).toBe(0.62)
    })

    it('keeps easier profiles more forgiving than harder ones', () => {
        expect(getDifficultyProfile('easy').scheme.baseRate).toBeGreaterThan(
            getDifficultyProfile('hard').scheme.baseRate,
        )
        expect(getDifficultyProfile('hard').scheme.baseRate).toBeGreaterThan(
            getDifficultyProfile('hell').scheme.baseRate,
        )
        expect(getDifficultyProfile('easy').southGrowthMultiplier).toBeGreaterThan(
            getDifficultyProfile('normal').southGrowthMultiplier,
        )
        expect(getDifficultyProfile('normal').southGrowthMultiplier).toBeGreaterThan(
            getDifficultyProfile('hard').southGrowthMultiplier,
        )
    })

    it('keeps Feng Daozhi assist quota fixed across difficulty levels', () => {
        expect(getDifficultyProfile('easy').onboarding.fengDaozhiAssistsPerRound).toBe(3)
        expect(getDifficultyProfile('normal').onboarding.fengDaozhiAssistsPerRound).toBe(3)
        expect(getDifficultyProfile('hard').onboarding.fengDaozhiAssistsPerRound).toBe(3)
        expect(getDifficultyProfile('hell').onboarding.fengDaozhiAssistsPerRound).toBe(3)
    })
})
