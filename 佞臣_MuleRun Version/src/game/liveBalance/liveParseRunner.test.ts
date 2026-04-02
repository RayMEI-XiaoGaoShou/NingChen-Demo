import { beforeEach, describe, expect, it, vi } from 'vitest'
import { INITIAL_NPCS } from '../../data/npcs'

const chatCompletionMock = vi.fn()
const getAiModeMock = vi.fn()

vi.mock('../../ai/aiService', () => ({
    chatCompletion: chatCompletionMock,
    getAiMode: getAiModeMock,
}))

describe('liveParseRunner', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('records a live north parse when DS returns structured JSON', async () => {
        chatCompletionMock.mockResolvedValue(JSON.stringify({
            characterFit: 0.7,
            eventFit: 0.6,
            structuralPenetration: 0.8,
            executability: 0.5,
            exposureRisk: 0.4,
            financeRelevance: 0.9,
            grainRelevance: 0.8,
            militaryRelevance: 0.2,
            socialOrderRelevance: 0.3,
            governanceRelevance: 0.8,
            dominantIntent: 'strategize',
            evidence: [],
        }))
        getAiModeMock.mockReturnValue('kimi')

        const { runNorthLiveParse } = await import('./liveParseRunner')
        const record = await runNorthLiveParse({
            round: 8,
            npc: INITIAL_NPCS.find(npc => npc.id === 'zuting')!,
            speech: '若能先把仓储、转运与诏令节次理顺，很多麻烦会自己浮出来。',
            schemeType: 'advise',
        })

        expect(record.mode).toBe('live')
        expect(record.normalized).not.toBeNull()
        expect(record.rawResponse).toContain('"characterFit":0.7')
        expect(record.error).toBeNull()
    })

    it('records fallback when service returns non-json text', async () => {
        chatCompletionMock.mockResolvedValue('朝堂暗流涌动，诸般布局正在悄然发酵。')
        getAiModeMock.mockReturnValue('kimi')

        const { runNorthLiveParse } = await import('./liveParseRunner')
        const record = await runNorthLiveParse({
            round: 8,
            npc: INITIAL_NPCS.find(npc => npc.id === 'zuting')!,
            speech: '若能先把仓储、转运与诏令节次理顺，很多麻烦会自己浮出来。',
            schemeType: 'advise',
        })

        expect(record.mode).toBe('fallback')
        expect(record.normalized).not.toBeNull()
        expect(record.rawResponse).toContain('朝堂暗流涌动')
        expect(record.error).toBe('invalid-json-response')
    })
})
