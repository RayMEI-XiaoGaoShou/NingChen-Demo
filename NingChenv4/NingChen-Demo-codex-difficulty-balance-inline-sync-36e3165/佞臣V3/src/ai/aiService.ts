import type { ChatMessage } from './prompts'
import { getFallbackResponse } from './fallback'

type AiMode = 'mujian' | 'deepseek' | 'fallback'

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

async function openAiCompatibleCompletion(
    baseUrl: string,
    apiKey: string,
    model: string,
    messages: ChatMessage[],
    temperature: number,
    maxTokens: number,
    tag: string,
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
    return data?.choices?.[0]?.message?.content?.trim() || getFallbackResponse(tag)
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

export async function chatCompletion(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number; tag?: string },
): Promise<string> {
    const { temperature = 0.8, maxTokens = 500, tag = '' } = options ?? {}
    await initAiService()

    switch (currentMode) {
        case 'mujian':
            return mujianCompletion(messages, temperature, maxTokens, tag)
        case 'deepseek':
            return deepSeekCompletion(messages, temperature, maxTokens, tag)
        case 'fallback':
            return getFallbackResponse(tag)
    }
}

export async function chatCompletionJson<T>(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number; tag?: string },
): Promise<T | null> {
    const { temperature = 0.8, maxTokens = 500, tag = '' } = options ?? {}

    try {
        const firstText = await chatCompletion(messages, { temperature, maxTokens, tag })
        const firstParsed = tryParseStructuredJson<T>(firstText)
        if (firstParsed) {
            return firstParsed
        }

        if (shouldRetryStructuredJson(firstText)) {
            const retryText = await chatCompletion(messages, {
                temperature,
                maxTokens: getStructuredRetryMaxTokens(maxTokens),
                tag,
            })
            const retryParsed = tryParseStructuredJson<T>(retryText)
            if (retryParsed) {
                return retryParsed
            }
        } else if (shouldRetryStructuredJsonCorrection(firstText)) {
            const retryText = await chatCompletion(buildStructuredJsonCorrectionMessages(messages), {
                temperature,
                maxTokens: getStructuredRetryMaxTokens(maxTokens),
                tag,
            })
            const retryParsed = tryParseStructuredJson<T>(retryText)
            if (retryParsed) {
                return retryParsed
            }
        }

        return null
    } catch (error) {
        console.warn('[AI] Structured JSON parse failed, returning null', error)
        return null
    }
}

async function mujianCompletion(
    messages: ChatMessage[],
    temperature: number,
    maxTokens: number,
    tag: string,
): Promise<string> {
    try {
        if (mujianSdk?.ai?.openai?.chat?.completions?.create) {
            const response = await mujianSdk.ai.openai.chat.completions.create({
                model: 'deepseek-v3.2',
                messages: messages.map(message => ({ role: message.role, content: message.content })),
                temperature,
                max_tokens: maxTokens,
            })

            return response?.choices?.[0]?.message?.content?.trim() || getFallbackResponse(tag)
        }

        const openapi = getMujianOpenApiConfig()
        if (!openapi) {
            throw new Error('Mujian openapi config unavailable')
        }

        return await openAiCompatibleCompletion(
            openapi.baseURL,
            openapi.apiKey,
            'deepseek-v3.2',
            messages,
            temperature,
            maxTokens,
            tag,
        )
    } catch (error) {
        console.error('[AI] Mujian completion failed:', error)
        return getFallbackResponse(tag)
    }
}

function shouldDisableDeepSeekThinking(model: string): boolean {
    return model.startsWith('deepseek-v4')
}

async function deepSeekCompletion(
    messages: ChatMessage[],
    temperature: number,
    maxTokens: number,
    tag: string,
): Promise<string> {
    const apiKey = getEnvValueWithLegacy('VITE_DEEPSEEK_API_KEY', 'VITE_KIMI_API_KEY') || ''
    const model = getEnvValueWithLegacy('VITE_DEEPSEEK_MODEL', 'VITE_KIMI_MODEL') || 'deepseek-v4-flash'
    const baseUrl = getEnvValueWithLegacy('VITE_DEEPSEEK_BASE_URL', 'VITE_KIMI_BASE_URL') || 'https://api.deepseek.com'
    const isDev = isDevRuntime()
    const extraBody = shouldDisableDeepSeekThinking(model)
        ? { thinking: { type: 'disabled' } }
        : {}

    try {
        return await openAiCompatibleCompletion(
            isDev ? '/api/ai' : baseUrl,
            apiKey,
            model,
            messages,
            temperature,
            maxTokens,
            tag,
            extraBody,
        )
    } catch (error) {
        console.error('[AI] DeepSeek completion failed:', error)
        return getFallbackResponse(tag)
    }
}
