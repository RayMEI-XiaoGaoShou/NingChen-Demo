import { describe, expect, it } from 'vitest'
import { getNpcPortraitPath } from './mediaAssets'

describe('mediaAssets', () => {
    it('maps 宇文棣 to 拓跋棣 portrait asset', () => {
        expect(decodeURI(getNpcPortraitPath('宇文棣') ?? '')).toContain('拓跋棣.png')
    })

    it('returns direct name-based portrait assets when available', () => {
        expect(decodeURI(getNpcPortraitPath('祖廷') ?? '')).toContain('祖廷.png')
        expect(decodeURI(getNpcPortraitPath('贺拔琪') ?? '')).toContain('贺拔琪.png')
    })

    it('maps court dark portraits to finalized cutout assets', () => {
        expect(decodeURI(getNpcPortraitPath('宇文棣', 'courtDark') ?? '')).toContain('朝堂暗版/portrait_yuwendi_base_dark_cutout.png')
        expect(decodeURI(getNpcPortraitPath('令狐律光', 'courtDark') ?? '')).toContain('朝堂暗版/portrait_linghulvguang_base_dark_cutout.png')
    })

    it('maps court bright portraits to hover cutout assets', () => {
        expect(decodeURI(getNpcPortraitPath('宇文棣', 'courtBright') ?? '')).toContain('hover亮版_v1/portrait_yuwendi_hover_bright_cutout.png')
        expect(decodeURI(getNpcPortraitPath('贺拔琪', 'courtBright') ?? '')).toContain('hover亮版_v1/portrait_hebaqi_hover_bright_cutout.png')
    })

    it('maps court fullbody portraits to selected AIART assets', () => {
        expect(decodeURI(getNpcPortraitPath('宇文棣', 'courtFullbody') ?? '')).toContain('court-fullbody/portrait_yuwendi_fullbody.png')
        expect(decodeURI(getNpcPortraitPath('贺拔琪', 'courtFullbody') ?? '')).toContain('court-fullbody/portrait_hebaqi_fullbody.png')
    })

    it('returns null for unknown names', () => {
        expect(getNpcPortraitPath('不存在的人')).toBeNull()
    })
})
