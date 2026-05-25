import type { NPC } from './types'

export const NORTH_STRUCTURAL_WORDS = ['中枢', '兵权', '饷权', '仓储', '粮道', '门阀', '河北', '寿春', '边镇', '诏令', '流民', '节度', '平叛', '法统', '名分', '军令', '州郡', '接管'] as const
export const NORTH_EXECUTION_WORDS = ['先', '再', '随后', '收回', '清丈', '并收', '稳住', '转运', '分州郡', '压住', '堵住', '调度', '接管', '断粮', '编户', '屯田', '安置'] as const
export const NORTH_EXPOSURE_WORDS = ['夺权', '逼宫', '起兵', '翻掉', '杀', '今夜', '一举', '反旗', '举兵'] as const
export const NORTH_FINANCE_WORDS = ['财政', '国库', '赋税', '钱粮', '商道', '饷银', '军费', '开源', '节流', '库藏', '财用'] as const
export const NORTH_GRAIN_WORDS = ['粮道', '军粮', '口粮', '转运', '漕运', '仓储', '屯田', '后勤', '补给', '仓廪', '粮秣'] as const
export const NORTH_MILITARY_WORDS = ['兵权', '前线', '战线', '调兵', '帅印', '节度', '都督', '平叛', '守军', '军令', '边镇', '诸军', '将令'] as const
export const NORTH_SOCIAL_ORDER_WORDS = ['流民', '民变', '人心', '骚乱', '州郡', '百姓', '安民', '哗变', '恐慌', '离散'] as const
export const NORTH_GOVERNANCE_WORDS = ['中枢', '诏令', '门阀', '权柄', '体制', '调度', '执行', '都督', '节度', '官吏', '法令', '秩序', '接管', '州郡', '法统', '名分'] as const

const OBVIOUS_EXPOSURE_PATTERN = /南陈|女帝|北伐|暗桩|身份|反周|举兵|杀|刺|投陈|内应|密信|卧底/
const WAR_INTENT_PATTERN = /南征|南下|渡江|攻陈|伐陈|挥师/
const WAR_LOGISTICS_PATTERN = /粮道|军粮|兵甲|战马|军令|调度|器械|备战|兵/

const THIN_INTRIGUE_CONCRETE_SIGNALS = ['粮', '兵', '军', '诏', '调度', '州', '仓', '饷', '太后', '皇帝', '宗室', '地方', '中枢', '南征'] as const

export function normalizeSchemeSpeech(text: string): string {
    return text.replace(/\s+/g, '')
}

export function isProWarNpc(npc: Pick<NPC, 'alignmentBias' | 'factionId' | 'publicStance'>): boolean {
    return npc.alignmentBias === 'emperor'
        || npc.factionId === 'emperor'
        || /南征派|主战|趁势南征|尽快南征/.test(npc.publicStance)
}

export function hasObviousWarPreparationAdvice(
    text: string,
    target: Pick<NPC, 'alignmentBias' | 'factionId' | 'publicStance'>,
): boolean {
    if (!isProWarNpc(target)) return false
    const normalized = normalizeSchemeSpeech(text)
    return WAR_INTENT_PATTERN.test(normalized) && WAR_LOGISTICS_PATTERN.test(normalized)
}

export function isThinIntrigueSpeech(text: string): boolean {
    const normalized = normalizeSchemeSpeech(text)
    if (normalized.length < 28) return true
    const signalHits = THIN_INTRIGUE_CONCRETE_SIGNALS.filter(signal => normalized.includes(signal)).length
    return normalized.length < 42 && signalHits <= 1
}

export function hasObviousExposureSignal(text: string): boolean {
    return OBVIOUS_EXPOSURE_PATTERN.test(text)
}
