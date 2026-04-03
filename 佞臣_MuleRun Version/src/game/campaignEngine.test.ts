import { describe, expect, it } from 'vitest'
import { evaluateHuainanCampaignOutcome, evaluateShuCampaignOutcome, tickCampaignFallout } from './campaignEngine'

describe('campaignEngine', () => {
    it('adds shu momentum bonus into round 10 campaign scoring', () => {
        const withoutMomentum = evaluateShuCampaignOutcome({
            round: 10,
            southStats: { finance: 55, grain: 60, military: 58, socialOrder: 56, governance: 58 },
            northStats: { finance: 60, grain: 63, military: 70, socialOrder: 54, governance: 58 },
            northPressurePenalty: 4,
            policyBoost: 2,
            momentumBonus: 0,
        })

        const withMomentum = evaluateShuCampaignOutcome({
            round: 10,
            southStats: { finance: 55, grain: 60, military: 58, socialOrder: 56, governance: 58 },
            northStats: { finance: 60, grain: 63, military: 70, socialOrder: 54, governance: 58 },
            northPressurePenalty: 4,
            policyBoost: 2,
            momentumBonus: 3,
        })

        expect(withoutMomentum.state).toBe('failed')
        expect(withMomentum.state).not.toBe('failed')
    })

    it('marks shu campaign as gained when south prep beats north effective commitment', () => {
        const result = evaluateShuCampaignOutcome({
            round: 10,
            southStats: { finance: 62, grain: 70, military: 68, socialOrder: 58, governance: 66 },
            northStats: { finance: 60, grain: 63, military: 74, socialOrder: 50, governance: 58 },
            northPressurePenalty: 8,
            policyBoost: 4,
        })

        expect(result.state).toBe('gained')
        expect((result.instantNorthImpact.governance ?? 0)).toBeLessThan(0)
        expect(result.remainingRounds).toBeGreaterThan(0)
    })

    it('leans toward stalemate for more modest normal-mode battle advantages', () => {
        const result = evaluateShuCampaignOutcome({
            round: 10,
            southStats: { finance: 54, grain: 61, military: 58, socialOrder: 56, governance: 60 },
            northStats: { finance: 60, grain: 63, military: 70, socialOrder: 54, governance: 58 },
            northPressurePenalty: 4,
            policyBoost: 2.5,
        })

        expect(result.state).toBe('stalemate')
        expect((result.instantNorthImpact.governance ?? 0)).toBeLessThan(0)
        expect((result.instantNorthImpact.governance ?? 0)).toBeGreaterThan(-2)
    })

    it('marks huainan campaign as failed when south prep is too weak', () => {
        const result = evaluateHuainanCampaignOutcome({
            round: 16,
            southStats: { finance: 45, grain: 48, military: 50, socialOrder: 46, governance: 50 },
            northStats: { finance: 68, grain: 70, military: 77, socialOrder: 60, governance: 61 },
            northPressurePenalty: 1,
            policyBoost: 0,
        })

        expect(result.state).toBe('failed')
        expect((result.instantSouthImpact.military ?? 0)).toBeLessThan(0)
        expect(result.remainingRounds).toBe(0)
    })

    it('ticks campaign fallout down and clears finished fallout', () => {
        const progressed = tickCampaignFallout({
            state: 'gained',
            sourceRound: 10,
            summary: '蜀地已得手',
            ongoingNorthImpact: { governance: -1.2 },
            ongoingSouthImpact: { grain: 1.1 },
            remainingRounds: 2,
        })

        expect(progressed.applied).toBeTruthy()
        expect(progressed.nextCampaign.remainingRounds).toBe(1)
        expect(progressed.nextCampaign.state).toBe('gained')

        const cleared = tickCampaignFallout({
            ...progressed.nextCampaign,
            remainingRounds: 1,
        })

        expect(cleared.nextCampaign.state).toBe('idle')
        expect(cleared.nextCampaign.remainingRounds).toBe(0)
    })
})
