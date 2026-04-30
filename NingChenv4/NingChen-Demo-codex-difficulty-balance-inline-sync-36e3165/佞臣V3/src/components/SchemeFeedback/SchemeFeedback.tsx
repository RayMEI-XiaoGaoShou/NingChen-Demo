import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { FIRST_FOLLOW_UP_TEACHING_CONTENT, FIRST_ROUND_GUIDE_CONTENT } from '../../data/prologueContent'
import { fallbackNorthParseFromSpeech, parseNorthSchemeInput, parseSchemeFollowUpInputDetailed } from '../../game/aiNativeEngine'
import { buildNpcPromptDynamicContext } from '../../game/npcPromptContext'
import { getRoundCampaignEventContext } from '../../game/campaignDisplayEngine'
import { buildNpcFollowUpFinalPrompt, buildNpcPrompt, buildOmenEchoPrompt, sanitizeNpcReplyText } from '../../ai/prompts'
import { chatCompletion, chatCompletionDetailed, getAiMode, getAiModeLabel, initAiService } from '../../ai/aiService'
import { recordAiCallDiagnostic } from '../../ai/aiCallDiagnostics'
import { generateEmpressReplyRecordForPolicy } from '../../ai/empressReplyOrchestrator'
import { generateSchemeNpcActionsForSettlement } from '../../ai/schemeNpcActionOrchestrator'
import { recordAiGameMasterDebug } from '../../game/aiGameMasterDebug'
import { buildOmenEchoFallbackText, buildOmenEchoFeedbackPayload, selectOmenEchoSpeaker } from '../../game/omenEcho'
import type { RoundSettlementResult } from '../../game/roundSettlement'
import { previewSchemeSuccess } from '../../game/schemeEngine'
import { isSchemeReplyPrefetchInFlight } from '../../game/schemeReplyPrefetch'
import {
    buildContextualFallbackFollowUpQuestion,
    extractTerminalQuestion,
    forceQuestionCandidateReplyText,
    forceStatementReplyText,
    getSchemeFollowUpImpactPresentation,
    getVisibleAvailableSchemeFollowUpId,
    selectRequiredSchemeFollowUpCandidateId,
    sanitizeSchemeFollowUpFinalReplyText,
    shouldBlockSettlementForFollowUp,
} from '../../game/schemeFollowUp'
import type { NPC, NorthSchemeParseResult, OmenEchoFeedback, RelationshipEdge, SchemeAction, SchemeFollowUp, SchemeFollowUpAnswerMetadata, SchemeFollowUpFallbackReason, SchemeFollowUpParseResult } from '../../game/types'
import { FirstRoundGuideModal } from '../FirstRoundGuide/FirstRoundGuideModal'
import { NpcPortrait } from '../NpcPortrait/NpcPortrait'
import { PageUtilityActions } from '../PageUtilityActions/PageUtilityActions'
import { SchemeOnboardingModal } from '../SchemePanel/SchemeOnboardingModal'
import { buildSchemeResultEffectTags, getSchemeNpcActionDisplay } from './schemeResultDisplay'
import './SchemeFeedback.css'

const SCHEME_NAMES: Record<string, string> = {
    probe: '试探',
    advise: '献策',
    slander: '谗言',
    alienate: '离间',
    frame: '设局嫁祸',
    proxy: '借刀',
    appeal: '求援',
    omen: '谶纬',
    secession: '煽动割据',
    rebellion: '煽动造反',
}

const LOCAL_REPLY_FALLBACK = '似有回应，却一时听不分明。'
const FOLLOW_UP_REPLY_FALLBACK = '他收起锋芒，只留一句平静的回应。'
const NPC_ACTION_FALLBACK_GRACE_MS = 15000
const NPC_ACTION_BACKGROUND_ITEM_TIMEOUT_MS = 45000
const NPC_ACTION_BACKGROUND_BATCH_TIMEOUT_MS = 60000
const ZERO_DELTA_FOLLOW_UP_PARSE: SchemeFollowUpParseResult = {
    clarificationFit: 0,
    npcInterestFit: 0,
    pressureControl: 0,
    contradictionRisk: 0,
    exposureRiskDelta: 0,
    successRateDelta: 0,
    effectMultiplierDelta: 0,
    evidence: [],
}

function sanitizeFollowUpReplyText(reply: string): string {
    return sanitizeSchemeFollowUpFinalReplyText(sanitizeNpcReplyText(reply))
}

function buildFollowUpReplyFallback(targetNpcName: string): string {
    return `${targetNpcName}${FOLLOW_UP_REPLY_FALLBACK}`
}

function recordFollowUpFallbackDiagnostic(params: {
    tag: string
    reason: SchemeFollowUpFallbackReason
    mode?: ReturnType<typeof getAiMode>
    messageCount?: number
    maxTokens?: number
    temperature?: number
}): void {
    recordAiCallDiagnostic({
        tag: params.tag,
        mode: params.mode ?? getAiMode(),
        status: 'fallback',
        fallbackReason: params.reason,
        provider: 'scheme_feedback_follow_up',
        messageCount: params.messageCount,
        maxTokens: params.maxTokens,
        temperature: params.temperature,
    })
}

function buildOmenEchoParseSummary(parsed: Pick<NorthSchemeParseResult, 'omenPolarity' | 'omenAnchorStrength' | 'legitimacyCrack' | 'suspicionDirection' | 'evidence'>): string {
    const evidenceLine = parsed.evidence.slice(0, 2).join('；') || '暂无'
    return `omenPolarity=${parsed.omenPolarity}; omenAnchorStrength=${parsed.omenAnchorStrength}; legitimacyCrack=${parsed.legitimacyCrack}; suspicionDirection=${parsed.suspicionDirection}; evidence=${evidenceLine}`
}

export function getSchemeFeedbackProceedLabel(params: {
    allDone: boolean
    allParsed: boolean
    settlementRevealed: boolean
    terminalResult: boolean
}): string {
    if (!params.allDone) return '等待计谋回报'
    if (!params.allParsed) return '等待解析完成'
    if (!params.settlementRevealed) return '揭示筹算结果'
    return params.terminalResult ? '查看终局' : '进入女帝回信'
}

function buildNpcActionEnhancementKey(currentRound: number, actionIds: string[]): string {
    return `${currentRound}:${actionIds.join('|')}`
}

function getEnhanceableFallbackActionIds(settlement: RoundSettlementResult): string[] {
    return settlement.schemeResults.flatMap((result, index) => {
        const action = settlement.processedSchemes[index]
        return action?.id && result.npcAction?.source === 'fallback' && result.npcAction.text
            ? [action.id]
            : []
    })
}

export function shouldDelaySchemeNpcActionFallback(params: {
    settlement: RoundSettlementResult | null
    resultIndex: number
    revealedActionIds: ReadonlySet<string>
}): boolean {
    if (!params.settlement) return false

    const result = params.settlement.schemeResults[params.resultIndex]
    const action = params.settlement.processedSchemes[params.resultIndex]
    return Boolean(action?.id && result?.npcAction?.source === 'fallback' && result.npcAction.text && !params.revealedActionIds.has(action.id))
}

