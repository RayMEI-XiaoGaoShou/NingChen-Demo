import { describe, expect, it } from 'vitest'
import { INITIAL_NPCS } from '../data/npcs'
import { buildEmpressFeedbackPrompt, buildFengDaozhiDraftPrompt, buildNorthSchemeParsePrompt, buildNpcFollowUpFinalPrompt, buildNpcPrompt, buildOmenEchoPrompt, buildSchemeFollowUpParsePrompt, sanitizeNpcReplyText } from './prompts'
import type { FengDaozhiDraftContext } from '../game/fengDaozhiAdvisor'
import type { EmpressFeedbackContext } from '../game/empressFeedbackContext'
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

function makeEmpressFeedbackContext(): EmpressFeedbackContext {
    return {
        sourceRound: 16,
        topic: '淮南战焦策略',
        question: '江北将战，南陈该先稳粮道还是先压边镇？',
        optionLabel: 'B',
        optionContent: '先整军令，再催粮道',
        reason: '先把节度与军令统一，前线才不会各唱各的调。',
        effectSummary: '军事与治理先有起色。',
        legitimacyTone: 'steady',
        legitimacySummary: '此策在名分上无大起落，重点仍在处置本身的轻重缓急。',
        focusMatched: true,
        scoringFocus: '看是否切中战时节奏与执行链条',
        policyDomain: 'military',
        policyDomainLabel: '军事',
        reasonQuality: 'high',
        reasonQualitySummary: '这条附言切中题眼，也把落地与代价说得较明。',
        policyParseSummary: '附言结构：切题、能落地，也知道代价落在何处。',
        weakestDimension: 'military',
        weakestDimensionLabel: '军事',
        strongestDimension: 'governance',
        strongestDimensionLabel: '治理',
        recoveringDimension: 'military',
        recoveringDimensionLabel: '军事',
        statePrioritySummary: '江南眼下最急的是兵备，如今又逢兵事将逼到前线，节奏与后勤都比虚张声势更紧。',
        northMirrorSummary: '北方眼下是《淮南兵马将动》：北周正围绕江北军令与后勤谁先谁后争论不休。',
        warWindow: true,
        warWindowSummary: '眼下已是战焦临身之时，节奏、后勤与代价都比空泛气魄更重要。',
        playerDangerStage: 'under_watch',
        playerPositionSummary: '萧宝颖眼下已在北周被人留意，回批宜更收束，不宜把话说得太满。',
        recentAftereffectSummary: '上一回合的问政余波仍在发酵。',
    }
}

