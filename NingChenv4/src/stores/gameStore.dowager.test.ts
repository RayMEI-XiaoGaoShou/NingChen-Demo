import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { generateDoubaoImage } from '../ai/doubaoImageGeneration'
import { INITIAL_FACTIONS } from '../data/factions'
import { INITIAL_NPCS } from '../data/npcs'
import { INITIAL_RELATIONSHIP_EDGES } from '../data/npcRelationships'
import { NORTH_INITIAL, SOUTH_INITIAL } from '../data/nationStats'
import { calculateCompositePower } from '../game/types'
import { useGameStore } from './gameStore'

vi.mock('../ai/doubaoImageGeneration', () => ({
    generateDoubaoImage: vi.fn(),
}))

const generateDoubaoImageMock = vi.mocked(generateDoubaoImage)
const testRuntimeEnv = ((globalThis as any).process?.env ?? {}) as Record<string, string | undefined>
const originalDoubaoProxyFlag = testRuntimeEnv.VITE_DOUBAO_API_KEY

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
        playerSuspicionHeat: 92,
        dowagerFavor: 70,
        lastDowagerFavorDecayRound: null,
        pendingDowagerOffering: null,
        dowagerOfferingRecords: [],
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
        prologueStep: 'INGAME',
        helpOverlayOpen: false,
        helpOverlaySource: null,
        firstRoundGuideSeen: initialFirstRoundGuideSeen,
        schemeOnboardingSeen: initialSchemeOnboardingSeen,
        omenGuideSeen: {
            first_omen_modal: false,
        },
        fengDaozhiAssistsRemaining: 3,
    } as Partial<ReturnType<typeof useGameStore.getState>>)
}

function submitExcellentPainting() {
    useGameStore.getState().submitDowagerOffering({
        medium: 'painting',
        selections: {
            scene: { presetOptionIds: ['painting.scene.forestFlowers', 'painting.scene.rainCourtyard'] },
            motif: { presetOptionIds: ['painting.motif.redPetals', 'painting.motif.eastFlowingWater', 'painting.motif.tears', 'painting.motif.coldRain'] },
            intent: { presetOptionIds: ['painting.intent.beautyCannotStay', 'painting.intent.waterNeverReturns'] },
        },
        styleReferenceId: 'ink',
    })
}

function submitExcellentMusic() {
    useGameStore.getState().submitDowagerOffering({
        medium: 'music',
        selections: {
            instrument: { presetOptionIds: ['music.instrument.guqin', 'music.instrument.xiao', 'music.instrument.pipa', 'music.instrument.xun'] },
            structure: { presetOptionIds: ['music.structure.brokenContinuity', 'music.structure.blankEnding'] },
            timbre: { presetOptionIds: ['music.timbre.cold', 'music.timbre.faint'] },
            mood: { presetOptionIds: ['music.mood.endlessRegret', 'music.mood.fadingSplendor'] },
        },
    })
}