export async function orchestrateOmenEchoFeedback(params: {
    feedbackId: string
    action: Pick<SchemeAction, 'schemeType' | 'omenSpeechInput'>
    targetNpc: NPC
    parsed: Pick<NorthSchemeParseResult, 'omenPolarity' | 'omenAnchorStrength' | 'legitimacyCrack' | 'suspicionDirection' | 'evidence'>
    npcs: NPC[]
    relationships: RelationshipEdge[]
    round: number
    roundEvent: {
        eventName: string
        eventBriefing: string
    }
    updateNpcFeedbackOmenEcho: (feedbackId: string, omenEcho: OmenEchoFeedback) => void
    hasExistingOmenEcho?: boolean
    chatCompletionImpl?: typeof chatCompletion
    getAiModeImpl?: typeof getAiMode
    selectSpeakerImpl?: typeof selectOmenEchoSpeaker
    buildFallbackTextImpl?: typeof buildOmenEchoFallbackText
}): Promise<OmenEchoFeedback | null> {
    if (params.action.schemeType !== 'omen' || !params.action.omenSpeechInput || params.hasExistingOmenEcho) {
        return null
    }

    const selectSpeaker = params.selectSpeakerImpl ?? selectOmenEchoSpeaker
    const selection = selectSpeaker({
        targetNpc: params.targetNpc,
        npcs: params.npcs,
        relationships: params.relationships,
    })

    if (!selection) return null

    const chatCompletionImpl = params.chatCompletionImpl ?? chatCompletion
    const getAiModeImpl = params.getAiModeImpl ?? getAiMode
    const buildFallbackText = params.buildFallbackTextImpl ?? buildOmenEchoFallbackText
    const parseSummary = buildOmenEchoParseSummary(params.parsed)
    const aiMode = getAiModeImpl()

    let text = ''
    let source: OmenEchoFeedback['source'] = 'fallback'

    if (aiMode !== 'fallback') {
        try {
            const aiReply = await chatCompletionImpl(
                buildOmenEchoPrompt({
                    speakerNpc: selection.speakerNpc,
                    targetNpc: params.targetNpc,
                    omenText: params.action.omenSpeechInput.omenText,
                    interpretationText: params.action.omenSpeechInput.interpretationText,
                    roundEvent: {
                        round: params.round,
                        eventName: params.roundEvent.eventName,
                        eventBriefing: params.roundEvent.eventBriefing,
                    },
                    parseSummary,
                }),
                {
                    temperature: 0.72,
                    maxTokens: 260,
                    tag: `omen_echo_${params.targetNpc.id}`,
                },
            )

            const cleanedAiReply = sanitizeNpcReplyText(aiReply.trim())
            if (cleanedAiReply) {
                text = cleanedAiReply
                source = 'ai'
            }
        } catch {
            // Fall through to the local omen-echo builder.
        }
    }

    if (!text) {
        text = buildFallbackText({
            speakerNpc: selection.speakerNpc,
            targetNpc: params.targetNpc,
            round: params.round,
            eventName: params.roundEvent.eventName,
            eventBriefing: params.roundEvent.eventBriefing,
            omenText: params.action.omenSpeechInput.omenText,
            interpretationText: params.action.omenSpeechInput.interpretationText,
            parseSummary,
        })
        source = 'fallback'
    }

    const payload = buildOmenEchoFeedbackPayload({
        speakerNpc: selection.speakerNpc,
        targetNpc: params.targetNpc,
        text,
        source,
        round: params.round,
        eventName: params.roundEvent.eventName,
        eventBriefing: params.roundEvent.eventBriefing,
        omenText: params.action.omenSpeechInput.omenText,
        interpretationText: params.action.omenSpeechInput.interpretationText,
        parseSummary,
        selectionReason: selection.selectionReason,
        candidateCount: selection.candidateCount,
    })

    params.updateNpcFeedbackOmenEcho(params.feedbackId, payload.feedback)
    return payload.feedback
}

export function shouldQueueRecoveryParse(params: {
    actionId?: string
    hasNorthParse: boolean
    pendingStructuredSchemeIds: string[]
    npcFeedbackCount: number
}): boolean {
    if (!params.actionId) return false
    if (params.hasNorthParse) return false
    if (params.npcFeedbackCount === 0) return false
    return !params.pendingStructuredSchemeIds.includes(params.actionId)
}

export function canProceedFromSchemeFeedback(params: {
    allDone: boolean
    allParsed: boolean
    followUpBlocked: boolean
}): boolean {
    return params.allDone && params.allParsed && !params.followUpBlocked
}

export function getVisibleAvailableFollowUpId(
    actions: Array<{ id?: string; followUp?: Pick<SchemeFollowUp, 'status' | 'questionText'> }>,
): string | null {
    return getVisibleAvailableSchemeFollowUpId(actions)
}

export function shouldWaitForPrefetchedFeedback(params: {
    currentSchemes: Array<{ id?: string; northParse?: unknown }>
    npcFeedbacks: Array<{ id: string; isLoading: boolean }>
    pendingStructuredSchemeIds: string[]
}): boolean {
    const feedbackById = new Map(
        params.npcFeedbacks.map(item => [item.id, item] as const),
    )

    return params.currentSchemes.some(action => {
        if (!action.id) return false
        if (!action.northParse && params.pendingStructuredSchemeIds.includes(action.id)) {
            return true
        }

        const feedback = feedbackById.get(action.id)
        return Boolean(feedback?.isLoading && isSchemeReplyPrefetchInFlight(action.id))
    })
}

