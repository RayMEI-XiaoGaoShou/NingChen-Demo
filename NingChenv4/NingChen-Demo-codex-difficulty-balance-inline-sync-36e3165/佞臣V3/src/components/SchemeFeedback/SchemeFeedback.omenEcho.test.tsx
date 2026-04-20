import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { SchemeFeedback } from './SchemeFeedback'

function createNorthParse() {
    return {
        characterFit: 0.6,
        eventFit: 0.55,
        structuralPenetration: 0.3,
        executability: 0.4,
        exposureRisk: 0.1,
        financeRelevance: 0,
        grainRelevance: 0,
        militaryRelevance: 0,
        socialOrderRelevance: 0,
        governanceRelevance: 0,
        dominantIntent: 'neutral' as const,
        stateBenefit: 0,
        targetBenefit: 0,
        factionBenefit: 0,
        advicePolarity: 'neutral_or_vague' as const,
        legitimacyDirection: 0,
        omenPolarity: 'vague_or_ceremonial' as const,
        selfTrapPotential: 0,
        scapegoatClarity: 0,
        omenAnchorStrength: 0,
        legitimacyCrack: 0,
        suspicionDirection: 0,
        suspicionTransmission: 0,
        fractureTransmission: 0,
        proxyTransmission: 0,
        evidence: [],
    }
}

function createState(): any {
    return {
        npcFeedbacks: [],
        currentSchemes: [],
        npcs: [],
        factions: [],
        intelProgress: {},
        recentBacklash: [],
        roundHistory: [],
        pendingStructuredSchemeIds: [],
        addNpcFeedback: vi.fn(),
        updateNpcFeedback: vi.fn(),
        updateNpcFeedbackOmenEcho: vi.fn(),
        updateSchemeParse: vi.fn(),
        markSchemeParsePending: vi.fn(),
        setSchemeFollowUp: vi.fn(),
        answerSchemeFollowUp: vi.fn(),
        skipSchemeFollowUp: vi.fn(),
        nextPhase: vi.fn(),
        currentRound: 2,
        firstRoundGuideSeen: { scheme_feedback: true },
        schemeOnboardingSeen: {
            scheme_master_guide: true,
            first_omen_teaching: true,
            first_external_line_teaching: true,
            first_follow_up_teaching: true,
        },
        markFirstRoundGuideSeen: vi.fn(),
        markSchemeOnboardingSeen: vi.fn(),
        openGameplayGuide: vi.fn(),
        shuCampaign: {
            state: 'idle',
            resolvedState: null,
            sourceRound: null,
            summary: '',
            ongoingNorthImpact: {},
            ongoingSouthImpact: {},
            remainingRounds: 0,
        },
        huainanCampaign: {
            state: 'idle',
            resolvedState: null,
            sourceRound: null,
            summary: '',
            ongoingNorthImpact: {},
            ongoingSouthImpact: {},
            remainingRounds: 0,
        },
    }
}

let state = createState()

vi.mock('../../stores/gameStore', () => ({
    useGameStore: () => state,
}))

beforeEach(() => {
    state = createState()
})

