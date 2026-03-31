import { describe, expect, it } from 'vitest'
import { INITIAL_NPCS } from '../data/npcs'
import { getAvailableSchemesForNpc, settleScheme } from './schemeEngine'

describe('schemeEngine contextual scheme rules', () => {
    it('adds 谶纬 only on eligible rounds and targets', () => {
        const zongai = { ...INITIAL_NPCS.find(npc => npc.name === '宗艾')!, trust: 58 }
        const yuwendi = { ...INITIAL_NPCS.find(npc => npc.name === '宇文棣')!, trust: 58 }

        expect(getAvailableSchemesForNpc(zongai, { round: 13, unlockedSecrets: 1 })).toContain('omen')
        expect(getAvailableSchemesForNpc(zongai, { round: 9, unlockedSecrets: 1 })).not.toContain('omen')
        expect(getAvailableSchemesForNpc(yuwendi, { round: 13, unlockedSecrets: 1 })).toContain('omen')
    })

    it('lets war-round alienation spill into military when it hits military actors and supply language', () => {
        const weichimu = { ...INITIAL_NPCS.find(npc => npc.name === '尉迟暮')!, trust: 62 }
        const linghu = { ...INITIAL_NPCS.find(npc => npc.name === '令狐律光')!, trust: 42 }

        const warResult = settleScheme(
            {
                id: 'war-alienate',
                targetNpcId: weichimu.id,
                schemeType: 'alienate',
                relatedNpcId: linghu.id,
                playerSpeech: '前线兵权、粮道与转运若全握在河北一系手里，公纵有战功也只会替人背责。',
                resolutionRoll: 0.02,
            },
            weichimu,
            linghu,
            0,
            { round: 16, unlockedSecrets: 0 },
        )

        const calmResult = settleScheme(
            {
                id: 'calm-alienate',
                targetNpcId: weichimu.id,
                schemeType: 'alienate',
                relatedNpcId: linghu.id,
                playerSpeech: '前线兵权、粮道与转运若全握在河北一系手里，公纵有战功也只会替人背责。',
                resolutionRoll: 0.02,
            },
            weichimu,
            linghu,
            0,
            { round: 3, unlockedSecrets: 0 },
        )

        expect((warResult.nationEffects.military ?? 0) < 0).toBe(true)
        expect(Math.abs(warResult.nationEffects.military ?? 0)).toBeGreaterThan(Math.abs(calmResult.nationEffects.military ?? 0))
    })

    it('lets structurally strong speech amplify nation effects more than merely flattering speech', () => {
        const npc = { ...INITIAL_NPCS.find(candidate => candidate.name === '祖廷')!, trust: 68 }

        const flattering = settleScheme(
            {
                id: 'flattering',
                targetNpcId: npc.id,
                schemeType: 'advise',
                playerSpeech: '丞相国之柱石，还望主持大局。',
                resolutionRoll: 0.01,
            },
            { ...npc },
            null,
            0,
            { round: 8, unlockedSecrets: 1 },
        )

        const structural = settleScheme(
            {
                id: 'structural',
                targetNpcId: npc.id,
                schemeType: 'advise',
                playerSpeech: '趁灾年把仓廪、饷权与赈务并收中枢，先堵河北豪右，再反压帝党。',
                resolutionRoll: 0.01,
            },
            { ...npc },
            null,
            0,
            { round: 8, unlockedSecrets: 1 },
        )

        expect(structural.trustChange).toBeGreaterThanOrEqual(flattering.trustChange)
        expect(Math.abs(structural.nationEffects.governance ?? 0)).toBeGreaterThan(Math.abs(flattering.nationEffects.governance ?? 0))
    })

    it('tempers nation-layer damage from the same strong speech in the opening rounds', () => {
        const npc = { ...INITIAL_NPCS.find(candidate => candidate.name === '祖廷')!, trust: 68 }
        const speech = '趁灾年把仓廪、饷权与赈务并收中枢，先堵河北豪右，再反压帝党。'

        const early = settleScheme(
            {
                id: 'early-strong',
                targetNpcId: npc.id,
                schemeType: 'advise',
                playerSpeech: speech,
                resolutionRoll: 0.01,
            },
            { ...npc },
            null,
            0,
            { round: 3, unlockedSecrets: 1 },
        )

        const later = settleScheme(
            {
                id: 'later-strong',
                targetNpcId: npc.id,
                schemeType: 'advise',
                playerSpeech: speech,
                resolutionRoll: 0.01,
            },
            { ...npc },
            null,
            0,
            { round: 8, unlockedSecrets: 1 },
        )

        expect(Math.abs(early.nationEffects.governance ?? 0)).toBeLessThan(Math.abs(later.nationEffects.governance ?? 0))
    })
})
