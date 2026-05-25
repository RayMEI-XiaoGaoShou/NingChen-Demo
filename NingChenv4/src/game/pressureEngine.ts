import { getRoundRuleContext } from '../data/roundRuleConfig'
import type {
    DelayedBacklash,
    Faction,
    GameDifficulty,
    NationDimensions,
    NPC,
    PlayerDangerStage,
    SchemeAction,
} from './types'
import type { SchemeResult } from './schemeEngine'
import {
    hasObviousExposureSignal,
    hasObviousWarPreparationAdvice,
    isProWarNpc,
    isThinIntrigueSpeech,
} from './semanticSignals'

export interface PressureState {
    playerSuspicionHeat: number
    invasionPressure: number
}

export interface PressureDelta {
    value: number
    reasons: string[]
}

export interface PressureUpdate extends PressureState {
    suspicionDelta: PressureDelta
    invasionDelta: PressureDelta
}

export interface PressurePresentation {
    label: string
    className: 'risk-safe' | 'risk-warning' | 'risk-critical'
    summary: string
}

const DIFFICULTY_PRESSURE_SCALE: Record<GameDifficulty, {
    suspicion: number
    invasion: number
    suspicionDecay: number
    invasionDecay: number
}> = {
    easy: { suspicion: 0.72, invasion: 0.78, suspicionDecay: 6, invasionDecay: 5 },
    normal: { suspicion: 1, invasion: 1, suspicionDecay: 4, invasionDecay: 3 },
    hard: { suspicion: 1.16, invasion: 1.12, suspicionDecay: 3, invasionDecay: 2 },
    hell: { suspicion: 1.34, invasion: 1.25, suspicionDecay: 2, invasionDecay: 1 },
}

export function clampPressure(value: number): number {
    if (!Number.isFinite(value)) return 0
    return Math.max(0, Math.min(100, Math.round(value * 10) / 10))
}

export function getPlayerDangerPresentation(
    heat: number,
    stage: PlayerDangerStage = 'safe',
): PressurePresentation {
    const normalized = clampPressure(heat)
    if (stage === 'under_review' || normalized >= 74) {
        return {
            label: normalized >= 88 ? '杀机已至' : '案牍将成',
            className: 'risk-critical',
            summary: '已有权臣把你的行止视作疑点。若再露破绽，便可能从暗中盯梢转为正式处置。',
        }
    }

    if (stage === 'under_watch' || normalized >= 36) {
        return {
            label: '暗流渐浓',
            className: 'risk-warning',
            summary: '朝中已有眼线开始留意你。求援、低风险试探，或稳住保护型人物，都能缓和风声。',
        }
    }

    return {
        label: '风声暂稳',
        className: 'risk-safe',
        summary: '你的伪装尚未引起成体系的追查，但高暴露说辞仍会让风声转紧。',
    }
}

export function getInvasionPressurePresentation(pressure: number): PressurePresentation {
    const normalized = clampPressure(pressure)
    if (normalized >= 88) {
        return {
            label: '兵锋已动',
            className: 'risk-critical',
            summary: '南征议程已逼近实动。若政治意愿与可战能力同时达标，北周可能提前南下。',
        }
    }

    if (normalized >= 68) {
        return {
            label: '南征箭在弦上',
            className: 'risk-critical',
            summary: '主战声势已成。要尽快削弱军粮、离间主战派，或借安内派压住议程。',
        }
    }

    if (normalized >= 34) {
        return {
            label: '南征议势升温',
            className: 'risk-warning',
            summary: '朝中南征声量正在抬头。继续放任主战派，会让提前南下风险逐步累积。',
        }
    }

    return {
        label: '朝廷仍偏安内',
        className: 'risk-safe',
        summary: '北周朝堂仍被内政、粮道或派系掣肘牵住，暂未形成提前南征合力。',
    }
}

