import type {
    BattleReport,
    CampaignState,
    DelayedBacklash,
    EmpressReplyRecord,
    EndingReport,
    Faction,
    FengDaozhiGuideSeenMap,
    FirstRoundGuideSeenMap,
    GameResult,
    GameDifficulty,
    HelpOverlaySource,
    NationDimensions,
    NPC,
    NpcMemoryLedger,
    OmenGuideSeenMap,
    PlayerDangerStage,
    PolicyAftereffect,
    PolicyReasonParseResult,
    PrologueStep,
    RelationshipEdge,
    RelationMemoryLedger,
    RoundHistoryEntry,
    RoundPhase,
    SchemeOnboardingSeenMap,
    SchemeAction,
    WorldMemoryLedger,
} from './types'
import type { NpcFeedback } from '../stores/gameStore'
import { normalizeCourtDispositionNpcs } from './courtDisposition'
import type { PolicySettlementReport, RoundSettlementResult } from './roundSettlement'
import type { DowagerOfferingRecord, PendingDowagerOffering } from './dowagerOffering'
import { INITIAL_DOWAGER_FAVOR } from './dowagerOffering'

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
    fengDaozhiGuideSeen: FengDaozhiGuideSeenMap
    fengDaozhiAssistsRemaining: number
    playerDangerStage: PlayerDangerStage
    playerSuspicionHeat?: number
    dowagerFavor?: number
    lastDowagerFavorDecayRound?: number | null
    pendingDowagerOffering?: PendingDowagerOffering | null
    dowagerOfferingRecords?: DowagerOfferingRecord[]
    invasionPressure?: number
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
    empressReplyRecord: EmpressReplyRecord | null
    pendingBacklash: DelayedBacklash[]
    recentBacklash: DelayedBacklash[]
    roundHistory: RoundHistoryEntry[]
    npcMemoryLedger: NpcMemoryLedger
    relationMemoryLedger?: RelationMemoryLedger
    worldMemoryLedger?: WorldMemoryLedger
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

type SnapshotCoreInput = Omit<GameSnapshotCore, 'fengDaozhiGuideSeen'> & Partial<Pick<GameSnapshotCore, 'fengDaozhiGuideSeen'>>

const LEGACY_SCHEME_PAGE_PHASE = ['SCHEME', 'PHASE'].join('_')
const LEGACY_POST_SETTLEMENT_PHASE = ['ROUND', 'END'].join('_')

export function normalizePersistedRoundPhase(
    phase: RoundPhase | string,
    schemeCount = 0,
    maxSchemes = 3,
): RoundPhase {
    if (phase === LEGACY_SCHEME_PAGE_PHASE) {
        return schemeCount >= maxSchemes ? 'EMPRESS_LETTER' : 'COURT_OBSERVE'
    }

    if (phase === LEGACY_POST_SETTLEMENT_PHASE) {
        return 'SETTLEMENT'
    }

    return phase as RoundPhase
}

function buildSnapshotCore(state: SnapshotCoreInput): GameSnapshotCore {
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
        fengDaozhiGuideSeen: state.fengDaozhiGuideSeen ?? {},
        fengDaozhiAssistsRemaining: state.fengDaozhiAssistsRemaining,
        playerDangerStage: state.playerDangerStage,
        playerSuspicionHeat: state.playerSuspicionHeat ?? 0,
        dowagerFavor: state.dowagerFavor ?? INITIAL_DOWAGER_FAVOR,
        lastDowagerFavorDecayRound: state.lastDowagerFavorDecayRound ?? null,
        pendingDowagerOffering: state.pendingDowagerOffering ?? null,
        dowagerOfferingRecords: state.dowagerOfferingRecords ?? [],
        invasionPressure: state.invasionPressure ?? 0,
        isGameOver: state.isGameOver,
        gameResult: state.gameResult,
        northStats: state.northStats,
        southStats: state.southStats,
        northPower: state.northPower,
        southPower: state.southPower,
        npcs: normalizeCourtDispositionNpcs(state.npcs),
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
        empressReplyRecord: state.empressReplyRecord,
        pendingBacklash: state.pendingBacklash,
        recentBacklash: state.recentBacklash,
        roundHistory: state.roundHistory,
        npcMemoryLedger: state.npcMemoryLedger,
        relationMemoryLedger: state.relationMemoryLedger ?? {},
        worldMemoryLedger: state.worldMemoryLedger ?? [],
        endingReport: state.endingReport,
        battleReport: state.battleReport,
        shuCampaign: state.shuCampaign,
        huainanCampaign: state.huainanCampaign,
        shuMomentum: state.shuMomentum,
        huainanMomentum: state.huainanMomentum,
    }
}

export function buildRoundStartSnapshot(state: SnapshotCoreInput): RoundStartSnapshot {
    return buildSnapshotCore(state)
}

