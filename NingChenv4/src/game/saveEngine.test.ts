import { afterEach, describe, expect, it, vi } from 'vitest'
import { INITIAL_FACTIONS } from '../data/factions'
import { NORTH_INITIAL, SOUTH_INITIAL } from '../data/nationStats'
import { INITIAL_NPCS } from '../data/npcs'
import { INITIAL_RELATIONSHIP_EDGES } from '../data/npcRelationships'
import { buildPersistedSnapshot, loadGameSnapshot, normalizePersistedRoundPhase, saveGameSnapshot } from './saveEngine'
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

    it('persists world memory ledger through save and load', () => {
        const snapshot = buildPersistedSnapshot({
            ...createBaseState(),
            currentPhase: 'SETTLEMENT',
            prologueStep: 'INGAME',
            worldMemoryLedger: [{
                id: 'world-1',
                sourceRound: 4,
                sourceActionId: 'scheme-1',
                scope: 'chronicle_fact',
                visibility: 'public',
                involvedNpcIds: ['zuting'],
                affectedFactionIds: ['empress'],
                dimensions: ['grain'],
                schemeType: 'advise',
                summary: '祖珽前曾押下仓簿。',
                reliability: 0.95,
                secrecyRisk: 0.1,
                tags: ['chronicle_fact'],
            }],
            roundStartSnapshot: {
                ...createBaseState(),
                currentRound: 4,
                currentPhase: 'ROUND_START',
                prologueStep: 'INGAME',
                worldMemoryLedger: [{
                    id: 'world-start',
                    sourceRound: 3,
                    sourceActionId: 'scheme-0',
                    scope: 'court_public',
                    visibility: 'public',
                    involvedNpcIds: ['zuting'],
                    affectedFactionIds: ['empress'],
                    dimensions: ['finance'],
                    schemeType: 'advise',
                    summary: '旧日公议。',
                    reliability: 0.7,
                    secrecyRisk: 0.1,
                    tags: ['court_public'],
                }],
            },
        })

        expect(snapshot?.worldMemoryLedger?.[0]?.summary).toBe('祖珽前曾押下仓簿。')
        expect(snapshot?.roundStartSnapshot?.worldMemoryLedger?.[0]?.summary).toBe('旧日公议。')

        const localStorage = createLocalStorageMock()
        vi.stubGlobal('localStorage', localStorage)
        if (!snapshot) throw new Error('Expected snapshot to be persisted')
        saveGameSnapshot(snapshot)

        const loaded = loadGameSnapshot()
        expect(loaded?.worldMemoryLedger?.[0]?.summary).toBe('祖珽前曾押下仓簿。')
        expect(loaded?.roundStartSnapshot?.worldMemoryLedger?.[0]?.summary).toBe('旧日公议。')
    })

    it('preserves scheme follow-up parse data through save and load', () => {
        const snapshot = buildPersistedSnapshot({
            ...createBaseState(),
            currentPhase: 'COURT_OBSERVE',
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

    it('persists the generated empress reply record through save and load', () => {
        const snapshot = buildPersistedSnapshot({
            ...createBaseState(),
            currentPhase: 'EMPRESS_REPLY',
            prologueStep: 'INGAME',
            empressReplyRecord: {
                sourceRound: 3,
                text: '朕已按“清点户籍仓廪”着手施行。',
                mode: 'default',
            },
        })

        expect(snapshot?.empressReplyRecord?.text).toContain('清点户籍仓廪')

        const localStorage = createLocalStorageMock()
        vi.stubGlobal('localStorage', localStorage)
        saveGameSnapshot(snapshot!)

        const loaded = loadGameSnapshot()
        expect(loaded?.empressReplyRecord?.sourceRound).toBe(3)
        expect(loaded?.empressReplyRecord?.mode).toBe('default')
    })

    it('normalizes old saved page phases into the current visible flow', () => {
        const legacySchemePhase = ['SCHEME', 'PHASE'].join('_')
        const legacyPostSettlementPhase = ['ROUND', 'END'].join('_')

        expect(normalizePersistedRoundPhase(legacySchemePhase, 2, 3)).toBe('COURT_OBSERVE')
        expect(normalizePersistedRoundPhase(legacySchemePhase, 3, 3)).toBe('EMPRESS_LETTER')
        expect(normalizePersistedRoundPhase(legacyPostSettlementPhase)).toBe('SETTLEMENT')
    })

    it('fills court disposition fields when building and loading older npc snapshots', () => {
        const oldNpcs = INITIAL_NPCS.map(npc => {
            const { emperorFavor, empressDowagerFavor, courtStatus, ...legacyNpc } = npc as any
            return legacyNpc
        })
        const snapshot = buildPersistedSnapshot({
            ...createBaseState(),
            prologueStep: 'INGAME',
            npcs: oldNpcs,
            roundStartSnapshot: {
                ...createBaseState(),
                prologueStep: 'INGAME',
                npcs: oldNpcs,
            },
        })

        expect(snapshot).toBeTruthy()
        const savedZuting = snapshot?.npcs.find(npc => npc.id === 'zuting') as any
        const savedRoundStartZuting = snapshot?.roundStartSnapshot?.npcs.find(npc => npc.id === 'zuting') as any
        expect(savedZuting.emperorFavor).toBe(26)
        expect(savedZuting.empressDowagerFavor).toBe(82)
        expect(savedZuting.courtStatus).toBe('active')
        expect(savedRoundStartZuting.emperorFavor).toBe(26)

        const localStorage = createLocalStorageMock()
        vi.stubGlobal('localStorage', localStorage)
        localStorage.setItem('ningchen-save-v1', JSON.stringify({
            ...snapshot,
            npcs: oldNpcs,
            roundStartSnapshot: {
                ...snapshot!.roundStartSnapshot,
                npcs: oldNpcs,
            },
        }))

        const loaded = loadGameSnapshot()
        const loadedZuting = loaded?.npcs.find(npc => npc.id === 'zuting') as any
        const loadedRoundStartZuting = loaded?.roundStartSnapshot?.npcs.find(npc => npc.id === 'zuting') as any
        expect(loadedZuting.emperorFavor).toBe(26)
        expect(loadedZuting.empressDowagerFavor).toBe(82)
        expect(loadedZuting.courtStatus).toBe('active')
        expect(loadedRoundStartZuting.emperorFavor).toBe(26)
    })
})

