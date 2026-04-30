import { describe, expect, it } from 'vitest'
import { INITIAL_NPCS } from '../data/npcs'
import type { SchemeCausalEventDraft } from './schemeCausalEvent'
import type { SchemeResult } from './schemeEngine'
import type { SchemeAction, WorldEventMemory } from './types'
import {
    deriveWorldEventMemoriesForRound,
    mergeWorldEventMemories,
    patchWorldMemoryLedgerForSchemeNpcAction,
    selectWorldEventMemoriesForPrompt,
    summarizeWorldEventMemories,
} from './worldEventMemory'

function makeResult(eventPatch: Partial<SchemeCausalEventDraft>, resultPatch: Partial<SchemeResult> = {}): SchemeResult {
    const event: SchemeCausalEventDraft = {
        actionId: 'scheme-1',
        actorNpcId: 'zuting',
        actorNpcName: '祖珽',
        schemeType: 'advise',
        success: true,
        motionText: '祖珽命尚书省复核京畿仓籍，又令司农寺暂收卢簿，朝中因此生疑。',
        motionSource: 'fallback',
        primaryDimensions: ['grain'],
        secondaryDimensions: ['finance'],
        effectSummary: ['北周粮赋-0.2', '北周财政-0.1'],
        relatedImpactSummary: null,
        ...eventPatch,
    }

    return {
        success: true,
        trustChange: 0,
        relatedTrustChange: 0,
        northDimensionChanges: {},
        feedbackText: '',
        personEffects: {},
        factionEffects: {},
        nationEffects: { grain: -0.2, finance: -0.1 },
        specialAction: null,
        northParse: {} as SchemeResult['northParse'],
        delayedBacklash: [],
        npcAction: { text: event.motionText, source: 'fallback' },
        causalEvent: event,
        impactTrace: null,
        relatedImpactSummary: null,
        ...resultPatch,
    } as SchemeResult
}

function scopesOf(memories: WorldEventMemory[]) {
    return memories.map(memory => memory.scope)
}

