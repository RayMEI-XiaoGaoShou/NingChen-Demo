import { buildExternalLineProgress } from './externalLineProgress'
import { roundSupportsExternalAction } from '../data/roundRuleConfig'
import { getExternalMilitaryPostureLabel, getFactionConditionLabel, getFavorPressureLabel } from './explainability'
import { getCourtDispositionOpportunity } from './courtDisposition'
import {
    explainCampaignMomentumContribution,
    getCampaignMomentumSummary as getSharedCampaignMomentumSummary,
    type CampaignMomentumContributionSnapshot,
} from './campaignMomentum'
import type { Faction, GameDifficulty, NationDimensions, NPC, SchemeAction } from './types'
import type { SchemeResult } from './schemeEngine'

type OutcomeLabel = '直接伤国' | '结构施压' | '推进阈值'

export interface SchemeOutcomeExplanationSegment {
    label: OutcomeLabel
    text: string
}

export interface SchemeOutcomeExplanation {
    direct: SchemeOutcomeExplanationSegment
    structural: SchemeOutcomeExplanationSegment
    stateProgress: SchemeOutcomeExplanationSegment
    segments: [SchemeOutcomeExplanationSegment, SchemeOutcomeExplanationSegment, SchemeOutcomeExplanationSegment]
}

export interface SchemeOutcomeExplanationInput {
    round: number
    difficulty: GameDifficulty
    action: SchemeAction
    result: SchemeResult
    targetBefore: NPC
    targetAfter: NPC
    relatedBefore: NPC | null
    relatedAfter: NPC | null
    factionsBefore: Faction[]
    factionsAfter: Faction[]
    unlockedSecretsBefore: number
    unlockedSecretsAfter: number
    campaignMomentum: CampaignMomentumContributionSnapshot | null
}

const DIMENSION_NAMES: Record<keyof NationDimensions, string> = {
    finance: '财政',
    grain: '粮赋',
    military: '军事',
    socialOrder: '社会秩序',
    governance: '治理穿透力',
}

export function buildSchemeOutcomeExplanation(input: SchemeOutcomeExplanationInput): SchemeOutcomeExplanation {
    const direct: SchemeOutcomeExplanationSegment = {
        label: '直接伤国',
        text: buildDirectText(input),
    }
    const structural: SchemeOutcomeExplanationSegment = {
        label: '结构施压',
        text: buildStructuralText(input),
    }
    const stateProgress: SchemeOutcomeExplanationSegment = {
        label: '推进阈值',
        text: buildStateProgressText(input),
    }

    return {
        direct,
        structural,
        stateProgress,
        segments: [direct, structural, stateProgress],
    }
}

function buildDirectText(input: SchemeOutcomeExplanationInput): string {
    if (!input.result.success) {
        return `这一手没能真正咬住 ${input.targetAfter.name} 的心思，当回合也未直接削弱北周国力。`
    }

    const damagedDimensions = getNegativeDimensions(input.result.nationEffects)
    if (damagedDimensions.length === 0) {
        return `这一步虽说动了 ${input.targetAfter.name}，却未直接削弱北周国力。`
    }

    const summary = formatDimensionTargets(damagedDimensions)
    if (input.targetAfter.powerBase === 'external') {
        return `这一手先借 ${input.targetAfter.name} 这股外部筹码发力，因此${summary}当回合就见了亏空。`
    }

    return `这一手顺着 ${input.targetAfter.name} 所在的权力位置发力，因此${summary}当回合就被削弱了。`
}

function buildStructuralText(input: SchemeOutcomeExplanationInput): string {
    if (!input.result.success) {
        return `话没有真正落到点上，${input.targetAfter.name} 这边的中间层也就未被你撬动。`
    }

    if (input.targetAfter.powerBase === 'external') {
        return buildExternalStructuralText(input)
    }

    return buildCourtStructuralText(input)
}

