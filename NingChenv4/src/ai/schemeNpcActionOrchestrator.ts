import { buildNpcPromptDynamicContext } from '../game/npcPromptContext'
import type { RoundSettlementResult } from '../game/roundSettlement'
import { validateSchemeCausalEvent } from '../game/schemeCausalEvent'
import { describeSchemeNpcActionEffects, sanitizeSchemeNpcActionText, validateSchemeNpcActionNarrative } from '../game/schemeNpcAction'
import { validatePostResolutionNarrative } from '../game/schemePostResolutionValidation'
import type {
    DelayedBacklash,
    Faction,
    NPC,
    NpcMemoryLedger,
    RelationMemoryLedger,
    RoundHistoryEntry,
    WorldMemoryLedger,
} from '../game/types'
import { recordAiCallDiagnostic } from './aiCallDiagnostics'
import { chatCompletionJsonDetailed, getAiMode, type AiMode, type ChatCompletionJsonDetailedResult } from './aiService'
import { buildSchemeNpcActionContext, buildSchemeNpcActionPrompt, type ChatMessage } from './prompts'

const DEFAULT_ITEM_TIMEOUT_MS = 45000
const DEFAULT_BATCH_TIMEOUT_MS = 60000
const SCHEME_NPC_ACTION_MAX_TOKENS = 260
const SCHEME_NPC_ACTION_CORRECTION_MAX_TOKENS = 320

interface SchemeNpcActionPatch {
    resultIndex: number
    actionId: string
    text: string
}

interface SchemeNpcActionValidationResult {
    accepted: boolean
    reasons: string[]
}

export async function generateSchemeNpcActionsForSettlement(params: {
    settlement: RoundSettlementResult
    npcs: NPC[]
    factions: Faction[]
    currentRound: number
    intelProgress: Record<string, number>
    roundHistory: RoundHistoryEntry[]
    recentBacklash?: DelayedBacklash[]
    npcMemoryLedger?: NpcMemoryLedger
    relationMemoryLedger?: RelationMemoryLedger
    worldMemoryLedger?: WorldMemoryLedger
    roundEvent?: {
        eventName: string
        eventBriefing: string
    }
    getAiModeImpl?: () => AiMode
    chatCompletionJsonDetailedImpl?: <T>(
        messages: ChatMessage[],
        options?: { temperature?: number; maxTokens?: number; tag?: string },
    ) => Promise<ChatCompletionJsonDetailedResult<T>>
    itemTimeoutMs?: number
    batchTimeoutMs?: number
}): Promise<RoundSettlementResult> {
    const getMode = params.getAiModeImpl ?? getAiMode
    if (getMode() === 'fallback') return params.settlement

    const tasks = buildEligibleEnhancementTasks(params)
    if (tasks.length === 0) return params.settlement

    const itemTimeoutMs = params.itemTimeoutMs ?? DEFAULT_ITEM_TIMEOUT_MS
    const batchTimeoutMs = params.batchTimeoutMs ?? DEFAULT_BATCH_TIMEOUT_MS
    const patchPromise = Promise.all(tasks.map(task => withTimeout(
        enhanceOneSchemeNpcAction(task, params),
        itemTimeoutMs,
    ).catch(error => {
        recordAiCallDiagnostic({
            tag: `scheme_npc_action_${task.actionId}`,
            mode: getMode(),
            status: 'fallback',
            fallbackReason: 'request_failed',
            provider: 'scheme_npc_action_orchestrator',
            errorName: error instanceof Error ? error.name : undefined,
            errorMessage: error instanceof Error ? error.message : undefined,
        })
        return null
    })))

    const patches = await withTimeout(patchPromise, batchTimeoutMs).catch(error => {
        recordAiCallDiagnostic({
            tag: 'scheme_npc_action_batch',
            mode: getMode(),
            status: 'fallback',
            fallbackReason: 'request_failed',
            provider: 'scheme_npc_action_orchestrator',
            errorName: error instanceof Error ? error.name : undefined,
            errorMessage: error instanceof Error ? error.message : undefined,
        })
        return []
    })

    const acceptedPatches: SchemeNpcActionPatch[] = []
    for (const patch of patches) {
        if (patch) acceptedPatches.push(patch)
    }

    return applySchemeNpcActionPatches(params.settlement, acceptedPatches)
}

