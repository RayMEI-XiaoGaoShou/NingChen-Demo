import { beforeEach, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { GameplayGuide } from './GameplayGuide'
import { useGameStore } from '../../stores/gameStore'

describe('GameplayGuide copy', () => {
    beforeEach(() => {
        useGameStore.getState().resetGame()
    })

    it('uses the updated summary and scheme bullet copy', () => {
        const markup = renderToStaticMarkup(<GameplayGuide mode="entry" />)

        expect(markup).toContain('这是一场围绕人物、关系、派系与战局展开的二十回合权谋博弈。')
        expect(markup).not.toContain('权谋局')
        expect(markup).not.toContain('看清目标，比急着落子更重要')
        expect(markup).toContain('narrative-utility-row')
        expect(markup).toContain('page-audio-btn')
        expect(markup).toContain('三次施计：每回合必须对三位不同 NPC 出手。')
        expect(markup).toContain('计谋回报：看 NPC 如何真实回应你的这一步。')
        expect(markup).toContain('计谋不是按一下就掉数值的按钮。你说的每一句话，会先影响人物，再影响关系和派系，最后才可能传导到北周的国力。')
        expect(markup).toContain('第一步，先说动人：你的说辞要切中对方的处境、利益或顾虑。人都没说动，后面什么都不会发生。')
        expect(markup).toContain('所以每一步计谋大致可分三种效果：直接削弱国力、对关系和派系施压、推动某个关键条件更接近触发。分清这三种，复盘时就容易看懂结算页。')
    })
})
