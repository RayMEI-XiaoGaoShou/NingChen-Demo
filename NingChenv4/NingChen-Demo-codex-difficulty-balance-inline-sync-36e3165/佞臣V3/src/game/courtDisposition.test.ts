import { describe, expect, it } from 'vitest'
import { INITIAL_NPCS } from '../data/npcs'
import {
    COURT_DISPOSITION_DISMISS_THRESHOLD,
    COURT_DISPOSITION_EXECUTE_THRESHOLD,
    COURT_DISPOSITION_EXECUTOR_IDS,
    COURT_DISPOSITION_TARGET_IDS,
    getCourtDispositionOpportunity,
    isCourtDispositionExecutor,
    isCourtDispositionTarget,
} from './courtDisposition'

describe('courtDisposition domain model', () => {
    it('defines the four court targets and the two valid executors', () => {
        expect(COURT_DISPOSITION_TARGET_IDS).toEqual(['zuting', 'yuwendi', 'linghuelvguang', 'weichimù'])
        expect(COURT_DISPOSITION_EXECUTOR_IDS).toEqual(['hebaqí', 'zongai'])
        expect(isCourtDispositionTarget('hebaqí')).toBe(false)
        expect(isCourtDispositionExecutor('linghuelvguang')).toBe(false)
        expect(isCourtDispositionTarget('weichimu')).toBe(true)
        expect(isCourtDispositionExecutor('hebaqi')).toBe(true)
    })

    it('uses the shared 35 / 18 thresholds', () => {
        expect(COURT_DISPOSITION_DISMISS_THRESHOLD).toBe(35)
        expect(COURT_DISPOSITION_EXECUTE_THRESHOLD).toBe(18)
    })

    it('seeds the four target courtiers with favor values and active status', () => {
        const zuting = INITIAL_NPCS.find(npc => npc.id === 'zuting')
        const yuwendi = INITIAL_NPCS.find(npc => npc.id === 'yuwendi')
        const linghuelvguang = INITIAL_NPCS.find(npc => npc.id === 'linghuelvguang')
        const weichimu = INITIAL_NPCS.find(npc => npc.id === 'weichimù')

        expect(zuting?.emperorFavor).toBe(26)
        expect(zuting?.empressDowagerFavor).toBe(82)
        expect(zuting?.courtStatus).toBe('active')
        expect(yuwendi?.emperorFavor).toBe(78)
        expect(yuwendi?.empressDowagerFavor).toBe(22)
        expect(linghuelvguang?.emperorFavor).toBe(40)
        expect(linghuelvguang?.empressDowagerFavor).toBe(74)
        expect(weichimu?.emperorFavor).toBe(72)
        expect(weichimu?.empressDowagerFavor).toBe(28)
    })

    it('derives dismissible and executable states from both favor tracks', () => {
        expect(getCourtDispositionOpportunity({ emperorFavor: 52, empressDowagerFavor: 30 } as any)).toBe('safe')
        expect(getCourtDispositionOpportunity({ emperorFavor: 35, empressDowagerFavor: 35 } as any)).toBe('dismissible')
        expect(getCourtDispositionOpportunity({ emperorFavor: 18, empressDowagerFavor: 17 } as any)).toBe('executable')
    })
})
