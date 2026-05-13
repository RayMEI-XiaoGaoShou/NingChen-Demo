import { describe, expect, it } from 'vitest'
import { compareLiveBalanceReports } from './compareReports'
import type { LiveBalanceReport } from './types'

describe('compareReports', () => {
    it('computes summary deltas between baseline and latest reports', () => {
        const baseline: LiveBalanceReport = {
            generatedAt: '2026-04-02T12:00:00.000Z',
            gitCommit: 'base',
            difficulty: 'normal',
            sampleSetVersion: 'v1',
            summaries: [
                {
                    sampleId: 'a',
                    level: 'average',
                    strategy: 'mainline',
                    difficulty: 'normal',
                    gameResult: 'VICTORY',
                    northPower: 45,
                    southPower: 50,
                    round10Gap: -1,
                    shuResolvedState: 'gained',
                    huainanResolvedState: 'stalemate',
                    anySecession: false,
                    anyRebellion: false,
                    degraded: false,
                },
            ],
            parseRecords: {},
        }

        const latest: LiveBalanceReport = {
            generatedAt: '2026-04-02T12:05:00.000Z',
            gitCommit: 'latest',
            difficulty: 'normal',
            sampleSetVersion: 'v1',
            summaries: [
                {
                    sampleId: 'a',
                    level: 'average',
                    strategy: 'mainline',
                    difficulty: 'normal',
                    gameResult: 'DEFEAT_POWER',
                    northPower: 49,
                    southPower: 45,
                    round10Gap: -4,
                    shuResolvedState: 'stalemate',
                    huainanResolvedState: 'stalemate',
                    anySecession: false,
                    anyRebellion: false,
                    degraded: false,
                },
            ],
            parseRecords: {},
        }

        const output = compareLiveBalanceReports(baseline, latest)

        expect(output.markdown).toContain('胜率')
        expect(output.winRateDelta).toBeLessThan(0)
    })
})
