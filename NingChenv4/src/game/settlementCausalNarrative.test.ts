import { describe, expect, it } from 'vitest'
import { buildSettlementSchemeCausalEvents, selectSettlementChronicleQuoteCandidate } from './settlementCausalNarrative'
import type { NorthSchemeParseResult } from './types'

const parse: NorthSchemeParseResult = {
    characterFit: 0.8,
    eventFit: 0.7,
    structuralPenetration: 0.7,
    executability: 0.7,
    exposureRisk: 0.1,
    financeRelevance: 0.2,
    grainRelevance: 0.7,
    militaryRelevance: 0.6,
    socialOrderRelevance: 0.1,
    governanceRelevance: 0.5,
    dominantIntent: 'divide',
    evidence: [],
}

function makeResult(overrides: Record<string, unknown> = {}) {
    return {
        trustChange: 6,
        relatedTrustChange: 0,
        northDimensionChanges: { grain: -1 },
        feedbackText: '祖廷略作沉吟，显然已被你的离间拨动了算盘。',
        success: true,
        personEffects: {
            trustDelta: 6,
            relatedTrustDelta: 0,
            loyaltyDelta: 0,
            relatedLoyaltyDelta: 0,
            militaryPowerDelta: 0,
            relatedMilitaryPowerDelta: 0,
            alignmentShift: null,
            intelDelta: 0,
            externalStatus: null,
        },
        factionEffects: {},
        nationEffects: { grain: -1 },
        specialAction: null,
        northParse: parse,
        delayedBacklash: [],
        ...overrides,
    } as any
}

