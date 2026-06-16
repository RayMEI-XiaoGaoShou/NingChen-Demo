import { describe, expect, it } from 'vitest'
import { BGM_TRACK_FADE_MS, resolveTrack } from './GlobalAudio'
import globalAudioSource from './GlobalAudio.tsx?raw'

describe('GlobalAudio voice ducking', () => {
    it('keeps BGM below voice lines and fades between normal and ducked levels', () => {
        expect(globalAudioSource).toContain('BGM_BASE_VOLUME = 0.34')
        expect(globalAudioSource).toContain('BGM_DUCKED_VOLUME = 0.16')
        expect(globalAudioSource).toContain('BGM_DUCK_FADE_MS = 160')
        expect(globalAudioSource).toContain('BGM_RESTORE_FADE_MS = 320')
        expect(BGM_TRACK_FADE_MS).toBe(600)
        expect(globalAudioSource).toContain('voiceDuckingCount')
        expect(globalAudioSource).toContain('sfxPlaybackLockCount')
        expect(globalAudioSource).toContain('requestAnimationFrame')
        expect(globalAudioSource).toContain('applyBgmVolume')
    })

    it('stops active game SFX when the player mutes audio', () => {
        expect(globalAudioSource).toContain("import { stopAllGameSfx } from '../../audio/gameSfx'")
        expect(globalAudioSource).toContain('if (isMuted) stopAllGameSfx()')
    })

    it('pauses BGM while all-audio SFX locks are active and resumes afterward', () => {
        expect(globalAudioSource).toContain('const isAudioBlocked = sfxPlaybackLockCount > 0')
        expect(globalAudioSource).toContain('audioBlockedRef.current = isAudioBlocked')
        expect(globalAudioSource).toContain('if (isAudioBlocked) {')
        expect(globalAudioSource).toContain('audio.pause()')
        expect(globalAudioSource).toContain('attemptPlayback()')
    })
})

describe('GlobalAudio BGM scene routing', () => {
    it('routes cover, guide, bios, help, and ending pages to BGM 0', () => {
        expect(resolveTrack({ prologueStep: 'COVER', helpOverlayOpen: false, currentPhase: 'ROUND_START', bgmSceneContext: null })).toBe('coverEnding')
        expect(resolveTrack({ prologueStep: 'GAMEPLAY_GUIDE', helpOverlayOpen: false, currentPhase: 'ROUND_START', bgmSceneContext: null })).toBe('coverEnding')
        expect(resolveTrack({ prologueStep: 'CHARACTER_BIOS', helpOverlayOpen: false, currentPhase: 'ROUND_START', bgmSceneContext: null })).toBe('coverEnding')
        expect(resolveTrack({ prologueStep: 'INGAME', helpOverlayOpen: true, currentPhase: 'COURT_OBSERVE', bgmSceneContext: 'court-focus' })).toBe('coverEnding')
        expect(resolveTrack({ prologueStep: 'INGAME', helpOverlayOpen: false, currentPhase: 'ENDING', bgmSceneContext: null })).toBe('coverEnding')
    })

    it('routes round start and court overview to BGM 1', () => {
        expect(resolveTrack({ prologueStep: 'INGAME', helpOverlayOpen: false, currentPhase: 'PROLOGUE', bgmSceneContext: null })).toBe('roundCourtOverview')
        expect(resolveTrack({ prologueStep: 'INGAME', helpOverlayOpen: false, currentPhase: 'ROUND_START', bgmSceneContext: null })).toBe('roundCourtOverview')
        expect(resolveTrack({ prologueStep: 'INGAME', helpOverlayOpen: false, currentPhase: 'COURT_OBSERVE', bgmSceneContext: 'court-overview' })).toBe('roundCourtOverview')
    })

    it('routes court and external focus scenes to their BGM 2 variants', () => {
        expect(resolveTrack({ prologueStep: 'INGAME', helpOverlayOpen: false, currentPhase: 'COURT_OBSERVE', bgmSceneContext: 'court-focus' })).toBe('courtDetailScheme')
        expect(resolveTrack({ prologueStep: 'INGAME', helpOverlayOpen: false, currentPhase: 'COURT_OBSERVE', bgmSceneContext: 'external-focus' })).toBe('externalDetailScheme')
        expect(resolveTrack({ prologueStep: 'INGAME', helpOverlayOpen: false, currentPhase: 'COURT_OBSERVE', bgmSceneContext: 'court-scheme' })).toBe('courtDetailScheme')
        expect(resolveTrack({ prologueStep: 'INGAME', helpOverlayOpen: false, currentPhase: 'COURT_OBSERVE', bgmSceneContext: 'external-scheme' })).toBe('externalDetailScheme')
    })

    it('routes empress, scheme feedback, and settlement phases to their dedicated tracks', () => {
        expect(resolveTrack({ prologueStep: 'INGAME', helpOverlayOpen: false, currentPhase: 'EMPRESS_LETTER', bgmSceneContext: null })).toBe('empressQuestion')
        expect(resolveTrack({ prologueStep: 'INGAME', helpOverlayOpen: false, currentPhase: 'SCHEME_FEEDBACK', bgmSceneContext: null })).toBe('schemeFeedback')
        expect(resolveTrack({ prologueStep: 'INGAME', helpOverlayOpen: false, currentPhase: 'EMPRESS_REPLY', bgmSceneContext: null })).toBe('empressReply')
        expect(resolveTrack({ prologueStep: 'INGAME', helpOverlayOpen: false, currentPhase: 'SETTLEMENT', bgmSceneContext: null })).toBe('settlement')
    })
})
