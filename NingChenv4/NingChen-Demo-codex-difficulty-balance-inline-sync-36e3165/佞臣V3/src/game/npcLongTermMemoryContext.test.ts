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
                    summary: '第6回合，你曾替他把漕运与中枢节制重新拢到一处。',
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

        expect(context.longTermMemorySummary).toContain('第6回合')
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
                    summary: '第8回合，你的谗言失手后，他记住了你会顺着裂缝下刀。',
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

        expect(context.longTermMemorySummary).toContain('第8回合')
    })
})
