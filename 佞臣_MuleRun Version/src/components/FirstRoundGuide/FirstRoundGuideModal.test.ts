import { describe, expect, it } from 'vitest'
import modalSource from './FirstRoundGuideModal.tsx?raw'

describe('FirstRoundGuideModal overlay placement', () => {
    it('renders the guide overlay through the document body portal', () => {
        expect(modalSource).toContain('createPortal(')
        expect(modalSource).toContain('document.body')
        expect(modalSource).toContain("typeof document === 'undefined'")
    })
})
