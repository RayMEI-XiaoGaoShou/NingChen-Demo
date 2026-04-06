import { describe, expect, it } from 'vitest'
import { INITIAL_FACTIONS } from '../data/factions'
import { INITIAL_NPCS } from '../data/npcs'
import { buildFengDaozhiDraftContext, buildFallbackFengDaozhiDraft, normalizeFengDaozhiDraft } from './fengDaozhiAdvisor'

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
        })

        expect(context.visibleSecrets).toEqual(['已知'])
        expect(context.visibleSecrets).not.toContain('未解锁')
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
})
