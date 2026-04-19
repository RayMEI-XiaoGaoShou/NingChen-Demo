import { describe, expect, it } from 'vitest'
import { INITIAL_FACTIONS } from '../data/factions'
import { INITIAL_NPCS } from '../data/npcs'
import type { DelayedBacklash, RoundHistoryEntry } from './types'
import { buildNpcPromptDynamicContext } from './npcPromptContext'

describe('npcPromptContext', () => {
    it('remembers how the protagonist treated the npc last round', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.name === '祖廷')! }
        const roundHistory: RoundHistoryEntry[] = [{
            round: 4,
            eventName: '西征议起',
            schemeCount: 3,
            schemeSuccessCount: 2,
            keyTargets: ['祖廷'],
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
            northPower: 61,
            southPower: 46,
            summary: '本回合局势稍有变化。',
        }]

        const context = buildNpcPromptDynamicContext({
            npc,
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            roundHistory,
        })

        expect(context.previousDealings).toContain('上一回合你曾以“献策”试他')
        expect(context.previousDealings).toContain('已然得手')
    })

    it('summarizes the recent relationship temperature over the last two rounds', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.name === '宇文棣')! }
        const roundHistory: RoundHistoryEntry[] = [
            {
                round: 5,
                eventName: '西线议兵',
                schemeCount: 3,
                schemeSuccessCount: 1,
                keyTargets: ['宇文棣'],
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
                southPower: 48,
                summary: '朝中仍在争西线。',
            },
            {
                round: 6,
                eventName: '宗室争权',
                schemeCount: 3,
                schemeSuccessCount: 0,
                keyTargets: ['宇文棣'],
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
                southPower: 49,
                summary: '宗室与后党互不相让。',
            },
        ]

        const context = buildNpcPromptDynamicContext({
            npc,
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            roundHistory,
        })

        expect(context.relationshipTemperature).toContain('时而拉拢、时而敲打')
    })

    it('uses recent backlash and faction pressure to describe live court dynamics', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.name === '独孤文约')! }
        const factions = INITIAL_FACTIONS.map(faction => ({ ...faction }))
        factions[1].courtInfluence += 10
        const recentBacklash: DelayedBacklash[] = [{
            npcId: npc.id,
            npcName: npc.name,
            type: 'guarded',
            intensity: 0.52,
            summary: '独孤文约表面仍循旧章，然近来言语间已多了一层提防。',
            sourceRound: 6,
        }]

        const context = buildNpcPromptDynamicContext({
            npc,
            factions,
            roundHistory: [],
            recentBacklash,
        })

        expect(context.recentCourtFortune).toContain('近来独孤文约表面仍循旧章')
        expect(context.factionPressure).toContain('后党想把他当压舱石')
    })

    it('surfaces court favor deterioration in dynamic prompt context', () => {
        const npc = {
            ...INITIAL_NPCS.find(item => item.id === 'zuting')!,
            emperorFavor: 30,
            empressDowagerFavor: 29,
            courtStatus: 'active',
        } as any

        const context = buildNpcPromptDynamicContext({
            npc,
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            roundHistory: [],
        })

        expect(context.recentCourtFortune).toContain('御前恩宠')
        expect(context.recentCourtFortune).toContain('帘前眷顾')
    })

    it('calls out when neither side is willing to protect a court target', () => {
        const npc = {
            ...INITIAL_NPCS.find(item => item.id === 'zuting')!,
            emperorFavor: 18,
            empressDowagerFavor: 17,
            courtStatus: 'active',
        } as any

        const context = buildNpcPromptDynamicContext({
            npc,
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            roundHistory: [],
        })

        expect(context.recentCourtFortune).toContain('两边都不愿保')
    })
})
