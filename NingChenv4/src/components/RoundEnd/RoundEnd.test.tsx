import { describe, expect, it } from 'vitest'
import roundEndSource from './RoundEnd.tsx?raw'

describe('RoundEnd source contract', () => {
    it('uses the updated next-round CTA copy', () => {
        expect(roundEndSource).toContain('下一回合')
        expect(roundEndSource).not.toContain('翻入下一回')
    })
})
