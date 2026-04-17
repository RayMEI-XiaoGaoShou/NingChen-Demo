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

describe('npc long-term memory persistence', () => {
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
        pendingBacklash: [],
        recentBacklash: [],
        roundHistory: [],
        endingReport: null,
        battleReport: null,
        shuCampaign: {
            state: 'idle' as const,
            resolvedState: null,
            sourceRound: null,
            summary: '',
            ongoingNorthImpact: {},
            ongoingSouthImpact: {},
            remainingRounds: 0,
        },
        huainanCampaign: {
            state: 'idle' as const,
            resolvedState: null,
            sourceRound: null,
            summary: '',
            ongoingNorthImpact: {},
            ongoingSouthImpact: {},
            remainingRounds: 0,
        },
        shuMomentum: 0,
        huainanMomentum: 0,
        npcMemoryLedger: {
            zuting: [
                {
                    npcId: 'zuting',
                    category: 'favor' as const,
                    sourceRound: 6,
                    importance: 3 as const,
                    summary: '第6回合，你曾替他把漕运与中枢节制重新拢到一处。',
                    tags: ['grain', 'governance'],
                },
            ],
        },
        roundStartSnapshot: null,
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('persists the npc long-term memory ledger through save and load', () => {
        const snapshot = buildPersistedSnapshot(createBaseState())

        expect(snapshot).toBeTruthy()
        if (!snapshot) throw new Error('Expected snapshot to be persisted')
        expect(snapshot.npcMemoryLedger.zuting?.[0]?.summary).toContain('第6回合')

        const localStorage = createLocalStorageMock()
        vi.stubGlobal('localStorage', localStorage)
        saveGameSnapshot(snapshot)

        const loaded = loadGameSnapshot()
        expect(loaded?.npcMemoryLedger.zuting?.[0]?.category).toBe('favor')
        expect(loaded?.npcMemoryLedger.zuting?.[0]?.summary).toContain('第6回合')
    })
})
