import { describe, expect, it } from 'vitest'
import { INITIAL_NPCS } from '../data/npcs'
import { buildFengDaozhiDraftPrompt, buildNorthSchemeParsePrompt, buildNpcPrompt, sanitizeNpcReplyText } from './prompts'
import type { FengDaozhiDraftContext } from '../game/fengDaozhiAdvisor'

describe('buildNpcPrompt', () => {
    it('forbids invented titles for the protagonist and injects dynamic round context', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.id === 'zuting')!, trust: 12 }

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
        const hostileNpc = { ...INITIAL_NPCS.find(item => item.id === 'yuwendi')!, trust: 8 }
        const reliedNpc = { ...INITIAL_NPCS.find(item => item.id === 'duguwenyue')!, trust: 72 }

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
    it('asks for advice and omen polarity fields in the north parse schema', () => {
        const npc = INITIAL_NPCS.find(item => item.id === 'zuting')!

        const advisePrompt = buildNorthSchemeParsePrompt({
            round: 5,
            npc,
            schemeType: 'advise',
            speech: '先稳住仓储与转运，再整饬诏令，免得前后失序。',
            eventName: '测试事件',
            eventBriefing: '测试简报',
        })[1].content

        const omenPrompt = buildNorthSchemeParsePrompt({
            round: 13,
            npc,
            schemeType: 'omen',
            speech: '石人一只眼，挑动黄河天下反。\n\n此非独天灾，恐是朝中名分失序之兆。',
            omenSpeechInput: {
                omenText: '石人一只眼，挑动黄河天下反。',
                interpretationText: '此非独天灾，恐是朝中名分失序之兆。',
            },
            eventName: '灾异频仍',
            eventBriefing: '朝中开始借灾异与名分之说相互攻讦。',
        })[1].content

        expect(advisePrompt).toContain('"stateBenefit"')
        expect(advisePrompt).toContain('"targetBenefit"')
        expect(advisePrompt).toContain('"factionBenefit"')
        expect(advisePrompt).toContain('"advicePolarity"')
        expect(omenPrompt).toContain('"legitimacyDirection"')
        expect(omenPrompt).toContain('"omenPolarity"')
        expect(omenPrompt).toContain('"omenAnchorStrength"')
        expect(omenPrompt).toContain('"legitimacyCrack"')
        expect(omenPrompt).toContain('"suspicionDirection"')
    })

    it('includes scheme-specific caution so frame and omen use their special rubrics', () => {
        const npc = INITIAL_NPCS.find(item => item.id === 'zuting')!

        const framePrompt = buildNorthSchemeParsePrompt({
            round: 8,
            npc,
            schemeType: 'frame',
            speech: '只消再逼他一步，先失态的人多半便是他，最后嫌疑也会先落回他自己头上。',
            eventName: '清查仓廪',
            eventBriefing: '朝中正围绕仓储与责任归属相互攻讦。',
        })[1].content

        const omenPrompt = buildNorthSchemeParsePrompt({
            round: 13,
            npc,
            schemeType: 'omen',
            speech: '石人一只眼，挑动黄河天下反。\n\n此非独天灾，恐是朝中名分失序之兆。',
            omenSpeechInput: {
                omenText: '石人一只眼，挑动黄河天下反。',
                interpretationText: '此非独天灾，恐是朝中名分失序之兆。',
            },
            eventName: '灾异频仍',
            eventBriefing: '朝中开始借灾异与名分之说相互攻讦。',
        })[1].content

        expect(framePrompt).toContain('本次计谋类型：设局嫁祸')
        expect(framePrompt).toContain('selfTrapPotential')
        expect(framePrompt).toContain('scapegoatClarity')
        expect(framePrompt).toContain('诱使目标自己失言、失态或误判')
        expect(omenPrompt).toContain('谶辞 / 征兆：石人一只眼，挑动黄河天下反。')
        expect(omenPrompt).toContain('解释 / 指向：此非独天灾，恐是朝中名分失序之兆。')
        expect(omenPrompt).toContain('必须先看谶辞/征兆本身是否成立')
    })

    it('asks intrigue schemes to prove state-layer transmission before scoring nation impact highly', () => {
        const npc = INITIAL_NPCS.find(item => item.id === 'zongai')!

        const slanderPrompt = buildNorthSchemeParsePrompt({
            round: 10,
            npc,
            schemeType: 'slander',
            speech: '他未必真心，你最好别全信。',
            eventName: '西线吃紧',
            eventBriefing: '前线军令、粮道与中枢节次都在受压。',
        })[1].content

        const alienatePrompt = buildNorthSchemeParsePrompt({
            round: 12,
            npc,
            schemeType: 'alienate',
            speech: '你们未必真的一条心。',
            eventName: '主战与安内再起争执',
            eventBriefing: '朝中正在争论军令与转运节次。',
        })[1].content

        const proxyPrompt = buildNorthSchemeParsePrompt({
            round: 15,
            npc,
            schemeType: 'proxy',
            speech: '殿下若愿意出手，他自然不敢多言。',
            eventName: '前线后方俱显疲态',
            eventBriefing: '边镇军心、粮道与宫中节制都已吃紧。',
        })[1].content

        expect(slanderPrompt).toContain('"suspicionTransmission"')
        expect(alienatePrompt).toContain('"fractureTransmission"')
        expect(proxyPrompt).toContain('"proxyTransmission"')
        expect(slanderPrompt).toContain('generic suspicion or mood should not score high')
        expect(alienatePrompt).toContain('relationship crack must reach command, logistics, or coordination')
        expect(proxyPrompt).toContain('actor motive, means, and public consequence')
    })
})

describe('buildFengDaozhiDraftPrompt', () => {
    const baseContext: FengDaozhiDraftContext = {
        round: 8,
        eventName: '西线兵权再议',
        eventBriefing: '朝中正在争论谁来统筹西线兵权与后续接管。',
        schemeLabel: '献策',
        targetNpcName: '祖廷',
        targetNpcTitle: '尚书左仆射',
        targetPersona: '性急而善理政，记怨极深。',
        visibleSecrets: ['他最恨旁人借战事夺中枢节制。'],
        previousDealings: '上一回合你曾以试探探他的口风。',
        relationshipTemperature: '近两回合你多以稳字开口，他对你仍在衡量。',
        recentCourtFortune: '帝后两党都想借西线再扩口子。',
        factionPressure: '后党担心兵权旁落，帝党则想借机再压中枢。',
        playerDangerStage: 'under_watch',
    }

    it('keeps Feng Daozhi limited to player-visible information', () => {
        const prompt = buildFengDaozhiDraftPrompt({
            context: baseContext,
            schemeType: 'advise',
            relatedNpcName: '宗艾',
        })

        expect(prompt[0].content).toContain('只能使用输入中明确给出的时局、人物公开信息、已解锁暗线与近况')
        expect(prompt[1].content).toContain('已解锁暗线：他最恨旁人借战事夺中枢节制。')
        expect(prompt[1].content).toContain('萧宝颖当前危险：under_watch')
    })

    it('requires dual-step omen drafting', () => {
        const prompt = buildFengDaozhiDraftPrompt({
            context: { ...baseContext, schemeLabel: '谶纬' },
            schemeType: 'omen',
        })[1].content

        expect(prompt).toContain('primaryText 必须像一句征兆、谶辞或灾异异象')
        expect(prompt).toContain('secondaryText 必须解释这句征兆意味着怎样的名分裂缝')
        expect(prompt).toContain('"secondaryText": "string，可省略"')
    })
})
