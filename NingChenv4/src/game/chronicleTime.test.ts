import { describe, expect, it } from 'vitest'
import { getChronicleTimeLabels, sanitizeChronicleNarration } from './chronicleTime'

describe('chronicle time labels', () => {
    it('returns separated north and south labels without combined upper/lower wording', () => {
        const labels = getChronicleTimeLabels(1)

        expect(labels.north).toBe('北周建文五年初春')
        expect(labels.south).toBe('南陈天嘉元年季春')
        expect(labels.north).not.toContain('/')
        expect(labels.south).not.toContain('/')
        expect(labels.north).not.toMatch(/[上下]$/)
        expect(labels.south).not.toMatch(/[上下]$/)
    })

    it('normalizes overlong chronicle text without leaving a half sentence', () => {
        const labels = getChronicleTimeLabels(1)
        const raw = `《南北朝通鉴-卷一》\n建文五年上 / 天嘉元年上 初春，北周朝堂再起南征之议。${'祖廷核账。'.repeat(80)}末句无标点`

        const cleaned = sanitizeChronicleNarration(raw, labels, 120)

        expect(cleaned.startsWith('北周建文五年初春')).toBe(true)
        expect(cleaned).not.toContain('建文五年上 / 天嘉元年上')
        expect(cleaned).not.toContain('初春，初春')
        expect(cleaned).not.toContain('《南北朝通鉴')
        expect(cleaned.length).toBeLessThanOrEqual(120)
        expect(cleaned).toMatch(/[。！？]$/)
    })
})
