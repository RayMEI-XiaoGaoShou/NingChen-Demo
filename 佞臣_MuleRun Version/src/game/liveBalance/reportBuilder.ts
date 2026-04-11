import type { LiveBalanceReport, SampleRunSummary } from './types'

function getWinRate(summaries: SampleRunSummary[]): number {
    if (summaries.length === 0) return 0
    return summaries.filter(item => item.gameResult === 'VICTORY').length / summaries.length
}

function getCampaignRate(
    summaries: SampleRunSummary[],
    key: 'shuResolvedState' | 'huainanResolvedState',
    value: string,
): number {
    if (summaries.length === 0) return 0
    return summaries.filter(item => item[key] === value).length / summaries.length
}

function getAverageRound10Gap(summaries: SampleRunSummary[]): number {
    if (summaries.length === 0) return 0
    return summaries.reduce((sum, item) => sum + item.round10Gap, 0) / summaries.length
}

export function buildLiveBalanceMarkdownReport(report: LiveBalanceReport): string {
    const winRate = getWinRate(report.summaries)
    const shuGainedRate = getCampaignRate(report.summaries, 'shuResolvedState', 'gained')
    const huainanGainedRate = getCampaignRate(report.summaries, 'huainanResolvedState', 'gained')
    const degradedRuns = report.summaries.filter(item => item.degraded).length
    const averageRound10Gap = getAverageRound10Gap(report.summaries)

    return [
        '# Live AI Balance Report',
        '',
        '## 总览',
        `- 生成时间：${report.generatedAt}`,
        `- Commit：${report.gitCommit}`,
        `- 难度：${report.difficulty}`,
        `- 样本版本：${report.sampleSetVersion}`,
        `- 胜率：${(winRate * 100).toFixed(1)}%`,
        `- 第 10 回合平均南陈差值：${averageRound10Gap.toFixed(1)}`,
        `- 蜀地得手率：${(shuGainedRate * 100).toFixed(1)}%`,
        `- 淮南得手率：${(huainanGainedRate * 100).toFixed(1)}%`,
        `- degraded 样本数：${degradedRuns}`,
        '',
        '## 样本明细',
        ...report.summaries.map(item => (
            `- ${item.sampleId}：${item.gameResult}，南陈 ${item.southPower.toFixed(1)} / 北周 ${item.northPower.toFixed(1)}，蜀地 ${item.shuResolvedState ?? 'none'}，淮南 ${item.huainanResolvedState ?? 'none'}`
        )),
    ].join('\n')
}

export function buildLiveBalanceJsonReport(report: LiveBalanceReport): string {
    return JSON.stringify(report, null, 2)
}
