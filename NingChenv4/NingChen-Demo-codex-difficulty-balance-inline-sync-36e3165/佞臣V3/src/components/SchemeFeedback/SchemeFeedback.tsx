import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { FIRST_FOLLOW_UP_TEACHING_CONTENT, FIRST_ROUND_GUIDE_CONTENT } from '../../data/prologueContent'
import { fallbackNorthParseFromSpeech, parseNorthSchemeInput, parseSchemeFollowUpInput } from '../../game/aiNativeEngine'
import { buildNpcPromptDynamicContext } from '../../game/npcPromptContext'
import { getRoundCampaignEventContext } from '../../game/campaignDisplayEngine'
import { buildNpcFollowUpFinalPrompt, buildNpcPrompt, buildOmenEchoPrompt, sanitizeNpcReplyText } from '../../ai/prompts'
import { chatCompletion, getAiMode, getAiModeLabel } from '../../ai/aiService'
import { recordAiGameMasterDebug } from '../../game/aiGameMasterDebug'
import { buildOmenEchoFallbackText, buildOmenEchoFeedbackPayload, selectOmenEchoSpeaker } from '../../game/omenEcho'
import { previewSchemeSuccess } from '../../game/schemeEngine'
import { isSchemeReplyPrefetchInFlight } from '../../game/schemeReplyPrefetch'
import {
    extractTerminalQuestion,
    forceQuestionCandidateReplyText,
    forceStatementReplyText,
    getSchemeFollowUpImpactPresentation,
    getVisibleAvailableSchemeFollowUpId,
    selectRequiredSchemeFollowUpCandidateId,
    shouldBlockSettlementForFollowUp,
} from '../../game/schemeFollowUp'
import type { NPC, NorthSchemeParseResult, OmenEchoFeedback, RelationshipEdge, SchemeAction, SchemeFollowUp, SchemeFollowUpParseResult, SchemeType } from '../../game/types'
import { FirstRoundGuideModal } from '../FirstRoundGuide/FirstRoundGuideModal'
import { NpcPortrait } from '../NpcPortrait/NpcPortrait'
import { PageUtilityActions } from '../PageUtilityActions/PageUtilityActions'
import { SchemeOnboardingModal } from '../SchemePanel/SchemeOnboardingModal'
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

const SCHEME_OUTCOME_LABEL_ORDER = ['国力影响', '朝堂政局'] as const
const NORTH_DIMENSION_LABELS: Record<string, string> = {
    finance: '财政',
    grain: '粮赋',
    military: '军事',
    socialOrder: '社会秩序',
    governance: '治理穿透力',
}