function buildStateProgressText(input: SchemeOutcomeExplanationInput): string {
    if (!input.result.success) {
        return buildMomentumOnlyText(input.campaignMomentum)
    }

    const thresholdText = input.targetAfter.powerBase === 'external'
        ? buildExternalProgressText(input)
        : buildCourtProgressText(input)
    const momentumText = buildMomentumOnlyText(input.campaignMomentum)

    if (thresholdText && momentumText) {
        return `${thresholdText} ${momentumText}`
    }

    return thresholdText || momentumText || '这一步虽有波澜，但离真正能收网或改局，还差最后那一下。'
}

function buildCourtStructuralText(input: SchemeOutcomeExplanationInput): string {
    const targetLines: string[] = []
    const primaryLead = buildCourtStructuralLead(input)
    const emperorFavorDelta = (input.targetAfter.emperorFavor ?? 100) - (input.targetBefore.emperorFavor ?? 100)
    const dowagerFavorDelta = (input.targetAfter.empressDowagerFavor ?? 100) - (input.targetBefore.empressDowagerFavor ?? 100)

    if (primaryLead) {
        targetLines.push(primaryLead)
    }

    if (emperorFavorDelta < 0 && dowagerFavorDelta < 0) {
        targetLines.push(
            `皇帝恩宠 ${input.targetAfter.emperorFavor} · ${getFavorPressureLabel('emperorFavor', input.targetAfter.emperorFavor ?? 100)}，` +
            `太后眷顾 ${input.targetAfter.empressDowagerFavor} · ${getFavorPressureLabel('empressDowagerFavor', input.targetAfter.empressDowagerFavor ?? 100)}——两道庇护，都被这一手压低了一层。`,
        )
    } else if (emperorFavorDelta < 0) {
        targetLines.push(
            `如此一来，${input.targetAfter.name} 在御前的位置便不如先前那般稳当了，如今是 ` +
            `皇帝恩宠 ${input.targetAfter.emperorFavor} · ${getFavorPressureLabel('emperorFavor', input.targetAfter.emperorFavor ?? 100)}。`,
        )
    } else if (dowagerFavorDelta < 0) {
        targetLines.push(
            `如此一来，${input.targetAfter.name} 在帘前的位置便不如先前那般稳当了，如今是 ` +
            `太后眷顾 ${input.targetAfter.empressDowagerFavor} · ${getFavorPressureLabel('empressDowagerFavor', input.targetAfter.empressDowagerFavor ?? 100)}。`,
        )
    }

    const factionPressureText = buildFactionPressureText(input)
    if (factionPressureText) {
        targetLines.push(factionPressureText)
    }

    if (targetLines.length > 0) {
        return targetLines.join('')
    }

    if (input.result.trustChange > 0) {
        return `这一步先把 ${input.targetAfter.name} 的耳朵说热了，他对你更肯听话，后续再沿这条线施压就更容易。`
    }

    return `你这一手先在 ${input.targetAfter.name} 身边埋下了一道裂痕，朝局的天平也比先前更容易偏斜。`
}

function buildCourtStructuralLead(input: SchemeOutcomeExplanationInput): string {
    const subjectName = input.relatedAfter?.name ?? input.relatedBefore?.name ?? '此人'

    if (input.action.schemeType === 'slander') {
        return `这一手正中 ${input.targetAfter.name} 对 ${subjectName} 的疑虑——他本就对 ${subjectName} 存了几分不安，你不过顺水推了一把。`
    }

    if (input.action.schemeType === 'alienate') {
        return `这一手不是硬碰硬，而是顺着 ${input.targetAfter.name} 与 ${subjectName} 之间原有的裂痕，再往深处推了一层。`
    }

    if (input.action.schemeType === 'frame') {
        return `这一手逼得 ${input.targetAfter.name} 自己露了马脚——最重的嫌疑，不用你来安，他自己便扛上了。`
    }

    if (input.action.schemeType === 'omen') {
        return `这一手打的不是人，而是名分。一旦天命之说出了裂缝，${input.targetAfter.name} 脚下的根基便开始松动。`
    }

    return ''
}

