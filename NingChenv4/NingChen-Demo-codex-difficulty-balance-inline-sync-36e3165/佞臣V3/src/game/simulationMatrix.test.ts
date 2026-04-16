import { describe, expect, it } from 'vitest'
import { runCampaignRegressionMatrix, runExternalPowerRegressionMatrix } from './simulationMatrix'

describe('simulationMatrix', () => {
    it('covers the full shu and huainan campaign branch matrix with stable follow-up maps', () => {
        const results = runCampaignRegressionMatrix()

        expect(results.map(item => item.id)).toEqual([
            'shu_gained',
            'shu_stalemate',
            'shu_failed',
            'huainan_gained_after_bashu',
            'huainan_stalemate_after_bashu',
            'huainan_failed_after_bashu',
        ])

        expect(results.find(item => item.id === 'shu_gained')?.resolvedState).toBe('gained')
        expect(results.find(item => item.id === 'shu_gained')?.finalMapSrc).toContain('map_2_bashu.png')
        expect(results.find(item => item.id === 'shu_gained')?.campaignSummary).toContain('胜机')

        expect(results.find(item => item.id === 'shu_stalemate')?.resolvedState).toBe('stalemate')
        expect(results.find(item => item.id === 'shu_stalemate')?.finalMapSrc).toContain('map_1_initial.png')
        expect(results.find(item => item.id === 'shu_stalemate')?.campaignSummary).toContain('僵持')

        expect(results.find(item => item.id === 'shu_failed')?.resolvedState).toBe('failed')
        expect(results.find(item => item.id === 'shu_failed')?.finalMapSrc).toContain('map_1_initial.png')

        expect(results.find(item => item.id === 'huainan_gained_after_bashu')?.resolvedState).toBe('gained')
        expect(results.find(item => item.id === 'huainan_gained_after_bashu')?.finalMapSrc).toContain('map_3_bashu_huainan.png')

        expect(results.find(item => item.id === 'huainan_stalemate_after_bashu')?.resolvedState).toBe('stalemate')
        expect(results.find(item => item.id === 'huainan_stalemate_after_bashu')?.finalMapSrc).toContain('map_2_bashu.png')
        expect(results.find(item => item.id === 'huainan_stalemate_after_bashu')?.campaignSummary).toContain('淮南战事迁延日久')

        expect(results.find(item => item.id === 'huainan_failed_after_bashu')?.resolvedState).toBe('failed')
        expect(results.find(item => item.id === 'huainan_failed_after_bashu')?.finalMapSrc).toContain('map_2_bashu.png')
    })

    it('covers external secession and rebellion-style branches with summarized outcomes', () => {
        const results = runExternalPowerRegressionMatrix()

        expect(results.map(item => item.id)).toEqual([
            'heba_bogui_secession',
            'an_siming_rebellion',
        ])

        expect(results.find(item => item.id === 'heba_bogui_secession')?.finalExternalStatus).toBe('secession')
        expect(results.find(item => item.id === 'heba_bogui_secession')?.externalActionSummary).toContain('贺拔伯圭')

        expect(results.find(item => item.id === 'an_siming_rebellion')?.finalExternalStatus).toBe('secession')
        expect(results.find(item => item.id === 'an_siming_rebellion')?.externalActionSummary).toContain('安思明')
    })
})
