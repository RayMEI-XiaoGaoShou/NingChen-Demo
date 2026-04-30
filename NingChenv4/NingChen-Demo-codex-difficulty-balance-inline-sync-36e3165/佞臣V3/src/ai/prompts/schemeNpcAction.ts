import { getAlignmentLabel, getExternalStatusLabel, getTrustLabel } from '../../game/types'
import type { Faction, NPC, SchemeAction } from '../../game/types'
import type { SchemePostResolutionEvent } from '../../game/schemeCausalEvent'
import type { SchemeNarrativeObligation } from '../../game/schemeNarrativeObligations'
import { resolvePostResolutionOutcomeCode } from '../../game/schemePostResolutionOutcome'
import { buildAddressCanonBlock, buildWorldCanonBlock } from '../promptCanon'
import type { ChatMessage } from './shared'
import { SCHEME_NAMES } from './shared'

const SCHEME_NPC_ACTION_SYSTEM = `${buildWorldCanonBlock()}

你是《佞臣》的 AI GameMaster 叙事编修。你的任务是把已经结算完毕的数值后果，反推成“本回合 NPC 具体做了什么”。
硬规则：
- 只能解释输入中已经给出的成功结果与数值后果，不得新增数值，不得改变成功/失败。
- 只写 NPC 的当回合实际举措，不写泛泛态度，不写“拨动算盘”“略作沉吟”等空话。
- 不得复述本地兜底句式；不要写“这番献策”“顺着你的话头”“拨动算盘”“能压人的位置”等模板腔。
- 不得让 NPC 知道萧宝颖是南陈暗线；她公开身份只是北周邺都朝廷的翰林编修。
- 不得新增具名人物、虚构日期、虚构官职或爵位；如需牵动对象，只能使用输入中出现的人名。
- 输出 1 到 2 句，50 到 160 字，古典白话，具体但不要夸张。
- 只输出严格 JSON：{"text":"..."}。`

export function buildSchemeNpcActionContext(params: {
    npc: NPC
    relatedNpc?: NPC | null
    factions?: Faction[]
    knownSecretThreads?: string[]
    previousDealings?: string
    relationshipTemperature?: string
    recentCourtFortune?: string
    factionPressure?: string
    longTermMemorySummary?: string
    relationMemorySummary?: string
    worldMemorySummary?: string
    relatedImpactSummary?: string | null
}): string {
    const lines: string[] = []
    const faction = params.npc.powerBase === 'court'
        ? params.factions?.find(item => item.id === params.npc.factionId)
        : null

    if (params.npc.powerBase === 'court') {
        lines.push(
            `当前关键数值：信任度 ${params.npc.trust}（${getTrustLabel(params.npc.trust)}）；皇帝恩宠 ${formatKnownNumber(params.npc.emperorFavor)}；太后眷顾 ${formatKnownNumber(params.npc.empressDowagerFavor)}；阵营偏向 ${getAlignmentLabel(params.npc.alignmentBias)}`,
        )
    } else {
        lines.push(
            `当前关键数值：信任度 ${params.npc.trust}（${getTrustLabel(params.npc.trust)}）；忠诚度 ${params.npc.loyaltyToCourt}；军力 ${params.npc.militaryPower}；外部状态 ${getExternalStatusLabel(params.npc.externalStatus)}；阵营偏向 ${getAlignmentLabel(params.npc.alignmentBias)}`,
        )
    }

    if (faction) {
        lines.push(
            `所属派系：${faction.name}；军事力量 ${faction.militaryPower}；朝堂影响 ${faction.courtInfluence}；内部稳定 ${faction.internalStability}`,
        )
    }

    if (params.relatedNpc) {
        lines.push(`牵连人物公开身份：${params.relatedNpc.name}，${params.relatedNpc.title}；公开立场：${params.relatedNpc.publicStance}`)
    }

    const knownSecrets = params.knownSecretThreads?.filter(Boolean) ?? []
    lines.push(`已解锁暗线：${knownSecrets.length > 0 ? knownSecrets.join('；') : '暂无'}`)
    if (params.previousDealings) lines.push(`上回往来：${params.previousDealings}`)
    if (params.relationshipTemperature) lines.push(`近两回合关系温度：${params.relationshipTemperature}`)
    if (params.recentCourtFortune) lines.push(`近来得失：${params.recentCourtFortune}`)
    if (params.factionPressure) lines.push(`派系压力：${params.factionPressure}`)
    if (params.longTermMemorySummary) lines.push(`长期旧账：${params.longTermMemorySummary}`)
    if (params.relationMemorySummary) lines.push(`关系旧账：${params.relationMemorySummary}`)
    if (params.worldMemorySummary) lines.push(`近来公议：${params.worldMemorySummary}`)
    if (params.relatedImpactSummary) lines.push(`牵连受损摘要：${params.relatedImpactSummary}`)

    return lines.join('\n')
}

