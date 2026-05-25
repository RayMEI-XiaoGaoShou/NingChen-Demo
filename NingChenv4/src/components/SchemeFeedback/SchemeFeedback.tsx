import type { CSSProperties } from 'react'
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
import { getRevealedSecretThreadForScheme } from '../../game/revealedSecretThread'
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
import type { BorrowedBladeReport, NPC, NorthSchemeParseResult, OmenEchoFeedback, RelationshipEdge, SchemeAction, SchemeFollowUp, SchemeFollowUpAnswerMetadata, SchemeFollowUpFallbackReason, SchemeFollowUpParseResult } from '../../game/types'
import { FirstRoundGuideModal } from '../FirstRoundGuide/FirstRoundGuideModal'
import { NpcPortrait } from '../NpcPortrait/NpcPortrait'
import { SchemeOnboardingModal } from '../SchemePanel/SchemeOnboardingModal'
import { GameViewport } from '../GameViewport/GameViewport'
import { GameHudTools, HudStatusChip } from '../GameHud/GameHud'
import { getNpcDetailAvatarPath, getNpcDetailBackgroundPath } from '../../data/mediaAssets'
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
const FEEDBACK_ORDINALS = ['壹', '贰', '叁'] as const
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
    return params.terminalResult ? '查看终局' : '江南来信'
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

export function shouldAutoRevealSchemeFeedbackPreview(search = typeof window !== 'undefined' ? window.location.search : ''): boolean {
    const params = new URLSearchParams(search)
    return params.get('preview') === 'scheme-feedback' && params.get('settlement') !== 'hidden'
}

function getBorrowedBladeOutcomeLabel(outcome: BorrowedBladeReport['outcome']): string {
    switch (outcome) {
        case 'executed':
            return '处决'
        case 'dismissed':
            return '罢黜'
        case 'pressure':
            return '施压'
        default:
            return '未成'
    }
}

function getBorrowedBladeOutcomeTone(outcome: BorrowedBladeReport['outcome']): 'success' | 'failure' | 'neutral' {
    if (outcome === 'executed' || outcome === 'dismissed') return 'success'
    if (outcome === 'failed') return 'failure'
    return 'neutral'
}

