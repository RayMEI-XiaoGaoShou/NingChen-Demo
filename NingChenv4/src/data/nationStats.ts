// ========================================
// 南北国力五维初值与自然增长率
// 数据来源：数值初值与阈值表.md §1-3
// ========================================

import { getDifficultyProfile } from '../game/difficulty'
import type { GameDifficulty, NationDimensions } from '../game/types'

/** 北周五维初值 */
export const NORTH_INITIAL: NationDimensions = {
    finance: 68,
    grain: 65,
    military: 78,
    socialOrder: 58,
    governance: 55,
}

/** 南陈五维初值 */
export const SOUTH_INITIAL: NationDimensions = {
    finance: 40,
    grain: 45,
    military: 35,
    socialOrder: 52,
    governance: 48,
}

/** 北周每回合自然增长（基线） */
export const NORTH_GROWTH: NationDimensions = {
    finance: 0.4,
    grain: 0.3,
    military: 0.5,
    socialOrder: 0.2,
    governance: 0.2,
}

/** 南陈每回合自然增长（基线） */
export const SOUTH_GROWTH: NationDimensions = {
    finance: 0.54,
    grain: 0.46,
    military: 0.42,
    socialOrder: 0.46,
    governance: 0.4,
}

export function getSouthGrowthForDifficulty(difficulty: GameDifficulty): NationDimensions {
    const profile = getDifficultyProfile(difficulty)

    return {
        finance: roundTwoDecimals(SOUTH_GROWTH.finance * profile.southGrowthMultiplier),
        grain: roundTwoDecimals(SOUTH_GROWTH.grain * profile.southGrowthMultiplier),
        military: roundTwoDecimals(SOUTH_GROWTH.military * profile.southGrowthMultiplier),
        socialOrder: roundTwoDecimals(SOUTH_GROWTH.socialOrder * profile.southGrowthMultiplier),
        governance: roundTwoDecimals(SOUTH_GROWTH.governance * profile.southGrowthMultiplier),
    }
}

/**
 * 增长上限修正：已达 75 以上的维度增速减半
 */
export function applyGrowthCap(
    current: NationDimensions,
    growth: NationDimensions
): NationDimensions {
    const result = { ...growth }
    const keys = Object.keys(current) as (keyof NationDimensions)[]
    for (const key of keys) {
        if (current[key] >= 75) {
            result[key] = growth[key] * 0.5
        }
    }
    return result
}

function roundTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100
}
