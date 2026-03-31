import { describe, expect, it } from 'vitest'
import {
    buildPolicyAftereffect,
    calculatePolicyEffect,
    checkDeathCondition,
    checkEarlyInvasion,
} from './nationEngine'
import { INITIAL_FACTIONS } from '../data/factions'
import { INITIAL_NPCS } from '../data/npcs'
import { NORTH_INITIAL } from '../data/nationStats'

describe('checkDeathCondition', () => {
    it('ignores external power figures even if they have force and low trust', () => {
        const result = checkDeathCondition(
            [
                {
                    name: '贺拔伯圭',
                    trust: 0,
                    canExecute: true,
                    factionId: 'longxi',
                    powerBase: 'external',
                    militaryPower: 70,
                    loyaltyToCourt: 20,
                },
            ],
            [
                { id: 'emperor', courtInfluence: 58 },
                { id: 'empress', courtInfluence: 72 },
            ],
            8,
            'safe',
        )

        expect(result.triggered).toBe(false)
        expect(result.killerName).toBeNull()
        expect(result.nextStage).toBe('safe')
    })

    it('marks the player under review before execution and prefers the strongest court actor', () => {
        const result = checkDeathCondition(
            [
                {
                    name: '祖珽',
                    trust: 4,
                    canExecute: true,
                    factionId: 'empress',
                    powerBase: 'court',
                    militaryPower: 18,
                    loyaltyToCourt: 84,
                },
                {
                    name: '宇文棣',
                    trust: 3,
                    canExecute: true,
                    factionId: 'emperor',
                    powerBase: 'court',
                    militaryPower: 25,
                    loyaltyToCourt: 90,
                },
            ],
            [
                { id: 'emperor', courtInfluence: 61 },
                { id: 'empress', courtInfluence: 78 },
            ],
            6,
            'safe',
        )

        expect(result).toEqual({
            triggered: false,
            killerName: '祖珽',
            nextStage: 'under_review',
            summary: '祖珽 已将你列入审查，朝中风声正紧。',
        })
    })

    it('does not allow direct execution before round 4 and keeps the stage safe', () => {
        const result = checkDeathCondition(
            [
                {
                    name: '宇文棣',
                    trust: 0,
                    canExecute: true,
                    factionId: 'emperor',
                    powerBase: 'court',
                    militaryPower: 25,
                    loyaltyToCourt: 90,
                },
            ],
            [
                { id: 'emperor', courtInfluence: 68 },
                { id: 'empress', courtInfluence: 72 },
            ],
            3,
            'safe',
        )

        expect(result.triggered).toBe(false)
        expect(result.nextStage).toBe('safe')
    })

    it('only executes after a review-stage warning round if extreme danger persists', () => {
        const result = checkDeathCondition(
            [
                {
                    name: '宇文棣',
                    trust: 4,
                    canExecute: true,
                    factionId: 'emperor',
                    powerBase: 'court',
                    militaryPower: 25,
                    loyaltyToCourt: 90,
                },
            ],
            [
                { id: 'emperor', courtInfluence: 66 },
                { id: 'empress', courtInfluence: 72 },
            ],
            8,
            'under_review',
        )

        expect(result.triggered).toBe(true)
        expect(result.killerName).toBe('宇文棣')
        expect(result.nextStage).toBe('under_review')
    })
})

describe('checkEarlyInvasion', () => {
    it('returns round-window diagnostics that match the updated pressure model', () => {
        const result = checkEarlyInvasion(
            { ...NORTH_INITIAL, military: 72, finance: 62, grain: 64, socialOrder: 54, governance: 56 },
            INITIAL_FACTIONS.map(faction => ({ ...faction })),
            INITIAL_NPCS.map(npc => ({ ...npc })),
            false,
            16,
        )
        const calmerRound = checkEarlyInvasion(
            { ...NORTH_INITIAL, military: 72, finance: 62, grain: 64, socialOrder: 54, governance: 56 },
            INITIAL_FACTIONS.map(faction => ({ ...faction })),
            INITIAL_NPCS.map(npc => ({ ...npc })),
            true,
            3,
        )

        expect(result.windowLabel).toBe('南征高压')
        expect(result.politicalWillRatio).toBeGreaterThan(calmerRound.politicalWillRatio)
        expect(result.pressureSummary).toContain('帝党')
    })
})

