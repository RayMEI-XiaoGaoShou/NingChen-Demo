import { describe, expect, it } from 'vitest'
import { buildLiveBalanceMarkdownReport } from './reportBuilder'
import type { LiveBalanceReport } from './types'

describe('reportBuilder', () => {
    it('renders a markdown overview with win rate and key campaign rates', () => {
        const report: LiveBalanceReport = {
            generatedAt: '2026-04-02T12:00:00.000Z',
            gitCommit: 'abc123',
            difficulty: 'normal',
            sampleSetVersion: '2026-04-02-v1',
            summaries: [
                {
                    sampleId: 'average-mainline',
                    level: 'average',
                    strategy: 'mainline',
                    difficulty: 'normal',
                    gameResult: 'VICTORY',
                    northPower: 46,
                    southPower: 51,
                    round10Gap: -2,
                    shuResolvedState: 'stalemate',
                    huainanResolvedState: 'gained',
                    anySecession: false,
                    anyRebellion: false,
                    degraded: false,
                },
            ],
            parseRecords: {},
        }

        const markdown = buildLiveBalanceMarkdownReport(report)

        expect(markdown).toContain('胜率')
        expect(markdown).toContain('淮南')
        expect(markdown).toContain('average-mainline')
    })
})
