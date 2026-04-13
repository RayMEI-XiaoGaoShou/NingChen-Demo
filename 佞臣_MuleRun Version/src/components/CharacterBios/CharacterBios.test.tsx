import { beforeEach, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CharacterBios } from './CharacterBios'
import { useGameStore } from '../../stores/gameStore'

describe('CharacterBios copy', () => {
    beforeEach(() => {
        useGameStore.getState().resetGame()
    })

    it('uses the requested hero and panel labels', () => {
        const markup = renderToStaticMarkup(<CharacterBios />)

        expect(markup).not.toContain('character-bios-kicker')
        expect(markup).toContain('narrative-utility-row')
        expect(markup).toContain('data-auto-scroll-speed="12"')
        expect(markup).toContain('class="character-bios-title">北周群像</h1>')
        expect(markup).toContain('朝臣')
        expect(markup).toContain('地方军头')
        expect(markup).toContain('你的辅弼')
        expect(markup).toContain('南朝暗庄')
        expect(markup).toContain('地方军头并不只是边将。他们各自有地盘、有部曲、有算盘，也都在等朝堂给出一个更划算的未来。')
        expect(markup).not.toContain('先认清这盘局里的人')
        expect(markup).not.toContain('先记住谁在争皇权、谁在控政务、谁握兵权、谁藏退路。认清这几张脸，后面的每一手才不至于下偏。')
        expect(markup).not.toContain('边镇棋局')
        expect(markup).not.toContain('暗桩与眼睛')
        expect(markup).not.toContain('局中暗桩')
    })
})
