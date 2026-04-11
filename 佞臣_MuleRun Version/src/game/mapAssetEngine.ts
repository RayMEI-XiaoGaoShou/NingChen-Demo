import { MAP_ASSETS } from '../data/mediaAssets'
import type { CampaignOutcomeState } from './types'

export function getCampaignMapAsset(
    shuCampaignState: CampaignOutcomeState,
    huainanCampaignState: CampaignOutcomeState,
) {
    if (shuCampaignState === 'gained' && huainanCampaignState === 'gained') {
        return MAP_ASSETS.bashuHuainan
    }
    if (shuCampaignState === 'gained') {
        return MAP_ASSETS.bashu
    }
    if (huainanCampaignState === 'gained') {
        return MAP_ASSETS.huainan
    }
    return MAP_ASSETS.initial
}
