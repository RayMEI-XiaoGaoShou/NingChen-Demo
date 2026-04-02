import { describe, expect, it } from 'vitest'
import { LIVE_BALANCE_SAMPLE_SET, SAMPLE_SET_VERSION } from './sampleLibrary'

describe('live balance sample library', () => {
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
})