export function buildPersistedSnapshot(
    state: SnapshotCoreInput & { roundStartSnapshot: SnapshotCoreInput | null },
): PersistedGameSnapshot | null {
    const hasProgress =
        (state.prologueStep !== 'COVER' && state.prologueStep !== 'PROLOGUE') ||
        state.currentRound > 1 ||
        state.currentPhase !== 'PROLOGUE' ||
        state.roundHistory.length > 0 ||
        state.currentSchemes.length > 0 ||
        state.pendingDowagerOffering != null ||
        (state.dowagerOfferingRecords?.length ?? 0) > 0 ||
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
            currentPhase?: RoundPhase | string
            difficulty?: GameDifficulty
            schemeOnboardingSeen?: SchemeOnboardingSeenMap
            omenGuideSeen?: OmenGuideSeenMap
            fengDaozhiGuideSeen?: FengDaozhiGuideSeenMap
            fengDaozhiAssistsRemaining?: number
            shuMomentum?: number
            huainanMomentum?: number
            npcMemoryLedger?: NpcMemoryLedger
            relationMemoryLedger?: RelationMemoryLedger
            worldMemoryLedger?: WorldMemoryLedger
            empressReplyRecord?: EmpressReplyRecord | null
            playerSuspicionHeat?: number
            dowagerFavor?: number
            lastDowagerFavorDecayRound?: number | null
            pendingDowagerOffering?: PendingDowagerOffering | null
            dowagerOfferingRecords?: DowagerOfferingRecord[]
            invasionPressure?: number
        }
        if (parsed.version !== 1) return null
        const normalizedCurrentPhase = normalizePersistedRoundPhase(
            parsed.currentPhase ?? 'ROUND_START',
            parsed.schemeCount,
            parsed.maxSchemes,
        )
        return {
            ...parsed,
            currentPhase: normalizedCurrentPhase,
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
            fengDaozhiGuideSeen: parsed.fengDaozhiGuideSeen ?? {},
            fengDaozhiAssistsRemaining: parsed.fengDaozhiAssistsRemaining ?? 0,
            npcs: normalizeCourtDispositionNpcs(parsed.npcs ?? []),
            roundStartSnapshot: parsed.roundStartSnapshot
                ? {
                    ...parsed.roundStartSnapshot,
                    currentPhase: normalizePersistedRoundPhase(
                        parsed.roundStartSnapshot.currentPhase as RoundPhase | string,
                        parsed.roundStartSnapshot.schemeCount,
                        parsed.roundStartSnapshot.maxSchemes,
                    ),
                    npcs: normalizeCourtDispositionNpcs(parsed.roundStartSnapshot.npcs ?? []),
                    relationMemoryLedger: parsed.roundStartSnapshot.relationMemoryLedger ?? {},
                    worldMemoryLedger: parsed.roundStartSnapshot.worldMemoryLedger ?? [],
                    empressReplyRecord: parsed.roundStartSnapshot.empressReplyRecord ?? null,
                    fengDaozhiGuideSeen: parsed.roundStartSnapshot.fengDaozhiGuideSeen ?? {},
                    playerSuspicionHeat: parsed.roundStartSnapshot.playerSuspicionHeat ?? 0,
                    dowagerFavor: parsed.roundStartSnapshot.dowagerFavor ?? INITIAL_DOWAGER_FAVOR,
                    lastDowagerFavorDecayRound: parsed.roundStartSnapshot.lastDowagerFavorDecayRound ?? null,
                    pendingDowagerOffering: parsed.roundStartSnapshot.pendingDowagerOffering ?? null,
                    dowagerOfferingRecords: parsed.roundStartSnapshot.dowagerOfferingRecords ?? [],
                    invasionPressure: parsed.roundStartSnapshot.invasionPressure ?? 0,
                }
                : null,
            empressReplyRecord: parsed.empressReplyRecord ?? null,
            playerSuspicionHeat: parsed.playerSuspicionHeat ?? 0,
            dowagerFavor: parsed.dowagerFavor ?? INITIAL_DOWAGER_FAVOR,
            lastDowagerFavorDecayRound: parsed.lastDowagerFavorDecayRound ?? null,
            pendingDowagerOffering: parsed.pendingDowagerOffering ?? null,
            dowagerOfferingRecords: parsed.dowagerOfferingRecords ?? [],
            invasionPressure: parsed.invasionPressure ?? 0,
            shuMomentum: parsed.shuMomentum ?? 0,
            huainanMomentum: parsed.huainanMomentum ?? 0,
            npcMemoryLedger: parsed.npcMemoryLedger ?? {},
            relationMemoryLedger: parsed.relationMemoryLedger ?? {},
            worldMemoryLedger: parsed.worldMemoryLedger ?? [],
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