export function deriveRoundPressureUpdate(params: {
    round: number
    difficulty: GameDifficulty
    previous: PressureState
    schemes: SchemeAction[]
    schemeResults: SchemeResult[]
    npcsBefore: NPC[]
    npcsAfter: NPC[]
    factionsBefore: Faction[]
    factionsAfter: Faction[]
    northBefore: NationDimensions
    northAfter: NationDimensions
    delayedBacklash: DelayedBacklash[]
    invasionPoliticalRatio: number
    invasionWarCapabilityMet: number
}): PressureUpdate {
    const scale = DIFFICULTY_PRESSURE_SCALE[params.difficulty]
    const suspicion = deriveSuspicionDelta(params, scale.suspicion)
    const invasion = deriveInvasionDelta(params, scale.invasion)
    const highPressureRound = getRoundRuleContext(params.round).invasionWindowLabel === '南征高压'

    const suspicionDecay = suspicion.value > 0
        ? Math.max(1, scale.suspicionDecay - 2)
        : scale.suspicionDecay
    const invasionDecay = highPressureRound
        ? 0
        : invasion.value > 0
            ? Math.max(1, scale.invasionDecay - 1)
            : scale.invasionDecay

    return {
        playerSuspicionHeat: clampPressure(params.previous.playerSuspicionHeat - suspicionDecay + suspicion.value),
        invasionPressure: clampPressure(params.previous.invasionPressure - invasionDecay + invasion.value),
        suspicionDelta: {
            value: roundOne(suspicion.value - suspicionDecay),
            reasons: suspicion.reasons,
        },
        invasionDelta: {
            value: roundOne(invasion.value - invasionDecay),
            reasons: invasion.reasons,
        },
    }
}

function deriveSuspicionDelta(
    params: Parameters<typeof deriveRoundPressureUpdate>[0],
    difficultyScale: number,
): PressureDelta {
    let value = 0
    const reasons: string[] = []
    const targetCounts = countTargets(params.schemes)

    params.schemeResults.forEach((result, index) => {
        const action = params.schemes[index]
        const target = action ? params.npcsBefore.find(npc => npc.id === action.targetNpcId) : null
        if (!action || !target) return

        const highWeight = isHighWeightNpc(target)
        if (!result.success) {
            const gain = highWeight ? 4.5 : 2.4
            value += gain
            reasons.push(`${target.name}处计谋落空，风声略紧`)
        }

        if (result.northParse.exposureRisk >= 0.58) {
            const gain = 4 + (result.northParse.exposureRisk - 0.58) * 32 + (highWeight ? 2.5 : 0)
            value += gain
            reasons.push(`${target.name}已察觉话锋过露`)
        }

        if ((targetCounts[action.targetNpcId] ?? 0) > 1 && highWeight) {
            value += 3
            reasons.push(`${target.name}被连续施压，更容易起疑`)
        }

        if (isHighRiskIntrigue(action.schemeType) && highWeight) {
            if (isThinIntrigueSpeech(action.playerSpeech)) {
                value += 2.4
                reasons.push('高风险挑拨说得过虚，容易反噬到你身上')
            } else if (!result.success) {
                value += 1.2
                reasons.push('高风险计谋失败后留下疑影')
            }
        }

        if (action.followUp?.status === 'answered' && action.followUp.parse) {
            const followUpRisk =
                action.followUp.parse.contradictionRisk * 7
                + Math.max(0, action.followUp.parse.exposureRiskDelta) * 45
                - action.followUp.parse.pressureControl * 2
            if (followUpRisk > 1.2) {
                value += followUpRisk
                reasons.push('追问补答露出破绽')
            }
        }

        if (hasObviousExposureSignal(action.playerSpeech)) {
            value += highWeight ? 7 : 4
            reasons.push('说辞过于露骨，容易被截作把柄')
        }

        if (result.success && action.schemeType === 'appeal') {
            const relief = getAppealSuspicionRelief(target)
            value -= relief
            reasons.push(`${target.name}可暂作遮护`)
        } else if (!result.success && action.schemeType === 'appeal' && result.northParse.exposureRisk >= 0.42) {
            value += 5
            reasons.push('求援未成，反添疑影')
        }

        if (result.success && action.schemeType === 'probe' && result.northParse.exposureRisk < 0.32) {
            value -= 2.2
            reasons.push('低风险试探未惊动朝局')
        }
    })

    for (const backlash of params.delayedBacklash) {
        if (backlash.type === 'guarded') {
            value += 3.2
            reasons.push(`${backlash.npcName}开始提防`)
        } else if (backlash.type === 'exposed') {
            value += 6
            reasons.push(`${backlash.npcName}身边已有追查痕迹`)
        } else if (backlash.type === 'shock') {
            value += 12
            reasons.push(`${backlash.npcName}被真正惊动`)
        }
    }

    return {
        value: roundOne(value * difficultyScale),
        reasons: uniqueReasons(reasons),
    }
}

