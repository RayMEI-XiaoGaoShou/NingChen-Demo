import type {
    GameDifficulty,
    NorthSchemeParseResult,
    PolicyReasonParseResult,
    SchemeType,
} from '../types'

export type SampleSkillLevel = 'expert' | 'average' | 'rookie'

export type SampleStrategy =
    | 'mainline'
    | 'external'
    | 'omen'
    | 'aggressive'

export interface RoundSchemeSample {
    targetNpcId: string
    schemeType: SchemeType
    relatedNpcId?: string
    speech: string
}

export interface RoundPolicySample {
    optionIndex: number
    reason: string
}

export interface SampleRoundPlan {
    round: number
    schemes: [RoundSchemeSample, RoundSchemeSample, RoundSchemeSample]
    policy: RoundPolicySample
}

export interface BalanceSample {
    id: string
    label: string
    level: SampleSkillLevel
    strategy: SampleStrategy
    difficulty: GameDifficulty
    rounds: SampleRoundPlan[]
}

export interface LiveParseRecord {
    round: number
    kind: 'north' | 'policy'
    targetNpcId?: string
    schemeType?: SchemeType
    rawInput: string
    normalized: NorthSchemeParseResult | PolicyReasonParseResult | null
    rawResponse: string | null
    mode: 'live' | 'fallback'
    error: string | null
}

export interface SampleRunSummary {
    sampleId: string
    level: SampleSkillLevel
    strategy: SampleStrategy
    difficulty: GameDifficulty
    gameResult: string
    northPower: number
    southPower: number
    round10Gap: number
    shuResolvedState: string | null
    huainanResolvedState: string | null
    anySecession: boolean
    anyRebellion: boolean
    degraded: boolean
}

export interface LiveBalanceReport {
    generatedAt: string
    gitCommit: string
    difficulty: GameDifficulty
    sampleSetVersion: string
    summaries: SampleRunSummary[]
    parseRecords: Record<string, LiveParseRecord[]>
}

export interface SampleRunSnapshot {
    round: number
    northPower: number
    southPower: number
    gameResult: string
}
