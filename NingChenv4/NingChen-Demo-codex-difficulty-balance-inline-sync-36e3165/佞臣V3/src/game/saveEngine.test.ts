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

describe('saveEngine', () => {
    const initialFirstRoundGuideSeen = {
        round_start: false,
        court_observe: false,
        scheme_phase: false,
        empress_letter: false,
        scheme_feedback: false,
        settlement: false,
    }
    const initialOmenGuideSeen = {
        first_omen_modal: false,
    }
const initialSchemeOnboardingSeen = {
    scheme_master_guide: false,
    first_omen_teaching: false,
    first_external_line_teaching: false,
    first_follow_up_teaching: false,
}

    const createBaseState = () => ({
        currentRound: 1,
        currentPhase: 'PROLOGUE' as const,
        difficulty: 'normal' as const,
        schemeCount: 0,
        maxSchemes: 3,
        prologueStep: 'PROLOGUE' as const,
        helpOverlayOpen: false,
        helpOverlaySource: null,
        firstRoundGuideSeen: initialFirstRoundGuideSeen,
        schemeOnboardingSeen: initialSchemeOnboardingSeen,
        omenGuideSeen: initialOmenGuideSeen,
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
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('does not persist a pristine opening state', () => {
        expect(buildPersistedSnapshot(createBaseState())).toBeNull()
    })

    it('persists front-door progress after leaving the opening prologue', () => {
        const snapshot = buildPersistedSnapshot({
            ...createBaseState(),
            prologueStep: 'CHARACTER_BIOS',
        })

        expect(snapshot).toBeTruthy()
        expect(snapshot?.difficulty).toBe('normal')
        expect(snapshot?.prologueStep).toBe('CHARACTER_BIOS')
    })

    it('persists campaign state in snapshots', () => {
        const snapshot = buildPersistedSnapshot({
            ...createBaseState(),
            prologueStep: 'INGAME',
            shuCampaign: {
                state: 'gained',
                sourceRound: 10,
                summary: '蜀地已得手',
                ongoingNorthImpact: { governance: -1.2 },
                ongoingSouthImpact: { grain: 1.1 },
                remainingRounds: 2,
            },
        })

        expect(snapshot).toBeTruthy()
        expect(snapshot?.shuCampaign.state).toBe('gained')
        expect(snapshot?.shuCampaign.remainingRounds).toBe(2)
    })

    it('persists a round-start rollback snapshot without nesting recursively', () => {
        const snapshot = buildPersistedSnapshot({
            ...createBaseState(),
            currentRound: 6,
            currentPhase: 'ROUND_START',
            prologueStep: 'INGAME',
            roundStartSnapshot: {
                ...createBaseState(),
                currentRound: 6,
                currentPhase: 'ROUND_START',
                prologueStep: 'INGAME',
            },
        })

        expect(snapshot).toBeTruthy()
        expect(snapshot?.roundStartSnapshot?.currentRound).toBe(6)
        expect((snapshot?.roundStartSnapshot as any)?.roundStartSnapshot).toBeUndefined()
    })

    it('preserves scheme follow-up parse data through save and load', () => {
        const snapshot = buildPersistedSnapshot({
            ...createBaseState(),
            currentPhase: 'SCHEME_PHASE',
            prologueStep: 'INGAME',
            currentSchemes: [
                {
                    id: 'scheme-1',
                    targetNpcId: INITIAL_NPCS[0]!.id,
                    schemeType: 'advise',
                    playerSpeech: 'test scheme',
                    followUp: {
                        questionText: 'Would you clarify?',
                        playerReply: 'Yes, let me explain.',
                        parse: {
                            clarificationFit: 0.6,
                            npcInterestFit: 0.5,
                            pressureControl: 0.4,
                            contradictionRisk: 0.1,
                            exposureRiskDelta: -0.02,
                            successRateDelta: 0.07,
                            effectMultiplierDelta: 0.03,
                            evidence: ['follow-up evidence'],
                        },
                        finalNpcReply: 'A careful answer.',
                        status: 'answered',
                    },
                },
            ],
        })

        expect(snapshot).toBeTruthy()
        if (!snapshot) throw new Error('Expected snapshot to be persisted')
        expect(snapshot?.currentSchemes[0]?.followUp?.status).toBe('answered')
        expect(snapshot?.currentSchemes[0]?.followUp?.parse?.successRateDelta).toBe(0.07)

        const localStorage = createLocalStorageMock()
        vi.stubGlobal('localStorage', localStorage)

        saveGameSnapshot(snapshot)

        expect(localStorage.setItem).toHaveBeenCalledWith('ningchen-save-v1', expect.any(String))

        const loaded = loadGameSnapshot()
        expect(loaded?.currentSchemes[0]?.followUp?.status).toBe('answered')
        expect(loaded?.currentSchemes[0]?.followUp?.parse?.successRateDelta).toBe(0.07)
    })
})
