import { describe, expect, it } from 'vitest'
import { INITIAL_NPCS } from '../data/npcs'
import type { ExternalActionReport } from './roundSettlement'
import type { SchemeResult } from './schemeEngine'
import type { SchemeAction } from './types'
import {
    buildNpcLongTermMemorySummary,
    deriveNpcMemoryEntriesForRound,
    mergeNpcMemoryEntries,
} from './npcMemoryLedger'

function makeSchemeResult(overrides: Partial<SchemeResult> = {}): SchemeResult {
    return {
        trustChange: 0,
        relatedTrustChange: 0,
        northDimensionChanges: {},
        feedbackText: '',
        success: true,
        personEffects: {
            trustDelta: 0,
            relatedTrustDelta: 0,
            loyaltyDelta: 0,
            relatedLoyaltyDelta: 0,
            alignmentShift: null,
            intelDelta: 0,
            externalStatus: null,
            militaryPowerDelta: 0,
        },
        factionEffects: {},
        nationEffects: {},
        specialAction: null,
        northParse: {
            characterFit: 0.6,
            eventFit: 0.6,
            structuralPenetration: 0.6,
            executability: 0.6,
            exposureRisk: 0.2,
            financeRelevance: 0.1,
            grainRelevance: 0.1,
            militaryRelevance: 0.1,
            socialOrderRelevance: 0.1,
            governanceRelevance: 0.1,
            dominantIntent: 'strategize',
            stateBenefit: 0.2,
            targetBenefit: 0.5,
            factionBenefit: 0.4,
            advicePolarity: 'pro_target_anti_state',
            legitimacyDirection: 0,
            omenPolarity: 'vague_or_ceremonial',
            selfTrapPotential: 0,
            scapegoatClarity: 0,
            omenAnchorStrength: 0,
            legitimacyCrack: 0,
            suspicionDirection: 0,
            suspicionTransmission: 0,
            fractureTransmission: 0,
            proxyTransmission: 0,
            evidence: [],
        },
        delayedBacklash: [],
        ...overrides,
    }
}

