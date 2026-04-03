import { describe, expect, it } from 'vitest'

describe('campaignMomentum', () => {
    it('adds shu momentum for successful grain-military-governance court schemes before round 10', async () => {
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

        expect(result.shuMomentumGain).toBeGreaterThan(0)
        expect(result.huainanMomentumGain).toBe(0)
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
})
