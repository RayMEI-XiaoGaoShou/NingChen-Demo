import { INITIAL_NPCS } from '../data/npcs'
import type { ExternalStatus } from './types'
import { simulateGame, type SimulateGameOptions } from './simulationRunner'

export interface CampaignRegressionScenarioResult {
    id: string
    label: string
    resolvedState: 'gained' | 'stalemate' | 'failed'
    campaignSummary: string | null
    finalMapSrc: string
}

export interface ExternalPowerRegressionScenarioResult {
    id: string
    label: string
    finalExternalStatus: ExternalStatus
    externalActionSummary: string
}

interface CampaignScenarioDefinition {
    id: string
    label: string
    expectedResolvedState: 'gained' | 'stalemate' | 'failed'
    summaryRound: number
    finalMapRound: number
    options: SimulateGameOptions
}

interface ExternalScenarioDefinition {
    id: string
    label: string
    targetNpcName: string
    options: SimulateGameOptions
}

export function runCampaignRegressionMatrix(): CampaignRegressionScenarioResult[] {
    return CAMPAIGN_SCENARIOS.map(scenario => {
        const result = simulateGame(scenario.options)
        const summaryTrace = result.rounds.find(item => item.round === scenario.summaryRound)
        const finalMapTrace = result.rounds.find(item => item.round === scenario.finalMapRound)

        if (!summaryTrace || !finalMapTrace) {
            throw new Error(`Scenario ${scenario.id} did not produce the expected trace rounds.`)
        }

        const resolvedState =
            scenario.id.startsWith('shu_')
                ? result.finalState.shuCampaign.resolvedState
                : result.finalState.huainanCampaign.resolvedState

        if (resolvedState !== scenario.expectedResolvedState) {
            throw new Error(
                `Scenario ${scenario.id} resolved to ${resolvedState ?? 'null'} instead of ${scenario.expectedResolvedState}.`,
            )
        }

        return {
            id: scenario.id,
            label: scenario.label,
            resolvedState,
            campaignSummary: summaryTrace.roundStart.campaignSummary,
            finalMapSrc: finalMapTrace.roundStart.mapSrc,
        }
    })
}

export function runExternalPowerRegressionMatrix(): ExternalPowerRegressionScenarioResult[] {
    return EXTERNAL_SCENARIOS.map(scenario => {
        const result = simulateGame(scenario.options)
        const targetNpc = result.finalState.npcs.find(npc => npc.name === scenario.targetNpcName)
        const externalActionSummary = result.rounds
            .flatMap(item => item.settlement.externalActions)
            .join(' ')

        if (!targetNpc) {
            throw new Error(`Scenario ${scenario.id} could not find target NPC ${scenario.targetNpcName}.`)
        }

        if (!externalActionSummary) {
            throw new Error(`Scenario ${scenario.id} did not produce any external action summary.`)
        }

        return {
            id: scenario.id,
            label: scenario.label,
            finalExternalStatus: targetNpc.externalStatus,
            externalActionSummary,
        }
    })
}

