import type { ChatMessage } from './prompts'
import { getFallbackResponse } from './fallback'
import {
    recordAiCallDiagnostic,
    sanitizeAiDiagnosticText,
    type AiCallFallbackReason,
} from './aiCallDiagnostics'

export type AiMode = 'mujian' | 'deepseek' | 'fallback'
type AiTextSource = 'ai' | 'fallback'

type ChatCompletionOptions = {
    temperature?: number
    maxTokens?: number
    tag?: string
}

export interface ChatCompletionDetailedResult {
    text: string
    mode: AiMode
    source: AiTextSource
    tag: string
    fallbackReason?: AiCallFallbackReason
    model?: string
}

export interface ChatCompletionJsonDetailedResult<T> {
    parsed: T | null
    text: string
    mode: AiMode
    source: AiTextSource
    fallbackReason?: AiCallFallbackReason
    parseFallbackReason?: AiCallFallbackReason
    attempts: number
}

type MujianOpenApiConfig = {
    baseURL: string
    apiKey: string
}

type EnvKey =
    | 'VITE_DEEPSEEK_API_KEY'
    | 'VITE_DEEPSEEK_MODEL'
    | 'VITE_DEEPSEEK_BASE_URL'
    | 'VITE_KIMI_API_KEY'
    | 'VITE_KIMI_MODEL'
    | 'VITE_KIMI_BASE_URL'
    | 'VITE_AI_REQUEST_TIMEOUT_MS'
    | 'DEV'

const DEFAULT_AI_REQUEST_TIMEOUT_MS = 20000
let currentMode: AiMode = 'fallback'
let mujianSdk: any = null
let initPromise: Promise<AiMode> | null = null
const runtimeEnv = ((globalThis as any).process?.env ?? {}) as Record<string, string | undefined>

function getEnvValue(key: EnvKey): string | undefined {
    const viteEnv = typeof import.meta !== 'undefined' ? import.meta.env : undefined
    return viteEnv?.[key] ?? runtimeEnv[key]
}

function getEnvValueWithLegacy(primaryKey: EnvKey, legacyKey: EnvKey): string | undefined {
    return getEnvValue(primaryKey) ?? getEnvValue(legacyKey)
}

function isDevRuntime(): boolean {
    if (typeof window === 'undefined') {
        const devFlag = ((globalThis as any).process?.env ?? {}).DEV
        return devFlag === true || devFlag === 'true'
    }

    const viteEnv = typeof import.meta !== 'undefined' ? import.meta.env : undefined
    const devFlag = viteEnv?.DEV ?? ((globalThis as any).process?.env ?? {}).DEV
    return devFlag === true || devFlag === 'true'
}

function hasDeepSeekConfig(): boolean {
    const apiKey = getEnvValueWithLegacy('VITE_DEEPSEEK_API_KEY', 'VITE_KIMI_API_KEY')
    return Boolean(apiKey && apiKey !== 'your-deepseek-api-key-here' && apiKey !== 'your-kimi-api-key-here')
}

function isLikelyMujianRuntime(): boolean {
    if (typeof window === 'undefined') return false
    if (!window.$mujian_lite) return false

    try {
        return window.self !== window.top
    } catch {
        return true
    }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = globalThis.setTimeout(() => {
            reject(new Error(`timeout after ${ms}ms`))
        }, ms)

        promise
            .then(value => {
                globalThis.clearTimeout(timer)
                resolve(value)
            })
            .catch(error => {
                globalThis.clearTimeout(timer)
                reject(error)
            })
    })
}

function getAiRequestTimeoutMs(): number {
    const rawValue = getEnvValue('VITE_AI_REQUEST_TIMEOUT_MS')
    const parsed = Number(rawValue)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_AI_REQUEST_TIMEOUT_MS
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
    let timer: ReturnType<typeof globalThis.setTimeout> | null = null

    const timeoutPromise = new Promise<never>((_, reject) => {
        timer = globalThis.setTimeout(() => {
            controller?.abort()
            reject(new Error(`AI request timeout after ${timeoutMs}ms`))
        }, timeoutMs)
    })

    try {
        return await Promise.race([
            fetch(url, {
                ...init,
                signal: controller?.signal,
            }),
            timeoutPromise,
        ])
    } finally {
        if (timer) {
            globalThis.clearTimeout(timer)
        }
    }
}

