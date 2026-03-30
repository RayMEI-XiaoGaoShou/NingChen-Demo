import { create } from 'zustand'
import type { BgmTrackKey } from '../data/mediaAssets'

const MUTE_STORAGE_KEY = 'ningchen-media-muted'

function loadMutedPreference() {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(MUTE_STORAGE_KEY) === 'true'
}

function persistMutedPreference(isMuted: boolean) {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(MUTE_STORAGE_KEY, String(isMuted))
}

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
    isMuted: loadMutedPreference(),
    audioReady: false,
    currentTrack: null,
    playbackRequestToken: 0,

    setMuted: (isMuted) => {
        persistMutedPreference(isMuted)
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
