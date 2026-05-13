import { ROUND_EVENTS } from '../data/rounds'
import { chatCompletionJson } from '../ai/aiService'
import { buildNorthSchemeParsePrompt, buildPolicyReasonParsePrompt, buildSchemeFollowUpParsePrompt } from '../ai/prompts'
import { recordAiGameMasterDebug } from './aiGameMasterDebug'
import { normalizeSchemeFollowUpParse } from './schemeFollowUp'
import type {
    AdvicePolarity,
    DelayedBacklash,
    NationDimensions,
    NorthDominantIntent,
    NorthSchemeParseResult,
    NPC,
    OmenSpeechInput,
    OmenPolarity,
    PolicyReasonParseResult,
    PolicyResolutionMeta,
    PolicyStance,
    SchemeFollowUpParseResult,
    SchemeType,
} from './types'

const NORTH_INTENTS: NorthDominantIntent[] = ['neutral', 'induce', 'threaten', 'divide', 'empathize', 'strategize']
const POLICY_STANCES: PolicyStance[] = ['neutral', 'balanced', 'aggressive', 'conservative', 'expedient']
const ADVICE_POLARITIES: AdvicePolarity[] = ['pro_state', 'pro_target_anti_state', 'neutral_or_vague']
const OMEN_POLARITIES: OmenPolarity[] = ['legitimizing', 'destabilizing', 'vague_or_ceremonial']

const NORTH_STRUCTURAL_WORDS = ['中枢', '兵权', '饷权', '仓储', '粮道', '门阀', '河北', '寿春', '边镇', '诏令', '流民', '节度', '平叛', '法统', '名分', '军令', '州郡', '接管']
const NORTH_EXECUTION_WORDS = ['先', '再', '随后', '收回', '清丈', '并收', '稳住', '转运', '分州郡', '压住', '堵住', '调度', '接管', '断粮', '编户', '屯田', '安置']
const NORTH_EXPOSURE_WORDS = ['夺权', '逼宫', '起兵', '翻掉', '杀', '今夜', '一举', '反旗', '举兵']
const NORTH_FINANCE_WORDS = ['财政', '国库', '赋税', '钱粮', '商道', '饷银', '军费', '开源', '节流', '库藏', '财用']
const NORTH_GRAIN_WORDS = ['粮道', '军粮', '口粮', '转运', '漕运', '仓储', '屯田', '后勤', '补给', '仓廪', '粮秣']
const NORTH_MILITARY_WORDS = ['兵权', '前线', '战线', '调兵', '帅印', '节度', '都督', '平叛', '守军', '军令', '边镇', '诸军', '将令']
const NORTH_SOCIAL_ORDER_WORDS = ['流民', '民变', '人心', '骚乱', '州郡', '百姓', '安民', '哗变', '恐慌', '离散']
const NORTH_GOVERNANCE_WORDS = ['中枢', '诏令', '门阀', '权柄', '体制', '调度', '执行', '都督', '节度', '官吏', '法令', '秩序', '接管', '州郡', '法统', '名分']

export function clamp01(value: unknown): number {
    const numeric = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(numeric)) return 0
    return Math.max(0, Math.min(1, Math.round(numeric * 100) / 100))
}

function clampSigned(value: unknown): number {
    const numeric = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(numeric)) return 0
    return Math.max(-1, Math.min(1, Math.round(numeric * 100) / 100))
}

function isNorthIntent(value: unknown): value is NorthDominantIntent {
    return typeof value === 'string' && NORTH_INTENTS.includes(value as NorthDominantIntent)
}

function isPolicyStance(value: unknown): value is PolicyStance {
    return typeof value === 'string' && POLICY_STANCES.includes(value as PolicyStance)
}

function isAdvicePolarity(value: unknown): value is AdvicePolarity {
    return typeof value === 'string' && ADVICE_POLARITIES.includes(value as AdvicePolarity)
}

function isOmenPolarity(value: unknown): value is OmenPolarity {
    return typeof value === 'string' && OMEN_POLARITIES.includes(value as OmenPolarity)
}

function cleanEvidence(input: unknown): string[] {
    return Array.isArray(input)
        ? input.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 3)
        : []
}

export function normalizeNorthSchemeParse(input: unknown): NorthSchemeParseResult {
    const candidate = (input ?? {}) as Partial<NorthSchemeParseResult>
    return {
        characterFit: clamp01(candidate.characterFit),
        eventFit: clamp01(candidate.eventFit),
        structuralPenetration: clamp01(candidate.structuralPenetration),
        executability: clamp01(candidate.executability),
        exposureRisk: clamp01(candidate.exposureRisk),
        financeRelevance: clamp01(candidate.financeRelevance),
        grainRelevance: clamp01(candidate.grainRelevance),
        militaryRelevance: clamp01(candidate.militaryRelevance),
        socialOrderRelevance: clamp01(candidate.socialOrderRelevance),
        governanceRelevance: clamp01(candidate.governanceRelevance),
        dominantIntent: isNorthIntent(candidate.dominantIntent) ? candidate.dominantIntent : 'neutral',
        omenAccusationClarity: clamp01(candidate.omenAccusationClarity),
        centralSanctionLeverage: clamp01(candidate.centralSanctionLeverage),
        stateBenefit: clampSigned(candidate.stateBenefit),
        targetBenefit: clampSigned(candidate.targetBenefit),
        factionBenefit: clampSigned(candidate.factionBenefit),
        advicePolarity: isAdvicePolarity(candidate.advicePolarity) ? candidate.advicePolarity : 'neutral_or_vague',
        legitimacyDirection: clampSigned(candidate.legitimacyDirection),
        omenPolarity: isOmenPolarity(candidate.omenPolarity) ? candidate.omenPolarity : 'vague_or_ceremonial',
        selfTrapPotential: clamp01(candidate.selfTrapPotential),
        scapegoatClarity: clamp01(candidate.scapegoatClarity),
        omenAnchorStrength: clamp01(candidate.omenAnchorStrength),
        legitimacyCrack: clamp01(candidate.legitimacyCrack),
        suspicionDirection: clamp01(candidate.suspicionDirection),
        suspicionTransmission: clamp01(candidate.suspicionTransmission),
        fractureTransmission: clamp01(candidate.fractureTransmission),
        proxyTransmission: clamp01(candidate.proxyTransmission),
        evidence: cleanEvidence(candidate.evidence),
    }
}

