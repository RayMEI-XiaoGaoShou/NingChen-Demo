import {
    FIRST_OMEN_TEACHING_CONTENT,
    FIRST_ROUND_GUIDE_CONTENT,
} from '../data/prologueContent'
import { getRoundIntel } from '../data/roundIntel'
import { roundSupportsExternalAction } from '../data/roundRuleConfig'
import { buildExternalLineProgress, type ExternalLineProgress } from './externalLineProgress'
import { isExternalTerminalStatus } from './externalStatus'
import { getHighlightedNpcIds } from './roundIntelEngine'
import type { FirstRoundGuideKey, GameDifficulty, NPC } from './types'

export type FengDaozhiDialoguePortrait = 'default' | 'thinking' | 'warning' | 'stern' | 'soft'
export type FengDaozhiDialogueMood = 'calm' | 'advising' | 'warning' | 'urgent'
export type FengDaozhiDialogueSegment = '首回合引导' | '谶纬引导' | '朝堂势力' | '地方军头'

export interface FengDaozhiDialogueLine {
    id?: string
    text: string
    portrait?: FengDaozhiDialoguePortrait
    mood?: FengDaozhiDialogueMood
    segmentLabel?: FengDaozhiDialogueSegment
    voiceAssetId?: string
    audioKey?: string
}

export interface FengDaozhiDialogueSequence {
    key: string
    title: string
    lines: FengDaozhiDialogueLine[]
    version: number
    summary?: string
    highlightTerms?: string[]
}

export interface FengDaozhiAdvisorKitSection {
    keyNpcIds: string[]
    keyNpcNames: string[]
    summary: string
    lines: FengDaozhiDialogueLine[]
}

export interface FengDaozhiAdvisorKit extends FengDaozhiDialogueSequence {
    round: number
    court: FengDaozhiAdvisorKitSection
    external: FengDaozhiAdvisorKitSection
}

const GUIDE_VERSION = 1
const FIRST_ROUND_GUIDE_AUDIO_START_INDEX: Partial<Record<FirstRoundGuideKey, number>> = {
    round_start: 1,
    court_observe: 3,
    external_faction: 5,
    court_faction: 9,
    npc_detail: 14,
    scheme_phase: 16,
    scheme_card_advise: 19,
    scheme_card_slander: 21,
    scheme_card_alienate: 23,
    scheme_card_frame: 25,
    scheme_card_proxy: 27,
    scheme_card_secession: 29,
    scheme_card_omen: 30,
    empress_letter: 35,
    scheme_feedback: 38,
    empress_reply: 40,
}

export function getFengDaozhiAdvisorKitSeenKey(round: number): string {
    return `round:${round}:advisor_kit:v${GUIDE_VERSION}`
}

export function getFirstRoundGuideSeenKey(key: FirstRoundGuideKey): string {
    return `first-round:${key}:v${GUIDE_VERSION}`
}

function getFirstRoundGuideLineAudioKey(key: FirstRoundGuideKey, lineIndex: number): string | undefined {
    const startIndex = FIRST_ROUND_GUIDE_AUDIO_START_INDEX[key]
    if (!startIndex) return undefined

    return `${String(startIndex + lineIndex).padStart(2, '0')}_${key}_${String(lineIndex + 1).padStart(2, '0')}`
}

export function buildFirstRoundGuideSequence(key: FirstRoundGuideKey): FengDaozhiDialogueSequence {
    const content = FIRST_ROUND_GUIDE_CONTENT[key]
    return {
        key: getFirstRoundGuideSeenKey(key),
        title: content.title,
        version: GUIDE_VERSION,
        highlightTerms: 'highlightTerms' in content ? content.highlightTerms : undefined,
        lines: content.body.map((text, index) => ({
            id: `${key}-${index + 1}`,
            text,
            segmentLabel: '首回合引导',
            mood: index === 0 ? 'advising' : 'calm',
            audioKey: getFirstRoundGuideLineAudioKey(key, index),
        })),
    }
}

