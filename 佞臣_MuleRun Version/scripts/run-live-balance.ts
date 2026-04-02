import fs from 'node:fs/promises'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { LIVE_BALANCE_SAMPLE_SET, SAMPLE_SET_VERSION } from '../src/game/liveBalance/sampleLibrary'
import { runLiveBalanceSample } from '../src/game/liveBalance/liveSimulation'
import { buildLiveBalanceJsonReport, buildLiveBalanceMarkdownReport } from '../src/game/liveBalance/reportBuilder'
import type { LiveBalanceReport } from '../src/game/liveBalance/types'

function findWorkspaceEnvPath(): string | null {
    const repoRoot = path.resolve(process.cwd(), '..', '..', '..')
    const sibling = readdirSync(repoRoot, { withFileTypes: true }).find(entry => (
        entry.isDirectory() && entry.name.endsWith('MuleRun Version')
    ))

    if (!sibling) return null

    const envPath = path.join(repoRoot, sibling.name, '.env')
    return existsSync(envPath) ? envPath : null
}

function loadEnv(): void {
    const candidates = [
        path.resolve(process.cwd(), '.env'),
        findWorkspaceEnvPath(),
    ].filter((candidate): candidate is string => Boolean(candidate))

    const envPath = candidates.find(candidate => existsSync(candidate))
    if (!envPath) return

    const envText = readFileSync(envPath, 'utf8')
    for (const line of envText.split(/\r?\n/)) {
        if (!line || line.startsWith('#') || !line.includes('=')) continue
        const separator = line.indexOf('=')
        const key = line.slice(0, separator).trim()
        const value = line.slice(separator + 1).trim()
        if (key && !process.env[key]) {
            process.env[key] = value
        }
    }
}

function readSelectedSampleIds(): string[] {
    const selected: string[] = []
    for (let index = 0; index < process.argv.length; index += 1) {
        const arg = process.argv[index]
        if (arg === '--sample') {
            const value = process.argv[index + 1]
            if (value) selected.push(value)
            continue
        }
        if (arg?.startsWith('--sample=')) {
            selected.push(arg.slice('--sample='.length))
        }
    }
    return selected
}

async function main(): Promise<void> {
    loadEnv()
    const selectedSampleIds = readSelectedSampleIds()
    const samples = selectedSampleIds.length > 0
        ? LIVE_BALANCE_SAMPLE_SET.filter(sample => selectedSampleIds.includes(sample.id))
        : LIVE_BALANCE_SAMPLE_SET

    const latestDir = path.resolve(process.cwd(), 'docs/balance-reports/latest')
    await fs.mkdir(latestDir, { recursive: true })

    const summaries: LiveBalanceReport['summaries'] = []
    const parseRecords: LiveBalanceReport['parseRecords'] = {}

    for (const sample of samples) {
        const result = await runLiveBalanceSample(sample)
        summaries.push(result.summary)
        parseRecords[sample.id] = result.parseRecords
    }

    const report: LiveBalanceReport = {
        generatedAt: new Date().toISOString(),
        gitCommit: execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
        difficulty: samples[0]?.difficulty ?? LIVE_BALANCE_SAMPLE_SET[0]?.difficulty ?? 'normal',
        sampleSetVersion: SAMPLE_SET_VERSION,
        summaries,
        parseRecords,
    }

    await fs.writeFile(
        path.join(latestDir, 'live-balance-report.json'),
        buildLiveBalanceJsonReport(report),
        'utf8',
    )
    await fs.writeFile(
        path.join(latestDir, 'live-balance-report.md'),
        buildLiveBalanceMarkdownReport(report),
        'utf8',
    )

    console.log('Live balance report written to docs/balance-reports/latest/')
}

main().catch(error => {
    console.error(error)
    process.exitCode = 1
})
