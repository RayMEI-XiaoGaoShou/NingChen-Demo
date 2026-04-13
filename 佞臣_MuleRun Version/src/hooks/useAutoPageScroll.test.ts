import { describe, expect, it } from 'vitest'
import { getAutoScrollTargetY } from './useAutoPageScroll'

describe('getAutoScrollTargetY', () => {
    it('uses elapsed time from the starting position so tiny frame deltas accumulate visibly', () => {
        expect(getAutoScrollTargetY({
            startY: 120,
            elapsedMs: 1000,
            pixelsPerSecond: 10,
        })).toBe(130)
        expect(getAutoScrollTargetY({
            startY: 120,
            elapsedMs: 5000,
            pixelsPerSecond: 6,
        })).toBe(150)
    })
})
