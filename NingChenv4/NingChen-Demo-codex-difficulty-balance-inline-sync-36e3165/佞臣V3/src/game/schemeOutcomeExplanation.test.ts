import { describe, expect, it } from 'vitest'
import { INITIAL_FACTIONS } from '../data/factions'
import { INITIAL_NPCS } from '../data/npcs'
import type { SchemeResult } from './schemeEngine'
import { buildSchemeOutcomeExplanation } from './schemeOutcomeExplanation'
import type { SchemeAction } from './types'

function cloneFactions() {
    return INITIAL_FACTIONS.map(faction => ({ ...faction }))
}

function makeResult(overrides: Partial<SchemeResult> = {}): SchemeResult {
    return {
        trustChange: 0,
        relatedTrustChange: 0,
        northDimensionChanges: {},
        feedbackText: '计成。',
        success: true,
        personEffects: {
            trustDelta: 0,
            relatedTrustDelta: 0,
            loyaltyDelta: 0,
            relatedLoyaltyDelta: 0,
            militaryPowerDelta: 0,
            alignmentShift: null,
            intelDelta: 0,
            externalStatus: null,
        },
        factionEffects: {},
        nationEffects: {},
        specialAction: null,
        northParse: {
            characterFit: 0.7,
            eventFit: 0.72,
            structuralPenetration: 0.74,
            executability: 0.68,
            exposureRisk: 0.18,
            financeRelevance: 0.2,
            grainRelevance: 0.24,
            militaryRelevance: 0.32,
            socialOrderRelevance: 0.22,
            governanceRelevance: 0.7,
            dominantIntent: 'strategize',
            evidence: [],
        },
        delayedBacklash: [],
        ...overrides,
    }
}