export function applySchemeNpcActionPatches(
    settlement: RoundSettlementResult,
    patches: SchemeNpcActionPatch[],
): RoundSettlementResult {
    if (patches.length === 0) return settlement
    const patchesByIndex = new Map(patches.map(patch => [patch.resultIndex, patch]))

    return {
        ...settlement,
        schemeResults: settlement.schemeResults.map((result, index) => {
            const patch = patchesByIndex.get(index)
            if (!patch) return result

            return {
                ...result,
                npcAction: {
                    ...result.npcAction,
                    text: patch.text,
                    source: 'ai' as const,
                },
                causalEvent: result.causalEvent
                    ? {
                        ...result.causalEvent,
                        motionText: patch.text,
                        motionSource: 'ai' as const,
                    }
                    : result.causalEvent,
            }
        }),
    }
}

function buildEligibleEnhancementTasks(params: Parameters<typeof generateSchemeNpcActionsForSettlement>[0]) {
    return params.settlement.schemeResults.flatMap((result, resultIndex) => {
        const fallbackText = result.npcAction?.text
        const action = params.settlement.processedSchemes[resultIndex]
        if (!action?.id || !fallbackText || result.npcAction?.source !== 'fallback') return []

        const targetNpc = params.npcs.find(item => item.id === action.targetNpcId)
        if (!targetNpc) return []
        const relatedNpc = action.relatedNpcId
            ? params.npcs.find(item => item.id === action.relatedNpcId) ?? null
            : null

        return [{
            action,
            actionId: action.id,
            result,
            resultIndex,
            fallbackText,
            targetNpc,
            relatedNpc,
        }]
    })
}

async function enhanceOneSchemeNpcAction(
    task: ReturnType<typeof buildEligibleEnhancementTasks>[number],
    params: Parameters<typeof generateSchemeNpcActionsForSettlement>[0],
): Promise<SchemeNpcActionPatch | null> {
    const chatJson = params.chatCompletionJsonDetailedImpl ?? chatCompletionJsonDetailed
    const effectSummary = describeSchemeNpcActionEffects({
        result: task.result,
        targetNpc: task.targetNpc,
        relatedNpc: task.relatedNpc,
    })
    const knownSecretThreads = task.targetNpc.secretThreads.slice(0, params.intelProgress[task.targetNpc.id] ?? 0)
    const dynamicContext = buildNpcPromptDynamicContext({
        npc: task.targetNpc,
        factions: params.factions,
        roundHistory: params.roundHistory,
        recentBacklash: params.recentBacklash,
        npcMemoryLedger: params.npcMemoryLedger,
        relationMemoryLedger: params.relationMemoryLedger,
        worldMemoryLedger: params.worldMemoryLedger,
        relatedNpcId: task.relatedNpc?.id,
        currentRound: params.currentRound,
        schemeType: task.action.schemeType,
    })
    const actionContext = buildSchemeNpcActionContext({
        npc: task.targetNpc,
        relatedNpc: task.relatedNpc,
        factions: params.factions,
        knownSecretThreads,
        previousDealings: dynamicContext.previousDealings,
        relationshipTemperature: dynamicContext.relationshipTemperature,
        recentCourtFortune: dynamicContext.recentCourtFortune,
        factionPressure: dynamicContext.factionPressure,
        longTermMemorySummary: dynamicContext.longTermMemorySummary,
        relationMemorySummary: dynamicContext.relationMemorySummary,
        worldMemorySummary: dynamicContext.worldMemorySummary,
        relatedImpactSummary: task.result.relatedImpactSummary ?? null,
        revealedSecretThread: task.result.revealedSecretThread ?? null,
    })

    const baseMessages = buildSchemeNpcActionPrompt({
        npc: task.targetNpc,
        relatedNpc: task.relatedNpc,
        action: task.action,
        effectSummary,
        fallbackText: task.fallbackText,
        context: actionContext,
        round: params.currentRound,
        eventName: params.roundEvent?.eventName,
        eventBriefing: params.roundEvent?.eventBriefing,
        narrativeObligations: task.result.causalEvent?.narrativeObligations ?? [],
        npcActionKind: task.result.npcAction?.kind,
        postResolutionEvent: task.result.causalEvent?.postResolutionEvent ?? null,
        revealedSecretThread: task.result.revealedSecretThread ?? null,
    })

    const response = await chatJson<{ text?: string }>(
        baseMessages,
        {
            temperature: 0.55,
            maxTokens: SCHEME_NPC_ACTION_MAX_TOKENS,
            tag: `scheme_npc_action_${task.actionId}`,
        },
    )

    const firstAttempt = buildPatchFromAiResponse(response, task)
    if (firstAttempt.patch) return firstAttempt.patch
    if (!firstAttempt.canRetry) return null

    const correctionResponse = await chatJson<{ text?: string }>(
        buildSchemeNpcActionCorrectionPrompt(baseMessages, firstAttempt.cleanedText ?? '', firstAttempt.validation.reasons),
        {
            temperature: 0.4,
            maxTokens: SCHEME_NPC_ACTION_CORRECTION_MAX_TOKENS,
            tag: `scheme_npc_action_${task.actionId}_correction`,
        },
    )

    const correctionAttempt = buildPatchFromAiResponse(correctionResponse, task)
    if (correctionAttempt.patch) return correctionAttempt.patch

    recordAiCallDiagnostic({
        tag: `scheme_npc_action_${task.actionId}`,
        mode: correctionResponse.mode,
        status: 'fallback',
        fallbackReason: correctionAttempt.fallbackReason ?? 'validation_failed',
        provider: 'scheme_npc_action_orchestrator',
        attempts: 2,
        errorMessage: correctionAttempt.validation.reasons.join(';') || correctionAttempt.errorMessage,
    })
    return null
}

