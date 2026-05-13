import { describe, expect, it } from 'vitest'
import { buildSimulationMatrixReport } from './simulationMatrixReport'

describe('simulationMatrixReport', () => {
    it('builds a readable regression report covering campaign and external-power matrices', () => {
        const report = buildSimulationMatrixReport()
        const shouldPrintReport =
            ((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.PRINT_SIM_MATRIX_REPORT) === '1'

        if (shouldPrintReport) {
            console.log(`\n${report}\n`)
        }

        expect(report).toContain('战役回归')
        expect(report).toContain('蜀地得手')
        expect(report).toContain('淮南')
        expect(report).toContain('外部势力回归')
        expect(report).toContain('贺拔伯圭')
        expect(report).toContain('安思明')
    })
})
