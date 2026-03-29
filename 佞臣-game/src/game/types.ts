export type RoundPhase =
    | 'PROLOGUE'
    | 'ROUND_START'
    | 'COURT_OBSERVE'
    | 'SCHEME_PHASE'
    | 'EMPRESS_LETTER'
    | 'SCHEME_FEEDBACK'
    | 'SETTLEMENT'
    | 'ROUND_END'
    | 'ENDING'

export type PrologueStep = 'PROLOGUE' | 'GAMEPLAY_GUIDE' | 'INGAME'
export type HelpOverlaySource = 'gameplay' | 'prologue'
export type FirstRoundGuideKey =
    | 'round_start'
    | 'court_observe'
    | 'scheme_phase'
    | 'empress_letter'
    | 'scheme_feedback'
    | 'settlement'
export type FirstRoundGuideSeenMap = Record<FirstRoundGuideKey, boolean>

export type GameResult =
    | 'NONE'
    | 'VICTORY'
    | 'DEFEAT_DEATH'
    | 'DEFEAT_INVASION'
    | 'DEFEAT_POWER'

export type CourtFactionId = 'emperor' | 'empress'
export type NpcFactionId = CourtFactionId | 'longxi' | 'prairie'
export type AlignmentBias = CourtFactionId | 'swing' | 'self'
export type ExternalStatus = 'loyal' | 'watchful' | 'secession' | 'rebellion'
export type HighActionBias = 'secession' | 'rebellion'
export type RelationshipEdgeType =
    | 'rivalry'
    | 'alliance'
    | 'dependency'
    | 'competition'
    | 'channel'
    | 'borderBalance'
export type RelationshipVisibility = 'public' | 'halfHidden' | 'secret'

export type SchemeType =
    | 'probe'
    | 'advise'
    | 'slander'
    | 'alienate'
    | 'frame'
    | 'proxy'
    | 'appeal'
    | 'omen'
    | 'secession'
    | 'rebellion'

export type TrustLevel =
    | 'hostile'
    | 'guarded'
    | 'neutral'
    | 'trusted'
    | 'relied'
    | 'devoted'

export type PowerLevel =
    | 'collapsed'
    | 'declining'
    | 'moderate'
    | 'strong'
    | 'peak'

export interface NationDimensions {
    finance: number
    grain: number
    military: number
    socialOrder: number
    governance: number
}

export const DIMENSION_WEIGHTS: Record<keyof NationDimensions, number> = {
    finance: 0.18,
    grain: 0.22,
    military: 0.24,
    socialOrder: 0.16,
    governance: 0.20,
}

export interface Faction {
    id: CourtFactionId
    name: string
    description: string
    militaryPower: number
    courtInfluence: number
    internalStability: number
}

export interface NPC {
    id: string
    name: string
    factionId: NpcFactionId
    powerBase: 'court' | 'external'
    title: string
    publicPersona: string
    publicStance: string
    personality: string
    softSpot: string
    triggerPoint: string
    schemeHooks: string
    trust: number
    isAlive: boolean
    canExecute: boolean
    militaryPower: number
    loyaltyToCourt: number
    alignmentBias: AlignmentBias
    externalStatus: ExternalStatus
    highActionBias?: HighActionBias
    availableSchemes: SchemeType[]
    highRounds: number[]
    secretThreads: string[]
}

export interface Advisor {
    id: string
    name: string
    title: string
    personality: string
    role: string
}

export interface Scheme {
    type: SchemeType
    name: string
    description: string
    trustThreshold: number
    riskLevel: 'low' | 'medium' | 'high' | 'extreme'
    needsSecondTarget: boolean
    targetScope?: 'default' | 'externalOnly'
}

export interface RoundEvent {
    round: number
    timeLabel: string
    eventName: string
    northDescription: string
    southDescription: string
    briefing: string
    hint: string
    summary: string
    hook: string
}

export interface SchemeAction {
    id?: string
    targetNpcId: string
    schemeType: SchemeType
    relatedNpcId?: string
    playerSpeech: string
    resolutionRoll?: number
    result?: string
}

export interface PolicyOption {
    label: string
    content: string
    effects: Partial<NationDimensions>
    riskNote?: string
    legitimacyEffect?: 'up' | 'down' | 'steady'
}

export interface PolicyQuestion {
    id: string
    round: number
    topic: string
    background: string
    question: string
    options: PolicyOption[]
    aiScoringFocus?: string
    nextRoundFeedback?: string
}

export interface PolicyResolutionMeta {
    legitimacyEffect?: 'up' | 'down' | 'steady'
    aiScoringFocus?: string
}

export interface PolicyAftereffect {
    sourceRound: number
    topic: string
    summary: string
    effects: Partial<NationDimensions>
    legitimacyTone: 'up' | 'down' | 'steady'
    focusMatched: boolean
}

