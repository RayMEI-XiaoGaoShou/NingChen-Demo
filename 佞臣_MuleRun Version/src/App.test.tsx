import { beforeEach, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import App from './App'
import { useGameStore } from './stores/gameStore'
import { useMediaStore } from './stores/mediaStore'

describe('App prologue flow', () => {
    beforeEach(() => {
        useGameStore.getState().resetGame()
        useMediaStore.setState({
            isMuted: true,
            audioReady: false,
            currentTrack: null,
            playbackRequestToken: 0,
        })
    })

    it('shows the cover page before the prologue when no save snapshot exists', () => {
        const markup = renderToStaticMarkup(<App />)

        expect(markup).toContain('开始游戏')
        expect(markup).toContain('加载存档')
    })

    it('shows the audio control as unmute when the game starts muted', () => {
        const markup = renderToStaticMarkup(<App />)

        expect(markup).toContain('开声')
    })
})
