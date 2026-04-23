import { describe, expect, it } from 'vitest'
import coverSource from './Cover.tsx?raw'

describe('Cover source contract', () => {
    it('uses the updated subtitle line', () => {
        expect(coverSource).toContain('世事漫随流水，算来一梦浮生')
        expect(coverSource).not.toContain('溪云初起日沉阁，山雨欲来风满楼')
    })
})
