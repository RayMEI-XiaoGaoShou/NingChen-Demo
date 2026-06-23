async function readRequestBody(request) {
    if (request.body !== undefined) {
        if (typeof request.body === 'string') return request.body
        if (Buffer.isBuffer(request.body)) return request.body.toString('utf8')
        return JSON.stringify(request.body)
    }

    const chunks = []
    for await (const chunk of request) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks).toString('utf8')
}

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST')
        return response.status(405).json({ error: 'Method not allowed' })
    }

    const apiKey = process.env.DOUBAO_API_KEY
    if (!apiKey) {
        return response.status(500).json({ error: 'DOUBAO_API_KEY is not configured' })
    }

    const baseUrl = (process.env.DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/+$/, '')
    const upstreamUrl = `${baseUrl}/images/generations`

    try {
        const upstreamResponse = await fetch(upstreamUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: await readRequestBody(request),
        })
        const payload = await upstreamResponse.text()
        const contentType = upstreamResponse.headers.get('content-type')

        if (contentType) {
            response.setHeader('Content-Type', contentType)
        }
        return response.status(upstreamResponse.status).send(payload)
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown Doubao proxy error'
        return response.status(502).json({ error: message })
    }
}
