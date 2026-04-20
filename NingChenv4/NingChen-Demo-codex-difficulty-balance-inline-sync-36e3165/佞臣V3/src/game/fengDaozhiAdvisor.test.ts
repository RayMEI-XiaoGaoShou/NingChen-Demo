import { describe, expect, it } from 'vitest'
import { INITIAL_FACTIONS } from '../data/factions'
import { INITIAL_NPCS } from '../data/npcs'
import type { CampaignState, NpcMemoryLedger } from './types'
import { buildFengDaozhiDraftContext, buildFallbackFengDaozhiDraft, normalizeFengDaozhiDraft } from './fengDaozhiAdvisor'

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

describe('fengDaozhiAdvisor', () => {
    it('does not leak locked secret threads into Feng Daozhi context', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.id === 'zuting')!, secretThreads: ['已知', '未解锁'] }
        const context = buildFengDaozhiDraftContext({
            request: {
                round: 8,
                difficulty: 'normal',
                targetNpcId: npc.id,
                schemeType: 'advise',
                playerDangerStage: 'safe',
            },
            npc,
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            unlockedSecrets: 1,
            roundHistory: [],
            recentBacklash: [],
            shuCampaign: makeCampaignState(),
            huainanCampaign: makeCampaignState(),
        })

        expect(context.visibleSecrets).toEqual(['已知'])
        expect(context.visibleSecrets).not.toContain('未解锁')
    })

    it('uses a shared situation summary pack for branch rounds', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.id === 'yuwendi')! }
        const context = buildFengDaozhiDraftContext({
            request: {
                round: 11,
                difficulty: 'normal',
                targetNpcId: npc.id,
                schemeType: 'advise',
                playerDangerStage: 'safe',
            },
            npc,
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            unlockedSecrets: 0,
            roundHistory: [],
            recentBacklash: [],
            shuCampaign: makeCampaignState({
                state: 'gained',
                resolvedState: 'gained',
                sourceRound: 10,
            }),
            huainanCampaign: makeCampaignState(),
        })

        expect(context.eventBriefing).toContain('急报入京')
        expect(context.campaignSummary).toContain('胜机')
        expect(context.currentPublicStatement).toContain('蜀地已失')
        expect(context.courtSituationSummary).toContain('战局走向：')
        expect(context.courtSituationSummary).toContain('公开表态：')
    })

    it('normalizes omen drafts into dual-step output', () => {
        const draft = normalizeFengDaozhiDraft({
            primaryText: '石人一只眼，挑动黄河天下反。',
            secondaryText: '这不是孤立天灾，恐是朝中名分失序之兆。',
        }, 'omen')

        expect(draft).toEqual({
            primaryText: '石人一只眼，挑动黄河天下反。',
            secondaryText: '这不是孤立天灾，恐是朝中名分失序之兆。',
            source: 'ai',
        })
    })

    it('builds a fallback omen draft when remote drafting is unavailable', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.id === 'zongai')! }
        const context = buildFengDaozhiDraftContext({
            request: {
                round: 13,
                difficulty: 'normal',
                targetNpcId: npc.id,
                schemeType: 'omen',
                playerDangerStage: 'safe',
                omenSpeechInput: {
                    omenText: '',
                    interpretationText: '',
                },
            },
            npc,
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            unlockedSecrets: 0,
            roundHistory: [],
            recentBacklash: [],
            shuCampaign: makeCampaignState(),
            huainanCampaign: makeCampaignState(),
        })

        const fallback = buildFallbackFengDaozhiDraft({
            round: 13,
            difficulty: 'normal',
            targetNpcId: npc.id,
            schemeType: 'omen',
            playerDangerStage: 'safe',
            omenSpeechInput: {
                omenText: '',
                interpretationText: '',
            },
        }, context)

        expect(fallback.primaryText.length).toBeGreaterThan(0)
        expect(fallback.secondaryText?.length).toBeGreaterThan(0)
        expect(fallback.reasoning).toContain('名分与法统压力')
        expect(fallback.source).toBe('fallback')
    })

    it('passes scheme type through so old debts change by draft type', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.id === 'zuting')! }
        const npcMemoryLedger: NpcMemoryLedger = {
            [npc.id]: [
                {
                    npcId: npc.id,
                    category: 'favor',
                    sourceRound: 6,
                    importance: 1,
                    summary: 'advise memory',
                    tags: ['trust', 'soft'],
                },
                {
                    npcId: npc.id,
                    category: 'betrayal',
                    sourceRound: 7,
                    importance: 1,
                    summary: 'slander memory',
                    tags: ['pressure', 'hard'],
                },
                {
                    npcId: npc.id,
                    category: 'power_shift',
                    sourceRound: 8,
                    importance: 1,
                    summary: 'omen memory',
                    tags: ['legitimacy', 'pressure'],
                },
            ],
        }

        const buildContext = (schemeType: 'advise' | 'slander' | 'omen') => buildFengDaozhiDraftContext({
            request: {
                round: 9,
                difficulty: 'normal',
                targetNpcId: npc.id,
                schemeType,
                playerDangerStage: 'safe',
            },
            npc,
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            unlockedSecrets: 0,
            roundHistory: [],
            recentBacklash: [],
            shuCampaign: makeCampaignState(),
            huainanCampaign: makeCampaignState(),
            npcMemoryLedger,
        })

        expect(buildContext('advise').longTermMemorySummary).toMatch(/^advise memory/)
        expect(buildContext('slander').longTermMemorySummary).toMatch(/^slander memory/)
        expect(buildContext('omen').longTermMemorySummary).toMatch(/^omen memory/)
    })

    it('keeps selected old debts out of summary fields so drafts do not over-weight them', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.id === 'zuting')! }
        const context = buildFengDaozhiDraftContext({
            request: {
                round: 9,
                difficulty: 'normal',
                targetNpcId: npc.id,
                schemeType: 'advise',
                playerDangerStage: 'safe',
            },
            npc,
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            unlockedSecrets: 0,
            roundHistory: [],
            recentBacklash: [],
            shuCampaign: makeCampaignState(),
            huainanCampaign: makeCampaignState(),
            npcMemoryLedger: {
                [npc.id]: [{
                    npcId: npc.id,
                    category: 'favor',
                    sourceRound: 6,
                    importance: 3,
                    summary: 'unique old debt memory',
                    tags: ['trust', 'soft'],
                }],
            },
        })

        expect(context.longTermMemorySummary).toBe('unique old debt memory')
        expect(context.relationshipSummary).not.toContain('unique old debt memory')
        expect(context.courtSituationSummary).not.toContain('unique old debt memory')
    })
})