describe('buildSettlementSchemeCausalEvents', () => {
    it('carries NPC feedback, follow-up reply, and numeric consequence into judge prompt lines', () => {
        const events = buildSettlementSchemeCausalEvents({
            actions: [{
                id: 's1',
                targetNpcId: 'zuting',
                relatedNpcId: 'heba-bogui',
                schemeType: 'alienate',
                playerSpeech: '陇右勋贵跋扈，粮饷不可不查。',
                followUp: {
                    questionText: '你要我如何落笔？',
                    playerReply: '先从军需账册查起。',
                    finalNpcReply: '本官明日便以账册为由入奏帘前。',
                    status: 'answered',
                },
            }],
            results: [makeResult()],
            npcs: [
                { id: 'zuting', name: '祖廷', powerBase: 'court' },
                { id: 'heba-bogui', name: '贺拔伯圭', powerBase: 'external' },
            ] as any,
            npcFeedbacks: [{
                id: 's1',
                feedback: '此事若从军需查起，帘前自然听得进去。',
            }],
        })

        expect(events[0]?.promptLine).toContain('对祖廷施“离间”，牵动贺拔伯圭，成功')
        expect(events[0]?.promptLine).toContain('NPC回报')
        expect(events[0]?.promptLine).toContain('追问回应')
        expect(events[0]?.promptLine).toContain('北周粮赋-1')
    })

    it('explains external omen consequences through loyalty and military movement', () => {
        const events = buildSettlementSchemeCausalEvents({
            actions: [{
                id: 's2',
                targetNpcId: 'erzhu',
                schemeType: 'omen',
                playerSpeech: '赤星犯边，边帅不可不防。',
                omenSpeechInput: {
                    omenText: '赤星犯边',
                    interpretationText: '边镇有异心',
                },
            }],
            results: [makeResult({
                personEffects: {
                    trustDelta: 0,
                    relatedTrustDelta: 0,
                    loyaltyDelta: -8,
                    relatedLoyaltyDelta: 0,
                    militaryPowerDelta: -3,
                    relatedMilitaryPowerDelta: 0,
                    alignmentShift: null,
                    intelDelta: 0,
                    externalStatus: null,
                },
                nationEffects: { military: -0.5, governance: -0.4 },
            })],
            npcs: [{ id: 'erzhu', name: '尔朱烈', powerBase: 'external' }] as any,
            npcFeedbacks: [{
                id: 's2',
                feedback: '本节度岂会有异心？',
                omenEcho: {
                    speakerNpcId: 'hebaqi',
                    speakerNpcName: '贺拔琪',
                    speakerTitle: '摄政太后',
                    text: '既有灾异，粮道军需便该重新核查。',
                    source: 'ai',
                },
            }],
        })

        expect(events[0]?.promptLine).toContain('谶纬余音')
        expect(events[0]?.promptLine).toContain('尔朱烈忠诚-8')
        expect(events[0]?.promptLine).toContain('尔朱烈军力-3')
        expect(events[0]?.promptLine).toContain('粮道、军需与监军')
    })

    it('prefers the final follow-up reply as the chronicle quote source', () => {
        const events = buildSettlementSchemeCausalEvents({
            actions: [{
                id: 's3',
                targetNpcId: 'zuting',
                schemeType: 'slander',
                playerSpeech: '账册可查。',
                followUp: {
                    questionText: '你要本官如何落笔？',
                    playerReply: '以军需账册为由。',
                    finalNpcReply: '本官明日便以账册为由入奏帘前。',
                    status: 'answered',
                },
            }],
            results: [makeResult()],
            npcs: [{ id: 'zuting', name: '祖廷', powerBase: 'court' }] as any,
            npcFeedbacks: [{
                id: 's3',
                feedback: '此事确可一试。',
            }],
        })

        const candidate = selectSettlementChronicleQuoteCandidate(events)

        expect(candidate?.speakerName).toBe('祖廷')
        expect(candidate?.source).toBe('follow_up')
        expect(candidate?.sourceText).toContain('入奏帘前')
    })

    it('prefers successful strategic impact over trust-only feedback', () => {
        const events = buildSettlementSchemeCausalEvents({
            actions: [
                {
                    id: 'trust-only',
                    targetNpcId: 'zuting',
                    schemeType: 'probe',
                    playerSpeech: '先探口风。',
                },
                {
                    id: 'impact',
                    targetNpcId: 'hebaqi',
                    schemeType: 'frame',
                    playerSpeech: '此事可令御史核账。',
                },
            ],
            results: [
                makeResult({
                    nationEffects: {},
                    trustChange: 8,
                    personEffects: {
                        trustDelta: 8,
                        relatedTrustDelta: 0,
                        loyaltyDelta: 0,
                        relatedLoyaltyDelta: 0,
                        militaryPowerDelta: 0,
                        relatedMilitaryPowerDelta: 0,
                        alignmentShift: null,
                        intelDelta: 0,
                        externalStatus: null,
                    },
                }),
                makeResult({
                    nationEffects: { governance: -0.6 },
                    trustChange: 2,
                    personEffects: {
                        trustDelta: 2,
                        relatedTrustDelta: 0,
                        loyaltyDelta: 0,
                        relatedLoyaltyDelta: 0,
                        militaryPowerDelta: 0,
                        relatedMilitaryPowerDelta: 0,
                        alignmentShift: null,
                        intelDelta: 0,
                        externalStatus: null,
                    },
                }),
            ],
            npcs: [
                { id: 'zuting', name: '祖廷', powerBase: 'court' },
                { id: 'hebaqi', name: '贺拔琪', powerBase: 'court' },
            ] as any,
            npcFeedbacks: [
                { id: 'trust-only', feedback: '本官且听着。' },
                { id: 'impact', feedback: '哀家会命御史先查此账。' },
            ],
        })

        const candidate = selectSettlementChronicleQuoteCandidate(events)

        expect(candidate?.speakerName).toBe('贺拔琪')
        expect(candidate?.sourceText).toContain('御史')
    })

    it('returns no chronicle quote candidate when there is no NPC-facing text', () => {
        const events = buildSettlementSchemeCausalEvents({
            actions: [{
                id: 'empty',
                targetNpcId: 'zuting',
                schemeType: 'probe',
                playerSpeech: '探口风。',
            }],
            results: [makeResult()],
            npcs: [{ id: 'zuting', name: '祖廷', powerBase: 'court' }] as any,
            npcFeedbacks: [],
        })

        expect(selectSettlementChronicleQuoteCandidate(events)).toBeNull()
    })
})
