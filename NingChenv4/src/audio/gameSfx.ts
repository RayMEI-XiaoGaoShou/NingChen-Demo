import { useCallback } from 'react'
import { getSfxPath, type SfxKey } from '../data/mediaAssets'
import { useMediaStore } from '../stores/mediaStore'

export type GameSfxCategory = 'transition' | 'button-page' | 'button-inline' | 'hover-prime'

interface GameSfxConfig {
    category: GameSfxCategory
    gain: number
    throttleMs?: number
    exclusiveCategory?: boolean
    blocksAllAudio?: boolean
}

interface ActiveSfx {
    key: SfxKey
    source: AudioBufferSourceNode
    gainNode: GainNode
    category: GameSfxCategory
    blocksAllAudio: boolean
}

export const GAME_SFX_CONFIG: Record<SfxKey, GameSfxConfig> = {
    'roundstart-to-court': { category: 'transition', gain: 1, exclusiveCategory: true, blocksAllAudio: true },
    'settlement-next-volume': { category: 'transition', gain: 1, exclusiveCategory: true, blocksAllAudio: true },
    'empress-next-page': { category: 'transition', gain: 1, exclusiveCategory: true },
    'court-gate-hover': { category: 'hover-prime', gain: 1, exclusiveCategory: true },
    'external-gate-hover': { category: 'hover-prime', gain: 1, exclusiveCategory: true },
    'north-page-action': { category: 'button-page', gain: 1.8, exclusiveCategory: true },
    'north-inline-action': { category: 'button-inline', gain: 1.8, throttleMs: 120 },
    'empress-option-a': { category: 'button-inline', gain: 1, throttleMs: 120 },
    'empress-option-b': { category: 'button-inline', gain: 1, throttleMs: 120 },
    'empress-option-c': { category: 'button-inline', gain: 1, throttleMs: 120 },
    'empress-option-d': { category: 'button-inline', gain: 1, throttleMs: 120 },
    'feng-draft': { category: 'button-inline', gain: 1, throttleMs: 120 },
}

let audioContext: AudioContext | null = null
let activeSfxId = 0
let stopGeneration = 0

const decodedBufferCache = new Map<SfxKey, Promise<AudioBuffer>>()
const activeSfx = new Map<number, ActiveSfx>()
const exclusiveReservations = new Set<GameSfxCategory>()
const lastStartedAtByKey = new Map<SfxKey, number>()

function getAudioContext() {
    const audioGlobal = globalThis as typeof globalThis & {
        AudioContext?: typeof AudioContext
        webkitAudioContext?: typeof AudioContext
    }
    const AudioContextConstructor = audioGlobal.AudioContext ?? audioGlobal.webkitAudioContext
    if (!AudioContextConstructor) return null

    if (!audioContext) {
        audioContext = new AudioContextConstructor()
    }

    return audioContext
}

async function loadSfxBuffer(key: SfxKey) {
    const cached = decodedBufferCache.get(key)
    if (cached) return cached

    const context = getAudioContext()
    if (!context) {
        throw new Error('Web Audio is unavailable')
    }

    const bufferPromise = fetch(getSfxPath(key))
        .then(response => {
            if ('ok' in response && !response.ok) {
                throw new Error(`Failed to fetch SFX ${key}`)
            }
            return response.arrayBuffer()
        })
        .then(arrayBuffer => context.decodeAudioData(arrayBuffer))
        .catch(error => {
            decodedBufferCache.delete(key)
            throw error
        })

    decodedBufferCache.set(key, bufferPromise)
    return bufferPromise
}

function shouldThrottle(key: SfxKey, config: GameSfxConfig, now: number) {
    if (!config.throttleMs) return false
    const lastStartedAt = lastStartedAtByKey.get(key)
    return typeof lastStartedAt === 'number' && now - lastStartedAt < config.throttleMs
}

