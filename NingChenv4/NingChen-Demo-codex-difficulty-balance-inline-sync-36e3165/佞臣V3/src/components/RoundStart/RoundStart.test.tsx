import { beforeEach, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
// @ts-ignore - Vitest source-contract tests can read local CSS without adding Node types to the app.
import { readFileSync } from 'fs'
import { buildCampaignRecordPanel } from '../../game/campaignRecordBoard'
import { getRoundStartLayoutMode, RoundStart, shouldUseCompactRoundStartLayout } from './RoundStart'
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

    it('renders the compact single-screen layout with only approved art and core diagrams', () => {
        useGameStore.setState({ currentRound: 1 })

        const markup = renderToStaticMarkup(<RoundStart />)

        expect(markup).toContain('roundstart-volume-hud')
        expect(markup).toContain('roundstart-volume-seal')
        expect(markup).toContain('page-audio-btn')
        expect(markup).toContain('roundstart-title-line')
        expect(markup).toContain('第一卷')
        expect(markup).not.toContain('第一回合')
        expect(markup).not.toContain('aria-hidden="true">卷</span>')
        expect(markup).toContain('roundstart-scroll-briefing')
        expect(markup).not.toContain('冯道之密札')
        expect(markup).toContain('北周国力')
        expect(markup).toContain('南陈国力')
        expect(markup).not.toContain('北周国力图')
        expect(markup).not.toContain('南陈国力图')
        expect(markup).not.toContain('roundstart-stat-row')
        expect(markup).not.toContain('roundstart-board-score')
        expect(markup).not.toContain('roundstart-footnote-strip')
        expect(markup).toContain('radar-chart-war-board')
        expect(markup).toContain('天下形势图')
        expect(markup).not.toContain('朝堂势力')
        expect(markup).not.toContain('context-list')
        expect(markup).toContain('入朝听政')
    })

    it('renders the same compact layout for later rounds', () => {
        useGameStore.setState({ currentRound: 7 })

        const markup = renderToStaticMarkup(<RoundStart />)

        expect(markup).toContain('round-start-compact')
        expect(markup).toContain('roundstart-volume-hud')
        expect(markup).toContain('北周国力')
        expect(markup).toContain('南陈国力')
        expect(markup).not.toContain('北周国力图')
        expect(markup).not.toContain('南陈国力图')
        expect(markup).not.toContain('朝堂势力')
        expect(markup).not.toContain('round-header')
        expect(markup).not.toContain('context-list')
    })

    it('uses the shared battle record helper instead of directly exposing momentum copy', () => {
        expect(roundStartSource).toContain('buildCampaignRecordPanel({')
        expect(roundStartSource).toContain('campaignRecord.visible')
        expect(roundStartSource).toContain('campaignRecord.title')
        expect(roundStartSource).not.toContain('getCampaignMomentumPresentation(currentRound, shuMomentum, huainanMomentum)')
        expect(roundStartSource).not.toContain('战役回响')

        expect(buildCampaignRecordPanel({
            round: 6,
            surface: 'round_start',
            shuCampaign: useGameStore.getState().shuCampaign,
            huainanCampaign: useGameStore.getState().huainanCampaign,
            shuMomentum: 0.56,
            huainanMomentum: 0,
            campaignReports: [],
        })).toEqual(
            expect.objectContaining({
                visible: true,
                title: '巴蜀之战',
                phase: '战前伏笔汇总',
            }),
        )

        expect(buildCampaignRecordPanel({
            round: 17,
            surface: 'round_start',
            shuCampaign: useGameStore.getState().shuCampaign,
            huainanCampaign: useGameStore.getState().huainanCampaign,
            shuMomentum: 0.56,
            huainanMomentum: 0.88,
            campaignReports: [],
        })).toEqual(
            expect.objectContaining({
                visible: false,
            }),
        )
    })

    it('only shows the battle record board in the configured campaign windows', () => {
        const baseState = useGameStore.getState()

        expect(buildCampaignRecordPanel({
            round: 1,
            surface: 'round_start',
            shuCampaign: baseState.shuCampaign,
            huainanCampaign: baseState.huainanCampaign,
            shuMomentum: 0.56,
            huainanMomentum: 0,
            campaignReports: [],
        })).toEqual(expect.objectContaining({ visible: false }))

        expect(buildCampaignRecordPanel({
            round: 6,
            surface: 'round_start',
            shuCampaign: baseState.shuCampaign,
            huainanCampaign: baseState.huainanCampaign,
            shuMomentum: 0.56,
            huainanMomentum: 0,
            campaignReports: [],
        })).toEqual(expect.objectContaining({ visible: true, title: '巴蜀之战' }))

        expect(buildCampaignRecordPanel({
            round: 10,
            surface: 'round_start',
            shuCampaign: baseState.shuCampaign,
            huainanCampaign: baseState.huainanCampaign,
            shuMomentum: 0.88,
            huainanMomentum: 0,
            campaignReports: [],
        })).toEqual(expect.objectContaining({ visible: true, title: '巴蜀之战' }))

        expect(buildCampaignRecordPanel({
            round: 11,
            surface: 'round_start',
            shuCampaign: baseState.shuCampaign,
            huainanCampaign: baseState.huainanCampaign,
            shuMomentum: 0.88,
            huainanMomentum: 0,
            campaignReports: [],
        })).toEqual(expect.objectContaining({ visible: false }))

        expect(buildCampaignRecordPanel({
            round: 16,
            surface: 'round_start',
            shuCampaign: baseState.shuCampaign,
            huainanCampaign: baseState.huainanCampaign,
            shuMomentum: 0,
            huainanMomentum: 0.72,
            campaignReports: [],
        })).toEqual(expect.objectContaining({ visible: true, title: '淮南之战' }))

        expect(buildCampaignRecordPanel({
            round: 17,
            surface: 'round_start',
            shuCampaign: baseState.shuCampaign,
            huainanCampaign: baseState.huainanCampaign,
            shuMomentum: 0,
            huainanMomentum: 0.72,
            campaignReports: [],
        })).toEqual(expect.objectContaining({ visible: false }))
    })

    it('uses the compact layout for every round start', () => {
        expect(shouldUseCompactRoundStartLayout(1)).toBe(true)
        expect(shouldUseCompactRoundStartLayout(2)).toBe(true)
        expect(shouldUseCompactRoundStartLayout(8)).toBe(true)
        expect(shouldUseCompactRoundStartLayout(20)).toBe(true)
    })

    it('keeps the wireframe layout behind an explicit query parameter', () => {
        expect(getRoundStartLayoutMode()).toBe('art')
        expect(getRoundStartLayoutMode('?roundStartLayout=wireframe')).toBe('wireframe')
        expect(getRoundStartLayoutMode('?roundStartLayout=natural')).toBe('natural')
        expect(getRoundStartLayoutMode('?roundStartLayout=art')).toBe('art')
        expect(roundStartSource).toContain('roundstart-wireframe-screen')
        expect(roundStartSource).toContain('roundstart-natural-art-screen')
        expect(roundStartSource).toContain('roundstart-single-screen-art')
    })

    it('keeps the previous natural-ratio art layout available for comparison', () => {
        expect(roundStartStyles).toContain('min-height: 100dvh;')
        expect(roundStartStyles).toContain('grid-template-rows: auto auto minmax(360px, 1fr) auto;')
        expect(roundStartStyles).toContain('overflow-y: auto;')
        expect(roundStartStyles).toContain('aspect-ratio: 1800 / 194;')
        expect(roundStartStyles).toContain('aspect-ratio: 1600 / 585;')
        expect(roundStartStyles).toContain('background-size: 100% auto;')
        expect(roundStartStyles).toContain('.roundstart-war-board-grid')
        expect(roundStartSource).toContain('roundstart-hud-frame-single-screen.png')
        expect(roundStartSource).toContain('roundstart-briefing-scroll-single-screen.png')
        expect(roundStartSource).toContain('roundstart-hud-strip.png')
        expect(roundStartSource).toContain('roundstart-briefing-scroll.png')
        expect(roundStartSource).toContain('roundstart-volume-seal.png')
        expect(roundStartSource).toContain('roundstart-power-north.jpg')
        expect(roundStartSource).toContain('stat-finance-coin.png')
        expect(roundStartSource).not.toContain('roundstart-scroll-advisor')
        expect(roundStartSource).not.toContain('roundstart-footnote-strip')
        expect(roundStartSource).not.toContain('roundstart-board-score')
        expect(roundStartSource).not.toContain('roundstart-stat-row')
        expect(roundStartStyles).not.toContain('grid-template-rows: minmax(0, 1fr) auto;')
    })

    it('uses selected single-screen art assets for the default round start layout', () => {
        expect(roundStartStyles).toContain('.round-start-compact.roundstart-game-screen.roundstart-single-screen-art')
        expect(roundStartStyles).toContain('grid-template-rows: 76px 138px minmax(0, 1fr) 48px;')
        expect(roundStartStyles).toContain('height: 100dvh;')
        expect(roundStartStyles).toContain('overflow: hidden;')
        expect(roundStartStyles).toContain('.roundstart-single-screen-art .roundstart-scroll-briefing')
        expect(roundStartStyles).toContain('background-size: 100% 100%;')
    })

    it('defines a no-art single-screen wireframe for layout confirmation', () => {
        expect(roundStartStyles).toContain('.round-start-compact.roundstart-game-screen.roundstart-wireframe-screen')
        expect(roundStartStyles).toContain('grid-template-rows: 76px 138px minmax(0, 1fr) 48px;')
        expect(roundStartStyles).toContain('height: 100dvh;')
        expect(roundStartStyles).toContain('background-image: none;')
        expect(roundStartStyles).toContain('.roundstart-wireframe-screen .roundstart-volume-seal')
    })
})