describe('calculatePolicyEffect', () => {
    it('rewards reasons that hit the question scoring focus and legitimacy direction', () => {
        const aligned = calculatePolicyEffect(
            { governance: 2, socialOrder: 1 },
            '新朝初立，须先稳住地方门阀，再分层清点州郡仓籍，给出清楚执行路径，才不致激起反弹。',
            {
                legitimacyEffect: 'up',
                aiScoringFocus: '是否考虑新朝初立、地方门阀与执行成本',
                round: 6,
            },
        )
        const plain = calculatePolicyEffect(
            { governance: 2, socialOrder: 1 },
            '照此办理。',
            {
                legitimacyEffect: 'up',
                aiScoringFocus: '是否考虑新朝初立、地方门阀与执行成本',
                round: 6,
            },
        )

        expect(aligned.governance).toBeGreaterThan(plain.governance ?? 0)
        expect(aligned.socialOrder).toBeGreaterThan(plain.socialOrder ?? 0)
    })

    it('lets clear execution and cost-aware policy reasons outperform generic righteous wording', () => {
        const strong = calculatePolicyEffect(
            { grain: 3, governance: 1 },
            '先把流民编户屯田，再分州郡定口粮与执行责任，避免地方推诿，先稳春耕后谈扩军。',
            {
                legitimacyEffect: 'up',
                aiScoringFocus: '是否认识到流民是资源，不只是秩序问题',
                round: 6,
            },
        )

        const weak = calculatePolicyEffect(
            { grain: 3, governance: 1 },
            '当以仁政安民。',
            {
                legitimacyEffect: 'up',
                aiScoringFocus: '是否认识到流民是资源，不只是秩序问题',
                round: 6,
            },
        )

        expect(strong.grain).toBeGreaterThan(weak.grain ?? 0)
        expect(strong.governance).toBeGreaterThan(weak.governance ?? 0)
    })

    it('stretches strong policy reasoning across early, mid and late phases', () => {
        const reason = '先把流民编户屯田，再分州郡定口粮与执行责任，避免地方推诿，先稳春耕后谈扩军。'
        const early = calculatePolicyEffect(
            { grain: 3, governance: 1 },
            reason,
            {
                legitimacyEffect: 'up',
                aiScoringFocus: '是否认识到流民是资源，不只是秩序问题',
                round: 2,
            },
        )
        const mid = calculatePolicyEffect(
            { grain: 3, governance: 1 },
            reason,
            {
                legitimacyEffect: 'up',
                aiScoringFocus: '是否认识到流民是资源，不只是秩序问题',
                round: 8,
            },
        )
        const late = calculatePolicyEffect(
            { grain: 3, governance: 1 },
            reason,
            {
                legitimacyEffect: 'up',
                aiScoringFocus: '是否认识到流民是资源，不只是秩序问题',
                round: 15,
            },
        )

        expect(early.grain).toBeLessThan(mid.grain ?? 0)
        expect(early.governance).toBeLessThan(mid.governance ?? 0)
        expect(mid.grain).toBeLessThan(late.grain ?? 0)
        expect(mid.governance).toBeLessThan(late.governance ?? 0)
    })
})

describe('buildPolicyAftereffect', () => {
    it('turns question metadata into delayed next-round policy fallout', () => {
        const immediate = calculatePolicyEffect(
            { grain: 3, governance: 1 },
            '可先把流民编户屯田，按州郡分流，并预留春耕口粮，免得地方彼此推诿。',
            {
                legitimacyEffect: 'up',
                aiScoringFocus: '是否认识到流民是资源，不只是秩序问题',
                round: 2,
            },
        )

        const aftereffect = buildPolicyAftereffect({
            round: 2,
            topic: '流民安置',
            nextRoundFeedback: '流民政策会在灾年和粮赋恢复中体现后果',
            legitimacyEffect: 'up',
            immediateEffects: immediate,
            reasonText: '可先把流民编户屯田，按州郡分流，并预留春耕口粮，免得地方彼此推诿。',
            aiScoringFocus: '是否认识到流民是资源，不只是秩序问题',
        })

        expect(aftereffect.sourceRound).toBe(2)
        expect(aftereffect.summary).toContain('流民政策')
        expect(aftereffect.effects.grain).toBeGreaterThan(0)
        expect(aftereffect.legitimacyTone).toBe('up')
        expect(aftereffect.focusMatched).toBe(true)
    })

    it('keeps delayed policy aftereffects lighter early and strongest late', () => {
        const immediate = { grain: 4, governance: 2 }
        const reason = '先把流民编户屯田，再分州郡定口粮与执行责任，避免地方推诿，先稳春耕后谈扩军。'

        const early = buildPolicyAftereffect({
            round: 2,
            topic: '流民安置',
            legitimacyEffect: 'up',
            immediateEffects: immediate,
            reasonText: reason,
            aiScoringFocus: '是否认识到流民是资源，不只是秩序问题',
        })
        const mid = buildPolicyAftereffect({
            round: 8,
            topic: '流民安置',
            legitimacyEffect: 'up',
            immediateEffects: immediate,
            reasonText: reason,
            aiScoringFocus: '是否认识到流民是资源，不只是秩序问题',
        })
        const late = buildPolicyAftereffect({
            round: 15,
            topic: '流民安置',
            legitimacyEffect: 'up',
            immediateEffects: immediate,
            reasonText: reason,
            aiScoringFocus: '是否认识到流民是资源，不只是秩序问题',
        })

        expect(early.effects.grain).toBeLessThan(mid.effects.grain ?? 0)
        expect(early.effects.governance).toBeLessThan(mid.effects.governance ?? 0)
        expect(mid.effects.grain).toBeLessThan(late.effects.grain ?? 0)
        expect(mid.effects.governance).toBeLessThan(late.effects.governance ?? 0)
    })
})
