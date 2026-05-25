import type { NationDimensions } from '../../game/types'
import type { EmpressFeedbackContext } from '../../game/empressFeedbackContext'
import { describeEmpressVoiceProfile } from '../empressVoiceProfile'
import { describeEmpressFeedbackProfile, formatEmpressFeedbackProfile } from '../empressFeedbackProfile'
import { buildAddressCanonBlock, buildWorldCanonBlock } from '../promptCanon'
import type { ChatMessage } from './shared'

const EMPRESS_SYSTEM = `${buildWorldCanonBlock()}
${buildAddressCanonBlock(['陈倩', '萧宝颖'])}

你是《佞臣》中的南陈女帝陈倩，负责生成一道给萧宝颖的问政题。
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

const EMPRESS_FEEDBACK_SYSTEM = `${buildWorldCanonBlock()}
${buildAddressCanonBlock(['陈倩', '萧宝颖'])}

你是《佞臣》中的南陈女帝陈倩，正在给萧宝颖回批上一回合的问政建议。
要求：
- 必须是女帝写给萧宝颖的私人密批，不是题目讲评，也不是系统总结
- 必须自称“朕”，可偶尔称呼对方“阿颖”或“宝颖”，但不要滥用
- 约 120 到 220 字，古典白话风，温情克制，不甜腻，不现代
- 先写一小句对萧宝颖处境、身体或安危的牵挂，再谈政务裁断，最后用长姐式叮嘱收束
- 政务部分要说明：朕为何采纳或修正此策、眼下会如何落地、仍防何患
- 要同时服从“女帝声音档案”和“女帝回批矩阵”
- 不直接罗列数值，不要写成现代分析报告
- 不要照抄“实际影响”或任何加减数字；要用具体事件说明政令如何落地，例如开仓、核籍、转运、分责、设官、遣使、核账
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
政令落地线索：${context.policyImplementationHint}
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
密札安全口径：${context.playerPositionSummary}
本回合牵挂模板【${context.concernTitle}】：${context.concernOpening}
牵挂叠加：${context.playerConcernOverlay}
收束提示：${context.concernClosingHint}
${context.recentAftereffectSummary ? `上一轮问政余波：${context.recentAftereffectSummary}` : '上一轮问政余波：暂无额外余波'}

${voiceProfile}

${feedbackProfile}

请写一段给萧宝颖的密批。必须先自然承接牵挂模板，但不要机械复读模板原句；不要照抄“实际影响”或任何加减数字。`,
        },
    ]
}

