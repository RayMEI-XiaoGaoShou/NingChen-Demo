import { describe, expect, it } from 'vitest'
import { CHARACTER_CANON_BY_ID } from '../ai/promptCanon'
import { INITIAL_FACTIONS } from './factions'
import { INITIAL_NPCS } from './npcs'

describe('INITIAL_NPCS secret threads', () => {
    it('compresses each NPC to two critical, non-duplicated secret threads', () => {
        for (const npc of INITIAL_NPCS) {
            expect(npc.secretThreads).toHaveLength(2)
        }
    })

    it('keeps 贺拔伯圭暗线 aligned with the optimized secret-thread design', () => {
        const npc = INITIAL_NPCS.find(item => item.name === '贺拔伯圭')
        expect(npc?.secretThreads).toEqual([
            '他真正要的是以护商道、镇边患为名，把河西、陇右一带的军府、关隘、粮道和商税变成贺拔家的长期私权，而不只是替朝廷临时守边。',
            '他依仗太后血亲身份向朝廷索权，但最怕太后为稳局改扶独孤文约；凡能证明独孤比他更受中枢信任，都会触发他的嫉恨和抢先压制。',
        ])
    })

    it('keeps 宗艾暗线 focused on personal interests rather than existing mechanics', () => {
        const npc = INITIAL_NPCS.find(item => item.name === '宗艾')
        expect(npc?.secretThreads).toEqual([
            '他最深的个人利益是摆脱“低贱宫人”的羞辱感，获得被文武两班承认的权力与尊严；轻贱宦官身份会激怒他，平等托付机密会打动他。',
            '他与小皇帝是利益共同体而非帝党附庸：皇帝越能绕过太后与权臣亲自发号施令，宗艾越能抬高身价；若帝党士人只把他当脏手和传声筒，他也会反制。',
        ])
    })
})

describe('seed canon consistency', () => {
    it('does not seed forbidden title combinations into data that prompts later reuse', () => {
        const seedText = [
            ...INITIAL_NPCS.flatMap(npc => [
                npc.name,
                npc.title,
                npc.publicPersona,
                npc.publicStance,
                npc.personality,
                ...npc.secretThreads,
            ]),
            ...INITIAL_FACTIONS.flatMap(faction => [
                faction.name,
                faction.description,
            ]),
        ].join('\n')

        expect(seedText).not.toContain('少帝宇文棣')
        expect(seedText).not.toContain('太子宇文棣')
        expect(seedText).not.toContain('储君宇文棣')
    })

    it('keeps canonical interactive NPC titles explicit for high-risk characters', () => {
        expect(INITIAL_NPCS.find(item => item.id === 'yuwendi')?.title).toBe('左丞相、燕王')
        expect(INITIAL_NPCS.find(item => item.id === 'hebaqí')?.title).toBe('北周太后、摄政者')
    })

    it('has canonical address entries for every initial interactive NPC', () => {
        const missingCanonEntries = INITIAL_NPCS
            .filter(npc => !CHARACTER_CANON_BY_ID[npc.id])
            .map(npc => npc.id)

        expect(missingCanonEntries).toEqual([])
    })
})
