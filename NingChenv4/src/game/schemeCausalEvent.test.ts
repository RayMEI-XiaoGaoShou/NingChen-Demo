import { describe, expect, it } from 'vitest'
import {
    buildSchemeCausalEventDraft,
    validateSchemeCausalEvent,
    type SchemeImpactTrace,
} from './schemeCausalEvent'
import type { NPC, SchemeAction } from './types'

const targetNpc = {
    id: 'zuting',
    name: '祖廷',
    title: '右丞相',
    powerBase: 'court',
} as NPC

const action = {
    id: 'scheme-1',
    targetNpcId: 'zuting',
    schemeType: 'advise',
    playerSpeech: '请祖廷借三仓旧账重核粮秣。',
} as SchemeAction

function makeTrace(patch: Partial<SchemeImpactTrace> = {}): SchemeImpactTrace {
    return {
        directNationDimensions: ['grain', 'finance', 'governance'],
        playerDirectNationDimensions: ['grain', 'finance', 'governance'],
        relatedNationDimensions: [],
        rippleNationDimensions: [],
        secondaryNationDimensions: [],
        nationImpactSources: [
            { dimension: 'grain', value: -0.2, source: 'player_direct', label: '玩家说辞直接命中：北周 粮草-0.2' },
            { dimension: 'finance', value: -0.1, source: 'player_direct', label: '玩家说辞直接命中：北周 财政-0.1' },
            { dimension: 'governance', value: -0.1, source: 'player_direct', label: '玩家说辞直接命中：北周 统治-0.1' },
        ],
        personEffectSummary: [],
        factionEffectSummary: [],
        nationEffectSummary: ['北周 粮草-0.2', '北周 财政-0.1', '北周 统治-0.1'],
        relatedImpactSummary: null,
        ...patch,
    }
}

describe('scheme causal event narrative obligations', () => {
    it('attaches narrative obligations and rejects shallow motion text', () => {
        const event = buildSchemeCausalEventDraft({
            action,
            targetNpc,
            relatedNpc: null,
            success: true,
            motionText: '祖廷命尚书省调取三仓簿册，复核户籍，再呈帘前定夺。',
            motionSource: 'fallback',
            impactTrace: makeTrace(),
        })

        expect(event?.narrativeObligations?.map(item => item.dimension)).toEqual(['grain', 'finance', 'governance'])
        expect(validateSchemeCausalEvent({
            event,
            targetNpc,
            relatedNpc: null,
        }).reasons).toContain('missing_damage_mechanism_grain')
    })
})