function getMujianOpenApiConfig(): MujianOpenApiConfig | null {
    const openapi = mujianSdk?.openapi ?? (typeof window !== 'undefined' ? window.$mujian_lite?.openapi : null)
    if (!openapi?.baseURL || !openapi?.apiKey) return null

    return {
        baseURL: openapi.baseURL,
        apiKey: openapi.apiKey,
    }
}

async function openAiCompatibleCompletionRaw(
    baseUrl: string,
    apiKey: string,
    model: string,
    messages: ChatMessage[],
    temperature: number,
    maxTokens: number,
    extraBody: Record<string, unknown> = {},
): Promise<string> {
    const response = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages: messages.map(message => ({ role: message.role, content: message.content })),
            temperature,
            max_tokens: maxTokens,
            ...extraBody,
        }),
    }, getAiRequestTimeoutMs())

    if (!response.ok) {
        const errorBody = await response.text().catch(() => '')
        throw new Error(`${model} ${response.status}: ${errorBody}`)
    }

    const data = await response.json()
    return data?.choices?.[0]?.message?.content?.trim() || ''
}

function cleanStructuredJsonText(text: string): string {
    return text
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim()
}

function tryParseStructuredJson<T>(text: string): T | null {
    const cleaned = cleanStructuredJsonText(text)
    if (!cleaned) return null

    try {
        return JSON.parse(cleaned) as T
    } catch {
        return null
    }
}

function shouldRetryStructuredJson(text: string): boolean {
    const cleaned = cleanStructuredJsonText(text)
    if (!cleaned) return false

    const startsLikeJson = cleaned.startsWith('{') || cleaned.startsWith('[')
    if (!startsLikeJson) return false

    return !cleaned.endsWith('}') && !cleaned.endsWith(']')
}

function shouldRetryStructuredJsonCorrection(text: string): boolean {
    const cleaned = cleanStructuredJsonText(text)
    if (!cleaned) return false
    return !shouldRetryStructuredJson(text)
}

function buildStructuredJsonCorrectionMessages(messages: ChatMessage[]): ChatMessage[] {
    return [
        ...messages,
        {
            role: 'user',
            content: '上一轮输出不是可解析的严格 JSON。请重新输出，且只能输出一个 JSON 对象或 JSON 数组；不要解释，不要 Markdown，不要代码块，不要前后缀文字。',
        },
    ]
}

function getStructuredRetryMaxTokens(maxTokens: number): number {
    return Math.max(Math.ceil(maxTokens * 2.75), maxTokens + 320, 520)
}

export async function initAiService(): Promise<AiMode> {
    if (initPromise) return initPromise

    initPromise = (async () => {
        if (isLikelyMujianRuntime()) {
            try {
                await withTimeout(window.$mujian_lite.init(), 1500)
                mujianSdk = window.$mujian_lite
                currentMode = 'mujian'
                console.log('[AI] Mujian runtime active')
                return currentMode
            } catch (error) {
                console.warn('[AI] Mujian SDK init failed, falling back to DeepSeek API', error)
            }
        }

        if (hasDeepSeekConfig()) {
            currentMode = 'deepseek'
            console.log('[AI] DeepSeek API mode active')
            return currentMode
        }

        currentMode = 'fallback'
        console.warn('[AI] No remote AI config detected, using local fallback responses')
        return currentMode
    })()

    return initPromise
}

export function getAiMode(): AiMode {
    return currentMode
}

