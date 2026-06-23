import type { NPC, NorthSchemeParseResult, SchemeFollowUpParseResult, SchemeType } from '../../game/types'
import { getTrustLabel } from '../../game/types'
import { deriveCourtFavorHit } from '../../game/courtDispositionEngine'
import { getNpcSelfReference, getNpcVoiceProfile } from '../../game/npcVoiceProfile'
import { describeNpcPressureOverlay, describeNpcSchemeReactionProfile, getNpcReactionRole } from '../npcSchemeReactionProfile'
import { describeNpcFollowUpFinalProfile } from '../npcFollowUpFinalProfile'
import { buildAddressCanonBlock, buildCompactCanonBlock, buildWorldCanonBlock } from '../promptCanon'
import type { ChatMessage, NpcFollowUpMode } from './shared'
import { FACTION_LABELS, SCHEME_NAMES } from './shared'

const NPC_SYSTEM = `${buildWorldCanonBlock()}

你是《佞臣》中的 NPC 角色扮演引擎。你要代入指定人物，对萧宝颖刚刚施加的计谋作出回应。
要求：
- 回答通常 3 到 6 句，必要时可短到 2 句、长到 7 句；古典白话风，尽量在 110 到 240 字之间，不要为了凑字数硬拉长
- 必须严格贴合该人物的官职、公开人设、公开立场、性格、软肋与逆鳞
- 要明显体现当前态度档位给出的语气要求
- 要严格服从人物声音档案：自称、句式长短、起手习惯、常落话题与高压时偏移，都不能乱
- 不同计谋类型的回应重心必须不同：试探要像多露半层口风，献策要像评策也评人，谗言/离间要像顺着旧疑旧怨往上推，嫁祸与谶纬都要写出人物的失态、自辩或压谣动作
- 可以结合“本回合局势”“上回往来”“近两回合关系温度”“近来得失”“派系压力”“长期旧账”与“人物内在利益与暗线”决定说话轻重，但不得跳出人设；暗线只能作为自身利益、恐惧与长期盘算的隐性驱动，不要写成对萧宝颖全盘自白
- 若输入包含“本次试探刚揭露暗线”，回应必须围绕这条暗线写一处口风、回避、反问、失态或防备；不要写成完整自白
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

function formatNpcPersonalInterestThreads(npc: NPC): string {
    const threads = npc.secretThreads.filter(Boolean)
    return threads.length > 0 ? threads.join('；') : '暂无'
}

function formatRevealedSecretThreadPromptBlock(thread: string | null | undefined, npcName: string): string | null {
    const trimmed = thread?.trim()
    if (!trimmed) return null

    return [
        `本次试探刚揭露暗线：${trimmed}`,
        `试探揭露写法：本次回应必须围绕这条新暗线露出一处口风、回避、反问、失态或防备；不要让${npcName}直白承认全部真相。`,
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
                ? '计谋反应重心：嫁祸成功时，戏眼是失言、失态、急于解释、急于切割；不是单纯生气，而是被逼进局里。'
                : '计谋反应重心：嫁祸失败时，不一定大怒；更像阴沉地看穿你在做局，把这笔账记下。'
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
    revealedSecretThread?: string | null
    previousDealings?: string
    relationshipTemperature?: string
    recentCourtFortune?: string
    factionPressure?: string
    longTermMemorySummary?: string
    relationMemorySummary?: string
    worldMemorySummary?: string
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
        revealedSecretThread,
        previousDealings,
        relationshipTemperature,
        recentCourtFortune,
        factionPressure,
        longTermMemorySummary,
        relationMemorySummary,
        worldMemorySummary,
        relatedNpc,
        northParse,
    } = params

    const tone = getTrustTone(npc.trust)
    const factionLabel = FACTION_LABELS[npc.factionId] ?? npc.factionId
    const roundLine = round ? `当前回合：第${round}回合` : '当前回合：未标明'
    const eventLine = eventName ? `本回合局势：${eventName}` : '本回合局势：未标明'
    const briefingLine = eventBriefing ? `局势摘要：${eventBriefing}` : '局势摘要：未提及'
    const personalSecretThreadsLine = `人物内在利益与暗线：${formatNpcPersonalInterestThreads(npc)}`
    const personalSecretThreadsBoundaryLine = '暗线使用边界：这些是角色自身利益、恐惧与长期盘算，可隐性影响判断、语气和留扣；不要把未被试探坐实的信息写成对萧宝颖的全盘自白。'
    const revealedSecretThreadBlock = formatRevealedSecretThreadPromptBlock(revealedSecretThread, npc.name)
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
    const worldMemoryLine = worldMemorySummary?.trim()
        ? `近来公议：${worldMemorySummary}`
        : null
    const relatedNpcLine = relatedNpc
        ? `牵连人物：${relatedNpc.name}（${relatedNpc.title}）`
        : null
    const voiceProfileLine = describeVoiceProfile(npc)
    const addressCanonLine = buildAddressCanonBlock([npc.name, relatedNpc?.name])
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
            content: `${addressCanonLine}

