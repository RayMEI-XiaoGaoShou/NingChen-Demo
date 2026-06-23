import type { SchemeCausalEventDraft, SchemeImpactDimension } from './schemeCausalEvent'
import type { SchemeResult } from './schemeEngine'
import type {
    CourtFactionId,
    NPC,
    SchemeAction,
    SchemeType,
    WorldEventMemory,
    WorldMemoryLedger,
    WorldMemoryScope,
    WorldMemoryVisibility,
} from './types'

const WORLD_MEMORY_LIMIT = 120
const PROMPT_MEMORY_LIMIT = 3
const DIMENSIONS: SchemeImpactDimension[] = ['finance', 'grain', 'military', 'socialOrder', 'governance']

const SCOPE_WEIGHT: Record<WorldMemoryScope, number> = {
    chronicle_fact: 50,
    court_public: 44,
    south_intel: 40,
    local_rumor: 34,
    faction_private: 30,
}

const PUBLIC_FORBIDDEN_PATTERNS = [
    /南陈暗线/gu,
    /南陈内应/gu,
    /萧宝颖[^，。；;]{0,16}南陈/gu,
    /萧宝颖[^，。；;]{0,12}(?:促成|推动|设下|布下|暗中)/gu,
    /你(?:的)?(?:话头|说辞|计谋|谋划)/gu,
]

export function deriveWorldEventMemoriesForRound(params: {
    round: number
    actions: SchemeAction[]
    schemeResults: SchemeResult[]
    npcs: NPC[]
}): WorldEventMemory[] {
    return params.schemeResults.flatMap((result, index) => {
        const action = params.actions[index]
        if (!action) return []
        return deriveWorldEventMemories({
            round: params.round,
            action,
            result,
            npcs: params.npcs,
            index,
        })
    })
}

export function mergeWorldEventMemories(
    ledger: WorldMemoryLedger,
    entries: WorldEventMemory[],
    limit = WORLD_MEMORY_LIMIT,
): WorldMemoryLedger {
    if (entries.length === 0) return ledger

    const merged = new Map<string, WorldEventMemory>()
    for (const memory of ledger) {
        merged.set(memory.id, memory)
    }
    for (const memory of entries) {
        merged.set(memory.id, memory)
    }

    return Array.from(merged.values())
        .sort((left, right) => (
            right.sourceRound - left.sourceRound
            || SCOPE_WEIGHT[right.scope] - SCOPE_WEIGHT[left.scope]
            || right.reliability - left.reliability
            || left.id.localeCompare(right.id)
        ))
        .slice(0, limit)
}

export function selectWorldEventMemoriesForPrompt(params: {
    ledger?: WorldMemoryLedger
    scopes: WorldMemoryScope[]
    currentRound: number
    includeCurrentRound?: boolean
    npc?: NPC | null
    relatedNpcId?: string | null
    schemeType?: SchemeType
    limit?: number
}): WorldEventMemory[] {
    const ledger = params.ledger ?? []
    if (ledger.length === 0) return []

    const scopeSet = new Set(params.scopes)
    const limit = params.limit ?? PROMPT_MEMORY_LIMIT
    const includeCurrentRound = params.includeCurrentRound ?? false

    return ledger
        .filter(memory => scopeSet.has(memory.scope))
        .filter(memory => includeCurrentRound ? memory.sourceRound <= params.currentRound : memory.sourceRound < params.currentRound)
        .filter(memory => isVisibleToPrompt(memory, params.npc ?? null))
        .map(memory => ({
            memory,
            score: scoreWorldMemoryForPrompt(memory, {
                currentRound: params.currentRound,
                npc: params.npc ?? null,
                relatedNpcId: params.relatedNpcId ?? null,
                schemeType: params.schemeType,
            }),
        }))
        .sort((left, right) => right.score - left.score || left.memory.id.localeCompare(right.memory.id))
        .slice(0, limit)
        .map(item => item.memory)
}

export function summarizeWorldEventMemories(memories: WorldEventMemory[]): string {
    return memories
        .map(memory => memory.summary.trim())
        .filter(Boolean)
        .join('；')
}

export function patchWorldMemoryLedgerForSchemeNpcAction(
    ledger: WorldMemoryLedger,
    params: {
        action: SchemeAction
        round: number
        previousMotionText?: string | null
        nextMotionText: string
    },
): WorldMemoryLedger {
    if (ledger.length === 0) return ledger

    const nextSummary = sanitizeWorldMemorySummary(params.nextMotionText)
    if (!nextSummary) return ledger

    const previousNeedle = params.previousMotionText
        ? stripTailPunctuation(sanitizeWorldMemorySummary(params.previousMotionText))
        : ''
    let changed = false

    const patched = ledger.map(memory => {
        const sameAction = Boolean(params.action.id) && memory.sourceActionId === params.action.id
        const sameRoundAndScheme =
            memory.sourceRound === params.round &&
            memory.schemeType === params.action.schemeType &&
            memory.involvedNpcIds.includes(params.action.targetNpcId)
        const mentionsPrevious = previousNeedle.length > 0 && memory.summary.includes(previousNeedle)
        if (!sameAction && !sameRoundAndScheme && !mentionsPrevious) return memory

        changed = true
        return {
            ...memory,
            summary: nextSummary,
        }
    })

    return changed ? patched : ledger
}

