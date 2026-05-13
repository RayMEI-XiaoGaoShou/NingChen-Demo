import { describe, expect, it } from 'vitest'
import { INITIAL_FACTIONS } from '../data/factions'
import { INITIAL_NPCS } from '../data/npcs'
import { buildFengDaozhiDraftContext } from './fengDaozhiAdvisor'
import { buildNpcPromptDynamicContext } from './npcPromptContext'
import type { CampaignState, NpcMemoryLedger } from './types'

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

describe('npc long-term memory context', () => {
    it('adds long-term memory summary to npc prompt context', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.id === 'zuting')! }
        const npcMemoryLedger: NpcMemoryLedger = {
            [npc.id]: [
                {
                    npcId: npc.id,
                    category: 'favor',
                    sourceRound: 6,
                    importance: 3,
                    summary: 'round 6 favor memory',
                    tags: ['grain'],
                },
            ],
        }

        const context = buildNpcPromptDynamicContext({
            npc,
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            roundHistory: [],
            npcMemoryLedger,
            currentRound: 7,
        })

        expect(context.longTermMemorySummary).toContain('round 6 favor memory')
    })

    it('selects different long-term memories for different scheme types', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.id === 'zuting')! }
        const npcMemoryLedger: NpcMemoryLedger = {
            [npc.id]: [
                {
                    npcId: npc.id,
                    category: 'betrayal',
                    sourceRound: 8,
                    importance: 1,
                    summary: 'betrayal memory',
                    tags: ['court'],
                },
                {
                    npcId: npc.id,
                    category: 'favor',
                    sourceRound: 6,
                    importance: 1,
                    summary: 'favor memory',
                    tags: ['trust'],
                },
            ],
        }

        const adviseContext = buildNpcPromptDynamicContext({
            npc,
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            roundHistory: [],
            npcMemoryLedger,
            currentRound: 9,
            schemeType: 'advise',
        })

        const slanderContext = buildNpcPromptDynamicContext({
            npc,
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            roundHistory: [],
            npcMemoryLedger,
            currentRound: 9,
            schemeType: 'slander',
        })

        expect(adviseContext.longTermMemorySummary).toContain('favor memory')
        expect(slanderContext.longTermMemorySummary).toContain('betrayal memory')
        expect(adviseContext.longTermMemorySummary).not.toBe(slanderContext.longTermMemorySummary)
    })

    it('adds long-term memory summary to Feng Daozhi draft context', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.id === 'zuting')! }
        const npcMemoryLedger: NpcMemoryLedger = {
            [npc.id]: [
                {
                    npcId: npc.id,
                    category: 'betrayal',
                    sourceRound: 8,
                    importance: 2,
                    summary: 'round 8 betrayal memory',
                    tags: ['court'],
                },
            ],
        }

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
            npcMemoryLedger,
        })

        expect(context.longTermMemorySummary).toContain('round 8 betrayal memory')
    })
})
