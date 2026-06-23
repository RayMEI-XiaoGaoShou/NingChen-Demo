export type AiCallMode = 'deepseek' | 'fallback'
export type AiCallStatus = 'success' | 'fallback'
export type AiCallFallbackReason =
    | 'fallback_mode'
    | 'request_failed'
    | 'empty_response'
    | 'parse_invalid_json'
    | 'parse_exception'
    | 'completion_exception'
    | 'sanitized_empty'
    | 'validation_failed'

export interface AiCallDiagnosticRecord {
    id: string
    timestamp: number
    tag: string
    mode: AiCallMode
    status: AiCallStatus
    fallbackReason?: AiCallFallbackReason
    model?: string
    provider?: string
    messageCount?: number
    maxTokens?: number
    temperature?: number
    attempts?: number
    errorName?: string
    errorMessage?: string
}

const DEBUG_STORAGE_KEY = 'ningchen_ai_call_diagnostics_v1'
const DEBUG_OVERRIDE_KEY = 'NINGCHEN_DEBUG_AI_CALLS'
const MAX_RECORDS = 100

const records: AiCallDiagnosticRecord[] = []

function getGlobalDebugOverride(): boolean | null {
    const value = (globalThis as { __NINGCHEN_AI_CALL_DEBUG__?: unknown }).__NINGCHEN_AI_CALL_DEBUG__
    return typeof value === 'boolean' ? value : null
}

function getStorage(): Storage | null {
    try {
        return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage
    } catch {
        return null
    }
}

export function isAiCallDebugEnabled(): boolean {
    const override = getGlobalDebugOverride()
    if (override !== null) return override

    const storage = getStorage()
    if (storage?.getItem(DEBUG_OVERRIDE_KEY) === '1') return true

    return Boolean(import.meta.env.DEV)
}

export function sanitizeAiDiagnosticText(text: string | undefined, secrets: string[] = []): string | undefined {
    if (!text) return undefined

    let sanitized = text
    for (const secret of secrets) {
        if (!secret || secret.length < 4) continue
        sanitized = sanitized.split(secret).join('[redacted]')
    }

    sanitized = sanitized
        .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
        .replace(/(api[-_ ]?key["'\s:=]+)[^"',\s]+/gi, '$1[redacted]')
        .replace(/(authorization["'\s:=]+)[^"',\s]+/gi, '$1[redacted]')
        .trim()

    return sanitized.length > 300 ? `${sanitized.slice(0, 297)}...` : sanitized
}

function persistRecords(): void {
    const storage = getStorage()
    if (storage) {
        try {
            storage.setItem(DEBUG_STORAGE_KEY, JSON.stringify(records))
        } catch {
            // Diagnostics must never affect gameplay.
        }
    }

    try {
        ;(globalThis as { __NINGCHEN_AI_CALL_DIAGNOSTICS__?: AiCallDiagnosticRecord[] }).__NINGCHEN_AI_CALL_DIAGNOSTICS__ = [...records]
    } catch {
        // Ignore read-only global environments.
    }
}

export function recordAiCallDiagnostic(
    record: Omit<AiCallDiagnosticRecord, 'id' | 'timestamp'>,
): AiCallDiagnosticRecord | null {
    if (!isAiCallDebugEnabled()) return null

    const nextRecord: AiCallDiagnosticRecord = {
        ...record,
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        errorMessage: sanitizeAiDiagnosticText(record.errorMessage),
    }

    records.push(nextRecord)
    if (records.length > MAX_RECORDS) {
        records.splice(0, records.length - MAX_RECORDS)
    }
    persistRecords()

    return nextRecord
}

export function getAiCallDiagnosticRecords(): readonly AiCallDiagnosticRecord[] {
    return records
}

export function clearAiCallDiagnosticRecords(): void {
    records.splice(0, records.length)
    const storage = getStorage()
    try {
        storage?.removeItem(DEBUG_STORAGE_KEY)
    } catch {
        // Ignore debug storage failures.
    }
    persistRecords()
}
