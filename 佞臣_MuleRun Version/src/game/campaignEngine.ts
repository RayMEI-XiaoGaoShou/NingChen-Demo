import { getDifficultyProfile } from './difficulty'
import type { CampaignState, GameDifficulty, NationDimensions } from './types'

export interface CampaignEvaluationInput {
    round: number
    difficulty?: GameDifficulty
    southStats: NationDimensions
    northStats: NationDimensions
    northPressurePenalty: number
    policyBoost: number
    preparednessBonus?: number
    momentumBonus?: number
}

export interface CampaignEvaluationResult extends CampaignState {
    instantNorthImpact: Partial<NationDimensions>
    instantSouthImpact: Partial<NationDimensions>
}

export function evaluateShuCampaignOutcome(input: CampaignEvaluationInput): CampaignEvaluationResult {
    const profile = getDifficultyProfile(input.difficulty ?? 'normal')
    const southPrep =
        (
            input.southStats.military * 0.34 +
            input.southStats.grain * 0.31 +
            input.southStats.governance * 0.25 +
            input.policyBoost * 2.1 +
            (input.preparednessBonus ?? 0)
        ) * profile.campaign.southPrepMultiplier
    const northCommitmentBase =
        input.northStats.military * 0.24 +
        input.northStats.grain * 0.18 +
        input.northStats.finance * 0.14 +
        input.northStats.governance * 0.2
    const northCommitment =
        northCommitmentBase - input.northPressurePenalty * profile.campaign.northPressureWeight

    const score = southPrep - northCommitment + profile.campaign.scoreBias + (input.momentumBonus ?? 0)
    return buildCampaignResult('shu', input.round, score, profile.campaign.gainedThreshold, profile.campaign.stalemateThreshold)
}

export function evaluateHuainanCampaignOutcome(input: CampaignEvaluationInput): CampaignEvaluationResult {
    const profile = getDifficultyProfile(input.difficulty ?? 'normal')
    const southPrep =
        (
            input.southStats.military * 0.32 +
            input.southStats.grain * 0.22 +
            input.southStats.finance * 0.16 +
            input.southStats.socialOrder * 0.12 +
            input.policyBoost * 2.2
        ) * profile.campaign.southPrepMultiplier
    const northCommitmentBase =
        input.northStats.military * 0.28 +
        input.northStats.grain * 0.19 +
        input.northStats.finance * 0.17 +
        input.northStats.governance * 0.13
    const northCommitment =
        northCommitmentBase - input.northPressurePenalty * profile.campaign.northPressureWeight

    const score = southPrep - northCommitment + profile.campaign.scoreBias + (input.momentumBonus ?? 0)
    return buildCampaignResult('huainan', input.round, score, profile.campaign.gainedThreshold, profile.campaign.stalemateThreshold)
}

export function tickCampaignFallout(campaign: CampaignState): {
    applied: boolean
    northImpact: Partial<NationDimensions>
    southImpact: Partial<NationDimensions>
    nextCampaign: CampaignState
} {
    if (campaign.state === 'idle' || campaign.remainingRounds <= 0) {
        return {
            applied: false,
            northImpact: {},
            southImpact: {},
            nextCampaign: makeIdleCampaign(campaign.resolvedState ?? campaign.state),
        }
    }

    const remaining = campaign.remainingRounds - 1
    return {
        applied: true,
        northImpact: campaign.ongoingNorthImpact,
        southImpact: campaign.ongoingSouthImpact,
        nextCampaign: remaining > 0
            ? {
                ...campaign,
                remainingRounds: remaining,
            }
            : makeIdleCampaign(campaign.resolvedState ?? campaign.state),
    }
}

function buildCampaignResult(
    campaign: 'shu' | 'huainan',
    round: number,
    score: number,
    gainedThreshold: number,
    stalemateThreshold: number,
): CampaignEvaluationResult {
    if (score >= gainedThreshold) {
        return campaign === 'shu'
            ? {
                state: 'gained',
                resolvedState: 'gained',
                sourceRound: round,
                summary: '蜀地方向得手，北周西线顿失从容。',
                ongoingNorthImpact: { governance: -1.2, grain: -0.8 },
                ongoingSouthImpact: { grain: 1.1, governance: 0.8, finance: 0.6 },
                remainingRounds: 2,
                instantNorthImpact: { finance: -2.4, grain: -1.6, military: -1.5, socialOrder: -1.1, governance: -2.6 },
                instantSouthImpact: {},
            }
            : {
                state: 'gained',
                resolvedState: 'gained',
                sourceRound: round,
                summary: '淮南方向得手，北周前线与粮运一时震动。',
                ongoingNorthImpact: { military: -1.2, finance: -0.9, socialOrder: -0.8 },
                ongoingSouthImpact: { military: 1.0, grain: 0.8, governance: 0.6 },
                remainingRounds: 2,
                instantNorthImpact: { finance: -1.8, grain: -2.3, military: -2.8, socialOrder: -1.5, governance: -1.7 },
                instantSouthImpact: {},
            }
    }

    if (score >= stalemateThreshold) {
        return campaign === 'shu'
            ? {
                state: 'stalemate',
                resolvedState: 'stalemate',
                sourceRound: round,
                summary: '蜀地战局一时僵持，双方都被迫继续投入。',
                ongoingNorthImpact: { governance: -0.7, grain: -0.4 },
                ongoingSouthImpact: { military: -0.3, finance: -0.3 },
                remainingRounds: 2,
                instantNorthImpact: { finance: -0.8, grain: -0.6, military: -0.5, socialOrder: -0.4, governance: -0.9 },
                instantSouthImpact: {},
            }
            : {
                state: 'stalemate',
                resolvedState: 'stalemate',
                sourceRound: round,
                summary: '淮南战局胶着，双方都被拖入久战。',
                ongoingNorthImpact: { military: -0.7, finance: -0.5, socialOrder: -0.5 },
                ongoingSouthImpact: { military: -0.4, finance: -0.3 },
                remainingRounds: 2,
                instantNorthImpact: { finance: -0.8, grain: -0.9, military: -1.0, socialOrder: -0.7, governance: -0.6 },
                instantSouthImpact: {},
            }
    }

    return {
        state: 'failed',
        resolvedState: 'failed',
        sourceRound: round,
        summary: campaign === 'shu'
            ? '征蜀失利，南陈不得不先行止损。'
            : '淮南受挫，南陈被迫转入守线与收束。',
        ongoingNorthImpact: {},
        ongoingSouthImpact: {},
        remainingRounds: 0,
        instantNorthImpact: {},
        instantSouthImpact: campaign === 'shu'
            ? { military: -1.2, finance: -0.9, socialOrder: -0.7 }
            : { military: -1.6, finance: -1.1, socialOrder: -0.9 },
    }
}

function makeIdleCampaign(resolvedState: CampaignState['resolvedState'] = null): CampaignState {
    return {
        state: 'idle',
        resolvedState,
        sourceRound: null,
        summary: '',
        ongoingNorthImpact: {},
        ongoingSouthImpact: {},
        remainingRounds: 0,
    }
}