function finalizeActiveSfx(id: number) {
    const active = activeSfx.get(id)
    if (!active) return

    activeSfx.delete(id)
    exclusiveReservations.delete(active.category)
    active.source.onended = null
    if (active.blocksAllAudio) {
        useMediaStore.getState().endSfxPlaybackLock()
    }

    try {
        active.source.disconnect()
    } catch {
        // Older browsers and tests may not expose disconnect on fake nodes.
    }

    try {
        active.gainNode.disconnect()
    } catch {
        // Older browsers and tests may not expose disconnect on fake nodes.
    }

    useMediaStore.getState().endVoiceDucking()
}

function stopMatchingGameSfx(predicate: (active: ActiveSfx) => boolean) {
    const activeEntries = Array.from(activeSfx.entries())
    for (const [id, active] of activeEntries) {
        if (!predicate(active)) continue
        active.source.onended = null
        try {
            active.source.stop()
        } catch {
            // The source may have already ended; finalize below is idempotent.
        }
        finalizeActiveSfx(id)
    }
}

export async function playGameSfx(key: SfxKey) {
    const config = GAME_SFX_CONFIG[key]
    if (!config) return false

    const media = useMediaStore.getState()
    if (media.isMuted) return false
    if (media.sfxPlaybackLockCount > 0) return false

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    if (shouldThrottle(key, config, now)) return false

    let ownsSfxPlaybackLock = false
    if (config.blocksAllAudio) {
        stopAllGameSfx()
        useMediaStore.getState().beginSfxPlaybackLock()
        ownsSfxPlaybackLock = true
    }

    if (config.exclusiveCategory && exclusiveReservations.has(config.category)) {
        if (ownsSfxPlaybackLock) useMediaStore.getState().endSfxPlaybackLock()
        return false
    }

    if (config.exclusiveCategory) {
        exclusiveReservations.add(config.category)
    }
    if (config.throttleMs) {
        lastStartedAtByKey.set(key, now)
    }

    const generation = stopGeneration

    try {
        const buffer = await loadSfxBuffer(key)
        const context = getAudioContext()
        if (!context || generation !== stopGeneration || useMediaStore.getState().isMuted) {
            exclusiveReservations.delete(config.category)
            if (ownsSfxPlaybackLock) useMediaStore.getState().endSfxPlaybackLock()
            return false
        }

        const source = context.createBufferSource()
        const gainNode = context.createGain()
        const id = ++activeSfxId

        source.buffer = buffer
        gainNode.gain.value = config.gain
        source.connect(gainNode)
        gainNode.connect(context.destination)
        source.onended = () => finalizeActiveSfx(id)

        activeSfx.set(id, {
            key,
            source,
            gainNode,
            category: config.category,
            blocksAllAudio: ownsSfxPlaybackLock,
        })
        ownsSfxPlaybackLock = false
        if (!config.throttleMs) {
            lastStartedAtByKey.set(key, now)
        }
        useMediaStore.getState().beginVoiceDucking()

        try {
            source.start()
        } catch (error) {
            finalizeActiveSfx(id)
            throw error
        }

        return true
    } catch {
        exclusiveReservations.delete(config.category)
        if (ownsSfxPlaybackLock) useMediaStore.getState().endSfxPlaybackLock()
        return false
    }
}

export function stopGameSfx(key: SfxKey) {
    stopMatchingGameSfx(active => active.key === key)
}

export function stopAllGameSfx() {
    stopGeneration += 1
    exclusiveReservations.clear()
    stopMatchingGameSfx(() => true)
    useMediaStore.getState().resetSfxPlaybackLock()
}

export function useGameSfx() {
    const playSfx = useCallback((key: SfxKey) => {
        void playGameSfx(key)
    }, [])

    return {
        playSfx,
        stopSfx: stopGameSfx,
        stopAllSfx: stopAllGameSfx,
    }
}

export function resetGameSfxForTests() {
    stopAllGameSfx()
    decodedBufferCache.clear()
    exclusiveReservations.clear()
    lastStartedAtByKey.clear()
    audioContext = null
}
