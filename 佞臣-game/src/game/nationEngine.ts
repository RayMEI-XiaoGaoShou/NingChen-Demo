// ========================================
// 国力计算引擎
// 数据来源：综合国力系统.md + 数值初值与阈值表.md §1-3
// ========================================

import type {
    CourtFactionId,
    FactionCollapseReport,
    NationDimensions,
    NPC,
    PolicyAftereffect,
    PolicyReasonParseResult,
    PolicyResolutionMeta,
} from './types'
import { NORTH_GROWTH, SOUTH_GROWTH, applyGrowthCap } from '../data/nationStats'
import { getRoundRuleContext } from '../data/roundRuleConfig'
import { fallbackPolicyParseFromReason } from './aiNativeEngine'

/**
 * 应用自然增长（每回合结束时调用）
 * 规则：
 * - 南陈/北周各自按基线增长
 * - 已达 75 以上的维度增速减半
 */
export function applyNaturalGrowth(
    current: NationDimensions,
    isNorth: boolean,
): NationDimensions {
    const baseGrowth = isNorth ? NORTH_GROWTH : SOUTH_GROWTH
    const adjustedGrowth = applyGrowthCap(current, baseGrowth)

    return {
        finance: clampDimension(current.finance + adjustedGrowth.finance),
        grain: clampDimension(current.grain + adjustedGrowth.grain),
        military: clampDimension(current.military + adjustedGrowth.military),
        socialOrder: clampDimension(current.socialOrder + adjustedGrowth.socialOrder),
        governance: clampDimension(current.governance + adjustedGrowth.governance),
    }
}

/**
 * 应用维度变化（来自计谋/事件/问政）
 */
export function applyDimensionChanges(
    current: NationDimensions,
    changes: Partial<NationDimensions>,
): NationDimensions {
    return {
        finance: clampDimension(current.finance + (changes.finance ?? 0)),
        grain: clampDimension(current.grain + (changes.grain ?? 0)),
        military: clampDimension(current.military + (changes.military ?? 0)),
        socialOrder: clampDimension(current.socialOrder + (changes.socialOrder ?? 0)),
        governance: clampDimension(current.governance + (changes.governance ?? 0)),
    }
}

/**
 * 问政对南陈国力的影响
 * 规则：选项影响占 80%，理由修正 ±20%
 * 参考：天道判官结算规则.md §4
 */
export function calculatePolicyEffect(
    optionEffects: Partial<NationDimensions>,
    reasonText: string,
    meta: PolicyResolutionMeta = {},
): Partial<NationDimensions> {
    const parse = meta.policyParse ?? fallbackPolicyParseFromReason(reasonText, meta)
    const reasonModifier = calculateReasonModifier(parse)

    const result: Partial<NationDimensions> = {}
    for (const [key, value] of Object.entries(optionEffects)) {
        if (value !== undefined) {
            result[key as keyof NationDimensions] = Math.round(value * reasonModifier * 10) / 10
        }
    }
    return result
}

function calculateReasonModifier(parse: PolicyReasonParseResult): number {
    return Math.max(
        0.65,
        Math.min(
            1.8,
            0.7
            + parse.focusAlignment * 0.4
            + parse.executionClarity * 0.35
            + parse.legitimacyAlignment * 0.18,
        ),
    )
}

export function buildPolicyAftereffect(params: {
    round: number
    topic: string
    nextRoundFeedback?: string
    legitimacyEffect?: 'up' | 'down' | 'steady'
    immediateEffects: Partial<NationDimensions>
    reasonText: string
    aiScoringFocus?: string
    policyParse?: PolicyReasonParseResult
}): PolicyAftereffect {
    const legitimacyTone = params.legitimacyEffect ?? 'steady'
    const parse = params.policyParse ?? fallbackPolicyParseFromReason(params.reasonText, {
        legitimacyEffect: legitimacyTone,
        aiScoringFocus: params.aiScoringFocus,
    })
    const focusMatched = parse.focusAlignment >= 0.48
    const effects = buildAftereffectDimensions(params.immediateEffects, legitimacyTone, parse)
    const summaryBase = params.nextRoundFeedback?.trim() || `${params.topic}的后续影响已经开始显现。`
    const legitimacyClause =
        legitimacyTone === 'up'
            ? '朝廷名分与施政说服力略有抬升'
            : legitimacyTone === 'down'
                ? '施政阻力与名分争议开始浮现'
                : '其效验正在地方执行中逐步显形'
    const focusClause = focusMatched ? '你先前的论证切中了此题真正关节。' : '先前论证未尽贴题，后效偏于平平。'
    const pathClause =
        parse.executionClarity >= 0.65
            ? '地方官知道该先做什么。'
            : parse.costAwareness >= 0.55
                ? '朝廷虽得其利，仍须分神压住各处掣肘。'
                : '政令下去之后，尚有不少空隙待补。'

    return {
        sourceRound: params.round,
        topic: params.topic,
        summary: `${summaryBase} ${legitimacyClause} ${focusClause} ${pathClause}`.trim(),
        effects,
        legitimacyTone,
        focusMatched,
    }
}