const CAMPAIGN_SCENARIOS: CampaignScenarioDefinition[] = [
    {
        id: 'shu_gained',
        label: '蜀地得手',
        expectedResolvedState: 'gained',
        summaryRound: 11,
        finalMapRound: 13,
        options: {
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
        },
    },
    {
        id: 'shu_stalemate',
        label: '蜀地僵持',
        expectedResolvedState: 'stalemate',
        summaryRound: 11,
        finalMapRound: 13,
        options: {
            throughRound: 13,
            initialState: {
                currentRound: 10,
                northStats: { finance: 60, grain: 63, military: 74, socialOrder: 50, governance: 58 },
                southStats: { finance: 68, grain: 74, military: 72, socialOrder: 62, governance: 72 },
                npcs: createControlledCampaignNpcs(),
            },
            resolveRound: ({ round }) => (
                round === 10
                    ? {
                        policyOptionLabel: 'B',
                        policyReason: '先稳住军粮、转运与接管次序，不让眼前战果变成后续包袱。',
                    }
                    : {}
            ),
        },
    },
    {
        id: 'shu_failed',
        label: '蜀地失利',
        expectedResolvedState: 'failed',
        summaryRound: 11,
        finalMapRound: 13,
        options: {
            throughRound: 13,
            initialState: {
                currentRound: 10,
                northStats: { finance: 68, grain: 70, military: 77, socialOrder: 60, governance: 61 },
                southStats: { finance: 45, grain: 48, military: 50, socialOrder: 46, governance: 50 },
                npcs: createControlledCampaignNpcs(),
            },
            resolveRound: ({ round }) => (
                round === 16
                    ? {
                        policyOptionLabel: 'D',
                        policyReason: '先稳住渡口、粮道与接管秩序，别把推进打成虚耗。',
                    }
                    : {}
            ),
        },
    },
    {
        id: 'huainan_gained_after_bashu',
        label: '已得巴蜀后拿下淮南',
        expectedResolvedState: 'gained',
        summaryRound: 17,
        finalMapRound: 19,
        options: {
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
        },
    },
    {
        id: 'huainan_stalemate_after_bashu',
        label: '已得巴蜀后淮南胶着',
        expectedResolvedState: 'stalemate',
        summaryRound: 17,
        finalMapRound: 19,
        options: {
            throughRound: 19,
            initialState: {
                currentRound: 16,
                northStats: { finance: 60, grain: 64, military: 70, socialOrder: 50, governance: 58 },
                southStats: { finance: 70, grain: 84, military: 92, socialOrder: 66, governance: 64 },
                npcs: createControlledCampaignNpcs(),
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
                        policyReason: '先稳住渡口、粮道与接管秩序，别把推进打成虚耗。',
                    }
                    : {}
            ),
        },
    },
    {
        id: 'huainan_failed_after_bashu',
        label: '已得巴蜀后淮南失利',
        expectedResolvedState: 'failed',
        summaryRound: 17,
        finalMapRound: 19,
        options: {
            throughRound: 19,
            initialState: {
                currentRound: 16,
                northStats: { finance: 68, grain: 70, military: 77, socialOrder: 60, governance: 61 },
                southStats: { finance: 45, grain: 48, military: 50, socialOrder: 46, governance: 50 },
                npcs: createControlledCampaignNpcs(),
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
            resolveRound: () => ({}),
        },
    },
]

const HEBA_BOGUI = INITIAL_NPCS.find(npc => npc.name === '贺拔伯圭')
const AN_SIMING = INITIAL_NPCS.find(npc => npc.name === '安思明')

if (!HEBA_BOGUI || !AN_SIMING) {
    throw new Error('Simulation matrix presets could not locate the required external NPC definitions.')
}

const EXTERNAL_SCENARIOS: ExternalScenarioDefinition[] = [
    {
        id: 'heba_bogui_secession',
        label: '贺拔伯圭割据线',
        targetNpcName: '贺拔伯圭',
        options: {
            throughRound: 7,
            initialState: {
                currentRound: 7,
                npcs: INITIAL_NPCS.map(npc => ({
                    ...npc,
                    trust: npc.id === HEBA_BOGUI.id ? 82 : npc.trust,
                    loyaltyToCourt: npc.id === HEBA_BOGUI.id ? 18 : npc.loyaltyToCourt,
                })),
                intelProgress: {
                    [HEBA_BOGUI.id]: 3,
                },
            },
            resolveRound: () => ({
                schemes: [
                    {
                        id: 'matrix-heba-secession',
                        targetNpcId: HEBA_BOGUI.id,
                        schemeType: 'secession',
                        playerSpeech: '西线诸军本就听公号令，只需借西征议把战时权柄坐实，朝廷也奈何不得。',
                        resolutionRoll: 0.02,
                    },
                ],
            }),
        },
    },
    {
        id: 'an_siming_rebellion',
        label: '安思明反叛线',
        targetNpcName: '安思明',
        options: {
            throughRound: 18,
            initialState: {
                currentRound: 18,
                npcs: INITIAL_NPCS.map(npc => ({
                    ...npc,
                    trust: npc.id === AN_SIMING.id ? 90 : npc.trust,
                    loyaltyToCourt: npc.id === AN_SIMING.id ? 12 : npc.loyaltyToCourt,
                })),
                intelProgress: {
                    [AN_SIMING.id]: 3,
                },
            },
            resolveRound: () => ({
                schemes: [
                    {
                        id: 'matrix-an-rebellion',
                        targetNpcId: AN_SIMING.id,
                        schemeType: 'rebellion',
                        playerSpeech: '如今北周两线俱疲，你若举兵自立，平叛之军未必能先顾到草原方向。',
                        resolutionRoll: 0.01,
                    },
                ],
            }),
        },
    },
]

function createControlledCampaignNpcs() {
    return INITIAL_NPCS.map(npc => (
        npc.powerBase === 'external'
            ? {
                ...npc,
                trust: Math.max(npc.trust, 60),
                loyaltyToCourt: Math.max(npc.loyaltyToCourt, 70),
                externalStatus: 'loyal' as const,
            }
            : { ...npc }
    ))
}
