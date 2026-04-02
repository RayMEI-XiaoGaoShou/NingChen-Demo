import type {
    NationDimensions,
    NPC,
    PolicyResolutionMeta,
    SchemeType,
} from '../game/types'
import { getTrustLabel } from '../game/types'

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

const SCHEME_NAMES: Record<SchemeType, string> = {
    probe: '试探',
    advise: '献策',
    slander: '谗言',
    alienate: '离间',
    frame: '放风构陷',
    proxy: '借刀',
    appeal: '求援',
    omen: '谶纬',
    secession: '煽动割据',
    rebellion: '煽动造反',
}

const FACTION_LABELS: Record<string, string> = {
    emperor: '帝党',
    empress: '后党',
    longxi: '陇右系',
    prairie: '草原系',
}

const JUDGE_SYSTEM = `你是《佞臣》中的“天道判官”，负责将每回合的朝堂结算写成一段古典白话叙事。
要求：
- 使用偏古典的白话文，简洁有力，不超过 150 字
- 只能依据输入事实概括，不得虚构未提供的人物、事件与后果
- 以第三人称叙事，主角一律称“萧宝颖”
- 不直接罗列数值，以局势与气氛来表达变化
- 直接输出正文，不加标题、引号或列表`

export function buildJudgePrompt(params: {
    round: number
    eventName: string
    eventImpactSummary: string
    schemeResults: Array<{ schemeName: string; targetName: string; success: boolean; feedback?: string; playerSpeech?: string }>
    trustChangeSummary: string
    northPowerChange: string
    factionSummary: string
    relationshipSummary: string
    externalSummary: string
    northSummary: string
    southSummary: string
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

    return [
        { role: 'system', content: JUDGE_SYSTEM },
        {
            role: 'user',
            content: `第${params.round}回合《${params.eventName}》结算如下：
主线局势：${params.eventImpactSummary}
${schemeSummary}
信任变化：${params.trustChangeSummary}
党争局面：${params.factionSummary}
关系结构：${params.relationshipSummary || '暂无新的关键结构失衡'}
外部军头：${params.externalSummary}
北周变化：${params.northSummary}
南陈回批：${params.southSummary}
南征态势：${params.invasionSummary}
综合国力：${params.northPowerChange}

请据此写一段本回合判辞。`,
        },
    ]
}

const NPC_SYSTEM = `你是《佞臣》中的 NPC 角色扮演引擎。你要代入指定人物，对萧宝颖刚刚施加的计谋作出回应。
要求：
- 回答 2 到 3 句，古典白话风
- 必须严格贴合该人物的官职、公开人设、公开立场、性格、软肋与逆鳞
- 要明显体现当前态度档位给出的语气要求
- 可以结合“本回合局势”“上回往来”“近两回合关系温度”“近来得失”“派系压力”与“已解锁暗线”决定说话轻重，但不得跳出人设
- 不得称主角为“计相”“计编修”或任何你自造的官称
- 称呼主角时只可称“你”“翰林编修”或“萧编修”
- 不用现代口语、网络语、括号说明或角色名前缀
- 直接输出对话正文`

function getTrustTone(trust: number): { label: string; description: string } {
    const label = getTrustLabel(trust)

    switch (label) {
        case '敌意':
            return {
                label,
                description: '冷硬、带刺、极少露口风，宁可压人也不肯让你占到便宜。',
            }
        case '戒备':
            return {
                label,
                description: '客气里带防备，肯接话但句句留钩，不会轻易交底。',
            }
        case '平淡':
            return {
                label,
                description: '表面平稳，更多是在试你的成色，既不明显亲近，也不轻易翻脸。',
            }
        case '信赖':
            return {
                label,
                description: '语气已有松动，愿意顺着你的意思多说半句，但仍会保留分寸。',
            }
        case '倚重':
            return {
                label,
                description: '明显把你视为可依赖之人，愿给实话与提醒，但仍会守住自身边界。',
            }
        case '深信':
            return {
                label,
                description: '几乎把你当自己人，说话更直、更深，也更愿意与你站在同一边。',
            }
        default:
            return {
                label,
                description: '依人物本性斟酌回应。',
            }
    }
}

export function buildNpcPrompt(params: {
    npc: NPC
    schemeType: SchemeType
    speech: string
    success: boolean
    round?: number
    eventName?: string
    eventBriefing?: string
    knownSecretThreads?: string[]
    previousDealings?: string
    relationshipTemperature?: string
    recentCourtFortune?: string
    factionPressure?: string
}): ChatMessage[] {
    const {
        npc,
        schemeType,
        speech,
        success,
        round,
        eventName,
        eventBriefing,
        knownSecretThreads = [],
        previousDealings,
        relationshipTemperature,
        recentCourtFortune,
        factionPressure,
    } = params

    const tone = getTrustTone(npc.trust)
    const factionLabel = FACTION_LABELS[npc.factionId] ?? npc.factionId
    const roundLine = round ? `当前回合：第${round}回合` : '当前回合：未标明'
    const eventLine = eventName ? `本回合局势：${eventName}` : '本回合局势：未标明'
    const briefingLine = eventBriefing ? `局势摘要：${eventBriefing}` : '局势摘要：未提及'
    const previousDealingsLine = `上回往来：${previousDealings ?? '上一回合你尚未与他正面过手。'}`
    const relationshipTemperatureLine = `近两回合关系温度：${relationshipTemperature ?? '近两回合你对他尚未形成稳定手法，他还在重新掂量你的来意。'}`
    const recentCourtFortuneLine = `近来得失：${recentCourtFortune ?? '近来朝局并无足以改写他心气的新波折。'}`
    const factionPressureLine = `派系压力：${factionPressure ?? '他眼下仍处在彼此掣肘的朝局里，不会轻易把真心亮出来。'}`

    return [
        { role: 'system', content: NPC_SYSTEM },
        {
            role: 'user',
            content: `角色：${npc.name}（${npc.title}）
公开人设：${npc.publicPersona}
公开政治立场：${npc.publicStance}
性格与行事风格：${npc.personality}
最容易被打动：${npc.softSpot}
最容易被激怒：${npc.triggerPoint}
最适合被撬动的计谋：${npc.schemeHooks}
${roundLine}
${eventLine}
${briefingLine}
已解锁暗线：${knownSecretThreads.length > 0 ? knownSecretThreads.join('；') : '暂无'}
${previousDealingsLine}
${relationshipTemperatureLine}
${recentCourtFortuneLine}
${factionPressureLine}
当前态度：${tone.label}
语气要求：${tone.description}
所属势力：${factionLabel}

萧宝颖本回合对其施以“${SCHEME_NAMES[schemeType]}”。
${speech ? `萧宝颖说辞：“${speech}”` : '萧宝颖未附加说辞。'}
结果：${success ? '计谋成功' : '计谋被识破或未能奏效'}

请生成${npc.name}此刻的回应。`,
        },
    ]
}

export function sanitizeNpcReplyText(reply: string): string {
    return reply
        .replace(/计相/g, '你')
        .replace(/计编修/g, '萧编修')
}

const EMPRESS_SYSTEM = `你是《佞臣》中的南陈女帝陈倩，负责生成一道给萧宝颖的问政题。
要求：
- 输出必须是严格 JSON
- 问题要和当前回合北方局势相关
- 四个选项分别偏向经济、军事、治理、民生
- 行文使用古典白话，选项简洁`

export function buildEmpressPrompt(params: {
    round: number
    eventName: string
    northBriefing: string
    southStats: NationDimensions
}): ChatMessage[] {
    const weakest = Object.entries(params.southStats).sort(([, a], [, b]) => (a as number) - (b as number))[0]
    const dimNames: Record<string, string> = {
        finance: '财政',
        grain: '粮赋',
        military: '军事',
        socialOrder: '民生',
        governance: '治理',
    }

    return [
        { role: 'system', content: EMPRESS_SYSTEM },
        {
            role: 'user',
            content: `请据此生成本回合问政题，返回 JSON：
第${params.round}回合，北方局势：《${params.eventName}》
北方简报：${params.northBriefing}
南陈当前最弱维度：${dimNames[weakest[0]]}（${weakest[1]}）
格式：{
  "question": "一句话问题",
  "options": [
    {"label": "A", "text": "选项内容", "direction": "经济"},
    {"label": "B", "text": "选项内容", "direction": "军事"},
    {"label": "C", "text": "选项内容", "direction": "治理"},
    {"label": "D", "text": "选项内容", "direction": "民生"}
  ]
}`,
        },
    ]
}

const EMPRESS_FEEDBACK_SYSTEM = `你是《佞臣》中的南陈女帝陈倩，正在给萧宝颖回批上一回合的问政建议。
要求：
- 2 到 3 句，古典白话风
- 口吻是女帝写给萧宝颖的密批
- 要体现：朕如何处置、成效先显在哪里、仍担心什么
- 不直接写数值
- 直接输出正文`

export function buildEmpressFeedbackPrompt(params: {
    sourceRound: number
    topic: string
    optionLabel: string
    optionContent: string
    reason: string
    effectSummary: string
}): ChatMessage[] {
    return [
        { role: 'system', content: EMPRESS_FEEDBACK_SYSTEM },
        {
            role: 'user',
            content: `请以女帝陈倩的身份，回批上一回合采纳的问政建议。
来源回合：第${params.sourceRound}回合
母题：${params.topic}
采纳选项：${params.optionLabel}. ${params.optionContent}
萧宝颖附言：${params.reason || '未附加解题'}
已产生的实际影响：${params.effectSummary}

请写一段给萧宝颖的密批。`,
        },
    ]
}

const STRUCTURED_PARSE_SYSTEM = '你是《佞臣》的结构化裁判。你只能输出 JSON，不得输出解释、代码块或多余文字。所有数值字段必须落在 0 到 1 之间。'

export function buildNorthSchemeParsePrompt(params: {
    round: number
    npc: NPC
    speech: string
    eventName: string
    eventBriefing: string
}): ChatMessage[] {
    return [
        { role: 'system', content: STRUCTURED_PARSE_SYSTEM },
        {
            role: 'user',
            content: `请分析这句北周施计说辞，只输出 JSON。
回合：第${params.round}回合
事件：${params.eventName}
局势：${params.eventBriefing}
目标人物：${params.npc.name}（${params.npc.title}），公开人设：${params.npc.publicPersona}
公开立场：${params.npc.publicStance}
性格：${params.npc.personality}
软肋：${params.npc.softSpot}
逆鳞：${params.npc.triggerPoint}
说辞：${params.speech}

输出字段：{
  "characterFit": 0-1,
  "eventFit": 0-1,
  "structuralPenetration": 0-1,
  "executability": 0-1,
  "exposureRisk": 0-1,
  "financeRelevance": 0-1,
  "grainRelevance": 0-1,
  "militaryRelevance": 0-1,
  "socialOrderRelevance": 0-1,
  "governanceRelevance": 0-1,
  "dominantIntent": "neutral|induce|threaten|divide|empathize|strategize",
  "evidence": ["不超过 3 条短句"]
}`,
        },
    ]
}

export function buildPolicyReasonParsePrompt(params: {
    round: number
    topic: string
    question: string
    reason: string
    meta: PolicyResolutionMeta
}): ChatMessage[] {
    return [
        { role: 'system', content: STRUCTURED_PARSE_SYSTEM },
        {
            role: 'user',
            content: `请分析这段南陈问政附言，只输出 JSON。
回合：第${params.round}回合
问政母题：${params.topic}
题目：${params.question}
附言：${params.reason}
法统方向：${params.meta.legitimacyEffect ?? 'steady'}
评分重点：${params.meta.aiScoringFocus ?? '未提供'}

输出字段：{
  "focusAlignment": 0-1,
  "executionClarity": 0-1,
  "costAwareness": 0-1,
  "legitimacyAlignment": 0-1,
  "policyStance": "neutral|balanced|aggressive|conservative|expedient",
  "evidence": ["不超过 3 条短句"]
}`,
        },
    ]
}
