import {
    getCourtDispositionOpportunity,
    getCourtDispositionPenalty,
    isCourtDispositionExecutor,
    isCourtDispositionTarget,
} from './courtDisposition'
import type {
    BorrowedBladeOutcome,
    CourtDispositionPenalty,
    NPC,
    NationDimensions,
    NorthSchemeParseResult,
    SchemeType,
} from './types'

export interface CourtFavorHit {
    emperorFavorDelta: number
    empressDowagerFavorDelta: number
}

export interface CourtDispositionProxyResolution {
    outcome: BorrowedBladeOutcome
    summary: string
    targetUpdates: Partial<NPC>
    nationPenalty: Partial<NationDimensions>
    factionPenalty: CourtDispositionPenalty['faction']
}

const NO_FAVOR_HIT: CourtFavorHit = {
    emperorFavorDelta: 0,
    empressDowagerFavorDelta: 0,
}

const NO_PROXY_PENALTY = {
    nationPenalty: {},
    factionPenalty: {},
}

export function deriveCourtFavorHit(input: {
    schemeType: SchemeType
    actorNpc: NPC
    targetNpc: NPC
    success: boolean
    parse: NorthSchemeParseResult
}): CourtFavorHit {
    if (!input.success || !input.targetNpc.isAlive || input.targetNpc.courtStatus === 'dismissed' || input.targetNpc.courtStatus === 'executed') {
        return NO_FAVOR_HIT
    }

    if (!isCourtDispositionTarget(input.targetNpc.id)) {
        return NO_FAVOR_HIT
    }

    if (input.schemeType === 'slander') {
        const transmission = input.parse.suspicionTransmission ?? 0
        if (transmission < 0.5) return NO_FAVOR_HIT
        const value = transmission >= 0.85 ? -10 : -8
        if (input.actorNpc.factionId !== 'empress' && input.actorNpc.factionId !== 'emperor') return NO_FAVOR_HIT
        return input.actorNpc.factionId === 'empress'
            ? { emperorFavorDelta: 0, empressDowagerFavorDelta: value }
            : { emperorFavorDelta: value, empressDowagerFavorDelta: 0 }
    }

    if (input.schemeType === 'alienate') {
        const transmission = input.parse.fractureTransmission ?? 0
        if (transmission < 0.55) return NO_FAVOR_HIT
        const value = transmission >= 0.82 ? -14 : -12
        if (input.actorNpc.factionId !== 'empress' && input.actorNpc.factionId !== 'emperor') return NO_FAVOR_HIT
        return input.actorNpc.factionId === 'empress'
            ? { emperorFavorDelta: 0, empressDowagerFavorDelta: value }
            : { emperorFavorDelta: value, empressDowagerFavorDelta: 0 }
    }

    if (input.schemeType === 'frame') {
        const trap = Math.max(input.parse.selfTrapPotential ?? 0, input.parse.scapegoatClarity ?? 0)
        if (trap < 0.58) return NO_FAVOR_HIT
        const value = trap >= 0.8 ? -8 : -7
        return { emperorFavorDelta: value, empressDowagerFavorDelta: value }
    }

    if (input.schemeType === 'omen') {
        const legitimacyCrack = input.parse.legitimacyCrack ?? 0
        if (input.parse.omenPolarity !== 'destabilizing' || legitimacyCrack < 0.62) return NO_FAVOR_HIT
        if (legitimacyCrack >= 0.82) {
            return { emperorFavorDelta: -6, empressDowagerFavorDelta: -7 }
        }
        return { emperorFavorDelta: -5, empressDowagerFavorDelta: -6 }
    }

    return NO_FAVOR_HIT
}

export function deriveCourtDispositionNationDamage(input: {
    schemeType: SchemeType
    success: boolean
    parse: NorthSchemeParseResult
}): Partial<NationDimensions> {
    if (!input.success) return {}

    if (input.schemeType === 'frame') {
        const trap = Math.max(input.parse.selfTrapPotential ?? 0, input.parse.scapegoatClarity ?? 0)
        if (trap < 0.58) return {}
        return trap >= 0.8
            ? { finance: -0.3, grain: -0.4, military: -0.2, socialOrder: -0.5, governance: -0.8 }
            : { finance: -0.2, grain: -0.3, military: -0.1, socialOrder: -0.4, governance: -0.6 }
    }

    if (input.schemeType === 'omen') {
        const legitimacyCrack = input.parse.legitimacyCrack ?? 0
        if (input.parse.omenPolarity !== 'destabilizing' || legitimacyCrack < 0.62) return {}
        return legitimacyCrack >= 0.82
            ? { finance: -0.6, grain: -0.8, military: -0.2, socialOrder: -1.2, governance: -2.1 }
            : { finance: -0.4, grain: -0.6, military: -0.1, socialOrder: -0.9, governance: -1.5 }
    }

    return {}
}

export function resolveCourtDispositionProxy(params: {
    round: number
    actorNpc: NPC
    targetNpc: NPC
    parse: NorthSchemeParseResult
    success: boolean
}): CourtDispositionProxyResolution | null {
    if (!isCourtDispositionTarget(params.targetNpc.id) || !params.targetNpc.isAlive) {
        return null
    }

    const unchanged = {
        courtStatus: params.targetNpc.courtStatus ?? 'active',
        isAlive: params.targetNpc.isAlive,
    }

    if ((params.targetNpc.courtStatus ?? 'active') !== 'active') {
        return null
    }

    const transmission = params.parse.proxyTransmission ?? 0
    if (!params.success || transmission < 0.34) {
        return {
            outcome: 'failed',
            summary: `${params.actorNpc.name}未能把收网之势真正借到${params.targetNpc.name}身上。`,
            targetUpdates: unchanged,
            ...NO_PROXY_PENALTY,
        }
    }

    if (!isCourtDispositionExecutor(params.actorNpc.id)) {
        return {
            outcome: 'failed',
            summary: `${params.actorNpc.name}并无资格代行朝堂收网，这一步只能形成虚张声势。`,
            targetUpdates: unchanged,
            ...NO_PROXY_PENALTY,
        }
    }

    const opportunity = getCourtDispositionOpportunity(params.targetNpc)
    if (opportunity === 'safe') {
        return {
            outcome: 'pressure',
            summary: `${params.actorNpc.name}虽已出面施压，但${params.targetNpc.name}尚未同时失去两边庇护，朝堂暂时只添压力。`,
            targetUpdates: unchanged,
            ...NO_PROXY_PENALTY,
        }
    }

    if (opportunity === 'dismissible') {
        const penalty = getCourtDispositionPenalty(params.targetNpc.id, 'dismissed')
        return {
            outcome: 'dismissed',
            summary: `${params.actorNpc.name}顺势收网，${params.targetNpc.name}已被朝廷正式罢黜。`,
            targetUpdates: {
                courtStatus: 'dismissed',
                isAlive: true,
            },
            nationPenalty: penalty?.nation ?? {},
            factionPenalty: penalty?.faction ?? {},
        }
    }

    const penalty = getCourtDispositionPenalty(params.targetNpc.id, 'executed')
    return {
        outcome: 'executed',
        summary: `${params.actorNpc.name}借势落下最后一手，${params.targetNpc.name}已被朝廷处决。`,
        targetUpdates: {
            courtStatus: 'executed',
            isAlive: false,
            militaryPower: 0,
            deathCause: 'court_execution',
            deathByNpcId: params.actorNpc.id,
            deathByNpcName: params.actorNpc.name,
            deathRound: params.round,
        },
        nationPenalty: penalty?.nation ?? {},
        factionPenalty: penalty?.faction ?? {},
    }
}
