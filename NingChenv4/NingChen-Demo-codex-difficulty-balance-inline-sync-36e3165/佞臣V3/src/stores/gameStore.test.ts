import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGameStore } from './gameStore'
import { INITIAL_NPCS } from '../data/npcs'
import { INITIAL_FACTIONS } from '../data/factions'
import { INITIAL_RELATIONSHIP_EDGES } from '../data/npcRelationships'
import { NORTH_INITIAL, SOUTH_INITIAL } from '../data/nationStats'
import { calculateCompositePower } from '../game/types'
import type { PersistedGameSnapshot } from '../game/saveEngine'
import * as aiService from '../ai/aiService'

const initialFirstRoundGuideSeen = {
    round_start: false,
    court_observe: false,
    scheme_phase: false,
    empress_letter: false,
    scheme_feedback: false,
    settlement: false,
}

const initialSchemeOnboardingSeen = {
    scheme_master_guide: false,
    first_omen_teaching: false,
    first_external_line_teaching: false,
    first_follow_up_teaching: false,
}

function resetStore() {
    useGameStore.setState({
        currentRound: 1,
        currentPhase: 'PROLOGUE',
        difficulty: 'normal',
        schemeCount: 0,
        maxSchemes: 3,
        isGameOver: false,
        gameResult: 'NONE',
        playerDangerStage: 'safe',
        roundStartSnapshot: null,
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
        npcMemoryLedger: {},
        endingReport: null,
        battleReport: null,
        shuMomentum: 0,
        huainanMomentum: 0,
        shuCampaign: {
            state: 'idle',
            sourceRound: null,
            summary: '',
            ongoingNorthImpact: {},
            ongoingSouthImpact: {},
            remainingRounds: 0,
        },
        huainanCampaign: {
            state: 'idle',
            sourceRound: null,
            summary: '',
            ongoingNorthImpact: {},
            ongoingSouthImpact: {},
            remainingRounds: 0,
        },
        prologueStep: 'PROLOGUE',
        helpOverlayOpen: false,
        helpOverlaySource: null,
        firstRoundGuideSeen: initialFirstRoundGuideSeen,
        schemeOnboardingSeen: initialSchemeOnboardingSeen,
        omenGuideSeen: {
            first_omen_modal: false,
        },
        fengDaozhiAssistsRemaining: 2,
    })
}

