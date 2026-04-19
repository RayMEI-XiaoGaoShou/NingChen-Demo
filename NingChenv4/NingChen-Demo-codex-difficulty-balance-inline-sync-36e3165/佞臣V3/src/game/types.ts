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

export type PrologueStep = 'COVER' | 'PROLOGUE' | 'GAMEPLAY_GUIDE' | 'CHARACTER_BIOS' | 'INGAME'
export type HelpOverlaySource = 'gameplay' | 'prologue'
export type GameDifficulty = 'easy' | 'normal' | 'hard' | 'hell'
export type NorthDominantIntent = 'neutral' | 'induce' | 'threaten' | 'divide' | 'empathize' | 'strategize'
export type PolicyStance = 'neutral' | 'balanced' | 'aggressive' | 'conservative' | 'expedient'
export type AdvicePolarity = 'pro_state' | 'pro_target_anti_state' | 'neutral_or_vague'
export type OmenPolarity = 'legitimizing' | 'destabilizing' | 'vague_or_ceremonial'
export type CourtStatus = 'active' | 'dismissed' | 'executed'
export type CourtDispositionOpportunity = 'safe' | 'dismissible' | 'executable'
export type BorrowedBladeOutcome =
    | 'failed'
    | 'pressure'
    | 'dismissed'
    | 'executed'
export type BacklashType = 'guarded' | 'misdirected' | 'exposed' | 'shock'
export type CampaignOutcomeState = 'idle' | 'gained' | 'stalemate' | 'failed'
export type PlayerDangerStage = 'safe' | 'under_watch' | 'under_review'
export type NpcMemoryCategory = 'favor' | 'betrayal' | 'warning' | 'saved_face' | 'power_shift'
export type FirstRoundGuideKey =
    | 'round_start'
    | 'court_observe'
    | 'scheme_phase'
    | 'empress_letter'
    | 'scheme_feedback'
    | 'settlement'
export type FirstRoundGuideSeenMap = Record<FirstRoundGuideKey, boolean>
export type SchemeOnboardingGuideKey =
    | 'scheme_master_guide'
    | 'first_omen_teaching'
    | 'first_external_line_teaching'
    | 'first_follow_up_teaching'
export type SchemeOnboardingSeenMap = Record<SchemeOnboardingGuideKey, boolean>
export interface OmenGuideSeenMap {
    first_omen_modal: boolean
}

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

export interface CourtDispositionPenalty {
    nation: Partial<NationDimensions>
    faction: Partial<Record<CourtFactionId, {
        militaryPower: number
        courtInfluence: number
        internalStability: number
    }>>
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
    emperorFavor?: number
    empressDowagerFavor?: number
    courtStatus?: CourtStatus
    deathCause?: 'borrowed_blade' | 'court_execution' | null
    deathByNpcId?: string | null
    deathByNpcName?: string | null
    deathRound?: number | null
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

export type SchemeFollowUpStatus = 'available' | 'answered' | 'skipped'

export interface SchemeFollowUpParseResult {
    clarificationFit: number
    npcInterestFit: number
    pressureControl: number
    contradictionRisk: number
    exposureRiskDelta: number
    successRateDelta: number
    effectMultiplierDelta: number
    evidence: string[]
}

export interface SchemeFollowUp {
    questionText: string
    playerReply?: string
    parse?: SchemeFollowUpParseResult
    finalNpcReply?: string
    status: SchemeFollowUpStatus
}

export interface SchemeAction {
    id?: string
    targetNpcId: string
    schemeType: SchemeType
    relatedNpcId?: string
    playerSpeech: string
    omenSpeechInput?: OmenSpeechInput
    resolutionRoll?: number
    result?: string
    northParse?: NorthSchemeParseResult
    followUp?: SchemeFollowUp
}

export interface OmenSpeechInput {
    omenText: string
    interpretationText: string
}

export interface FengDaozhiDraftRequest {
    round: number
    difficulty: GameDifficulty
    targetNpcId: string
    schemeType: SchemeType
    playerDangerStage: PlayerDangerStage
    relatedNpcId?: string
    omenSpeechInput?: OmenSpeechInput
}

export interface FengDaozhiDraftResult {
    primaryText: string
    secondaryText?: string
    reasoning?: string
    source: 'ai' | 'fallback'
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
    policyParse?: PolicyReasonParseResult
    round?: number
}

export interface PolicyAftereffect {
    sourceRound: number
    topic: string
    summary: string
    effects: Partial<NationDimensions>
    legitimacyTone: 'up' | 'down' | 'steady'
    focusMatched: boolean
}

export interface CampaignState {
    state: CampaignOutcomeState
    resolvedState?: CampaignOutcomeState | null
    sourceRound: number | null
    summary: string
    ongoingNorthImpact: Partial<NationDimensions>
    ongoingSouthImpact: Partial<NationDimensions>
    remainingRounds: number
}

export interface PolicySelection {
    optionIndex: number
    reason: string
    policyParse: PolicyReasonParseResult | null
}

export interface NorthSchemeParseResult {
    characterFit: number
    eventFit: number
    structuralPenetration: number
    executability: number
    exposureRisk: number
    financeRelevance: number
    grainRelevance: number
    militaryRelevance: number
    socialOrderRelevance: number
    governanceRelevance: number
    dominantIntent: NorthDominantIntent
  stateBenefit?: number
    targetBenefit?: number
    factionBenefit?: number
    advicePolarity?: AdvicePolarity
    legitimacyDirection?: number
    omenPolarity?: OmenPolarity
    selfTrapPotential?: number
    scapegoatClarity?: number
    omenAnchorStrength?: number
    legitimacyCrack?: number
    suspicionDirection?: number
    suspicionTransmission?: number
    fractureTransmission?: number
    proxyTransmission?: number
    evidence: string[]
}

export interface PolicyReasonParseResult {
    focusAlignment: number
    executionClarity: number
    costAwareness: number
    legitimacyAlignment: number
    policyStance: PolicyStance
    evidence: string[]
}

export interface DelayedBacklash {
    npcId: string
    npcName: string
    type: BacklashType
    intensity: number
    summary: string
    sourceRound: number
}

export interface NpcMemoryEntry {
    npcId: string
    category: NpcMemoryCategory
    sourceRound: number
    importance: 1 | 2 | 3
    summary: string
    schemeType?: SchemeType
    tags?: string[]
}

export type NpcMemoryLedger = Record<string, NpcMemoryEntry[]>

export interface AiNativeSummary {
    schemeHints: string[]
    backlashHints: string[]
    policyHints: string[]
}

export interface FactionCollapseReport {
    factionId: CourtFactionId
    factionName: string
    severity: 'breach' | 'collapse'
    reasons: string[]
    summary: string
}

export interface BorrowedBladeReport {
    actorNpcId: string
    actorNpcName: string
    targetNpcId: string
    targetNpcName: string
    outcome: BorrowedBladeOutcome
    summary: string
}

export interface RoundHistoryEntry {
    round: number
    eventName: string
    schemeCount: number
    schemeSuccessCount: number
    keyTargets: string[]
    schemeDetails?: Array<{
        targetNpcId: string
        targetNpcName: string
        schemeType: SchemeType
        success: boolean
    }>
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
    openingLines: string[]
    epilogueLines: string[]
    sceneLabel: string | null
    invasionDriver: string | null
    triggerRound: number | null
    standoutNpc: string | null
    northFailureSummary: string | null
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
