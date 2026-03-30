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
        )

        expect(result).toEqual({ triggered: false, killerName: null })
    })

    it('uses the most influential court actor when multiple court killers qualify', () => {
        const result = checkDeathCondition(
            [
                {
                    name: '祖廷',
                    trust: 8,
                    canExecute: true,
                    factionId: 'empress',
                    powerBase: 'court',
                    militaryPower: 18,
                    loyaltyToCourt: 84,
                },
                {
                    name: '宇文棣',
                    trust: 6,
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
        )

        expect(result).toEqual({ triggered: true, killerName: '祖廷' })
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
        ) as any
        const calmerRound = checkEarlyInvasion(
            { ...NORTH_INITIAL, military: 72, finance: 62, grain: 64, socialOrder: 54, governance: 56 },
            INITIAL_FACTIONS.map(faction => ({ ...faction })),
            INITIAL_NPCS.map(npc => ({ ...npc })),
            true,
            3,
        ) as any

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
            },
        )
        const plain = calculatePolicyEffect(
            { governance: 2, socialOrder: 1 },
            '照此办理。',
            {
                legitimacyEffect: 'up',
                aiScoringFocus: '是否考虑新朝初立、地方门阀与执行成本',
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
            },
        )

        const weak = calculatePolicyEffect(
            { grain: 3, governance: 1 },
            '当以仁政安民。',
            {
                legitimacyEffect: 'up',
                aiScoringFocus: '是否认识到流民是资源，不只是秩序问题',
            },
        )

        expect(strong.grain).toBeGreaterThan(weak.grain ?? 0)
        expect(strong.governance).toBeGreaterThan(weak.governance ?? 0)
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
})
