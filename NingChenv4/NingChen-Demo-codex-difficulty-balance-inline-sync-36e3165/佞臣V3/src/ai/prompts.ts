import type {
    NationDimensions,
    NPC,
    NorthSchemeParseResult,
    OmenSpeechInput,
    PolicyResolutionMeta,
    SchemeFollowUpParseResult,
    SchemeType,
} from '../game/types'
import { getAlignmentLabel, getExternalStatusLabel, getTrustLabel } from '../game/types'
import type { FengDaozhiDraftContext } from '../game/fengDaozhiAdvisor'
import type { EmpressFeedbackContext } from '../game/empressFeedbackContext'
import { deriveCourtFavorHit } from '../game/courtDispositionEngine'
import { getNpcSelfReference, getNpcVoiceProfile } from '../game/npcVoiceProfile'
import { describeNpcPressureOverlay, describeNpcSchemeReactionProfile, getNpcReactionRole } from './npcSchemeReactionProfile'
import { describeNpcFollowUpFinalProfile } from './npcFollowUpFinalProfile'
import { describeEmpressVoiceProfile } from './empressVoiceProfile'
import { describeEmpressFeedbackProfile, formatEmpressFeedbackProfile } from './empressFeedbackProfile'

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

export type NpcFollowUpMode = 'none' | 'question_candidate' | 'statement_only'