function buildPatchFromAiResponse(
    response: ChatCompletionJsonDetailedResult<{ text?: string }>,
    task: ReturnType<typeof buildEligibleEnhancementTasks>[number],
): {
    patch: SchemeNpcActionPatch | null
    canRetry: boolean
    cleanedText?: string
    validation: SchemeNpcActionValidationResult
    fallbackReason?: 'request_failed' | 'sanitized_empty' | 'validation_failed'
    errorMessage?: string
} {
    if (response.source !== 'ai') {
        recordAiCallDiagnostic({
            tag: `scheme_npc_action_${task.actionId}`,
            mode: response.mode,
            status: 'fallback',
            fallbackReason: response.parseFallbackReason ?? response.fallbackReason ?? 'request_failed',
            provider: 'scheme_npc_action_orchestrator',
        })
        return {
            patch: null,
            canRetry: false,
            validation: { accepted: false, reasons: [response.parseFallbackReason ?? response.fallbackReason ?? 'request_failed'] },
            fallbackReason: 'request_failed',
        }
    }

    const cleaned = sanitizeSchemeNpcActionText(response.parsed?.text ?? '')
    if (!cleaned) {
        recordAiCallDiagnostic({
            tag: `scheme_npc_action_${task.actionId}`,
            mode: response.mode,
            status: 'fallback',
            fallbackReason: 'sanitized_empty',
            provider: 'scheme_npc_action_orchestrator',
            errorMessage: 'empty_or_rejected_after_sanitize',
        })
        return {
            patch: null,
            canRetry: false,
            validation: { accepted: false, reasons: ['empty_or_rejected_after_sanitize'] },
            fallbackReason: 'sanitized_empty',
            errorMessage: 'empty_or_rejected_after_sanitize',
        }
    }

    const validation = validateGeneratedSchemeNpcActionText(cleaned, task)
    if (!validation.accepted) {
        return {
            patch: null,
            canRetry: true,
            cleanedText: cleaned,
            validation,
            fallbackReason: 'validation_failed',
        }
    }

    return {
        patch: {
            resultIndex: task.resultIndex,
            actionId: task.actionId,
            text: cleaned,
        },
        canRetry: false,
        cleanedText: cleaned,
        validation,
    }
}

