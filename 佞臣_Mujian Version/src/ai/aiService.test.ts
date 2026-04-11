import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('aiService', () => {
    const originalWindow = (globalThis as any).window
    const originalFetch = (globalThis as any).fetch

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
})
