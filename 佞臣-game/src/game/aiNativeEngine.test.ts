import { describe, expect, it } from 'vitest'
import { INITIAL_NPCS } from '../data/npcs'
import { fallbackNorthParseFromSpeech, normalizeNorthSchemeParse, normalizePolicyReasonParse } from './aiNativeEngine'

describe('normalizeNorthSchemeParse', () => {
    it('falls back to safe defaults when AI output is invalid', () => {
        const parsed = normalizeNorthSchemeParse(null)

        expect(parsed.characterFit).toBe(0)
        expect(parsed.eventFit).toBe(0)
        expect(parsed.structuralPenetration).toBe(0)
        expect(parsed.executability).toBe(0)
        expect(parsed.exposureRisk).toBe(0)
        expect(parsed.financeRelevance).toBe(0)
        expect(parsed.grainRelevance).toBe(0)
        expect(parsed.militaryRelevance).toBe(0)
        expect(parsed.socialOrderRelevance).toBe(0)
        expect(parsed.governanceRelevance).toBe(0)
        expect(parsed.dominantIntent).toBe('neutral')
        expect(parsed.evidence).toEqual([])
    })

    it('derives higher military and grain relevance from war logistics speech than from generic lobbying', () => {
        const heba = INITIAL_NPCS.find(npc => npc.powerBase === 'external' && npc.militaryPower === 55)!

        const generic = fallbackNorthParseFromSpeech({
            speech: '西线局势复杂，望公先稳住地方，不必让朝中再生猜疑。',
            npc: heba,
            round: 8,
        })

        const warLogistics = fallbackNorthParseFromSpeech({
            speech: '若不先稳住兵粮、转运与前线调度，河西一线很快就会失控。',
            npc: heba,
            round: 8,
        })

        expect(warLogistics.militaryRelevance).toBeGreaterThan(generic.militaryRelevance)
        expect(warLogistics.grainRelevance).toBeGreaterThan(generic.grainRelevance)
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
