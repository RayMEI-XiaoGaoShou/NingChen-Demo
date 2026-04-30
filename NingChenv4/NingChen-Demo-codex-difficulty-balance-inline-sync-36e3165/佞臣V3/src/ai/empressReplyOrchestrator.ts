import { chatCompletion } from './aiService'
import { buildEmpressFeedbackPrompt } from './prompts'
import { buildEmpressFeedbackContext } from '../game/empressFeedbackContext'
import {
    buildSettlementDefaultEmpressReply,
    hasPolicyReason,
} from '../game/empressReplyPresentation'
import {
    selectWorldEventMemoriesForPrompt,
    summarizeWorldEventMemories,
} from '../game/worldEventMemory'
import type { PolicySettlementReport } from '../game/roundSettlement'
import type {
    EmpressReplyRecord,
    NationDimensions,
    PlayerDangerStage,
    PolicyAftereffect,
    WorldMemoryLedger,
} from '../game/types'
import type { ChatMessage } from './prompts'

export async function generateEmpressReplyRecordForPolicy(params: {
    currentRound: number
    policyReport: PolicySettlementReport
    policyAftereffect?: PolicyAftereffect | null
    southStatsAfter: NationDimensions
    playerDangerStage: PlayerDangerStage
    invasionSummary: string
    worldMemoryLedger?: WorldMemoryLedger
    roundEvent: {
        eventName: string
        eventBriefing: string
    }
    chatCompletionImpl?: (
        messages: ChatMessage[],
        options?: { temperature?: number; maxTokens?: number; tag?: string },
    ) => Promise<string>
    tag?: string
}): Promise<EmpressReplyRecord> {
    const defaultText = buildSettlementDefaultEmpressReply(params.policyReport) ?? '朕已知之。'

    if (!hasPolicyReason(params.policyReport)) {
        return {
            sourceRound: params.currentRound,
            text: defaultText,
            mode: 'default',
        }
    }

    const worldIntelSummary = summarizeWorldEventMemories(selectWorldEventMemoriesForPrompt({
        ledger: params.worldMemoryLedger ?? [],
        scopes: ['south_intel'],
        currentRound: params.currentRound,
        includeCurrentRound: false,
        limit: 2,
    }))
    const context = buildEmpressFeedbackContext({
        currentRound: params.currentRound,
        policyReport: params.policyReport,
        policyAftereffect: params.policyAftereffect,
        policyParse: params.policyReport.policyParse,
        southStatsAfter: params.southStatsAfter,
        northEventName: params.roundEvent.eventName,
        northEventBriefing: params.roundEvent.eventBriefing,
        northSummary: '',
        worldIntelSummary,
        invasionSummary: params.invasionSummary,
        playerDangerStage: params.playerDangerStage,
    })

    try {
        const complete = params.chatCompletionImpl ?? chatCompletion
        const reply = await complete(buildEmpressFeedbackPrompt(context), {
            temperature: 0.75,
            maxTokens: 220,
            tag: params.tag ?? 'empress_feedback_reply_page',
        })

        return {
            sourceRound: params.currentRound,
            text: reply.trim() || defaultText,
            mode: 'ai',
        }
    } catch {
        return {
            sourceRound: params.currentRound,
            text: defaultText,
            mode: 'fallback',
        }
    }
}
