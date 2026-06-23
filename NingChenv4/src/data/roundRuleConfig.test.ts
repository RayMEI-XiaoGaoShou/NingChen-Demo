import { describe, expect, it } from 'vitest'
import { getRoundRuleContext, isOmenAvailableForNpc } from './roundRuleConfig'
import { INITIAL_NPCS } from './npcs'

describe('roundRuleConfig', () => {
    it('keeps omen availability tied to explicit court and external round config', () => {
        const zongai = INITIAL_NPCS.find(npc => npc.id === 'zongai')!
        const zuting = INITIAL_NPCS.find(npc => npc.id === 'zuting')!
        const duguwenyue = INITIAL_NPCS.find(npc => npc.id === 'duguwenyue')!

        expect(getRoundRuleContext(3).allowExternalOmen).toBe(true)
        expect(getRoundRuleContext(8).allowExternalOmen).toBe(true)
        expect(getRoundRuleContext(15).allowExternalOmen).toBe(true)
        expect(getRoundRuleContext(13).allowExternalOmen).toBe(false)

        expect(isOmenAvailableForNpc(13, zongai)).toBe(true)
        expect(isOmenAvailableForNpc(13, zuting)).toBe(true)
        expect(isOmenAvailableForNpc(20, zuting)).toBe(true)
        expect(getRoundRuleContext(14).omenNpcIds).toContain('zuting')
        expect(getRoundRuleContext(19).omenNpcIds).toContain('zuting')
        expect(isOmenAvailableForNpc(14, zuting)).toBe(true)
        expect(isOmenAvailableForNpc(19, zuting)).toBe(true)
        expect(isOmenAvailableForNpc(3, zuting)).toBe(false)

        expect(isOmenAvailableForNpc(3, duguwenyue)).toBe(true)
        expect(isOmenAvailableForNpc(8, duguwenyue)).toBe(true)
        expect(isOmenAvailableForNpc(15, duguwenyue)).toBe(true)
        expect(isOmenAvailableForNpc(9, duguwenyue)).toBe(false)
        expect(isOmenAvailableForNpc(13, duguwenyue)).toBe(false)
    })
})
