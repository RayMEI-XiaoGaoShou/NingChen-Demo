import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DowagerMediaGenerationRequest } from '../game/dowagerOffering'
import { generateDoubaoImage } from './doubaoImageGeneration'

const originalFetch = globalThis.fetch

afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
})

function installFetchMock(handler: typeof fetch) {
    globalThis.fetch = vi.fn(handler) as unknown as typeof fetch
    return vi.mocked(globalThis.fetch)
}

describe('generateDoubaoImage', () => {
    it('posts the Seedream request to the local Doubao proxy and returns an image url', async () => {
        const fetchMock = installFetchMock(async () => new Response(JSON.stringify({
            data: [{ url: 'https://example.test/generated.png' }],
        }), { status: 200, headers: { 'content-type': 'application/json' } }))

        const request: DowagerMediaGenerationRequest = {
            model: 'doubao-seedream-5-0-260128',
            prompt: 'paint late spring rain',
            response_format: 'url',
            size: '2K',
            watermark: false,
        }

        const result = await generateDoubaoImage(request)

        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/doubao/images/generations')
        expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        })
        expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject(request)
        expect(result.imageSrc).toBe('https://example.test/generated.png')
    })

    it('converts local style reference images to data urls before sending the request', async () => {
        const fetchMock = installFetchMock(async input => {
            if (input === '/images/reference.png') {
                return new Response(new Blob(['reference-bytes'], { type: 'image/png' }), { status: 200 })
            }

            return new Response(JSON.stringify({
                data: [{ b64_json: 'Z2VuZXJhdGVkLWJ5dGVz' }],
            }), { status: 200, headers: { 'content-type': 'application/json' } })
        })

        const result = await generateDoubaoImage({
            model: 'doubao-seedream-5-0-260128',
            prompt: 'paint with reference',
            image: ['/images/reference.png'],
            response_format: 'b64_json',
            size: '2K',
            watermark: false,
        })

        expect(fetchMock).toHaveBeenCalledTimes(2)
        const apiBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))
        expect(apiBody.image[0]).toMatch(/^data:image\/png;base64,/)
        expect(result.imageSrc).toBe('data:image/png;base64,Z2VuZXJhdGVkLWJ5dGVz')
    })

    it('throws a useful error when Doubao rejects the request', async () => {
        installFetchMock(async () => new Response(JSON.stringify({
            error: { message: 'invalid api key' },
        }), { status: 401, headers: { 'content-type': 'application/json' } }))

        await expect(generateDoubaoImage({
            model: 'doubao-seedream-5-0-260128',
            prompt: 'paint',
            response_format: 'url',
        })).rejects.toThrow('Doubao image generation failed with 401')
    })
})
