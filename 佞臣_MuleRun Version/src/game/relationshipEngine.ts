import type {
    RelationshipEdge,
    RelationshipReport,
    RelationshipStructure,
    RelationshipStructureEffect,
} from './types'

export interface RelationshipShockResult {
    edges: RelationshipEdge[]
    triggeredStructures: RelationshipStructure[]
    reports: RelationshipReport[]
}

export function applyRelationshipShock(input: {
    edges: RelationshipEdge[]
    structures: RelationshipStructure[]
    edgeId: string
    delta: number
    source: string
}): RelationshipShockResult {
    const edges = input.edges.map(edge =>
        edge.id === input.edgeId
            ? { ...edge, strength: round(clamp(edge.strength + input.delta, -2, 2)) }
            : edge,
    )

    const updatedEdge = edges.find(edge => edge.id === input.edgeId)
    if (!updatedEdge) {
        return { edges, triggeredStructures: [], reports: [] }
    }

    const triggeredStructures = input.structures.filter(structure =>
        structure.criticalEdgeIds.includes(updatedEdge.id) &&
        updatedEdge.strength <= structure.breakThreshold,
    )

    const reports = triggeredStructures.map(structure => ({
        edgeId: updatedEdge.id,
        edgeLabel: updatedEdge.label,
        structureId: structure.id,
        structureName: structure.name,
        summary: `${structure.reportText}（由${updatedEdge.label}被${describeShock(input.source)}触发）`,
    }))

    return { edges, triggeredStructures, reports }
}

export function combineStructureEffects(
    structures: RelationshipStructure[],
): RelationshipStructureEffect {
    return structures.reduce<RelationshipStructureEffect>(
        (acc, structure) => mergeStructureEffects(acc, structure.effect),
        {},
    )
}

function mergeStructureEffects(
    left: RelationshipStructureEffect,
    right: RelationshipStructureEffect,
): RelationshipStructureEffect {
    return {
        emperor: mergeFactionEffect(left.emperor, right.emperor),
        empress: mergeFactionEffect(left.empress, right.empress),
        nation: mergeNationEffect(left.nation, right.nation),
    }
}

function mergeFactionEffect(
    left: RelationshipStructureEffect['emperor'],
    right: RelationshipStructureEffect['emperor'],
) {
    if (!left && !right) return undefined
    return {
        militaryPower: round((left?.militaryPower ?? 0) + (right?.militaryPower ?? 0)),
        courtInfluence: round((left?.courtInfluence ?? 0) + (right?.courtInfluence ?? 0)),
        internalStability: round((left?.internalStability ?? 0) + (right?.internalStability ?? 0)),
    }
}

function mergeNationEffect(
    left: RelationshipStructureEffect['nation'],
    right: RelationshipStructureEffect['nation'],
) {
    if (!left && !right) return undefined
    return {
        finance: round((left?.finance ?? 0) + (right?.finance ?? 0)),
        grain: round((left?.grain ?? 0) + (right?.grain ?? 0)),
        military: round((left?.military ?? 0) + (right?.military ?? 0)),
        socialOrder: round((left?.socialOrder ?? 0) + (right?.socialOrder ?? 0)),
        governance: round((left?.governance ?? 0) + (right?.governance ?? 0)),
    }
}

function describeShock(source: string): string {
    switch (source) {
        case 'alienate':
            return '离间'
        case 'slander':
            return '谗言'
        case 'frame':
            return '构陷'
        case 'proxy':
            return '借刀'
        default:
            return '权谋冲击'
    }
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
}

function round(value: number): number {
    return Math.round(value * 10) / 10
}
