import { describe, expect, it } from 'vitest'
// @ts-expect-error Vitest runs this source contract in Node; the app tsconfig omits Node types.
import { existsSync, readFileSync } from 'fs'
import empressReplySource from './EmpressReply.tsx?raw'

const empressReplyStyles = readFileSync(new URL('./EmpressReply.css', import.meta.url), 'utf8')
const replyBackgroundAsset = new URL('../../../public/images/ui/empress-reply/empress-reply-bg.webp', import.meta.url)
const replyScrollAsset = new URL('../../../public/images/ui/empress-reply/empress-reply-scroll.webp', import.meta.url)
const replyForegroundAsset = new URL('../../../public/images/ui/empress-reply/empress-reply-foreground.webp', import.meta.url)
const submitAsset = new URL('../../../public/images/ui/empress-letter/empress-letter-submit.webp', import.meta.url)
const southSealAsset = new URL('../../../public/images/ui/empress-letter/empress-letter-south-seal.webp', import.meta.url)

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
    return empressReplyStyles.match(new RegExp(`${escapedSelector}\\s*\\{[^}]+\\}`))?.[0] ?? ''
}

describe('EmpressReply source contract', () => {
    it('generates and caches the empress reply before settlement', () => {
        expect(empressReplySource).toContain('generateEmpressReplyRecordForPolicy')
        expect(empressReplySource).toContain("tag: 'empress_feedback_reply_page'")
        expect(empressReplySource).toContain("playerDangerStage: roundStartSnapshot?.playerDangerStage ?? 'safe'")
        expect(empressReplySource).toContain('worldMemoryLedger')
        expect(empressReplySource).toContain('setEmpressReplyRecord({')
        expect(empressReplySource).toContain("mode: 'fallback'")
        expect(empressReplySource).toContain('useSceneTransition')
        expect(empressReplySource).toContain("variant: 'to-settlement'")
        expect(empressReplySource).toContain('onCovered: nextPhase')
        expect(empressReplySource).not.toContain('playerDangerStage: lastSettlement.playerDangerStage')
        expect(empressReplySource).not.toContain('onClick={nextPhase}')
    })

    it('skips the AI call when the player did not author a policy reason', () => {
        expect(empressReplySource).toContain('generateEmpressReplyRecordForPolicy')
        expect(empressReplySource).toContain('buildSettlementDefaultEmpressReply(policyReport)')
    })

    it('shows the selected option, current effects, and authored-reason status', () => {
        expect(empressReplySource).toContain('所取策令：')
        expect(empressReplySource).toContain('奏折附言：')
        expect(empressReplySource).toContain('formatPolicyOptionLabel(policyReport.optionLabel)')
        expect(empressReplySource).toContain("A: '甲'")
        expect(empressReplySource).not.toContain('不额外调动女帝 Agent')
        expect(empressReplySource).toContain('policyReport.optionLabel')
        expect(empressReplySource).toContain('policyReport.optionContent')
        expect(empressReplySource).toContain('policyReport?.reason.trim()')
        expect(empressReplySource).toContain('南陈国力变化')
        expect(empressReplySource).toContain('言之有物')
        expect(empressReplySource).toContain('你抓住了问题的关键，此谏言产生的影响会持续至后续卷')
        expect(empressReplySource).not.toContain('本卷南陈国力变化')
        expect(empressReplySource).not.toContain('论证切题')
        expect(empressReplySource).toContain('未具附言')
    })

    it('renders the reply as a southern full-screen stage using the new reply art system', () => {
        expect(empressReplySource).toContain('empress-reply-stage')
        expect(empressReplySource).toContain('empress-reply-design-frame')
        expect(empressReplySource).toContain('empress-reply-bg-wash')
        expect(empressReplySource).toContain('empress-reply-artboard')
        expect(empressReplySource).toContain('empress-reply-paper')
        expect(empressReplySource).toContain('empress-reply-scroll-art')
        expect(empressReplySource).toContain('empress-reply-foreground-bleed')
        expect(empressReplySource).toContain('empress-reply-foreground-proxy')
        expect(empressReplySource).toContain('empress-reply-foreground')
        expect(empressReplySource).toContain('empress-reply-south-seal')
        expect(empressReplySource).not.toContain('NpcPortrait')
        expect(empressReplySource).not.toContain('gold-panel')
        expect(empressReplySource).not.toContain('decree-panel')
        expect(empressReplyStyles).toContain('/images/ui/empress-reply/empress-reply-bg.webp')
        expect(empressReplySource).toContain('/images/ui/empress-reply/empress-reply-scroll.webp')
        expect(empressReplySource).toContain('/images/ui/empress-reply/empress-reply-foreground.webp')
        expect(empressReplySource).toContain('/images/ui/empress-letter/empress-letter-south-seal.webp')
        expect(`${empressReplySource}\n${empressReplyStyles}`).not.toMatch(/\/images\/ui\/empress-reply\/[^'")]+\.(png|jpe?g)/)
        expect(empressReplyStyles).not.toContain('/images/ui/empress-letter/empress-letter-bg-v2.webp')
        expect(empressReplySource).not.toContain('/images/ui/empress-letter/empress-letter-scroll.webp')
        expect(empressReplySource).not.toContain('/images/ui/empress-letter/chenqian-letter-foreground-v3.webp')
        expect(existsSync(replyBackgroundAsset)).toBe(true)
        expect(existsSync(replyScrollAsset)).toBe(true)
        expect(existsSync(replyForegroundAsset)).toBe(true)
        expect(readWebpSize(replyBackgroundAsset)).toEqual({ width: 1672, height: 941 })
        expect(readWebpSize(replyScrollAsset)).toEqual({ width: 1672, height: 941 })
        expect(readWebpSize(replyForegroundAsset)).toEqual({ width: 1328, height: 1184 })
    })

    it('uses a fixed 16:9 design frame with a full-bleed painted background', () => {
        const pageRule = cssRule('.empress-reply.page-container')
        const stageRule = cssRule('.empress-reply-stage')
        const frameRule = cssRule('.empress-reply-design-frame')
        const backgroundRule = cssRule('.empress-reply-bg-wash')

        expect(pageRule).toContain('position: fixed')
        expect(pageRule).toContain('width: 100dvw')
        expect(pageRule).toContain('height: 100dvh')
        expect(stageRule).toContain('place-items: center')
        expect(frameRule).toContain('aspect-ratio: 16 / 9')
        expect(frameRule).toContain('width: min(100dvw, calc(100dvh * 16 / 9))')
        expect(frameRule).toContain('height: min(100dvh, calc(100dvw * 9 / 16))')
        expect(frameRule).toContain('container-type: size')
        expect(backgroundRule).toContain("url('/images/ui/empress-reply/empress-reply-bg.webp')")
    })

    it('uses the shared calligraphy font stack for the empress reply page', () => {
        expect(empressReplyStyles).toContain('--empress-kaiti-font: var(--font-calligraphy);')
        expect(cssRule('.empress-reply.page-container')).toContain('font-family: var(--empress-kaiti-font)')
    })

    it('places the summary, reply body, authored-reason judgment, and effects inside the scroll', () => {
        expect(empressReplySource).toContain('empress-reply-summary-strip')
        expect(empressReplySource).toContain('empress-reply-summary-copy')
        expect(empressReplySource).toContain('empress-reply-reply-panel')
        expect(empressReplySource).toContain('empress-reply-verdict-panel')
        expect(empressReplySource).toContain('empress-reply-change-panel')
        expect(empressReplySource).toContain('empress-reply-effects')
        expect(empressReplySource).not.toContain('policyReport.effectSummary')
        expect(empressReplySource).not.toContain('empress-reply-meta-card')
        expect(cssRule('.empress-reply-summary-copy')).toContain('font-size: 1.18cqw')
        expect(cssRule('.empress-reply-body')).toContain('font-size: 1.48cqw')
        expect(cssRule('.empress-reply-scroll-art')).toContain('transform: translate(10.2cqw, 4.2cqh)')
        expect(empressReplyStyles).not.toContain('.empress-reply-paper::before')
        expect(cssRule('.empress-reply-header')).toContain('top: 2.6cqh')
        expect(cssRule('.empress-reply-header')).toContain('left: 50cqw')
        expect(cssRule('.empress-reply-from')).toContain('color: #17382f')
        expect(cssRule('.empress-reply-from')).not.toContain('-webkit-text-stroke')
        expect(cssRule('.empress-reply-from')).toContain('0 0.4cqw 0.62cqw rgba(255, 244, 190, 0.42)')
        expect(cssRule('.empress-reply-seal')).toContain('color: #a53126')
        expect(cssRule('.empress-reply-seal')).toContain('border: 1px solid rgba(168, 48, 39, 0.86)')
        expect(cssRule('.empress-reply-south-seal')).toContain('left: 33.2cqw')
        expect(cssRule('.empress-reply-south-seal')).toContain('top: 18.0cqh')
        expect(cssRule('.empress-reply-summary-strip')).toContain('left: 39.6cqw')
        expect(cssRule('.empress-reply-summary-strip')).toContain('top: 17.2cqh')
        expect(cssRule('.empress-reply-summary-strip')).toContain('width: 47.2cqw')
        expect(cssRule('.empress-reply.page-container')).toContain('--empress-reply-content-left: 36.4cqw')
        expect(cssRule('.empress-reply.page-container')).toContain('--empress-reply-content-width: 52.6cqw')
        expect(cssRule('.empress-reply-reply-panel')).toContain('left: var(--empress-reply-content-left)')
        expect(cssRule('.empress-reply-reply-panel')).toContain('top: 32.2cqh')
        expect(cssRule('.empress-reply-reply-panel')).toContain('width: var(--empress-reply-content-width)')
        expect(cssRule('.empress-reply-lower-grid')).toContain('left: var(--empress-reply-content-left)')
        expect(cssRule('.empress-reply-lower-grid')).toContain('top: 63.2cqh')
        expect(cssRule('.empress-reply-lower-grid')).toContain('width: var(--empress-reply-content-width)')
        expect(cssRule('.empress-reply-lower-grid')).toContain('grid-template-columns: minmax(0, 0.44fr) minmax(0, 0.56fr)')
        expect(cssRule('.empress-reply-lower-grid')).toContain('gap: 2.8cqw')
        expect(cssRule('.empress-reply-submit-wrap')).toContain('left: 53.8cqw')
        expect(cssRule('.empress-reply-submit-wrap')).toContain('bottom: 2.6cqh')
        expect(cssRule('.empress-reply-foreground-bleed')).toContain('inset: 0')
        expect(cssRule('.empress-reply-foreground-bleed')).toContain('overflow: hidden')
        expect(cssRule('.empress-reply-foreground-proxy')).toContain('width: min(100dvw, calc(100dvh * 16 / 9))')
        expect(cssRule('.empress-reply-foreground-proxy')).toContain('height: min(100dvh, calc(100dvw * 9 / 16))')
        expect(cssRule('.empress-reply-foreground-proxy')).toContain('container-type: size')
        expect(cssRule('.empress-reply-foreground-proxy')).toContain('overflow: visible')
        expect(cssRule('.empress-reply-foreground')).toContain('left: -14.5cqw')
        expect(cssRule('.empress-reply-foreground')).toContain('bottom: -1.4cqh')
        expect(cssRule('.empress-reply-foreground')).toContain('width: 54.5cqw')

        for (const rule of [
            cssRule('.empress-reply-summary-strip'),
            cssRule('.empress-reply-reply-panel'),
            cssRule('.empress-reply-scroll-panel'),
        ]) {
            expect(rule).not.toContain('border:')
            expect(rule).not.toContain('background:')
            expect(rule).not.toContain('box-shadow:')
        }
    })

    it('keeps the title label, vertical seal, and art button from the letter system', () => {
        expect(empressReplySource).toContain('密札')
        expect(empressReplySource).not.toContain('密批已至')
        expect(empressReplySource).toContain('/images/ui/empress-letter/empress-letter-south-seal.webp')
        expect(empressReplyStyles).toContain('/images/ui/empress-letter/empress-letter-submit.webp')
        expect(empressReplySource).toContain('formatReplySouthDimensionLabel')
        expect(empressReplySource).toContain("label === '民生秩序' ? '民生' : label")
        expect(empressReplySource).toContain('formatReplySouthDimensionLabel(dimension)')
        expect(existsSync(southSealAsset)).toBe(true)
        expect(existsSync(submitAsset)).toBe(true)
    })

    it('uses an unboxed image-backed continue button instead of the global primary button', () => {
        const submitWrapRule = cssRule('.empress-reply-submit-wrap')
        const submitRule = cssRule('.empress-reply-submit')
        const labelRule = cssRule('.empress-reply-submit-label')

        expect(empressReplySource).toContain('className="empress-reply-submit-wrap"')
        expect(empressReplySource).toContain('className="empress-reply-submit"')
        expect(empressReplySource).toContain('<span className="empress-reply-submit-label">查看本卷结算</span>')
        expect(empressReplySource).not.toContain('btn-primary btn-next')
        expect(empressReplyStyles).toContain('/images/ui/empress-letter/empress-letter-submit.webp')
        expect(submitWrapRule).toContain('pointer-events: none')
        expect(submitRule).toContain('aspect-ratio: 1711 / 616')
        expect(submitRule).toContain('appearance: none')
        expect(submitRule).toContain('background-color: transparent')
        expect(submitRule).toContain('padding: 0')
        expect(submitRule).toContain('border: 0')
        expect(submitRule).not.toContain('border-radius')
        expect(labelRule).toContain('position: absolute')
        expect(labelRule).toContain('top: 34%')
    })
})
