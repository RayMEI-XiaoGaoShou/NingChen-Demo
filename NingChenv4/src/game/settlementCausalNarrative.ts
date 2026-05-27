import type { NationDimensions, NPC, OmenEchoFeedback, SchemeAction, SchemeType } from './types'
import type { SchemeResult } from './schemeEngine'
import type { SchemeOutcomeExplanation } from './schemeOutcomeExplanation'

const SCHEME_NAMES: Record<SchemeType, string> = {
    probe: '试探',
    advise: '献策',
    slander: '谗言',
    alienate: '离间',
    frame: '嫁祸',
    proxy: '借刀',
    appeal: '求援',
    omen: '谶纬',
    secession: '煽动割据',
    rebellion: '煽动造反',
}

const DIMENSION_NAMES: Record<keyof NationDimensions, string> = {
    finance: '财政',
    grain: '粮赋',
    military: '军事',
    socialOrder: '社会秩序',
    governance: '治理穿透力',
}

export interface SettlementNpcFeedbackContext {
    id: string
    feedback: string
    omenEcho?: OmenEchoFeedback
}

export interface SchemeCausalEvent {
    id: string
    promptLine: string
    displayLine: string
    quoteCandidate?: SettlementChronicleQuoteCandidate
}

export interface SettlementChronicleQuoteCandidate {
    speakerName: string
    sourceText: string
    schemeIndex: number
    source: 'omen_echo' | 'npc_feedback'
    priorityScore: number
}

export function buildSettlementSchemeCausalEvents(input: {
    actions: SchemeAction[]
    results: SchemeResult[]
    explanations?: SchemeOutcomeExplanation[]
    npcs: NPC[]
    npcFeedbacks?: SettlementNpcFeedbackContext[]
}): SchemeCausalEvent[] {
    const feedbackById = new Map((input.npcFeedbacks ?? []).map(item => [item.id, item] as const))

    return input.results.map((result, index) => {
        const action = input.actions[index]
        const target = action ? input.npcs.find(npc => npc.id === action.targetNpcId) ?? null : null
        const related = action?.relatedNpcId
            ? input.npcs.find(npc => npc.id === action.relatedNpcId) ?? null
            : null
        const feedback = action?.id ? feedbackById.get(action.id) : undefined
        const schemeName = action ? SCHEME_NAMES[action.schemeType] : '计谋'
        const targetName = target?.name ?? '目标人物'
        const relatedName = related?.name
        const effectLine = buildEffectLine(result, target, related)
        const motionLine = result.causalEvent?.motionText || result.npcAction?.text || (action
            ? buildCausalMotion(action, result, targetName, relatedName)
            : result.feedbackText)
        const promptMotionLine = shouldIncludeMotionInChroniclePrompt(result) ? motionLine : ''
        const explanationLine = compactText(
            input.explanations?.[index]?.segments
                .map(segment => `${segment.label}：${segment.text}`)
                .join('；') ?? '',
            140,
        )
        const npcReplyLine = compactText(feedback?.feedback ?? '', 120)
        const omenEchoLine = compactText(feedback?.omenEcho?.text ?? '', 110)
        const playerSpeech = compactText(action?.playerSpeech ?? '', 90)
        const resultLabel = result.success ? '成功' : '失败'
        const relatedPart = relatedName ? `，牵动${relatedName}` : ''
        const quoteCandidate = buildChronicleQuoteCandidate({
            action,
            result,
            targetName,
            feedback,
            index,
        })
        const promptPieces = [
            `计谋${index + 1}：对${targetName}施“${schemeName}”${relatedPart}，${resultLabel}`,
            playerSpeech ? `玩家说辞：“${playerSpeech}”` : '',
            promptMotionLine ? `落地链：${promptMotionLine}` : '',
            npcReplyLine ? `NPC回报：“${npcReplyLine}”` : '',
            omenEchoLine ? `谶纬余音：“${omenEchoLine}”` : '',
            effectLine ? `数值后果：${effectLine}` : '',
            explanationLine ? `可解释性摘要：${explanationLine}` : '',
        ].filter(Boolean)
        const displayLine = [motionLine, effectLine].filter(Boolean).join('；')

        return {
            id: action?.id ?? `${targetName}-${index}`,
            promptLine: promptPieces.join('；'),
            displayLine,
            quoteCandidate,
        }
    })
}

