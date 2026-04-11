import { describe, expect, it, vi } from 'vitest'
import * as liveParseRunner from './liveParseRunner'
import { LIVE_BALANCE_SAMPLE_SET } from './sampleLibrary'
import { runLiveBalanceSample } from './liveSimulation'

describe('liveSimulation', () => {
    it('injects live parse outputs into the simulation flow', async () => {
        vi.spyOn(liveParseRunner, 'runNorthLiveParse').mockResolvedValue({
            round: 1,
            kind: 'north',
            targetNpcId: 'zuting',
            schemeType: 'advise',
            rawInput: 'text',
            normalized: {
                characterFit: 0.6,
                eventFit: 0.5,
                structuralPenetration: 0.7,
                executability: 0.6,
                exposureRisk: 0.2,
                financeRelevance: 0.5,
                grainRelevance: 0.3,
                militaryRelevance: 0.1,
                socialOrderRelevance: 0.2,
                governanceRelevance: 0.8,
                dominantIntent: 'strategize',
                evidence: [],
            },
            rawResponse: null,
            mode: 'live',
            error: null,
        })
        vi.spyOn(liveParseRunner, 'runPolicyLiveParse').mockResolvedValue({
            round: 1,
            kind: 'policy',
            rawInput: 'reason',
            normalized: {
                focusAlignment: 0.6,
                executionClarity: 0.6,
                costAwareness: 0.5,
                legitimacyAlignment: 0.6,
                policyStance: 'balanced',
                evidence: [],
            },
            rawResponse: null,
            mode: 'live',
            error: null,
        })

        const result = await runLiveBalanceSample(LIVE_BALANCE_SAMPLE_SET[0]!)

        expect(result.summary.sampleId).toBe(LIVE_BALANCE_SAMPLE_SET[0]!.id)
        expect(result.parseRecords.length).toBeGreaterThan(0)
        expect(result.finalState.currentRound).toBeGreaterThanOrEqual(1)
    })
})
