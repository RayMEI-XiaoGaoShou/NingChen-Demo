import { describe, expect, it } from 'vitest'
import { INITIAL_FACTIONS } from '../data/factions'
import { INITIAL_NPCS } from '../data/npcs'
import type { CampaignState, DelayedBacklash, RoundHistoryEntry } from './types'
import { buildFengDaozhiSituationSummary } from './fengDaozhiSituationSummary'

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
})