describe('SchemeFeedback omen echo rendering', () => {
    it('renders omen echo content only for omen feedback items with attached echo data', () => {
        state.currentSchemes = [
            {
                id: 'omen-1',
                targetNpcId: 'npc-1',
                schemeType: 'omen',
                playerSpeech: 'omens speak',
                northParse: createNorthParse(),
            },
        ]
        state.npcFeedbacks = [
            {
                id: 'omen-1',
                npcId: 'npc-1',
                npcName: '仲达',
                schemeType: 'omen',
                schemeName: '谶纬',
                playerSpeech: 'omens speak',
                feedback: 'Main reply stays primary.',
                omenEcho: {
                    speakerNpcId: 'npc-2',
                    speakerNpcName: '太后',
                    speakerTitle: '��̫��',
                    text: 'Echoed omen text.',
                    source: 'ai',
                },
                isLoading: false,
                source: 'AI',
            },
        ]
        state.npcs = [
            {
                id: 'npc-1',
                name: '仲达',
                factionId: 'emperor',
                powerBase: 'court',
                title: '尚书',
                publicPersona: '谨慎',
                publicStance: '中立',
                personality: '稳重',
                softSpot: '名望',
                triggerPoint: '逼问',
                schemeHooks: '谶纬',
                trust: 50,
                isAlive: true,
                canExecute: false,
                militaryPower: 10,
                loyaltyToCourt: 50,
                alignmentBias: 'swing',
                externalStatus: 'loyal',
                availableSchemes: [],
                highRounds: [],
                secretThreads: [],
            },
            {
                id: 'npc-2',
                name: '太后',
                factionId: 'emperor',
                powerBase: 'court',
                title: '��̫��',
                publicPersona: '克制',
                publicStance: '中立',
                personality: '冷静',
                softSpot: '威望',
                triggerPoint: '探问',
                schemeHooks: '余音',
                trust: 48,
                isAlive: true,
                canExecute: false,
                militaryPower: 9,
                loyaltyToCourt: 49,
                alignmentBias: 'swing',
                externalStatus: 'loyal',
                availableSchemes: [],
                highRounds: [],
                secretThreads: [],
            },
        ]

        const markup = renderToStaticMarkup(<SchemeFeedback />)

        expect(markup).toContain('feedback-omen-echo')
        expect(markup).toContain('Echoed omen text.')

    })

    it('hides omen echo content when the feedback is not omen-based or has no echo', () => {
        state.currentSchemes = [
            {
                id: 'probe-1',
                targetNpcId: 'npc-1',
                schemeType: 'probe',
                playerSpeech: 'plain speech',
                northParse: createNorthParse(),
            },
        ]
        state.npcFeedbacks = [
            {
                id: 'probe-1',
                npcId: 'npc-1',
                npcName: '仲达',
                schemeType: 'probe',
                schemeName: '探询',
                playerSpeech: 'plain speech',
                feedback: 'No echo should appear.',
                omenEcho: {
                    speakerNpcId: 'npc-2',
                    speakerNpcName: '太后',
                    speakerTitle: '��̫��',
                    text: 'This should stay hidden.',
                    source: 'ai',
                },
                isLoading: false,
                source: 'AI',
            },
            {
                id: 'omen-2',
                npcId: 'npc-2',
                npcName: '太后',
                schemeType: 'omen',
                schemeName: '谶纬',
                playerSpeech: 'missing echo',
                feedback: 'Still no echo block.',
                isLoading: false,
                source: 'AI',
            },
        ]
        state.npcs = [
            {
                id: 'npc-1',
                name: '仲达',
                factionId: 'emperor',
                powerBase: 'court',
                title: '尚书',
                publicPersona: '谨慎',
                publicStance: '中立',
                personality: '稳重',
                softSpot: '名望',
                triggerPoint: '逼问',
                schemeHooks: '谶纬',
                trust: 50,
                isAlive: true,
                canExecute: false,
                militaryPower: 10,
                loyaltyToCourt: 50,
                alignmentBias: 'swing',
                externalStatus: 'loyal',
                availableSchemes: [],
                highRounds: [],
                secretThreads: [],
            },
            {
                id: 'npc-2',
                name: '太后',
                factionId: 'emperor',
                powerBase: 'court',
                title: '��̫��',
                publicPersona: '克制',
                publicStance: '中立',
                personality: '冷静',
                softSpot: '威望',
                triggerPoint: '探问',
                schemeHooks: '余音',
                trust: 48,
                isAlive: true,
                canExecute: false,
                militaryPower: 9,
                loyaltyToCourt: 49,
                alignmentBias: 'swing',
                externalStatus: 'loyal',
                availableSchemes: [],
                highRounds: [],
                secretThreads: [],
            },
        ]

        const markup = renderToStaticMarkup(<SchemeFeedback />)

        expect(markup).not.toContain('feedback-omen-echo')
        expect(markup).not.toContain('This should stay hidden.')
        expect(markup).toContain('Still no echo block.')
    })
})



