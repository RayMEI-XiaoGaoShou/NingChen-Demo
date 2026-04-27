import { isDisasterRound } from '../data/roundRuleConfig'
import {
    checkDeathConditionWithPressure,
    checkEarlyInvasionWithPressure,
} from './nationEngine'
import {
    deriveRoundPressureUpdate,
    type PressureState,
    type PressureUpdate,
} from './pressureEngine'
import type {
    DelayedBacklash,
    Faction,
    GameDifficulty,
    NationDimensions,
    NPC,
    PlayerDangerStage,
    SchemeAction,
} from './types'
import type { SchemeResult } from './schemeEngine'

export interface SettlementPressureFlowResult {
    previousPressureState: PressureState
    invasionDiagnostics: ReturnType<typeof checkEarlyInvasionWithPressure>
    pressureUpdate: PressureUpdate
    deathCheck: ReturnType<typeof checkDeathConditionWithPressure>
    invasionCheck: ReturnType<typeof checkEarlyInvasionWithPressure>
}

export function deriveSettlementPressureFlow(params: {
    round: number
    difficulty: GameDifficulty
    previousPlayerSuspicionHeat?: number
    previousInvasionPressure?: number
    playerDangerStage?: PlayerDangerStage
    schemes: SchemeAction[]
    schemeResults: SchemeResult[]
    npcsBefore: NPC[]
    npcsAfter: NPC[]
    factionsBefore: Faction[]
    factionsAfter: Faction[]
    northBefore: NationDimensions
    northAfter: NationDimensions
    delayedBacklash: DelayedBacklash[]
}): SettlementPressureFlowResult {
    const previousPressureState = {
        playerSuspicionHeat: params.previousPlayerSuspicionHeat ?? 0,
        invasionPressure: params.previousInvasionPressure ?? 0,
    }

    const invasionDiagnostics = checkEarlyInvasionWithPressure(
        params.northAfter,
        params.factionsAfter,
        params.npcsAfter,
        isDisasterRound(params.round),
        params.round,
        {
            current: previousPressureState.invasionPressure,
            previous: previousPressureState.invasionPressure,
            difficulty: params.difficulty,
        },
    )

    const pressureUpdate = deriveRoundPressureUpdate({
        round: params.round,
        difficulty: params.difficulty,
        previous: previousPressureState,
        schemes: params.schemes,
        schemeResults: params.schemeResults,
        npcsBefore: params.npcsBefore,
        npcsAfter: params.npcsAfter,
        factionsBefore: params.factionsBefore,
        factionsAfter: params.factionsAfter,
        northBefore: params.northBefore,
        northAfter: params.northAfter,
        delayedBacklash: params.delayedBacklash,
        invasionPoliticalRatio: invasionDiagnostics.politicalWillRatio,
        invasionWarCapabilityMet: invasionDiagnostics.warCapabilityMet,
    })

    const deathCheck = checkDeathConditionWithPressure(
        params.npcsAfter,
        params.factionsAfter,
        params.round,
        params.playerDangerStage ?? 'safe',
        pressureUpdate.playerSuspicionHeat,
        previousPressureState.playerSuspicionHeat,
    )

    const invasionCheck = checkEarlyInvasionWithPressure(
        params.northAfter,
        params.factionsAfter,
        params.npcsAfter,
        isDisasterRound(params.round),
        params.round,
        {
            current: pressureUpdate.invasionPressure,
            previous: previousPressureState.invasionPressure,
            difficulty: params.difficulty,
        },
    )

    return {
        previousPressureState,
        invasionDiagnostics,
        pressureUpdate,
        deathCheck,
        invasionCheck,
    }
}
