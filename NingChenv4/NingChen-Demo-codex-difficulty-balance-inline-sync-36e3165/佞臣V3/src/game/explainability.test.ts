import { describe, expect, it } from 'vitest'

describe('explainability helpers', () => {
    it('labels emperor favor around the dismissal and execution thresholds', async () => {
        const { getFavorPressureLabel } = await import('./explainability')

        expect(getFavorPressureLabel('emperorFavor', 72)).toBe('圣眷尚浓')
        expect(getFavorPressureLabel('emperorFavor', 36)).toBe('圣眷渐薄')
        expect(getFavorPressureLabel('emperorFavor', 35)).toBe('圣眷将尽')
        expect(getFavorPressureLabel('emperorFavor', 19)).toBe('圣眷将尽')
        expect(getFavorPressureLabel('emperorFavor', 18)).toBe('圣眷已绝')
    })

    it('labels empress dowager favor with the shared four-band copy', async () => {
        const { getFavorPressureLabel } = await import('./explainability')

        expect(getFavorPressureLabel('empressDowagerFavor', 71)).toBe('尚得看重')
        expect(getFavorPressureLabel('empressDowagerFavor', 36)).toBe('渐被疏远')
        expect(getFavorPressureLabel('empressDowagerFavor', 35)).toBe('恩义转淡')
        expect(getFavorPressureLabel('empressDowagerFavor', 18)).toBe('近乎失势')
    })

    it('labels faction condition bands for stable, shaking, fractured, and collapsed states', async () => {
        const { getFactionConditionLabel } = await import('./explainability')

        expect(getFactionConditionLabel('courtInfluence', 78)).toBe('气脉尚稳')
        expect(getFactionConditionLabel('courtInfluence', 55)).toBe('根基已摇')
        expect(getFactionConditionLabel('courtInfluence', 32)).toBe('裂口已现')
        expect(getFactionConditionLabel('courtInfluence', 12)).toBe('将倾欲散')

        expect(getFactionConditionLabel('militaryStrength', 78)).toBe('兵权尚整')
        expect(getFactionConditionLabel('militaryStrength', 55)).toBe('兵势微损')
        expect(getFactionConditionLabel('militaryStrength', 32)).toBe('军令不行')
        expect(getFactionConditionLabel('militaryStrength', 12)).toBe('兵权将散')

        expect(getFactionConditionLabel('internalStability', 78)).toBe('上下一心')
        expect(getFactionConditionLabel('internalStability', 55)).toBe('暗流渐起')
        expect(getFactionConditionLabel('internalStability', 32)).toBe('貌合神离')
        expect(getFactionConditionLabel('internalStability', 12)).toBe('大厦将倾')
    })

    it('labels external military posture and campaign momentum bands', async () => {
        const { getExternalMilitaryPostureLabel, getCampaignMomentumLabel } = await import('./explainability')

        expect(getExternalMilitaryPostureLabel(76)).toBe('兵势尚整')
        expect(getExternalMilitaryPostureLabel(54)).toBe('兵势微损')
        expect(getExternalMilitaryPostureLabel(31)).toBe('兵势受挫')
        expect(getExternalMilitaryPostureLabel(8)).toBe('兵势已虚')

        expect(getCampaignMomentumLabel(0)).toBe('筹势未成')
        expect(getCampaignMomentumLabel(0.18)).toBe('局势微动')
        expect(getCampaignMomentumLabel(0.56)).toBe('已见成势')
        expect(getCampaignMomentumLabel(0.85)).toBe('得手在即')
    })

    it('explains external action unlock blockers from trust, loyalty, secrets, and window state', async () => {
        const { explainExternalActionUnlock } = await import('./explainability')

        const result = explainExternalActionUnlock({
            trust: 60,
            loyaltyToCourt: 46,
            unlockedSecrets: 1,
            roundWindowOpen: false,
            thresholds: {
                trust: 72,
                loyalty: 35,
                secrets: 2,
            },
        })

        expect(result.unlocked).toBe(false)
        expect(result.blockers).toEqual(['信任尚差 12 点', '忠诚尚差 11 点', '差 1 条暗线', '窗口尚闭'])
        expect(result.reason).toBe('信任尚差 12 点，忠诚尚差 11 点，差 1 条暗线，窗口尚闭')
    })
})
