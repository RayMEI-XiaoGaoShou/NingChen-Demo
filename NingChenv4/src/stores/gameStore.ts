// ========================================
// Core game state store
// Async flow: schemes -> empress letter -> NPC feedback -> settlement
// ========================================

import { create } from 'zustand'
import type { BattleReport, CampaignState, DelayedBacklash, EmpressReplyRecord, EndingReport, FengDaozhiDraftRequest, FengDaozhiDraftResult, FengDaozhiGuideSeenMap, FirstRoundGuideKey, FirstRoundGuideSeenMap, GameDifficulty, HelpOverlaySource, NationDimensions, NorthSchemeParseResult, NpcMemoryLedger, OmenEchoFeedback, OmenGuideSeenMap, PlayerDangerStage, PolicyAftereffect, PolicyReasonParseResult, PrologueStep, RelationMemoryLedger, RelationshipEdge, RoundHistoryEntry, RoundPhase, GameResult, SchemeAction, SchemeFollowUp, SchemeFollowUpAnswerMetadata, SchemeFollowUpParseResult, SchemeOnboardingGuideKey, SchemeOnboardingSeenMap, WorldMemoryLedger } from '../game/types'
import { calculateCompositePower } from '../game/types'
import { NORTH_INITIAL, SOUTH_INITIAL } from '../data/nationStats'
import { settleRound, type RoundSettlementResult, type PolicySettlementReport } from '../game/roundSettlement'
import { applyDimensionChanges } from '../game/nationEngine'
import { applyDelayedBacklashToState } from '../game/aiNativeBacklash'
import { INITIAL_NPCS } from '../data/npcs'
import { INITIAL_FACTIONS } from '../data/factions'
import { INITIAL_RELATIONSHIP_EDGES } from '../data/npcRelationships'
import { ROUND_EVENTS } from '../data/rounds'
import type { NPC, Faction } from '../game/types'
import { getAvailableSchemesForNpc, type SchemeNpcActionNarrative } from '../game/schemeEngine'
import { buildEndingReport } from '../game/endingEngine'
import { buildBattleReport, buildRoundHistoryEntry } from '../game/battleReportEngine'
import { deriveNpcMemoryEntriesForRound, mergeNpcMemoryEntries } from '../game/npcMemoryLedger'
import { deriveRelationMemoryEntriesForRound, mergeRelationMemoryEntries } from '../game/npcRelationshipMemory'
import {
    deriveWorldEventMemoriesForRound,
    mergeWorldEventMemories,
    patchWorldMemoryLedgerForSchemeNpcAction,
} from '../game/worldEventMemory'
import {
    buildPersistedSnapshot,
    buildRoundStartSnapshot,
    loadGameSnapshot,
    normalizePersistedRoundPhase,
    saveGameSnapshot,
    type PersistedGameSnapshot,
    type RoundStartSnapshot,
} from '../game/saveEngine'
import { normalizeCourtDispositionNpcs } from '../game/courtDisposition'
import { getDifficultyProfile } from '../game/difficulty'
import { chatCompletionJson } from '../ai/aiService'
import { generateDoubaoImage } from '../ai/doubaoImageGeneration'
import { buildFengDaozhiDraftPrompt } from '../ai/prompts'
import { generateDowagerReviewComment } from '../ai/dowagerOfferingOrchestrator'
import { buildFallbackFengDaozhiDraft, buildFengDaozhiDraftContext, normalizeFengDaozhiDraft } from '../game/fengDaozhiAdvisor'
import {
    DOWAGER_FAVOR_DECAY,
    DOWAGER_FINAL_TIER_LABELS,
    DOWAGER_IMAGE_GENERATION_SIZE,
    DOWAGER_MEDIUM_LABELS,
    DOWAGER_MUSIC_PROMPT_VERSION,
    DOWAGER_PAINTING_PROMPT_VERSION,
    DOUBAO_SEEDREAM_IMAGE_MODEL,
    INITIAL_DOWAGER_FAVOR,
    buildDowagerPaintingPrompt,
    buildDowagerMusicPrompt,
    clampDowagerFavor,
    getDowagerCreationForRound,
    getDowagerPoemContent,
    getDowagerReviewForRound,
    isDowagerDeathCheckEnabledForRound,
    isDowagerFavorDecayEnabledForRound,
    scoreDowagerOffering,
    splitDowagerFreeInputTags,
    MINIMAX_MUSIC_MODEL,
    type DowagerOfferingMedium,
    type DowagerOfferingRecord,
    type DowagerOfferingSelections,
    type PendingDowagerOffering,
} from '../game/dowagerOffering'
import {
    answerSchemeFollowUpOnActions,
    appendNpcFeedback,
    attachNorthSchemeParse,
    buildAddSchemePatch,
    markSchemeParsePendingIds,
    patchNpcMemoryLedgerForSchemeNpcAction,
    patchRelationMemoryLedgerForSchemeNpcAction,
    removePendingSchemeParseId,
    setSchemeFollowUpOnActions,
    skipSchemeFollowUpOnActions,
    updateNpcFeedbackOmenEcho,
    updateNpcFeedbackText,
    type NpcFeedbackRecord,
} from './gameStoreActionHelpers'

/** 单条NPC反馈记录 */
export interface NpcFeedback extends NpcFeedbackRecord {
    id: string
    npcId: string
    npcName: string
    schemeType: string
    schemeName: string
    playerSpeech: string
    feedback: string   // AI生成的NPC反馈文本
    omenEcho?: OmenEchoFeedback
    isLoading: boolean
    source: string
}

interface GameState {
    // ????
    currentRound: number
    currentPhase: RoundPhase
    difficulty: GameDifficulty
    schemeCount: number
    maxSchemes: number
    prologueStep: PrologueStep
    helpOverlayOpen: boolean
    helpOverlaySource: HelpOverlaySource | null
    firstRoundGuideSeen: FirstRoundGuideSeenMap
    schemeOnboardingSeen: SchemeOnboardingSeenMap
    omenGuideSeen: OmenGuideSeenMap
    fengDaozhiGuideSeen: FengDaozhiGuideSeenMap
    fengDaozhiAssistsRemaining: number
    playerDangerStage: PlayerDangerStage
    playerSuspicionHeat: number
    dowagerFavor: number
    lastDowagerFavorDecayRound: number | null
    pendingDowagerOffering: PendingDowagerOffering | null
    dowagerOfferingRecords: DowagerOfferingRecord[]
    invasionPressure: number

    // 游戏结果
    isGameOver: boolean
    gameResult: GameResult
    roundStartSnapshot: RoundStartSnapshot | null

    // 国力数据
    northStats: NationDimensions
    southStats: NationDimensions
    northPower: number
    southPower: number

    // NPC & 势力
    npcs: NPC[]
    factions: Faction[]
    relationships: RelationshipEdge[]
    intelProgress: Record<string, number>

    // ???????
    currentSchemes: SchemeAction[]
    selectedPolicyOption: number | null
    policyReason: string
    selectedPolicyParse: PolicyReasonParseResult | null

    // NPC ?????????
    npcFeedbacks: NpcFeedback[]
    pendingStructuredSchemeIds: string[]

    // ?????????? Settlement ?????
    lastSettlement: RoundSettlementResult | null
    lastPolicyReport: PolicySettlementReport | null
    lastPolicyAftereffect: PolicyAftereffect | null
    empressReplyRecord: EmpressReplyRecord | null
    pendingBacklash: DelayedBacklash[]
    recentBacklash: DelayedBacklash[]
    roundHistory: RoundHistoryEntry[]
    npcMemoryLedger: NpcMemoryLedger
    relationMemoryLedger: RelationMemoryLedger
    worldMemoryLedger: WorldMemoryLedger
    endingReport: EndingReport | null
    battleReport: BattleReport | null
    shuCampaign: CampaignState
    huainanCampaign: CampaignState
    shuMomentum: number
    huainanMomentum: number