export function SchemeFeedback() {
    const {
        npcFeedbacks,
        currentSchemes,
        npcs,
        factions,
        relationships,
        intelProgress,
        recentBacklash,
        roundHistory,
        npcMemoryLedger,
        relationMemoryLedger,
        worldMemoryLedger,
        pendingStructuredSchemeIds,
        lastSettlement,
        roundStartSnapshot,
        empressReplyRecord,
        addNpcFeedback,
        updateNpcFeedback,
        updateNpcFeedbackOmenEcho,
        updateSchemeNpcAction,
        setEmpressReplyRecord,
        updateSchemeParse,
        markSchemeParsePending,
        prepareSchemeSettlementForFeedback,
        setSchemeFollowUp,
        answerSchemeFollowUp,
        skipSchemeFollowUp,
        nextPhase,
        currentRound,
        firstRoundGuideSeen,
        schemeOnboardingSeen,
        markFirstRoundGuideSeen,
        markSchemeOnboardingSeen,
        openGameplayGuide,
        shuCampaign,
        huainanCampaign,
    } = useGameStore()

    const [followUpDrafts, setFollowUpDrafts] = useState<Record<string, string>>({})
    const [submittingFollowUpId, setSubmittingFollowUpId] = useState<string | null>(null)
    const [settlementVisible, setSettlementVisible] = useState(false)
    const [, setFeedbackBatchSettledKey] = useState<string | null>(null)
    const [orchestratingFeedbacks, setOrchestratingFeedbacks] = useState(false)
    const [, setNpcActionEnhancing] = useState(false)
    const [revealedNpcActionFallbackIds, setRevealedNpcActionFallbackIds] = useState<Set<string>>(() => new Set())
    const schemeBatchKey = currentSchemes
        .map(action => action.id ?? `${action.targetNpcId}:${action.schemeType}`)
        .join('|')
    const currentRoundEvent = getRoundCampaignEventContext(currentRound, shuCampaign, huainanCampaign)

    const actionById = new Map(
        currentSchemes
            .flatMap(action => (action.id ? [[action.id, action] as const] : [])),
    )
    const expectedFeedbackIds = new Set(actionById.keys())
    const relevantFeedbacks = npcFeedbacks.filter(item => expectedFeedbackIds.has(item.id))
    const allDone =
        expectedFeedbackIds.size > 0 &&
        relevantFeedbacks.length === expectedFeedbackIds.size &&
        relevantFeedbacks.every(item => !item.isLoading) &&
        !orchestratingFeedbacks
    const allParsed = currentSchemes.every(action => Boolean(action.northParse)) && pendingStructuredSchemeIds.length === 0
    const followUpBlocked = shouldBlockSettlementForFollowUp(currentSchemes, submittingFollowUpId !== null)
    const visibleAvailableFollowUpId = getVisibleAvailableFollowUpId(currentSchemes)
    const canProceed = canProceedFromSchemeFeedback({ allDone, allParsed, followUpBlocked })
    const settlementRevealed = Boolean(lastSettlement && settlementVisible)
    const npcActionFallbackGracePending = Boolean(settlementRevealed && lastSettlement && getEnhanceableFallbackActionIds(lastSettlement).some(actionId => !revealedNpcActionFallbackIds.has(actionId)))
    const canClickProceed = !settlementVisible ? Boolean(lastSettlement) : (settlementRevealed || canProceed) && !npcActionFallbackGracePending
    const proceedLabel = getSchemeFeedbackProceedLabel({
        allDone,
        allParsed,
        settlementRevealed,
        terminalResult: Boolean(lastSettlement && lastSettlement.gameResult !== 'NONE'),
    })
    const shouldShowFeedbackGuide =
        currentRound === 1 &&
        !firstRoundGuideSeen.scheme_feedback
    const shouldShowFollowUpGuide =
        currentRound === 1 &&
        firstRoundGuideSeen.scheme_feedback &&
        !schemeOnboardingSeen.first_follow_up_teaching
    const settledBatchKeyRef = useRef<string | null>(null)
    const settlementPrepareKeyRef = useRef<string | null>(null)
    const settlementRevealIntentRef = useRef(false)
    const empressReplyPreheatKeyRef = useRef<string | null>(null)
    const npcActionEnhancementKeyRef = useRef<string | null>(null)
    const npcActionFallbackTimersRef = useRef<Map<string, ReturnType<typeof globalThis.setTimeout>>>(new Map())
    const orchestrationStateRef = useRef<{
        npcFeedbacks: typeof npcFeedbacks
        currentSchemes: typeof currentSchemes
        npcs: typeof npcs
        factions: typeof factions
        relationships: typeof relationships
        intelProgress: typeof intelProgress
        recentBacklash: typeof recentBacklash
        roundHistory: typeof roundHistory
        npcMemoryLedger: typeof npcMemoryLedger
        relationMemoryLedger: typeof relationMemoryLedger
        worldMemoryLedger: typeof worldMemoryLedger
        pendingStructuredSchemeIds: typeof pendingStructuredSchemeIds
        currentRoundEvent: typeof currentRoundEvent
        addNpcFeedback: typeof addNpcFeedback
        updateNpcFeedback: typeof updateNpcFeedback
        updateNpcFeedbackOmenEcho: typeof updateNpcFeedbackOmenEcho
        updateSchemeParse: typeof updateSchemeParse
        markSchemeParsePending: typeof markSchemeParsePending
        setSchemeFollowUp: typeof setSchemeFollowUp
    } | null>(null)

    orchestrationStateRef.current = {
        npcFeedbacks,
        currentSchemes,
        npcs,
        factions,
        relationships,
        intelProgress,
        recentBacklash,
        roundHistory,
        npcMemoryLedger,
        relationMemoryLedger,
        worldMemoryLedger,
        pendingStructuredSchemeIds,
        currentRoundEvent,
        addNpcFeedback,
        updateNpcFeedback,
        updateNpcFeedbackOmenEcho,
        updateSchemeParse,
        markSchemeParsePending,
        setSchemeFollowUp,
    }

    useEffect(() => {
        settledBatchKeyRef.current = null
        settlementPrepareKeyRef.current = null
        settlementRevealIntentRef.current = false
        empressReplyPreheatKeyRef.current = null
        npcActionEnhancementKeyRef.current = null
        npcActionFallbackTimersRef.current.forEach(timer => globalThis.clearTimeout(timer))
        npcActionFallbackTimersRef.current.clear()
        setSettlementVisible(false)
        setRevealedNpcActionFallbackIds(new Set())
        setFeedbackBatchSettledKey(null)
        setOrchestratingFeedbacks(false)
        setNpcActionEnhancing(false)
    }, [currentRound, schemeBatchKey])

    useEffect(() => {
        if (lastSettlement && settlementRevealIntentRef.current) {
            settlementRevealIntentRef.current = false
            setSettlementVisible(true)
        }
    }, [lastSettlement])

    useEffect(() => {
        if (!canProceed || lastSettlement) return
        if (settlementPrepareKeyRef.current === schemeBatchKey) return
        settlementPrepareKeyRef.current = schemeBatchKey
        prepareSchemeSettlementForFeedback()
    }, [canProceed, lastSettlement, prepareSchemeSettlementForFeedback, schemeBatchKey])

    useEffect(() => {
        if (!lastSettlement?.policyReport) return
        if (empressReplyRecord?.sourceRound === currentRound) return

        const preheatKey = `${currentRound}:${lastSettlement.policyReport.sourceRound}:${lastSettlement.policyReport.optionLabel}:${lastSettlement.policyReport.reason}`
        if (empressReplyPreheatKeyRef.current === preheatKey) return
        empressReplyPreheatKeyRef.current = preheatKey

        let cancelled = false
        void generateEmpressReplyRecordForPolicy({
            currentRound,
            policyReport: lastSettlement.policyReport,
            policyAftereffect: lastSettlement.policyAftereffect,
            southStatsAfter: lastSettlement.southStatsAfter,
            playerDangerStage: roundStartSnapshot?.playerDangerStage ?? 'safe',
            invasionSummary: lastSettlement.judgeFacts.invasionSummary,
            worldMemoryLedger,
            roundEvent: {
                eventName: currentRoundEvent.eventName,
                eventBriefing: currentRoundEvent.eventBriefing,
            },
            tag: 'empress_feedback_reply_page',
        }).then(replyRecord => {
            if (cancelled) return
            setEmpressReplyRecord(replyRecord)
        })

        return () => {
            cancelled = true
        }
    }, [
        currentRound,
        currentRoundEvent.eventBriefing,
        currentRoundEvent.eventName,
        empressReplyRecord,
        lastSettlement?.judgeFacts?.invasionSummary,
        lastSettlement?.playerDangerStage,
        lastSettlement?.policyAftereffect,
        lastSettlement?.policyReport,
        lastSettlement?.southStatsAfter,
        roundStartSnapshot?.playerDangerStage,
        setEmpressReplyRecord,
        worldMemoryLedger,
    ])

    useEffect(() => {
        if (!lastSettlement) return

        const effectStillMountedRef = { current: true }
        const fallbackActionIds = getEnhanceableFallbackActionIds(lastSettlement)
        const unrevealedFallbackActionIds = fallbackActionIds.filter(actionId => !revealedNpcActionFallbackIds.has(actionId))
        const enhancementKey = buildNpcActionEnhancementKey(currentRound, fallbackActionIds)

        if (unrevealedFallbackActionIds.length === 0) {
            setNpcActionEnhancing(false)
            return
        }

        const revealFallbackIds = (actionIds: string[]) => {
            setRevealedNpcActionFallbackIds(current => {
                const next = new Set(current)
                actionIds.forEach(actionId => next.add(actionId))
                return next
            })
        }

        if (getAiMode() === 'fallback') {
            revealFallbackIds(unrevealedFallbackActionIds)
        } else {
            unrevealedFallbackActionIds.forEach(actionId => {
                if (npcActionFallbackTimersRef.current.has(actionId)) return
                const timer = globalThis.setTimeout(() => {
                    npcActionFallbackTimersRef.current.delete(actionId)
                    revealFallbackIds([actionId])
                }, NPC_ACTION_FALLBACK_GRACE_MS)
                npcActionFallbackTimersRef.current.set(actionId, timer)
            })
        }

        if (npcActionEnhancementKeyRef.current === enhancementKey) return
        npcActionEnhancementKeyRef.current = enhancementKey
        setNpcActionEnhancing(true)

        void initAiService().then(mode => {
            if (mode === 'fallback') {
                if (effectStillMountedRef.current) {
                    revealFallbackIds(unrevealedFallbackActionIds)
                }
                recordAiCallDiagnostic({
                    tag: 'scheme_npc_action_batch',
                    mode,
                    status: 'fallback',
                    fallbackReason: 'fallback_mode',
                    provider: 'scheme_feedback_npc_action_init',
                })
                return lastSettlement
            }

            return generateSchemeNpcActionsForSettlement({
                settlement: lastSettlement,
                npcs,
                factions,
                currentRound,
                intelProgress,
                roundHistory,
                recentBacklash,
                npcMemoryLedger,
                relationMemoryLedger,
                worldMemoryLedger,
                roundEvent: currentRoundEvent,
                itemTimeoutMs: NPC_ACTION_BACKGROUND_ITEM_TIMEOUT_MS,
                batchTimeoutMs: NPC_ACTION_BACKGROUND_BATCH_TIMEOUT_MS,
            })
        }).then(patchedSettlement => {
            if (!patchedSettlement) return
            patchedSettlement.schemeResults.forEach((result, index) => {
                const action = patchedSettlement.processedSchemes[index]
                if (!action?.id || result.npcAction?.source !== 'ai') return
                updateSchemeNpcAction(action.id, result.npcAction)
            })
        }).finally(() => {
            if (effectStillMountedRef.current) setNpcActionEnhancing(false)
        })

        return () => {
            effectStillMountedRef.current = false
        }
    }, [currentRound, currentRoundEvent.eventBriefing, currentRoundEvent.eventName, currentSchemes, factions, intelProgress, lastSettlement, npcMemoryLedger, npcs, recentBacklash, relationMemoryLedger, roundHistory, updateSchemeNpcAction, worldMemoryLedger])

    useEffect(() => {
        let cancelled = false
        let retryTimer: ReturnType<typeof globalThis.setTimeout> | null = null

        const scheduleRetry = () => {
            retryTimer = globalThis.setTimeout(() => {
                void runFeedbackOrchestration()
            }, 120)
        }

        const clearRetry = () => {
            if (retryTimer) {
                globalThis.clearTimeout(retryTimer)
                retryTimer = null
            }
        }

        const markBatchSettled = () => {
            settledBatchKeyRef.current = schemeBatchKey
            setFeedbackBatchSettledKey(schemeBatchKey)
            setOrchestratingFeedbacks(false)
        }

        const runFeedbackOrchestration = async () => {
            const snapshot = orchestrationStateRef.current
            if (!snapshot) return
            if (snapshot.currentSchemes.length === 0) return
            if (settledBatchKeyRef.current === schemeBatchKey) return
            if (shouldWaitForPrefetchedFeedback({
                currentSchemes: snapshot.currentSchemes,
                npcFeedbacks: snapshot.npcFeedbacks,
                pendingStructuredSchemeIds: snapshot.pendingStructuredSchemeIds,
            })) {
                scheduleRetry()
                return
            }

            setOrchestratingFeedbacks(true)
            const existingFeedbackMap = new Map(
                snapshot.npcFeedbacks.map(item => [item.id, item] as const),
            )

            const preparedActions = snapshot.currentSchemes
                .map((action, index) => {
                    const targetNpc = snapshot.npcs.find(npc => npc.id === action.targetNpcId)
                    if (!targetNpc) return null

                    const feedbackId = action.id ?? `rebuild_${index}_${targetNpc.id}`
                    const previousActions = snapshot.currentSchemes
                        .slice(0, index)
                        .filter(item => item.targetNpcId === action.targetNpcId).length
                    const relatedNpc = action.relatedNpcId
                        ? snapshot.npcs.find(npc => npc.id === action.relatedNpcId) ?? null
                        : null
                    const knownSecretThreads = targetNpc.secretThreads.slice(0, snapshot.intelProgress[targetNpc.id] ?? 0)
                    const dynamicContext = buildNpcPromptDynamicContext({
                        npc: targetNpc,
                        factions: snapshot.factions,
                        roundHistory: snapshot.roundHistory,
                        recentBacklash: snapshot.recentBacklash,
                        npcMemoryLedger: snapshot.npcMemoryLedger,
                        relationMemoryLedger: snapshot.relationMemoryLedger,
                        worldMemoryLedger: snapshot.worldMemoryLedger,
                        relatedNpcId: relatedNpc?.id,
                        currentRound,
                        schemeType: action.schemeType,
                    })

                    if (!existingFeedbackMap.has(feedbackId)) {
                        snapshot.addNpcFeedback({
                            id: feedbackId,
                            npcId: targetNpc.id,
                            npcName: targetNpc.name,
                            schemeType: action.schemeType,
                            schemeName: SCHEME_NAMES[action.schemeType] ?? action.schemeType,
                            playerSpeech: action.playerSpeech,
                            feedback: '',
                            isLoading: true,
                            source: getAiModeLabel(),
                        })
                    }

                    const parsePromise = action.northParse
                        ? Promise.resolve(action.northParse)
                        : (
                            snapshot.markSchemeParsePending(feedbackId),
                            parseNorthSchemeInput({
                                round: currentRound,
                                npc: targetNpc,
                                schemeType: action.schemeType,
                                speech: action.playerSpeech,
                                relatedNpc,
                                omenSpeechInput: action.omenSpeechInput,
                                eventName: snapshot.currentRoundEvent.eventName,
                                eventBriefing: snapshot.currentRoundEvent.eventBriefing,
                            }).then(parsed => {
                                if (cancelled) return parsed
                                snapshot.updateSchemeParse(feedbackId, parsed)
                                return parsed
                            }).catch(() => {
                                const fallbackParsed = fallbackNorthParseFromSpeech({
                                    speech: action.playerSpeech,
                                    npc: targetNpc,
                                    round: currentRound,
                                    schemeType: action.schemeType,
                                    relatedNpc,
                                    omenSpeechInput: action.omenSpeechInput,
                                    eventName: snapshot.currentRoundEvent.eventName,
                                    eventBriefing: snapshot.currentRoundEvent.eventBriefing,
                                })
                                recordAiGameMasterDebug({
                                    chain: 'north_scheme',
                                    source: 'fallback',
                                    round: currentRound,
                                    npcId: targetNpc.id,
                                    npcName: targetNpc.name,
                                    schemeType: action.schemeType,
                                    summary: `${targetNpc.name} · ${action.schemeType}`,
                                    notes: ['parseNorthSchemeInput threw; component-level local fallback was used.'],
                                })

                                if (cancelled) return fallbackParsed
                                snapshot.updateSchemeParse(feedbackId, fallbackParsed)
                                return fallbackParsed
                            })
                        )

                    return {
                        action,
                        index,
                        feedbackId,
                        targetNpc,
                        relatedNpc,
                        knownSecretThreads,
                        dynamicContext,
                        previousActions,
                        parsePromise,
                    }
                })
                .filter((item): item is NonNullable<typeof item> => Boolean(item))

            if (preparedActions.length === 0) {
                if (!cancelled) {
                    markBatchSettled()
                }
                return
            }

            const parsedActions = await Promise.all(
                preparedActions.map(async item => ({
                    ...item,
                    parsed: await item.parsePromise,
                })),
            )

            if (cancelled) return

            const candidateId = selectRequiredSchemeFollowUpCandidateId(
                parsedActions.map(item => ({
                    ...item.action,
                    northParse: item.parsed,
                })),
            )

            for (const item of parsedActions) {
                if (cancelled) return
                const existingFeedback = existingFeedbackMap.get(item.feedbackId)
                const isFollowUpCandidate = Boolean(candidateId && item.action.id === candidateId && item.action.id)
                const fallbackQuestion = buildContextualFallbackFollowUpQuestion({
                    schemeType: item.action.schemeType,
                    targetNpcName: item.targetNpc.name,
                    relatedNpcName: item.relatedNpc?.name,
                    playerSpeech: item.action.playerSpeech,
                    northParse: item.parsed,
                })
                const normalizeReply = (rawReply: string) => {
                    const cleaned = sanitizeNpcReplyText(rawReply.trim())
                    const safeReply = cleaned || `${item.targetNpc.name}${LOCAL_REPLY_FALLBACK}`
                    return isFollowUpCandidate
                        ? forceQuestionCandidateReplyText(safeReply, fallbackQuestion)
                        : forceStatementReplyText(safeReply)
                }

                if (existingFeedback && !existingFeedback.isLoading) {
                    const normalizedReply = normalizeReply(existingFeedback.feedback)
                    if (normalizedReply !== existingFeedback.feedback) {
                        snapshot.updateNpcFeedback(item.feedbackId, normalizedReply, existingFeedback.source)
                    }

                    await orchestrateOmenEchoFeedback({
                        feedbackId: item.feedbackId,
                        action: item.action,
                        targetNpc: item.targetNpc,
                        parsed: item.parsed,
                        npcs: snapshot.npcs,
                        relationships: snapshot.relationships,
                        round: currentRound,
                        roundEvent: {
                            eventName: snapshot.currentRoundEvent.eventName,
                            eventBriefing: snapshot.currentRoundEvent.eventBriefing,
                        },
                        updateNpcFeedbackOmenEcho: snapshot.updateNpcFeedbackOmenEcho,
                        hasExistingOmenEcho: Boolean(existingFeedback.omenEcho),
                    })

                    if (isFollowUpCandidate && item.action.id) {
                        snapshot.setSchemeFollowUp(item.action.id, {
                            questionText: extractTerminalQuestion(normalizedReply) ?? fallbackQuestion,
                            status: 'available',
                        })
                    }
                    continue
                }

                const success = previewSchemeSuccess(
                    { ...item.action, northParse: item.parsed },
                    item.targetNpc,
                    item.previousActions,
                    item.action.resolutionRoll ?? 0.5,
                    {
                        round: currentRound,
                        unlockedSecrets: snapshot.intelProgress[item.targetNpc.id] ?? 0,
                        northParse: item.parsed,
                    },
                )

                try {
                    const reply = await chatCompletion(
                        buildNpcPrompt({
                            npc: item.targetNpc,
                            schemeType: item.action.schemeType,
                            speech: item.action.playerSpeech,
                            success,
                            relatedNpc: item.relatedNpc,
                            northParse: item.parsed,
                            followUpMode: candidateId && item.action.id === candidateId ? 'question_candidate' : 'statement_only',
                            round: currentRound,
                            eventName: snapshot.currentRoundEvent.eventName,
                            eventBriefing: snapshot.currentRoundEvent.eventBriefing,
                            knownSecretThreads: item.knownSecretThreads,
                            previousDealings: item.dynamicContext.previousDealings,
                            relationshipTemperature: item.dynamicContext.relationshipTemperature,
                            recentCourtFortune: item.dynamicContext.recentCourtFortune,
                            factionPressure: item.dynamicContext.factionPressure,
                            longTermMemorySummary: item.dynamicContext.longTermMemorySummary,
                            relationMemorySummary: item.dynamicContext.relationMemorySummary,
                            worldMemorySummary: item.dynamicContext.worldMemorySummary,
                        }),
                        {
                            temperature: 0.75,
                            maxTokens: 420,
                            tag: `npc_${item.action.schemeType}_${success ? 'success' : 'failure'}`,
                        },
                    )

                    if (cancelled) return

                    const source = getAiMode() === 'fallback' ? '鏈湴鍏滃簳' : getAiModeLabel()
                    const normalizedReply = normalizeReply(reply)
                    snapshot.updateNpcFeedback(item.feedbackId, normalizedReply, source)
                    await orchestrateOmenEchoFeedback({
                        feedbackId: item.feedbackId,
                        action: item.action,
                        targetNpc: item.targetNpc,
                        parsed: item.parsed,
                        npcs: snapshot.npcs,
                        relationships: snapshot.relationships,
                        round: currentRound,
                        roundEvent: {
                            eventName: snapshot.currentRoundEvent.eventName,
                            eventBriefing: snapshot.currentRoundEvent.eventBriefing,
                        },
                        updateNpcFeedbackOmenEcho: snapshot.updateNpcFeedbackOmenEcho,
                        hasExistingOmenEcho: Boolean(existingFeedback?.omenEcho),
                    })

                    if (isFollowUpCandidate && item.action.id) {
                        snapshot.setSchemeFollowUp(item.action.id, {
                            questionText: extractTerminalQuestion(normalizedReply) ?? fallbackQuestion,
                            status: 'available',
                        })
                    }
                } catch {
                    if (cancelled) return
                    const normalizedReply = normalizeReply(`${item.targetNpc.name}${LOCAL_REPLY_FALLBACK}`)
                    snapshot.updateNpcFeedback(item.feedbackId, normalizedReply, '鏈湴鍏滃簳')
                    await orchestrateOmenEchoFeedback({
                        feedbackId: item.feedbackId,
                        action: item.action,
                        targetNpc: item.targetNpc,
                        parsed: item.parsed,
                        npcs: snapshot.npcs,
                        relationships: snapshot.relationships,
                        round: currentRound,
                        roundEvent: {
                            eventName: snapshot.currentRoundEvent.eventName,
                            eventBriefing: snapshot.currentRoundEvent.eventBriefing,
                        },
                        updateNpcFeedbackOmenEcho: snapshot.updateNpcFeedbackOmenEcho,
                        hasExistingOmenEcho: Boolean(existingFeedback?.omenEcho),
                    })
                    if (isFollowUpCandidate && item.action.id) {
                        snapshot.setSchemeFollowUp(item.action.id, {
                            questionText: extractTerminalQuestion(normalizedReply) ?? fallbackQuestion,
                            status: 'available',
                        })
                    }
                }
            }

            if (!cancelled) {
                markBatchSettled()
            }
        }

        void runFeedbackOrchestration().catch(() => {
            if (cancelled) return
            markBatchSettled()
        })

        return () => {
            cancelled = true
            clearRetry()
        }
    }, [currentRound, schemeBatchKey])

    useEffect(() => {
        let cancelled = false

        currentSchemes.forEach(action => {
            const actionId = action.id
            if (!actionId) return

            if (!shouldQueueRecoveryParse({
                actionId,
                hasNorthParse: Boolean(action.northParse),
                pendingStructuredSchemeIds,
                npcFeedbackCount: npcFeedbacks.length,
            })) return

            const targetNpc = npcs.find(npc => npc.id === action.targetNpcId)
            if (!targetNpc) return

            const relatedNpc = action.relatedNpcId
                ? npcs.find(npc => npc.id === action.relatedNpcId) ?? null
                : null

            markSchemeParsePending(actionId)
            parseNorthSchemeInput({
                round: currentRound,
                npc: targetNpc,
                schemeType: action.schemeType,
                speech: action.playerSpeech,
                relatedNpc,
                omenSpeechInput: action.omenSpeechInput,
                eventName: currentRoundEvent.eventName,
                eventBriefing: currentRoundEvent.eventBriefing,
            }).then(parsed => {
                if (cancelled) return
                updateSchemeParse(actionId, parsed)
            })
        })

        return () => {
            cancelled = true
        }
    }, [
        currentRound,
        currentRoundEvent.eventBriefing,
        currentRoundEvent.eventName,
        currentSchemes,
        markSchemeParsePending,
        npcFeedbacks.length,
        npcs,
        pendingStructuredSchemeIds,
        updateSchemeParse,
    ])

    const handleFollowUpDraftChange = (actionId: string, value: string) => {
        setFollowUpDrafts(current => ({
            ...current,
            [actionId]: value,
        }))
    }

    const handleSkipFollowUp = (actionId: string) => {
        skipSchemeFollowUp(actionId)
        setFollowUpDrafts(current => {
            const next = { ...current }
            delete next[actionId]
            return next
        })
    }

    const handleSubmitFollowUp = async (actionId: string) => {
        const action = currentSchemes.find(item => item.id === actionId)
        const followUp = action?.followUp
        const targetNpc = npcs.find(npc => npc.id === action?.targetNpcId)
        const relatedNpc = action?.relatedNpcId
            ? npcs.find(npc => npc.id === action.relatedNpcId) ?? null
            : null
        const playerReply = followUpDrafts[actionId]?.trim() ?? ''

        if (!actionId || !action || !targetNpc || !action.northParse || !followUp || followUp.status !== 'available') return
        if (!playerReply || submittingFollowUpId) return

        setSubmittingFollowUpId(actionId)

        try {
            let followUpParse = ZERO_DELTA_FOLLOW_UP_PARSE
            const followUpMetadata: SchemeFollowUpAnswerMetadata = {
                parseSource: 'invalid_ai_fallback',
                parseFallbackReason: 'parse_exception',
            }

            try {
                const followUpParseResult = await parseSchemeFollowUpInputDetailed({
                    round: currentRound,
                    eventName: currentRoundEvent.eventName,
                    eventBriefing: currentRoundEvent.eventBriefing,
                    npc: targetNpc,
                    schemeType: action.schemeType,
                    originalSpeech: action.playerSpeech,
                    originalParse: action.northParse,
                    npcQuestion: followUp.questionText,
                    playerReply,
                })
                followUpParse = followUpParseResult.parse
                followUpMetadata.parseSource = followUpParseResult.source
                followUpMetadata.parseFallbackReason = followUpParseResult.fallbackReason
            } catch {
                recordFollowUpFallbackDiagnostic({
                    tag: 'scheme_follow_up_parse',
                    reason: 'parse_exception',
                })
            }

            const knownSecretThreads = targetNpc.secretThreads.slice(0, intelProgress[targetNpc.id] ?? 0)
            const dynamicContext = buildNpcPromptDynamicContext({
                npc: targetNpc,
                factions,
                roundHistory,
                recentBacklash,
                npcMemoryLedger,
                relationMemoryLedger,
                worldMemoryLedger,
                relatedNpcId: relatedNpc?.id,
                currentRound,
                schemeType: action.schemeType,
            })

            const finalReplyTag = `scheme_follow_up_${action.schemeType}`
            const finalReplyResult = await chatCompletionDetailed(
                buildNpcFollowUpFinalPrompt({
                    npc: targetNpc,
                    schemeType: action.schemeType,
                    originalSpeech: action.playerSpeech,
                    npcQuestion: followUp.questionText,
                    playerReply,
                    parseEvidence: followUpParse.evidence,
                    followUpParse,
                    round: currentRound,
                    eventName: currentRoundEvent.eventName,
                    eventBriefing: currentRoundEvent.eventBriefing,
                    knownSecretThreads,
                    previousDealings: dynamicContext.previousDealings,
                    relationshipTemperature: dynamicContext.relationshipTemperature,
                    recentCourtFortune: dynamicContext.recentCourtFortune,
                    factionPressure: dynamicContext.factionPressure,
                    longTermMemorySummary: dynamicContext.longTermMemorySummary,
                    relationMemorySummary: dynamicContext.relationMemorySummary,
                    worldMemorySummary: dynamicContext.worldMemorySummary,
                    relatedNpc,
                    northParse: action.northParse,
                }),
                {
                    temperature: 0.7,
                    maxTokens: 220,
                    tag: finalReplyTag,
                },
            )

            const cleanedFinalReply = sanitizeFollowUpReplyText(finalReplyResult.text.trim())
            if (cleanedFinalReply) {
                followUpMetadata.finalNpcReplySource = finalReplyResult.source
                followUpMetadata.finalNpcReplyFallbackReason = finalReplyResult.fallbackReason
            } else {
                followUpMetadata.finalNpcReplySource = 'fallback'
                followUpMetadata.finalNpcReplyFallbackReason = finalReplyResult.source === 'fallback'
                    ? finalReplyResult.fallbackReason ?? 'completion_exception'
                    : 'sanitized_empty'
                recordFollowUpFallbackDiagnostic({
                    tag: finalReplyTag,
                    reason: followUpMetadata.finalNpcReplyFallbackReason,
                    mode: finalReplyResult.mode,
                    messageCount: 1,
                    maxTokens: 220,
                    temperature: 0.7,
                })
            }
            answerSchemeFollowUp(
                actionId,
                playerReply,
                followUpParse,
                cleanedFinalReply || buildFollowUpReplyFallback(targetNpc.name),
                followUpMetadata,
            )
            setFollowUpDrafts(current => {
                const next = { ...current }
                delete next[actionId]
                return next
            })
        } catch {
            recordFollowUpFallbackDiagnostic({
                tag: `scheme_follow_up_${action.schemeType}`,
                reason: 'completion_exception',
                maxTokens: 220,
                temperature: 0.7,
            })
            answerSchemeFollowUp(
                actionId,
                playerReply,
                ZERO_DELTA_FOLLOW_UP_PARSE,
                buildFollowUpReplyFallback(targetNpc.name),
                {
                    parseSource: 'invalid_ai_fallback',
                    parseFallbackReason: 'parse_exception',
                    finalNpcReplySource: 'fallback',
                    finalNpcReplyFallbackReason: 'completion_exception',
                },
            )
            setFollowUpDrafts(current => {
                const next = { ...current }
                delete next[actionId]
                return next
            })
        } finally {
            setSubmittingFollowUpId(null)
        }
    }

    const handleProceedClick = () => {
        if (lastSettlement && !settlementVisible) {
            setSettlementVisible(true)
            return
        }

        if (!lastSettlement && canProceed) {
            settlementRevealIntentRef.current = true
            prepareSchemeSettlementForFeedback()
            return
        }

        nextPhase()
    }

    return (
        <div className="page-container scheme-feedback animate-fade-in">
            {shouldShowFeedbackGuide && (
                <FirstRoundGuideModal
                    title={FIRST_ROUND_GUIDE_CONTENT.scheme_feedback.title}
                    body={FIRST_ROUND_GUIDE_CONTENT.scheme_feedback.body}
                    onClose={() => markFirstRoundGuideSeen('scheme_feedback')}
                />
            )}

            {shouldShowFollowUpGuide && (
                <SchemeOnboardingModal
                    open
                    title={FIRST_FOLLOW_UP_TEACHING_CONTENT.title}
                    pages={FIRST_FOLLOW_UP_TEACHING_CONTENT.pages}
                    onClose={() => {
                        markSchemeOnboardingSeen('first_follow_up_teaching')
                    }}
                />
            )}

            <div className="page-utility-row animate-slide-up">
                <PageUtilityActions onOpenGuide={() => openGameplayGuide('gameplay')} />
            </div>

            <div className="scheme-feedback-header animate-slide-up">
                <h2 className="page-title">计谋回报</h2>
            </div>

            <div className="feedback-list">
                {npcFeedbacks.length === 0 && (
                    <div className="feedback-item glass-panel decree-panel done">
                        <div className="feedback-body">
                            <div className="feedback-text-area">
                                <p className="feedback-text">本回合暂未收到计谋回报。若再次出现，请记下回合与目标，我会继续追查。</p>
                            </div>
                        </div>
                    </div>
                )}

                {npcFeedbacks.map((fb, index) => {
                    const action = actionById.get(fb.id)
                    const followUp = action?.followUp
                    const followUpImpact = getSchemeFollowUpImpactPresentation(followUp)
                    const actionId = action?.id ?? fb.id
                    const isSubmitting = submittingFollowUpId === actionId
                    const draftValue = followUpDrafts[actionId] ?? followUp?.playerReply ?? ''
                    const omenEcho = fb.schemeType === 'omen' ? fb.omenEcho : undefined
                    const showOmenEcho = Boolean(omenEcho)

                    return (
                        <div
                            key={fb.id}
                            className={`feedback-item glass-panel decree-panel animate-slide-up ${fb.isLoading ? 'loading' : 'done'}`}
                            style={{ animationDelay: `${0.1 + index * 0.15}s` }}
                        >
                            <NpcPortrait
                                name={fb.npcName}
                                alt={`${fb.npcName}虚影`}
                                className="feedback-ghost-portrait"
                                positionY="18%"
                            />
                            <div className="feedback-header">
                                <div className="feedback-meta">
                                    <span className="feedback-order">第{index + 1} 封回报</span>
                                    <span className="feedback-npc-name">{fb.npcName}</span>
                                    <span className="feedback-scheme-label">
                                        计谋：{fb.schemeName}
                                        {fb.playerSpeech && <span className="feedback-speech"> · “{fb.playerSpeech}”</span>}
                                    </span>
                                </div>
                                <span className={`feedback-status ${fb.isLoading ? 'loading' : 'done'}`}>
                                    {fb.isLoading ? '未揭晓' : '已揭晓'}
                                </span>
                            </div>

                            <div className="feedback-body">
                                {fb.isLoading ? (
                                    <div className="loading-state">
                                        <div className="ai-ripple" />
                                        <p className="loading-hint">{fb.npcName}正在思量你的这一步棋……</p>
                                    </div>
                                ) : (
                                    <div className="feedback-text-area animate-fade-in">
                                        <div className="quote-mark">“</div>
                                        <p className="feedback-text">{sanitizeNpcReplyText(fb.feedback)}</p>
                                        <div className="quote-mark end">”</div>
                                    </div>
                                )}

                                {showOmenEcho && omenEcho && (
                                    <div className="feedback-omen-echo animate-fade-in">
                                        <div className="feedback-omen-echo-label">余音</div>
                                        <div className="feedback-omen-echo-speaker">
                                            {omenEcho.speakerNpcName} · {omenEcho.speakerTitle}
                                        </div>
                                        <div className="feedback-omen-echo-text">
                                            {sanitizeNpcReplyText(omenEcho.text)}
                                        </div>
                                        <div className="feedback-omen-echo-source">
                                            {omenEcho.source === 'ai' ? 'AI 回声' : '本地兜底'}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {followUp?.status === 'available' && actionId === visibleAvailableFollowUpId && (
                                <div className="feedback-follow-up glass-panel">
                                    <div className="feedback-follow-up-label">追问</div>
                                    <div className="feedback-follow-up-question">{followUp.questionText}</div>
                                    <label className="feedback-follow-up-input-label" htmlFor={`follow-up-${actionId}`}>
                                        你的回应
                                    </label>
                                    <textarea
                                        id={`follow-up-${actionId}`}
                                        className="feedback-follow-up-input"
                                        value={draftValue}
                                        onChange={event => handleFollowUpDraftChange(actionId, event.target.value)}
                                        placeholder="写下你的补充说明"
                                        rows={4}
                                        disabled={isSubmitting}
                                    />
                                    <div className="feedback-follow-up-actions">
                                        <button
                                            type="button"
                                            className="btn-secondary feedback-follow-up-skip"
                                            onClick={() => handleSkipFollowUp(actionId)}
                                            disabled={isSubmitting}
                                        >
                                            跳过追问
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-primary feedback-follow-up-submit"
                                            onClick={() => handleSubmitFollowUp(actionId)}
                                            disabled={isSubmitting || draftValue.trim().length === 0}
                                        >
                                            {isSubmitting ? '正在回应' : '发送回应'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {followUp?.status === 'answered' && (
                                <div className="feedback-follow-up feedback-follow-up--final">
                                    <div className="feedback-follow-up-label">追问回应</div>
                                    <div className="feedback-follow-up-final">
                                        {sanitizeFollowUpReplyText(followUp.finalNpcReply ?? '')}
                                    </div>
                                    {followUpImpact && (
                                        <div className={`feedback-follow-up-impact feedback-follow-up-impact--${followUpImpact.tone}`}>
                                            <span className="feedback-follow-up-impact-label">追问成效</span>
                                            <span>{followUpImpact.text}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {followUp?.status === 'skipped' && (
                                <div className="feedback-follow-up feedback-follow-up--skipped">
                                    已跳过追问，结算将按原始说辞继续推进。
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {settlementRevealed && lastSettlement && (
                <div className="scheme-feedback-settlement animate-slide-up animate-delay-3">
                    <h3 className="section-title">计谋筹算结果</h3>
                    <div className="scheme-feedback-results-list">
                        {lastSettlement.schemeResults.length === 0 && (
                            <div className="scheme-feedback-result-card glass-panel">
                                <p className="scheme-feedback-result-text">本回合没有可展示的计谋筹算结果。</p>
                            </div>
                        )}

                        {lastSettlement.schemeResults.map((result, index) => {
                            const action = lastSettlement.processedSchemes?.[index] ?? currentSchemes[index]
                            const npc = npcs.find(item => item.id === action?.targetNpcId)
                            const relatedNpc = action?.relatedNpcId
                                ? npcs.find(item => item.id === action.relatedNpcId) ?? null
                                : null
                            const npcActionDisplay = getSchemeNpcActionDisplay({
                                npcName: npc?.name,
                                npcAction: result.npcAction,
                                delayFallback: shouldDelaySchemeNpcActionFallback({
                                    settlement: lastSettlement,
                                    resultIndex: index,
                                    revealedActionIds: revealedNpcActionFallbackIds,
                                }),
                            })
                            const effectTags = buildSchemeResultEffectTags({
                                result,
                                action: action ?? null,
                                targetNpc: npc ?? null,
                                relatedNpc,
                                factions,
                            })

                            return (
                                <div
                                    key={`scheme-result-${index}`}
                                    className={`scheme-feedback-result-card glass-panel ${result.success ? 'success' : 'failure'}`}
                                    style={{ animationDelay: `${0.12 + index * 0.12}s` }}
                                >
                                    {npc && (
                                        <NpcPortrait
                                            name={npc.name}
                                            alt={`${npc.name}筹算虚影`}
                                            className="scheme-feedback-result-portrait"
                                            positionY="18%"
                                        />
                                    )}

                                    <div className="scheme-feedback-result-header">
                                        <div className="scheme-feedback-result-info">
                                            <span className="scheme-feedback-result-index">计谋 {index + 1}</span>
                                            <span className="scheme-feedback-result-scheme">
                                                {SCHEME_NAMES[action?.schemeType ?? ''] ?? action?.schemeType ?? '未知计谋'}
                                            </span>
                                        </div>
                                        <span className={`scheme-feedback-result-badge ${result.success ? 'success' : 'failure'}`}>
                                            {result.success ? '成' : '败'}
                                        </span>
                                    </div>

                                    {npcActionDisplay && (
                                        <p className="scheme-feedback-result-text">
                                            <strong>{npcActionDisplay.label}</strong>
                                            ：{npcActionDisplay.text}
                                        </p>
                                    )}

                                    <div className="scheme-feedback-result-effects">
                                        {effectTags.map(tag => (
                                            <span key={tag.label} className={`effect-tag ${tag.tone}`}>
                                                {tag.label}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {settlementRevealed && lastSettlement?.borrowedBladeReports && lastSettlement.borrowedBladeReports.length > 0 && (
                <div className="scheme-feedback-settlement animate-slide-up animate-delay-4">
                    <h3 className="section-title">朝堂收网</h3>
                    <div className="scheme-feedback-results-list scheme-feedback-results-list--court">
                        {lastSettlement.borrowedBladeReports.map(report => (
                            <div
                                key={`${report.actorNpcId}-${report.targetNpcId}-${report.outcome}`}
                                className={`scheme-feedback-result-card glass-panel ${report.outcome === 'executed' ? 'failure' : 'success'}`}
                            >
                                <div className="scheme-feedback-result-header">
                                    <div className="scheme-feedback-result-info">
                                        <span className="scheme-feedback-result-scheme">
                                            {report.outcome === 'executed' ? '处决' : report.outcome === 'dismissed' ? '罢黜' : '施压'}
                                        </span>
                                        <span className="scheme-feedback-result-index">
                                            {report.actorNpcName} → {report.targetNpcName}
                                        </span>
                                    </div>
                                </div>
                                <p className="scheme-feedback-result-text">{report.summary}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="action-footer animate-slide-up animate-delay-4">
                <button
                    className="btn-primary btn-proceed"
                    onClick={handleProceedClick}
                    disabled={!canClickProceed}
                >
                    {proceedLabel}
                </button>
            </div>
        </div>
    )
}






