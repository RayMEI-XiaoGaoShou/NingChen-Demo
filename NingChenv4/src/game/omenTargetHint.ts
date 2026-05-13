import type { NPC } from './types'

export function buildOmenTargetHint(input: {
    npc: Pick<NPC, 'name' | 'title' | 'powerBase' | 'publicStance' | 'factionId'>
}): string {
    const text = `${input.npc.title} ${input.npc.publicStance}`
    const legitimacySensitive =
        input.npc.powerBase === 'court' &&
        /中枢|诏令|太后|皇帝|宫中|法统|名分|摄政|燕王/.test(text)

    if (legitimacySensitive) {
        return '此人身在中枢，对名分与法统压力更敏感，谶纬较易生效。'
    }

    return '此人更偏军政务实，谶纬未必是最优先手。'
}
