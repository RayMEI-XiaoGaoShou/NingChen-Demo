import { beforeEach, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { getSafeSettlementJudgeFacts, getSettlementInvasionWindowLabel, getSettlementPolicyFollowupText, Settlement } from './Settlement'
import { useGameStore } from '../../stores/gameStore'
import settlementSource from './Settlement.tsx?raw'
import { INITIAL_NPCS } from '../../data/npcs'
import { INITIAL_FACTIONS } from '../../data/factions'
import { INITIAL_RELATIONSHIP_EDGES } from '../../data/npcRelationships'
import { NORTH_INITIAL, SOUTH_INITIAL } from '../../data/nationStats'
import { calculateCompositePower } from '../../game/types'

function resetStoreForSettlement() {
    useGameStore.setState({
        currentRound: 1,
        currentPhase: 'SETTLEMENT',
        schemeCount: 3,
        maxSchemes: 3,
        isGameOver: false,
        gameResult: 'NONE',
        playerDangerStage: 'safe',
        roundStartSnapshot: null,
        northStats: { ...NORTH_INITIAL },
        southStats: { ...SOUTH_INITIAL },
        northPower: calculateCompositePower(NORTH_INITIAL),
        southPower: calculateCompositePower(SOUTH_INITIAL),
        npcs: INITIAL_NPCS.map(npc => ({ ...npc })),
        factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
        relationships: INITIAL_RELATIONSHIP_EDGES.map(edge => ({ ...edge })),
        intelProgress: Object.fromEntries(INITIAL_NPCS.map(npc => [npc.id, 0])),
        currentSchemes: [],
        selectedPolicyOption: null,
        policyReason: '',
        selectedPolicyParse: null,
        npcFeedbacks: [],
        pendingStructuredSchemeIds: [],
        lastSettlement: null,
        lastPolicyReport: null,
        lastPolicyAftereffect: null,
        pendingBacklash: [],
        recentBacklash: [],
        roundHistory: [],
        endingReport: null,
        battleReport: null,
        shuCampaign: {
            state: 'idle',
            sourceRound: null,
            summary: '',
            ongoingNorthImpact: {},
            ongoingSouthImpact: {},
            remainingRounds: 0,
        },
        huainanCampaign: {
            state: 'idle',
            sourceRound: null,
            summary: '',
            ongoingNorthImpact: {},
            ongoingSouthImpact: {},
            remainingRounds: 0,
        },
        prologueStep: 'INGAME',
        helpOverlayOpen: false,
        helpOverlaySource: null,
        firstRoundGuideSeen: {
            round_start: true,
            court_observe: true,
            scheme_phase: true,
            empress_letter: true,
            scheme_feedback: true,
            settlement: true,
        },
    })
}

describe('Settlement rendering', () => {
    beforeEach(() => {
        resetStoreForSettlement()
    })

    it('does not crash when first-frame settlement data is missing invasion summary details', () => {
        useGameStore.setState({
            lastSettlement: {
                schemeResults: [],
                updatedNpcs: INITIAL_NPCS.map(npc => ({ ...npc })),
                factionsAfter: INITIAL_FACTIONS.map(faction => ({ ...faction })),
                relationshipsAfter: INITIAL_RELATIONSHIP_EDGES.map(edge => ({ ...edge })),
                northStatsAfter: { ...NORTH_INITIAL },
                southStatsAfter: { ...SOUTH_INITIAL },
                northPowerAfter: calculateCompositePower(NORTH_INITIAL),
                southPowerAfter: calculateCompositePower(SOUTH_INITIAL),
                trustChanges: {},
                intelUnlocks: {},
                relationshipReports: [],
                externalActionReports: [],
                factionCollapseReports: [],
                deathTriggered: false,
                deathKiller: null,
                playerDangerStage: 'safe',
                invasionTriggered: false,
                invasionPoliticalRatio: 0.7,
                gameResult: 'NONE',
                summaryText: '本回合无大碍。',
                policyReport: null,
                policyAftereffect: null,
                delayedBacklash: [],
                judgeFacts: {
                    eventImpactSummary: '主线事件继续发酵。',
                    factionSummary: '朝局暂稳。',
                    relationshipSummary: '',
                    externalSummary: '外部势力仍在观望。',
                    northSummary: '北周五维无明显波动。',
                    southSummary: '南陈本回合无额外问政回批收益。',
                    invasionSummary: undefined as any,
                    survivalSummary: '风声暂稳。',
                    aiNativeSummary: {
                        schemeHints: [],
                        backlashHints: [],
                        policyHints: [],
                    },
                },
                shuCampaign: {
                    state: 'idle',
                    sourceRound: null,
                    summary: '',
                    ongoingNorthImpact: {},
                    ongoingSouthImpact: {},
                    remainingRounds: 0,
                },
                huainanCampaign: {
                    state: 'idle',
                    sourceRound: null,
                    summary: '',
                    ongoingNorthImpact: {},
                    ongoingSouthImpact: {},
                    remainingRounds: 0,
                },
                campaignReports: [],
            } as any,
        })

        expect(() => renderToStaticMarkup(<Settlement />)).not.toThrow()
    })

    it('does not crash when settlement effect values contain undefined entries', () => {
        useGameStore.setState({
            lastSettlement: {
                schemeResults: [{
                    success: true,
                    feedbackText: 'ok',
                    trustChange: 1,
                    northDimensionChanges: {
                        finance: undefined,
                    },
                }],
                updatedNpcs: INITIAL_NPCS.map(npc => ({ ...npc })),
                factionsAfter: INITIAL_FACTIONS.map(faction => ({ ...faction })),
                relationshipsAfter: INITIAL_RELATIONSHIP_EDGES.map(edge => ({ ...edge })),
                northStatsAfter: { ...NORTH_INITIAL },
                southStatsAfter: { ...SOUTH_INITIAL },
                northPowerAfter: calculateCompositePower(NORTH_INITIAL),
                southPowerAfter: calculateCompositePower(SOUTH_INITIAL),
                trustChanges: {},
                intelUnlocks: {},
                relationshipReports: [],
                externalActionReports: [],
                factionCollapseReports: [],
                deathTriggered: false,
                deathKiller: null,
                playerDangerStage: 'safe',
                invasionTriggered: false,
                invasionPoliticalRatio: 0.7,
                gameResult: 'NONE',
                summaryText: 'summary',
                policyReport: {
                    sourceRound: 1,
                    topic: 'topic',
                    optionLabel: 'A',
                    optionContent: 'content',
                    reason: 'reason',
                    effects: {
                        grain: undefined,
                    },
                    effectSummary: 'effect summary',
                    legitimacyTone: 'steady',
                    focusMatched: true,
                },
                policyAftereffect: {
                    sourceRound: 1,
                    topic: 'topic',
                    summary: 'aftereffect',
                    effects: {
                        governance: undefined,
                    },
                    legitimacyTone: 'steady',
                    focusMatched: true,
                },
                delayedBacklash: [],
                judgeFacts: {
                    eventImpactSummary: 'event',
                    factionSummary: 'faction',
                    relationshipSummary: '',
                    externalSummary: 'external',
                    northSummary: 'north',
                    southSummary: 'south',
                    invasionSummary: 'window',
                    survivalSummary: 'safe',
                    aiNativeSummary: {
                        schemeHints: [],
                        backlashHints: [],
                        policyHints: [],
                    },
                },
                shuCampaign: {
                    state: 'idle',
                    sourceRound: null,
                    summary: '',
                    ongoingNorthImpact: {},
                    ongoingSouthImpact: {},
                    remainingRounds: 0,
                },
                huainanCampaign: {
                    state: 'idle',
                    sourceRound: null,
                    summary: '',
                    ongoingNorthImpact: {},
                    ongoingSouthImpact: {},
                    remainingRounds: 0,
                },
                campaignReports: [],
            } as any,
            currentSchemes: [{
                id: 'scheme-1',
                targetNpcId: INITIAL_NPCS[0]!.id,
                schemeType: 'advise',
                playerSpeech: 'speech',
            }] as any,
        })

        expect(() => renderToStaticMarkup(<Settlement />)).not.toThrow()
    })

    it('renders low-opacity character side portraits for scheme and policy result cards', () => {
        expect(settlementSource).toContain('settlement-scheme-target-portrait')
        expect(settlementSource).toContain('alt={`${npc.name}画像`}')
        expect(settlementSource).toContain('settlement-empress-portrait')
        expect(settlementSource).toContain('陈倩画像')
    })

    it('uses each scheme target as the low-opacity side portrait on scheme result cards', () => {
        expect(settlementSource).toContain('name={npc.name}')
        expect(settlementSource).toContain('alt={`${npc.name}画像`}')
    })

    it('returns concise policy follow-up wording for matched reasoning', () => {
        expect(getSettlementPolicyFollowupText(true)).toBe('你的附言切中此议的真正关节，新政的收益也会延续到下一回合。')
        expect(getSettlementPolicyFollowupText(false)).toBe('你的附言尚嫌宽泛，但新政的收益仍会延续到下一回合。')
    })

    it('fills missing judge facts with safe fallback text', () => {
        const judgeFacts = getSafeSettlementJudgeFacts(null)

        expect(judgeFacts.invasionSummary).toBe('南征窗口仍待后续观察。')
        expect(judgeFacts.aiNativeSummary.schemeHints).toEqual([])
        expect(judgeFacts.aiNativeSummary.backlashHints).toEqual([])
    })

    it('derives settlement invasion window labels from the court balance ratio', () => {
        expect(getSettlementInvasionWindowLabel(1.2)).toBe('南征箭在弦上')
        expect(getSettlementInvasionWindowLabel(0.93)).toBe('南征议势升温')
        expect(getSettlementInvasionWindowLabel(0.79)).toBe('朝廷仍偏安内')
        expect(getSettlementInvasionWindowLabel(null)).toBe('南征窗口仍待观察')
    })
})
