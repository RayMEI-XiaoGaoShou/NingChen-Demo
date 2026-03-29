import type { ChatMessage } from './prompts'
import { getFallbackResponse } from './fallback'

type AiMode = 'mujian' | 'kimi' | 'fallback'

let currentMode: AiMode = 'fallback'
let mujianSdk: any = null
let initPromise: Promise<AiMode> | null = null

function hasKimiConfig(): boolean {
    const apiKey = import.meta.env.VITE_KIMI_API_KEY
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

export async function initAiService(): Promise<AiMode> {
    if (initPromise) return initPromise

    initPromise = (async () => {
        if (isLikelyMujianRuntime()) {
            try {
                await withTimeout(window.$mujian_lite.init(), 1500)
                mujianSdk = window.$mujian_lite
                currentMode = 'mujian'
                console.log('[AI] 幕间平台模式已激活')
                return currentMode
            } catch (error) {
                console.warn('[AI] 幕间 SDK 当前不可用，改走 DeepSeek API', error)
            }
        }

        if (hasKimiConfig()) {
            currentMode = 'kimi'
            console.log('[AI] DeepSeek API 模式已激活')
            return currentMode
        }

        currentMode = 'fallback'
        console.warn('[AI] 未检测到可用 AI 配置，使用本地兜底模板')
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
            return '幕间原生'
        case 'kimi':
            return 'DeepSeek API'
        case 'fallback':
            return '本地兜底'
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

async function mujianCompletion(
    messages: ChatMessage[],
    temperature: number,
    maxTokens: number,
    tag: string,
): Promise<string> {
    try {
        const response = await mujianSdk.ai.openai.chat.completions.create({
            model: 'deepseek-v3.2',
            messages: messages.map(message => ({ role: message.role, content: message.content })),
            temperature,
            max_tokens: maxTokens,
        })

        return response?.choices?.[0]?.message?.content?.trim() || getFallbackResponse(tag)
    } catch (error) {
        console.error('[AI] 幕间原生调用失败:', error)
        return getFallbackResponse(tag)
    }
}

async function kimiCompletion(
    messages: ChatMessage[],
    temperature: number,
    maxTokens: number,
    tag: string,
): Promise<string> {
    const apiKey = import.meta.env.VITE_KIMI_API_KEY
    const model = import.meta.env.VITE_KIMI_MODEL || 'deepseek-chat'
    const baseUrl = import.meta.env.VITE_KIMI_BASE_URL || 'https://api.deepseek.com'
    const url = import.meta.env.DEV
        ? '/api/ai/chat/completions'
        : `${baseUrl}/chat/completions`

    try {
        const response = await fetch(url, {
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
            throw new Error(`DeepSeek API ${response.status}: ${errorBody}`)
        }

        const data = await response.json()
        return data?.choices?.[0]?.message?.content?.trim() || getFallbackResponse(tag)
    } catch (error) {
        console.error('[AI] DeepSeek API 调用失败:', error)
        return getFallbackResponse(tag)
    }
}
