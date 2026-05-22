import { describe, expect, it } from 'vitest'

const nodeFsSpecifier: string = 'node:fs'
const { existsSync, readFileSync, statSync } = await import(nodeFsSpecifier)
const variablesCss = readFileSync(new URL('./variables.css', import.meta.url), 'utf8')
const globalCss = readFileSync(new URL('./global.css', import.meta.url), 'utf8')
const indexHtml = readFileSync(new URL('../../index.html', import.meta.url), 'utf8')
const alimamaFontPath = '/fonts/alimama-dongfangdakai/AlimamaDongFangDaKai-Regular.woff2'
const fontFileUrl = new URL('../../public/fonts/alimama-dongfangdakai/AlimamaDongFangDaKai-Regular.woff2', import.meta.url)
const licenseFileUrl = new URL('../../public/fonts/alimama-dongfangdakai/LICENSE.txt', import.meta.url)

describe('Alimama DongFangDaKai font asset wiring', () => {
    it('loads the official WOFF2 through a shared calligraphy font face with fallbacks', () => {
        expect(variablesCss).toContain("@font-face")
        expect(variablesCss).toContain("font-family: 'Alimama DongFangDaKai';")
        expect(variablesCss).toContain(`url('${alimamaFontPath}') format('woff2')`)
        expect(variablesCss).toContain('font-display: swap;')
        expect(variablesCss).toContain("--font-calligraphy: 'Alimama DongFangDaKai', KaiTi, STKaiti, SimKai")
        expect(variablesCss).toContain('--font-heading: var(--font-calligraphy);')
        expect(variablesCss).toContain('--font-body: var(--font-calligraphy);')
    })

    it('avoids browser-synthesized faux bold for the single-weight calligraphy face', () => {
        expect(globalCss).toContain('font-synthesis-weight: none;')
        expect(globalCss).not.toContain('fonts.googleapis.com')
    })

    it('preloads the WOFF2 font and keeps the license next to the shipped asset', () => {
        expect(indexHtml).toContain(`href="${alimamaFontPath}"`)
        expect(indexHtml).toContain('rel="preload"')
        expect(indexHtml).toContain('as="font"')
        expect(indexHtml).toContain('type="font/woff2"')
        expect(indexHtml).toContain('crossorigin')
        expect(existsSync(fontFileUrl)).toBe(true)
        expect(statSync(fontFileUrl).size).toBeGreaterThan(2_000_000)
        expect(statSync(fontFileUrl).size).toBeLessThan(3_000_000)
        expect(existsSync(licenseFileUrl)).toBe(true)
    })
})
