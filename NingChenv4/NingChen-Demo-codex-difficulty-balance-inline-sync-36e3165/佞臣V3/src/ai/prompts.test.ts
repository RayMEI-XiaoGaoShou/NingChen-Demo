import { describe, expect, it } from 'vitest'
import { INITIAL_NPCS } from '../data/npcs'
import { buildFengDaozhiDraftPrompt, buildNorthSchemeParsePrompt, buildNpcFollowUpFinalPrompt, buildNpcPrompt, buildSchemeFollowUpParsePrompt, sanitizeNpcReplyText } from './prompts'
import type { FengDaozhiDraftContext } from '../game/fengDaozhiAdvisor'
import type { NorthSchemeParseResult } from '../game/types'

function makeNorthParse(): NorthSchemeParseResult {
    return {
        characterFit: 0.42,
        eventFit: 0.38,
        structuralPenetration: 0.31,
        executability: 0.29,
        exposureRisk: 0.21,
        financeRelevance: 0.12,
        grainRelevance: 0.14,
        militaryRelevance: 0.16,
        socialOrderRelevance: 0.11,
        governanceRelevance: 0.18,
        dominantIntent: 'strategize',
        stateBenefit: 0.08,
        targetBenefit: 0.04,
        factionBenefit: 0.01,
        advicePolarity: 'neutral_or_vague',
        legitimacyDirection: 0,
        omenPolarity: 'vague_or_ceremonial',
        selfTrapPotential: 0.1,
        scapegoatClarity: 0.1,
        omenAnchorStrength: 0.1,
        legitimacyCrack: 0.1,
        suspicionDirection: 0.1,
        suspicionTransmission: 0.1,
        fractureTransmission: 0.1,
        proxyTransmission: 0.1,
        evidence: ['base parse'],
    }
}

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
            longTermMemorySummary: '旧账：他曾记你一笔援手。',
            relationMemorySummary: '旧账：old suspicion on the grain route x2；fresh evidence on the grain route',
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
        expect(messages[1].content).toContain('长期旧账：旧账：他曾记你一笔援手。')
        expect(messages[1].content).toContain('关系旧账：旧账：old suspicion on the grain route x2；fresh evidence on the grain route')
    })

    it('keeps relation memory out of the prompt when no related line is present', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.id === 'zuting')!, trust: 12 }

        const messages = buildNpcPrompt({
            npc,
            schemeType: 'probe',
            speech: '我只是来试一试你的口风。',
            success: false,
            round: 4,
            eventName: '试探回合',
            eventBriefing: '朝中尚未出现可借势的关系旧账。',
            longTermMemorySummary: '旧账：他曾记你一笔援手。',
        })

        expect(messages[1].content).toContain('长期旧账：旧账：他曾记你一笔援手。')
        expect(messages[1].content).not.toContain('关系旧账：')
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

