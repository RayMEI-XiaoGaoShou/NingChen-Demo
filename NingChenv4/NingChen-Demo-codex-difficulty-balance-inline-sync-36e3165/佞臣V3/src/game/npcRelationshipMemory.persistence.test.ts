import { afterEach, describe, expect, it, vi } from 'vitest'
import { INITIAL_FACTIONS } from '../data/factions'
import { NORTH_INITIAL, SOUTH_INITIAL } from '../data/nationStats'
import { INITIAL_NPCS } from '../data/npcs'
import { INITIAL_RELATIONSHIP_EDGES } from '../data/npcRelationships'
import { buildPersistedSnapshot, loadGameSnapshot, saveGameSnapshot } from './saveEngine'
import { calculateCompositePower } from './types'

function createLocalStorageMock(): Storage {
    const store = new Map<string, string>()

    return {
        get length() {
            return store.size
        },
        clear: vi.fn(() => {
            store.clear()
        }),
        getItem: vi.fn((key: string) => store.get(key) ?? null),
        key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
        removeItem: vi.fn((key: string) => {
            store.delete(key)
        }),
        setItem: vi.fn((key: string, value: string) => {
            store.set(key, value)
        }),
    } as unknown as Storage
}

describe('npcRelationshipMemory persistence', () => {
    const createBaseState = () => ({
        currentRound: 1,
        currentPhase: 'PROLOGUE' as const,
        difficulty: 'normal' as const,
        schemeCount: 0,
        maxSchemes: 3,
        prologueStep: 'INGAME' as const,
        helpOverlayOpen: false,
        helpOverlaySource: null,
        firstRoundGuideSeen: {
            round_start: false,
            court_observe: false,
            scheme_phase: false,
            empress_letter: false,
            scheme_feedback: false,
            settlement: false,
        },
        schemeOnboardingSeen: {
            scheme_master_guide: false,
            first_omen_teaching: false,
            first_external_line_teaching: false,
            first_follow_up_teaching: false,
        },
        omenGuideSeen: {
            first_omen_modal: false,
        },
        fengDaozhiAssistsRemaining: 2,
        playerDangerStage: 'safe' as const,
        isGameOver: false,
        gameResult: 'NONE' as const,
        northStats: { ...NORTH_INITIAL },
        southStats: { ...SOUTH_INITIAL },
        northPower: calculateCompositePower(NORTH_INITIAL),
        southPower: calculateCompositePower(SOUTH_INITIAL),
        npcs: INITIAL_NPCS.map(npc => ({ ...npc })),
        factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
        relationships: INITIAL_RELATIONSHIP_EDGES.map(edge => ({ ...edge })),
        intelProgress: Object.fromEntries(INITIAL_NPCS.map(npc => [npc.id, 0])),
        currentSchemes: [],
        selectedPolicyOption: null,
        policyReason: '',
        selectedPolicyParse: null,
        npcFeedbacks: [],
        pendingStructuredSchemeIds: [],
        lastSettlement: null,
        lastPolicyReport: null,
        lastPolicyAftereffect: null,
        empressReplyRecord: null,
        pendingBacklash: [],
        recentBacklash: [],
        roundHistory: [],
        npcMemoryLedger: {},
        endingReport: null,
        battleReport: null,
        shuCampaign: {
            state: 'idle' as const,
            sourceRound: null,
            summary: '',
            ongoingNorthImpact: {},
            ongoingSouthImpact: {},
            remainingRounds: 0,
        },
        huainanCampaign: {
            state: 'idle' as const,
            sourceRound: null,
            summary: '',
            ongoingNorthImpact: {},
            ongoingSouthImpact: {},
            remainingRounds: 0,
        },
        shuMomentum: 0,
        huainanMomentum: 0,
        roundStartSnapshot: null,
        relationMemoryLedger: {
            zuting: [
                {
                    holderNpcId: 'zuting',
                    subjectNpcId: 'yuwendi',
                    stance: 'suspicion' as const,
                    sourceRound: 8,
                    importance: 2 as const,
                    summary: '第8回合，你开始怀疑宇文棣会先卖你。',
                    occurrences: 1,
                },
            ],
        },
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('persists the relation memory ledger through save and load', () => {
        const snapshot = buildPersistedSnapshot(createBaseState() as any)

        expect(snapshot).toBeTruthy()
        if (!snapshot) throw new Error('Expected snapshot to be persisted')

        const localStorage = createLocalStorageMock()
        vi.stubGlobal('localStorage', localStorage)
        saveGameSnapshot(snapshot as any)

        const loaded = loadGameSnapshot() as any
        expect(loaded?.relationMemoryLedger?.zuting?.[0]?.subjectNpcId).toBe('yuwendi')
        expect(loaded?.relationMemoryLedger?.zuting?.[0]?.occurrences).toBe(1)
    })

    it('defaults missing relation memory ledgers to empty objects when loading old saves', () => {
        const localStorage = createLocalStorageMock()
        vi.stubGlobal('localStorage', localStorage)
        localStorage.setItem('ningchen-save-v1', JSON.stringify({
            version: 1,
            ...createBaseState(),
            relationMemoryLedger: undefined,
        }))

        const loaded = loadGameSnapshot() as any
        expect(loaded?.relationMemoryLedger).toEqual({})
    })
})
