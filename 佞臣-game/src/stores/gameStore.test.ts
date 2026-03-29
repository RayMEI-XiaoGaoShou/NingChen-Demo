import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from './gameStore'
import { INITIAL_NPCS } from '../data/npcs'
import { INITIAL_FACTIONS } from '../data/factions'
import { INITIAL_RELATIONSHIP_EDGES } from '../data/npcRelationships'
import { NORTH_INITIAL, SOUTH_INITIAL } from '../data/nationStats'
import { calculateCompositePower } from '../game/types'
import type { PersistedGameSnapshot } from '../game/saveEngine'

const initialFirstRoundGuideSeen = {
    round_start: false,
    court_observe: false,
    scheme_phase: false,
    empress_letter: false,
    scheme_feedback: false,
    settlement: false,
}

function resetStore() {
    useGameStore.setState({
        currentRound: 1,
        currentPhase: 'PROLOGUE',
        schemeCount: 0,
        maxSchemes: 3,
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
        npcFeedbacks: [],
        lastSettlement: null,
        lastPolicyReport: null,
        lastPolicyAftereffect: null,
        roundHistory: [],
        endingReport: null,
        battleReport: null,
        prologueStep: 'PROLOGUE',
        helpOverlayOpen: false,
        helpOverlaySource: null,
        firstRoundGuideSeen: initialFirstRoundGuideSeen,
    })
}

describe('gameStore addScheme', () => {
    beforeEach(() => {
        resetStore()
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

describe('gameStore guide and prologue state', () => {
    beforeEach(() => {
        resetStore()
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
        expect(state.prologueStep).toBe('PROLOGUE')
        expect(state.helpOverlayOpen).toBe(false)
        expect(state.helpOverlaySource).toBeNull()
        expect(state.firstRoundGuideSeen).toEqual(initialFirstRoundGuideSeen)
    })

    it('hydrates old snapshots without prologueStep using the current phase as fallback', () => {
        const prologueSnapshot = {
            version: 1,
            currentRound: 1,
            currentPhase: 'PROLOGUE',
            schemeCount: 0,
            maxSchemes: 3,
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
            npcFeedbacks: [],
            lastSettlement: null,
            lastPolicyReport: null,
            lastPolicyAftereffect: null,
            roundHistory: [],
            endingReport: null,
            battleReport: null,
            helpOverlayOpen: false,
            helpOverlaySource: null,
            firstRoundGuideSeen: false,
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
            schemeCount: 1,
            maxSchemes: 3,
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
            npcFeedbacks: [],
            lastSettlement: null,
            lastPolicyReport: null,
            lastPolicyAftereffect: null,
            roundHistory: [],
            endingReport: null,
            battleReport: null,
            prologueStep: 'GAMEPLAY_GUIDE',
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
        } as PersistedGameSnapshot & {
            prologueStep: 'GAMEPLAY_GUIDE'
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
        }

        useGameStore.getState().hydrateSnapshot(snapshot)

        const state = useGameStore.getState()
        expect(state.currentPhase).toBe('ROUND_START')
        expect(state.prologueStep).toBe('GAMEPLAY_GUIDE')
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
    })
})
