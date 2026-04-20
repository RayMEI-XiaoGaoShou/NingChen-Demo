import { isTerminalExternalNpc } from '../game/externalStatus'
import type { NPC } from '../game/types'

type RoundTag =
    | 'disaster'
    | 'war'
    | 'border'
    | 'longWar'
    | 'courtSplit'
    | 'localLoss'
    | 'omen'
    | 'purge'

export interface RoundRuleContext {
    round: number
    invasionWindowLabel: string
    emperorPressure: number
    empressPressure: number
    omenNpcIds: string[]
    allowExternalOmen: boolean
    tags: RoundTag[]
    militarySpilloverStrength: 0 | 1 | 2
}

const ROUND_RULES: Record<number, RoundRuleContext> = {
    1: { round: 1, invasionWindowLabel: '璇曟帰鍗囨俯', emperorPressure: 4, empressPressure: 0, omenNpcIds: [], allowExternalOmen: false, tags: [], militarySpilloverStrength: 0 },
    2: { round: 2, invasionWindowLabel: '璇曟帰鍗囨俯', emperorPressure: 6, empressPressure: 1, omenNpcIds: [], allowExternalOmen: false, tags: ['disaster', 'border'], militarySpilloverStrength: 0 },
    3: { round: 3, invasionWindowLabel: '瀹夊唴鍘嬪埗', emperorPressure: 0, empressPressure: 5, omenNpcIds: [], allowExternalOmen: true, tags: ['disaster'], militarySpilloverStrength: 0 },
    4: { round: 4, invasionWindowLabel: '瀹夊唴鍘嬪埗', emperorPressure: 0, empressPressure: 6, omenNpcIds: [], allowExternalOmen: false, tags: ['disaster', 'border', 'war'], militarySpilloverStrength: 1 },
    5: { round: 5, invasionWindowLabel: '瀹夊唴鍘嬪埗', emperorPressure: 1, empressPressure: 4, omenNpcIds: [], allowExternalOmen: false, tags: ['disaster', 'border', 'war'], militarySpilloverStrength: 1 },
    6: { round: 6, invasionWindowLabel: '瀹夊唴鍘嬪埗', emperorPressure: 0, empressPressure: 5, omenNpcIds: [], allowExternalOmen: false, tags: ['disaster', 'war', 'localLoss'], militarySpilloverStrength: 1 },
    7: { round: 7, invasionWindowLabel: '鍧囪　鎽囨憜', emperorPressure: 1, empressPressure: 5, omenNpcIds: [], allowExternalOmen: false, tags: ['war', 'courtSplit'], militarySpilloverStrength: 1 },
    8: { round: 8, invasionWindowLabel: '瀹夊唴鍘嬪埗', emperorPressure: 0, empressPressure: 4, omenNpcIds: [], allowExternalOmen: true, tags: ['disaster'], militarySpilloverStrength: 0 },
    9: { round: 9, invasionWindowLabel: '鍗楀緛楂樺帇', emperorPressure: 7, empressPressure: 1, omenNpcIds: [], allowExternalOmen: false, tags: ['war', 'courtSplit'], militarySpilloverStrength: 1 },
    10: { round: 10, invasionWindowLabel: '鍗楀緛楂樺帇', emperorPressure: 4, empressPressure: 1, omenNpcIds: [], allowExternalOmen: false, tags: ['disaster', 'war'], militarySpilloverStrength: 1 },
    11: { round: 11, invasionWindowLabel: '瀹夊唴鍘嬪埗', emperorPressure: 1, empressPressure: 4, omenNpcIds: [], allowExternalOmen: false, tags: ['war', 'courtSplit'], militarySpilloverStrength: 1 },
    12: { round: 12, invasionWindowLabel: '瀹夊唴鍘嬪埗', emperorPressure: 0, empressPressure: 5, omenNpcIds: [], allowExternalOmen: false, tags: ['disaster', 'border', 'war'], militarySpilloverStrength: 1 },
    13: { round: 13, invasionWindowLabel: '瀹夊唴鍘嬪埗', emperorPressure: 0, empressPressure: 4, omenNpcIds: ['zongai', 'hebaqí', 'yuwendi', 'zuting'], allowExternalOmen: false, tags: ['disaster', 'omen'], militarySpilloverStrength: 0 },
    14: { round: 14, invasionWindowLabel: '鍧囪　鎽囨憜', emperorPressure: 3, empressPressure: 3, omenNpcIds: ['zongai', 'hebaqí', 'yuwendi', 'zuting'], allowExternalOmen: false, tags: ['omen', 'courtSplit'], militarySpilloverStrength: 0 },
    15: { round: 15, invasionWindowLabel: '瀹夊唴鍘嬪埗', emperorPressure: 1, empressPressure: 4, omenNpcIds: [], allowExternalOmen: true, tags: ['disaster', 'localLoss'], militarySpilloverStrength: 0 },
    16: { round: 16, invasionWindowLabel: '鍗楀緛楂樺帇', emperorPressure: 8, empressPressure: 2, omenNpcIds: [], allowExternalOmen: false, tags: ['war', 'courtSplit'], militarySpilloverStrength: 2 },
    17: { round: 17, invasionWindowLabel: '鍗楀緛楂樺帇', emperorPressure: 5, empressPressure: 2, omenNpcIds: [], allowExternalOmen: false, tags: ['disaster', 'war', 'longWar'], militarySpilloverStrength: 2 },
    18: { round: 18, invasionWindowLabel: '瀹夊唴鍘嬪埗', emperorPressure: 1, empressPressure: 5, omenNpcIds: [], allowExternalOmen: false, tags: ['disaster', 'border', 'war'], militarySpilloverStrength: 1 },
    19: { round: 19, invasionWindowLabel: '瀹夊唴鍘嬪埗', emperorPressure: 2, empressPressure: 4, omenNpcIds: ['zongai', 'hebaqí', 'yuwendi', 'zuting'], allowExternalOmen: false, tags: ['disaster', 'purge', 'courtSplit', 'omen'], militarySpilloverStrength: 1 },
    20: { round: 20, invasionWindowLabel: '缁堝眬鎽婄墝', emperorPressure: 5, empressPressure: 3, omenNpcIds: ['zongai', 'hebaqí', 'yuwendi', 'zuting'], allowExternalOmen: false, tags: ['war', 'courtSplit', 'omen', 'purge'], militarySpilloverStrength: 2 },
}

