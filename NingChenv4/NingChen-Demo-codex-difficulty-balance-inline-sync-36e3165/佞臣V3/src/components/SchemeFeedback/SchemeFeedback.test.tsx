import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import {
    SchemeFeedback,
    canProceedFromSchemeFeedback,
    getVisibleAvailableFollowUpId,
    shouldQueueRecoveryParse,
    shouldWaitForPrefetchedFeedback,
} from './SchemeFeedback'
import {
    __resetSchemeReplyPrefetchRegistryForTests,
    markSchemeReplyPrefetchStarted,
} from '../../game/schemeReplyPrefetch'
import schemeFeedbackSource from './SchemeFeedback.tsx?raw'

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
        updateSchemeParse: vi.fn(),
        markSchemeParsePending: vi.fn(),
        setSchemeFollowUp: vi.fn(),
        answerSchemeFollowUp: vi.fn(),
        skipSchemeFollowUp: vi.fn(),
        nextPhase: vi.fn(),
        currentRound: 1,
        firstRoundGuideSeen: { scheme_feedback: true },
        schemeOnboardingSeen: {
            scheme_master_guide: true,
            first_omen_teaching: true,
            first_external_line_teaching: true,
            first_follow_up_teaching: false,
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
    __resetSchemeReplyPrefetchRegistryForTests()
})

describe('SchemeFeedback orchestration', () => {
    it('batch-finalizes existing feedback cards and only leaves one question candidate', () => {
        expect(schemeFeedbackSource).not.toContain('npcFeedbacks.length > 0 || currentSchemes.length === 0')
        expect(schemeFeedbackSource).toContain("followUpMode: candidateId && item.action.id === candidateId ? 'question_candidate' : 'statement_only'")
    })

    it('uses a single large page title without an eyebrow in the current layout', () => {
        expect(schemeFeedbackSource).not.toContain('<span className="page-eyebrow">计谋回报</span>')
    })
    it('uses full-body ghost portraits instead of small avatars in feedback cards', () => {
        expect(schemeFeedbackSource).toContain('className="feedback-ghost-portrait"')
        expect(schemeFeedbackSource).not.toContain('className="feedback-avatar"')
    })

    it('reuses pre-generated replies and normalizes the single follow-up hook on the feedback page', () => {
        expect(schemeFeedbackSource).toContain('forceQuestionCandidateReplyText(')
        expect(schemeFeedbackSource).toContain('forceStatementReplyText(')
        expect(schemeFeedbackSource).toContain('selectRequiredSchemeFollowUpCandidateId(')
        expect(schemeFeedbackSource).toContain('if (existingFeedback && !existingFeedback.isLoading)')
        expect(schemeFeedbackSource).not.toContain('hasDeferredLoadingFeedback')
    })

    it('waits for prefetch work before orchestrating recovery on the feedback page', () => {
        expect(schemeFeedbackSource).toContain('shouldWaitForPrefetchedFeedback({')
    })

    it('keeps feedback orchestration from being cancelled by its own state writes', () => {
        expect(schemeFeedbackSource).toContain('const orchestrationStateRef = useRef')
        expect(schemeFeedbackSource).toContain('runFeedbackOrchestration')
        expect(schemeFeedbackSource).toContain('}, [currentRound, schemeBatchKey])')
        expect(schemeFeedbackSource).not.toContain('        currentSchemes,\n        feedbackBatchSettledKey,')
        expect(schemeFeedbackSource).not.toContain('        npcFeedbacks,\n        npcs,')
        expect(schemeFeedbackSource).not.toContain('        orchestratingFeedbacks,')
    })
})

describe('shouldQueueRecoveryParse', () => {
    it('does not queue a recovery parse while feedback cards are still being rebuilt', () => {
        expect(
            shouldQueueRecoveryParse({
                actionId: 'scheme-1',
                hasNorthParse: false,
                pendingStructuredSchemeIds: [],
                npcFeedbackCount: 0,
            }),
        ).toBe(false)
    })

    it('queues a recovery parse after feedback cards exist and the action is still missing structure', () => {
        expect(
            shouldQueueRecoveryParse({
                actionId: 'scheme-1',
                hasNorthParse: false,
                pendingStructuredSchemeIds: [],
                npcFeedbackCount: 2,
            }),
        ).toBe(true)
    })

    it('does not queue when the action is already pending or already parsed', () => {
        expect(
            shouldQueueRecoveryParse({
                actionId: 'scheme-1',
                hasNorthParse: false,
                pendingStructuredSchemeIds: ['scheme-1'],
                npcFeedbackCount: 2,
            }),
        ).toBe(false)

        expect(
            shouldQueueRecoveryParse({
                actionId: 'scheme-1',
                hasNorthParse: true,
                pendingStructuredSchemeIds: [],
                npcFeedbackCount: 2,
            }),
        ).toBe(false)
    })
})

