import { afterEach, describe, expect, it, vi } from 'vitest'
import { getFallbackResponse } from './fallback'

describe('fallback proxy copy', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('uses court-disposition pressure language for proxy success', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0)

        const text = getFallbackResponse('npc_proxy_success')

        expect(text).toContain('太后')
        expect(text).toContain('御前')
        expect(text).toContain('收网')
        expect(text).not.toContain('借刀杀人')
    })

    it('explains failed proxy as pressure below the court threshold', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0)

        const text = getFallbackResponse('npc_proxy_failure')

        expect(text).toContain('阈值')
        expect(text).toContain('施压未成')
        expect(text).not.toContain('拿我当刀使')
    })
})
