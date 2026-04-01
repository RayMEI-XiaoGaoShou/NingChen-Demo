import { runCampaignRegressionMatrix, runExternalPowerRegressionMatrix } from './simulationMatrix'

export function buildSimulationMatrixReport(): string {
    const campaigns = runCampaignRegressionMatrix()
    const externals = runExternalPowerRegressionMatrix()

    const lines: string[] = []

    lines.push('战役回归')
    for (const item of campaigns) {
        lines.push(
            `- ${item.label}：${formatResolvedState(item.resolvedState)}；终盘地图 ${formatMap(item.finalMapSrc)}；战局回响 ${item.campaignSummary ?? '无'}`,
        )
    }

    lines.push('')
    lines.push('外部势力回归')
    for (const item of externals) {
        lines.push(
            `- ${item.label}：最终状态 ${formatExternalStatus(item.finalExternalStatus)}；结算摘要 ${item.externalActionSummary}`,
        )
    }

    return lines.join('\n')
}

function formatResolvedState(state: 'gained' | 'stalemate' | 'failed'): string {
    switch (state) {
        case 'gained':
            return '得手'
        case 'stalemate':
            return '僵持'
        case 'failed':
            return '失利'
    }
}

function formatExternalStatus(status: string): string {
    switch (status) {
        case 'secession':
            return '割据'
        case 'rebellion':
            return '叛乱'
        case 'watchful':
            return '观望'
        case 'loyal':
            return '受制'
        default:
            return status
    }
}

function formatMap(mapSrc: string): string {
    if (mapSrc.includes('map_3_bashu_huainan')) return '巴蜀+淮南'
    if (mapSrc.includes('map_2_bashu')) return '巴蜀'
    if (mapSrc.includes('map_4_huainan')) return '淮南'
    return '初始版图'
}
