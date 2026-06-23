import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
// @ts-ignore - Vitest source-contract tests can read local CSS without adding Node types to the app.
import { readFileSync } from 'fs'
import { GameViewport } from './GameViewport'

const gameViewportCss = readFileSync(new URL('./GameViewport.css', import.meta.url), 'utf8').replace(/\r\n/g, '\n')

describe('GameViewport', () => {
    it('renders a full-bleed background layer behind a centered 16:9 design canvas', () => {
        const markup = renderToStaticMarkup(
            <GameViewport
                className="custom-viewport"
                canvasClassName="custom-canvas"
                bleed={<span className="bleed-art" />}
                overlay={<span className="viewport-overlay" />}
            >
                <button>进入朝堂</button>
            </GameViewport>,
        )

        expect(markup).toContain('game-viewport custom-viewport')
        expect(markup).toContain('game-viewport__bleed')
        expect(markup).toContain('bleed-art')
        expect(markup).toContain('game-design-canvas custom-canvas')
        expect(markup).toContain('viewport-overlay')
        expect(markup).toContain('<button>进入朝堂</button>')
    })

    it('uses complete-fit 16:9 sizing on desktop and relaxes to normal document flow on mobile', () => {
        expect(gameViewportCss).toContain('width: 100dvw;')
        expect(gameViewportCss).toContain('height: 100dvh;')
        expect(gameViewportCss).toContain('position: absolute;')
        expect(gameViewportCss).toContain('inset: 0;')
        expect(gameViewportCss).toContain('background-size: cover;')
        expect(gameViewportCss).toContain('aspect-ratio: 16 / 9;')
        expect(gameViewportCss).toContain('width: min(100dvw, calc(100dvh * 16 / 9));')
        expect(gameViewportCss).toContain('height: min(100dvh, calc(100dvw * 9 / 16));')
        expect(gameViewportCss).toContain('--game-canvas-vw: min(1dvw, calc(1dvh * 16 / 9));')
        expect(gameViewportCss).toContain('--game-canvas-vh: min(1dvh, calc(1dvw * 9 / 16));')
        expect(gameViewportCss).toContain('@media (max-width: 1100px)')
        expect(gameViewportCss).toContain('aspect-ratio: auto;')
    })
})
