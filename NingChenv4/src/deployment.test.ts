import { describe, expect, it } from 'vitest'

const fsSpecifier = 'fs'
const { existsSync, readFileSync } = await import(fsSpecifier)

function projectFile(relativePath: string): URL {
    return new URL(`../${relativePath}`, import.meta.url)
}

function readProjectFile(relativePath: string): string {
    return readFileSync(projectFile(relativePath), 'utf8').replace(/\r\n/g, '\n')
}

describe('Vercel deployment contract', () => {
    it('declares the Vite build command and dist output directory', () => {
        const configUrl = projectFile('vercel.json')

        expect(existsSync(configUrl)).toBe(true)
        if (!existsSync(configUrl)) return

        const config = JSON.parse(readProjectFile('vercel.json')) as Record<string, unknown>
        expect(config.framework).toBe('vite')
        expect(config.buildCommand).toBe('npm run build')
        expect(config.outputDirectory).toBe('dist')
    })

    it('keeps the production DeepSeek key inside a same-origin Vercel API proxy', () => {
        const proxyUrl = projectFile('api/ai/chat/completions.js')

        expect(existsSync(proxyUrl)).toBe(true)
        if (!existsSync(proxyUrl)) return

        const proxySource = readProjectFile('api/ai/chat/completions.js')
        expect(proxySource).toContain('process.env.DEEPSEEK_API_KEY')
        expect(proxySource).toContain("process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'")
        expect(proxySource).toContain('chat/completions')
        expect(proxySource).toContain("'Authorization': `Bearer ${apiKey}`")
        expect(proxySource).not.toContain('VITE_DEEPSEEK_API_KEY')
    })

    it('keeps the production Doubao key inside a same-origin Vercel API proxy', () => {
        const proxyUrl = projectFile('api/doubao/images/generations.js')

        expect(existsSync(proxyUrl)).toBe(true)
        if (!existsSync(proxyUrl)) return

        const proxySource = readProjectFile('api/doubao/images/generations.js')
        expect(proxySource).toContain('process.env.DOUBAO_API_KEY')
        expect(proxySource).toContain("process.env.DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3'")
        expect(proxySource).toContain('images/generations')
        expect(proxySource).toContain("'Authorization': `Bearer ${apiKey}`")
        expect(proxySource).not.toContain('VITE_DOUBAO_API_KEY')
    })
})
