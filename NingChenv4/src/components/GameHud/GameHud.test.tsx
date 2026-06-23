import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
// @ts-ignore - Vitest source-contract tests can read local CSS without adding Node types to the app.
import { readFileSync } from 'fs'
import { HudStatusChip } from './GameHud'

const gameHudCss = readFileSync(new URL('./GameHud.css', import.meta.url), 'utf8')

describe('GameHud typography', () => {
    it('wraps slash-separated HUD quotas as one Arial run', () => {
        const markup = renderToStaticMarkup(<HudStatusChip label="计谋" value="3/3" />)

        expect(markup).toContain('<span class="ui-number">3/3</span>')
        expect(markup).not.toContain('<span class="ui-number">3</span>/<span class="ui-number">3</span>')
    })

    it('keeps HUD text in the shared calligraphy font while numeric spans use Arial tabular numbers', () => {
        expect(gameHudCss).toContain('.game-hud-status-label')
        expect(gameHudCss).toContain('font-family: var(--font-calligraphy)')
        expect(gameHudCss).toContain('.game-hud-status-value')
        expect(gameHudCss).toContain('.game-hud-status-value .ui-number')
        expect(gameHudCss).toContain('font-family: Arial, Helvetica, sans-serif;')
        expect(gameHudCss).toContain('font-variant-numeric: tabular-nums;')
    })
})

describe('GameHud art-backed controls', () => {
    it('renders HUD icon buttons as pure art-frame buttons without CSS fill layers', () => {
        const iconButtonRule = gameHudCss.match(/\.game-hud-icon-button \{[\s\S]*?\n\}/)?.[0] ?? ''

        expect(iconButtonRule).toContain("background-image: url('../../assets/ui/hud/hud-button-frame.webp');")
        expect(iconButtonRule).toContain('background-position: center;')
        expect(iconButtonRule).toContain('background-size: 100% 100%;')
        expect(iconButtonRule).not.toContain('radial-gradient')
        expect(iconButtonRule).not.toContain('linear-gradient')
        expect(iconButtonRule).not.toContain('box-shadow')
    })
})
