// ========================================
// 核心游戏状态 Store — P4 更新
// 异步流水线：施计→密信→NPC反馈→结算
// ========================================

import { create } from 'zustand'
import type { BattleReport, CampaignState, DelayedBacklash, EndingReport, FirstRoundGuideKey, FirstRoundGuideSeenMap, HelpOverlaySource, PlayerDangerStage, PolicyAftereffect, PolicyReasonParseResult, PrologueStep, RelationshipEdge, RoundHistoryEntry, RoundPhase, GameResult, NationDimensions, NorthSchemeParseResult, SchemeAction } from '../game/types'
import { calculateCompositePower } from '../game/types'
import { NORTH_INITIAL, SOUTH_INITIAL } from '../data/nationStats'
import { settleRound, type RoundSettlementResult, type PolicySettlementReport } from '../game/roundSettlement'
import { applyDimensionChanges } from '../game/nationEngine'
import { applyDelayedBacklashToState } from '../game/aiNativeEngine'
import { INITIAL_NPCS } from '../data/npcs'
import { INITIAL_FACTIONS } from '../data/factions'
import { INITIAL_RELATIONSHIP_EDGES } from '../data/npcRelationships'
import { ROUND_EVENTS } from '../data/rounds'
import type { NPC, Faction } from '../game/types'
import { getAvailableSchemesForNpc } from '../game/schemeEngine'
import { buildEndingReport } from '../game/endingEngine'
import { buildBattleReport, buildRoundHistoryEntry } from '../game/battleReportEngine'
import { buildRoundStartSnapshot, type PersistedGameSnapshot, type RoundStartSnapshot } from '../game/saveEngine'

/** 单条NPC反馈记录 */
export interface NpcFeedback {
    id: string
    npcId: string
    npcName: string
    schemeType: string
    schemeName: string
    playerSpeech: string
    feedback: string   // AI生成的NPC反馈文本
    isLoading: boolean
    source: string
}

interface GameState {
    // 回合状态
    currentRound: number
    currentPhase: RoundPhase
    schemeCount: number
    maxSchemes: number
    prologueStep: PrologueStep
    helpOverlayOpen: boolean
    helpOverlaySource: HelpOverlaySource | null
    firstRoundGuideSeen: FirstRoundGuideSeenMap
    playerDangerStage: PlayerDangerStage

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

    // 本回合操作记录
    currentSchemes: SchemeAction[]
    selectedPolicyOption: number | null
    policyReason: string
    selectedPolicyParse: PolicyReasonParseResult | null

    // NPC反馈（异步流水线）
    npcFeedbacks: NpcFeedback[]
    pendingStructuredSchemeIds: string[]

    // 最近一次结算结果（供 Settlement 页面显示）
    lastSettlement: RoundSettlementResult | null
    lastPolicyReport: PolicySettlementReport | null
    lastPolicyAftereffect: PolicyAftereffect | null
    pendingBacklash: DelayedBacklash[]
    recentBacklash: DelayedBacklash[]
    roundHistory: RoundHistoryEntry[]
    endingReport: EndingReport | null
    battleReport: BattleReport | null
    shuCampaign: CampaignState
    huainanCampaign: CampaignState

    // 动作
    nextPhase: () => void
    prevPhase: () => void
    advancePrologue: () => void
    openGameplayGuide: (source?: HelpOverlaySource) => void
    closeGameplayGuide: () => void
    markFirstRoundGuideSeen: (key: FirstRoundGuideKey) => void
    saveRoundStartSnapshot: () => void
    restoreRoundStartSnapshot: () => void
    resetGame: () => void
    addScheme: (scheme: SchemeAction) => void
    selectPolicy: (optionIndex: number, reason: string, policyParse?: PolicyReasonParseResult | null) => void
    addNpcFeedback: (feedback: NpcFeedback) => void
    updateNpcFeedback: (feedbackId: string, text: string, source?: string) => void
    markSchemeParsePending: (actionId: string) => void
    updateSchemeParse: (actionId: string, northParse: NorthSchemeParseResult) => void
    hydrateSnapshot: (snapshot: PersistedGameSnapshot) => void
}

