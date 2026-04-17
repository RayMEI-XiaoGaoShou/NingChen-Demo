import type { ExternalActionReport } from './roundSettlement'
import type { SchemeResult } from './schemeEngine'
import type { NPC, NpcMemoryEntry, NpcMemoryLedger, SchemeAction, SchemeType } from './types'

const SOFT_SCHEMES = new Set<SchemeType>(['probe', 'advise', 'appeal'])
const HARD_SCHEMES = new Set<SchemeType>(['slander', 'alienate', 'frame', 'proxy', 'omen', 'secession', 'rebellion'])
const TERMINAL_EXTERNAL_STATUSES = new Set(['secession', 'rebellion'])

export function deriveNpcMemoryEntriesForRound(params: {
    round: number
    schemes: SchemeAction[]
    schemeResults: SchemeResult[]
    npcsBefore: NPC[]
    npcsAfter: NPC[]
    externalActionReports: ExternalActionReport[]
}): NpcMemoryEntry[] {
    const beforeById = new Map(params.npcsBefore.map(npc => [npc.id, npc]))
    const afterById = new Map(params.npcsAfter.map(npc => [npc.id, npc]))
    const entries: NpcMemoryEntry[] = []

    params.schemes.forEach((action, index) => {
        const result = params.schemeResults[index]
        if (!result) return

        const before = beforeById.get(action.targetNpcId)
        const after = afterById.get(action.targetNpcId)
        if (!before || !after) return

        const trustDelta = result.personEffects.trustDelta
        const benefitSignal = Math.max(result.northParse.targetBenefit ?? 0, result.northParse.factionBenefit ?? 0)
        const hardScheme = HARD_SCHEMES.has(action.schemeType)
        const softScheme = SOFT_SCHEMES.has(action.schemeType)
        const exposedFallout = result.delayedBacklash.some(backlash =>
            backlash.npcId === after.id && (backlash.type === 'exposed' || backlash.type === 'shock'),
        )

        if (result.success && softScheme && trustDelta >= 8) {
            entries.push({
                npcId: after.id,
                category: 'favor',
                sourceRound: params.round,
                importance: trustDelta >= 10 ? 3 : 2,
                summary: `第${params.round}回合，你曾顺着${after.name}的盘算与利益递话，让他记住你并非只会索取。`,
                schemeType: action.schemeType,
                tags: ['trust', 'soft'],
            })
        }

        if (result.success && benefitSignal >= 0.4) {
            entries.push({
                npcId: after.id,
                category: 'saved_face',
                sourceRound: params.round,
                importance: benefitSignal >= 0.6 ? 3 : 2,
                summary: `第${params.round}回合，你曾替${after.name}添过一层体面与筹码，这笔情面他未必会忘。`,
                schemeType: action.schemeType,
                tags: ['face', 'benefit'],
            })
        }

        if (hardScheme && trustDelta <= -6) {
            entries.push({
                npcId: after.id,
                category: result.success ? 'warning' : 'betrayal',
                sourceRound: params.round,
                importance: trustDelta <= -10 ? 3 : 2,
                summary: result.success
                    ? `第${params.round}回合，你曾逼${after.name}接招表态，他记得你下手从不算轻。`
                    : `第${params.round}回合，你曾在${after.name}身上露过锋芒，失手后的痕迹他还记着。`,
                schemeType: action.schemeType,
                tags: ['pressure', 'hard'],
            })
        }

        if (exposedFallout) {
            entries.push({
                npcId: after.id,
                category: 'betrayal',
                sourceRound: params.round,
                importance: 3,
                summary: `第${params.round}回合，你对${after.name}的算计留下了显眼痕迹，他对你会多记一层疑心。`,
                schemeType: action.schemeType,
                tags: ['exposed', 'fallout'],
            })
        }

        if (before.externalStatus !== after.externalStatus && TERMINAL_EXTERNAL_STATUSES.has(after.externalStatus)) {
            entries.push({
                npcId: after.id,
                category: 'power_shift',
                sourceRound: params.round,
                importance: 3,
                summary: `第${params.round}回合，你曾推着${after.name}在局里换过一层位置，他不会轻易忘掉这一步。`,
                schemeType: action.schemeType,
                tags: ['external', after.externalStatus],
            })
        }
    })

    for (const report of params.externalActionReports) {
        entries.push({
            npcId: report.npcId,
            category: 'power_shift',
            sourceRound: params.round,
            importance: 3,
            summary: `第${params.round}回合，${report.npcName}${report.outcome}，他很难忘记这一步是谁替他推开的。`,
            schemeType: report.action,
            tags: ['external', report.action],
        })
    }

    return dedupeEntries(entries)
}

export function mergeNpcMemoryEntries(
    ledger: NpcMemoryLedger,
    entries: NpcMemoryEntry[],
): NpcMemoryLedger {
    const merged: NpcMemoryLedger = {}

    for (const [npcId, npcEntries] of Object.entries(ledger)) {
        merged[npcId] = npcEntries.map(entry => ({
            ...entry,
            tags: entry.tags ? [...entry.tags] : undefined,
        }))
    }

    for (const entry of dedupeEntries(entries)) {
        const current = merged[entry.npcId] ?? []
        current.push({
            ...entry,
            tags: entry.tags ? [...entry.tags] : undefined,
        })
        merged[entry.npcId] = rankEntries(dedupeEntries(current)).slice(0, 12)
    }

    return merged
}

export function buildNpcLongTermMemorySummary(params: {
    npcId: string
    ledger: NpcMemoryLedger
    currentRound: number
    limit?: number
}): string {
    const limit = params.limit ?? 3
    const entries = rankEntries(params.ledger[params.npcId] ?? [], params.currentRound).slice(0, limit)
    return entries.map(entry => entry.summary).join('；')
}

function dedupeEntries(entries: NpcMemoryEntry[]): NpcMemoryEntry[] {
    const seen = new Set<string>()
    return entries.filter(entry => {
        const key = `${entry.npcId}|${entry.category}|${entry.sourceRound}|${entry.summary}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
    })
}

function rankEntries(entries: NpcMemoryEntry[], currentRound = Number.MAX_SAFE_INTEGER): NpcMemoryEntry[] {
    return [...entries].sort((left, right) => {
        const leftScore = scoreEntry(left, currentRound)
        const rightScore = scoreEntry(right, currentRound)
        if (rightScore !== leftScore) return rightScore - leftScore
        return right.sourceRound - left.sourceRound
    })
}

function scoreEntry(entry: NpcMemoryEntry, currentRound: number): number {
    const age = Math.max(0, currentRound - entry.sourceRound)
    const freshness = Math.max(0, 12 - age)
    return entry.importance * 100 + freshness
}
