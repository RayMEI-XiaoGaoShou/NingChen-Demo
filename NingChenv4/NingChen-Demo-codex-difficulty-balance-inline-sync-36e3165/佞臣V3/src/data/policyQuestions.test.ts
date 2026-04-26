import { describe, expect, it } from 'vitest'
import { POLICY_QUESTIONS, getPolicyQuestionForRound } from './policyQuestions'

describe('policyQuestions', () => {
    it('returns branch-specific round 11 question based on shu state', () => {
        const gained = getPolicyQuestionForRound(11, { shuCampaignState: 'gained', huainanCampaignState: 'idle' })
        const failed = getPolicyQuestionForRound(11, { shuCampaignState: 'failed', huainanCampaignState: 'idle' })

        expect(gained?.topic).toContain('新地')
        expect(failed?.topic).toContain('止损')
    })

    it('returns branch-specific round 17 question based on huainan state', () => {
        const stalemate = getPolicyQuestionForRound(17, { shuCampaignState: 'idle', huainanCampaignState: 'stalemate' })
        const gained = getPolicyQuestionForRound(17, { shuCampaignState: 'idle', huainanCampaignState: 'gained' })

        expect(stalemate?.topic).toContain('久战')
        expect(gained?.topic).toContain('扩大战果')
    })

    it('uses private empress wording for all base questions', () => {
        const first = getPolicyQuestionForRound(1, { shuCampaignState: 'idle', huainanCampaignState: 'idle' })

        expect(first?.question).toContain('朕')
        expect(first?.question).not.toContain('陛下')
        expect(POLICY_QUESTIONS.every(question => question.options.length === 4)).toBe(true)
    })
})