function buildAftereffectDimensions(
    immediateEffects: Partial<NationDimensions>,
    legitimacyTone: 'up' | 'down' | 'steady',
    parse: PolicyReasonParseResult,
): Partial<NationDimensions> {
    const followUpFactor = Math.max(
        0.18,
        Math.min(
            0.52,
            0.14
            + parse.costAwareness * 0.16
            + parse.legitimacyAlignment * 0.12
            + parse.focusAlignment * 0.1,
        ),
    )
    const effects: Partial<NationDimensions> = {}

    for (const [key, value] of Object.entries(immediateEffects) as Array<[keyof NationDimensions, number | undefined]>) {
        if (!value || value <= 0) continue
        effects[key] = roundOneDecimal(Math.max(0.4, value * followUpFactor))
    }

    if (legitimacyTone === 'up') {
        effects.governance = roundOneDecimal((effects.governance ?? 0) + 0.6)
        effects.socialOrder = roundOneDecimal((effects.socialOrder ?? 0) + 0.6)
    } else if (legitimacyTone === 'down') {
        effects.socialOrder = roundOneDecimal((effects.socialOrder ?? 0) - 0.8)
        effects.governance = roundOneDecimal((effects.governance ?? 0) - 0.4)
    }

    return effects
}

function roundOneDecimal(value: number): number {
    return Math.round(value * 10) / 10
}

/**
 * 宏观事件对北周五维的影响
 * 参考：天道判官结算规则.md §3.1
 */
export function getEventImpact(round: number): Partial<NationDimensions> {
    // 每回合事件影响（基于 20 回合事件表的影响方向）
    const eventImpacts: Record<number, Partial<NationDimensions>> = {
        1: {}, // 第1回合：初始状态，无额外影响
        2: { grain: -1.0, socialOrder: -1.2, military: -0.4 }, // 淮南摩擦 + 流民南渡
        3: { grain: -2.4, finance: -1.2, socialOrder: -0.8 }, // 春旱欠收
        4: { military: -0.8, governance: -1.2, socialOrder: -0.5 }, // 突厥试边
        5: { finance: -1.1, military: -0.8, governance: -1.3 }, // 河西商道受阻
        6: { governance: -1.8, socialOrder: -1.6, military: -1.0 }, // 益州叛变
        7: { finance: -1.2, governance: -1.5, military: -0.8 }, // 西征议
        8: { finance: -1.8, grain: -2.0, socialOrder: -0.9 }, // 秋涝与清仓
        9: { governance: -1.0, military: -0.6 }, // 帝党再提南征
        10: { military: -1.2, grain: -0.8, governance: -1.0 }, // 南陈征蜀
        11: { military: -0.8, governance: -1.3, socialOrder: -0.8 }, // 战后兵权争论
        12: { finance: -1.6, military: -1.0, governance: -1.0 }, // 突厥再犯与岁赐互市
        13: { socialOrder: -2.2, governance: -1.8 }, // 疫疠 + 谶言
        14: { governance: -1.8, socialOrder: -1.2 }, // 归政暗斗
        15: { governance: -1.8, grain: -1.4, socialOrder: -1.3 }, // 豪强兼并与流民
        16: { military: -1.6, finance: -1.0, grain: -0.8 }, // 征淮南战役
        17: { finance: -1.8, grain: -1.4, socialOrder: -1.7 }, // 久战疲态
        18: { military: -1.2, governance: -1.2, socialOrder: -1.0 }, // 草原抬价
        19: { governance: -1.6, finance: -1.4, socialOrder: -1.5 }, // 大清查大整肃
        20: {}, // 最终回合：交由总结算
    }
    return eventImpacts[round] ?? {}
}