describe('gameStore dowager offering milestone flow', () => {
    beforeEach(() => {
        generateDoubaoImageMock.mockReset()
        delete testRuntimeEnv.VITE_DOUBAO_API_KEY
        resetStore()
    })

    afterEach(() => {
        if (originalDoubaoProxyFlag === undefined) {
            delete testRuntimeEnv.VITE_DOUBAO_API_KEY
        } else {
            testRuntimeEnv.VITE_DOUBAO_API_KEY = originalDoubaoProxyFlag
        }
    })

    it('routes first-round court observe into dowager creation before the empress letter', () => {
        useGameStore.setState({
            currentRound: 1,
            currentPhase: 'COURT_OBSERVE',
            schemeCount: 3,
            maxSchemes: 3,
        })

        useGameStore.getState().nextPhase()

        expect(useGameStore.getState().currentPhase).toBe('DOWAGER_CREATION')
    })

    it('locks a creation submission and then continues to the empress letter', () => {
        useGameStore.setState({
            currentRound: 1,
            currentPhase: 'DOWAGER_CREATION',
        })

        submitExcellentPainting()

        const state = useGameStore.getState()
        expect(state.currentPhase).toBe('EMPRESS_LETTER')
        expect(state.pendingDowagerOffering?.poemId).toBe('xiangjianhuan_linhua')
        expect(state.pendingDowagerOffering?.validationRound).toBe(2)
        expect(state.pendingDowagerOffering?.mediaTask.status).toBe('pending')
        expect(state.pendingDowagerOffering?.mediaTask.provider).toBe('doubao_seedream')
        expect(state.pendingDowagerOffering?.mediaTask.taskType).toBe('dowager_painting')
        expect(state.pendingDowagerOffering?.mediaTask.promptVersion).toBe('dowager_painting_v1')
        expect(state.pendingDowagerOffering?.mediaTask.styleReferenceId).toBe('ink')
        expect(state.pendingDowagerOffering?.mediaTask.referenceImageSrc).toBe('/images/dowager-style-references/style-ink-wash.png')
        expect(state.pendingDowagerOffering?.mediaTask.request).toMatchObject({
            model: 'doubao-seedream-5-0-260128',
            response_format: 'url',
            size: '2K',
            watermark: false,
        })
        expect(state.pendingDowagerOffering?.mediaTask.request?.image).toEqual([
            '/images/dowager-style-references/style-ink-wash.png',
        ])
        expect(state.pendingDowagerOffering?.mediaTask.request?.prompt).toBe(state.pendingDowagerOffering?.mediaTask.prompt)
        expect(state.pendingDowagerOffering?.mediaTask.prompt).toContain('诗题：相见欢·林花谢了春红')
        expect(state.pendingDowagerOffering?.mediaTask.prompt).toContain('上述定景、景物、立意中的每一项都必须在画面中有明确可见表达，不得省略')
    })

    it('submits painting media to Doubao in local proxy mode and stores the generated image', async () => {
        testRuntimeEnv.VITE_DOUBAO_API_KEY = 'local-dev-proxy'
        generateDoubaoImageMock.mockResolvedValueOnce({
            imageSrc: 'https://example.test/generated-dowager.png',
            raw: { data: [{ url: 'https://example.test/generated-dowager.png' }] },
        })
        useGameStore.setState({
            currentRound: 1,
            currentPhase: 'DOWAGER_CREATION',
        })

        submitExcellentPainting()
        await new Promise(resolve => setTimeout(resolve, 0))

        const state = useGameStore.getState()
        expect(generateDoubaoImageMock).toHaveBeenCalledTimes(1)
        expect(generateDoubaoImageMock.mock.calls[0]?.[0]).toBe(state.pendingDowagerOffering?.mediaTask.request)
        expect(state.pendingDowagerOffering?.mediaTask.status).toBe('succeeded')
        expect(state.pendingDowagerOffering?.mediaTask.resultImageSrc).toBe('https://example.test/generated-dowager.png')
    })

    it('locks a music submission with a MiniMax instrumental request draft', () => {
        useGameStore.setState({
            currentRound: 1,
            currentPhase: 'DOWAGER_CREATION',
        })

        submitExcellentMusic()

        const state = useGameStore.getState()
        expect(state.currentPhase).toBe('EMPRESS_LETTER')
        expect(state.pendingDowagerOffering?.medium).toBe('music')
        expect(state.pendingDowagerOffering?.styleReferenceId).toBeNull()
        expect(state.pendingDowagerOffering?.mediaTask.status).toBe('pending')
        expect(state.pendingDowagerOffering?.mediaTask.provider).toBe('minimax_music')
        expect(state.pendingDowagerOffering?.mediaTask.taskType).toBe('dowager_music')
        expect(state.pendingDowagerOffering?.mediaTask.promptVersion).toBe('dowager_music_v1')
        expect(state.pendingDowagerOffering?.mediaTask.prompt).toContain('Instrumental ancient Chinese chamber music')
        expect(state.pendingDowagerOffering?.mediaTask.prompt).toContain('Guqin: primary sparse low-register plucked motif')
        expect(state.pendingDowagerOffering?.mediaTask.prompt).toContain('Every selected or freely entered player concept below must be clearly audible in the music.')
        expect(state.pendingDowagerOffering?.mediaTask.request).toMatchObject({
            model: 'music-2.6',
            is_instrumental: true,
            lyrics_optimizer: false,
            output_format: 'url',
            stream: false,
            audio_setting: {
                sample_rate: 44100,
                bitrate: 256000,
                format: 'mp3',
            },
        })
        expect(state.pendingDowagerOffering?.mediaTask.request?.prompt).toBe(state.pendingDowagerOffering?.mediaTask.prompt)
        expect(state.pendingDowagerOffering?.mediaTask.request).not.toHaveProperty('lyrics')
    })

    it('decays favor once at the beginning of the second round and freezes after the sample window', () => {
        useGameStore.setState({
            currentRound: 1,
            currentPhase: 'SETTLEMENT',
            dowagerFavor: 70,
        })

        useGameStore.getState().nextPhase()
        expect(useGameStore.getState().currentRound).toBe(2)
        expect(useGameStore.getState().dowagerFavor).toBe(60)
        expect(useGameStore.getState().lastDowagerFavorDecayRound).toBe(2)

        useGameStore.getState().nextPhase()
        expect(useGameStore.getState().currentPhase).toBe('COURT_OBSERVE')

        useGameStore.setState({ currentPhase: 'SETTLEMENT' })
        useGameStore.getState().nextPhase()
        expect(useGameStore.getState().currentRound).toBe(3)
        expect(useGameStore.getState().dowagerFavor).toBe(60)
        expect(useGameStore.getState().lastDowagerFavorDecayRound).toBe(2)
    })

    it('routes second-round empress reply into dowager review when a pending offering exists', () => {
        useGameStore.setState({
            currentRound: 1,
            currentPhase: 'DOWAGER_CREATION',
        })
        submitExcellentPainting()
        useGameStore.setState({
            currentRound: 2,
            currentPhase: 'EMPRESS_REPLY',
            dowagerFavor: 60,
        })

        useGameStore.getState().nextPhase()

        expect(useGameStore.getState().currentPhase).toBe('DOWAGER_REVIEW')
    })

    it('applies review scoring exactly once and leaves legacy suspicion unable to kill the player', () => {
        useGameStore.setState({
            currentRound: 1,
            currentPhase: 'DOWAGER_CREATION',
        })
        submitExcellentPainting()
        useGameStore.setState({
            currentRound: 2,
            currentPhase: 'DOWAGER_REVIEW',
            dowagerFavor: 60,
            playerSuspicionHeat: 100,
            playerDangerStage: 'under_review',
        })

        useGameStore.getState().resolveDowagerReview()
        useGameStore.getState().resolveDowagerReview()

        const state = useGameStore.getState()
        expect(state.dowagerFavor).toBe(90)
        expect(state.dowagerOfferingRecords).toHaveLength(1)
        expect(state.dowagerOfferingRecords[0]?.finalTier).toBe('excellent')
        expect(state.dowagerOfferingRecords[0]?.favorDelta).toBe(30)
        expect(state.isGameOver).toBe(false)
        expect(state.gameResult).toBe('NONE')
    })

    it('uses dowager favor as the death source after the full review page has been shown', () => {
        useGameStore.setState({
            currentRound: 1,
            currentPhase: 'DOWAGER_CREATION',
        })
        useGameStore.getState().submitDowagerOffering({
            medium: 'painting',
            selections: {
                scene: { presetOptionIds: ['painting.scene.springBanquet', 'painting.scene.palaceCeremony'] },
                motif: { presetOptionIds: ['painting.motif.auspiciousCloud', 'painting.motif.goldCup'] },
                intent: { presetOptionIds: ['painting.intent.richFlowers', 'painting.intent.peacePraise'] },
            },
        })
        useGameStore.setState({
            currentRound: 2,
            currentPhase: 'DOWAGER_REVIEW',
            dowagerFavor: 0,
        })

        useGameStore.getState().resolveDowagerReview()
        expect(useGameStore.getState().currentPhase).toBe('DOWAGER_REVIEW')

        useGameStore.getState().nextPhase()

        const state = useGameStore.getState()
        expect(state.currentPhase).toBe('ENDING')
        expect(state.gameResult).toBe('DEFEAT_DEATH')
        expect(state.endingReport?.deathSource).toBe('dowager_favor')
        expect(state.endingReport?.causeSummary.join('')).toContain('太后')
    })
})