export function getAiModeLabel(mode: AiMode = currentMode): string {
    switch (mode) {
        case 'mujian':
            return '幕间 SDK'
        case 'deepseek':
            return 'DeepSeek API'
        case 'fallback':
            return '本地回退'
    }
}

function getConfiguredAiSecrets(extraSecrets: string[] = []): string[] {
    return [
        getEnvValueWithLegacy('VITE_DEEPSEEK_API_KEY', 'VITE_KIMI_API_KEY'),
        ...extraSecrets,
    ].filter((value): value is string => Boolean(value && value.length >= 4))
}

function getErrorName(error: unknown): string {
    return error instanceof Error ? error.name : typeof error
}

function getErrorMessage(error: unknown, secrets: string[] = []): string | undefined {
    if (error instanceof Error) {
        return sanitizeAiDiagnosticText(error.message, getConfiguredAiSecrets(secrets))
    }
    if (typeof error === 'string') {
        return sanitizeAiDiagnosticText(error, getConfiguredAiSecrets(secrets))
    }
    return undefined
}

function recordCompletionSuccess(params: {
    tag: string
    mode: AiMode
    model?: string
    provider?: string
    messageCount: number
    maxTokens: number
    temperature: number
}): void {
    recordAiCallDiagnostic({
        tag: params.tag,
        mode: params.mode,
        status: 'success',
        model: params.model,
        provider: params.provider,
        messageCount: params.messageCount,
        maxTokens: params.maxTokens,
        temperature: params.temperature,
    })
}

function buildSuccessResult(params: {
    text: string
    tag: string
    mode: AiMode
    model?: string
}): ChatCompletionDetailedResult {
    return {
        text: params.text,
        mode: params.mode,
        source: 'ai',
        tag: params.tag,
        model: params.model,
    }
}

function buildFallbackResult(params: {
    tag: string
    mode: AiMode
    reason: AiCallFallbackReason
    model?: string
    provider?: string
    messageCount: number
    maxTokens: number
    temperature: number
    error?: unknown
    secrets?: string[]
}): ChatCompletionDetailedResult {
    const errorName = params.error === undefined ? undefined : getErrorName(params.error)
    const errorMessage = params.error === undefined ? undefined : getErrorMessage(params.error, params.secrets)

    recordAiCallDiagnostic({
        tag: params.tag,
        mode: params.mode,
        status: 'fallback',
        fallbackReason: params.reason,
        model: params.model,
        provider: params.provider,
        messageCount: params.messageCount,
        maxTokens: params.maxTokens,
        temperature: params.temperature,
        errorName,
        errorMessage,
    })

    return {
        text: getFallbackResponse(params.tag),
        mode: params.mode,
        source: 'fallback',
        tag: params.tag,
        fallbackReason: params.reason,
        model: params.model,
    }
}

export async function chatCompletion(
    messages: ChatMessage[],
    options?: ChatCompletionOptions,
): Promise<string> {
    const result = await chatCompletionDetailed(messages, options)
    return result.text
}

export async function chatCompletionDetailed(
    messages: ChatMessage[],
    options?: ChatCompletionOptions,
): Promise<ChatCompletionDetailedResult> {
    const { temperature = 0.8, maxTokens = 500, tag = '' } = options ?? {}
    const mode = await initAiService()

    switch (mode) {
        case 'mujian':
            return mujianCompletionDetailed(messages, temperature, maxTokens, tag)
        case 'deepseek':
            return deepSeekCompletionDetailed(messages, temperature, maxTokens, tag)
        case 'fallback':
            return buildFallbackResult({
                tag,
                mode,
                reason: 'fallback_mode',
                provider: 'local',
                messageCount: messages.length,
                maxTokens,
                temperature,
            })
    }
}

function getParseFallbackReason(result: ChatCompletionDetailedResult): AiCallFallbackReason {
    return result.source === 'fallback'
        ? result.fallbackReason ?? 'request_failed'
        : 'parse_invalid_json'
}