function validateGeneratedSchemeNpcActionText(
    text: string,
    task: ReturnType<typeof buildEligibleEnhancementTasks>[number],
): SchemeNpcActionValidationResult {
    const narrativeValidation = validateSchemeNpcActionNarrative({
        text,
        result: task.result,
        targetNpc: task.targetNpc,
        relatedNpc: task.relatedNpc,
    })
    const causalValidation = validateSchemeCausalEvent({
        event: task.result.causalEvent
            ? { ...task.result.causalEvent, motionText: text, motionSource: 'ai' }
            : null,
        targetNpc: task.targetNpc,
        relatedNpc: task.relatedNpc,
    })
    const postResolutionValidation = validatePostResolutionNarrative({
        text,
        postResolutionEvent: task.result.causalEvent?.postResolutionEvent,
    })
    const reasons = unique([
        ...narrativeValidation.reasons,
        ...causalValidation.reasons,
        ...postResolutionValidation.reasons,
    ])

    return {
        accepted: narrativeValidation.accepted && causalValidation.accepted && postResolutionValidation.accepted,
        reasons,
    }
}

function buildSchemeNpcActionCorrectionPrompt(
    baseMessages: ChatMessage[],
    invalidText: string,
    reasons: string[],
): ChatMessage[] {
    return [
        ...baseMessages,
        { role: 'assistant', content: JSON.stringify({ text: invalidText }) },
        {
            role: 'user',
            content: `上一版未通过校验：${reasons.join('；') || '未覆盖主要数值因果'}。
请只修正文案，不得改变已定数值、成败、人物关系或正典称谓。
修正规则：
- missing_benefit_mechanism_grain：写清粮道/仓廪如何疏通、续上、补足或转运顺畅。
- missing_benefit_mechanism_military：写清军府/军需如何整军、补械、补给接续或军令更顺。
- missing_benefit_mechanism_*：写清对应介质如何改善、归拢、疏通、补足、安定或更顺。
- missing_damage_mechanism_*：写清对应介质为何受阻、亏空、迟滞或折损。
- polarity_conflict_*：删除与数值方向相反的词，不要把正向结果写成损伤，也不要把负向结果写成整顿见效。
- missing_related_npc：若有牵连人物受损，必须点出该人物或其白名单称谓。
- missing_borrowed_blade_executed_outcome：必须写明目标已被处决/伏诛/赐死/收网，不得弱化成只是施压。
- missing_borrowed_blade_dismissed_outcome：必须写明目标已被罢黜/免职/收权。
- overstated_borrowed_blade_execution：这是罢黜，不得写成处决、伏诛或赐死。
- blocked_borrowed_blade_overstated_as_disposal：这是双庇护未破、尚未收网，不得写成正式罢黜或处决。
- secession_overstated_as_rebellion：割据仍奉北周名义，不得写成公开称帝、起兵或明旗反周。
- secession_hesitation_overstated：这是未敢明牌、暂观朝局，不得写成坐实割据或起兵。
- crushed_rebellion_reversed_as_established：这是起兵被剿、未坐大但折损兵粮，不得写成击退平叛后坐大。
- missing_crushed_rebellion_outcome：必须写明起兵被剿/未坐大，同时写出北周折损兵粮。
只输出严格 JSON：{"text":"..."}`,
        },
    ]
}

function unique(items: string[]): string[] {
    return Array.from(new Set(items.filter(Boolean)))
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = globalThis.setTimeout(() => {
            reject(new Error(`Timed out after ${timeoutMs}ms`))
        }, timeoutMs)

        promise.then(
            value => {
                globalThis.clearTimeout(timer)
                resolve(value)
            },
            error => {
                globalThis.clearTimeout(timer)
                reject(error)
            },
        )
    })
}
