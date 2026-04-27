import { describe, expect, it } from 'vitest'
import { getSouthGrowthForDifficulty } from '../data/nationStats'
import {
    buildPolicyAftereffect,
    calculatePolicyEffect,
    calculateExternalSupport,
    legacyCheckDeathCondition,
    legacyCheckEarlyInvasion,
} from './nationEngine'
import { INITIAL_FACTIONS } from '../data/factions'
import { INITIAL_NPCS } from '../data/npcs'
import { NORTH_INITIAL } from '../data/nationStats'

describe('legacyCheckDeathCondition', () => {
    it('ignores external power figures even if they have force and low trust', () => {
        const result = legacyCheckDeathCondition(
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
        const result = legacyCheckDeathCondition(
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
        const result = legacyCheckDeathCondition(
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
        const result = legacyCheckDeathCondition(
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

describe('legacyCheckEarlyInvasion', () => {
    it('returns round-window diagnostics that match the updated pressure model', () => {
        const result = legacyCheckEarlyInvasion(
            { ...NORTH_INITIAL, military: 72, finance: 62, grain: 64, socialOrder: 54, governance: 56 },
            INITIAL_FACTIONS.map(faction => ({ ...faction })),
            INITIAL_NPCS.map(npc => ({ ...npc })),
            false,
            16,
        )
        const calmerRound = legacyCheckEarlyInvasion(
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

describe('calculateExternalSupport', () => {
    it('lets loyalty stay the main external-support brake after non-terminal status cleanup', () => {
        const duguwenyue = INITIAL_NPCS.find(npc => npc.id === 'duguwenyue')!
        const loyalSupport = calculateExternalSupport([
            { ...duguwenyue, externalStatus: 'loyal', loyaltyToCourt: 58, militaryPower: 45 },
        ])
        const lowLoyaltySupport = calculateExternalSupport([
            { ...duguwenyue, externalStatus: 'loyal', loyaltyToCourt: 30, militaryPower: 45 },
        ])

        expect(lowLoyaltySupport.empressBonus).toBeLessThan(loyalSupport.empressBonus)
    })
})

describe('calculatePolicyEffect', () => {
    it('uses the normal profile to trim South natural growth', () => {
        const grown = getSouthGrowthForDifficulty('normal')

        expect(grown.finance).toBe(0.43)
        expect(grown.governance).toBe(0.32)
    })

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

    it('trims base positive policy effects before rewarding authored reasons', () => {
        const plain = calculatePolicyEffect(
            { grain: 3, governance: 1 },
            '',
            {
                legitimacyEffect: 'steady',
                aiScoringFocus: '是否认识到流民是资源，不只是秩序问题',
                round: 2,
            },
        )

        expect(plain.grain ?? 0).toBeLessThan(2)
        expect(plain.governance ?? 0).toBeLessThan(0.8)
    })

    it('lets strong cost-aware reasons soften policy downsides without exposing raw scores', () => {
        const strong = calculatePolicyEffect(
            { military: 3, finance: -2, grain: -1 },
            '先定军令，再按月核粮饷和转运，不足处先从州郡调剂，避免一口气掏空国库。',
            {
                legitimacyEffect: 'steady',
                aiScoringFocus: '是否有清晰的战役目标与后勤意识',
                round: 16,
                policyParse: {
                    focusAlignment: 0.86,
                    executionClarity: 0.82,
                    costAwareness: 0.88,
                    legitimacyAlignment: 0.62,
                    policyStance: 'balanced',
                    evidence: [],
                },
            },
        )
        const weak = calculatePolicyEffect(
            { military: 3, finance: -2, grain: -1 },
            '速速进兵。',
            {
                legitimacyEffect: 'steady',
                aiScoringFocus: '是否有清晰的战役目标与后勤意识',
                round: 16,
                policyParse: {
                    focusAlignment: 0.25,
                    executionClarity: 0.18,
                    costAwareness: 0.08,
                    legitimacyAlignment: 0.2,
                    policyStance: 'aggressive',
                    evidence: [],
                },
            },
        )

        expect(strong.military ?? 0).toBeGreaterThan(weak.military ?? 0)
        expect(strong.finance ?? 0).toBeGreaterThan(weak.finance ?? 0)
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
    it('scales aftereffects by difficulty profile', () => {
        const input = {
            round: 7,
            topic: '军粮与河运',
            legitimacyEffect: 'up' as const,
            immediateEffects: {
                finance: 2.4,
                grain: 2.1,
                governance: 1.6,
            },
            reasonText: '先稳转运与清册，再定军粮分配，使地方知道先做什么。',
            policyParse: {
                focusAlignment: 0.82,
                executionClarity: 0.78,
                costAwareness: 0.61,
                legitimacyAlignment: 0.74,
                policyStance: 'balanced' as const,
                evidence: [],
            },
        }

        const normal = buildPolicyAftereffect({ ...input, difficulty: 'normal' })
        const easy = buildPolicyAftereffect({ ...input, difficulty: 'easy' })

        expect(normal.effects.finance ?? 0).toBeLessThan(easy.effects.finance ?? 0)
        expect(normal.effects.governance ?? 0).toBeLessThan(easy.effects.governance ?? 0)
    })

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
        expect(aftereffect.summary).toBe('你上回合的奏对收益延续到了这一回合。')
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

        expect(early.effects.grain).toBeLessThanOrEqual(mid.effects.grain ?? 0)
        expect(early.effects.governance).toBeLessThanOrEqual(mid.effects.governance ?? 0)
        expect(mid.effects.grain).toBeLessThan(late.effects.grain ?? 0)
        expect(mid.effects.governance).toBeLessThan(late.effects.governance ?? 0)
    })

    it('uses concise wording for delayed policy fallout', () => {
        const aftereffect = buildPolicyAftereffect({
            round: 9,
            topic: '战略选择',
            nextRoundFeedback: '将引出征蜀具体方略',
            legitimacyEffect: 'steady',
            immediateEffects: { military: 2.6, governance: 1.3, finance: -1.3, grain: -1.3 },
            reasonText: '先西后北，先用可控的征蜀把窗口坐实，再谋北向。',
            aiScoringFocus: '是否对窗口期与战争消耗有清醒判断',
        })

        expect(aftereffect.summary).toBe('你上回合的奏对收益延续到了这一回合。')
    })
})
