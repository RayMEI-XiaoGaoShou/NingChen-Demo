import type { FactionVector, PersonEffects } from './schemeTemplates'
import {
    buildSchemeNarrativeObligations,
    validateNarrativeObligations,
    type SchemeNarrativeObligation,
} from './schemeNarrativeObligations'
import type { CourtFactionId, NationDimensions, NPC, SchemeAction, SchemeType } from './types'

export type SchemeImpactDimension = keyof NationDimensions
export type SchemeImpactSource =
    | 'player_direct'
    | 'related_npc'
    | 'faction_ripple'
    | 'external_loyalty'
    | 'external_military'
    | 'strategic_spillover'
    | 'special_action'

export interface SchemeNationImpactSource {
    dimension: SchemeImpactDimension
    value: number
    source: SchemeImpactSource
    label: string
}

export interface SchemeImpactTrace {
    directNationDimensions: SchemeImpactDimension[]
    playerDirectNationDimensions: SchemeImpactDimension[]
    relatedNationDimensions: SchemeImpactDimension[]
    rippleNationDimensions: SchemeImpactDimension[]
    secondaryNationDimensions: SchemeImpactDimension[]
    nationImpactSources: SchemeNationImpactSource[]
    personEffectSummary: string[]
    factionEffectSummary: string[]
    nationEffectSummary: string[]
    relatedImpactSummary?: string | null
}

export interface SchemeCausalEventFrame {
    actorNpcId: string
    actorNpcName: string
    relatedNpcId?: string
    relatedNpcName?: string
    schemeType: SchemeType
    actionLabel: string
    instrumentLabel: string
}

export interface SchemeCausalEffect {
    scope: 'nation'
    dimension: SchemeImpactDimension
    value: number
    source: SchemeImpactSource
    label: string
}

export type SchemeCausalEventKind = 'visible_impact' | 'failure' | 'trust_only' | 'intel_progress'
export type SchemeCausalEventVisibility = 'public' | 'private' | 'south_intel_only'
export type BorrowedBladeOutcomeCode =
    | 'borrowed_blade_failed'
    | 'borrowed_blade_blocked_by_protection'
    | 'borrowed_blade_dismissed'
    | 'borrowed_blade_executed'
export type ExternalActionOutcomeCode =
    | 'secession_established'
    | 'secession_hesitation'
    | 'rebellion_established'
    | 'rebellion_crushed'
export type PostResolutionOutcomeCode = BorrowedBladeOutcomeCode | ExternalActionOutcomeCode

export interface SchemePostResolutionEvent {
    kind: 'borrowed_blade' | 'external_action'
    outcome: string
    outcomeCode?: PostResolutionOutcomeCode
    summary: string
    actionMechanism: string[]
    counterAction: string[]
    damageMechanism: string[]
}

export interface SchemeCausalEventDraft {
    actionId?: string
    actorNpcId: string
    actorNpcName: string
    relatedNpcId?: string
    relatedNpcName?: string
    schemeType: SchemeType
    success: boolean
    eventKind?: SchemeCausalEventKind
    visibility?: SchemeCausalEventVisibility
    motionText: string
    motionSource: 'ai' | 'fallback' | 'local'
    primaryDimensions: SchemeImpactDimension[]
    secondaryDimensions: SchemeImpactDimension[]
    eventFrame?: SchemeCausalEventFrame
    directEffects?: SchemeCausalEffect[]
    secondaryEffects?: SchemeCausalEffect[]
    narrativeObligations?: SchemeNarrativeObligation[]
    postResolutionEvent?: SchemePostResolutionEvent | null
    effectSummary: string[]
    relatedImpactSummary?: string | null
}

const DIMENSION_LABELS: Record<SchemeImpactDimension, string> = {
    finance: '北周 财政',
    grain: '北周 粮草',
    military: '北周 军事',
    socialOrder: '北周 民生',
    governance: '北周 统治',
}

const FACTION_LABELS: Record<CourtFactionId, string> = {
    emperor: '帝党',
    empress: '后党',
}