const DEFAULT_RULE: RoundRuleContext = {
    round: 0,
    invasionWindowLabel: '鍧囪　鎽囨憜',
    emperorPressure: 0,
    empressPressure: 0,
    omenNpcIds: [],
    allowExternalOmen: false,
    tags: [],
    militarySpilloverStrength: 0,
}

export function getRoundRuleContext(round: number): RoundRuleContext {
    return ROUND_RULES[round] ?? { ...DEFAULT_RULE, round }
}

export function isDisasterRound(round: number): boolean {
    return getRoundRuleContext(round).tags.includes('disaster')
}

export function getMilitarySpilloverStrength(round: number): 0 | 1 | 2 {
    return getRoundRuleContext(round).militarySpilloverStrength
}

export function isOmenAvailableForNpc(
    round: number,
    npc: Pick<NPC, 'id' | 'powerBase' | 'externalStatus'>,
): boolean {
    const context = getRoundRuleContext(round)
    if (npc.powerBase === 'court') {
        return context.omenNpcIds.includes(npc.id)
    }

    if (npc.powerBase === 'external') {
        return context.allowExternalOmen && !isTerminalExternalNpc(npc)
    }

    return false
}

export function roundSupportsExternalAction(round: number, action: 'secession' | 'rebellion'): boolean {
    const tags = getRoundRuleContext(round).tags
    if (action === 'secession') {
        return tags.some(tag => ['border', 'war', 'longWar', 'courtSplit', 'localLoss', 'purge'].includes(tag))
    }
    return tags.some(tag => ['war', 'longWar', 'border', 'courtSplit', 'localLoss', 'purge'].includes(tag))
}
