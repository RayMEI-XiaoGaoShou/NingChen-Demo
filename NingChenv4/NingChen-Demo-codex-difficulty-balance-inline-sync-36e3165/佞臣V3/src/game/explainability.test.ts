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

        expect(getFactionConditionLabel('militaryPower', 78)).toBe('兵权尚整')
        expect(getFactionConditionLabel('militaryPower', 55)).toBe('兵势微损')
        expect(getFactionConditionLabel('militaryPower', 32)).toBe('军令不行')
        expect(getFactionConditionLabel('militaryPower', 12)).toBe('兵权将散')

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

    it('returns the final locked copy and structured gaps for external action unlock state', async () => {
        const { explainExternalActionUnlock } = await import('./explainability')

        const result = explainExternalActionUnlock({
            trustGap: 12,
            loyaltyGap: 11,
            secretsGap: 1,
            roundWindowOpen: false,
        })

        expect(result.unlocked).toBe(false)
        expect(result.summary).toBe('未解锁：人、心、底牌、时机——四样缺一不可。眼下还差 信任尚差 12 点、此人对朝廷还没冷透，差 11 点忠诚、暗线尚差 1 条、时局未到，窗口尚闭，急不得。')
        expect(result.conditionText).toBe('信任尚差 12 点、此人对朝廷还没冷透，差 11 点忠诚、暗线尚差 1 条、时局未到，窗口尚闭')
        expect(result.conditions).toEqual([
            {
                kind: 'trust',
                gap: 12,
                summary: '信任尚差 12 点',
                text: '未解锁：信任尚差 12 点。他还没把你当自己人，这时候摊牌只会吓跑他。',
            },
            {
                kind: 'loyalty',
                gap: 11,
                summary: '此人对朝廷还没冷透，差 11 点忠诚',
                text: '未解锁：此人对朝廷还没冷透，差 11 点忠诚。心没凉，手就不会动。',
            },
            {
                kind: 'secrets',
                gap: 1,
                summary: '暗线尚差 1 条',
                text: '未解锁：暗线尚差 1 条。他最深的算盘你还没摸到，此时摊牌无异于赌。',
            },
            {
                kind: 'window',
                summary: '时局未到，窗口尚闭',
                text: '未解锁：时局未到，窗口尚闭。再等一个能逼他明牌的回合。',
            },
        ])
        expect(result.gaps).toEqual({
            trustGap: 12,
            loyaltyGap: 11,
            secretsGap: 1,
            roundWindowOpen: false,
        })
    })

    it('marks the unlock as ready when no gaps remain and the window is open', async () => {
        const { explainExternalActionUnlock } = await import('./explainability')

        const result = explainExternalActionUnlock({
            trustGap: 0,
            loyaltyGap: 0,
            secretsGap: 0,
            roundWindowOpen: true,
        })

        expect(result.unlocked).toBe(true)
        expect(result.summary).toBe('条件已齐：信任够了、忠心已冷、暗线已明。')
        expect(result.conditionText).toBe('')
        expect(result.conditions).toEqual([])
    })
})
