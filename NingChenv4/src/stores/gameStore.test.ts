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
    court_faction: false,
    external_faction: false,
    npc_detail: false,
    scheme_phase: false,
    scheme_card_advise: false,
    scheme_card_slander: false,
    scheme_card_alienate: false,
    scheme_card_frame: false,
    scheme_card_proxy: false,
    scheme_card_secession: false,
    scheme_card_omen: false,
    empress_letter: false,
    scheme_feedback: false,
    empress_reply: false,
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
        empressReplyRecord: null,
        pendingBacklash: [],
        recentBacklash: [],
        roundHistory: [],
        npcMemoryLedger: {},
        relationMemoryLedger: {},
        worldMemoryLedger: [],
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
        fengDaozhiGuideSeen: {},
        fengDaozhiAssistsRemaining: 3,
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

    it('derives world memory ledger entries after round settlement', () => {
        useGameStore.setState({
            currentRound: 6,
            currentPhase: 'SCHEME_FEEDBACK',
            currentSchemes: [{
                id: 'world-memory-scheme',
                targetNpcId: 'zuting',
                schemeType: 'advise',
                playerSpeech: '请祖珽重核京畿仓簿与度支账册。',
                resolutionRoll: 0.01,
                northParse: {
                    characterFit: 0.9,
                    eventFit: 0.9,
                    structuralPenetration: 0.9,
                    executability: 0.9,
                    exposureRisk: 0.1,
                    financeRelevance: 0.8,
                    grainRelevance: 0.9,
                    militaryRelevance: 0.2,
                    socialOrderRelevance: 0.2,
                    governanceRelevance: 0.7,
                    dominantIntent: 'strategize',
                    stateBenefit: 0.1,
                    targetBenefit: 0,
                    factionBenefit: 0,
                    advicePolarity: 'pro_target_anti_state',
                    evidence: ['仓簿与度支账册'],
                },
            }],
        })

        useGameStore.getState().nextPhase()

        const state = useGameStore.getState()
        expect(state.worldMemoryLedger.some(memory => memory.sourceActionId === 'world-memory-scheme')).toBe(true)
        expect(state.worldMemoryLedger.map(memory => memory.scope)).toEqual(expect.arrayContaining(['court_public', 'chronicle_fact']))
        expect(state.worldMemoryLedger.map(memory => memory.summary).join('；')).not.toContain('南陈内应')
    })

    it('keeps existing schemes while court observe waits for the remaining embedded schemes', () => {
        const targetNpcId = INITIAL_NPCS[0]!.id

        useGameStore.getState().addScheme({
            id: 'scheme-1',
            targetNpcId,
            schemeType: 'advise',
            playerSpeech: 'scheme one',
            resolutionRoll: 0.1,
        })

        useGameStore.setState({ currentPhase: 'COURT_OBSERVE' })

        useGameStore.getState().nextPhase()

        const state = useGameStore.getState()
        expect(state.currentPhase).toBe('COURT_OBSERVE')
        expect(state.schemeCount).toBe(1)
        expect(state.currentSchemes).toHaveLength(1)
        expect(state.currentSchemes[0]?.targetNpcId).toBe(targetNpcId)
    })

    it('tracks scheme follow-up state transitions on an existing action', () => {
        const actionId = 'scheme-1'
        const targetNpcId = INITIAL_NPCS[0]!.id

        useGameStore.setState({
            currentPhase: 'COURT_OBSERVE',
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

    it('stores and updates omen echo data without clobbering the main feedback reply', () => {
        const feedbackId = 'scheme-omen'

        useGameStore.getState().addNpcFeedback({
            id: feedbackId,
            npcId: INITIAL_NPCS[0]!.id,
            npcName: INITIAL_NPCS[0]!.name,
            schemeType: 'omen',
            schemeName: '璋剁含',
            playerSpeech: 'omen speech',
            feedback: 'main reply',
            isLoading: false,
            source: 'AI',
        })

        const initialEcho = {
            speakerNpcId: INITIAL_NPCS[1]!.id,
            speakerNpcName: INITIAL_NPCS[1]!.name,
            speakerTitle: INITIAL_NPCS[1]!.title,
            text: 'first omen echo',
            source: 'ai' as const,
        }

        useGameStore.getState().updateNpcFeedbackOmenEcho(feedbackId, initialEcho)

        let state = useGameStore.getState()
        expect(state.npcFeedbacks[0]?.feedback).toBe('main reply')
        expect(state.npcFeedbacks[0]?.omenEcho).toEqual(initialEcho)

        useGameStore.getState().updateNpcFeedback(feedbackId, 'updated main reply', 'local fallback')

        state = useGameStore.getState()
        expect(state.npcFeedbacks[0]?.feedback).toBe('updated main reply')
        expect(state.npcFeedbacks[0]?.source).toBe('local fallback')
        expect(state.npcFeedbacks[0]?.omenEcho).toEqual(initialEcho)

        const updatedEcho = {
            ...initialEcho,
            text: 'updated omen echo',
            source: 'fallback' as const,
        }

        useGameStore.getState().updateNpcFeedbackOmenEcho(feedbackId, updatedEcho)

        state = useGameStore.getState()
        expect(state.npcFeedbacks[0]?.feedback).toBe('updated main reply')
        expect(state.npcFeedbacks[0]?.omenEcho).toEqual(updatedEcho)
    })

    it('patches finalized scheme npc action back into causal memory ledgers', () => {
        const zongai = INITIAL_NPCS.find(npc => npc.id === 'zongai')!
        const linghu = INITIAL_NPCS.find(npc => npc.id === 'linghuelvguang')!
        const fallbackText = '宗艾开始疏远令狐律光的粮道与军需调度。'
        const aiText = '宗艾暗查令狐律光的粮道与军需调拨，先扣住兵械文书，再把疑点递向御前。'

        useGameStore.setState({
            currentRound: 14,
            lastSettlement: {
                processedSchemes: [{
                    id: 'scheme-ai-action',
                    targetNpcId: zongai.id,
                    relatedNpcId: linghu.id,
                    schemeType: 'alienate',
                    playerSpeech: '先查令狐律光粮道与军需。',
                }],
                schemeResults: [{
                    success: true,
                    npcAction: {
                        text: fallbackText,
                        source: 'fallback',
                    },
                    causalEvent: {
                        actionId: 'scheme-ai-action',
                        actorNpcId: zongai.id,
                        actorNpcName: zongai.name,
                        relatedNpcId: linghu.id,
                        relatedNpcName: linghu.name,
                        schemeType: 'alienate',
                        success: true,
                        motionText: fallbackText,
                        motionSource: 'fallback',
                        primaryDimensions: ['grain', 'military'],
                        secondaryDimensions: [],
                        effectSummary: ['令狐律光军力-1', '北周 粮草-0.4'],
                        relatedImpactSummary: '令狐律光的粮道与军需军令受牵动',
                    },
                }],
            } as any,
            npcMemoryLedger: {
                [zongai.id]: [{
                    npcId: zongai.id,
                    category: 'warning',
                    sourceRound: 14,
                    importance: 2,
                    summary: `第14回合，${fallbackText}`,
                    schemeType: 'alienate',
                    tags: ['pressure', 'hard'],
                }],
            },
            relationMemoryLedger: {
                [zongai.id]: [{
                    holderNpcId: zongai.id,
                    subjectNpcId: linghu.id,
                    stance: 'resentment',
                    sourceRound: 14,
                    importance: 2,
                    summary: '第14回合，你把令狐律光记成了更容易结怨的人。',
                    occurrences: 1,
                }],
            },
            worldMemoryLedger: [{
                id: '14:scheme-ai-action:court_public',
                sourceRound: 14,
                sourceActionId: 'scheme-ai-action',
                scope: 'court_public',
                visibility: 'public',
                involvedNpcIds: [zongai.id, linghu.id],
                affectedFactionIds: ['emperor'],
                dimensions: ['grain', 'military'],
                schemeType: 'alienate',
                summary: fallbackText,
                reliability: 0.72,
                secrecyRisk: 0.12,
                tags: ['court_public'],
            }],
        })

        useGameStore.getState().updateSchemeNpcAction('scheme-ai-action', {
            text: aiText,
            source: 'ai',
        })

        const state = useGameStore.getState()
        expect(state.lastSettlement?.schemeResults[0]?.causalEvent?.motionText).toBe(aiText)
        expect(state.npcMemoryLedger[zongai.id]?.[0]?.summary).toContain(aiText)
        expect(state.npcMemoryLedger[zongai.id]?.[0]?.summary).not.toContain(fallbackText)
        expect(state.relationMemoryLedger[zongai.id]?.[0]?.summary).toContain(aiText)
        expect(state.worldMemoryLedger[0]?.summary).toContain(aiText.replace(/。$/u, ''))
        expect(state.worldMemoryLedger[0]?.summary).not.toContain(fallbackText)
    })

    it('keeps only one unhandled scheme follow-up available in a round', () => {
        useGameStore.setState({
            currentPhase: 'COURT_OBSERVE',
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

    it('stores AI fallback diagnostics when answering a scheme follow-up', () => {
        const actionId = 'scheme-1'

        useGameStore.setState({
            currentPhase: 'COURT_OBSERVE',
        })
        useGameStore.getState().addScheme({
            id: actionId,
            targetNpcId: INITIAL_NPCS[0]!.id,
            schemeType: 'advise',
            playerSpeech: 'scheme one',
            resolutionRoll: 0.1,
        })
        useGameStore.getState().setSchemeFollowUp(actionId, {
            questionText: 'Question?',
            status: 'available',
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
            {
                parseSource: 'invalid_ai_fallback',
                parseFallbackReason: 'request_failed',
                finalNpcReplySource: 'fallback',
                finalNpcReplyFallbackReason: 'sanitized_empty',
            },
        )

        expect(useGameStore.getState().currentSchemes[0]?.followUp).toEqual(expect.objectContaining({
            status: 'answered',
            parseSource: 'invalid_ai_fallback',
            parseFallbackReason: 'request_failed',
            finalNpcReplySource: 'fallback',
            finalNpcReplyFallbackReason: 'sanitized_empty',
        }))
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
        expect(state.currentPhase).toBe('SCHEME_FEEDBACK')
        expect(state.lastSettlement?.gameResult).not.toBe('NONE')
        expect(state.endingReport).toBeTruthy()
        expect(state.endingReport?.tier).toBeTruthy()

        useGameStore.getState().nextPhase()
        expect(useGameStore.getState().currentPhase).toBe('ENDING')
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
        expect(state.currentPhase).toBe('SCHEME_FEEDBACK')
        expect(state.lastSettlement).toBeTruthy()
        expect(state.lastPolicyAftereffect).toBeTruthy()
        expect(state.lastPolicyAftereffect?.sourceRound).toBe(2)
        expect(state.lastPolicyAftereffect?.summary).toBeTruthy()

        useGameStore.getState().nextPhase()
        expect(useGameStore.getState().currentPhase).toBe('EMPRESS_REPLY')
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
        expect(state.currentPhase).toBe('SCHEME_FEEDBACK')
        expect(state.lastSettlement).toBeTruthy()

        expect(() => useGameStore.getState().nextPhase()).not.toThrow()
        expect(useGameStore.getState().currentPhase).toBe('EMPRESS_REPLY')
    })

    it('continues from empress reply into settlement', () => {
        useGameStore.setState({
            currentPhase: 'EMPRESS_REPLY',
        })

        useGameStore.getState().nextPhase()

        expect(useGameStore.getState().currentPhase).toBe('SETTLEMENT')
    })

    it('keeps round history and npc memory aligned with processed schemes when an earlier action is skipped', () => {
        const skippedTarget = INITIAL_NPCS[0]!
        const processedTarget = INITIAL_NPCS.find(npc => npc.id === 'zuting')!

        useGameStore.setState({
            currentRound: 6,
            currentPhase: 'SCHEME_FEEDBACK',
            currentSchemes: [
                {
                    id: 'skip-me',
                    targetNpcId: skippedTarget.id,
                    schemeType: 'slander',
                    playerSpeech: '先看他会不会自己露口风。',
                },
                {
                    id: 'keep-me',
                    targetNpcId: processedTarget.id,
                    schemeType: 'advise',
                    playerSpeech: '可借漕运与中枢节制，把南征议程重新拽回中枢。',
                    resolutionRoll: 0.03,
                    northParse: {
                        characterFit: 0.74,
                        eventFit: 0.58,
                        structuralPenetration: 0.7,
                        executability: 0.72,
                        exposureRisk: 0.14,
                        financeRelevance: 0.42,
                        grainRelevance: 0.28,
                        militaryRelevance: 0.2,
                        socialOrderRelevance: 0.34,
                        governanceRelevance: 0.78,
                        dominantIntent: 'strategize',
                        stateBenefit: -0.54,
                        targetBenefit: 0.68,
                        factionBenefit: 0.2,
                        advicePolarity: 'pro_target_anti_state',
                        legitimacyDirection: 0,
                        omenPolarity: 'vague_or_ceremonial',
                        evidence: [],
                    },
                },
            ],
            npcs: INITIAL_NPCS.map(npc => ({ ...npc, trust: npc.id === processedTarget.id ? 66 : npc.trust })),
            selectedPolicyOption: 0,
            policyReason: '先稳住粮道，再图后续布置。',
        })

        useGameStore.getState().nextPhase()

        const state = useGameStore.getState()
        expect(state.lastSettlement?.processedSchemes).toHaveLength(1)
        expect(state.lastSettlement?.processedSchemes[0]?.targetNpcId).toBe(processedTarget.id)
        expect(state.roundHistory.at(-1)?.keyTargets).toEqual([processedTarget.name])
        expect(state.roundHistory.at(-1)?.schemeDetails).toEqual([
            expect.objectContaining({
                targetNpcId: processedTarget.id,
                targetNpcName: processedTarget.name,
                schemeType: 'advise',
                success: true,
            }),
        ])
        expect(state.npcMemoryLedger[processedTarget.id]).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    npcId: processedTarget.id,
                    category: 'saved_face',
                    schemeType: 'advise',
                }),
            ]),
        )
        expect(state.npcMemoryLedger[skippedTarget.id]).toBeUndefined()
    })

    it('applies delayed policy fallout when entering the next round', () => {
        useGameStore.setState({
            currentRound: 2,
            currentPhase: 'SETTLEMENT',
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

describe('gameStore Feng Daozhi guide seen state', () => {
    beforeEach(() => {
        resetStore()
    })

    it('marks one Feng Daozhi guide key as seen', () => {
        useGameStore.getState().markFengDaozhiGuideSeen('round:3:advisor_kit:v1')

        expect(useGameStore.getState().fengDaozhiGuideSeen).toMatchObject({
            'round:3:advisor_kit:v1': true,
        })
    })

    it('marks multiple Feng Daozhi guide keys as seen', () => {
        useGameStore.getState().markFengDaozhiGuideSeenMany([
            'first-round:court_observe:v1',
            'round:1:advisor_kit:v1',
        ])

        expect(useGameStore.getState().fengDaozhiGuideSeen).toMatchObject({
            'first-round:court_observe:v1': true,
            'round:1:advisor_kit:v1': true,
        })
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
        expect(useGameStore.getState().fengDaozhiAssistsRemaining).toBe(2)
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

    it('starts a new game at the opening cinematic step', () => {
        useGameStore.getState().startNewGame('hard')

        const state = useGameStore.getState()
        expect(state.currentPhase).toBe('PROLOGUE')
        expect(state.prologueStep).toBe('OPENING_CINEMATIC')
        expect(state.difficulty).toBe('hard')
    })

    it('gives three Feng Daozhi drafting assists on every difficulty', () => {
        const difficulties = ['easy', 'normal', 'hard', 'hell'] as const

        for (const difficulty of difficulties) {
            useGameStore.getState().startNewGame(difficulty)
            expect(useGameStore.getState().fengDaozhiAssistsRemaining).toBe(3)
            useGameStore.getState().resetGame()
        }
    })

    it('advances from the opening cinematic directly into the first round', () => {
        useGameStore.setState({ prologueStep: 'OPENING_CINEMATIC' })

        useGameStore.getState().advancePrologue()
        expect(useGameStore.getState().prologueStep).toBe('INGAME')
    })

    it('keeps scheme state when opening and closing the gameplay guide', () => {
        const targetNpcId = INITIAL_NPCS[0]!.id

        useGameStore.setState({
            currentPhase: 'COURT_OBSERVE',
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
            currentPhase: 'COURT_OBSERVE',
            prologueStep: 'INGAME',
            helpOverlayOpen: true,
            helpOverlaySource: 'gameplay',
            firstRoundGuideSeen: {
                ...initialFirstRoundGuideSeen,
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

    it('keeps Feng Daozhi assist quota at three and refreshes it next round', () => {
        useGameStore.getState().setDifficulty('hard')
        expect(useGameStore.getState().fengDaozhiAssistsRemaining).toBe(3)

        useGameStore.setState({
            currentRound: 2,
            currentPhase: 'SETTLEMENT',
            fengDaozhiAssistsRemaining: 0,
        })

        useGameStore.getState().nextPhase()

        const state = useGameStore.getState()
        expect(state.currentRound).toBe(3)
        expect(state.fengDaozhiAssistsRemaining).toBe(3)
    })

    it('prepares scheme settlement while staying on the feedback page', () => {
        useGameStore.setState({
            currentPhase: 'SCHEME_FEEDBACK',
            schemeCount: 3,
            currentSchemes: [],
            lastSettlement: null,
        })

        useGameStore.getState().prepareSchemeSettlementForFeedback()

        const state = useGameStore.getState()
        expect(state.currentPhase).toBe('SCHEME_FEEDBACK')
        expect(state.lastSettlement).not.toBeNull()
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
            empressReplyRecord: null,
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
            empressReplyRecord: null,
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
                ...initialFirstRoundGuideSeen,
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
            fengDaozhiGuideSeen: {},
            fengDaozhiAssistsRemaining: 3,
        } as PersistedGameSnapshot & {
            prologueStep: 'CHARACTER_BIOS'
            helpOverlayOpen: boolean
            helpOverlaySource: 'prologue' | null
            firstRoundGuideSeen: typeof initialFirstRoundGuideSeen
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
            ...initialFirstRoundGuideSeen,
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
            empressReplyRecord: null,
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
                fengDaozhiAssistsRemaining: 3,
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
                empressReplyRecord: null,
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
            relationMemoryLedger: {
                zuting: [
                    {
                        holderNpcId: 'zuting',
                        subjectNpcId: 'yuwendi',
                        stance: 'suspicion',
                        sourceRound: 6,
                        importance: 2,
                        summary: 'round-start relation memory',
                        occurrences: 1,
                    },
                ],
            },
        })

        useGameStore.getState().saveRoundStartSnapshot()
        const savedSnapshot = useGameStore.getState().roundStartSnapshot
        useGameStore.setState(state => ({
            relationMemoryLedger: {
                ...state.relationMemoryLedger,
                zuting: [
                    {
                        ...(state.relationMemoryLedger.zuting?.[0] ?? {
                            holderNpcId: 'zuting',
                            subjectNpcId: 'yuwendi',
                            stance: 'suspicion' as const,
                            sourceRound: 6,
                            importance: 2 as const,
                            summary: 'round-start relation memory',
                            occurrences: 1,
                        }),
                        summary: 'mutated after snapshot',
                    },
                ],
            },
        }))
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
        expect(savedSnapshot?.relationMemoryLedger?.zuting?.[0]?.summary).toBe('round-start relation memory')
        expect(state.roundStartSnapshot?.relationMemoryLedger?.zuting?.[0]?.summary).toBe('round-start relation memory')
    })
})
