import type { Faction, NationDimensions, NPC, SchemeAction } from '../../game/types'
import type { SchemeResult, SchemeNpcActionNarrative } from '../../game/schemeEngine'

export interface SchemeResultEffectTag {
    label: string
    tone: 'positive' | 'negative'
}

export interface SchemeNpcActionDisplay {
    label: string
    text: string
    isPlaceholder: boolean
}

const NORTH_DIMENSION_LABELS: Record<keyof NationDimensions, string> = {
    finance: '财政',
    grain: '粮草',
    military: '军事',
    socialOrder: '民生',
    governance: '统治',
}

const FACTION_EFFECT_LABELS = {
    courtInfluence: '朝堂影响力',
    internalStability: '内部稳定度',
    militaryPower: '军力',
} as const

type DisplaySchemeResult = Pick<SchemeResult, 'trustChange' | 'relatedTrustChange' | 'northDimensionChanges'> & {
    factionEffects?: SchemeResult['factionEffects']
    personEffects?: Partial<SchemeResult['personEffects']>
}

export function buildSchemeResultEffectTags(params: {
    result: DisplaySchemeResult
    action: Pick<SchemeAction, 'relatedNpcId'> | null
    targetNpc: Pick<NPC, 'name' | 'powerBase'> | null
    relatedNpc: Pick<NPC, 'name' | 'powerBase'> | null
    factions: Array<Pick<Faction, 'id' | 'name'>>
}): SchemeResultEffectTag[] {
    const tags: SchemeResultEffectTag[] = []
    const { result, targetNpc, relatedNpc } = params

    pushTag(tags, targetNpc && result.trustChange !== 0 ? `${targetNpc.name} 信任度 ${formatDelta(result.trustChange)}` : null, result.trustChange)
    pushTag(tags, relatedNpc && result.relatedTrustChange !== 0 ? `${relatedNpc.name} 信任度 ${formatDelta(result.relatedTrustChange)}` : null, result.relatedTrustChange)

    for (const [dimension, value] of Object.entries(result.northDimensionChanges ?? {}) as Array<[keyof NationDimensions, number]>) {
        const formatted = formatDelta(value)
        if (!formatted) continue
        pushTag(tags, `北周 ${NORTH_DIMENSION_LABELS[dimension] ?? dimension} ${formatted}`, value)
    }

    const personEffects = result.personEffects
    if (targetNpc?.powerBase === 'external' && personEffects) {
        pushTag(tags, buildDeltaLabel(`${targetNpc.name} 忠诚度`, personEffects.loyaltyDelta), personEffects.loyaltyDelta)
        pushTag(tags, buildDeltaLabel(`${targetNpc.name} 军力`, personEffects.militaryPowerDelta), personEffects.militaryPowerDelta)
    }

    if (relatedNpc?.powerBase === 'external' && personEffects) {
        pushTag(tags, buildDeltaLabel(`${relatedNpc.name} 忠诚度`, personEffects.relatedLoyaltyDelta), personEffects.relatedLoyaltyDelta)
        pushTag(tags, buildDeltaLabel(`${relatedNpc.name} 军力`, personEffects.relatedMilitaryPowerDelta ?? 0), personEffects.relatedMilitaryPowerDelta ?? 0)
    }
    if (personEffects) {
        pushTag(tags, buildDeltaLabel(targetNpc ? `${targetNpc.name} 已知情报` : '已知情报', personEffects.intelDelta), personEffects.intelDelta)
    }

    for (const [factionId, vector] of Object.entries(result.factionEffects ?? {})) {
        if (!vector) continue
        const factionName = params.factions.find(faction => faction.id === factionId)?.name ?? factionId
        pushTag(tags, buildDeltaLabel(`${factionName} ${FACTION_EFFECT_LABELS.courtInfluence}`, vector.courtInfluence), vector.courtInfluence)
        pushTag(tags, buildDeltaLabel(`${factionName} ${FACTION_EFFECT_LABELS.internalStability}`, vector.internalStability), vector.internalStability)
        pushTag(tags, buildDeltaLabel(`${factionName} ${FACTION_EFFECT_LABELS.militaryPower}`, vector.militaryPower), vector.militaryPower)
    }

    return tags
}

export function getSchemeNpcActionDisplay(params: {
    npcName?: string | null
    npcAction?: SchemeNpcActionNarrative | null
    delayFallback: boolean
}): SchemeNpcActionDisplay | null {
    if (!params.npcAction?.text) return null

    const labelSuffix = getNpcActionLabelSuffix(params.npcAction.kind)
    const label = params.npcName ? `${params.npcName}${labelSuffix}` : `NPC${labelSuffix}`
    if (params.delayFallback && params.npcAction.source === 'fallback') {
        const subject = params.npcName ?? 'NPC'
        return {
            label,
            text: `正在筹算${subject}${labelSuffix}...`,
            isPlaceholder: true,
        }
    }

    return {
        label,
        text: params.npcAction.text,
        isPlaceholder: false,
    }
}

function getNpcActionLabelSuffix(kind: SchemeNpcActionNarrative['kind'] | undefined): string {
    switch (kind) {
        case 'counter':
            return '反制'
        case 'attitude':
            return '态度'
        case 'intel':
            return '口风'
        default:
            return '举措'
    }
}

function buildDeltaLabel(prefix: string, value: number | undefined): string | null {
    const formatted = formatDelta(value)
    return formatted ? `${prefix} ${formatted}` : null
}

function pushTag(tags: SchemeResultEffectTag[], label: string | null, value: number | undefined): void {
    const formatted = formatDelta(value)
    if (!label || !formatted || !value) return
    tags.push({
        label,
        tone: value > 0 ? 'positive' : 'negative',
    })
}

function formatDelta(value: number | undefined): string | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null
    const rounded = Math.round(value * 10) / 10
    if (rounded === 0) return null
    const absText = Number.isInteger(rounded) ? `${Math.abs(rounded)}` : Math.abs(rounded).toFixed(1)
    return `${rounded > 0 ? '+' : '-'}${absText}`
}