describe('gameStore addScheme', () => {
    beforeEach(() => {
        resetStore()
    })

    it('starts with idle campaign states', () => {
        const state = useGameStore.getState()
        expect(state.shuMomentum).toBe(0)
        expect(state.huainanMomentum).toBe(0)
        expect(state.shuCampaign.state).toBe('idle')
        expect(state.huainanCampaign.state).toBe('idle')
    })

    it('initializes npc court disposition fields from seed defaults', () => {
        useGameStore.getState().resetGame()

        const state = useGameStore.getState()
        const zuting = state.npcs.find(npc => npc.id === 'zuting') as any
        expect(zuting.emperorFavor).toBe(26)
        expect(zuting.empressDowagerFavor).toBe(82)
        expect(zuting.courtStatus).toBe('active')
        expect(state.npcs.every(npc => (npc as any).courtStatus !== undefined)).toBe(true)
    })

    it('rejects targeting the same NPC twice in one round', () => {
        const targetNpcId = INITIAL_NPCS[0]!.id

        useGameStore.getState().addScheme({
            id: 'scheme-1',
            targetNpcId,
            schemeType: 'advise',
            playerSpeech: 'scheme one',
            resolutionRoll: 0.1,
        })

        useGameStore.getState().addScheme({
            id: 'scheme-2',
            targetNpcId,
            schemeType: 'slander',
            relatedNpcId: INITIAL_NPCS[1]!.id,
            playerSpeech: 'scheme two',
            resolutionRoll: 0.1,
        })

        const state = useGameStore.getState()
        expect(state.schemeCount).toBe(1)
        expect(state.currentSchemes).toHaveLength(1)
        expect(state.currentSchemes[0]?.targetNpcId).toBe(targetNpcId)
    })

    it('preserves structured omen input when adding an omen action', () => {
        useGameStore.getState().addScheme({
            id: 'omen-1',
            targetNpcId: INITIAL_NPCS[0]!.id,
            schemeType: 'omen',
            playerSpeech: '石人一只眼，挑动黄河天下反\n\n此非独天灾，恐是名分失序之兆。',
            omenSpeechInput: {
                omenText: '石人一只眼，挑动黄河天下反',
                interpretationText: '此非独天灾，恐是名分失序之兆。',
            },
            resolutionRoll: 0.2,
        })

        const state = useGameStore.getState()
        expect(state.currentSchemes).toHaveLength(1)
        expect(state.currentSchemes[0]?.omenSpeechInput).toEqual({
            omenText: '石人一只眼，挑动黄河天下反',
            interpretationText: '此非独天灾，恐是名分失序之兆。',
        })
    })

    it('keeps existing schemes when leaving scheme page and entering it again in the same round', () => {
        const targetNpcId = INITIAL_NPCS[0]!.id

        useGameStore.getState().addScheme({
            id: 'scheme-1',
            targetNpcId,
            schemeType: 'advise',
            playerSpeech: 'scheme one',
            resolutionRoll: 0.1,
        })

        useGameStore.setState({ currentPhase: 'SCHEME_PHASE' })
        useGameStore.getState().prevPhase()
        expect(useGameStore.getState().currentPhase).toBe('COURT_OBSERVE')

        useGameStore.getState().nextPhase()

        const state = useGameStore.getState()
        expect(state.currentPhase).toBe('SCHEME_PHASE')
        expect(state.schemeCount).toBe(1)
        expect(state.currentSchemes).toHaveLength(1)
        expect(state.currentSchemes[0]?.targetNpcId).toBe(targetNpcId)
    })

    it('tracks scheme follow-up state transitions on an existing action', () => {
        const actionId = 'scheme-1'
        const targetNpcId = INITIAL_NPCS[0]!.id

        useGameStore.setState({
            currentPhase: 'SCHEME_PHASE',
        })
        useGameStore.getState().addScheme({
            id: actionId,
            targetNpcId,
            schemeType: 'advise',
            playerSpeech: 'scheme one',
            resolutionRoll: 0.1,
        })

        useGameStore.getState().setSchemeFollowUp(actionId, {
            questionText: 'You there?',
            status: 'available',
        })

        let state = useGameStore.getState()
        expect(state.currentSchemes[0]?.followUp?.status).toBe('available')

        useGameStore.getState().answerSchemeFollowUp(
            actionId,
            'I can explain.',
            {
                clarificationFit: 0.5,
                npcInterestFit: 0.4,
                pressureControl: 0.3,
                contradictionRisk: 0.2,
                exposureRiskDelta: -0.01,
                successRateDelta: 0.05,
                effectMultiplierDelta: 0.02,
                evidence: ['reply fit'],
            },
            'The NPC gives a measured response.',
        )

        state = useGameStore.getState()
        expect(state.currentSchemes[0]?.followUp?.status).toBe('answered')
        expect(state.currentSchemes[0]?.followUp?.questionText).toBe('You there?')
        expect(state.currentSchemes[0]?.followUp?.parse?.successRateDelta).toBe(0.05)

        useGameStore.getState().skipSchemeFollowUp(actionId)

        state = useGameStore.getState()
        expect(state.currentSchemes[0]?.followUp?.status).toBe('skipped')
        expect(state.currentSchemes[0]?.followUp?.parse?.successRateDelta).toBe(0.05)
    })

    it('keeps only one unhandled scheme follow-up available in a round', () => {
        useGameStore.setState({
            currentPhase: 'SCHEME_PHASE',
        })

        for (const [index, npc] of INITIAL_NPCS.slice(0, 3).entries()) {
            useGameStore.getState().addScheme({
                id: `scheme-${index + 1}`,
                targetNpcId: npc.id,
                schemeType: 'probe',
                playerSpeech: `scheme ${index + 1}`,
                resolutionRoll: 0.1,
            })
        }

        useGameStore.getState().setSchemeFollowUp('scheme-1', {
            questionText: 'First question?',
            status: 'available',
        })
        useGameStore.getState().setSchemeFollowUp('scheme-2', {
            questionText: 'Second question?',
            status: 'available',
        })
        useGameStore.getState().setSchemeFollowUp('scheme-3', {
            questionText: 'Third question?',
            status: 'available',
        })

        const availableFollowUps = useGameStore.getState().currentSchemes
            .filter(action => action.followUp?.status === 'available')

        expect(availableFollowUps).toHaveLength(1)
        expect(availableFollowUps[0]?.id).toBe('scheme-3')
    })

    it('does not create a follow-up when answering an action without one', () => {
        const actionId = 'scheme-1'

        useGameStore.getState().addScheme({
            id: actionId,
            targetNpcId: INITIAL_NPCS[0]!.id,
            schemeType: 'advise',
            playerSpeech: 'scheme one',
            resolutionRoll: 0.1,
        })

        useGameStore.getState().answerSchemeFollowUp(
            actionId,
            'I can explain.',
            {
                clarificationFit: 0.5,
                npcInterestFit: 0.4,
                pressureControl: 0.3,
                contradictionRisk: 0.2,
                exposureRiskDelta: -0.01,
                successRateDelta: 0.05,
                effectMultiplierDelta: 0.02,
                evidence: ['reply fit'],
            },
            'The NPC gives a measured response.',
        )

        expect(useGameStore.getState().currentSchemes[0]?.followUp).toBeUndefined()
    })

    it('keeps the ending report available after game over', () => {
        useGameStore.setState({
            currentRound: 20,
            currentPhase: 'SCHEME_FEEDBACK',
            northStats: { ...NORTH_INITIAL, finance: 48, grain: 46, military: 50, socialOrder: 45, governance: 44 },
            southStats: { ...SOUTH_INITIAL, finance: 70, grain: 71, military: 68, socialOrder: 66, governance: 67 },
            northPower: calculateCompositePower({ ...NORTH_INITIAL, finance: 48, grain: 46, military: 50, socialOrder: 45, governance: 44 }),
            southPower: calculateCompositePower({ ...SOUTH_INITIAL, finance: 70, grain: 71, military: 68, socialOrder: 66, governance: 67 }),
            npcs: INITIAL_NPCS.map(npc => ({ ...npc, trust: Math.max(npc.trust, 30) })),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction, courtInfluence: Math.min(faction.courtInfluence, 58) })),
            currentSchemes: [],
        })

        useGameStore.getState().nextPhase()

        const state = useGameStore.getState()
        expect(state.currentPhase).toBe('ENDING')
        expect(state.endingReport).toBeTruthy()
        expect(state.endingReport?.tier).toBeTruthy()
    })

    it('stores the latest policy aftereffect so the next round can show delayed fallout', () => {
        useGameStore.setState({
            currentRound: 2,
            currentPhase: 'SCHEME_FEEDBACK',
            selectedPolicyOption: 0,
            policyReason: 'policy reason',
            currentSchemes: [],
        })

        useGameStore.getState().nextPhase()

        const state = useGameStore.getState()
        expect(state.currentPhase).toBe('SETTLEMENT')
        expect(state.lastPolicyAftereffect).toBeTruthy()
        expect(state.lastPolicyAftereffect?.sourceRound).toBe(2)
        expect(state.lastPolicyAftereffect?.summary).toBeTruthy()
    })

    it('can enter settlement from round 1 scheme feedback without throwing', () => {
        useGameStore.setState({
            currentRound: 1,
            currentPhase: 'SCHEME_FEEDBACK',
            selectedPolicyOption: 0,
            policyReason: '先稳住粮道，再图后续布置。',
            currentSchemes: [],
        })

        expect(() => useGameStore.getState().nextPhase()).not.toThrow()

        const state = useGameStore.getState()
        expect(state.currentPhase).toBe('SETTLEMENT')
        expect(state.lastSettlement).toBeTruthy()
    })

    it('applies delayed policy fallout when entering the next round', () => {
        useGameStore.setState({
            currentRound: 2,
            currentPhase: 'ROUND_END',
            southStats: { ...SOUTH_INITIAL },
            southPower: calculateCompositePower(SOUTH_INITIAL),
            lastPolicyAftereffect: {
                sourceRound: 2,
                topic: 'policy',
                summary: 'policy fallout',
                effects: { grain: 1.2, governance: 0.6 },
                legitimacyTone: 'up',
                focusMatched: true,
            },
        })

        useGameStore.getState().nextPhase()

        const state = useGameStore.getState()
        expect(state.currentRound).toBe(3)
        expect(state.southStats.grain).toBeGreaterThan(SOUTH_INITIAL.grain)
        expect(state.southStats.governance).toBeGreaterThan(SOUTH_INITIAL.governance)
    })
})