    // 动作
    nextPhase: () => void
    prevPhase: () => void
    completeSchemingIfReady: () => void
    advancePrologue: () => void
    setDifficulty: (difficulty: GameDifficulty) => void
    startNewGame: (difficulty: GameDifficulty) => void
    saveToSlot: () => boolean
    loadLatestSave: () => boolean
    returnToCover: () => void
    openGameplayGuide: (source?: HelpOverlaySource) => void
    closeGameplayGuide: () => void
    markFirstRoundGuideSeen: (key: FirstRoundGuideKey) => void
    markSchemeOnboardingSeen: (key: SchemeOnboardingGuideKey) => void
    markOmenGuideSeen: () => void
    markFengDaozhiGuideSeen: (key: string) => void
    markFengDaozhiGuideSeenMany: (keys: string[]) => void
    consumeFengDaozhiAssist: () => void
    resetFengDaozhiAssistsForRound: () => void
    requestFengDaozhiDraft: (request: FengDaozhiDraftRequest) => Promise<FengDaozhiDraftResult | null>
    submitDowagerOffering: (submission: {
        medium: DowagerOfferingMedium
        selections: DowagerOfferingSelections
        styleReferenceId?: string | null
    }) => void
    resolveDowagerReview: () => void
    requestDowagerReviewComment: () => Promise<void>
    saveRoundStartSnapshot: () => void
    restoreRoundStartSnapshot: () => void
    prepareSchemeSettlementForFeedback: () => void
    resetGame: () => void
    addScheme: (scheme: SchemeAction) => void
    selectPolicy: (optionIndex: number, reason: string, policyParse?: PolicyReasonParseResult | null) => void
    addNpcFeedback: (feedback: NpcFeedback) => void
    updateNpcFeedback: (feedbackId: string, text: string, source?: string) => void
    updateNpcFeedbackOmenEcho: (feedbackId: string, omenEcho: OmenEchoFeedback) => void
    updateSchemeNpcAction: (actionId: string, npcAction: SchemeNpcActionNarrative) => void
    setEmpressReplyRecord: (record: EmpressReplyRecord | null) => void
    markSchemeParsePending: (actionId: string) => void
    updateSchemeParse: (actionId: string, northParse: NorthSchemeParseResult) => void
    setSchemeFollowUp: (actionId: string, followUp: SchemeFollowUp) => void
    answerSchemeFollowUp: (actionId: string, playerReply: string, parse: SchemeFollowUpParseResult, finalNpcReply: string, metadata?: SchemeFollowUpAnswerMetadata) => void
    skipSchemeFollowUp: (actionId: string) => void
    hydrateSnapshot: (snapshot: PersistedGameSnapshot) => void
}

const initialNorthPower = calculateCompositePower(NORTH_INITIAL)
const initialSouthPower = calculateCompositePower(SOUTH_INITIAL)
const initialDifficulty: GameDifficulty = 'normal'
const initialIntelProgress = Object.fromEntries(INITIAL_NPCS.map(npc => [npc.id, 0]))
const initialCampaignState: CampaignState = {
    state: 'idle',
    resolvedState: null,
    sourceRound: null,
    summary: '',
    ongoingNorthImpact: {},
    ongoingSouthImpact: {},
    remainingRounds: 0,
}
const initialFirstRoundGuideSeen: FirstRoundGuideSeenMap = {
    round_start: false,
    court_observe: false,
    court_faction: false,
    external_faction: false,
    npc_detail: false,
    scheme_phase: false,
    scheme_card_advise: false,
    scheme_card_slander: false,
    scheme_card_alienate: false,
    scheme_card_frame: false,
    scheme_card_proxy: false,
    scheme_card_secession: false,
    scheme_card_omen: false,
    empress_letter: false,
    scheme_feedback: false,
    empress_reply: false,
    settlement: false,
}
const initialOmenGuideSeen: OmenGuideSeenMap = {
    first_omen_modal: false,
}
const initialFengDaozhiGuideSeen: FengDaozhiGuideSeenMap = {}
const initialNpcMemoryLedger: NpcMemoryLedger = {}
const initialRelationMemoryLedger: RelationMemoryLedger = {}
const initialWorldMemoryLedger: WorldMemoryLedger = []
const initialSchemeOnboardingSeen: SchemeOnboardingSeenMap = {
    scheme_master_guide: false,
    first_omen_teaching: false,
    first_external_line_teaching: false,
    first_follow_up_teaching: false,
}
const getAssistQuotaForDifficulty = (difficulty: GameDifficulty) =>
    getDifficultyProfile(difficulty).onboarding.fengDaozhiAssistsPerRound
const runtimeEnv = ((globalThis as any).process?.env ?? {}) as Record<string, string | undefined>

function getDowagerRuntimeEnvValue(key: 'VITE_DOUBAO_API_KEY'): string | undefined {
    const viteEnv = typeof import.meta !== 'undefined' ? import.meta.env : undefined
    return viteEnv?.[key] ?? runtimeEnv[key]
}

function shouldRunDowagerDoubaoGeneration(): boolean {
    return getDowagerRuntimeEnvValue('VITE_DOUBAO_API_KEY') === 'local-dev-proxy'
}

function cloneRelationMemoryLedger(ledger: RelationMemoryLedger): RelationMemoryLedger {
    const cloned: RelationMemoryLedger = {}
    for (const [holderNpcId, entries] of Object.entries(ledger)) {
        cloned[holderNpcId] = entries.map(entry => ({ ...entry }))
    }
    return cloned
}

function buildDowagerMediaDisplayText(medium: DowagerOfferingMedium, completed = false): string {
    if (medium === 'painting') return completed ? '画稿已呈' : '画稿未及装裱'
    return completed ? '乐音已成' : '乐师仍在排练'
}

function createPendingDowagerOffering(params: {
    creationRound: number
    validationRound: number
    poemId: string
    rubricVersion: string
    medium: DowagerOfferingMedium
    selections: DowagerOfferingSelections
    styleReferenceId?: string | null
}): PendingDowagerOffering {
    const poem = getDowagerPoemContent(params.poemId)
    const id = `dowager-${params.creationRound}-${params.validationRound}-${params.medium}`
    const styleReference = params.medium === 'painting'
        ? poem.styleReferences.find(style => style.id === params.styleReferenceId) ?? poem.styleReferences[0] ?? null
        : null
    const styleReferenceId = styleReference?.id ?? null
    const prompt = params.medium === 'painting' && styleReferenceId
        ? buildDowagerPaintingPrompt({
            poemId: params.poemId,
            styleReferenceId,
            selections: params.selections,
        })
        : ''
    const musicPrompt = params.medium === 'music'
        ? buildDowagerMusicPrompt({
            poemId: params.poemId,
            selections: params.selections,
        })
        : ''
    const mediaTask = params.medium === 'painting'
        ? {
            taskId: `${id}-mock-media`,
            status: 'pending' as const,
            submittedAt: Date.now(),
            displayText: buildDowagerMediaDisplayText(params.medium, false),
            provider: 'doubao_seedream' as const,
            taskType: 'dowager_painting' as const,
            promptVersion: DOWAGER_PAINTING_PROMPT_VERSION,
            styleReferenceId,
            referenceImageSrc: styleReference?.imageSrc ?? null,
            prompt,
            request: {
                model: DOUBAO_SEEDREAM_IMAGE_MODEL,
                prompt,
                image: styleReference?.imageSrc ? [styleReference.imageSrc] : undefined,
                response_format: 'url' as const,
                size: DOWAGER_IMAGE_GENERATION_SIZE,
                watermark: false,
            },
        }
        : {
            taskId: `${id}-mock-media`,
            status: 'pending' as const,
            submittedAt: Date.now(),
            displayText: buildDowagerMediaDisplayText(params.medium, false),
            provider: 'minimax_music' as const,
            taskType: 'dowager_music' as const,
            promptVersion: DOWAGER_MUSIC_PROMPT_VERSION,
            prompt: musicPrompt,
            request: {
                model: MINIMAX_MUSIC_MODEL,
                prompt: musicPrompt,
                is_instrumental: true,
                lyrics_optimizer: false,
                output_format: 'url' as const,
                stream: false,
                audio_setting: {
                    sample_rate: 44100,
                    bitrate: 256000,
                    format: 'mp3' as const,
                },
            },
        }

    return {
        id,
        creationRound: params.creationRound,
        validationRound: params.validationRound,
        poemId: params.poemId,
        poemTitle: poem.title,
        rubricVersion: params.rubricVersion,
        medium: params.medium,
        selections: params.selections,
        styleReferenceId,
        mediaTask,
        scoreResult: null,
        favorApplied: false,
    }
}

function buildDowagerFallbackComment(params: {
    medium: DowagerOfferingMedium
    tierLabel: string
    evidence: string
    favorDelta: number
}): string {
    const attitude = params.favorDelta >= 20
        ? '尚能入哀心'
        : params.favorDelta > 0
            ? '仍欠几分深处'
            : params.favorDelta < 0
                ? '几乎把题意看反了'
                : '只得见其形，未见其骨'
    return `此番${DOWAGER_MEDIUM_LABELS[params.medium]}，判作「${params.tierLabel}」。${attitude}，${params.evidence.replace(/。$/u, '')}。`
}