describe('buildEmpressFeedbackPrompt', () => {
    it('injects empress voice, matrix, domain, state and north-facing context', () => {
        const prompt = buildEmpressFeedbackPrompt(makeEmpressFeedbackContext())[1].content

        expect(prompt).toContain('女帝声音档案：')
        expect(prompt).toContain('女帝回批矩阵：')
        expect(prompt).toContain('政务领域：军事')
        expect(prompt).toContain('附言判断：')
        expect(prompt).toContain('附言结构：')
        expect(prompt).toContain('南陈当前重心：')
        expect(prompt).toContain('北方镜像：')
        expect(prompt).toContain('萧宝颖处境：')
        expect(prompt).toContain('问政题目：江北将战')
    })
})

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

    it('injects full voice profile guidance including self-reference and diction anchors', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.id === 'yuwendi')!, trust: 28 }

        const prompt = buildNpcPrompt({
            npc,
            schemeType: 'advise',
            speech: '若乘南陈根基未稳而南下，或可一举压住江左。',
            success: true,
        })[1].content

        expect(prompt).toContain('人物声音档案：')
        expect(prompt).toContain('应自然自称“孤”')
        expect(prompt).toContain('宗室锋芒、自信、主战')
        expect(prompt).toContain('我才最能担天下')
        expect(prompt).toContain('计谋反应重心：献策成功时')
    })

    it('includes coarse-language guardrails for rough frontier voices', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.id === 'erzhulié')!, trust: 18 }

        const prompt = buildNpcPrompt({
            npc,
            schemeType: 'probe',
            speech: '边军卖命，总得先见点实在的。',
            success: true,
        })[1].content

        expect(prompt).toContain('只可低频使用古风军头粗口')
        expect(prompt).toContain('严禁现代粗口与网络语')
        expect(prompt).toContain('先问价码')
    })

    it('adds a probe-reaction matrix so probing no longer relies on generic guidance alone', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.id === 'zuting')!, trust: 28 }

        const prompt = buildNpcPrompt({
            npc,
            schemeType: 'probe',
            speech: '我只想听听你这边究竟把哪一环看得最重。',
            success: true,
        })[1].content

        expect(prompt).toContain('反应矩阵：')
        expect(prompt).toContain('情绪方向：有所触动，微微松口')
        expect(prompt).toContain('行为倾向：重点不是和盘托出，而是比平时多露半层信息')
        expect(prompt).toContain('允许动作：松半句口风、丢一点线索、反过来试你知道多少')
        expect(prompt).toContain('特别提醒：试探成功的核心是“门松了一下”，不是“门彻底开了”。')
    })

    it('adds an advise-reaction matrix that distinguishes recognizing the plan from recognizing the person', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.id === 'zuting')!, trust: 28 }

        const prompt = buildNpcPrompt({
            npc,
            schemeType: 'advise',
            speech: '若先清点仓廪、收束转运，再谈南征，至少不会叫中枢先失了章程。',
            success: true,
        })[1].content

        expect(prompt).toContain('反应矩阵：')
        expect(prompt).toContain('情绪方向：先判断此策是否真能落地，再决定要不要高看你一眼。')
        expect(prompt).toContain('行为倾向：可以认策，不必立刻认人；也可以认人半分，却仍扣住章程。')
        expect(prompt).toContain('允许动作：评策、挑错、补条件、试你来路、顺手给半句真提醒。')
        expect(prompt).toContain('特别提醒：献策要把“认策”和“认人”拆开写，别写成统一夸赞。')
    })

    it('adds a slander-reaction matrix that makes old suspicion feel ready to travel upward', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.id === 'zongai')!, trust: 46 }
        const relatedNpc = { ...INITIAL_NPCS.find(item => item.id === 'yuwendi')! }

        const prompt = buildNpcPrompt({
            npc,
            relatedNpc,
            schemeType: 'slander',
            speech: '燕王近来借南征邀名，怕不只是为国分忧。',
            success: true,
            northParse: {
                ...makeNorthParse(),
                suspicionTransmission: 0.84,
            },
        })[1].content

        expect(prompt).toContain('反应矩阵：')
        expect(prompt).toContain('情绪方向：旧疑心被你点活，但他还要先看这笔账值不值得往上递。')
        expect(prompt).toContain('行为倾向：不是当场定罪，而是顺着旧疑心把裂缝坐实。')
        expect(prompt).toContain('允许动作：顺疑、试探、记账、递话、先扣住风声。')
        expect(prompt).toContain('特别提醒：若人物本就有上达权力层的门路，要让“此事不能只停在你我之间”自然露出来。')
    })

    it('adds an alienate-reaction matrix that foregrounds old grudges rather than a single rumor', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.id === 'linghuelvguang')!, trust: 40 }
        const relatedNpc = { ...INITIAL_NPCS.find(item => item.id === 'yuwendi')! }

        const prompt = buildNpcPrompt({
            npc,
            relatedNpc,
            schemeType: 'alienate',
            speech: '燕王口口声声为国，真到分兵权时，未必肯与你同担。',
            success: true,
        })[1].content

        expect(prompt).toContain('反应矩阵：')
        expect(prompt).toContain('情绪方向：不是刚听见一句流言，而是旧积怨被你顺势翻起。')
        expect(prompt).toContain('行为倾向：要让裂缝像积账坐实，而非一时耳热。')
        expect(prompt).toContain('允许动作：翻旧账、收回信任、划清一路、递一句重话、把人往外推半步。')
        expect(prompt).toContain('特别提醒：离间比谗言更像旧怨成形，不能写成普通怀疑。')
    })

    it('adds a proxy-reaction matrix that insists the knife remains in the target NPC’s hand', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.id === 'hebaqí')!, trust: 68 }

        const prompt = buildNpcPrompt({
            npc,
            schemeType: 'proxy',
            speech: '若太后愿意出手，朝中自有人会被这一刀逼得现形。',
            success: true,
        })[1].content

        expect(prompt).toContain('反应矩阵：')
        expect(prompt).toContain('情绪方向：衡量由头够不够，再决定这把刀该不该亲手落下。')
        expect(prompt).toContain('行为倾向：核心质感是：你递来的由头站得住脚，但出手的节奏与时机仍由他自己掌控。')
        expect(prompt).toContain('允许动作：接由头、压时机、换刀法、先记后发、反手要价。')
        expect(prompt).toContain('特别提醒：借刀成功时绝不能写成被玩家遥控。')
    })

    it('adds an appeal-reaction matrix for external warlords that foregrounds price and real resources', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.id === 'erzhulié')!, trust: 24 }

        const prompt = buildNpcPrompt({
            npc,
            schemeType: 'appeal',
            speech: '若北庭肯出兵，自当先见粮械与封赏，不可只凭一纸空话。',
            success: true,
        })[1].content

        expect(prompt).toContain('反应矩阵：')
        expect(prompt).toContain('情绪方向：先看价码，再看值不值得卖命。')
        expect(prompt).toContain('行为倾向：回应要有交易感、条件感，不能写成空泛表忠。')
        expect(prompt).toContain('允许动作：开价、索兵粮、索封赏、要体面、逼你先拿真东西。')
        expect(prompt).toContain('特别提醒：外部军头的求援回应，本质是谈条件，不是抒忠心。')
    })

    it('adds a structured frame-reaction matrix that pushes the NPC toward self-exposure and hurried explanation', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.id === 'zuting')!, trust: 25 }

        const prompt = buildNpcPrompt({
            npc,
            schemeType: 'frame',
            speech: '此事若当场追下去，先失言失态的人，多半便是他自己。',
            success: true,
        })[1].content

        expect(prompt).toContain('反应矩阵：')
        expect(prompt).toContain('情绪方向：被逼进局里，先乱半拍，再急着自辩与切割。')
        expect(prompt).toContain('行为倾向：不是单纯发怒，而是越解释越像露怯。')
        expect(prompt).toContain('允许动作：失言、失态、急辩、切割、压人。')
        expect(prompt).toContain('长度建议：正常 3-5 句，可略偏长。')
    })

    it('adds a court omen-reaction matrix that foregrounds self-defence and rumor suppression', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.id === 'zongai')!, trust: 42 }

        const prompt = buildNpcPrompt({
            npc,
            schemeType: 'omen',
            speech: '石人独目，宫门夜颤，此非空灾，恐是名分有裂。',
            success: true,
        })[1].content

        expect(prompt).toContain('反应矩阵：')
        expect(prompt).toContain('情绪方向：先惊疑，再本能自护。')
        expect(prompt).toContain('行为倾向：要让人看见他急着解释、压谣或借兆反打。')
        expect(prompt).toContain('允许动作：惊惶自辩、怒斥栽赃、顺势改口、压住风声。')
        expect(prompt).toContain('特别提醒：朝中人物要让谶纬落到名分、御前、帘前或风声管控上。')
    })

    it('gives duguwenyue a hybrid omen-reaction matrix that prioritizes position before pure logistics', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.id === 'duguwenyue')!, trust: 52 }

        const prompt = buildNpcPrompt({
            npc,
            schemeType: 'omen',
            speech: '铁马夜鸣，西镇军旗忽动，此兆不祥。',
            success: true,
        })[1].content

        expect(prompt).toContain('反应矩阵：')
        expect(prompt).toContain('情绪方向：先惊疑，再迅速盘算这句征兆会不会改写自己在西线与中枢之间的位置。')
        expect(prompt).toContain('行为倾向：政治位置与独立性要先于纯军需')
        expect(prompt).toContain('允许动作：惊惶自辩、怒斥借兆栽赃、顺势改口、借题争位')
        expect(prompt).toContain('特别提醒：独孤文约这类混合型外部角色')
    })

    it('adds a secession-reaction matrix that keeps success in the register of half-open ambition', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.name === '贺拔伯圭')!, trust: 22 }

        const prompt = buildNpcPrompt({
            npc,
            schemeType: 'secession',
            speech: '若西线之权终归一人之手，倒不如索性把局做成自己的。',
            success: true,
        })[1].content

        expect(prompt).toContain('反应矩阵：')
        expect(prompt).toContain('情绪方向：野心被点破，却还在掂量值不值得迈出去。')
        expect(prompt).toContain('行为倾向：只能把心里的算盘翻出半层，让人感觉他已认真盘算，但还没有下定决心。')
        expect(prompt).toContain('允许动作：谈地盘、谈兵权、谈时机、谈谁能替他兜后路。')
        expect(prompt).toContain('特别提醒：成功时只许露出割据盘算，不可直接写成公开举旗。')
    })

    it('adds a rebellion-reaction matrix that makes failure sharper than a failed secession probe', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.id === 'erzhulié')!, trust: 20 }

        const prompt = buildNpcPrompt({
            npc,
            schemeType: 'rebellion',
            speech: '若朝廷再逼一步，不如索性先动。',
            success: false,
        })[1].content

        expect(prompt).toContain('反应矩阵：')
        expect(prompt).toContain('情绪方向：比割据失败更猛，先震怒，再起疑你是不是来试底或设套。')
        expect(prompt).toContain('行为倾向：要么当场压你，要么直接把这番话记作大罪。')
        expect(prompt).toContain('允许动作：喝斥、威胁、逐客、灭口暗示、上报朝廷。')
        expect(prompt).toContain('长度建议：偏短 2-3 句也可，但要有狠劲。')
    })

    it('only adds upward-report guidance when successful slander truly lowers court favor', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.id === 'zongai')!, trust: 46 }
        const relatedNpc = { ...INITIAL_NPCS.find(item => item.id === 'yuwendi')! }

        const prompt = buildNpcPrompt({
            npc,
            relatedNpc,
            schemeType: 'slander',
            speech: '燕王近来借南征与宗室名望坐大，此事不可不防。',
            success: true,
            northParse: {
                ...makeNorthParse(),
                suspicionTransmission: 0.86,
            },
        })[1].content

        expect(prompt).toContain('牵连人物：宇文棣')
        expect(prompt).toContain('压低了皇帝恩宠')
        expect(prompt).toContain('递到御前')
    })

    it('keeps upward-report guidance out when no real favor hit is produced', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.id === 'zongai')!, trust: 46 }
        const relatedNpc = { ...INITIAL_NPCS.find(item => item.id === 'yuwendi')! }

        const prompt = buildNpcPrompt({
            npc,
            relatedNpc,
            schemeType: 'slander',
            speech: '燕王近来借南征与宗室名望坐大，此事不可不防。',
            success: true,
            northParse: {
                ...makeNorthParse(),
                suspicionTransmission: 0.42,
            },
        })[1].content

        expect(prompt).not.toContain('权力上传动作：')
        expect(prompt).not.toContain('递到御前')
    })

    it('normalizes stray invented titles in npc replies', () => {
        const reply = '计相此策太急。计编修若再近一步，恐招祸端。'
        expect(sanitizeNpcReplyText(reply)).toBe('你此策太急。萧编修若再近一步，恐招祸端。')
    })
})

    it('adds omen reaction matrix guidance that distinguishes panic, anger, reinterpretation, and rumor control', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.powerBase === 'external' && item.militaryPower === 55)!, trust: 34 }

        const prompt = buildNpcPrompt({
            npc,
            schemeType: 'omen',
            speech: '铁人夜鸣，西镇军旗忽动。',
            success: true,
            round: 13,
            eventName: '铁骑异动',
            eventBriefing: '朝中正在议论外镇军头是否会借乱自重。',
        })[1].content

        expect(prompt).toContain('反应矩阵：')
        expect(prompt).toContain('中枢会不会起疑')
        expect(prompt).toContain('粮道军需')
        expect(prompt).toContain('御史监军')
        expect(prompt).toContain('惊惶自辩')
        expect(prompt).toContain('怒斥借兆栽赃')
        expect(prompt).toContain('借兆压人')
        expect(prompt).toContain('封口压谣稳军')
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

        const adviseMessages = buildNorthSchemeParsePrompt({
            round: 5,
            npc,
            schemeType: 'advise',
            speech: '先稳住仓储与转运，再整饬诏令，免得前后失序。',
            eventName: '测试事件',
            eventBriefing: '测试简报',
        })
        const advisePrompt = adviseMessages[1].content

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

        expect(adviseMessages[0].content).toContain('除字段说明特别标注为 -1 到 1 或小范围 delta 的字段外')
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
        expect(omenPrompt).toContain('外部状态 仍受节制')
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
        expect(prompt).toContain('人物声音档案：')
        expect(prompt).toContain('应自然自称“本相”')
    })

    it('reuses original north-court context and follow-up judgment as a continuation rather than a fresh reply', () => {
        const npc = INITIAL_NPCS.find(item => item.id === 'zuting')!
        const relatedNpc = INITIAL_NPCS.find(item => item.id === 'yuwendi')!

        const prompt = buildNpcFollowUpFinalPrompt({
            npc,
            relatedNpc,
            schemeType: 'slander',
            originalSpeech: '若燕王借南征再揽军议与风声，帘前迟早会觉得他不止在替社稷操心。',
            npcQuestion: '你这话，是要我先盯燕王，还是借我去试帘前的疑心？',
            playerReply: '我只是把燕王如今最怕被帘前看见的那层野心说透，不是要你此刻就和他翻脸。',
            parseEvidence: ['reply narrows the suspicion', 'reply keeps the pressure controllable'],
            followUpParse: {
                clarificationFit: 0.72,
                npcInterestFit: 0.64,
                pressureControl: 0.58,
                contradictionRisk: 0.18,
                exposureRiskDelta: -0.04,
                successRateDelta: 0.08,
                effectMultiplierDelta: 0.06,
                evidence: ['reply narrows the suspicion', 'reply keeps the pressure controllable'],
            },
            round: 9,
            eventName: '南征议再起',
            eventBriefing: '帝后两党都在借军议试探中枢与御前风向。',
            knownSecretThreads: ['他最恨宦官借帘前风声掩实务。'],
            previousDealings: '上回你曾顺着章程说动过他半步。',
            relationshipTemperature: '近两回合你对他时拉时压，他嘴上不认，心里却记着。',
            recentCourtFortune: '后党近来担心燕王借南征再立威名，祖珽对此并不放心。',
            factionPressure: '后党想压住帝党借南征扩势，祖珽尤其忌惮燕王藉军议再长羽翼。',
            longTermMemorySummary: '旧账：他记得你曾替他挡过一记借势夺权的暗刺。',
            relationMemorySummary: '旧账：燕王近两回合屡借军议压人；新账：帘前近来已在意燕王借战功扩势。',
            northParse: {
                ...makeNorthParse(),
                suspicionTransmission: 0.78,
                evidence: ['燕王借南征扩势', '帘前可能因此起疑'],
            },
        })[1].content

        expect(prompt).toContain('当前回合：第9回合')
        expect(prompt).toContain('本回合局势：南征议再起')
        expect(prompt).toContain('上回往来：上回你曾顺着章程说动过他半步。')
        expect(prompt).toContain('近两回合关系温度：近两回合你对他时拉时压')
        expect(prompt).toContain('牵连人物：宇文棣')
        expect(prompt).toContain('原始说辞命中：燕王借南征扩势；帘前可能因此起疑')
        expect(prompt).toContain('补答后判断：')
        expect(prompt).toContain('主要澄清：')
        expect(prompt).toContain('剩余疑点：')
        expect(prompt).toContain('收束方式：')
        expect(prompt).toContain('权力上传动作：')
    })

    it('carries the structured reaction matrix into follow-up final prompts for high-pressure schemes', () => {
        const npc = INITIAL_NPCS.find(item => item.id === 'zongai')!

        const prompt = buildNpcFollowUpFinalPrompt({
            npc,
            schemeType: 'frame',
            originalSpeech: '原始说辞',
            npcQuestion: '你今日这番话，究竟想把谁推下水？',
            playerReply: '我不过是把众人都不敢明说的那层险处点透。',
            parseEvidence: ['reply narrows the target', 'keeps pressure on the court'],
        })[1].content

        expect(prompt).toContain('反应矩阵：')
        expect(prompt).toContain('情绪方向：被逼进局里，先乱半拍，再急着自辩与切割。')
        expect(prompt).toContain('允许动作：失言、失态、急辩、切割、压人。')
        expect(prompt).toContain('高压叠加：')
        expect(prompt).toContain('反应矩阵定方向，声音档案里的“高压偏移”定质感。')
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
        strategicFocus: '这一步更该打祖珽对中枢节制与章程归拢的执念，而不是空谈南征声势。',
        bestAngle: '顺着他最恨旁人借战事夺中枢节制这一点，把你的说辞落到兵权与漕运该由谁统筹。',
        redLine: '别把话写成替帝党站台，也别把南征吹成眼下立刻能成的大功。',
        advisoryMode: '借势',
        advisoryModeGuidance: '借祖珽眼前最在意的章程与节制，让他自己把你的话往中枢收束上带。',
    }

    it('keeps Feng Daozhi limited to player-visible information', () => {
        const prompt = buildFengDaozhiDraftPrompt({
            context: baseContext,
            schemeType: 'advise',
            relatedNpcName: '宗艾',
        })

        expect(prompt[0].content).toContain('只能使用输入中明确给出的时局、人物公开信息、已解锁暗线与近况')
        expect(prompt[0].content).toContain('“谋士判断”“最佳切口”“红线”都是系统翻译后的模糊方向')
        expect(prompt[1].content).toContain('已解锁暗线：他最恨旁人借战事夺中枢节制。')
        expect(prompt[1].content).toContain('萧宝颖当前危险：under_watch')
        expect(prompt[1].content).toContain('谋士判断：这一步更该打祖珽对中枢节制与章程归拢的执念')
        expect(prompt[1].content).toContain('最佳切口：顺着他最恨旁人借战事夺中枢节制这一点')
        expect(prompt[1].content).toContain('先别踩：别把话写成替帝党站台')
        expect(prompt[1].content).toContain('这一手宜走「借势」')
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

    it('injects court disposition hint into Feng Daozhi prompt when present', () => {
        const prompt = buildFengDaozhiDraftPrompt({
            context: {
                ...baseContext,
                courtDispositionHint: '祖廷御前恩宠已薄，但帘前眷顾尚未断；下一手应优先让太后也对他生疑。',
            },
            schemeType: 'alienate',
        })[1].content

        expect(prompt).toContain('处置链旁批：祖廷御前恩宠已薄')
        expect(prompt).toContain('下一手应优先让太后也对他生疑')
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

describe('buildOmenEchoPrompt', () => {
    it('includes court-target prompt context and internal central guidance', () => {
        const speakerNpc = INITIAL_NPCS.find(item => item.id === 'yuwendi')!
        const targetNpc = INITIAL_NPCS.find(item => item.id === 'zuting')!

        const prompt = buildOmenEchoPrompt({
            speakerNpc,
            targetNpc,
            omenText: '\u77f3\u4eba\u72ec\u76ee\uff0c\u53f0\u9636\u6709\u9634\u3002',
            interpretationText: '\u6b64\u975e\u8fb9\u60a3\uff0c\u4e43\u662f\u671d\u4e2d\u540d\u5206\u88c2\u7f1d\u5916\u6f0f\u4e4b\u5146\u3002',
            roundEvent: {
                round: 14,
                eventName: '\u5f52\u653f\u8bae\u8d77',
                eventBriefing: '\u671d\u4e2d\u6b63\u4e3a\u6444\u653f\u4f53\u7cfb\u4e0e\u76f8\u6743\u8fb9\u754c\u76f8\u4e92\u8bd5\u63a2\u3002',
            },
            parseSummary: 'omenPolarity=destabilizing; legitimacyCrack=0.81; suspicionDirection=0.74',
        })[1].content

        expect(prompt).toContain(`\u4ee5${speakerNpc.name}\uff08${speakerNpc.title}\uff09\u7684\u53e3\u543b`)
        expect(prompt).toContain(`\u76ee\u6807\u4eba\u7269\uff1a${targetNpc.name}\uff08${targetNpc.title}`)
        expect(prompt).toContain('\u671d\u4e2d\u4eba\u7269')
        expect(prompt).toContain('\u9635\u8425\u504f\u5411')
        expect(prompt).toContain('\u7b2c14\u56de\u5408')
        expect(prompt).toContain('\u5c40\u52bf\u6458\u8981\uff1a\u671d\u4e2d\u6b63\u4e3a\u6444\u653f\u4f53\u7cfb\u4e0e\u76f8\u6743\u8fb9\u754c\u76f8\u4e92\u8bd5\u63a2\u3002')
        expect(prompt).toContain('\u8c36\u8f9e / \u5f81\u5146')
        expect(prompt).toContain('\u89e3\u91ca / \u6307\u5411')
        expect(prompt).toContain('parseSummary\uff1aomenPolarity=destabilizing; legitimacyCrack=0.81; suspicionDirection=0.74')
        expect(prompt).toContain('\u4e2d\u67a2\u52a8\u4f5c\u63d0\u793a\uff1a\u6536\u675f\u8bcf\u4ee4\u3001\u6838\u67e5\u8d26\u518c\u3001\u538b\u4f4f\u65c1\u652f\u3001\u7ec6\u7a76\u540d\u5206\u3002')
        expect(prompt).not.toContain('\u622a\u65ad\u7cae\u9053')
        expect(prompt).not.toContain('\u5fa1\u53f2\u76d1\u7763')
    })
})

describe('buildOmenEchoPrompt', () => {
    it('includes speaker perspective, omen text, interpretation, and central reaction guidance', () => {
        const speakerNpc = INITIAL_NPCS.find(item => item.id === 'linghuelvguang')!
        const targetNpc = INITIAL_NPCS.find(item => item.powerBase === 'external' && item.militaryPower === 55)!

        const prompt = buildOmenEchoPrompt({
            speakerNpc,
            targetNpc,
            omenText: '\u77f3\u9a6c\u591c\u9e23\uff0c\u897f\u9547\u519b\u65d7\u5ffd\u52a8\u3002',
            interpretationText: '\u6b64\u975e\u72ec\u5929\u707e\uff0c\u6050\u662f\u5916\u9547\u501f\u5175\u81ea\u91cd\u4e4b\u5146\u3002',
            roundEvent: {
                round: 13,
                eventName: '\u94c1\u9a91\u5f02\u52a8',
                eventBriefing: '\u671d\u4e2d\u6b63\u8bae\u8bba\u5916\u9547\u662f\u5426\u4f1a\u501f\u4e71\u81ea\u91cd\u3002',
            },
            parseSummary: 'omenPolarity=destabilizing; centralSanctionLeverage=0.83; suspicionDirection=0.77',
        })[1].content

        expect(prompt).toContain(`\u4ee5${speakerNpc.name}\uff08${speakerNpc.title}\uff09\u7684\u53e3\u543b`)
        expect(prompt).toContain('\u8c36\u8f9e / \u5f81\u5146')
        expect(prompt).toContain('\u89e3\u91ca / \u6307\u5411')
        expect(prompt).toContain('\u7b2c13\u56de\u5408')
        expect(prompt).toContain('\u5c40\u52bf\u6458\u8981\uff1a\u671d\u4e2d\u6b63\u8bae\u8bba\u5916\u9547\u662f\u5426\u4f1a\u501f\u4e71\u81ea\u91cd\u3002')
        expect(prompt).toContain('parseSummary：omenPolarity=destabilizing; centralSanctionLeverage=0.83; suspicionDirection=0.77')
        expect(prompt).toContain('\u4e2d\u67a2')
        expect(prompt).toContain('\u622a\u65ad\u7cae\u9053')
        expect(prompt).toContain('\u5fa1\u53f2\u76d1\u7763')
    })

    it('treats duguwenyue as a hybrid external target in omen echo prompts', () => {
        const speakerNpc = INITIAL_NPCS.find(item => item.id === 'zongai')!
        const targetNpc = INITIAL_NPCS.find(item => item.id === 'duguwenyue')!

        const prompt = buildOmenEchoPrompt({
            speakerNpc,
            targetNpc,
            omenText: '石马夜鸣，西镇军旗忽动。',
            interpretationText: '此兆若被中枢借题发挥，恐怕要先动西线位置，再收粮道军需。',
            roundEvent: {
                round: 13,
                eventName: '铁骑异动',
                eventBriefing: '朝中正在议论外镇军头是否会借乱自重。',
            },
            parseSummary: 'omenPolarity=destabilizing; centralSanctionLeverage=0.83; suspicionDirection=0.77',
        })[1].content

        expect(prompt).toContain('混合型外部角色')
        expect(prompt).toContain('中枢可能借题重排西线位置')
        expect(prompt).toContain('截断粮道')
        expect(prompt).toContain('核查军需')
    })
})
