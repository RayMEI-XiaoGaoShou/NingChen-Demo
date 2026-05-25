import type { combineStructureEffects } from './relationshipEngine'
import type { SchemeResult } from './schemeEngine'
import type { FactionVector } from './schemeTemplates'
import { normalizeNonTerminalExternalStatus } from './externalStatus'
import type {
    CourtFactionId,
    Faction,
    FactionCollapseReport,
    NationDimensions,
    NPC,
    RelationshipEdge,
    SchemeAction,
} from './types'

export function applyPersonEffects(
    npc: NPC,
    trustDelta: number,
    loyaltyDelta: number,
    militaryPowerDelta: number,
    alignmentShift: NPC['alignmentBias'] | null,
    externalStatus: NPC['externalStatus'] | null,
) {
    npc.trust = clamp(npc.trust + trustDelta)
    npc.loyaltyToCourt = clamp(npc.loyaltyToCourt + loyaltyDelta)
    npc.militaryPower = clamp(npc.militaryPower + militaryPowerDelta)

    if (alignmentShift) {
        npc.alignmentBias = alignmentShift
    }

    if (externalStatus) {
        npc.externalStatus = externalStatus
    } else if (npc.powerBase === 'external') {
        npc.externalStatus = normalizeNonTerminalExternalStatus(npc.externalStatus)
    }
}

export function applyFactionEffects(
    factions: Faction[],
    factionEffects: Partial<Record<CourtFactionId, FactionVector>>,
): Faction[] {
    return factions.map(faction => {
        const delta = factionEffects[faction.id]
        if (!delta) return faction

        return {
            ...faction,
            militaryPower: clamp(faction.militaryPower + delta.militaryPower),
            courtInfluence: clamp(faction.courtInfluence + delta.courtInfluence),
            internalStability: clamp(faction.internalStability + delta.internalStability),
        }
    })
}

export function applyCourtFavorHitToNpc(
    npc: NPC,
    hit: { emperorFavorDelta: number; empressDowagerFavorDelta: number },
) {
    if (hit.emperorFavorDelta !== 0) {
        npc.emperorFavor = clamp((npc.emperorFavor ?? 100) + hit.emperorFavorDelta)
    }

    if (hit.empressDowagerFavorDelta !== 0) {
        npc.empressDowagerFavor = clamp((npc.empressDowagerFavor ?? 100) + hit.empressDowagerFavorDelta)
    }
}

export function applyCourtDispositionUpdates(npc: NPC, updates: Partial<NPC>) {
    Object.assign(npc, updates)
}

export function deriveRelationshipShock(
    action: SchemeAction,
    result: SchemeResult,
    targetNpc: NPC,
    relatedNpc: NPC | null,
    edges: RelationshipEdge[],
): { edgeId: string; delta: number; source: string } | null {
    if (!result.success) return null

    const shockByScheme: Partial<Record<SchemeAction['schemeType'], number>> = {
        slander: -1.1,
        alienate: -1.4,
        frame: -0.8,
        proxy: -1.2,
    }
    const delta = shockByScheme[action.schemeType]
    if (!delta || !relatedNpc) return null

    const matchedEdge = edges.find(edge =>
        (edge.fromNpcId === targetNpc.id && edge.toNpcId === relatedNpc.id) ||
        (edge.fromNpcId === relatedNpc.id && edge.toNpcId === targetNpc.id),
    )

    return matchedEdge ? { edgeId: matchedEdge.id, delta, source: action.schemeType } : null
}

export function extraEffectsToFactionVectors(
    effect: ReturnType<typeof combineStructureEffects>,
): Partial<Record<CourtFactionId, FactionVector>> {
    const mapped: Partial<Record<CourtFactionId, FactionVector>> = {}
    if (effect.emperor) {
        mapped.emperor = {
            militaryPower: effect.emperor.militaryPower ?? 0,
            courtInfluence: effect.emperor.courtInfluence ?? 0,
            internalStability: effect.emperor.internalStability ?? 0,
        }
    }
    if (effect.empress) {
        mapped.empress = {
            militaryPower: effect.empress.militaryPower ?? 0,
            courtInfluence: effect.empress.courtInfluence ?? 0,
            internalStability: effect.empress.internalStability ?? 0,
        }
    }
    return mapped
}

export function deriveFactionCollapsePenalty(reports: FactionCollapseReport[]): {
    factionPenalty: Partial<Record<CourtFactionId, FactionVector>>
    nationPenalty: Partial<NationDimensions>
} {
    const factionPenalty: Partial<Record<CourtFactionId, FactionVector>> = {}
    const nationPenalty: Partial<NationDimensions> = {}

    for (const report of reports) {
        const isCollapse = report.severity === 'collapse'
        factionPenalty[report.factionId] = {
            militaryPower: (factionPenalty[report.factionId]?.militaryPower ?? 0) + (isCollapse ? -2.2 : -1.1),
            courtInfluence: (factionPenalty[report.factionId]?.courtInfluence ?? 0) + (isCollapse ? -2.4 : -1.2),
            internalStability: (factionPenalty[report.factionId]?.internalStability ?? 0) + (isCollapse ? -2.6 : -1.3),
        }
        nationPenalty.governance = round((nationPenalty.governance ?? 0) + (isCollapse ? -1.4 : -0.6))
        nationPenalty.socialOrder = round((nationPenalty.socialOrder ?? 0) + (isCollapse ? -1.1 : -0.5))
        nationPenalty.military = round((nationPenalty.military ?? 0) + (isCollapse ? -0.8 : -0.3))
    }

    return { factionPenalty, nationPenalty }
}

export function filterNewFactionCollapseReports(
    previousReports: FactionCollapseReport[],
    currentReports: FactionCollapseReport[],
): FactionCollapseReport[] {
    const previousSeverity = new Map(previousReports.map(report => [report.factionId, report.severity]))
    return currentReports.filter(report => {
        const previous = previousSeverity.get(report.factionId)
        if (!previous) return true
        return previous === 'breach' && report.severity === 'collapse'
    })
}

export function applyFactionCollapseNpcDrift(npcs: NPC[], reports: FactionCollapseReport[]): NPC[] {
    if (reports.length === 0) return npcs

    const byFaction = new Map(reports.map(report => [report.factionId, report]))
    return npcs.map(npc => {
        if (npc.powerBase !== 'court') return npc
        const report = byFaction.get(npc.factionId as CourtFactionId)
        if (!report) return npc

        return {
            ...npc,
            trust: clamp(npc.trust + (report.severity === 'collapse' ? -2 : -1)),
            loyaltyToCourt: clamp(npc.loyaltyToCourt + (report.severity === 'collapse' ? -4 : -2)),
        }
    })
}

function clamp(value: number): number {
    return Math.max(0, Math.min(100, round(value)))
}

function round(value: number): number {
    return Math.round(value * 10) / 10
}