function deriveInvasionDelta(
    params: Parameters<typeof deriveRoundPressureUpdate>[0],
    difficultyScale: number,
): PressureDelta {
    let value = 0
    const reasons: string[] = []
    const roundRule = getRoundRuleContext(params.round)

    if (roundRule.invasionWindowLabel === '南征高压') {
        value += 8
        reasons.push('本回合主战声量天然抬高')
    } else if (roundRule.invasionWindowLabel === '试探升温') {
        value += 3.5
        reasons.push('南征议题仍在朝中试探')
    } else if (roundRule.invasionWindowLabel === '终局摊牌') {
        value += 5
        reasons.push('终局议程使主战派重新试压')
    } else if (roundRule.invasionWindowLabel === '安内压制') {
        value -= 3
        reasons.push('安内议程暂时压住主战声势')
    }

    if (params.invasionPoliticalRatio >= 1.22) {
        value += 8
        reasons.push('帝党主战声势压过安内派')
    } else if (params.invasionPoliticalRatio >= 1.0) {
        value += 4
        reasons.push('帝党与后党围绕南征拉锯')
    } else if (params.invasionPoliticalRatio < 0.75) {
        value -= 4
        reasons.push('后党仍能压住南征议程')
    }

    if (params.invasionWarCapabilityMet >= 4) {
        value += 7
        reasons.push('北周兵粮财政皆足，具备南下底气')
    } else if (params.invasionWarCapabilityMet >= 3) {
        value += 4
        reasons.push('北周可战条件已有三项达标')
    } else if (params.invasionWarCapabilityMet <= 1) {
        value -= 3
        reasons.push('北周可战条件不足')
    }

    const northWarDamage = Math.max(0, params.northBefore.military - params.northAfter.military)
        + Math.max(0, params.northBefore.finance - params.northAfter.finance) * 0.8
        + Math.max(0, params.northBefore.grain - params.northAfter.grain) * 0.9
    if (northWarDamage > 0.3) {
        value -= Math.min(14, northWarDamage * 1.8)
        reasons.push('北周兵粮财政受损，南征底气回落')
    }

    params.schemeResults.forEach((result, index) => {
        const action = params.schemes[index]
        const target = action ? params.npcsBefore.find(npc => npc.id === action.targetNpcId) : null
        if (!action || !target) return

        const parse = result.northParse
        const militaryAgenda = Math.max(parse.militaryRelevance, parse.grainRelevance, parse.governanceRelevance)

        if (result.success && action.schemeType === 'advise' && parse.advicePolarity === 'pro_state' && militaryAgenda >= 0.42) {
            value += 7 + militaryAgenda * 5
            reasons.push('献策反而替北周理顺南征筹备')
        }

        if (action.schemeType === 'advise' && hasObviousWarPreparationAdvice(action.playerSpeech, target)) {
            value += (result.success ? 8 : 5) + militaryAgenda * 3
            reasons.push('献策明显替北周推进南征筹备')
        }

        if (result.success && isProWarNpc(target) && result.trustChange > 0) {
            value += action.schemeType === 'appeal' ? 4 : 2.5
            reasons.push(`${target.name}更愿推动主战议程`)
        }

        if (result.success && action.schemeType === 'appeal') {
            const relief = getAppealInvasionRelief(target)
            if (relief > 0) {
                value -= relief
                reasons.push(`${target.name}可替你压住南征声势`)
            }
        }

        if (result.specialAction === 'secession' || result.specialAction === 'rebellion') {
            value -= result.specialAction === 'rebellion' ? 18 : 13
            reasons.push('地方军头明牌离心，北周难以全力南下')
        }

        if (result.success && ['slander', 'alienate', 'frame', 'proxy', 'omen'].includes(action.schemeType)) {
            const related = action.relatedNpcId ? params.npcsBefore.find(npc => npc.id === action.relatedNpcId) : null
            if (isProWarNpc(target) || (related && isProWarNpc(related))) {
                value -= 4.5
                reasons.push('主战链条被挑出裂缝')
            }
        }
    })

    const factionDelta = summarizeFactionPressureDelta(params.factionsBefore, params.factionsAfter)
    value += factionDelta.value
    reasons.push(...factionDelta.reasons)

    return {
        value: roundOne(value * difficultyScale),
        reasons: uniqueReasons(reasons),
    }
}

