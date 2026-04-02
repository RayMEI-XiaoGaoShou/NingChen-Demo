import { parseNorthSchemeInput, parsePolicyReasonInput } from '../aiNativeEngine'
import type { NPC } from '../types'
import type { LiveParseRecord } from './types'

export async function runNorthLiveParse(params: {
    round: number
    npc: NPC
    speech: string
    schemeType: LiveParseRecord['schemeType']
    relatedNpc?: NPC | null
}): Promise<LiveParseRecord> {
    try {
        const normalized = await parseNorthSchemeInput({
            round: params.round,
            npc: params.npc,
            speech: params.speech,
            relatedNpc: params.relatedNpc ?? null,
        })

        return {
            round: params.round,
            kind: 'north',
            targetNpcId: params.npc.id,
            schemeType: params.schemeType,
            rawInput: params.speech,
            normalized,
            rawResponse: null,
            mode: 'live',
            error: null,
        }
    } catch (error) {
        return {
            round: params.round,
            kind: 'north',
            targetNpcId: params.npc.id,
            schemeType: params.schemeType,
            rawInput: params.speech,
            normalized: null,
            rawResponse: null,
            mode: 'fallback',
            error: error instanceof Error ? error.message : String(error),
        }
    }
}

export async function runPolicyLiveParse(params: {
    round: number
    topic: string
    question: string
    reason: string
    meta: Parameters<typeof parsePolicyReasonInput>[0]['meta']
}): Promise<LiveParseRecord> {
    try {
        const normalized = await parsePolicyReasonInput({
            round: params.round,
            topic: params.topic,
            question: params.question,
            reason: params.reason,
            meta: params.meta,
        })

        return {
            round: params.round,
            kind: 'policy',
            rawInput: params.reason,
            normalized,
            rawResponse: null,
            mode: 'live',
            error: null,
        }
    } catch (error) {
        return {
            round: params.round,
            kind: 'policy',
            rawInput: params.reason,
            normalized: null,
            rawResponse: null,
            mode: 'fallback',
            error: error instanceof Error ? error.message : String(error),
        }
    }
}
