import { afterEach, describe, expect, it, vi } from 'vitest'
import { INITIAL_NPCS } from '../data/npcs'
import { getAvailableSchemesForNpc, settleScheme } from './schemeEngine'

afterEach(() => {
    vi.restoreAllMocks()
})

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

    it('does not offer secession or rebellion again once an external warlord has already turned secessionist', () => {
        const hebabogui = {
            ...INITIAL_NPCS.find(npc => npc.id.startsWith('hebabog'))!,
            trust: 90,
            loyaltyToCourt: 10,
            externalStatus: 'secession' as const,
        }

        const schemes = getAvailableSchemesForNpc(hebabogui, { round: 18, unlockedSecrets: 3 })

        expect(schemes).not.toContain('secession')
        expect(schemes).not.toContain('rebellion')
    })

    it('does not spill military damage from non-military slander even against frontline commanders', () => {
        const weichimu = { ...INITIAL_NPCS.find(npc => npc.militaryPower === 68)!, trust: 62 }
        const linghu = { ...INITIAL_NPCS.find(npc => npc.id === 'linghuelvguang')!, trust: 55 }

        const result = settleScheme(
            {
                id: 'non-military-slander',
                targetNpcId: weichimu.id,
                schemeType: 'slander',
                relatedNpcId: linghu.id,
                playerSpeech: '他在朝中并不真心站你，不过是借你压人。',
                resolutionRoll: 0.02,
                northParse: {
                    characterFit: 0.7,
                    eventFit: 0.55,
                    structuralPenetration: 0.62,
                    executability: 0.64,
                    exposureRisk: 0.18,
                    financeRelevance: 0.08,
                    grainRelevance: 0.05,
                    militaryRelevance: 0.08,
                    socialOrderRelevance: 0.34,
                    governanceRelevance: 0.58,
                    dominantIntent: 'divide',
                    evidence: [],
                },
            },
            weichimu,
            linghu,
            0,
            { round: 16, unlockedSecrets: 0 },
        )

        expect(result.nationEffects.military ?? 0).toBe(0)
        expect(result.nationEffects.grain ?? 0).toBe(0)
        expect((result.nationEffects.governance ?? 0) < 0).toBe(true)
    })

    it('does not reduce external military strength from generic advice unless the parse marks war relevance', () => {
        const hebabogui = {
            ...INITIAL_NPCS.find(npc => npc.id.startsWith('hebabog'))!,
            trust: 72,
        }

        const genericAdvice = settleScheme(
            {
                id: 'generic-external-advise',
                targetNpcId: hebabogui.id,
                schemeType: 'advise',
                playerSpeech: '西线局势复杂，望公先稳住地方，不必让朝中再生猜疑。',
                resolutionRoll: 0.01,
                northParse: {
                    characterFit: 0.62,
                    eventFit: 0.36,
                    structuralPenetration: 0.4,
                    executability: 0.6,
                    exposureRisk: 0.12,
                    financeRelevance: 0.16,
                    grainRelevance: 0.1,
                    militaryRelevance: 0.12,
                    socialOrderRelevance: 0.42,
                    governanceRelevance: 0.55,
                    dominantIntent: 'induce',
                    evidence: [],
                },
            },
            hebabogui,
            null,
            0,
            { round: 8, unlockedSecrets: 2 },
        )

        const warAdvice = settleScheme(
            {
                id: 'war-external-advise',
                targetNpcId: hebabogui.id,
                schemeType: 'advise',
                playerSpeech: '若不先稳住兵粮、转运与前线调度，河西一线很快就会失控。',
                resolutionRoll: 0.01,
                northParse: {
                    characterFit: 0.78,
                    eventFit: 0.72,
                    structuralPenetration: 0.74,
                    executability: 0.8,
                    exposureRisk: 0.16,
                    financeRelevance: 0.32,
                    grainRelevance: 0.86,
                    militaryRelevance: 0.9,
                    socialOrderRelevance: 0.38,
                    governanceRelevance: 0.64,
                    dominantIntent: 'strategize',
                    evidence: [],
                },
            },
            hebabogui,
            null,
            0,
            { round: 16, unlockedSecrets: 2 },
        )

        expect(genericAdvice.nationEffects.finance ?? 0).toBe(0)
        expect(genericAdvice.nationEffects.military ?? 0).toBe(0)
        expect(genericAdvice.nationEffects.grain ?? 0).toBe(0)
        expect((genericAdvice.nationEffects.socialOrder ?? 0) < 0).toBe(true)
        expect((genericAdvice.nationEffects.governance ?? 0) < 0).toBe(true)
        expect((warAdvice.nationEffects.military ?? 0) < 0).toBe(true)
        expect(Math.abs(warAdvice.nationEffects.military ?? 0)).toBeGreaterThan(Math.abs(genericAdvice.nationEffects.military ?? 0))
        expect(Math.abs(warAdvice.nationEffects.grain ?? 0)).toBeGreaterThan(Math.abs(genericAdvice.nationEffects.grain ?? 0))
    })

    it('keeps settlement feedback wording in readable chinese instead of mojibake scheme names', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0)
        const zuting = { ...INITIAL_NPCS.find(npc => npc.name === '祖廷')!, trust: 68 }

        const adviseResult = settleScheme(
            {
                id: 'readable-advise',
                targetNpcId: zuting.id,
                schemeType: 'advise',
                playerSpeech: '趁灾年把仓廪、饷权与赈务并收中枢，先堵河北豪右，再反压帝党。',
                resolutionRoll: 0.01,
            },
            zuting,
            null,
            0,
            { round: 8, unlockedSecrets: 1 },
        )

        const probeResult = settleScheme(
            {
                id: 'readable-probe',
                targetNpcId: zuting.id,
                schemeType: 'probe',
                playerSpeech: '如今中枢最急的是粮、兵，还是诏令执行？',
                resolutionRoll: 0.01,
            },
            zuting,
            null,
            0,
            { round: 8, unlockedSecrets: 1 },
        )

        expect(adviseResult.feedbackText).toContain('献策')
        expect(probeResult.feedbackText).toContain('试探')
        expect(adviseResult.feedbackText).not.toContain('鐚瓥')
        expect(probeResult.feedbackText).not.toContain('璇曟帰')
    })
})
