import { describe, expect, it } from 'vitest'
// @ts-expect-error Vitest runs this source contract in Node; the app tsconfig omits Node types.
import { existsSync, readFileSync } from 'fs'
import empressLetterSource from './EmpressLetter.tsx?raw'

const empressLetterStyles = readFileSync(new URL('./EmpressLetter.css', import.meta.url), 'utf8')
const chenqianV3Asset = new URL('../../../public/images/ui/empress-letter/chenqian-letter-foreground-v3.webp', import.meta.url)
const backgroundV2Asset = new URL('../../../public/images/ui/empress-letter/empress-letter-bg-v2.webp', import.meta.url)
const scrollAsset = new URL('../../../public/images/ui/empress-letter/empress-letter-scroll.webp', import.meta.url)

const readWebpSize = (url: URL) => {
    const bytes = readFileSync(url)

    if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') {
        throw new Error(`Expected WebP asset at ${url.pathname}`)
    }

    for (let offset = 12; offset + 8 <= bytes.length;) {
        const chunkType = bytes.toString('ascii', offset, offset + 4)
        const chunkSize = bytes.readUInt32LE(offset + 4)
        const dataOffset = offset + 8

        if (chunkType === 'VP8X') {
            return {
                width: 1 + bytes.readUIntLE(dataOffset + 4, 3),
                height: 1 + bytes.readUIntLE(dataOffset + 7, 3),
            }
        }

        if (chunkType === 'VP8 ') {
            return {
                width: bytes.readUInt16LE(dataOffset + 6) & 0x3fff,
                height: bytes.readUInt16LE(dataOffset + 8) & 0x3fff,
            }
        }

        if (chunkType === 'VP8L') {
            const dimensions = bytes.readUInt32LE(dataOffset + 1)
            return {
                width: 1 + (dimensions & 0x3fff),
                height: 1 + ((dimensions >> 14) & 0x3fff),
            }
        }

        offset += 8 + chunkSize + (chunkSize % 2)
    }

    throw new Error(`Could not read WebP dimensions for ${url.pathname}`)
}

const cssRule = (selector: string) => {
    const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return empressLetterStyles.match(new RegExp(`${escapedSelector}\\s*\\{[^}]+\\}`))?.[0] ?? ''
}

