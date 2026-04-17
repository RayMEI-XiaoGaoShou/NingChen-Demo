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
            speech: '可借漕运与粮道名义，把南征议程拢回中枢。',
            success: true,
            longTermMemorySummary: '第6回合，你曾替他把漕运与中枢节制重新拢到一处。',
        })[1].content

        expect(prompt).toContain('长期旧账：第6回合，你曾替他把漕运与中枢节制重新拢到一处。')
    })

    it('injects long-term memory into Feng Daozhi draft prompt text', () => {
        const context: FengDaozhiDraftContext = {
            round: 9,
            eventName: '西线兵权再议',
            eventBriefing: '朝中正在争论谁来统筹西线兵权与后续接管。',
            schemeLabel: '献策',
            targetNpcName: '祖珽',
            targetNpcTitle: '尚书左仆射',
            targetPersona: '性急而善理政，记怨极深。',
            visibleSecrets: [],
            previousDealings: '上一回合你曾以试探探他的口风。',
            relationshipTemperature: '近两回合你多以稳字开口，他对你仍在掂量。',
            recentCourtFortune: '帝后两党都想借西线再撕开口子。',
            factionPressure: '后党担心兵权旁落，帝党则想借机再压中枢。',
            longTermMemorySummary: '第8回合，你的谗言失手后，他记住了你会顺着裂缝下刀。',
            playerDangerStage: 'under_watch',
        }

        const prompt = buildFengDaozhiDraftPrompt({
            context,
            schemeType: 'advise',
        })[1].content

        expect(prompt).toContain('长期旧账：第8回合，你的谗言失手后，他记住了你会顺着裂缝下刀。')
    })
})