export function normalizePolicyReasonParse(input: unknown): PolicyReasonParseResult {
    const candidate = (input ?? {}) as Partial<PolicyReasonParseResult>
    return {
        focusAlignment: clamp01(candidate.focusAlignment),
        executionClarity: clamp01(candidate.executionClarity),
        costAwareness: clamp01(candidate.costAwareness),
        legitimacyAlignment: clamp01(candidate.legitimacyAlignment),
        policyStance: isPolicyStance(candidate.policyStance) ? candidate.policyStance : 'neutral',
        evidence: cleanEvidence(candidate.evidence),
    }
}

function extractKeywords(text: string): string[] {
    return Array.from(
        new Set(
            text
                .split(/[，。；：、！？\s（）()"'“”‘’—\-+/]+/)
                .map(part => part.trim())
                .filter(part => part.length >= 2),
        ),
    )
}

function includesAny(text: string, words: string[]): boolean {
    return words.some(word => word && text.includes(word))
}

function scoreMatches(text: string, words: string[]): number {
    const matches = words.filter(word => word && text.includes(word))
    return Math.min(1, matches.length / Math.max(1, Math.min(words.length, 4)))
}

function countMatches(text: string, words: string[]): number {
    return words.filter(word => word && text.includes(word)).length
}

function isRecord(input: unknown): input is Record<string, unknown> {
    return typeof input === 'object' && input !== null
}

function hasCoercibleNumberField(input: Record<string, unknown>, field: string): boolean {
    const value = input[field]
    const numeric = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(numeric)
}

function hasStructuredNumberShape(input: unknown, fields: string[]): boolean {
    return isRecord(input) && fields.every(field => hasCoercibleNumberField(input, field))
}

function hasNorthSchemeParseShape(input: unknown): boolean {
    return hasStructuredNumberShape(input, [
        'characterFit',
        'eventFit',
        'structuralPenetration',
        'executability',
        'exposureRisk',
    ])
}

function hasSchemeFollowUpParseShape(input: unknown): boolean {
    return hasStructuredNumberShape(input, [
        'clarificationFit',
        'npcInterestFit',
        'pressureControl',
        'contradictionRisk',
        'exposureRiskDelta',
        'successRateDelta',
        'effectMultiplierDelta',
    ])
}

function hasPolicyReasonParseShape(input: unknown): boolean {
    return hasStructuredNumberShape(input, [
        'focusAlignment',
        'executionClarity',
        'costAwareness',
        'legitimacyAlignment',
    ])
}

const NORTH_CONCRETE_ACTION_WORDS = [
    '先',
    '再',
    '随后',
    '可先',
    '应当',
    '上奏',
    '入奏',
    '派',
    '遣',
    '收紧',
    '削减',
    '截断',
    '放慢',
    '清点',
    '核账',
    '接管',
    '调度',
    '转运',
    '压实',
    '监军',
    '御史',
]

const POLICY_CONCRETE_ACTION_WORDS = [
    '先',
    '再',
    '随后',
    '分州郡',
    '编户',
    '屯田',
    '口粮',
    '清点',
    '转运',
    '接管',
    '压实',
    '断粮',
    '占领',
    '设官',
    '拨粮',
    '赈济',
    '裁撤',
    '核账',
]

const GENERIC_POLITICAL_SLOGANS = [
    '以民为本',
    '安民为先',
    '稳住人心',
    '徐图后效',
    '正本清源',
    '天下归心',
    '先稳大局',
    '从长计议',
    '不可操之过急',
]

function getNorthFallbackSubstanceProfile(speech: string, relatedNpc?: NPC | null, schemeType?: SchemeType): {
    hasConcreteAction: boolean
    hasStructuralAnchor: boolean
    hasResourceAnchor: boolean
    structuralFactor: number
    dimensionFactor: number
    executionLengthFactor: number
    transmissionFactor: number
} {
    const hasConcreteAction =
        scoreMatches(speech, NORTH_EXECUTION_WORDS) >= 0.18 ||
        countMatches(speech, NORTH_CONCRETE_ACTION_WORDS) >= 1
    const hasStructuralAnchor =
        scoreMatches(speech, NORTH_STRUCTURAL_WORDS) >= 0.18 ||
        Boolean(relatedNpc && speech.includes(relatedNpc.name))
    const hasResourceAnchor = Math.max(
        scoreMatches(speech, NORTH_FINANCE_WORDS),
        scoreMatches(speech, NORTH_GRAIN_WORDS),
        scoreMatches(speech, NORTH_MILITARY_WORDS),
        scoreMatches(speech, NORTH_SOCIAL_ORDER_WORDS),
        scoreMatches(speech, NORTH_GOVERNANCE_WORDS),
    ) >= 0.2
    const hasStrategicQuestion =
        schemeType === 'probe' &&
        /[？?]|究竟|最怕|最难|会是|还是|哪一|哪处/.test(speech) &&
        (hasStructuralAnchor || hasResourceAnchor)
    const hasActionableChain = (hasConcreteAction || hasStrategicQuestion) && (hasStructuralAnchor || hasResourceAnchor || Boolean(relatedNpc))

    return {
        hasConcreteAction,
        hasStructuralAnchor,
        hasResourceAnchor,
        structuralFactor: hasActionableChain ? 1 : hasStructuralAnchor ? 0.78 : 0.58,
        dimensionFactor: hasActionableChain ? 1 : hasResourceAnchor || hasStructuralAnchor ? 0.78 : 0.56,
        executionLengthFactor: hasConcreteAction ? 1 : hasStrategicQuestion ? 0.72 : 0.38,
        transmissionFactor: hasActionableChain ? 1 : hasStructuralAnchor || Boolean(relatedNpc) ? 0.72 : 0.45,
    }
}

function dampFallbackDimension(value: number, factor: number): number {
    return clamp01(value * factor)
}

function getPolicyFallbackSubstanceProfile(text: string, focusText: string): {
    hasConcreteAction: boolean
    hasCostAnchor: boolean
    hasFocusAnchor: boolean
    isSloganOnly: boolean
    focusFactor: number
    executionFactor: number
} {
    const hasConcreteAction =
        countMatches(text, POLICY_CONCRETE_ACTION_WORDS) >= 1 ||
        /先.+再|若.+则/.test(text)
    const hasCostAnchor = includesAny(text, ['代价', '风险', '地方', '门阀', '国库', '后勤', '反弹', '拖垮', '权衡'])
    const focusWords = extractKeywords(focusText)
    const hasFocusAnchor = focusWords.length > 0 ? scoreMatches(text, focusWords) >= 0.18 : false
    const isSloganOnly =
        includesAny(text, GENERIC_POLITICAL_SLOGANS) &&
        !hasConcreteAction &&
        !hasCostAnchor &&
        !hasFocusAnchor

    return {
        hasConcreteAction,
        hasCostAnchor,
        hasFocusAnchor,
        isSloganOnly,
        focusFactor: isSloganOnly ? 0.58 : hasFocusAnchor || hasConcreteAction ? 1 : 0.72,
        executionFactor: hasConcreteAction ? 1 : isSloganOnly ? 0.42 : 0.62,
    }
}

function getFollowUpFallbackSubstanceProfile(reply: string, npcQuestion: string): {
    answersQuestion: boolean
    hasConcreteClause: boolean
    hasSubstance: boolean
} {
    const questionWords = extractKeywords(npcQuestion)
    const answersQuestion = questionWords.length > 0 && scoreMatches(reply, questionWords) >= 0.2
    const hasConcreteClause =
        includesAny(reply, ['因为', '所以', '若', '则', '不是', '而是', '先', '再', '只需', '可使', '让他', '上奏', '粮道', '军令', '中枢', '太后', '陛下']) ||
        /不在.+而在|先.+再/.test(reply)
    return {
        answersQuestion,
        hasConcreteClause,
        hasSubstance: reply.trim().length >= 16 && (answersQuestion || hasConcreteClause),
    }
}

function deriveAdvicePolarityFromSpeech(text: string): {
    stateBenefit: number
    targetBenefit: number
    factionBenefit: number
    advicePolarity: AdvicePolarity
} {
    const proState = scoreMatches(text, [
        '稳住仓储',
        '整饬诏令',
        '安民',
        '修补秩序',
        '先稳后动',
        '免得失序',
        '补漏',
        '收回中枢',
        '整顿法令',
    ])
    const proTarget = scoreMatches(text, [
        '抓在你自己手里',
        '先保住你的兵权',
        '先顾你这一线',
        '先顾自家',
        '让别人替你背',
        '坐实你的权',
        '旁人有怨也只能听命',
    ])
    const antiState = scoreMatches(text, [
        '不必顾全大局',
        '宁可伤国也要保位',
        '旁人有怨也只能听命',
        '先顾你这一线',
        '只要你这一系稳住',
        '朝廷一时受损也无妨',
    ])

    if (proTarget >= 0.28 && antiState >= 0.2) {
        return {
            stateBenefit: -(0.25 + antiState * 0.9),
            targetBenefit: 0.3 + proTarget * 0.8,
            factionBenefit: 0.12 + proTarget * 0.55,
            advicePolarity: 'pro_target_anti_state',
        }
    }

    if (proState >= 0.22 && antiState < 0.16) {
        return {
            stateBenefit: 0.22 + proState * 0.8,
            targetBenefit: 0.08 + proState * 0.25,
            factionBenefit: 0.04 + proState * 0.15,
            advicePolarity: 'pro_state',
        }
    }

    return {
        stateBenefit: 0,
        targetBenefit: Math.max(0.06, proTarget * 0.2),
        factionBenefit: 0,
        advicePolarity: 'neutral_or_vague',
    }
}

function deriveOmenPolarityFromSpeech(text: string): {
    legitimacyDirection: number
    omenPolarity: OmenPolarity
} {
    const destabilizing = scoreMatches(text, [
        '天命不在',
        '名分已摇',
        '灾异既著',
        '人心先散',
        '上下都疑心',
        '法统不稳',
        '天意已去',
    ])
    const legitimizing = scoreMatches(text, [
        '修德',
        '安民',
        '整饬法统',
        '弭灾',
        '正名分',
        '收人心',
        '修补名分',
        '整饬秩序',
    ])

    if (destabilizing >= 0.24 && destabilizing > legitimizing + 0.06) {
        return {
            legitimacyDirection: -(0.26 + destabilizing * 0.86),
            omenPolarity: 'destabilizing',
        }
    }

    if (legitimizing >= 0.22 && legitimizing > destabilizing + 0.06) {
        return {
            legitimacyDirection: 0.22 + legitimizing * 0.78,
            omenPolarity: 'legitimizing',
        }
    }

    return {
        legitimacyDirection: 0,
        omenPolarity: 'vague_or_ceremonial',
    }
}

function deriveFrameSpecializationFromSpeech(text: string): {
    selfTrapPotential: number
    scapegoatClarity: number
} {
    const selfTrapPotential = clamp01(
        0.05
        + scoreMatches(text, ['失言', '失态', '动气', '露口风', '先开口', '误判', '自乱阵脚', '沉不住气']) * 0.9
        + scoreMatches(text, ['只消', '只要', '一逼', '一激', '一问']) * 0.24,
    )

    const scapegoatClarity = clamp01(
        0.05
        + scoreMatches(text, ['背锅', '落到你头上', '推到你身上', '先担责', '旁人便会指着你', '嫌疑落在你身上']) * 0.95
        + scoreMatches(text, ['到头来', '最后', '终究']) * 0.18,
    )

    return { selfTrapPotential, scapegoatClarity }
}

function deriveOmenSpecialization(params: {
    speech: string
    npc: NPC
    omenSpeechInput?: OmenSpeechInput
}): {
    omenAccusationClarity: number
    centralSanctionLeverage: number
    omenAnchorStrength: number
    legitimacyCrack: number
    suspicionDirection: number
} {
    const omenText = params.omenSpeechInput?.omenText?.trim() ?? ''
    const interpretationText = params.omenSpeechInput?.interpretationText?.trim() ?? ''
    const anchorSource = omenText || params.speech
    const interpretationSource = interpretationText || params.speech
    const combinedSource = `${anchorSource} ${interpretationSource} ${params.speech}`
    const isExternalWarlord = params.npc.powerBase === 'external'

    const omenAccusationClarity = clamp01(
        0.04
        + scoreMatches(interpretationSource, ['外镇军头', '外镇', '军头', '节度', '藩镇', '拥兵自重', '借兵自重', '自立', '自重', '离心', '权势', '权柄', '兵粮', '军需', '中枢']) * 0.78
        + scoreMatches(anchorSource, ['外镇', '军旗', '夜鸣', '异动', '石马', '兵粮', '军需', '军头', '藩镇']) * 0.16
        + (isExternalWarlord ? 0.08 : 0)
        + (isExternalWarlord && params.npc.loyaltyToCourt <= 45 ? 0.07 : 0),
    )

    const centralSanctionLeverage = clamp01(
        0.04
        + scoreMatches(combinedSource, ['截断粮道', '断粮', '慢军需', '放慢军需', '军需', '核账', '御史', '监军', '督察', '审计', '清查账目', '收束诏令', '派监督', '监督', '削权', '收权', '减饷', '停供']) * 0.82
        + scoreMatches(interpretationSource, ['中央处置', '中枢', '朝廷', '御史', '监军', '核账', '截断粮道', '放慢军需', '派监督']) * 0.14
        + (isExternalWarlord ? 0.05 : 0),
    )

    const omenAnchorStrength = clamp01(
        0.04
        + scoreMatches(anchorSource, ['灾异', '征兆', '谶', '石人', '龙气', '彗星', '大旱', '洪涝', '地动', '天火']) * 1
        + (anchorSource.length >= 8 ? 0.1 : 0),
    )

    const legitimacyCrack = clamp01(
        0.04
        + scoreMatches(interpretationSource, ['名分', '法统', '天命', '越分', '失序', '僭越', '正朔', '宗庙']) * 0.95
        + scoreMatches(interpretationSource, ['非独天灾', '不是独天灾', '人事相连', '朝中有人']) * 0.18,
    )

    const suspicionDirection = clamp01(
        0.04
        + scoreMatches(interpretationSource, ['最该警惕', '最可疑', '某类人', '朝中重臣', '摄政', '主战之人', '外镇', '中枢', '军头', '藩镇', '自重']) * 0.9
        + (includesAny(interpretationSource, ['警惕', '可疑', '疑在', '疑向']) ? 0.14 : 0),
    )

    return {
        omenAccusationClarity,
        centralSanctionLeverage,
        omenAnchorStrength,
        legitimacyCrack,
        suspicionDirection,
    }
}

function backfillSparseField(currentValue: number | undefined, fallbackValue: number): number {
    const current = clamp01(currentValue)
    if (!Number.isFinite(fallbackValue) || fallbackValue <= 0) return current
    return current <= 0.08 && fallbackValue >= 0.18 ? fallbackValue : current
}

function mergeOmenSpecializationFields(
    parsed: NorthSchemeParseResult,
    fallback: NorthSchemeParseResult,
): NorthSchemeParseResult {
    return {
        ...parsed,
        omenAccusationClarity: backfillSparseField(parsed.omenAccusationClarity, fallback.omenAccusationClarity ?? 0),
        centralSanctionLeverage: backfillSparseField(parsed.centralSanctionLeverage, fallback.centralSanctionLeverage ?? 0),
        omenAnchorStrength: backfillSparseField(parsed.omenAnchorStrength, fallback.omenAnchorStrength ?? 0),
        legitimacyCrack: backfillSparseField(parsed.legitimacyCrack, fallback.legitimacyCrack ?? 0),
        suspicionDirection: backfillSparseField(parsed.suspicionDirection, fallback.suspicionDirection ?? 0),
    }
}

export function fallbackNorthParseFromSpeech(params: {
    speech: string
    npc: NPC
    round: number
    schemeType?: SchemeType
    relatedNpc?: NPC | null
    omenSpeechInput?: OmenSpeechInput
    eventName?: string
    eventBriefing?: string
    eventNorthDescription?: string
}): NorthSchemeParseResult {
    const speech = params.speech.trim()
    if (!speech) {
        return normalizeNorthSchemeParse(null)
    }

    const roundEvent = ROUND_EVENTS[params.round - 1]
    const npcHooks = [
        ...extractKeywords(params.npc.softSpot),
        ...extractKeywords(params.npc.publicStance),
        ...extractKeywords(params.npc.schemeHooks),
        ...extractKeywords(params.npc.publicPersona),
        ...extractKeywords(params.npc.secretThreads.join(' ')),
    ]
    const triggerWords = extractKeywords(params.npc.triggerPoint)
    const eventWords = [
        ...extractKeywords(params.eventName ?? roundEvent?.eventName ?? ''),
        ...extractKeywords(params.eventBriefing ?? roundEvent?.briefing ?? ''),
        ...extractKeywords(params.eventNorthDescription ?? roundEvent?.northDescription ?? ''),
    ]
    const substanceProfile = getNorthFallbackSubstanceProfile(speech, params.relatedNpc, params.schemeType)

    const characterFit = clamp01(
        0.12
        + (speech.length >= 12 ? 0.08 : 0)
        + scoreMatches(speech, npcHooks) * 0.6
        - scoreMatches(speech, triggerWords) * 0.45,
    )

    const eventFit = clamp01(
        0.08
        + scoreMatches(speech, eventWords) * 0.6
        + (includesAny(speech, ['灾异', '疫', '边患', '淮南', '河西', '河北', '流民', '征蜀', '寿春']) ? 0.18 : 0),
    )

    const structuralPenetration = clamp01(
        (0.05
        + scoreMatches(speech, NORTH_STRUCTURAL_WORDS) * 0.8
        + (params.relatedNpc ? 0.08 : 0)) * substanceProfile.structuralFactor,
    )

    const executability = clamp01(
        0.08
        + (speech.length >= 18 ? 0.18 * substanceProfile.executionLengthFactor : 0)
        + (speech.length >= 34 ? 0.12 * substanceProfile.executionLengthFactor : 0)
        + scoreMatches(speech, NORTH_EXECUTION_WORDS) * 0.62,
    )

    const exposureRisk = clamp01(
        scoreMatches(speech, triggerWords) * 0.35
        + scoreMatches(speech, NORTH_EXPOSURE_WORDS) * 0.65
        + (speech.length >= 70 ? 0.08 : 0),
    )

    const financeRelevance = dampFallbackDimension(clamp01(
        scoreMatches(speech, NORTH_FINANCE_WORDS) * 0.88
        + (includesAny(speech, ['国库', '赋税', '商道', '饷银', '军费', '钱粮']) ? 0.16 : 0),
    ), substanceProfile.dimensionFactor)

    const grainRelevance = dampFallbackDimension(clamp01(
        scoreMatches(speech, NORTH_GRAIN_WORDS) * 0.92
        + (includesAny(speech, ['粮道', '军粮', '转运', '补给', '后勤', '仓储']) ? 0.2 : 0),
    ), substanceProfile.dimensionFactor)

    const militaryRelevance = dampFallbackDimension(clamp01(
        scoreMatches(speech, NORTH_MILITARY_WORDS) * 0.9
        + (includesAny(speech, ['前线', '调兵', '战线', '平叛', '军令', '边镇']) ? 0.18 : 0),
    ), substanceProfile.dimensionFactor)

    const socialOrderRelevance = dampFallbackDimension(clamp01(
        scoreMatches(speech, NORTH_SOCIAL_ORDER_WORDS) * 0.84
        + (includesAny(speech, ['流民', '民变', '安民', '人心', '州郡']) ? 0.16 : 0),
    ), substanceProfile.dimensionFactor)

    const governanceRelevance = dampFallbackDimension(clamp01(
        scoreMatches(speech, NORTH_GOVERNANCE_WORDS) * 0.9
        + scoreMatches(speech, NORTH_STRUCTURAL_WORDS) * 0.18
        + (includesAny(speech, ['中枢', '诏令', '门阀', '调度', '执行', '接管', '法统', '名分']) ? 0.16 : 0),
    ), substanceProfile.dimensionFactor)

    const dominantIntent: NorthDominantIntent =
        includesAny(speech, ['逼宫', '夺权', '今夜', '立刻', '举兵', '起兵']) ? 'threaten'
            : includesAny(speech, ['离间', '猜疑', '互疑', '反压', '名分裂口', '两套']) ? 'divide'
                : includesAny(speech, ['仓储', '中枢', '节度', '兵权', '转运', '军费', '粮道', '军令', '接管']) ? 'strategize'
                    : includesAny(speech, ['体谅', '同忧', '不忍', '委屈']) ? 'empathize'
                        : includesAny(speech, ['可得', '有利', '坐实', '收回', '借势']) ? 'induce'
                            : 'neutral'

    const evidence = [
        characterFit >= 0.58 ? '说辞贴近此人心结' : '',
        structuralPenetration >= 0.58 ? '话头已触及权力结构' : '',
        exposureRisk >= 0.58 ? '说辞锋芒过露' : '',
        !substanceProfile.hasConcreteAction && structuralPenetration < 0.5 ? '说辞缺少清晰动作链' : '',
    ].filter(Boolean)

    const advicePolarity = deriveAdvicePolarityFromSpeech(speech)
    const omenPolarity = deriveOmenPolarityFromSpeech(speech)
    const frameSpecialization = params.schemeType === 'frame'
        ? deriveFrameSpecializationFromSpeech(speech)
        : { selfTrapPotential: 0, scapegoatClarity: 0 }
    const omenSpecialization = params.schemeType === 'omen'
        ? deriveOmenSpecialization({ speech, npc: params.npc, omenSpeechInput: params.omenSpeechInput })
        : { omenAccusationClarity: 0, centralSanctionLeverage: 0, omenAnchorStrength: 0, legitimacyCrack: 0, suspicionDirection: 0 }
    const suspicionTransmission = params.schemeType === 'slander'
        ? clamp01(scoreMatches(speech, [
            '军令',
            '粮道',
            '转运',
            '诏令',
            '边镇',
            '调度',
            '谁来担责',
            '众口一词',
        ]) * 0.34 * substanceProfile.transmissionFactor)
        : 0
    const fractureTransmission = params.schemeType === 'alienate'
        ? clamp01(scoreMatches(speech, [
            '各听各的',
            '两套军令',
            '不再同心',
            '互相掣肘',
            '谁先保自己',
            '接应断开',
            '彼此留后手',
        ]) * 0.42 * substanceProfile.transmissionFactor)
        : 0
    const proxyTransmission = params.schemeType === 'proxy'
        ? clamp01(scoreMatches(speech, [
            '借他出手',
            '替你担名',
            '趁机压他',
            '公开收拾',
            '顺手夺权',
            '众人都会看见',
            '借势发难',
        ]) * 0.4 * substanceProfile.transmissionFactor)
        : 0

    return normalizeNorthSchemeParse({
        characterFit,
        eventFit,
        structuralPenetration,
        executability,
        exposureRisk,
        financeRelevance,
        grainRelevance,
        militaryRelevance,
        socialOrderRelevance,
        governanceRelevance,
        dominantIntent,
        omenAccusationClarity: omenSpecialization.omenAccusationClarity,
        centralSanctionLeverage: omenSpecialization.centralSanctionLeverage,
        stateBenefit: advicePolarity.stateBenefit,
        targetBenefit: advicePolarity.targetBenefit,
        factionBenefit: advicePolarity.factionBenefit,
        advicePolarity: advicePolarity.advicePolarity,
        legitimacyDirection: omenPolarity.legitimacyDirection,
        omenPolarity: omenPolarity.omenPolarity,
        selfTrapPotential: frameSpecialization.selfTrapPotential,
        scapegoatClarity: frameSpecialization.scapegoatClarity,
        omenAnchorStrength: omenSpecialization.omenAnchorStrength,
        legitimacyCrack: omenSpecialization.legitimacyCrack,
        suspicionDirection: omenSpecialization.suspicionDirection,
        suspicionTransmission,
        fractureTransmission,
        proxyTransmission,
        evidence,
    })
}

export function fallbackPolicyParseFromReason(
    reasonText: string,
    meta: PolicyResolutionMeta = {},
): PolicyReasonParseResult {
    const text = reasonText.trim()
    if (!text) {
        return normalizePolicyReasonParse(null)
    }

    const focusWords = extractKeywords(meta.aiScoringFocus ?? '')
    const focusText = meta.aiScoringFocus ?? ''
    const substanceProfile = getPolicyFallbackSubstanceProfile(text, focusText)
    const thematicFocusBoost =
        /流民|资源/.test(focusText) && includesAny(text, ['流民', '编户', '屯田', '劳力', '口粮', '安置'])
            ? 0.24
            : /门阀|豪族|士族/.test(focusText) && includesAny(text, ['门阀', '地方', '州郡', '豪族', '反弹', '士族'])
                ? 0.2
                : /执行|成本|路径/.test(focusText) && includesAny(text, ['执行', '责任', '州郡', '兵', '军', '推进', '转运'])
                    ? 0.18
                    : /蜀道|后勤|军粮|转运|战果/.test(focusText) && includesAny(text, ['粮道', '军粮', '转运', '补给', '接管', '占领', '战果'])
                        ? 0.22
                    : /财政|国库/.test(focusText) && includesAny(text, ['财政', '国库', '税', '钱粮', '节流', '开源'])
                        ? 0.18
                        : 0

    const focusAlignment = clamp01((
        0.12
        + scoreMatches(text, focusWords) * 0.72
        + (includesAny(text, ['流民', '门阀', '地方', '执行', '成本', '后勤', '缓急', '粮道', '转运', '接管', '战果']) ? 0.12 : 0)
        + thematicFocusBoost) * substanceProfile.focusFactor,
    )

    const executionClarity = clamp01((
        0.08
        + (text.length >= 18 ? 0.16 * substanceProfile.executionFactor : 0)
        + (text.length >= 32 ? 0.1 * substanceProfile.executionFactor : 0)
        + scoreMatches(text, ['先', '再', '随后', '分州郡', '编户', '屯田', '口粮', '执行责任', '清点', '转运', '接管', '压实', '断粮', '占领']) * 0.72) * substanceProfile.executionFactor,
    )

    const costAwareness = clamp01(
        scoreMatches(text, ['代价', '风险', '地方', '门阀', '国库', '后勤', '推进', '反弹', '缓急', '权衡', '拖垮', '宁可']) * 0.92,
    )

    const legitimacyAlignment = clamp01(
        meta.legitimacyEffect === 'down'
            ? 0.22 + scoreMatches(text, ['高压', '重税', '急征', '严控', '强压']) * 0.7
            : 0.16 + scoreMatches(text, ['安民', '名分', '法统', '秩序', '渐进', '人心', '稳住']) * 0.7,
    )

    const policyStance: PolicyStance =
        includesAny(text, ['急征', '强压', '急攻', '立刻扩军']) ? 'aggressive'
            : includesAny(text, ['权宜', '先救急', '暂缓', '先缓']) ? 'expedient'
                : includesAny(text, ['渐进', '安民', '稳住', '先稳']) ? 'conservative'
                    : includesAny(text, ['兵', '军', '权衡', '缓急', '执行', '转运', '接管', '断粮']) ? 'balanced'
                        : 'neutral'

    const evidence = [
        focusAlignment >= 0.58 ? '附言切中此题关节' : '',
        executionClarity >= 0.58 ? '施行路径较为清晰' : '',
        costAwareness >= 0.52 ? '兼顾了代价与阻力' : '',
        substanceProfile.isSloganOnly ? '附言偏口号，缺少施行抓手' : '',
    ].filter(Boolean)

    return normalizePolicyReasonParse({
        focusAlignment,
        executionClarity,
        costAwareness,
        legitimacyAlignment,
        policyStance,
        evidence,
    })
}

export async function parseNorthSchemeInput(params: {
    round: number
    npc: NPC
    schemeType: SchemeType
    speech: string
    relatedNpc?: NPC | null
    omenSpeechInput?: OmenSpeechInput
    eventName?: string
    eventBriefing?: string
}): Promise<NorthSchemeParseResult> {
    const roundEvent = ROUND_EVENTS[params.round - 1]
    const fallbackParsed = fallbackNorthParseFromSpeech({
        speech: params.speech,
        npc: params.npc,
        round: params.round,
        schemeType: params.schemeType,
        relatedNpc: params.relatedNpc,
        omenSpeechInput: params.omenSpeechInput,
        eventName: params.eventName,
        eventBriefing: params.eventBriefing,
    })
    const aiParsed = await chatCompletionJson<NorthSchemeParseResult>(
        buildNorthSchemeParsePrompt({
            round: params.round,
            npc: params.npc,
            schemeType: params.schemeType,
            speech: params.speech,
            omenSpeechInput: params.omenSpeechInput,
            eventName: params.eventName ?? roundEvent?.eventName ?? `第${params.round}回合`,
            eventBriefing: params.eventBriefing ?? roundEvent?.briefing ?? '',
        }),
        { temperature: 0.2, maxTokens: 220, tag: 'north_scheme_parse' },
    )

    if (hasNorthSchemeParseShape(aiParsed)) {
        const normalized = normalizeNorthSchemeParse(aiParsed)
        const hasDimensionRelevance =
            normalized.financeRelevance > 0 ||
            normalized.grainRelevance > 0 ||
            normalized.militaryRelevance > 0 ||
            normalized.socialOrderRelevance > 0 ||
            normalized.governanceRelevance > 0
        const merged = hasDimensionRelevance
            ? normalized
            : {
                ...normalized,
                financeRelevance: fallbackParsed.financeRelevance,
                grainRelevance: fallbackParsed.grainRelevance,
                militaryRelevance: fallbackParsed.militaryRelevance,
                socialOrderRelevance: fallbackParsed.socialOrderRelevance,
                governanceRelevance: fallbackParsed.governanceRelevance,
            }
        const finalParsed = params.schemeType === 'omen'
            ? mergeOmenSpecializationFields(merged, fallbackParsed)
            : merged
        recordAiGameMasterDebug({
            chain: 'north_scheme',
            source: hasDimensionRelevance && params.schemeType !== 'omen' ? 'ai' : 'ai_with_fallback_merge',
            round: params.round,
            npcId: params.npc.id,
            npcName: params.npc.name,
            schemeType: params.schemeType,
            summary: `${params.npc.name} · ${params.schemeType}`,
            notes: [
                hasDimensionRelevance ? 'AI provided dimension relevance.' : 'Dimension relevance merged from local fallback.',
                params.schemeType === 'omen' ? 'Omen specialization fields checked against local fallback.' : '',
            ].filter(Boolean),
        })
        return finalParsed
    }

    recordAiGameMasterDebug({
        chain: 'north_scheme',
        source: 'invalid_ai_fallback',
        round: params.round,
        npcId: params.npc.id,
        npcName: params.npc.name,
        schemeType: params.schemeType,
        summary: `${params.npc.name} · ${params.schemeType}`,
        notes: ['AI parse was missing the required north scheme schema; local fallback was used.'],
    })
    return fallbackParsed
}

function fallbackSchemeFollowUpParseFromReply(params: {
    originalParse: NorthSchemeParseResult
    playerReply: string
    npcQuestion: string
}): SchemeFollowUpParseResult {
    const reply = params.playerReply.trim()
    const replyLength = reply.length
    const substanceProfile = getFollowUpFallbackSubstanceProfile(reply, params.npcQuestion)
    const hasSubstance = substanceProfile.hasSubstance
    const questionLength = params.npcQuestion.trim().length

    return normalizeSchemeFollowUpParse({
        clarificationFit: hasSubstance ? (replyLength >= 20 ? 0.34 : 0.24) : replyLength >= 10 ? 0.16 : 0.1,
        npcInterestFit: clamp01(0.16 + params.originalParse.characterFit * 0.18 + params.originalParse.eventFit * 0.12 + (hasSubstance ? 0.05 : -0.04)),
        pressureControl: clamp01(0.36 - params.originalParse.exposureRisk * 0.18 - (replyLength < 12 ? 0.08 : 0) - (hasSubstance ? 0 : 0.06)),
        contradictionRisk: clamp01(0.14 + (replyLength < 12 ? 0.14 : 0.05) + (hasSubstance ? 0 : 0.08) + (params.originalParse.exposureRisk >= 0.45 ? 0.05 : 0)),
        exposureRiskDelta: hasSubstance && replyLength >= 20 ? -0.01 : replyLength < 8 ? 0.02 : 0.01,
        successRateDelta: hasSubstance && replyLength >= 18 && params.originalParse.characterFit >= 0.38 ? 0.01 : 0,
        effectMultiplierDelta: hasSubstance && replyLength >= 24 && params.originalParse.executability >= 0.35 ? 0.02 : 0,
        evidence: [
            hasSubstance ? '回复接住了追问，略微提高澄清收益' : '回复缺少明确补充，只给保守修正',
            questionLength >= 8 ? '追问本身保留了轻微互动空间' : '追问很短，互动空间有限',
            params.originalParse.exposureRisk >= 0.45 ? '原计谋本身偏露锋芒' : '原计谋本身不算高压',
        ],
    })
}

export async function parseSchemeFollowUpInput(params: {
    round: number
    eventName: string
    eventBriefing: string
    npc: NPC
    schemeType: SchemeType
    originalSpeech: string
    originalParse: NorthSchemeParseResult
    npcQuestion: string
    playerReply: string
}): Promise<SchemeFollowUpParseResult> {
    const aiParsed = await chatCompletionJson<SchemeFollowUpParseResult>(
        buildSchemeFollowUpParsePrompt({
            round: params.round,
            eventName: params.eventName,
            eventBriefing: params.eventBriefing,
            npc: params.npc,
            schemeType: params.schemeType,
            originalSpeech: params.originalSpeech,
            originalParse: params.originalParse,
            npcQuestion: params.npcQuestion,
            playerReply: params.playerReply,
        }),
        { temperature: 0.2, maxTokens: 180, tag: 'scheme_follow_up_parse' },
    )

    if (hasSchemeFollowUpParseShape(aiParsed)) {
        const parsed = normalizeSchemeFollowUpParse(aiParsed)
        recordAiGameMasterDebug({
            chain: 'scheme_follow_up',
            source: 'ai',
            round: params.round,
            npcId: params.npc.id,
            npcName: params.npc.name,
            schemeType: params.schemeType,
            summary: `${params.npc.name} · ${params.schemeType} follow-up`,
            notes: ['AI follow-up parse matched schema.'],
        })
        return parsed
    }

    recordAiGameMasterDebug({
        chain: 'scheme_follow_up',
        source: 'invalid_ai_fallback',
        round: params.round,
        npcId: params.npc.id,
        npcName: params.npc.name,
        schemeType: params.schemeType,
        summary: `${params.npc.name} · ${params.schemeType} follow-up`,
        notes: ['AI follow-up parse was invalid; local fallback was used.'],
    })
    return fallbackSchemeFollowUpParseFromReply({
        originalParse: params.originalParse,
        playerReply: params.playerReply,
        npcQuestion: params.npcQuestion,
    })
}

export async function parsePolicyReasonInput(params: {
    round: number
    topic: string
    question: string
    reason: string
    meta: PolicyResolutionMeta
}): Promise<PolicyReasonParseResult> {
    const aiParsed = await chatCompletionJson<PolicyReasonParseResult>(
        buildPolicyReasonParsePrompt({
            round: params.round,
            topic: params.topic,
            question: params.question,
            reason: params.reason,
            meta: params.meta,
        }),
        { temperature: 0.2, maxTokens: 220, tag: 'policy_reason_parse' },
    )

    if (hasPolicyReasonParseShape(aiParsed)) {
        const parsed = normalizePolicyReasonParse(aiParsed)
        recordAiGameMasterDebug({
            chain: 'policy_reason',
            source: 'ai',
            round: params.round,
            summary: params.topic,
            notes: ['AI policy reason parse matched schema.'],
        })
        return parsed
    }

    recordAiGameMasterDebug({
        chain: 'policy_reason',
        source: 'invalid_ai_fallback',
        round: params.round,
        summary: params.topic,
        notes: ['AI policy reason parse was invalid; local fallback was used.'],
    })
    return fallbackPolicyParseFromReason(params.reason, params.meta)
}

export function applyDelayedBacklashToState(params: {
    backlog: DelayedBacklash[]
    currentRound: number
    npcs: NPC[]
    northStats: NationDimensions
}): {
    npcs: NPC[]
    northStats: NationDimensions
    appliedBacklash: DelayedBacklash[]
} {
    const active = params.backlog.filter(item => params.currentRound === item.sourceRound + 1)
    if (active.length === 0) {
        return {
            npcs: params.npcs,
            northStats: params.northStats,
            appliedBacklash: [],
        }
    }

    const npcs = params.npcs.map(npc => ({ ...npc }))
    const northStats = { ...params.northStats }

    for (const backlash of active) {
        const npc = npcs.find(item => item.id === backlash.npcId)
        if (npc) {
            if (backlash.type === 'guarded') {
                npc.trust = Math.max(0, npc.trust - Math.max(2, Math.round(backlash.intensity * 5)))
            } else if (backlash.type === 'shock') {
                npc.trust = Math.max(0, npc.trust - Math.max(4, Math.round(backlash.intensity * 7)))
            } else if (backlash.type === 'exposed') {
                npc.trust = Math.max(0, npc.trust - Math.max(1, Math.round(backlash.intensity * 4)))
            }
        }

        if (backlash.type === 'misdirected' || backlash.type === 'shock') {
            northStats.governance = Math.max(0, roundOne(northStats.governance - backlash.intensity * (backlash.type === 'shock' ? 1.6 : 0.9)))
            northStats.socialOrder = Math.max(0, roundOne(northStats.socialOrder - backlash.intensity * (backlash.type === 'shock' ? 1.2 : 0.7)))
            northStats.military = Math.max(0, roundOne(northStats.military - backlash.intensity * (backlash.type === 'shock' ? 1.1 : 0.4)))
        }

        if ((backlash.type === 'exposed' || backlash.type === 'shock') && npc) {
            npc.trust = Math.max(0, npc.trust - Math.max(2, Math.round(backlash.intensity * (backlash.type === 'shock' ? 8 : 5))))
        }
    }

    return { npcs, northStats, appliedBacklash: active }
}

function roundOne(value: number): number {
    return Math.round(value * 10) / 10
}