function buildDowagerOfferingRecord(params: {
    pending: PendingDowagerOffering
    favorAfter: number
    dowagerComment: string
}): DowagerOfferingRecord {
    const scoreResult = params.pending.scoreResult
    if (!scoreResult) {
        throw new Error('Cannot record dowager offering before scoring.')
    }

    const selectedPresetOptionIds = Object.fromEntries(
        Object.entries(params.pending.selections).map(([categoryId, selection]) => [
            categoryId,
            selection.presetOptionIds,
        ]),
    )
    const freeInputTags = Object.fromEntries(
        Object.entries(params.pending.selections).map(([categoryId, selection]) => [
            categoryId,
            splitDowagerFreeInputTags(selection.freeText),
        ]),
    )

    return {
        id: params.pending.id,
        creationRound: params.pending.creationRound,
        validationRound: params.pending.validationRound,
        poemId: params.pending.poemId,
        poemTitle: params.pending.poemTitle,
        medium: params.pending.medium,
        styleReferenceId: params.pending.styleReferenceId,
        selectedPresetOptionIds,
        freeInputTags,
        mediaStatus: params.pending.mediaTask.status,
        mediaDisplayText: params.pending.mediaTask.displayText,
        mediaResultImageSrc: params.pending.mediaTask.resultImageSrc ?? null,
        finalScore: scoreResult.finalScore,
        finalTier: scoreResult.finalTier,
        favorDelta: scoreResult.favorDelta,
        favorAfter: params.favorAfter,
        dowagerComment: params.dowagerComment,
        evaluationSummaryForDowager: scoreResult.evaluationSummaryForDowager,
        fallbackUsed: scoreResult.fallbackUsed,
    }
}

function buildDowagerSelectedEvidence(record: DowagerOfferingRecord): string {
    const poem = getDowagerPoemContent(record.poemId)
    const categories = poem.mediums[record.medium].categories
    return categories.map(category => {
        const presetLabels = (record.selectedPresetOptionIds[category.id] ?? [])
            .map(optionId => category.options.find(option => option.id === optionId)?.label)
            .filter((label): label is string => Boolean(label))
        const freeTags = record.freeInputTags[category.id] ?? []
        const labels = [...presetLabels, ...freeTags]
        return `${category.label}：${labels.join('、') || '未取'}`
    }).join('；')
}

function shouldJumpDowagerPreviewToReview(): boolean {
    if (typeof window === 'undefined') return false
    return new URLSearchParams(window.location.search).get('dowagerPreview') === 'creation'
}

function applyDowagerFavorDecayForRound(state: GameState, round: number) {
    if (!isDowagerFavorDecayEnabledForRound(round) || state.lastDowagerFavorDecayRound === round) {
        return {
            dowagerFavor: state.dowagerFavor,
            lastDowagerFavorDecayRound: state.lastDowagerFavorDecayRound,
        }
    }

    return {
        dowagerFavor: clampDowagerFavor(state.dowagerFavor - DOWAGER_FAVOR_DECAY),
        lastDowagerFavorDecayRound: round,
    }
}

function buildDowagerDeathEndingReport(state: GameState): EndingReport {
    const lastOffering = state.dowagerOfferingRecords.at(-1)
    const tierLabel = lastOffering ? `「${DOWAGER_FINAL_TIER_LABELS[lastOffering.finalTier]}」` : '失仪'
    return {
        title: '帘前失宠',
        tier: '惨败',
        deathSource: 'dowager_favor',
        causeSummary: [
            `太后眷顾归零，萧宝颖失去最后的宫中庇护。`,
            lastOffering
                ? `最后一回献艺为${lastOffering.poemTitle}${tierLabel}，未能挽回帘后杀意。`
                : '帘前再无人替他遮掩，北周朝堂的猜忌遂成定局。',
        ],
        factionOutlook: ['后党收回庇护，朝中无人再敢为萧宝颖辩白。'],
        npcFates: [],
        statsSummary: [`太后好感度：${state.dowagerFavor}`],
        openingLines: ['建文年间，萧宝颖失宠于太后，夜中被召入内廷。'],
        epilogueLines: ['南陈女帝闻讯，久久未拆下一封北来的旧信。'],
        sceneLabel: '太后 · 帘前失宠',
        invasionDriver: null,
        triggerRound: state.currentRound,
        standoutNpc: '贺拔琪',
        northFailureSummary: null,
    }
}

function normalizeFirstRoundGuideSeen(
    value?: FirstRoundGuideSeenMap | boolean,
): FirstRoundGuideSeenMap {
    if (typeof value === 'boolean') {
        return {
            round_start: value,
            court_observe: value,
            court_faction: value,
            external_faction: value,
            npc_detail: value,
            scheme_phase: value,
            scheme_card_advise: value,
            scheme_card_slander: value,
            scheme_card_alienate: value,
            scheme_card_frame: value,
            scheme_card_proxy: value,
            scheme_card_secession: value,
            scheme_card_omen: value,
            empress_letter: value,
            scheme_feedback: value,
            empress_reply: value,
            settlement: value,
        }
    }

    return {
        round_start: value?.round_start ?? false,
        court_observe: value?.court_observe ?? false,
        court_faction: value?.court_faction ?? false,
        external_faction: value?.external_faction ?? false,
        npc_detail: value?.npc_detail ?? false,
        scheme_phase: value?.scheme_phase ?? false,
        scheme_card_advise: value?.scheme_card_advise ?? false,
        scheme_card_slander: value?.scheme_card_slander ?? false,
        scheme_card_alienate: value?.scheme_card_alienate ?? false,
        scheme_card_frame: value?.scheme_card_frame ?? false,
        scheme_card_proxy: value?.scheme_card_proxy ?? false,
        scheme_card_secession: value?.scheme_card_secession ?? false,
        scheme_card_omen: value?.scheme_card_omen ?? false,
        empress_letter: value?.empress_letter ?? false,
        scheme_feedback: value?.scheme_feedback ?? false,
        empress_reply: value?.empress_reply ?? false,
        settlement: value?.settlement ?? false,
    }
}

function attachAvailableSchemes(
    npcs: NPC[],
    round: number,
    intelProgress: Record<string, number>,
): NPC[] {
    return normalizeCourtDispositionNpcs(npcs).map(npc => ({
        ...npc,
        availableSchemes: getAvailableSchemesForNpc(npc, {
            round,
            unlockedSecrets: intelProgress[npc.id] ?? 0,
        }),
    }))
}

