import type { NPC, RelationMemoryEntry, RelationMemoryLedger, RelationMemoryStance, SchemeAction } from './types'
import type { SchemeResult } from './schemeEngine'

const STANCE_LABELS: Record<RelationMemoryStance, string> = {
    suspicion: '疑忌',
    resentment: '怨恨',
    fear: '惧怕',
    reliance: '依赖',
}

const STANCE_SCORES: Record<RelationMemoryStance, number> = {
    suspicion: 18,
    resentment: 14,
    fear: 16,
    reliance: 12,
}

export function createRelationMemoryEntry(params: {
    holderNpcId: string
    subjectNpcId: string
    stance: RelationMemoryStance
    sourceRound: number
    importance: 1 | 2 | 3
    summary: string
}): RelationMemoryEntry {
    return {
        holderNpcId: params.holderNpcId,
        subjectNpcId: params.subjectNpcId,
        stance: params.stance,
        sourceRound: params.sourceRound,
        importance: params.importance,
        summary: params.summary,
        occurrences: 1,
    }
}

export function mergeRelationMemoryEntries(
    ledger: RelationMemoryLedger,
    entries: RelationMemoryEntry[],
): RelationMemoryLedger {
    const merged: RelationMemoryLedger = {}

    for (const [holderNpcId, holderEntries] of Object.entries(ledger)) {
        merged[holderNpcId] = holderEntries.map(entry => ({ ...entry }))
    }

    for (const entry of entries) {
        const holderEntries = merged[entry.holderNpcId] ?? []
        const match = holderEntries.find(item =>
            item.subjectNpcId === entry.subjectNpcId && item.stance === entry.stance,
        )

        if (match) {
            const incomingRound = entry.sourceRound
            match.occurrences += entry.occurrences
            match.sourceRound = Math.max(match.sourceRound, incomingRound)
            match.importance = Math.max(match.importance, entry.importance) as 1 | 2 | 3
            if (incomingRound >= match.sourceRound) {
                match.summary = entry.summary
            }
            continue
        }

        holderEntries.push({ ...entry })
        merged[entry.holderNpcId] = holderEntries
    }

    return merged
}

export function deriveRelationMemoryEntriesForRound(params: {
    round: number
    schemes: SchemeAction[]
    schemeResults: SchemeResult[]
    npcsBefore: NPC[]
    npcsAfter: NPC[]
}): RelationMemoryEntry[] {
    const beforeById = new Map(params.npcsBefore.map(npc => [npc.id, npc]))
    const afterById = new Map(params.npcsAfter.map(npc => [npc.id, npc]))
    const entries: RelationMemoryEntry[] = []

    params.schemes.forEach((action, index) => {
        const result = params.schemeResults[index]
        if (!result?.success) return
        if (action.schemeType === 'omen') return

        const actor = afterById.get(action.targetNpcId) ?? beforeById.get(action.targetNpcId)
        const subjectId = action.relatedNpcId
        const subject = subjectId
            ? afterById.get(subjectId) ?? beforeById.get(subjectId) ?? null
            : null

        if (!actor || !subject) return

        const signal = deriveRelationSignal(action.schemeType, result)
        if (!signal) return

        entries.push(createRelationMemoryEntry({
            holderNpcId: actor.id,
            subjectNpcId: subject.id,
            stance: signal.stance,
            sourceRound: params.round,
            importance: signal.importance,
            summary: buildRelationMemorySummary({
                round: params.round,
                subjectName: subject.name,
                schemeType: action.schemeType,
                stance: signal.stance,
            }),
        }))
    })

    return entries
}

export function scoreRelationMemoryEntry(
    entry: RelationMemoryEntry,
    currentRound: number,
): number {
    const age = Math.max(0, currentRound - entry.sourceRound)
    const freshness = Math.max(0, 12 - age)
    return (
        entry.importance * 100 +
        entry.occurrences * 25 +
        freshness +
        (STANCE_SCORES[entry.stance] ?? 0)
    )
}

