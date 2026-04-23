import { describe, expect, it } from 'vitest'
import { INITIAL_NPCS } from '../data/npcs'
import type { FengDaozhiDraftContext } from '../game/fengDaozhiAdvisor'
import { buildFengDaozhiDraftPrompt, buildNpcPrompt } from './prompts'

describe('long-term memory prompt injection', () => {
    it('injects long-term memory into npc prompt text', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.id === 'zuting')!, trust: 36 }

        const prompt = buildNpcPrompt({
            npc,
            schemeType: 'advise',
            speech: 'Use the grain route and the central ministries to steady the court.',
            success: true,
            longTermMemorySummary: 'round 6 favor memory',
        })[1].content

        expect(prompt).toContain('长期旧账：round 6 favor memory')
    })

    it('renders different long-term memory summaries for different scheme choices', () => {
        const npc = { ...INITIAL_NPCS.find(item => item.id === 'zuting')!, trust: 36 }

        const advisePrompt = buildNpcPrompt({
            npc,
            schemeType: 'advise',
            speech: 'Steady the court through policy and restraint.',
            success: true,
            longTermMemorySummary: 'round 6 favor memory',
        })[1].content

        const slanderPrompt = buildNpcPrompt({
            npc,
            schemeType: 'slander',
            speech: 'Turn the rumor toward his rivals.',
            success: false,
            longTermMemorySummary: 'round 8 betrayal memory',
        })[1].content

        expect(advisePrompt).toContain('round 6 favor memory')
        expect(slanderPrompt).toContain('round 8 betrayal memory')
        expect(advisePrompt).not.toBe(slanderPrompt)
    })

    it('injects long-term memory into Feng Daozhi draft prompt text', () => {
        const context: FengDaozhiDraftContext = {
            round: 9,
            eventName: 'Western campaign renegotiation',
            eventBriefing: 'The court is arguing over who should control the western line.',
            schemeLabel: 'advice',
            targetNpcName: 'Zuting',
            targetNpcTitle: 'Senior Minister',
            targetPersona: 'calculating and pragmatic',
            visibleSecrets: [],
            previousDealings: 'You tested his tone in the previous round.',
            relationshipTemperature: 'He is still weighing your intent.',
            recentCourtFortune: 'The opposing faction has started to push back.',
            factionPressure: 'Both sides are trying to use him as leverage.',
            longTermMemorySummary: 'round 8 betrayal memory',
            playerDangerStage: 'under_watch',
            strategicFocus: 'Use the court fight over the western line to hit his instinct for central control.',
            bestAngle: 'Frame the advice as a way to gather military and transport authority back into one set of hands.',
            redLine: 'Do not sound like you are openly campaigning for the emperor faction.',
            advisoryMode: '借势',
            advisoryModeGuidance: 'Borrow what he already fears and let him feel he is completing the move himself.',
        }

        const prompt = buildFengDaozhiDraftPrompt({
            context,
            schemeType: 'advise',
        })[1].content

        expect(prompt).toContain('长期旧账：round 8 betrayal memory')
    })
})