export function buildSchemeImpactTrace(input: {
    targetNpc: NPC
    relatedNpc: NPC | null
    personEffects: PersonEffects
    factionEffects: Partial<Record<CourtFactionId, FactionVector>>
    nationEffects: Partial<NationDimensions>
    directNationEffects?: Partial<NationDimensions>
    nationImpactSources?: SchemeNationImpactSource[]
    relatedImpactSummary?: string | null
}): SchemeImpactTrace {
    const nationImpactSources = input.nationImpactSources
        ? normalizeNationImpactSources(input.nationImpactSources)
        : buildLegacyNationImpactSources(input.directNationEffects ?? input.nationEffects)
    const playerDirectNationDimensions = getChangedDimensionsFromSources(nationImpactSources, ['player_direct'])
    const relatedNationDimensions = getChangedDimensionsFromSources(nationImpactSources, ['related_npc'])
    const rippleNationDimensions = getChangedDimensionsFromSources(nationImpactSources, [
        'faction_ripple',
        'external_loyalty',
        'external_military',
        'strategic_spillover',
        'special_action',
    ])
    const directNationDimensions = getChangedDimensionsFromSources(nationImpactSources, ['player_direct', 'related_npc'])
    const allNationDimensions = getChangedDimensions(input.nationEffects)
    const directSet = new Set(directNationDimensions)
    const secondaryNationDimensions = allNationDimensions.filter(dimension => !directSet.has(dimension))

    return {
        directNationDimensions,
        playerDirectNationDimensions,
        relatedNationDimensions,
        rippleNationDimensions,
        secondaryNationDimensions,
        nationImpactSources,
        personEffectSummary: buildPersonEffectSummary(input.targetNpc, input.relatedNpc, input.personEffects),
        factionEffectSummary: buildFactionEffectSummary(input.factionEffects),
        nationEffectSummary: buildNationEffectSummary(input.nationEffects),
        relatedImpactSummary: input.relatedImpactSummary ?? null,
    }
}

export function buildSchemeCausalEventDraft(input: {
    action: SchemeAction
    targetNpc: NPC
    relatedNpc: NPC | null
    success: boolean
    motionText?: string | null
    motionSource?: 'ai' | 'fallback' | 'local'
    impactTrace: SchemeImpactTrace
    eventKind?: SchemeCausalEventKind | null
    visibility?: SchemeCausalEventVisibility | null
}): SchemeCausalEventDraft | null {
    const motionText = input.motionText?.trim()
    const eventKind = input.eventKind ?? inferCausalEventKind(input.success, input.impactTrace)

    if (!motionText || !eventKind) return null

    return {
        actionId: input.action.id,
        actorNpcId: input.targetNpc.id,
        actorNpcName: input.targetNpc.name,
        relatedNpcId: input.relatedNpc?.id,
        relatedNpcName: input.relatedNpc?.name,
        schemeType: input.action.schemeType,
        success: input.success,
        eventKind,
        visibility: input.visibility ?? inferCausalEventVisibility(input.action.schemeType, eventKind),
        motionText,
        motionSource: input.motionSource ?? 'fallback',
        primaryDimensions: input.impactTrace.directNationDimensions,
        secondaryDimensions: input.impactTrace.secondaryNationDimensions,
        eventFrame: buildCausalEventFrame(input.action, input.targetNpc, input.relatedNpc, input.impactTrace),
        directEffects: buildCausalEffects(input.impactTrace, ['player_direct', 'related_npc']),
        secondaryEffects: buildCausalEffects(input.impactTrace, [
            'faction_ripple',
            'external_loyalty',
            'external_military',
            'strategic_spillover',
            'special_action',
        ]),
        narrativeObligations: buildSchemeNarrativeObligations({
            nationEffects: aggregateNationImpactSources(input.impactTrace.nationImpactSources),
            specialAction: input.action.schemeType === 'secession' || input.action.schemeType === 'rebellion'
                ? input.action.schemeType
                : null,
            schemeType: input.action.schemeType,
        }),
        effectSummary: [
            ...input.impactTrace.personEffectSummary,
            ...input.impactTrace.factionEffectSummary,
            ...input.impactTrace.nationEffectSummary,
            ...(input.impactTrace.relatedImpactSummary ? [input.impactTrace.relatedImpactSummary] : []),
        ],
        relatedImpactSummary: input.impactTrace.relatedImpactSummary ?? null,
    }
}

