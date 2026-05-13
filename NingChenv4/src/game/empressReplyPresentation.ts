import type { EmpressFeedbackContext } from './empressFeedbackContext'
import type { NationDimensions } from './types'

type EmpressReplySource =
    | Pick<EmpressFeedbackContext, 'optionContent' | 'reason' | 'weakestDimensionLabel' | 'warWindow' | 'playerDangerStage'>
    | { optionContent: string; reason?: string | null }
    | null
    | undefined

export const SOUTH_DIMENSION_LABELS: Record<keyof NationDimensions, string> = {
    finance: '财政',
    grain: '粮赋',
    military: '军事',
    socialOrder: '民生秩序',
    governance: '治理穿透力',
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

    if (!reason) {
        return `朕已按“${optionContent}”着手施行。`
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
        ? '你在北朝自护为先，其余话不必说满。'
        : playerDangerStage === 'under_watch'
            ? '你在北朝已渐有人留意，往后行话宜更收三分。'
            : ''

    return `朕已按“${optionContent}”着手施行。${cautionLine}${playerLine}`
}

export function formatSouthDimensionLabel(dimension: string): string {
    return SOUTH_DIMENSION_LABELS[dimension as keyof NationDimensions] ?? dimension
}

export function formatSignedDelta(value: number): string {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}`
}