const SCHEME_NAMES: Record<SchemeType, string> = {
    probe: '试探',
    advise: '献策',
    slander: '谗言',
    alienate: '离间',
    frame: '设局嫁祸',
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
- 回答通常 3 到 6 句，必要时可短到 2 句、长到 7 句；古典白话风，尽量在 110 到 240 字之间，不要为了凑字数硬拉长
- 必须严格贴合该人物的官职、公开人设、公开立场、性格、软肋与逆鳞
- 要明显体现当前态度档位给出的语气要求
- 要严格服从人物声音档案：自称、句式长短、起手习惯、常落话题与高压时偏移，都不能乱
- 不同计谋类型的回应重心必须不同：试探要像多露半层口风，献策要像评策也评人，谗言/离间要像顺着旧疑旧怨往上推，设局嫁祸与谶纬都要写出人物的失态、自辩或压谣动作
- 可以结合“本回合局势”“上回往来”“近两回合关系温度”“近来得失”“派系压力”“长期旧账”与“已解锁暗线”决定说话轻重，但不得跳出人设
- 不得称主角为“计相”“计编修”或任何你自造的官称
- 称呼主角时只可称“你”“翰林编修”或“萧编修”
- 不要只回一句态度表态，要给出一层判断、一层情绪、再带一点试探、提醒或留扣
- 不用现代口语、网络语、括号说明或角色名前缀
- 直接输出对话正文`

function getTrustTone(trust: number): { label: string; description: string } {
    const label = getTrustLabel(trust)

    switch (label) {
        case '敌意':
            return {
                label,
                description: '冷硬、带刺、极少露口风，宁可压人也不肯让你占到便宜；高压时更容易直接翻脸或反咬。',
            }
        case '戒备':
            return {
                label,
                description: '客气里带防备，肯接话但句句留钩，不会轻易交底；更容易把你的来意也一起纳入怀疑。',
            }
        case '平淡':
            return {
                label,
                description: '表面平稳，更多是在试你的成色，既不明显亲近，也不轻易翻脸；说话仍以掂量和观察为主。',
            }
        case '信赖':
            return {
                label,
                description: '语气已有松动，愿意顺着你的意思多说半句，但仍会保留分寸；更可能给出真正有用的一层判断。',
            }
        case '倚重':
            return {
                label,
                description: '明显把你视为可依赖之人，愿给实话与提醒，但仍会守住自身边界；认策时也更容易连带认人。',
            }
        case '深信':
            return {
                label,
                description: '几乎把你当自己人，说话更直、更深，也更愿意与你站在同一边；提醒、试探和留扣都会更贴身。',
            }
        default:
            return {
                label,
                description: '依人物本性斟酌回应。',
            }
    }
}

function describeVoiceProfile(npc: NPC): string {
    const profile = getNpcVoiceProfile(npc)
    const selfReferenceLine = profile.selfReference
        ? `自称：涉及自身权势、判断或行止时，应自然自称“${profile.selfReference}”。`
        : '自称：依人物身份自然行文，不必额外抬高自称。'

    return [
        '人物声音档案：',
        `- ${selfReferenceLine}`,
        `- 称呼主角偏好：${profile.protagonistAddressPreference}`,
        `- 句式节奏：${profile.sentenceLength}`,
        `- 用词气质：${profile.diction}`,
        `- 起手习惯：${profile.openingHabit}`,
        `- 常落话题：${profile.topicAnchors}`,
        `- 收束留扣：${profile.closingHook}`,
        `- 高压偏移：${profile.pressureShift}`,
        `- 粗话规则：${profile.coarseLanguage}`,
        `- 易错提醒：${profile.pitfalls}`,
    ].join('\n')
}

function getSchemeReactionGuidance(params: {
    npc: NPC
    schemeType: SchemeType
    success: boolean
    relatedNpc?: NPC | null
}): string {
    const { npc, schemeType, success, relatedNpc } = params
    const relatedNpcName = relatedNpc?.name ?? '另一人'
    const reactionRole = getNpcReactionRole(npc)

    switch (schemeType) {
        case 'probe':
            return success
                ? '计谋反应重心：试探成功时，不是和盘托出，而是比平时多露半层口风；让人感觉门松了一下，但信息边界仍在。'
                : '计谋反应重心：试探失败时，要让人感觉门被关上了；重点是警觉、审来意与把话题收回去。'
        case 'advise':
            return success
                ? '计谋反应重心：献策成功时，先评方案是否真能落地，再评萧宝颖这个人是否可用；可以认策，不必立刻认人。'
                : '计谋反应重心：献策失败时，重点不是暴怒，而是指出此策站不住脚、落不到地，或听着漂亮却不够成事。'
        case 'slander':
            return success
                ? `计谋反应重心：谗言成功时，要顺着旧疑心把裂缝坐实；若牵连人物是${relatedNpcName}，可自然提到此事不能只停在你我之间。`
                : '计谋反应重心：谗言失败时，不要只写“我不信”，更像识破你想把我往哪处引，并把怀疑压回去。'
        case 'alienate':
            return success
                ? `计谋反应重心：离间成功时，要把旧怨翻起来，让“${relatedNpcName}并非一路”的感觉成立；裂缝要比谗言更像积怨被坐实。`
                : '计谋反应重心：离间失败时，要像暂不撕破脸、也不轻易上钩，更接近“我且记下，容后再论”。'
        case 'frame':
            return success
                ? '计谋反应重心：设局嫁祸成功时，戏眼是失言、失态、急于解释、急于切割；不是单纯生气，而是被逼进局里。'
                : '计谋反应重心：设局嫁祸失败时，不一定大怒；更像阴沉地看穿你在做局，把这笔账记下。'
        case 'proxy':
            return success
                ? '计谋反应重心：借刀成功时，重点是让人感觉：由头可以用，但出手的节奏与时机仍由 NPC 自己掌控，不能写成被你遥控。'
                : '计谋反应重心：借刀失败时，重点是防着被你拿去当刀；可表现为时机未到、身份不便或不愿接你的节奏。'
        case 'appeal':
            if (reactionRole === 'hybrid_external') {
                return success
                    ? '计谋反应重心：求援成功时，独孤文约这类混合型外部角色，不该只谈粮械，更要谈他能否借此换到更独立的政治身位。'
                    : '计谋反应重心：求援失败时，不只是在压价，更是在判断你给不给得起足以改他位置与分量的东西。'
            }
            return success
                ? npc.powerBase === 'external'
                    ? '计谋反应重心：求援成功时，重点是交易、条件、价码与资源兑现，不要写成空泛表忠。'
                    : '计谋反应重心：求援成功时，重点是入口、背书、权柄与规矩，而不是江湖义气。'
                : npc.powerBase === 'external'
                    ? '计谋反应重心：求援失败时，更像谈崩：条件不够、价码太虚，或你根本拿不出真东西。'
                    : '计谋反应重心：求援失败时，重点是门不开、资格不够，而不是泛泛冷淡。'
        case 'omen':
            return success
                ? reactionRole === 'hybrid_external'
                    ? '计谋反应重心：谶纬成功时，独孤文约这类混合型外部角色，要先算这句征兆会不会改写他在西线的分量与独立性，再落到军需、监军和中枢疑心。'
                    : '计谋反应重心：谶纬成功时，必须写出惊疑、自辩、压谣、借兆反打中的一种，并明确这句征兆究竟触到了他哪一层危机。'
                : '计谋反应重心：谶纬失败时，不是泛泛说不信，而是硬顶、反嘲，甚至反过来记你一笔。'
        case 'secession':
            return success
                ? '计谋反应重心：煽动割据成功时，不会直接喊“我反了”，而是让野心开始被认真盘算、但还没有下定决心。'
                : '计谋反应重心：煽动割据失败时，重点是“你凭什么让我冒这个险”，并警惕你是不是来试探他的。'
        case 'rebellion':
            return success
                ? '计谋反应重心：煽动造反成功时，语气要有破釜沉舟的重量，并开始谈条件、谈谁先动。'
                : '计谋反应重心：煽动造反失败时，应比割据失败更激烈，可能震怒、恐惧，甚至带出灭口或上报的威胁。'
        default:
            return '计谋反应重心：紧扣这类计谋本身的着力点来回应，不要把所有计谋都写成同一种态度表白。'
    }
}

function describeUpwardReportGuidance(params: {
    npc: NPC
    relatedNpc?: NPC | null
    schemeType: SchemeType
    success: boolean
    northParse?: NorthSchemeParseResult
}): string {
    const { npc, relatedNpc, schemeType, success, northParse } = params
    if (!success) return ''
    if ((schemeType !== 'slander' && schemeType !== 'alienate') || !relatedNpc || !northParse) return ''

    const hit = deriveCourtFavorHit({
        schemeType,
        actorNpc: npc,
        targetNpc: relatedNpc,
        success,
        parse: northParse,
    })

    const loweredLayers: string[] = []
    if (hit.emperorFavorDelta < 0) loweredLayers.push('皇帝恩宠')
    if (hit.empressDowagerFavorDelta < 0) loweredLayers.push('太后眷顾')
    if (loweredLayers.length === 0) return ''

    const reportTarget =
        loweredLayers.length === 2
            ? '御前与帘前'
            : loweredLayers[0] === '皇帝恩宠'
                ? '御前'
                : '帘前'

    return `权力上传动作：这一步若已顺着对${relatedNpc.name}的疑心或旧怨，压低了${loweredLayers.join('与')}，可在收束处自然流露“要把此事递到${reportTarget}”的动作倾向；不得写成统一套话，必须服从此人的身份、性格与口气。`
}

function getNpcSelfReferenceLine(npc: NPC): string {
    const selfReference = getNpcSelfReference(npc)
    return selfReference
        ? `当前自称锚点：提及自身权势、判断或行止时，应自然自称“${selfReference}”。`
        : '当前自称锚点：依人物身份自然行文，不必额外抬高自称。'
}

export function buildNpcPrompt(params: {
    npc: NPC
    schemeType: SchemeType
    speech: string
    success: boolean
    followUpMode?: NpcFollowUpMode
    round?: number
    eventName?: string
    eventBriefing?: string
    knownSecretThreads?: string[]
    previousDealings?: string
    relationshipTemperature?: string
    recentCourtFortune?: string
    factionPressure?: string
    longTermMemorySummary?: string
    relationMemorySummary?: string
    relatedNpc?: NPC | null
    northParse?: NorthSchemeParseResult
}): ChatMessage[] {
    const {
        npc,
        schemeType,
        speech,
        success,
        followUpMode = 'none',
        round,
        eventName,
        eventBriefing,
        knownSecretThreads = [],
        previousDealings,
        relationshipTemperature,
        recentCourtFortune,
        factionPressure,
        longTermMemorySummary,
        relationMemorySummary,
        relatedNpc,
        northParse,
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
    const longTermMemoryLine = longTermMemorySummary?.trim()
        ? `长期旧账：${longTermMemorySummary}`
        : null
    const relationMemoryLine = relationMemorySummary?.trim()
        ? `关系旧账：${relationMemorySummary}`
        : null
    const relatedNpcLine = relatedNpc
        ? `牵连人物：${relatedNpc.name}（${relatedNpc.title}）`
        : null
    const voiceProfileLine = describeVoiceProfile(npc)
    const selfReferenceLine = getNpcSelfReferenceLine(npc)
    const schemeReactionGuidance = getSchemeReactionGuidance({
        npc,
        schemeType,
        success,
        relatedNpc,
    })
    const structuredSchemeReactionProfile = describeNpcSchemeReactionProfile({
        npc,
        schemeType,
        success,
        relatedNpc,
    })
    const pressureOverlay = describeNpcPressureOverlay({
        npc,
        schemeType,
        success,
    })
    const upwardReportGuidance = describeUpwardReportGuidance({
        npc,
        relatedNpc,
        schemeType,
        success,
        northParse,
    })
    const omenReplyGuidance = schemeType === 'omen' && !structuredSchemeReactionProfile
        ? npc.powerBase === 'external'
            ? '谶纬应答：外部军头的第一反应，不是空谈朝中名分，而是先看中枢是否起疑、粮道军需是否会被收紧、御史监军是否要压下来；回应里要写出他是惊惶自辩、怒斥有人借兆栽赃、顺势改口借兆压人，还是先封口压谣稳住军心。'
            : '谶纬应答：要写出这句谶纬怎样先触到人物的软肋，再决定他是惊惶解释、怒斥有人借兆栽赃、顺势改口借兆立威，还是下令压住风声；不要把谶纬当成泛泛不祥，必须让反应带出角色自己的判断、情绪和动作。'
        : ''
    const followUpInstruction = followUpMode === 'question_candidate'
        ? '追问模式：若角色身份、关系温度与战术情势足以支撑，可在收束处只准留一句尖锐而自然的追问；否则必须回到陈述，不要为了追问而追问，也不要连发多问。'
        : followUpMode === 'statement_only'
            ? '收束模式：必须以陈述句收束，不要再给玩家留下新的回话钩子。'
            : ''

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
${relatedNpcLine ? `${relatedNpcLine}\n` : ''}${voiceProfileLine}
${roundLine}
${eventLine}
${briefingLine}
已解锁暗线：${knownSecretThreads.length > 0 ? knownSecretThreads.join('；') : '暂无'}
${previousDealingsLine}
${relationshipTemperatureLine}
${recentCourtFortuneLine}
${factionPressureLine}
${longTermMemoryLine ? `${longTermMemoryLine}\n` : ''}
${relationMemoryLine ? `${relationMemoryLine}\n` : ''}
${selfReferenceLine}
${schemeReactionGuidance}
${structuredSchemeReactionProfile ? `${structuredSchemeReactionProfile}\n` : ''}
${pressureOverlay ? `${pressureOverlay}\n` : ''}
${upwardReportGuidance ? `${upwardReportGuidance}\n` : ''}${omenReplyGuidance ? `${omenReplyGuidance}\n` : ''}
${followUpInstruction ? `${followUpInstruction}\n` : ''}
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

const SCHEME_FOLLOW_UP_PARSE_SYSTEM = `你是《佞臣》中的结构化裁判。你只能输出严格 JSON，不得输出解释、代码块或多余文字。这个回复不是第四个计谋，只是对原计谋的补充修正。所有数值字段都必须落在指定范围内。`

export function buildSchemeFollowUpParsePrompt(params: {
    round: number
    eventName: string
    eventBriefing: string
    npc: NPC
    schemeType: SchemeType
    originalSpeech: string
    originalParse: NorthSchemeParseResult
    npcQuestion: string
    playerReply: string
}): ChatMessage[] {
    return [
        { role: 'system', content: SCHEME_FOLLOW_UP_PARSE_SYSTEM },
        {
            role: 'user', content: `请分析这段玩家对追问的回复，只输出 JSON。
第${params.round}回合
事件：${params.eventName}
局势摘要：${params.eventBriefing}
NPC：${params.npc.name}（${params.npc.title}）
公开人设：${params.npc.publicPersona}
公开立场：${params.npc.publicStance}
性格与行事风格：${params.npc.personality}
本回合计谋类型：${SCHEME_NAMES[params.schemeType]}
原始说辞：${params.originalSpeech}
原始解析：${JSON.stringify(params.originalParse)}
NPC追问：${params.npcQuestion}
玩家回复：${params.playerReply}

判定要求：
- 这不是第四个计谋，只是原计谋的补充修正。
- 只评估这句回复是否澄清了原说辞、是否顺着 NPC 的利益与疑虑、是否压住了暴露风险。
- 不要把它当成全新计谋重算，不要重新评价原说辞的基础强度。
- 只输出严格 JSON，不要解释，不要代码块，不要附加文字。

输出字段：
{
  "clarificationFit": 0-1,
  "npcInterestFit": 0-1,
  "pressureControl": 0-1,
  "contradictionRisk": 0-1,
  "exposureRiskDelta": -0.12 to 0.18,
  "successRateDelta": -0.08 to 0.12,
  "effectMultiplierDelta": -0.10 to 0.18,
  "evidence": ["不超过 3 条短句"]
}` },
    ]
}

const NPC_FOLLOW_UP_FINAL_SYSTEM = `你是《佞臣》中的 NPC 回应引擎。你只能输出给玩家看的最终回应，不得输出 JSON、分数或系统判断。必须以陈述句收束，不要再问玩家新的问题。`

export function buildNpcFollowUpFinalPrompt(params: {
    npc: NPC
    schemeType: SchemeType
    originalSpeech: string
    npcQuestion: string
    playerReply: string
    parseEvidence: string[]
    followUpParse?: SchemeFollowUpParseResult
    round?: number
    eventName?: string
    eventBriefing?: string
    knownSecretThreads?: string[]
    previousDealings?: string
    relationshipTemperature?: string
    recentCourtFortune?: string
    factionPressure?: string
    longTermMemorySummary?: string
    relationMemorySummary?: string
    relatedNpc?: NPC | null
    northParse?: NorthSchemeParseResult
}): ChatMessage[] {
    const evidenceLine = params.parseEvidence.length > 0 ? params.parseEvidence.join('；') : '暂无'
    const tone = getTrustTone(params.npc.trust)
    const voiceProfileLine = describeVoiceProfile(params.npc)
    const selfReferenceLine = getNpcSelfReferenceLine(params.npc)
    const schemeReactionGuidance = getSchemeReactionGuidance({
        npc: params.npc,
        schemeType: params.schemeType,
        success: true,
        relatedNpc: params.relatedNpc,
    })
    const structuredSchemeReactionProfile = describeNpcSchemeReactionProfile({
        npc: params.npc,
        schemeType: params.schemeType,
        success: true,
        relatedNpc: params.relatedNpc,
    })
    const pressureOverlay = describeNpcPressureOverlay({
        npc: params.npc,
        schemeType: params.schemeType,
        success: true,
    })
    const upwardReportGuidance = describeUpwardReportGuidance({
        npc: params.npc,
        relatedNpc: params.relatedNpc,
        schemeType: params.schemeType,
        success: true,
        northParse: params.northParse,
    })
    const followUpFinalProfile = params.followUpParse
        ? describeNpcFollowUpFinalProfile({
            npc: params.npc,
            schemeType: params.schemeType,
            followUpParse: params.followUpParse,
            northParse: params.northParse,
        })
        : {
            followUpResultTone: '这句补答让局面继续往下走了一步，但还没有完全定住。',
            clarifiedConcern: '你把自己真正想说的那层意思补得更明一些。',
            remainingSuspicion: '可他心里那根刺未必就此消下去。',
            closureMode: '收束方式：收了疑，但未尽信；应稳住局面，不再另起新问。',
        }
    const roundLine = params.round ? `当前回合：第${params.round}回合` : null
    const eventLine = params.eventName ? `本回合局势：${params.eventName}` : null
    const briefingLine = params.eventBriefing ? `局势摘要：${params.eventBriefing}` : null
    const knownSecretThreadsLine = params.knownSecretThreads && params.knownSecretThreads.length > 0
        ? `已解锁暗线：${params.knownSecretThreads.join('；')}`
        : '已解锁暗线：暂无'
    const previousDealingsLine = `上回往来：${params.previousDealings ?? '上一回合你尚未与他正面过手。'}`
    const relationshipTemperatureLine = `近两回合关系温度：${params.relationshipTemperature ?? '近两回合你对他尚未形成稳定手法，他还在重新掂量你的来意。'}`
    const recentCourtFortuneLine = `近来得失：${params.recentCourtFortune ?? '近来朝局并无足以改写他心气的新波折。'}`
    const factionPressureLine = `派系压力：${params.factionPressure ?? '他眼下仍处在彼此掣肘的朝局里，不会轻易把真心亮出来。'}`
    const longTermMemoryLine = params.longTermMemorySummary?.trim()
        ? `长期旧账：${params.longTermMemorySummary}`
        : null
    const relationMemoryLine = params.relationMemorySummary?.trim()
        ? `关系旧账：${params.relationMemorySummary}`
        : null
    const relatedNpcLine = params.relatedNpc
        ? `牵连人物：${params.relatedNpc.name}（${params.relatedNpc.title}）`
        : null
    const originalStructureLine = params.northParse?.evidence?.length
        ? `原始说辞命中：${params.northParse.evidence.join('；')}`
        : null

    return [
        { role: 'system', content: NPC_FOLLOW_UP_FINAL_SYSTEM },
        {
            role: 'user',
            content: `角色：${params.npc.name}（${params.npc.title}）
${roundLine ? `${roundLine}\n` : ''}${eventLine ? `${eventLine}\n` : ''}${briefingLine ? `${briefingLine}\n` : ''}${relatedNpcLine ? `${relatedNpcLine}\n` : ''}${knownSecretThreadsLine}
${previousDealingsLine}
${relationshipTemperatureLine}
${recentCourtFortuneLine}
${factionPressureLine}
${longTermMemoryLine ? `${longTermMemoryLine}\n` : ''}${relationMemoryLine ? `${relationMemoryLine}\n` : ''}${originalStructureLine ? `${originalStructureLine}\n` : ''}人物态度：${tone.label}
语气要求：${tone.description}
${voiceProfileLine}
${selfReferenceLine}
本回合计谋类型：${SCHEME_NAMES[params.schemeType]}
${schemeReactionGuidance}
${structuredSchemeReactionProfile ? `${structuredSchemeReactionProfile}\n` : ''}
${pressureOverlay ? `${pressureOverlay}\n` : ''}
${upwardReportGuidance ? `${upwardReportGuidance}\n` : ''}补答后判断：${followUpFinalProfile.followUpResultTone}
主要澄清：${followUpFinalProfile.clarifiedConcern}
剩余疑点：${followUpFinalProfile.remainingSuspicion}
${followUpFinalProfile.closureMode}
原始说辞：${params.originalSpeech}
NPC追问：${params.npcQuestion}
玩家回复：${params.playerReply}
解析依据：${evidenceLine}

写法要求：
- 输出 2 到 4 句古典白话
- 以陈述句收束，不要再问玩家新的问题
- 不要输出 JSON、分数或系统判断
- 这是 NPC 面向玩家的最终回应，不要再留新的回话钩子`,
        },
    ]
}

const OMEN_ECHO_SYSTEM = `你是《佞臣》中的“谶回声”写手。你要代入指定的朝中发声者，以第一人称写出一段对谶纬的回批。
要求：
- 输出 4 到 6 句，古典白话风，约 120 到 220 字
- 必须站在发声者的官场口吻里，不要跳出人物，也不要替主角说话
- 重点解释这段谶纬如何被理解、被借用、被转成实际的朝局动作
- 若目标是外部军头，必须自然带出中枢动作，如截断粮道、加派御史监督、核查军需、派监军、收束诏令
- 不要只写天象感叹，必须有判断、反应和动作方向
- 直接输出正文，不要标题、引号或列表`

export function buildOmenEchoPrompt(params: {
    speakerNpc: NPC
    targetNpc: NPC
    omenText: string
    interpretationText: string
    roundEvent: {
        round: number
        eventName: string
        eventBriefing: string
    }
    parseSummary?: string
}): ChatMessage[] {
    const targetReactionRole = getNpcReactionRole(params.targetNpc)
    const targetReactionGuidance = targetReactionRole === 'court'
        ? '中枢动作提示：收束诏令、核查账册、压住旁支、细究名分。'
        : targetReactionRole === 'hybrid_external'
            ? '中枢动作提示：既要写出中枢可能借题重排西线位置，也可自然带出截断粮道、加派御史监督、核查军需、派监军、收束诏令。'
            : '中枢动作提示：截断粮道、加派御史监督、核查军需、派监军、收束诏令。'
    const targetRoleLabel =
        targetReactionRole === 'court'
            ? `朝中人物，阵营偏向 ${getAlignmentLabel(params.targetNpc.alignmentBias)}`
            : targetReactionRole === 'hybrid_external'
                ? `混合型外部角色，外部状态 ${getExternalStatusLabel(params.targetNpc.externalStatus)}`
                : `外部军头，外部状态 ${getExternalStatusLabel(params.targetNpc.externalStatus)}`

    return [
        { role: 'system', content: OMEN_ECHO_SYSTEM },
        {
            role: 'user',
            content: `发声者：以${params.speakerNpc.name}（${params.speakerNpc.title}）的口吻。
目标人物：${params.targetNpc.name}（${params.targetNpc.title}，${targetRoleLabel})
第${params.roundEvent.round}回合
回合事件：${params.roundEvent.eventName}
局势摘要：${params.roundEvent.eventBriefing}
谶辞 / 征兆：${params.omenText}
解释 / 指向：${params.interpretationText}
parseSummary：${params.parseSummary ?? '暂无'}
${targetReactionGuidance}