export function selectRelationMemoryEntries(params: {
    ledger: RelationMemoryLedger
    holderNpcId: string
    subjectNpcId?: string
    currentRound: number
    limit?: number
}): RelationMemoryEntry[] {
    const limit = Math.min(params.limit ?? 2, 2)
    const holderEntries = params.ledger[params.holderNpcId] ?? []
    const filtered = params.subjectNpcId
        ? holderEntries.filter(entry => entry.subjectNpcId === params.subjectNpcId)
        : holderEntries

    return filtered
        .slice()
        .sort((left, right) => {
            const scoreDelta =
                scoreRelationMemoryEntry(right, params.currentRound) -
                scoreRelationMemoryEntry(left, params.currentRound)
            if (scoreDelta !== 0) return scoreDelta
            return right.sourceRound - left.sourceRound
        })
        .slice(0, limit)
}

export function summarizeRelationMemoryEntries(entries: RelationMemoryEntry[]): string {
    return entries
        .slice(0, 2)
        .map(formatRelationMemorySummaryEntry)
        .join('；')
}

function formatRelationMemorySummaryEntry(entry: RelationMemoryEntry): string {
    const label = STANCE_LABELS[entry.stance]
    const repeatSuffix = entry.occurrences > 1 ? `x${entry.occurrences}` : ''
    const summary = String(entry.summary).trim()
    return `${label}${repeatSuffix}：${summary}`
}

function deriveRelationSignal(
    schemeType: SchemeAction['schemeType'],
    result: SchemeResult,
): { stance: RelationMemoryStance; importance: 1 | 2 | 3 } | null {
    switch (schemeType) {
        case 'slander': {
            const suspicionStrength =
                Math.max(-result.personEffects.relatedTrustDelta, 0) * 0.35 +
                Math.max(result.northParse.suspicionTransmission ?? 0, 0) * 8 +
                Math.max(result.northParse.structuralPenetration ?? 0, 0) * 2
            return {
                stance: 'suspicion',
                importance: suspicionStrength >= 10 ? 3 : suspicionStrength >= 6 ? 2 : 1,
            }
        }

        case 'alienate': {
            const fractureStrength =
                Math.max(-result.personEffects.relatedTrustDelta, 0) * 0.3 +
                Math.max(-result.personEffects.relatedLoyaltyDelta, 0) * 0.45 +
                Math.max(result.northParse.fractureTransmission ?? 0, 0) * 8 +
                Math.max(result.northParse.structuralPenetration ?? 0, 0) * 1.5
            return {
                stance: fractureStrength >= 8 ? 'resentment' : 'suspicion',
                importance: fractureStrength >= 12 ? 3 : fractureStrength >= 6 ? 2 : 1,
            }
        }

        case 'frame': {
            const exposedFlaw =
                (result.northParse.selfTrapPotential ?? 0) >= 0.7 &&
                (result.northParse.scapegoatClarity ?? 0) >= 0.7 &&
                (Math.max(-result.personEffects.trustDelta, 0) >= 4 ||
                    Math.max(-result.personEffects.relatedTrustDelta, 0) >= 4)
            if (!exposedFlaw) return null
            return {
                stance: 'suspicion',
                importance:
                    (result.northParse.selfTrapPotential ?? 0) >= 0.85 &&
                    (result.northParse.scapegoatClarity ?? 0) >= 0.85
                        ? 3
                        : 2,
            }
        }

        default:
            return null
    }
}

function buildRelationMemorySummary(params: {
    round: number
    subjectName: string
    schemeType: SchemeAction['schemeType']
    stance: RelationMemoryStance
}): string {
    const roundLabel = `第${params.round}回合`
    switch (params.schemeType) {
        case 'slander':
            return `${roundLabel}，你对${params.subjectName}起了疑心，觉得他的话不太可信。`
        case 'alienate':
            return `${roundLabel}，你把${params.subjectName}记成了更容易结怨的人。`
        case 'frame':
            return `${roundLabel}，你看出${params.subjectName}已经露出破绽。`
        default:
            return `${roundLabel}，你对${params.subjectName}产生了${params.stance}。`
    }
}
