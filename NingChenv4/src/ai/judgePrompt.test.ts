import { describe, expect, it } from 'vitest'
import { buildJudgePrompt } from './prompts'

function buildBaseJudgePrompt(overrides: Partial<Parameters<typeof buildJudgePrompt>[0]> = {}) {
    return buildJudgePrompt({
        round: 1,
        eventName: '新君初政',
        northChronicleTimeLabel: '北周建文五年初春',
        southChronicleTimeLabel: '南陈天嘉元年季春',
        eventImpactSummary: '北周朝堂暗流初起。',
        schemeResults: [{
            schemeName: '离间',
            targetName: '祖廷',
            success: true,
            feedback: '此事可入奏帘前。',
            playerSpeech: '陇右军需不可不查。',
        }],
        schemeCausalEvents: ['祖廷被说动，准备以核查军需之名入奏帘前。'],
        northQuoteCandidate: null,
        trustChangeSummary: '祖廷 +6',
        northPowerChange: '综合国力 66.1',
        factionSummary: '后党略稳，帝党受挫。',
        relationshipSummary: '祖廷与贺拔伯圭嫌隙加深。',
        externalSummary: '陇右粮道被收紧。',
        northSummary: '北周粮赋与治理受损。',
        southSummary: '南陈新政初见回响。',
        invasionSummary: '南征风向仍待观察',
        southEmpressReply: null,
        ...overrides,
    })
}

describe('buildJudgePrompt chronicle mode', () => {
    it('feeds separated chronicle time labels into the judge prompt', () => {
        const messages = buildBaseJudgePrompt()
        expect(messages[0]?.content).toContain('编年体史书写法')
        expect(messages[0]?.content).toContain('正文开头只能使用北周纪年标签')
        expect(messages[0]?.content).toContain('不得写成南北年号并列')
        expect(messages[1]?.content).toContain('北周纪年标签：北周建文五年初春')
        expect(messages[1]?.content).toContain('南陈纪年标签：南陈天嘉元年季春')
        expect(messages[1]?.content).not.toContain('建文五年上 / 天嘉元年上')
        expect(messages[1]?.content).toContain('请据此写一段本回合史书记录')
    })

    it('keeps chronicle output short enough for the scroll', () => {
        const messages = buildBaseJudgePrompt()

        expect(messages[0]?.content).toContain('约 180 到 260 字')
    })

    it('adds a constrained quote candidate when one is available', () => {
        const messages = buildBaseJudgePrompt({
            northQuoteCandidate: {
                speakerName: '祖廷',
                sourceText: '本官明日便以账册为由入奏帘前。',
            },
        })

        expect(messages[1]?.content).toContain('可引之语：祖廷原意为“本官明日便以账册为由入奏帘前。”')
        expect(messages[1]?.content).toContain('不得新增事实或承诺')
    })

    it('injects recent chronicle world memory as continuable prior events', () => {
        const messages = buildBaseJudgePrompt({
            worldMemorySummary: '祖珽前曾押下仓簿，后党由此多疑。',
        })

        expect(messages[1]?.content).toContain('前事可承接：祖珽前曾押下仓簿，后党由此多疑。')
    })

    it('feeds cached South Chen empress reply as source material without allowing copied decrees or invented officials', () => {
        const messages = buildBaseJudgePrompt({
            southEmpressReply: '朕已按“清点户籍仓廪”着手施行。只是眼下更要先稳住粮赋这一头。',
        })

        expect(messages[1]?.content).toContain('南陈回信原文')
        expect(messages[1]?.content).toContain('尚书省、度支、司农、都督府、州县诸司')
        expect(messages[1]?.content).toContain('不得照抄密批')
        expect(messages[1]?.content).toContain('不得虚构具名南陈朝臣')
    })

    it('injects chronicle canon so the judge cannot invent ranks or titles', () => {
        const messages = buildBaseJudgePrompt({
            schemeResults: [{
                schemeName: '谗言',
                targetName: '宇文棣',
                success: true,
                feedback: '孤会记住此事。',
                playerSpeech: '燕王借南征再揽军议，恐非社稷之福。',
            }],
        })
        const combinedPrompt = messages.map(message => message.content).join('\n')

        expect(combinedPrompt).toContain('世界观宪法：')
        expect(combinedPrompt).toContain('宇文棣：左丞相、燕王、宗室主战派')
        expect(combinedPrompt).toContain('禁称“太子”“少帝”“储君”“皇帝”“陛下”')
        expect(combinedPrompt).toContain('《南北朝通鉴》只能据输入事实编修')
    })
})
