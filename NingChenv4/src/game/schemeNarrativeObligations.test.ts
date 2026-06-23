import { describe, expect, it } from 'vitest'
import {
    buildSchemeNarrativeObligations,
    validateNarrativeObligations,
} from './schemeNarrativeObligations'

describe('scheme narrative obligations', () => {
    it('requires damage mechanisms for grain finance and governance drops', () => {
        const obligations = buildSchemeNarrativeObligations({
            nationEffects: { grain: -0.2, finance: -0.1, governance: -0.1 },
            specialAction: null,
            schemeType: 'advise',
        })

        expect(obligations.map(item => item.dimension)).toEqual(['grain', 'finance', 'governance'])
        expect(validateNarrativeObligations(
            '祖廷调取京畿三仓簿册，仓廪亏空露出，州县为补簿册停了转运，中书门下临时截住粮秣调度。',
            obligations,
        ).accepted).toBe(true)
        expect(validateNarrativeObligations(
            '祖廷命人核验仓廪和户籍，再呈帘前定夺。',
            obligations,
        ).reasons).toContain('missing_damage_mechanism_grain')
    })

    it('rejects positive-polarity wording when a dimension is damaged', () => {
        const obligations = buildSchemeNarrativeObligations({
            nationEffects: { governance: -0.4 },
            specialAction: null,
            schemeType: 'frame',
        })

        expect(validateNarrativeObligations(
            '宗艾急忙整顿案牍，使中枢调度更顺。',
            obligations,
        ).reasons).toContain('polarity_conflict_governance')
    })

    it('requires benefit mechanisms when advice improves grain and military dimensions', () => {
        const obligations = buildSchemeNarrativeObligations({
            nationEffects: { grain: 0.1, military: 0.1 },
            specialAction: null,
            schemeType: 'advise',
        })

        expect(obligations.map(item => item.reasonCode)).toEqual([
            'missing_benefit_mechanism_grain',
            'missing_benefit_mechanism_military',
        ])
        expect(validateNarrativeObligations(
            '宇文棣命军府整军补械，又令仓廪开仓续上军粮，使粮道转运顺畅、军令更顺。',
            obligations,
        ).accepted).toBe(true)
        expect(validateNarrativeObligations(
            '宇文棣命军府扣押兵械并截住粮道，使军需短缺、转运迟滞。',
            obligations,
        ).reasons).toEqual(expect.arrayContaining([
            'polarity_conflict_grain',
            'polarity_conflict_military',
        ]))
    })

    it('adds external-action obligations for secession and rebellion', () => {
        const secessionObligations = buildSchemeNarrativeObligations({
            nationEffects: { governance: -1, finance: -0.8 },
            specialAction: 'secession',
            schemeType: 'secession',
        })
        const rebellionObligations = buildSchemeNarrativeObligations({
            nationEffects: { military: -2, grain: -1 },
            specialAction: 'rebellion',
            schemeType: 'rebellion',
        })

        expect(secessionObligations[0]?.dimension).toBe('special_action')
        expect(validateNarrativeObligations(
            '安思明扣留贡赋并另造军府簿籍，州郡调令迟滞，中枢诏令不通。',
            secessionObligations,
        ).accepted).toBe(true)
        expect(rebellionObligations[0]?.dimension).toBe('special_action')
        expect(validateNarrativeObligations(
            '安思明扣押朝使、截断驿路后发檄起兵，中枢抽调兵粮平叛，河北州县震动。',
            rebellionObligations,
        ).accepted).toBe(true)
    })
})
