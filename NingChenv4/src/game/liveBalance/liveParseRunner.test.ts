import { beforeEach, describe, expect, it, vi } from 'vitest'
import { INITIAL_NPCS } from '../../data/npcs'

const chatCompletionMock = vi.fn()
const getAiModeMock = vi.fn()
const LIVE_PARSE_TEST_TIMEOUT_MS = 10_000

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
        getAiModeMock.mockReturnValue('deepseek')

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
    }, LIVE_PARSE_TEST_TIMEOUT_MS)

    it('records fallback when service returns non-json text', async () => {
        chatCompletionMock.mockResolvedValue('朝堂暗流涌动，诸般布局正在悄然发酵。')
        getAiModeMock.mockReturnValue('deepseek')

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
    }, LIVE_PARSE_TEST_TIMEOUT_MS)

    it('retries once when the first live parse response is truncated json', async () => {
        chatCompletionMock
            .mockResolvedValueOnce('{"characterFit":0.7,"eventFit":0.6,"evidence":["第一条","第二条"')
            .mockResolvedValueOnce(JSON.stringify({
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
                evidence: ['第一条', '第二条'],
            }))
        getAiModeMock.mockReturnValue('deepseek')

        const { runNorthLiveParse } = await import('./liveParseRunner')
        const record = await runNorthLiveParse({
            round: 8,
            npc: INITIAL_NPCS.find(npc => npc.id === 'zuting')!,
            speech: '若能先把仓储、转运与诏令节次理顺，很多麻烦会自己浮出来。',
            schemeType: 'advise',
        })

        expect(chatCompletionMock).toHaveBeenCalledTimes(2)
        expect(record.kind).toBe('north')
        expect(record.mode).toBe('live')
        expect(record.error).toBeNull()
        expect(record.normalized).not.toBeNull()
        if (record.kind !== 'north' || !record.normalized || !('characterFit' in record.normalized)) {
            throw new Error('expected north parse record')
        }
        expect(record.normalized.characterFit).toBe(0.7)
    }, LIVE_PARSE_TEST_TIMEOUT_MS)

    it('passes structured omen input through fallback parsing', async () => {
        chatCompletionMock.mockResolvedValue('not-json')
        getAiModeMock.mockReturnValue('deepseek')

        const { runNorthLiveParse } = await import('./liveParseRunner')
        const record = await runNorthLiveParse({
            round: 13,
            npc: INITIAL_NPCS.find(npc => npc.id === 'zongai')!,
            speech: '石人一只眼，挑动黄河天下反。\n\n此非独天灾，恐是朝中名分失序之兆。',
            schemeType: 'omen',
            omenSpeechInput: {
                omenText: '石人一只眼，挑动黄河天下反。',
                interpretationText: '此非独天灾，恐是朝中名分失序之兆。',
            },
        })

        expect(record.mode).toBe('fallback')
        expect(record.normalized).not.toBeNull()
        if (record.kind !== 'north' || !record.normalized || !('omenAnchorStrength' in record.normalized)) {
            throw new Error('expected omen-aware north parse record')
        }
        expect(record.normalized.omenAnchorStrength).toBeGreaterThan(0)
        expect(record.normalized.legitimacyCrack).toBeGreaterThan(0)
    }, LIVE_PARSE_TEST_TIMEOUT_MS)
})
