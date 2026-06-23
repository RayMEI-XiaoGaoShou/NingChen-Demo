import { describe, expect, it, vi } from 'vitest'
import {
    generateDowagerReviewComment,
    normalizeDowagerReviewComment,
} from './dowagerOfferingOrchestrator'

const baseInput = {
    poemTitle: '相见欢·林花谢了春红',
    poemLines: ['林花谢了春红，太匆匆。', '自是人生长恨水长东。'],
    mediumLabel: '作画',
    finalTierLabel: '优秀',
    favorDelta: 30,
    evaluationSummary: '优秀：林中花树、东流水、好景难留。',
    selectedEvidence: '定景：林中花树；景物：东流水；立意：好景难留',
    fallbackComment: '此番作画，判作「优秀」。尚能入哀心。',
}

describe('dowagerOfferingOrchestrator', () => {
    it('normalizes empty comments back to fallback', () => {
        expect(normalizeDowagerReviewComment('   ', baseInput.fallbackComment)).toBe(baseInput.fallbackComment)
    })

    it('generates a dowager comment through the injected chat completion function', async () => {
        const chatCompletionImpl = vi.fn().mockResolvedValue('你尚知春红不可久留，笔下水势也没有失了哀意。')

        const result = await generateDowagerReviewComment({
            ...baseInput,
            chatCompletionImpl,
        })

        expect(result.mode).toBe('ai')
        expect(result.text).toContain('春红不可久留')
        expect(chatCompletionImpl).toHaveBeenCalledTimes(1)
        expect(chatCompletionImpl.mock.calls[0]?.[1]?.tag).toBe('dowager_review_comment')
    })

    it('falls back when the provider returns empty text', async () => {
        const result = await generateDowagerReviewComment({
            ...baseInput,
            chatCompletionImpl: vi.fn().mockResolvedValue(''),
        })

        expect(result.mode).toBe('fallback')
        expect(result.text).toBe(baseInput.fallbackComment)
    })
})
