import { getExternalMilitaryPostureLabel, getFactionConditionLabel, getFavorPressureLabel } from './explainability'
import { getCampaignMomentumSummary as getSharedCampaignMomentumSummary } from './campaignMomentum'
import type { Faction, NationDimensions, NPC, SchemeAction } from './types'
import type { SchemeResult } from './schemeEngine'

type OutcomeLabel = '国力影响' | '朝堂政局'

export interface SchemeOutcomeExplanationSegment {
    label: OutcomeLabel
    text: string
}

export interface SchemeOutcomeExplanation {
    direct: SchemeOutcomeExplanationSegment
    structural: SchemeOutcomeExplanationSegment
    segments: [SchemeOutcomeExplanationSegment, SchemeOutcomeExplanationSegment]
}

export interface SchemeOutcomeExplanationInput {
    action: SchemeAction
    result: SchemeResult
    targetBefore: NPC
    targetAfter: NPC
    relatedBefore: NPC | null
    relatedAfter: NPC | null
    factionsBefore: Faction[]
    factionsAfter: Faction[]
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
        label: '国力影响',
        text: buildDirectText(input),
    }
    const structural: SchemeOutcomeExplanationSegment = {
        label: '朝堂政局',
        text: buildStructuralText(input),
    }

    return {
        direct,
        structural,
        segments: [direct, structural],
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

    const relatedExternalPressureText = buildRelatedExternalPressureText(input)
    if (relatedExternalPressureText) {
        targetLines.push(relatedExternalPressureText)
    }

    if (targetLines.length > 0) {
        return targetLines.join('')
    }

    if (input.result.trustChange > 0) {
        return `这一步先把 ${input.targetAfter.name} 说动了，他如今更愿意听你的话，后续再沿这条线施压会更顺手。`
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

function buildRelatedExternalPressureText(input: SchemeOutcomeExplanationInput): string {
    if (!input.relatedBefore || !input.relatedAfter || input.relatedAfter.powerBase !== 'external') {
        return ''
    }

    const loyaltyDelta = input.relatedAfter.loyaltyToCourt - input.relatedBefore.loyaltyToCourt
    const militaryDelta = input.relatedAfter.militaryPower - input.relatedBefore.militaryPower

    if (loyaltyDelta >= 0 && militaryDelta >= 0) {
        return ''
    }

    const details: string[] = []
    if (loyaltyDelta < 0) {
        details.push(`对朝廷的忠诚已跌到 ${input.relatedAfter.loyaltyToCourt}`)
    }
    if (militaryDelta < 0) {
        details.push(
            `军力 ${input.relatedAfter.militaryPower} 路 ${getExternalMilitaryPostureLabel(input.relatedAfter.militaryPower)}`,
        )
    }

    if (details.length === 0) {
        return ''
    }

    return `这股猜忌还顺势压到了外镇的 ${input.relatedAfter.name} 身上，${details.join('，')}。`
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
