import { beforeEach, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import App from './App'
import { useGameStore } from './stores/gameStore'

describe('App prologue flow', () => {
    beforeEach(() => {
        useGameStore.getState().resetGame()
    })

    it('shows the prologue before the round loop when no resume snapshot exists', () => {
        const markup = renderToStaticMarkup(<App />)

        expect(markup).toContain('纷乱之世')
        expect(markup).toContain('继续')
    })
})