export function selectSettlementChronicleQuoteCandidate(
    events: SchemeCausalEvent[],
): SettlementChronicleQuoteCandidate | null {
    const candidates = events
        .map(event => event.quoteCandidate)
        .filter((candidate): candidate is SettlementChronicleQuoteCandidate => Boolean(candidate?.sourceText.trim()))

    if (candidates.length === 0) return null

    return [...candidates].sort((a, b) => {
        if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore
        return a.schemeIndex - b.schemeIndex
    })[0] ?? null
}

function shouldIncludeMotionInChroniclePrompt(result: SchemeResult): boolean {
    const event = result.causalEvent
    if (!event) return true
    if (event.visibility === 'private') return false
    if (event.eventKind === 'trust_only' || event.eventKind === 'intel_progress') return false
    return true
}

function buildChronicleQuoteCandidate(input: {
    action: SchemeAction | undefined
    result: SchemeResult
    targetName: string
    feedback: SettlementNpcFeedbackContext | undefined
    index: number
}): SettlementChronicleQuoteCandidate | undefined {
    const { action, result, targetName, feedback, index } = input
    if (!action) return undefined

    const omenEchoText = compactText(feedback?.omenEcho?.text ?? '', 120)
    const npcFeedbackText = compactText(feedback?.feedback ?? '', 120)

    if (omenEchoText && feedback?.omenEcho?.speakerNpcName) {
        return {
            speakerName: feedback.omenEcho.speakerNpcName,
            sourceText: omenEchoText,
            schemeIndex: index,
            source: 'omen_echo',
            priorityScore: buildQuotePriorityScore(result, 20),
        }
    }

    if (npcFeedbackText) {
        return {
            speakerName: targetName,
            sourceText: npcFeedbackText,
            schemeIndex: index,
            source: 'npc_feedback',
            priorityScore: buildQuotePriorityScore(result, 10),
        }
    }

    return undefined
}

function buildQuotePriorityScore(result: SchemeResult, sourceScore: number): number {
    const successScore = result.success ? 100 : 0
    const impactScore = hasStrategicImpact(result) ? 30 : hasTrustOnlyImpact(result) ? 10 : 0
    return successScore + impactScore + sourceScore
}

function hasStrategicImpact(result: SchemeResult): boolean {
    if (result.specialAction) return true
    if (Object.values(result.nationEffects).some(value => Boolean(value))) return true
    if (Object.values(result.factionEffects).some(vector => (
        Boolean(vector?.courtInfluence)
        || Boolean(vector?.internalStability)
        || Boolean(vector?.militaryPower)
    ))) return true

    return Boolean(
        result.personEffects.loyaltyDelta
        || result.personEffects.relatedLoyaltyDelta
        || result.personEffects.militaryPowerDelta
        || result.personEffects.relatedMilitaryPowerDelta,
    )
}

function hasTrustOnlyImpact(result: SchemeResult): boolean {
    return Boolean(result.trustChange || result.relatedTrustChange)
}

