import type { ChatMessage } from './prompts'
import { getFallbackResponse } from './fallback'

type AiMode = 'mujian' | 'kimi' | 'fallback'

type MujianOpenApiConfig = {
    baseURL: string
    apiKey: string
}

let currentMode: AiMode = 'fallback'
let mujianSdk: any = null
let initPromise: Promise<AiMode> | null = null
const runtimeEnv = ((globalThis as any).process?.env ?? {}) as Record<string, string | undefined>

function getEnvValue(
    key: 'VITE_KIMI_API_KEY' | 'VITE_KIMI_MODEL' | 'VITE_KIMI_BASE_URL' | 'DEV',
): string | undefined {
    const viteEnv = typeof import.meta !== 'undefined' ? import.meta.env : undefined
    return viteEnv?.[key] ?? runtimeEnv[key]
}

function hasKimiConfig(): boolean {
    const apiKey = getEnvValue('VITE_KIMI_API_KEY')
    return Boolean(apiKey && apiKey !== 'your-kimi-api-key-here')
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
): Promise<string> {
    const response = await fetch(`${baseUrl}/chat/completions`, {
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
        }),
    })

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

function getStructuredRetryMaxTokens(maxTokens: number): number {
    return Math.max(Math.ceil(maxTokens * 2), maxTokens + 160, 360)
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

        if (hasKimiConfig()) {
            currentMode = 'kimi'
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
        case 'kimi':
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
        case 'kimi':
            return kimiCompletion(messages, temperature, maxTokens, tag)
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

        return openAiCompatibleCompletion(
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

async function kimiCompletion(
    messages: ChatMessage[],
    temperature: number,
    maxTokens: number,
    tag: string,
): Promise<string> {
    const apiKey = getEnvValue('VITE_KIMI_API_KEY') || ''
    const model = getEnvValue('VITE_KIMI_MODEL') || 'deepseek-chat'
    const baseUrl = getEnvValue('VITE_KIMI_BASE_URL') || 'https://api.deepseek.com'
    const isDev = getEnvValue('DEV') === 'true'

    try {
        return openAiCompatibleCompletion(
            isDev ? '/api/ai' : baseUrl,
            apiKey,
            model,
            messages,
            temperature,
            maxTokens,
            tag,
        )
    } catch (error) {
        console.error('[AI] DeepSeek completion failed:', error)
        return getFallbackResponse(tag)
    }
}