export const useGameStore = create<GameState>((set, get) => ({
    currentRound: 1,
    currentPhase: 'PROLOGUE',
    difficulty: initialDifficulty,
    schemeCount: 0,
    maxSchemes: 3,
    prologueStep: 'COVER',
    helpOverlayOpen: false,
    helpOverlaySource: null,
    firstRoundGuideSeen: initialFirstRoundGuideSeen,
    schemeOnboardingSeen: initialSchemeOnboardingSeen,
    omenGuideSeen: initialOmenGuideSeen,
    fengDaozhiGuideSeen: initialFengDaozhiGuideSeen,
    fengDaozhiAssistsRemaining: getAssistQuotaForDifficulty(initialDifficulty),
    playerDangerStage: 'safe',
    playerSuspicionHeat: 0,
    dowagerFavor: INITIAL_DOWAGER_FAVOR,
    lastDowagerFavorDecayRound: null,
    pendingDowagerOffering: null,
    dowagerOfferingRecords: [],
    invasionPressure: 0,
    isGameOver: false,
    gameResult: 'NONE',
    roundStartSnapshot: null,
    northStats: { ...NORTH_INITIAL },
    southStats: { ...SOUTH_INITIAL },
    northPower: initialNorthPower,
    southPower: initialSouthPower,
    npcs: attachAvailableSchemes(INITIAL_NPCS.map(n => ({ ...n })), 1, initialIntelProgress),
    factions: INITIAL_FACTIONS.map(f => ({ ...f })),
    relationships: INITIAL_RELATIONSHIP_EDGES.map(edge => ({ ...edge })),
    intelProgress: initialIntelProgress,
    currentSchemes: [],
    selectedPolicyOption: null,
    policyReason: '',
    selectedPolicyParse: null,
    npcFeedbacks: [],
    pendingStructuredSchemeIds: [],
    lastSettlement: null,
    lastPolicyReport: null,
    lastPolicyAftereffect: null,
    empressReplyRecord: null,
    pendingBacklash: [],
    recentBacklash: [],
    roundHistory: [],
    npcMemoryLedger: initialNpcMemoryLedger,
    relationMemoryLedger: initialRelationMemoryLedger,
    worldMemoryLedger: initialWorldMemoryLedger,
    endingReport: null,
    battleReport: null,
    shuCampaign: { ...initialCampaignState },
    huainanCampaign: { ...initialCampaignState },
    shuMomentum: 0,
    huainanMomentum: 0,

    prepareSchemeSettlementForFeedback: () => {
        const state = get()
        if (state.currentPhase !== 'SCHEME_FEEDBACK' || state.lastSettlement) return
        get().nextPhase()
    },

    completeSchemingIfReady: () => {
        const state = get()
        if (state.schemeCount >= state.maxSchemes) {
            set({ currentPhase: getDowagerCreationForRound(state.currentRound) ? 'DOWAGER_CREATION' : 'EMPRESS_LETTER' })
        }
    },

    nextPhase: () => {
        const state = get()
        const { currentPhase, currentRound, schemeCount, maxSchemes } = state

        switch (currentPhase) {
            case 'PROLOGUE':
                set({ currentPhase: 'ROUND_START' })
                get().saveRoundStartSnapshot()
                set({ currentPhase: 'COURT_OBSERVE' })
                break

            case 'ROUND_START':
                set({ currentPhase: 'COURT_OBSERVE' })
                break

            case 'COURT_OBSERVE':
                // 三次计谋用完后进入女帝来信（AI在后台继续处理）
                if (schemeCount >= maxSchemes) {
                    set({ currentPhase: getDowagerCreationForRound(currentRound) ? 'DOWAGER_CREATION' : 'EMPRESS_LETTER' })
                }
                break

            case 'DOWAGER_CREATION':
                set({ currentPhase: 'EMPRESS_LETTER' })
                break

            case 'EMPRESS_LETTER':
                // ????????? NPC ???????
                set({ currentPhase: 'SCHEME_FEEDBACK' })
                break

            case 'SCHEME_FEEDBACK':
                // NPC ???????????
                {
                    const s = get()
                    if (s.lastSettlement) {
                        set({
                            currentPhase: s.lastSettlement.gameResult !== 'NONE' ? 'ENDING' : 'EMPRESS_REPLY',
                            isGameOver: s.lastSettlement.gameResult !== 'NONE',
                            gameResult: s.lastSettlement.gameResult,
                        })
                        break
                    }

                    const result = settleRound({
                        round: s.currentRound,
                        difficulty: s.difficulty,
                        schemes: s.currentSchemes,
                        northStats: s.northStats,
                        southStats: s.southStats,
                        npcs: s.npcs,
                        factions: s.factions,
                        relationships: s.relationships,
                        intelProgress: s.intelProgress,
                        playerDangerStage: s.playerDangerStage,
                        playerSuspicionHeat: s.playerSuspicionHeat,
                        invasionPressure: s.invasionPressure,
                        policyOptionIndex: s.selectedPolicyOption,
                        policyReason: s.policyReason,
                        policyParse: s.selectedPolicyParse,
                        shuCampaign: s.shuCampaign,
                        huainanCampaign: s.huainanCampaign,
                        shuMomentum: s.shuMomentum,
                        huainanMomentum: s.huainanMomentum,
                    })

                    const updatedIntelProgress = { ...s.intelProgress }
                    for (const [npcId, count] of Object.entries(result.intelUnlocks)) {
                        updatedIntelProgress[npcId] = Math.min(
                            (updatedIntelProgress[npcId] ?? 0) + count,
                            result.updatedNpcs.find(npc => npc.id === npcId)?.secretThreads.length ?? count,
                        )
                    }
                    const updatedNpcs = result.updatedNpcs.map(npc => ({
                        ...npc,
                        availableSchemes: getAvailableSchemesForNpc(npc, {
                            round: s.currentRound + 1,
                            unlockedSecrets: updatedIntelProgress[npc.id] ?? 0,
                        }),
                    }))
                    const processedSchemes = result.processedSchemes
                    const historyEntry = buildRoundHistoryEntry({
                        round: s.currentRound,
                        eventName: ROUND_EVENTS[s.currentRound - 1]?.eventName ?? `? ${s.currentRound} ??`,
                        schemeCount: result.schemeResults.length,
                        schemeSuccessCount: result.schemeResults.filter(item => item.success).length,
                        keyTargets: result.schemeResults
                            .map((_, index) => s.npcs.find(npc => npc.id === processedSchemes[index]?.targetNpcId)?.name)
                            .filter((name): name is string => Boolean(name)),
                        schemeDetails: result.schemeResults.map((item, index) => {
                            const targetNpcId = processedSchemes[index]?.targetNpcId ?? ''
                            return {
                                targetNpcId,
                                targetNpcName: s.npcs.find(npc => npc.id === targetNpcId)?.name ?? '',
                                schemeType: processedSchemes[index]?.schemeType ?? 'probe',
                                success: item.success,
                            }
                        }).filter(item => item.targetNpcId && item.targetNpcName),
                        policyTopic: result.policyReport?.topic,
                        policyOption: result.policyReport?.optionContent,
                        externalActionCount: result.externalActionReports.length,
                        relationshipBreakCount: result.relationshipReports.length,
                        factionCollapseCount: result.factionCollapseReports.length,
                        invasionTriggered: result.invasionTriggered,
                        playerSuspicionHeat: result.playerSuspicionHeat,
                        invasionPressure: result.invasionPressure,
                        northPower: result.northPowerAfter,
                        southPower: result.southPowerAfter,
                        summary: result.summaryText,
                    })
                    const roundHistory = [...s.roundHistory, historyEntry]
                    const npcMemoryLedger = mergeNpcMemoryEntries(
                        s.npcMemoryLedger,
                        deriveNpcMemoryEntriesForRound({
                            round: s.currentRound,
                            schemes: processedSchemes,
                            schemeResults: result.schemeResults,
                            npcsBefore: s.npcs,
                            npcsAfter: updatedNpcs,
                            externalActionReports: result.externalActionReports,
                        }),
                    )
                    const relationMemoryLedger = mergeRelationMemoryEntries(
                        s.relationMemoryLedger,
                        deriveRelationMemoryEntriesForRound({
                            round: s.currentRound,
                            schemes: processedSchemes,
                            schemeResults: result.schemeResults,
                            npcsBefore: s.npcs,
                            npcsAfter: updatedNpcs,
                        }),
                    )
                    const worldMemoryLedger = mergeWorldEventMemories(
                        s.worldMemoryLedger,
                        deriveWorldEventMemoriesForRound({
                            round: s.currentRound,
                            actions: processedSchemes,
                            schemeResults: result.schemeResults,
                            npcs: updatedNpcs,
                        }),
                    )

                    // ????????
                    if (result.gameResult !== 'NONE') {
                        const endingReport = buildEndingReport({
                            gameResult: result.gameResult,
                            currentRound: s.currentRound,
                            northPower: result.northPowerAfter,
                            southPower: result.southPowerAfter,
                            npcs: updatedNpcs,
                            factions: result.factionsAfter,
                            intelProgress: updatedIntelProgress,
                            lastSettlement: result,
                        })
                        const battleReport = buildBattleReport(roundHistory)
                        set({
                            currentPhase: 'SCHEME_FEEDBACK',
                            isGameOver: true,
                            gameResult: result.gameResult,
                            playerDangerStage: result.playerDangerStage,
                            playerSuspicionHeat: result.playerSuspicionHeat,
                            invasionPressure: result.invasionPressure,
                            northStats: result.northStatsAfter,
                            southStats: result.southStatsAfter,
                            northPower: result.northPowerAfter,
                            southPower: result.southPowerAfter,
                            npcs: updatedNpcs,
                            factions: result.factionsAfter,
                            relationships: result.relationshipsAfter,
                            intelProgress: updatedIntelProgress,
                            lastSettlement: result,
                            lastPolicyReport: result.policyReport ?? s.lastPolicyReport,
                            lastPolicyAftereffect: result.policyAftereffect ?? s.lastPolicyAftereffect,
                            empressReplyRecord: null,
                            pendingStructuredSchemeIds: [],
                            pendingBacklash: result.delayedBacklash,
                            roundHistory,
                            npcMemoryLedger,
                            relationMemoryLedger,
                            worldMemoryLedger,
                            endingReport,
                            battleReport,
                            shuCampaign: result.shuCampaign,
                            huainanCampaign: result.huainanCampaign,
                            shuMomentum: result.shuMomentum,
                            huainanMomentum: result.huainanMomentum,
                        })
                    } else {
                        set({
                            currentPhase: 'SCHEME_FEEDBACK',
                            isGameOver: false,
                            gameResult: 'NONE',
                            northStats: result.northStatsAfter,
                            southStats: result.southStatsAfter,
                            northPower: result.northPowerAfter,
                            southPower: result.southPowerAfter,
                            playerDangerStage: result.playerDangerStage,
                            playerSuspicionHeat: result.playerSuspicionHeat,
                            invasionPressure: result.invasionPressure,
                            npcs: updatedNpcs,
                            factions: result.factionsAfter,
                            relationships: result.relationshipsAfter,
                            intelProgress: updatedIntelProgress,
                            lastSettlement: result,
                            lastPolicyReport: result.policyReport ?? s.lastPolicyReport,
                            lastPolicyAftereffect: result.policyAftereffect ?? s.lastPolicyAftereffect,
                            empressReplyRecord: null,
                            pendingStructuredSchemeIds: [],
                            pendingBacklash: result.delayedBacklash,
                            roundHistory,
                            npcMemoryLedger,
                            relationMemoryLedger,
                            worldMemoryLedger,
                            shuCampaign: result.shuCampaign,
                            huainanCampaign: result.huainanCampaign,
                            shuMomentum: result.shuMomentum,
                            huainanMomentum: result.huainanMomentum,
                        })
                    }
                }
                break

            case 'EMPRESS_REPLY':
                {
                    const review = getDowagerReviewForRound(currentRound)
                    const pending = get().pendingDowagerOffering
                    set({
                        currentPhase: review && pending?.validationRound === currentRound
                            ? 'DOWAGER_REVIEW'
                            : 'SETTLEMENT',
                    })
                }
                break

            case 'DOWAGER_REVIEW':
                {
                    const s = get()
                    if (s.pendingDowagerOffering && !s.pendingDowagerOffering.favorApplied) {
                        get().resolveDowagerReview()
                    }
                    const latest = get()
                    if (isDowagerDeathCheckEnabledForRound(latest.currentRound) && latest.dowagerFavor <= 0) {
                        set({
                            currentPhase: 'ENDING',
                            isGameOver: true,
                            gameResult: 'DEFEAT_DEATH',
                            pendingDowagerOffering: null,
                            endingReport: buildDowagerDeathEndingReport(latest),
                        })
                    } else {
                        set({
                            currentPhase: 'SETTLEMENT',
                            pendingDowagerOffering: null,
                        })
                    }
                }
                break

            case 'SETTLEMENT':
                if (currentRound >= 20) {
                    const settlement = get().lastSettlement
                    set({
                        currentPhase: 'ENDING',
                        isGameOver: true,
                        gameResult: settlement?.gameResult ?? 'DEFEAT_POWER',
                    })
                } else {
                    const delayedPolicy = state.lastPolicyAftereffect?.sourceRound === currentRound
                        ? state.lastPolicyAftereffect
                        : null
                    const backlashResult = applyDelayedBacklashToState({
                        backlog: state.pendingBacklash,
                        currentRound: currentRound + 1,
                        npcs: state.npcs,
                        northStats: state.northStats,
                    })
                    const nextSouthStats = delayedPolicy
                        ? applyDimensionChanges(state.southStats, delayedPolicy.effects)
                        : state.southStats
                    const nextRound = currentRound + 1
                    const dowagerDecayPatch = applyDowagerFavorDecayForRound(state, nextRound)
                    set({
                        currentRound: nextRound,
                        currentPhase: 'ROUND_START',
                        schemeCount: 0,
                        fengDaozhiAssistsRemaining: getAssistQuotaForDifficulty(state.difficulty),
                        playerDangerStage: state.playerDangerStage,
                        dowagerFavor: dowagerDecayPatch.dowagerFavor,
                        lastDowagerFavorDecayRound: dowagerDecayPatch.lastDowagerFavorDecayRound,
                        southStats: nextSouthStats,
                        northStats: backlashResult.northStats,
                        southPower: calculateCompositePower(nextSouthStats),
                        northPower: calculateCompositePower(backlashResult.northStats),
                        npcs: backlashResult.npcs.map(npc => ({
                            ...npc,
                            availableSchemes: getAvailableSchemesForNpc(npc, {
                                round: currentRound + 1,
                                unlockedSecrets: state.intelProgress[npc.id] ?? 0,
                            }),
                        })),
                        currentSchemes: [],
                        selectedPolicyOption: null,
                        policyReason: '',
                        selectedPolicyParse: null,
                        npcFeedbacks: [],
                        lastSettlement: null,
                        empressReplyRecord: null,
                        pendingStructuredSchemeIds: [],
                        pendingBacklash: [],
                        recentBacklash: backlashResult.appliedBacklash,
                        endingReport: null,
                        battleReport: null,
                        shuCampaign: state.shuCampaign,
                        huainanCampaign: state.huainanCampaign,
                    })
                    get().saveRoundStartSnapshot()
                }
                break

            case 'ENDING':
                break
        }
    },

    prevPhase: () => {
        const state = get()
        switch (state.currentPhase) {
            case 'COURT_OBSERVE':
                set({ currentPhase: 'ROUND_START' })
                break
            default:
                break
        }
    },

    advancePrologue: () => {
        const state = get()
        set({
            prologueStep:
                state.prologueStep === 'COVER'
                    ? 'OPENING_CINEMATIC'
                    : 'INGAME',
        })
    },

    setDifficulty: (difficulty: GameDifficulty) => {
        set({
            difficulty,
            fengDaozhiAssistsRemaining: getAssistQuotaForDifficulty(difficulty),
        })
    },

    startNewGame: (difficulty: GameDifficulty) => {
        get().resetGame()
        set({
            currentPhase: 'PROLOGUE',
            difficulty,
            prologueStep: 'OPENING_CINEMATIC',
            fengDaozhiAssistsRemaining: getAssistQuotaForDifficulty(difficulty),
        })
    },

    saveToSlot: () => {
        const state = get()
        const snapshot = buildPersistedSnapshot({
            ...state,
            helpOverlayOpen: false,
            helpOverlaySource: null,
        })
        if (!snapshot) return false
        saveGameSnapshot(snapshot)
        return true
    },

    loadLatestSave: () => {
        const snapshot = loadGameSnapshot()
        if (!snapshot) return false
        get().hydrateSnapshot(snapshot)
        return true
    },

    returnToCover: () => {
        get().saveToSlot()
        set({
            currentPhase: 'PROLOGUE',
            prologueStep: 'COVER',
            helpOverlayOpen: false,
            helpOverlaySource: null,
        })
    },

    openGameplayGuide: (source: HelpOverlaySource = 'gameplay') => {
        set({
            helpOverlayOpen: true,
            helpOverlaySource: source,
        })
    },

    closeGameplayGuide: () => {
        set({
            helpOverlayOpen: false,
            helpOverlaySource: null,
        })
    },

    markFirstRoundGuideSeen: (key: FirstRoundGuideKey) => {
        set(state => ({
            firstRoundGuideSeen: {
                ...state.firstRoundGuideSeen,
                [key]: true,
            },
        }))
    },

    markSchemeOnboardingSeen: (key: SchemeOnboardingGuideKey) => {
        set(state => ({
            schemeOnboardingSeen: {
                ...state.schemeOnboardingSeen,
                [key]: true,
            },
        }))
    },

    markOmenGuideSeen: () => {
        set(state => ({
            omenGuideSeen: {
                ...state.omenGuideSeen,
                first_omen_modal: true,
            },
        }))
    },

    markFengDaozhiGuideSeen: (key: string) => {
        set(state => ({
            fengDaozhiGuideSeen: {
                ...state.fengDaozhiGuideSeen,
                [key]: true,
            },
        }))
    },

    markFengDaozhiGuideSeenMany: (keys: string[]) => {
        set(state => {
            const nextSeen = { ...state.fengDaozhiGuideSeen }
            keys.forEach(key => {
                nextSeen[key] = true
            })
            return { fengDaozhiGuideSeen: nextSeen }
        })
    },

    consumeFengDaozhiAssist: () => {
        set(state => ({
            fengDaozhiAssistsRemaining: Math.max(0, state.fengDaozhiAssistsRemaining - 1),
        }))
    },

    resetFengDaozhiAssistsForRound: () => {
        set(state => ({
            fengDaozhiAssistsRemaining: getAssistQuotaForDifficulty(state.difficulty),
        }))
    },

    submitDowagerOffering: submission => {
        const state = get()
        if (state.currentPhase !== 'DOWAGER_CREATION') return
        const schedule = getDowagerCreationForRound(state.currentRound)
        if (!schedule) return

        const pending = createPendingDowagerOffering({
            creationRound: schedule.creationRound,
            validationRound: schedule.reviewRound,
            poemId: schedule.poemId,
            rubricVersion: schedule.rubricVersion,
            medium: submission.medium,
            selections: submission.selections,
            styleReferenceId: submission.styleReferenceId ?? null,
        })

        const startMediaGeneration = () => {
            if (
                pending.medium !== 'painting'
                || pending.mediaTask.provider !== 'doubao_seedream'
                || !pending.mediaTask.request
                || !shouldRunDowagerDoubaoGeneration()
            ) {
                return
            }

            void generateDoubaoImage(pending.mediaTask.request)
                .then(result => {
                    const completedText = buildDowagerMediaDisplayText(pending.medium, true)
                    set(current => {
                        const dowagerOfferingRecords = current.dowagerOfferingRecords.map(record => (
                            record.id === pending.id
                                ? {
                                    ...record,
                                    mediaStatus: 'succeeded' as const,
                                    mediaDisplayText: completedText,
                                    mediaResultImageSrc: result.imageSrc,
                                }
                                : record
                        ))
                        if (current.pendingDowagerOffering?.id !== pending.id) {
                            return { dowagerOfferingRecords }
                        }

                        return {
                            pendingDowagerOffering: {
                                ...current.pendingDowagerOffering,
                                mediaTask: {
                                    ...current.pendingDowagerOffering.mediaTask,
                                    status: 'succeeded' as const,
                                    displayText: completedText,
                                    resultImageSrc: result.imageSrc,
                                },
                            },
                            dowagerOfferingRecords,
                        }
                    })
                })
                .catch(() => {
                    const failedText = buildDowagerMediaDisplayText(pending.medium, false)
                    set(current => {
                        const dowagerOfferingRecords = current.dowagerOfferingRecords.map(record => (
                            record.id === pending.id
                                ? {
                                    ...record,
                                    mediaStatus: 'failed' as const,
                                    mediaDisplayText: failedText,
                                    mediaResultImageSrc: null,
                                }
                                : record
                        ))
                        if (current.pendingDowagerOffering?.id !== pending.id) {
                            return { dowagerOfferingRecords }
                        }

                        return {
                            pendingDowagerOffering: {
                                ...current.pendingDowagerOffering,
                                mediaTask: {
                                    ...current.pendingDowagerOffering.mediaTask,
                                    status: 'failed' as const,
                                    displayText: failedText,
                                    resultImageSrc: null,
                                },
                            },
                            dowagerOfferingRecords,
                        }
                    })
                })
        }

        if (shouldJumpDowagerPreviewToReview()) {
            const decayPatch = applyDowagerFavorDecayForRound(state, schedule.reviewRound)
            set({
                currentRound: schedule.reviewRound,
                currentPhase: 'DOWAGER_REVIEW',
                pendingDowagerOffering: pending,
                dowagerFavor: decayPatch.dowagerFavor,
                lastDowagerFavorDecayRound: decayPatch.lastDowagerFavorDecayRound,
            })
            get().resolveDowagerReview()
            startMediaGeneration()
            return
        }

        set({
            pendingDowagerOffering: pending,
            currentPhase: 'EMPRESS_LETTER',
        })
        startMediaGeneration()
    },

    resolveDowagerReview: () => {
        const state = get()
        const pending = state.pendingDowagerOffering
        if (!pending || pending.favorApplied) return
        if (state.currentRound !== pending.validationRound) return

        const scoreResult = scoreDowagerOffering({
            poemId: pending.poemId,
            medium: pending.medium,
            selections: pending.selections,
        })
        const favorAfter = clampDowagerFavor(state.dowagerFavor + scoreResult.favorDelta)
        const dowagerComment = buildDowagerFallbackComment({
            medium: pending.medium,
            tierLabel: DOWAGER_FINAL_TIER_LABELS[scoreResult.finalTier],
            favorDelta: scoreResult.favorDelta,
            evidence: scoreResult.evaluationSummaryForDowager,
        })
        const scoredPending: PendingDowagerOffering = {
            ...pending,
            scoreResult,
            favorApplied: true,
        }
        const existingRecord = state.dowagerOfferingRecords.some(record => record.id === pending.id)
        const record = buildDowagerOfferingRecord({
            pending: scoredPending,
            favorAfter,
            dowagerComment,
        })

        set({
            dowagerFavor: favorAfter,
            pendingDowagerOffering: scoredPending,
            dowagerOfferingRecords: existingRecord
                ? state.dowagerOfferingRecords
                : [...state.dowagerOfferingRecords, record],
        })
    },

    requestDowagerReviewComment: async () => {
        const state = get()
        const pendingId = state.pendingDowagerOffering?.id
        const record = pendingId
            ? state.dowagerOfferingRecords.find(item => item.id === pendingId)
            : state.dowagerOfferingRecords.at(-1)
        if (!record) return

        const poem = getDowagerPoemContent(record.poemId)
        const fallbackComment = record.dowagerComment
        const result = await generateDowagerReviewComment({
            poemTitle: record.poemTitle,
            poemLines: poem.bodyLines,
            mediumLabel: DOWAGER_MEDIUM_LABELS[record.medium],
            finalTierLabel: DOWAGER_FINAL_TIER_LABELS[record.finalTier],
            favorDelta: record.favorDelta,
            evaluationSummary: record.evaluationSummaryForDowager,
            selectedEvidence: buildDowagerSelectedEvidence(record),
            fallbackComment,
        })
        if (result.text === fallbackComment) return

        const latest = get()
        if (!latest.dowagerOfferingRecords.some(item => item.id === record.id)) return
        set({
            dowagerOfferingRecords: latest.dowagerOfferingRecords.map(item => (
                item.id === record.id ? { ...item, dowagerComment: result.text } : item
            )),
        })
    },

    requestFengDaozhiDraft: async (request: FengDaozhiDraftRequest) => {
        const state = get()
        if (state.fengDaozhiAssistsRemaining <= 0) return null

        const npc = state.npcs.find(item => item.id === request.targetNpcId)
        if (!npc || !npc.isAlive) return null

        const relatedNpc = request.relatedNpcId
            ? state.npcs.find(item => item.id === request.relatedNpcId)
            : null
        const pressureAwareRequest = {
            ...request,
            playerSuspicionHeat: request.playerSuspicionHeat ?? state.playerSuspicionHeat,
            invasionPressure: request.invasionPressure ?? state.invasionPressure,
        }
        const context = buildFengDaozhiDraftContext({
            request: pressureAwareRequest,
            npc,
            relatedNpc,
            factions: state.factions,
            unlockedSecrets: state.intelProgress[npc.id] ?? 0,
            roundHistory: state.roundHistory,
            recentBacklash: state.recentBacklash,
            shuCampaign: state.shuCampaign,
            huainanCampaign: state.huainanCampaign,
            npcMemoryLedger: state.npcMemoryLedger,
            relationMemoryLedger: state.relationMemoryLedger,
            worldMemoryLedger: state.worldMemoryLedger,
        })

        try {
            const aiDraft = await chatCompletionJson<{ primaryText?: string; secondaryText?: string }>(
                buildFengDaozhiDraftPrompt({
                    context,
                    schemeType: request.schemeType,
                    relatedNpcName: relatedNpc?.name,
                }),
                { temperature: 0.55, maxTokens: request.schemeType === 'omen' ? 260 : 180, tag: 'feng_daozhi_draft' },
            )
            const normalized = normalizeFengDaozhiDraft(aiDraft, request.schemeType)
            const draft = normalized ?? buildFallbackFengDaozhiDraft(request, context)
            set(current => ({
                fengDaozhiAssistsRemaining: Math.max(0, current.fengDaozhiAssistsRemaining - 1),
            }))
            return draft
        } catch {
            const fallback = buildFallbackFengDaozhiDraft(request, context)
            set(current => ({
                fengDaozhiAssistsRemaining: Math.max(0, current.fengDaozhiAssistsRemaining - 1),
            }))
            return fallback
        }
    },

    saveRoundStartSnapshot: () => {
        const state = get()
        const snapshot = buildRoundStartSnapshot({
            currentRound: state.currentRound,
            currentPhase: 'ROUND_START',
            difficulty: state.difficulty,
            schemeCount: 0,
            maxSchemes: state.maxSchemes,
            prologueStep: state.prologueStep,
            helpOverlayOpen: false,
            helpOverlaySource: null,
            firstRoundGuideSeen: state.firstRoundGuideSeen,
            schemeOnboardingSeen: state.schemeOnboardingSeen,
            omenGuideSeen: state.omenGuideSeen,
            fengDaozhiGuideSeen: state.fengDaozhiGuideSeen,
            fengDaozhiAssistsRemaining: state.fengDaozhiAssistsRemaining,
            playerDangerStage: state.playerDangerStage,
            playerSuspicionHeat: state.playerSuspicionHeat,
            dowagerFavor: state.dowagerFavor,
            lastDowagerFavorDecayRound: state.lastDowagerFavorDecayRound,
            pendingDowagerOffering: state.pendingDowagerOffering,
            dowagerOfferingRecords: state.dowagerOfferingRecords,
            invasionPressure: state.invasionPressure,
            isGameOver: false,
            gameResult: 'NONE',
            northStats: state.northStats,
            southStats: state.southStats,
            northPower: state.northPower,
            southPower: state.southPower,
            npcs: state.npcs.map(npc => ({ ...npc })),
            factions: state.factions.map(faction => ({ ...faction })),
            relationships: state.relationships.map(edge => ({ ...edge })),
            intelProgress: { ...state.intelProgress },
            currentSchemes: [],
            selectedPolicyOption: null,
            policyReason: '',
            selectedPolicyParse: null,
            npcFeedbacks: [],
            pendingStructuredSchemeIds: [],
            lastSettlement: null,
            lastPolicyReport: state.lastPolicyReport,
            lastPolicyAftereffect: state.lastPolicyAftereffect,
            empressReplyRecord: null,
            pendingBacklash: state.pendingBacklash.map(item => ({ ...item })),
            recentBacklash: state.recentBacklash.map(item => ({ ...item })),
            roundHistory: state.roundHistory.map(item => ({ ...item })),
            npcMemoryLedger: state.npcMemoryLedger,
            relationMemoryLedger: cloneRelationMemoryLedger(state.relationMemoryLedger),
            worldMemoryLedger: state.worldMemoryLedger.map(item => ({ ...item })),
            endingReport: null,
            battleReport: null,
            shuCampaign: {
                ...state.shuCampaign,
                ongoingNorthImpact: { ...state.shuCampaign.ongoingNorthImpact },
                ongoingSouthImpact: { ...state.shuCampaign.ongoingSouthImpact },
            },
            huainanCampaign: {
                ...state.huainanCampaign,
                ongoingNorthImpact: { ...state.huainanCampaign.ongoingNorthImpact },
                ongoingSouthImpact: { ...state.huainanCampaign.ongoingSouthImpact },
            },
            shuMomentum: state.shuMomentum,
            huainanMomentum: state.huainanMomentum,
        })

        set({ roundStartSnapshot: snapshot })
    },

    restoreRoundStartSnapshot: () => {
        const snapshot = get().roundStartSnapshot
        if (!snapshot) return

        set({
            currentRound: snapshot.currentRound,
            currentPhase: 'ROUND_START',
            difficulty: snapshot.difficulty,
            schemeCount: 0,
            maxSchemes: snapshot.maxSchemes,
            prologueStep: snapshot.prologueStep,
            helpOverlayOpen: false,
            helpOverlaySource: null,
            firstRoundGuideSeen: snapshot.firstRoundGuideSeen,
            schemeOnboardingSeen: snapshot.schemeOnboardingSeen,
            omenGuideSeen: snapshot.omenGuideSeen,
            fengDaozhiGuideSeen: snapshot.fengDaozhiGuideSeen,
            fengDaozhiAssistsRemaining: snapshot.fengDaozhiAssistsRemaining,
            playerDangerStage: snapshot.playerDangerStage,
            playerSuspicionHeat: snapshot.playerSuspicionHeat ?? 0,
            dowagerFavor: snapshot.dowagerFavor ?? INITIAL_DOWAGER_FAVOR,
            lastDowagerFavorDecayRound: snapshot.lastDowagerFavorDecayRound ?? null,
            pendingDowagerOffering: snapshot.pendingDowagerOffering ?? null,
            dowagerOfferingRecords: snapshot.dowagerOfferingRecords ?? [],
            invasionPressure: snapshot.invasionPressure ?? 0,
            isGameOver: false,
            gameResult: 'NONE',
            roundStartSnapshot: snapshot,
            northStats: snapshot.northStats,
            southStats: snapshot.southStats,
            northPower: snapshot.northPower,
            southPower: snapshot.southPower,
            npcs: attachAvailableSchemes(snapshot.npcs, snapshot.currentRound, snapshot.intelProgress),
            factions: snapshot.factions,
            relationships: snapshot.relationships,
            intelProgress: snapshot.intelProgress,
            currentSchemes: [],
            selectedPolicyOption: null,
            policyReason: '',
            selectedPolicyParse: null,
            npcFeedbacks: [],
            pendingStructuredSchemeIds: [],
            lastSettlement: null,
            lastPolicyReport: snapshot.lastPolicyReport,
            lastPolicyAftereffect: snapshot.lastPolicyAftereffect,
            empressReplyRecord: snapshot.empressReplyRecord ?? null,
            pendingBacklash: snapshot.pendingBacklash,
            recentBacklash: snapshot.recentBacklash,
            roundHistory: snapshot.roundHistory,
            npcMemoryLedger: snapshot.npcMemoryLedger,
            relationMemoryLedger: cloneRelationMemoryLedger(snapshot.relationMemoryLedger ?? {}),
            worldMemoryLedger: snapshot.worldMemoryLedger ?? [],
            endingReport: null,
            battleReport: null,
            shuCampaign: snapshot.shuCampaign,
            huainanCampaign: snapshot.huainanCampaign,
            shuMomentum: snapshot.shuMomentum,
            huainanMomentum: snapshot.huainanMomentum,
        })
    },

    resetGame: () => {
        set({
            currentRound: 1,
            currentPhase: 'PROLOGUE',
            difficulty: initialDifficulty,
            schemeCount: 0,
            isGameOver: false,
            gameResult: 'NONE',
            prologueStep: 'COVER',
            helpOverlayOpen: false,
            helpOverlaySource: null,
            firstRoundGuideSeen: initialFirstRoundGuideSeen,
            schemeOnboardingSeen: initialSchemeOnboardingSeen,
            omenGuideSeen: initialOmenGuideSeen,
            fengDaozhiGuideSeen: initialFengDaozhiGuideSeen,
            fengDaozhiAssistsRemaining: getAssistQuotaForDifficulty(initialDifficulty),
            playerDangerStage: 'safe',
            playerSuspicionHeat: 0,
            dowagerFavor: INITIAL_DOWAGER_FAVOR,
            lastDowagerFavorDecayRound: null,
            pendingDowagerOffering: null,
            dowagerOfferingRecords: [],
            invasionPressure: 0,
            northStats: { ...NORTH_INITIAL },
            southStats: { ...SOUTH_INITIAL },
            northPower: initialNorthPower,
            southPower: initialSouthPower,
            roundStartSnapshot: null,
            npcs: attachAvailableSchemes(INITIAL_NPCS.map(n => ({ ...n })), 1, initialIntelProgress),
            factions: INITIAL_FACTIONS.map(f => ({ ...f })),
            relationships: INITIAL_RELATIONSHIP_EDGES.map(edge => ({ ...edge })),
            intelProgress: initialIntelProgress,
            currentSchemes: [],
            selectedPolicyOption: null,
            policyReason: '',
            selectedPolicyParse: null,
            npcFeedbacks: [],
            pendingStructuredSchemeIds: [],
            lastSettlement: null,
            lastPolicyReport: null,
            lastPolicyAftereffect: null,
            empressReplyRecord: null,
            pendingBacklash: [],
            recentBacklash: [],
            roundHistory: [],
            npcMemoryLedger: initialNpcMemoryLedger,
            relationMemoryLedger: cloneRelationMemoryLedger(initialRelationMemoryLedger),
            worldMemoryLedger: initialWorldMemoryLedger,
            endingReport: null,
            battleReport: null,
            shuCampaign: { ...initialCampaignState },
            huainanCampaign: { ...initialCampaignState },
            shuMomentum: 0,
            huainanMomentum: 0,
        })
    },

    addScheme: (scheme: SchemeAction) => {
        const state = get()
        const patch = buildAddSchemePatch(state, scheme)
        if (!patch) return
        set(patch)
    },

    selectPolicy: (optionIndex: number, reason: string, policyParse: PolicyReasonParseResult | null = null) => {
        set({
            selectedPolicyOption: optionIndex,
            policyReason: reason,
            selectedPolicyParse: policyParse,
        })
    },

    addNpcFeedback: (feedback: NpcFeedback) => {
        set({
            npcFeedbacks: appendNpcFeedback(get().npcFeedbacks, feedback),
        })
    },

    updateNpcFeedback: (feedbackId: string, text: string, source?: string) => {
        set({
            npcFeedbacks: updateNpcFeedbackText(get().npcFeedbacks, feedbackId, text, source),
        })
    },

    updateNpcFeedbackOmenEcho: (feedbackId: string, omenEcho: OmenEchoFeedback) => {
        set({
            npcFeedbacks: updateNpcFeedbackOmenEcho(get().npcFeedbacks, feedbackId, omenEcho),
        })
    },

    updateSchemeNpcAction: (actionId: string, npcAction: SchemeNpcActionNarrative) => {
        set(state => {
            if (!state.lastSettlement) return {}
            const resultIndex = state.lastSettlement.processedSchemes.findIndex(action => action.id === actionId)
            if (resultIndex < 0) return {}
            const action = state.lastSettlement.processedSchemes[resultIndex]
            const previousResult = state.lastSettlement.schemeResults[resultIndex]
            if (!action || !previousResult) return {}
            const previousMotionText = previousResult.causalEvent?.motionText ?? previousResult.npcAction?.text ?? null

            return {
                lastSettlement: {
                    ...state.lastSettlement,
                    schemeResults: state.lastSettlement.schemeResults.map((result, index) => (
                        index === resultIndex
                            ? {
                                ...result,
                                npcAction,
                                causalEvent: result.causalEvent
                                    ? {
                                        ...result.causalEvent,
                                        motionText: npcAction.text,
                                        motionSource: npcAction.source,
                                    }
                                    : result.causalEvent,
                            }
                            : result
                    )),
                },
                npcMemoryLedger: patchNpcMemoryLedgerForSchemeNpcAction(state.npcMemoryLedger, {
                    action,
                    round: state.currentRound,
                    previousMotionText,
                    nextMotionText: npcAction.text,
                }),
                relationMemoryLedger: patchRelationMemoryLedgerForSchemeNpcAction(state.relationMemoryLedger, {
                    action,
                    round: state.currentRound,
                    nextMotionText: npcAction.text,
                }),
                worldMemoryLedger: patchWorldMemoryLedgerForSchemeNpcAction(state.worldMemoryLedger, {
                    action,
                    round: state.currentRound,
                    previousMotionText,
                    nextMotionText: npcAction.text,
                }),
            }
        })
    },

    setEmpressReplyRecord: (record: EmpressReplyRecord | null) => {
        set({ empressReplyRecord: record })
    },

    markSchemeParsePending: (actionId: string) => {
        set(state => ({
            pendingStructuredSchemeIds: markSchemeParsePendingIds(state.pendingStructuredSchemeIds, actionId),
        }))
    },

    updateSchemeParse: (actionId: string, northParse: NorthSchemeParseResult) => {
        set(state => ({
            currentSchemes: attachNorthSchemeParse(state.currentSchemes, actionId, northParse),
            pendingStructuredSchemeIds: removePendingSchemeParseId(state.pendingStructuredSchemeIds, actionId),
        }))
    },

    setSchemeFollowUp: (actionId: string, followUp: SchemeFollowUp) => {
        set(state => ({
            currentSchemes: setSchemeFollowUpOnActions(state.currentSchemes, actionId, followUp),
        }))
    },

    answerSchemeFollowUp: (actionId: string, playerReply: string, parse: SchemeFollowUpParseResult, finalNpcReply: string, metadata?: SchemeFollowUpAnswerMetadata) => {
        set(state => ({
            currentSchemes: answerSchemeFollowUpOnActions(
                state.currentSchemes,
                actionId,
                playerReply,
                parse,
                finalNpcReply,
                metadata,
            ),
        }))
    },

    skipSchemeFollowUp: (actionId: string) => {
        set(state => ({
            currentSchemes: skipSchemeFollowUpOnActions(state.currentSchemes, actionId),
        }))
    },

    hydrateSnapshot: (snapshot: PersistedGameSnapshot) => {
        const guideSnapshot = snapshot as PersistedGameSnapshot & {
            prologueStep?: PrologueStep
            helpOverlayOpen?: boolean
            helpOverlaySource?: HelpOverlaySource | null
            firstRoundGuideSeen?: FirstRoundGuideSeenMap | boolean
            schemeOnboardingSeen?: SchemeOnboardingSeenMap
            omenGuideSeen?: OmenGuideSeenMap
            fengDaozhiGuideSeen?: FengDaozhiGuideSeenMap
            fengDaozhiAssistsRemaining?: number
        }

        const currentPhase = normalizePersistedRoundPhase(
            snapshot.currentPhase as RoundPhase | string,
            snapshot.schemeCount,
            snapshot.maxSchemes,
        )
        const prologueStep =
            guideSnapshot.prologueStep ??
            (currentPhase === 'PROLOGUE' ? 'PROLOGUE' : 'INGAME')

        set({
            currentRound: snapshot.currentRound,
            currentPhase,
            difficulty: snapshot.difficulty ?? initialDifficulty,
            schemeCount: snapshot.schemeCount,
            maxSchemes: snapshot.maxSchemes,
            prologueStep,
            helpOverlayOpen: guideSnapshot.helpOverlayOpen ?? false,
            helpOverlaySource: guideSnapshot.helpOverlaySource ?? null,
            firstRoundGuideSeen: normalizeFirstRoundGuideSeen(guideSnapshot.firstRoundGuideSeen),
            schemeOnboardingSeen: {
                ...initialSchemeOnboardingSeen,
                ...(guideSnapshot.schemeOnboardingSeen ?? {}),
            },
            omenGuideSeen: guideSnapshot.omenGuideSeen ?? initialOmenGuideSeen,
            fengDaozhiGuideSeen: guideSnapshot.fengDaozhiGuideSeen ?? initialFengDaozhiGuideSeen,
            fengDaozhiAssistsRemaining:
                guideSnapshot.fengDaozhiAssistsRemaining ??
                getAssistQuotaForDifficulty(snapshot.difficulty ?? initialDifficulty),
            playerDangerStage: snapshot.playerDangerStage ?? 'safe',
            playerSuspicionHeat: snapshot.playerSuspicionHeat ?? 0,
            dowagerFavor: snapshot.dowagerFavor ?? INITIAL_DOWAGER_FAVOR,
            lastDowagerFavorDecayRound: snapshot.lastDowagerFavorDecayRound ?? null,
            pendingDowagerOffering: snapshot.pendingDowagerOffering ?? null,
            dowagerOfferingRecords: snapshot.dowagerOfferingRecords ?? [],
            invasionPressure: snapshot.invasionPressure ?? 0,
            isGameOver: snapshot.isGameOver,
            gameResult: snapshot.gameResult,
            roundStartSnapshot: snapshot.roundStartSnapshot
                ? {
                    ...snapshot.roundStartSnapshot,
                    currentPhase: normalizePersistedRoundPhase(
                        snapshot.roundStartSnapshot.currentPhase as RoundPhase | string,
                        snapshot.roundStartSnapshot.schemeCount,
                        snapshot.roundStartSnapshot.maxSchemes,
                    ),
                    difficulty: snapshot.roundStartSnapshot.difficulty ?? snapshot.difficulty ?? initialDifficulty,
                    schemeOnboardingSeen: {
                        ...initialSchemeOnboardingSeen,
                        ...(snapshot.roundStartSnapshot.schemeOnboardingSeen ?? {}),
                    },
                    fengDaozhiGuideSeen: snapshot.roundStartSnapshot.fengDaozhiGuideSeen ?? initialFengDaozhiGuideSeen,
                    npcMemoryLedger: snapshot.roundStartSnapshot.npcMemoryLedger ?? {},
                    relationMemoryLedger: cloneRelationMemoryLedger(snapshot.roundStartSnapshot.relationMemoryLedger ?? {}),
                    worldMemoryLedger: snapshot.roundStartSnapshot.worldMemoryLedger ?? [],
                    playerSuspicionHeat: snapshot.roundStartSnapshot.playerSuspicionHeat ?? 0,
                    dowagerFavor: snapshot.roundStartSnapshot.dowagerFavor ?? INITIAL_DOWAGER_FAVOR,
                    lastDowagerFavorDecayRound: snapshot.roundStartSnapshot.lastDowagerFavorDecayRound ?? null,
                    pendingDowagerOffering: snapshot.roundStartSnapshot.pendingDowagerOffering ?? null,
                    dowagerOfferingRecords: snapshot.roundStartSnapshot.dowagerOfferingRecords ?? [],
                    invasionPressure: snapshot.roundStartSnapshot.invasionPressure ?? 0,
                    npcs: attachAvailableSchemes(
                        snapshot.roundStartSnapshot.npcs,
                        snapshot.roundStartSnapshot.currentRound,
                        snapshot.roundStartSnapshot.intelProgress,
                    ),
                }
                : null,
            northStats: snapshot.northStats,
            southStats: snapshot.southStats,
            northPower: snapshot.northPower,
            southPower: snapshot.southPower,
            npcs: attachAvailableSchemes(snapshot.npcs, snapshot.currentRound, snapshot.intelProgress),
            factions: snapshot.factions,
            relationships: snapshot.relationships,
            intelProgress: snapshot.intelProgress,
            currentSchemes: snapshot.currentSchemes,
            selectedPolicyOption: snapshot.selectedPolicyOption,
            policyReason: snapshot.policyReason,
            selectedPolicyParse: snapshot.selectedPolicyParse ?? null,
            npcFeedbacks: snapshot.npcFeedbacks,
            pendingStructuredSchemeIds: snapshot.pendingStructuredSchemeIds ?? [],
            lastSettlement: snapshot.lastSettlement,
            lastPolicyReport: snapshot.lastPolicyReport,
            lastPolicyAftereffect: snapshot.lastPolicyAftereffect,
            empressReplyRecord: snapshot.empressReplyRecord ?? null,
            pendingBacklash: snapshot.pendingBacklash ?? [],
            recentBacklash: snapshot.recentBacklash ?? [],
            roundHistory: snapshot.roundHistory,
            npcMemoryLedger: snapshot.npcMemoryLedger ?? {},
            relationMemoryLedger: cloneRelationMemoryLedger(snapshot.relationMemoryLedger ?? {}),
            worldMemoryLedger: snapshot.worldMemoryLedger ?? [],
            endingReport: snapshot.endingReport,
            battleReport: snapshot.battleReport,
            shuCampaign: snapshot.shuCampaign ?? { ...initialCampaignState },
            huainanCampaign: snapshot.huainanCampaign ?? { ...initialCampaignState },
            shuMomentum: snapshot.shuMomentum ?? 0,
            huainanMomentum: snapshot.huainanMomentum ?? 0,
        })
    },
}))


