import { getCampaignMomentumSummary } from './campaignMomentum'
import { getCampaignMomentumLabel } from './explainability'
import type { CampaignState } from './types'

export type CampaignRecordSurface = 'round_start' | 'settlement'
export type CampaignRecordPhase = '战前伏笔汇总' | '战区态势' | '战役结果'

export type CampaignRecordPanel =
    | {
        visible: false
    }
    | {
        visible: true
        title: string
        phase: CampaignRecordPhase
        recapText: string
        statusText: string
        resultText?: string
    }

interface CampaignRecordBoardInput {
    round: number
    surface: CampaignRecordSurface
    shuCampaign: CampaignState
    huainanCampaign: CampaignState
    shuMomentum: number
    huainanMomentum: number
    campaignReports: string[]
}

interface TheaterBoardConfig {
    title: string
    momentum: number
    campaign: CampaignState
    battleLabel: string
    firstWindowRound: number
    resultRound: number
    openingRecap: string
    ongoingRecap: string
}

export function buildCampaignRecordPanel(input: CampaignRecordBoardInput): CampaignRecordPanel {
    if (input.round >= 6 && input.round <= 10) {
        return buildTheaterBoard({
            surface: input.surface,
            round: input.round,
            campaignReports: input.campaignReports,
            title: '巴蜀之战',
            momentum: input.shuMomentum,
            campaign: input.shuCampaign,
            battleLabel: '巴蜀方向',
            firstWindowRound: 6,
            resultRound: 10,
            openingRecap: '此前几回合，你在朝中经营的人心、粮道与调度部署，如今已开始影响西线局势。',
            ongoingRecap: '巴蜀方向的局势已经摆到了台面上。谁在力主出兵、谁在拖延粮道、谁在掣肘调度，都在一步步左右这场战事的走向。',
        })
    }

    if (input.round === 16) {
        return buildTheaterBoard({
            surface: input.surface,
            round: input.round,
            campaignReports: input.campaignReports,
            title: '淮南之战',
            momentum: input.huainanMomentum,
            campaign: input.huainanCampaign,
            battleLabel: '淮南方向',
            firstWindowRound: 16,
            resultRound: 16,
            openingRecap: '此前几回合，你在军令、粮草转运与边镇人心上做的布局，如今已一并传导到淮南前线。眼下要看的，是北周能否守住江北门户。',
            ongoingRecap: '淮南方向的兵力部署、粮道调配与州郡归属，已经逐层浮出水面。你此前制造的裂隙，正在前线逐步显现。',
        })
    }

    return { visible: false }
}

function buildTheaterBoard(config: {
    surface: CampaignRecordSurface
    round: number
    campaignReports: string[]
} & TheaterBoardConfig): CampaignRecordPanel {
    const phase = resolvePhase(config.surface, config.round, config.firstWindowRound, config.resultRound)
    const momentumLabel = getCampaignMomentumLabel(clampMomentum(config.momentum))
    const resultText = phase === '战役结果'
        ? pickResultText(config.campaignReports, config.campaign)
        : undefined

    return {
        visible: true,
        title: config.title,
        phase,
        recapText: phase === '战前伏笔汇总' ? config.openingRecap : config.ongoingRecap,
        statusText: phase === '战役结果'
            ? `${config.battleLabel}此前累积的局势，最终定格在「${momentumLabel}」——${getCampaignMomentumSummary(momentumLabel)}`
            : `当前${config.battleLabel}的战局推进至「${momentumLabel}」——${getCampaignMomentumSummary(momentumLabel)}`,
        resultText,
    }
}

function resolvePhase(
    surface: CampaignRecordSurface,
    round: number,
    firstWindowRound: number,
    resultRound: number,
): CampaignRecordPhase {
    if (surface === 'settlement' && round === resultRound) {
        return '战役结果'
    }

    if (round === firstWindowRound) {
        return '战前伏笔汇总'
    }

    return '战区态势'
}

function pickResultText(campaignReports: string[], campaign: CampaignState): string | undefined {
    const reportText = campaignReports.find(report => report.trim().length > 0)
    if (reportText) return reportText

    const campaignSummary = campaign.summary?.trim()
    return campaignSummary ? campaignSummary : undefined
}

function clampMomentum(value: number): number {
    return Math.max(0, Math.min(1, value))
}
