import { INITIAL_FACTIONS } from '../data/factions'
import { INITIAL_NPCS } from '../data/npcs'
import { INITIAL_RELATIONSHIP_EDGES } from '../data/npcRelationships'
import { NORTH_INITIAL, SOUTH_INITIAL } from '../data/nationStats'
import { getPolicyQuestionForRound } from '../data/policyQuestions'
import { ROUND_EVENTS } from '../data/rounds'
import { applyDelayedBacklashToState } from './aiNativeEngine'
import { getRoundStartCampaignDisplay } from './campaignDisplayEngine'
import { applyDimensionChanges } from './nationEngine'
import { settleRound } from './roundSettlement'
import { calculateCompositePower, type CampaignState, type DelayedBacklash, type Faction, type GameDifficulty, type GameResult, type NationDimensions, type NPC, type PlayerDangerStage, type PolicyAftereffect, type PolicyReasonParseResult, type RelationshipEdge, type SchemeAction } from './types'

export interface SimulationState {
    currentRound: number
    difficulty: GameDifficulty
    playerDangerStage: PlayerDangerStage
    playerSuspicionHeat: number
    invasionPressure: number
    northStats: NationDimensions
    southStats: NationDimensions
    northPower: number
    southPower: number
    npcs: NPC[]
    factions: Faction[]
    relationships: RelationshipEdge[]
    intelProgress: Record<string, number>
    lastPolicyAftereffect: PolicyAftereffect | null
    pendingBacklash: DelayedBacklash[]
    recentBacklash: DelayedBacklash[]
    shuCampaign: CampaignState
    huainanCampaign: CampaignState
    shuMomentum: number
    huainanMomentum: number
    isGameOver: boolean
    gameResult: GameResult
}

export interface SimulationRoundContext {
    round: number
    state: Readonly<SimulationState>
}

export interface SimulationRoundDecision {
    schemes?: SchemeAction[]
    policyOptionIndex?: number | null
    policyOptionLabel?: string
    policyReason?: string
    policyParse?: PolicyReasonParseResult | null
}

export interface SimulationRoundStartTrace {
    mapSrc: string
    mapLabel: string
    campaignSummary: string | null
    previousPolicyAftereffectSummary: string | null
    recentBacklashSummary: string | null
}

export interface SimulationSettlementTrace {
    gameResult: GameResult
    shuCampaignState: CampaignState['state']
    shuCampaignResolvedState: CampaignState['resolvedState']
    huainanCampaignState: CampaignState['state']
    huainanCampaignResolvedState: CampaignState['resolvedState']
    campaignReports: string[]
    externalActions: string[]
    playerSuspicionHeat: number
    invasionPressure: number
    northPower: number
    southPower: number
}

export interface SimulationRoundTrace {
    round: number
    eventName: string
    policyQuestionId: string | null
    selectedPolicyLabel: string | null
    roundStart: SimulationRoundStartTrace
    settlement: SimulationSettlementTrace
}

export interface SimulationResult {
    rounds: SimulationRoundTrace[]
    finalState: SimulationState
}

export interface SimulateGameOptions {
    throughRound: number
    initialState?: Partial<SimulationState>
    resolveRound?: (context: SimulationRoundContext) => SimulationRoundDecision | void
}

const INITIAL_CAMPAIGN_STATE: CampaignState = {
    state: 'idle',
    resolvedState: null,
    sourceRound: null,
    summary: '',
    ongoingNorthImpact: {},
    ongoingSouthImpact: {},
    remainingRounds: 0,
}

export function simulateGame(options: SimulateGameOptions): SimulationResult {
    let state = createSimulationState(options.initialState)
    const rounds: SimulationRoundTrace[] = []

    while (state.currentRound <= options.throughRound && !state.isGameOver) {
        const roundStart = buildRoundStartTrace(state)
        const question = getPolicyQuestionForRound(state.currentRound, {
            shuCampaignState: state.shuCampaign.state,
            huainanCampaignState: state.huainanCampaign.state,
        })
        const decision = options.resolveRound?.({
            round: state.currentRound,
            state,
        }) ?? {}
        const selectedPolicy = resolvePolicySelection(question, decision)
        const result = settleRound({
            round: state.currentRound,
            difficulty: state.difficulty,
            schemes: cloneSchemes(decision.schemes ?? []),
            northStats: { ...state.northStats },
            southStats: { ...state.southStats },
            npcs: cloneNpcs(state.npcs),
            factions: cloneFactions(state.factions),
            relationships: cloneRelationships(state.relationships),
            intelProgress: { ...state.intelProgress },
            playerDangerStage: state.playerDangerStage,
            playerSuspicionHeat: state.playerSuspicionHeat,
            invasionPressure: state.invasionPressure,
            policyOptionIndex: selectedPolicy.optionIndex,
            policyReason: selectedPolicy.reason,
            policyParse: decision.policyParse ?? null,
            shuCampaign: cloneCampaign(state.shuCampaign),
            huainanCampaign: cloneCampaign(state.huainanCampaign),
            shuMomentum: state.shuMomentum,
            huainanMomentum: state.huainanMomentum,
        })

        rounds.push({
            round: state.currentRound,
            eventName: ROUND_EVENTS[state.currentRound - 1]?.eventName ?? `第 ${state.currentRound} 回合`,
            policyQuestionId: question?.id ?? null,
            selectedPolicyLabel: selectedPolicy.label,
            roundStart,
            settlement: {
                gameResult: result.gameResult,
                shuCampaignState: result.shuCampaign.state,
                shuCampaignResolvedState: result.shuCampaign.resolvedState ?? result.shuCampaign.state,
                huainanCampaignState: result.huainanCampaign.state,
                huainanCampaignResolvedState: result.huainanCampaign.resolvedState ?? result.huainanCampaign.state,
                campaignReports: [...result.campaignReports],
                externalActions: result.externalActionReports.map(item => item.outcome),
                playerSuspicionHeat: result.playerSuspicionHeat,
                invasionPressure: result.invasionPressure,
                northPower: result.northPowerAfter,
                southPower: result.southPowerAfter,
            },
        })

        state = advanceSimulationState(state, result)
    }

    return {
        rounds,
        finalState: state,
    }
}

