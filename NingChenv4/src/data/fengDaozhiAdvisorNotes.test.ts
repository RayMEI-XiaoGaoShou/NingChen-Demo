import { describe, expect, it } from 'vitest'
import { getFengDaozhiAdvisorNote } from './fengDaozhiAdvisorNotes'

describe('fengDaozhiAdvisorNotes', () => {
    it('returns the selected HebaQi advisor note for both stable and accented ids', () => {
        const stableNote = getFengDaozhiAdvisorNote('hebaqi')
        const accentedNote = getFengDaozhiAdvisorNote('hebaqí')

        expect(stableNote).toBe(accentedNote)
        expect(stableNote).toContain('太后摄政五载')
        expect(stableNote).toContain('她是棋手')
        expect(stableNote).toContain('一枚顺从的“棋子”')
    })

    it('returns null for ids without an advisor note', () => {
        expect(getFengDaozhiAdvisorNote('unknown')).toBeNull()
    })
})