describe('shouldWaitForPrefetchedFeedback', () => {
    it('waits when a structured parse is already pending for the same action', () => {
        expect(
            shouldWaitForPrefetchedFeedback({
                currentSchemes: [
                    { id: 'scheme-1' },
                ],
                npcFeedbacks: [
                    { id: 'scheme-1', isLoading: true },
                ],
                pendingStructuredSchemeIds: ['scheme-1'],
            }),
        ).toBe(true)
    })

    it('waits when the reply prefetch is still in flight for a loading card', () => {
        markSchemeReplyPrefetchStarted('scheme-2')

        expect(
            shouldWaitForPrefetchedFeedback({
                currentSchemes: [
                    { id: 'scheme-2', northParse: createNorthParse() },
                ],
                npcFeedbacks: [
                    { id: 'scheme-2', isLoading: true },
                ],
                pendingStructuredSchemeIds: [],
            }),
        ).toBe(true)
    })

    it('allows recovery when no prefetch work is still in flight', () => {
        expect(
            shouldWaitForPrefetchedFeedback({
                currentSchemes: [
                    { id: 'scheme-3', northParse: createNorthParse() },
                ],
                npcFeedbacks: [
                    { id: 'scheme-3', isLoading: true },
                ],
                pendingStructuredSchemeIds: [],
            }),
        ).toBe(false)
    })
})

describe('canProceedFromSchemeFeedback', () => {
    it('returns false when allDone is false', () => {
        expect(
            canProceedFromSchemeFeedback({
                allDone: false,
                allParsed: true,
                followUpBlocked: false,
            }),
        ).toBe(false)
    })

    it('returns false when allParsed is false', () => {
        expect(
            canProceedFromSchemeFeedback({
                allDone: true,
                allParsed: false,
                followUpBlocked: false,
            }),
        ).toBe(false)
    })

    it('returns false when followUpBlocked is true', () => {
        expect(
            canProceedFromSchemeFeedback({
                allDone: true,
                allParsed: true,
                followUpBlocked: true,
            }),
        ).toBe(false)
    })

    it('returns true only when all conditions are satisfied', () => {
        expect(
            canProceedFromSchemeFeedback({
                allDone: true,
                allParsed: true,
                followUpBlocked: false,
            }),
        ).toBe(true)
    })
})

describe('getVisibleAvailableFollowUpId', () => {
    it('only exposes one available follow-up even if stale state contains several', () => {
        expect(
            getVisibleAvailableFollowUpId([
                { id: 'scheme-1', followUp: { status: 'available', questionText: 'First?' } },
                { id: 'scheme-2', followUp: { status: 'available', questionText: 'Second?' } },
                { id: 'scheme-3', followUp: { status: 'available', questionText: 'Third?' } },
            ]),
        ).toBe('scheme-1')
    })

    it('hides stale available follow-ups after one follow-up has already been resolved', () => {
        expect(
            getVisibleAvailableFollowUpId([
                { id: 'scheme-1', followUp: { status: 'answered', questionText: 'First?' } },
                { id: 'scheme-2', followUp: { status: 'available', questionText: 'Second?' } },
                { id: 'scheme-3', followUp: { status: 'available', questionText: 'Third?' } },
            ]),
        ).toBeNull()
    })
})

describe('SchemeFeedback', () => {
    it('shows the basic feedback guide before the follow-up onboarding on first entry', () => {
        state.firstRoundGuideSeen = { scheme_feedback: false }

        const markup = renderToStaticMarkup(<SchemeFeedback />)

        expect(markup).toContain('first-round-guide-modal')
        expect(markup).not.toContain('feedback-follow-up')
    })

    it('shows the follow-up onboarding after the basic feedback guide has been read', () => {
        state.firstRoundGuideSeen = { scheme_feedback: true }

        const markup = renderToStaticMarkup(<SchemeFeedback />)

        expect(markup).toContain('追问机制')
        expect(markup).toContain('first-round-guide-modal')
        expect(markup).toContain('first-round-guide-actions')
    })

    it('renders the follow-up panel by action id even when the arrays are out of order', () => {
        state.currentSchemes = [
            {
                id: 'scheme-2',
                targetNpcId: 'npc-2',
                schemeType: 'probe',
                playerSpeech: 'second first',
                northParse: createNorthParse(),
            },
            {
                id: 'scheme-1',
                targetNpcId: 'npc-1',
                schemeType: 'probe',
                playerSpeech: 'first probe',
                northParse: createNorthParse(),
                followUp: {
                    questionText: 'What do you mean by that?',
                    status: 'available' as const,
                },
            },
        ]
        state.npcFeedbacks = [
            {
                id: 'scheme-1',
                npcId: 'npc-1',
                npcName: 'NPC One',
                schemeType: 'probe',
                schemeName: 'Probe',
                playerSpeech: 'first probe',
                feedback: 'The first NPC responds.',
                isLoading: false,
                source: 'local',
            },
            {
                id: 'scheme-2',
                npcId: 'npc-2',
                npcName: 'NPC Two',
                schemeType: 'probe',
                schemeName: 'Probe',
                playerSpeech: 'second first',
                feedback: 'The second NPC responds.',
                isLoading: false,
                source: 'local',
            },
        ]
        state.npcs = [
            {
                id: 'npc-1',
                name: 'NPC One',
                factionId: 'emperor',
                powerBase: 'court',
                title: 'Minister',
                publicPersona: 'calm',
                publicStance: 'neutral',
                personality: 'steady',
                softSpot: 'reputation',
                triggerPoint: 'pressure',
                schemeHooks: 'probe',
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
                name: 'NPC Two',
                factionId: 'emperor',
                powerBase: 'court',
                title: 'Official',
                publicPersona: 'quiet',
                publicStance: 'neutral',
                personality: 'careful',
                softSpot: 'face',
                triggerPoint: 'inquiry',
                schemeHooks: 'probe',
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

        expect(markup).toContain('What do you mean by that?')
        expect(markup).toContain('Send Reply')
        expect(markup).toContain('feedback-follow-up')
        expect(markup).toContain('Send Reply')
    })
})


