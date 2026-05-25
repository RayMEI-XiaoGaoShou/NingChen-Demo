import type { NationDimensions, SchemeType } from './types'

export type NarrativeImpactDimension = keyof NationDimensions | 'loyalty' | 'special_action'

export interface SchemeNarrativeObligation {
    dimension: NarrativeImpactDimension
    direction: 'damage' | 'benefit'
    subjectLabel: string
    subjectKeywords: RegExp
    mechanismKeywords: RegExp
    polarityConflictKeywords: RegExp
    reasonCode: string
}

export function buildSchemeNarrativeObligations(input: {
    nationEffects: Partial<NationDimensions>
    specialAction: 'secession' | 'rebellion' | null
    schemeType: SchemeType
}): SchemeNarrativeObligation[] {
    const obligations: SchemeNarrativeObligation[] = (Object.keys(DIMENSION_RULES) as Array<keyof NationDimensions>)
        .filter(dimension => isNonZero(input.nationEffects[dimension]))
        .sort((left, right) => Math.abs(input.nationEffects[right] ?? 0) - Math.abs(input.nationEffects[left] ?? 0))
        .map(dimension => {
            const rule = DIMENSION_RULES[dimension]
            const direction: SchemeNarrativeObligation['direction'] = (input.nationEffects[dimension] ?? 0) < 0 ? 'damage' : 'benefit'

            return {
                dimension,
                direction,
                subjectLabel: rule.subjectLabel,
                subjectKeywords: rule.subjectKeywords,
                mechanismKeywords: direction === 'damage' ? rule.damageMechanismKeywords : rule.benefitMechanismKeywords,
                polarityConflictKeywords: direction === 'damage' ? rule.benefitMechanismKeywords : rule.damageMechanismKeywords,
                reasonCode: `missing_${direction}_mechanism_${dimension}`,
            }
        })

    if (input.specialAction === 'secession' || input.specialAction === 'rebellion') {
        obligations.unshift(EXTERNAL_ACTION_RULES[input.specialAction])
    }

    return dedupeByDimension(obligations).slice(0, 4)
}

export function validateNarrativeObligations(
    text: string,
    obligations: SchemeNarrativeObligation[],
): { accepted: boolean; reasons: string[] } {
    const normalized = text.replace(/\s+/g, '')
    const reasons: string[] = []

    if (obligations.length > 0 && !/[令命遣扣查调封截压收罢黜处决起兵平叛复核翻检]/u.test(normalized)) {
        reasons.push('vague_action')
    }

    for (const obligation of obligations.slice(0, 3)) {
        const hasSubject = obligation.subjectKeywords.test(normalized)
        const hasMechanism = obligation.mechanismKeywords.test(normalized)
        if (!hasSubject || !hasMechanism) reasons.push(obligation.reasonCode)
        if (obligation.polarityConflictKeywords.test(normalized)) {
            reasons.push(`polarity_conflict_${obligation.dimension}`)
        }
    }

    return {
        accepted: reasons.length === 0,
        reasons: unique(reasons),
    }
}

const DIMENSION_RULES = {
    finance: {
        subjectLabel: '财政/度支',
        subjectKeywords: /财政|度支|账|簿|库|钱|饷|支账|库藏|贡赋|税粮/u,
        damageMechanismKeywords: /亏空|挪用|停拨|受阻|加派|露出|断档|追索|折损|扣留/u,
        benefitMechanismKeywords: /补足|归拢|疏通|整顿见效|拨付|充盈|足额|清讫/u,
    },
    grain: {
        subjectLabel: '粮道/仓廪',
        subjectKeywords: /粮|仓|仓廪|粮道|转运|军粮|贡赋/u,
        damageMechanismKeywords: /迟滞|停转|截住|扣下|亏空|断粮|折损|受阻|拖慢|抽调/u,
        benefitMechanismKeywords: /转运顺畅|转运畅通|粮道畅通|补足|疏通|开仓|续上|接续/u,
    },
    military: {
        subjectLabel: '军府/军需',
        subjectKeywords: /军|兵|兵械|军需|部曲|监军|军令|关隘|骑/u,
        damageMechanismKeywords: /迟滞|扣押|短缺|掣肘|折损|改道|空虚|受阻|被剿|抽调/u,
        benefitMechanismKeywords: /整军|补械|补给|补足|集结|稳住|增援|军令更顺|军需接续/u,
    },
    socialOrder: {
        subjectLabel: '州县/民间秩序',
        subjectKeywords: /民|州县|地方|流言|风声|官民|军心|驿路/u,
        damageMechanismKeywords: /扰动|不安|坐大|逃避|震动|摇动|哗然|失序/u,
        benefitMechanismKeywords: /安定|压住|平息|归附|稳住|收束/u,
    },
    governance: {
        subjectLabel: '中枢/文书/权责',
        subjectKeywords: /诏|中枢|案牍|文书|权责|调度|州县|御史|尚书|中书/u,
        damageMechanismKeywords: /不通|壅塞|截权|截住|推诿|重叠|断档|迟滞|掣肘|停摆/u,
        benefitMechanismKeywords: /更顺|疏通|归拢|整顿见效|厘清|收束|归口/u,
    },
} satisfies Record<keyof NationDimensions, {
    subjectLabel: string
    subjectKeywords: RegExp
    damageMechanismKeywords: RegExp
    benefitMechanismKeywords: RegExp
}>

const EXTERNAL_ACTION_RULES: Record<'secession' | 'rebellion', SchemeNarrativeObligation> = {
    secession: {
        dimension: 'special_action',
        direction: 'damage',
        subjectLabel: '割据自保',
        subjectKeywords: /贡赋|军府|属官|关津|调令|税粮|州郡/u,
        mechanismKeywords: /扣留|延迟|另造|私署|封锁|不奉|迟滞/u,
        polarityConflictKeywords: /公开称帝|彻底反周/u,
        reasonCode: 'missing_damage_mechanism_secession',
    },
    rebellion: {
        dimension: 'special_action',
        direction: 'damage',
        subjectLabel: '举兵平叛',
        subjectKeywords: /朝使|驿路|起兵|关隘|平叛|监军|兵粮/u,
        mechanismKeywords: /扣押|截断|发檄|击退|被剿|折损|抽调|震动/u,
        polarityConflictKeywords: /略有离心|暂观朝局/u,
        reasonCode: 'missing_damage_mechanism_rebellion',
    },
}

function dedupeByDimension(items: SchemeNarrativeObligation[]): SchemeNarrativeObligation[] {
    const seen = new Set<NarrativeImpactDimension>()
    return items.filter(item => {
        if (seen.has(item.dimension)) return false
        seen.add(item.dimension)
        return true
    })
}

function unique(items: string[]): string[] {
    return Array.from(new Set(items))
}

function isNonZero(value: number | undefined): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value !== 0
}