export async function chatCompletionJson<T>(
    messages: ChatMessage[],
    options?: ChatCompletionOptions,
): Promise<T | null> {
    const result = await chatCompletionJsonDetailed<T>(messages, options)
    return result.parsed
}

export async function chatCompletionJsonDetailed<T>(
    messages: ChatMessage[],
    options?: ChatCompletionOptions,
): Promise<ChatCompletionJsonDetailedResult<T>> {
    const { temperature = 0.8, maxTokens = 500, tag = '' } = options ?? {}

    try {
        const firstResult = await chatCompletionDetailed(messages, { temperature, maxTokens, tag })
        const firstParsed = tryParseStructuredJson<T>(firstResult.text)
        if (firstParsed) {
            return {
                parsed: firstParsed,
                text: firstResult.text,
                mode: firstResult.mode,
                source: firstResult.source,
                fallbackReason: firstResult.fallbackReason,
                attempts: 1,
            }
        }

        if (shouldRetryStructuredJson(firstResult.text)) {
            const retryResult = await chatCompletionDetailed(messages, {
                temperature,
                maxTokens: getStructuredRetryMaxTokens(maxTokens),
                tag,
            })
            const retryParsed = tryParseStructuredJson<T>(retryResult.text)
            if (retryParsed) {
                return {
                    parsed: retryParsed,
                    text: retryResult.text,
                    mode: retryResult.mode,
                    source: retryResult.source,
                    fallbackReason: retryResult.fallbackReason,
                    attempts: 2,
                }
            }
        } else if (shouldRetryStructuredJsonCorrection(firstResult.text)) {
            const retryResult = await chatCompletionDetailed(buildStructuredJsonCorrectionMessages(messages), {
                temperature,
                maxTokens: getStructuredRetryMaxTokens(maxTokens),
                tag,
            })
            const retryParsed = tryParseStructuredJson<T>(retryResult.text)
            if (retryParsed) {
                return {
                    parsed: retryParsed,
                    text: retryResult.text,
                    mode: retryResult.mode,
                    source: retryResult.source,
                    fallbackReason: retryResult.fallbackReason,
                    attempts: 2,
                }
            }
        }

        const parseFallbackReason = getParseFallbackReason(firstResult)
        const attempts = firstResult.source === 'fallback' ? 1 : 2
        recordAiCallDiagnostic({
            tag,
            mode: firstResult.mode,
            status: 'fallback',
            fallbackReason: parseFallbackReason,
            provider: 'json_parse',
            messageCount: messages.length,
            maxTokens,
            temperature,
            attempts,
        })

        return {
            parsed: null,
            text: firstResult.text,
            mode: firstResult.mode,
            source: firstResult.source,
            fallbackReason: firstResult.fallbackReason,
            parseFallbackReason,
            attempts,
        }
    } catch (error) {
        const errorMessage = getErrorMessage(error)
        console.warn('[AI] Structured JSON parse failed, returning null', getErrorName(error), errorMessage)
        recordAiCallDiagnostic({
            tag,
            mode: currentMode,
            status: 'fallback',
            fallbackReason: 'parse_exception',
            provider: 'json_parse',
            messageCount: messages.length,
            maxTokens,
            temperature,
            attempts: 0,
            errorName: getErrorName(error),
            errorMessage,
        })
        return {
            parsed: null,
            text: '',
            mode: currentMode,
            source: 'fallback',
            fallbackReason: 'parse_exception',
            parseFallbackReason: 'parse_exception',
            attempts: 0,
        }
    }
}

