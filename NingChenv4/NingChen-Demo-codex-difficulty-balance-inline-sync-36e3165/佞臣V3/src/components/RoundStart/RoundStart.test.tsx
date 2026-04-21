import { beforeEach, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
// @ts-ignore - Vitest source-contract tests can read local CSS without adding Node types to the app.
import { readFileSync } from 'fs'
import { getCampaignMomentumSurface } from '../../game/campaignMomentum'
import { RoundStart, shouldUseCompactRoundStartLayout } from './RoundStart'
import { useGameStore } from '../../stores/gameStore'
import { useMediaStore } from '../../stores/mediaStore'
import roundStartSource from './RoundStart.tsx?raw'

const roundStartStyles = readFileSync(new URL('./RoundStart.css', import.meta.url), 'utf8')

describe('RoundStart compact layout', () => {
    beforeEach(() => {
        useGameStore.getState().resetGame()
        useGameStore.setState({
            currentPhase: 'ROUND_START',
            prologueStep: 'INGAME',
        })
        useMediaStore.setState({
            isMuted: true,
            audioReady: false,
            currentTrack: null,
            playbackRequestToken: 0,
        })
    })

    it('renders the compact single-screen layout with labeled adviser hints', () => {
        useGameStore.setState({ currentRound: 1 })

        const markup = renderToStaticMarkup(<RoundStart />)

        expect(markup).toContain('roundstart-toolbar')
        expect(markup).toContain('page-audio-btn')
        expect(markup).toContain('roundstart-title-line')
        expect(markup).toContain('北周风云')
        expect(markup).toContain('南陈时局')
        expect(markup).toContain('国力对照')
        expect(markup).toContain('roundstart-radar-label')
        expect(markup).toContain('天下形势图')
        expect(markup).toContain('冯道之锦囊')
        expect(markup).toContain('roundstart-advisor-portrait roundstart-advisor-portrait-large')
        expect(markup).toContain('冯道之画像')
        expect(markup).toContain('朝堂势力：')
        expect(markup).toContain('地方军头：')
        expect(markup).toContain('roundstart-hint-label')
        expect(markup).not.toContain('context-list')
        expect(markup).toContain('入朝')
    })

    it('renders the same compact layout for later rounds', () => {
        useGameStore.setState({ currentRound: 7 })

        const markup = renderToStaticMarkup(<RoundStart />)

        expect(markup).toContain('round-start-compact')
        expect(markup).toContain('roundstart-toolbar')
        expect(markup).toContain('国力对照')
        expect(markup).toContain('朝堂势力：')
        expect(markup).not.toContain('round-header')
        expect(markup).not.toContain('context-list')
    })

    it('wires the compact momentum surface to the shared helper contract', () => {
        expect(roundStartSource).toContain('getCampaignMomentumSurface(currentRound, shuMomentum, huainanMomentum)')
        expect(roundStartSource).toContain('战役动量')
        expect(roundStartSource).toContain('campaignMomentumSurface.theaterLabel')
        expect(roundStartSource).toContain('campaignMomentumSurface.label')
        expect(roundStartSource).toContain('campaignMomentumSurface.summary')

        expect(getCampaignMomentumSurface(7, 0.56, 0)).toEqual(
            expect.objectContaining({
                theaterLabel: '蜀地方向',
                label: '已见成势',
            }),
        )

        expect(getCampaignMomentumSurface(14, 0.56, 0.88)).toEqual(
            expect.objectContaining({
                theaterLabel: '淮南方向',
                label: '得手在即',
            }),
        )
    })

    it('labels round-start carryover effects by their source system', () => {
        expect(roundStartSource).toContain('战役回响')
        expect(roundStartSource).toContain('问政余波')
        expect(roundStartSource).toContain('朝局反噬')
        expect(roundStartSource).not.toContain('上回合余波')
        expect(roundStartSource).not.toContain('朝中余波')
    })

    it('uses the compact layout for every round start', () => {
        expect(shouldUseCompactRoundStartLayout(1)).toBe(true)
        expect(shouldUseCompactRoundStartLayout(2)).toBe(true)
        expect(shouldUseCompactRoundStartLayout(8)).toBe(true)
        expect(shouldUseCompactRoundStartLayout(20)).toBe(true)
    })

    it('lets the compact briefing follow content height instead of stretching empty space', () => {
        expect(roundStartStyles).toContain('grid-template-rows: auto auto auto minmax(0, 1fr) auto;')
        expect(roundStartStyles).toContain('grid-template-rows: auto auto;')
        expect(roundStartStyles).toContain('align-content: start;')
        expect(roundStartStyles).not.toContain('grid-template-rows: minmax(0, 1fr) auto;')
    })
})
