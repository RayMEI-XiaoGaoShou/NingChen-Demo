import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import {
    SchemeFeedback,
    canProceedFromSchemeFeedback,
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

describe('SchemeFeedback', () => {
    it('shows the basic feedback guide before the follow-up onboarding on first entry', () => {
        state.firstRoundGuideSeen = { scheme_feedback: false }

        const markup = renderToStaticMarkup(<SchemeFeedback />)

        expect(markup).toContain('看计谋回报，辨人心冷暖')
        expect(markup).not.toContain('追问机制')
    })

    it('shows the follow-up onboarding after the basic feedback guide has been read', () => {
        state.firstRoundGuideSeen = { scheme_feedback: true }

        const markup = renderToStaticMarkup(<SchemeFeedback />)

        expect(markup).toContain('追问机制')
        expect(markup).toContain('有时对方会反问你一句')
    })

    it('renders the follow-up panel by action id even when the arrays are out of order', () => {
        state.currentSchemes = [
            {
                id: 'scheme-2',
                targetNpcId: 'npc-2',
                schemeType: 'probe',
                playerSpeech: '先问后答',
                northParse: createNorthParse(),
            },
            {
                id: 'scheme-1',
                targetNpcId: 'npc-1',
                schemeType: 'probe',
                playerSpeech: '先探一探',
                northParse: createNorthParse(),
                followUp: {
                    questionText: '你这话到底想让我明白什么？',
                    status: 'available' as const,
                },
            },
        ]
        state.npcFeedbacks = [
            {
                id: 'scheme-1',
                npcId: 'npc-1',
                npcName: '某人甲',
                schemeType: 'probe',
                schemeName: '试探',
                playerSpeech: '先探一探',
                feedback: '他沉吟片刻，终究还是松了口风。',
                isLoading: false,
                source: '本地兜底',
            },
            {
                id: 'scheme-2',
                npcId: 'npc-2',
                npcName: '某人乙',
                schemeType: 'probe',
                schemeName: '试探',
                playerSpeech: '先问后答',
                feedback: '他并未立刻接话。',
                isLoading: false,
                source: '本地兜底',
            },
        ]
        state.npcs = [
            {
                id: 'npc-1',
                name: '某人甲',
                factionId: 'emperor',
                powerBase: 'court',
                title: '尚书',
                publicPersona: '谨慎',
                publicStance: '中立',
                personality: '稳重',
                softSpot: '名望',
                triggerPoint: '逼问',
                schemeHooks: '试探',
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
                name: '某人乙',
                factionId: 'emperor',
                powerBase: 'court',
                title: '侍郎',
                publicPersona: '沉默',
                publicStance: '中立',
                personality: '谨慎',
                softSpot: '体面',
                triggerPoint: '逼迫',
                schemeHooks: '探问',
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

        expect(markup).toContain('你这话到底想让我明白什么？')
        expect(markup).not.toContain('第二个问题不该挂到第一个卡片上。')
        expect(markup).toContain('发送回应')
        expect(markup).toContain('查看结算')
    })
})
