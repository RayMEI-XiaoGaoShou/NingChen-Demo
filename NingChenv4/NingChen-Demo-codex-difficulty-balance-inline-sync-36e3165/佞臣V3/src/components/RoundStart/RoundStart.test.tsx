import { beforeEach, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
// @ts-ignore - Vitest source-contract tests can read local CSS without adding Node types to the app.
import { readFileSync } from 'fs'
import { buildCampaignRecordPanel } from '../../game/campaignRecordBoard'
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

    it('lets the compact briefing follow content height instead of stretching empty space', () => {
        expect(roundStartStyles).toContain('grid-template-rows: auto auto auto minmax(0, 1fr) auto;')
        expect(roundStartStyles).toContain('grid-template-rows: auto auto;')
        expect(roundStartStyles).toContain('align-content: start;')
        expect(roundStartStyles).not.toContain('grid-template-rows: minmax(0, 1fr) auto;')
    })
})
