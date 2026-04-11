import type { CampaignState, GameDifficulty } from './types'

function round(value: number): number {
    return Math.round(value * 10) / 10
}

export function deriveShuGainBias(
    difficulty: GameDifficulty,
    momentumBonus: number,
    preparedBonus: number,
): number {
    if (difficulty !== 'normal') {
        return 0
    }

    let bonus = 0

    if (momentumBonus >= 4) bonus += 0.8
    if (momentumBonus >= 4.8) bonus += 0.5

    if (preparedBonus >= 1) bonus += 0.9
    if (preparedBonus >= 1.8) bonus += 0.5

    if (momentumBonus >= 4.8 && preparedBonus >= 1.4) {
        bonus += 0.4
    }

    return round(Math.min(3.1, bonus))
}

export function deriveHuainanCarryBonus(
    shuState: CampaignState['resolvedState'],
    difficulty: GameDifficulty,
): number {
    if (difficulty !== 'normal') {
        return 0
    }

    if (shuState === 'gained') return 2.4
    if (shuState === 'stalemate') return 0.8
    return 0
}
