import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Prologue } from './Prologue'
import { GameplayGuide } from '../GameplayGuide/GameplayGuide'

describe('Prologue content', () => {
    it('renders the prologue headings and vow copy', () => {
        const markup = renderToStaticMarkup(<Prologue />)

        expect(markup).toContain('纷乱之世')
        expect(markup).toContain('十年之诺')
        expect(markup).toContain('十年拆作二十回合')
        expect(markup).toContain('半岁一局')
        expect(markup).toContain('翰林编修')
        expect(markup).toContain('垂帘听政五年')
    })

    it('renders the gameplay guide goals and entry action', () => {
        const markup = renderToStaticMarkup(<GameplayGuide mode="entry" />)

        expect(markup).toContain('你的目标')
        expect(markup).toContain('保全自身')
        expect(markup).toContain('开始入局')
    })
})