describe('gameStore Feng Daozhi drafting', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
        resetStore()
    })

    it('consumes one assist and returns omen dual-step draft text', async () => {
        vi.spyOn(aiService, 'chatCompletionJson').mockResolvedValueOnce({
            primaryText: '石人一只眼，挑动黄河天下反。',
            secondaryText: '此非独天灾，恐是朝中名分失序之兆。',
        })

        const draft = await useGameStore.getState().requestFengDaozhiDraft({
            round: 13,
            difficulty: 'normal',
            targetNpcId: 'zongai',
            schemeType: 'omen',
            playerDangerStage: 'safe',
            omenSpeechInput: {
                omenText: '',
                interpretationText: '',
            },
        })

        expect(draft?.primaryText).toBe('石人一只眼，挑动黄河天下反。')
        expect(draft?.secondaryText).toBe('此非独天灾，恐是朝中名分失序之兆。')
        expect(draft?.source).toBe('ai')
        expect(useGameStore.getState().fengDaozhiAssistsRemaining).toBe(1)
    })
})

describe('gameStore guide and prologue state', () => {
    beforeEach(() => {
        resetStore()
    })

    it('defaults to normal difficulty, allows switching, and resets to normal on full reset', () => {
        const state = useGameStore.getState()
        expect(state.difficulty).toBe('normal')

        state.setDifficulty('hard')
        expect(useGameStore.getState().difficulty).toBe('hard')

        useGameStore.getState().resetGame()
        expect(useGameStore.getState().difficulty).toBe('normal')
    })

    it('starts a new game in the prologue step', () => {
        const state = useGameStore.getState()
        expect(state.currentPhase).toBe('PROLOGUE')
        expect(state.prologueStep).toBe('PROLOGUE')
    })

    it('advances the prologue step through the guide states', () => {
        useGameStore.getState().advancePrologue()
        expect(useGameStore.getState().prologueStep).toBe('GAMEPLAY_GUIDE')

        useGameStore.getState().advancePrologue()
        expect(useGameStore.getState().prologueStep).toBe('CHARACTER_BIOS')

        useGameStore.getState().advancePrologue()
        expect(useGameStore.getState().prologueStep).toBe('INGAME')
    })

    it('keeps scheme state when opening and closing the gameplay guide', () => {
        const targetNpcId = INITIAL_NPCS[0]!.id

        useGameStore.setState({
            currentPhase: 'SCHEME_PHASE',
        })
        useGameStore.getState().addScheme({
            id: 'scheme-1',
            targetNpcId,
            schemeType: 'advise',
            playerSpeech: 'guide test',
            resolutionRoll: 0.1,
        })

        useGameStore.getState().openGameplayGuide('gameplay')

        let state = useGameStore.getState()
        expect(state.helpOverlayOpen).toBe(true)
        expect(state.helpOverlaySource).toBe('gameplay')
        expect(state.schemeCount).toBe(1)
        expect(state.currentSchemes).toHaveLength(1)

        useGameStore.getState().closeGameplayGuide()

        state = useGameStore.getState()
        expect(state.helpOverlayOpen).toBe(false)
        expect(state.helpOverlaySource).toBeNull()
        expect(state.schemeCount).toBe(1)
        expect(state.currentSchemes).toHaveLength(1)
    })

    it('returns a new game to the prologue and clears guide state on reset', () => {
        useGameStore.setState({
            currentPhase: 'SCHEME_PHASE',
            prologueStep: 'INGAME',
            helpOverlayOpen: true,
            helpOverlaySource: 'gameplay',
            firstRoundGuideSeen: {
                round_start: true,
                court_observe: true,
                scheme_phase: true,
                empress_letter: true,
                scheme_feedback: true,
                settlement: true,
            },
        })

        useGameStore.getState().resetGame()

        const state = useGameStore.getState()
        expect(state.currentPhase).toBe('PROLOGUE')
        expect(state.prologueStep).toBe('COVER')
        expect(state.helpOverlayOpen).toBe(false)
        expect(state.helpOverlaySource).toBeNull()
        expect(state.firstRoundGuideSeen).toEqual(initialFirstRoundGuideSeen)
    })

    it('marks the omen onboarding as seen and clears it on reset', () => {
        useGameStore.getState().markOmenGuideSeen()
        expect(useGameStore.getState().omenGuideSeen.first_omen_modal).toBe(true)

        useGameStore.getState().resetGame()
        expect(useGameStore.getState().omenGuideSeen.first_omen_modal).toBe(false)
    })

    it('marks scheme onboarding guides as seen and clears them on reset', () => {
        useGameStore.getState().markSchemeOnboardingSeen('scheme_master_guide')
        expect(useGameStore.getState().schemeOnboardingSeen.scheme_master_guide).toBe(true)

        useGameStore.getState().resetGame()
        expect(useGameStore.getState().schemeOnboardingSeen).toEqual(initialSchemeOnboardingSeen)
    })

    it('updates Feng Daozhi assist quota by difficulty and refreshes it next round', () => {
        useGameStore.getState().setDifficulty('hard')
        expect(useGameStore.getState().fengDaozhiAssistsRemaining).toBe(1)

        useGameStore.setState({
            currentRound: 2,
            currentPhase: 'ROUND_END',
            fengDaozhiAssistsRemaining: 0,
        })

        useGameStore.getState().nextPhase()

        const state = useGameStore.getState()
        expect(state.currentRound).toBe(3)
        expect(state.fengDaozhiAssistsRemaining).toBe(1)
    })

    it('hydrates old snapshots without prologueStep using the current phase as fallback', () => {
        const prologueSnapshot = {
            version: 1,
            currentRound: 1,
            currentPhase: 'PROLOGUE',
            schemeCount: 0,
            maxSchemes: 3,
            playerDangerStage: 'safe',
            isGameOver: false,
            gameResult: 'NONE',
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
            npcMemoryLedger: {},
            endingReport: null,
            battleReport: null,
            shuCampaign: {
                state: 'idle',
                sourceRound: null,
                summary: '',
                ongoingNorthImpact: {},
                ongoingSouthImpact: {},
                remainingRounds: 0,
            },
            huainanCampaign: {
                state: 'idle',
                sourceRound: null,
                summary: '',
                ongoingNorthImpact: {},
                ongoingSouthImpact: {},
                remainingRounds: 0,
            },
            shuMomentum: 0,
            huainanMomentum: 0,
            roundStartSnapshot: null,
            helpOverlayOpen: false,
            helpOverlaySource: null,
            firstRoundGuideSeen: false,
            omenGuideSeen: {
                first_omen_modal: false,
            },
        } as unknown as PersistedGameSnapshot

        useGameStore.getState().hydrateSnapshot(prologueSnapshot)
        expect(useGameStore.getState().prologueStep).toBe('PROLOGUE')

        resetStore()

        const inGameSnapshot = {
            ...prologueSnapshot,
            currentPhase: 'ROUND_START',
        } as unknown as PersistedGameSnapshot

        useGameStore.getState().hydrateSnapshot(inGameSnapshot)
        expect(useGameStore.getState().prologueStep).toBe('INGAME')
    })

    it('hydrates the new prologue and guide fields from a snapshot', () => {
        const snapshot = {
            version: 1,
            currentRound: 3,
            currentPhase: 'ROUND_START',
            difficulty: 'easy',
            schemeCount: 1,
            maxSchemes: 3,
            playerDangerStage: 'safe',
            isGameOver: false,
            gameResult: 'NONE',
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
            npcMemoryLedger: {},
            endingReport: null,
            battleReport: null,
            shuCampaign: {
                state: 'idle',
                sourceRound: null,
                summary: '',
                ongoingNorthImpact: {},
                ongoingSouthImpact: {},
                remainingRounds: 0,
            },
            huainanCampaign: {
                state: 'idle',
                sourceRound: null,
                summary: '',
                ongoingNorthImpact: {},
                ongoingSouthImpact: {},
                remainingRounds: 0,
            },
            shuMomentum: 0,
            huainanMomentum: 0,
            roundStartSnapshot: null,
            prologueStep: 'CHARACTER_BIOS',
            helpOverlayOpen: true,
            helpOverlaySource: 'prologue',
            firstRoundGuideSeen: {
                round_start: true,
                court_observe: false,
                scheme_phase: true,
                empress_letter: false,
                scheme_feedback: true,
                settlement: false,
            },
            schemeOnboardingSeen: {
                scheme_master_guide: true,
                first_omen_teaching: false,
                first_external_line_teaching: false,
                first_follow_up_teaching: false,
            },
            omenGuideSeen: {
                first_omen_modal: false,
            },
            fengDaozhiAssistsRemaining: 3,
        } as PersistedGameSnapshot & {
            prologueStep: 'CHARACTER_BIOS'
            helpOverlayOpen: boolean
            helpOverlaySource: 'prologue' | null
            firstRoundGuideSeen: {
                round_start: boolean
                court_observe: boolean
                scheme_phase: boolean
                empress_letter: boolean
                scheme_feedback: boolean
                settlement: boolean
            }
            omenGuideSeen: {
                first_omen_modal: boolean
            }
        }

        useGameStore.getState().hydrateSnapshot(snapshot)

        const state = useGameStore.getState()
        expect(state.currentPhase).toBe('ROUND_START')
        expect(state.difficulty).toBe('easy')
        expect(state.prologueStep).toBe('CHARACTER_BIOS')
        expect(state.helpOverlayOpen).toBe(true)
        expect(state.helpOverlaySource).toBe('prologue')
        expect(state.firstRoundGuideSeen).toEqual({
            round_start: true,
            court_observe: false,
            scheme_phase: true,
            empress_letter: false,
            scheme_feedback: true,
            settlement: false,
        })
        expect(state.schemeOnboardingSeen).toEqual({
            scheme_master_guide: true,
            first_omen_teaching: false,
            first_external_line_teaching: false,
            first_follow_up_teaching: false,
        })
        expect(state.fengDaozhiAssistsRemaining).toBe(3)
    })

    it('hydrates legacy npc objects through court disposition normalization', () => {
        const legacyNpcs = INITIAL_NPCS.map(npc => {
            const { emperorFavor, empressDowagerFavor, courtStatus, disposalStage, ...legacyNpc } = npc as any
            return legacyNpc
        })
        const snapshot = {
            version: 1,
            currentRound: 3,
            currentPhase: 'ROUND_START',
            difficulty: 'normal',
            schemeCount: 0,
            maxSchemes: 3,
            playerDangerStage: 'safe',
            isGameOver: false,
            gameResult: 'NONE',
            northStats: { ...NORTH_INITIAL },
            southStats: { ...SOUTH_INITIAL },
            northPower: calculateCompositePower(NORTH_INITIAL),
            southPower: calculateCompositePower(SOUTH_INITIAL),
            npcs: legacyNpcs,
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
            npcMemoryLedger: {},
            endingReport: null,
            battleReport: null,
            shuCampaign: {
                state: 'idle',
                sourceRound: null,
                summary: '',
                ongoingNorthImpact: {},
                ongoingSouthImpact: {},
                remainingRounds: 0,
            },
            huainanCampaign: {
                state: 'idle',
                sourceRound: null,
                summary: '',
                ongoingNorthImpact: {},
                ongoingSouthImpact: {},
                remainingRounds: 0,
            },
            shuMomentum: 0,
            huainanMomentum: 0,
            roundStartSnapshot: {
                currentRound: 3,
                currentPhase: 'ROUND_START',
                difficulty: 'normal',
                schemeCount: 0,
                maxSchemes: 3,
                prologueStep: 'INGAME',
                helpOverlayOpen: false,
                helpOverlaySource: null,
                firstRoundGuideSeen: initialFirstRoundGuideSeen,
                schemeOnboardingSeen: initialSchemeOnboardingSeen,
                omenGuideSeen: { first_omen_modal: false },
                fengDaozhiAssistsRemaining: 2,
                playerDangerStage: 'safe',
                isGameOver: false,
                gameResult: 'NONE',
                northStats: { ...NORTH_INITIAL },
                southStats: { ...SOUTH_INITIAL },
                northPower: calculateCompositePower(NORTH_INITIAL),
                southPower: calculateCompositePower(SOUTH_INITIAL),
                npcs: legacyNpcs,
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
                npcMemoryLedger: {},
                endingReport: null,
                battleReport: null,
                shuCampaign: {
                    state: 'idle',
                    sourceRound: null,
                    summary: '',
                    ongoingNorthImpact: {},
                    ongoingSouthImpact: {},
                    remainingRounds: 0,
                },
                huainanCampaign: {
                    state: 'idle',
                    sourceRound: null,
                    summary: '',
                    ongoingNorthImpact: {},
                    ongoingSouthImpact: {},
                    remainingRounds: 0,
                },
                shuMomentum: 0,
                huainanMomentum: 0,
            },
        } as unknown as PersistedGameSnapshot

        useGameStore.getState().hydrateSnapshot(snapshot)

        const zuting = useGameStore.getState().npcs.find(npc => npc.id === 'zuting') as any
        const roundStartZuting = useGameStore.getState().roundStartSnapshot?.npcs.find(npc => npc.id === 'zuting') as any
        expect(zuting.emperorFavor).toBe(26)
        expect(zuting.empressDowagerFavor).toBe(82)
        expect(zuting.courtStatus).toBe('active')
        expect(roundStartZuting.emperorFavor).toBe(26)
    })

    it('can save and restore the current round start snapshot after a failed round', () => {
        useGameStore.setState({
            currentRound: 6,
            currentPhase: 'ROUND_START',
            prologueStep: 'INGAME',
            playerDangerStage: 'under_watch',
        })

        useGameStore.getState().saveRoundStartSnapshot()
        useGameStore.setState({
            currentPhase: 'ENDING',
            isGameOver: true,
            gameResult: 'DEFEAT_DEATH',
            schemeCount: 2,
            currentSchemes: [
                {
                    id: 'scheme-1',
                    targetNpcId: INITIAL_NPCS[0]!.id,
                    schemeType: 'advise',
                    playerSpeech: 'test',
                },
            ],
        })

        useGameStore.getState().restoreRoundStartSnapshot()

        const state = useGameStore.getState()
        expect(state.currentRound).toBe(6)
        expect(state.currentPhase).toBe('ROUND_START')
        expect(state.isGameOver).toBe(false)
        expect(state.gameResult).toBe('NONE')
        expect(state.schemeCount).toBe(0)
        expect(state.currentSchemes).toHaveLength(0)
        expect(state.playerDangerStage).toBe('under_watch')
        expect(state.roundStartSnapshot?.currentRound).toBe(6)
    })
})
