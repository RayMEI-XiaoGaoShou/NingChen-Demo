import { getPolicyQuestionForRound } from '../data/policyQuestions'
import { settleRound, type PolicySettlementReport } from '../game/roundSettlement'
import type {
    CampaignOutcomeState,
    CampaignState,
    PlayerDangerStage,
    PolicyReasonParseResult,
} from '../game/types'
import { useGameStore } from '../stores/gameStore'

type EmpressPreviewTarget = 'letter' | 'reply'

export interface EmpressPreviewConfig {
    target: EmpressPreviewTarget
    round: number
    danger: PlayerDangerStage
    optionIndex: number
    authoredReason: boolean
}

const DEFAULT_ROUND = 7
const MIN_ROUND = 1
const MAX_ROUND = 20
const PREVIEW_REASON = '臣以为此策不可只取其名，须先明钱粮、官署与州县分责，使诏令能落到实处。'
const PREVIEW_POLICY_PARSE: PolicyReasonParseResult = {
    focusAlignment: 0.78,
    executionClarity: 0.74,
    costAwareness: 0.66,
    legitimacyAlignment: 0.7,
    policyStance: 'balanced',
    evidence: ['开发预览附言'],
}

function clampRound(value: number): number {
    if (!Number.isFinite(value)) return DEFAULT_ROUND
    return Math.min(MAX_ROUND, Math.max(MIN_ROUND, Math.floor(value)))
}

function normalizeTarget(value: string | null): EmpressPreviewTarget | null {
    const normalized = value?.trim().toLowerCase()
    if (normalized === 'empress-letter' || normalized === 'letter') return 'letter'
    if (normalized === 'empress-reply' || normalized === 'reply') return 'reply'
    return null
}

function normalizeDanger(value: string | null): PlayerDangerStage {
    if (value === 'under_watch' || value === 'under_review') return value
    return 'safe'
}

function normalizeOptionIndex(value: string | null): number {
    const normalized = value?.trim().toUpperCase()
    if (!normalized) return 0

    const labelIndex = ['A', 'B', 'C', 'D'].indexOf(normalized)
    if (labelIndex >= 0) return labelIndex

    const numeric = Number(normalized)
    if (!Number.isFinite(numeric)) return 0
    if (numeric >= 1 && numeric <= 4) return numeric - 1
    if (numeric >= 0 && numeric <= 3) return numeric
    return 0
}

function normalizeCampaignState(value: string | null): CampaignOutcomeState {
    if (value === 'gained' || value === 'stalemate' || value === 'failed') return value
    return 'idle'
}

function buildCampaignState(state: CampaignOutcomeState, round: number): CampaignState {
    return {
        state,
        resolvedState: state === 'idle' ? null : state,
        sourceRound: state === 'idle' ? null : Math.max(1, round - 1),
        summary: state === 'idle' ? '' : `开发预览：${state}`,
        ongoingNorthImpact: {},
        ongoingSouthImpact: {},
        remainingRounds: 0,
    }
}

function shouldUseAuthoredReason(value: string | null): boolean {
    const normalized = value?.trim().toLowerCase()
    return normalized !== 'none' && normalized !== 'empty' && normalized !== '0'
}

export function parseEmpressPreviewSearch(search: string): EmpressPreviewConfig | null {
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
    const target = normalizeTarget(params.get('uiux') ?? params.get('preview') ?? params.get('page'))
    if (!target) return null

    return {
        target,
        round: clampRound(Number(params.get('round') ?? DEFAULT_ROUND)),
        danger: normalizeDanger(params.get('danger')),
        optionIndex: normalizeOptionIndex(params.get('option')),
        authoredReason: shouldUseAuthoredReason(params.get('reason')),
    }
}

export function isEmpressPreviewSearch(search: string): boolean {
    return parseEmpressPreviewSearch(search) !== null
}

export function shouldSkipAutosaveForEmpressPreview(search: string, isDev: boolean): boolean {
    return isDev && isEmpressPreviewSearch(search)
}

