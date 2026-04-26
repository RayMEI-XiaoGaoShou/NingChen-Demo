import { chatCompletion, getAiMode } from '../../ai/aiService'
import { buildNorthSchemeParsePrompt, buildPolicyReasonParsePrompt } from '../../ai/prompts'
import {
    fallbackNorthParseFromSpeech,
    fallbackPolicyParseFromReason,
    normalizeNorthSchemeParse,
    normalizePolicyReasonParse,
} from '../aiNativeEngine'
import { ROUND_EVENTS } from '../../data/rounds'
import type { NPC, OmenSpeechInput, PolicyResolutionMeta, SchemeType } from '../types'
import type { LiveParseRecord } from './types'

function cleanStructuredJsonText(text: string): string {
    return text
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim()
}

function tryParseJson<T>(text: string): T | null {
    const cleaned = cleanStructuredJsonText(text)
    if (!cleaned) return null

    try {
        return JSON.parse(cleaned) as T
    } catch {
        return null
    }
}

function shouldRetryStructuredJson(text: string): boolean {
    const cleaned = cleanStructuredJsonText(text)
    if (!cleaned) return false

    const startsLikeJson = cleaned.startsWith('{') || cleaned.startsWith('[')
    if (!startsLikeJson) return false

    return !cleaned.endsWith('}') && !cleaned.endsWith(']')
}

function shouldRetryStructuredJsonCorrection(text: string): boolean {
    const cleaned = cleanStructuredJsonText(text)
    if (!cleaned) return false
    return !shouldRetryStructuredJson(text)
}

function buildStructuredJsonCorrectionMessages(
    messages: ReturnType<typeof buildNorthSchemeParsePrompt> | ReturnType<typeof buildPolicyReasonParsePrompt>,
): ReturnType<typeof buildNorthSchemeParsePrompt> | ReturnType<typeof buildPolicyReasonParsePrompt> {
    return [
        ...messages,
        {
            role: 'user',
            content: '上一轮输出不是可解析的严格 JSON。请重新输出，且只能输出一个 JSON 对象或 JSON 数组；不要解释，不要 Markdown，不要代码块，不要前后缀文字。',
        },
    ]
}

function getStructuredRetryMaxTokens(maxTokens: number): number {
    return Math.max(Math.ceil(maxTokens * 2.75), maxTokens + 320, 520)
}

async function completeStructuredJson<T>(params: {
    messages: ReturnType<typeof buildNorthSchemeParsePrompt> | ReturnType<typeof buildPolicyReasonParsePrompt>
    temperature: number
    maxTokens: number
    tag: string
}): Promise<{ rawResponse: string; parsed: T | null }> {
    const firstText = await chatCompletion(params.messages, {
        temperature: params.temperature,
        maxTokens: params.maxTokens,
        tag: params.tag,
    })
    const firstParsed = tryParseJson<T>(firstText)
    if (firstParsed) {
        return { rawResponse: firstText, parsed: firstParsed }
    }

    if (shouldRetryStructuredJson(firstText)) {
        const retryText = await chatCompletion(params.messages, {
            temperature: params.temperature,
            maxTokens: getStructuredRetryMaxTokens(params.maxTokens),
            tag: params.tag,
        })
        const retryParsed = tryParseJson<T>(retryText)
        return {
            rawResponse: retryText,
            parsed: retryParsed,
        }
    }

    if (shouldRetryStructuredJsonCorrection(firstText)) {
        const retryText = await chatCompletion(buildStructuredJsonCorrectionMessages(params.messages), {
            temperature: params.temperature,
            maxTokens: getStructuredRetryMaxTokens(params.maxTokens),
            tag: params.tag,
        })
        const retryParsed = tryParseJson<T>(retryText)
        return {
            rawResponse: retryText,
            parsed: retryParsed,
        }
    }

    return {
        rawResponse: firstText,
        parsed: null,
    }
}

