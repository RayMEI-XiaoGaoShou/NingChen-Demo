import { describe, expect, it } from 'vitest'
import { INITIAL_FACTIONS } from '../data/factions'
import { INITIAL_NPCS } from '../data/npcs'
import type { CampaignState, DelayedBacklash, RoundHistoryEntry } from './types'
import { buildFengDaozhiSituationSummary } from './fengDaozhiSituationSummary'
import { createRelationMemoryEntry, mergeRelationMemoryEntries } from './npcRelationshipMemory'

function makeCampaignState(overrides: Partial<CampaignState> = {}): CampaignState {
    return {
        state: 'idle',
        resolvedState: null,
        sourceRound: null,
        summary: '',
        ongoingNorthImpact: {},
        ongoingSouthImpact: {},
        remainingRounds: 0,
        ...overrides,
    }
}

describe('fengDaozhiSituationSummary', () => {
    it('collects branch-aware battlefield and court signals into one reusable situation pack', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.id === 'yuwendi')! }
        const recentBacklash: DelayedBacklash[] = [{
            npcId: npc.id,
            npcName: npc.name,
            type: 'guarded',
            intensity: 0.48,
            summary: '宇文棣表面仍循旧章，然近来语气里已多了一层提防。',
            sourceRound: 10,
        }]

        const summary = buildFengDaozhiSituationSummary({
            round: 11,
            npc,
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            unlockedSecrets: 0,
            roundHistory: [],
            recentBacklash,
            shuCampaign: makeCampaignState({
                state: 'gained',
                resolvedState: 'gained',
                sourceRound: 10,
            }),
            huainanCampaign: makeCampaignState(),
        })

        expect(summary.eventBriefing).toContain('急报入京')
        expect(summary.campaignSummary).toContain('胜机')
        expect(summary.currentPublicStatement).toContain('蜀地已失')
        expect(summary.courtSituationSummary).toContain('本回合局势：')
        expect(summary.courtSituationSummary).toContain('战局走向：')
        expect(summary.courtSituationSummary).toContain('公开表态：')
        expect(summary.courtSituationSummary).toContain('近来得失：')
        expect(summary.courtSituationSummary).toContain('派系压力：')
    })

    it('collects cross-round relationship memory into one reusable relationship summary', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.id === 'zuting')! }
        const roundHistory: RoundHistoryEntry[] = [
            {
                round: 5,
                eventName: '西征议起',
                schemeCount: 3,
                schemeSuccessCount: 2,
                keyTargets: [npc.name],
                schemeDetails: [{
                    targetNpcId: npc.id,
                    targetNpcName: npc.name,
                    schemeType: 'advise',
                    success: true,
                }],
                externalActionCount: 0,
                relationshipBreakCount: 0,
                factionCollapseCount: 0,
                invasionTriggered: false,
                northPower: 59,
                southPower: 47,
                summary: '朝中围绕西线节制再起争论。',
            },
            {
                round: 6,
                eventName: '兵部换议',
                schemeCount: 3,
                schemeSuccessCount: 0,
                keyTargets: [npc.name],
                schemeDetails: [{
                    targetNpcId: npc.id,
                    targetNpcName: npc.name,
                    schemeType: 'frame',
                    success: false,
                }],
                externalActionCount: 0,
                relationshipBreakCount: 0,
                factionCollapseCount: 0,
                invasionTriggered: false,
                northPower: 58,
                southPower: 48,
                summary: '朝中有人开始借军需与修陵互相发难。',
            },
        ]

        const summary = buildFengDaozhiSituationSummary({
            round: 7,
            npc,
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            unlockedSecrets: 0,
            roundHistory,
            recentBacklash: [],
            shuCampaign: makeCampaignState(),
            huainanCampaign: makeCampaignState(),
        })

        expect(summary.previousDealings).toContain('上一回合你曾以“设局嫁祸”试他')
        expect(summary.relationshipTemperature).toContain('时而拉拢、时而敲打')
        expect(summary.relationshipSummary).toContain('上回往来：')
        expect(summary.relationshipSummary).toContain('近两回合关系温度：')
    })

    it('surfaces only the selected A-to-B relation memory as a separate old-debt line', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.id === 'zuting')! }
        const relatedNpc = { ...INITIAL_NPCS.find(item => item.id === 'duguwenyue')! }
        const unrelatedNpc = { ...INITIAL_NPCS.find(item => item.id === 'yuwendi')! }
        const relationMemoryLedger = mergeRelationMemoryEntries({}, [
            createRelationMemoryEntry({
                holderNpcId: npc.id,
                subjectNpcId: relatedNpc.id,
                stance: 'suspicion',
                sourceRound: 4,
                importance: 2,
                summary: 'old suspicion on the grain route',
            }),
            createRelationMemoryEntry({
                holderNpcId: npc.id,
                subjectNpcId: relatedNpc.id,
                stance: 'suspicion',
                sourceRound: 7,
                importance: 3,
                summary: 'fresh evidence on the grain route',
            }),
            createRelationMemoryEntry({
                holderNpcId: npc.id,
                subjectNpcId: unrelatedNpc.id,
                stance: 'fear',
                sourceRound: 8,
                importance: 3,
                summary: 'unrelated fear memory',
            }),
        ])

        const summary = buildFengDaozhiSituationSummary({
            round: 9,
            npc,
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            unlockedSecrets: 0,
            roundHistory: [],
            recentBacklash: [],
            shuCampaign: makeCampaignState(),
            huainanCampaign: makeCampaignState(),
            relatedNpcId: relatedNpc.id,
            relationMemoryLedger,
        })

        expect(summary.relationMemorySummary).toContain('fresh evidence on the grain route')
        expect(summary.relationMemorySummary).toContain('x2')
        expect(summary.relationMemorySummary).not.toContain('unrelated fear memory')
    })
})
