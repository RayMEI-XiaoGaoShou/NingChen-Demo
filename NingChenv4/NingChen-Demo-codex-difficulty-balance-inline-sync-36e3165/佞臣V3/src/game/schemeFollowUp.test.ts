import { describe, expect, it } from 'vitest'
import type { NorthSchemeParseResult, SchemeAction, SchemeFollowUpParseResult } from './types'
import {
    applySchemeFollowUpToNorthParse,
    extractFinalQuestion,
    extractTerminalQuestion,
    forceQuestionCandidateReplyText,
    forceStatementReplyText,
    normalizeSchemeFollowUpParse,
    selectRequiredSchemeFollowUpCandidateId,
    selectSchemeFollowUpCandidateId,
    shouldBlockSettlementForFollowUp,
} from './schemeFollowUp'

function makeNorthParse(overrides: Partial<NorthSchemeParseResult> = {}): NorthSchemeParseResult {
    return {
        characterFit: 0.56,
        eventFit: 0.56,
        structuralPenetration: 0.56,
        executability: 0.56,
        exposureRisk: 0.24,
        financeRelevance: 0.2,
        grainRelevance: 0.2,
        militaryRelevance: 0.2,
        socialOrderRelevance: 0.2,
        governanceRelevance: 0.2,
        dominantIntent: 'neutral',
        stateBenefit: 0,
        targetBenefit: 0,
        factionBenefit: 0,
        legitimacyDirection: 0,
        suspicionDirection: 0,
        suspicionTransmission: 0,
        fractureTransmission: 0,
        proxyTransmission: 0,
        evidence: ['base note'],
        ...overrides,
    }
}

function makeAction(id: string, schemeType: SchemeAction['schemeType'], northParse: NorthSchemeParseResult, followUp?: SchemeAction['followUp']): SchemeAction {
    return {
        id,
        targetNpcId: `${id}-target`,
        schemeType,
        playerSpeech: `${id} speech`,
        northParse,
        followUp,
    }
}

