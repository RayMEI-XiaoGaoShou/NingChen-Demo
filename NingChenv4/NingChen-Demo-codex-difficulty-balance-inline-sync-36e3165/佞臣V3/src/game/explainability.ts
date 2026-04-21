export type FavorPressureTrack = 'emperorFavor' | 'empressDowagerFavor'
export type FactionConditionTrack = 'courtInfluence' | 'militaryPower' | 'internalStability'

export interface ExternalActionUnlockGaps {
    trustGap: number
    loyaltyGap: number
    secretsGap: number
    roundWindowOpen: boolean
}

export type ExternalActionUnlockConditionKind = 'trust' | 'loyalty' | 'secrets' | 'window'

export interface ExternalActionUnlockCondition {
    kind: ExternalActionUnlockConditionKind
    text: string
    summary: string
    gap?: number
}

export interface ExternalActionUnlockExplanation {
    unlocked: boolean
    state: 'ready' | 'locked'
    summary: string
    conditionText: string
    conditions: ExternalActionUnlockCondition[]
    gaps: ExternalActionUnlockGaps
}

const FAVOR_PRESSURE_LABELS: Record<FavorPressureTrack, readonly [string, string, string, string]> = {
    emperorFavor: ['圣眷尚浓', '圣眷渐薄', '圣眷将尽', '圣眷已绝'],
    empressDowagerFavor: ['尚得看重', '渐被疏远', '恩义转淡', '近乎失势'],
}

const FACTION_CONDITION_LABELS: Record<FactionConditionTrack, readonly [string, string, string, string]> = {
    courtInfluence: ['气脉尚稳', '根基已摇', '裂口已现', '将倾欲散'],
    militaryPower: ['兵权尚整', '兵势微损', '军令不行', '兵权将散'],
    internalStability: ['上下一心', '暗流渐起', '貌合神离', '大厦将倾'],
}

const EXTERNAL_MILITARY_POSTURE_LABELS: readonly [string, string, string, string] = [
    '兵势尚整',
    '兵势微损',
    '兵势受挫',
    '兵势已虚',
]

const CAMPAIGN_MOMENTUM_LABELS: readonly [string, string, string, string] = [
    '筹势未成',
    '局势微动',
    '已见成势',
    '得手在即',
]

const FAVOR_THRESHOLD_BANDS = [60, 36, 19] as const
const FACTION_THRESHOLD_BANDS = [70, 50, 25] as const

export function getFavorPressureLabel(track: FavorPressureTrack, favor: number): string {
    return pickBandLabel(FAVOR_PRESSURE_LABELS[track], favor, FAVOR_THRESHOLD_BANDS)
}

export function getFactionConditionLabel(track: FactionConditionTrack, value: number): string {
    return pickBandLabel(FACTION_CONDITION_LABELS[track], value, FACTION_THRESHOLD_BANDS)
}

export function getExternalMilitaryPostureLabel(value: number): string {
    return pickBandLabel(EXTERNAL_MILITARY_POSTURE_LABELS, value, FACTION_THRESHOLD_BANDS)
}

export function getCampaignMomentumLabel(value: number): string {
    if (value <= 0) return CAMPAIGN_MOMENTUM_LABELS[0]
    if (value < 0.33) return CAMPAIGN_MOMENTUM_LABELS[1]
    if (value < 0.75) return CAMPAIGN_MOMENTUM_LABELS[2]
    return CAMPAIGN_MOMENTUM_LABELS[3]
}

export function explainExternalActionUnlock(input: ExternalActionUnlockGaps): ExternalActionUnlockExplanation {
    const conditions = buildExternalActionConditions(input)
    const conditionText = conditions.map(condition => condition.summary).join('、')

    if (conditions.length === 0) {
        return {
            unlocked: true,
            state: 'ready',
            summary: '条件已齐：信任够了、忠心已冷、暗线已明。',
            conditionText: '',
            conditions,
            gaps: input,
        }
    }

    return {
        unlocked: false,
        state: 'locked',
        summary: `未解锁：人、心、底牌、时机——四样缺一不可。眼下还差 ${conditionText}，急不得。`,
        conditionText,
        conditions,
        gaps: input,
    }
}

function buildExternalActionConditions(input: ExternalActionUnlockGaps): ExternalActionUnlockCondition[] {
    const conditions: ExternalActionUnlockCondition[] = []

    if (input.trustGap > 0) {
        conditions.push({
            kind: 'trust',
            gap: input.trustGap,
            summary: `信任尚差 ${input.trustGap} 点`,
            text: `未解锁：信任尚差 ${input.trustGap} 点。他还没把你当自己人，这时候摊牌只会吓跑他。`,
        })
    }

    if (input.loyaltyGap > 0) {
        conditions.push({
            kind: 'loyalty',
            gap: input.loyaltyGap,
            summary: `此人对朝廷还没冷透，差 ${input.loyaltyGap} 点忠诚`,
            text: `未解锁：此人对朝廷还没冷透，差 ${input.loyaltyGap} 点忠诚。心没凉，手就不会动。`,
        })
    }

    if (input.secretsGap > 0) {
        conditions.push({
            kind: 'secrets',
            gap: input.secretsGap,
            summary: `暗线尚差 ${input.secretsGap} 条`,
            text: `未解锁：暗线尚差 ${input.secretsGap} 条。他最深的算盘你还没摸到，此时摊牌无异于赌。`,
        })
    }

    if (!input.roundWindowOpen) {
        conditions.push({
            kind: 'window',
            summary: '时局未到，窗口尚闭',
            text: '未解锁：时局未到，窗口尚闭。再等一个能逼他明牌的回合。',
        })
    }

    return conditions
}

function pickBandLabel(
    labels: readonly [string, string, string, string],
    value: number,
    thresholds: readonly [number, number, number],
): string {
    if (value >= thresholds[0]) return labels[0]
    if (value >= thresholds[1]) return labels[1]
    if (value >= thresholds[2]) return labels[2]
    return labels[3]
}