export async function runNorthLiveParse(params: {
    round: number
    npc: NPC
    speech: string
    schemeType: SchemeType
    relatedNpc?: NPC | null
    omenSpeechInput?: OmenSpeechInput
}): Promise<LiveParseRecord> {
    const messages = buildNorthSchemeParsePrompt({
        round: params.round,
        npc: params.npc,
        schemeType: params.schemeType,
        speech: params.speech,
        omenSpeechInput: params.omenSpeechInput,
        eventName: ROUND_EVENTS[params.round - 1]?.eventName ?? `第${params.round}回合`,
        eventBriefing: ROUND_EVENTS[params.round - 1]?.briefing ?? '',
    })
    const { rawResponse, parsed } = await completeStructuredJson<ReturnType<typeof normalizeNorthSchemeParse>>({
        messages,
        temperature: 0.2,
        maxTokens: 220,
        tag: 'north_scheme_parse',
    })

    if (parsed) {
        const normalized = normalizeNorthSchemeParse(parsed)
        const hasDimensionRelevance =
            normalized.financeRelevance > 0 ||
            normalized.grainRelevance > 0 ||
            normalized.militaryRelevance > 0 ||
            normalized.socialOrderRelevance > 0 ||
            normalized.governanceRelevance > 0

        const fallback = fallbackNorthParseFromSpeech({
            speech: params.speech,
            npc: params.npc,
            round: params.round,
            schemeType: params.schemeType,
            relatedNpc: params.relatedNpc,
            omenSpeechInput: params.omenSpeechInput,
        })

        return {
            round: params.round,
            kind: 'north',
            targetNpcId: params.npc.id,
            schemeType: params.schemeType,
            rawInput: params.speech,
            normalized: hasDimensionRelevance
                ? normalized
                : {
                    ...normalized,
                    financeRelevance: fallback.financeRelevance,
                    grainRelevance: fallback.grainRelevance,
                    militaryRelevance: fallback.militaryRelevance,
                    socialOrderRelevance: fallback.socialOrderRelevance,
                    governanceRelevance: fallback.governanceRelevance,
                },
            rawResponse,
            mode: getAiMode() === 'fallback' ? 'fallback' : 'live',
            error: getAiMode() === 'fallback' ? 'service-fallback-mode' : null,
        }
    }

    return {
        round: params.round,
        kind: 'north',
        targetNpcId: params.npc.id,
        schemeType: params.schemeType,
        rawInput: params.speech,
        normalized: fallbackNorthParseFromSpeech({
            speech: params.speech,
            npc: params.npc,
            round: params.round,
            schemeType: params.schemeType,
            relatedNpc: params.relatedNpc,
            omenSpeechInput: params.omenSpeechInput,
        }),
        rawResponse,
        mode: 'fallback',
        error: getAiMode() === 'fallback' ? 'service-fallback-mode' : 'invalid-json-response',
    }
}

export async function runPolicyLiveParse(params: {
    round: number
    topic: string
    question: string
    reason: string
    meta: PolicyResolutionMeta
}): Promise<LiveParseRecord> {
    const messages = buildPolicyReasonParsePrompt({
        round: params.round,
        topic: params.topic,
        question: params.question,
        reason: params.reason,
        meta: params.meta,
    })
    const { rawResponse, parsed } = await completeStructuredJson<ReturnType<typeof normalizePolicyReasonParse>>({
        messages,
        temperature: 0.2,
        maxTokens: 220,
        tag: 'policy_reason_parse',
    })

    if (parsed) {
        return {
            round: params.round,
            kind: 'policy',
            rawInput: params.reason,
            normalized: normalizePolicyReasonParse(parsed),
            rawResponse,
            mode: getAiMode() === 'fallback' ? 'fallback' : 'live',
            error: getAiMode() === 'fallback' ? 'service-fallback-mode' : null,
        }
    }

    return {
        round: params.round,
        kind: 'policy',
        rawInput: params.reason,
        normalized: fallbackPolicyParseFromReason(params.reason, params.meta),
        rawResponse,
        mode: 'fallback',
        error: getAiMode() === 'fallback' ? 'service-fallback-mode' : 'invalid-json-response',
    }
}
