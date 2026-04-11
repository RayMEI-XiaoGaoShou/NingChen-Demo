// ========================================
// NPC 状态 Store
// ========================================

import { create } from 'zustand'
import type { NPC } from '../game/types'
import { INITIAL_NPCS } from '../data/npcs'

interface NpcState {
    npcs: NPC[]
    selectedNpcId: string | null   // 当前查看详情的 NPC

    // 动作
    selectNpc: (id: string | null) => void
    getNpcById: (id: string) => NPC | undefined
    resetNpcs: () => void
}

export const useNpcStore = create<NpcState>((set, get) => ({
    npcs: INITIAL_NPCS.map(n => ({ ...n })),
    selectedNpcId: null,

    selectNpc: (id: string | null) => {
        set({ selectedNpcId: id })
    },

    getNpcById: (id: string) => {
        return get().npcs.find(n => n.id === id)
    },

    resetNpcs: () => {
        set({
            npcs: INITIAL_NPCS.map(n => ({ ...n })),
            selectedNpcId: null,
        })
    },
}))