async function mujianCompletionDetailed(
    messages: ChatMessage[],
    temperature: number,
    maxTokens: number,
    tag: string,
): Promise<ChatCompletionDetailedResult> {
    const mode: AiMode = 'mujian'
    const model = 'deepseek-v3.2'

    try {
        if (mujianSdk?.ai?.openai?.chat?.completions?.create) {
            const response = await mujianSdk.ai.openai.chat.completions.create({
                model,
                messages: messages.map(message => ({ role: message.role, content: message.content })),
                temperature,
                max_tokens: maxTokens,
            })
            const text = response?.choices?.[0]?.message?.content?.trim() || ''

            if (!text) {
                return buildFallbackResult({
                    tag,
                    mode,
                    reason: 'empty_response',
                    model,
                    provider: 'mujian_sdk',
                    messageCount: messages.length,
                    maxTokens,
                    temperature,
                })
            }

            recordCompletionSuccess({
                tag,
                mode,
                model,
                provider: 'mujian_sdk',
                messageCount: messages.length,
                maxTokens,
                temperature,
            })
            return buildSuccessResult({ text, tag, mode, model })
        }

        const openapi = getMujianOpenApiConfig()
        if (!openapi) {
            throw new Error('Mujian openapi config unavailable')
        }

        const text = await openAiCompatibleCompletionRaw(
            openapi.baseURL,
            openapi.apiKey,
            model,
            messages,
            temperature,
            maxTokens,
        )
        if (!text) {
            return buildFallbackResult({
                tag,
                mode,
                reason: 'empty_response',
                model,
                provider: 'mujian_openapi',
                messageCount: messages.length,
                maxTokens,
                temperature,
                secrets: [openapi.apiKey],
            })
        }

        recordCompletionSuccess({
            tag,
            mode,
            model,
            provider: 'mujian_openapi',
            messageCount: messages.length,
            maxTokens,
            temperature,
        })
        return buildSuccessResult({ text, tag, mode, model })
    } catch (error) {
        console.error('[AI] Mujian completion failed:', getErrorName(error), getErrorMessage(error))
        return buildFallbackResult({
            tag,
            mode,
            reason: 'request_failed',
            model,
            provider: 'mujian',
            messageCount: messages.length,
            maxTokens,
            temperature,
            error,
        })
    }
}

function shouldDisableDeepSeekThinking(model: string): boolean {
    return model.startsWith('deepseek-v4')
}

async function deepSeekCompletionDetailed(
    messages: ChatMessage[],
    temperature: number,
    maxTokens: number,
    tag: string,
): Promise<ChatCompletionDetailedResult> {
    const apiKey = getEnvValueWithLegacy('VITE_DEEPSEEK_API_KEY', 'VITE_KIMI_API_KEY') || ''
    const model = getEnvValueWithLegacy('VITE_DEEPSEEK_MODEL', 'VITE_KIMI_MODEL') || 'deepseek-v4-flash'
    const baseUrl = getEnvValueWithLegacy('VITE_DEEPSEEK_BASE_URL', 'VITE_KIMI_BASE_URL') || 'https://api.deepseek.com'
    const isDev = isDevRuntime()
    const mode: AiMode = 'deepseek'
    const extraBody = shouldDisableDeepSeekThinking(model)
        ? { thinking: { type: 'disabled' } }
        : {}

    try {
        const text = await openAiCompatibleCompletionRaw(
            isDev ? '/api/ai' : baseUrl,
            apiKey,
            model,
            messages,
            temperature,
            maxTokens,
            extraBody,
        )
        if (!text) {
            return buildFallbackResult({
                tag,
                mode,
                reason: 'empty_response',
                model,
                provider: 'deepseek',
                messageCount: messages.length,
                maxTokens,
                temperature,
                secrets: [apiKey],
            })
        }

        recordCompletionSuccess({
            tag,
            mode,
            model,
            provider: 'deepseek',
            messageCount: messages.length,
            maxTokens,
            temperature,
        })
        return buildSuccessResult({ text, tag, mode, model })
    } catch (error) {
        console.error('[AI] DeepSeek completion failed:', getErrorName(error), getErrorMessage(error, [apiKey]))
        return buildFallbackResult({
            tag,
            mode,
            reason: 'request_failed',
            model,
            provider: 'deepseek',
            messageCount: messages.length,
            maxTokens,
            temperature,
            error,
            secrets: [apiKey],
        })
    }
}
