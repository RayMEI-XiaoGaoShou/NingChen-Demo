import { afterEach, describe, expect, it, vi } from 'vitest'
import { INITIAL_NPCS } from '../data/npcs'
import { calculateParsedSuccessRate, getAvailableSchemesForNpc, previewSchemeSuccess, settleScheme } from './schemeEngine'
import type { NorthSchemeParseResult } from './types'

afterEach(() => {
    vi.restoreAllMocks()
})

function makeNorthParse(overrides: Partial<NorthSchemeParseResult> = {}): NorthSchemeParseResult {
    return {
        characterFit: 0.72,
        eventFit: 0.64,
        structuralPenetration: 0.66,
        executability: 0.7,
        exposureRisk: 0.14,
        financeRelevance: 0.24,
        grainRelevance: 0.24,
        militaryRelevance: 0.24,
        socialOrderRelevance: 0.24,
        governanceRelevance: 0.24,
        dominantIntent: 'strategize',
        stateBenefit: 0,
        targetBenefit: 0,
        factionBenefit: 0,
        advicePolarity: 'neutral_or_vague',
        legitimacyDirection: 0,
        omenPolarity: 'vague_or_ceremonial',
        suspicionTransmission: 0,
        fractureTransmission: 0,
        proxyTransmission: 0,
        evidence: [],
        ...overrides,
    }
}

