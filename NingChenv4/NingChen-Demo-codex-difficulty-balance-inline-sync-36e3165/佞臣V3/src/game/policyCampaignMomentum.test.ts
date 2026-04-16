import { describe, expect, it } from 'vitest'
import { derivePolicyCampaignMomentum } from './policyCampaignMomentum'

describe('policyCampaignMomentum', () => {
    it('awards shu policy momentum for early war-preparatory policy reasoning', () => {
        const gain = derivePolicyCampaignMomentum({
            round: 8,
            effects: { grain: 2.6, governance: 1.1, finance: 0.8 },
            policyParse: {
                focusAlignment: 0.78,
                executionClarity: 0.8,
                costAwareness: 0.58,
                legitimacyAlignment: 0.52,
                policyStance: 'balanced',
                evidence: [],
            },
        })

        expect(gain.shuMomentumGain).toBeGreaterThan(0)
        expect(gain.huainanMomentumGain).toBe(0)
    })

    it('does not award policy momentum to vague non-campaign reasoning', () => {
        const gain = derivePolicyCampaignMomentum({
            round: 8,
            effects: { socialOrder: 1.8 },
            policyParse: {
                focusAlignment: 0.36,
                executionClarity: 0.32,
                costAwareness: 0.2,
                legitimacyAlignment: 0.66,
                policyStance: 'conservative',
                evidence: [],
            },
        })

        expect(gain.shuMomentumGain).toBe(0)
        expect(gain.huainanMomentumGain).toBe(0)
    })

    it('routes midgame military-fiscal policy support into huainan momentum', () => {
        const gain = derivePolicyCampaignMomentum({
            round: 14,
            effects: { military: 2.2, grain: 1.5, finance: 1.2, governance: 0.4 },
            policyParse: {
                focusAlignment: 0.74,
                executionClarity: 0.72,
                costAwareness: 0.64,
                legitimacyAlignment: 0.48,
                policyStance: 'aggressive',
                evidence: [],
            },
        })

        expect(gain.shuMomentumGain).toBe(0)
        expect(gain.huainanMomentumGain).toBeGreaterThan(0)
    })
})
