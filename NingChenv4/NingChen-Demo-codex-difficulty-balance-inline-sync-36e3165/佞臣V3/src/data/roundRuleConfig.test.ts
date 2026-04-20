import { describe, expect, it } from 'vitest'
import { getRoundRuleContext, getMilitarySpilloverStrength, isDisasterRound, isOmenAvailableForNpc } from './roundRuleConfig'
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
        expect(isOmenAvailableForNpc(3, zuting)).toBe(false)

        expect(isOmenAvailableForNpc(3, duguwenyue)).toBe(true)
        expect(isOmenAvailableForNpc(8, duguwenyue)).toBe(true)
        expect(isOmenAvailableForNpc(15, duguwenyue)).toBe(true)
        expect(isOmenAvailableForNpc(9, duguwenyue)).toBe(false)
        expect(isOmenAvailableForNpc(13, duguwenyue)).toBe(false)
    })

    it('returns invasion window and spillover pressure for war-heavy rounds', () => {
        const round16 = getRoundRuleContext(16)
        const round3 = getRoundRuleContext(3)

        expect(round16.invasionWindowLabel).toBe('鍗楀緛楂樺帇')
        expect(getMilitarySpilloverStrength(16)).toBeGreaterThan(getMilitarySpilloverStrength(3))
        expect(isDisasterRound(3)).toBe(true)
        expect(round3.invasionWindowLabel).toBe('瀹夊唴鍘嬪埗')
    })
})
