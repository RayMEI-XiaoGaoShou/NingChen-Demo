import { create } from 'zustand'
import type { BgmTrackKey } from '../data/mediaAssets'

export type BgmSceneContext =
    | 'court-overview'
    | 'court-focus'
    | 'external-focus'
    | 'court-scheme'
    | 'external-scheme'

interface MediaState {
    isMuted: boolean
    audioReady: boolean
    currentTrack: BgmTrackKey | null
    bgmSceneContext: BgmSceneContext | null
    playbackRequestToken: number
    voiceDuckingCount: number
    sfxPlaybackLockCount: number
    setMuted: (isMuted: boolean) => void
    setAudioReady: (ready: boolean) => void
    setCurrentTrack: (track: BgmTrackKey | null) => void
    setBgmSceneContext: (context: BgmSceneContext | null) => void
    requestPlayback: () => void
    beginVoiceDucking: () => void
    endVoiceDucking: () => void
    resetVoiceDucking: () => void
    beginSfxPlaybackLock: () => void
    endSfxPlaybackLock: () => void
    resetSfxPlaybackLock: () => void
}

export const useMediaStore = create<MediaState>((set) => ({
    isMuted: true,
    audioReady: false,
    currentTrack: null,
    bgmSceneContext: null,
    playbackRequestToken: 0,
    voiceDuckingCount: 0,
    sfxPlaybackLockCount: 0,

    setMuted: (isMuted) => {
        set({ isMuted })
    },

    setAudioReady: (audioReady) => set({ audioReady }),

    setCurrentTrack: (currentTrack) => set(state => (
        state.currentTrack === currentTrack ? state : { currentTrack }
    )),

    setBgmSceneContext: (bgmSceneContext) => set(state => (
        state.bgmSceneContext === bgmSceneContext ? state : { bgmSceneContext }
    )),

    requestPlayback: () => set(state => ({
        playbackRequestToken: state.playbackRequestToken + 1,
    })),

    beginVoiceDucking: () => set(state => ({
        voiceDuckingCount: state.voiceDuckingCount + 1,
    })),

    endVoiceDucking: () => set(state => ({
        voiceDuckingCount: Math.max(0, state.voiceDuckingCount - 1),
    })),

    resetVoiceDucking: () => set({ voiceDuckingCount: 0 }),

    beginSfxPlaybackLock: () => set(state => ({
        sfxPlaybackLockCount: state.sfxPlaybackLockCount + 1,
    })),

    endSfxPlaybackLock: () => set(state => ({
        sfxPlaybackLockCount: Math.max(0, state.sfxPlaybackLockCount - 1),
    })),

    resetSfxPlaybackLock: () => set({ sfxPlaybackLockCount: 0 }),
}))
