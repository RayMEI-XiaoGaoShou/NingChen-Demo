import { beforeEach, describe, expect, it } from 'vitest'
import { useMediaStore } from './mediaStore'

describe('mediaStore defaults', () => {
    beforeEach(() => {
        useMediaStore.setState({
            isMuted: false,
            audioReady: false,
            currentTrack: null,
            playbackRequestToken: 0,
            voiceDuckingCount: 0,
        })
    })

    it('starts unmuted so the game defaults to bgm enabled', () => {
        expect(useMediaStore.getState().isMuted).toBe(false)
    })

    it('can request playback without requiring mute state changes first', () => {
        useMediaStore.getState().requestPlayback()
        expect(useMediaStore.getState().playbackRequestToken).toBe(1)
    })

    it('tracks overlapping voice ducking requests without going below zero', () => {
        useMediaStore.getState().beginVoiceDucking()
        useMediaStore.getState().beginVoiceDucking()

        expect(useMediaStore.getState().voiceDuckingCount).toBe(2)

        useMediaStore.getState().endVoiceDucking()
        expect(useMediaStore.getState().voiceDuckingCount).toBe(1)

        useMediaStore.getState().endVoiceDucking()
        useMediaStore.getState().endVoiceDucking()
        expect(useMediaStore.getState().voiceDuckingCount).toBe(0)
    })

    it('can reset voice ducking when all voice playback is cancelled', () => {
        useMediaStore.getState().beginVoiceDucking()
        useMediaStore.getState().beginVoiceDucking()

        useMediaStore.getState().resetVoiceDucking()

        expect(useMediaStore.getState().voiceDuckingCount).toBe(0)
    })
})