export function validateSchemeCausalEvent(input: {
    event: SchemeCausalEventDraft | null | undefined
    targetNpc: NPC
    relatedNpc: NPC | null
}): { accepted: boolean; reasons: string[] } {
    const reasons: string[] = []
    const event = input.event
    if (!event) return { accepted: false, reasons: ['missing_event'] }

    if (!event.motionText.trim()) reasons.push('empty_motion')
    if (!mentionsNpc(event.motionText, input.targetNpc)) reasons.push('missing_target_npc')
    if (event.relatedImpactSummary && input.relatedNpc && !mentionsNpc(event.motionText, input.relatedNpc)) {
        reasons.push('missing_related_npc')
    }
    if (event.primaryDimensions.length > 0 && !event.primaryDimensions.some(dimension => dimensionKeyword(dimension).test(event.motionText))) {
        reasons.push('missing_primary_dimension')
    }
    if (/萧宝颖.*南陈暗线|萧宝颖.*南陈内应|南陈内应|南陈暗线/u.test(event.motionText)) {
        reasons.push('forbidden_secret_leak')
    }
    if (/太子宇文棣|宇文棣.*(?:太子|少帝|储君|皇帝|陛下)|贺拔琪.*殿下/u.test(event.motionText)) {
        reasons.push('canon_title_violation')
    }
    reasons.push(...validateNarrativeObligations(event.motionText, event.narrativeObligations ?? []).reasons)

    return {
        accepted: reasons.length === 0,
        reasons,
    }
}

function mentionsNpc(text: string, npc: NPC): boolean {
    if (text.includes(npc.name)) return true
    return getNpcCanonicalAliases(npc).some(alias => text.includes(alias))
}

function getNpcCanonicalAliases(npc: NPC): string[] {
    switch (npc.id) {
        case 'hebaqí':
            return ['太后', '太后娘娘', '帘前', '本宫']
        case 'yuwendi':
            return ['燕王', '王爷', '左丞相']
        case 'zuting':
            return ['祖相', '右丞相']
        case 'zongai':
            return ['中常侍', '宗常侍']
        case 'linghuelvguang':
            return ['秦国公', '令狐公']
        case 'duguwenyue':
            return ['独孤将军', '澜侯']
        case 'weichimù':
            return ['梁国公', '尉迟公']
        case 'erzhulié':
            return ['尔朱节度', '北庭节度']
        case 'hebaboguì':
            return ['北地公', '贺拔公']
        case 'ansiming':
            return ['安节帅', '卢龙节度']
        default:
            return []
    }
}

function aggregateNationImpactSources(sources: SchemeNationImpactSource[]): Partial<NationDimensions> {
    const aggregated: Partial<NationDimensions> = {}
    for (const item of sources) {
        aggregated[item.dimension] = roundOneDecimal((aggregated[item.dimension] ?? 0) + item.value)
    }
    return aggregated
}

function getChangedDimensions(changes: Partial<NationDimensions>): SchemeImpactDimension[] {
    return (Object.keys(DIMENSION_LABELS) as SchemeImpactDimension[])
        .filter(dimension => isNonZero(changes[dimension]))
        .sort((left, right) => Math.abs(changes[right] ?? 0) - Math.abs(changes[left] ?? 0))
}

function getChangedDimensionsFromSources(
    sources: SchemeNationImpactSource[],
    allowedSources: SchemeImpactSource[],
): SchemeImpactDimension[] {
    const allowed = new Set(allowedSources)
    const changes: Partial<NationDimensions> = {}
    for (const source of sources) {
        if (!allowed.has(source.source)) continue
        changes[source.dimension] = (changes[source.dimension] ?? 0) + source.value
    }
    return getChangedDimensions(changes)
}

function buildLegacyNationImpactSources(changes: Partial<NationDimensions>): SchemeNationImpactSource[] {
    return getChangedDimensions(changes).map(dimension => ({
        dimension,
        value: changes[dimension] ?? 0,
        source: 'player_direct',
        label: `${sourceLabel('player_direct')}：${DIMENSION_LABELS[dimension]}${formatSigned(changes[dimension] ?? 0)}`,
    }))
}

