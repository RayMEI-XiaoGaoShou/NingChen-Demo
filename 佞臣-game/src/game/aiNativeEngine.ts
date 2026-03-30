import { ROUND_EVENTS } from '../data/rounds'
import { chatCompletionJson } from '../ai/aiService'
import { buildNorthSchemeParsePrompt, buildPolicyReasonParsePrompt } from '../ai/prompts'
import type {
    DelayedBacklash,
    NationDimensions,
    NorthDominantIntent,
    NorthSchemeParseResult,
    NPC,
    PolicyReasonParseResult,
    PolicyResolutionMeta,
    PolicyStance,
} from './types'

const NORTH_INTENTS: NorthDominantIntent[] = ['neutral', 'induce', 'threaten', 'divide', 'empathize', 'strategize']
const POLICY_STANCES: PolicyStance[] = ['neutral', 'balanced', 'aggressive', 'conservative', 'expedient']

export function clamp01(value: unknown): number {
    const numeric = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(numeric)) return 0
    return Math.max(0, Math.min(1, Math.round(numeric * 100) / 100))
}

function isNorthIntent(value: unknown): value is NorthDominantIntent {
    return typeof value === 'string' && NORTH_INTENTS.includes(value as NorthDominantIntent)
}

function isPolicyStance(value: unknown): value is PolicyStance {
    return typeof value === 'string' && POLICY_STANCES.includes(value as PolicyStance)
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
        dominantIntent: isNorthIntent(candidate.dominantIntent) ? candidate.dominantIntent : 'neutral',
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
                .split(/[，。；：、！？\s（）()"'“”‘’]+/)
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

export function fallbackNorthParseFromSpeech(params: {
    speech: string
    npc: NPC
    round: number
    relatedNpc?: NPC | null
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
    ]
    const triggerWords = extractKeywords(params.npc.triggerPoint)
    const eventWords = roundEvent
        ? [
            ...extractKeywords(roundEvent.eventName),
            ...extractKeywords(roundEvent.briefing),
            ...extractKeywords(roundEvent.northDescription),
        ]
        : []
    const structuralWords = ['中枢', '兵权', '粮道', '仓廪', '饷权', '门阀', '河北', '寿春', '边镇', '诏令', '流民', '节度', '平叛']
    const executionWords = ['先', '再', '随后', '收回', '清丈', '并收', '稳住', '转运', '分州郡', '压住', '堵住', '调度']
    const exposureWords = ['夺权', '逼宫', '起兵', '翻掉', '废', '杀', '今夜', '一举', '篡', '反旗']

    const characterFit = clamp01(
        0.12
        + (speech.length >= 12 ? 0.08 : 0)
        + scoreMatches(speech, npcHooks) * 0.6
        - scoreMatches(speech, triggerWords) * 0.45,
    )

    const eventFit = clamp01(
        0.08
        + scoreMatches(speech, eventWords) * 0.6
        + (includesAny(speech, ['灾', '疫', '边患', '淮南', '河西', '河北', '流民']) ? 0.18 : 0),
    )

    const structuralPenetration = clamp01(
        0.05
        + scoreMatches(speech, structuralWords) * 0.8
        + (params.relatedNpc ? 0.08 : 0),
    )

    const executability = clamp01(
        0.08
        + (speech.length >= 18 ? 0.18 : 0)
        + (speech.length >= 34 ? 0.12 : 0)
        + scoreMatches(speech, executionWords) * 0.62,
    )

    const exposureRisk = clamp01(
        scoreMatches(speech, triggerWords) * 0.35
        + scoreMatches(speech, exposureWords) * 0.65
        + (speech.length >= 70 ? 0.08 : 0),
    )

    const dominantIntent: NorthDominantIntent =
        includesAny(speech, ['逼', '胁', '今夜', '立刻']) ? 'threaten'
            : includesAny(speech, ['离间', '猜忌', '互疑', '反压']) ? 'divide'
                : includesAny(speech, ['仓廪', '中枢', '节度', '兵权', '转运', '先']) ? 'strategize'
                    : includesAny(speech, ['体恤', '同忧', '不忍', '委屈']) ? 'empathize'
                        : includesAny(speech, ['可得', '有利', '坐实', '收回']) ? 'induce'
                            : 'neutral'

    const evidence = [
        characterFit >= 0.58 ? '说辞贴近此人心结' : '',
        structuralPenetration >= 0.58 ? '话头已触及权力结构' : '',
        exposureRisk >= 0.58 ? '说辞锋芒过露' : '',
    ].filter(Boolean)

    return normalizeNorthSchemeParse({
        characterFit,
        eventFit,
        structuralPenetration,
        executability,
        exposureRisk,
        dominantIntent,
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
    const thematicFocusBoost =
        /流民|资源/.test(focusText) && includesAny(text, ['流民', '编户', '屯田', '劳力', '口粮', '安置'])
            ? 0.24
            : /门阀|豪族|士族/.test(focusText) && includesAny(text, ['门阀', '地方', '州郡', '掣肘', '反弹'])
                ? 0.2
                : /执行|成本|路径/.test(focusText) && includesAny(text, ['执行', '责任', '州郡', '先', '再', '推诿'])
                    ? 0.18
                    : /财政|国库/.test(focusText) && includesAny(text, ['财政', '国库', '税', '钱', '节流', '开源'])
                        ? 0.18
                        : 0
    const focusAlignment = clamp01(
        0.12
        + scoreMatches(text, focusWords) * 0.72
        + (includesAny(text, ['流民', '门阀', '地方', '执行', '成本', '后勤', '缓急']) ? 0.12 : 0)
        + thematicFocusBoost,
    )

    const executionClarity = clamp01(
        0.08
        + (text.length >= 18 ? 0.16 : 0)
        + (text.length >= 32 ? 0.1 : 0)
        + scoreMatches(text, ['先', '再', '随后', '分州郡', '编户', '屯田', '口粮', '执行责任', '清点']) * 0.72,
    )

    const costAwareness = clamp01(
        scoreMatches(text, ['代价', '风险', '地方', '门阀', '国库', '后勤', '推诿', '反弹', '缓急', '权衡']) * 0.92,
    )

    const legitimacyAlignment = clamp01(
        meta.legitimacyEffect === 'down'
            ? 0.22 + scoreMatches(text, ['高压', '重税', '急征', '严控', '强压']) * 0.7
            : 0.16 + scoreMatches(text, ['安民', '名分', '法统', '秩序', '渐进', '人心', '稳住']) * 0.7,
    )

    const policyStance: PolicyStance =
        includesAny(text, ['急征', '强压', '急攻', '立刻扩军']) ? 'aggressive'
            : includesAny(text, ['权宜', '先救急', '暂借', '先缓']) ? 'expedient'
                : includesAny(text, ['渐进', '安民', '稳住', '先稳']) ? 'conservative'
                    : includesAny(text, ['先', '再', '权衡', '缓急', '执行']) ? 'balanced'
                        : 'neutral'

    const evidence = [
        focusAlignment >= 0.58 ? '附言切中此题关节' : '',
        executionClarity >= 0.58 ? '施行路径较为清楚' : '',
        costAwareness >= 0.52 ? '兼顾了代价与阻力' : '',
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
    speech: string
    relatedNpc?: NPC | null
}): Promise<NorthSchemeParseResult> {
    const roundEvent = ROUND_EVENTS[params.round - 1]
    const aiParsed = await chatCompletionJson<NorthSchemeParseResult>(
        buildNorthSchemeParsePrompt({
            round: params.round,
            npc: params.npc,
            speech: params.speech,
            eventName: roundEvent?.eventName ?? `第${params.round}回合`,
            eventBriefing: roundEvent?.briefing ?? '',
        }),
        { temperature: 0.2, maxTokens: 220, tag: 'north_scheme_parse' },
    )

    if (aiParsed) {
        return normalizeNorthSchemeParse(aiParsed)
    }

    return fallbackNorthParseFromSpeech({
        speech: params.speech,
        npc: params.npc,
        round: params.round,
        relatedNpc: params.relatedNpc,
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

    if (aiParsed) {
        return normalizePolicyReasonParse(aiParsed)
    }

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
