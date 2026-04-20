import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { FIRST_FOLLOW_UP_TEACHING_CONTENT, FIRST_ROUND_GUIDE_CONTENT } from '../../data/prologueContent'
import { fallbackNorthParseFromSpeech, parseNorthSchemeInput, parseSchemeFollowUpInput } from '../../game/aiNativeEngine'
import { buildNpcPromptDynamicContext } from '../../game/npcPromptContext'
import { getRoundCampaignEventContext } from '../../game/campaignDisplayEngine'
import { buildNpcFollowUpFinalPrompt, buildNpcPrompt, buildOmenEchoPrompt, sanitizeNpcReplyText } from '../../ai/prompts'
import { chatCompletion, getAiMode, getAiModeLabel } from '../../ai/aiService'
import { buildOmenEchoFallbackText, buildOmenEchoFeedbackPayload, selectOmenEchoSpeaker } from '../../game/omenEcho'
import { previewSchemeSuccess } from '../../game/schemeEngine'
import { isSchemeReplyPrefetchInFlight } from '../../game/schemeReplyPrefetch'
import {
    extractTerminalQuestion,
    forceQuestionCandidateReplyText,
    forceStatementReplyText,
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
    probe: '璇曟帰',
    advise: '鐚瓥',
    slander: '璋楄█',
    alienate: '绂婚棿',
    frame: '璁惧眬瀚佺ジ',
    proxy: '鍊熷垁',
    appeal: '姹傛彺',
    omen: '璋剁含',
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

    let text = ''
    let source: OmenEchoFeedback['source'] = 'fallback'

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
        if (cleanedAiReply && getAiModeImpl() !== 'fallback') {
            text = cleanedAiReply
            source = 'ai'
        }
    } catch {
        // Fall through to the local omen-echo builder.
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

            const finalReplyRaw = await chatCompletion(
                buildNpcFollowUpFinalPrompt({
                    npc: targetNpc,
                    schemeType: action.schemeType,
                    originalSpeech: action.playerSpeech,
                    npcQuestion: followUp.questionText,
                    playerReply,
                    parseEvidence: followUpParse.evidence,
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
                <h2 className="page-title">璁¤皨鍥炴姤</h2>
            </div>

            <div className="feedback-list">
                {npcFeedbacks.length === 0 && (
                    <div className="feedback-item glass-panel decree-panel done">
                        <div className="feedback-body">
                            <div className="feedback-text-area">
                                <p className="feedback-text">No feedback has arrived this round yet. If it appears again, note the round and target and I will keep tracing it.</p>
                            </div>
                        </div>
                    </div>
                )}

                {npcFeedbacks.map((fb, index) => {
                    const action = actionById.get(fb.id)
                    const followUp = action?.followUp
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
                                alt={`${fb.npcName}铏氬奖`}
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
                                    <div className="feedback-follow-up-label">杩介棶</div>
                                    <div className="feedback-follow-up-question">{followUp.questionText}</div>
                                    <label className="feedback-follow-up-input-label" htmlFor={`follow-up-${actionId}`}>
                                        浣犵殑鍥炲簲
                                    </label>
                                    <textarea
                                        id={`follow-up-${actionId}`}
                                        className="feedback-follow-up-input"
                                        value={draftValue}
                                        onChange={event => handleFollowUpDraftChange(actionId, event.target.value)}
                                        placeholder="鍐欎笅浣犵殑琛ュ厖璇存槑"
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
                                            璺宠繃杩介棶
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
                                    <div className="feedback-follow-up-label">杩介棶鍥炴壒</div>
                                    <div className="feedback-follow-up-final">
                                        {sanitizeFollowUpReplyText(followUp.finalNpcReply ?? '')}
                                    </div>
                                </div>
                            )}

                            {followUp?.status === 'skipped' && (
                                <div className="feedback-follow-up feedback-follow-up--skipped">
                                    宸茶烦杩囪拷闂紝缁撶畻灏嗘寜鍘熷璇磋緸缁х画鎺ㄨ繘銆?
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            <div className="action-footer animate-slide-up animate-delay-4">
                <button
                    className="btn-primary btn-proceed"
                    onClick={nextPhase}
                    disabled={!canProceed}
                >
                    {allDone ? (allParsed ? '鏌ョ湅缁撶畻' : '绛夊緟瑙ｆ瀽瀹屾垚') : '绛夊緟璁¤皨鍥炴姤'}
                </button>
            </div>
        </div>
    )
}






