import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { RadarChart } from './RadarChart'

describe('RadarChart', () => {
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
})
