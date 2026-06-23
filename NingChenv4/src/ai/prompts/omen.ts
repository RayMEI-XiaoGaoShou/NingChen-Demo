import type { NPC } from '../../game/types'
import { getAlignmentLabel, getExternalStatusLabel } from '../../game/types'
import { getNpcReactionRole } from '../npcSchemeReactionProfile'
import { buildAddressCanonBlock, buildWorldCanonBlock } from '../promptCanon'
import type { ChatMessage } from './shared'

const OMEN_ECHO_SYSTEM = `${buildWorldCanonBlock()}

你是《佞臣》中的“谶回声”写手。你要代入指定的朝中发声者，以第一人称写出一段对谶纬的回批。
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
            content: `${buildAddressCanonBlock([params.speakerNpc.name, params.targetNpc.name])}

发声者：以${params.speakerNpc.name}（${params.speakerNpc.title}）的口吻。
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