function buildExternalStructuralText(input: SchemeOutcomeExplanationInput): string {
    const trustDelta = input.targetAfter.trust - input.targetBefore.trust
    const loyaltyDelta = input.targetAfter.loyaltyToCourt - input.targetBefore.loyaltyToCourt
    const militaryDelta = input.targetAfter.militaryPower - input.targetBefore.militaryPower
    const pieces: string[] = []

    if (input.action.schemeType === 'advise') {
        pieces.push(`他因此更信你能替他谋后路，对朝廷的约束也就更不耐烦了。`)
    } else if (input.action.schemeType === 'omen') {
        pieces.push(`这一手在中枢与 ${input.targetAfter.name} 之间又添了一层猜忌。`)
    } else if (input.action.schemeType === 'slander' || input.action.schemeType === 'alienate' || input.action.schemeType === 'frame') {
        pieces.push(`这一手让 ${input.targetAfter.name} 越发觉得，继续替朝廷俯首帖耳，亏的只会是自己。`)
    } else if (loyaltyDelta < 0) {
        pieces.push(`他对朝廷的忠心因此又凉了几分。`)
    } else if (trustDelta > 0) {
        pieces.push(`${input.targetAfter.name} 现在更肯把后路押在你身上。`)
    }

    if (militaryDelta > 0) {
        pieces.push(`他手上的兵势也随之上浮，如今是军力 ${input.targetAfter.militaryPower} · ${getExternalMilitaryPostureLabel(input.targetAfter.militaryPower)}。`)
    } else if (militaryDelta < 0) {
        pieces.push(`朝中若顺势收紧粮饷甲械、加派监军，他手上的兵势也会随之削弱，如今是军力 ${input.targetAfter.militaryPower} · ${getExternalMilitaryPostureLabel(input.targetAfter.militaryPower)}。`)
    } else {
        pieces.push(`如今他手上仍握着军力 ${input.targetAfter.militaryPower} · ${getExternalMilitaryPostureLabel(input.targetAfter.militaryPower)}。`)
    }

    return pieces.join('')
}

function buildCourtProgressText(input: SchemeOutcomeExplanationInput): string {
    const afterOpportunity = getCourtDispositionOpportunity({
        emperorFavor: input.targetAfter.emperorFavor ?? 100,
        empressDowagerFavor: input.targetAfter.empressDowagerFavor ?? 100,
    })

    if (afterOpportunity === 'executable') {
        return '嫌疑已经够重。若此时再借贺拔琪或宗艾之手收网，便可将一纸疑罪兑成真刀真斧的处置。'
    }

    if (afterOpportunity === 'dismissible') {
        return '此人离罢黜之线已只剩一步。再压一层庇护，便可借刀收网。'
    }

    return ''
}

function buildExternalProgressText(input: SchemeOutcomeExplanationInput): string {
    if (input.result.specialAction === 'secession') {
        return `${input.targetAfter.name} 已被你推到割据线上，地方军头这一步已经明牌。`
    }

    if (input.result.specialAction === 'rebellion') {
        return `${input.targetAfter.name} 已被你推到造反线上，地方军头这一步已经明牌。`
    }

    const externalAction = resolveExternalProgressAction(input)
    const beforeProgress = buildExternalLineProgress({
        npc: { ...input.targetBefore, highActionBias: externalAction },
        unlockedSecrets: input.unlockedSecretsBefore,
        difficulty: input.difficulty,
        round: input.round,
        externalActionEnabled: roundSupportsExternalAction(input.round, externalAction),
    })
    const afterProgress = buildExternalLineProgress({
        npc: { ...input.targetAfter, highActionBias: externalAction },
        unlockedSecrets: input.unlockedSecretsAfter,
        difficulty: input.difficulty,
        round: input.round,
        externalActionEnabled: roundSupportsExternalAction(input.round, externalAction),
    })

    if (afterProgress?.windowOpen && afterProgress.trustGap === 0 && afterProgress.loyaltyGap === 0 && afterProgress.secretsGap === 0) {
        return `条件已齐：信任够了、忠心已冷、暗线已明。眼下正是逼他走向 ${afterProgress.targetLabel} 的时候——再拖下去，变数只会更多。`
    }

    if (afterProgress && beforeProgress) {
        if (afterProgress.secretsGap < beforeProgress.secretsGap) {
            return `信任已够，但底牌还没摸透——还差 ${afterProgress.secretsGap} 条暗线。${input.targetAfter.name} 最不肯明说的那层心思，不挖出来，${afterProgress.targetLabel} 便无从谈起。`
        }

        if (afterProgress.loyaltyGap < beforeProgress.loyaltyGap) {
            return `${input.targetAfter.name} 已肯听你，底牌也露了大半，唯独对朝廷还没冷透。再压 ${afterProgress.loyaltyGap} 点忠诚，才到试 ${afterProgress.targetLabel} 的时候。`
        }

        if (afterProgress.trustGap < beforeProgress.trustGap) {
            return `离 ${afterProgress.targetLabel} 还卡在第一步：信任尚差 ${afterProgress.trustGap} 点。暗线已明 ${input.unlockedSecretsAfter}/${input.unlockedSecretsAfter + afterProgress.secretsGap}，路还长。`
        }
    }

    return '离割据或造反的线又近了一步。但在他真正举起反旗之前，他只会变得更冷、更不肯受人摆布——你还需要再推。'
}