/**
 * 检查死亡条件
 * 参考：数值初值与阈值表.md §6.2
 * 条件：NPC 朝堂影响力 ≥ 60 + 信任 ≤ 10 + 有处置能力
 */
export function checkDeathCondition(
    npcs: Pick<NPC, 'name' | 'trust' | 'canExecute' | 'factionId' | 'powerBase' | 'militaryPower' | 'loyaltyToCourt'>[],
    factions: Array<{ id: string; courtInfluence: number }>,
): { triggered: boolean; killerName: string | null } {
    let strongestCourtKiller: { name: string; influence: number } | null = null

    for (const npc of npcs) {
        if (!npc.canExecute) continue
        if (npc.trust > 10) continue
        if (npc.powerBase !== 'court') {
            continue
        }

        const faction = factions.find(f => f.id === npc.factionId)
        if (!faction || faction.courtInfluence < 60) continue

        if (!strongestCourtKiller || faction.courtInfluence > strongestCourtKiller.influence) {
            strongestCourtKiller = { name: npc.name, influence: faction.courtInfluence }
        }
    }

    return strongestCourtKiller
        ? { triggered: true, killerName: strongestCourtKiller.name }
        : { triggered: false, killerName: null }
}

/**
 * 检查提前南伐条件
 * 参考：数值初值与阈值表.md §6.3
 * A. 政治意愿：南征派影响力 ≥ 安内派 × 1.3
 * B. 可战能力：军≥65, 财≥55, 粮≥55, 社≥45，四项中≥3项达标
 */
export function checkEarlyInvasion(
    northStats: NationDimensions,
    factions: Array<{ id: string; courtInfluence: number }>,
    npcs: Pick<NPC, 'powerBase' | 'isAlive' | 'alignmentBias' | 'loyaltyToCourt' | 'militaryPower' | 'externalStatus'>[],
    hasDisaster: boolean, // 当回合有边患/灾荒/叛乱
    round: number,
): {
    triggered: boolean
    politicalWillRatio: number
    warCapabilityMet: number
    windowLabel: string
    pressureSummary: string
} {
    // A. 政治意愿门槛
    // 南征派 = 帝党，安内派 = 后党
    const emperorFaction = factions.find(f => f.id === 'emperor')
    const empressFaction = factions.find(f => f.id === 'empress')

    const { emperorBonus, empressBonus } = calculateExternalSupport(npcs)
    const roundRule = getRoundRuleContext(round)
    const proWarInfluence = (emperorFaction?.courtInfluence ?? 0) + emperorBonus + roundRule.emperorPressure
    const antiWarInfluence = (empressFaction?.courtInfluence ?? 0) + empressBonus + roundRule.empressPressure

    const politicalWillRatio = antiWarInfluence > 0
        ? proWarInfluence / antiWarInfluence
        : 999

    const politicalWillMet = politicalWillRatio >= 1.3

    // B. 可战能力门槛
    const warBonus = hasDisaster ? 10 : 0
    const thresholds = {
        military: 65 + warBonus,
        finance: 55 + warBonus,
        grain: 55 + warBonus,
        socialOrder: 45 + warBonus,
    }

    let metCount = 0
    if (northStats.military >= thresholds.military) metCount++
    if (northStats.finance >= thresholds.finance) metCount++
    if (northStats.grain >= thresholds.grain) metCount++
    if (northStats.socialOrder >= thresholds.socialOrder) metCount++

    const warCapabilityMet = metCount >= 3

    return {
        triggered: politicalWillMet && warCapabilityMet,
        politicalWillRatio,
        warCapabilityMet: metCount,
        windowLabel: roundRule.invasionWindowLabel,
        pressureSummary: `帝党 ${Math.round(proWarInfluence * 10) / 10} vs 后党 ${Math.round(antiWarInfluence * 10) / 10}`,
    }
}

