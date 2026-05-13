// ========================================
// UI 状态 Store
// ========================================

import { create } from 'zustand'

interface UiState {
    // NPC 详情弹窗
    showNpcDetail: boolean
    detailNpcId: string | null

    // 通用提示/对话框
    toastMessage: string | null
    showToast: boolean

    // 动作
    openNpcDetail: (npcId: string) => void
    closeNpcDetail: () => void
    showToastMessage: (msg: string) => void
    hideToast: () => void
}

export const useUiStore = create<UiState>((set) => ({
    showNpcDetail: false,
    detailNpcId: null,
    toastMessage: null,
    showToast: false,

    openNpcDetail: (npcId: string) => {
        set({ showNpcDetail: true, detailNpcId: npcId })
    },

    closeNpcDetail: () => {
        set({ showNpcDetail: false, detailNpcId: null })
    },

    showToastMessage: (msg: string) => {
        set({ toastMessage: msg, showToast: true })
    },

    hideToast: () => {
        set({ showToast: false, toastMessage: null })
    },
}))
