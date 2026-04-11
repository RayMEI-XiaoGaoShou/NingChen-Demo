import { getCampaignMapAsset } from './mapAssetEngine'
import type { CampaignOutcomeState, CampaignState } from './types'

export function getCampaignResolvedState(campaign: CampaignState): CampaignOutcomeState {
    return campaign.resolvedState ?? campaign.state
}

export function getRoundStartCampaignDisplay(
    round: number,
    shuCampaign: CampaignState,
    huainanCampaign: CampaignState,
) {
    const shuResolvedState = getCampaignResolvedState(shuCampaign)
    const huainanResolvedState = getCampaignResolvedState(huainanCampaign)

    return {
        eventName: getRoundStartEventName(round, shuCampaign.state, huainanCampaign.state),
        map: getCampaignMapAsset(shuResolvedState, huainanResolvedState),
        summary: getCampaignRoundStartSummary(round, shuCampaign, huainanCampaign, shuResolvedState, huainanResolvedState),
    }
}

function getRoundStartEventName(
    round: number,
    shuState: CampaignOutcomeState,
    huainanState: CampaignOutcomeState,
): string | null {
    if (round === 11) {
        if (shuState === 'gained') {
            return '蜀地已失，北周争论如何安置西线兵权'
        }

        if (shuState === 'failed') {
            return '征蜀受挫之后，北周重议西线兵权与后续布置'
        }

        if (shuState === 'stalemate') {
            return '蜀地战局僵持，北周争论战后如何安置西线兵权'
        }
    }

    if (round === 17) {
        if (huainanState === 'gained') {
            return '淮南失守，北周前线后方俱显疲态'
        }

        if (huainanState === 'failed') {
            return '淮南守线暂稳，北周前线后方仍显疲态'
        }

        if (huainanState === 'stalemate') {
            return '淮南久战，北周征发日重，前线后方俱显疲态'
        }
    }

    return null
}

function getCampaignRoundStartSummary(
    round: number,
    shuCampaign: CampaignState,
    huainanCampaign: CampaignState,
    shuResolvedState: CampaignOutcomeState,
    huainanResolvedState: CampaignOutcomeState,
): string | null {
    if (shuCampaign.state !== 'idle') {
        return getShuRoundStartSummary(round, shuCampaign.state)
    }

    if (huainanCampaign.state !== 'idle') {
        return getHuainanRoundStartSummary(round, huainanCampaign.state)
    }

    if (huainanResolvedState === 'gained') {
        return '南陈已据淮南，北周前线与漕运至今仍受牵制。'
    }

    if (shuResolvedState === 'gained') {
        return '南陈已稳住蜀地，北周西线至今未能回到旧日节奏。'
    }

    return null
}

function getShuRoundStartSummary(round: number, state: CampaignOutcomeState): string | null {
    if (state === 'gained') {
        return round === 11
            ? '蜀地方向已见胜机，巴蜀归属开始倾斜，北周西线被迫继续加注。'
            : '南陈已稳住蜀地，北周西线不得不转入补缀。'
    }

    if (state === 'stalemate') {
        return '蜀地战局一时僵持，双方都被迫继续投入。'
    }

    if (state === 'failed') {
        return '征蜀受挫，南陈只得先收束战线。'
    }

    return null
}

function getHuainanRoundStartSummary(round: number, state: CampaignOutcomeState): string | null {
    if (state === 'gained') {
        return round === 17
            ? '淮南防线已被撕开缺口，南陈正乘势稳住渡口与粮道。'
            : '南陈已据淮南，北周前线与漕运持续受压。'
    }

    if (state === 'stalemate') {
        return '淮南战局胶着，双方都被拖入久战。'
    }

    if (state === 'failed') {
        return '淮南受挫，南陈被迫转入守线与收束。'
    }

    return null
}
