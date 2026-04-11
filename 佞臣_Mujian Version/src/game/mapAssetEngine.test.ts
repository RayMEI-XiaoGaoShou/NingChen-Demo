import { describe, expect, it } from 'vitest'
import { getCampaignMapAsset } from './mapAssetEngine'

describe('mapAssetEngine', () => {
    it('uses initial map before any campaign is gained', () => {
        const asset = getCampaignMapAsset('idle', 'idle')
        expect(asset.src).toContain('map_1_initial.png')
    })

    it('uses bashu map when only shu is gained', () => {
        const asset = getCampaignMapAsset('gained', 'stalemate')
        expect(asset.src).toContain('map_2_bashu.png')
    })

    it('uses combined map when both campaigns are gained', () => {
        const asset = getCampaignMapAsset('gained', 'gained')
        expect(asset.src).toContain('map_3_bashu_huainan.png')
    })

    it('uses huainan map when only huainan is gained', () => {
        const asset = getCampaignMapAsset('failed', 'gained')
        expect(asset.src).toContain('map_4_huainan.png')
    })
})
