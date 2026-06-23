import { INITIAL_RELATIONSHIP_EDGES } from '../data/npcRelationships'
import type { NPC, OmenEchoFeedback, RelationshipEdge } from './types'

export interface OmenEchoSpeakerSelection {
    speakerNpc: NPC
    candidateCount: number
    selectionReason: string
    relationSummary: string | null
    candidateScores: Array<{
        npcId: string
        npcName: string
        score: number
        reasons: string[]
    }>
}

export interface OmenEchoFallbackTextInput {
    speakerNpc: Pick<NPC, 'name' | 'title'>
    targetNpc: Pick<NPC, 'name' | 'title' | 'powerBase' | 'externalStatus'>
    round: number
    eventName: string
    eventBriefing: string
    omenText: string
    interpretationText: string
    parseSummary?: string
}

export interface OmenEchoFeedbackPayload {
    feedback: OmenEchoFeedback
    targetNpcId: string
    targetNpcName: string
    targetNpcTitle: string
    targetPowerBase: NPC['powerBase']
    round: number
    eventName: string
    eventBriefing: string
    omenText: string
    interpretationText: string
    parseSummary?: string
    selectionReason: string
    candidateCount: number
}

const RELATIONSHIP_TYPE_WEIGHT: Record<RelationshipEdge['type'], number> = {
    rivalry: 1.8,
    alliance: 2.1,
    dependency: 2.4,
    competition: 1.5,
    channel: 2.2,
    borderBalance: 2.6,
}

const RELATIONSHIP_VISIBILITY_WEIGHT: Record<RelationshipEdge['visibility'], number> = {
    public: 0.35,
    halfHidden: 0.65,
    secret: 1,
}

const COURT_AUTHORITY_KEYWORDS = ['丞相', '中书', '尚书', '都督', '节度', '军']
const EXTERNAL_REACTION_ACTIONS = ['截断粮道', '加派御史监督', '清点军需', '收束诏令']
const INTERNAL_REACTION_ACTIONS = ['收束诏令', '核查账册', '压住旁支', '细究名分']

export function selectOmenEchoSpeaker(params: {
    targetNpc: NPC
    npcs: NPC[]
    relationships?: RelationshipEdge[]
}): OmenEchoSpeakerSelection | null {
    const relationships = params.relationships ?? INITIAL_RELATIONSHIP_EDGES
    const candidates = params.npcs.filter(npc => isValidOmenEchoSpeakerCandidate(npc, params.targetNpc.id))

    if (candidates.length === 0) return null

    const scored = candidates
        .map(npc => {
            const details = scoreOmenEchoSpeakerCandidate({
                candidate: npc,
                targetNpc: params.targetNpc,
                relationships,
            })
            return {
                npc,
                score: details.score,
                reasons: details.reasons,
                relationSummary: details.relationSummary,
            }
        })
        .sort((left, right) => {
            const scoreDelta = right.score - left.score
            if (scoreDelta !== 0) return scoreDelta
            return left.npc.id.localeCompare(right.npc.id)
        })

    const winner = scored[0]
    if (!winner) return null

    return {
        speakerNpc: winner.npc,
        candidateCount: scored.length,
        selectionReason: winner.reasons.join('；'),
        relationSummary: winner.relationSummary,
        candidateScores: scored.map(item => ({
            npcId: item.npc.id,
            npcName: item.npc.name,
            score: roundScore(item.score),
            reasons: item.reasons,
        })),
    }
}

export function buildOmenEchoFallbackText(input: OmenEchoFallbackTextInput): string {
    const speakerLine = `${input.speakerNpc.name}道：${normalizeText(input.omenText) || '此兆不可轻看'}。`
    const interpretationLine = normalizeText(input.interpretationText)
        ? `依我看，${normalizeText(input.interpretationText)}。`
        : '依我看，此事不是寻常风声。'
    const contextLine = `第${input.round}回合，${normalizeText(input.eventName)}，${normalizeText(input.eventBriefing)}。`
    const parseLine = normalizeText(input.parseSummary)
        ? `解析摘要：${normalizeText(input.parseSummary)}。`
        : ''

    const reactionLine = input.targetNpc.powerBase === 'external'
        ? `外镇既有借兵自重之嫌，中枢当先${EXTERNAL_REACTION_ACTIONS.join('、')}，不可任其坐大。`
        : `此事若牵动朝中名分，中枢便该先${INTERNAL_REACTION_ACTIONS.join('、')}，免得裂缝扩开。`

    return [speakerLine, interpretationLine, contextLine, parseLine, reactionLine]
        .filter(Boolean)
        .join('')
}

