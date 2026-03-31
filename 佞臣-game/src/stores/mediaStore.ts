import { create } from 'zustand'
import type { BgmTrackKey } from '../data/mediaAssets'

interface MediaState {
    isMuted: boolean
    audioReady: boolean
    currentTrack: BgmTrackKey | null
    playbackRequestToken: number
    setMuted: (isMuted: boolean) => void
    setAudioReady: (ready: boolean) => void
    setCurrentTrack: (track: BgmTrackKey | null) => void
    requestPlayback: () => void
}

export const useMediaStore = create<MediaState>((set) => ({
    isMuted: false,
    audioReady: false,
    currentTrack: null,
    playbackRequestToken: 0,

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
}))
