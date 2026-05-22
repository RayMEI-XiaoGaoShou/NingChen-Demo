import { create } from 'zustand'
import type { BgmTrackKey } from '../data/mediaAssets'

interface MediaState {
    isMuted: boolean
    audioReady: boolean
    currentTrack: BgmTrackKey | null
    playbackRequestToken: number
    voiceDuckingCount: number
    setMuted: (isMuted: boolean) => void
    setAudioReady: (ready: boolean) => void
    setCurrentTrack: (track: BgmTrackKey | null) => void
    requestPlayback: () => void
    beginVoiceDucking: () => void
    endVoiceDucking: () => void
    resetVoiceDucking: () => void
}

export const useMediaStore = create<MediaState>((set) => ({
    isMuted: true,
    audioReady: false,
    currentTrack: null,
    playbackRequestToken: 0,
    voiceDuckingCount: 0,

    setMuted: (isMuted) => {
        set({ isMuted })
    },

    setAudioReady: (audioReady) => set({ audioReady }),

    setCurrentTrack: (currentTrack) => set(state => (
        state.currentTrack === currentTrack ? state : { currentTrack }
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
}))
