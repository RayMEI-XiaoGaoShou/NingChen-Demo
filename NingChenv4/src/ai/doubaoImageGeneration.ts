import type { DowagerMediaGenerationRequest } from '../game/dowagerOffering'

const DOUBAO_IMAGE_PROXY_ENDPOINT = '/api/doubao/images/generations'

export interface DoubaoImageGenerationResult {
    imageSrc: string
    raw: unknown
}

interface DoubaoImageGenerationOptions {
    endpoint?: string
}

interface DoubaoImageResponse {
    data?: Array<{
        url?: string
        b64_json?: string
    }>
    error?: {
        message?: string
    } | string
}

function isRemoteOrDataReference(src: string): boolean {
    return /^(https?:|data:|blob:)/i.test(src)
}

function inferMimeType(src: string, blob: Blob): string {
    if (blob.type) return blob.type
    if (/\.webp($|\?)/i.test(src)) return 'image/webp'
    if (/\.jpe?g($|\?)/i.test(src)) return 'image/jpeg'
    return 'image/png'
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    const chunkSize = 0x8000
    for (let index = 0; index < bytes.length; index += chunkSize) {
        const chunk = bytes.subarray(index, index + chunkSize)
        binary += String.fromCharCode(...chunk)
    }
    return btoa(binary)
}

async function localImageToDataUrl(src: string): Promise<string> {
    const response = await fetch(src)
    if (!response.ok) {
        throw new Error(`Failed to load local Doubao reference image ${src}: ${response.status}`)
    }

    const blob = await response.blob()
    const mimeType = inferMimeType(src, blob)
    return `data:${mimeType};base64,${arrayBufferToBase64(await blob.arrayBuffer())}`
}

async function normalizeImageReference(src: string): Promise<string> {
    if (isRemoteOrDataReference(src)) return src
    return localImageToDataUrl(src)
}

function extractDoubaoErrorMessage(payload: unknown): string | null {
    const parsed = payload as DoubaoImageResponse | null
    if (!parsed?.error) return null
    if (typeof parsed.error === 'string') return parsed.error
    return parsed.error.message ?? null
}

function extractGeneratedImageSrc(payload: unknown): string | null {
    const parsed = payload as DoubaoImageResponse | null
    const firstImage = parsed?.data?.find(item => item.url || item.b64_json)
    if (!firstImage) return null
    if (firstImage.url) return firstImage.url
    if (firstImage.b64_json) return `data:image/png;base64,${firstImage.b64_json}`
    return null
}

export async function generateDoubaoImage(
    request: DowagerMediaGenerationRequest,
    options: DoubaoImageGenerationOptions = {},
): Promise<DoubaoImageGenerationResult> {
    const endpoint = options.endpoint ?? DOUBAO_IMAGE_PROXY_ENDPOINT
    const normalizedRequest: DowagerMediaGenerationRequest = {
        ...request,
        image: request.image
            ? await Promise.all(request.image.map(normalizeImageReference))
            : undefined,
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedRequest),
    })

    let payload: unknown = null
    try {
        payload = await response.json()
    } catch {
        payload = null
    }

    if (!response.ok) {
        const message = extractDoubaoErrorMessage(payload)
        throw new Error(`Doubao image generation failed with ${response.status}${message ? `: ${message}` : ''}`)
    }

    const imageSrc = extractGeneratedImageSrc(payload)
    if (!imageSrc) {
        throw new Error('Doubao image generation did not return an image.')
    }

    return { imageSrc, raw: payload }
}
