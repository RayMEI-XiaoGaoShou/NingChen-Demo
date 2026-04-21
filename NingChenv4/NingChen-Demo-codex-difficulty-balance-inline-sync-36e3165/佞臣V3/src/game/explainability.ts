export type FavorPressureTrack = 'emperorFavor' | 'empressDowagerFavor'
export type FactionConditionTrack = 'courtInfluence' | 'militaryStrength' | 'internalStability'

export interface ExternalActionUnlockThresholds {
    trust: number
    loyalty: number
    secrets: number
}

export interface ExternalActionUnlockExplanation {
    unlocked: boolean
    blockers: string[]
    reason: string
    trustGap: number
    loyaltyGap: number
    secretsGap: number
    roundWindowOpen: boolean
}

const FAVOR_PRESSURE_LABELS: Record<FavorPressureTrack, readonly [string, string, string, string]> = {
    emperorFavor: ['圣眷尚浓', '圣眷渐薄', '圣眷将尽', '圣眷已绝'],
    empressDowagerFavor: ['尚得看重', '渐被疏远', '恩义转淡', '近乎失势'],
}

const FACTION_CONDITION_LABELS: Record<FactionConditionTrack, readonly [string, string, string, string]> = {
    courtInfluence: ['气脉尚稳', '根基已摇', '裂口已现', '将倾欲散'],
    militaryStrength: ['兵权尚整', '兵势微损', '军令不行', '兵权将散'],
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

export function explainExternalActionUnlock(input: {
    trust: number
    loyaltyToCourt: number
    unlockedSecrets: number
    roundWindowOpen: boolean
    thresholds: ExternalActionUnlockThresholds
}): ExternalActionUnlockExplanation {
    const trustGap = Math.max(0, input.thresholds.trust - input.trust)
    const loyaltyGap = Math.max(0, input.loyaltyToCourt - input.thresholds.loyalty)
    const secretsGap = Math.max(0, input.thresholds.secrets - input.unlockedSecrets)

    const blockers: string[] = []
    if (trustGap > 0) blockers.push(`信任尚差 ${trustGap} 点`)
    if (loyaltyGap > 0) blockers.push(`忠诚尚差 ${loyaltyGap} 点`)
    if (secretsGap > 0) blockers.push(`差 ${secretsGap} 条暗线`)
    if (!input.roundWindowOpen) blockers.push('窗口尚闭')

    return {
        unlocked: blockers.length === 0,
        blockers,
        reason: blockers.length === 0 ? '条件已齐' : blockers.join('，'),
        trustGap,
        loyaltyGap,
        secretsGap,
        roundWindowOpen: input.roundWindowOpen,
    }
}

function pickBandLabel(labels: readonly [string, string, string, string], value: number, thresholds: readonly [number, number, number]): string {
    if (value >= thresholds[0]) return labels[0]
    if (value >= thresholds[1]) return labels[1]
    if (value >= thresholds[2]) return labels[2]
    return labels[3]
}