export function buildSchemeNpcActionPrompt(params: {
    npc: NPC
    relatedNpc?: NPC | null
    action: Pick<SchemeAction, 'schemeType' | 'playerSpeech'>
    effectSummary: string
    fallbackText: string
    context?: string
    round?: number
    eventName?: string
    eventBriefing?: string
    narrativeObligations?: Array<Pick<SchemeNarrativeObligation, 'dimension' | 'direction' | 'subjectLabel' | 'reasonCode'>>
    npcActionKind?: 'move' | 'counter' | 'attitude' | 'intel'
    postResolutionEvent?: SchemePostResolutionEvent | null
}): ChatMessage[] {
    const relatedLine = params.relatedNpc
        ? `牵连人物：${params.relatedNpc.name}，${params.relatedNpc.title}`
        : '牵连人物：无'
    const roundLine = params.round ? `当前回合：第${params.round}回合` : '当前回合：未标明'
    const eventLine = params.eventName ? `本回合局势：${params.eventName}` : '本回合局势：未标明'
    const briefingLine = params.eventBriefing ? `局势摘要：${params.eventBriefing}` : '局势摘要：未提供'
    const contextLine = params.context?.trim() || '未提供额外上下文'
    const obligationLine = params.narrativeObligations?.length
        ? params.narrativeObligations
            .map(item => `- ${item.subjectLabel}：${item.direction === 'damage' ? '必须写出为何受损/阻滞/折损' : '必须写出为何改善/归拢/疏通'}`)
            .join('\n')
        : '- 无额外因果义务'
    const specialGuidance = params.action.schemeType === 'frame' || params.action.schemeType === 'omen'
        ? '设局嫁祸/谶纬特殊要求：不要写成“通过 A 打 B”。必须写目标自己的不合适举措，以及北周朝堂/御前/帘前/御史/军府如何反馈。'
        : ''
    const kindGuidance = getNpcActionKindGuidance(params.npcActionKind)
    const postResolutionBlock = formatPostResolutionPromptBlock(params.postResolutionEvent)

    return [
        { role: 'system', content: SCHEME_NPC_ACTION_SYSTEM },
        {
            role: 'user',
            content: `${buildAddressCanonBlock([params.npc.name, params.relatedNpc?.name])}

${roundLine}
${eventLine}
${briefingLine}
NPC：${params.npc.name}，${params.npc.title}
公开人设：${params.npc.publicPersona}
公开政治立场：${params.npc.publicStance}
性格与行事风格：${params.npc.personality}
${relatedLine}
计谋类型：${SCHEME_NAMES[params.action.schemeType]}
玩家说辞：${params.action.playerSpeech || '未附加说辞'}
已定数值后果：${params.effectSummary}
本地兜底举措：${params.fallbackText}
本地兜底举措只供理解因果方向，不得复述本地兜底句式；请改写成具体政务、军府、文书、粮饷、监军或人事动作。
${postResolutionBlock}
不要写“这番献策”“顺着你的话头”“拨动算盘”“能压人的位置”等模板腔。
举措范式参考：
- 朝堂人物：某人扣住某类文书/账册/奏牍，转交御前、帘前、尚书省或军府复核，使权责重排。
- 外部军头：某人重调粮道、兵械、关隘、斥候或军府号令，使忠诚、军力或地方秩序出现后果。
必须解释的数值因果：
${obligationLine}
叙事类型要求：${kindGuidance}
写作硬规则：必须包含“动作 + 影响介质 + 变化机制”。如果数值下降，写清受阻、亏空、迟滞、折损等损伤机制；如果数值上升，写清疏通、续上、补足、军令更顺等改善机制。不得把正向数值写成损伤，也不得把负向数值写成整顿见效。
${specialGuidance}
举措上下文：
${contextLine}

请在不改写数值后果的前提下，生成更贴合该 NPC 身份、性格、局势和数值后果的具体举措。
只输出 JSON：{"text":"..."}。`,
        },
    ]
}

