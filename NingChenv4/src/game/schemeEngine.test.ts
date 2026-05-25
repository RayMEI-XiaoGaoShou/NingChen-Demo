import { afterEach, describe, expect, it, vi } from 'vitest'
import { INITIAL_NPCS } from '../data/npcs'
import { calculateParsedSuccessRate, getAvailableSchemesForNpc, previewSchemeSuccess, settleScheme } from './schemeEngine'
import { getRevealedSecretThreadForScheme } from './revealedSecretThread'
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

describe('getRevealedSecretThreadForScheme', () => {
    it('uses the current intel cursor only for successful probes', () => {
        const npc = INITIAL_NPCS.find(candidate => candidate.id === 'zuting')!

        expect(getRevealedSecretThreadForScheme({
            npc,
            schemeType: 'probe',
            success: true,
            currentUnlockedSecrets: 0,
        })).toBe(npc.secretThreads[0])
        expect(getRevealedSecretThreadForScheme({
            npc,
            schemeType: 'probe',
            success: true,
            currentUnlockedSecrets: 1,
        })).toBe(npc.secretThreads[1])
        expect(getRevealedSecretThreadForScheme({
            npc,
            schemeType: 'advise',
            success: true,
            currentUnlockedSecrets: 0,
        })).toBeNull()
        expect(getRevealedSecretThreadForScheme({
            npc,
            schemeType: 'probe',
            success: false,
            currentUnlockedSecrets: 0,
        })).toBeNull()
        expect(getRevealedSecretThreadForScheme({
            npc,
            schemeType: 'probe',
            success: true,
            currentUnlockedSecrets: npc.secretThreads.length,
        })).toBeNull()
    })
})

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

    it('keeps omen success independent of target trust while still responding to parse quality', () => {
        const parse = makeNorthParse({
            omenAnchorStrength: 0.22,
            legitimacyCrack: 0.18,
            suspicionDirection: 0.16,
            eventFit: 0.22,
            exposureRisk: 0.2,
        })

        const lowTrust = calculateParsedSuccessRate('omen', 20, 0, false, parse, 'normal')
        const highTrust = calculateParsedSuccessRate('omen', 88, 0, false, parse, 'normal')
        const strongerParse = calculateParsedSuccessRate('omen', 20, 0, false, makeNorthParse({
            omenAnchorStrength: 0.7,
            legitimacyCrack: 0.66,
            suspicionDirection: 0.52,
            eventFit: 0.62,
            exposureRisk: 0.08,
        }), 'normal')

        expect(highTrust).toBeCloseTo(lowTrust, 5)
        expect(strongerParse).toBeGreaterThan(lowTrust)
    })

    it('keeps omen difficulty-sensitive without reintroducing trust bonuses', () => {
        const parse = makeNorthParse({
            omenAnchorStrength: 0.58,
            legitimacyCrack: 0.54,
            suspicionDirection: 0.42,
            eventFit: 0.46,
            exposureRisk: 0.12,
        })

        const easy = calculateParsedSuccessRate('omen', 18, 0, false, parse, 'easy')
        const hard = calculateParsedSuccessRate('omen', 18, 0, false, parse, 'hard')

        expect(easy).toBeGreaterThan(hard)
    })

    it('still lets non-omen schemes benefit from higher trust', () => {
        const parse = makeNorthParse({
            characterFit: 0.34,
            eventFit: 0.3,
            structuralPenetration: 0.26,
            executability: 0.28,
            exposureRisk: 0.18,
        })

        const lowTrust = calculateParsedSuccessRate('advise', 22, 30, false, parse, 'normal')
        const highTrust = calculateParsedSuccessRate('advise', 82, 30, false, parse, 'normal')

        expect(highTrust).toBeGreaterThan(lowTrust)
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

    it('routes high-quality court advice through every strongly mentioned dimension with top dimensions hitting hardest', () => {
        const npc = { ...INITIAL_NPCS.find(candidate => candidate.id === 'zuting')!, trust: 72 }
        const result = settleScheme(
            {
                id: 'complex-court-advice',
                targetNpcId: npc.id,
                schemeType: 'advise',
                playerSpeech: '可借核账收财政，断粮道稳转运，再把军令与军需调度并入中枢，顺势压住河北流民与诏令乱口。',
                resolutionRoll: 0.01,
                northParse: makeNorthParse({
                    characterFit: 0.88,
                    eventFit: 0.84,
                    structuralPenetration: 0.9,
                    executability: 0.86,
                    financeRelevance: 0.56,
                    grainRelevance: 0.88,
                    militaryRelevance: 0.92,
                    socialOrderRelevance: 0.48,
                    governanceRelevance: 0.62,
                    stateBenefit: -0.78,
                    targetBenefit: 0.82,
                    advicePolarity: 'pro_target_anti_state',
                }),
            },
            { ...npc },
            null,
            0,
            { round: 14, unlockedSecrets: 2, difficulty: 'normal' },
        )

        expect(result.nationEffects.finance ?? 0).toBeLessThan(0)
        expect(result.nationEffects.grain ?? 0).toBeLessThan(0)
        expect(result.nationEffects.military ?? 0).toBeLessThan(0)
        expect(result.nationEffects.socialOrder ?? 0).toBeLessThan(0)
        expect(result.nationEffects.governance ?? 0).toBeLessThan(0)
        expect(Math.abs(result.nationEffects.military ?? 0)).toBeGreaterThan(Math.abs(result.nationEffects.finance ?? 0))
        expect(Math.abs(result.nationEffects.grain ?? 0)).toBeGreaterThan(Math.abs(result.nationEffects.socialOrder ?? 0))
        expect(result.npcAction?.text).toBeTruthy()
    })

    it('keeps focused court advice from leaking into unmentioned dimensions', () => {
        const npc = { ...INITIAL_NPCS.find(candidate => candidate.id === 'zuting')!, trust: 72 }
        const result = settleScheme(
            {
                id: 'focused-court-advice',
                targetNpcId: npc.id,
                schemeType: 'advise',
                playerSpeech: '只从度支账册入手，先把国库亏空与饷银去向查清。',
                resolutionRoll: 0.01,
                northParse: makeNorthParse({
                    characterFit: 0.82,
                    eventFit: 0.72,
                    structuralPenetration: 0.78,
                    executability: 0.8,
                    financeRelevance: 0.9,
                    grainRelevance: 0.18,
                    militaryRelevance: 0.12,
                    socialOrderRelevance: 0.16,
                    governanceRelevance: 0.22,
                    stateBenefit: -0.52,
                    targetBenefit: 0.72,
                    advicePolarity: 'pro_target_anti_state',
                }),
            },
            { ...npc },
            null,
            0,
            { round: 14, unlockedSecrets: 2, difficulty: 'normal' },
        )

        expect(result.nationEffects.finance ?? 0).toBeLessThan(0)
        expect(result.nationEffects.grain ?? 0).toBe(0)
        expect(result.nationEffects.military ?? 0).toBe(0)
        expect(result.nationEffects.socialOrder ?? 0).toBe(0)
        expect(result.nationEffects.governance ?? 0).toBe(0)
    })

    it('narrates successful probe intel progress as npc口风', () => {
        const npc = { ...INITIAL_NPCS.find(candidate => candidate.id === 'zuting')!, trust: 54 }
        const result = settleScheme(
            {
                id: 'trust-only-probe',
                targetNpcId: npc.id,
                schemeType: 'probe',
                playerSpeech: '只问一句风向，看看他是否愿意多吐半句口风。',
                resolutionRoll: 0.01,
                northParse: makeNorthParse({
                    characterFit: 0.78,
                    eventFit: 0.42,
                    structuralPenetration: 0.18,
                    executability: 0.82,
                    financeRelevance: 0.08,
                    grainRelevance: 0.06,
                    militaryRelevance: 0.05,
                    socialOrderRelevance: 0.08,
                    governanceRelevance: 0.12,
                }),
            },
            { ...npc },
            null,
            0,
            { round: 14, unlockedSecrets: 1, difficulty: 'normal' },
        )

        expect(result.success).toBe(true)
        expect(result.revealedSecretThread).toBe(npc.secretThreads[1])
        expect(result.trustChange).toBeGreaterThan(0)
        expect(Object.values(result.nationEffects).some(Boolean)).toBe(false)
        expect(result.personEffects.intelDelta).toBeGreaterThan(0)
        expect(result.npcAction).toEqual(expect.objectContaining({ kind: 'intel' }))
        expect(result.npcAction?.text).toContain(npc.secretThreads[1].replace(/[“”"']/g, '').slice(0, 10))
        expect(result.npcAction?.text).toContain('\u6709\u5173\u7684\u534a\u53e5\u53e3\u98ce')
        expect(result.causalEvent as any).toEqual(expect.objectContaining({
            eventKind: 'intel_progress',
            visibility: 'south_intel_only',
        }))
    })

    it('narrates failed schemes as counter events without adding nation effects', () => {
        const npc = { ...INITIAL_NPCS.find(candidate => candidate.id === 'zuting')!, trust: 54 }
        const result = settleScheme(
            {
                id: 'failed-slander-counter',
                targetNpcId: npc.id,
                schemeType: 'slander',
                playerSpeech: '拿旧账试探祖廷。',
                resolutionRoll: 0.99,
                northParse: makeNorthParse({
                    characterFit: 0.18,
                    eventFit: 0.16,
                    structuralPenetration: 0.12,
                    executability: 0.16,
                    exposureRisk: 0.88,
                }),
            },
            { ...npc },
            null,
            0,
            { round: 14, unlockedSecrets: 1, difficulty: 'normal' },
        )

        expect(result.success).toBe(false)
        expect(result.trustChange).toBeLessThan(0)
        expect(Object.values(result.nationEffects).some(Boolean)).toBe(false)
        expect(result.npcAction).toEqual(expect.objectContaining({ kind: 'counter' }))
        expect(result.causalEvent as any).toEqual(expect.objectContaining({
            success: false,
            eventKind: 'failure',
            visibility: 'public',
        }))
    })

    it('narrates trust-only success as private attitude event', () => {
        const npc = { ...INITIAL_NPCS.find(candidate => candidate.id === 'duguwenyue')!, trust: 80 }
        const result = settleScheme(
            {
                id: 'trust-only-appeal',
                targetNpcId: npc.id,
                schemeType: 'appeal',
                playerSpeech: '只求他留一条私下退路。',
                resolutionRoll: 0.01,
                northParse: makeNorthParse({
                    characterFit: 0.82,
                    eventFit: 0.22,
                    structuralPenetration: 0.12,
                    executability: 0.72,
                    exposureRisk: 0.08,
                }),
            },
            { ...npc },
            null,
            0,
            { round: 14, unlockedSecrets: 1, difficulty: 'normal' },
        )

        expect(result.success).toBe(true)
        expect(result.trustChange).toBeGreaterThan(0)
        expect(Object.values(result.nationEffects).some(Boolean)).toBe(false)
        expect(result.npcAction).toEqual(expect.objectContaining({ kind: 'attitude' }))
        expect(result.causalEvent as any).toEqual(expect.objectContaining({
            eventKind: 'trust_only',
            visibility: 'private',
        }))
    })

    it('does not offer any schemes once an external warlord has already turned secessionist', () => {
        const hebabogui = {
            ...INITIAL_NPCS.find(npc => npc.id.startsWith('hebabog'))!,
            trust: 90,
            loyaltyToCourt: 10,
            externalStatus: 'secession' as const,
        }

        const schemes = getAvailableSchemesForNpc(hebabogui, { round: 18, unlockedSecrets: 2 })

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

    it('routes court alienation through an external related npc logistics loss', () => {
        const zongai = { ...INITIAL_NPCS.find(npc => npc.id === 'zongai')!, trust: 68 }
        const linghu = { ...INITIAL_NPCS.find(npc => npc.id === 'linghuelvguang')!, trust: 55 }

        const result = settleScheme(
            {
                id: 'court-alienate-external-logistics',
                targetNpcId: zongai.id,
                schemeType: 'alienate',
                relatedNpcId: linghu.id,
                playerSpeech: '令狐律光的粮仓与兵器库若仍归他自调，宗艾迟早会疑他借军需自重，不如先断粮道再压军令。',
                resolutionRoll: 0.02,
                northParse: makeNorthParse({
                    dominantIntent: 'divide',
                    grainRelevance: 0.88,
                    militaryRelevance: 0.84,
                    governanceRelevance: 0.56,
                    socialOrderRelevance: 0.34,
                    fractureTransmission: 0.86,
                }),
            },
            zongai,
            linghu,
            0,
            { round: 14, unlockedSecrets: 1 },
        )

        expect(result.personEffects.relatedMilitaryPowerDelta ?? 0).toBeLessThan(0)
        expect(result.nationEffects.grain ?? 0).toBeLessThan(0)
        expect(result.nationEffects.military ?? 0).toBeLessThan(0)
        expect(result.relatedImpactSummary).toContain('令狐律光')
        expect(result.npcAction?.text).toContain('令狐律光')
        expect(result.npcAction?.text).toMatch(/粮|军|兵/)
    })

    it('keeps court related finance slander from leaking into grain or military', () => {
        const zongai = { ...INITIAL_NPCS.find(npc => npc.id === 'zongai')!, trust: 68 }
        const yuwendi = { ...INITIAL_NPCS.find(npc => npc.id === 'yuwendi')!, trust: 55 }

        const result = settleScheme(
            {
                id: 'court-slander-finance-only',
                targetNpcId: zongai.id,
                schemeType: 'slander',
                relatedNpcId: yuwendi.id,
                playerSpeech: '只查燕王名下度支账册与库藏出入，不必牵扯军令粮道。',
                resolutionRoll: 0.02,
                northParse: makeNorthParse({
                    dominantIntent: 'divide',
                    financeRelevance: 0.9,
                    grainRelevance: 0.16,
                    militaryRelevance: 0.14,
                    socialOrderRelevance: 0.18,
                    governanceRelevance: 0.22,
                    suspicionTransmission: 0.82,
                }),
            },
            zongai,
            yuwendi,
            0,
            { round: 14, unlockedSecrets: 1 },
        )

        expect(result.factionEffects.emperor?.internalStability ?? 0).toBeLessThan(0)
        expect(result.factionEffects.emperor?.militaryPower ?? 0).toBe(0)
        expect(result.nationEffects.finance ?? 0).toBeLessThan(0)
        expect(result.nationEffects.grain ?? 0).toBe(0)
        expect(result.nationEffects.military ?? 0).toBe(0)
        expect(result.nationEffects.socialOrder ?? 0).toBe(0)
        expect(result.nationEffects.governance ?? 0).toBe(0)
        expect(result.relatedImpactSummary).toContain('宇文棣')
        expect(result.impactTrace?.directNationDimensions).toEqual(['finance'])
        expect(result.impactTrace?.playerDirectNationDimensions).toEqual([])
        expect(result.impactTrace?.relatedNationDimensions).toEqual(['finance'])
        expect(result.impactTrace?.rippleNationDimensions).toEqual(['finance'])
        expect(result.impactTrace?.nationImpactSources).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    dimension: 'finance',
                    source: 'related_npc',
                }),
            ]),
        )
        expect(result.impactTrace?.nationImpactSources).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    dimension: 'grain',
                    source: 'faction_ripple',
                }),
                expect.objectContaining({
                    dimension: 'military',
                    source: 'faction_ripple',
                }),
            ]),
        )
        expect(result.impactTrace?.factionEffectSummary.join('；')).toContain('帝党')
    })

    it('builds a reusable causal event for successful visible scheme fallout', () => {
        const zongai = { ...INITIAL_NPCS.find(npc => npc.id === 'zongai')!, trust: 68 }
        const linghu = { ...INITIAL_NPCS.find(npc => npc.id === 'linghuelvguang')!, trust: 55 }

        const result = settleScheme(
            {
                id: 'causal-event-related-logistics',
                targetNpcId: zongai.id,
                schemeType: 'alienate',
                relatedNpcId: linghu.id,
                playerSpeech: '令狐律光粮道与军需若仍自调，宗艾便可先扣住账册再断军令。',
                resolutionRoll: 0.02,
                northParse: makeNorthParse({
                    dominantIntent: 'divide',
                    grainRelevance: 0.86,
                    militaryRelevance: 0.82,
                    governanceRelevance: 0.54,
                    fractureTransmission: 0.84,
                }),
            },
            zongai,
            linghu,
            0,
            { round: 14, unlockedSecrets: 1 },
        )

        expect(result.causalEvent).toEqual(expect.objectContaining({
            actionId: 'causal-event-related-logistics',
            actorNpcId: zongai.id,
            actorNpcName: zongai.name,
            relatedNpcId: linghu.id,
            relatedNpcName: linghu.name,
            schemeType: 'alienate',
            success: true,
            relatedImpactSummary: expect.stringContaining(linghu.name),
        }))
        expect(result.causalEvent?.motionText).toContain(linghu.name)
        expect(result.causalEvent?.primaryDimensions).toEqual(expect.arrayContaining(['grain', 'military']))
        expect(result.causalEvent?.eventFrame).toEqual(expect.objectContaining({
            actorNpcId: zongai.id,
            actorNpcName: zongai.name,
            relatedNpcId: linghu.id,
            relatedNpcName: linghu.name,
            schemeType: 'alienate',
        }))
        expect(result.causalEvent?.directEffects).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    scope: 'nation',
                    dimension: 'grain',
                    source: 'related_npc',
                }),
                expect.objectContaining({
                    scope: 'nation',
                    dimension: 'military',
                    source: 'related_npc',
                }),
            ]),
        )
        expect(result.causalEvent?.secondaryEffects).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    source: 'faction_ripple',
                }),
            ]),
        )
        expect(result.causalEvent?.effectSummary.join('；')).toContain('令狐律光')
        expect(result.impactTrace?.relatedImpactSummary).toContain(linghu.name)
    })

    it('does not trigger related semantic impact when transmission is too low', () => {
        const zongai = { ...INITIAL_NPCS.find(npc => npc.id === 'zongai')!, trust: 68 }
        const linghu = { ...INITIAL_NPCS.find(npc => npc.id === 'linghuelvguang')!, trust: 55 }

        const result = settleScheme(
            {
                id: 'low-transmission-related-impact',
                targetNpcId: zongai.id,
                schemeType: 'alienate',
                relatedNpcId: linghu.id,
                playerSpeech: '军令粮道虽有可疑，但宗艾这一番话尚未真正传到令狐律光身上。',
                resolutionRoll: 0.02,
                northParse: makeNorthParse({
                    dominantIntent: 'divide',
                    grainRelevance: 0.82,
                    militaryRelevance: 0.8,
                    governanceRelevance: 0.5,
                    fractureTransmission: 0.16,
                }),
            },
            zongai,
            linghu,
            0,
            { round: 14, unlockedSecrets: 1 },
        )

        expect(result.relatedImpactSummary).toBeNull()
        expect(result.personEffects.relatedMilitaryPowerDelta ?? 0).toBe(0)
        expect(result.nationEffects.grain ?? 0).toBe(0)
        expect(result.nationEffects.military ?? 0).toBe(0)
    })

    it('lets external advise quietly grow military power when the plan consolidates troops and supplies', () => {
        const duguwenyue = { ...INITIAL_NPCS.find(npc => npc.id === 'duguwenyue')!, trust: 68 }

        const result = settleScheme(
            {
                id: 'external-advise-military-build-up',
                targetNpcId: duguwenyue.id,
                schemeType: 'advise',
                playerSpeech: '先把军粮、部曲和调度都收在你自己手里，朝里再怎么催，也只能认你这一路边镇已经坐大。',
                resolutionRoll: 0.01,
                northParse: makeNorthParse({
                    eventFit: 0.76,
                    structuralPenetration: 0.78,
                    executability: 0.74,
                    grainRelevance: 0.82,
                    militaryRelevance: 0.86,
                    governanceRelevance: 0.68,
                    stateBenefit: -0.7,
                    targetBenefit: 0.84,
                    advicePolarity: 'pro_target_anti_state',
                }),
            },
            duguwenyue,
            null,
            0,
            { round: 12, unlockedSecrets: 1, difficulty: 'normal' },
        )

        expect(result.success).toBe(true)
        expect(result.personEffects.militaryPowerDelta).toBeGreaterThan(0)
        expect(result.personEffects.loyaltyDelta).toBeLessThan(0)
        expect(Math.abs(result.personEffects.militaryPowerDelta)).toBeLessThan(Math.abs(result.personEffects.loyaltyDelta))
        expect((result.nationEffects.military ?? 0)).toBeLessThan(0)
    })

    it('lets external frame cut military power only when the trap can trigger sanction or command disorder', () => {
        const ansiming = { ...INITIAL_NPCS.find(npc => npc.id === 'ansiming')!, trust: 70 }

        const weakResult = settleScheme(
            {
                id: 'external-frame-weak',
                targetNpcId: ansiming.id,
                schemeType: 'frame',
                playerSpeech: '只说他最近风声不好，未必真能把祸坐实。',
                resolutionRoll: 0.01,
                northParse: makeNorthParse({
                    eventFit: 0.42,
                    structuralPenetration: 0.34,
                    executability: 0.38,
                    grainRelevance: 0.18,
                    militaryRelevance: 0.2,
                    governanceRelevance: 0.34,
                    selfTrapPotential: 0.22,
                    scapegoatClarity: 0.18,
                    centralSanctionLeverage: 0.18,
                }),
            },
            ansiming,
            null,
            0,
            { round: 12, unlockedSecrets: 1, difficulty: 'normal' },
        )

        const strongResult = settleScheme(
            {
                id: 'external-frame-strong',
                targetNpcId: ansiming.id,
                schemeType: 'frame',
                playerSpeech: '只要把越权调兵和私留军需的口子钉死，中枢就会先卡他粮道，再逼得军中自己乱阵脚。',
                resolutionRoll: 0.01,
                northParse: makeNorthParse({
                    eventFit: 0.78,
                    structuralPenetration: 0.8,
                    executability: 0.74,
                    grainRelevance: 0.74,
                    militaryRelevance: 0.82,
                    governanceRelevance: 0.78,
                    selfTrapPotential: 0.84,
                    scapegoatClarity: 0.86,
                    centralSanctionLeverage: 0.8,
                }),
            },
            { ...ansiming },
            null,
            0,
            { round: 12, unlockedSecrets: 1, difficulty: 'normal' },
        )

        expect(weakResult.success).toBe(true)
        expect(strongResult.success).toBe(true)
        expect(strongResult.personEffects.militaryPowerDelta).toBeLessThan(0)
        expect(Math.abs(strongResult.personEffects.militaryPowerDelta)).toBeGreaterThan(
            Math.abs(weakResult.personEffects.militaryPowerDelta),
        )
        expect(Math.abs(strongResult.personEffects.militaryPowerDelta)).toBeLessThanOrEqual(
            Math.abs(strongResult.personEffects.loyaltyDelta),
        )
    })

    it('lets court slander shave military edge off an external second target when command panic truly transmits', () => {
        const zongai = { ...INITIAL_NPCS.find(npc => npc.id === 'zongai')!, trust: 62 }
        const duguwenyue = { ...INITIAL_NPCS.find(npc => npc.id === 'duguwenyue')!, trust: 58 }

        const generic = settleScheme(
            {
                id: 'external-second-target-generic-slander',
                targetNpcId: zongai.id,
                schemeType: 'slander',
                relatedNpcId: duguwenyue.id,
                playerSpeech: '他未必真会替你说话，到头来还是先保自己。',
                resolutionRoll: 0.01,
                northParse: makeNorthParse({
                    dominantIntent: 'divide',
                    grainRelevance: 0.14,
                    militaryRelevance: 0.16,
                    governanceRelevance: 0.36,
                    suspicionTransmission: 0.24,
                }),
            },
            zongai,
            duguwenyue,
            0,
            { round: 12, unlockedSecrets: 1, difficulty: 'normal' },
        )

        const structural = settleScheme(
            {
                id: 'external-second-target-structural-slander',
                targetNpcId: zongai.id,
                schemeType: 'slander',
                relatedNpcId: duguwenyue.id,
                playerSpeech: '若把军令、粮道和担责口子都认到他头上，中枢先疑的就是这一路边镇还能不能照旧调度。',
                resolutionRoll: 0.01,
                northParse: makeNorthParse({
                    dominantIntent: 'divide',
                    grainRelevance: 0.78,
                    militaryRelevance: 0.82,
                    governanceRelevance: 0.74,
                    suspicionTransmission: 0.84,
                }),
            },
            { ...zongai },
            { ...duguwenyue },
            0,
            { round: 12, unlockedSecrets: 1, difficulty: 'normal' },
        )

        expect(generic.personEffects.relatedMilitaryPowerDelta ?? 0).toBe(0)
        expect(structural.personEffects.relatedMilitaryPowerDelta ?? 0).toBeLessThan(0)
        expect(structural.personEffects.militaryPowerDelta).toBe(0)
    })

    it('lets external alienate take military edge from only one side instead of transferring it symmetrically', () => {
        const duguwenyue = { ...INITIAL_NPCS.find(npc => npc.id === 'duguwenyue')!, trust: 72 }
        const hebabogui = { ...INITIAL_NPCS.find(npc => npc.name === '贺拔伯圭')!, trust: 60 }

        const result = settleScheme(
            {
                id: 'external-one-sided-alienate',
                targetNpcId: duguwenyue.id,
                schemeType: 'alienate',
                relatedNpcId: hebabogui.id,
                playerSpeech: '若军令、粮道和补给口始终都捏在他手里，你这边越打越像替人垫兵、替人背责。',
                resolutionRoll: 0.01,
                northParse: makeNorthParse({
                    dominantIntent: 'divide',
                    eventFit: 0.76,
                    structuralPenetration: 0.8,
                    executability: 0.72,
                    grainRelevance: 0.84,
                    militaryRelevance: 0.82,
                    governanceRelevance: 0.68,
                    fractureTransmission: 0.86,
                }),
            },
            duguwenyue,
            hebabogui,
            0,
            { round: 16, unlockedSecrets: 2, difficulty: 'normal' },
        )

        expect(result.success).toBe(true)
        expect(result.personEffects.militaryPowerDelta).toBe(0)
        expect(result.personEffects.relatedMilitaryPowerDelta ?? 0).toBeLessThan(0)
    })

    it('turns a high-relevance hit on 贺拔琪 into empress pressure led by court influence', () => {
        const yuwendi = { ...INITIAL_NPCS.find(npc => npc.id === 'yuwendi')!, trust: 72 }
        const hebaqi = { ...INITIAL_NPCS.find(npc => npc.name === '贺拔琪')! }

        const result = settleScheme(
            {
                id: 'hebaqi-pressure',
                targetNpcId: yuwendi.id,
                schemeType: 'alienate',
                relatedNpcId: hebaqi.id,
                playerSpeech: '太后既卡主战名分，又握诏令出口，真到东线出事时，后党只会先被认作压住了中枢调度。',
                resolutionRoll: 0.01,
                northParse: makeNorthParse({
                    dominantIntent: 'divide',
                    socialOrderRelevance: 0.74,
                    governanceRelevance: 0.82,
                    fractureTransmission: 0.84,
                }),
            },
            yuwendi,
            hebaqi,
            0,
            { round: 14, unlockedSecrets: 1, difficulty: 'normal' },
        )

        expect(result.success).toBe(true)
        expect(result.factionEffects.empress?.courtInfluence ?? 0).toBeLessThan(0)
        expect(result.factionEffects.empress?.internalStability ?? 0).toBeLessThan(0)
        expect(Math.abs(result.factionEffects.empress?.courtInfluence ?? 0)).toBeGreaterThan(
            Math.abs(result.factionEffects.empress?.internalStability ?? 0),
        )
    })

    it('turns a strong omen on 宗艾 into emperor-side pressure while keeping low-signal cases inert', () => {
        const zongai = { ...INITIAL_NPCS.find(npc => npc.id === 'zongai')!, trust: 62 }

        const vague = settleScheme(
            {
                id: 'zongai-vague-omen-pressure',
                targetNpcId: zongai.id,
                schemeType: 'omen',
                playerSpeech: '近来宫里风声不对，最好先低调些。',
                resolutionRoll: 0.01,
                northParse: makeNorthParse({
                    governanceRelevance: 0.28,
                    socialOrderRelevance: 0.24,
                    legitimacyCrack: 0.18,
                    suspicionDirection: 0.16,
                    omenPolarity: 'vague_or_ceremonial',
                }),
            },
            zongai,
            null,
            0,
            { round: 14, unlockedSecrets: 1, difficulty: 'normal' },
        )

        const strong = settleScheme(
            {
                id: 'zongai-strong-omen-pressure',
                targetNpcId: zongai.id,
                schemeType: 'omen',
                playerSpeech: '灾异若压到诏令和军令出口上，人人都会先疑你这个御前接口还能不能替皇帝把局面压住。',
                resolutionRoll: 0.01,
                northParse: makeNorthParse({
                    governanceRelevance: 0.76,
                    socialOrderRelevance: 0.62,
                    militaryRelevance: 0.58,
                    legitimacyCrack: 0.86,
                    suspicionDirection: 0.82,
                    omenPolarity: 'destabilizing',
                }),
            },
            { ...zongai },
            null,
            0,
            { round: 14, unlockedSecrets: 1, difficulty: 'normal' },
        )

        expect(vague.factionEffects.emperor).toBeUndefined()
        expect(strong.factionEffects.emperor?.courtInfluence ?? 0).toBeLessThan(0)
        expect(strong.factionEffects.emperor?.internalStability ?? 0).toBeLessThan(0)
        expect(Math.abs(strong.factionEffects.emperor?.courtInfluence ?? 0)).toBeGreaterThan(
            Math.abs(strong.factionEffects.emperor?.internalStability ?? 0),
        )
    })

    it('treats title-based high-weight targets as shock backlash candidates at extreme exposure', () => {
        const zongai = { ...INITIAL_NPCS.find(npc => npc.id === 'zongai')!, trust: 66 }

        const result = settleScheme(
            {
                id: 'zongai-high-weight-backlash',
                targetNpcId: zongai.id,
                schemeType: 'advise',
                playerSpeech: '宫中诏令、边军调度与后续清点都该一并并入御前接口，如此方能彻底改过旧局。',
                resolutionRoll: 0.01,
                northParse: makeNorthParse({
                    characterFit: 0.74,
                    eventFit: 0.66,
                    structuralPenetration: 0.62,
                    executability: 0.72,
                    exposureRisk: 0.84,
                    governanceRelevance: 0.72,
                    socialOrderRelevance: 0.34,
                    dominantIntent: 'strategize',
                }),
            },
            zongai,
            null,
            0,
            { round: 14, unlockedSecrets: 1, difficulty: 'normal' },
        )

        expect(result.delayedBacklash[0]?.type).toBe('shock')
    })

    it('keeps proxy personal at scheme-engine level and leaves public consequences to court disposition settlement', () => {
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
        expect(publicStrike.nationEffects.governance ?? 0).toBe(0)
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

    it('reduces external military power a little while cutting loyalty more on a strong omen', () => {
        const externalNpc = {
            ...INITIAL_NPCS.find(npc => npc.powerBase === 'external')!,
            trust: 76,
        }

        const result = settleScheme(
            {
                id: 'strong-external-omen',
                targetNpcId: externalNpc.id,
                schemeType: 'omen',
                playerSpeech: '异兆已经落到边镇头上，朝里只要顺势紧一紧粮道与关防，兵心自然会先松一层。',
                resolutionRoll: 0.01,
                northParse: makeNorthParse({
                    characterFit: 0.82,
                    eventFit: 0.8,
                    structuralPenetration: 0.78,
                    executability: 0.74,
                    exposureRisk: 0.08,
                    militaryRelevance: 0.74,
                    socialOrderRelevance: 0.7,
                    governanceRelevance: 0.76,
                    omenAccusationClarity: 0.84,
                    centralSanctionLeverage: 0.82,
                    legitimacyCrack: 0.8,
                    suspicionDirection: 0.78,
                    omenPolarity: 'destabilizing',
                    evidence: [],
                }),
            },
            externalNpc,
            null,
            0,
            { round: 15, unlockedSecrets: 2 },
        )

        expect(result.success).toBe(true)
        expect(result.personEffects.militaryPowerDelta).toBeLessThan(0)
        expect(result.personEffects.loyaltyDelta).toBeLessThan(0)
        expect(Math.abs(result.personEffects.loyaltyDelta)).toBeGreaterThan(Math.abs(result.personEffects.militaryPowerDelta))
        expect(Math.abs(result.personEffects.militaryPowerDelta)).toBeGreaterThanOrEqual(1)
        expect(Math.abs(result.personEffects.militaryPowerDelta)).toBeLessThanOrEqual(3)
    })

    it('writes external omen settlement feedback as a central suspicion and supply squeeze chain', () => {
        const externalNpc = {
            ...INITIAL_NPCS.find(npc => npc.powerBase === 'external')!,
            trust: 76,
        }

        const result = settleScheme(
            {
                id: 'external-omen-feedback',
                targetNpcId: externalNpc.id,
                schemeType: 'omen',
                playerSpeech: '异兆已经落到边镇头上，朝里只要顺势紧一紧粮道与关防，兵心自然会先松一层。',
                resolutionRoll: 0.01,
                northParse: makeNorthParse({
                    characterFit: 0.82,
                    eventFit: 0.8,
                    structuralPenetration: 0.78,
                    executability: 0.74,
                    exposureRisk: 0.08,
                    militaryRelevance: 0.74,
                    socialOrderRelevance: 0.7,
                    governanceRelevance: 0.76,
                    omenAccusationClarity: 0.84,
                    centralSanctionLeverage: 0.82,
                    legitimacyCrack: 0.8,
                    suspicionDirection: 0.78,
                    omenPolarity: 'destabilizing',
                    evidence: [],
                }),
            },
            externalNpc,
            null,
            0,
            { round: 15, unlockedSecrets: 2 },
        )

        expect(result.success).toBe(true)
        expect(result.feedbackText).toMatch(/中枢|起疑|猜忌/)
        expect(result.feedbackText).toMatch(/粮道|军需|御史监军|眼线/)
        expect(result.feedbackText).toMatch(/兵势|军力/)
        expect(result.feedbackText).toMatch(/怨气|忠心却更难再稳|心里却先松了一层/)
    })

    it('keeps a vague external omen from applying the same military pressure as a strong one', () => {
        const externalNpc = {
            ...INITIAL_NPCS.find(npc => npc.powerBase === 'external')!,
            trust: 76,
        }

        const weakResult = settleScheme(
            {
                id: 'weak-external-omen',
                targetNpcId: externalNpc.id,
                schemeType: 'omen',
                playerSpeech: '风声未必真切，先把话留在风里看它自己散不散。',
                resolutionRoll: 0.01,
                northParse: makeNorthParse({
                    characterFit: 0.44,
                    eventFit: 0.28,
                    structuralPenetration: 0.22,
                    executability: 0.24,
                    exposureRisk: 0.1,
                    militaryRelevance: 0.22,
                    socialOrderRelevance: 0.2,
                    governanceRelevance: 0.24,
                    omenAccusationClarity: 0.14,
                    centralSanctionLeverage: 0.12,
                    legitimacyCrack: 0.1,
                    suspicionDirection: 0.1,
                    omenPolarity: 'vague_or_ceremonial',
                    evidence: [],
                }),
            },
            externalNpc,
            null,
            0,
            { round: 15, unlockedSecrets: 2 },
        )

        const strongResult = settleScheme(
            {
                id: 'strong-external-omen-comparison',
                targetNpcId: externalNpc.id,
                schemeType: 'omen',
                playerSpeech: '异兆已经落到边镇头上，朝里只要顺势紧一紧粮道与关防，兵心自然会先松一层。',
                resolutionRoll: 0.01,
                northParse: makeNorthParse({
                    characterFit: 0.82,
                    eventFit: 0.8,
                    structuralPenetration: 0.78,
                    executability: 0.74,
                    exposureRisk: 0.08,
                    militaryRelevance: 0.74,
                    socialOrderRelevance: 0.7,
                    governanceRelevance: 0.76,
                    omenAccusationClarity: 0.84,
                    centralSanctionLeverage: 0.82,
                    legitimacyCrack: 0.8,
                    suspicionDirection: 0.78,
                    omenPolarity: 'destabilizing',
                    evidence: [],
                }),
            },
            externalNpc,
            null,
            0,
            { round: 15, unlockedSecrets: 2 },
        )

        expect(weakResult.success).toBe(true)
        expect(strongResult.success).toBe(true)
        expect(Math.abs(weakResult.personEffects.militaryPowerDelta)).toBeLessThan(Math.abs(strongResult.personEffects.militaryPowerDelta))
        expect(Math.abs(weakResult.personEffects.loyaltyDelta)).toBeGreaterThanOrEqual(Math.abs(weakResult.personEffects.militaryPowerDelta))
    })
})