describe('schemeFollowUp helpers', () => {
    it('normalizes follow-up parse bounds and trims evidence', () => {
        const parsed = normalizeSchemeFollowUpParse({
            clarificationFit: 2,
            npcInterestFit: -1,
            pressureControl: 1.4,
            contradictionRisk: -0.2,
            exposureRiskDelta: 0.5,
            successRateDelta: -0.4,
            effectMultiplierDelta: 0.3,
            evidence: ['  first  ', '', ' second', 'third', 'fourth'],
        })

        expect(parsed).toEqual({
            clarificationFit: 1,
            npcInterestFit: 0,
            pressureControl: 1,
            contradictionRisk: 0,
            exposureRiskDelta: 0.18,
            successRateDelta: -0.08,
            effectMultiplierDelta: 0.18,
            evidence: ['first', 'second', 'third'],
        })
    })

    it('selects the near-threshold probe candidate and ignores follow-up-heavy options', () => {
        const actions: SchemeAction[] = [
            makeAction('weak', 'probe', makeNorthParse({ characterFit: 0.1, eventFit: 0.12, executability: 0.14, structuralPenetration: 0.08, exposureRisk: 0.76 })),
            makeAction('center', 'probe', makeNorthParse({ characterFit: 0.58, eventFit: 0.54, executability: 0.57, structuralPenetration: 0.55, exposureRisk: 0.22 })),
            makeAction('strong', 'frame', makeNorthParse({ characterFit: 0.9, eventFit: 0.9, executability: 0.88, structuralPenetration: 0.86, exposureRisk: 0.06 })),
            makeAction('followed', 'advise', makeNorthParse({ characterFit: 0.57, eventFit: 0.56, executability: 0.55, structuralPenetration: 0.54, exposureRisk: 0.21 }), {
                questionText: 'Need another check?',
                status: 'available',
            }),
        ]

        expect(selectSchemeFollowUpCandidateId(actions)).toBe('center')
    })

    it('never selects an action that already has a follow-up', () => {
        const actions: SchemeAction[] = [
            makeAction('settled-strong', 'advise', makeNorthParse({ characterFit: 0.64, eventFit: 0.62, executability: 0.63, structuralPenetration: 0.61, exposureRisk: 0.2 }), {
                questionText: 'Already resolved?',
                status: 'answered',
            }),
            makeAction('open-too-weak', 'probe', makeNorthParse({ characterFit: 0.06, eventFit: 0.08, executability: 0.07, structuralPenetration: 0.05, exposureRisk: 0.85 })),
        ]

        expect(selectSchemeFollowUpCandidateId(actions)).toBeNull()
    })

    it('returns null when all actions are obviously weak or settled', () => {
        const actions: SchemeAction[] = [
            makeAction('weak-one', 'proxy', makeNorthParse({ characterFit: 0.1, eventFit: 0.14, executability: 0.12, structuralPenetration: 0.08, exposureRisk: 0.8 })),
            makeAction('weak-two', 'omen', makeNorthParse({ characterFit: 0.18, eventFit: 0.16, executability: 0.2, structuralPenetration: 0.1, exposureRisk: 0.7 }), {
                questionText: 'Already settled?',
                status: 'skipped',
            }),
        ]

        expect(selectSchemeFollowUpCandidateId(actions)).toBeNull()
    })

    it('falls back to one parsed action when a follow-up is required', () => {
        const actions: SchemeAction[] = [
            makeAction('weak-one', 'proxy', makeNorthParse({ characterFit: 0.1, eventFit: 0.14, executability: 0.12, structuralPenetration: 0.08, exposureRisk: 0.8 })),
            makeAction('weak-two', 'omen', makeNorthParse({ characterFit: 0.18, eventFit: 0.16, executability: 0.2, structuralPenetration: 0.1, exposureRisk: 0.7 })),
        ]

        expect(selectRequiredSchemeFollowUpCandidateId(actions)).toBe('weak-one')
    })

    it('applies follow-up parse adjustments without mutating the original parse', () => {
        const base = makeNorthParse({
            characterFit: 0.4,
            eventFit: 0.45,
            executability: 0.5,
            exposureRisk: 0.3,
            evidence: ['base one', 'base two'],
        })
        const followUpParse: SchemeFollowUpParseResult = {
            clarificationFit: 0.8,
            npcInterestFit: 0.7,
            pressureControl: 0.9,
            contradictionRisk: 0.2,
            exposureRiskDelta: -0.1,
            successRateDelta: 0.05,
            effectMultiplierDelta: 0.11,
            evidence: ['follow one', 'follow two'],
        }

        const result = applySchemeFollowUpToNorthParse(base, {
            questionText: 'Why now?',
            status: 'answered',
            parse: followUpParse,
        })

        expect(result).not.toBe(base)
        expect(result.evidence).toEqual(['base one', 'base two', 'follow one'])
        expect(result.evidence).not.toBe(base.evidence)
        expect(base).toEqual(makeNorthParse({
            characterFit: 0.4,
            eventFit: 0.45,
            executability: 0.5,
            exposureRisk: 0.3,
            evidence: ['base one', 'base two'],
        }))
        expect(result.characterFit).toBeGreaterThan(base.characterFit)
        expect(result.executability).toBeGreaterThan(base.executability)
        expect(result.exposureRisk).toBeCloseTo(0.2)
    })

    it('extracts the final question segment for English and Chinese question marks', () => {
        expect(extractFinalQuestion('First explain the plan. Then answer this: what happens next?')).toBe('Then answer this: what happens next?')
        const chineseReply = 'First sentence\u3002Second question\uFF1F'
        expect(extractFinalQuestion(chineseReply)).toBe('Second question\uFF1F')
    })

    it('only treats a terminal question as the follow-up hook', () => {
        expect(extractTerminalQuestion('先问一句：你要如何？随后他把话收住。')).toBeNull()
        expect(extractTerminalQuestion('先铺垫。你究竟要我如何？')).toBe('你究竟要我如何？')
    })

    it('forces non-candidate replies to end declaratively', () => {
        const reply = forceStatementReplyText('他把杯盏放下，问你究竟要如何落笔？')

        expect(reply).not.toMatch(/[?？]\s*$/)
        expect(reply).toBe('他把杯盏放下。')
    })

    it('forces the selected candidate to expose exactly one terminal question hook', () => {
        const reply = forceQuestionCandidateReplyText('他把话听完，只说此事可慢慢筹划。', '你究竟想让本公先压谁？')

        expect(reply).toContain('他把话听完，只说此事可慢慢筹划。')
        expect(extractTerminalQuestion(reply)).toBe('你究竟想让本公先压谁？')
    })

    it('blocks settlement while follow-up is available or being submitted', () => {
        const actions: SchemeAction[] = [
            makeAction('answered', 'probe', makeNorthParse(), {
                questionText: 'Already done?',
                status: 'answered',
            }),
            makeAction('available', 'advise', makeNorthParse(), {
                questionText: 'Need response?',
                status: 'available',
            }),
        ]

        expect(shouldBlockSettlementForFollowUp(actions, false)).toBe(true)
        expect(shouldBlockSettlementForFollowUp(actions, true)).toBe(true)
        expect(shouldBlockSettlementForFollowUp([actions[0]], false)).toBe(false)
    })
})
