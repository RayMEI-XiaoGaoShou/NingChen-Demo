import { describe, expect, it } from 'vitest'
import type { FengDaozhiDraftContext } from '../game/fengDaozhiAdvisor'
import { buildFengDaozhiDraftPrompt } from './prompts'

describe('buildFengDaozhiDraftPrompt summary wiring', () => {
    it('includes the shared relationship and court summaries while preserving battle and public cues', () => {
        const context: FengDaozhiDraftContext = {
            round: 8,
            eventName: '西线兵权再议',
            eventBriefing: '朝中正在争论谁来统筹西线兵权与后续接管。',
            campaignSummary: '西线的用兵与收权已把帝后两党都推到了台前。',
            schemeLabel: '献策',
            targetNpcName: '祖珽',
            targetNpcTitle: '尚书左仆射',
            targetPersona: '性急而善理政，记怨极深。',
            currentPublicStatement: '孤以为，西线兵权不可再散落于诸司之手。',
            visibleSecrets: ['他最恨旁人借战事夺中枢节制。'],
            previousDealings: '上一回合你曾以试探探他的口风。',
            relationshipTemperature: '近两回合你多以稳字开口，他对你仍在衡量。',
            recentCourtFortune: '帝后两党都想借西线再扩口子。',
            factionPressure: '后党担心兵权旁落，帝党则想借机再压中枢。',
            relationshipSummary: '上回往来：上一回合你曾以试探探他的口风。近两回合关系温度：近两回合你多以稳字开口，他对你仍在衡量。',
            courtSituationSummary: '本回合局势：朝中正在争论谁来统筹西线兵权与后续接管。战局走向：西线的用兵与收权已把帝后两党都推到了台前。公开表态：孤以为，西线兵权不可再散落于诸司之手。近来得失：帝后两党都想借西线再扩口子。派系压力：后党担心兵权旁落，帝党则想借机再压中枢。',
            playerDangerStage: 'under_watch',
        }

        const prompt = buildFengDaozhiDraftPrompt({
            context,
            schemeType: 'advise',
            relatedNpcName: '宗艾',
        })[1].content

        expect(prompt).toContain('战局摘要：西线的用兵与收权已把帝后两党都推到了台前。')
        expect(prompt).toContain('本回合公开表态：孤以为，西线兵权不可再散落于诸司之手。')
        expect(prompt).toContain('关系摘要：上回往来：上一回合你曾以试探探他的口风。')
        expect(prompt).toContain('朝局摘要：本回合局势：朝中正在争论谁来统筹西线兵权与后续接管。')
    })
})
