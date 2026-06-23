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
            relationMemorySummary: '旧账：old suspicion on the grain route x2；fresh evidence on the grain route',
            courtSituationSummary: '本回合局势：朝中正在争论谁来统筹西线兵权与后续接管。战局走向：西线的用兵与收权已把帝后两党都推到了台前。公开表态：孤以为，西线兵权不可再散落于诸司之手。近来得失：帝后两党都想借西线再扩口子。派系压力：后党担心兵权旁落，帝党则想借机再压中枢。',
            playerDangerStage: 'under_watch',
            strategicFocus: '这一步最该打的是祖珽对中枢节制的执念，而不是泛泛谈南征大势。',
            bestAngle: '顺着他最恨旁人借战事夺中枢节制这一点，把兵权与漕运统筹说成先稳章程、后定战功。',
            redLine: '别把话写成替帝党张目，也别把南征说得太直太满。',
            advisoryMode: '借势',
            advisoryModeGuidance: '借祖珽眼前最在意的章程与节制，说服他先接你的框架，再让他自己往下落刀。',
        }

        const prompt = buildFengDaozhiDraftPrompt({
            context,
            schemeType: 'advise',
            relatedNpcName: '宗艾',
        })[1].content

        expect(prompt).toContain('战局摘要：西线的用兵与收权已把帝后两党都推到了台前。')
        expect(prompt).toContain('本回合公开表态：孤以为，西线兵权不可再散落于诸司之手。')
        expect(prompt).toContain('关系摘要：上回往来：上一回合你曾以试探探他的口风。')
        expect(prompt).toContain('关系旧账：旧账：old suspicion on the grain route x2；fresh evidence on the grain route')
        expect(prompt).toContain('朝局摘要：本回合局势：朝中正在争论谁来统筹西线兵权与后续接管。')
        expect(prompt).toContain('谋士判断：这一步最该打的是祖珽对中枢节制的执念')
        expect(prompt).toContain('最佳切口：顺着他最恨旁人借战事夺中枢节制这一点')
        expect(prompt).toContain('先别踩：别把话写成替帝党张目')
        expect(prompt).toContain('这一手宜走「借势」')
    })
})