describe('schemeEngine contextual scheme rules', () => {
    it('uses the normal difficulty profile to lower low-risk success rates', () => {
        const parse: NorthSchemeParseResult = {
            characterFit: 0.8,
            eventFit: 0.7,
            structuralPenetration: 0.5,
            executability: 0.8,
            exposureRisk: 0.1,
            financeRelevance: 0.2,
            grainRelevance: 0.2,
            militaryRelevance: 0.2,
            socialOrderRelevance: 0.2,
            governanceRelevance: 0.2,
            dominantIntent: 'strategize',
            evidence: [],
        }

        const rate = calculateParsedSuccessRate('advise', 62, 30, false, parse, 'normal')

        expect(rate).toBeLessThan(0.85)
    })

    it('keeps easy above hard for the same low-risk setup', () => {
        const parse: NorthSchemeParseResult = {
            characterFit: 0.78,
            eventFit: 0.66,
            structuralPenetration: 0.48,
            executability: 0.74,
            exposureRisk: 0.12,
            financeRelevance: 0.2,
            grainRelevance: 0.2,
            militaryRelevance: 0.2,
            socialOrderRelevance: 0.2,
            governanceRelevance: 0.2,
            dominantIntent: 'strategize',
            evidence: [],
        }

        const easy = calculateParsedSuccessRate('probe', 62, 0, false, parse, 'easy')
        const hard = calculateParsedSuccessRate('probe', 62, 0, false, parse, 'hard')

        expect(easy).toBeGreaterThan(hard)
    })

    it('adds 谶纬 only on eligible rounds and targets', () => {
        const zongai = { ...INITIAL_NPCS.find(npc => npc.name === '宗艾')!, trust: 58 }
        const yuwendi = { ...INITIAL_NPCS.find(npc => npc.name === '宇文棣')!, trust: 58 }

        expect(getAvailableSchemesForNpc(zongai, { round: 13, unlockedSecrets: 1 })).toContain('omen')
        expect(getAvailableSchemesForNpc(zongai, { round: 9, unlockedSecrets: 1 })).not.toContain('omen')
        expect(getAvailableSchemesForNpc(yuwendi, { round: 13, unlockedSecrets: 1 })).toContain('omen')
    })

    it('does not offer proxy to external warlords even at high trust', () => {
        const ansiming = { ...INITIAL_NPCS.find(npc => npc.name === '安思明')!, trust: 82 }

        expect(getAvailableSchemesForNpc(ansiming, { round: 12, unlockedSecrets: 2 })).not.toContain('proxy')
    })

    it('treats titled frontier commanders as military actors even when their raw military score is below 40', () => {
        const ansiming = { ...INITIAL_NPCS.find(npc => npc.name === '安思明')!, trust: 62, militaryPower: 36 }
        const action = {
            id: 'ansiming-advise-spillover',
            targetNpcId: ansiming.id,
            schemeType: 'advise' as const,
            playerSpeech: '趁淮南军需最乱时，把转运与边备都抓回自己手里，朝廷就离不开你这一路边镇。',
            resolutionRoll: 0.01,
            northParse: makeNorthParse({
                eventFit: 0.76,
                structuralPenetration: 0.72,
                executability: 0.74,
                militaryRelevance: 0.82,
                grainRelevance: 0.68,
                governanceRelevance: 0.48,
                targetBenefit: 0.62,
                stateBenefit: -0.38,
                advicePolarity: 'pro_target_anti_state',
            }),
        }

        const titledResult = settleScheme(
            action,
            ansiming,
            null,
            0,
            { round: 16, unlockedSecrets: 1 },
        )

        const disguisedResult = settleScheme(
            {
                ...action,
                id: 'ansiming-advise-no-title-spillover',
            },
            {
                ...ansiming,
                title: '盐铁使',
            },
            null,
            0,
            { round: 16, unlockedSecrets: 1 },
        )

        expect(Math.abs(titledResult.nationEffects.military ?? 0)).toBeGreaterThan(Math.abs(disguisedResult.nationEffects.military ?? 0))
        expect(Math.abs(titledResult.nationEffects.grain ?? 0)).toBeGreaterThan(Math.abs(disguisedResult.nationEffects.grain ?? 0))
    })

    it.skip('lets war-round alienation spill into military when it hits military actors and supply language', () => {
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

    it.skip('keeps normal-mode advise lighter than easy-mode advise at the nation layer', () => {
        const npc = { ...INITIAL_NPCS.find(candidate => candidate.name === '绁栧环')!, trust: 68 }
        const speech = '瓒佺伨骞存妸浠撳华銆侀シ鏉冧笌璧堝姟骞舵敹涓灑锛屽厛鍫垫渤鍖楄豹鍙筹紝鍐嶅弽鍘嬪笣鍏氱€?'

        const easy = settleScheme(
            {
                id: 'easy-advise-damage',
                targetNpcId: npc.id,
                schemeType: 'advise',
                playerSpeech: speech,
                resolutionRoll: 0.01,
            },
            { ...npc },
            null,
            0,
            { round: 8, unlockedSecrets: 1, difficulty: 'easy' },
        )

        const normal = settleScheme(
            {
                id: 'normal-advise-damage',
                targetNpcId: npc.id,
                schemeType: 'advise',
                playerSpeech: speech,
                resolutionRoll: 0.01,
            },
            { ...npc },
            null,
            0,
            { round: 8, unlockedSecrets: 1, difficulty: 'normal' },
        )

        expect(Math.abs(normal.nationEffects.governance ?? 0)).toBeLessThan(Math.abs(easy.nationEffects.governance ?? 0))
        expect(Math.abs(normal.nationEffects.finance ?? 0)).toBeLessThanOrEqual(Math.abs(easy.nationEffects.finance ?? 0))
    })

    it('keeps normal-mode advise lighter than easy-mode advise at the nation layer with the same parsed speech', () => {
        const npc = { ...INITIAL_NPCS.find(candidate => candidate.id === 'zuting')!, trust: 68 }
        const parse: NorthSchemeParseResult = {
            characterFit: 0.82,
            eventFit: 0.72,
            structuralPenetration: 0.76,
            executability: 0.8,
            exposureRisk: 0.14,
            financeRelevance: 0.42,
            grainRelevance: 0.28,
            militaryRelevance: 0.08,
            socialOrderRelevance: 0.32,
            governanceRelevance: 0.88,
            dominantIntent: 'strategize',
            stateBenefit: -0.62,
            targetBenefit: 0.74,
            factionBenefit: 0.26,
            advicePolarity: 'pro_target_anti_state',
            legitimacyDirection: 0,
            omenPolarity: 'vague_or_ceremonial',
            evidence: [],
        }

        const easy = settleScheme(
            {
                id: 'easy-advise-damage-parsed',
                targetNpcId: npc.id,
                schemeType: 'advise',
                playerSpeech: '趁灾年把仓廪、饷权与赈务并收中枢，先堵河北豪右，再反压帝党。',
                resolutionRoll: 0.01,
                northParse: parse,
            },
            { ...npc },
            null,
            0,
            { round: 8, unlockedSecrets: 1, difficulty: 'easy' },
        )

        const normal = settleScheme(
            {
                id: 'normal-advise-damage-parsed',
                targetNpcId: npc.id,
                schemeType: 'advise',
                playerSpeech: '趁灾年把仓廪、饷权与赈务并收中枢，先堵河北豪右，再反压帝党。',
                resolutionRoll: 0.01,
                northParse: parse,
            },
            { ...npc },
            null,
            0,
            { round: 8, unlockedSecrets: 1, difficulty: 'normal' },
        )

        expect(Math.abs(normal.nationEffects.governance ?? 0)).toBeLessThan(Math.abs(easy.nationEffects.governance ?? 0))
        expect(Math.abs(normal.nationEffects.finance ?? 0)).toBeLessThanOrEqual(Math.abs(easy.nationEffects.finance ?? 0))
        expect(normal.trustChange).toBe(easy.trustChange)
    })

    it('does not offer any schemes once an external warlord has already turned secessionist', () => {
        const hebabogui = {
            ...INITIAL_NPCS.find(npc => npc.id.startsWith('hebabog'))!,
            trust: 90,
            loyaltyToCourt: 10,
            externalStatus: 'secession' as const,
        }

        const schemes = getAvailableSchemesForNpc(hebabogui, { round: 18, unlockedSecrets: 3 })

        expect(schemes).toEqual([])
    })

    it('amplifies frame fallout when the speech truly lures the target into taking the blame', () => {
        const npc = { ...INITIAL_NPCS.find(candidate => candidate.id === 'zongai')!, trust: 62 }

        const lowTrap = settleScheme(
            {
                id: 'frame-low-trap',
                targetNpcId: npc.id,
                schemeType: 'frame',
                playerSpeech: '宫中风声未必都站在你这边。',
                resolutionRoll: 0.01,
                northParse: makeNorthParse({
                    selfTrapPotential: 0.12,
                    scapegoatClarity: 0.14,
                    governanceRelevance: 0.52,
                    socialOrderRelevance: 0.46,
                }),
            },
            { ...npc },
            null,
            0,
            { round: 10, unlockedSecrets: 1 },
        )

        const highTrap = settleScheme(
            {
                id: 'frame-high-trap',
                targetNpcId: npc.id,
                schemeType: 'frame',
                playerSpeech: '只消再逼他一步，先失态的人多半便是他，最后嫌疑也会先落回他自己头上。',
                resolutionRoll: 0.01,
                northParse: makeNorthParse({
                    selfTrapPotential: 0.84,
                    scapegoatClarity: 0.88,
                    governanceRelevance: 0.52,
                    socialOrderRelevance: 0.46,
                }),
            },
            { ...npc },
            null,
            0,
            { round: 10, unlockedSecrets: 1 },
        )

        expect(Math.abs(highTrap.nationEffects.governance ?? 0)).toBeGreaterThan(Math.abs(lowTrap.nationEffects.governance ?? 0))
        expect(Math.abs(highTrap.factionEffects.emperor?.internalStability ?? 0)).toBeGreaterThan(Math.abs(lowTrap.factionEffects.emperor?.internalStability ?? 0))
        expect(highTrap.feedbackText).toMatch(/失态|背上嫌疑|露了口风|设下的局|来不及全身而退|破绽已被你轻轻带出来|落回他自己身上/)
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
                    suspicionTransmission: 0.18,
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
        expect(result.nationEffects.governance ?? 0).toBe(0)
    })

    it('keeps slander relational when suspicion does not transmit to the state layer', () => {
        const zongai = { ...INITIAL_NPCS.find(npc => npc.id === 'zongai')!, trust: 60 }
        const zuting = { ...INITIAL_NPCS.find(npc => npc.id === 'zuting')!, trust: 58 }

        const generic = settleScheme(
            {
                id: 'generic-slander-gate',
                targetNpcId: zongai.id,
                schemeType: 'slander',
                relatedNpcId: zuting.id,
                playerSpeech: '他未必真心，朝里风向也不稳，谁都可能先保自己。',
                resolutionRoll: 0.02,
                northParse: makeNorthParse({
                    dominantIntent: 'divide',
                    socialOrderRelevance: 0.32,
                    governanceRelevance: 0.44,
                    suspicionTransmission: 0.18,
                }),
            },
            zongai,
            zuting,
            0,
            { round: 11, unlockedSecrets: 1 },
        )

        const transmitted = settleScheme(
            {
                id: 'transmitted-slander-gate',
                targetNpcId: zongai.id,
                schemeType: 'slander',
                relatedNpcId: zuting.id,
                playerSpeech: '若宫里继续把诏令、粮道和担责口子都拢在一处，真出事时众人只会认定是他借你遮掩。',
                resolutionRoll: 0.02,
                northParse: makeNorthParse({
                    dominantIntent: 'divide',
                    grainRelevance: 0.46,
                    governanceRelevance: 0.72,
                    suspicionTransmission: 0.74,
                }),
            },
            { ...zongai },
            { ...zuting },
            0,
            { round: 11, unlockedSecrets: 1 },
        )

        expect(generic.relatedTrustChange).toBeLessThan(0)
        expect(generic.nationEffects.governance ?? 0).toBe(0)
        expect(generic.nationEffects.socialOrder ?? 0).toBe(0)
        expect(Math.abs(transmitted.nationEffects.governance ?? 0)).toBeGreaterThan(0)
    })

    it('lets alienate damage nation only when the fracture reaches command or logistics', () => {
        const weichimu = { ...INITIAL_NPCS.find(npc => npc.militaryPower === 68)!, trust: 62 }
        const linghu = { ...INITIAL_NPCS.find(npc => npc.id === 'linghuelvguang')!, trust: 55 }

        const personalOnly = settleScheme(
            {
                id: 'personal-alienate-gate',
                targetNpcId: weichimu.id,
                schemeType: 'alienate',
                relatedNpcId: linghu.id,
                playerSpeech: '你们未必真的一条心，到头来恐怕还是各自保名声。',
                resolutionRoll: 0.02,
                northParse: makeNorthParse({
                    dominantIntent: 'divide',
                    governanceRelevance: 0.42,
                    fractureTransmission: 0.16,
                }),
            },
            weichimu,
            linghu,
            0,
            { round: 12, unlockedSecrets: 1 },
        )

        const structural = settleScheme(
            {
                id: 'structural-alienate-gate',
                targetNpcId: weichimu.id,
                schemeType: 'alienate',
                relatedNpcId: linghu.id,
                playerSpeech: '若前线军令、粮道与接应始终分在两套人手里，真打起来时谁都不会再替谁担责。',
                resolutionRoll: 0.02,
                northParse: makeNorthParse({
                    dominantIntent: 'divide',
                    grainRelevance: 0.74,
                    militaryRelevance: 0.7,
                    governanceRelevance: 0.62,
                    fractureTransmission: 0.78,
                }),
            },
            { ...weichimu },
            { ...linghu },
            0,
            { round: 12, unlockedSecrets: 1 },
        )

        expect(personalOnly.relatedTrustChange).toBeLessThan(0)
        expect(personalOnly.nationEffects.military ?? 0).toBe(0)
        expect(personalOnly.nationEffects.grain ?? 0).toBe(0)
        expect(Math.abs(structural.nationEffects.military ?? 0)).toBeGreaterThan(0)
        expect(Math.abs(structural.nationEffects.grain ?? 0)).toBeGreaterThan(0)
    })

    it('keeps proxy mostly personal unless the borrowed knife creates public consequences', () => {
        const yuwendi = { ...INITIAL_NPCS.find(npc => npc.id === 'yuwendi')!, trust: 64 }
        const zuting = { ...INITIAL_NPCS.find(npc => npc.id === 'zuting')!, trust: 58 }

        const privatePush = settleScheme(
            {
                id: 'private-proxy-gate',
                targetNpcId: yuwendi.id,
                schemeType: 'proxy',
                relatedNpcId: zuting.id,
                playerSpeech: '殿下若愿意出手，他自然不敢多言。',
                resolutionRoll: 0.02,
                northParse: makeNorthParse({
                    dominantIntent: 'induce',
                    proxyTransmission: 0.18,
                }),
            },
            yuwendi,
            zuting,
            0,
            { round: 14, unlockedSecrets: 1 },
        )

        const publicStrike = settleScheme(
            {
                id: 'public-proxy-gate',
                targetNpcId: yuwendi.id,
                schemeType: 'proxy',
                relatedNpcId: zuting.id,
                playerSpeech: '殿下若借督粮与诏令次序公开压他，朝里自然都会看见谁在借机夺口子、谁又压不住局。',
                resolutionRoll: 0.02,
                northParse: makeNorthParse({
                    dominantIntent: 'induce',
                    financeRelevance: 0.46,
                    governanceRelevance: 0.72,
                    proxyTransmission: 0.8,
                }),
            },
            { ...yuwendi },
            { ...zuting },
            0,
            { round: 14, unlockedSecrets: 1 },
        )

        expect(privatePush.relatedTrustChange).toBeLessThan(0)
        expect(privatePush.nationEffects.governance ?? 0).toBe(0)
        expect(privatePush.nationEffects.finance ?? 0).toBe(0)
        expect(Math.abs(publicStrike.nationEffects.governance ?? 0)).toBeGreaterThan(0)
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

    it('lets pro-state court advice stabilize North instead of automatically harming it', () => {
        const npc = { ...INITIAL_NPCS.find(candidate => candidate.id === 'zuting')!, trust: 68 }

        const result = settleScheme(
            {
                id: 'pro-state-advise',
                targetNpcId: npc.id,
                schemeType: 'advise',
                playerSpeech: '先稳住仓储与转运，再整饬诏令，免得前后失序。',
                resolutionRoll: 0.01,
                northParse: makeNorthParse({
                    grainRelevance: 0.56,
                    governanceRelevance: 0.84,
                    socialOrderRelevance: 0.48,
                    stateBenefit: 0.82,
                    targetBenefit: 0.2,
                    factionBenefit: 0.08,
                    advicePolarity: 'pro_state',
                }),
            },
            npc,
            null,
            0,
            { round: 5, unlockedSecrets: 0, difficulty: 'normal' },
        )

        expect(result.success).toBe(true)
        expect(result.trustChange).toBeGreaterThan(0)
        expect((result.nationEffects.governance ?? 0)).toBeGreaterThanOrEqual(0)
    })

    it('lets private-benefit advice damage North while still buying trust', () => {
        const npc = { ...INITIAL_NPCS.find(candidate => candidate.id === 'zuting')!, trust: 68 }

        const result = settleScheme(
            {
                id: 'anti-state-advise',
                targetNpcId: npc.id,
                schemeType: 'advise',
                playerSpeech: '不妨先把兵粮与节钺抓在你自己手里，旁人有怨也只能听命。',
                resolutionRoll: 0.01,
                northParse: makeNorthParse({
                    financeRelevance: 0.52,
                    grainRelevance: 0.44,
                    governanceRelevance: 0.82,
                    stateBenefit: -0.74,
                    targetBenefit: 0.86,
                    factionBenefit: 0.54,
                    advicePolarity: 'pro_target_anti_state',
                }),
            },
            npc,
            null,
            0,
            { round: 5, unlockedSecrets: 0, difficulty: 'normal' },
        )

        expect(result.success).toBe(true)
        expect(result.trustChange).toBeGreaterThan(0)
        expect((result.nationEffects.governance ?? 0)).toBeLessThan(0)
    })

    it('keeps vague advice from strongly changing North dimensions', () => {
        const npc = { ...INITIAL_NPCS.find(candidate => candidate.id === 'zuting')!, trust: 68 }

        const result = settleScheme(
            {
                id: 'vague-advise',
                targetNpcId: npc.id,
                schemeType: 'advise',
                playerSpeech: '眼下还是先稳一稳，再慢慢看局势变化。',
                resolutionRoll: 0.01,
                northParse: makeNorthParse({
                    governanceRelevance: 0.31,
                    socialOrderRelevance: 0.28,
                    stateBenefit: 0,
                    targetBenefit: 0.12,
                    factionBenefit: 0,
                    advicePolarity: 'neutral_or_vague',
                }),
            },
            npc,
            null,
            0,
            { round: 5, unlockedSecrets: 0, difficulty: 'normal' },
        )

        expect(result.success).toBe(true)
        expect(Math.abs(result.nationEffects.governance ?? 0)).toBeLessThanOrEqual(0.2)
    })

    it('lets legitimizing omen stabilize North legitimacy-linked dimensions', () => {
        const npc = { ...INITIAL_NPCS.find(candidate => candidate.id === 'zuting')!, trust: 68 }

        const result = settleScheme(
            {
                id: 'legitimizing-omen',
                targetNpcId: npc.id,
                schemeType: 'omen',
                playerSpeech: '灾异既见，更当修德安民、整饬法统，免使流言乘隙而起。',
                resolutionRoll: 0.01,
                northParse: makeNorthParse({
                    governanceRelevance: 0.78,
                    socialOrderRelevance: 0.6,
                    legitimacyDirection: 0.76,
                    omenPolarity: 'legitimizing',
                }),
            },
            npc,
            null,
            0,
            { round: 14, unlockedSecrets: 0, difficulty: 'normal' },
        )

        expect(result.success).toBe(true)
        expect((result.nationEffects.governance ?? 0)).toBeGreaterThanOrEqual(0)
    })

    it('lets an answered follow-up flip a marginal failure into success', () => {
        const npc = { ...INITIAL_NPCS.find(candidate => candidate.id === 'zuting')!, trust: 44 }
        const northParse = makeNorthParse({
            characterFit: 0.24,
            eventFit: 0.22,
            structuralPenetration: 0.3,
            executability: 0.28,
            exposureRisk: 0.2,
            financeRelevance: 0.22,
            grainRelevance: 0.18,
            militaryRelevance: 0.08,
            socialOrderRelevance: 0.24,
            governanceRelevance: 0.34,
            dominantIntent: 'neutral',
        })
        const baseRate = calculateParsedSuccessRate('advise', npc.trust, 30, false, northParse, 'normal')
        const roll = Math.min(0.97, Number((baseRate + 0.03).toFixed(2)))

        const withoutFollowUp = settleScheme(
            {
                id: 'follow-up-success-base',
                targetNpcId: npc.id,
                schemeType: 'advise',
                playerSpeech: '先把仓储与转运摸清，再看谁在中途卡手。',
                resolutionRoll: roll,
                northParse,
            },
            { ...npc },
            null,
            0,
            { round: 8, unlockedSecrets: 0, difficulty: 'normal' },
        )

        const withFollowUp = settleScheme(
            {
                id: 'follow-up-success-boosted',
                targetNpcId: npc.id,
                schemeType: 'advise',
                playerSpeech: '先把仓储与转运摸清，再看谁在中途卡手。',
                resolutionRoll: roll,
                northParse,
                followUp: {
                    questionText: '你到底想我先盯哪一头？',
                    playerReply: '先盯转运口与催运的人名，这样既不惊动旁人，也能把口子收窄。',
                    parse: {
                        clarificationFit: 0.82,
                        npcInterestFit: 0.78,
                        pressureControl: 0.76,
                        contradictionRisk: 0.08,
                        exposureRiskDelta: -0.02,
                        successRateDelta: 0.08,
                        effectMultiplierDelta: 0,
                        evidence: ['追问后口子收窄'],
                    },
                    finalNpcReply: '这话比先前扎实些。',
                    status: 'answered',
                },
            },
            { ...npc },
            null,
            0,
            { round: 8, unlockedSecrets: 0, difficulty: 'normal' },
        )

        expect(withoutFollowUp.success).toBe(false)
        expect(withFollowUp.success).toBe(true)
    })

    it('applies answered follow-up success delta even when preview uses a context northParse', () => {
        const npc = { ...INITIAL_NPCS.find(candidate => candidate.id === 'zuting')!, trust: 44 }
        const northParse = makeNorthParse({
            characterFit: 0.24,
            eventFit: 0.22,
            structuralPenetration: 0.3,
            executability: 0.28,
            exposureRisk: 0.2,
            dominantIntent: 'neutral',
        })
        const baseRate = calculateParsedSuccessRate('advise', npc.trust, 30, false, northParse, 'normal')
        const roll = Math.min(0.97, Number((baseRate + 0.03).toFixed(2)))
        const action = {
            id: 'preview-follow-up-context',
            targetNpcId: npc.id,
            schemeType: 'advise' as const,
            playerSpeech: '先把仓储与转运摸清，再看谁在中途卡手。',
            resolutionRoll: roll,
            followUp: {
                questionText: '你到底想我先盯哪一头？',
                playerReply: '先盯转运口与催运的人名，这样既不惊动旁人，也能把口子收窄。',
                parse: {
                    clarificationFit: 0.82,
                    npcInterestFit: 0.78,
                    pressureControl: 0.76,
                    contradictionRisk: 0.08,
                    exposureRiskDelta: -0.02,
                    successRateDelta: 0.08,
                    effectMultiplierDelta: 0,
                    evidence: ['追问后口子收窄'],
                },
                finalNpcReply: '这话比先前扎实些。',
                status: 'answered' as const,
            },
        }

        expect(previewSchemeSuccess(
            { ...action, followUp: undefined },
            { ...npc },
            0,
            roll,
            { round: 8, difficulty: 'normal', northParse },
        )).toBe(false)

        expect(previewSchemeSuccess(
            action,
            { ...npc },
            0,
            roll,
            { round: 8, difficulty: 'normal', northParse },
        )).toBe(true)
    })

    it('amplifies nation-layer fallout when a successful scheme has a positive follow-up effect multiplier', () => {
        const npc = { ...INITIAL_NPCS.find(candidate => candidate.id === 'zuting')!, trust: 68 }
        const northParse = makeNorthParse({
            financeRelevance: 0.52,
            grainRelevance: 0.44,
            governanceRelevance: 0.82,
            socialOrderRelevance: 0.36,
            stateBenefit: -0.74,
            targetBenefit: 0.86,
            factionBenefit: 0.54,
            advicePolarity: 'pro_target_anti_state',
        })

        const withoutFollowUp = settleScheme(
            {
                id: 'follow-up-effect-base',
                targetNpcId: npc.id,
                schemeType: 'advise',
                playerSpeech: '不妨先把兵粮与节钱抓在你自己手里，旁人有怨也只能听命。',
                resolutionRoll: 0.01,
                northParse,
            },
            { ...npc },
            null,
            0,
            { round: 14, unlockedSecrets: 0, difficulty: 'normal' },
        )

        const withFollowUp = settleScheme(
            {
                id: 'follow-up-effect-boosted',
                targetNpcId: npc.id,
                schemeType: 'advise',
                playerSpeech: '不妨先把兵粮与节钱抓在你自己手里，旁人有怨也只能听命。',
                resolutionRoll: 0.01,
                northParse,
                followUp: {
                    questionText: '这步真能替我挡住后手？',
                    playerReply: '先把口子收回中枢簿册，再借你亲裁名义压住外议，后手自然落在别人身上。',
                    parse: {
                        clarificationFit: 0.76,
                        npcInterestFit: 0.84,
                        pressureControl: 0.72,
                        contradictionRisk: 0.1,
                        exposureRiskDelta: 0,
                        successRateDelta: 0,
                        effectMultiplierDelta: 0.18,
                        evidence: ['追问后收益更可执行'],
                    },
                    finalNpcReply: '这步若真照你说的压下去，分量确会不同。',
                    status: 'answered',
                },
            },
            { ...npc },
            null,
            0,
            { round: 14, unlockedSecrets: 0, difficulty: 'normal' },
        )

        expect(withoutFollowUp.success).toBe(true)
        expect(withFollowUp.success).toBe(true)
        expect(Math.abs(withFollowUp.nationEffects.governance ?? 0)).toBeGreaterThan(Math.abs(withoutFollowUp.nationEffects.governance ?? 0))
    })

    it('lets destabilizing omen damage North legitimacy-linked dimensions', () => {
        const npc = { ...INITIAL_NPCS.find(candidate => candidate.id === 'zuting')!, trust: 68 }

        const result = settleScheme(
            {
                id: 'destabilizing-omen',
                targetNpcId: npc.id,
                schemeType: 'omen',
                playerSpeech: '灾异既著，名分已摇，若再强压，只会叫上下都疑心天命不在朝廷。',
                resolutionRoll: 0.01,
                northParse: makeNorthParse({
                    governanceRelevance: 0.84,
                    socialOrderRelevance: 0.62,
                    legitimacyDirection: -0.88,
                    omenPolarity: 'destabilizing',
                }),
            },
            npc,
            null,
            0,
            { round: 14, unlockedSecrets: 0, difficulty: 'normal' },
        )

        expect(result.success).toBe(true)
        expect((result.nationEffects.governance ?? 0)).toBeLessThan(0)
    })

    it('keeps ceremonial omen from strongly changing North dimensions', () => {
        const npc = { ...INITIAL_NPCS.find(candidate => candidate.id === 'zuting')!, trust: 68 }

        const result = settleScheme(
            {
                id: 'vague-omen',
                targetNpcId: npc.id,
                schemeType: 'omen',
                playerSpeech: '近来风声不对，朝里最好低调些。',
                resolutionRoll: 0.01,
                northParse: makeNorthParse({
                    governanceRelevance: 0.3,
                    socialOrderRelevance: 0.22,
                    legitimacyDirection: 0,
                    omenPolarity: 'vague_or_ceremonial',
                }),
            },
            npc,
            null,
            0,
            { round: 14, unlockedSecrets: 0, difficulty: 'normal' },
        )

        expect(result.success).toBe(true)
        expect(Math.abs(result.nationEffects.governance ?? 0)).toBeLessThanOrEqual(0.2)
    })
})
