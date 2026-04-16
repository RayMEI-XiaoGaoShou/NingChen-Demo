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

        expect(markup).toContain('这是一场围绕人物、关系、势力与国力展开的二十回合权谋博弈。')
        expect(markup).not.toContain('权谋局')
        expect(markup).not.toContain('看清目标，比急着落子更重要')
        expect(markup).toContain('narrative-utility-row')
        expect(markup).toContain('page-audio-btn')
        expect(markup).toContain('三次施计：每回合必须对三位不同北周朝堂人物或地方军头出手。')
        expect(markup).not.toContain('三次施计：每回合必须对三位不同 NPC 出手。')
        expect(markup).toContain('计谋回报：看北周群臣如何真实回应你的这一步。')
        expect(markup).not.toContain('计谋回报：看 NPC 如何真实回应你的这一步。')
        expect(markup).toContain('真正优秀的计谋，需要先影响人心，再影响该角色所在势力，最后才会对国力产生影响')
        expect(markup).not.toContain('计谋不是直接改数字的按钮，而是一条从人心传到国势的链路。')
        expect(markup).toContain('最后才有资格影响国力：不是每句话都能产生你想要的正面影响，慎之，慎之')
        expect(markup).not.toContain('最后才有资格传到国力层：不是每句好听话都能打到五维。')
    })
})
