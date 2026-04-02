import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { SchemePanel } from './SchemePanel'
import { useGameStore } from '../../stores/gameStore'

describe('SchemePanel layout labels', () => {
    it('uses 叁 for 当前布局 before a second-target step is needed', () => {
        useGameStore.getState().resetGame()
        const markup = renderToStaticMarkup(<SchemePanel />)

        expect(markup).toContain('当前布局')
        expect(markup).toContain('叁')
    })
})
