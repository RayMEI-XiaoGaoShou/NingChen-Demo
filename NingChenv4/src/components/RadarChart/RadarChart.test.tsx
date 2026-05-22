import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
// @ts-ignore - Vitest source-contract tests can read local CSS without adding Node types to the app.
import { readFileSync } from 'fs'
import { RadarChart } from './RadarChart'

const radarChartCss = readFileSync(new URL('./RadarChart.css', import.meta.url), 'utf8')

describe('RadarChart', () => {
    it('keeps text labels in the shared calligraphy font and values in Arial', () => {
        expect(radarChartCss).toContain('font-family: var(--font-calligraphy)')
        expect(radarChartCss).toContain('font-family: Arial, Helvetica, sans-serif;')
    })

    it('renders the compact chart without footer pills or center label text', () => {
        const markup = renderToStaticMarkup(
            <RadarChart
                size={244}
                data={{
                    finance: 70,
                    grain: 64,
                    military: 81,
                    socialOrder: 59,
                    governance: 67,
                }}
            />,
        )

        expect(markup).toContain('radar-shell')
        expect(markup).toContain('军事')
        expect(markup).toContain('radar-center-score')
        expect(markup).not.toContain('radar-footer')
        expect(markup).not.toContain('radar-center-label')
        expect(markup).not.toContain('五维均势')
        expect(markup).not.toContain('国势')
    })

    it('renders the war board variant with icon labels and point values', () => {
        const markup = renderToStaticMarkup(
            <RadarChart
                size={258}
                variant="warBoard"
                tone="south"
                dimensionIcons={{ finance: '/finance.png', governance: '/governance.png' }}
                data={{
                    finance: 70,
                    grain: 64,
                    military: 81,
                    socialOrder: 59,
                    governance: 67,
                }}
            />,
        )

        expect(markup).toContain('radar-chart-war-board')
        expect(markup).toContain('radar-tone-south')
        expect(markup).toContain('radar-chip-icon')
        expect(markup).toContain('radar-chip-pos-top')
        expect(markup).toContain('radar-chip-pos-left')
        expect(markup).toContain('radar-point-value')
        expect(markup).toContain('粮草')
    })
})
