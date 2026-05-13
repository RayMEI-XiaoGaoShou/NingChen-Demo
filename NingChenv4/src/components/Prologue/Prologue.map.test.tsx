import { describe, expect, it } from 'vitest'
import prologueSource from './Prologue.tsx?raw'

describe('Prologue map contract', () => {
    it('removes the old corner label and exposes the fullscreen map interaction', () => {
        expect(prologueSource).not.toContain('prologue-map-label')
        expect(prologueSource).toContain('prologue-map-button')
        expect(prologueSource).toContain('setIsMapExpanded(true)')
        expect(prologueSource).toContain('prologue-map-overlay')
        expect(prologueSource).toContain('prologue-map-zoom-hint')
    })
})
