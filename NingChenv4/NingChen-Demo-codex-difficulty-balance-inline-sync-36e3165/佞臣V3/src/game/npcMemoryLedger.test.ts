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
            playerSpeech: '可借漕运与粮道名义，把南征议程拢回中枢。',
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
            playerSpeech: '太后若再纵容宇文棣借南征立威，朝中便要另起炉灶。',
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
                    },
                    delayedBacklash: [{
                        npcId: npc.id,
                        npcName: npc.name,
                        type: 'exposed',
                        intensity: 0.68,
                        summary: '贺拔琪已察觉你话中藏锋，近来对你提防更深。',
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

    it('tracks power-shift memories for successful external escalation', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.id === 'an_siming')!, externalStatus: 'watchful' as const }
        const report: ExternalActionReport = {
            npcId: npc.id,
            npcName: npc.name,
            action: 'rebellion',
            outcome: '击退平叛军队后割据一方',
            nationEffects: { military: -2.2 },
        }

        const entries = deriveNpcMemoryEntriesForRound({
            round: 18,
            schemes: [{
                targetNpcId: npc.id,
                schemeType: 'rebellion',
                playerSpeech: '若朝中只想拿你填缺，何不先立旗号自保。',
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

    it('summarizes the most relevant memories for prompt consumption', () => {
        const npcId = 'zuting'
        const ledger = mergeNpcMemoryEntries({}, [
            {
                npcId,
                category: 'warning',
                sourceRound: 4,
                importance: 1,
                summary: '第4回合，你曾轻轻敲打过他。',
                tags: ['court'],
            },
            {
                npcId,
                category: 'favor',
                sourceRound: 6,
                importance: 3,
                summary: '第6回合，你曾替他把漕运与中枢节制重新拢到一处。',
                tags: ['grain', 'governance'],
            },
            {
                npcId,
                category: 'betrayal',
                sourceRound: 8,
                importance: 2,
                summary: '第8回合，你的谗言失手后，他记住了你会顺着裂缝下刀。',
                tags: ['court'],
            },
        ])

        const summary = buildNpcLongTermMemorySummary({
            npcId,
            ledger,
            currentRound: 9,
            limit: 2,
        })

        expect(summary).toContain('第6回合')
        expect(summary).toContain('第8回合')
        expect(summary).not.toContain('第4回合')
    })
})
