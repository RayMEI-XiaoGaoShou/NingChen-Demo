import { getDifficultyProfile } from './difficulty'
import type { GameDifficulty, NPC } from './types'

type ExternalHintNpc = Pick<
    NPC,
    'id' | 'name' | 'trust' | 'loyaltyToCourt' | 'externalStatus' | 'isAlive' | 'powerBase' | 'highActionBias'
>

function stageHint(label: string, text: string): string {
    return `冯道之密语【${label}】：${text}`
}

export function buildExternalActionStageHint(input: {
    round: number
    npc: ExternalHintNpc
    unlockedSecrets: number
    difficulty: GameDifficulty
}): string | null {
    const { npc, unlockedSecrets, difficulty } = input
    if (!npc.isAlive || npc.powerBase !== 'external') return null
    if (npc.externalStatus === 'secession' || npc.externalStatus === 'rebellion') return null

    const profile = getDifficultyProfile(difficulty)
    const secessionTrust = 72 + profile.externalThresholdOffset.trust
    const secessionLoyalty = 35 + profile.externalThresholdOffset.loyalty
    const rebellionTrust = 85 + profile.externalThresholdOffset.trust
    const rebellionLoyalty = 18 + profile.externalThresholdOffset.loyalty

    if (npc.highActionBias === 'rebellion') {
        if (npc.trust < rebellionTrust) {
            return stageHint('养信', `${npc.name}还在观手，先让他相信你真会替他留退路，不可躁进。`)
        }
        if (unlockedSecrets < 3) {
            return stageHint('探暗线', `${npc.name}的底牌还没摸透，先探暗线，再谈举兵。`)
        }
        if (npc.loyaltyToCourt > rebellionLoyalty) {
            return stageHint('离心', `${npc.name}离翻旗还差一口气，先再逼他与北周失和。`)
        }
        return stageHint('等窗口', `${npc.name}已近可用，只待乱局窗口，再逼他明旗。`)
    }

    if (npc.trust < secessionTrust) {
        return stageHint('养信', `${npc.name}眼下可先养信，尚差最后一层信任火候，未到摊牌之时。`)
    }
    if (unlockedSecrets < 2) {
        return stageHint('探暗线', `${npc.name}话里仍有遮掩，先探暗线，再谈坐据自雄。`)
    }
    if (npc.loyaltyToCourt > secessionLoyalty) {
        return stageHint('离心', `${npc.name}离心尚浅，不妨再敲打朝廷与边镇的裂缝。`)
    }
    return stageHint('等窗口', `${npc.name}已近可用，静待窗口回合，再逼他明牌。`)
}

export function buildDominantExternalStageHint(input: {
    round: number
    npcs: ExternalHintNpc[]
    intelProgress: Record<string, number>
    difficulty: GameDifficulty
}): string | null {
    const candidates = input.npcs.filter(
        npc => npc.isAlive && npc.powerBase === 'external' && npc.highActionBias,
    )

    const ranked = candidates
        .map(npc => ({
            npc,
            score:
                npc.trust +
                Math.max(0, 40 - npc.loyaltyToCourt) +
                (input.intelProgress[npc.id] ?? 0) * 8 +
                (npc.externalStatus === 'watchful' ? 6 : 0),
        }))
        .sort((left, right) => right.score - left.score)

    for (const item of ranked) {
        const hint = buildExternalActionStageHint({
            round: input.round,
            npc: item.npc,
            unlockedSecrets: input.intelProgress[item.npc.id] ?? 0,
            difficulty: input.difficulty,
        })
        if (hint) return hint
    }

    return null
}
