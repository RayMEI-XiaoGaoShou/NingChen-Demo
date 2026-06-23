export function deriveCampaignPreparedBonus(params: {
    campaign: 'shu' | 'huainan'
    momentum: number
    recentBattleSignal: number
    policyMomentum: number
}): number {
    const momentumGate = params.campaign === 'shu' ? 3.8 : 3.2
    const recentGate = params.recentBattleSignal >= 0.55
    if (params.momentum < momentumGate || !recentGate) {
        return 0
    }

    const base =
        (params.momentum - momentumGate) * 0.45 +
        params.recentBattleSignal * 0.95 +
        params.policyMomentum * 0.7

    return Math.max(0, Math.min(3, Math.round(base * 10) / 10))
}
