import { describe, expect, it } from 'vitest'

describe('campaignMomentum', () => {
    it('weights shu momentum toward grain-governance-military signals before round 10', async () => {
        const { deriveCampaignMomentumGain } = await import('./campaignMomentum')

        const result = deriveCampaignMomentumGain({
            round: 8,
            schemeType: 'advise',
            success: true,
            parse: {
                characterFit: 0.7,
                eventFit: 0.7,
                structuralPenetration: 0.7,
                executability: 0.6,
                exposureRisk: 0.2,
                financeRelevance: 0.1,
                grainRelevance: 0.8,
                militaryRelevance: 0.7,
                socialOrderRelevance: 0.2,
                governanceRelevance: 0.8,
                dominantIntent: 'strategize',
                evidence: [],
            },
        })

        expect(result.shuMomentumGain).toBeGreaterThan(0.7)
        expect(result.huainanMomentumGain).toBe(0)
    })

    it('weights huainan momentum toward military-grain-finance signals after round 10', async () => {
        const { deriveCampaignMomentumGain } = await import('./campaignMomentum')

        const result = deriveCampaignMomentumGain({
            round: 14,
            schemeType: 'advise',
            success: true,
            parse: {
                characterFit: 0.7,
                eventFit: 0.68,
                structuralPenetration: 0.65,
                executability: 0.58,
                exposureRisk: 0.22,
                financeRelevance: 0.72,
                grainRelevance: 0.76,
                militaryRelevance: 0.84,
                socialOrderRelevance: 0.18,
                governanceRelevance: 0.34,
                dominantIntent: 'strategize',
                evidence: [],
            },
        })

        expect(result.shuMomentumGain).toBe(0)
        expect(result.huainanMomentumGain).toBeGreaterThan(0.7)
    })

    it('pushes shu momentum above the previous plateau for strong grain-governance advice', async () => {
        const { deriveCampaignMomentumGain } = await import('./campaignMomentum')

        const result = deriveCampaignMomentumGain({
            round: 8,
            schemeType: 'advise',
            success: true,
            parse: {
                characterFit: 0.78,
                eventFit: 0.76,
                structuralPenetration: 0.74,
                executability: 0.66,
                exposureRisk: 0.18,
                financeRelevance: 0.16,
                grainRelevance: 0.88,
                militaryRelevance: 0.72,
                socialOrderRelevance: 0.18,
                governanceRelevance: 0.84,
                dominantIntent: 'strategize',
                evidence: [],
            },
        })

        expect(result.shuMomentumGain).toBeGreaterThan(1)
    })

    it('lets strong omen pressure build huainan momentum more aggressively after round 10', async () => {
        const { deriveCampaignMomentumGain } = await import('./campaignMomentum')

        const result = deriveCampaignMomentumGain({
            round: 14,
            schemeType: 'omen',
            success: true,
            parse: {
                characterFit: 0.8,
                eventFit: 0.82,
                structuralPenetration: 0.78,
                executability: 0.4,
                exposureRisk: 0.44,
                financeRelevance: 0.22,
                grainRelevance: 0.34,
                militaryRelevance: 0.42,
                socialOrderRelevance: 0.72,
                governanceRelevance: 0.9,
                dominantIntent: 'divide',
                evidence: [],
            },
        })

        expect(result.huainanMomentumGain).toBeGreaterThan(1)
    })

    it('does not reward generic pressure speeches with momentum', async () => {
        const { deriveCampaignMomentumGain } = await import('./campaignMomentum')

        const result = deriveCampaignMomentumGain({
            round: 8,
            schemeType: 'slander',
            success: true,
            parse: {
                characterFit: 0.4,
                eventFit: 0.4,
                structuralPenetration: 0.2,
                executability: 0.2,
                exposureRisk: 0.5,
                financeRelevance: 0.1,
                grainRelevance: 0.1,
                militaryRelevance: 0.1,
                socialOrderRelevance: 0.3,
                governanceRelevance: 0.2,
                dominantIntent: 'divide',
                evidence: [],
            },
        })

        expect(result.shuMomentumGain).toBe(0)
        expect(result.huainanMomentumGain).toBe(0)
    })

    it('gives omen a larger momentum gain only when legitimacy-oriented governance pressure is real', async () => {
        const { deriveCampaignMomentumGain } = await import('./campaignMomentum')

        const result = deriveCampaignMomentumGain({
            round: 14,
            schemeType: 'omen',
            success: true,
            parse: {
                characterFit: 0.75,
                eventFit: 0.8,
                structuralPenetration: 0.7,
                executability: 0.35,
                exposureRisk: 0.45,
                financeRelevance: 0.1,
                grainRelevance: 0.1,
                militaryRelevance: 0.2,
                socialOrderRelevance: 0.5,
                governanceRelevance: 0.85,
                dominantIntent: 'divide',
                evidence: [],
            },
        })

        expect(result.huainanMomentumGain).toBeGreaterThan(0.8)
    })

    it('explains when a successful scheme did not truly move the active theater', async () => {
        const { explainCampaignMomentumContribution } = await import('./campaignMomentum')

        expect(
            explainCampaignMomentumContribution({
                round: 8,
                schemeType: 'slander',
                success: true,
                parse: {
                    characterFit: 0.62,
                    eventFit: 0.4,
                    structuralPenetration: 0.28,
                    executability: 0.22,
                    exposureRisk: 0.4,
                    financeRelevance: 0.08,
                    grainRelevance: 0.1,
                    militaryRelevance: 0.12,
                    socialOrderRelevance: 0.3,
                    governanceRelevance: 0.2,
                    dominantIntent: 'divide',
                    evidence: [],
                },
                gain: 0,
                after: 0.18,
            }),
        ).toContain('战役动量未变')
    })
})
