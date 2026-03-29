import type {
    BattleReport,
    EndingReport,
    Faction,
    FirstRoundGuideSeenMap,
    GameResult,
    HelpOverlaySource,
    NationDimensions,
    NPC,
    PolicyAftereffect,
    PrologueStep,
    RelationshipEdge,
    RoundHistoryEntry,
    RoundPhase,
    SchemeAction,
} from './types'
import type { NpcFeedback } from '../stores/gameStore'
import type { PolicySettlementReport, RoundSettlementResult } from './roundSettlement'

const STORAGE_KEY = 'ningchen-save-v1'

export interface PersistedGameSnapshot {
    version: 1
    currentRound: number
    currentPhase: RoundPhase
    schemeCount: number
    maxSchemes: number
    prologueStep: PrologueStep
    helpOverlayOpen: boolean
    helpOverlaySource: HelpOverlaySource | null
    firstRoundGuideSeen: FirstRoundGuideSeenMap
    isGameOver: boolean
    gameResult: GameResult
    northStats: NationDimensions
    southStats: NationDimensions
    northPower: number
    southPower: number
    npcs: NPC[]
    factions: Faction[]
    relationships: RelationshipEdge[]
    intelProgress: Record<string, number>
    currentSchemes: SchemeAction[]
    selectedPolicyOption: number | null
    policyReason: string
    npcFeedbacks: NpcFeedback[]
    lastSettlement: RoundSettlementResult | null
    lastPolicyReport: PolicySettlementReport | null
    lastPolicyAftereffect: PolicyAftereffect | null
    roundHistory: RoundHistoryEntry[]
    endingReport: EndingReport | null
    battleReport: BattleReport | null
}

export function buildPersistedSnapshot(state: {
    currentRound: number
    currentPhase: RoundPhase
    schemeCount: number
    maxSchemes: number
    prologueStep: PrologueStep
    helpOverlayOpen: boolean
    helpOverlaySource: HelpOverlaySource | null
    firstRoundGuideSeen: FirstRoundGuideSeenMap
    isGameOver: boolean
    gameResult: GameResult
    northStats: NationDimensions
    southStats: NationDimensions
    northPower: number
    southPower: number
    npcs: NPC[]
    factions: Faction[]
    relationships: RelationshipEdge[]
    intelProgress: Record<string, number>
    currentSchemes: SchemeAction[]
    selectedPolicyOption: number | null
    policyReason: string
    npcFeedbacks: NpcFeedback[]
    lastSettlement: RoundSettlementResult | null
    lastPolicyReport: PolicySettlementReport | null
    lastPolicyAftereffect: PolicyAftereffect | null
    roundHistory: RoundHistoryEntry[]
    endingReport: EndingReport | null
    battleReport: BattleReport | null
}): PersistedGameSnapshot | null {
    const hasProgress =
        state.prologueStep !== 'PROLOGUE' ||
        state.currentRound > 1 ||
        state.currentPhase !== 'PROLOGUE' ||
        state.roundHistory.length > 0 ||
        state.currentSchemes.length > 0 ||
        state.lastSettlement !== null ||
        state.selectedPolicyOption !== null

    if (!hasProgress) return null

    return {
        version: 1,
        currentRound: state.currentRound,
        currentPhase: state.currentPhase,
        schemeCount: state.schemeCount,
        maxSchemes: state.maxSchemes,
        prologueStep: state.prologueStep,
        helpOverlayOpen: state.helpOverlayOpen,
        helpOverlaySource: state.helpOverlaySource,
        firstRoundGuideSeen: state.firstRoundGuideSeen,
        isGameOver: state.isGameOver,
        gameResult: state.gameResult,
        northStats: state.northStats,
        southStats: state.southStats,
        northPower: state.northPower,
        southPower: state.southPower,
        npcs: state.npcs,
        factions: state.factions,
        relationships: state.relationships,
        intelProgress: state.intelProgress,
        currentSchemes: state.currentSchemes,
        selectedPolicyOption: state.selectedPolicyOption,
        policyReason: state.policyReason,
        npcFeedbacks: state.npcFeedbacks,
        lastSettlement: state.lastSettlement,
        lastPolicyReport: state.lastPolicyReport,
        lastPolicyAftereffect: state.lastPolicyAftereffect,
        roundHistory: state.roundHistory,
        endingReport: state.endingReport,
        battleReport: state.battleReport,
    }
}

export function saveGameSnapshot(snapshot: PersistedGameSnapshot) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
}

export function loadGameSnapshot(): PersistedGameSnapshot | null {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    try {
        const parsed = JSON.parse(raw) as PersistedGameSnapshot
        if (parsed.version !== 1) return null
        return parsed
    } catch {
        return null
    }
}

export function clearGameSnapshot() {
    localStorage.removeItem(STORAGE_KEY)
}
