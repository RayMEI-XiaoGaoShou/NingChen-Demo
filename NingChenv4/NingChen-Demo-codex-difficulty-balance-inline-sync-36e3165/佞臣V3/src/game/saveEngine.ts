import type {
    BattleReport,
    CampaignState,
    DelayedBacklash,
    EndingReport,
    Faction,
    FirstRoundGuideSeenMap,
    GameResult,
    GameDifficulty,
    HelpOverlaySource,
    NationDimensions,
    NPC,
    OmenGuideSeenMap,
    PlayerDangerStage,
    PolicyAftereffect,
    PolicyReasonParseResult,
    PrologueStep,
    RelationshipEdge,
    RoundHistoryEntry,
    RoundPhase,
    SchemeOnboardingSeenMap,
    SchemeAction,
} from './types'
import type { NpcFeedback } from '../stores/gameStore'
import type { PolicySettlementReport, RoundSettlementResult } from './roundSettlement'

const STORAGE_KEY = 'ningchen-save-v1'

export interface GameSnapshotCore {
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
    selectedPolicyParse: PolicyReasonParseResult | null
    npcFeedbacks: NpcFeedback[]
    pendingStructuredSchemeIds: string[]
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
    shuMomentum: number
    huainanMomentum: number
}

export interface RoundStartSnapshot extends GameSnapshotCore {}

export interface PersistedGameSnapshot extends GameSnapshotCore {
    version: 1
    roundStartSnapshot: RoundStartSnapshot | null
}

function buildSnapshotCore(state: GameSnapshotCore): GameSnapshotCore {
    return {
        currentRound: state.currentRound,
        currentPhase: state.currentPhase,
        difficulty: state.difficulty,
        schemeCount: state.schemeCount,
        maxSchemes: state.maxSchemes,
        prologueStep: state.prologueStep,
        helpOverlayOpen: state.helpOverlayOpen,
        helpOverlaySource: state.helpOverlaySource,
        firstRoundGuideSeen: state.firstRoundGuideSeen,
        schemeOnboardingSeen: state.schemeOnboardingSeen,
        omenGuideSeen: state.omenGuideSeen,
        fengDaozhiAssistsRemaining: state.fengDaozhiAssistsRemaining,
        playerDangerStage: state.playerDangerStage,
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
        selectedPolicyParse: state.selectedPolicyParse,
        npcFeedbacks: state.npcFeedbacks,
        pendingStructuredSchemeIds: state.pendingStructuredSchemeIds,
        lastSettlement: state.lastSettlement,
        lastPolicyReport: state.lastPolicyReport,
        lastPolicyAftereffect: state.lastPolicyAftereffect,
        pendingBacklash: state.pendingBacklash,
        recentBacklash: state.recentBacklash,
        roundHistory: state.roundHistory,
        endingReport: state.endingReport,
        battleReport: state.battleReport,
        shuCampaign: state.shuCampaign,
        huainanCampaign: state.huainanCampaign,
        shuMomentum: state.shuMomentum,
        huainanMomentum: state.huainanMomentum,
    }
}

export function buildRoundStartSnapshot(state: GameSnapshotCore): RoundStartSnapshot {
    return buildSnapshotCore(state)
}

export function buildPersistedSnapshot(
    state: GameSnapshotCore & { roundStartSnapshot: RoundStartSnapshot | null },
): PersistedGameSnapshot | null {
    const hasProgress =
        (state.prologueStep !== 'COVER' && state.prologueStep !== 'PROLOGUE') ||
        state.currentRound > 1 ||
        state.currentPhase !== 'PROLOGUE' ||
        state.roundHistory.length > 0 ||
        state.currentSchemes.length > 0 ||
        state.lastSettlement !== null ||
        state.selectedPolicyOption !== null

    if (!hasProgress) return null

    return {
        version: 1,
        ...buildSnapshotCore(state),
        roundStartSnapshot: state.roundStartSnapshot ? buildSnapshotCore(state.roundStartSnapshot) : null,
    }
}

export function saveGameSnapshot(snapshot: PersistedGameSnapshot) {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
}

export function loadGameSnapshot(): PersistedGameSnapshot | null {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    try {
        const parsed = JSON.parse(raw) as PersistedGameSnapshot & {
            difficulty?: GameDifficulty
            schemeOnboardingSeen?: SchemeOnboardingSeenMap
            omenGuideSeen?: OmenGuideSeenMap
            fengDaozhiAssistsRemaining?: number
            shuMomentum?: number
            huainanMomentum?: number
        }
        if (parsed.version !== 1) return null
        return {
            ...parsed,
            difficulty: parsed.difficulty ?? 'normal',
            schemeOnboardingSeen: Object.assign(
                {
                    scheme_master_guide: false,
                    first_omen_teaching: false,
                    first_external_line_teaching: false,
                    first_follow_up_teaching: false,
                },
                parsed.schemeOnboardingSeen ?? {},
            ),
            omenGuideSeen: parsed.omenGuideSeen ?? { first_omen_modal: false },
            fengDaozhiAssistsRemaining: parsed.fengDaozhiAssistsRemaining ?? 0,
            shuMomentum: parsed.shuMomentum ?? 0,
            huainanMomentum: parsed.huainanMomentum ?? 0,
        }
    } catch {
        return null
    }
}

export function clearGameSnapshot() {
    if (typeof localStorage === 'undefined') return
    localStorage.removeItem(STORAGE_KEY)
}

export function hasSavedGameSnapshot(): boolean {
    return loadGameSnapshot() !== null
}
