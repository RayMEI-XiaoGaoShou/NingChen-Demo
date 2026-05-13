import { describe, expect, it } from 'vitest'
import modalSource from './FirstRoundGuideModal.tsx?raw'

describe('FirstRoundGuideModal overlay placement', () => {
    it('renders the guide overlay through the document body portal', () => {
        expect(modalSource).toContain('createPortal(')
        expect(modalSource).toContain('document.body')
        expect(modalSource).toContain("typeof document === 'undefined'")
    })

    it('uses the streamlined header without eyebrow or lead copy', () => {
        expect(modalSource).not.toContain('page-eyebrow')
        expect(modalSource).not.toContain('first-round-guide-lead')
        expect(modalSource).toContain('first-round-guide-header')
    })
})
