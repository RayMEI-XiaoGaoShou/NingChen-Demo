import { beforeEach, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import App from './App'
import { useGameStore } from './stores/gameStore'
import { useMediaStore } from './stores/mediaStore'

describe('App prologue flow', () => {
    beforeEach(() => {
        useGameStore.getState().resetGame()
        useMediaStore.setState({
            isMuted: false,
            audioReady: false,
            currentTrack: null,
            playbackRequestToken: 0,
        })
    })

    it('shows the prologue before the round loop when no resume snapshot exists', () => {
        const markup = renderToStaticMarkup(<App />)

        expect(markup).toContain('纷乱之世')
        expect(markup).toContain('继续')
    })

    it('shows the audio control as mute when the game starts unmuted', () => {
        const markup = renderToStaticMarkup(<App />)

        expect(markup).toContain('静音')
    })
})
