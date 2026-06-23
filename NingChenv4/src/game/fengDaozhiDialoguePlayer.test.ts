import { describe, expect, it } from 'vitest'
import { createInitialDialoguePlayerState, getVisibleDialogueText, stepDialoguePlayer } from './fengDaozhiDialoguePlayer'

const lines = [
    { text: '第一句。' },
    { text: '第二句。' },
]

describe('fengDaozhiDialoguePlayer', () => {
    it('starts at the first line with zero visible characters when animated', () => {
        const state = createInitialDialoguePlayerState(lines, false)

        expect(state.lineIndex).toBe(0)
        expect(getVisibleDialogueText(lines, state)).toBe('')
    })

    it('starts with the first line fully visible when reduced motion is enabled', () => {
        const state = createInitialDialoguePlayerState(lines, true)

        expect(state.lineIndex).toBe(0)
        expect(getVisibleDialogueText(lines, state)).toBe('第一句。')
    })

    it('marks empty dialogue lists as done', () => {
        const state = createInitialDialoguePlayerState([], false)

        expect(state.done).toBe(true)
        expect(getVisibleDialogueText([], state)).toBe('')
    })

    it('ticks forward by at least one character and clamps to the current line', () => {
        const shortLines = [{ text: 'abcd' }]
        let state = createInitialDialoguePlayerState(shortLines, false)

        state = stepDialoguePlayer(shortLines, state, 'tick', 0)
        expect(getVisibleDialogueText(shortLines, state)).toBe('a')

        state = stepDialoguePlayer(shortLines, state, 'tick', 2)
        expect(getVisibleDialogueText(shortLines, state)).toBe('abc')

        state = stepDialoguePlayer(shortLines, state, 'tick', 99)
        expect(getVisibleDialogueText(shortLines, state)).toBe('abcd')
    })

    it('completes the current line before advancing', () => {
        const state = createInitialDialoguePlayerState(lines, false)
        const completed = stepDialoguePlayer(lines, state, 'advance')

        expect(completed.lineIndex).toBe(0)
        expect(getVisibleDialogueText(lines, completed)).toBe('第一句。')

        const advanced = stepDialoguePlayer(lines, completed, 'advance')
        expect(advanced.lineIndex).toBe(1)
        expect(getVisibleDialogueText(lines, advanced)).toBe('')
    })

    it('closes after advancing past the final complete line', () => {
        let state = createInitialDialoguePlayerState(lines, true)
        state = stepDialoguePlayer(lines, state, 'advance')
        state = stepDialoguePlayer(lines, state, 'advance')

        expect(state.done).toBe(true)
    })

    it('closes immediately when skipped', () => {
        const state = createInitialDialoguePlayerState(lines, false)
        expect(stepDialoguePlayer(lines, state, 'skip').done).toBe(true)
    })

    it('returns empty visible text when the state points outside the dialogue list', () => {
        expect(getVisibleDialogueText(lines, {
            lineIndex: 99,
            visibleCharacters: 10,
            done: false,
            reducedMotion: false,
        })).toBe('')
    })

    it('returns an already done state unchanged', () => {
        const state = {
            lineIndex: 1,
            visibleCharacters: lines[1].text.length,
            done: true,
            reducedMotion: false,
        }

        expect(stepDialoguePlayer(lines, state, 'advance')).toBe(state)
    })
})
