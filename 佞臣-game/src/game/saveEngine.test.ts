import { describe, expect, it } from 'vitest'
import { INITIAL_FACTIONS } from '../data/factions'
import { NORTH_INITIAL, SOUTH_INITIAL } from '../data/nationStats'
import { INITIAL_NPCS } from '../data/npcs'
import { INITIAL_RELATIONSHIP_EDGES } from '../data/npcRelationships'
import { buildPersistedSnapshot } from './saveEngine'
import { calculateCompositePower } from './types'

describe('saveEngine', () => {
    const initialFirstRoundGuideSeen = {
        round_start: false,
        court_observe: false,
        scheme_phase: false,
        empress_letter: false,
        scheme_feedback: false,
        settlement: false,
    }

    const createBaseState = () => ({
        currentRound: 1,
        currentPhase: 'PROLOGUE' as const,
        schemeCount: 0,
        maxSchemes: 3,
        prologueStep: 'PROLOGUE' as const,
        helpOverlayOpen: false,
        helpOverlaySource: null,
        firstRoundGuideSeen: initialFirstRoundGuideSeen,
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
        roundStartSnapshot: null,
    })

    it('does not persist a pristine opening state', () => {
        expect(buildPersistedSnapshot(createBaseState())).toBeNull()
    })

    it('persists front-door progress after leaving the opening prologue', () => {
        const snapshot = buildPersistedSnapshot({
            ...createBaseState(),
            prologueStep: 'GAMEPLAY_GUIDE',
        })

        expect(snapshot).toBeTruthy()
        expect(snapshot?.prologueStep).toBe('GAMEPLAY_GUIDE')
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
})
