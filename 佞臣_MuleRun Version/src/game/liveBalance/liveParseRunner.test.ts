import { describe, expect, it, vi } from 'vitest'
import * as aiNativeEngine from '../aiNativeEngine'
import { INITIAL_NPCS } from '../../data/npcs'
import { runNorthLiveParse } from './liveParseRunner'

describe('liveParseRunner', () => {
    it('records a live north parse when DS returns structured data', async () => {
        vi.spyOn(aiNativeEngine, 'parseNorthSchemeInput').mockResolvedValue({
            characterFit: 0.7,
            eventFit: 0.6,
            structuralPenetration: 0.8,
            executability: 0.5,
            exposureRisk: 0.4,
            financeRelevance: 0.9,
            grainRelevance: 0.8,
            militaryRelevance: 0.2,
            socialOrderRelevance: 0.3,
            governanceRelevance: 0.8,
            dominantIntent: 'strategize',
            evidence: [],
        })

        const record = await runNorthLiveParse({
            round: 8,
            npc: INITIAL_NPCS.find(npc => npc.id === 'zuting')!,
            speech: '若能先把仓廪、转运与诏令节次理顺，很多麻烦会自己浮出来。',
            schemeType: 'advise',
        })

        expect(record.mode).toBe('live')
        expect(record.normalized).not.toBeNull()
        expect(record.error).toBeNull()
    })
})
