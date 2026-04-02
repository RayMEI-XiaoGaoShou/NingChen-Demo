import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('aiService', () => {
    const originalWindow = (globalThis as any).window
    const originalFetch = (globalThis as any).fetch
    const processEnv = ((globalThis as any).process?.env ?? {}) as Record<string, string | undefined>
    const originalEnv = {
        VITE_KIMI_API_KEY: processEnv.VITE_KIMI_API_KEY,
        VITE_KIMI_BASE_URL: processEnv.VITE_KIMI_BASE_URL,
        VITE_KIMI_MODEL: processEnv.VITE_KIMI_MODEL,
        DEV: processEnv.DEV,
    }

    beforeEach(() => {
        vi.resetModules()
        vi.restoreAllMocks()
    })

    afterEach(() => {
        const globalState = globalThis as any

        if (originalWindow === undefined) {
            delete globalState.window
        } else {
            globalState.window = originalWindow
        }

        if (originalFetch === undefined) {
            delete globalState.fetch
        } else {
            globalState.fetch = originalFetch
        }

        const envKeys = Object.keys(originalEnv) as Array<keyof typeof originalEnv>
        for (const key of envKeys) {
            const value = originalEnv[key]
            if (value === undefined) {
                delete processEnv[key]
            } else {
                processEnv[key] = value
            }
        }
    })

    it('uses Mujian lite openapi config to call chat completions when ai wrapper is unavailable', async () => {
        const init = vi.fn().mockResolvedValue(undefined)
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: '幕间返回' } }],
            }),
        })

        ;(globalThis as any).window = {
            self: {},
            top: {},
            $mujian_lite: {
                init,
                openapi: {
                    baseURL: 'https://openapi.mujian.ai/v1',
                    apiKey: 'mujian-runtime-key',
                },
            },
        }
        ;(globalThis as any).fetch = fetchMock

        const { chatCompletion, getAiMode } = await import('./aiService')

        const result = await chatCompletion(
            [{ role: 'user', content: '请回一句话' }],
            { temperature: 0.2, maxTokens: 50, tag: 'test' },
        )

        expect(init).toHaveBeenCalledOnce()
        expect(getAiMode()).toBe('mujian')
        expect(fetchMock).toHaveBeenCalledOnce()
        expect(fetchMock.mock.calls[0]?.[0]).toBe('https://openapi.mujian.ai/v1/chat/completions')
        expect(result).toBe('幕间返回')
    })

    it('falls back to process env when running outside Vite import.meta.env', async () => {
        delete (globalThis as any).window
        processEnv.VITE_KIMI_API_KEY = 'script-runtime-key'
        processEnv.VITE_KIMI_BASE_URL = 'https://api.deepseek.com'
        processEnv.VITE_KIMI_MODEL = 'deepseek-chat'
        processEnv.DEV = 'false'

        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: 'script runtime ok' } }],
            }),
        })
        ;(globalThis as any).fetch = fetchMock

        const { chatCompletion, getAiMode } = await import('./aiService')

        const result = await chatCompletion(
            [{ role: 'user', content: 'run in node script' }],
            { temperature: 0.2, maxTokens: 50, tag: 'test' },
        )

        expect(getAiMode()).toBe('kimi')
        expect(fetchMock).toHaveBeenCalledOnce()
        expect(fetchMock.mock.calls[0]?.[0]).toBe('https://api.deepseek.com/chat/completions')
        expect(result).toBe('script runtime ok')
    })
})
