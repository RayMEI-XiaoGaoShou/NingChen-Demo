import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import {
    SchemeFeedback,
    canProceedFromSchemeFeedback,
    getSchemeFeedbackProceedLabel,
    getVisibleAvailableFollowUpId,
    orchestrateOmenEchoFeedback,
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

function createNpc(overrides: Record<string, unknown> = {}): any {
    return {
        id: 'npc-default',
        name: '某人',
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
        availableSchemes: ['probe', 'omen'],
        highRounds: [],
        secretThreads: [],
        ...overrides,
    }
}

function createState(): any {
    return {
        npcFeedbacks: [],
        currentSchemes: [],
        npcs: [],
        lastSettlement: null,
        factions: [],
        relationships: [],
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
        expect(schemeFeedbackSource).toContain('<h2 className="page-title">计谋回报</h2>')
        expect(schemeFeedbackSource).toContain('追问')
        expect(schemeFeedbackSource).toContain('你的回应')
        expect(schemeFeedbackSource).toContain('写下你的补充说明')
        expect(schemeFeedbackSource).toContain('跳过追问')
        expect(schemeFeedbackSource).toContain('揭示筹算结果')
        expect(schemeFeedbackSource).toContain('进入女帝回信')
        expect(schemeFeedbackSource).toContain('查看终局')
        expect(schemeFeedbackSource).not.toContain('璁¤皨鍥炴姤')
        expect(schemeFeedbackSource).not.toContain('杩介棶')
        expect(schemeFeedbackSource).not.toContain('浣犵殑鍥炲簲')
    })

    it('renders settlement results and court net reports on the feedback page', () => {
        expect(schemeFeedbackSource).toContain('<h3 className="section-title">计谋筹算结果</h3>')
        expect(schemeFeedbackSource).toContain('lastSettlement.schemeResults.map')
        expect(schemeFeedbackSource).toContain('lastSettlement.schemeOutcomeExplanations?.[index]')
        expect(schemeFeedbackSource).toContain('<h3 className="section-title">朝堂收网</h3>')
        expect(schemeFeedbackSource).toContain('lastSettlement.borrowedBladeReports.map')
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

    it('wires omen echo generation into the feedback orchestration loop', () => {
        expect(schemeFeedbackSource).toContain('await orchestrateOmenEchoFeedback({')
        expect(schemeFeedbackSource).toContain('updateNpcFeedbackOmenEcho: snapshot.updateNpcFeedbackOmenEcho')
        expect(schemeFeedbackSource).toContain("if (params.action.schemeType !== 'omen'")
    })
})

describe('orchestrateOmenEchoFeedback', () => {
    it('attaches an omen echo for omen feedback when AI generation succeeds', async () => {
        const targetNpc = createNpc({ id: 'target', name: '宇文帝', title: '天子', schemeHooks: '谶纬' })
        const speakerNpc = createNpc({ id: 'speaker', name: '太后', title: '皇太后' })
        const updateNpcFeedbackOmenEcho = vi.fn()
        const chatCompletionImpl = vi.fn().mockResolvedValue('太后闻言，便知此兆可借来压人。')
        const buildFallbackTextImpl = vi.fn()

        const result = await orchestrateOmenEchoFeedback({
            feedbackId: 'scheme-omen',
            action: {
                schemeType: 'omen',
                omenSpeechInput: {
                    omenText: '赤气犯紫微',
                    interpretationText: '外镇将有异志',
                },
            },
            targetNpc,
            parsed: createNorthParse(),
            npcs: [targetNpc, speakerNpc],
            relationships: [],
            round: 3,
            roundEvent: {
                eventName: '边报骤起',
                eventBriefing: '朝中正议外镇动向。',
            },
            updateNpcFeedbackOmenEcho,
            chatCompletionImpl,
            getAiModeImpl: () => 'deepseek',
            selectSpeakerImpl: () => ({
                speakerNpc,
                candidateCount: 1,
                selectionReason: '朝中发声最稳。',
                relationSummary: null,
                candidateScores: [],
            }),
            buildFallbackTextImpl,
        })

        expect(chatCompletionImpl).toHaveBeenCalledTimes(1)
        expect(buildFallbackTextImpl).not.toHaveBeenCalled()
        expect(updateNpcFeedbackOmenEcho).toHaveBeenCalledWith(
            'scheme-omen',
            expect.objectContaining({
                speakerNpcId: 'speaker',
                speakerNpcName: '太后',
                speakerTitle: '皇太后',
                text: '太后闻言，便知此兆可借来压人。',
                source: 'ai',
            }),
        )
        expect(result).toEqual(
            expect.objectContaining({
                speakerNpcId: 'speaker',
                text: '太后闻言，便知此兆可借来压人。',
                source: 'ai',
            }),
        )
    })

    it('does not attach omen echo data for non-omen feedback', async () => {
        const targetNpc = createNpc({ id: 'target', name: '宇文帝', title: '天子' })
        const updateNpcFeedbackOmenEcho = vi.fn()
        const chatCompletionImpl = vi.fn()

        const result = await orchestrateOmenEchoFeedback({
            feedbackId: 'scheme-probe',
            action: {
                schemeType: 'probe',
            },
            targetNpc,
            parsed: createNorthParse(),
            npcs: [targetNpc],
            relationships: [],
            round: 3,
            roundEvent: {
                eventName: '边报骤起',
                eventBriefing: '朝中正议外镇动向。',
            },
            updateNpcFeedbackOmenEcho,
            chatCompletionImpl,
        })

        expect(result).toBeNull()
        expect(chatCompletionImpl).not.toHaveBeenCalled()
        expect(updateNpcFeedbackOmenEcho).not.toHaveBeenCalled()
    })

    it('skips AI omen echo generation when the app is already in fallback mode', async () => {
        const targetNpc = createNpc({ id: 'target', name: '贺拔岳', title: '节度使', powerBase: 'external' })
        const speakerNpc = createNpc({ id: 'speaker', name: '太后', title: '皇太后' })
        const updateNpcFeedbackOmenEcho = vi.fn()
        const chatCompletionImpl = vi.fn()
        const buildFallbackTextImpl = vi.fn().mockReturnValue('太后断言先收军权，再待星象后效。')

        const result = await orchestrateOmenEchoFeedback({
            feedbackId: 'scheme-omen',
            action: {
                schemeType: 'omen',
                omenSpeechInput: {
                    omenText: '紫微掩星',
                    interpretationText: '外镇归权之心更露',
                },
            },
            targetNpc,
            parsed: createNorthParse(),
            npcs: [targetNpc, speakerNpc],
            relationships: [],
            round: 5,
            roundEvent: {
                eventName: '边军调动',
                eventBriefing: '朝中担心外镇借机扩权。',
            },
            updateNpcFeedbackOmenEcho,
            chatCompletionImpl,
            getAiModeImpl: () => 'fallback',
            selectSpeakerImpl: () => ({
                speakerNpc,
                candidateCount: 1,
                selectionReason: '朝中发声最稳。',
                relationSummary: null,
                candidateScores: [],
            }),
            buildFallbackTextImpl,
        })

        expect(chatCompletionImpl).not.toHaveBeenCalled()
        expect(buildFallbackTextImpl).toHaveBeenCalledTimes(1)
        expect(updateNpcFeedbackOmenEcho).toHaveBeenCalledWith(
            'scheme-omen',
            expect.objectContaining({
                speakerNpcId: 'speaker',
                text: '太后断言先收军权，再待星象后效。',
                source: 'fallback',
            }),
        )
        expect(result).toEqual(
            expect.objectContaining({
                text: '太后断言先收军权，再待星象后效。',
                source: 'fallback',
            }),
        )
    })

    it('falls back to the local omen echo builder when AI generation fails', async () => {
        const targetNpc = createNpc({ id: 'target', name: '贺拔岳', title: '节度使', powerBase: 'external' })
        const speakerNpc = createNpc({ id: 'speaker', name: '太后', title: '皇太后' })
        const updateNpcFeedbackOmenEcho = vi.fn()
        const chatCompletionImpl = vi.fn().mockRejectedValue(new Error('network down'))
        const buildFallbackTextImpl = vi.fn().mockReturnValue('太后断言此兆不可纵容，须即刻收束军权。')

        const result = await orchestrateOmenEchoFeedback({
            feedbackId: 'scheme-omen',
            action: {
                schemeType: 'omen',
                omenSpeechInput: {
                    omenText: '旌旗夜动',
                    interpretationText: '外镇借兵自重',
                },
            },
            targetNpc,
            parsed: createNorthParse(),
            npcs: [targetNpc, speakerNpc],
            relationships: [],
            round: 4,
            roundEvent: {
                eventName: '边军异动',
                eventBriefing: '朝廷疑外镇将借乱坐大。',
            },
            updateNpcFeedbackOmenEcho,
            chatCompletionImpl,
            getAiModeImpl: () => 'deepseek',
            selectSpeakerImpl: () => ({
                speakerNpc,
                candidateCount: 1,
                selectionReason: '朝中发声最稳。',
                relationSummary: null,
                candidateScores: [],
            }),
            buildFallbackTextImpl,
        })

        expect(buildFallbackTextImpl).toHaveBeenCalledTimes(1)
        expect(updateNpcFeedbackOmenEcho).toHaveBeenCalledWith(
            'scheme-omen',
            expect.objectContaining({
                speakerNpcId: 'speaker',
                text: '太后断言此兆不可纵容，须即刻收束军权。',
                source: 'fallback',
            }),
        )
        expect(result).toEqual(
            expect.objectContaining({
                text: '太后断言此兆不可纵容，须即刻收束军权。',
                source: 'fallback',
            }),
        )
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

describe('getSchemeFeedbackProceedLabel', () => {
    it('uses stage-specific labels for feedback, settlement reveal, and onward flow', () => {
        expect(
            getSchemeFeedbackProceedLabel({
                allDone: false,
                allParsed: true,
                settlementRevealed: false,
                terminalResult: false,
            }),
        ).toBe('等待计谋回报')
        expect(
            getSchemeFeedbackProceedLabel({
                allDone: true,
                allParsed: false,
                settlementRevealed: false,
                terminalResult: false,
            }),
        ).toBe('等待解析完成')
        expect(
            getSchemeFeedbackProceedLabel({
                allDone: true,
                allParsed: true,
                settlementRevealed: false,
                terminalResult: false,
            }),
        ).toBe('揭示筹算结果')
        expect(
            getSchemeFeedbackProceedLabel({
                allDone: true,
                allParsed: true,
                settlementRevealed: true,
                terminalResult: false,
            }),
        ).toBe('进入女帝回信')
        expect(
            getSchemeFeedbackProceedLabel({
                allDone: true,
                allParsed: true,
                settlementRevealed: true,
                terminalResult: true,
            }),
        ).toBe('查看终局')
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
        expect(markup).toContain('发送回应')
        expect(markup).toContain('feedback-follow-up')
        expect(markup).toContain('发送回应')
    })

    it('renders revealed settlement cards below NPC feedback before leaving the page', () => {
        state.schemeOnboardingSeen.first_follow_up_teaching = true
        state.currentSchemes = [
            {
                id: 'scheme-1',
                targetNpcId: 'npc-1',
                schemeType: 'advise',
                playerSpeech: 'offer advice',
                northParse: createNorthParse(),
            },
        ]
        state.npcs = [createNpc({ id: 'npc-1', name: '祖廷' })]
        state.npcFeedbacks = [
            {
                id: 'scheme-1',
                npcId: 'npc-1',
                npcName: '祖廷',
                schemeType: 'advise',
                schemeName: '献策',
                playerSpeech: 'offer advice',
                feedback: '祖廷已经听进去。',
                isLoading: false,
                source: 'local',
            },
        ]
        state.lastSettlement = {
            gameResult: 'NONE',
            processedSchemes: state.currentSchemes,
            schemeResults: [
                {
                    success: true,
                    feedbackText: '祖廷略作沉吟，显然已被你的献策拨动了算盘。',
                    trustChange: 8,
                    northDimensionChanges: { governance: -0.2 },
                },
            ],
            schemeOutcomeExplanations: [
                {
                    segments: [
                        { label: '国力影响', text: '北周治理穿透力被削弱。' },
                        { label: '朝堂政局', text: '祖廷更愿意听你的话。' },
                    ],
                },
            ],
            borrowedBladeReports: [
                {
                    actorNpcId: 'npc-1',
                    actorNpcName: '祖廷',
                    targetNpcId: 'npc-2',
                    targetNpcName: '宇文棣',
                    outcome: 'dismissed',
                    summary: '祖廷入奏帘前，宇文棣被迫退让。',
                },
            ],
        }

        const markup = renderToStaticMarkup(<SchemeFeedback />)

        expect(markup).toContain('计谋筹算结果')
        expect(markup).toContain('国力影响')
        expect(markup).toContain('朝堂政局')
        expect(markup).toContain('朝堂收网')
        expect(markup).toContain('进入女帝回信')
    })
})


