import { describe, expect, it } from 'vitest'
import { getRoundRuleContext, getMilitarySpilloverStrength, isDisasterRound, isOmenAvailableForNpc } from './roundRuleConfig'
import { INITIAL_NPCS } from './npcs'

describe('roundRuleConfig', () => {
    it('only opens 谶纬 on configured omen rounds for eligible court targets', () => {
        const zongai = INITIAL_NPCS.find(npc => npc.name === '宗艾')!
        const duguwenyue = INITIAL_NPCS.find(npc => npc.name === '独孤文约')!

        expect(isOmenAvailableForNpc(13, zongai)).toBe(true)
        expect(isOmenAvailableForNpc(13, duguwenyue)).toBe(false)
        expect(isOmenAvailableForNpc(9, zongai)).toBe(false)
    })

    it('returns invasion window and spillover pressure for war-heavy rounds', () => {
        const round16 = getRoundRuleContext(16)
        const round3 = getRoundRuleContext(3)

        expect(round16.invasionWindowLabel).toBe('南征高压')
        expect(getMilitarySpilloverStrength(16)).toBeGreaterThan(getMilitarySpilloverStrength(3))
        expect(isDisasterRound(3)).toBe(true)
        expect(round3.invasionWindowLabel).toBe('安内压制')
    })
})