function summarizeFactionPressureDelta(before: Faction[], after: Faction[]): PressureDelta {
    const emperorBefore = before.find(faction => faction.id === 'emperor')
    const emperorAfter = after.find(faction => faction.id === 'emperor')
    const empressBefore = before.find(faction => faction.id === 'empress')
    const empressAfter = after.find(faction => faction.id === 'empress')
    let value = 0
    const reasons: string[] = []

    const emperorCourtDelta = (emperorAfter?.courtInfluence ?? 0) - (emperorBefore?.courtInfluence ?? 0)
    const emperorMilitaryDelta = (emperorAfter?.militaryPower ?? 0) - (emperorBefore?.militaryPower ?? 0)
    const empressCourtDelta = (empressAfter?.courtInfluence ?? 0) - (empressBefore?.courtInfluence ?? 0)
    const empressStabilityDelta = (empressAfter?.internalStability ?? 0) - (empressBefore?.internalStability ?? 0)

    value += Math.max(0, emperorCourtDelta) * 1.4
    value += Math.max(0, emperorMilitaryDelta) * 0.8
    value -= Math.max(0, -emperorCourtDelta) * 1.2
    value += Math.max(0, -empressCourtDelta) * 1.1
    value += Math.max(0, -empressStabilityDelta) * 0.7
    value -= Math.max(0, empressCourtDelta) * 1.2

    if (emperorCourtDelta > 0.3 || emperorMilitaryDelta > 0.5) reasons.push('帝党声势增强')
    if (emperorCourtDelta < -0.3) reasons.push('帝党朝堂声势受挫')
    if (empressCourtDelta > 0.3) reasons.push('后党压住议程')
    if (empressCourtDelta < -0.3 || empressStabilityDelta < -0.5) reasons.push('后党安内盘受损')

    return { value, reasons }
}

function countTargets(schemes: SchemeAction[]): Record<string, number> {
    return schemes.reduce<Record<string, number>>((acc, action) => {
        acc[action.targetNpcId] = (acc[action.targetNpcId] ?? 0) + 1
        return acc
    }, {})
}

function isHighWeightNpc(npc: NPC): boolean {
    return npc.canExecute
        || ['hebaqí', 'zongai', 'yuwendi', 'zuting'].includes(npc.id)
        || /太后|丞相|燕王|中常侍|上柱国|节度|都督/.test(npc.title)
}

function isHighRiskIntrigue(schemeType: SchemeAction['schemeType']): boolean {
    return ['slander', 'alienate', 'frame', 'proxy', 'omen'].includes(schemeType)
}

function getAppealSuspicionRelief(npc: NPC): number {
    if (npc.id === 'hebaqí') return 13
    if (npc.id === 'zongai') return 10
    if (npc.canExecute) return 9
    if (npc.powerBase === 'external') return 4
    return 6
}

function getAppealInvasionRelief(npc: NPC): number {
    if (npc.id === 'hebaqí') return 10
    if (npc.id === 'linghuelvguang') return 9
    if (npc.id === 'zuting') return 7
    if (npc.alignmentBias === 'empress' || npc.alignmentBias === 'swing') return 5
    return 0
}

function uniqueReasons(reasons: string[]): string[] {
    return Array.from(new Set(reasons.filter(reason => reason.trim().length > 0))).slice(0, 4)
}

function roundOne(value: number): number {
    return Math.round(value * 10) / 10
}