const LOCAL_REPLY_FALLBACK = '似有回应，却一时听不分明。'
const FOLLOW_UP_REPLY_FALLBACK = '他收起锋芒，只留一句平静的回应。'
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
    const cleaned = sanitizeNpcReplyText(reply)
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/[\r\n]+/g, ' ')
        .replace(/\bJSON\b/gi, '')
        .replace(/\bsystem\b/gi, '')
        .trim()

    if (!cleaned) return ''
    if (/[{}\[\]`]/.test(cleaned)) return ''
    if (/[?？]/.test(cleaned)) return ''

    return cleaned
}

function buildFollowUpReplyFallback(targetNpcName: string): string {
    return `${targetNpcName}${FOLLOW_UP_REPLY_FALLBACK}`
}

function buildFallbackFollowUpQuestion(schemeType: SchemeType): string {
    switch (schemeType) {
        case 'probe':
            return '你这番试探，究竟想听我吐哪一句真话？'
        case 'advise':
            return '你这番献策，究竟是替我谋利，还是想借我去动旁人的局？'
        case 'slander':
            return '你今日把这话递到我耳边，究竟想让我先疑谁？'
        case 'alienate':
            return '你把话锋引到这里，究竟想叫我与谁先起嫌隙？'
        case 'frame':
            return '你把局铺成这样，究竟想让谁先背上这层嫌疑？'
        case 'proxy':
            return '你劝我借势出手，究竟想让我替你压谁？'
        case 'appeal':
            return '你来求援，到底想让我替你担哪一道险？'
        case 'omen':
            return '你借这一句谶言敲我，究竟想叫我提防谁？'
        case 'secession':
            return '你把话说到这一步，究竟是想叫我先观望，还是先自保？'
        case 'rebellion':
            return '你把路逼到这一步，究竟是真想起事，还是想借我试朝廷深浅？'
        default:
            return '你这番话，究竟真正想让我做什么？'
    }
}

function buildOmenEchoParseSummary(parsed: Pick<NorthSchemeParseResult, 'omenPolarity' | 'omenAnchorStrength' | 'legitimacyCrack' | 'suspicionDirection' | 'evidence'>): string {
    const evidenceLine = parsed.evidence.slice(0, 2).join('；') || '暂无'
    return `omenPolarity=${parsed.omenPolarity}; omenAnchorStrength=${parsed.omenAnchorStrength}; legitimacyCrack=${parsed.legitimacyCrack}; suspicionDirection=${parsed.suspicionDirection}; evidence=${evidenceLine}`
}

function formatDelta(value: unknown): string | null {
    if (typeof value !== 'number' || !Number.isFinite(value) || value === 0) return null
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}`
}

function sanitizeDeltaRecord(record: Record<string, unknown> | null | undefined): Record<string, number> {
    if (!record) return {}

    return Object.fromEntries(
        Object.entries(record).map(([key, value]) => [key, typeof value === 'number' && Number.isFinite(value) ? value : 0]),
    )
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
        pendingStructuredSchemeIds,
        lastSettlement,
        addNpcFeedback,
        updateNpcFeedback,
        updateNpcFeedbackOmenEcho,
        updateSchemeParse,
        markSchemeParsePending,
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
    const [, setFeedbackBatchSettledKey] = useState<string | null>(null)
    const [orchestratingFeedbacks, setOrchestratingFeedbacks] = useState(false)
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
    const settlementRevealed = Boolean(lastSettlement)
    const canClickProceed = settlementRevealed || canProceed
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
        setFeedbackBatchSettledKey(null)
        setOrchestratingFeedbacks(false)
    }, [currentRound, schemeBatchKey])

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
                const fallbackQuestion = buildFallbackFollowUpQuestion(item.action.schemeType)
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
            const followUpParse = await parseSchemeFollowUpInput({
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
            const knownSecretThreads = targetNpc.secretThreads.slice(0, intelProgress[targetNpc.id] ?? 0)
            const dynamicContext = buildNpcPromptDynamicContext({
                npc: targetNpc,
                factions,
                roundHistory,
                recentBacklash,
                npcMemoryLedger,
                relationMemoryLedger,
                relatedNpcId: relatedNpc?.id,
                currentRound,
                schemeType: action.schemeType,
            })

            const finalReplyRaw = await chatCompletion(
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
                    relatedNpc,
                    northParse: action.northParse,
                }),
                {
                    temperature: 0.7,
                    maxTokens: 220,
                    tag: `scheme_follow_up_${action.schemeType}`,
                },
            )

            const cleanedFinalReply = sanitizeFollowUpReplyText(finalReplyRaw.trim())
            answerSchemeFollowUp(
                actionId,
                playerReply,
                followUpParse,
                cleanedFinalReply || buildFollowUpReplyFallback(targetNpc.name),
            )
            setFollowUpDrafts(current => {
                const next = { ...current }
                delete next[actionId]
                return next
            })
        } catch {
            answerSchemeFollowUp(
                actionId,
                playerReply,
                ZERO_DELTA_FOLLOW_UP_PARSE,
                buildFollowUpReplyFallback(targetNpc.name),
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

            {lastSettlement && (
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
                            const explanation = lastSettlement.schemeOutcomeExplanations?.[index]
                            const orderedExplanationSegments = SCHEME_OUTCOME_LABEL_ORDER
                                .map(label => explanation?.segments.find(segment => segment.label === label))
                                .filter((segment): segment is NonNullable<typeof explanation>['segments'][number] => Boolean(segment))

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

                                    <p className="scheme-feedback-result-text">{result.feedbackText}</p>

                                    {orderedExplanationSegments.length > 0 && (
                                        <div className="scheme-feedback-explanation-stack">
                                            {orderedExplanationSegments.map(segment => (
                                                <p key={`${index}-${segment.label}`} className="scheme-feedback-result-text">
                                                    <strong>{segment.label}</strong>
                                                    ：{segment.text}
                                                </p>
                                            ))}
                                        </div>
                                    )}

                                    <div className="scheme-feedback-result-effects">
                                        {result.trustChange !== 0 && (
                                            <span className={`effect-tag ${result.trustChange > 0 ? 'positive' : 'negative'}`}>
                                                {npc?.name} 信任 {result.trustChange > 0 ? '+' : ''}{result.trustChange}
                                            </span>
                                        )}
                                        {Object.entries(sanitizeDeltaRecord(result.northDimensionChanges)).map(([dimension, value]) => {
                                            const formattedDelta = formatDelta(value)
                                            if (!formattedDelta) return null
                                            return (
                                                <span key={dimension} className={`effect-tag ${value > 0 ? 'positive' : 'negative'}`}>
                                                    北周{NORTH_DIMENSION_LABELS[dimension] ?? dimension} {formattedDelta}
                                                </span>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {lastSettlement?.borrowedBladeReports && lastSettlement.borrowedBladeReports.length > 0 && (
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
                    onClick={nextPhase}
                    disabled={!canClickProceed}
                >
                    {proceedLabel}
                </button>
            </div>
        </div>
    )
}






