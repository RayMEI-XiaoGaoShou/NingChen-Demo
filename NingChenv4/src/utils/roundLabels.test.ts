import { describe, expect, it } from 'vitest'
import { formatRoundVolumeLabel } from './roundLabels'

describe('round volume labels', () => {
    it('formats court overview HUD rounds as Chinese volume labels', () => {
        expect(formatRoundVolumeLabel(1)).toBe('第一卷')
        expect(formatRoundVolumeLabel(7)).toBe('第七卷')
        expect(formatRoundVolumeLabel(20)).toBe('第二十卷')
    })
})