const initialNorthPower = calculateCompositePower(NORTH_INITIAL)
const initialSouthPower = calculateCompositePower(SOUTH_INITIAL)
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
    return npcs.map(npc => ({
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
    schemeCount: 0,
    maxSchemes: 3,
    prologueStep: 'PROLOGUE',
    helpOverlayOpen: false,
    helpOverlaySource: null,
    firstRoundGuideSeen: initialFirstRoundGuideSeen,
    playerDangerStage: 'safe',
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
    pendingBacklash: [],
    recentBacklash: [],
    roundHistory: [],
    endingReport: null,
    battleReport: null,
    shuCampaign: { ...initialCampaignState },
    huainanCampaign: { ...initialCampaignState },

    nextPhase: () => {
        const state = get()
        const { currentPhase, currentRound, schemeCount, maxSchemes } = state

        switch (currentPhase) {
            case 'PROLOGUE':
                set({ currentPhase: 'ROUND_START' })
                get().saveRoundStartSnapshot()
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
                // 女帝来信完成后进入 NPC 反馈集中展示页
                set({ currentPhase: 'SCHEME_FEEDBACK' })
                break

            case 'SCHEME_FEEDBACK':
                // NPC 反馈阅读完毕后执行结算
                {
                    const s = get()
                    const result = settleRound({
                        round: s.currentRound,
                        schemes: s.currentSchemes,
                        northStats: s.northStats,
                        southStats: s.southStats,
                        npcs: s.npcs,
                        factions: s.factions,
                        relationships: s.relationships,
                        intelProgress: s.intelProgress,
                        playerDangerStage: s.playerDangerStage,
                        policyOptionIndex: s.selectedPolicyOption,
                        policyReason: s.policyReason,
                        policyParse: s.selectedPolicyParse,
                        shuCampaign: s.shuCampaign,
                        huainanCampaign: s.huainanCampaign,
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
                    const historyEntry = buildRoundHistoryEntry({
                        round: s.currentRound,
                        eventName: ROUND_EVENTS[s.currentRound - 1]?.eventName ?? `第 ${s.currentRound} 回合`,
                        schemeCount: result.schemeResults.length,
                        schemeSuccessCount: result.schemeResults.filter(item => item.success).length,
                        keyTargets: result.schemeResults
                            .map((_, index) => s.npcs.find(npc => npc.id === s.currentSchemes[index]?.targetNpcId)?.name)
                            .filter((name): name is string => Boolean(name)),
                        policyTopic: result.policyReport?.topic,
                        policyOption: result.policyReport?.optionContent,
                        externalActionCount: result.externalActionReports.length,
                        relationshipBreakCount: result.relationshipReports.length,
                        factionCollapseCount: result.factionCollapseReports.length,
                        invasionTriggered: result.invasionTriggered,
                        northPower: result.northPowerAfter,
                        southPower: result.southPowerAfter,
                        summary: result.summaryText,
                    })
                    const roundHistory = [...s.roundHistory, historyEntry]

                    // 检查是否游戏结束
                    if (result.gameResult !== 'NONE') {
                        const endingReport = buildEndingReport({
                            gameResult: result.gameResult,
                            northPower: result.northPowerAfter,
                            southPower: result.southPowerAfter,
                            npcs: updatedNpcs,
                            factions: result.factionsAfter,
                            intelProgress: updatedIntelProgress,
                            lastSettlement: result,
                        })
                        const battleReport = buildBattleReport(roundHistory)
                        set({
                            currentPhase: 'ENDING',
                            isGameOver: true,
                            gameResult: result.gameResult,
                            playerDangerStage: result.playerDangerStage,
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
                            pendingStructuredSchemeIds: [],
                            pendingBacklash: result.delayedBacklash,
                            roundHistory,
                            endingReport,
                            battleReport,
                            shuCampaign: result.shuCampaign,
                            huainanCampaign: result.huainanCampaign,
                        })
                    } else {
                        set({
                            currentPhase: 'SETTLEMENT',
                            northStats: result.northStatsAfter,
                            southStats: result.southStatsAfter,
                            northPower: result.northPowerAfter,
                            southPower: result.southPowerAfter,
                            playerDangerStage: result.playerDangerStage,
                            npcs: updatedNpcs,
                            factions: result.factionsAfter,
                            relationships: result.relationshipsAfter,
                            intelProgress: updatedIntelProgress,
                            lastSettlement: result,
                            lastPolicyReport: result.policyReport ?? s.lastPolicyReport,
                            lastPolicyAftereffect: result.policyAftereffect ?? s.lastPolicyAftereffect,
                            pendingStructuredSchemeIds: [],
                            pendingBacklash: result.delayedBacklash,
                            roundHistory,
                            shuCampaign: result.shuCampaign,
                            huainanCampaign: result.huainanCampaign,
                        })
                    }
                }
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
                state.prologueStep === 'PROLOGUE'
                    ? 'GAMEPLAY_GUIDE'
                    : state.prologueStep === 'GAMEPLAY_GUIDE'
                        ? 'INGAME'
                        : 'INGAME',
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

    saveRoundStartSnapshot: () => {
        const state = get()
        const snapshot = buildRoundStartSnapshot({
            currentRound: state.currentRound,
            currentPhase: 'ROUND_START',
            schemeCount: 0,
            maxSchemes: state.maxSchemes,
            prologueStep: state.prologueStep,
            helpOverlayOpen: false,
            helpOverlaySource: null,
            firstRoundGuideSeen: state.firstRoundGuideSeen,
            playerDangerStage: state.playerDangerStage,
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
            pendingBacklash: state.pendingBacklash.map(item => ({ ...item })),
            recentBacklash: state.recentBacklash.map(item => ({ ...item })),
            roundHistory: state.roundHistory.map(item => ({ ...item })),
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
        })

        set({ roundStartSnapshot: snapshot })
    },

    restoreRoundStartSnapshot: () => {
        const snapshot = get().roundStartSnapshot
        if (!snapshot) return

        set({
            currentRound: snapshot.currentRound,
            currentPhase: 'ROUND_START',
            schemeCount: 0,
            maxSchemes: snapshot.maxSchemes,
            prologueStep: snapshot.prologueStep,
            helpOverlayOpen: false,
            helpOverlaySource: null,
            firstRoundGuideSeen: snapshot.firstRoundGuideSeen,
            playerDangerStage: snapshot.playerDangerStage,
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
            pendingBacklash: snapshot.pendingBacklash,
            recentBacklash: snapshot.recentBacklash,
            roundHistory: snapshot.roundHistory,
            endingReport: null,
            battleReport: null,
            shuCampaign: snapshot.shuCampaign,
            huainanCampaign: snapshot.huainanCampaign,
        })
    },

    resetGame: () => {
        set({
            currentRound: 1,
            currentPhase: 'PROLOGUE',
            schemeCount: 0,
            isGameOver: false,
            gameResult: 'NONE',
            prologueStep: 'PROLOGUE',
            helpOverlayOpen: false,
            helpOverlaySource: null,
            firstRoundGuideSeen: initialFirstRoundGuideSeen,
            playerDangerStage: 'safe',
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
            pendingBacklash: [],
            recentBacklash: [],
            roundHistory: [],
            endingReport: null,
            battleReport: null,
            shuCampaign: { ...initialCampaignState },
            huainanCampaign: { ...initialCampaignState },
        })
    },

    addScheme: (scheme: SchemeAction) => {
        const state = get()
        if (state.schemeCount >= state.maxSchemes) return
        if (state.currentSchemes.some(item => item.targetNpcId === scheme.targetNpcId)) return
        set({
            currentSchemes: [...state.currentSchemes, scheme],
            schemeCount: state.schemeCount + 1,
        })
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
            npcFeedbacks: [...get().npcFeedbacks, feedback],
        })
    },

    updateNpcFeedback: (feedbackId: string, text: string, source?: string) => {
        set({
            npcFeedbacks: get().npcFeedbacks.map(f =>
                f.id === feedbackId ? { ...f, feedback: text, isLoading: false, source: source ?? f.source } : f
            ),
        })
    },

    markSchemeParsePending: (actionId: string) => {
        set(state => ({
            pendingStructuredSchemeIds: state.pendingStructuredSchemeIds.includes(actionId)
                ? state.pendingStructuredSchemeIds
                : [...state.pendingStructuredSchemeIds, actionId],
        }))
    },

    updateSchemeParse: (actionId: string, northParse: NorthSchemeParseResult) => {
        set(state => ({
            currentSchemes: state.currentSchemes.map(action =>
                action.id === actionId ? { ...action, northParse } : action,
            ),
            pendingStructuredSchemeIds: state.pendingStructuredSchemeIds.filter(id => id !== actionId),
        }))
    },

    hydrateSnapshot: (snapshot: PersistedGameSnapshot) => {
        const guideSnapshot = snapshot as PersistedGameSnapshot & {
            prologueStep?: PrologueStep
            helpOverlayOpen?: boolean
            helpOverlaySource?: HelpOverlaySource | null
            firstRoundGuideSeen?: FirstRoundGuideSeenMap | boolean
        }

        const prologueStep =
            guideSnapshot.prologueStep ??
            (snapshot.currentPhase === 'PROLOGUE' ? 'PROLOGUE' : 'INGAME')

        set({
            currentRound: snapshot.currentRound,
            currentPhase: snapshot.currentPhase,
            schemeCount: snapshot.schemeCount,
            maxSchemes: snapshot.maxSchemes,
            prologueStep,
            helpOverlayOpen: guideSnapshot.helpOverlayOpen ?? false,
            helpOverlaySource: guideSnapshot.helpOverlaySource ?? null,
            firstRoundGuideSeen: normalizeFirstRoundGuideSeen(guideSnapshot.firstRoundGuideSeen),
            playerDangerStage: snapshot.playerDangerStage ?? 'safe',
            isGameOver: snapshot.isGameOver,
            gameResult: snapshot.gameResult,
            roundStartSnapshot: snapshot.roundStartSnapshot
                ? {
                    ...snapshot.roundStartSnapshot,
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
            pendingBacklash: snapshot.pendingBacklash ?? [],
            recentBacklash: snapshot.recentBacklash ?? [],
            roundHistory: snapshot.roundHistory,
            endingReport: snapshot.endingReport,
            battleReport: snapshot.battleReport,
            shuCampaign: snapshot.shuCampaign ?? { ...initialCampaignState },
            huainanCampaign: snapshot.huainanCampaign ?? { ...initialCampaignState },
        })
    },
}))
