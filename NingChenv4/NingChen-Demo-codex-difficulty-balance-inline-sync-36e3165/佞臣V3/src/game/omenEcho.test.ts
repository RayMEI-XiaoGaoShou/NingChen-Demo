import { describe, expect, it } from 'vitest'
import { INITIAL_RELATIONSHIP_EDGES } from '../data/npcRelationships'
import { INITIAL_NPCS } from '../data/npcs'
import { buildOmenEchoFallbackText, selectOmenEchoSpeaker } from './omenEcho'

describe('selectOmenEchoSpeaker', () => {
    it('chooses a court speaker rather than the external target itself for an external omen', () => {
        const targetNpc = INITIAL_NPCS.find(npc => npc.powerBase === 'external' && npc.militaryPower === 55)!

        const selection = selectOmenEchoSpeaker({
            targetNpc,
            npcs: INITIAL_NPCS,
            relationships: INITIAL_RELATIONSHIP_EDGES,
        })

        expect(selection).not.toBeNull()
        expect(selection?.speakerNpc.powerBase).toBe('court')
        expect(selection?.speakerNpc.id).not.toBe(targetNpc.id)
    })

    it('excludes terminal candidates from consideration', () => {
        const targetNpc = INITIAL_NPCS.find(npc => npc.powerBase === 'external' && npc.militaryPower === 55)!
        const terminalNpc = {
            ...INITIAL_NPCS.find(npc => npc.id === 'zuting')!,
            isAlive: false,
            courtStatus: 'executed' as const,
        }
        const viableNpc = INITIAL_NPCS.find(npc => npc.id === 'yuwendi')!

        const selection = selectOmenEchoSpeaker({
            targetNpc,
            npcs: [terminalNpc, viableNpc],
            relationships: [],
        })

        expect(selection).not.toBeNull()
        expect(selection?.speakerNpc.id).toBe(viableNpc.id)
    })

    it('excludes non-terminal candidates that have no available schemes', () => {
        const targetNpc = INITIAL_NPCS.find(npc => npc.powerBase === 'external' && npc.militaryPower === 55)!
        const unavailableNpc = {
            ...INITIAL_NPCS.find(npc => npc.id === 'zuting')!,
            isAlive: true,
            courtStatus: 'active' as const,
            availableSchemes: [],
        }
        const viableNpc = INITIAL_NPCS.find(npc => npc.id === 'yuwendi')!

        const selection = selectOmenEchoSpeaker({
            targetNpc,
            npcs: [unavailableNpc, viableNpc],
            relationships: [],
        })

        expect(selection).not.toBeNull()
        expect(selection?.speakerNpc.id).toBe(viableNpc.id)
    })
})

describe('buildOmenEchoFallbackText', () => {
    it('produces stable external-suspicion copy with central reaction language', () => {
        const targetNpc = INITIAL_NPCS.find(npc => npc.powerBase === 'external' && npc.militaryPower === 55)!
        const speakerNpc = INITIAL_NPCS.find(npc => npc.id === 'linghuelvguang')!

        const text = buildOmenEchoFallbackText({
            speakerNpc,
            targetNpc,
            round: 13,
            eventName: '\u94c1\u9a91\u5f02\u52a8',
            eventBriefing: '\u671d\u4e2d\u6b63\u8bae\u8bba\u5916\u9547\u662f\u5426\u4f1a\u501f\u4e71\u81ea\u91cd\u3002',
            omenText: '\u77f3\u9a6c\u591c\u9e23\uff0c\u897f\u9547\u519b\u65d7\u5ffd\u52a8\u3002',
            interpretationText: '\u6b64\u975e\u72ec\u5929\u707e\uff0c\u6050\u662f\u5916\u9547\u501f\u5175\u81ea\u91cd\u4e4b\u5146\u3002',
            parseSummary: 'omenPolarity=destabilizing; centralSanctionLeverage=0.83',
        })

        expect(text).not.toBe('')
        expect(text).toContain('\u4e2d\u67a2')
        expect(text).toContain('\u622a\u65ad\u7cae\u9053')
        expect(text).toContain('\u5fa1\u53f2\u76d1\u7763')
    })
})
