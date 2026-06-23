import { afterEach, describe, expect, it } from 'vitest'
import {
    clearAiGameMasterDebugRecords,
    getAiGameMasterDebugRecords,
    isAiGameMasterDebugEnabled,
    recordAiGameMasterDebug,
} from './aiGameMasterDebug'

const debugGlobal = globalThis as typeof globalThis & { __NINGCHEN_AI_GM_DEBUG__?: boolean }

afterEach(() => {
    clearAiGameMasterDebugRecords()
    delete debugGlobal.__NINGCHEN_AI_GM_DEBUG__
})

describe('aiGameMasterDebug', () => {
    it('records lightweight fallback source metadata when enabled', () => {
        debugGlobal.__NINGCHEN_AI_GM_DEBUG__ = true

        const record = recordAiGameMasterDebug({
            chain: 'north_scheme',
            source: 'invalid_ai_fallback',
            round: 3,
            npcId: 'zuting',
            npcName: '祖廷',
            schemeType: 'advise',
            summary: '祖廷 · advise',
            notes: ['schema missing'],
        })

        expect(record?.source).toBe('invalid_ai_fallback')
        expect(getAiGameMasterDebugRecords()).toHaveLength(1)
        expect(getAiGameMasterDebugRecords()[0]?.notes).toEqual(['schema missing'])
    })

    it('can be disabled without affecting callers', () => {
        debugGlobal.__NINGCHEN_AI_GM_DEBUG__ = false

        const record = recordAiGameMasterDebug({
            chain: 'policy_reason',
            source: 'fallback',
            summary: 'policy fallback',
        })

        expect(isAiGameMasterDebugEnabled()).toBe(false)
        expect(record).toBeNull()
        expect(getAiGameMasterDebugRecords()).toHaveLength(0)
    })
})