function createSimulationState(overrides: Partial<SimulationState> = {}): SimulationState {
    const npcs = cloneNpcs(overrides.npcs ?? INITIAL_NPCS)
    const factions = cloneFactions(overrides.factions ?? INITIAL_FACTIONS)
    const relationships = cloneRelationships(overrides.relationships ?? INITIAL_RELATIONSHIP_EDGES)
    const northStats = { ...(overrides.northStats ?? NORTH_INITIAL) }
    const southStats = { ...(overrides.southStats ?? SOUTH_INITIAL) }

    return {
        currentRound: overrides.currentRound ?? 1,
        difficulty: overrides.difficulty ?? 'normal',
        playerDangerStage: overrides.playerDangerStage ?? 'safe',
        playerSuspicionHeat: overrides.playerSuspicionHeat ?? 0,
        invasionPressure: overrides.invasionPressure ?? 0,
        northStats,
        southStats,
        northPower: overrides.northPower ?? calculateCompositePower(northStats),
        southPower: overrides.southPower ?? calculateCompositePower(southStats),
        npcs,
        factions,
        relationships,
        intelProgress: { ...(overrides.intelProgress ?? Object.fromEntries(INITIAL_NPCS.map(npc => [npc.id, 0]))) },
        lastPolicyAftereffect: overrides.lastPolicyAftereffect ? { ...overrides.lastPolicyAftereffect } : null,
        pendingBacklash: cloneDelayedBacklash(overrides.pendingBacklash ?? []),
        recentBacklash: cloneDelayedBacklash(overrides.recentBacklash ?? []),
        shuCampaign: cloneCampaign(overrides.shuCampaign ?? INITIAL_CAMPAIGN_STATE),
        huainanCampaign: cloneCampaign(overrides.huainanCampaign ?? INITIAL_CAMPAIGN_STATE),
        shuMomentum: overrides.shuMomentum ?? 0,
        huainanMomentum: overrides.huainanMomentum ?? 0,
        isGameOver: overrides.isGameOver ?? false,
        gameResult: overrides.gameResult ?? 'NONE',
    }
}

function buildRoundStartTrace(state: SimulationState): SimulationRoundStartTrace {
    const campaignDisplay = getRoundStartCampaignDisplay(state.currentRound, state.shuCampaign, state.huainanCampaign)
    const previousPolicyAftereffect =
        state.lastPolicyAftereffect && state.lastPolicyAftereffect.sourceRound === state.currentRound - 1
            ? state.lastPolicyAftereffect.summary
            : null

    return {
        mapSrc: campaignDisplay.map.src,
        mapLabel: campaignDisplay.map.label,
        campaignSummary: campaignDisplay.summary,
        previousPolicyAftereffectSummary: previousPolicyAftereffect,
        recentBacklashSummary: state.recentBacklash[0]?.summary ?? null,
    }
}

function resolvePolicySelection(
    question: ReturnType<typeof getPolicyQuestionForRound>,
    decision: SimulationRoundDecision,
): {
    optionIndex: number | null
    label: string | null
    reason: string
} {
    if (!question) {
        return {
            optionIndex: null,
            label: null,
            reason: '',
        }
    }

    if (typeof decision.policyOptionIndex === 'number') {
        const option = question.options[decision.policyOptionIndex]
        if (!option) {
            throw new Error(`Round ${question.round} policy option index ${decision.policyOptionIndex} is out of range.`)
        }

        return {
            optionIndex: decision.policyOptionIndex,
            label: option.label,
            reason: decision.policyReason ?? `自动测试：选择 ${option.label}。`,
        }
    }

    if (decision.policyOptionLabel) {
        const optionIndex = question.options.findIndex(option => option.label === decision.policyOptionLabel)
        if (optionIndex === -1) {
            throw new Error(`Round ${question.round} policy option label "${decision.policyOptionLabel}" was not found.`)
        }

        return {
            optionIndex,
            label: question.options[optionIndex]!.label,
            reason: decision.policyReason ?? `自动测试：选择 ${decision.policyOptionLabel}。`,
        }
    }

    return {
        optionIndex: null,
        label: null,
        reason: '',
    }
}

