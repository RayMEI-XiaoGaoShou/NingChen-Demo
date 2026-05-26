import { describe, expect, it } from 'vitest'
import {
    applyEmpressPreviewFromSearch,
    isEmpressPreviewSearch,
    parseEmpressPreviewSearch,
    shouldSkipAutosaveForEmpressPreview,
} from './empressPreview'
import { useGameStore } from '../stores/gameStore'

describe('empress dev preview routing', () => {
    it('parses direct preview urls for the empress letter page', () => {
        expect(parseEmpressPreviewSearch('?uiux=empress-letter&round=12')).toEqual({
            target: 'letter',
            round: 12,
            danger: 'safe',
            optionIndex: 0,
            authoredReason: true,
        })
    })

    it('parses direct preview urls for the empress reply page with clamped round and option aliases', () => {
        expect(parseEmpressPreviewSearch('?uiux=empress-reply&round=99&danger=under_review&option=C')).toEqual({
            target: 'reply',
            round: 20,
            danger: 'under_review',
            optionIndex: 2,
            authoredReason: true,
        })
    })

    it('ignores unrelated urls and marks empress preview urls as autosave-safe', () => {
        expect(parseEmpressPreviewSearch('?uiux=court')).toBeNull()
        expect(isEmpressPreviewSearch('?uiux=empress-reply')).toBe(true)
        expect(shouldSkipAutosaveForEmpressPreview('?uiux=empress-reply', true)).toBe(true)
        expect(shouldSkipAutosaveForEmpressPreview('?uiux=empress-reply', false)).toBe(false)
    })

    it('applies a letter preview state without carrying settlement residue', () => {
        applyEmpressPreviewFromSearch('?uiux=empress-letter&round=7')

        const state = useGameStore.getState()
        expect(state.prologueStep).toBe('INGAME')
        expect(state.currentPhase).toBe('EMPRESS_LETTER')
        expect(state.currentRound).toBe(7)
        expect(state.firstRoundGuideSeen.empress_letter).toBe(true)
        expect(state.lastSettlement).toBeNull()
        expect(state.empressReplyRecord).toBeNull()
    })

    it('applies a reply preview state with a deterministic policy report and reply', () => {
        applyEmpressPreviewFromSearch('?uiux=empress-reply&round=20&danger=under_review&option=C')

        const state = useGameStore.getState()
        expect(state.prologueStep).toBe('INGAME')
        expect(state.currentPhase).toBe('EMPRESS_REPLY')
        expect(state.currentRound).toBe(20)
        expect(state.roundStartSnapshot?.playerDangerStage).toBe('under_review')
        expect(state.lastSettlement?.policyReport?.topic).toBe('终局国策')
        expect(state.lastSettlement?.policyReport?.optionLabel).toBe('C')
        expect(state.empressReplyRecord?.sourceRound).toBe(20)
        expect(state.empressReplyRecord?.text).toContain('朕')
    })
})
