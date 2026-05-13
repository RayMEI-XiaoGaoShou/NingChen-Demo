import type { SchemeType } from './types'

export type AiGameMasterDebugChain = 'north_scheme' | 'scheme_follow_up' | 'policy_reason'
export type AiGameMasterDebugSource = 'ai' | 'fallback' | 'ai_with_fallback_merge' | 'invalid_ai_fallback'

export interface AiGameMasterDebugRecord {
    id: string
    timestamp: number
    chain: AiGameMasterDebugChain
    source: AiGameMasterDebugSource
    round?: number
    npcId?: string
    npcName?: string
    schemeType?: SchemeType
    summary?: string
    notes: string[]
}

const DEBUG_STORAGE_KEY = 'ningchen_ai_gamemaster_debug_v1'
const DEBUG_OVERRIDE_KEY = 'NINGCHEN_DEBUG_AI_GM'
const MAX_RECORDS = 80

const records: AiGameMasterDebugRecord[] = []

function getGlobalDebugOverride(): boolean | null {
    const value = (globalThis as { __NINGCHEN_AI_GM_DEBUG__?: unknown }).__NINGCHEN_AI_GM_DEBUG__
    return typeof value === 'boolean' ? value : null
}

function getStorage(): Storage | null {
    try {
        return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage
    } catch {
        return null
    }
}

export function isAiGameMasterDebugEnabled(): boolean {
    const override = getGlobalDebugOverride()
    if (override !== null) return override

    const storage = getStorage()
    if (storage?.getItem(DEBUG_OVERRIDE_KEY) === '1') return true

    return Boolean(import.meta.env.DEV)
}

function persistRecords(): void {
    const storage = getStorage()
    if (!storage) return

    try {
        storage.setItem(DEBUG_STORAGE_KEY, JSON.stringify(records))
    } catch {
        // Debug logging must never affect gameplay.
    }
}

export function recordAiGameMasterDebug(
    record: Omit<AiGameMasterDebugRecord, 'id' | 'timestamp' | 'notes'> & { notes?: string[] },
): AiGameMasterDebugRecord | null {
    if (!isAiGameMasterDebugEnabled()) return null

    const nextRecord: AiGameMasterDebugRecord = {
        ...record,
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        notes: record.notes ?? [],
    }

    records.push(nextRecord)
    if (records.length > MAX_RECORDS) {
        records.splice(0, records.length - MAX_RECORDS)
    }
    persistRecords()

    return nextRecord
}

export function getAiGameMasterDebugRecords(): readonly AiGameMasterDebugRecord[] {
    return records
}

export function clearAiGameMasterDebugRecords(): void {
    records.splice(0, records.length)
    const storage = getStorage()
    try {
        storage?.removeItem(DEBUG_STORAGE_KEY)
    } catch {
        // Ignore debug storage failures.
    }
}
