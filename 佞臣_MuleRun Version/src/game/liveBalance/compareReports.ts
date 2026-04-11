import type { LiveBalanceReport, SampleRunSummary } from './types'

function getWinRate(summaries: SampleRunSummary[]): number {
    if (summaries.length === 0) return 0
    return summaries.filter(item => item.gameResult === 'VICTORY').length / summaries.length
}

function getAverageRound10Gap(summaries: SampleRunSummary[]): number {
    if (summaries.length === 0) return 0
    return summaries.reduce((sum, item) => sum + item.round10Gap, 0) / summaries.length
}

export function compareLiveBalanceReports(
    baseline: LiveBalanceReport,
    latest: LiveBalanceReport,
): {
    winRateDelta: number
    markdown: string
} {
    const baselineWinRate = getWinRate(baseline.summaries)
    const latestWinRate = getWinRate(latest.summaries)
    const winRateDelta = latestWinRate - baselineWinRate

    const baselineRound10Gap = getAverageRound10Gap(baseline.summaries)
    const latestRound10Gap = getAverageRound10Gap(latest.summaries)
    const round10GapDelta = latestRound10Gap - baselineRound10Gap

    return {
        winRateDelta,
        markdown: [
            '# Live Balance Compare',
            '',
            '## 总览',
            `- 基线胜率：${(baselineWinRate * 100).toFixed(1)}%`,
            `- 当前胜率：${(latestWinRate * 100).toFixed(1)}%`,
            `- 胜率变化：${(winRateDelta * 100).toFixed(1)}%`,
            `- 基线第 10 回合平均南陈差值：${baselineRound10Gap.toFixed(1)}`,
            `- 当前第 10 回合平均南陈差值：${latestRound10Gap.toFixed(1)}`,
            `- 第 10 回合差值变化：${round10GapDelta.toFixed(1)}`,
        ].join('\n'),
    }
}