function compactUniqueTexts(values: Array<string | null | undefined>): string[] {
    return Array.from(new Set(values.map(value => value?.trim()).filter((value): value is string => Boolean(value))))
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
    const [activeFeedbackId, setActiveFeedbackId] = useState<string | null>(null)
    const [viewedFeedbackIds, setViewedFeedbackIds] = useState<Set<string>>(() => new Set())
    const [viewedSettlementIds, setViewedSettlementIds] = useState<Set<string>>(() => new Set())
    const [, setFeedbackBatchSettledKey] = useState<string | null>(null)
    const [orchestratingFeedbacks, setOrchestratingFeedbacks] = useState(false)
    const [, setNpcActionEnhancing] = useState(false)
    const [revealedNpcActionFallbackIds, setRevealedNpcActionFallbackIds] = useState<Set<string>>(() => new Set())
    const autoRevealSettlement = shouldAutoRevealSchemeFeedbackPreview()
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
    const feedbackById = new Map(relevantFeedbacks.map(item => [item.id, item] as const))
    const feedbackEntries = (
        currentSchemes.length > 0
            ? currentSchemes.map((action, index) => {
                const feedbackId = action.id ?? `scheme-feedback-${index}-${action.targetNpcId}`
                const targetNpc = npcs.find(item => item.id === action.targetNpcId)
                const feedback = action.id ? feedbackById.get(action.id) : npcFeedbacks[index]
                return {
                    id: feedbackId,
                    index,
                    action,
                    feedback,
                    targetNpc,
                    npcName: targetNpc?.name ?? feedback?.npcName ?? `对象${index + 1}`,
                    schemeName: feedback?.schemeName ?? SCHEME_NAMES[action.schemeType] ?? action.schemeType,
                    playerSpeech: action.playerSpeech || feedback?.playerSpeech || '',
                }
            })
            : npcFeedbacks.map((feedback, index) => {
                const targetNpc = npcs.find(item => item.id === feedback.npcId)
                return {
                    id: feedback.id,
                    index,
                    action: actionById.get(feedback.id),
                    feedback,
                    targetNpc,
                    npcName: targetNpc?.name ?? feedback.npcName,
                    schemeName: feedback.schemeName,
                    playerSpeech: feedback.playerSpeech,
                }
            })
    )
    const feedbackEntryKey = feedbackEntries.map(item => item.id).join('|')
    const feedbackReadyKey = feedbackEntries
        .map(item => `${item.id}:${item.feedback && !item.feedback.isLoading ? 'ready' : 'wait'}`)
        .join('|')
    const resolvedActiveFeedbackId = feedbackEntries.some(item => item.id === activeFeedbackId)
        ? activeFeedbackId
        : feedbackEntries[0]?.id ?? null
    const activeFeedbackIndex = Math.max(0, feedbackEntries.findIndex(item => item.id === resolvedActiveFeedbackId))
    const activeFeedbackEntry = feedbackEntries[activeFeedbackIndex] ?? feedbackEntries[0] ?? null
    const activeSceneBackgroundPath = activeFeedbackEntry
        ? getNpcDetailBackgroundPath(activeFeedbackEntry.targetNpc?.id ?? activeFeedbackEntry.npcName)
            ?? getNpcDetailBackgroundPath(activeFeedbackEntry.npcName)
        : undefined
    const activeSceneStyle = activeSceneBackgroundPath
        ? { '--feedback-scene-bg': `url("${activeSceneBackgroundPath}")` } as CSSProperties
        : undefined
    const expectedFeedbackCount = feedbackEntries.length || Math.max(expectedFeedbackIds.size, currentSchemes.length, npcFeedbacks.length)
    const viewedFeedbackCount = feedbackEntries.filter(item => viewedFeedbackIds.has(item.id)).length
    const unreadFeedbackCount = Math.max(expectedFeedbackCount - viewedFeedbackCount, 0)
    const allFeedbacksViewed = expectedFeedbackCount > 0 && unreadFeedbackCount === 0
    const expectedSettlementCount = Math.max(feedbackEntries.length, lastSettlement?.schemeResults.length ?? 0, expectedFeedbackCount)
    const viewedSettlementCount = feedbackEntries.filter(item => viewedSettlementIds.has(item.id)).length
    const unreadSettlementCount = Math.max(expectedSettlementCount - viewedSettlementCount, 0)
    const allSettlementViewed = expectedSettlementCount > 0 && unreadSettlementCount === 0
    const hudViewedCount = settlementVisible ? viewedSettlementCount : viewedFeedbackCount
    const hudExpectedCount = settlementVisible ? expectedSettlementCount : expectedFeedbackCount
    const allDone =
        expectedFeedbackIds.size > 0 &&
        relevantFeedbacks.length === expectedFeedbackIds.size &&
        relevantFeedbacks.every(item => !item.isLoading) &&
        !orchestratingFeedbacks
    const allParsed = currentSchemes.every(action => Boolean(action.northParse)) && pendingStructuredSchemeIds.length === 0
    const followUpBlocked = shouldBlockSettlementForFollowUp(currentSchemes, submittingFollowUpId !== null)
    const visibleAvailableFollowUpId = getVisibleAvailableFollowUpId(currentSchemes)
    const canProceed = canProceedFromSchemeFeedback({ allDone, allParsed, followUpBlocked })
    const canRevealSettlement = canProceed && allFeedbacksViewed
    const settlementRevealed = Boolean(lastSettlement && settlementVisible)
    const npcActionFallbackGracePending = Boolean(settlementRevealed && lastSettlement && getEnhanceableFallbackActionIds(lastSettlement).some(actionId => !revealedNpcActionFallbackIds.has(actionId)))
    const canClickProceed = !settlementVisible
        ? Boolean(lastSettlement) && canRevealSettlement
        : settlementRevealed && allSettlementViewed && !npcActionFallbackGracePending
    const proceedDisabledHint = !canClickProceed
        ? settlementVisible
            ? unreadSettlementCount > 0
                ? `尚有 ${unreadSettlementCount} 份筹算未阅`
                : npcActionFallbackGracePending
                    ? '筹算举措仍在归档'
                    : ''
            : unreadFeedbackCount > 0
                ? `尚有 ${unreadFeedbackCount} 封回报未阅`
                : followUpBlocked
                    ? '尚有追问未处理'
                    : ''
        : ''
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
        setSettlementVisible(autoRevealSettlement)
        setActiveFeedbackId(null)
        setViewedFeedbackIds(new Set())
        setViewedSettlementIds(new Set())
        setRevealedNpcActionFallbackIds(new Set())
        setFeedbackBatchSettledKey(null)
        setOrchestratingFeedbacks(false)
        setNpcActionEnhancing(false)
    }, [autoRevealSettlement, currentRound, schemeBatchKey])

    useEffect(() => {
        if (!feedbackEntries.length) return
        setActiveFeedbackId(current => (
            current && feedbackEntries.some(item => item.id === current)
                ? current
                : feedbackEntries[0].id
        ))
    }, [feedbackEntryKey])

    useEffect(() => {
        if (!autoRevealSettlement || !feedbackEntries.length) return
        setViewedFeedbackIds(new Set(feedbackEntries.map(item => item.id)))
    }, [autoRevealSettlement, feedbackEntryKey])

    useEffect(() => {
        if (!resolvedActiveFeedbackId) return
        const activeEntry = feedbackEntries.find(item => item.id === resolvedActiveFeedbackId)
        if (!activeEntry?.feedback || activeEntry.feedback.isLoading) return

        setViewedFeedbackIds(current => {
            if (current.has(activeEntry.id)) return current
            const next = new Set(current)
            next.add(activeEntry.id)
            return next
        })
    }, [feedbackReadyKey, resolvedActiveFeedbackId])

    useEffect(() => {
        if (!settlementRevealed || !resolvedActiveFeedbackId) return

        setViewedSettlementIds(current => {
            if (current.has(resolvedActiveFeedbackId)) return current
            const next = new Set(current)
            next.add(resolvedActiveFeedbackId)
            return next
        })
    }, [resolvedActiveFeedbackId, settlementRevealed])

    useEffect(() => {
        if (lastSettlement && (settlementRevealIntentRef.current || autoRevealSettlement)) {
            settlementRevealIntentRef.current = false
            setSettlementVisible(true)
        }
    }, [autoRevealSettlement, lastSettlement])

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
                const revealedSecretThread = getRevealedSecretThreadForScheme({
                    npc: item.targetNpc,
                    schemeType: item.action.schemeType,
                    success,
                    currentUnlockedSecrets: snapshot.intelProgress[item.targetNpc.id] ?? 0,
                })

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
                            revealedSecretThread,
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
            const actionIndex = currentSchemes.findIndex(item => item.id === actionId)
            const previousActions = currentSchemes
                .slice(0, Math.max(0, actionIndex))
                .filter(item => item.targetNpcId === action.targetNpcId).length
            const originalSuccess = previewSchemeSuccess(
                { ...action, northParse: action.northParse },
                targetNpc,
                previousActions,
                action.resolutionRoll ?? 0.5,
                {
                    round: currentRound,
                    unlockedSecrets: intelProgress[targetNpc.id] ?? 0,
                    northParse: action.northParse,
                },
            )
            const revealedSecretThread = getRevealedSecretThreadForScheme({
                npc: targetNpc,
                schemeType: action.schemeType,
                success: originalSuccess,
                currentUnlockedSecrets: intelProgress[targetNpc.id] ?? 0,
            })
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
                    revealedSecretThread,
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
        if (lastSettlement && !settlementVisible && canRevealSettlement) {
            setSettlementVisible(true)
            return
        }

        if (!lastSettlement && canRevealSettlement) {
            settlementRevealIntentRef.current = true
            prepareSchemeSettlementForFeedback()
            return
        }

        nextPhase()
    }

    const feedbackBleed = (
        <div
            key={resolvedActiveFeedbackId ?? 'scheme-feedback-empty'}
            className="scheme-feedback-bleed"
            style={activeSceneStyle}
        >
            <span className="scheme-feedback-bleed-shade" />
        </div>
    )

    return (
        <GameViewport
            className="scheme-feedback-viewport animate-fade-in"
            canvasClassName="scheme-feedback-design-canvas"
            bleed={feedbackBleed}
        >
            <div className={`scheme-feedback page-enter scheme-feedback--active-${activeFeedbackIndex + 1} ${settlementRevealed ? 'is-settlement-mode' : 'is-response-mode'}`}>
            {activeFeedbackEntry && (
                <NpcPortrait
                    key={activeFeedbackEntry.id}
                    name={activeFeedbackEntry.npcName}
                    alt={`${activeFeedbackEntry.npcName}回报立绘`}
                    className="scheme-feedback-scene-portrait animate-fade-in"
                    variant={getFeedbackPortraitVariant(activeFeedbackEntry.targetNpc)}
                    positionY="8%"
                    zoom={1.15}
                />
            )}

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

            <header className="scheme-feedback-topbar animate-slide-up">
                <div className="scheme-feedback-hud-cluster">
                    <HudStatusChip label="已阅" value={`${hudViewedCount}/${hudExpectedCount || 0}`} />
                    <GameHudTools onOpenGuide={() => openGameplayGuide('gameplay')} />
                </div>
            </header>

            <main className={`scheme-feedback-main ${settlementRevealed ? 'has-settlement' : 'is-response-only'}`}>
            <section
                className={`feedback-character-stage ${settlementRevealed ? 'is-settlement-stage' : 'is-response-stage'} feedback-character-stage--count-${Math.max(expectedFeedbackCount, 1)} feedback-character-stage--active-${activeFeedbackIndex + 1}`}
                aria-label={settlementRevealed ? '筹算结果' : '人物回应'}
            >
                {feedbackEntries.length === 0 && (
                    <div className="feedback-character-empty">
                        <p className="feedback-text">本回合暂未收到计谋回报。若再次出现，请记下回合与目标，我会继续追查。</p>
                    </div>
                )}

                {feedbackEntries.map(entry => {
                    const action = entry.action
                    const fb = entry.feedback
                    const followUp = action?.followUp
                    const followUpImpact = getSchemeFollowUpImpactPresentation(followUp)
                    const actionId = action?.id ?? entry.id
                    const isSubmitting = submittingFollowUpId === actionId
                    const draftValue = followUpDrafts[actionId] ?? followUp?.playerReply ?? ''
                    const isActive = entry.id === resolvedActiveFeedbackId
                    const isViewed = settlementRevealed
                        ? viewedSettlementIds.has(entry.id)
                        : viewedFeedbackIds.has(entry.id)
                    const isLoading = !fb || fb.isLoading
                    const omenEcho = fb?.schemeType === 'omen' ? fb.omenEcho : undefined
                    const showOmenEcho = Boolean(omenEcho)
                    const result = lastSettlement?.schemeResults[entry.index] ?? null
                    const settlementAction = lastSettlement?.processedSchemes?.[entry.index] ?? action ?? null
                    const settlementNpc = entry.targetNpc
                        ?? (settlementAction ? npcs.find(item => item.id === settlementAction.targetNpcId) : undefined)
                        ?? null
                    const settlementRelatedNpc = settlementAction?.relatedNpcId
                        ? npcs.find(item => item.id === settlementAction.relatedNpcId) ?? null
                        : null
                    const settlementExplanation = lastSettlement?.schemeOutcomeExplanations?.[entry.index] ?? null
                    const settlementBorrowedBladeReports = lastSettlement?.borrowedBladeReports?.filter(report => (
                        report.actorNpcId === settlementAction?.targetNpcId ||
                        report.actorNpcId === settlementNpc?.id
                    )) ?? []
                    const settlementNpcActionDisplay = result
                        ? getSchemeNpcActionDisplay({
                            npcName: settlementNpc?.name,
                            npcAction: result.npcAction,
                            delayFallback: shouldDelaySchemeNpcActionFallback({
                                settlement: lastSettlement,
                                resultIndex: entry.index,
                                revealedActionIds: revealedNpcActionFallbackIds,
                            }),
                        })
                        : null
                    const settlementEffectTags = result
                        ? buildSchemeResultEffectTags({
                            result,
                            action: settlementAction,
                            targetNpc: settlementNpc,
                            relatedNpc: settlementRelatedNpc,
                            factions,
                        })
                        : []
                    const settlementPostResolutionEvent = result?.causalEvent?.postResolutionEvent ?? null
                    const settlementFollowUpImpact = getSchemeFollowUpImpactPresentation(settlementAction?.followUp)
                    const settlementOmenEcho = fb?.schemeType === 'omen' ? fb.omenEcho : undefined
                    const settlementPostEventTags = compactUniqueTexts([
                        ...(settlementPostResolutionEvent?.actionMechanism ?? []),
                        ...(settlementPostResolutionEvent?.damageMechanism ?? []),
                    ])

                    if (!isActive) {
                        return (
                            <div key={entry.id} className="feedback-character-slot is-switch animate-fade-in">
                                <button
                                    type="button"
                                    className={`feedback-character-switch ${isViewed ? 'is-viewed' : 'is-unread'}`}
                                    onClick={() => setActiveFeedbackId(entry.id)}
                                    aria-label={`查看${entry.npcName}${settlementRevealed ? '筹算结果' : '回报'}`}
                                >
                                    <span className="feedback-switch-avatar">
                                        <SchemeFeedbackAvatar name={entry.npcName} />
                                    </span>
                                    <span className="feedback-switch-name">{entry.npcName}</span>
                                    <span className="feedback-switch-read-state">{isViewed ? '已阅' : '未阅'}</span>
                                </button>
                            </div>
                        )
                    }

                    if (settlementRevealed) {
                        return (
                            <div key={entry.id} className="feedback-character-slot is-active">
                                <article className={`feedback-character-detail feedback-result-detail animate-fade-in ${result ? 'is-ready' : 'is-loading'}`}>
                                    <div className="feedback-character-backdrop" />
                                    <div className="feedback-letter-panel feedback-result-panel">
                                        <div className="feedback-letter-header feedback-result-titlebar">
                                            <span className="feedback-order">第{getFeedbackOrdinal(entry.index)}份筹算</span>
                                            <div className="feedback-letter-title">
                                                <span className="feedback-npc-name">{entry.npcName}</span>
                                                {entry.targetNpc?.title && (
                                                    <span className="feedback-npc-title">{entry.targetNpc.title}</span>
                                                )}
                                            </div>
                                            {result && (
                                                <span className={`feedback-result-seal ${result.success ? 'success' : 'failure'}`}>
                                                    {result.success ? '奏效' : '未成'}
                                                </span>
                                            )}
                                        </div>

                                        <div className="feedback-letter-scroll feedback-result-scroll">
                                            <section className="feedback-result-brief">
                                                <span className="feedback-letter-section-label">计谋</span>
                                                <p className="feedback-result-scheme-line">
                                                    <strong>{SCHEME_NAMES[settlementAction?.schemeType ?? ''] ?? entry.schemeName}</strong>
                                                    {settlementRelatedNpc && (
                                                        <span>牵动 {settlementRelatedNpc.name}</span>
                                                    )}
                                                </p>
                                            </section>

                                            {!result ? (
                                                <section className="feedback-result-section animate-fade-in">
                                                    <span className="feedback-letter-section-label">筹算判词</span>
                                                    <p className="feedback-result-copy">本次筹算未形成可展示结果。</p>
                                                </section>
                                            ) : (
                                                <>
                                                    {settlementNpcActionDisplay && (
                                                        <section className="feedback-result-section animate-fade-in">
                                                            <span className="feedback-letter-section-label">{settlementNpcActionDisplay.label}</span>
                                                            <p className="feedback-result-copy">{settlementNpcActionDisplay.text}</p>
                                                        </section>
                                                    )}

                                                    {settlementExplanation?.segments && settlementExplanation.segments.length > 0 && (
                                                        <section className="feedback-result-section feedback-result-verdict animate-fade-in">
                                                            <span className="feedback-letter-section-label">筹算判词</span>
                                                            <div className="feedback-result-verdict-list">
                                                                {settlementExplanation.segments.map(segment => (
                                                                    <p key={segment.label} className="feedback-result-verdict-line">
                                                                        <strong>{segment.label}</strong>
                                                                        <span>{segment.text}</span>
                                                                    </p>
                                                                ))}
                                                            </div>
                                                        </section>
                                                    )}

                                                    {settlementEffectTags.length > 0 && (
                                                        <section className="feedback-result-section animate-fade-in">
                                                            <span className="feedback-letter-section-label">账面变动</span>
                                                            <div className="scheme-feedback-result-effects">
                                                                {settlementEffectTags.map(tag => (
                                                                    <span key={tag.label} className={`effect-tag ${tag.tone}`}>
                                                                        {tag.label}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </section>
                                                    )}

                                                    {settlementBorrowedBladeReports.length > 0 && (
                                                        <section className="feedback-result-section feedback-result-net animate-fade-in">
                                                            <span className="feedback-letter-section-label">朝堂收网</span>
                                                            <div className="feedback-result-net-list">
                                                                {settlementBorrowedBladeReports.map(report => (
                                                                    <div
                                                                        key={`${report.actorNpcId}-${report.targetNpcId}-${report.outcome}`}
                                                                        className={`feedback-result-net-item ${getBorrowedBladeOutcomeTone(report.outcome)}`}
                                                                    >
                                                                        <span className="feedback-result-net-target">{report.targetNpcName}</span>
                                                                        <strong>{getBorrowedBladeOutcomeLabel(report.outcome)}</strong>
                                                                        {settlementPostEventTags.length > 0 && (
                                                                            <div className="feedback-result-net-tags">
                                                                                {settlementPostEventTags.map(tag => (
                                                                                    <span key={tag}>{tag}</span>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </section>
                                                    )}

                                                    {settlementPostResolutionEvent && settlementPostResolutionEvent.kind !== 'borrowed_blade' && (
                                                        <section className="feedback-result-section feedback-result-post-event animate-fade-in">
                                                            <span className="feedback-letter-section-label">后置事件</span>
                                                            <p className="feedback-result-copy">{settlementPostResolutionEvent.outcome}</p>
                                                            {settlementPostEventTags.length > 0 && (
                                                                <div className="feedback-result-note-list">
                                                                    {settlementPostEventTags.map(tag => (
                                                                        <span key={tag}>{tag}</span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </section>
                                                    )}

                                                    {settlementOmenEcho && (
                                                        <section className="feedback-result-section feedback-omen-echo animate-fade-in">
                                                            <div className="feedback-omen-echo-label">谶纬回响</div>
                                                            <div className="feedback-omen-echo-speaker">
                                                                {settlementOmenEcho.speakerNpcName} · {settlementOmenEcho.speakerTitle}
                                                            </div>
                                                            <div className="feedback-omen-echo-text">
                                                                {sanitizeNpcReplyText(settlementOmenEcho.text)}
                                                            </div>
                                                        </section>
                                                    )}

                                                    {settlementFollowUpImpact && (
                                                        <section className={`feedback-result-section feedback-follow-up-impact feedback-follow-up-impact--${settlementFollowUpImpact.tone} animate-fade-in`}>
                                                            <span className="feedback-follow-up-impact-label">追问影响</span>
                                                            <span>{settlementFollowUpImpact.text}</span>
                                                        </section>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            </div>
                        )
                    }

                    return (
                        <div key={entry.id} className="feedback-character-slot is-active">
                            <article
                                className={`feedback-character-detail animate-fade-in ${isLoading ? 'is-loading' : 'is-ready'}`}
                            >
                                <div className="feedback-character-backdrop" />
                                <div className="feedback-letter-panel">
                                    <div className="feedback-letter-header">
                                        <span className="feedback-order">第{getFeedbackOrdinal(entry.index)}封回报</span>
                                        <div className="feedback-letter-title">
                                            <span className="feedback-npc-name">{entry.npcName}</span>
                                            {entry.targetNpc?.title && (
                                                <span className="feedback-npc-title">{entry.targetNpc.title}</span>
                                            )}
                                        </div>
                                        <span className={`feedback-status ${isLoading ? 'loading' : 'done'}`}>
                                            {isLoading ? '未揭晓' : '已揭晓'}
                                        </span>
                                    </div>

                                    <div className="feedback-letter-scroll">
                                        {entry.playerSpeech && (
                                            <p className="feedback-speech">你曾言：“{entry.playerSpeech}”</p>
                                        )}

                                        {isLoading ? (
                                            <div className="loading-state feedback-letter-loading">
                                                <div className="ai-ripple" />
                                                <p className="loading-hint">{entry.npcName}正在思量你的这一步棋……</p>
                                            </div>
                                        ) : (
                                            <section className="feedback-letter-section animate-fade-in">
                                                <span className="feedback-letter-section-label">回信</span>
                                                <p className="feedback-text">{sanitizeNpcReplyText(fb?.feedback ?? '')}</p>
                                            </section>
                                        )}

                                        {showOmenEcho && omenEcho && (
                                            <section className="feedback-omen-echo animate-fade-in">
                                                <div className="feedback-omen-echo-label">谶纬余音</div>
                                                <div className="feedback-omen-echo-speaker">
                                                    {omenEcho.speakerNpcName} · {omenEcho.speakerTitle}
                                                </div>
                                                <div className="feedback-omen-echo-text">
                                                    {sanitizeNpcReplyText(omenEcho.text)}
                                                </div>
                                            </section>
                                        )}

                                        {followUp?.status === 'available' && actionId === visibleAvailableFollowUpId && (
                                            <section className="feedback-follow-up">
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
                                                        className="feedback-art-button feedback-art-button--primary feedback-follow-up-submit"
                                                        onClick={() => handleSubmitFollowUp(actionId)}
                                                        disabled={isSubmitting || draftValue.trim().length === 0}
                                                    >
                                                        {isSubmitting ? '正在回应' : '回应追问'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="feedback-art-button feedback-art-button--muted feedback-follow-up-skip"
                                                        onClick={() => handleSkipFollowUp(actionId)}
                                                        disabled={isSubmitting}
                                                    >
                                                        跳过追问
                                                    </button>
                                                </div>
                                            </section>
                                        )}

                                        {followUp?.status === 'answered' && (
                                            <section className="feedback-follow-up feedback-follow-up--final">
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
                                            </section>
                                        )}

                                        {followUp?.status === 'skipped' && (
                                            <section className="feedback-follow-up feedback-follow-up--skipped">
                                                已跳过追问，结算将按原始说辞继续推进。
                                            </section>
                                        )}
                                    </div>
                                </div>
                            </article>
                        </div>
                    )
                })}
            </section>

            </main>

            <div
                className="action-footer animate-slide-up animate-delay-4"
                data-tooltip={proceedDisabledHint || undefined}
            >
                <button
                    className="btn-primary btn-proceed"
                    onClick={handleProceedClick}
                    disabled={!canClickProceed}
                    title={proceedDisabledHint || undefined}
                >
                    {proceedLabel}
                </button>
            </div>
            </div>
        </GameViewport>
    )
}

function getFeedbackOrdinal(index: number): string {
    return FEEDBACK_ORDINALS[index] ?? String(index + 1)
}

function getFeedbackPortraitVariant(npc?: NPC) {
    return npc?.powerBase === 'external' ? 'externalFullbody' : 'courtFullbody'
}

function SchemeFeedbackAvatar({ name }: { name: string }) {
    const [failed, setFailed] = useState(false)
    const avatarSrc = getNpcDetailAvatarPath(name)

    if (!avatarSrc || failed) {
        return <span className="feedback-switch-avatar-fallback">{name.charAt(0)}</span>
    }

    return (
        <img
            className="feedback-switch-avatar-image"
            src={avatarSrc}
            alt=""
            draggable={false}
            onError={() => setFailed(true)}
        />
    )
}






