import { beforeEach, describe, expect, it } from 'vitest'
import { useMediaStore } from './mediaStore'

describe('mediaStore defaults', () => {
    beforeEach(() => {
        useMediaStore.setState({
            isMuted: false,
            audioReady: false,
            currentTrack: null,
            playbackRequestToken: 0,
        })
    })

    it('starts unmuted so the game defaults to bgm enabled', () => {
        expect(useMediaStore.getState().isMuted).toBe(false)
    })

    it('can request playback without requiring mute state changes first', () => {
        useMediaStore.getState().requestPlayback()
        expect(useMediaStore.getState().playbackRequestToken).toBe(1)
    })
})