function normalizeNationImpactSources(sources: SchemeNationImpactSource[]): SchemeNationImpactSource[] {
    const merged = new Map<string, SchemeNationImpactSource>()
    for (const item of sources) {
        if (!isNonZero(item.value)) continue
        const key = `${item.source}:${item.dimension}`
        const existing = merged.get(key)
        const value = roundOneDecimal((existing?.value ?? 0) + item.value)
        merged.set(key, {
            dimension: item.dimension,
            source: item.source,
            value,
            label: `${sourceLabel(item.source)}：${DIMENSION_LABELS[item.dimension]}${formatSigned(value)}`,
        })
    }

    return Array.from(merged.values())
        .filter(item => isNonZero(item.value))
        .sort((left, right) => {
            if (left.source !== right.source) return sourceOrder(left.source) - sourceOrder(right.source)
            return Math.abs(right.value) - Math.abs(left.value)
        })
}

function buildCausalEventFrame(
    action: SchemeAction,
    targetNpc: NPC,
    relatedNpc: NPC | null,
    trace: SchemeImpactTrace,
): SchemeCausalEventFrame {
    const focus = [
        ...trace.playerDirectNationDimensions,
        ...trace.relatedNationDimensions,
        ...trace.rippleNationDimensions,
    ]
    const firstFocus = focus[0]
    return {
        actorNpcId: targetNpc.id,
        actorNpcName: targetNpc.name,
        relatedNpcId: relatedNpc?.id,
        relatedNpcName: relatedNpc?.name,
        schemeType: action.schemeType,
        actionLabel: schemeActionLabel(action.schemeType),
        instrumentLabel: firstFocus ? DIMENSION_LABELS[firstFocus] : '权责与人手调度',
    }
}

function buildCausalEffects(
    trace: SchemeImpactTrace,
    allowedSources: SchemeImpactSource[],
): SchemeCausalEffect[] {
    const allowed = new Set(allowedSources)
    return trace.nationImpactSources
        .filter(item => allowed.has(item.source))
        .map(item => ({
            scope: 'nation' as const,
            dimension: item.dimension,
            value: item.value,
            source: item.source,
            label: item.label,
        }))
}

function buildPersonEffectSummary(targetNpc: NPC, relatedNpc: NPC | null, effects: PersonEffects): string[] {
    const pieces: string[] = []
    if (isNonZero(effects.trustDelta)) pieces.push(`${targetNpc.name}信任度${formatSigned(effects.trustDelta)}`)
    if (relatedNpc && isNonZero(effects.relatedTrustDelta)) pieces.push(`${relatedNpc.name}信任度${formatSigned(effects.relatedTrustDelta)}`)
    if (isNonZero(effects.intelDelta)) pieces.push(`${targetNpc.name}已知情报${formatSigned(effects.intelDelta)}`)
    if (targetNpc.powerBase === 'external' && isNonZero(effects.loyaltyDelta)) pieces.push(`${targetNpc.name}忠诚度${formatSigned(effects.loyaltyDelta)}`)
    if (relatedNpc?.powerBase === 'external' && isNonZero(effects.relatedLoyaltyDelta)) pieces.push(`${relatedNpc.name}忠诚度${formatSigned(effects.relatedLoyaltyDelta)}`)
    if (targetNpc.powerBase === 'external' && isNonZero(effects.militaryPowerDelta)) pieces.push(`${targetNpc.name}军力${formatSigned(effects.militaryPowerDelta)}`)
    if (relatedNpc?.powerBase === 'external' && isNonZero(effects.relatedMilitaryPowerDelta)) pieces.push(`${relatedNpc.name}军力${formatSigned(effects.relatedMilitaryPowerDelta ?? 0)}`)
    return pieces
}

function inferCausalEventKind(
    success: boolean,
    trace: SchemeImpactTrace,
): SchemeCausalEventKind | null {
    if (!success) return 'failure'
    if (
        trace.factionEffectSummary.length > 0
        || trace.nationEffectSummary.length > 0
        || Boolean(trace.relatedImpactSummary)
        || trace.personEffectSummary.some(summary => /忠诚度|军力/u.test(summary))
    ) {
        return 'visible_impact'
    }
    if (trace.personEffectSummary.some(summary => /已知情报/u.test(summary))) return 'intel_progress'
    if (trace.personEffectSummary.some(summary => /信任度/u.test(summary))) return 'trust_only'
    return null
}