export interface FactionCollapseReport {
    factionId: CourtFactionId
    factionName: string
    severity: 'breach' | 'collapse'
    reasons: string[]
    summary: string
}

export interface RoundHistoryEntry {
    round: number
    eventName: string
    schemeCount: number
    schemeSuccessCount: number
    keyTargets: string[]
    policyTopic?: string
    policyOption?: string
    externalActionCount: number
    relationshipBreakCount: number
    factionCollapseCount: number
    invasionTriggered: boolean
    northPower: number
    southPower: number
    summary: string
}

export interface BattleReport {
    pivotMoments: string[]
    schemeSummary: string[]
    policySummary: string[]
    dangerMoments: string[]
}

export interface RelationshipEdge {
    id: string
    fromNpcId: string
    toNpcId: string
    type: RelationshipEdgeType
    visibility: RelationshipVisibility
    strength: number
    label: string
    notes: string
    linkedStructureIds: string[]
}

export interface RelationshipStructureEffect {
    emperor?: {
        militaryPower?: number
        courtInfluence?: number
        internalStability?: number
    }
    empress?: {
        militaryPower?: number
        courtInfluence?: number
        internalStability?: number
    }
    nation?: Partial<NationDimensions>
}

export interface RelationshipStructure {
    id: string
    name: string
    description: string
    memberNpcIds: string[]
    criticalEdgeIds: string[]
    breakThreshold: number
    reportText: string
    effect: RelationshipStructureEffect
}

export interface RelationshipReport {
    edgeId: string
    edgeLabel: string
    structureId: string
    structureName: string
    summary: string
}

export type EndingTier = '大胜' | '稳胜' | '险胜' | '惨败' | '惜败' | '险败'

export interface EndingNpcFate {
    npcId: string
    npcName: string
    summary: string
}

export interface EndingReport {
    title: string
    tier: EndingTier
    causeSummary: string[]
    factionOutlook: string[]
    npcFates: EndingNpcFate[]
    statsSummary: string[]
}

export function getTrustLevel(trust: number): TrustLevel {
    if (trust >= 90) return 'devoted'
    if (trust >= 70) return 'relied'
    if (trust >= 50) return 'trusted'
    if (trust >= 30) return 'neutral'
    if (trust >= 15) return 'guarded'
    return 'hostile'
}

export function getTrustLabel(trust: number): string {
    const labels: Record<TrustLevel, string> = {
        hostile: '敌意',
        guarded: '戒备',
        neutral: '平淡',
        trusted: '信赖',
        relied: '倚重',
        devoted: '深信',
    }
    return labels[getTrustLevel(trust)]
}

export function getPowerLevel(power: number): PowerLevel {
    if (power >= 75) return 'peak'
    if (power >= 60) return 'strong'
    if (power >= 45) return 'moderate'
    if (power >= 30) return 'declining'
    return 'collapsed'
}

export function getPowerLabel(power: number): string {
    const labels: Record<PowerLevel, string> = {
        collapsed: '崩坏',
        declining: '衰弱',
        moderate: '中平',
        strong: '强盛',
        peak: '鼎盛',
    }
    return labels[getPowerLevel(power)]
}

export function getLoyaltyLabel(loyalty: number): string {
    if (loyalty >= 75) return '奉朝'
    if (loyalty >= 55) return '可用'
    if (loyalty >= 35) return '观望'
    return '离心'
}

export function getAlignmentLabel(alignment: AlignmentBias): string {
    const labels: Record<AlignmentBias, string> = {
        emperor: '偏帝党',
        empress: '偏后党',
        swing: '两面下注',
        self: '自立算盘',
    }
    return labels[alignment]
}

export function getExternalStatusLabel(status: ExternalStatus): string {
    const labels: Record<ExternalStatus, string> = {
        loyal: '仍受节制',
        watchful: '观望离心',
        secession: '割据坐大',
        rebellion: '明旗反叛',
    }
    return labels[status]
}

export function calculateCompositePower(dims: NationDimensions): number {
    let basePower =
        dims.finance * DIMENSION_WEIGHTS.finance +
        dims.grain * DIMENSION_WEIGHTS.grain +
        dims.military * DIMENSION_WEIGHTS.military +
        dims.socialOrder * DIMENSION_WEIGHTS.socialOrder +
        dims.governance * DIMENSION_WEIGHTS.governance

    for (const value of Object.values(dims)) {
        if (value < 25) {
            basePower -= 6
        } else if (value < 40) {
            basePower -= 2
        }
    }

    if (dims.socialOrder < 25 || dims.governance < 25) {
        basePower -= 3
    }

    return Math.round(basePower * 10) / 10
}
