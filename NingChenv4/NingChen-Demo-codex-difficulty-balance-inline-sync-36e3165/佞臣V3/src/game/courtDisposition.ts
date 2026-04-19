import type {
    CourtDispositionOpportunity,
    CourtDispositionPenalty,
    CourtStatus,
    NPC,
} from './types'

export type CourtDispositionNpc = NPC & {
    emperorFavor: number
    empressDowagerFavor: number
    courtStatus: CourtStatus
}

export const COURT_DISPOSITION_TARGET_IDS = ['zuting', 'yuwendi', 'linghuelvguang', 'weichimù'] as const
export const COURT_DISPOSITION_EXECUTOR_IDS = ['hebaqí', 'zongai'] as const
export const COURT_DISPOSITION_DISMISS_THRESHOLD = 35
export const COURT_DISPOSITION_EXECUTE_THRESHOLD = 18

const COURT_DISPOSITION_SEEDS = {
    zuting: { emperorFavor: 26, empressDowagerFavor: 82 },
    yuwendi: { emperorFavor: 78, empressDowagerFavor: 22 },
    linghuelvguang: { emperorFavor: 40, empressDowagerFavor: 74 },
    'weichimù': { emperorFavor: 72, empressDowagerFavor: 28 },
} as const

export const COURT_DISPOSITION_PENALTIES: Record<
string,
{ dismissed: CourtDispositionPenalty; executed: CourtDispositionPenalty }
> = {
    zuting: {
        dismissed: {
            nation: { finance: -2.0, grain: -1.4, military: -0.4, socialOrder: -0.9, governance: -2.5 },
            faction: { empress: { militaryPower: -0.8, courtInfluence: -3.0, internalStability: -2.2 } },
        },
        executed: {
            nation: { finance: -3.1, grain: -2.1, military: -0.7, socialOrder: -1.5, governance: -4.2 },
            faction: { empress: { militaryPower: -1.2, courtInfluence: -5.0, internalStability: -3.4 } },
        },
    },
    yuwendi: {
        dismissed: {
            nation: { finance: -0.6, grain: -0.8, military: -1.8, socialOrder: -1.0, governance: -1.2 },
            faction: { emperor: { militaryPower: -1.2, courtInfluence: -2.8, internalStability: -2.0 } },
        },
        executed: {
            nation: { finance: -1.0, grain: -1.2, military: -3.1, socialOrder: -1.8, governance: -1.8 },
            faction: { emperor: { militaryPower: -2.0, courtInfluence: -4.8, internalStability: -3.0 } },
        },
    },
    linghuelvguang: {
        dismissed: {
            nation: { finance: -0.8, grain: -1.0, military: -2.6, socialOrder: -1.0, governance: -1.2 },
            faction: { empress: { militaryPower: -2.6, courtInfluence: -2.4, internalStability: -1.8 } },
        },
        executed: {
            nation: { finance: -1.2, grain: -1.5, military: -4.2, socialOrder: -1.8, governance: -2.1 },
            faction: { empress: { militaryPower: -4.8, courtInfluence: -3.8, internalStability: -2.8 } },
        },
    },
    'weichimù': {
        dismissed: {
            nation: { finance: -0.7, grain: -0.9, military: -2.8, socialOrder: -1.2, governance: -1.0 },
            faction: { emperor: { militaryPower: -2.8, courtInfluence: -2.0, internalStability: -1.8 } },
        },
        executed: {
            nation: { finance: -1.0, grain: -1.4, military: -4.4, socialOrder: -2.0, governance: -1.8 },
            faction: { emperor: { militaryPower: -5.2, courtInfluence: -3.6, internalStability: -2.8 } },
        },
    },
}

export function isCourtDispositionTarget(npcId: string): boolean {
    return COURT_DISPOSITION_TARGET_IDS.includes(getCanonicalCourtDispositionNpcId(npcId) as (typeof COURT_DISPOSITION_TARGET_IDS)[number])
}

export function isCourtDispositionExecutor(npcId: string): boolean {
    return COURT_DISPOSITION_EXECUTOR_IDS.includes(getCanonicalCourtDispositionNpcId(npcId) as (typeof COURT_DISPOSITION_EXECUTOR_IDS)[number])
}

export function getCanonicalCourtDispositionNpcId(npcId: string): string {
    if (npcId === 'hebaqi') return 'hebaqí'
    if (npcId === 'weichimu') return 'weichimù'
    return npcId
}

export function isTerminalCourtDispositionNpc(npc: Pick<NPC, 'id' | 'isAlive' | 'courtStatus'>): boolean {
    if (!isCourtDispositionTarget(npc.id)) return false
    return !npc.isAlive || (npc.courtStatus ?? 'active') !== 'active'
}

export function getCourtDispositionOpportunity(
    npc: Pick<NPC, 'emperorFavor' | 'empressDowagerFavor'>,
): CourtDispositionOpportunity {
    const emperorFavor = npc.emperorFavor ?? 100
    const empressDowagerFavor = npc.empressDowagerFavor ?? 100

    if (
        emperorFavor <= COURT_DISPOSITION_EXECUTE_THRESHOLD
        && empressDowagerFavor <= COURT_DISPOSITION_EXECUTE_THRESHOLD
    ) {
        return 'executable'
    }

    if (
        emperorFavor <= COURT_DISPOSITION_DISMISS_THRESHOLD
        && empressDowagerFavor <= COURT_DISPOSITION_DISMISS_THRESHOLD
    ) {
        return 'dismissible'
    }

    return 'safe'
}

export function getCourtStatusLabel(status: CourtStatus): string {
    if (status === 'dismissed') return '已被罢黜'
    if (status === 'executed') return '已被处决'
    return '在位'
}

export function getCourtDispositionPenalty(
    npcId: string,
    outcome: 'dismissed' | 'executed',
): CourtDispositionPenalty | null {
    return COURT_DISPOSITION_PENALTIES[getCanonicalCourtDispositionNpcId(npcId)]?.[outcome] ?? null
}

export function seedCourtDispositionNpc<T extends NPC>(npc: T): T & CourtDispositionNpc {
    const inferredCourtStatus: CourtStatus =
        npc.courtStatus
        ?? ((isCourtDispositionTarget(npc.id) && (!npc.isAlive || npc.deathCause === 'borrowed_blade' || npc.deathCause === 'court_execution'))
            ? 'executed'
            : 'active')
    const base: NPC = {
        ...npc,
        courtStatus: inferredCourtStatus,
        deathCause: npc.deathCause ?? null,
        deathByNpcId: npc.deathByNpcId ?? null,
        deathByNpcName: npc.deathByNpcName ?? null,
        deathRound: npc.deathRound ?? null,
    }

    const canonicalId = getCanonicalCourtDispositionNpcId(npc.id)
    const seed = COURT_DISPOSITION_SEEDS[canonicalId as keyof typeof COURT_DISPOSITION_SEEDS]
    return {
        ...base,
        emperorFavor: npc.emperorFavor ?? seed?.emperorFavor ?? 100,
        empressDowagerFavor: npc.empressDowagerFavor ?? seed?.empressDowagerFavor ?? 100,
    } as T & CourtDispositionNpc
}

export function normalizeCourtDispositionNpcs<T extends NPC>(npcs: T[]): Array<T & CourtDispositionNpc> {
    return npcs.map(npc => seedCourtDispositionNpc(npc))
}

export const normalizeCourtDispositionNpc = seedCourtDispositionNpc
