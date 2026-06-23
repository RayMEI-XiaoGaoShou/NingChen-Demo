import { describe, expect, it } from 'vitest'
import { getCampaignMapAsset } from './mapAssetEngine'

describe('mapAssetEngine', () => {
    it('uses initial map before any campaign is gained', () => {
        const asset = getCampaignMapAsset('idle', 'idle')
        expect(asset.src).toContain('roundstart-world-map-aiart-v1.webp')
        expect(decodeURI(asset.src)).not.toContain('地图底稿')
    })

    it('uses bashu map when only shu is gained', () => {
        const asset = getCampaignMapAsset('gained', 'stalemate')
        expect(asset.src).toContain('roundstart-world-map-aiart-bashu-v1.webp')
    })

    it('uses combined map when both campaigns are gained', () => {
        const asset = getCampaignMapAsset('gained', 'gained')
        expect(asset.src).toContain('roundstart-world-map-aiart-bashu-huainan-v1.webp')
    })

    it('uses huainan map when only huainan is gained', () => {
        const asset = getCampaignMapAsset('failed', 'gained')
        expect(asset.src).toContain('roundstart-world-map-aiart-huainan-v1.webp')
    })
})
