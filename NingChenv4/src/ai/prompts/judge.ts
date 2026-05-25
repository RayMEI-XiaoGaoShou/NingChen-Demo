import type { ChatMessage } from './shared'
import { buildChronicleCanonBlock, buildWorldCanonBlock } from '../promptCanon'

const JUDGE_SYSTEM = `${buildWorldCanonBlock()}
${buildChronicleCanonBlock()}

你是《佞臣》中的《南北朝通鉴》编年史官，负责将每回合的朝堂结算写成一段白话古文史书记录。
要求：
- 使用编年体史书写法，白话古文，简洁有力，约 180 到 260 字
- 只能依据输入事实概括，不得虚构未提供的人物、事件与后果
- 以第三人称叙事，主角一律称“萧宝颖”
- 正文开头只能使用北周纪年标签，不得写成南北年号并列，不得使用“上/下”分卷式时间表述；若写南陈施政，只能在后文另起“南陈某年某季，建康宫中……”之类句子
- 若没有精确月日，只能用“是时、未几、既而、其后”等相对时间推进，不得虚构“初三月、初四月”等具体日期
- 优先按 5W1H 写清楚“萧宝颖施了什么计、谁被说动或露破绽、为何被说动、它如何转成朝政动作、谁因此受损、最终如何落到朝局与国力”
- 不直接罗列数值，以具体事件解释数值变化；必要时可点出粮饷、军需、御史、诏令、帘前、御前、派系裂口等中间环节
- 若输入给出“可引之语”，可择一处压缩成“某人曰：‘……’”写入正文；只能浓缩原意，不得替人物新增承诺或事实
- 若输入给出“南陈回信原文”，需把女帝回批转写成“女帝据此下令、南陈官署如何执行、最终如何落到南陈国力变化”的史书事件链；不得照抄密批原文
- 直接输出正文，不加标题、引号或列表`

export function buildJudgePrompt(params: {
    round: number
    eventName: string
    northChronicleTimeLabel?: string
    southChronicleTimeLabel?: string
    chronicleTimeLabel?: string
    eventImpactSummary: string
    schemeResults: Array<{ schemeName: string; targetName: string; success: boolean; feedback?: string; playerSpeech?: string }>
    schemeCausalEvents?: string[]
    worldMemorySummary?: string
    northQuoteCandidate?: { speakerName: string; sourceText: string } | null
    trustChangeSummary: string
    northPowerChange: string
    factionSummary: string
    relationshipSummary: string
    externalSummary: string
    northSummary: string
    southSummary: string
    southEmpressReply?: string | null
    invasionSummary: string
}): ChatMessage[] {
    const schemeSummary = params.schemeResults
        .map((item, index) => {
            let line = `计谋${index + 1}：对${item.targetName}施“${item.schemeName}”，结果为${item.success ? '成功' : '失败'}`
            if (item.playerSpeech) line += `；说辞：“${item.playerSpeech}”`
            if (item.feedback) line += `；对方反应：${item.feedback}`
            return line
        })
        .join('\n')
    const causalSummary = params.schemeCausalEvents?.length
        ? params.schemeCausalEvents.map((item, index) => `落地链${index + 1}：${item}`).join('\n')
        : '暂无额外落地链。'
    const worldMemoryLine = params.worldMemorySummary?.trim()
        ? `前事可承接：${params.worldMemorySummary}`
        : '前事可承接：暂无可承接旧事。'
    const northChronicleTimeLabel = params.northChronicleTimeLabel?.trim()
        || normalizeLegacyNorthChronicleTimeLabel(params.chronicleTimeLabel)
        || `北周第${params.round}回合`
    const southChronicleTimeLabel = params.southChronicleTimeLabel?.trim()
        || normalizeLegacySouthChronicleTimeLabel(params.chronicleTimeLabel)
        || `南陈第${params.round}回合`
    const quoteLine = params.northQuoteCandidate?.sourceText?.trim()
        ? `可引之语：${params.northQuoteCandidate.speakerName}原意为“${params.northQuoteCandidate.sourceText}”。请压成一句史书引语，不得新增事实或承诺。`
        : '可引之语：无合适引语，不必强写。'
    const southReplyLine = params.southEmpressReply?.trim()
        ? `南陈回信原文：“${params.southEmpressReply}”。请将此信转写成南陈朝中具体施政事件，可用尚书省、度支、司农、都督府、州县诸司等官署或官职承接；不得照抄密批，不得虚构具名南陈朝臣。`
        : '南陈回信原文：无额外密批，只据南陈回批摘要记事。'

    return [
        { role: 'system', content: JUDGE_SYSTEM },
        {
            role: 'user',
            content: `第${params.round}回合《${params.eventName}》结算如下：
北周纪年标签：${northChronicleTimeLabel}
南陈纪年标签：${southChronicleTimeLabel}
主线局势：${params.eventImpactSummary}
${schemeSummary}
计谋落地链：
${causalSummary}
${worldMemoryLine}
${quoteLine}
信任变化：${params.trustChangeSummary}
党争局面：${params.factionSummary}
关系结构：${params.relationshipSummary || '暂无新的关键结构失衡'}
外部军头：${params.externalSummary}
北周变化：${params.northSummary}
南陈回批：${params.southSummary}
${southReplyLine}
南征态势：${params.invasionSummary}
综合国力：${params.northPowerChange}

请据此写一段本回合史书记录。正文第一句必须以“${northChronicleTimeLabel}”开头；若写南陈施政，必须另用“${southChronicleTimeLabel}”引出，不得把南北年号并列。`,
        },
    ]
}

function normalizeLegacyNorthChronicleTimeLabel(label: string | undefined): string | null {
    const left = label?.split(/[/／]/u)[0]?.trim()
    if (!left) return null
    return left
        .replace(/[上下]$/u, '')
        .replace(/^北周/u, '北周')
        .replace(/^建文/u, '北周建文')
        .trim()
}

function normalizeLegacySouthChronicleTimeLabel(label: string | undefined): string | null {
    const right = label?.split(/[/／]/u)[1]?.trim()
    if (!right) return null
    return right
        .replace(/[上下]$/u, '')
        .replace(/^南陈/u, '南陈')
        .replace(/^天嘉/u, '南陈天嘉')
        .trim()
}

