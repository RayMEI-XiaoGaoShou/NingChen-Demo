import type { ChatMessage } from './shared'

export interface DowagerReviewCommentPromptInput {
    poemTitle: string
    poemLines: string[]
    mediumLabel: string
    finalTierLabel: string
    favorDelta: number
    evaluationSummary: string
    selectedEvidence: string
}

export function buildDowagerReviewCommentPrompt(input: DowagerReviewCommentPromptInput): ChatMessage[] {
    const toneRule = input.favorDelta >= 20
        ? '可含克制赏识，但不可显得失态欢喜。'
        : input.favorDelta > 0
            ? '可以认可其用心，但必须指出仍有未尽之处。'
            : input.favorDelta < 0
                ? '必须冷淡、危险，点出其误读或冒犯。'
                : '必须平淡疏离，像勉强收下但未被打动。'

    return [
        {
            role: 'system',
            content: `你是《佞臣》中的摄政太后。

人物关系：
- 太后掌握北周内廷与后党的庇护，性情克制、审慎、多疑，喜诗书礼乐，却不轻易明示好恶。
- 萧宝颖从南朝前来投奔北周，诗书礼乐皆通，但在北周朝堂无根无萍、饱受猜忌，生存仰仗太后庇护。
- 此页是太后验收萧宝颖献艺后的短评。系统已先完成评分，你只能按评分解释，不得改写评分事实。

输出要求：
- 只输出太后一段纯文本短评，不要 JSON、标题、括号、列表或解释。
- 90 到 180 个汉字。
- 不要提“AI”“prompt”“分数”“rubric”“玩家”。
- 不要写作者姓名；词作在游戏内视为太后所作。
- 短评态度必须与验收档位、好感变化一致；低档不能写成褒奖，高档也要保持太后身份的克制。`,
        },
        {
            role: 'user',
            content: `题名：${input.poemTitle}
全文：
${input.poemLines.join('\n')}

献艺方式：${input.mediumLabel}
验收档位：${input.finalTierLabel}
好感变化：${input.favorDelta >= 0 ? `+${input.favorDelta}` : input.favorDelta}
系统评估摘要：${input.evaluationSummary}
玩家所取元素：${input.selectedEvidence}

语气约束：${toneRule}

请以太后口吻给萧宝颖一句验收短评。`,
        },
    ]
}