describe('buildNpcFollowUpMode prompts', () => {
    it('lets question_candidate mode ask only when the situation justifies it', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.id === 'zuting')!, trust: 44 }

        const prompt = buildNpcPrompt({
            npc,
            schemeType: 'probe',
            speech: '请先探明口风，再看是否该往下压。',
            success: true,
            followUpMode: 'question_candidate',
        })[1].content

        expect(prompt).toContain('追问模式')
        expect(prompt).toContain('若角色身份、关系温度与战术情势足以支撑')
        expect(prompt).toContain('只准留一句尖锐而自然的追问')
        expect(prompt).toContain('不要为了追问而追问')
    })

    it('forces statement_only mode to end declaratively', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.id === 'zuting')!, trust: 44 }

        const prompt = buildNpcPrompt({
            npc,
            schemeType: 'probe',
            speech: '请先探明口风，再看是否该往下压。',
            success: true,
            followUpMode: 'statement_only',
        })[1].content

        expect(prompt).toContain('收束模式')
        expect(prompt).toContain('必须以陈述句收束')
        expect(prompt).toContain('不要再给玩家留下新的回话钩子')
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

    it('includes target type and external-warlord context in omen parse prompts', () => {
        const npc = INITIAL_NPCS.find(item => item.powerBase === 'external' && item.militaryPower === 55)!

        const omenPrompt = buildNorthSchemeParsePrompt({
            round: 13,
            npc,
            schemeType: 'omen',
            speech: '此人借西线军势自重，若再纵容，恐成朝中名分裂缝。',
            omenSpeechInput: {
                omenText: '石马夜鸣，西镇军旗忽动。',
                interpretationText: '此非泛泛不祥，而是直指外镇军头借兵自重，可先截断粮道并派御史监督。',
            },
            eventName: '铁骑异动',
            eventBriefing: '朝中正在议论外镇军头是否会借乱自重。',
        })[1].content

        expect(omenPrompt).toContain('目标类型：外部军头')
        expect(omenPrompt).toContain('军事力量 55')
        expect(omenPrompt).toContain('朝廷忠诚 34')
        expect(omenPrompt).toContain('信任 15')
        expect(omenPrompt).toContain('阵营偏向 自立算盘')
        expect(omenPrompt).toContain('外部状态 观望离心')
        expect(omenPrompt).toContain('"omenAccusationClarity"')
        expect(omenPrompt).toContain('"centralSanctionLeverage"')
        expect(omenPrompt).toContain('截断粮道')
        expect(omenPrompt).toContain('御史监督')
    })
})

describe('buildSchemeFollowUpParsePrompt', () => {
    it('requests strict JSON only and frames the reply as a modifier rather than a fourth scheme', () => {
        const npc = INITIAL_NPCS.find(item => item.id === 'zuting')!

        const prompt = buildSchemeFollowUpParsePrompt({
            round: 6,
            eventName: '测试事件',
            eventBriefing: '测试局势简报',
            npc,
            schemeType: 'slander',
            originalSpeech: '原始说辞',
            originalParse: makeNorthParse(),
            npcQuestion: '你到底想让我往哪边看？',
            playerReply: '我只是把更窄的政治风险说清楚。',
        })[1].content

        expect(prompt).toContain('严格 JSON')
        expect(prompt).toContain('"clarificationFit"')
        expect(prompt).toContain('"npcInterestFit"')
        expect(prompt).toContain('"pressureControl"')
        expect(prompt).toContain('"contradictionRisk"')
        expect(prompt).toContain('"exposureRiskDelta"')
        expect(prompt).toContain('"successRateDelta"')
        expect(prompt).toContain('"effectMultiplierDelta"')
        expect(prompt).toContain('"evidence"')
        expect(prompt).toContain('这不是第四个计谋')
    })
})

describe('buildNpcFollowUpFinalPrompt', () => {
    it('asks for short declarative prose without another question or JSON', () => {
        const npc = INITIAL_NPCS.find(item => item.id === 'zuting')!

        const prompt = buildNpcFollowUpFinalPrompt({
            npc,
            schemeType: 'probe',
            originalSpeech: '原始说辞',
            npcQuestion: '你到底想让我往哪边看？',
            playerReply: '我只是把更窄的政治风险说清楚。',
            parseEvidence: ['reply narrows the risk', 'keeps pressure contained'],
        })[1].content

        expect(prompt).toContain('2 到 4 句')
        expect(prompt).toContain('陈述句收束')
        expect(prompt).toContain('不要再问玩家新的问题')
        expect(prompt).toContain('不要输出 JSON')
        expect(prompt).toContain('解析依据')
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

    it('injects campaign summary and current public statement into Feng Daozhi prompt', () => {
        const prompt = buildFengDaozhiDraftPrompt({
            context: {
                ...baseContext,
                campaignSummary: '西线的用兵与收权已把帝后两党都推到了台前。',
                currentPublicStatement: '孤以为，西线兵权不可再散落于诸司之手。',
            },
            schemeType: 'advise',
        })[1].content

        expect(prompt).toContain('战局摘要：西线的用兵与收权已把帝后两党都推到了台前。')
        expect(prompt).toContain('本回合公开表态：孤以为，西线兵权不可再散落于诸司之手。')
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