function buildPreviewReplyText(policyReport: PolicySettlementReport, danger: PlayerDangerStage): string {
    const safetyLine = danger === 'under_review'
        ? '此信不可多留，朕不把话写满，只要你先护住自身。'
        : danger === 'under_watch'
            ? '北来书信隔了数重人手，你往后行话须再收三分。'
            : '你在北边尚可周旋，朕便多留一分期许。'

    return `展信时，建康夜雨未歇。朕已按“${policyReport.optionContent}”拟旨，先令有司分责施行，不让它只停在纸面。${safetyLine}余下轻重，朕会替你慢慢收束。`
}

export function applyEmpressPreviewFromSearch(search: string): EmpressPreviewConfig | null {
    const config = parseEmpressPreviewSearch(search)
    if (!config) return null

    const state = useGameStore.getState()
    const shuCampaign = buildCampaignState(normalizeCampaignState(new URLSearchParams(search).get('shu')), config.round)
    const huainanCampaign = buildCampaignState(normalizeCampaignState(new URLSearchParams(search).get('huainan')), config.round)
    const baseRoundState = {
        ...state,
        currentRound: config.round,
        currentPhase: 'ROUND_START' as const,
        prologueStep: 'INGAME' as const,
        playerDangerStage: config.danger,
        helpOverlayOpen: false,
        helpOverlaySource: null,
        shuCampaign,
        huainanCampaign,
    }
    const roundStartSnapshot = {
        ...baseRoundState,
        currentPhase: 'ROUND_START' as const,
        selectedPolicyOption: null,
        policyReason: '',
        selectedPolicyParse: null,
        lastSettlement: null,
        lastPolicyReport: null,
        lastPolicyAftereffect: null,
        empressReplyRecord: null,
    }

    if (config.target === 'letter') {
        useGameStore.setState({
            ...baseRoundState,
            currentPhase: 'EMPRESS_LETTER',
            firstRoundGuideSeen: {
                ...state.firstRoundGuideSeen,
                empress_letter: true,
            },
            currentSchemes: [],
            schemeCount: 0,
            selectedPolicyOption: null,
            policyReason: '',
            selectedPolicyParse: null,
            lastSettlement: null,
            lastPolicyReport: null,
            lastPolicyAftereffect: null,
            empressReplyRecord: null,
            roundStartSnapshot,
            isGameOver: false,
            gameResult: 'NONE',
        })
        return config
    }

    const question = getPolicyQuestionForRound(config.round, {
        shuCampaignState: shuCampaign.state,
        huainanCampaignState: huainanCampaign.state,
    })
    const optionIndex = question ? Math.min(config.optionIndex, question.options.length - 1) : 0
    const policyReason = config.authoredReason ? PREVIEW_REASON : ''
    const policyParse = config.authoredReason ? PREVIEW_POLICY_PARSE : null
    const settlement = settleRound({
        round: config.round,
        difficulty: state.difficulty,
        schemes: [],
        northStats: state.northStats,
        southStats: state.southStats,
        npcs: state.npcs,
        factions: state.factions,
        relationships: state.relationships,
        intelProgress: state.intelProgress,
        playerDangerStage: config.danger,
        policyOptionIndex: optionIndex,
        policyReason,
        policyParse,
        shuCampaign,
        huainanCampaign,
        shuMomentum: state.shuMomentum,
        huainanMomentum: state.huainanMomentum,
    })
    const replyText = settlement.policyReport
        ? buildPreviewReplyText(settlement.policyReport, config.danger)
        : '朕已知之。'

    useGameStore.setState({
        ...baseRoundState,
        currentPhase: 'EMPRESS_REPLY',
        firstRoundGuideSeen: {
            ...state.firstRoundGuideSeen,
            empress_letter: true,
            scheme_feedback: true,
            settlement: true,
        },
        currentSchemes: [],
        schemeCount: 0,
        selectedPolicyOption: optionIndex,
        policyReason,
        selectedPolicyParse: policyParse,
        lastSettlement: settlement,
        lastPolicyReport: settlement.policyReport,
        lastPolicyAftereffect: settlement.policyAftereffect,
        empressReplyRecord: {
            sourceRound: config.round,
            text: replyText,
            mode: 'ai',
        },
        roundStartSnapshot,
        isGameOver: false,
        gameResult: 'NONE',
    })

    return config
}
