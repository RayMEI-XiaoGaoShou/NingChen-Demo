import fs from 'node:fs/promises'
import path from 'node:path'
import { compareLiveBalanceReports } from '../src/game/liveBalance/compareReports'
import type { LiveBalanceReport } from '../src/game/liveBalance/types'

async function main(): Promise<void> {
    const latestPath = path.resolve(process.cwd(), 'docs/balance-reports/latest/live-balance-report.json')
    const baselinePath = path.resolve(process.cwd(), 'docs/balance-reports/baselines/live-balance-baseline.json')

    const latest = JSON.parse(await fs.readFile(latestPath, 'utf8')) as LiveBalanceReport
    const baseline = JSON.parse(await fs.readFile(baselinePath, 'utf8')) as LiveBalanceReport
    const output = compareLiveBalanceReports(baseline, latest)

    await fs.mkdir(path.dirname(latestPath), { recursive: true })
    await fs.writeFile(
        path.resolve(process.cwd(), 'docs/balance-reports/latest/live-balance-compare.md'),
        output.markdown,
        'utf8',
    )

    console.log('Live balance compare written to docs/balance-reports/latest/live-balance-compare.md')
}

main().catch(error => {
    console.error(error)
    process.exitCode = 1
})