describe('worldEventMemory', () => {
    it.each(['advise', 'slander', 'frame', 'proxy'] as const)('derives court public and chronicle memories for %s', schemeType => {
        const action: SchemeAction = {
            id: 'scheme-1',
            targetNpcId: 'zuting',
            schemeType,
            playerSpeech: '借仓簿逼其露出破绽。',
        }
        const memories = deriveWorldEventMemoriesForRound({
            round: 6,
            actions: [action],
            schemeResults: [makeResult({
                schemeType,
            }, {
                factionEffects: {
                    empress: { militaryPower: 0, courtInfluence: -1, internalStability: -2 },
                },
            })],
            npcs: INITIAL_NPCS,
        })

        expect(scopesOf(memories)).toEqual(expect.arrayContaining(['court_public', 'chronicle_fact', 'faction_private']))
    })

    it('derives local rumor and south intel for external military and grain incidents', () => {
        const action: SchemeAction = {
            id: 'scheme-2',
            targetNpcId: 'duguwenyue',
            schemeType: 'secession',
            playerSpeech: '以粮道军需劝其自保。',
        }
        const memories = deriveWorldEventMemoriesForRound({
            round: 9,
            actions: [action],
            schemeResults: [makeResult({
                actionId: 'scheme-2',
                actorNpcId: 'duguwenyue',
                actorNpcName: '独孤文约',
                schemeType: 'secession',
                motionText: '独孤文约移牒重核粮道与军械，州县转运一时受阻。',
                primaryDimensions: ['grain', 'military'],
                secondaryDimensions: ['socialOrder'],
                postResolutionEvent: {
                    kind: 'external_action',
                    outcome: 'secession',
                    summary: '独孤文约收紧粮道与军械，地方转运随之受阻。',
                    actionMechanism: ['收紧粮道'],
                    counterAction: ['朝廷查问'],
                    damageMechanism: ['转运受阻'],
                },
            }, {
                nationEffects: { grain: -0.4, military: -0.3, socialOrder: -0.1 },
            })],
            npcs: INITIAL_NPCS,
        })

        expect(scopesOf(memories)).toEqual(expect.arrayContaining(['local_rumor', 'south_intel', 'chronicle_fact']))
        expect(memories.find(memory => memory.scope === 'local_rumor')?.dimensions).toEqual(['grain', 'military', 'socialOrder'])
    })

    it('cleans secret-leaking wording from derived public memories', () => {
        const action: SchemeAction = {
            id: 'scheme-3',
            targetNpcId: 'zuting',
            schemeType: 'frame',
            playerSpeech: '令其急于自辩。',
        }
        const memories = deriveWorldEventMemoriesForRound({
            round: 7,
            actions: [action],
            schemeResults: [makeResult({
                actionId: 'scheme-3',
                schemeType: 'frame',
                motionText: '萧宝颖南陈内应暗中促成此事，祖珽急调仓簿而露怯。',
            })],
            npcs: INITIAL_NPCS,
        })

        const publicSummary = summarizeWorldEventMemories(memories.filter(memory => memory.scope === 'court_public'))
        expect(publicSummary).not.toContain('南陈内应')
        expect(publicSummary).not.toContain('南陈暗线')
        expect(publicSummary).not.toContain('萧宝颖')
        expect(publicSummary).toContain('祖珽')
    })

    it('merges, limits, and patches npc action text for the same scheme', () => {
        const action: SchemeAction = {
            id: 'scheme-1',
            targetNpcId: 'zuting',
            schemeType: 'advise',
            playerSpeech: '借仓簿逼其露出破绽。',
        }
        const initial = deriveWorldEventMemoriesForRound({
            round: 4,
            actions: [action],
            schemeResults: [makeResult({})],
            npcs: INITIAL_NPCS,
        })
        const merged = mergeWorldEventMemories([], [...initial, ...initial], 3)
        expect(merged).toHaveLength(3)

        const patched = patchWorldMemoryLedgerForSchemeNpcAction(merged, {
            action,
            round: 4,
            previousMotionText: initial[0].summary,
            nextMotionText: '祖珽命度支与司农寺复核仓籍，粮簿暂押中书门下。',
        })
        expect(patched.every(memory => memory.summary.includes('祖珽命度支与司农寺复核仓籍'))).toBe(true)
    })

    it('selects only previous and visible memories for npc prompts by default', () => {
        const emperorNpc = INITIAL_NPCS.find(npc => npc.id === 'yuwendi')!
        const empressNpc = INITIAL_NPCS.find(npc => npc.id === 'zuting')!
        const ledger: WorldEventMemory[] = [
            {
                id: 'old-public',
                sourceRound: 3,
                sourceActionId: 'a',
                scope: 'court_public',
                visibility: 'public',
                involvedNpcIds: [empressNpc.id],
                affectedFactionIds: ['empress'],
                dimensions: ['finance'],
                schemeType: 'advise',
                summary: '旧日公议',
                reliability: 0.8,
                secrecyRisk: 0.1,
                tags: [],
            },
            {
                id: 'current-public',
                sourceRound: 4,
                sourceActionId: 'b',
                scope: 'court_public',
                visibility: 'public',
                involvedNpcIds: [empressNpc.id],
                affectedFactionIds: ['empress'],
                dimensions: ['grain'],
                schemeType: 'advise',
                summary: '本回合公议',
                reliability: 0.8,
                secrecyRisk: 0.1,
                tags: [],
            },
            {
                id: 'private-empress',
                sourceRound: 3,
                sourceActionId: 'c',
                scope: 'faction_private',
                visibility: 'limited',
                involvedNpcIds: [empressNpc.id],
                affectedFactionIds: ['empress'],
                dimensions: ['governance'],
                schemeType: 'slander',
                summary: '后党私议',
                reliability: 0.8,
                secrecyRisk: 0.2,
                tags: [],
            },
        ]

        const emperorView = selectWorldEventMemoriesForPrompt({
            ledger,
            scopes: ['court_public', 'faction_private'],
            currentRound: 4,
            npc: emperorNpc,
        })
        expect(summarizeWorldEventMemories(emperorView)).toContain('旧日公议')
        expect(summarizeWorldEventMemories(emperorView)).not.toContain('本回合公议')
        expect(summarizeWorldEventMemories(emperorView)).not.toContain('后党私议')

        const empressView = selectWorldEventMemoriesForPrompt({
            ledger,
            scopes: ['court_public', 'faction_private'],
            currentRound: 4,
            npc: empressNpc,
        })
        expect(summarizeWorldEventMemories(empressView)).toContain('后党私议')
    })

    it('derives public chronicle memories for hard scheme failures', () => {
        const action: SchemeAction = {
            id: 'failed-hard',
            targetNpcId: 'zuting',
            schemeType: 'slander',
            playerSpeech: '拿旧账试探祖廷。',
        }
        const memories = deriveWorldEventMemoriesForRound({
            round: 8,
            actions: [action],
            schemeResults: [makeResult({
                actionId: 'failed-hard',
                success: false,
                eventKind: 'failure',
                visibility: 'public',
                motionText: '祖珽按下话头，反令属吏收口并反查来路。',
                primaryDimensions: [],
                secondaryDimensions: [],
                effectSummary: ['祖珽信任-6'],
            } as any, {
                success: false,
                trustChange: -6,
                personEffects: {
                    trustDelta: -6,
                    relatedTrustDelta: 0,
                    loyaltyDelta: 0,
                    relatedLoyaltyDelta: 0,
                    militaryPowerDelta: 0,
                    relatedMilitaryPowerDelta: 0,
                    alignmentShift: null,
                    intelDelta: 0,
                    externalStatus: null,
                },
                nationEffects: {},
            })],
            npcs: INITIAL_NPCS,
        })

        expect(scopesOf(memories)).toEqual(expect.arrayContaining(['court_public', 'chronicle_fact', 'south_intel']))
        expect(summarizeWorldEventMemories(memories)).toContain('祖珽按下话头')
    })

    it('keeps trust-only private events out of public world memory', () => {
        const action: SchemeAction = {
            id: 'trust-private',
            targetNpcId: 'duguwenyue',
            schemeType: 'appeal',
            playerSpeech: '只求私下留一条退路。',
        }
        const memories = deriveWorldEventMemoriesForRound({
            round: 8,
            actions: [action],
            schemeResults: [makeResult({
                actionId: 'trust-private',
                actorNpcId: 'duguwenyue',
                actorNpcName: '独孤文约',
                schemeType: 'appeal',
                eventKind: 'trust_only',
                visibility: 'private',
                motionText: '独孤文约把这句话记作私下情面，暂愿为你留一线退路。',
                primaryDimensions: [],
                secondaryDimensions: [],
                effectSummary: ['独孤文约信任+5'],
            } as any, {
                trustChange: 5,
                personEffects: {
                    trustDelta: 5,
                    relatedTrustDelta: 0,
                    loyaltyDelta: 0,
                    relatedLoyaltyDelta: 0,
                    militaryPowerDelta: 0,
                    relatedMilitaryPowerDelta: 0,
                    alignmentShift: null,
                    intelDelta: 0,
                    externalStatus: null,
                },
                nationEffects: {},
            })],
            npcs: INITIAL_NPCS,
        })

        expect(memories).toEqual([])
    })

    it('keeps intel progress as south intel only', () => {
        const action: SchemeAction = {
            id: 'intel-only',
            targetNpcId: 'zuting',
            schemeType: 'probe',
            playerSpeech: '只探口风。',
        }
        const memories = deriveWorldEventMemoriesForRound({
            round: 8,
            actions: [action],
            schemeResults: [makeResult({
                actionId: 'intel-only',
                eventKind: 'intel_progress',
                visibility: 'south_intel_only',
                motionText: '祖珽在问答间露出口风，你由此摸到后党仓簿旧线。',
                primaryDimensions: [],
                secondaryDimensions: [],
                effectSummary: ['祖珽信任+3', '暗线+1'],
            } as any, {
                trustChange: 3,
                personEffects: {
                    trustDelta: 3,
                    relatedTrustDelta: 0,
                    loyaltyDelta: 0,
                    relatedLoyaltyDelta: 0,
                    militaryPowerDelta: 0,
                    relatedMilitaryPowerDelta: 0,
                    alignmentShift: null,
                    intelDelta: 1,
                    externalStatus: null,
                },
                nationEffects: {},
            })],
            npcs: INITIAL_NPCS,
        })

        expect(scopesOf(memories)).toEqual(['south_intel'])
        expect(memories[0]?.summary).toContain('祖珽在问答间露出口风')
    })
})
