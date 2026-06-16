import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import {
    SchemeFeedback,
    canProceedFromSchemeFeedback,
    getSchemeFeedbackProceedLabel,
    getVisibleAvailableFollowUpId,
    orchestrateOmenEchoFeedback,
    shouldQueueRecoveryParse,
    shouldDelaySchemeNpcActionFallback,
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
        empressReplyRecord: null,
        addNpcFeedback: vi.fn(),
        updateNpcFeedback: vi.fn(),
        updateNpcFeedbackOmenEcho: vi.fn(),
        updateSchemeParse: vi.fn(),
        markSchemeParsePending: vi.fn(),
        prepareSchemeSettlementForFeedback: vi.fn(),
        setSchemeFollowUp: vi.fn(),
        answerSchemeFollowUp: vi.fn(),
        skipSchemeFollowUp: vi.fn(),
        setEmpressReplyRecord: vi.fn(),
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

    it('renders the compact response HUD and character-response stage', () => {
        expect(schemeFeedbackSource).toContain("import { useGameSfx } from '../../audio/gameSfx'")
        expect(schemeFeedbackSource).toContain('const { playSfx } = useGameSfx()')
        expect(schemeFeedbackSource).toContain("playSfx('north-inline-action')")
        expect(schemeFeedbackSource).not.toContain('<span className="page-eyebrow">计谋回报</span>')
        expect(schemeFeedbackSource).not.toContain('<h2 className="page-title">计谋回报</h2>')
        expect(schemeFeedbackSource).toContain('<HudStatusChip label="已阅"')
        expect(schemeFeedbackSource).toContain('feedback-character-stage')
        expect(schemeFeedbackSource).toContain('feedback-character-switch')
        expect(schemeFeedbackSource).toContain('feedback-letter-panel')
        expect(schemeFeedbackSource).toContain('追问')
        expect(schemeFeedbackSource).toContain('你的回应')
        expect(schemeFeedbackSource).toContain('写下你的补充说明')
        expect(schemeFeedbackSource).toContain('回应追问')
        expect(schemeFeedbackSource).toContain('跳过追问')
        expect(schemeFeedbackSource).toContain('揭示筹算结果')
        expect(schemeFeedbackSource).toContain('江南来信')
        expect(schemeFeedbackSource).toContain('查看终局')
        expect(schemeFeedbackSource).not.toContain('璁¤皨鍥炴姤')
        expect(schemeFeedbackSource).not.toContain('杩介棶')
        expect(schemeFeedbackSource).not.toContain('浣犵殑鍥炲簲')
    })

    it('renders settlement results as character-scoped result pages', () => {
        expect(schemeFeedbackSource).toContain('feedback-result-panel')
        expect(schemeFeedbackSource).toContain('筹算判词')
        expect(schemeFeedbackSource).toContain('账面变动')
        expect(schemeFeedbackSource).toContain('buildSchemeResultEffectTags')
        expect(schemeFeedbackSource).toContain('getSchemeNpcActionDisplay')
        expect(schemeFeedbackSource).toContain('lastSettlement?.schemeOutcomeExplanations?.[entry.index]')
        expect(schemeFeedbackSource).toContain('settlementBorrowedBladeReports.map')
        expect(schemeFeedbackSource).not.toContain('<h3 className="section-title">计谋筹算结果</h3>')
        expect(schemeFeedbackSource).not.toContain('lastSettlement.schemeResults.map')
    })

    it('waits for AI initialization before deciding whether to enhance npc actions', () => {
        expect(schemeFeedbackSource).toContain('initAiService().then')
        expect(schemeFeedbackSource).not.toContain("if (getAiMode() === 'fallback') return")
    })

    it('gives npc action AI a long background window after delayed fallback reveal', () => {
        expect(schemeFeedbackSource).toContain('const NPC_ACTION_FALLBACK_GRACE_MS = 15000')
        expect(schemeFeedbackSource).toContain('itemTimeoutMs: NPC_ACTION_BACKGROUND_ITEM_TIMEOUT_MS')
        expect(schemeFeedbackSource).toContain('batchTimeoutMs: NPC_ACTION_BACKGROUND_BATCH_TIMEOUT_MS')
        expect(schemeFeedbackSource).not.toContain('const NPC_ACTION_FALLBACK_GRACE_MS = 2500')
    })

    it('prepares settlement and npc actions before the settlement result is revealed', () => {
        expect(schemeFeedbackSource).toContain('prepareSchemeSettlementForFeedback')
        expect(schemeFeedbackSource).toContain('const [settlementVisible, setSettlementVisible]')
        expect(schemeFeedbackSource).toContain('settlementRevealed = Boolean(lastSettlement && settlementVisible)')
        expect(schemeFeedbackSource).toContain('prepareSchemeSettlementForFeedback()')
        expect(schemeFeedbackSource).toContain('setSettlementVisible(true)')
        expect(schemeFeedbackSource).toContain('const canRevealSettlement = canProceed && allFeedbacksViewed')
        expect(schemeFeedbackSource).toContain('Boolean(lastSettlement) && canRevealSettlement')
    })

    it('preheats the independent empress reply from the feedback page without reading scheme results', () => {
        expect(schemeFeedbackSource).toContain('generateEmpressReplyRecordForPolicy')
        expect(schemeFeedbackSource).toContain('setEmpressReplyRecord(replyRecord)')
        expect(schemeFeedbackSource).toContain("playerDangerStage: roundStartSnapshot?.playerDangerStage ?? 'safe'")
        expect(schemeFeedbackSource).not.toContain('schemeResults: lastSettlement.schemeResults')
        expect(schemeFeedbackSource).not.toContain('playerDangerStage: lastSettlement.playerDangerStage')
    })

    it('keeps npc action enhancement alive when fallback reveal state changes', () => {
        expect(schemeFeedbackSource).toContain('const effectStillMountedRef = { current: true }')
        expect(schemeFeedbackSource).toContain('if (!patchedSettlement) return')
        expect(schemeFeedbackSource).not.toContain('if (cancelled || !patchedSettlement) return')
        expect(schemeFeedbackSource).not.toContain('revealedNpcActionFallbackIds, roundHistory')
    })

    it('uses large character portraits for expanded responses and avatar-only switch buttons', () => {
        expect(schemeFeedbackSource).toContain('className="scheme-feedback-scene-portrait animate-fade-in"')
        expect(schemeFeedbackSource).toContain('variant={getFeedbackPortraitVariant(activeFeedbackEntry.targetNpc)}')
        expect(schemeFeedbackSource).toContain('<SchemeFeedbackAvatar name={entry.npcName} />')
        expect(schemeFeedbackSource).not.toContain('className="feedback-avatar"')
    })

    it('reuses pre-generated replies and normalizes the single follow-up hook on the feedback page', () => {
        expect(schemeFeedbackSource).toContain('forceQuestionCandidateReplyText(')
        expect(schemeFeedbackSource).toContain('forceStatementReplyText(')
        expect(schemeFeedbackSource).toContain('selectRequiredSchemeFollowUpCandidateId(')
        expect(schemeFeedbackSource).toContain('if (existingFeedback && !existingFeedback.isLoading)')
        expect(schemeFeedbackSource).not.toContain('hasDeferredLoadingFeedback')
    })

    it('passes newly revealed secret threads into npc reply prompts and follow-up finals', () => {
        expect(schemeFeedbackSource).toContain('getRevealedSecretThreadForScheme({')
        expect(schemeFeedbackSource).toContain('revealedSecretThread,')
        expect(schemeFeedbackSource).toContain('buildNpcFollowUpFinalPrompt({')
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
        ).toBe('江南来信')
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
            {
                id: 'scheme-2',
                targetNpcId: 'npc-2',
                schemeType: 'probe',
                playerSpeech: 'second first',
                northParse: createNorthParse(),
            },
        ]
        state.npcFeedbacks = [
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
        expect(markup).toContain('回应追问')
        expect(markup).toContain('feedback-follow-up')
        expect(markup).toContain('The first NPC responds.')
        expect(markup).not.toContain('The second NPC responds.')
        expect(markup).toContain('feedback-character-switch')
    })

    it('keeps prepared settlement cards hidden until the player reveals the settlement result', () => {
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
        state.factions = [
            {
                id: 'empress',
                name: '后党',
                description: '',
                militaryPower: 30,
                courtInfluence: 40,
                internalStability: 50,
            },
        ]
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
                    feedbackText: 'FEEDBACK_TEMPLATE_SENTINEL should be hidden.',
                    trustChange: 8,
                    northDimensionChanges: { governance: -0.2 },
                    factionEffects: {
                        empress: {
                            courtInfluence: -2,
                            internalStability: -1,
                            militaryPower: 0,
                        },
                    },
                    personEffects: {
                        trustDelta: 8,
                        relatedTrustDelta: 0,
                        loyaltyDelta: 0,
                        relatedLoyaltyDelta: 0,
                        militaryPowerDelta: 0,
                        relatedMilitaryPowerDelta: 0,
                    },
                    npcAction: { text: 'NPC_ACTION_SENTINEL secures the ledgers.', source: 'ai' },
                },
            ],
            schemeOutcomeExplanations: [
                {
                    segments: [
                        { label: '国力影响', text: '北周统治被削弱。' },
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

        expect(markup).not.toContain('计谋筹算结果')
        expect(markup).not.toContain('国力影响')
        expect(markup).not.toContain('朝堂政局')
        expect(markup).not.toContain('FEEDBACK_TEMPLATE_SENTINEL')
        expect(markup).not.toContain('祖廷举措')
        expect(markup).not.toContain('NPC_ACTION_SENTINEL secures the ledgers.')
        expect(markup).not.toContain('后党 朝堂影响力 -2')
        expect(markup).not.toContain('后党 内部稳定度 -1')
        expect(markup).not.toContain('朝堂收网')
        expect(markup).toContain('揭示筹算结果')
    })

    it('delays fallback npc actions only until that action has passed its grace window', () => {
        const settlement = {
            processedSchemes: [
                {
                    id: 'scheme-1',
                    targetNpcId: 'npc-1',
                    schemeType: 'advise',
                    playerSpeech: 'offer advice',
                },
                {
                    id: 'scheme-2',
                    targetNpcId: 'npc-2',
                    schemeType: 'advise',
                    playerSpeech: 'offer other advice',
                },
            ],
            schemeResults: [
                {
                    npcAction: { text: 'fallback action', source: 'fallback' },
                },
                {
                    npcAction: { text: 'ai action', source: 'ai' },
                },
            ],
        } as any

        expect(shouldDelaySchemeNpcActionFallback({
            settlement,
            resultIndex: 0,
            revealedActionIds: new Set(),
        })).toBe(true)
        expect(shouldDelaySchemeNpcActionFallback({
            settlement,
            resultIndex: 0,
            revealedActionIds: new Set(['scheme-1']),
        })).toBe(false)

        expect(shouldDelaySchemeNpcActionFallback({
            settlement,
            resultIndex: 1,
            revealedActionIds: new Set(),
        })).toBe(false)
    })
})


