import { describe, expect, it } from 'vitest'
import { buildOmenTargetHint } from './omenTargetHint'

describe('buildOmenTargetHint', () => {
    it('prefers legitimacy-sensitive central figures', () => {
        const hint = buildOmenTargetHint({
            npc: {
                id: 'zong-ai',
                name: '宗艾',
                powerBase: 'court',
                factionId: 'emperor',
                publicStance: '掌诏令与中枢节次',
                title: '中书令',
            } as any,
        })

        expect(hint).toContain('名分')
    })

    it('warns when the target is more practical than symbolic', () => {
        const hint = buildOmenTargetHint({
            npc: {
                id: 'linghu',
                name: '令狐律光',
                powerBase: 'court',
                factionId: 'emperor',
                publicStance: '务实治军',
                title: '大都督',
            } as any,
        })

        expect(hint).toContain('未必是最优先手')
    })
})
