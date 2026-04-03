import { describe, expect, it } from 'vitest'
import { INITIAL_NPCS } from '../data/npcs'
import { NORTH_INITIAL, SOUTH_INITIAL } from '../data/nationStats'
import { LIVE_BALANCE_SAMPLE_SET } from './liveBalance/sampleLibrary'
import { simulateGame } from './simulationRunner'
import type { NorthSchemeParseResult } from './types'

describe('simulationRunner', () => {
    it('keeps the bashu map on later round starts after a successful shu campaign', () => {
        const result = simulateGame({
            throughRound: 13,
            initialState: {
                currentRound: 10,
                northStats: { finance: 48, grain: 52, military: 60, socialOrder: 50, governance: 54 },
                southStats: { finance: 78, grain: 82, military: 84, socialOrder: 72, governance: 80 },
            },
            resolveRound: ({ round }) => (
                round === 10
                    ? {
                        policyOptionLabel: 'B',
                        policyReason: '先断粮道，再借接管预案稳住蜀地，避免战果变成后续包袱。',
                    }
                    : {}
            ),
        })

        const round11 = result.rounds.find(item => item.round === 11)
        const round12 = result.rounds.find(item => item.round === 12)
        const round13 = result.rounds.find(item => item.round === 13)

        expect(round11?.roundStart.campaignSummary).toContain('胜机')
        expect(round11?.roundStart.campaignSummary).not.toContain('得手')
        expect(round12?.roundStart.mapSrc).toContain('map_2_bashu.png')
        expect(round13?.roundStart.mapSrc).toContain('map_2_bashu.png')
        expect(result.finalState.shuCampaign.resolvedState).toBe('gained')
    })

    it('uses accumulated shu momentum during round 10 resolution', () => {
        const baseline = simulateGame({
            throughRound: 10,
            initialState: {
                currentRound: 10,
                difficulty: 'normal',
                northStats: { finance: 60, grain: 63, military: 70, socialOrder: 54, governance: 58 },
                southStats: { finance: 55, grain: 60, military: 58, socialOrder: 56, governance: 58 },
            },
        })

        const withMomentum = simulateGame({
            throughRound: 10,
            initialState: {
                currentRound: 10,
                difficulty: 'normal',
                shuMomentum: 2.8,
                northStats: { finance: 60, grain: 63, military: 70, socialOrder: 54, governance: 58 },
                southStats: { finance: 55, grain: 60, military: 58, socialOrder: 56, governance: 58 },
            },
        })

        expect(baseline.finalState.shuCampaign.resolvedState).toBe('failed')
        expect(withMomentum.finalState.shuCampaign.resolvedState).not.toBe('failed')
    })

    it('keeps the combined map after huainan is gained on top of an earlier bashu victory', () => {
        const result = simulateGame({
            throughRound: 19,
            initialState: {
                currentRound: 16,
                northStats: { finance: 46, grain: 50, military: 58, socialOrder: 48, governance: 52 },
                southStats: { finance: 80, grain: 84, military: 86, socialOrder: 74, governance: 80 },
                shuCampaign: {
                    state: 'idle',
                    resolvedState: 'gained',
                    sourceRound: 10,
                    summary: '',
                    ongoingNorthImpact: {},
                    ongoingSouthImpact: {},
                    remainingRounds: 0,
                },
            },
            resolveRound: ({ round }) => (
                round === 16
                    ? {
                        policyOptionLabel: 'D',
                        policyReason: '水陆并进，但先稳渡口和粮道，把淮南战果做成可持续的占领。',
                    }
                    : {}
            ),
        })

        const round17 = result.rounds.find(item => item.round === 17)
        const round19 = result.rounds.find(item => item.round === 19)

        expect(round17?.roundStart.campaignSummary).toContain('缺口')
        expect(round17?.roundStart.mapSrc).toContain('map_3_bashu_huainan.png')
        expect(round19?.roundStart.mapSrc).toContain('map_3_bashu_huainan.png')
        expect(result.finalState.huainanCampaign.resolvedState).toBe('gained')
    })

    it('records external secession outcomes so branch tests can inspect them', () => {
        const hebabogui = INITIAL_NPCS.find(npc => npc.name === '贺拔伯圭')!

        const result = simulateGame({
            throughRound: 7,
            initialState: {
                currentRound: 7,
                npcs: INITIAL_NPCS.map(npc => ({
                    ...npc,
                    trust: npc.id === hebabogui.id ? 82 : npc.trust,
                    loyaltyToCourt: npc.id === hebabogui.id ? 18 : npc.loyaltyToCourt,
                })),
                intelProgress: {
                    [hebabogui.id]: 3,
                },
                northStats: { ...NORTH_INITIAL },
                southStats: { ...SOUTH_INITIAL },
            },
            resolveRound: () => ({
                schemes: [
                    {
                        id: 'sim-secession',
                        targetNpcId: hebabogui.id,
                        schemeType: 'secession',
                        playerSpeech: '西线诸军本就听公号令，只需借西征议把战时权柄坐实，朝廷也奈何不得。',
                        resolutionRoll: 0.02,
                    },
                ],
            }),
        })

        expect(result.rounds[0]?.settlement.externalActions).toHaveLength(1)
        expect(result.rounds[0]?.settlement.externalActions[0]).toContain(hebabogui.name)
        expect(result.finalState.npcs.find(npc => npc.id === hebabogui.id)?.externalStatus).toBe('secession')
    })
    it('does not let a strong round-10 pressure route trivially push South past North after the semantic rebalance', () => {
        const hebabogui = INITIAL_NPCS.find(npc => npc.name === '贺拔伯圭')!
        const weichimu = INITIAL_NPCS.find(npc => npc.name === '尉迟暮')!
        const linghu = INITIAL_NPCS.find(npc => npc.name === '令狐律光')!
        const zuting = INITIAL_NPCS.find(npc => npc.name === '祖廷')!

        const warExternalParse: NorthSchemeParseResult = {
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
        }

        const result = simulateGame({
            throughRound: 10,
            initialState: {
                npcs: INITIAL_NPCS.map(npc => {
                    if (npc.id === hebabogui.id) return { ...npc, trust: 72 }
                    if (npc.id === weichimu.id) return { ...npc, trust: 62 }
                    if (npc.id === linghu.id) return { ...npc, trust: 55 }
                    if (npc.id === zuting.id) return { ...npc, trust: 68 }
                    return npc
                }),
            },
            resolveRound: ({ round }) => ({
                schemes: [
                    {
                        id: `round-${round}-external-war-advise`,
                        targetNpcId: hebabogui.id,
                        schemeType: 'advise',
                        playerSpeech: '若不先稳住兵粮、转运与前线调度，河西一线很快就会失控。',
                        resolutionRoll: 0.01,
                        northParse: warExternalParse,
                    },
                    {
                        id: `round-${round}-court-advise`,
                        targetNpcId: zuting.id,
                        schemeType: 'advise',
                        playerSpeech: '趁灾年把仓储、饷权与账务并收中枢，先堵河北豪右，再反压帝党。',
                        resolutionRoll: 0.01,
                    },
                    {
                        id: `round-${round}-commander-alienate`,
                        targetNpcId: weichimu.id,
                        relatedNpcId: linghu.id,
                        schemeType: round === 1 ? 'slander' : 'alienate',
                        playerSpeech: '前线兵权、粮道与转运若全掌在河北一系手里，公纵有战功也只会替人背责。',
                        resolutionRoll: 0.01,
                    },
                ],
                policyOptionIndex: 0,
                policyReason: '先稳仓储、钱粮与地方执行，再谈外线扩张。',
            }),
        })

        expect(result.finalState.southPower - result.finalState.northPower).toBeLessThan(8)
        expect(result.finalState.southPower).toBeLessThanOrEqual(result.finalState.northPower + 8)
    })

    it('does not let a no-action normal run drift into an automatic victory by round 20', () => {
        const result = simulateGame({
            throughRound: 20,
            initialState: {
                difficulty: 'normal',
            },
        })

        expect(result.finalState.gameResult).not.toBe('VICTORY')
        expect(result.finalState.southPower).toBeLessThanOrEqual(result.finalState.northPower)
    })

    it('does not let the average mainline route convert a failed-war normal run into a comfortable endgame victory', () => {
        const sample = LIVE_BALANCE_SAMPLE_SET.find(item => item.id === 'average-mainline')
        expect(sample).toBeTruthy()

        const result = simulateGame({
            throughRound: 20,
            initialState: {
                difficulty: sample!.difficulty,
            },
            resolveRound: ({ round }) => {
                const plan = sample!.rounds.find(item => item.round === round)
                if (!plan) return {}

                return {
                    schemes: plan.schemes.map((scheme, index) => ({
                        id: `${sample!.id}-r${round}-s${index + 1}`,
                        targetNpcId: scheme.targetNpcId,
                        relatedNpcId: scheme.relatedNpcId,
                        schemeType: scheme.schemeType,
                        playerSpeech: scheme.speech,
                        resolutionRoll: 0.28,
                    })),
                    policyOptionIndex: plan.policy.optionIndex,
                    policyReason: plan.policy.reason,
                }
            },
        })

        expect(result.finalState.shuCampaign.resolvedState ?? result.finalState.shuCampaign.state).not.toBe('gained')
        expect(result.finalState.huainanCampaign.resolvedState ?? result.finalState.huainanCampaign.state).not.toBe('gained')
        expect(result.finalState.southPower - result.finalState.northPower).toBeLessThanOrEqual(5)
    })

    it('keeps rookie aggressive pressure below a comfortable double-digit normal-mode victory', () => {
        const sample = LIVE_BALANCE_SAMPLE_SET.find(item => item.id === 'rookie-aggressive')
        expect(sample).toBeTruthy()

        const result = simulateGame({
            throughRound: 20,
            initialState: {
                difficulty: sample!.difficulty,
            },
            resolveRound: ({ round }) => {
                const plan = sample!.rounds.find(item => item.round === round)
                if (!plan) return {}

                return {
                    schemes: plan.schemes.map((scheme, index) => ({
                        id: `${sample!.id}-r${round}-s${index + 1}`,
                        targetNpcId: scheme.targetNpcId,
                        relatedNpcId: scheme.relatedNpcId,
                        schemeType: scheme.schemeType,
                        playerSpeech: scheme.speech,
                        resolutionRoll: 0.28,
                    })),
                    policyOptionIndex: plan.policy.optionIndex,
                    policyReason: plan.policy.reason,
                }
            },
        })

        expect(result.finalState.southPower - result.finalState.northPower).toBeLessThan(10)
    })

    it('preserves the intended fallback ordering across mainline and rookie aggressive samples', () => {
        const ids = ['expert-mainline', 'average-mainline', 'rookie-mainline', 'rookie-aggressive'] as const
        const margins = new Map<string, number>()

        for (const id of ids) {
            const sample = LIVE_BALANCE_SAMPLE_SET.find(item => item.id === id)!
            const result = simulateGame({
                throughRound: 20,
                initialState: {
                    difficulty: sample.difficulty,
                },
                resolveRound: ({ round }) => {
                    const plan = sample.rounds.find(item => item.round === round)
                    if (!plan) return {}

                    return {
                        schemes: plan.schemes.map((scheme, index) => ({
                            id: `${sample.id}-r${round}-s${index + 1}`,
                            targetNpcId: scheme.targetNpcId,
                            relatedNpcId: scheme.relatedNpcId,
                            schemeType: scheme.schemeType,
                            playerSpeech: scheme.speech,
                            resolutionRoll: 0.28,
                        })),
                        policyOptionIndex: plan.policy.optionIndex,
                        policyReason: plan.policy.reason,
                    }
                },
            })

            margins.set(id, result.finalState.southPower - result.finalState.northPower)
        }

        expect(margins.get('expert-mainline')!).toBeGreaterThanOrEqual(margins.get('average-mainline')!)
        expect(margins.get('average-mainline')!).toBeGreaterThanOrEqual(margins.get('rookie-mainline')!)
        expect(margins.get('rookie-aggressive')!).toBeLessThan(10)
    })
})