export function buildFirstOmenTeachingSequence(): FengDaozhiDialogueSequence {
    const content = FIRST_OMEN_TEACHING_CONTENT
    const segmentLabel: FengDaozhiDialogueSegment = '谶纬引导'
    const lines: FengDaozhiDialogueLine[] = [
        {
            id: 'first-omen-intro',
            text: content.intro,
            segmentLabel,
            mood: 'advising',
        },
        ...content.steps.map((text, index) => ({
            id: `first-omen-step-${index + 1}`,
            text,
            segmentLabel,
            mood: 'calm' as const,
        })),
        ...(content.audienceHints?.map((text, index) => ({
            id: `first-omen-audience-${index + 1}`,
            text,
            segmentLabel,
            mood: 'calm' as const,
        })) ?? []),
        {
            id: 'first-omen-good-omen',
            text: `好例・征兆：${content.goodExample.omen}`,
            segmentLabel,
            mood: 'advising',
        },
        {
            id: 'first-omen-good-interpretation',
            text: `好例・解释：${content.goodExample.interpretation}`,
            segmentLabel,
            mood: 'advising',
        },
        {
            id: 'first-omen-bad-omen',
            text: `坏例・征兆：${content.badExample.omen}`,
            segmentLabel,
            mood: 'warning',
        },
        {
            id: 'first-omen-bad-interpretation',
            text: `坏例・解释：${content.badExample.interpretation}`,
            segmentLabel,
            mood: 'warning',
        },
        {
            id: 'first-omen-bad-why',
            text: content.badExampleWhy,
            segmentLabel,
            mood: 'warning',
        },
        ...content.impactNotes.map((text, index) => ({
            id: `first-omen-impact-${index + 1}`,
            text,
            segmentLabel,
            mood: 'warning' as const,
        })),
    ]

    return {
        key: `onboarding:first_omen_teaching:v${GUIDE_VERSION}`,
        title: content.title,
        version: GUIDE_VERSION,
        lines,
    }
}

function namesFromIds(ids: string[], npcs: NPC[]): string[] {
    const npcById = new Map(npcs.map(npc => [npc.id, npc]))
    return ids
        .map(id => npcById.get(id))
        .filter((npc): npc is NPC => Boolean(npc && npc.isAlive))
        .map(npc => npc.name)
}

