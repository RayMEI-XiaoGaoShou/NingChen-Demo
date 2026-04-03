import { describe, expect, it } from 'vitest'
import { LIVE_BALANCE_SAMPLE_SET, SAMPLE_SET_VERSION } from './sampleLibrary'

describe('live balance sample library', () => {
    it('uses the normalized strategy-aligned sample ids', () => {
        expect(LIVE_BALANCE_SAMPLE_SET.map(sample => sample.id)).toEqual([
            'expert-mainline',
            'expert-external',
            'average-mainline',
            'average-omen',
            'average-external',
            'rookie-mainline',
            'rookie-omen-misuse',
            'rookie-aggressive',
        ])
    })

    it('covers the minimum first-wave sample matrix', () => {
        expect(SAMPLE_SET_VERSION).toBeTruthy()
        expect(LIVE_BALANCE_SAMPLE_SET).toHaveLength(8)
        expect(LIVE_BALANCE_SAMPLE_SET.some(sample => sample.level === 'expert' && sample.strategy === 'mainline')).toBe(true)
        expect(LIVE_BALANCE_SAMPLE_SET.some(sample => sample.level === 'average' && sample.strategy === 'omen')).toBe(true)
        expect(LIVE_BALANCE_SAMPLE_SET.some(sample => sample.level === 'rookie' && sample.strategy === 'mainline')).toBe(true)
    })

    it('gives every sample a full 20-round plan with three schemes per round', () => {
        for (const sample of LIVE_BALANCE_SAMPLE_SET) {
            expect(sample.rounds).toHaveLength(20)
            for (const round of sample.rounds) {
                expect(round.schemes).toHaveLength(3)
            }
        }
    })

    it('keeps rookie aggressive speeches visibly less tailored than expert routes', () => {
        const rookieAggressive = LIVE_BALANCE_SAMPLE_SET.find(sample => sample.id === 'rookie-aggressive')
        const expertMainline = LIVE_BALANCE_SAMPLE_SET.find(sample => sample.id === 'expert-mainline')

        expect(rookieAggressive).toBeTruthy()
        expect(expertMainline).toBeTruthy()

        const rookieRoundTwoSpeech = rookieAggressive!.rounds[1].schemes[1].speech
        const expertRoundTwoSpeech = expertMainline!.rounds[1].schemes[0].speech

        expect(rookieRoundTwoSpeech).not.toMatch(/仓储|诏令|节次|接管|法统|灾异/)
        expect(expertRoundTwoSpeech).toMatch(/仓储|诏令|节次|接管|法统|灾异/)
    })
})
