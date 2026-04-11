import { describe, expect, it } from 'vitest'
import { getCampaignResolvedState, getRoundStartCampaignDisplay } from './campaignDisplayEngine'
import type { CampaignState } from './types'

function makeCampaignState(overrides: Partial<CampaignState> = {}): CampaignState {
    return {
        state: 'idle',
        sourceRound: null,
        summary: '',
        ongoingNorthImpact: {},
        ongoingSouthImpact: {},
        remainingRounds: 0,
        resolvedState: null,
        ...overrides,
    }
}

describe('campaignDisplayEngine', () => {
    it('switches the round-11 headline to a success-specific title once shu is gained', () => {
        const display = getRoundStartCampaignDisplay(
            11,
            makeCampaignState({
                state: 'gained',
                sourceRound: 10,
                summary: '蜀地方向得手，北周西线顿失从容。',
                remainingRounds: 1,
                resolvedState: 'gained',
            }),
            makeCampaignState(),
        )

        expect(display.eventName).toContain('蜀地已失')
        expect(display.eventName).not.toContain('蜀地战局僵持')
    })

    it('keeps bashu map after shu fallout ends when the territory was gained', () => {
        const display = getRoundStartCampaignDisplay(
            13,
            makeCampaignState({
                state: 'idle',
                sourceRound: 10,
                resolvedState: 'gained',
            }),
            makeCampaignState(),
        )

        expect(display.map.src).toContain('map_2_bashu.png')
        expect(display.summary).toContain('蜀地')
    })

    it('keeps huainan map after huainan fallout ends when the territory was gained', () => {
        const display = getRoundStartCampaignDisplay(
            19,
            makeCampaignState(),
            makeCampaignState({
                state: 'idle',
                sourceRound: 16,
                resolvedState: 'gained',
            }),
        )

        expect(display.map.src).toContain('map_4_huainan.png')
        expect(display.summary).toContain('淮南')
    })

    it('uses a softer round-11 summary for a successful shu campaign to foreshadow the turn-12 map', () => {
        const display = getRoundStartCampaignDisplay(
            11,
            makeCampaignState({
                state: 'gained',
                sourceRound: 10,
                summary: '蜀地方向得手，北周西线顿失从容。',
                remainingRounds: 1,
                resolvedState: 'gained',
            }),
            makeCampaignState(),
        )

        expect(display.summary).not.toContain('得手')
        expect(display.summary).toContain('胜机')
    })

    it('keeps stalemate wording on round 11 when shu campaign stalls', () => {
        const display = getRoundStartCampaignDisplay(
            11,
            makeCampaignState({
                state: 'stalemate',
                sourceRound: 10,
                summary: '蜀地战局一时僵持，双方都被迫继续投入。',
                remainingRounds: 1,
                resolvedState: 'stalemate',
            }),
            makeCampaignState(),
        )

        expect(display.summary).toContain('僵持')
        expect(display.eventName).toContain('蜀地战局僵持')
    })

    it('switches the round-17 headline to a success-specific title once huainan is gained', () => {
        const display = getRoundStartCampaignDisplay(
            17,
            makeCampaignState({
                state: 'idle',
                resolvedState: 'gained',
            }),
            makeCampaignState({
                state: 'gained',
                sourceRound: 16,
                summary: '淮南方向得手，北周前线与粮运一时震动。',
                remainingRounds: 1,
                resolvedState: 'gained',
            }),
        )

        expect(display.eventName).toContain('淮南失守')
        expect(display.eventName).not.toContain('淮南久战')
    })

    it('derives resolved state from current state for old snapshots', () => {
        expect(getCampaignResolvedState(makeCampaignState({ state: 'gained', resolvedState: undefined }))).toBe('gained')
        expect(getCampaignResolvedState(makeCampaignState({ state: 'idle', resolvedState: undefined }))).toBe('idle')
    })
})