export function sanitizeWorldMemorySummary(text: string): string {
    let sanitized = stripTailPunctuation(text.replace(/\s+/g, ' ').trim())
    for (const pattern of PUBLIC_FORBIDDEN_PATTERNS) {
        sanitized = sanitized.replace(pattern, '此事')
    }
    sanitized = sanitized
        .replace(/萧宝颖/gu, '萧编修')
        .replace(/顺着此事/gu, '因势')
        .replace(/此事促成/gu, '事势牵动')
        .replace(/此事推动/gu, '事势牵动')
        .replace(/此事设下/gu, '风声牵出')
        .replace(/此事布下/gu, '风声牵出')
        .replace(/此事暗中/gu, '风声暗里')
        .replace(/此事的/gu, '这桩事的')
        .trim()

    return compactText(stripTailPunctuation(sanitized), 96)
}

function deriveWorldEventMemories(params: {
    round: number
    action: SchemeAction
    result: SchemeResult
    npcs: NPC[]
    index: number
}): WorldEventMemory[] {
    const event = params.result.causalEvent
    if (!event) return []
    if (event.visibility === 'private') return []

    const targetNpc = params.npcs.find(npc => npc.id === event.actorNpcId || npc.id === params.action.targetNpcId)
    const relatedNpc = event.relatedNpcId
        ? params.npcs.find(npc => npc.id === event.relatedNpcId)
        : params.action.relatedNpcId
            ? params.npcs.find(npc => npc.id === params.action.relatedNpcId)
            : undefined
    const dimensions = collectDimensions(event, params.result)
    const affectedFactionIds = collectAffectedFactionIds(params.result, targetNpc, relatedNpc)
    const involvedNpcIds = Array.from(new Set([
        event.actorNpcId,
        event.relatedNpcId,
        params.action.targetNpcId,
        params.action.relatedNpcId,
    ].filter((id): id is string => Boolean(id))))
    const scopes = deriveScopes({
        event,
        action: params.action,
        targetNpc,
        relatedNpc,
        affectedFactionIds,
        dimensions,
    })
    const actionId = event.actionId ?? params.action.id ?? `${params.index}`
    const summary = sanitizeWorldMemorySummary(event.postResolutionEvent?.summary || event.motionText)
    if (!summary) return []

    return scopes.map(scope => ({
        id: `${params.round}:${actionId}:${scope}`,
        sourceRound: params.round,
        sourceActionId: event.actionId ?? params.action.id,
        scope,
        visibility: getScopeVisibility(scope),
        involvedNpcIds,
        affectedFactionIds,
        dimensions,
        schemeType: event.schemeType,
        summary,
        reliability: getScopeReliability(scope),
        secrecyRisk: getScopeSecrecyRisk(scope),
        tags: buildTags(event, dimensions, affectedFactionIds, scope),
    }))
}

function deriveScopes(params: {
    event: SchemeCausalEventDraft
    action: SchemeAction
    targetNpc?: NPC
    relatedNpc?: NPC
    affectedFactionIds: CourtFactionId[]
    dimensions: SchemeImpactDimension[]
}): WorldMemoryScope[] {
    if (params.event.visibility === 'south_intel_only') return ['south_intel']

    const scopes = new Set<WorldMemoryScope>(['chronicle_fact'])
    const isCourtEvent =
        params.targetNpc?.powerBase === 'court' ||
        params.relatedNpc?.powerBase === 'court' ||
        params.affectedFactionIds.length > 0 ||
        ['advise', 'slander', 'alienate', 'frame', 'proxy', 'omen'].includes(params.event.schemeType)
    const isLocalEvent =
        params.targetNpc?.powerBase === 'external' ||
        params.relatedNpc?.powerBase === 'external' ||
        params.event.schemeType === 'secession' ||
        params.event.schemeType === 'rebellion' ||
        params.event.postResolutionEvent?.kind === 'external_action' ||
        params.dimensions.some(dimension => dimension === 'grain' || dimension === 'military' || dimension === 'socialOrder' || dimension === 'governance')

    if (isCourtEvent) scopes.add('court_public')
    if (params.affectedFactionIds.length > 0) scopes.add('faction_private')
    if (isLocalEvent) scopes.add('local_rumor')
    if (params.dimensions.length > 0 || params.event.postResolutionEvent || params.event.eventKind === 'failure') scopes.add('south_intel')

    return Array.from(scopes)
}

