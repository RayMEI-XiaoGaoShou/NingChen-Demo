import { describe, expect, it } from 'vitest'
import { buildExternalLineProgress, shouldShowExternalLineTeaching } from './externalLineProgress'

describe('externalLineProgress', () => {
    it('treats trust as the first gate for secession-oriented targets', () => {
        const progress = buildExternalLineProgress({
            round: 7,
            difficulty: 'normal',
            unlockedSecrets: 2,
            externalActionEnabled: true,
            npc: {
                id: 'hebabogui',
                name: '贺拔伯圭',
                powerBase: 'external',
                isAlive: true,
                trust: 60,
                loyaltyToCourt: 22,
                externalStatus: 'loyal',
                highActionBias: 'secession',
            },
        })

        expect(progress?.phase).toBe('养信')
        expect(progress?.nextMove).toMatch(/probe|advise/)
        expect(progress?.trustGap).toBeGreaterThan(0)
    })

    it('recommends probing when rebellion-oriented targets still hide key secrets', () => {
        const progress = buildExternalLineProgress({
            round: 12,
            difficulty: 'normal',
            unlockedSecrets: 1,
            externalActionEnabled: true,
            npc: {
                id: 'ansiming',
                name: '安思明',
                powerBase: 'external',
                isAlive: true,
                trust: 87,
                loyaltyToCourt: 15,
                externalStatus: 'loyal',
                highActionBias: 'rebellion',
            },
        })

        expect(progress?.phase).toBe('探暗线')
        expect(progress?.nextMove).toBe('probe')
        expect(progress?.secretsGap).toBe(2)
    })

    it('marks the line as ready to act only when the external window is open', () => {
        const closed = buildExternalLineProgress({
            round: 8,
            difficulty: 'normal',
            unlockedSecrets: 2,
            externalActionEnabled: false,
            npc: {
                id: 'hebabogui',
                name: '贺拔伯圭',
                powerBase: 'external',
                isAlive: true,
                trust: 80,
                loyaltyToCourt: 28,
                externalStatus: 'loyal',
                highActionBias: 'secession',
            },
        })
        const open = buildExternalLineProgress({
            round: 9,
            difficulty: 'normal',
            unlockedSecrets: 2,
            externalActionEnabled: true,
            npc: {
                id: 'hebabogui',
                name: '贺拔伯圭',
                powerBase: 'external',
                isAlive: true,
                trust: 80,
                loyaltyToCourt: 28,
                externalStatus: 'loyal',
                highActionBias: 'secession',
            },
        })

        expect(closed?.phase).toBe('等窗口')
        expect(closed?.nextMove).toBe('wait')
        expect(open?.nextMove).toBe('secession')
    })

    it('flags a near-track target for first-time teaching', () => {
        const progress = buildExternalLineProgress({
            round: 7,
            difficulty: 'normal',
            unlockedSecrets: 1,
            externalActionEnabled: true,
            npc: {
                id: 'erzhulie',
                name: '尔朱烈',
                powerBase: 'external',
                isAlive: true,
                trust: 66,
                loyaltyToCourt: 39,
                externalStatus: 'loyal',
                highActionBias: 'secession',
            },
        })

        expect(shouldShowExternalLineTeaching(progress)).toBe(true)
    })
})
