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

    it('returns null for unknown names', () => {
        expect(getNpcPortraitPath('不存在的人')).toBeNull()
    })
})
