import { describe, expect, it } from 'vitest'
import { INITIAL_NPCS } from '../data/npcs'
import { buildDominantExternalStageHint, buildExternalActionStageHint } from './externalActionHint'
import { buildOmenAdvisorHint } from './fengDaozhiHint'
import {
    buildAdvisorHint,
    buildBorrowedBladeAdvisorHint,
    getHighlightedNpcIds,
    getNpcRoundReaction,
    getRoundAdvisorHint,
} from './roundIntelEngine'

describe('roundIntelEngine', () => {
    it('adds a stage hint when an external target is close to secession but still lacks trust', () => {
        const hint = buildExternalActionStageHint({
            round: 7,
            npc: {
                id: 'hebabogui',
                name: '贺拔伯圭',
                trust: 61,
                loyaltyToCourt: 26,
                externalStatus: 'watchful',
                isAlive: true,
                powerBase: 'external',
                highActionBias: 'secession',
            },
            unlockedSecrets: 2,
            difficulty: 'normal',
        })

        expect(hint).toContain('养信')
        expect(hint).toContain('下一手宜')
    })

    it('merges external-action stage hints into the advisor line', () => {
        const hint = getRoundAdvisorHint(
            7,
            [{ id: 'hebabogui', name: '贺拔伯圭', isAlive: true }],
            '冯道之密语【养信】：贺拔伯圭眼下还不会为你摊牌。下一手宜 先献策。',
        )

        expect(hint).toContain('冯道之密语')
        expect(hint).toContain('养信')
    })

    it('mentions only alive key figures for the round', () => {
        const hint = buildAdvisorHint(
            {
                coreNpcIds: ['yuwendi', 'zuting', 'zongai'],
                reactions: {
                    yuwendi: '借边事催逼南征。',
                    zuting: '想把边报与流民都按在中枢手里。',
                    zongai: '借宫中信息差做接口。',
                },
            },
            [
                { id: 'yuwendi', name: '宇文棣', isAlive: true },
                { id: 'zuting', name: '祖廷', isAlive: false },
                { id: 'zongai', name: '宗艾', isAlive: true },
            ],
        )

        expect(hint).toContain('宇文棣')
        expect(hint).toContain('宗艾')
        expect(hint).not.toContain('祖廷')
    })

    it('returns only alive highlighted NPC ids for current round focus', () => {
        const focusedIds = getHighlightedNpcIds(5, [
            { id: 'hebabogui', name: '贺拔伯圭', isAlive: true },
            { id: 'duguwenyue', name: '独孤文约', isAlive: false },
            { id: 'zuting', name: '祖廷', isAlive: true },
            { id: 'yuwendi', name: '宇文棣', isAlive: true },
        ])

        expect(focusedIds).toEqual(['zuting', 'yuwendi'])
    })

    it('reveals sharper motive-facing reactions as intel depth increases', () => {
        const yuwendi = INITIAL_NPCS.find(npc => npc.id === 'yuwendi')!
        const shallow = getNpcRoundReaction(14, yuwendi, 0)
        const deep = getNpcRoundReaction(14, yuwendi, 3)

        expect(shallow).not.toEqual(deep)
        expect(deep).toContain('归政')
    })

    it('uses the revised markdown public statement for regular rounds', () => {
        const yuwendi = INITIAL_NPCS.find(npc => npc.id === 'yuwendi')!

        expect(getNpcRoundReaction(1, yuwendi, 0)).toContain('陈氏新主一介女流')
    })

    it('switches round 11 public statements by shu campaign result', () => {
        const yuwendi = INITIAL_NPCS.find(npc => npc.id === 'yuwendi')!
        const gained = getNpcRoundReaction(11, yuwendi, 0, { shuCampaignState: 'gained' })
        const failed = getNpcRoundReaction(11, yuwendi, 0, { shuCampaignState: 'failed' })

        expect(gained).toContain('蜀地已失')
        expect(failed).toContain('南陈征蜀受挫')
    })

    it('adds a borrowed-blade hint when a supported target is already near disposal', () => {
        const hint = buildBorrowedBladeAdvisorHint(
            INITIAL_NPCS.map(npc => npc.id === 'zuting' ? { ...npc, disposalStage: 'disposable' } : { ...npc }),
        )

        expect(hint).toContain('祖廷')
        expect(hint).toContain('借刀')
    })

    it('builds a dedicated omen teaching hint on the first omen round', () => {
        const hint = buildOmenAdvisorHint(13)

        expect(hint).toContain('谶')
        expect(hint).toContain('先写征兆')
    })
    it('does not let the dominant external hint keep pointing at a secessionist warlord', () => {
        const hint = buildDominantExternalStageHint({
            round: 18,
            npcs: [
                {
                    id: 'hebabogui',
                    name: '贺拔伯圭',
                    trust: 88,
                    loyaltyToCourt: 12,
                    externalStatus: 'secession',
                    isAlive: true,
                    powerBase: 'external',
                    highActionBias: 'secession',
                },
                {
                    id: 'erzhulie',
                    name: '尔朱烈',
                    trust: 68,
                    loyaltyToCourt: 29,
                    externalStatus: 'watchful',
                    isAlive: true,
                    powerBase: 'external',
                    highActionBias: 'rebellion',
                },
            ],
            intelProgress: {
                hebabogui: 3,
                erzhulie: 2,
            },
            difficulty: 'normal',
        })

        expect(hint).not.toContain('贺拔伯圭')
        expect(hint).toContain('尔朱烈')
    })
})
