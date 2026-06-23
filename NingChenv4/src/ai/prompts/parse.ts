import type { NPC, OmenSpeechInput, PolicyResolutionMeta, SchemeType } from '../../game/types'
import { getAlignmentLabel, getExternalStatusLabel } from '../../game/types'
import { buildCompactCanonBlock } from '../promptCanon'
import type { ChatMessage } from './shared'
import { STRUCTURED_PARSE_SYSTEM } from './shared'

export function buildNorthSchemeParsePrompt(params: {
    round: number
    npc: NPC
    relatedNpc?: NPC | null
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
        frame: '嫁祸',
        proxy: '借刀',
        appeal: '求援',
        omen: '谶纬',
        secession: '煽动割据',
        rebellion: '煽动造反',
    }
    const targetTypeLine = params.npc.powerBase === 'external'
        ? `目标类型：外部军头
公开数值：军力 ${params.npc.militaryPower}、忠诚度 ${params.npc.loyaltyToCourt}、信任度 ${params.npc.trust}、阵营偏向 ${getAlignmentLabel(params.npc.alignmentBias)}、外部状态 ${getExternalStatusLabel(params.npc.externalStatus)}`
        : `目标类型：朝廷人物
公开数值：信任度 ${params.npc.trust}、阵营偏向 ${getAlignmentLabel(params.npc.alignmentBias)}`
    const relatedNpcTypeLine = params.relatedNpc
        ? params.relatedNpc.powerBase === 'external'
            ? `牵连人物：${params.relatedNpc.name}（${params.relatedNpc.title}）
牵连人物类型：外部军头
牵连人物公开数值：军力 ${params.relatedNpc.militaryPower}、忠诚度 ${params.relatedNpc.loyaltyToCourt}、信任度 ${params.relatedNpc.trust}、阵营偏向 ${getAlignmentLabel(params.relatedNpc.alignmentBias)}、外部状态 ${getExternalStatusLabel(params.relatedNpc.externalStatus)}
牵连人物公开立场：${params.relatedNpc.publicStance}`
            : `牵连人物：${params.relatedNpc.name}（${params.relatedNpc.title}）
牵连人物类型：朝廷人物
牵连人物公开数值：信任度 ${params.relatedNpc.trust}、阵营偏向 ${getAlignmentLabel(params.relatedNpc.alignmentBias)}
牵连人物公开立场：${params.relatedNpc.publicStance}`
        : ''
    const relatedNpcIntrigueRubric = params.relatedNpc && (
        params.schemeType === 'slander' ||
        params.schemeType === 'alienate' ||
        params.schemeType === 'frame'
    )
        ? '\n- 谗言/离间/嫁祸时，说话对象是入口，牵连人物才是被攻击或被牵连对象；判分时要区分“谁在听”和“谁受损”。' +
          '\n- 若说话对象与牵连人物派系不同，判断数值传导时优先看说辞是否伤到牵连人物的恩宠、忠诚、军力、调度或所在派系；不要默认伤说话对象本派系。'
        : ''

    const schemeSpecificRubric =
        params.schemeType === 'slander' || params.schemeType === 'alienate' || params.schemeType === 'frame'
            ? '\n- 若是谗言、离间、嫁祸之类高压计，必须看到明确的人事链条、权力链条或利益链条，才可给高分。' +
              '\n- 单靠危机感、甩锅感、泛化猜疑，不得判成高 characterFit 或高 structuralPenetration。' +
              '\n- 若是嫁祸，要额外看它是否真能诱使目标自己失言、失态或误判，以及嫌疑是否会落回目标本人。' +
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
        '\n- selfTrapPotential 只在嫁祸里重点判断：此话是否真能诱使目标自己失言、失态或误判，范围 0 到 1。' +
        '\n- scapegoatClarity 只在嫁祸里重点判断：嫌疑与责任是否会明确回落到目标本人，范围 0 到 1。' +
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
说话对象：${params.npc.name}（${params.npc.title}），公开人设：${params.npc.publicPersona}
目标人物：${params.npc.name}（${params.npc.title}），公开人设：${params.npc.publicPersona}
${relatedNpcTypeLine ? `${relatedNpcTypeLine}\n` : ''}${buildCompactCanonBlock()}
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
- evidence 只摘录最直接的 1-3 条判分依据，不要复述整段说辞。${relatedNpcIntrigueRubric}${schemeSpecificRubric}${polarityRubric}

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
${buildCompactCanonBlock()}
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