export function calculateExternalSupport(
    npcs: Pick<NPC, 'powerBase' | 'isAlive' | 'alignmentBias' | 'loyaltyToCourt' | 'militaryPower' | 'externalStatus'>[],
): { emperorBonus: number; empressBonus: number } {
    return npcs.reduce(
        (acc, npc) => {
            if (npc.powerBase !== 'external' || !npc.isAlive) return acc
            if (npc.externalStatus === 'secession' || npc.externalStatus === 'rebellion') return acc

            const base = Math.max(0, (npc.militaryPower - 20) / 14)
            const statusFactor = npc.externalStatus === 'watchful' ? 0.72 : 1
            const loyaltyFactor = npc.loyaltyToCourt >= 70 ? 1 : npc.loyaltyToCourt >= 50 ? 0.75 : npc.loyaltyToCourt >= 35 ? 0.45 : 0.2
            const contribution = Math.round(base * loyaltyFactor * statusFactor * 10) / 10

            if (npc.alignmentBias === 'emperor') acc.emperorBonus += contribution
            if (npc.alignmentBias === 'empress') acc.empressBonus += contribution
            if (npc.alignmentBias === 'swing') {
                acc.emperorBonus += contribution * 0.5
                acc.empressBonus += contribution * 0.5
            }
            return acc
        },
        { emperorBonus: 0, empressBonus: 0 },
    )
}

export function getCourtBalance(
    factions: Array<{ id: CourtFactionId; courtInfluence: number }>,
    npcs: Pick<NPC, 'powerBase' | 'isAlive' | 'alignmentBias' | 'loyaltyToCourt' | 'militaryPower' | 'externalStatus'>[],
    round: number,
): { emperorInfluence: number; empressInfluence: number; ratio: number } {
    const emperorFaction = factions.find(f => f.id === 'emperor')
    const empressFaction = factions.find(f => f.id === 'empress')
    const { emperorBonus, empressBonus } = calculateExternalSupport(npcs)
    const roundRule = getRoundRuleContext(round)
    const emperorInfluence = Math.round(((emperorFaction?.courtInfluence ?? 0) + emperorBonus + roundRule.emperorPressure) * 10) / 10
    const empressInfluence = Math.round(((empressFaction?.courtInfluence ?? 0) + empressBonus + roundRule.empressPressure) * 10) / 10

    return {
        emperorInfluence,
        empressInfluence,
        ratio: empressInfluence > 0 ? emperorInfluence / empressInfluence : 999,
    }
}

/**
 * 检查势力崩盘
 * 参考：数值初值与阈值表.md §6.4
 */
export function checkFactionCollapse(
    factions: Array<{ id: string; name: string; militaryPower: number; courtInfluence: number; internalStability: number }>,
): FactionCollapseReport[] {
    const collapses: FactionCollapseReport[] = []

    for (const f of factions) {
        const collapseReasons: string[] = []
        const breachReasons: string[] = []

        if (f.militaryPower <= 10) collapseReasons.push('军权已近崩灭')
        else if (f.militaryPower <= 20) breachReasons.push('军权已见崩口')

        if (f.courtInfluence <= 10) collapseReasons.push('朝堂影响力几近丧尽')
        else if (f.courtInfluence <= 18) breachReasons.push('朝堂影响力明显失血')

        if (f.internalStability <= 10) collapseReasons.push('内部分裂已成定势')
        else if (f.internalStability <= 18) breachReasons.push('内部稳定已现裂口')

        if (collapseReasons.length > 0) {
            collapses.push({
                factionId: f.id as CourtFactionId,
                factionName: f.name,
                severity: 'collapse',
                reasons: collapseReasons,
                summary: `${f.name}已现崩盘：${collapseReasons.join('、')}。`,
            })
        } else if (breachReasons.length > 0) {
            collapses.push({
                factionId: f.id as CourtFactionId,
                factionName: f.name,
                severity: 'breach',
                reasons: breachReasons,
                summary: `${f.name}已现崩口：${breachReasons.join('、')}。`,
            })
        }
    }

    return collapses
}

// 维度值钳制在 0-100
function clampDimension(value: number): number {
    return Math.round(Math.max(0, Math.min(100, value)) * 10) / 10
}
