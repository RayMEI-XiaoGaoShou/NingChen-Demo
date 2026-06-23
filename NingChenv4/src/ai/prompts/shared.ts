import type { SchemeType } from '../../game/types'

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

export type NpcFollowUpMode = 'none' | 'question_candidate' | 'statement_only'

export const SCHEME_NAMES: Record<SchemeType, string> = {
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

export const FACTION_LABELS: Record<string, string> = {
    emperor: '帝党',
    empress: '后党',
    longxi: '陇右系',
    prairie: '草原系',
}

export const STRUCTURED_PARSE_SYSTEM = '你是《佞臣》的结构化裁判。你只能输出严格 JSON，不得输出解释、代码块或多余文字。除字段说明特别标注为 -1 到 1 或小范围 delta 的字段外，所有数值字段必须落在 0 到 1 之间。'

