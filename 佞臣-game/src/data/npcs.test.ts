import { describe, expect, it } from 'vitest'
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
            '宦官自汉末宦官专权以来地位极低，从三国至南北朝始终被文武两班排挤鄙夷，宗艾表面阿谀，实则内心极度渴望权力与尊严。',
            '他有意将自己打造成皇帝与各派之间不可替代的信息节点，谁都需要通过他接近皇帝，这就是他的权力基础。',
            '保皇线想借草原势力“清君侧”时，宗艾是宫中联络接口。',
        ])
    })
})
