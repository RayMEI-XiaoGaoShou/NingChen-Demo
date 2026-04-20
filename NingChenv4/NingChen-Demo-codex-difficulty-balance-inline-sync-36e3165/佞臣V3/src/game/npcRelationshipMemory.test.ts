import { describe, expect, it } from 'vitest'
import { INITIAL_NPCS } from '../data/npcs'
import type { NPC, SchemeAction } from './types'
import type { SchemeResult } from './schemeEngine'
import {
    createRelationMemoryEntry,
    deriveRelationMemoryEntriesForRound,
    mergeRelationMemoryEntries,
    selectRelationMemoryEntries,
    summarizeRelationMemoryEntries,
} from './npcRelationshipMemory'

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
            characterFit: 0.7,
            eventFit: 0.7,
            structuralPenetration: 0.7,
            executability: 0.7,
            exposureRisk: 0.2,
            financeRelevance: 0.1,
            grainRelevance: 0.1,
            militaryRelevance: 0.1,
            socialOrderRelevance: 0.1,
            governanceRelevance: 0.1,
            dominantIntent: 'divide',
            stateBenefit: 0,
            targetBenefit: 0,
            factionBenefit: 0,
            advicePolarity: 'neutral_or_vague',
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

describe('npcRelationshipMemory', () => {
    it('creates entries for the supported relation stances', () => {
        const stances = ['suspicion', 'resentment', 'fear', 'reliance'] as const

        const entries = stances.map((stance, index) =>
            createRelationMemoryEntry({
                holderNpcId: 'holder-a',
                subjectNpcId: `subject-${index}`,
                stance,
                sourceRound: index + 1,
                importance: 2,
                summary: `${stance}:${index}`,
            }),
        )

        expect(entries.map(entry => entry.stance)).toEqual(stances)
        expect(entries[0]).toMatchObject({
            holderNpcId: 'holder-a',
            subjectNpcId: 'subject-0',
            sourceRound: 1,
            importance: 2,
            summary: 'suspicion:0',
        })
    })

    it('merges repeated holder-subject-stance memories into one ledger entry', () => {
        const ledger = mergeRelationMemoryEntries({}, [
            createRelationMemoryEntry({
                holderNpcId: 'holder-a',
                subjectNpcId: 'subject-b',
                stance: 'suspicion',
                sourceRound: 4,
                importance: 1,
                summary: 'first pass',
            }),
            createRelationMemoryEntry({
                holderNpcId: 'holder-a',
                subjectNpcId: 'subject-b',
                stance: 'suspicion',
                sourceRound: 8,
                importance: 3,
                summary: 'second pass',
            }),
        ])

        expect(ledger['holder-a']).toHaveLength(1)
        expect(ledger['holder-a'][0]).toMatchObject({
            holderNpcId: 'holder-a',
            subjectNpcId: 'subject-b',
            stance: 'suspicion',
            sourceRound: 8,
            importance: 3,
            occurrences: 2,
            summary: 'second pass',
        })
    })

    it('keeps the newer summary when an older memory merges later', () => {
        const ledger = mergeRelationMemoryEntries({}, [
            createRelationMemoryEntry({
                holderNpcId: 'holder-a',
                subjectNpcId: 'subject-b',
                stance: 'suspicion',
                sourceRound: 8,
                importance: 3,
                summary: 'newer summary',
            }),
            createRelationMemoryEntry({
                holderNpcId: 'holder-a',
                subjectNpcId: 'subject-b',
                stance: 'suspicion',
                sourceRound: 4,
                importance: 2,
                summary: 'older summary',
            }),
        ])

        expect(ledger['holder-a'][0]).toMatchObject({
            sourceRound: 8,
            importance: 3,
            occurrences: 2,
            summary: 'newer summary',
        })
    })

    it('selects the merged relation memory for a repeated A/B line', () => {
        const ledger = mergeRelationMemoryEntries({}, [
            createRelationMemoryEntry({
                holderNpcId: 'holder-a',
                subjectNpcId: 'subject-b',
                stance: 'resentment',
                sourceRound: 2,
                importance: 1,
                summary: 'old resentment',
            }),
            createRelationMemoryEntry({
                holderNpcId: 'holder-a',
                subjectNpcId: 'subject-b',
                stance: 'resentment',
                sourceRound: 6,
                importance: 3,
                summary: 'fresh resentment',
            }),
            createRelationMemoryEntry({
                holderNpcId: 'holder-a',
                subjectNpcId: 'subject-c',
                stance: 'fear',
                sourceRound: 7,
                importance: 3,
                summary: 'fear of a different subject',
            }),
        ])

        const selected = selectRelationMemoryEntries({
            ledger,
            holderNpcId: 'holder-a',
            subjectNpcId: 'subject-b',
            currentRound: 8,
        })

        expect(selected).toHaveLength(1)
        expect(selected[0]).toMatchObject({
            holderNpcId: 'holder-a',
            subjectNpcId: 'subject-b',
            stance: 'resentment',
            occurrences: 2,
        })
    })

    it('clamps selected relation memories to two entries', () => {
        const ledger = mergeRelationMemoryEntries({}, [
            createRelationMemoryEntry({
                holderNpcId: 'holder-a',
                subjectNpcId: 'subject-b',
                stance: 'suspicion',
                sourceRound: 2,
                importance: 3,
                summary: 'first relation memory',
            }),
            createRelationMemoryEntry({
                holderNpcId: 'holder-a',
                subjectNpcId: 'subject-c',
                stance: 'reliance',
                sourceRound: 3,
                importance: 2,
                summary: 'second relation memory',
            }),
            createRelationMemoryEntry({
                holderNpcId: 'holder-a',
                subjectNpcId: 'subject-d',
                stance: 'fear',
                sourceRound: 4,
                importance: 2,
                summary: 'third relation memory',
            }),
        ])

        const selected = selectRelationMemoryEntries({
            ledger,
            holderNpcId: 'holder-a',
            currentRound: 5,
            limit: 10,
        })

        expect(selected).toHaveLength(2)
    })

    it('keeps the summary concise and correctly formatted', () => {
        const summary = summarizeRelationMemoryEntries([
            createRelationMemoryEntry({
                holderNpcId: 'holder-a',
                subjectNpcId: 'subject-b',
                stance: 'suspicion',
                sourceRound: 2,
                importance: 3,
                summary: 'first relation memory',
            }),
            createRelationMemoryEntry({
                holderNpcId: 'holder-a',
                subjectNpcId: 'subject-c',
                stance: 'reliance',
                sourceRound: 3,
                importance: 2,
                summary: 'second relation memory',
            }),
            createRelationMemoryEntry({
                holderNpcId: 'holder-a',
                subjectNpcId: 'subject-d',
                stance: 'fear',
                sourceRound: 4,
                importance: 2,
                summary: 'third relation memory',
            }),
        ])

        expect(summary).toBe('疑忌：first relation memory；依赖：second relation memory')
        expect(summary).not.toContain('third relation memory')
    })

    it('derives conservative relation memories for successful slander and alienate while skipping omen and weak frame results', () => {
        const actor = { ...INITIAL_NPCS.find(item => item.id === 'zuting')! } as NPC
        const slanderTarget = { ...INITIAL_NPCS.find(item => item.id === 'yuwendi')! } as NPC
        const alienateTarget = { ...INITIAL_NPCS.find(item => item.id === 'duguwenyue')! } as NPC
        const frameTarget = { ...INITIAL_NPCS.find(item => item.id === 'zongai')! } as NPC
        const strongFrameTarget = { ...INITIAL_NPCS.find(item => item.id === 'linghuelvguang')! } as NPC
        const omenTarget = { ...INITIAL_NPCS.find(item => item.id === 'ansiming')! } as NPC
        const npcsBefore = [actor, slanderTarget, alienateTarget, frameTarget, strongFrameTarget, omenTarget]
        const npcsAfter = npcsBefore.map(npc => ({ ...npc }))

        const entries = deriveRelationMemoryEntriesForRound({
            round: 11,
            schemes: [
                {
                    targetNpcId: slanderTarget.id,
                    relatedNpcId: actor.id,
                    schemeType: 'slander',
                    playerSpeech: '他早就觉得你会先卖他。',
                },
                {
                    targetNpcId: alienateTarget.id,
                    relatedNpcId: actor.id,
                    schemeType: 'alienate',
                    playerSpeech: '他更愿意把账算到你头上。',
                },
                {
                    targetNpcId: frameTarget.id,
                    relatedNpcId: actor.id,
                    schemeType: 'frame',
                    playerSpeech: '先让他自己露出破绽，再把口实扣上。',
                },
                {
                    targetNpcId: strongFrameTarget.id,
                    relatedNpcId: actor.id,
                    schemeType: 'frame',
                    playerSpeech: '他这一步就是在自己暴露弱点。',
                },
                {
                    targetNpcId: omenTarget.id,
                    schemeType: 'omen',
                    playerSpeech: '天象本就不祥。',
                },
            ] as SchemeAction[],
            schemeResults: [
                makeSchemeResult({
                    success: true,
                    personEffects: { trustDelta: -1, relatedTrustDelta: 0, loyaltyDelta: 0, relatedLoyaltyDelta: 0, alignmentShift: null, intelDelta: 0, externalStatus: null },
                    northParse: {
                        characterFit: 0.2,
                        eventFit: 0.18,
                        structuralPenetration: 0.22,
                        executability: 0.24,
                        exposureRisk: 0.5,
                        financeRelevance: 0.1,
                        grainRelevance: 0.1,
                        militaryRelevance: 0.1,
                        socialOrderRelevance: 0.1,
                        governanceRelevance: 0.1,
                        dominantIntent: 'divide',
                        suspicionDirection: 0.12,
                        suspicionTransmission: 0.1,
                        evidence: [],
                    },
                }),
                makeSchemeResult({
                    success: true,
                    personEffects: { trustDelta: -1, relatedTrustDelta: 0, loyaltyDelta: 0, relatedLoyaltyDelta: 0, alignmentShift: null, intelDelta: 0, externalStatus: null },
                    northParse: {
                        characterFit: 0.18,
                        eventFit: 0.2,
                        structuralPenetration: 0.2,
                        executability: 0.2,
                        exposureRisk: 0.48,
                        financeRelevance: 0.1,
                        grainRelevance: 0.1,
                        militaryRelevance: 0.1,
                        socialOrderRelevance: 0.1,
                        governanceRelevance: 0.1,
                        dominantIntent: 'divide',
                        fractureTransmission: 0.1,
                        evidence: [],
                    },
                }),
                makeSchemeResult({
                    success: true,
                    northParse: {
                        characterFit: 0.82,
                        eventFit: 0.78,
                        structuralPenetration: 0.74,
                        executability: 0.72,
                        exposureRisk: 0.16,
                        financeRelevance: 0.1,
                        grainRelevance: 0.1,
                        militaryRelevance: 0.1,
                        socialOrderRelevance: 0.1,
                        governanceRelevance: 0.1,
                        dominantIntent: 'divide',
                        selfTrapPotential: 0.2,
                        scapegoatClarity: 0.2,
                        evidence: [],
                    },
                }),
                makeSchemeResult({
                    success: true,
                    personEffects: { trustDelta: -6, relatedTrustDelta: -5, loyaltyDelta: 0, relatedLoyaltyDelta: 0, alignmentShift: null, intelDelta: 0, externalStatus: null },
                    northParse: {
                        characterFit: 0.9,
                        eventFit: 0.84,
                        structuralPenetration: 0.82,
                        executability: 0.8,
                        exposureRisk: 0.12,
                        financeRelevance: 0.1,
                        grainRelevance: 0.1,
                        militaryRelevance: 0.1,
                        socialOrderRelevance: 0.1,
                        governanceRelevance: 0.1,
                        dominantIntent: 'divide',
                        selfTrapPotential: 0.9,
                        scapegoatClarity: 0.88,
                        evidence: [],
                    },
                }),
                makeSchemeResult({
                    success: true,
                    northParse: {
                        characterFit: 0.88,
                        eventFit: 0.8,
                        structuralPenetration: 0.82,
                        executability: 0.76,
                        exposureRisk: 0.14,
                        financeRelevance: 0.1,
                        grainRelevance: 0.1,
                        militaryRelevance: 0.1,
                        socialOrderRelevance: 0.1,
                        governanceRelevance: 0.1,
                        dominantIntent: 'divide',
                        omenPolarity: 'destabilizing',
                        evidence: [],
                    },
                }),
            ],
            npcsBefore,
            npcsAfter,
        })

        expect(entries).toEqual(expect.arrayContaining([
            expect.objectContaining({
                holderNpcId: slanderTarget.id,
                subjectNpcId: actor.id,
                stance: 'suspicion',
                sourceRound: 11,
            }),
            expect.objectContaining({
                holderNpcId: alienateTarget.id,
                subjectNpcId: actor.id,
                stance: expect.stringMatching(/resentment|suspicion/),
                sourceRound: 11,
            }),
        ]))
        expect(entries.find(entry => entry.subjectNpcId === frameTarget.id)).toBeUndefined()
        expect(entries).toEqual(expect.arrayContaining([
            expect.objectContaining({
                holderNpcId: strongFrameTarget.id,
                subjectNpcId: actor.id,
                stance: 'suspicion',
                sourceRound: 11,
            }),
        ]))
        expect(entries.find(entry => entry.subjectNpcId === omenTarget.id)).toBeUndefined()
    })

    it('merges repeated successful slander relation memories into one ledger entry', () => {
        const actor = { ...INITIAL_NPCS.find(item => item.id === 'zuting')! } as NPC
        const subject = { ...INITIAL_NPCS.find(item => item.id === 'yuwendi')! } as NPC

        const rawEntries = deriveRelationMemoryEntriesForRound({
            round: 12,
            schemes: [
                {
                    targetNpcId: subject.id,
                    relatedNpcId: actor.id,
                    schemeType: 'slander',
                    playerSpeech: '第一次栽赃。',
                },
                {
                    targetNpcId: subject.id,
                    relatedNpcId: actor.id,
                    schemeType: 'slander',
                    playerSpeech: '第二次栽赃。',
                },
            ] as SchemeAction[],
            schemeResults: [
                makeSchemeResult({
                    success: true,
                    personEffects: { trustDelta: -1, relatedTrustDelta: -7, loyaltyDelta: 0, relatedLoyaltyDelta: 0, alignmentShift: null, intelDelta: 0, externalStatus: null },
                    northParse: {
                        characterFit: 0.76,
                        eventFit: 0.7,
                        structuralPenetration: 0.66,
                        executability: 0.68,
                        exposureRisk: 0.18,
                        financeRelevance: 0.1,
                        grainRelevance: 0.1,
                        militaryRelevance: 0.1,
                        socialOrderRelevance: 0.1,
                        governanceRelevance: 0.1,
                        dominantIntent: 'divide',
                        suspicionDirection: 0.74,
                        suspicionTransmission: 0.76,
                        evidence: [],
                    },
                }),
                makeSchemeResult({
                    success: true,
                    personEffects: { trustDelta: -1, relatedTrustDelta: -7, loyaltyDelta: 0, relatedLoyaltyDelta: 0, alignmentShift: null, intelDelta: 0, externalStatus: null },
                    northParse: {
                        characterFit: 0.76,
                        eventFit: 0.7,
                        structuralPenetration: 0.66,
                        executability: 0.68,
                        exposureRisk: 0.18,
                        financeRelevance: 0.1,
                        grainRelevance: 0.1,
                        militaryRelevance: 0.1,
                        socialOrderRelevance: 0.1,
                        governanceRelevance: 0.1,
                        dominantIntent: 'divide',
                        suspicionDirection: 0.74,
                        suspicionTransmission: 0.76,
                        evidence: [],
                    },
                }),
            ],
            npcsBefore: [actor, subject],
            npcsAfter: [actor, subject],
        })

        const merged = mergeRelationMemoryEntries({}, rawEntries)

        expect(merged[subject.id]).toHaveLength(1)
        expect(merged[subject.id]?.[0]).toMatchObject({
            holderNpcId: subject.id,
            subjectNpcId: actor.id,
            stance: 'suspicion',
            occurrences: 2,
            sourceRound: 12,
        })
    })
})
