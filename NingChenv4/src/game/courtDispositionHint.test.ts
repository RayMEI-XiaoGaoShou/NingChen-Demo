import { describe, expect, it } from 'vitest'
import { buildCourtDispositionHint } from './courtDispositionHint'
import type { NPC } from './types'

function makeNpc(overrides: Partial<NPC>): NPC {
    return {
        id: 'zuting',
        name: '祖廷',
        title: '尚书左仆射',
        factionId: 'empress',
        trust: 50,
        powerBase: 'court',
        publicPersona: '',
        publicStance: '',
        personality: '',
        softSpot: '',
        triggerPoint: '',
        schemeHooks: '',
        secretThreads: [],
        availableSchemes: [],
        canExecute: false,
        militaryPower: 0,
        loyaltyToCourt: 100,
        alignmentBias: 'empress',
        externalStatus: 'loyal',
        highRounds: [],
        isAlive: true,
        emperorFavor: 60,
        empressDowagerFavor: 60,
        courtStatus: 'active',
        ...overrides,
    }
}

describe('courtDispositionHint', () => {
    it('summarizes stable, one-sided, dismissible, and executable court states', () => {
        expect(buildCourtDispositionHint(makeNpc({ emperorFavor: 62, empressDowagerFavor: 64 }))?.tone).toBe('stable')
        expect(buildCourtDispositionHint(makeNpc({ emperorFavor: 30, empressDowagerFavor: 64 }))?.shortText).toContain('下一步宜转打太后')
        expect(buildCourtDispositionHint(makeNpc({ emperorFavor: 34, empressDowagerFavor: 35 }))?.tone).toBe('dismissible')
        expect(buildCourtDispositionHint(makeNpc({ emperorFavor: 18, empressDowagerFavor: 18 }))?.tone).toBe('executable')
    })

    it('ignores non-target or terminal court characters', () => {
        expect(buildCourtDispositionHint(makeNpc({ id: 'zongai', name: '宗艾' }))).toBeNull()
        expect(buildCourtDispositionHint(makeNpc({ courtStatus: 'dismissed' }))).toBeNull()
    })
})
