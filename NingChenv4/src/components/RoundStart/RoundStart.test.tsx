import { beforeEach, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
// @ts-ignore - Vitest source-contract tests can read local CSS without adding Node types to the app.
import { readFileSync } from 'fs'
import {
    resolveCompactRoundStartMapSrc,
    RoundStart,
    splitRoundStartBriefingDateLead,
} from './RoundStart'
import { useGameStore } from '../../stores/gameStore'
import { useMediaStore } from '../../stores/mediaStore'
import roundStartSource from './RoundStart.tsx?raw'

const normalizeLineEndings = (value: string) => value.replace(/\r\n/g, '\n')

const roundStartStyles = normalizeLineEndings(readFileSync(new URL('./RoundStart.css', import.meta.url), 'utf8'))

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
            voiceDuckingCount: 0,
            sfxPlaybackLockCount: 0,
        })
    })

    it('renders the compact single-screen layout with only approved art and core diagrams', () => {
        useGameStore.setState({ currentRound: 1 })

        const markup = renderToStaticMarkup(<RoundStart />)

        expect(markup).toContain('game-viewport roundstart-viewport')
        expect(markup).not.toContain('game-viewport roundstart-viewport page-container')
        expect(markup).not.toContain('game-viewport roundstart-viewport page-container round-start')
        expect(markup).toContain('roundstart-bleed')
        expect(markup).toContain('game-design-canvas roundstart-design-canvas')
        expect(markup).toContain('roundstart-canvas-content round-start')
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
        expect(markup).toContain('roundstart-map-container')
        expect(markup).toContain('roundstart-world-map-aiart-v1.webp')
        expect(markup).not.toContain('朝堂势力')
        expect(markup).not.toContain('冯道之锦囊')
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
        expect(markup).not.toContain('冯道之锦囊')
    })

    it('routes entering court through the north court entry scene transition', () => {
        expect(roundStartSource).toContain("import { useSceneTransition } from '../SceneTransition/SceneTransition'")
        expect(roundStartSource).toContain("import { useGameSfx } from '../../audio/gameSfx'")
        expect(roundStartSource).toContain('const { runSceneTransition } = useSceneTransition()')
        expect(roundStartSource).toContain('const { playSfx } = useGameSfx()')
        expect(roundStartSource).toContain("playSfx('roundstart-to-court')")
        expect(roundStartSource).toContain("variant: 'north-court-entry'")
        expect(roundStartSource).toContain('onCovered: nextPhase')
        expect(roundStartSource).not.toContain('roundstart-enter-btn" onClick={nextPhase}')
        expect(roundStartSource).not.toContain('btn-enter" onClick={nextPhase}')
    })

    it('highlights reign-date leads in the court briefing paragraphs', () => {
        useGameStore.setState({ currentRound: 1 })

        const markup = renderToStaticMarkup(<RoundStart />)

        expect(markup.match(/roundstart-briefing-date/g)).toHaveLength(2)
        expect(splitRoundStartBriefingDateLead('北周建文五年·初春三月。关中春寒料峭。')).toEqual({
            lead: '北周建文五年·初春三月。',
            rest: '关中春寒料峭。',
        })
        expect(splitRoundStartBriefingDateLead('没有年号的普通段落。正文继续。')).toBeNull()
        expect(roundStartStyles).toContain('.roundstart-single-screen-art .roundstart-briefing-date')
    })

    it('uses selected single-screen art assets for the default round start layout', () => {
        const singleScreenHudButtonRule = roundStartStyles.match(/\.roundstart-single-screen-art \.roundstart-volume-hud \.game-hud-icon-button \{[\s\S]*?\n\}/)?.[0] ?? ''

        expect(roundStartSource).toContain('GameViewport')
        expect(roundStartSource).toContain('className="roundstart-viewport"')
        expect(roundStartSource).not.toContain('className="roundstart-viewport page-container round-start"')
        expect(roundStartSource).toContain('canvasClassName="roundstart-design-canvas page-enter"')
        expect(roundStartStyles).toContain('.roundstart-design-canvas')
        expect(roundStartStyles).toContain('.roundstart-canvas-content')
        expect(roundStartStyles).toContain('--roundstart-canvas-vw: var(--game-canvas-vw);')
        expect(roundStartStyles).toContain('--roundstart-canvas-vh: var(--game-canvas-vh);')
        expect(roundStartStyles).toContain('.round-start-compact.roundstart-game-screen.roundstart-single-screen-art')
        expect(roundStartStyles).toContain('--roundstart-kaiti-font: var(--font-calligraphy);')
        expect(roundStartStyles).toContain('--roundstart-number-font: Arial, Helvetica, sans-serif;')
        expect(roundStartStyles).toContain('font-family: var(--roundstart-kaiti-font);')
        expect(roundStartStyles).toContain('.roundstart-single-screen-art :is(')
        expect(roundStartStyles).toContain('.roundstart-single-screen-art .radar-center-score')
        expect(roundStartStyles).toContain('.roundstart-single-screen-art .game-hud-icon-button')
        expect(roundStartStyles).toContain('.roundstart-single-screen-art .roundstart-map-modal-header h3')
        expect(roundStartStyles).toContain('.roundstart-single-screen-art .radar-center-score,\n.roundstart-single-screen-art .radar-point-value,\n.roundstart-single-screen-art .radar-chip-value')
        expect(roundStartStyles).toContain('font-family: var(--roundstart-number-font);')
        expect(roundStartStyles).toContain('font-variant-numeric: tabular-nums;')
        expect(roundStartStyles).toContain('grid-template-rows: 72px minmax(280px, calc(var(--roundstart-canvas-vh) * 32)) minmax(0, calc(var(--roundstart-canvas-vh) * 48)) 52px;')
        expect(roundStartStyles).toContain('height: 100%;')
        expect(roundStartStyles).toContain('overflow: hidden;')
        expect(roundStartStyles).toContain('.roundstart-single-screen-art .roundstart-scroll-briefing')
        expect(roundStartStyles).toContain('padding: clamp(52px, 4.2vw, 70px) clamp(132px, 9.2vw, 220px) clamp(44px, 3.4vw, 60px);')
        expect(roundStartStyles).toContain('background-image: var(--scroll-art);')
        expect(roundStartStyles).toContain('background-size: 100% 100%;')
        expect(roundStartSource).not.toContain('roundstart-hud-frame-single-screen.webp')
        expect(singleScreenHudButtonRule).toContain("background-image: url('../../assets/ui/hud/hud-button-frame.webp');")
        expect(singleScreenHudButtonRule).toContain('background-position: center;')
        expect(singleScreenHudButtonRule).toContain('background-size: 100% 100%;')
        expect(singleScreenHudButtonRule).not.toContain('radial-gradient')
        expect(singleScreenHudButtonRule).not.toContain('linear-gradient')
        expect(singleScreenHudButtonRule).not.toContain('box-shadow')
    })

    it('uses the temporary large briefing layout while preserving the existing lower-board assets', () => {
        expect(roundStartStyles).toContain('.roundstart-single-screen-art .roundstart-volume-hud')
        expect(roundStartStyles).toContain('background-image: none;')
        expect(roundStartStyles).toContain('width: min(100%, 1760px);')
        expect(roundStartStyles).toContain('max-height: min(100%, 500px);')
        expect(roundStartStyles).toContain('grid-template-rows: 52px minmax(0, 1fr);')
        expect(roundStartStyles).toContain('.roundstart-single-screen-art .roundstart-world-board .roundstart-board-content')
        expect(roundStartStyles).toContain('grid-template-rows: minmax(0, 1fr);')
        expect(roundStartStyles).toContain('padding: 0;')
        expect(roundStartStyles).toContain('.roundstart-single-screen-art .roundstart-world-board::before')
        expect(roundStartStyles).toContain('.roundstart-map-container')
        expect(roundStartStyles).toContain('width: auto;')
        expect(roundStartStyles).toContain('height: 100%;')
        expect(roundStartStyles).toContain('aspect-ratio: 1536 / 1296;')
        expect(roundStartStyles).not.toContain('transform: translateY(clamp(-52px, -4.4vw, -32px));')
        expect(roundStartStyles).not.toContain('height: calc(100% + 36px);')
        expect(roundStartStyles).toContain('object-position: center bottom;')
        expect(roundStartStyles).toContain('.roundstart-map-zoom-trigger')
        expect(roundStartStyles).toContain('.roundstart-map-corner-title')
        expect(roundStartStyles).toContain('right: clamp(18px, 2vw, 34px);')
        expect(roundStartStyles).toContain('bottom: clamp(18px, 2vw, 34px);')
        expect(roundStartStyles).toContain('.roundstart-map-modal-backdrop')
        expect(roundStartStyles).toContain('.roundstart-map-modal-image')
        expect(roundStartStyles).toContain('border: 0;')
        expect(roundStartStyles).toContain('font-size: clamp(1.25rem, 1rem + 1vw, 2.15rem);')
        expect(roundStartStyles).toContain('.roundstart-single-screen-art .roundstart-scroll-briefing::before')
        expect(roundStartStyles).toContain('display: none;')
        expect(roundStartStyles).toContain('justify-content: center;')
        expect(roundStartSource).toContain('useState(false)')
        expect(roundStartSource).toContain('roundstart-map-zoom-trigger')
        expect(roundStartSource).toContain('roundstart-map-corner-title')
        expect(roundStartSource).not.toContain('<h2>天下形势图</h2>')
        expect(roundStartSource).toContain('roundstart-map-modal-backdrop')
        expect(roundStartSource).toContain('role="dialog"')
        expect(roundStartSource).toContain('size={330}')
        expect(roundStartSource).toContain('roundstart-power-north.webp')
        expect(roundStartSource).toContain('roundstart-power-south.webp')
        expect(roundStartSource).toContain('roundstart-board-frame.webp')
        expect(roundStartSource).not.toContain('style={useWireframeLayout ? undefined : framedBoardStyle}')
    })

    it('keeps the lower war-board metric chips in the lower frame pocket without over-lifting them', () => {
        const bottomRightRule = roundStartStyles.match(/\.roundstart-single-screen-art \.radar-chip-war-board\.radar-chip-pos-bottom-right \{[\s\S]*?\n\}/)?.[0] ?? ''
        const bottomLeftRule = roundStartStyles.match(/\.roundstart-single-screen-art \.radar-chip-war-board\.radar-chip-pos-bottom-left \{[\s\S]*?\n\}/)?.[0] ?? ''

        const bottomIconRule = roundStartStyles.match(/\.roundstart-single-screen-art \.radar-chip-pos-bottom-right \.radar-chip-icon,[\s\S]*?\.roundstart-single-screen-art \.radar-chip-pos-bottom-left \.radar-chip-icon \{[\s\S]*?\n\}/)?.[0] ?? ''

        expect(bottomRightRule).toContain('transform: translate(0, clamp(-30px, calc(var(--roundstart-canvas-vh) * -3), -20px));')
        expect(bottomLeftRule).toContain('transform: translate(-100%, clamp(-30px, calc(var(--roundstart-canvas-vh) * -3), -20px));')
        expect(bottomRightRule).not.toContain('scale')
        expect(bottomLeftRule).not.toContain('scale')
        expect(bottomIconRule).toContain('width: 38px;')
        expect(bottomIconRule).toContain('height: 38px;')
    })

    it('uses selected AIART map assets for every compact campaign map state', () => {
        const selectedMapSrc = '/src/assets/ui/round-start/roundstart-world-map-aiart-bashu-v1.webp'

        expect(resolveCompactRoundStartMapSrc(selectedMapSrc)).toBe(selectedMapSrc)
        expect(resolveCompactRoundStartMapSrc(selectedMapSrc)).not.toContain('地图底稿')
    })

})

