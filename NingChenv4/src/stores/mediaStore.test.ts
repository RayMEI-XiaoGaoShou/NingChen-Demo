import { beforeEach, describe, expect, it } from 'vitest'
import { useMediaStore } from './mediaStore'

describe('mediaStore defaults', () => {
    beforeEach(() => {
        useMediaStore.setState({
            isMuted: false,
            audioReady: false,
            currentTrack: null,
            bgmSceneContext: null,
            playbackRequestToken: 0,
            voiceDuckingCount: 0,
            sfxPlaybackLockCount: 0,
        })
    })

    it('starts unmuted so the game defaults to bgm enabled', () => {
        expect(useMediaStore.getState().isMuted).toBe(false)
    })

    it('can request playback without requiring mute state changes first', () => {
        useMediaStore.getState().requestPlayback()
        expect(useMediaStore.getState().playbackRequestToken).toBe(1)
    })

    it('tracks the focused BGM scene without changing the current audio track directly', () => {
        useMediaStore.getState().setCurrentTrack('roundCourtOverview')

        useMediaStore.getState().setBgmSceneContext('external-focus')
        expect(useMediaStore.getState().bgmSceneContext).toBe('external-focus')
        expect(useMediaStore.getState().currentTrack).toBe('roundCourtOverview')

        useMediaStore.getState().setBgmSceneContext(null)
        expect(useMediaStore.getState().bgmSceneContext).toBeNull()
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

    it('tracks all-audio SFX locks without going below zero', () => {
        useMediaStore.getState().beginSfxPlaybackLock()
        useMediaStore.getState().beginSfxPlaybackLock()

        expect(useMediaStore.getState().sfxPlaybackLockCount).toBe(2)

        useMediaStore.getState().endSfxPlaybackLock()
        expect(useMediaStore.getState().sfxPlaybackLockCount).toBe(1)

        useMediaStore.getState().endSfxPlaybackLock()
        useMediaStore.getState().endSfxPlaybackLock()
        expect(useMediaStore.getState().sfxPlaybackLockCount).toBe(0)
    })

    it('can reset SFX playback locks when all SFX playback is cancelled', () => {
        useMediaStore.getState().beginSfxPlaybackLock()
        useMediaStore.getState().beginSfxPlaybackLock()

        useMediaStore.getState().resetSfxPlaybackLock()

        expect(useMediaStore.getState().sfxPlaybackLockCount).toBe(0)
    })
})
