import { describe, expect, it } from 'vitest'
import { validatePostResolutionNarrative } from './schemePostResolutionValidation'
import type { SchemePostResolutionEvent } from './schemeCausalEvent'

function event(patch: Partial<SchemePostResolutionEvent>): SchemePostResolutionEvent {
    return {
        kind: 'borrowed_blade',
        outcome: 'executed',
        outcomeCode: 'borrowed_blade_executed',
        summary: '宗艾借势落下最后一手，祖廷已被朝廷处决。',
        actionMechanism: ['处决', '收网'],
        counterAction: ['御前/帘前处置'],
        damageMechanism: ['职权断档', '派系震动'],
        ...patch,
    }
}

describe('validatePostResolutionNarrative', () => {
    it('rejects borrowed blade execution when ai only writes pressure', () => {
        const result = validatePostResolutionNarrative({
            text: '宗艾压向祖廷，令他旧案添了一层疑云，但朝堂暂时只添压力。',
            postResolutionEvent: event({ outcomeCode: 'borrowed_blade_executed' }),
        })

        expect(result.accepted).toBe(false)
        expect(result.reasons).toContain('missing_borrowed_blade_executed_outcome')
    })

    it('rejects borrowed blade dismissal when ai overstates it as execution', () => {
        const result = validatePostResolutionNarrative({
            text: '宗艾顺势收网，祖廷已被朝廷处决，旧属案牍随之断档。',
            postResolutionEvent: event({
                outcome: 'dismissed',
                outcomeCode: 'borrowed_blade_dismissed',
                summary: '宗艾顺势收网，祖廷已被朝廷正式罢黜。',
            }),
        })

        expect(result.accepted).toBe(false)
        expect(result.reasons).toContain('overstated_borrowed_blade_execution')
    })

    it('rejects blocked borrowed blade pressure when ai turns it into formal disposal', () => {
        const result = validatePostResolutionNarrative({
            text: '贺拔琪正式罢黜宇文棣，收去燕王府署案牍。',
            postResolutionEvent: event({
                outcome: 'pressure',
                outcomeCode: 'borrowed_blade_blocked_by_protection',
                summary: '贺拔琪虽已出面施压，但宇文棣尚未同时失去两边庇护。',
                actionMechanism: ['施压'],
                damageMechanism: ['两边庇护尚未同时崩塌'],
            }),
        })

        expect(result.accepted).toBe(false)
        expect(result.reasons).toContain('blocked_borrowed_blade_overstated_as_disposal')
    })

    it('rejects secession that is written as open rebellion', () => {
        const result = validatePostResolutionNarrative({
            text: '安思明起兵明旗反周，公开称帝，截断入京驿路。',
            postResolutionEvent: event({
                kind: 'external_action',
                outcome: 'secession',
                outcomeCode: 'secession_established',
                summary: '安思明借乱局坐实地方自雄，明面仍奉朝廷，实则已成割据。',
                actionMechanism: ['扣留贡赋', '另设调度'],
                counterAction: ['追索税粮'],
                damageMechanism: ['贡赋迟滞'],
            }),
        })

        expect(result.accepted).toBe(false)
        expect(result.reasons).toContain('secession_overstated_as_rebellion')
    })

    it('rejects crushed rebellion that is written as established rebellion', () => {
        const result = validatePostResolutionNarrative({
            text: '安思明起兵击退平叛军，割据一方，北周不得不正面应对其明旗反周之势。',
            postResolutionEvent: event({
                kind: 'external_action',
                outcome: 'rebellion',
                outcomeCode: 'rebellion_crushed',
                summary: '安思明起兵旋即为平叛军所剿，虽未坐大，却已逼北周为此折损兵粮。',
                actionMechanism: ['起兵', '截断驿路', '平叛折损'],
                counterAction: ['调兵平叛'],
                damageMechanism: ['兵粮折损'],
            }),
        })

        expect(result.accepted).toBe(false)
        expect(result.reasons).toContain('crushed_rebellion_reversed_as_established')
    })

    it('accepts valid post-resolution narratives', () => {
        const result = validatePostResolutionNarrative({
            text: '宗艾顺势收网，祖廷已被朝廷处决，旧属与案牍随之断档，后党政务一时受阻。',
            postResolutionEvent: event({ outcomeCode: 'borrowed_blade_executed' }),
        })

        expect(result).toEqual({ accepted: true, reasons: [] })
    })
})