function trimSentence(text: string): string {
    return text.replace(/[“”"]/g, '').split(/[；。！？]/)[0]?.trim() || text.trim()
}

function buildCourtSection(round: number, npcs: NPC[]): FengDaozhiAdvisorKitSection {
    const keyNpcIds = getHighlightedNpcIds(round, npcs)
    const keyNpcNames = namesFromIds(keyNpcIds, npcs)
    const intel = getRoundIntel(round)
    const summary = keyNpcNames.length
        ? `朝堂势力：${keyNpcNames.join('、')}`
        : '朝堂势力：本回合先看朝局明面上谁最急、谁最稳。'

    const reactionLines = keyNpcIds.slice(0, 3).map(id => {
        const npc = npcs.find(item => item.id === id)
        if (!npc) return null
        const reaction = trimSentence(intel?.reactions[id] ?? npc.publicStance)
        return `${npc.name}：${reaction}。`
    }).filter((line): line is string => Boolean(line))

    const lines: FengDaozhiDialogueLine[] = [
        {
            id: `round-${round}-court-summary`,
            text: keyNpcNames.length
                ? `公子，此回合朝堂先看 ${keyNpcNames.slice(0, 3).join('、')}。`
                : '公子，此回合朝局未明，先看谁急着把话说满。',
            segmentLabel: '朝堂势力',
            mood: 'advising',
        },
        ...reactionLines.map((text, index) => ({
            id: `round-${round}-court-${index + 1}`,
            text,
            segmentLabel: '朝堂势力' as const,
            mood: 'calm' as const,
        })),
    ]

    return { keyNpcIds, keyNpcNames, summary, lines }
}

function rankExternalProgress(input: {
    round: number
    npcs: NPC[]
    intelProgress: Record<string, number>
    difficulty: GameDifficulty
}): Array<{ npc: NPC; progress: ExternalLineProgress; score: number }> {
    return input.npcs
        .filter(npc =>
            npc.isAlive &&
            npc.powerBase === 'external' &&
            Boolean(npc.highActionBias) &&
            !isExternalTerminalStatus(npc.externalStatus),
        )
        .map(npc => {
            const unlockedSecrets = input.intelProgress[npc.id] ?? 0
            const progress = buildExternalLineProgress({
                round: input.round,
                npc,
                unlockedSecrets,
                difficulty: input.difficulty,
                externalActionEnabled: roundSupportsExternalAction(
                    input.round,
                    npc.highActionBias === 'rebellion' ? 'rebellion' : 'secession',
                ),
            })
            return {
                npc,
                progress,
                score: npc.trust + Math.max(0, 45 - npc.loyaltyToCourt) + unlockedSecrets * 10 + (npc.loyaltyToCourt <= 40 ? 8 : 0),
            }
        })
        .filter((item): item is { npc: NPC; progress: ExternalLineProgress; score: number } => Boolean(item.progress))
        .sort((left, right) => right.score - left.score)
}

function buildExternalSection(input: {
    round: number
    npcs: NPC[]
    intelProgress: Record<string, number>
    difficulty: GameDifficulty
}): FengDaozhiAdvisorKitSection {
    const ranked = rankExternalProgress(input)
    const top = ranked[0]

    if (!top) {
        return {
            keyNpcIds: [],
            keyNpcNames: [],
            summary: '地方军头：暂无明确临界人物。',
            lines: [{
                id: `round-${input.round}-external-none`,
                text: '地方军头此刻还未露出临界之势，先养信、探底，不急摊牌。',
                segmentLabel: '地方军头',
                mood: 'calm',
            }],
        }
    }

    return {
        keyNpcIds: [top.npc.id],
        keyNpcNames: [top.npc.name],
        summary: `地方军头：${top.npc.name}`,
        lines: [
            {
                id: `round-${input.round}-external-summary`,
                text: `${top.npc.name}这条线最该留意，眼下处在“${top.progress.phase}”。`,
                segmentLabel: '地方军头',
                mood: top.progress.windowOpen ? 'warning' : 'advising',
            },
            {
                id: `round-${input.round}-external-gap`,
                text: `${top.progress.summary}${top.progress.gapText} 下一手宜 ${top.progress.nextMoveLabel}。`,
                segmentLabel: '地方军头',
                mood: top.progress.windowOpen ? 'urgent' : 'calm',
            },
        ],
    }
}

export function buildFengDaozhiAdvisorKit(input: {
    round: number
    npcs: NPC[]
    intelProgress: Record<string, number>
    difficulty: GameDifficulty
}): FengDaozhiAdvisorKit {
    const court = buildCourtSection(input.round, input.npcs)
    const external = buildExternalSection(input)
    const lines = [...court.lines, ...external.lines]

    return {
        key: getFengDaozhiAdvisorKitSeenKey(input.round),
        round: input.round,
        title: `第 ${input.round} 回合冯道之锦囊`,
        version: GUIDE_VERSION,
        summary: `${court.summary}；${external.summary}`,
        court,
        external,
        lines,
    }
}

export function buildCourtOverviewFengDaozhiQueue(input: {
    firstRoundGuide: FengDaozhiDialogueSequence | null
    advisorKit: FengDaozhiAdvisorKit | null
    firstRoundGuideSeen: boolean
    advisorKitSeen: boolean
}): FengDaozhiDialogueSequence[] {
    const queue: FengDaozhiDialogueSequence[] = []
    if (input.firstRoundGuide && !input.firstRoundGuideSeen) queue.push(input.firstRoundGuide)
    if (input.advisorKit && !input.advisorKitSeen) queue.push(input.advisorKit)
    return queue
}
