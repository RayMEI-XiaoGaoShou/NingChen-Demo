import { chatCompletionDetailed } from './aiService'
import { buildDowagerReviewCommentPrompt } from './prompts'
import type { ChatMessage } from './prompts'

export type DowagerReviewCommentMode = 'ai' | 'fallback'

export interface DowagerReviewCommentInput {
    poemTitle: string
    poemLines: string[]
    mediumLabel: string
    finalTierLabel: string
    favorDelta: number
    evaluationSummary: string
    selectedEvidence: string
    fallbackComment: string
    chatCompletionImpl?: (
        messages: ChatMessage[],
        options?: { temperature?: number; maxTokens?: number; tag?: string },
    ) => Promise<string>
    tag?: string
}

export interface DowagerReviewCommentResult {
    text: string
    mode: DowagerReviewCommentMode
}

export function normalizeDowagerReviewComment(text: string, fallbackComment: string): string {
    const normalized = text.replace(/\s+/g, ' ').trim()
    if (!normalized) return fallbackComment
    return normalized.length > 220 ? normalized.slice(0, 220) : normalized
}

export async function generateDowagerReviewComment(
    input: DowagerReviewCommentInput,
): Promise<DowagerReviewCommentResult> {
    try {
        const messages = buildDowagerReviewCommentPrompt(input)
        const options = {
            temperature: 0.72,
            maxTokens: 360,
            tag: input.tag ?? 'dowager_review_comment',
        }

        if (input.chatCompletionImpl) {
            const text = await input.chatCompletionImpl(messages, options)
            const normalized = normalizeDowagerReviewComment(text, input.fallbackComment)
            return {
                text: normalized,
                mode: normalized === input.fallbackComment ? 'fallback' : 'ai',
            }
        }

        const result = await chatCompletionDetailed(messages, options)
        const text = result.source === 'fallback'
            ? result.text || input.fallbackComment
            : result.text
        const normalized = normalizeDowagerReviewComment(text, input.fallbackComment)
        return {
            text: normalized,
            mode: result.source === 'fallback' || normalized === input.fallbackComment ? 'fallback' : 'ai',
        }
    } catch {
        return {
            text: input.fallbackComment,
            mode: 'fallback',
        }
    }
}
