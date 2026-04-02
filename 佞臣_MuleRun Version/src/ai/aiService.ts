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
    const openapi = mujianSdk?.openapi ?? window.$mujian_lite?.openapi
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

export async function initAiService(): Promise<AiMode> {
    if (initPromise) return initPromise

    initPromise = (async () => {
        if (isLikelyMujianRuntime()) {
            try {
                await withTimeout(window.$mujian_lite.init(), 1500)
                mujianSdk = window.$mujian_lite
                currentMode = 'mujian'
                console.log('[AI] 骞曢棿骞冲彴妯″紡宸叉縺娲?')
                return currentMode
            } catch (error) {
                console.warn('[AI] 骞曢棿 SDK 褰撳墠涓嶅彲鐢紝鏀硅蛋 DeepSeek API', error)
            }
        }

        if (hasKimiConfig()) {
            currentMode = 'kimi'
            console.log('[AI] DeepSeek API 妯″紡宸叉縺娲?')
            return currentMode
        }

        currentMode = 'fallback'
        console.warn('[AI] 鏈娴嬪埌鍙敤 AI 閰嶇疆锛屼娇鐢ㄦ湰鍦板厹搴曟ā鏉?')
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
            return '骞曢棿鍘熺敓'
        case 'kimi':
            return 'DeepSeek API'
        case 'fallback':
            return '鏈湴鍏滃簳'
    }
}

export async function chatCompletion(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number; tag?: string }
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
    options?: { temperature?: number; maxTokens?: number; tag?: string }
): Promise<T | null> {
    try {
        const text = await chatCompletion(messages, options)
        const cleaned = text
            .trim()
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/```$/i, '')
            .trim()

        if (!cleaned) return null
        return JSON.parse(cleaned) as T
    } catch (error) {
        console.warn('[AI] JSON 缁撴瀯鍖栬В鏋愬け璐ワ紝鏀硅蛋鏈湴鍥為€€', error)
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
        console.error('[AI] 骞曢棿鍘熺敓璋冪敤澶辫触:', error)
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
        console.error('[AI] DeepSeek API 璋冪敤澶辫触:', error)
        return getFallbackResponse(tag)
    }
}
