import { describe, expect, it } from 'vitest'
import { INITIAL_NPCS } from '../data/npcs'
import { getAvailableSchemesForNpc } from './schemeEngine'

describe('omen availability', () => {
    it('allows omen only on configured court and external rounds', () => {
        const zuting = { ...INITIAL_NPCS.find(npc => npc.id === 'zuting')!, trust: 58 }
        const duguwenyue = { ...INITIAL_NPCS.find(npc => npc.id === 'duguwenyue')!, trust: 58 }

        expect(getAvailableSchemesForNpc(zuting, { round: 13, unlockedSecrets: 1 })).toContain('omen')
        expect(getAvailableSchemesForNpc(zuting, { round: 20, unlockedSecrets: 1 })).toContain('omen')
        expect(getAvailableSchemesForNpc(zuting, { round: 3, unlockedSecrets: 1 })).not.toContain('omen')

        expect(getAvailableSchemesForNpc(duguwenyue, { round: 3, unlockedSecrets: 1 })).toContain('omen')
        expect(getAvailableSchemesForNpc(duguwenyue, { round: 8, unlockedSecrets: 1 })).toContain('omen')
        expect(getAvailableSchemesForNpc(duguwenyue, { round: 15, unlockedSecrets: 1 })).toContain('omen')
        expect(getAvailableSchemesForNpc(duguwenyue, { round: 9, unlockedSecrets: 1 })).not.toContain('omen')
        expect(getAvailableSchemesForNpc(duguwenyue, { round: 13, unlockedSecrets: 1 })).not.toContain('omen')
    })

    it('keeps terminal external NPCs out of omen availability', () => {
        const terminalExternal = {
            ...INITIAL_NPCS.find(npc => npc.powerBase === 'external')!,
            trust: 90,
            loyaltyToCourt: 10,
            externalStatus: 'secession' as const,
        }

        expect(getAvailableSchemesForNpc(terminalExternal, { round: 3, unlockedSecrets: 2 })).toEqual([])
    })
})
