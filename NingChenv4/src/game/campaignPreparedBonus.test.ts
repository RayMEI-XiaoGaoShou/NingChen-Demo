import { describe, expect, it } from 'vitest'
import { deriveCampaignPreparedBonus } from './campaignPreparedBonus'

describe('campaignPreparedBonus', () => {
    it('awards a shu prepared bonus only when momentum and recent preparation are both strong', () => {
        const bonus = deriveCampaignPreparedBonus({
            campaign: 'shu',
            momentum: 4.8,
            recentBattleSignal: 0.82,
            policyMomentum: 0.6,
        })

        expect(bonus).toBeGreaterThan(1)
    })

    it('returns zero for generic low-preparation lines', () => {
        const bonus = deriveCampaignPreparedBonus({
            campaign: 'shu',
            momentum: 1.4,
            recentBattleSignal: 0.28,
            policyMomentum: 0,
        })

        expect(bonus).toBe(0)
    })
})
