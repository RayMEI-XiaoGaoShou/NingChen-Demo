import type { EmpressFeedbackContext } from './empressFeedbackContext'
import type { NationDimensions } from './types'

type EmpressReplySource =
    | Pick<EmpressFeedbackContext, 'optionContent' | 'reason' | 'weakestDimensionLabel' | 'warWindow' | 'playerDangerStage' | 'concernOpening' | 'concernClosingHint'>
    | { optionContent: string; reason?: string | null }
    | null
    | undefined

export const SOUTH_DIMENSION_LABELS: Record<keyof NationDimensions, string> = {
    finance: '财政',
    grain: '粮草',
    military: '军事',
    socialOrder: '民生',
    governance: '统治',
}

export function getSettlementPolicyFollowupText(focusMatched: boolean): string {
    return focusMatched
        ? '你的附言切中了此议真正的关节。这道新政不只当回合收效，下一回合还会继续生出余力。'
        : '你的附言尚嫌隔靴搔痒，余波因此不会太强。不过这道新政的后效仍会留到下一回合，只是分量轻了。'
}

export function hasPolicyReason(policyReport: { reason?: string | null } | null | undefined): boolean {
    return Boolean(policyReport?.reason?.trim())
}

export function buildSettlementDefaultEmpressReply(policyReportOrContext: EmpressReplySource): string | null {
    if (!policyReportOrContext) return null

    const optionContent = policyReportOrContext.optionContent
    const reason = policyReportOrContext.reason?.trim()
    const concernOpening = 'concernOpening' in policyReportOrContext
        ? policyReportOrContext.concernOpening
        : '展信时，建康夜雨未歇。朕知你在北庭周旋，字字都不能写得太满，便先问你一句：近来可还安稳？'
    const defaultClosingLine = 'playerDangerStage' in policyReportOrContext && policyReportOrContext.playerDangerStage === 'under_review'
        ? '你在北朝先护住自己，余下政事，朕会替你把话收稳。'
        : '朕会先照此方向施行，你在北边先保周全。'

    if (!reason) {
        return `${concernOpening}朕已按“${optionContent}”着手施行，只是你未多写附言，朕便先依此大方向落笔。${defaultClosingLine}`
    }

    const weakestDimensionLabel = 'weakestDimensionLabel' in policyReportOrContext
        ? policyReportOrContext.weakestDimensionLabel
        : null
    const warWindow = 'warWindow' in policyReportOrContext
        ? policyReportOrContext.warWindow
        : false
    const playerDangerStage = 'playerDangerStage' in policyReportOrContext
        ? policyReportOrContext.playerDangerStage
        : 'safe'

    const cautionLine = warWindow
        ? '眼下兵事将近，节候与后勤都不可轻纵。'
        : weakestDimensionLabel
            ? `只是眼下更要先稳住${weakestDimensionLabel}这一头，锋芒不可尽露。`
            : '只是此事仍须按轻重徐徐收束，不可一味躁进。'
    const playerLine = playerDangerStage === 'under_review'
        ? '密札若落旁人眼里，朕不愿它替你添险，余话只可意会。'
        : playerDangerStage === 'under_watch'
            ? '北来书信隔了数重人手，往后行话宜更收三分。'
            : ''

    return `${concernOpening}朕已按“${optionContent}”着手施行。${cautionLine}${playerLine || defaultClosingLine}`
}

export function formatSouthDimensionLabel(dimension: string): string {
    return SOUTH_DIMENSION_LABELS[dimension as keyof NationDimensions] ?? dimension
}

export function formatSignedDelta(value: number): string {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}`
}