export function formatPostResolutionPromptBlock(event: SchemePostResolutionEvent | null | undefined): string {
    const outcomeCode = resolvePostResolutionOutcomeCode(event)
    if (!event || !outcomeCode) return ''

    const mustKeep = event.actionMechanism.length > 0
        ? event.actionMechanism.join('、')
        : getDefaultPostResolutionMustKeep(outcomeCode)
    const mustExplain = event.damageMechanism.length > 0
        ? event.damageMechanism.join('、')
        : '按已定摘要解释后果'

    return `后置结局硬事实：
- 类型：${event.kind === 'borrowed_blade' ? '借刀收网' : '外部军头行动'}
- 细分结局：${outcomeCode}
- 已定摘要：${event.summary}
- 必须保留：${mustKeep}
- 必须解释：${mustExplain}
- 禁止反写：${getPostResolutionForbiddenGuidance(outcomeCode)}
硬规则：这部分是已经结算的事实，AI 不得弱化、反转或省略后置结局。`
}

function getDefaultPostResolutionMustKeep(outcomeCode: string): string {
    if (outcomeCode === 'borrowed_blade_executed') return '处决、收网'
    if (outcomeCode === 'borrowed_blade_dismissed') return '罢黜、收权'
    if (outcomeCode === 'borrowed_blade_blocked_by_protection') return '施压、尚未收网'
    if (outcomeCode === 'secession_established') return '名义仍奉北周、实则割据'
    if (outcomeCode === 'secession_hesitation') return '未敢明牌、暂观朝局'
    if (outcomeCode === 'rebellion_established') return '起兵、击退平叛或明旗反周'
    if (outcomeCode === 'rebellion_crushed') return '起兵被剿、未坐大但折损兵粮'
    return '收网未成'
}

function getPostResolutionForbiddenGuidance(outcomeCode: string): string {
    switch (outcomeCode) {
        case 'borrowed_blade_executed':
            return '不得写成只是施压、暂未处置或尚未收网'
        case 'borrowed_blade_dismissed':
            return '不得写成处决、伏诛或赐死'
        case 'borrowed_blade_blocked_by_protection':
            return '不得写成正式罢黜、处决、伏诛、府署被收或案牍断档'
        case 'secession_established':
            return '不得写成公开称帝、明旗反周或已经起兵造反'
        case 'secession_hesitation':
            return '不得写成坐实割据、公开起兵或明旗反周'
        case 'rebellion_established':
            return '不得写成旋即被剿或未坐大'
        case 'rebellion_crushed':
            return '不得写成击退平叛、割据一方或坐大成势'
        default:
            return '不得写成正式罢黜或处决'
    }
}

function getNpcActionKindGuidance(kind: 'move' | 'counter' | 'attitude' | 'intel' | undefined): string {
    switch (kind) {
        case 'counter':
            return '这是计谋失败后的反制，只写目标如何识破、冷处理、收口、反查或提高戒心；不得写成计谋已经落地。'
        case 'attitude':
            return '这是私下态度变化，只写目标为何更信或更疑萧宝颖的公开身份；不得伪写成朝政动作。'
        case 'intel':
            return '这是暗线/口风推进，只写目标露出哪类口风或让玩家摸到哪条线索；不得泄露萧宝颖南陈身份。'
        default:
            return '这是已定数值后果的具体落地动作，必须解释主要数值变化。'
    }
}

function formatKnownNumber(value: number | undefined): string {
    return typeof value === 'number' && Number.isFinite(value) ? String(value) : '未记录'
}
