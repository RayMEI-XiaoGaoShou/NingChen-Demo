import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('aiService', () => {
    const originalWindow = (globalThis as any).window
    const originalFetch = (globalThis as any).fetch
    const processEnv = ((globalThis as any).process?.env ?? {}) as Record<string, string | undefined>
    const originalEnv = {
        VITE_DEEPSEEK_API_KEY: processEnv.VITE_DEEPSEEK_API_KEY,
        VITE_DEEPSEEK_BASE_URL: processEnv.VITE_DEEPSEEK_BASE_URL,
        VITE_DEEPSEEK_MODEL: processEnv.VITE_DEEPSEEK_MODEL,
        VITE_KIMI_API_KEY: processEnv.VITE_KIMI_API_KEY,
        VITE_KIMI_BASE_URL: processEnv.VITE_KIMI_BASE_URL,
        VITE_KIMI_MODEL: processEnv.VITE_KIMI_MODEL,
        VITE_AI_REQUEST_TIMEOUT_MS: processEnv.VITE_AI_REQUEST_TIMEOUT_MS,
        DEV: processEnv.DEV,
    }

    beforeEach(() => {
        vi.resetModules()
        vi.restoreAllMocks()
    })

    afterEach(() => {
        vi.useRealTimers()
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
        processEnv.VITE_DEEPSEEK_API_KEY = 'script-runtime-key'
        processEnv.VITE_DEEPSEEK_BASE_URL = 'https://api.deepseek.com'
        processEnv.VITE_DEEPSEEK_MODEL = 'deepseek-v4-flash'
        delete processEnv.VITE_KIMI_API_KEY
        delete processEnv.VITE_KIMI_BASE_URL
        delete processEnv.VITE_KIMI_MODEL
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

        expect(getAiMode()).toBe('deepseek')
        expect(fetchMock).toHaveBeenCalledOnce()
        expect(fetchMock.mock.calls[0]?.[0]).toBe('https://api.deepseek.com/chat/completions')
        expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toEqual(expect.objectContaining({
            model: 'deepseek-v4-flash',
            thinking: { type: 'disabled' },
        }))
        expect(result).toBe('script runtime ok')
    })

    it('uses the local dev proxy when DEV is truthy at runtime', async () => {
        delete (globalThis as any).window
        processEnv.VITE_DEEPSEEK_API_KEY = 'script-runtime-key'
        processEnv.VITE_DEEPSEEK_BASE_URL = 'https://api.deepseek.com'
        processEnv.VITE_DEEPSEEK_MODEL = 'deepseek-v4-flash'
        delete processEnv.VITE_KIMI_API_KEY
        delete processEnv.VITE_KIMI_BASE_URL
        delete processEnv.VITE_KIMI_MODEL
        ;(processEnv as Record<string, unknown>).DEV = true as never

        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: 'proxy ok' } }],
            }),
        })
        ;(globalThis as any).fetch = fetchMock

        const { chatCompletion, getAiMode } = await import('./aiService')

        const result = await chatCompletion(
            [{ role: 'user', content: 'use local proxy' }],
            { temperature: 0.2, maxTokens: 50, tag: 'test' },
        )

        expect(getAiMode()).toBe('deepseek')
        expect(fetchMock).toHaveBeenCalledOnce()
        expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/ai/chat/completions')
        expect(result).toBe('proxy ok')
    })

    it('keeps legacy VITE_KIMI_* variables as a compatibility fallback', async () => {
        delete (globalThis as any).window
        delete processEnv.VITE_DEEPSEEK_API_KEY
        delete processEnv.VITE_DEEPSEEK_BASE_URL
        delete processEnv.VITE_DEEPSEEK_MODEL
        processEnv.VITE_KIMI_API_KEY = 'legacy-runtime-key'
        processEnv.VITE_KIMI_BASE_URL = 'https://api.deepseek.com'
        processEnv.VITE_KIMI_MODEL = 'deepseek-chat'
        processEnv.DEV = 'false'

        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: 'legacy ok' } }],
            }),
        })
        ;(globalThis as any).fetch = fetchMock

        const { chatCompletion, getAiMode } = await import('./aiService')

        const result = await chatCompletion(
            [{ role: 'user', content: 'use legacy env names' }],
            { temperature: 0.2, maxTokens: 50, tag: 'test' },
        )

        expect(getAiMode()).toBe('deepseek')
        expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toEqual(expect.objectContaining({
            model: 'deepseek-chat',
        }))
        expect(result).toBe('legacy ok')
    })

    it('falls back instead of hanging when the remote completion request never resolves', async () => {
        vi.useFakeTimers()
        delete (globalThis as any).window
        processEnv.VITE_DEEPSEEK_API_KEY = 'script-runtime-key'
        processEnv.VITE_DEEPSEEK_BASE_URL = 'https://api.deepseek.com'
        processEnv.VITE_DEEPSEEK_MODEL = 'deepseek-v4-flash'
        delete processEnv.VITE_KIMI_API_KEY
        delete processEnv.VITE_KIMI_BASE_URL
        delete processEnv.VITE_KIMI_MODEL
        processEnv.VITE_AI_REQUEST_TIMEOUT_MS = '25'
        processEnv.DEV = 'false'

        const fetchMock = vi.fn().mockReturnValue(new Promise(() => undefined))
        ;(globalThis as any).fetch = fetchMock

        const { chatCompletion } = await import('./aiService')

        const pendingResult = chatCompletion(
            [{ role: 'user', content: 'remote call may hang' }],
            { temperature: 0.2, maxTokens: 50, tag: 'npc_advise_success' },
        )

        await vi.advanceTimersByTimeAsync(30)
        const result = await Promise.race([
            pendingResult,
            Promise.resolve('__still_pending__'),
        ])

        expect(result).not.toBe('__still_pending__')
        expect(typeof result).toBe('string')
        expect(fetchMock).toHaveBeenCalledOnce()
        vi.useRealTimers()
    })

    it('retries json completion once when the first response is truncated', async () => {
        delete (globalThis as any).window
        processEnv.VITE_DEEPSEEK_API_KEY = 'script-runtime-key'
        processEnv.VITE_DEEPSEEK_BASE_URL = 'https://api.deepseek.com'
        processEnv.VITE_DEEPSEEK_MODEL = 'deepseek-v4-flash'
        delete processEnv.VITE_KIMI_API_KEY
        delete processEnv.VITE_KIMI_BASE_URL
        delete processEnv.VITE_KIMI_MODEL
        processEnv.DEV = 'false'

        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: '{"characterFit":0.8,"eventFit":0.7,"evidence":["第一条","第二条"' } }],
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: '{"characterFit":0.8,"eventFit":0.7,"evidence":["第一条","第二条"]}' } }],
                }),
            })
        ;(globalThis as any).fetch = fetchMock

        const { chatCompletionJson } = await import('./aiService')

        const result = await chatCompletionJson<{ characterFit: number; eventFit: number; evidence: string[] }>(
            [{ role: 'user', content: 'return json only' }],
            { temperature: 0.2, maxTokens: 120, tag: 'north_scheme_parse' },
        )

        expect(fetchMock).toHaveBeenCalledTimes(2)
        expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toEqual(expect.objectContaining({
            thinking: { type: 'disabled' },
        }))
        expect(result).toEqual({
            characterFit: 0.8,
            eventFit: 0.7,
            evidence: ['第一条', '第二条'],
        })
    })

    it('retries json completion with a strict JSON correction when the model returns prose', async () => {
        delete (globalThis as any).window
        processEnv.VITE_DEEPSEEK_API_KEY = 'script-runtime-key'
        processEnv.VITE_DEEPSEEK_BASE_URL = 'https://api.deepseek.com'
        processEnv.VITE_DEEPSEEK_MODEL = 'deepseek-v4-flash'
        processEnv.DEV = 'false'

        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: '我认为这段说辞较为有效，但不是 JSON。' } }],
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: '{"focusAlignment":0.6,"executionClarity":0.5}' } }],
                }),
            })
        ;(globalThis as any).fetch = fetchMock

        const { chatCompletionJson } = await import('./aiService')

        const result = await chatCompletionJson<{ focusAlignment: number; executionClarity: number }>(
            [{ role: 'user', content: 'return json only' }],
            { temperature: 0.2, maxTokens: 80, tag: 'policy_reason_parse' },
        )

        expect(fetchMock).toHaveBeenCalledTimes(2)
        const retryBody = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string)
        expect(retryBody.messages.at(-1)?.content).toContain('上一轮输出不是可解析的严格 JSON')
        expect(result).toEqual({
            focusAlignment: 0.6,
            executionClarity: 0.5,
        })
    })
})
