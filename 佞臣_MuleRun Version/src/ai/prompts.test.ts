import { describe, expect, it } from 'vitest'
import { INITIAL_NPCS } from '../data/npcs'
import { buildNorthSchemeParsePrompt, buildNpcPrompt, sanitizeNpcReplyText } from './prompts'

describe('buildNpcPrompt', () => {
    it('forbids invented titles for the protagonist and injects dynamic round context', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.name === '祖廷')!, trust: 12 }

        const messages = buildNpcPrompt({
            npc,
            schemeType: 'slander',
            speech: '若任西线坐大，终将掣朝廷之肘。',
            success: false,
            round: 11,
            eventName: '蜀地战局僵持',
            eventBriefing: '北周上下正在争论西线兵权如何安置。',
            knownSecretThreads: ['他把“无祖廷则国政不行”视为最高目标。'],
            previousDealings: '上一回合你曾以“献策”试他，而且已然得手。',
            relationshipTemperature: '近两回合你时而拉拢、时而敲打，他眼下最拿不准的正是你究竟想把他往哪边推。',
            recentCourtFortune: '后党近来在朝中吃了亏，他如今比往日更在意先看风向。',
            factionPressure: '后党眼下受帝党挤压，他说话时自然更顾忌宗室与主战一派的锋芒。',
        })

        expect(messages[0].content).toContain('不得称主角为“计相”“计编修”')
        expect(messages[0].content).toContain('只可称“你”“翰林编修”或“萧编修”')
        expect(messages[1].content).toContain('当前回合：第11回合')
        expect(messages[1].content).toContain('本回合局势：蜀地战局僵持')
        expect(messages[1].content).toContain('已解锁暗线：')
        expect(messages[1].content).toContain('上回往来：上一回合你曾以“献策”试他')
        expect(messages[1].content).toContain('近两回合关系温度：近两回合你时而拉拢、时而敲打')
        expect(messages[1].content).toContain('近来得失：后党近来在朝中吃了亏')
        expect(messages[1].content).toContain('派系压力：后党眼下受帝党挤压')
    })

    it('maps trust levels to explicit tone guidance', () => {
        const hostileNpc = { ...INITIAL_NPCS.find(item => item.name === '宇文棣')!, trust: 8 }
        const reliedNpc = { ...INITIAL_NPCS.find(item => item.name === '独孤文约')!, trust: 72 }

        const hostilePrompt = buildNpcPrompt({
            npc: hostileNpc,
            schemeType: 'probe',
            speech: '殿下此言，未必无人附和。',
            success: false,
            round: 9,
            eventName: '帝党重提南征',
            eventBriefing: '主战与安内的争执再度正面碰撞。',
        })[1].content

        const reliedPrompt = buildNpcPrompt({
            npc: reliedNpc,
            schemeType: 'advise',
            speech: '若先稳西线，再图南举，反而名实俱全。',
            success: true,
            round: 7,
            eventName: '西征议起',
            eventBriefing: '西线帅权、粮权与中枢节制正在重新分配。',
        })[1].content

        expect(hostilePrompt).toContain('当前态度：敌意')
        expect(hostilePrompt).toContain('语气要求：冷硬、带刺')
        expect(reliedPrompt).toContain('当前态度：倚重')
        expect(reliedPrompt).toContain('语气要求：明显把你视为可依赖之人')
    })

    it('normalizes stray invented titles in npc replies', () => {
        const reply = '计相此策太急。计编修若再近一步，恐招祸端。'

        expect(sanitizeNpcReplyText(reply)).toBe('你此策太急。萧编修若再近一步，恐招祸端。')
    })
})

describe('buildNorthSchemeParsePrompt', () => {
    it('tells the model to score conservatively rather than rewarding generic strategic wording', () => {
        const npc = INITIAL_NPCS.find(item => item.name === '令狐律光')!

        const prompt = buildNorthSchemeParsePrompt({
            round: 11,
            npc,
            speech: '如今兵粮都紧，朝里若还争功，最后多半还是前线吃亏。',
            eventName: '蜀地战局僵持',
            eventBriefing: '北周上下正在争论战后如何安置西线兵权。',
        })[1].content

        expect(prompt).toContain('泛泛的战略词、空泛大道理或两头都能套的话，不得打高分')
        expect(prompt).toContain('只有同时切中人物、回合局势、具体执行链条，相关分值才可超过 0.7')
        expect(prompt).toContain('若只是“像那么回事”而缺乏人物针对性与落地路径，多数字段应落在 0.25-0.55')
    })

    it('requires dimension relevance to stay near zero unless the speech clearly touches that dimension', () => {
        const npc = INITIAL_NPCS.find(item => item.name === '祖廷')!

        const prompt = buildNorthSchemeParsePrompt({
            round: 13,
            npc,
            speech: '天意未安，人心易摇，若还强作无事，只怕流言先于诏令而行。',
            eventName: '灾异频仍',
            eventBriefing: '朝中开始借灾异与名分之说相互攻讦。',
        })[1].content

        expect(prompt).toContain('财政、粮草、军事、民生、治理五项相关度，默认从低分起判')
        expect(prompt).toContain('未直接触及该维度时，应接近 0')
        expect(prompt).toContain('不要因为一句话显得有格局，就同时给多个维度高相关')
    })
})
