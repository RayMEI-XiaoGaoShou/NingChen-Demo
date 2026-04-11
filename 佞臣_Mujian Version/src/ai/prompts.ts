// ========================================
// Prompt 模板
// 天道判官 + NPC Agent + 女帝来信
// ========================================

import type {
    NationDimensions,
    NPC,
    PolicyResolutionMeta,
    SchemeType,
} from '../game/types'

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

// ========================================
// 天道判官 — 回合结算叙事
// ========================================

const JUDGE_SYSTEM = `你是《佞臣》游戏中的"天道判官"，负责用古典白话文描述每回合的朝堂局势变化。

风格要求：
- 使用偏文言的白话文，类似《资治通鉴》的叙事语感
- 简洁有力，不超过150字
- 要有画面感和氛围感
- 不直接暴露数值，用文学化描述替代
- 以第三人称叙述，主角称"萧宝颖"

严禁事项：
- 绝对不得虚构下文未提及的事件或人物
- 只能基于提供的计谋结果和反馈内容进行概括
- 不要编造任何计谋以外的朝堂事件

你的输出应为一段完整的叙事段落，无需标题或格式标记。`

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
    const {
        round,
        eventName,
        eventImpactSummary,
        schemeResults,
        trustChangeSummary,
        northPowerChange,
        factionSummary,
        relationshipSummary,
        externalSummary,
        northSummary,
        southSummary,
        invasionSummary,
    } = params

    const schemeSummary = schemeResults.map((s, i) => {
        let line = `计谋${i + 1}：对${s.targetName}施"${s.schemeName}"→${s.success ? '成功' : '失败'}`
        if (s.playerSpeech) line += `，说辞："${s.playerSpeech}"`
        if (s.feedback) line += `，${s.targetName}的反应：${s.feedback}`
        return line
    }).join('\n')

    return [
        { role: 'system', content: JUDGE_SYSTEM },
        {
            role: 'user',
            content: `第${round}回合「${eventName}」结算：
主线局势：${eventImpactSummary}
${schemeSummary}
信任变化：${trustChangeSummary}。
党争与朝局：${factionSummary}。
关系失衡：${relationshipSummary || '暂无新的关键结构失衡'}。
外部人物：${externalSummary}。
北周国力变化：${northSummary}。
南陈回批：${southSummary}。
南征态势：${invasionSummary}。
综合国力：${northPowerChange}。
请仅根据以上事实生成本回合的叙事段落，不要添加任何上述未提及的事件。`,
        },
    ]
}

// ========================================
// NPC Agent — 个性化对话
// ========================================

const NPC_SYSTEM = `你是《佞臣》游戏中的NPC角色扮演引擎。根据NPC的性格、立场和当前信任度，生成该NPC对主角计谋的反应对话。

要求：
- 2~3句话，符合角色性格
- 古典白话文风格
- 体现NPC的情感态度（信任/警惕/怀疑等）
- 必须严格贴合该角色的官职、公开人设、公开政治立场与行为偏好
- 回应应优先体现其最容易被打动、最容易被激怒、最适合被哪些计谋撬动这三点
- 不要用现代网络语言
- 直接输出对话内容，无需引号或角色名前缀`

