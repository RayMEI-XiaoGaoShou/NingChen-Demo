import { describe, expect, it } from 'vitest'
import { INITIAL_NPCS } from '../data/npcs'
import { buildSchemeNpcActionNarrative, validateSchemeNpcActionNarrative } from './schemeNpcAction'
import type { SchemeResult } from './schemeEngine'

function makeResult(patch: Partial<SchemeResult> = {}): Pick<
    SchemeResult,
    'success' | 'nationEffects' | 'factionEffects' | 'personEffects' | 'specialAction' | 'relatedImpactSummary'
> {
    return {
        success: true,
        nationEffects: {},
        factionEffects: {},
        personEffects: {
            trustDelta: 0,
            relatedTrustDelta: 0,
            loyaltyDelta: 0,
            relatedLoyaltyDelta: 0,
            militaryPowerDelta: 0,
            relatedMilitaryPowerDelta: 0,
            alignmentShift: null,
            intelDelta: 0,
            externalStatus: null,
        },
        specialAction: null,
        relatedImpactSummary: null,
        ...patch,
    }
}

describe('validateSchemeNpcActionNarrative', () => {
    const zongai = INITIAL_NPCS.find(npc => npc.id === 'zongai')!
    const linghu = INITIAL_NPCS.find(npc => npc.id === 'linghuelvguang')!
    const hebaqi = INITIAL_NPCS.find(npc => npc.id === 'hebaqí')!
    const yuwendi = INITIAL_NPCS.find(npc => npc.id === 'yuwendi')!
    const zuting = INITIAL_NPCS.find(npc => npc.id === 'zuting')!

    it('rejects ai text that omits a damaged related npc', () => {
        const validation = validateSchemeNpcActionNarrative({
            text: '宗艾先扣住粮道与军需账册，转交御前另行查验。',
            result: makeResult({
                nationEffects: { grain: -0.4, military: -0.5 },
                personEffects: {
                    ...makeResult().personEffects,
                    relatedMilitaryPowerDelta: -1,
                },
                relatedImpactSummary: '令狐律光的粮道与军需军令受牵动',
            }),
            targetNpc: zongai,
            relatedNpc: linghu,
        })

        expect(validation.accepted).toBe(false)
        expect(validation.reasons).toContain('missing_related_npc')
    })

    it('accepts text that names the actor, related npc, and a main impact dimension', () => {
        const validation = validateSchemeNpcActionNarrative({
            text: '宗艾暗查令狐律光的粮道与军需调拨，先扣住兵械文书，再把疑点递向御前。',
            result: makeResult({
                nationEffects: { grain: -0.4, military: -0.5 },
                personEffects: {
                    ...makeResult().personEffects,
                    relatedMilitaryPowerDelta: -1,
                },
                relatedImpactSummary: '令狐律光的粮道与军需军令受牵动',
            }),
            targetNpc: zongai,
            relatedNpc: linghu,
        })

        expect(validation.accepted).toBe(true)
        expect(validation.reasons).toEqual([])
    })

    it('rejects text that exposes the protagonist as a southern agent', () => {
        const validation = validateSchemeNpcActionNarrative({
            text: '宗艾看出萧宝颖是南陈内应，于是顺势扣住令狐律光的军需账册。',
            result: makeResult({
                nationEffects: { military: -0.5 },
                personEffects: {
                    ...makeResult().personEffects,
                    relatedMilitaryPowerDelta: -1,
                },
                relatedImpactSummary: '令狐律光的军需军令受牵动',
            }),
            targetNpc: zongai,
            relatedNpc: linghu,
        })

        expect(validation.accepted).toBe(false)
        expect(validation.reasons).toContain('forbidden_secret_leak')
    })

    it('accepts canonical aliases for target names in npc action validation', () => {
        const dowagerValidation = validateSchemeNpcActionNarrative({
            text: '太后娘娘按住粮道与度支旧账，先令中枢重核军需，再把奏牍压到帘前议定。',
            result: makeResult({
                nationEffects: { grain: -0.4, governance: -0.3 },
            }),
            targetNpc: hebaqi,
            relatedNpc: null,
        })
        const princeValidation = validateSchemeNpcActionNarrative({
            text: '燕王扣住军需账册与兵械名籍，先命左府重排军令，再逼中枢承认其调度。',
            result: makeResult({
                nationEffects: { military: -0.5, governance: -0.3 },
            }),
            targetNpc: yuwendi,
            relatedNpc: null,
        })

        expect(dowagerValidation.accepted).toBe(true)
        expect(dowagerValidation.reasons).toEqual([])
        expect(princeValidation.accepted).toBe(true)
        expect(princeValidation.reasons).toEqual([])
    })

    it('fallback explains why grain finance and governance are damaged', () => {
        const narrative = buildSchemeNpcActionNarrative({
            action: {
                targetNpcId: zuting.id,
                schemeType: 'advise',
                playerSpeech: '查三仓旧账。',
            },
            targetNpc: zuting,
            relatedNpc: null,
            result: makeResult({
                nationEffects: { grain: -0.2, finance: -0.1, governance: -0.1 },
            }),
        })

        expect(narrative?.text).toMatch(/粮|仓|仓廪|粮道|转运/u)
        expect(narrative?.text).toMatch(/亏空|迟滞|停转|断档|受阻|截住/u)
    })

    it('fallback explains positive advise as a benefit mechanism when it strengthens North Zhou', () => {
        const narrative = buildSchemeNpcActionNarrative({
            action: {
                targetNpcId: yuwendi.id,
                schemeType: 'advise',
                playerSpeech: '先补军需，再续粮道。此策虽利燕王，也会让北周军粮更顺。',
            },
            targetNpc: yuwendi,
            relatedNpc: null,
            result: makeResult({
                nationEffects: { grain: 0.1, military: 0.1 },
            }),
        })

        expect(narrative?.text).toMatch(/宇文棣|燕王|左丞相/u)
        expect(narrative?.text).toMatch(/粮|仓|仓廪|粮道|转运/u)
        expect(narrative?.text).toMatch(/军|兵|兵械|军需|军令/u)
        expect(narrative?.text).toMatch(/补足|续上|转运顺畅|整军|补械|军令更顺/u)
        expect(narrative?.text).not.toContain('这番献策')
    })

    it('fallback narrates a failed scheme as target counteraction', () => {
        const narrative = buildSchemeNpcActionNarrative({
            action: {
                targetNpcId: zuting.id,
                schemeType: 'slander',
                playerSpeech: '拿旧账试探祖廷。',
            },
            targetNpc: zuting,
            relatedNpc: null,
            result: makeResult({
                success: false,
                personEffects: {
                    ...makeResult().personEffects,
                    trustDelta: -6,
                },
            }),
        })

        expect((narrative as any)?.kind).toBe('counter')
        expect(narrative?.text).toContain('祖廷')
        expect(narrative?.text).toMatch(/反查|收口|冷处理|戒心|按下/u)
    })

    it('fallback narrates trust-only success as attitude instead of public action', () => {
        const narrative = buildSchemeNpcActionNarrative({
            action: {
                targetNpcId: hebaqi.id,
                schemeType: 'appeal',
                playerSpeech: '只求帘前留一条退路。',
            },
            targetNpc: hebaqi,
            relatedNpc: null,
            result: makeResult({
                personEffects: {
                    ...makeResult().personEffects,
                    trustDelta: 5,
                },
            }),
        })

        expect((narrative as any)?.kind).toBe('attitude')
        expect(narrative?.text).toMatch(/太后|贺拔琪/u)
        expect(narrative?.text).toMatch(/信|记下|愿意|留|看作/u)
        expect(narrative?.text).not.toMatch(/北周 财政|北周 粮草|国力|军令迟滞/u)
    })

    it('fallback narrates intel progress as exposed hints without leaking southern identity', () => {
        const narrative = buildSchemeNpcActionNarrative({
            action: {
                targetNpcId: zuting.id,
                schemeType: 'probe',
                playerSpeech: '只问一句风向，看看他是否愿意多吐半句口风。',
            },
            targetNpc: zuting,
            relatedNpc: null,
            result: makeResult({
                personEffects: {
                    ...makeResult().personEffects,
                    trustDelta: 3,
                    intelDelta: 1,
                },
            }),
        })

        expect((narrative as any)?.kind).toBe('intel')
        expect(narrative?.text).toContain('祖廷')
        expect(narrative?.text).toMatch(/口风|线索|露出|摸到/u)
        expect(narrative?.text).not.toMatch(/南陈暗线|南陈内应/u)
    })

    it('fallback turns frame into target misstep plus northern observer feedback', () => {
        const narrative = buildSchemeNpcActionNarrative({
            action: {
                targetNpcId: zongai.id,
                schemeType: 'frame',
                playerSpeech: '让他急着自辩，自己乱了案牍口径。',
            },
            targetNpc: zongai,
            relatedNpc: null,
            result: makeResult({
                nationEffects: { governance: -0.4, socialOrder: -0.3 },
                northParse: {
                    characterFit: 0.8,
                    eventFit: 0.8,
                    structuralPenetration: 0.8,
                    executability: 0.8,
                    exposureRisk: 0.1,
                    financeRelevance: 0.1,
                    grainRelevance: 0.1,
                    militaryRelevance: 0.1,
                    socialOrderRelevance: 0.72,
                    governanceRelevance: 0.82,
                    dominantIntent: 'induce',
                    selfTrapPotential: 0.84,
                    scapegoatClarity: 0.76,
                    evidence: [],
                },
            }),
        })

        expect(narrative?.text).toMatch(/急于自辩|切割|压住口风/u)
        expect(narrative?.text).toMatch(/御前|帝党|北周朝堂|中枢法司/u)
        expect(narrative?.text).toMatch(/案牍|风声|权责|推诿|壅塞/u)
    })
})
