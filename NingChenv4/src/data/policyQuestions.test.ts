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

        expect(first?.background).toContain('建康新朝甫立')
        expect(first?.question).toContain('朕')
        expect(first?.question).toContain('宝颖')
        expect(first?.question).not.toContain('陛下')
        expect(POLICY_QUESTIONS.every(question => question.options.length === 4)).toBe(true)
    })

    it('applies the source empress strategic wording for rounds 7, 9, 16, 19 and 20', () => {
        const round7 = getPolicyQuestionForRound(7, { shuCampaignState: 'idle', huainanCampaignState: 'idle' })
        const round9 = getPolicyQuestionForRound(9, { shuCampaignState: 'idle', huainanCampaignState: 'idle' })
        const round16 = getPolicyQuestionForRound(16, { shuCampaignState: 'idle', huainanCampaignState: 'idle' })
        const round19 = getPolicyQuestionForRound(19, { shuCampaignState: 'idle', huainanCampaignState: 'idle' })
        const round20 = getPolicyQuestionForRound(20, { shuCampaignState: 'idle', huainanCampaignState: 'idle' })

        expect(round7?.background).toContain('江夏')
        expect(round7?.options[2].content).toBe('江夏优先')
        expect(round9?.options[2].content).toBe('有限试探')
        expect(round16?.options[2].content).toBe('稳扎稳打')
        expect(round19?.background).not.toContain('终局渐近')
        expect(round19?.background).toContain('朝中急议渐多')
        expect(round20?.topic).toBe('北伐总策')
        expect(round20?.question).toContain('十年了')
    })
})
