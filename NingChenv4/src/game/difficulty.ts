import type { GameDifficulty } from './types'

export interface DifficultyProfile {
    id: GameDifficulty
    label: string
    description: string
    scheme: {
        baseRate: number
        probeModifier: number
        adviseModifier: number
        characterFitWeight: number
        executabilityWeight: number
        eventFitWeight: number
        exposurePenaltyWeight: number
    }
    campaign: {
        southPrepMultiplier: number
        northPressureWeight: number
        scoreBias: number
        gainedThreshold: number
        stalemateThreshold: number
    }
    southGrowthMultiplier: number
    policyImmediateMultiplier: number
    policyAftereffectMultiplier: number
    externalThresholdOffset: {
        trust: number
        loyalty: number
    }
    onboarding: {
        showFullOmenGuide: boolean
        fengDaozhiAssistsPerRound: number
    }
}

export const DIFFICULTY_PROFILES: Record<GameDifficulty, DifficultyProfile> = {
    easy: {
        id: 'easy',
        label: '简单',
        description: '偏剧情体验，局势更易掌控。',
        scheme: {
            baseRate: 0.62,
            probeModifier: 0.15,
            adviseModifier: 0.13,
            characterFitWeight: 0.16,
            executabilityWeight: 0.1,
            eventFitWeight: 0.1,
            exposurePenaltyWeight: 0.09,
        },
        campaign: {
            southPrepMultiplier: 0.96,
            northPressureWeight: 2.2,
            scoreBias: -1.5,
            gainedThreshold: 8,
            stalemateThreshold: 0,
        },
        southGrowthMultiplier: 1.05,
        policyImmediateMultiplier: 1,
        policyAftereffectMultiplier: 0.9,
        externalThresholdOffset: { trust: -2, loyalty: 2 },
        onboarding: { showFullOmenGuide: true, fengDaozhiAssistsPerRound: 3 },
    },
    normal: {
        id: 'normal',
        label: '普通',
        description: '默认推荐，首通胜率约在五五之间。',
        scheme: {
            baseRate: 0.53,
            probeModifier: 0.07,
            adviseModifier: 0.05,
            characterFitWeight: 0.14,
            executabilityWeight: 0.09,
            eventFitWeight: 0.09,
            exposurePenaltyWeight: 0.11,
        },
        campaign: {
            southPrepMultiplier: 0.84,
            northPressureWeight: 1.8,
            scoreBias: -5,
            gainedThreshold: 11,
            stalemateThreshold: 3,
        },
        southGrowthMultiplier: 0.8,
        policyImmediateMultiplier: 0.74,
        policyAftereffectMultiplier: 0.62,
        externalThresholdOffset: { trust: 0, loyalty: 0 },
        onboarding: { showFullOmenGuide: true, fengDaozhiAssistsPerRound: 3 },
    },
    hard: {
        id: 'hard',
        label: '困难',
        description: '北周更稳，需更早布局关键线。',
        scheme: {
            baseRate: 0.51,
            probeModifier: 0.05,
            adviseModifier: 0.03,
            characterFitWeight: 0.12,
            executabilityWeight: 0.08,
            eventFitWeight: 0.08,
            exposurePenaltyWeight: 0.12,
        },
        campaign: {
            southPrepMultiplier: 0.82,
            northPressureWeight: 1.5,
            scoreBias: -6,
            gainedThreshold: 12,
            stalemateThreshold: 3,
        },
        southGrowthMultiplier: 0.74,
        policyImmediateMultiplier: 0.68,
        policyAftereffectMultiplier: 0.56,
        externalThresholdOffset: { trust: 0, loyalty: 0 },
        onboarding: { showFullOmenGuide: false, fengDaozhiAssistsPerRound: 3 },
    },
    hell: {
        id: 'hell',
        label: '地狱',
        description: '给熟手的极限局，容错极低。',
        scheme: {
            baseRate: 0.47,
            probeModifier: 0.01,
            adviseModifier: -0.01,
            characterFitWeight: 0.1,
            executabilityWeight: 0.07,
            eventFitWeight: 0.07,
            exposurePenaltyWeight: 0.13,
        },
        campaign: {
            southPrepMultiplier: 0.76,
            northPressureWeight: 1.2,
            scoreBias: -8,
            gainedThreshold: 14,
            stalemateThreshold: 4,
        },
        southGrowthMultiplier: 0.76,
        policyImmediateMultiplier: 0.68,
        policyAftereffectMultiplier: 0.58,
        externalThresholdOffset: { trust: 0, loyalty: 0 },
        onboarding: { showFullOmenGuide: false, fengDaozhiAssistsPerRound: 3 },
    },
}

export function getDifficultyProfile(difficulty: GameDifficulty): DifficultyProfile {
    return DIFFICULTY_PROFILES[difficulty]
}
