import { describe, expect, it } from 'vitest'
import { normalizeNorthSchemeParse, normalizePolicyReasonParse } from './aiNativeEngine'

describe('normalizeNorthSchemeParse', () => {
    it('falls back to safe defaults when AI output is invalid', () => {
        const parsed = normalizeNorthSchemeParse(null)

        expect(parsed.characterFit).toBe(0)
        expect(parsed.eventFit).toBe(0)
        expect(parsed.structuralPenetration).toBe(0)
        expect(parsed.executability).toBe(0)
        expect(parsed.exposureRisk).toBe(0)
        expect(parsed.dominantIntent).toBe('neutral')
        expect(parsed.evidence).toEqual([])
    })
})

describe('normalizePolicyReasonParse', () => {
    it('clamps parser output into the expected range', () => {
        const parsed = normalizePolicyReasonParse({
            focusAlignment: 2,
            executionClarity: -1,
            costAwareness: 0.6,
            legitimacyAlignment: 0.8,
            policyStance: 'balanced',
            evidence: ['a'],
        })

        expect(parsed.focusAlignment).toBe(1)
        expect(parsed.executionClarity).toBe(0)
        expect(parsed.costAwareness).toBe(0.6)
        expect(parsed.legitimacyAlignment).toBe(0.8)
        expect(parsed.policyStance).toBe('balanced')
        expect(parsed.evidence).toEqual(['a'])
    })
})