写法要求：
- 必须明确说出这段谶纬被如何解释，以及打算拿它推动什么
- 若目标是外部军头，要让人自然听出中枢会朝粮道、御史、军需、监军这些方向下手
- 若目标在朝中，要让人自然听出名分、诏令、账册、旁支节制这些方向
- 直接输出最终回声，不要 JSON，不要解释`},
    ]
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
- 必须是女帝写给萧宝颖的密批，不是题目讲评，也不是系统总结
- 必须自称“朕”
- 2 到 4 句，古典白话风，建议控制在 70 到 150 字
- 先给裁断，再点此策眼下先见何效、仍防何患，必要时留一手后着
- 要同时服从“女帝声音档案”和“女帝回批矩阵”
- 不直接罗列数值，不要写成现代分析报告
- 直接输出正文`

export function buildEmpressFeedbackPrompt(context: EmpressFeedbackContext): ChatMessage[] {
    const voiceProfile = describeEmpressVoiceProfile()
    const feedbackProfile = formatEmpressFeedbackProfile(describeEmpressFeedbackProfile(context))

    return [
        { role: 'system', content: EMPRESS_FEEDBACK_SYSTEM },
        {
            role: 'user',
            content: `请以女帝陈倩的身份，回批上一回合采纳的问政建议。
来源回合：第${context.sourceRound}回合
母题：${context.topic}
问政题目：${context.question}
采纳选项：${context.optionLabel}. ${context.optionContent}
萧宝颖附言：${context.reason}
实际影响：${context.effectSummary}
政务领域：${context.policyDomainLabel}
附言判断：${context.reasonQualitySummary}
附言结构：${context.policyParseSummary}
法统走向：${context.legitimacySummary}
评分重心：${context.scoringFocus ?? '未额外标注'}
南陈当前重心：${context.statePrioritySummary}
南陈当前最弱一维：${context.weakestDimensionLabel}
南陈当前最强一维：${context.strongestDimensionLabel}
当前最先起色的一维：${context.recoveringDimensionLabel}
北方镜像：${context.northMirrorSummary}
战焦状态：${context.warWindowSummary}
萧宝颖处境：${context.playerPositionSummary}
${context.recentAftereffectSummary ? `上一轮问政余波：${context.recentAftereffectSummary}` : '上一轮问政余波：暂无额外余波'}

${voiceProfile}

${feedbackProfile}

请写一段给萧宝颖的密批。`,
        },
    ]
}

