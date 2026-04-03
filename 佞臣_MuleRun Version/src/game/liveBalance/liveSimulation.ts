import { INITIAL_FACTIONS } from '../../data/factions'
import { INITIAL_NPCS } from '../../data/npcs'
import { INITIAL_RELATIONSHIP_EDGES } from '../../data/npcRelationships'
import { NORTH_INITIAL, SOUTH_INITIAL } from '../../data/nationStats'
import { getPolicyQuestionForRound } from '../../data/policyQuestions'
import { applyDelayedBacklashToState } from '../aiNativeEngine'
import { applyDimensionChanges } from '../nationEngine'
import { settleRound } from '../roundSettlement'
import {
    calculateCompositePower,
    type CampaignState,
    type DelayedBacklash,
    type Faction,
    type NorthSchemeParseResult,
    type NPC,
    type PolicyReasonParseResult,
    type RelationshipEdge,
    type SchemeAction,
} from '../types'
import type { SimulationState } from '../simulationRunner'
import { runNorthLiveParse, runPolicyLiveParse } from './liveParseRunner'
import type { BalanceSample, LiveParseRecord, SampleRunSnapshot, SampleRunSummary } from './types'

const INITIAL_CAMPAIGN_STATE: CampaignState = {
    state: 'idle',
    resolvedState: null,
    sourceRound: null,
    summary: '',
    ongoingNorthImpact: {},
    ongoingSouthImpact: {},
    remainingRounds: 0,
}

export interface LiveBalanceSampleResult {
    summary: SampleRunSummary
    parseRecords: LiveParseRecord[]
    snapshots: SampleRunSnapshot[]
    finalState: SimulationState
}

function getNorthParse(record: LiveParseRecord): NorthSchemeParseResult | undefined {
    return record.kind === 'north' ? record.normalized as NorthSchemeParseResult : undefined
}

function getPolicyParse(record: LiveParseRecord): PolicyReasonParseResult | null {
    return record.kind === 'policy' ? record.normalized as PolicyReasonParseResult | null : null
}

export async function runLiveBalanceSample(sample: BalanceSample): Promise<LiveBalanceSampleResult> {
    let state = createSimulationState({ difficulty: sample.difficulty })
    const parseRecords: LiveParseRecord[] = []
    const snapshots: SampleRunSnapshot[] = []

    for (const roundPlan of sample.rounds) {
        if (state.isGameOver) break

        const question = getPolicyQuestionForRound(state.currentRound, {
            shuCampaignState: state.shuCampaign.state,
            huainanCampaignState: state.huainanCampaign.state,
        })

        const schemes: SchemeAction[] = []
        for (let index = 0; index < roundPlan.schemes.length; index += 1) {
            const schemePlan = roundPlan.schemes[index]!
            const npc = state.npcs.find(item => item.id === schemePlan.targetNpcId)
            if (!npc) {
                throw new Error(`Sample ${sample.id} references unknown NPC ${schemePlan.targetNpcId} on round ${state.currentRound}.`)
            }

            const relatedNpc = schemePlan.relatedNpcId
                ? state.npcs.find(item => item.id === schemePlan.relatedNpcId) ?? null
                : null

            const parseRecord = await runNorthLiveParse({
                round: state.currentRound,
                npc,
                speech: schemePlan.speech,
                schemeType: schemePlan.schemeType,
                relatedNpc,
            })
            parseRecords.push(parseRecord)

            schemes.push({
                id: `${sample.id}-round-${state.currentRound}-scheme-${index + 1}`,
                targetNpcId: schemePlan.targetNpcId,
                relatedNpcId: schemePlan.relatedNpcId,
                schemeType: schemePlan.schemeType,
                playerSpeech: schemePlan.speech,
                resolutionRoll: deterministicRoll(sample.id, state.currentRound, index),
                northParse: getNorthParse(parseRecord),
            })
        }

        let policyParse = null
        if (question) {
            const option = question.options[roundPlan.policy.optionIndex]
            if (!option) {
                throw new Error(`Sample ${sample.id} uses invalid policy option index ${roundPlan.policy.optionIndex} on round ${state.currentRound}.`)
            }

            const parseRecord = await runPolicyLiveParse({
                round: state.currentRound,
                topic: question.topic,
                question: question.question,
                reason: roundPlan.policy.reason,
                meta: {
                    legitimacyEffect: option.legitimacyEffect,
                    aiScoringFocus: question.aiScoringFocus,
                    round: state.currentRound,
                },
            })
            parseRecords.push(parseRecord)
            policyParse = getPolicyParse(parseRecord)
        }

        const settlement = settleRound({
            round: state.currentRound,
            difficulty: state.difficulty,
            schemes,
            northStats: { ...state.northStats },
            southStats: { ...state.southStats },
            npcs: cloneNpcs(state.npcs),
            factions: cloneFactions(state.factions),
            relationships: cloneRelationships(state.relationships),
            intelProgress: { ...state.intelProgress },
            playerDangerStage: state.playerDangerStage,
            policyOptionIndex: question ? roundPlan.policy.optionIndex : null,
            policyReason: question ? roundPlan.policy.reason : '',
            policyParse,
            shuCampaign: cloneCampaign(state.shuCampaign),
            huainanCampaign: cloneCampaign(state.huainanCampaign),
            shuMomentum: state.shuMomentum,
            huainanMomentum: state.huainanMomentum,
        })

        snapshots.push({
            round: state.currentRound,
            northPower: settlement.northPowerAfter,
            southPower: settlement.southPowerAfter,
            gameResult: settlement.gameResult,
        })

        state = advanceSimulationState(state, settlement)
    }

    return {
        summary: {
            sampleId: sample.id,
            level: sample.level,
            strategy: sample.strategy,
            difficulty: sample.difficulty,
            gameResult: state.gameResult,
            northPower: state.northPower,
            southPower: state.southPower,
            round10Gap: roundValue((snapshots.find(item => item.round === 10)?.southPower ?? state.southPower) - (snapshots.find(item => item.round === 10)?.northPower ?? state.northPower)),
            shuResolvedState: state.shuCampaign.resolvedState ?? state.shuCampaign.state,
            huainanResolvedState: state.huainanCampaign.resolvedState ?? state.huainanCampaign.state,
            anySecession: state.npcs.some(npc => npc.externalStatus === 'secession'),
            anyRebellion: state.npcs.some(npc => npc.externalStatus === 'rebellion'),
            degraded: parseRecords.some(record => record.mode === 'fallback'),
        },
        parseRecords,
        snapshots,
        finalState: state,
    }
}

function deterministicRoll(sampleId: string, round: number, index: number): number {
    const seed = Array.from(sampleId).reduce((sum, char) => sum + char.charCodeAt(0), 0)
    return ((seed + round * 17 + index * 7) % 90) / 100
}

function roundValue(value: number): number {
    return Math.round(value * 10) / 10
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

function cloneDelayedBacklash(items: DelayedBacklash[]): DelayedBacklash[] {
    return items.map(item => ({ ...item }))
}