describe('buildSchemeOutcomeExplanation', () => {
    it('describes direct nation damage, structural pressure, and campaign progress for a court advise success', () => {
        const zuting = INITIAL_NPCS.find(npc => npc.id === 'zuting')!
        const factionsBefore = cloneFactions()
        const factionsAfter = cloneFactions()
        const action: SchemeAction = {
            targetNpcId: zuting.id,
            schemeType: 'advise',
            playerSpeech: '先把仓廪、转运与诏令节次都收回中枢，才不至于让河北豪右借乱自肥。',
        }

        const explanation = buildSchemeOutcomeExplanation({
            round: 8,
            difficulty: 'normal',
            action,
            result: makeResult({
                trustChange: 4,
                personEffects: {
                    trustDelta: 4,
                    relatedTrustDelta: 0,
                    loyaltyDelta: 0,
                    relatedLoyaltyDelta: 0,
                    militaryPowerDelta: 0,
                    alignmentShift: null,
                    intelDelta: 0,
                    externalStatus: null,
                },
                northDimensionChanges: { governance: -1.4, grain: -0.4 },
                nationEffects: { governance: -1.4, grain: -0.4 },
                northParse: {
                    characterFit: 0.76,
                    eventFit: 0.78,
                    structuralPenetration: 0.82,
                    executability: 0.74,
                    exposureRisk: 0.16,
                    financeRelevance: 0.12,
                    grainRelevance: 0.82,
                    militaryRelevance: 0.68,
                    socialOrderRelevance: 0.18,
                    governanceRelevance: 0.88,
                    dominantIntent: 'strategize',
                    evidence: [],
                },
            }),
            targetBefore: { ...zuting, trust: 64 },
            targetAfter: { ...zuting, trust: 68 },
            relatedBefore: null,
            relatedAfter: null,
            factionsBefore,
            factionsAfter,
            unlockedSecretsBefore: 0,
            unlockedSecretsAfter: 0,
            campaignMomentum: {
                round: 8,
                schemeType: 'advise',
                success: true,
                parse: {
                    characterFit: 0.76,
                    eventFit: 0.78,
                    structuralPenetration: 0.82,
                    executability: 0.74,
                    exposureRisk: 0.16,
                    financeRelevance: 0.12,
                    grainRelevance: 0.82,
                    militaryRelevance: 0.68,
                    socialOrderRelevance: 0.18,
                    governanceRelevance: 0.88,
                    dominantIntent: 'strategize',
                    evidence: [],
                },
                theater: 'shu',
                before: 0,
                after: 0.56,
                gain: 0.56,
            },
        })

        expect(explanation.segments.map(segment => segment.label)).toEqual(['直接伤国', '结构施压', '推进阈值'])
        expect(explanation.direct.text).toContain('北周治理穿透力')
        expect(explanation.structural.text).toContain('祖廷')
        expect(explanation.stateProgress.text).toContain('蜀地方向')
        expect(explanation.stateProgress.text).toContain('已见成势')
    })

    it('treats court slander as structural pressure when it does not directly harm the nation', () => {
        const zongai = INITIAL_NPCS.find(npc => npc.id === 'zongai')!
        const yuwendi = INITIAL_NPCS.find(npc => npc.id === 'yuwendi')!
        const factionsBefore = cloneFactions()
        const factionsAfter = cloneFactions().map(faction =>
            faction.id === 'emperor'
                ? { ...faction, courtInfluence: faction.courtInfluence - 2.2 }
                : faction,
        )
        const action: SchemeAction = {
            targetNpcId: zongai.id,
            relatedNpcId: yuwendi.id,
            schemeType: 'slander',
            playerSpeech: '御前近来都在疑心宇文棣借军议坐大，公若不先防，他只会更快压过内廷。',
        }

        const explanation = buildSchemeOutcomeExplanation({
            round: 12,
            difficulty: 'normal',
            action,
            result: makeResult({
                trustChange: 3,
                personEffects: {
                    trustDelta: 3,
                    relatedTrustDelta: -1,
                    loyaltyDelta: 0,
                    relatedLoyaltyDelta: 0,
                    militaryPowerDelta: 0,
                    alignmentShift: null,
                    intelDelta: 0,
                    externalStatus: null,
                },
                factionEffects: {
                    emperor: {
                        courtInfluence: -2.2,
                        internalStability: -1.4,
                        militaryPower: 0,
                    },
                },
            }),
            targetBefore: { ...zongai, trust: 61 },
            targetAfter: { ...zongai, trust: 64 },
            relatedBefore: { ...yuwendi, emperorFavor: 78, empressDowagerFavor: 22 },
            relatedAfter: { ...yuwendi, emperorFavor: 73, empressDowagerFavor: 22 },
            factionsBefore,
            factionsAfter,
            unlockedSecretsBefore: 0,
            unlockedSecretsAfter: 0,
            campaignMomentum: {
                round: 12,
                schemeType: 'slander',
                success: true,
                parse: {
                    characterFit: 0.62,
                    eventFit: 0.4,
                    structuralPenetration: 0.28,
                    executability: 0.22,
                    exposureRisk: 0.4,
                    financeRelevance: 0.08,
                    grainRelevance: 0.1,
                    militaryRelevance: 0.12,
                    socialOrderRelevance: 0.3,
                    governanceRelevance: 0.2,
                    dominantIntent: 'divide',
                    evidence: [],
                },
                theater: 'huainan',
                before: 0.18,
                after: 0.18,
                gain: 0,
            },
        })

        expect(explanation.direct.text).toContain('未直接削弱北周国力')
        expect(explanation.structural.text).toContain('疑虑')
        expect(explanation.structural.text).toContain('帝党')
        expect(explanation.stateProgress.text).toContain('战役动量未变')
    })

    it('calls out borrowed-blade progress when frame pushes a court target toward dismissal', () => {
        const zuting = INITIAL_NPCS.find(npc => npc.id === 'zuting')!
        const action: SchemeAction = {
            targetNpcId: zuting.id,
            schemeType: 'frame',
            playerSpeech: '只要把失言坐实成越权口实，御前与帘前都会一起往后退半步。',
        }

        const explanation = buildSchemeOutcomeExplanation({
            round: 12,
            difficulty: 'normal',
            action,
            result: makeResult({
                northParse: {
                    characterFit: 0.78,
                    eventFit: 0.74,
                    structuralPenetration: 0.8,
                    executability: 0.7,
                    exposureRisk: 0.14,
                    financeRelevance: 0.12,
                    grainRelevance: 0.2,
                    militaryRelevance: 0.18,
                    socialOrderRelevance: 0.3,
                    governanceRelevance: 0.56,
                    dominantIntent: 'divide',
                    evidence: [],
                },
            }),
            targetBefore: { ...zuting, emperorFavor: 36, empressDowagerFavor: 38 },
            targetAfter: { ...zuting, emperorFavor: 34, empressDowagerFavor: 35 },
            relatedBefore: null,
            relatedAfter: null,
            factionsBefore: cloneFactions(),
            factionsAfter: cloneFactions(),
            unlockedSecretsBefore: 0,
            unlockedSecretsAfter: 0,
            campaignMomentum: null,
        })

        expect(explanation.structural.text).toContain('两道庇护')
        expect(explanation.structural.text).toContain('圣眷将尽')
        expect(explanation.stateProgress.text).toContain('借刀收网')
    })

    it('treats a successful rebellion as completed state progress for an external line', () => {
        const ansiming = INITIAL_NPCS.find(npc => npc.id === 'ansiming')!
        const action: SchemeAction = {
            targetNpcId: ansiming.id,
            schemeType: 'rebellion',
            playerSpeech: '今夜举兵，不求直取洛阳，只要据地自守，北周就再难把你当成可任意调遣的藩镇。',
        }

        const explanation = buildSchemeOutcomeExplanation({
            round: 15,
            difficulty: 'normal',
            action,
            result: makeResult({
                specialAction: 'rebellion',
                nationEffects: { military: -2.8, governance: -2.2 },
                northDimensionChanges: { military: -2.8, governance: -2.2 },
                personEffects: {
                    trustDelta: 0,
                    relatedTrustDelta: 0,
                    loyaltyDelta: -6,
                    relatedLoyaltyDelta: 0,
                    militaryPowerDelta: 0,
                    alignmentShift: 'self',
                    intelDelta: 0,
                    externalStatus: 'rebellion',
                },
            }),
            targetBefore: {
                ...ansiming,
                trust: 90,
                loyaltyToCourt: 12,
                externalStatus: 'watchful',
                militaryPower: 58,
                highActionBias: 'rebellion',
            },
            targetAfter: {
                ...ansiming,
                trust: 90,
                loyaltyToCourt: 6,
                externalStatus: 'rebellion',
                militaryPower: 58,
                highActionBias: 'rebellion',
            },
            relatedBefore: null,
            relatedAfter: null,
            factionsBefore: cloneFactions(),
            factionsAfter: cloneFactions(),
            unlockedSecretsBefore: 3,
            unlockedSecretsAfter: 3,
            campaignMomentum: {
                round: 15,
                schemeType: 'rebellion',
                success: true,
                parse: {
                    characterFit: 0.8,
                    eventFit: 0.78,
                    structuralPenetration: 0.74,
                    executability: 0.68,
                    exposureRisk: 0.18,
                    financeRelevance: 0.42,
                    grainRelevance: 0.66,
                    militaryRelevance: 0.88,
                    socialOrderRelevance: 0.16,
                    governanceRelevance: 0.38,
                    dominantIntent: 'strategize',
                    evidence: [],
                },
                theater: 'huainan',
                before: 0.72,
                after: 0.9,
                gain: 0.18,
            },
        })

        expect(explanation.direct.text).toContain('北周军事')
        expect(explanation.structural.text).toContain('忠心')
        expect(explanation.stateProgress.text).toContain('造反')
        expect(explanation.stateProgress.text).toContain('明牌')
    })
})
