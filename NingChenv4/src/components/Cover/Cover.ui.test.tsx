import { describe, expect, it } from 'vitest'
import coverSource from './Cover.tsx?raw'

describe('Cover difficulty panel contract', () => {
    it('keeps the difficulty chooser without rendering the old helper paragraph', () => {
        expect(coverSource).toContain('cover-difficulty-header')
        expect(coverSource).toContain('确认')
        expect(coverSource).not.toContain('播放片头')
        expect(coverSource).not.toContain('进入序章')
        expect(coverSource).not.toContain('currentProfile.description')
        expect(coverSource).not.toContain('默认推荐，首通胜率约在五五之间。')
    })
})
