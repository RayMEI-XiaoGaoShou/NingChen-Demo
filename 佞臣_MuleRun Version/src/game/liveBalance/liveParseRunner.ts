import { chatCompletion, getAiMode } from '../../ai/aiService'
import { buildNorthSchemeParsePrompt, buildPolicyReasonParsePrompt } from '../../ai/prompts'
import {
    fallbackNorthParseFromSpeech,
    fallbackPolicyParseFromReason,
    normalizeNorthSchemeParse,
    normalizePolicyReasonParse,
} from '../aiNativeEngine'
import { ROUND_EVENTS } from '../../data/rounds'
import type { NPC, PolicyResolutionMeta } from '../types'
import type { LiveParseRecord } from './types'

function tryParseJson<T>(text: string): T | null {
    const cleaned = text
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim()

    if (!cleaned) return null

    try {
        return JSON.parse(cleaned) as T
    } catch {
        return null
    }
}

export async function runNorthLiveParse(params: {
    round: number
    npc: NPC
    speech: string
    schemeType: LiveParseRecord['schemeType']
    relatedNpc?: NPC | null
}): Promise<LiveParseRecord> {
    const rawResponse = await chatCompletion(
        buildNorthSchemeParsePrompt({
            round: params.round,
            npc: params.npc,
            speech: params.speech,
            eventName: ROUND_EVENTS[params.round - 1]?.eventName ?? `第${params.round}回合`,
            eventBriefing: ROUND_EVENTS[params.round - 1]?.briefing ?? '',
        }),
        { temperature: 0.2, maxTokens: 220, tag: 'north_scheme_parse' },
    )

    const parsed = tryParseJson<ReturnType<typeof normalizeNorthSchemeParse>>(rawResponse)
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
            relatedNpc: params.relatedNpc,
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
            relatedNpc: params.relatedNpc,
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
    const rawResponse = await chatCompletion(
        buildPolicyReasonParsePrompt({
            round: params.round,
            topic: params.topic,
            question: params.question,
            reason: params.reason,
            meta: params.meta,
        }),
        { temperature: 0.2, maxTokens: 220, tag: 'policy_reason_parse' },
    )

    const parsed = tryParseJson<ReturnType<typeof normalizePolicyReasonParse>>(rawResponse)
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
