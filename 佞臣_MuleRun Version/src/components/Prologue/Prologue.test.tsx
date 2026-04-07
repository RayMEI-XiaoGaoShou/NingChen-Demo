import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Prologue } from './Prologue'
import { GameplayGuide } from '../GameplayGuide/GameplayGuide'
import { CharacterBios } from '../CharacterBios/CharacterBios'

describe('Prologue content', () => {
    it('renders the prologue headings and vow copy', () => {
        const markup = renderToStaticMarkup(<Prologue />)

        expect(markup).toContain('纷乱之世')
        expect(markup).toContain('十年之诺')
        expect(markup).toContain('十年拆作二十回合')
        expect(markup).toContain('你为何入局')
        expect(markup).toContain('保全自身')
        expect(markup).toContain('继续')
    })

    it('renders the gameplay guide goals and entry action', () => {
        const markup = renderToStaticMarkup(<GameplayGuide mode="entry" />)

        expect(markup).toContain('玩法总览')
        expect(markup).toContain('每回合流程')
        expect(markup).toContain('查看北周群像')
    })

    it('renders the character bios grouped by factions', () => {
        const markup = renderToStaticMarkup(<CharacterBios />)

        expect(markup).toContain('北周群像')
        expect(markup).toContain('帝党')
        expect(markup).toContain('后党')
        expect(markup).toContain('陇右勋贵')
        expect(markup).toContain('内附草原势力')
        expect(markup).toContain('冯道之')
    })
})
