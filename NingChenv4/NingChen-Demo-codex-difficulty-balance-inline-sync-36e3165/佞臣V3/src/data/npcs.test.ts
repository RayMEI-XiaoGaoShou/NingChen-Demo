import { describe, expect, it } from 'vitest'
import { CHARACTER_CANON_BY_ID } from '../ai/promptCanon'
import { INITIAL_FACTIONS } from './factions'
import { INITIAL_NPCS } from './npcs'

describe('INITIAL_NPCS secret threads', () => {
    it('keeps 贺拔伯圭暗线 aligned with NPC角色卡真源', () => {
        const npc = INITIAL_NPCS.find(item => item.name === '贺拔伯圭')
        expect(npc?.secretThreads).toEqual([
            '借西线危机将战时权固化为长期地方权，构筑“河西—关西—蜀地”的连续影响圈，使自己实质上成为北周的西部国中之国。',
            '作为太后亲弟，有血缘保护伞，但他的膨胀速度让太后也开始不安。',
            '与独孤文约表面结义，实则彼此提防，他始终要压独孤一头。',
        ])
    })

    it('keeps 宗艾暗线 aligned with NPC角色卡真源', () => {
        const npc = INITIAL_NPCS.find(item => item.name === '宗艾')
        expect(npc?.secretThreads).toEqual([
            '宫人自汉末宦官专权以来屡遭打压，从三国至南北朝始终被文武两班排挤鄙夷，宗艾表面阿谀，实则内心极度渴望权力与尊严。',
            '他有意将自己打造成皇帝与各派之间不可替代的信息节点，谁都需要通过他接近皇帝，这就是他的权力基础。',
            '保皇线想借草原势力“清君侧”时，宗艾是宫中联络接口。',
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