export function buildNpcPrompt(params: {
    npc: NPC
    schemeType: SchemeType
    speech: string
    success: boolean
    knownSecretThreads?: string[]
}): ChatMessage[] {
    const { npc, schemeType, speech, success, knownSecretThreads = [] } = params

    const schemeNames: Record<SchemeType, string> = {
        probe: '试探', advise: '献策', slander: '谗言', alienate: '离间',
        frame: '放风构陷', proxy: '借刀', appeal: '求援', omen: '谶纬',
        secession: '煽动割据', rebellion: '煽动造反',
    }

    const trustDesc = npc.trust >= 70 ? '非常信任' :
        npc.trust >= 50 ? '较为信赖' :
            npc.trust >= 30 ? '一般' :
                npc.trust >= 15 ? '较为警惕' : '非常敌视'

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
${knownSecretThreads.length > 0 ? `已解锁暗线：${knownSecretThreads.join('；')}` : '已解锁暗线：暂无'}
对主角信任度：${trustDesc}
所属势力：${npc.factionId}

主角对此人施"${schemeNames[schemeType]}"。
${speech ? `主角说辞："${speech}"` : '主角未附加说辞。'}
结果：${success ? '计谋成功' : '计谋被识破/失败'}

请生成${npc.name}的回应。`,
        },
    ]
}

// ========================================
// 女帝来信 — 动态问政题
// ========================================

const EMPRESS_SYSTEM = `你是《佞臣》游戏中南陈女帝陈倩的密信生成器。根据当前局势生成一道四选一的问政题。

格式要求（严格遵守JSON格式）：
{
  "question": "问题（1句话）",
  "options": [
    {"label": "A", "text": "选项内容", "direction": "经济/军事/治理/民生"},
    {"label": "B", "text": "选项内容", "direction": "经济/军事/治理/民生"},
    {"label": "C", "text": "选项内容", "direction": "经济/军事/治理/民生"},
    {"label": "D", "text": "选项内容", "direction": "经济/军事/治理/民生"}
  ]
}

要求：
- 问题应与当前回合的北方局势相关
- 四个选项分别倾向经济/军事/治理/民生四个方向
- 选项文字简洁，每个不超过15字
- 古典白话文风格
- 仅输出JSON，不要其他内容`

export function buildEmpressPrompt(params: {
    round: number
    eventName: string
    northBriefing: string
    southStats: NationDimensions
}): ChatMessage[] {
    const { round, eventName, northBriefing, southStats } = params

    const weakest = Object.entries(southStats).sort(
        ([, a], [, b]) => (a as number) - (b as number)
    )[0]

    const dimNames: Record<string, string> = {
        finance: '财政', grain: '粮赋', military: '军事',
        socialOrder: '社会秩序', governance: '统治穿透力',
    }

    return [
        { role: 'system', content: EMPRESS_SYSTEM },
        {
            role: 'user',
            content: `第${round}回合，北方局势：「${eventName}」。
北方简报：${northBriefing}
南陈最薄弱维度：${dimNames[weakest[0]]}（${weakest[1]}）。
请生成本回合的问政题。`,
        },
    ]
}

const EMPRESS_FEEDBACK_SYSTEM = `你是《佞臣》游戏中的南陈女帝陈倩。你正在回批上一回合采纳的问政建议。

要求：
- 2~3 句
- 口吻是女帝写给萧宝颖的密批
- 要体现“朕已如何处置”“成效初显在哪里”“仍担心什么”
- 古典白话文风格
- 不直接暴露数值
- 直接输出回批正文，不要额外标题`

export function buildEmpressFeedbackPrompt(params: {
    sourceRound: number
    topic: string
    optionLabel: string
    optionContent: string
    reason: string
    effectSummary: string
}): ChatMessage[] {
    const { sourceRound, topic, optionLabel, optionContent, reason, effectSummary } = params

    return [
        { role: 'system', content: EMPRESS_FEEDBACK_SYSTEM },
        {
            role: 'user',
            content: `请以女帝陈倩身份，回批上一回合的问政建议。

来源回合：第${sourceRound}回合
母题：${topic}
所采纳选项：${optionLabel}. ${optionContent}
萧宝颖附言：${reason || '未附加解释'}
已产生的实际影响：${effectSummary}

请写一段给萧宝颖的密批。`,
        },
    ]
}

const STRUCTURED_PARSE_SYSTEM = `你是《佞臣》的结构化裁判。你只能输出 JSON，不得输出解释、代码块或多余文字。所有数值字段都必须落在 0 到 1 之间。`

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
目标人物：${params.npc.name}（${params.npc.title}）
公开人设：${params.npc.publicPersona}
公开立场：${params.npc.publicStance}
性格：${params.npc.personality}
软肋：${params.npc.softSpot}
逆鳞：${params.npc.triggerPoint}
说辞：${params.speech}

输出字段：
{
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
  "evidence": ["不超过3条的短句"]
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
题目评分重点：${params.meta.aiScoringFocus ?? '未提供'}

输出字段：
{
  "focusAlignment": 0-1,
  "executionClarity": 0-1,
  "costAwareness": 0-1,
  "legitimacyAlignment": 0-1,
  "policyStance": "neutral|balanced|aggressive|conservative|expedient",
  "evidence": ["不超过3条的短句"]
}`,
        },
    ]
}