const STRUCTURED_PARSE_SYSTEM = '你是《佞臣》的结构化裁判。你只能输出 JSON，不得输出解释、代码块或多余文字。所有数值字段必须落在 0 到 1 之间。'

export function buildNorthSchemeParsePrompt(params: {
    round: number
    npc: NPC
    schemeType: SchemeType
    speech: string
    omenSpeechInput?: OmenSpeechInput
    eventName: string
    eventBriefing: string
}): ChatMessage[] {
    const parseSchemeLabels: Record<SchemeType, string> = {
        probe: '试探',
        advise: '献策',
        slander: '谗言',
        alienate: '离间',
        frame: '设局嫁祸',
        proxy: '借刀',
        appeal: '求援',
        omen: '谶纬',
        secession: '煽动割据',
        rebellion: '煽动造反',
    }
    const targetTypeLine = params.npc.powerBase === 'external'
        ? `目标类型：外部军头
公开数值：军事力量 ${params.npc.militaryPower}、朝廷忠诚 ${params.npc.loyaltyToCourt}、信任 ${params.npc.trust}、阵营偏向 ${getAlignmentLabel(params.npc.alignmentBias)}、外部状态 ${getExternalStatusLabel(params.npc.externalStatus)}`
        : `目标类型：朝廷人物
公开数值：信任 ${params.npc.trust}、阵营偏向 ${getAlignmentLabel(params.npc.alignmentBias)}`

    const schemeSpecificRubric =
        params.schemeType === 'slander' || params.schemeType === 'alienate' || params.schemeType === 'frame'
            ? '\n- 若是谗言、离间、设局嫁祸之类高压计，必须看到明确的人事链条、权力链条或利益链条，才可给高分。' +
              '\n- 单靠危机感、甩锅感、泛化猜疑，不得判成高 characterFit 或高 structuralPenetration。' +
              '\n- 若是设局嫁祸，要额外看它是否真能诱使目标自己失言、失态或误判，以及嫌疑是否会落回目标本人。' +
              '\n- 若只是暗示“可能出事”“可能被卖”“可能背锅”，却没有点明谁借谁上位、谁替谁背锅、谁和谁互相牵制，应维持中低分。' +
              '\n- For slander, generic suspicion or mood should not score high; only score suspicionTransmission high when the speech clearly shows why distrust reaches command, logistics, access, or execution.' +
              '\n- For alienate, relationship crack must reach command, logistics, or coordination before fractureTransmission scores high; only score it highly when the speech creates a believable break over authority, precedence, logistics, grain, legal cover, or coordination.'
            : params.schemeType === 'proxy'
                ? '\n- 若是借刀，必须同时看出手动机、出手手段与公域后果，不能只因“想借某人之手”就给高 structuralPenetration。' +
                  '\n- 普通的催促、示意、借势之词，只能说明私人攻击意图，不能直接推成高 nation-layer 破坏。' +
                  '\n- For proxy, actor motive, means, and public consequence must all be present before proxyTransmission scores high; only score proxyTransmission high when the target has motive, means, and the resulting move would create a broader public consequence.'
            : params.schemeType === 'omen'
                ? '\n- 若是谶纬，必须先看谶辞/征兆本身是否成立，再看解释/指向是否真正触及灾异、天命、名分、法统。' +
                  '\n- 要明确区分目标类型：若目标是外部军头，必须写明它如何借兵自重、如何在中枢之外形成独立权势。' +
                  '\n- 若是朝廷人物，则更应看谶辞是否真指向其名分、官阶、派系位置或中枢权力结构，而不是泛泛骂人不祥。' +
                  '\n- 要额外判断它究竟是在劝人修德安民、补法统，还是在借灾异放大名分裂缝与人心疑惧。' +
                  '\n- 若没有明确的征兆锚点，或解释没有把征兆引向名分裂缝与可疑对象，就不得给高 omen 质量。' +
                  '\n- omenAccusationClarity 看的是这段谶纬是否清楚点出某个具体目标、某条权力链或某个可疑结构，而不是只营造不祥气氛。' +
                  '\n- centralSanctionLeverage 看的是它是否给中枢留下具体可执行的处置抓手，例如截断粮道、放慢军需、调御史核账、派监军监督、收束诏令、清查账目或加派监督。' +
                  '\n- 只有当说辞能让中枢抓到明确对象，并顺势提出可执行的中央处置抓手时，才可给高 centralSanctionLeverage。' +
                  '\n- 普通危言耸听、空泛不祥感，不得给高 omen 质量，也不得轻易判成 destabilizing。'
                : params.schemeType === 'advise' || params.schemeType === 'probe'
                    ? '\n- 若是献策、试探之类稳计，除非说辞真的点出人物、局势与抓手，否则不要轻易给高 structuralPenetration 或高 executability。' +
                      '\n- 对献策要额外判断：它究竟更利于北周国家整体，还是更利于目标人物或其派系而伤害北周整体。'
                    : ''

    const polarityRubric =
        '\n方向性判断：' +
        '\n- stateBenefit 看的是这段话对北周国家整体是利是害，范围 -1 到 1。' +
        '\n- targetBenefit 看的是这段话对目标人物个人利益是利是害，范围 -1 到 1。' +
        '\n- factionBenefit 看的是这段话对其派系或局部权力网络是利是害，范围 -1 到 1。' +
        '\n- advicePolarity 只在 advise 里重点判断：pro_state | pro_target_anti_state | neutral_or_vague。' +
        '\n- legitimacyDirection 看的是谶纬对北周名分、法统、天命叙事的净方向，范围 -1 到 1。' +
        '\n- omenPolarity 只在 omen 里重点判断：legitimizing | destabilizing | vague_or_ceremonial。' +
        '\n- selfTrapPotential 只在设局嫁祸里重点判断：此话是否真能诱使目标自己失言、失态或误判，范围 0 到 1。' +
        '\n- scapegoatClarity 只在设局嫁祸里重点判断：嫌疑与责任是否会明确回落到目标本人，范围 0 到 1。' +
        '\n- omenAnchorStrength 只在 omen 里重点判断：谶辞/征兆本身是否像真正的征兆锚点，范围 0 到 1。' +
        '\n- legitimacyCrack 只在 omen 里重点判断：解释是否真的把征兆引向名分、法统、天命裂缝，范围 0 到 1。' +
        '\n- suspicionDirection 只在 omen 里重点判断：解释是否把警惕与怀疑导向某类人、某条关系线或某个权力结构，范围 0 到 1。' +
        '\n- suspicionTransmission 只在 slander 里重点判断：怀疑是否会从私人猜忌传导到军令、粮道、诏令、边镇接应或中枢执行，范围 0 到 1。' +
        '\n- fractureTransmission 只在 alienate 里重点判断：裂缝是否会真实破坏指挥、调度、接应、粮道或派系协调，范围 0 到 1。' +
        '\n- proxyTransmission 只在 proxy 里重点判断：借刀之举是否真会触发可见的公域后果，而非仅是私怨与威吓，范围 0 到 1。' +
        '\n- 若是利国之策，即便也让目标人物得利，仍应优先判为 pro_state。' +
        '\n- 只有“对人或对派系有利、对北周整体有害”时，才应判成 pro_target_anti_state。' +
        '\n- 若谶纬只是礼仪化、模糊化、泛化不祥感，而未真正触及名分和法统裂缝，应判 vague_or_ceremonial。'

    const speechBlock =
        params.schemeType === 'omen' && params.omenSpeechInput
            ? `谶辞 / 征兆：${params.omenSpeechInput.omenText || '未填'}
解释 / 指向：${params.omenSpeechInput.interpretationText || '未填'}
合并说辞：${params.speech}`
            : `说辞：${params.speech}`

    return [
        { role: 'system', content: STRUCTURED_PARSE_SYSTEM },
        {
            role: 'user',
            content: `请分析这句北周施计说辞，只输出 JSON。
回合：第${params.round}回合
事件：${params.eventName}
局势：${params.eventBriefing}
${targetTypeLine}
目标人物：${params.npc.name}（${params.npc.title}），公开人设：${params.npc.publicPersona}
公开立场：${params.npc.publicStance}
性格：${params.npc.personality}
软肋：${params.npc.softSpot}
逆鳞：${params.npc.triggerPoint}
本次计谋类型：${parseSchemeLabels[params.schemeType]}
${speechBlock}

评分口径：
- 从严判分。泛泛的战略词、空泛大道理或两头都能套的话，不得打高分。
- 只有同时切中人物、回合局势、具体执行链条，相关分值才可超过 0.7。
- 若只是“像那么回事”而缺乏人物针对性与落地路径，多数字段应落在 0.25-0.55。
- characterFit 看的是是否真正打中此人的软肋、逆鳞、立场与性格，不要因为话说得大就给高分。
- eventFit 看的是是否直接呼应本回合事件与简报，不要把泛化时局判断当成高 eventFit。
- structuralPenetration 必须触及真实权力结构、兵权粮权、诏令节制或派系卡位，才可判高。
- executability 只有在说辞里出现清晰的动作、次序、抓手、执行对象时才可判高；空泛表态不得高于 0.5。
- exposureRisk 只在说辞明显露锋芒、逼压过甚、易惹猜忌或近乎摊牌时提高，不要机械给中高分。
- 财政、粮草、军事、民生、治理五项相关度，默认从低分起判。
- 未直接触及该维度时，应接近 0；不要因为一句话显得有格局，就同时给多个维度高相关。
- evidence 只摘录最直接的 1-3 条判分依据，不要复述整段说辞。${schemeSpecificRubric}${polarityRubric}

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
  "omenAccusationClarity": 0-1,
  "centralSanctionLeverage": 0-1,
  "stateBenefit": -1 to 1,
  "targetBenefit": -1 to 1,
  "factionBenefit": -1 to 1,
  "advicePolarity": "pro_state|pro_target_anti_state|neutral_or_vague",
  "legitimacyDirection": -1 to 1,
  "omenPolarity": "legitimizing|destabilizing|vague_or_ceremonial",
  "selfTrapPotential": 0-1,
  "scapegoatClarity": 0-1,
  "omenAnchorStrength": 0-1,
  "legitimacyCrack": 0-1,
  "suspicionDirection": 0-1,
  "suspicionTransmission": 0-1,
  "fractureTransmission": 0-1,
  "proxyTransmission": 0-1,
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

const FENG_DAOZHI_DRAFT_SYSTEM = `${STRUCTURED_PARSE_SYSTEM}
你是《佞臣》中的冯道之，只能依据玩家当前已知信息，为萧宝颖代拟一手计谋文字。
要求：
- 只能使用输入中明确给出的时局、人物公开信息、已解锁暗线与近况，不得开天眼，不得补充玩家未知秘密
- 输入中的“谋士判断”“最佳切口”“红线”都是系统翻译后的模糊方向，不是精确数值；要把它们消化成谋士口吻，不要改写成游戏说明
- 行文用古典白话，短而能用，像谋士递密札，不要写解释
- 普通计谋只输出一段 primaryText
- 谶纬必须输出两段：primaryText 为“谶辞/征兆”，secondaryText 为“解释/指向”
- 不得输出列表、标题、括号说明或额外文字`

export function buildFengDaozhiDraftPrompt(params: {
    context: FengDaozhiDraftContext
    schemeType: SchemeType
    relatedNpcName?: string
}): ChatMessage[] {
    const { context, schemeType, relatedNpcName } = params
    const isOmen = schemeType === 'omen'
    const relatedNpcLine = relatedNpcName ? `关联人物：${relatedNpcName}` : '关联人物：无'
    const campaignSummaryLine = context.campaignSummary?.trim()
        ? `战局摘要：${context.campaignSummary}`
        : null
    const publicStatementLine = context.currentPublicStatement?.trim()
        ? `本回合公开表态：${context.currentPublicStatement}`
        : null
    const relationshipSummaryLine = context.relationshipSummary?.trim()
        ? `关系摘要：${context.relationshipSummary}`
        : `关系摘要：上回往来：${context.previousDealings} 近两回合关系温度：${context.relationshipTemperature}`
    const courtSituationSummaryLine = context.courtSituationSummary?.trim()
        ? `朝局摘要：${context.courtSituationSummary}`
        : `朝局摘要：近来得失：${context.recentCourtFortune} 派系压力：${context.factionPressure}`
    const longTermMemoryLine = context.longTermMemorySummary?.trim()
        ? `长期旧账：${context.longTermMemorySummary}`
        : null
    const relationMemoryLine = context.relationMemorySummary?.trim()
        ? `关系旧账：${context.relationMemorySummary}`
        : null
    const visibleSecrets = context.visibleSecrets.length > 0
        ? context.visibleSecrets.join('；')
        : '暂无已解锁暗线'
    const formatRules = isOmen
        ? `谶纬格式要求：
- primaryText 必须像一句征兆、谶辞或灾异异象，长度 8 到 30 字
- secondaryText 必须解释这句征兆意味着怎样的名分裂缝、法统不安或谁最该警惕
- secondaryText 不要直接写成定罪书，应更像借征兆点醒对方`
        : `普通计谋格式要求：
- primaryText 只写 1 到 2 句可直接拿去用的说辞
- 要顺着目标人物当前最在意的权柄、体面、退路或局势压力来写
- 若是稳计，应更像顺势点拨；若是高压计，应更像顺着裂缝推一把`

    return [
        { role: 'system', content: FENG_DAOZHI_DRAFT_SYSTEM },
        {
            role: 'user',
            content: `请代冯道之为萧宝颖拟一手“${SCHEME_NAMES[schemeType]}”。
回合：第${context.round}回合
时局：${context.eventName}
局势摘要：${context.eventBriefing}
${campaignSummaryLine ? `${campaignSummaryLine}\n` : ''}${publicStatementLine ? `${publicStatementLine}\n` : ''}目标人物：${context.targetNpcName}（${context.targetNpcTitle}）
目标公开人设：${context.targetPersona}
${relatedNpcLine}
已解锁暗线：${visibleSecrets}
谋士判断：${context.strategicFocus}
最佳切口：${context.bestAngle}
先别踩：${context.redLine}
这一手宜走「${context.advisoryMode}」：${context.advisoryModeGuidance}
${relationshipSummaryLine}
${relationMemoryLine ? `${relationMemoryLine}\n` : ''}
${courtSituationSummaryLine}
${longTermMemoryLine ? `${longTermMemoryLine}\n` : ''}萧宝颖当前危险：${context.playerDangerStage}

${formatRules}

只输出 JSON：
{
  "primaryText": "string",
  "secondaryText": "string，可省略"
}`,
        },
    ]
}
