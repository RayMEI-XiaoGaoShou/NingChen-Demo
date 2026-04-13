import { beforeEach, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import App, { shouldHideGlobalHeader, shouldUseRoundStartFullscreenShell } from './App'
import { useGameStore } from './stores/gameStore'
import { useMediaStore } from './stores/mediaStore'

describe('App prologue flow', () => {
    beforeEach(() => {
        useGameStore.getState().resetGame()
        useMediaStore.setState({
            isMuted: true,
            audioReady: false,
            currentTrack: null,
            playbackRequestToken: 0,
        })
    })

    it('shows the cover page before the prologue when no save snapshot exists', () => {
        const markup = renderToStaticMarkup(<App />)

        expect(markup).toContain('cover-page')
        expect(markup).toContain('cover-action')
    })

    it('shows the cover audio control when the game starts muted', () => {
        const markup = renderToStaticMarkup(<App />)

        expect(markup).toContain('cover-audio-control')
        expect(markup).toContain('开声')
    })

    it('does not render the global header during the fullscreen cover step', () => {
        const markup = renderToStaticMarkup(<App />)

        expect(markup).not.toContain('app-header')
        expect(markup).toContain('cover-page')
    })

    it('uses the updated cover copy without the old kicker line', () => {
        const markup = renderToStaticMarkup(<App />)

        expect(markup).not.toContain('十年长局 二十回合')
        expect(markup).toContain('溪云初起日沉阁，山雨欲来风满楼')
    })

    it('enables the compact RoundStart shell for every in-game round start', () => {
        expect(shouldUseRoundStartFullscreenShell('INGAME', 'ROUND_START', 1)).toBe(true)
        expect(shouldUseRoundStartFullscreenShell('INGAME', 'ROUND_START', 2)).toBe(true)
        expect(shouldUseRoundStartFullscreenShell('INGAME', 'ROUND_START', 20)).toBe(true)
    })

    it('keeps the standard shell for cover, prologue, and non-round-start phases', () => {
        expect(shouldUseRoundStartFullscreenShell('COVER', 'ROUND_START', 1)).toBe(false)
        expect(shouldUseRoundStartFullscreenShell('PROLOGUE', 'ROUND_START', 1)).toBe(false)
        expect(shouldUseRoundStartFullscreenShell('INGAME', 'COURT_OBSERVE', 1)).toBe(false)
    })

    it('hides the global header for every RoundStart page after the cover', () => {
        expect(shouldHideGlobalHeader('INGAME', 'ROUND_START')).toBe(true)
        expect(shouldHideGlobalHeader('PROLOGUE', 'ROUND_START')).toBe(true)
        expect(shouldHideGlobalHeader('INGAME', 'COURT_OBSERVE')).toBe(true)
        expect(shouldHideGlobalHeader('INGAME', 'SCHEME_PHASE')).toBe(true)
        expect(shouldHideGlobalHeader('INGAME', 'EMPRESS_LETTER')).toBe(true)
        expect(shouldHideGlobalHeader('INGAME', 'SCHEME_FEEDBACK')).toBe(true)
        expect(shouldHideGlobalHeader('INGAME', 'SETTLEMENT')).toBe(true)
        expect(shouldHideGlobalHeader('INGAME', 'ROUND_END')).toBe(true)
        expect(shouldHideGlobalHeader('INGAME', 'ROUND_START_LEGACY')).toBe(true)
        expect(shouldHideGlobalHeader('UNKNOWN_STEP', 'ROUND_START_LEGACY')).toBe(true)
        expect(shouldHideGlobalHeader('PROLOGUE', 'PROLOGUE')).toBe(true)
        expect(shouldHideGlobalHeader('GAMEPLAY_GUIDE', 'PROLOGUE')).toBe(true)
        expect(shouldHideGlobalHeader('CHARACTER_BIOS', 'PROLOGUE')).toBe(true)
        expect(shouldHideGlobalHeader('INGAME', 'ENDING')).toBe(false)
    })
})