function resolveExternalProgressAction(input: SchemeOutcomeExplanationInput): 'secession' | 'rebellion' {
    if (input.action.schemeType === 'rebellion') return 'rebellion'
    if (input.action.schemeType === 'secession') return 'secession'
    return input.targetAfter.highActionBias === 'rebellion' ? 'rebellion' : 'secession'
}

function buildMomentumOnlyText(momentum: CampaignMomentumContributionSnapshot | null): string {
    if (!momentum) return ''
    return explainCampaignMomentumContribution(momentum)
}

function buildFactionPressureText(input: SchemeOutcomeExplanationInput): string {
    const changedFactionIds = new Set<string>()
    for (const [factionId, vector] of Object.entries(input.result.factionEffects)) {
        if (!vector) continue
        if ((vector.courtInfluence ?? 0) !== 0 || (vector.internalStability ?? 0) !== 0 || (vector.militaryPower ?? 0) !== 0) {
            changedFactionIds.add(factionId)
        }
    }

    const lines = Array.from(changedFactionIds).map(factionId => {
        const before = input.factionsBefore.find(item => item.id === factionId)
        const after = input.factionsAfter.find(item => item.id === factionId)
        if (!before || !after) return ''

        const relevantParts: string[] = []
        if (after.courtInfluence !== before.courtInfluence) {
            relevantParts.push(`朝堂影响 ${after.courtInfluence} · ${getFactionConditionLabel('courtInfluence', after.courtInfluence)}`)
        }
        if (after.internalStability !== before.internalStability) {
            relevantParts.push(`内部稳定 ${after.internalStability} · ${getFactionConditionLabel('internalStability', after.internalStability)}`)
        }
        if (after.militaryPower !== before.militaryPower) {
            relevantParts.push(`军事实力 ${after.militaryPower} · ${getFactionConditionLabel('militaryPower', after.militaryPower)}`)
        }

        if (relevantParts.length === 0) return ''
        return `${after.name} 的${relevantParts.join('，')}，都因此折了一层。`
    }).filter(Boolean)

    return lines.join('')
}

function getNegativeDimensions(input: Partial<NationDimensions>): Array<keyof NationDimensions> {
    return (Object.keys(DIMENSION_NAMES) as Array<keyof NationDimensions>).filter(key => (input[key] ?? 0) < 0)
}

function formatDimensionTargets(dimensions: Array<keyof NationDimensions>): string {
    const names = dimensions.map(dim => `北周${DIMENSION_NAMES[dim]}`)
    if (names.length <= 1) return names[0] ?? '北周国力'
    if (names.length === 2) return names.join('与')
    return `${names.slice(0, -1).join('、')}与${names[names.length - 1]}`
}

export function getCampaignMomentumSummary(label: string): string {
    return getSharedCampaignMomentumSummary(label)
}
