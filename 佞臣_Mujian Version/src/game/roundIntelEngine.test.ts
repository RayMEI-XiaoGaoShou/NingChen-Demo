import { describe, expect, it } from 'vitest'
import { INITIAL_NPCS } from '../data/npcs'
import { buildAdvisorHint, getHighlightedNpcIds, getNpcRoundReaction } from './roundIntelEngine'

describe('buildAdvisorHint', () => {
    it('mentions only alive key figures for the round', () => {
        const hint = buildAdvisorHint(
            {
                coreNpcIds: ['yuwendi', 'zuting', 'zongai'],
                reactions: {
                    yuwendi: '借边事催逼南征。',
                    zuting: '想把边报与流民都按在中枢手里。',
                    zongai: '借宫中信息差做接口。',
                },
            },
            [
                { id: 'yuwendi', name: '宇文棣', isAlive: true },
                { id: 'zuting', name: '祖廷', isAlive: false },
                { id: 'zongai', name: '宗艾', isAlive: true },
            ],
        )

        expect(hint).toContain('宇文棣')
        expect(hint).toContain('宗艾')
        expect(hint).not.toContain('祖廷')
        expect(hint).not.toContain('。；')
    })

    it('returns only alive highlighted NPC ids for current round focus', () => {
        const focusedIds = getHighlightedNpcIds(5, [
            { id: 'hebaboguì', name: '贺拔伯圭', isAlive: true },
            { id: 'duguwenyue', name: '独孤文约', isAlive: false },
            { id: 'zuting', name: '祖廷', isAlive: true },
            { id: 'yuwendi', name: '宇文棣', isAlive: true },
        ])

        expect(focusedIds).toEqual(['hebaboguì', 'zuting', 'yuwendi'])
    })

    it('reveals sharper motive-facing reactions as intel depth increases', () => {
        const yuwendi = INITIAL_NPCS.find(npc => npc.id === 'yuwendi')!
        const shallow = getNpcRoundReaction(14, yuwendi, 0)
        const deep = getNpcRoundReaction(14, yuwendi, 3)

        expect(shallow).not.toEqual(deep)
        expect(deep).toContain('归政')
    })
})
