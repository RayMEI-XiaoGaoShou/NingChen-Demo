// ========================================
// 朝堂势力初始数据
// 数据来源：数值初值与阈值表.md §4 + 最新策划口径
// ========================================

import type { Faction } from '../game/types'

export const INITIAL_FACTIONS: Faction[] = [
    {
        id: 'emperor',
        name: '帝党',
        description: '以少帝宇文棣为核心，力图亲政、南征，恢复皇权',
        militaryPower: 64,
        courtInfluence: 60,
        internalStability: 68,
    },
    {
        id: 'empress',
        name: '后党',
        description: '以文明太后贺拔琪为核心，维护摄政权力，主张安内',
        militaryPower: 74,
        courtInfluence: 68,
        internalStability: 58,
    },
]
