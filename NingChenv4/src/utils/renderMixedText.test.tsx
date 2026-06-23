import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { renderMixedTextWithNumberSpans } from './renderMixedText'

describe('renderMixedTextWithNumberSpans', () => {
    it('keeps slash-separated Arabic counts inside one number span', () => {
        expect(renderToStaticMarkup(<>{renderMixedTextWithNumberSpans('计谋 3/3')}</>))
            .toContain('计谋 <span class="ui-number">3/3</span>')
    })
})
