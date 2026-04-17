import { buildExternalLineProgress } from './externalLineProgress'
import { roundSupportsExternalAction } from '../data/roundRuleConfig'
import { isExternalTerminalStatus } from './externalStatus'
import type { GameDifficulty, NPC } from './types'

type ExternalHintNpc = Pick<
    NPC,
    'id' | 'name' | 'trust' | 'loyaltyToCourt' | 'externalStatus' | 'isAlive' | 'powerBase' | 'highActionBias'
>

function stageHint(label: string, text: string): string {
    return `冯道之密语·【${label}】：${text}`
}

export function buildExternalActionStageHint(input: {
    round: number
    npc: ExternalHintNpc
    unlockedSecrets: number
    difficulty: GameDifficulty
    externalActionEnabled?: boolean
}): string | null {
    const progress = buildExternalLineProgress({
        round: input.round,
        npc: input.npc,
        unlockedSecrets: input.unlockedSecrets,
        difficulty: input.difficulty,
        externalActionEnabled:
            input.externalActionEnabled ??
            roundSupportsExternalAction(
                input.round,
                input.npc.highActionBias === 'rebellion' ? 'rebellion' : 'secession',
            ),
    })
    if (!progress) return null
    if (input.npc.externalStatus === 'secession' || input.npc.externalStatus === 'rebellion') return null

    return stageHint(progress.phase, `${progress.summary}${progress.gapText} 下一手宜 ${progress.nextMoveLabel}。`)
}

export function buildDominantExternalStageHint(input: {
    round: number
    npcs: ExternalHintNpc[]
    intelProgress: Record<string, number>
    difficulty: GameDifficulty
    externalActionEnabled?: boolean
}): string | null {
    const candidates = input.npcs.filter(
        npc =>
            npc.isAlive &&
            npc.powerBase === 'external' &&
            npc.highActionBias &&
            !isExternalTerminalStatus(npc.externalStatus),
    )

    const ranked = candidates
        .map(npc => {
            const unlockedSecrets = input.intelProgress[npc.id] ?? 0
            const progress = buildExternalLineProgress({
                round: input.round,
                npc,
                unlockedSecrets,
                difficulty: input.difficulty,
                externalActionEnabled:
                    input.externalActionEnabled ??
                    roundSupportsExternalAction(
                        input.round,
                        npc.highActionBias === 'rebellion' ? 'rebellion' : 'secession',
                    ),
            })
            return {
                npc,
                progress,
                score:
                    npc.trust +
                    Math.max(0, 45 - npc.loyaltyToCourt) +
                    unlockedSecrets * 10 +
                    (npc.externalStatus === 'watchful' ? 8 : 0),
            }
        })
        .filter((item): item is typeof item & { progress: NonNullable<typeof item.progress> } => Boolean(item.progress))
        .sort((left, right) => right.score - left.score)

    if (ranked.length === 0) return null
    return stageHint(ranked[0].progress.phase, `${ranked[0].progress.summary}${ranked[0].progress.gapText} 下一手宜 ${ranked[0].progress.nextMoveLabel}。`)
}
