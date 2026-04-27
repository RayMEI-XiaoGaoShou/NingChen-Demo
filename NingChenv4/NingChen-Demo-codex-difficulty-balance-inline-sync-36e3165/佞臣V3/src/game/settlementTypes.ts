import type {
    AiNativeSummary,
    NationDimensions,
    PolicyAftereffect,
    PolicyReasonParseResult,
} from './types'

export interface PolicySettlementReport {
    sourceRound: number
    topic: string
    question: string
    optionLabel: string
    optionContent: string
    reason: string
    effects: Partial<NationDimensions>
    effectSummary: string
    legitimacyTone: 'up' | 'down' | 'steady'
    focusMatched: boolean
    scoringFocus?: string
    policyParse: PolicyReasonParseResult | null
}

export interface JudgeFacts {
    eventImpactSummary: string
    factionSummary: string
    relationshipSummary: string
    externalSummary: string
    northSummary: string
    southSummary: string
    invasionSummary: string
    survivalSummary: string
    aiNativeSummary: AiNativeSummary
}

export interface SettlementKeyChangeHighlight {
    id: string
    category: 'external' | 'faction' | 'court'
    title: string
    text: string
    tone: 'positive' | 'negative' | 'neutral'
}

export type SettlementPolicyContext = {
    policyReport: PolicySettlementReport | null
    policyAftereffect: PolicyAftereffect | null
}
