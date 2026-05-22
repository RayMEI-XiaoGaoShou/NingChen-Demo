import { describe, expect, it } from 'vitest'
import { getRoundStartTextCapacityAudit, getRoundPublicStatementTextCapacityAudit } from './uiTextCapacityAudit'

describe('UI text capacity audit', () => {
    it('flags every round-start briefing paragraph against the scroll safe text budget', () => {
        const audit = getRoundStartTextCapacityAudit()

        expect(audit.length).toBeGreaterThan(0)
        expect(audit[0]).toEqual(expect.objectContaining({
            round: 1,
            paragraphCount: 2,
            maxEstimatedLines: expect.any(Number),
            maxParagraphChars: expect.any(Number),
            exceedsSafeBudget: false,
        }))
        expect(audit.filter(item => item.exceedsSafeBudget)).toEqual([])
    })

    it('flags every public statement variant against the reaction-paper safe text budget', () => {
        const audit = getRoundPublicStatementTextCapacityAudit()

        expect(audit.length).toBeGreaterThan(0)
        expect(audit[0]).toEqual(expect.objectContaining({
            round: expect.any(Number),
            variant: expect.any(String),
            roleName: expect.any(String),
            charCount: expect.any(Number),
            estimatedLines: expect.any(Number),
            exceedsSafeBudget: false,
        }))
        expect(audit.filter(item => item.exceedsSafeBudget)).toEqual([])
    })
})