function inferCausalEventVisibility(
    schemeType: SchemeType,
    eventKind: SchemeCausalEventKind,
): SchemeCausalEventVisibility {
    if (eventKind === 'visible_impact') return 'public'
    if (eventKind === 'trust_only') return 'private'
    if (eventKind === 'intel_progress') return 'south_intel_only'
    return isHardSchemeType(schemeType) ? 'public' : 'south_intel_only'
}

function isHardSchemeType(schemeType: SchemeType): boolean {
    return schemeType === 'slander'
        || schemeType === 'alienate'
        || schemeType === 'frame'
        || schemeType === 'proxy'
        || schemeType === 'omen'
        || schemeType === 'secession'
        || schemeType === 'rebellion'
}

function buildFactionEffectSummary(effects: Partial<Record<CourtFactionId, FactionVector>>): string[] {
    const pieces: string[] = []
    for (const [factionId, vector] of Object.entries(effects) as Array<[CourtFactionId, FactionVector | undefined]>) {
        if (!vector) continue
        const details: string[] = []
        if (isNonZero(vector.militaryPower)) details.push(`军力${formatSigned(vector.militaryPower)}`)
        if (isNonZero(vector.courtInfluence)) details.push(`朝堂影响力${formatSigned(vector.courtInfluence)}`)
        if (isNonZero(vector.internalStability)) details.push(`内部稳定度${formatSigned(vector.internalStability)}`)
        if (details.length > 0) pieces.push(`${FACTION_LABELS[factionId]}${details.join('、')}`)
    }
    return pieces
}

function buildNationEffectSummary(effects: Partial<NationDimensions>): string[] {
    return getChangedDimensions(effects).map(dimension => `${DIMENSION_LABELS[dimension]}${formatSigned(effects[dimension] ?? 0)}`)
}

function dimensionKeyword(dimension: SchemeImpactDimension): RegExp {
    switch (dimension) {
        case 'finance':
            return /财政|度支|账|库|饷|钱|出入/u
        case 'grain':
            return /粮|仓|转运|粮道|仓廪/u
        case 'military':
            return /军|兵|兵械|军需|部曲|骑|号令/u
        case 'socialOrder':
            return /民|流言|风声|秩序|州县|地方/u
        case 'governance':
            return /诏|中枢|案牍|文书|督|调度|权责|名分/u
    }
}

function schemeActionLabel(schemeType: SchemeType): string {
    switch (schemeType) {
        case 'advise':
            return '献策落地'
        case 'slander':
            return '谗言追查'
        case 'alienate':
            return '离间拆协'
        case 'proxy':
            return '借刀压制'
        case 'frame':
            return '设局转嫌'
        case 'omen':
            return '谶纬追验'
        case 'secession':
            return '割据自保'
        case 'rebellion':
            return '举兵试探'
        case 'appeal':
            return '投书求援'
        case 'probe':
            return '探查试探'
        default:
            return '计谋落地'
    }
}

function sourceLabel(source: SchemeImpactSource): string {
    switch (source) {
        case 'player_direct':
            return '玩家说辞直接命中'
        case 'related_npc':
            return '牵连人物受损'
        case 'faction_ripple':
            return '政局二阶余波'
        case 'external_loyalty':
            return '外镇忠诚波动'
        case 'external_military':
            return '外镇军力波动'
        case 'strategic_spillover':
            return '战略连锁余波'
        case 'special_action':
            return '特殊行动'
    }
}

function sourceOrder(source: SchemeImpactSource): number {
    switch (source) {
        case 'player_direct':
            return 1
        case 'related_npc':
            return 2
        case 'faction_ripple':
            return 3
        case 'external_loyalty':
            return 4
        case 'external_military':
            return 5
        case 'strategic_spillover':
            return 6
        case 'special_action':
            return 7
    }
}

function isNonZero(value: number | undefined): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value !== 0
}

function formatSigned(value: number): string {
    const rounded = roundOneDecimal(value)
    return `${rounded > 0 ? '+' : ''}${rounded}`
}

function roundOneDecimal(value: number): number {
    return Math.round(value * 10) / 10
}
