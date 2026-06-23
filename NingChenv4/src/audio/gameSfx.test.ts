import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
    GAME_SFX_CONFIG,
    playGameSfx,
    resetGameSfxForTests,
    stopGameSfx,
    stopAllGameSfx,
} from './gameSfx'
import { useMediaStore } from '../stores/mediaStore'

class FakeAudioBufferSourceNode extends EventTarget {
    buffer: AudioBuffer | null = null
    onended: (() => void) | null = null
    connectedTo: unknown = null
    started = false
    stopped = false

    connect(target: unknown) {
        this.connectedTo = target
    }

    start() {
        this.started = true
    }

    stop() {
        this.stopped = true
        this.onended?.()
    }

    emitEnded() {
        this.onended?.()
    }
}

class FakeGainNode {
    gain = { value: 1 }
    connectedTo: unknown = null

    connect(target: unknown) {
        this.connectedTo = target
    }
}

class FakeAudioContext {
    destination = {}
    sources: FakeAudioBufferSourceNode[] = []
    gains: FakeGainNode[] = []
    decoded = {} as AudioBuffer

    createBufferSource() {
        const source = new FakeAudioBufferSourceNode()
        this.sources.push(source)
        return source
    }

    createGain() {
        const gain = new FakeGainNode()
        this.gains.push(gain)
        return gain
    }

    decodeAudioData() {
        return Promise.resolve(this.decoded)
    }
}

describe('game SFX player', () => {
    let audioContext: FakeAudioContext
    let fetchMock: ReturnType<typeof vi.fn>

    beforeEach(() => {
        audioContext = new FakeAudioContext()
        fetchMock = vi.fn(() => Promise.resolve({
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        }))

        vi.stubGlobal('AudioContext', vi.fn(function AudioContextMock() {
            return audioContext
        }))
        vi.stubGlobal('fetch', fetchMock)
        resetGameSfxForTests()
        useMediaStore.setState({
            isMuted: false,
            audioReady: false,
            currentTrack: null,
            playbackRequestToken: 0,
            voiceDuckingCount: 0,
            sfxPlaybackLockCount: 0,
        })
    })

    it('keeps boosted button files as runtime gain instead of editing source assets', () => {
        expect(GAME_SFX_CONFIG['north-page-action'].gain).toBeGreaterThan(1)
        expect(GAME_SFX_CONFIG['north-inline-action'].gain).toBeGreaterThan(1)
        expect(GAME_SFX_CONFIG['roundstart-to-court'].category).toBe('transition')
        expect(GAME_SFX_CONFIG['roundstart-to-court'].blocksAllAudio).toBe(true)
        expect(GAME_SFX_CONFIG['settlement-next-volume'].blocksAllAudio).toBe(true)
        expect(GAME_SFX_CONFIG['empress-next-page'].blocksAllAudio).toBe(true)
    })

    it('plays through Web Audio and releases BGM ducking when the sound ends', async () => {
        await playGameSfx('north-page-action')

        expect(fetchMock).toHaveBeenCalledWith('/audio/sfx/buttons/north-page-action.mp3')
        expect(audioContext.sources).toHaveLength(1)
        expect(audioContext.gains[0]?.gain.value).toBe(GAME_SFX_CONFIG['north-page-action'].gain)
        expect(useMediaStore.getState().voiceDuckingCount).toBe(1)

        audioContext.sources[0].emitEnded()

        expect(useMediaStore.getState().voiceDuckingCount).toBe(0)
    })

    it('does not play or duck when global audio is muted', async () => {
        useMediaStore.setState({ isMuted: true })

        await playGameSfx('roundstart-to-court')

        expect(fetchMock).not.toHaveBeenCalled()
        expect(audioContext.sources).toHaveLength(0)
        expect(useMediaStore.getState().voiceDuckingCount).toBe(0)
    })

    it('does not stack transition-category SFX while one is active', async () => {
        await playGameSfx('roundstart-to-court')
        await playGameSfx('settlement-next-volume')

        expect(audioContext.sources).toHaveLength(1)
        expect(useMediaStore.getState().voiceDuckingCount).toBe(1)
    })

    it('lets long transition SFX stop existing SFX and block all other SFX until it ends', async () => {
        await playGameSfx('north-inline-action')
        expect(useMediaStore.getState().voiceDuckingCount).toBe(1)

        await playGameSfx('roundstart-to-court')

        expect(audioContext.sources[0].stopped).toBe(true)
        expect(audioContext.sources).toHaveLength(2)
        expect(useMediaStore.getState().voiceDuckingCount).toBe(1)
        expect(useMediaStore.getState().sfxPlaybackLockCount).toBe(1)

        await playGameSfx('north-page-action')

        expect(audioContext.sources).toHaveLength(2)

        audioContext.sources[1].emitEnded()

        expect(useMediaStore.getState().voiceDuckingCount).toBe(0)
        expect(useMediaStore.getState().sfxPlaybackLockCount).toBe(0)

        await playGameSfx('north-page-action')

        expect(audioContext.sources).toHaveLength(3)
        expect(useMediaStore.getState().voiceDuckingCount).toBe(1)
    })

    it('stops a specific hover-prime SFX on hover leave', async () => {
        await playGameSfx('court-gate-hover')

        stopGameSfx('court-gate-hover')

        expect(audioContext.sources[0].stopped).toBe(true)
        expect(useMediaStore.getState().voiceDuckingCount).toBe(0)
    })

    it('stops all active SFX and releases only their own ducking counts', async () => {
        useMediaStore.getState().beginVoiceDucking()
        await playGameSfx('north-inline-action')
        await playGameSfx('empress-option-a')

        expect(useMediaStore.getState().voiceDuckingCount).toBe(3)

        stopAllGameSfx()

        expect(useMediaStore.getState().voiceDuckingCount).toBe(1)
        expect(useMediaStore.getState().sfxPlaybackLockCount).toBe(0)
    })
})