function buildCausalMotion(
    action: SchemeAction,
    result: SchemeResult,
    targetName: string,
    relatedName?: string,
): string {
    if (!result.success) {
        return `${targetName}没有真正接下这步${SCHEME_NAMES[action.schemeType]}，话头停在席前，尚未转成可见的朝政动作。`
    }

    switch (action.schemeType) {
        case 'probe':
            return `${targetName}多露了半层口风，你由此摸清他眼下最在意的筹码，后续再沿此处发力会更有准头。`
        case 'advise':
            return targetName
                ? `${targetName}认可这道主意对自身有利，开始把算盘往自己一边拨；若此策损及北周整体，亏空便会从他的权位处传出去。`
                : '这道献策被接下，局势开始朝玩家设定的方向偏移。'
        case 'slander':
            return relatedName
                ? `${targetName}对${relatedName}的疑心被挑起，这份疑心会顺着他所在的权力链条继续往御前或帘前传。`
                : `${targetName}心中疑云被挑起，朝局因此多了一道可供玩家借力的暗缝。`
        case 'alienate':
            return relatedName
                ? `${targetName}与${relatedName}之间原有的裂痕被重新撕开，合作关系更难维持，相关派系也会被这道裂口拖累。`
                : `${targetName}身边的旧裂被推深，朝堂协同因此更难维持。`
        case 'frame':
            return `${targetName}被诱着露出破绽，嫌疑开始回落到他自己身上；接下来朝堂看的不只是你的话，而是他为何会失言失态。`
        case 'proxy':
            return relatedName
                ? `${targetName}已被推到可以借刀的位置，若${relatedName}的御前与帘前庇护都已薄弱，收网便可能转成罢黜或处置。`
                : `${targetName}被推上收网的位置，朝堂对目标人物的处置压力随之抬高。`
        case 'appeal':
            return `${targetName}愿意为萧宝颖留下一条退路，这更像是保命筹码，而不是直接伤国的朝政动作。`
        case 'omen':
            return relatedName
                ? `这道谶纬把灾异与名分疑云压到${relatedName}身上，${targetName}的反应会帮助这份疑云在朝中继续扩散。`
                : `这道谶纬被解释为名分或天命出了裂缝，朝中会借它审视${targetName}，外镇则可能被收紧粮道、军需与监军。`
        case 'secession':
            return `${targetName}开始把坐大自保视为更稳的后路，中枢号令对他的约束随之变弱。`
        case 'rebellion':
            return `${targetName}被推向公开举兵的边缘；若能击退平叛军队，便会割据一方，若失手也会迫使北周折损兵粮。`
        default:
            return `${targetName}被这步计谋撬动，局势开始顺着玩家布下的线索往下走。`
    }
}

function buildEffectLine(result: SchemeResult, target: NPC | null, related: NPC | null): string {
    const pieces: string[] = []
    if (result.trustChange !== 0 && target) {
        pieces.push(`${target.name}信任${formatSigned(result.trustChange)}`)
    }
    if (result.relatedTrustChange !== 0 && related) {
        pieces.push(`${related.name}信任${formatSigned(result.relatedTrustChange)}`)
    }
    if (result.personEffects.loyaltyDelta !== 0 && target?.powerBase === 'external') {
        pieces.push(`${target.name}忠诚${formatSigned(result.personEffects.loyaltyDelta)}`)
    }
    if ((result.personEffects.relatedLoyaltyDelta ?? 0) !== 0 && related?.powerBase === 'external') {
        pieces.push(`${related.name}忠诚${formatSigned(result.personEffects.relatedLoyaltyDelta)}`)
    }
    if (result.personEffects.militaryPowerDelta !== 0 && target?.powerBase === 'external') {
        pieces.push(`${target.name}军力${formatSigned(result.personEffects.militaryPowerDelta)}`)
    }
    if ((result.personEffects.relatedMilitaryPowerDelta ?? 0) !== 0 && related?.powerBase === 'external') {
        pieces.push(`${related.name}军力${formatSigned(result.personEffects.relatedMilitaryPowerDelta ?? 0)}`)
    }

    const nationParts = Object.entries(result.nationEffects)
        .filter(([, value]) => Boolean(value))
        .map(([key, value]) => `北周${DIMENSION_NAMES[key as keyof NationDimensions]}${formatSigned(value ?? 0)}`)
    pieces.push(...nationParts)

    if (result.specialAction === 'secession') {
        pieces.push(`${target?.name ?? '地方军头'}转入割据`)
    }
    if (result.specialAction === 'rebellion') {
        pieces.push(`${target?.name ?? '地方军头'}转入造反`)
    }

    return pieces.length > 0 ? pieces.join('，') : '本回合暂无显性数值波动，影响主要留在后续布局里'
}

function compactText(text: string, maxLength: number): string {
    const normalized = text
        .replace(/\s+/g, ' ')
        .replace(/[“”"]/g, '')
        .trim()
    if (normalized.length <= maxLength) return normalized
    return `${normalized.slice(0, maxLength - 1)}…`
}

function formatSigned(value: number): string {
    const rounded = Math.round(value * 10) / 10
    return `${rounded > 0 ? '+' : ''}${rounded}`
}