describe('EmpressLetter southern letter UI contract', () => {
    it('keeps the policy selection and submission flow intact', () => {
        expect(empressLetterSource).toContain('getPolicyQuestionForRound(currentRound')
        expect(empressLetterSource).toContain('parsePolicyReasonInput')
        expect(empressLetterSource).toContain('selectPolicy(selected, trimmedReason, policyParse)')
        expect(empressLetterSource).toContain('useSceneTransition')
        expect(empressLetterSource).toContain("variant: 'from-empress-letter'")
        expect(empressLetterSource).toContain('onCovered: nextPhase')
        expect(empressLetterSource).not.toContain('nextPhase()')
    })

    it('renders the southern layered full-screen artboard with generated assets', () => {
        expect(empressLetterSource).toContain('empress-letter-stage')
        expect(empressLetterSource).toContain('empress-letter-design-frame')
        expect(empressLetterSource).toContain('empress-letter-artboard')
        expect(empressLetterSource).toContain('empress-letter-scroll')
        expect(empressLetterSource).toContain('empress-letter-scroll-art')
        expect(empressLetterSource).toContain('empress-letter-chenqian')
        expect(empressLetterSource).not.toContain('empress-letter-mist')
        expect(empressLetterSource).toContain('empress-letter-south-seal')
        expect(empressLetterStyles).toContain('/images/ui/empress-letter/empress-letter-bg-v2.webp')
        expect(existsSync(backgroundV2Asset)).toBe(true)
        expect(empressLetterSource).toContain('/images/ui/empress-letter/empress-letter-scroll.webp')
        expect(readWebpSize(scrollAsset)).toEqual({ width: 1672, height: 941 })
        expect(empressLetterSource).toContain('/images/ui/empress-letter/chenqian-letter-foreground-v3.webp')
        expect(existsSync(chenqianV3Asset)).toBe(true)
        expect(empressLetterStyles).toContain('width: 100dvw')
        expect(empressLetterStyles).toContain('height: 100dvh')
        expect(empressLetterStyles).toContain('overflow: hidden')
        expect(`${empressLetterSource}\n${empressLetterStyles}`).not.toMatch(/\/images\/ui\/empress-letter\/[^'")]+\.(png|jpe?g)/)
    })

    it('uses text-rendered labels over image-backed option and submit assets', () => {
        expect(empressLetterSource).toContain('optionIndexLabels')
        expect(empressLetterSource).toContain('option-text')
        expect(empressLetterSource).toContain('呈递女帝')
        expect(empressLetterSource).toContain("import optionApprovalSeal from '../../assets/ui/round-start/roundstart-volume-seal.webp'")
        expect(empressLetterSource).toContain('src={optionApprovalSeal}')
        expect(empressLetterSource).not.toContain('<div className="option-stamp">准</div>')
        expect(empressLetterStyles).toContain('/images/ui/empress-letter/empress-letter-option.webp')
        expect(empressLetterStyles).toContain('/images/ui/empress-letter/empress-letter-badge')
        expect(empressLetterStyles).toContain('/images/ui/empress-letter/empress-letter-submit.webp')
        expect(empressLetterSource).toContain('/images/ui/empress-letter/empress-letter-south-seal.webp')
        expect(empressLetterStyles).not.toContain('/images/ui/empress-letter/empress-letter-seal.png')
    })

    it('keeps the note panel translucent over the empress foreground', () => {
        expect(empressLetterSource).toContain('note-panel__texture')
        expect(empressLetterSource).not.toContain('reason-helper')
        expect(empressLetterStyles).toContain('backdrop-filter')
        expect(empressLetterStyles).toContain('z-index: 6')
        expect(empressLetterStyles).toContain('mix-blend-mode')
    })

    it('keeps the page HUD in the top-right without the extra frame layer', () => {
        expect(empressLetterSource).toContain('empress-letter-utility-row')
        expect(empressLetterStyles).toContain('.empress-letter .game-hud-icon-button')
        expect(empressLetterStyles).toContain('background-image: none')
        expect(empressLetterStyles).toContain('--empress-utility-button-size: clamp(30px, 3.75cqw, 48px);')
        expect(empressLetterStyles).toContain('width: var(--empress-utility-button-size)')
        expect(empressLetterStyles).toContain('height: var(--empress-utility-button-size)')
        expect(empressLetterStyles).toContain('flex-basis: var(--empress-utility-button-size)')
        expect(empressLetterStyles).not.toContain('transform: scale(0.82)')
        expect(empressLetterStyles).not.toContain('transform: scale(0.68)')
    })

    it('uses one fixed-ratio desktop design frame for stable proportions', () => {
        const frameRule = cssRule('.empress-letter-design-frame')

        expect(frameRule).toContain('aspect-ratio: 16 / 9')
        expect(frameRule).toContain('width: min(100dvw, calc(100dvh * 16 / 9))')
        expect(frameRule).toContain('height: min(100dvh, calc(100dvw * 9 / 16))')
        expect(frameRule).toContain('container-type: size')
    })

    it('bleeds the painted background outside the centered design frame', () => {
        const backgroundIndex = empressLetterSource.indexOf('className="empress-letter-bg-wash"')
        const frameIndex = empressLetterSource.indexOf('className="empress-letter-design-frame"')
        const frameRule = cssRule('.empress-letter-design-frame')
        const backgroundRule = cssRule('.empress-letter-bg-wash')

        expect(backgroundIndex).toBeGreaterThan(-1)
        expect(frameIndex).toBeGreaterThan(-1)
        expect(backgroundIndex).toBeLessThan(frameIndex)
        expect(frameRule).toContain('z-index: 2')
        expect(frameRule).toContain('background: transparent')
        expect(backgroundRule).toContain('z-index: 0')
        expect(backgroundRule).toContain("url('/images/ui/empress-letter/empress-letter-bg-v2.webp')")
        expect(backgroundRule).not.toContain('linear-gradient')
        expect(cssRule('.empress-letter-bg-wash::after')).toBe('')
        expect(cssRule('.empress-letter-mist')).toBe('')
    })

    it('anchors desktop proportions to the design frame instead of the viewport', () => {
        const utilityRule = cssRule('.empress-letter-utility-row')
        const titleRule = cssRule('.letter-from')
        const scrollRule = cssRule('.empress-letter-scroll')
        const scrollArtRule = cssRule('.empress-letter-scroll-art')

        expect(utilityRule).toContain('top: 2.5cqh')
        expect(utilityRule).toContain('right: 2.97cqw')
        expect(titleRule).toContain('font-size: 2.75cqw')
        expect(titleRule).toContain('font-weight: 700')
        expect(titleRule).toContain('letter-spacing: 0.08cqw')
        expect(scrollRule).toContain('aspect-ratio: 1672 / 941')
        expect(scrollRule).toContain('width: 90cqw')
        expect(scrollArtRule).toContain('transform: scale(0.93)')
        expect(scrollArtRule).toContain('transform-origin: center top')
    })

    it('keeps option and submit chrome as unboxed art-backed controls', () => {
        const optionRule = cssRule('.option-btn')
        const optionPseudoRule = cssRule('.option-btn::before')
        const riskRule = cssRule('.option-risk')
        const badgeRule = cssRule('.option-index')
        const stampRule = cssRule('.option-stamp')
        const submitRule = cssRule('.empress-letter-submit')

        expect(empressLetterSource).not.toContain('gold-panel option-btn')
        expect(empressLetterStyles).toContain('--empress-kaiti-font: var(--font-calligraphy);')
        expect(optionRule).toContain("url('/images/ui/empress-letter/empress-letter-option.webp')")
        expect(optionRule).not.toContain('linear-gradient')
        expect(optionRule).toContain('background-color: transparent')
        expect(optionRule).toContain('min-height: 8.1cqh')
        expect(optionRule).toContain('drop-shadow')
        expect(optionPseudoRule).toBe('')
        expect(riskRule).toContain('font-family: var(--empress-kaiti-font)')
        expect(badgeRule).toContain('overflow: visible')
        expect(stampRule).toContain('width: 3.35cqw')
        expect(stampRule).toContain('object-fit: contain')
        expect(stampRule).toContain('mix-blend-mode: multiply')
        expect(stampRule).not.toContain('font-family')
        expect(stampRule).not.toContain('border:')
        expect(submitRule).toContain('aspect-ratio: 1711 / 616')
        expect(submitRule).toContain('appearance: none')
        expect(submitRule).toContain('background-color: transparent')
        expect(submitRule).toContain('drop-shadow')
        expect(submitRule).toContain('padding: 0')
        expect(submitRule).not.toContain('border-radius')
    })

    it('centers the empress title while keeping the secret label as a side seal', () => {
        const headerRule = cssRule('.letter-header')
        const labelRule = cssRule('.letter-label')

        expect(headerRule).toContain('left: 50%')
        expect(headerRule).toContain('flex-direction: row')
        expect(headerRule).toContain('align-items: center')
        expect(headerRule).toContain('justify-content: center')
        expect(headerRule).toContain('transform: translateX(-50%)')
        expect(labelRule).toContain('position: absolute')
        expect(labelRule).toContain('left: calc(100% + 0.72cqw)')
        expect(labelRule).toContain('margin-left: 0')
        expect(labelRule).not.toContain('box-shadow')
    })

    it('keeps the submit art button outside the note panel as its own clickable layer', () => {
        const reasonPanelStart = empressLetterSource.indexOf('className="reason-panel note-panel"')
        const submitWrapStart = empressLetterSource.indexOf('className="empress-letter-submit-wrap"')
        const reasonPanelSource = empressLetterSource.slice(reasonPanelStart, submitWrapStart)
        const submitWrapRule = cssRule('.empress-letter-submit-wrap')

        expect(reasonPanelStart).toBeGreaterThan(-1)
        expect(submitWrapStart).toBeGreaterThan(-1)
        expect(submitWrapStart).toBeGreaterThan(reasonPanelStart)
        expect(reasonPanelSource).not.toContain('empress-letter-submit')
        expect(submitWrapRule).toContain('z-index: 11')
        expect(submitWrapRule).toContain('pointer-events: none')
        expect(empressLetterSource).toContain('<span className="empress-letter-submit-label">')
    })

    it('keeps the letter copy and options visually inside the scroll artwork', () => {
        const sealRule = cssRule('.empress-letter-south-seal')
        const introRule = cssRule('.letter-intro')
        const backgroundRule = cssRule('.question-background-prominent')
        const questionRule = cssRule('.question-text')
        const decisionRule = cssRule('.letter-decision-grid')

        expect(sealRule).toContain('top: 16.2%')
        expect(introRule).toContain('top: 15.2%')
        expect(backgroundRule).toContain('font-size: 1.18cqw')
        expect(questionRule).toContain('font-size: 1.48cqw')
        expect(decisionRule).toContain('bottom: 22.2%')
        expect(decisionRule).toContain('width: 39%')
    })

    it('gives the enlarged note panel enough room for a smaller art submit button', () => {
        const reasonRule = cssRule('.reason-panel')
        const inputRule = cssRule('.reason-input')

        expect(reasonRule).toContain('right: 5.2cqw')
        expect(reasonRule).toContain('bottom: 6.4cqh')
        expect(reasonRule).toContain('width: 36.5cqw')
        expect(reasonRule).toContain('min-height: 39.5cqh')
        expect(inputRule).toContain('min-height: 17.8cqh')
    })

    it('keeps the disabled submit button visible, smaller, and centered over the art asset', () => {
        const submitWrapRule = cssRule('.empress-letter-submit-wrap')
        const submitRule = cssRule('.empress-letter-submit')
        const labelRule = cssRule('.empress-letter-submit-label')
        const disabledRule = cssRule('.empress-letter-submit:disabled')

        expect(submitWrapRule).toContain('z-index: 11')
        expect(submitWrapRule).toContain('width: 21.2cqw')
        expect(submitWrapRule).toContain('bottom: 5cqh')
        expect(submitRule).toContain('place-items: center')
        expect(labelRule).toContain('top: 34%')
        expect(labelRule).toContain('transform: translate(-50%, -50%)')
        expect(disabledRule).toContain('opacity: 0.68')
        expect(disabledRule).toContain('drop-shadow')
    })
})
