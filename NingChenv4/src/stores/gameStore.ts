// ========================================
// Core game state store
// Async flow: schemes -> empress letter -> NPC feedback -> settlement
// ========================================

import { create } from 'zustand'
import type { BattleReport, CampaignState, DelayedBacklash, EmpressReplyRecord, EndingReport, FengDaozhiDraftRequest, FengDaozhiDraftResult, FirstRoundGuideKey, FirstRoundGuideSeenMap, GameDifficulty, HelpOverlaySource, NationDimensions, NorthSchemeParseResult, NpcMemoryLedger, OmenEchoFeedback, OmenGuideSeenMap, PlayerDangerStage, PolicyAftereffect, PolicyReasonParseResult, PrologueStep, RelationMemoryLedger, RelationshipEdge, RoundHistoryEntry, RoundPhase, GameResult, SchemeAction, SchemeFollowUp, SchemeFollowUpAnswerMetadata, SchemeFollowUpParseResult, SchemeOnboardingGuideKey, SchemeOnboardingSeenMap, WorldMemoryLedger } from '../game/types'
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
    saveGameSnapshot,
    type PersistedGameSnapshot,
    type RoundStartSnapshot,
} from '../game/saveEngine'
import { normalizeCourtDispositionNpcs } from '../game/courtDisposition'
import { getDifficultyProfile } from '../game/difficulty'
import { chatCompletionJson } from '../ai/aiService'
import { buildFengDaozhiDraftPrompt } from '../ai/prompts'
import { buildFallbackFengDaozhiDraft, buildFengDaozhiDraftContext, normalizeFengDaozhiDraft } from '../game/fengDaozhiAdvisor'
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
    fengDaozhiAssistsRemaining: number
    playerDangerStage: PlayerDangerStage
    playerSuspicionHeat: number
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
    consumeFengDaozhiAssist: () => void
    resetFengDaozhiAssistsForRound: () => void
    requestFengDaozhiDraft: (request: FengDaozhiDraftRequest) => Promise<FengDaozhiDraftResult | null>
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
    scheme_phase: false,
    empress_letter: false,
    scheme_feedback: false,
    settlement: false,
}
const initialOmenGuideSeen: OmenGuideSeenMap = {
    first_omen_modal: false,
}
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

function cloneRelationMemoryLedger(ledger: RelationMemoryLedger): RelationMemoryLedger {
    const cloned: RelationMemoryLedger = {}
    for (const [holderNpcId, entries] of Object.entries(ledger)) {
        cloned[holderNpcId] = entries.map(entry => ({ ...entry }))
    }
    return cloned
}

function normalizeFirstRoundGuideSeen(
    value?: FirstRoundGuideSeenMap | boolean,
): FirstRoundGuideSeenMap {
    if (typeof value === 'boolean') {
        return {
            round_start: value,
            court_observe: value,
            scheme_phase: value,
            empress_letter: value,
            scheme_feedback: value,
            settlement: value,
        }
    }

    return {
        round_start: value?.round_start ?? false,
        court_observe: value?.court_observe ?? false,
        scheme_phase: value?.scheme_phase ?? false,
        empress_letter: value?.empress_letter ?? false,
        scheme_feedback: value?.scheme_feedback ?? false,
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
    fengDaozhiAssistsRemaining: getAssistQuotaForDifficulty(initialDifficulty),
    playerDangerStage: 'safe',
    playerSuspicionHeat: 0,
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
            set({ currentPhase: 'EMPRESS_LETTER' })
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
                set({ currentPhase: 'SCHEME_PHASE' })
                break

            case 'SCHEME_PHASE':
                // 三次计谋用完后进入女帝来信（AI在后台继续处理）
                if (schemeCount >= maxSchemes) {
                    set({ currentPhase: 'EMPRESS_LETTER' })
                }
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
                set({ currentPhase: 'SETTLEMENT' })
                break

            case 'SETTLEMENT':
                set({ currentPhase: 'ROUND_END' })
                break

            case 'ROUND_END':
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
                    set({
                        currentRound: currentRound + 1,
                        currentPhase: 'ROUND_START',
                        schemeCount: 0,
                        fengDaozhiAssistsRemaining: getAssistQuotaForDifficulty(state.difficulty),
                        playerDangerStage: state.playerDangerStage,
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
            case 'SCHEME_PHASE':
                set({ currentPhase: 'COURT_OBSERVE' })
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
                    ? 'PROLOGUE'
                    : state.prologueStep === 'PROLOGUE'
                        ? 'GAMEPLAY_GUIDE'
                        : state.prologueStep === 'GAMEPLAY_GUIDE'
                            ? 'CHARACTER_BIOS'
                            : state.prologueStep === 'CHARACTER_BIOS'
                                ? 'INGAME'
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
            prologueStep: 'PROLOGUE',
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
            fengDaozhiAssistsRemaining: state.fengDaozhiAssistsRemaining,
            playerDangerStage: state.playerDangerStage,
            playerSuspicionHeat: state.playerSuspicionHeat,
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
            fengDaozhiAssistsRemaining: snapshot.fengDaozhiAssistsRemaining,
            playerDangerStage: snapshot.playerDangerStage,
            playerSuspicionHeat: snapshot.playerSuspicionHeat ?? 0,
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
            fengDaozhiAssistsRemaining: getAssistQuotaForDifficulty(initialDifficulty),
            playerDangerStage: 'safe',
            playerSuspicionHeat: 0,
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
            fengDaozhiAssistsRemaining?: number
        }

        const prologueStep =
            guideSnapshot.prologueStep ??
            (snapshot.currentPhase === 'PROLOGUE' ? 'PROLOGUE' : 'INGAME')

        set({
            currentRound: snapshot.currentRound,
            currentPhase: snapshot.currentPhase,
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
            fengDaozhiAssistsRemaining:
                guideSnapshot.fengDaozhiAssistsRemaining ??
                getAssistQuotaForDifficulty(snapshot.difficulty ?? initialDifficulty),
            playerDangerStage: snapshot.playerDangerStage ?? 'safe',
            playerSuspicionHeat: snapshot.playerSuspicionHeat ?? 0,
            invasionPressure: snapshot.invasionPressure ?? 0,
            isGameOver: snapshot.isGameOver,
            gameResult: snapshot.gameResult,
            roundStartSnapshot: snapshot.roundStartSnapshot
                ? {
                    ...snapshot.roundStartSnapshot,
                    difficulty: snapshot.roundStartSnapshot.difficulty ?? snapshot.difficulty ?? initialDifficulty,
                    schemeOnboardingSeen: {
                        ...initialSchemeOnboardingSeen,
                        ...(snapshot.roundStartSnapshot.schemeOnboardingSeen ?? {}),
                    },
                    npcMemoryLedger: snapshot.roundStartSnapshot.npcMemoryLedger ?? {},
                    relationMemoryLedger: cloneRelationMemoryLedger(snapshot.roundStartSnapshot.relationMemoryLedger ?? {}),
                    worldMemoryLedger: snapshot.roundStartSnapshot.worldMemoryLedger ?? [],
                    playerSuspicionHeat: snapshot.roundStartSnapshot.playerSuspicionHeat ?? 0,
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