function collectDimensions(event: SchemeCausalEventDraft, result: SchemeResult): SchemeImpactDimension[] {
    const fromEvent = [
        ...event.primaryDimensions,
        ...event.secondaryDimensions,
        ...(event.directEffects ?? []).map(effect => effect.dimension),
        ...(event.secondaryEffects ?? []).map(effect => effect.dimension),
    ]
    const fromResult = DIMENSIONS.filter(dimension => isNonZero(result.nationEffects[dimension]))
    return uniqueDimensions([...fromEvent, ...fromResult])
}

function collectAffectedFactionIds(
    result: SchemeResult,
    targetNpc?: NPC,
    relatedNpc?: NPC,
): CourtFactionId[] {
    const factionIds: CourtFactionId[] = []
    if (isCourtFactionId(targetNpc?.factionId)) factionIds.push(targetNpc.factionId)
    if (isCourtFactionId(relatedNpc?.factionId)) factionIds.push(relatedNpc.factionId)

    for (const [factionId, vector] of Object.entries(result.factionEffects)) {
        if (!isCourtFactionId(factionId)) continue
        if (
            isNonZero(vector?.militaryPower) ||
            isNonZero(vector?.courtInfluence) ||
            isNonZero(vector?.internalStability)
        ) {
            factionIds.push(factionId)
        }
    }

    return Array.from(new Set(factionIds))
}

function buildTags(
    event: SchemeCausalEventDraft,
    dimensions: SchemeImpactDimension[],
    factionIds: CourtFactionId[],
    scope: WorldMemoryScope,
): string[] {
    return Array.from(new Set([
        scope,
        event.schemeType,
        ...dimensions,
        ...factionIds.map(id => `faction:${id}`),
        event.postResolutionEvent?.kind,
        event.postResolutionEvent?.outcome ? `outcome:${event.postResolutionEvent.outcome}` : undefined,
    ].filter((tag): tag is string => Boolean(tag))))
}

function isVisibleToPrompt(memory: WorldEventMemory, npc: NPC | null): boolean {
    if (memory.scope !== 'faction_private') return true
    if (!npc) return false
    if (memory.involvedNpcIds.includes(npc.id)) return true
    return isCourtFactionId(npc.factionId) && memory.affectedFactionIds.includes(npc.factionId)
}

function scoreWorldMemoryForPrompt(
    memory: WorldEventMemory,
    params: {
        currentRound: number
        npc: NPC | null
        relatedNpcId?: string | null
        schemeType?: SchemeType
    },
): number {
    const recency = Math.max(0, 12 - Math.max(0, params.currentRound - memory.sourceRound))
    const npcBonus = params.npc && memory.involvedNpcIds.includes(params.npc.id) ? 12 : 0
    const relatedBonus = params.relatedNpcId && memory.involvedNpcIds.includes(params.relatedNpcId) ? 8 : 0
    const factionBonus =
        params.npc && isCourtFactionId(params.npc.factionId) && memory.affectedFactionIds.includes(params.npc.factionId)
            ? 6
            : 0
    const schemeBonus = params.schemeType && memory.schemeType === params.schemeType ? 4 : 0
    const dimensionBonus = memory.dimensions.length > 0 ? 2 : 0
    return SCOPE_WEIGHT[memory.scope] + recency + npcBonus + relatedBonus + factionBonus + schemeBonus + dimensionBonus + memory.reliability
}

function getScopeVisibility(scope: WorldMemoryScope): WorldMemoryVisibility {
    if (scope === 'court_public' || scope === 'local_rumor' || scope === 'chronicle_fact') return 'public'
    if (scope === 'faction_private') return 'limited'
    return 'secret'
}

function getScopeReliability(scope: WorldMemoryScope): number {
    switch (scope) {
        case 'chronicle_fact':
            return 0.95
        case 'south_intel':
            return 0.82
        case 'faction_private':
            return 0.76
        case 'court_public':
            return 0.72
        case 'local_rumor':
            return 0.58
        default:
            return 0.6
    }
}

function getScopeSecrecyRisk(scope: WorldMemoryScope): number {
    switch (scope) {
        case 'south_intel':
            return 0.65
        case 'faction_private':
            return 0.42
        case 'local_rumor':
            return 0.28
        default:
            return 0.12
    }
}

function isCourtFactionId(value: unknown): value is CourtFactionId {
    return value === 'emperor' || value === 'empress'
}

function isNonZero(value: number | undefined): boolean {
    return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) > 0.001
}

function uniqueDimensions(dimensions: SchemeImpactDimension[]): SchemeImpactDimension[] {
    const set = new Set(dimensions.filter(dimension => DIMENSIONS.includes(dimension)))
    return DIMENSIONS.filter(dimension => set.has(dimension))
}

function compactText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return `${text.slice(0, maxLength - 1)}…`
}

function stripTailPunctuation(text: string): string {
    return text.replace(/[。！？；，、\s.!?;,]+$/u, '')
}
