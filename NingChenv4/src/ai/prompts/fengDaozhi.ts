import type { SchemeType } from '../../game/types'
import type { FengDaozhiDraftContext } from '../../game/fengDaozhiAdvisor'
import { buildAddressCanonBlock, buildWorldCanonBlock } from '../promptCanon'
import type { ChatMessage } from './shared'
import { SCHEME_NAMES, STRUCTURED_PARSE_SYSTEM } from './shared'

const FENG_DAOZHI_DRAFT_SYSTEM = `${STRUCTURED_PARSE_SYSTEM}
${buildWorldCanonBlock()}

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
    const addressCanonLine = buildAddressCanonBlock(['冯道之', '萧宝颖', context.targetNpcName, relatedNpcName])
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
    const courtDispositionHintLine = context.courtDispositionHint?.trim()
        ? `处置链旁批：${context.courtDispositionHint}`
        : null
    const longTermMemoryLine = context.longTermMemorySummary?.trim()
        ? `长期旧账：${context.longTermMemorySummary}`
        : null
    const relationMemoryLine = context.relationMemorySummary?.trim()
        ? `关系旧账：${context.relationMemorySummary}`
        : null
    const worldMemoryLine = context.worldMemorySummary?.trim()
        ? `可借旧事：${context.worldMemorySummary}`
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
            content: `${addressCanonLine}

请代冯道之为萧宝颖拟一手“${SCHEME_NAMES[schemeType]}”。
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
${worldMemoryLine ? `${worldMemoryLine}\n` : ''}
${courtSituationSummaryLine}
${courtDispositionHintLine ? `${courtDispositionHintLine}\n` : ''}
${longTermMemoryLine ? `${longTermMemoryLine}\n` : ''}萧宝颖当前危险：${context.playerDangerStage}
自身安危热度旁批：${context.playerSafetyPressureHint ?? '风声暂稳：暂未形成成体系追查。'}
南征压力旁批：${context.invasionPressureHint ?? '朝廷仍偏安内：南征议势尚未成形。'}

${formatRules}

只输出 JSON：
{
  "primaryText": "string",
  "secondaryText": "string，可省略"
}`,
        },
    ]
}