function advanceSimulationState(
    state: SimulationState,
    result: ReturnType<typeof settleRound>,
): SimulationState {
    const updatedIntelProgress = { ...state.intelProgress }
    for (const [npcId, count] of Object.entries(result.intelUnlocks)) {
        updatedIntelProgress[npcId] = Math.min(
            (updatedIntelProgress[npcId] ?? 0) + count,
            result.updatedNpcs.find(npc => npc.id === npcId)?.secretThreads.length ?? count,
        )
    }

    if (result.gameResult !== 'NONE') {
        return {
            currentRound: state.currentRound,
            difficulty: state.difficulty,
            playerDangerStage: result.playerDangerStage,
            playerSuspicionHeat: result.playerSuspicionHeat,
            invasionPressure: result.invasionPressure,
            northStats: { ...result.northStatsAfter },
            southStats: { ...result.southStatsAfter },
            northPower: result.northPowerAfter,
            southPower: result.southPowerAfter,
            npcs: cloneNpcs(result.updatedNpcs),
            factions: cloneFactions(result.factionsAfter),
            relationships: cloneRelationships(result.relationshipsAfter),
            intelProgress: updatedIntelProgress,
            lastPolicyAftereffect: result.policyAftereffect ? { ...result.policyAftereffect } : state.lastPolicyAftereffect,
            pendingBacklash: cloneDelayedBacklash(result.delayedBacklash),
            recentBacklash: [],
            shuCampaign: cloneCampaign(result.shuCampaign),
            huainanCampaign: cloneCampaign(result.huainanCampaign),
            shuMomentum: result.shuMomentum,
            huainanMomentum: result.huainanMomentum,
            isGameOver: true,
            gameResult: result.gameResult,
        }
    }

    const nextRound = state.currentRound + 1
    const nextLastPolicyAftereffect = result.policyAftereffect ? { ...result.policyAftereffect } : state.lastPolicyAftereffect
    const delayedPolicy =
        nextLastPolicyAftereffect && nextLastPolicyAftereffect.sourceRound === state.currentRound
            ? nextLastPolicyAftereffect
            : null
    const backlashResult = applyDelayedBacklashToState({
        backlog: result.delayedBacklash,
        currentRound: nextRound,
        npcs: cloneNpcs(result.updatedNpcs),
        northStats: { ...result.northStatsAfter },
    })
    const nextSouthStats = delayedPolicy
        ? applyDimensionChanges({ ...result.southStatsAfter }, delayedPolicy.effects)
        : { ...result.southStatsAfter }

    return {
        currentRound: nextRound,
        difficulty: state.difficulty,
        playerDangerStage: result.playerDangerStage,
        playerSuspicionHeat: result.playerSuspicionHeat,
        invasionPressure: result.invasionPressure,
        northStats: { ...backlashResult.northStats },
        southStats: nextSouthStats,
        northPower: calculateCompositePower(backlashResult.northStats),
        southPower: calculateCompositePower(nextSouthStats),
        npcs: cloneNpcs(backlashResult.npcs),
        factions: cloneFactions(result.factionsAfter),
        relationships: cloneRelationships(result.relationshipsAfter),
        intelProgress: updatedIntelProgress,
        lastPolicyAftereffect: nextLastPolicyAftereffect ? { ...nextLastPolicyAftereffect } : null,
        pendingBacklash: [],
        recentBacklash: cloneDelayedBacklash(backlashResult.appliedBacklash),
        shuCampaign: cloneCampaign(result.shuCampaign),
        huainanCampaign: cloneCampaign(result.huainanCampaign),
        shuMomentum: result.shuMomentum,
        huainanMomentum: result.huainanMomentum,
        isGameOver: false,
        gameResult: 'NONE',
    }
}

function cloneCampaign(campaign: CampaignState): CampaignState {
    return {
        ...campaign,
        resolvedState: campaign.resolvedState ?? campaign.state,
        ongoingNorthImpact: { ...campaign.ongoingNorthImpact },
        ongoingSouthImpact: { ...campaign.ongoingSouthImpact },
    }
}

function cloneNpcs(npcs: NPC[]): NPC[] {
    return npcs.map(npc => ({
        ...npc,
        highRounds: [...npc.highRounds],
        secretThreads: [...npc.secretThreads],
        availableSchemes: [...npc.availableSchemes],
    }))
}

function cloneFactions(factions: Faction[]): Faction[] {
    return factions.map(faction => ({ ...faction }))
}

function cloneRelationships(relationships: RelationshipEdge[]): RelationshipEdge[] {
    return relationships.map(edge => ({ ...edge }))
}

function cloneSchemes(schemes: SchemeAction[]): SchemeAction[] {
    return schemes.map(action => ({
        ...action,
        northParse: action.northParse ? {
            ...action.northParse,
            evidence: [...action.northParse.evidence],
        } : action.northParse,
    }))
}

function cloneDelayedBacklash(items: DelayedBacklash[]): DelayedBacklash[] {
    return items.map(item => ({ ...item }))
}
