import { describe, expect, it } from 'vitest'
import { INITIAL_NPCS } from '../data/npcs'
import {
    fallbackNorthParseFromSpeech,
    fallbackPolicyParseFromReason,
    normalizeNorthSchemeParse,
    normalizePolicyReasonParse,
} from './aiNativeEngine'

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
        expect(parsed.stateBenefit).toBe(0)
        expect(parsed.targetBenefit).toBe(0)
        expect(parsed.factionBenefit).toBe(0)
        expect(parsed.advicePolarity).toBe('neutral_or_vague')
        expect(parsed.legitimacyDirection).toBe(0)
        expect(parsed.omenPolarity).toBe('vague_or_ceremonial')
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
            speech: '若不先稳住军粮、转运与前线调度，河西一线很快就会失控。',
            npc: heba,
            round: 8,
        })

        expect(warLogistics.militaryRelevance).toBeGreaterThan(generic.militaryRelevance)
        expect(warLogistics.grainRelevance).toBeGreaterThan(generic.grainRelevance)
    })

    it('recognizes court logistics advice as governance-heavy battle preparation', () => {
        const zuting = INITIAL_NPCS.find(npc => npc.id === 'zuting')!

        const parsed = fallbackNorthParseFromSpeech({
            speech: '先把仓储、转运、诏令节次与州郡承接收回中枢，再谈压流言，否则名分裂口迟早会传到前线。',
            npc: zuting,
            round: 10,
        })

        expect(parsed.governanceRelevance).toBeGreaterThan(0.45)
        expect(parsed.grainRelevance).toBeGreaterThan(0.35)
        expect(parsed.structuralPenetration).toBeGreaterThan(0.35)
        expect(parsed.executability).toBeGreaterThan(0.45)
    })

    it('adds polarity fields to fallback north parse results', () => {
        const parsed = fallbackNorthParseFromSpeech({
            speech: '先稳住仓储与转运，再整饬诏令，免得前后失序。',
            npc: INITIAL_NPCS.find(npc => npc.id === 'zuting')!,
            round: 5,
            relatedNpc: null,
        })

        expect(parsed.advicePolarity).toBeDefined()
        expect(parsed.omenPolarity).toBeDefined()
        expect(typeof parsed.stateBenefit).toBe('number')
        expect(typeof parsed.targetBenefit).toBe('number')
        expect(typeof parsed.factionBenefit).toBe('number')
        expect(typeof parsed.legitimacyDirection).toBe('number')
    })

    it('normalizes frame specialist fields and omen specialist fields', () => {
        const parsed = normalizeNorthSchemeParse({
            selfTrapPotential: 0.72,
            scapegoatClarity: 0.64,
            omenAnchorStrength: 0.81,
            legitimacyCrack: 0.75,
            suspicionDirection: 0.58,
        })

        expect(parsed.selfTrapPotential).toBeCloseTo(0.72, 2)
        expect(parsed.scapegoatClarity).toBeCloseTo(0.64, 2)
        expect(parsed.omenAnchorStrength).toBeCloseTo(0.81, 2)
        expect(parsed.legitimacyCrack).toBeCloseTo(0.75, 2)
        expect(parsed.suspicionDirection).toBeCloseTo(0.58, 2)
    })

    it('classifies clearly pro-state advice as pro_state in fallback parsing', () => {
        const parsed = fallbackNorthParseFromSpeech({
            speech: '先稳住仓储与转运，再整饬诏令，免得前后失序。',
            npc: INITIAL_NPCS.find(npc => npc.id === 'zuting')!,
            round: 5,
            relatedNpc: null,
        })

        expect(parsed.advicePolarity).toBe('pro_state')
        expect(parsed.stateBenefit).toBeGreaterThan(0)
    })

    it('classifies private-benefit advice as pro_target_anti_state in fallback parsing', () => {
        const parsed = fallbackNorthParseFromSpeech({
            speech: '不妨先把兵粮与节钺抓在你自己手里，旁人有怨也只能听命。',
            npc: INITIAL_NPCS.find(npc => npc.id === 'zuting')!,
            round: 5,
            relatedNpc: null,
        })

        expect(parsed.advicePolarity).toBe('pro_target_anti_state')
        expect(parsed.targetBenefit).toBeGreaterThan(0)
        expect(parsed.stateBenefit).toBeLessThan(0)
    })

    it('classifies destabilizing omen as anti-legitimacy in fallback parsing', () => {
        const parsed = fallbackNorthParseFromSpeech({
            speech: '灾异既著，名分已摇，若再强压，只会叫上下都疑心天命不在朝廷。',
            npc: INITIAL_NPCS.find(npc => npc.id === 'zuting')!,
            round: 13,
            relatedNpc: null,
        })

        expect(parsed.omenPolarity).toBe('destabilizing')
        expect(parsed.legitimacyDirection).toBeLessThan(0)
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

    it('recognizes logistics-first policy reasoning as campaign preparation', () => {
        const parsed = fallbackPolicyParseFromReason(
            '先断粮道、稳转运、压实接管次序，宁可慢一步也别把补给线拖垮，再把蜀地战果变成可持续的占领。',
            {
                aiScoringFocus: '是否考虑蜀道之难与后勤现实',
                legitimacyEffect: 'steady',
            },
        )

        expect(parsed.focusAlignment).toBeGreaterThan(0.4)
        expect(parsed.executionClarity).toBeGreaterThan(0.45)
        expect(parsed.costAwareness).toBeGreaterThan(0.2)
        expect(parsed.policyStance).toBe('balanced')
    })
})
