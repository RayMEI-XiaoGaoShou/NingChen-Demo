import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { INITIAL_NPCS } from '../data/npcs'
import { chatCompletionJson } from '../ai/aiService'
import { clearAiGameMasterDebugRecords, getAiGameMasterDebugRecords } from './aiGameMasterDebug'
import {
    fallbackNorthParseFromSpeech,
    fallbackPolicyParseFromReason,
    parseSchemeFollowUpInput,
    parseNorthSchemeInput,
    normalizeNorthSchemeParse,
    normalizePolicyReasonParse,
} from './aiNativeEngine'

vi.mock('../ai/aiService', () => ({
    chatCompletionJson: vi.fn(),
}))

const chatCompletionJsonMock = vi.mocked(chatCompletionJson)

beforeEach(() => {
    chatCompletionJsonMock.mockReset()
    clearAiGameMasterDebugRecords()
})

afterEach(() => {
    delete (globalThis as { __NINGCHEN_AI_GM_DEBUG__?: boolean }).__NINGCHEN_AI_GM_DEBUG__
})

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
            speech: '西线局势复杂，望公安稳地方，不必令朝中再生猜疑。',
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

    it('uses provided campaign event context instead of only the static round event', () => {
        const zuting = INITIAL_NPCS.find(npc => npc.id === 'zuting')!
        const speech = '寿春一线已被南陈撕开缺口，粮道与前线同时受压，眼下不宜再把兵粮耗在虚名之争。'
        const staticRoundContext = fallbackNorthParseFromSpeech({
            speech,
            npc: zuting,
            round: 11,
        })
        const branchRoundContext = fallbackNorthParseFromSpeech({
            speech,
            npc: zuting,
            round: 11,
            eventName: '淮南失守，北周前线后方俱显疲态',
            eventBriefing: '淮南急报入京，寿春一线已被南陈撕开缺口，粮道与前线同时受压。',
        })

        expect(branchRoundContext.eventFit).toBeGreaterThan(staticRoundContext.eventFit)
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

    it('keeps keyword-only fallback text weaker than actionable structural text', () => {
        const zuting = INITIAL_NPCS.find(npc => npc.id === 'zuting')!

        const keywordOnly = fallbackNorthParseFromSpeech({
            speech: '军令粮道皆是大事，朝局复杂，人心不稳，诸事都该谨慎。',
            npc: zuting,
            round: 10,
            schemeType: 'advise',
        })
        const actionable = fallbackNorthParseFromSpeech({
            speech: '可先清点仓储，再把粮道转运与军令节次收回中枢，由御史逐项核账。',
            npc: zuting,
            round: 10,
            schemeType: 'advise',
        })

        expect(actionable.executability).toBeGreaterThan(keywordOnly.executability)
        expect(actionable.structuralPenetration).toBeGreaterThan(keywordOnly.structuralPenetration)
        expect(actionable.grainRelevance).toBeGreaterThan(keywordOnly.grainRelevance)
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

    it('scores external-warlord omen suspicion and center sanctions in fallback parsing', () => {
        const heba = INITIAL_NPCS.find(npc => npc.powerBase === 'external' && npc.militaryPower === 55)!

        const parsed = fallbackNorthParseFromSpeech({
            speech: '此人借西线军势自重，明面奉朝，暗里却把兵粮和军需卡在手里。若再纵容，可先截断粮道、放慢军需，并派御史与监军核账。',
            npc: heba,
            round: 13,
            schemeType: 'omen',
            omenSpeechInput: {
                omenText: '石马夜鸣，西镇军旗忽动。',
                interpretationText: '此非泛泛不祥，而是直指外镇军头借兵自重，可先截断粮道并派御史监督。',
            },
        })

        expect(parsed.omenAccusationClarity).toBeGreaterThan(0.4)
        expect(parsed.centralSanctionLeverage).toBeGreaterThan(0.4)
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

    it('normalizes intrigue transmission fields', () => {
        const parsed = normalizeNorthSchemeParse({
            suspicionTransmission: 0.64,
            fractureTransmission: 0.71,
            proxyTransmission: 0.58,
        })

        expect(parsed.suspicionTransmission).toBeCloseTo(0.64, 2)
        expect(parsed.fractureTransmission).toBeCloseTo(0.71, 2)
        expect(parsed.proxyTransmission).toBeCloseTo(0.58, 2)
    })

    it('normalizes omen accusation and sanction leverage fields', () => {
        const parsed = normalizeNorthSchemeParse({
            omenAccusationClarity: 1.24,
            centralSanctionLeverage: -0.4,
        })

        expect(parsed.omenAccusationClarity).toBe(1)
        expect(parsed.centralSanctionLeverage).toBe(0)
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

    it('keeps intrigue transmission conservative for generic pressure language', () => {
        const parsed = fallbackNorthParseFromSpeech({
            speech: '他未必真心，朝里风向也不稳，谁都可能先保自己。',
            npc: INITIAL_NPCS.find(npc => npc.id === 'zongai')!,
            round: 10,
            schemeType: 'slander',
            relatedNpc: INITIAL_NPCS.find(npc => npc.id === 'zuting')!,
        })

        expect(parsed.suspicionTransmission ?? 0).toBeLessThan(0.35)
        expect(parsed.fractureTransmission ?? 0).toBeLessThan(0.35)
        expect(parsed.proxyTransmission ?? 0).toBeLessThan(0.35)
    })

    it('backfills omen-specialized fields when AI output leaves them near zero', async () => {
        const heba = INITIAL_NPCS.find(npc => npc.powerBase === 'external' && npc.militaryPower === 55)!

        chatCompletionJsonMock.mockResolvedValue({
            characterFit: 0.18,
            eventFit: 0.22,
            structuralPenetration: 0.14,
            executability: 0.09,
            exposureRisk: 0.11,
            financeRelevance: 0.03,
            grainRelevance: 0.05,
            militaryRelevance: 0.04,
            socialOrderRelevance: 0.02,
            governanceRelevance: 0.08,
            dominantIntent: 'strategize',
            omenAccusationClarity: 0,
            centralSanctionLeverage: 0,
            stateBenefit: 0,
            targetBenefit: 0,
            factionBenefit: 0,
            advicePolarity: 'neutral_or_vague',
            legitimacyDirection: 0,
            omenPolarity: 'destabilizing',
            selfTrapPotential: 0,
            scapegoatClarity: 0,
            omenAnchorStrength: 0.12,
            legitimacyCrack: 0.34,
            suspicionDirection: 0,
            suspicionTransmission: 0,
            fractureTransmission: 0,
            proxyTransmission: 0,
            evidence: ['ai left omen fields blank'],
        })

        const parsed = await parseNorthSchemeInput({
            round: 13,
            npc: heba,
            schemeType: 'omen',
            speech: '此人借西线军势自重，明面奉朝，暗里却把兵粮和军需卡在手里。若再纵容，可先截断粮道、放慢军需，并派御史与监军核账。',
            omenSpeechInput: {
                omenText: '石马夜鸣，西镇军旗忽动。',
                interpretationText: '此非泛泛不祥，而是直指外镇军头借兵自重，可先截断粮道并派御史监督。',
            },
            eventName: '铁骑异动',
            eventBriefing: '朝中正在议论外镇军头是否会借乱自重。',
        })

        expect(chatCompletionJsonMock).toHaveBeenCalledTimes(1)
        expect(parsed.characterFit).toBe(0.18)
        expect(parsed.omenAccusationClarity).toBeGreaterThan(0.4)
        expect(parsed.centralSanctionLeverage).toBeGreaterThan(0.4)
        expect(parsed.omenPolarity).toBe('destabilizing')
    })

    it('falls back when remote north parse lacks the core numeric schema', async () => {
        ;(globalThis as { __NINGCHEN_AI_GM_DEBUG__?: boolean }).__NINGCHEN_AI_GM_DEBUG__ = true
        const zuting = INITIAL_NPCS.find(npc => npc.id === 'zuting')!
        chatCompletionJsonMock.mockResolvedValue({
            characterFit: 0.99,
            evidence: ['missing most fields'],
        })

        const parsed = await parseNorthSchemeInput({
            round: 10,
            npc: zuting,
            schemeType: 'advise',
            speech: '可先清点仓储，再把粮道转运与军令节次收回中枢，由御史逐项核账。',
            eventName: '西线粮道吃紧',
            eventBriefing: '朝中争论军令、粮道与中枢调度。',
        })

        expect(chatCompletionJsonMock).toHaveBeenCalledTimes(1)
        expect(parsed.characterFit).toBeLessThan(0.99)
        expect(parsed.governanceRelevance).toBeGreaterThan(0.35)
        expect(getAiGameMasterDebugRecords().at(-1)?.source).toBe('invalid_ai_fallback')
    })

    it('marks valid AI north parses that needed fallback dimension merging', async () => {
        ;(globalThis as { __NINGCHEN_AI_GM_DEBUG__?: boolean }).__NINGCHEN_AI_GM_DEBUG__ = true
        const zuting = INITIAL_NPCS.find(npc => npc.id === 'zuting')!
        chatCompletionJsonMock.mockResolvedValue({
            characterFit: 0.72,
            eventFit: 0.7,
            structuralPenetration: 0.64,
            executability: 0.68,
            exposureRisk: 0.18,
            financeRelevance: 0,
            grainRelevance: 0,
            militaryRelevance: 0,
            socialOrderRelevance: 0,
            governanceRelevance: 0,
            dominantIntent: 'strategize',
            evidence: ['valid core but blank dimensions'],
        })

        await parseNorthSchemeInput({
            round: 10,
            npc: zuting,
            schemeType: 'advise',
            speech: '可先清点仓储，再把粮道转运与军令节次收回中枢，由御史逐项核账。',
            eventName: '西线粮道吃紧',
            eventBriefing: '朝中争论军令、粮道与中枢调度。',
        })

        expect(getAiGameMasterDebugRecords().at(-1)?.source).toBe('ai_with_fallback_merge')
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

    it('keeps slogan-only policy reasoning conservative in local fallback', () => {
        const parsed = fallbackPolicyParseFromReason(
            '臣以为当以民为本，稳住人心，徐图后效。',
            {
                aiScoringFocus: '是否考虑流民安置与资源分配',
                legitimacyEffect: 'steady',
            },
        )

        expect(parsed.focusAlignment).toBeLessThan(0.35)
        expect(parsed.executionClarity).toBeLessThan(0.25)
    })
})

describe('parseSchemeFollowUpInput', () => {
    it('does not reward long but non-substantive fallback replies as successful clarification', async () => {
        chatCompletionJsonMock.mockResolvedValue(null)
        const npc = INITIAL_NPCS.find(item => item.id === 'zuting')!

        const parsed = await parseSchemeFollowUpInput({
            round: 6,
            eventName: '测试事件',
            eventBriefing: '测试局势',
            npc,
            schemeType: 'advise',
            originalSpeech: '原始说辞',
            originalParse: normalizeNorthSchemeParse({
                characterFit: 0.52,
                eventFit: 0.45,
                structuralPenetration: 0.42,
                executability: 0.5,
                exposureRisk: 0.22,
            }),
            npcQuestion: '你究竟要本官如何落笔？',
            playerReply: '此事自当从长计议，稳住大局，免得朝中人心浮动。',
        })

        expect(parsed.successRateDelta).toBe(0)
        expect(parsed.effectMultiplierDelta).toBe(0)
        expect(parsed.contradictionRisk).toBeGreaterThan(0.2)
    })

    it('falls back when remote follow-up parse lacks the required delta schema', async () => {
        chatCompletionJsonMock.mockResolvedValue({
            clarificationFit: 0.9,
        })
        const npc = INITIAL_NPCS.find(item => item.id === 'zuting')!

        const parsed = await parseSchemeFollowUpInput({
            round: 6,
            eventName: '测试事件',
            eventBriefing: '测试局势',
            npc,
            schemeType: 'advise',
            originalSpeech: '原始说辞',
            originalParse: normalizeNorthSchemeParse({
                characterFit: 0.52,
                eventFit: 0.45,
                structuralPenetration: 0.42,
                executability: 0.5,
                exposureRisk: 0.22,
            }),
            npcQuestion: '你究竟要本官如何落笔？',
            playerReply: '不是要你明争，而是先把粮道核账写成例行清查，再请太后顺势收紧。',
        })

        expect(parsed.clarificationFit).toBeLessThan(0.9)
        expect(parsed.evidence[0]).toContain('追问')
    })
})
