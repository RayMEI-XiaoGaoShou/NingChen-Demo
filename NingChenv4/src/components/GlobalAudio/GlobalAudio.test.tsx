import { describe, expect, it } from 'vitest'
import globalAudioSource from './GlobalAudio.tsx?raw'

describe('GlobalAudio voice ducking', () => {
    it('keeps BGM below voice lines and fades between normal and ducked levels', () => {
        expect(globalAudioSource).toContain('BGM_BASE_VOLUME = 0.34')
        expect(globalAudioSource).toContain('BGM_DUCKED_VOLUME = 0.16')
        expect(globalAudioSource).toContain('BGM_DUCK_FADE_MS = 160')
        expect(globalAudioSource).toContain('BGM_RESTORE_FADE_MS = 320')
        expect(globalAudioSource).toContain('voiceDuckingCount')
        expect(globalAudioSource).toContain('requestAnimationFrame')
        expect(globalAudioSource).toContain('applyBgmVolume')
    })
})