角色：${npc.name}（${npc.title}）
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
${personalSecretThreadsLine}
${personalSecretThreadsBoundaryLine}
${revealedSecretThreadBlock ? `${revealedSecretThreadBlock}\n` : ''}
${previousDealingsLine}
${relationshipTemperatureLine}
${recentCourtFortuneLine}
${factionPressureLine}
${longTermMemoryLine ? `${longTermMemoryLine}\n` : ''}
${relationMemoryLine ? `${relationMemoryLine}\n` : ''}
${worldMemoryLine ? `${worldMemoryLine}\n` : ''}
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
${buildCompactCanonBlock()}
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

const NPC_FOLLOW_UP_FINAL_SYSTEM = `${buildWorldCanonBlock()}

你是《佞臣》中的 NPC 回应引擎。你只能输出给玩家看的最终回应，不得输出 JSON、分数或系统判断。必须以陈述句收束，不要再问玩家新的问题。`

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
    revealedSecretThread?: string | null
    previousDealings?: string
    relationshipTemperature?: string
    recentCourtFortune?: string
    factionPressure?: string
    longTermMemorySummary?: string
    relationMemorySummary?: string
    worldMemorySummary?: string
    relatedNpc?: NPC | null
    northParse?: NorthSchemeParseResult
}): ChatMessage[] {
    const evidenceLine = params.parseEvidence.length > 0 ? params.parseEvidence.join('；') : '暂无'
    const tone = getTrustTone(params.npc.trust)
    const voiceProfileLine = describeVoiceProfile(params.npc)
    const addressCanonLine = buildAddressCanonBlock([params.npc.name, params.relatedNpc?.name])
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
    const revealedSecretThreadBlock = formatRevealedSecretThreadPromptBlock(params.revealedSecretThread, params.npc.name)
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
    const worldMemoryLine = params.worldMemorySummary?.trim()
        ? `近来公议：${params.worldMemorySummary}`
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
            content: `${addressCanonLine}

角色：${params.npc.name}（${params.npc.title}）
${roundLine ? `${roundLine}\n` : ''}${eventLine ? `${eventLine}\n` : ''}${briefingLine ? `${briefingLine}\n` : ''}${relatedNpcLine ? `${relatedNpcLine}\n` : ''}${knownSecretThreadsLine}
${revealedSecretThreadBlock ? `${revealedSecretThreadBlock}\n` : ''}
${previousDealingsLine}
${relationshipTemperatureLine}
${recentCourtFortuneLine}
${factionPressureLine}
${longTermMemoryLine ? `${longTermMemoryLine}\n` : ''}${relationMemoryLine ? `${relationMemoryLine}\n` : ''}${worldMemoryLine ? `${worldMemoryLine}\n` : ''}${originalStructureLine ? `${originalStructureLine}\n` : ''}人物态度：${tone.label}
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
- 若上文给出“本次试探刚揭露暗线”，最终回应必须继续扣住这条暗线的口风、遮掩或防备，不要漂回通用态度表态
- 这是 NPC 面向玩家的最终回应，不要再留新的回话钩子`,
        },
    ]
}