describe('npcMemoryLedger', () => {
    it('extracts a favor memory when a soft scheme meaningfully raises trust', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.id === 'zuting')!, trust: 42 }
        const schemes: SchemeAction[] = [{
            targetNpcId: npc.id,
            schemeType: 'advise',
                playerSpeech: '可借淮运与粮道名义，把南征议程拢回中枢。',
        }]

        const entries = deriveNpcMemoryEntriesForRound({
            round: 6,
            schemes,
            schemeResults: [
                makeSchemeResult({
                    success: true,
                    personEffects: {
                        trustDelta: 11,
                        relatedTrustDelta: 0,
                        loyaltyDelta: -4,
                        relatedLoyaltyDelta: 0,
                        alignmentShift: null,
                        intelDelta: 0,
                        externalStatus: null,
                        militaryPowerDelta: 0,
                    },
                }),
            ],
            npcsBefore: [npc],
            npcsAfter: [{ ...npc, trust: 53, loyaltyToCourt: npc.loyaltyToCourt - 4 }],
            externalActionReports: [],
        })

        expect(entries).toEqual(expect.arrayContaining([
            expect.objectContaining({
                npcId: npc.id,
                category: 'favor',
                sourceRound: 6,
            }),
        ]))
    })

    it('extracts a betrayal memory when a hard scheme fails and leaves exposed fallout', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.id === 'heba_qi')!, trust: 58 }
        const schemes: SchemeAction[] = [{
            targetNpcId: npc.id,
            schemeType: 'slander',
            playerSpeech: '澶悗鑻ュ啀绾靛瀹囨枃妫ｅ€熷崡寰佺珛濞侊紝鏈濅腑渚胯鍙﹁捣鐐夌伓銆?',
        }]

        const entries = deriveNpcMemoryEntriesForRound({
            round: 9,
            schemes,
            schemeResults: [
                makeSchemeResult({
                    success: false,
                    personEffects: {
                        trustDelta: -9,
                        relatedTrustDelta: 0,
                        loyaltyDelta: 0,
                        relatedLoyaltyDelta: 0,
                        alignmentShift: null,
                        intelDelta: 0,
                        externalStatus: null,
                        militaryPowerDelta: 0,
                    },
                    delayedBacklash: [{
                        npcId: npc.id,
                        npcName: npc.name,
                        type: 'exposed',
                        intensity: 0.68,
                        summary: '璐烘嫈鐞凡瀵熻浣犺瘽涓棌閿嬶紝杩戞潵瀵逛綘鎻愰槻鏇存繁銆?',
                        sourceRound: 9,
                    }],
                }),
            ],
            npcsBefore: [npc],
            npcsAfter: [{ ...npc, trust: 49 }],
            externalActionReports: [],
        })

        expect(entries).toEqual(expect.arrayContaining([
            expect.objectContaining({
                npcId: npc.id,
                category: 'betrayal',
                sourceRound: 9,
            }),
        ]))
    })

    it('uses causal event motion when recording hard-scheme pressure memories', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.id === 'zongai')!, trust: 58 }
        const causalMotion = 'CAUSAL_MEMORY_SENTINEL 宗艾扣住军需账册，转向御前递疑。'

        const entries = deriveNpcMemoryEntriesForRound({
            round: 10,
            schemes: [{
                targetNpcId: npc.id,
                schemeType: 'slander',
                playerSpeech: '先扣账册，再递疑心。',
            }],
            schemeResults: [
                makeSchemeResult({
                    success: true,
                    personEffects: {
                        trustDelta: -7,
                        relatedTrustDelta: 0,
                        loyaltyDelta: 0,
                        relatedLoyaltyDelta: 0,
                        alignmentShift: null,
                        intelDelta: 0,
                        externalStatus: null,
                        militaryPowerDelta: 0,
                    },
                    causalEvent: {
                        actionId: 'memory-causal',
                        actorNpcId: npc.id,
                        actorNpcName: npc.name,
                        schemeType: 'slander',
                        success: true,
                        motionText: causalMotion,
                        motionSource: 'fallback',
                        primaryDimensions: ['governance'],
                        secondaryDimensions: [],
                        effectSummary: ['北周治理穿透力-0.4'],
                        relatedImpactSummary: null,
                    },
                }),
            ],
            npcsBefore: [npc],
            npcsAfter: [{ ...npc, trust: 51 }],
            externalActionReports: [],
        })

        expect(entries).toEqual(expect.arrayContaining([
            expect.objectContaining({
                npcId: npc.id,
                category: 'warning',
                summary: expect.stringContaining('CAUSAL_MEMORY_SENTINEL'),
            }),
        ]))
    })

    it('tracks power-shift memories for successful external escalation', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.id === 'an_siming')!, externalStatus: 'loyal' as const }
        const report: ExternalActionReport = {
            npcId: npc.id,
            npcName: npc.name,
            action: 'rebellion',
            outcome: '鍑婚€€骞冲彌鍐涢槦鍚庡壊鎹竴鏂?',
            nationEffects: { military: -2.2 },
        }

        const entries = deriveNpcMemoryEntriesForRound({
            round: 18,
            schemes: [{
                targetNpcId: npc.id,
                schemeType: 'rebellion',
                playerSpeech: '鑻ユ湞涓彧鎯虫嬁浣犲～缂猴紝浣曚笉鍏堢珛鏃楀彿鑷繚銆?',
            }],
            schemeResults: [
                makeSchemeResult({
                    success: true,
                    specialAction: 'rebellion',
                }),
            ],
            npcsBefore: [npc],
            npcsAfter: [{ ...npc, externalStatus: 'rebellion' }],
            externalActionReports: [report],
        })

        expect(entries).toEqual(expect.arrayContaining([
            expect.objectContaining({
                npcId: npc.id,
                category: 'power_shift',
                sourceRound: 18,
            }),
        ]))
    })

    it('records omen-based external pressure as central suspicion and supply squeeze memory', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.powerBase === 'external' && item.militaryPower === 55)!, trust: 76 }

        const entries = deriveNpcMemoryEntriesForRound({
            round: 15,
            schemes: [{
                targetNpcId: npc.id,
                schemeType: 'omen',
                playerSpeech: '异兆已经落到边镇头上，朝里只要顺势紧一紧粮道与关防，兵心自然会先松一层。',
            }],
            schemeResults: [
                makeSchemeResult({
                    success: true,
                    northParse: { ...makeSchemeResult().northParse, omenPolarity: 'destabilizing', omenAccusationClarity: 0.84, centralSanctionLeverage: 0.82, legitimacyCrack: 0.8, suspicionDirection: 0.78, exposureRisk: 0.08, targetBenefit: 0, factionBenefit: 0 },
                    personEffects: {
                        trustDelta: 1,
                        relatedTrustDelta: 0,
                        loyaltyDelta: -4,
                        relatedLoyaltyDelta: 0,
                        alignmentShift: null,
                        intelDelta: 0,
                        externalStatus: null,
                        militaryPowerDelta: -2,
                    },
                }),
            ],
            npcsBefore: [npc],
            npcsAfter: [{ ...npc, loyaltyToCourt: npc.loyaltyToCourt - 4, militaryPower: npc.militaryPower - 2 }],
            externalActionReports: [],
        })

        expect(entries).toEqual(expect.arrayContaining([
            expect.objectContaining({
                npcId: npc.id,
                category: 'power_shift',
                sourceRound: 15,
                schemeType: 'omen',
                summary: expect.stringContaining('中枢起疑'),
            }),
        ]))

        const omenEntry = entries.find(entry =>
            entry.npcId === npc.id
            && entry.schemeType === 'omen'
            && entry.tags?.includes('pressure')
            && entry.tags?.includes('grain'),
        )
        expect(omenEntry).toBeTruthy()
        expect(omenEntry?.summary).toContain('粮道与军需')
        expect(omenEntry?.summary).toContain('御史监军')
        expect(omenEntry?.summary).toContain('怨气')
        expect(omenEntry?.tags).toEqual(expect.arrayContaining(['external', 'omen', 'grain', 'military', 'pressure']))
    })

    it('does not record the same pressure memory for weak ceremonial external omen results', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.powerBase === 'external' && item.militaryPower === 55)!, trust: 76 }

        const entries = deriveNpcMemoryEntriesForRound({
            round: 15,
            schemes: [{
                targetNpcId: npc.id,
                schemeType: 'omen',
                playerSpeech: '风声未必真切，先把话留在风里看它自己散不散。',
            }],
            schemeResults: [
                makeSchemeResult({
                    success: true,
                    northParse: {
                        ...makeSchemeResult().northParse,
                        omenPolarity: 'vague_or_ceremonial',
                        omenAccusationClarity: 0.14,
                        centralSanctionLeverage: 0.12,
                        legitimacyCrack: 0.1,
                        suspicionDirection: 0.1,
                        targetBenefit: 0,
                        factionBenefit: 0,
                    },
                    personEffects: {
                        trustDelta: 1,
                        relatedTrustDelta: 0,
                        loyaltyDelta: -1,
                        relatedLoyaltyDelta: 0,
                        alignmentShift: null,
                        intelDelta: 0,
                        externalStatus: null,
                        militaryPowerDelta: 0,
                    },
                }),
            ],
            npcsBefore: [npc],
            npcsAfter: [{ ...npc, loyaltyToCourt: npc.loyaltyToCourt - 1 }],
            externalActionReports: [],
        })

        const omenPressureEntry = entries.find(entry =>
            entry.npcId === npc.id
            && entry.schemeType === 'omen'
            && entry.tags?.includes('pressure')
            && entry.tags?.includes('grain'),
        )

        expect(omenPressureEntry).toBeUndefined()
    })

    it('summarizes the most relevant memories for prompt consumption', () => {
        const npcId = 'zuting'
        const ledger = mergeNpcMemoryEntries({}, [
            {
                npcId,
                category: 'warning',
                sourceRound: 4,
                importance: 1,
                summary: '绗?鍥炲悎锛屼綘鏇捐交杞绘暡鎵撹繃浠栥€?',
                tags: ['court'],
            },
            {
                npcId,
                category: 'favor',
                sourceRound: 6,
                importance: 3,
                summary: '绗?鍥炲悎锛屼綘鏇炬浛浠栨妸婕曡繍涓庝腑鏋㈣妭鍒堕噸鏂版嫝鍒颁竴澶勩€?',
                tags: ['grain', 'governance'],
            },
            {
                npcId,
                category: 'betrayal',
                sourceRound: 8,
                importance: 2,
                summary: '绗?鍥炲悎锛屼綘鐨勮皸瑷€澶辨墜鍚庯紝浠栬浣忎簡浣犱細椤虹潃瑁傜紳涓嬪垁銆?',
                tags: ['court'],
            },
        ])

        const summary = buildNpcLongTermMemorySummary({
            npcId,
            ledger,
            currentRound: 9,
            limit: 2,
        })

        expect(summary).toContain('绗?鍥炲悎')
        expect(summary).toContain('绗?鍥炲悎')
        expect(summary.split('；')).toHaveLength(2)
    })
})