export function buildOmenEchoFeedbackPayload(params: {
    speakerNpc: Pick<NPC, 'id' | 'name' | 'title'>
    targetNpc: Pick<NPC, 'id' | 'name' | 'title' | 'powerBase'>
    text: string
    source: OmenEchoFeedback['source']
    round: number
    eventName: string
    eventBriefing: string
    omenText: string
    interpretationText: string
    parseSummary?: string
    selectionReason: string
    candidateCount: number
}): OmenEchoFeedbackPayload {
    return {
        feedback: {
            speakerNpcId: params.speakerNpc.id,
            speakerNpcName: params.speakerNpc.name,
            speakerTitle: params.speakerNpc.title,
            text: params.text,
            source: params.source,
        },
        targetNpcId: params.targetNpc.id,
        targetNpcName: params.targetNpc.name,
        targetNpcTitle: params.targetNpc.title,
        targetPowerBase: params.targetNpc.powerBase,
        round: params.round,
        eventName: params.eventName,
        eventBriefing: params.eventBriefing,
        omenText: params.omenText,
        interpretationText: params.interpretationText,
        parseSummary: params.parseSummary,
        selectionReason: params.selectionReason,
        candidateCount: params.candidateCount,
    }
}

function scoreOmenEchoSpeakerCandidate(params: {
    candidate: NPC
    targetNpc: NPC
    relationships: RelationshipEdge[]
}): { score: number; reasons: string[]; relationSummary: string | null } {
    const reasons: string[] = []
    let score = 0

    const relation = scoreRelationshipToTarget(params.candidate.id, params.targetNpc.id, params.relationships)
    if (relation.summary) {
        reasons.push(relation.summary)
        score += relation.score
    }

    if (params.targetNpc.powerBase === 'external') {
        score += 4
        reasons.push('外部目标需要中枢口吻')
    } else if (params.candidate.factionId === params.targetNpc.factionId) {
        score += 2.5
        reasons.push('同派系更容易接住这类回声')
    }

    if (params.candidate.alignmentBias === params.targetNpc.alignmentBias) {
        score += 1.2
        reasons.push('阵营偏向接近')
    }

    score += params.candidate.loyaltyToCourt / 24
    score += params.candidate.militaryPower / 40

    if (params.targetNpc.powerBase === 'external') {
        score += titleAuthorityScore(params.candidate.title) * 0.8
        score += stanceAuthorityScore(params.candidate.publicStance) * 0.45
    } else {
        score += titleAuthorityScore(params.candidate.title) * 0.55
        score += stanceAuthorityScore(params.candidate.publicStance) * 0.35
    }

    if (params.candidate.powerBase !== 'court') {
        score -= 8
        reasons.push('非朝中发声者')
    }

    if (reasons.length === 0) {
        reasons.push('默认朝中排序')
    }

    return {
        score,
        reasons,
        relationSummary: relation.summary,
    }
}

function scoreRelationshipToTarget(
    candidateNpcId: string,
    targetNpcId: string,
    relationships: RelationshipEdge[],
): { score: number; summary: string | null } {
    const matchingEdges = relationships.filter(edge =>
        (edge.fromNpcId === candidateNpcId && edge.toNpcId === targetNpcId) ||
        (edge.fromNpcId === targetNpcId && edge.toNpcId === candidateNpcId),
    )

    if (matchingEdges.length === 0) {
        return { score: 0, summary: null }
    }

    const bestEdge = matchingEdges
        .slice()
        .sort((left, right) => {
            const scoreDelta = relationshipEdgeScore(right) - relationshipEdgeScore(left)
            if (scoreDelta !== 0) return scoreDelta
            return left.id.localeCompare(right.id)
        })[0]

    const relationScore = matchingEdges.reduce((total, edge) => total + relationshipEdgeScore(edge), 0)
    const relationSummary = `有${relationLabel(bestEdge)}关系`

    return {
        score: relationScore,
        summary: relationSummary,
    }
}

function relationshipEdgeScore(edge: RelationshipEdge): number {
    return (
        RELATIONSHIP_TYPE_WEIGHT[edge.type] * 2 +
        RELATIONSHIP_VISIBILITY_WEIGHT[edge.visibility] +
        Math.abs(edge.strength) * 1.4
    )
}

function relationLabel(edge: RelationshipEdge): string {
    switch (edge.type) {
        case 'rivalry':
            return '对峙'
        case 'alliance':
            return '结盟'
        case 'dependency':
            return '牵制'
        case 'competition':
            return '争衡'
        case 'channel':
            return '通道'
        case 'borderBalance':
            return '边防'
        default:
            return '往来'
    }
}

function titleAuthorityScore(title: string): number {
    const normalizedTitle = String(title ?? '')
    return COURT_AUTHORITY_KEYWORDS.reduce((score, keyword) => (
        normalizedTitle.includes(keyword) ? score + 1 : score
    ), 0)
}

function stanceAuthorityScore(publicStance: string): number {
    const normalizedStance = String(publicStance ?? '')
    return ['中枢', '诏令', '军需', '粮道', '节制', '安内'].reduce((score, keyword) => (
        normalizedStance.includes(keyword) ? score + 1 : score
    ), 0)
}

function isValidOmenEchoSpeakerCandidate(npc: NPC, targetNpcId: string): boolean {
    return (
        npc.id !== targetNpcId &&
        npc.powerBase === 'court' &&
        npc.isAlive &&
        (npc.courtStatus ?? 'active') === 'active' &&
        npc.name.trim().length > 0 &&
        npc.title.trim().length > 0 &&
        npc.availableSchemes.length > 0
    )
}

function normalizeText(text: string | undefined): string {
    return text?.trim() ?? ''
}

function roundScore(value: number): number {
    return Math.round(value * 100) / 100
}
