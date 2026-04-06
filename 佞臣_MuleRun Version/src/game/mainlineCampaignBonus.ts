import type { CampaignOutcomeState, GameDifficulty } from './types'

function round(value: number): number {
    return Math.round(value * 10) / 10
}

export function deriveMainlineShuBonus(params: {
    difficulty: GameDifficulty
    schemeSignals: number[]
    commandSignal: number
    preparedBonus: number
    existingMomentum: number
}): number {
    if (params.difficulty !== 'normal') return 0

    const strongest = Math.max(0, ...params.schemeSignals)
    const layered = params.schemeSignals.filter(value => value >= 0.56).length
    if (strongest < 0.56 && params.commandSignal < 0.62) return 0

    let bonus = 0

    if (strongest >= 0.72) bonus += 0.7
    else if (strongest >= 0.56) bonus += 0.45

    if (layered >= 2) bonus += 0.45

    if (params.commandSignal >= 0.72) bonus += 0.55
    else if (params.commandSignal >= 0.62) bonus += 0.3

    if (params.preparedBonus >= 1.1) bonus += 0.3
    if (layered >= 2 && params.preparedBonus >= 1) bonus += 0.2
    if (strongest >= 0.64 && params.commandSignal >= 0.6) bonus += 0.15
    if (params.existingMomentum >= 4.4) bonus += 0.35
    if (params.existingMomentum >= 5.2) bonus += 0.25
    if (params.existingMomentum >= 8 && strongest >= 0.68 && params.commandSignal >= 0.7) bonus += 0.9
    if (strongest >= 0.74 && params.commandSignal >= 0.72) bonus += 0.1

    return round(Math.min(3.8, bonus))
}

export function deriveMainlineHuainanBonus(params: {
    difficulty: GameDifficulty
    shuResolvedState: CampaignOutcomeState | null | undefined
    schemeSignals: number[]
    commandSignal: number
    preparedBonus: number
}): number {
    if (params.difficulty !== 'normal' || params.shuResolvedState !== 'gained') return 0

    const strongest = Math.max(0, ...params.schemeSignals)
    const layered = params.schemeSignals.filter(value => value >= 0.58).length
    if (strongest < 0.58 && params.commandSignal < 0.66) return 0

    let bonus = 0

    if (strongest >= 0.74) bonus += 0.9
    else if (strongest >= 0.58) bonus += 0.6

    if (layered >= 2) bonus += 0.5

    if (params.commandSignal >= 0.74) bonus += 0.7
    else if (params.commandSignal >= 0.66) bonus += 0.4

    if (params.preparedBonus >= 1.1) bonus += 0.4

    return round(Math.min(2.4, bonus))
}
