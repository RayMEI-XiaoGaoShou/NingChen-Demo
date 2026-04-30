import { describe, expect, it } from 'vitest'
import { settleRound } from './roundSettlement'
import { NORTH_INITIAL, SOUTH_INITIAL } from '../data/nationStats'
import { INITIAL_NPCS } from '../data/npcs'
import { INITIAL_FACTIONS } from '../data/factions'
import { deriveRelationMemoryEntriesForRound } from './npcRelationshipMemory'

describe('settleRound layered settlement', () => {
    const idleCampaign = {
        state: 'idle',
        sourceRound: null,
        summary: '',
        ongoingNorthImpact: {},
        ongoingSouthImpact: {},
        remainingRounds: 0,
    } as const

    it('returns updated NPCs and factions so schemes resolve through person -> faction -> nation', () => {
        const yuwendi = INITIAL_NPCS.find(npc => npc.name === '宇文棣')!

        const result = settleRound({
            round: 1,
            schemes: [
                {
                    id: 'scheme-layered',
                    targetNpcId: yuwendi.id,
                    schemeType: 'advise',
                    playerSpeech: '孤若欲压后党，先抓住淮南边摩擦做足主战名分，再迫祖廷交出饷权。',
                    resolutionRoll: 0.05,
                    northParse: {
                        characterFit: 0.74,
                        eventFit: 0.58,
                        structuralPenetration: 0.7,
                        executability: 0.72,
                        exposureRisk: 0.14,
                        financeRelevance: 0.42,
                        grainRelevance: 0.28,
                        militaryRelevance: 0.2,
                        socialOrderRelevance: 0.34,
                        governanceRelevance: 0.78,
                        dominantIntent: 'strategize',
                        stateBenefit: -0.54,
                        targetBenefit: 0.68,
                        factionBenefit: 0.2,
                        advicePolarity: 'pro_target_anti_state',
                        legitimacyDirection: 0,
                        omenPolarity: 'vague_or_ceremonial',
                        evidence: [],
                    },
                },
            ],
            northStats: { ...NORTH_INITIAL },
            southStats: { ...SOUTH_INITIAL },
            npcs: INITIAL_NPCS.map(npc => ({ ...npc, trust: npc.name === '宇文棣' ? 62 : npc.trust })),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: {},
            policyOptionIndex: null,
            policyReason: '',
        }) as any

        expect(result.updatedNpcs?.find((npc: any) => npc.name === '宇文棣')?.trust).toBeGreaterThan(62)
        expect(result.schemeResults[0]?.personEffects?.trustDelta).toBeGreaterThan(0)
        expect(Math.abs(result.schemeResults[0]?.nationEffects?.governance ?? 0)).toBeGreaterThan(0)
        expect(result.northStatsAfter.governance).toBeLessThan(NORTH_INITIAL.governance + 0.2)
    })

    it('keeps later relation memories attached to the processed scheme when an earlier one is skipped', () => {
        const hebaqi = INITIAL_NPCS.find(npc => npc.id === 'hebaqí')!
        const yuwendi = INITIAL_NPCS.find(npc => npc.id === 'yuwendi')!
        const zuting = INITIAL_NPCS.find(npc => npc.id === 'zuting')!
        const npcsBefore = INITIAL_NPCS.map(npc => ({ ...npc, trust: npc.id === yuwendi.id ? 72 : npc.trust }))

        const result = settleRound({
            round: 12,
            schemes: [
                {
                    id: 'skip-me',
                    targetNpcId: hebaqi.id,
                    schemeType: 'slander',
                    playerSpeech: '先让他自己开口。',
                },
                {
                    id: 'keep-me',
                    targetNpcId: yuwendi.id,
                    relatedNpcId: zuting.id,
                    schemeType: 'slander',
                    playerSpeech: '这个口风必须传到祖廷耳中。',
                    resolutionRoll: 0.01,
                },
            ],
            northStats: { ...NORTH_INITIAL },
            southStats: { ...SOUTH_INITIAL },
            npcs: npcsBefore,
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: {},
            policyOptionIndex: null,
            policyReason: '',
        }) as any

        expect(result.processedSchemes).toHaveLength(1)
        expect(result.processedSchemes[0]?.targetNpcId).toBe(yuwendi.id)

        const entries = deriveRelationMemoryEntriesForRound({
            round: 12,
            schemes: result.processedSchemes,
            schemeResults: result.schemeResults,
            npcsBefore,
            npcsAfter: result.updatedNpcs,
        })

        expect(entries).toEqual([
            expect.objectContaining({
                holderNpcId: yuwendi.id,
                subjectNpcId: zuting.id,
                stance: 'suspicion',
            }),
        ])
    })

    it('resolves secession or rebellion for eligible external figures in the same round', () => {
        const hebabogui = INITIAL_NPCS.find(npc => npc.name === '贺拔伯圭')!

        const result = settleRound({
            round: 7,
            schemes: [
                {
                    id: 'scheme-secession',
                    targetNpcId: hebabogui.id,
                    schemeType: 'secession' as any,
                    playerSpeech: '西线诸军本就听公号令，只需借西征议把战时权坐实，朝廷也奈何不得。',
                    resolutionRoll: 0.02,
                },
            ],
            northStats: { ...NORTH_INITIAL },
            southStats: { ...SOUTH_INITIAL },
            npcs: INITIAL_NPCS.map(npc => ({
                ...npc,
                trust: npc.name === '贺拔伯圭' ? 82 : npc.trust,
                loyaltyToCourt: npc.name === '贺拔伯圭' ? 18 : npc.loyaltyToCourt,
            })),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: { [hebabogui.id]: 3 },
            policyOptionIndex: null,
            policyReason: '',
        }) as any

        const externalNpc = result.updatedNpcs?.find((npc: any) => npc.name === '贺拔伯圭')
        expect(externalNpc?.externalStatus === 'secession' || externalNpc?.externalStatus === 'rebellion').toBe(true)
        expect(result.externalActionReports?.[0]?.outcome).toBeTruthy()
        expect((result.schemeResults[0]?.nationEffects?.military ?? 0) < 0).toBe(true)
    })

    it('rejects rebellion when the stricter trust, loyalty, round or intel gates are not met', () => {
        const ansiming = INITIAL_NPCS.find(npc => npc.name === '安思明')!

        const result = settleRound({
            round: 9,
            schemes: [
                {
                    id: 'scheme-rebellion-locked',
                    targetNpcId: ansiming.id,
                    schemeType: 'rebellion' as any,
                    playerSpeech: '你若今夜举兵，朝廷南顾无暇北顾，正可夺路而去。',
                    resolutionRoll: 0.01,
                },
            ],
            northStats: { ...NORTH_INITIAL },
            southStats: { ...SOUTH_INITIAL },
            npcs: INITIAL_NPCS.map(npc => ({
                ...npc,
                trust: npc.name === '安思明' ? 79 : npc.trust,
                loyaltyToCourt: npc.name === '安思明' ? 20 : npc.loyaltyToCourt,
            })),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: { [ansiming.id]: 2 },
            policyOptionIndex: null,
            policyReason: '',
        }) as any

        expect(result.externalActionReports).toHaveLength(0)
        expect(result.schemeResults[0]?.success).toBe(false)
    })

    it('does not auto-upgrade ordinary external pressure into a stored intermediate status once loyalty drops', () => {
        const erzhulie = INITIAL_NPCS.find(npc => npc.name === '尔朱烈')!

        const result = settleRound({
            round: 8,
            schemes: [
                {
                    id: 'ordinary-external-pressure',
                    targetNpcId: erzhulie.id,
                    schemeType: 'advise',
                    playerSpeech: '眼下若把边军粮械、骑从与调度都先抓稳在自己手里，朝廷反倒更不敢轻慢你这一镇。',
                    resolutionRoll: 0.01,
                    northParse: {
                        characterFit: 0.76,
                        eventFit: 0.72,
                        structuralPenetration: 0.7,
                        executability: 0.78,
                        exposureRisk: 0.1,
                        financeRelevance: 0.12,
                        grainRelevance: 0.44,
                        militaryRelevance: 0.44,
                        socialOrderRelevance: 0.2,
                        governanceRelevance: 0.22,
                        dominantIntent: 'strategize',
                        stateBenefit: -0.28,
                        targetBenefit: 0.52,
                        advicePolarity: 'pro_target_anti_state',
                        evidence: [],
                    },
                },
            ],
            northStats: { ...NORTH_INITIAL },
            southStats: { ...SOUTH_INITIAL },
            npcs: INITIAL_NPCS.map(npc => (
                npc.id === erzhulie.id
                    ? { ...npc, trust: 62, loyaltyToCourt: 42, externalStatus: 'loyal' as const }
                    : { ...npc }
            )),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: {},
            policyOptionIndex: null,
            policyReason: '',
        }) as any

        const updatedErzhulie = result.updatedNpcs?.find((npc: any) => npc.id === erzhulie.id)

        expect(updatedErzhulie?.loyaltyToCourt).toBeLessThan(42)
        expect(updatedErzhulie?.externalStatus).toBe('loyal')
    })

    it('keeps failed secession attempts as non-terminal pressure instead of forcing a stored intermediate status', () => {
        const hebabogui = INITIAL_NPCS.find(npc => npc.id === 'hebaboguì')!

        const result = settleRound({
            round: 7,
            schemes: [
                {
                    id: 'failed-secession-should-not-force-intermediate-status',
                    targetNpcId: hebabogui.id,
                    schemeType: 'secession' as any,
                    playerSpeech: '西线若真想自成一局，也得先把兵、粮、心都捏在自己手里。',
                    resolutionRoll: 0.01,
                },
            ],
            northStats: { ...NORTH_INITIAL },
            southStats: { ...SOUTH_INITIAL },
            npcs: INITIAL_NPCS.map(npc => (
                npc.id === hebabogui.id
                    ? {
                        ...npc,
                        trust: 74,
                        loyaltyToCourt: 34,
                        militaryPower: 10,
                        externalStatus: 'loyal' as const,
                        highActionBias: 'secession' as const,
                    }
                    : { ...npc }
            )),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: { [hebabogui.id]: 3 },
            policyOptionIndex: null,
            policyReason: '',
        }) as any

        const updatedHebabogui = result.updatedNpcs?.find((npc: any) => npc.id === hebabogui.id)

        expect(result.externalActionReports?.[0]?.action).toBe('secession')
        expect(result.externalActionReports?.[0]?.outcome).toContain('暂观朝局')
        expect(updatedHebabogui?.externalStatus).toBe('loyal')
    })

    it('produces richer judge facts for settlement narration', () => {
        const zuting = INITIAL_NPCS.find(npc => npc.name === '祖廷')!

        const result = settleRound({
            round: 13,
            schemes: [
                {
                    id: 'scheme-judge-facts',
                    targetNpcId: zuting.id,
                    schemeType: 'advise',
                    playerSpeech: '疫疠、仓廪与诏令都该收回中枢，不可再让河北豪右借乱自肥。',
                    resolutionRoll: 0.03,
                },
            ],
            northStats: { ...NORTH_INITIAL },
            southStats: { ...SOUTH_INITIAL },
            npcs: INITIAL_NPCS.map(npc => ({ ...npc, trust: npc.name === '祖廷' ? 66 : npc.trust })),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: {},
            policyOptionIndex: null,
            policyReason: '',
        }) as any

        expect(result.judgeFacts?.eventImpactSummary).toContain('疫')
        expect(result.judgeFacts?.factionSummary).toBeTruthy()
        expect(result.judgeFacts?.northSummary).toBeTruthy()
    })

    it('lets stronger player speech amplify the full settlement chain, not only success rate', () => {
        const zuting = INITIAL_NPCS.find(npc => npc.name === '祖廷')!
        const boosted = settleRound({
            round: 3,
            schemes: [
                {
                    id: 'speech-strong',
                    targetNpcId: zuting.id,
                    schemeType: 'advise',
                    playerSpeech: '丞相若趁灾年清丈仓廪、把饷权与赈务一并收回中枢，既能堵住河北豪右，也能让帝党无从越权。',
                    resolutionRoll: 0.04,
                },
            ],
            northStats: { ...NORTH_INITIAL },
            southStats: { ...SOUTH_INITIAL },
            npcs: INITIAL_NPCS.map(npc => ({ ...npc, trust: npc.name === '祖廷' ? 64 : npc.trust })),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: {},
            policyOptionIndex: null,
            policyReason: '',
        }) as any
        const bland = settleRound({
            round: 3,
            schemes: [
                {
                    id: 'speech-weak',
                    targetNpcId: zuting.id,
                    schemeType: 'advise',
                    playerSpeech: '请丞相帮忙。',
                    resolutionRoll: 0.04,
                },
            ],
            northStats: { ...NORTH_INITIAL },
            southStats: { ...SOUTH_INITIAL },
            npcs: INITIAL_NPCS.map(npc => ({ ...npc, trust: npc.name === '祖廷' ? 64 : npc.trust })),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: {},
            policyOptionIndex: null,
            policyReason: '',
        }) as any

        expect(boosted.schemeResults[0]?.personEffects?.trustDelta).toBeGreaterThan(bland.schemeResults[0]?.personEffects?.trustDelta ?? 0)
        expect(Math.abs(boosted.schemeResults[0]?.nationEffects?.governance ?? 0)).toBeGreaterThan(
            Math.abs(bland.schemeResults[0]?.nationEffects?.governance ?? 0),
        )
    })

    it('tracks shu momentum from battle-relevant successful schemes', () => {
        const zuting = INITIAL_NPCS.find(npc => npc.name === '祖廷')!

        const result = settleRound({
            round: 8,
            schemes: [
                {
                    id: 'momentum-shu',
                    targetNpcId: zuting.id,
                    schemeType: 'advise',
                    playerSpeech: '丞相若先收回转运、仓储与诏令节次，西线军粮和主帅调度才能重新握在中枢手里。',
                    resolutionRoll: 0.03,
                    northParse: {
                        characterFit: 0.72,
                        eventFit: 0.68,
                        structuralPenetration: 0.7,
                        executability: 0.66,
                        exposureRisk: 0.16,
                        financeRelevance: 0.12,
                        grainRelevance: 0.84,
                        militaryRelevance: 0.74,
                        socialOrderRelevance: 0.2,
                        governanceRelevance: 0.82,
                        dominantIntent: 'strategize',
                        evidence: [],
                    },
                },
            ],
            northStats: { ...NORTH_INITIAL },
            southStats: { ...SOUTH_INITIAL },
            npcs: INITIAL_NPCS.map(npc => ({ ...npc, trust: npc.name === '祖廷' ? 66 : npc.trust })),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: {},
            policyOptionIndex: null,
            policyReason: '',
            shuMomentum: 0,
            huainanMomentum: 0,
        }) as any

        expect(result.shuMomentum).toBeGreaterThan(0)
        expect(result.huainanMomentum).toBe(0)
    })

    it('grants event-driven intel unlocks on configured rounds', () => {
        const result = settleRound({
            round: 13,
            schemes: [],
            northStats: { ...NORTH_INITIAL },
            southStats: { ...SOUTH_INITIAL },
            npcs: INITIAL_NPCS.map(npc => ({ ...npc })),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: {},
            policyOptionIndex: null,
            policyReason: '',
        }) as any

        expect(result.intelUnlocks?.zongai).toBeGreaterThan(0)
    })

    it('adds faction and nation penalties when a key structure is destabilized', () => {
        const hebabogui = INITIAL_NPCS.find(npc => npc.name === '贺拔伯圭')!
        const duguwenyue = INITIAL_NPCS.find(npc => npc.name === '独孤文约')!

        const result = settleRound({
            round: 7,
            schemes: [
                {
                    id: 'scheme-west-break',
                    targetNpcId: hebabogui.id,
                    relatedNpcId: duguwenyue.id,
                    schemeType: 'alienate',
                    playerSpeech: '独孤文约正借后党和中枢接管权架空公的西线主导，若再不先下手，帅权迟早旁落。',
                    resolutionRoll: 0.01,
                },
            ],
            northStats: { ...NORTH_INITIAL },
            southStats: { ...SOUTH_INITIAL },
            npcs: INITIAL_NPCS.map(npc => ({
                ...npc,
                trust: npc.id === hebabogui.id ? 72 : npc.trust,
            })),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: { [hebabogui.id]: 2 },
            policyOptionIndex: null,
            policyReason: '',
        }) as any

        expect(result.relationshipReports?.[0]?.structureId).toBe('west_command_triangle')
        expect(result.judgeFacts?.factionSummary).toContain('西线')
        expect((result.northStatsAfter.governance ?? 0)).toBeLessThan(NORTH_INITIAL.governance)
    })

    it('carries policy scoring focus and delayed aftereffect into the settlement result', () => {
        const result = settleRound({
            round: 2,
            schemes: [],
            northStats: { ...NORTH_INITIAL },
            southStats: { ...SOUTH_INITIAL },
            npcs: INITIAL_NPCS.map(npc => ({ ...npc })),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: {},
            policyOptionIndex: 0,
            policyReason: '可把流民编户屯田，再按州郡分流安置，先补春耕口粮与地方执行路径，让新户尽快化为税粮与劳力。',
        }) as any

        expect(result.policyReport?.focusMatched).toBe(true)
        expect(result.policyReport?.legitimacyTone).toBe('steady')
        expect(result.policyAftereffect?.summary).toBe('你上回合的奏对收益延续到了这一回合。')
        expect((result.policyAftereffect?.effects.grain ?? 0)).toBeGreaterThan(0)
        expect(result.judgeFacts?.southSummary).toContain('后效')
    })

    it('does not create policy aftereffect copy when the player leaves policy reasoning empty', () => {
        const result = settleRound({
            round: 2,
            schemes: [],
            northStats: { ...NORTH_INITIAL },
            southStats: { ...SOUTH_INITIAL },
            npcs: INITIAL_NPCS.map(npc => ({ ...npc })),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: {},
            policyOptionIndex: 0,
            policyReason: '',
        }) as any

        expect(result.policyReport).toBeTruthy()
        expect(result.policyReport?.reason).toBe('')
        expect(result.policyReport?.focusMatched).toBe(false)
        expect(result.policyAftereffect).toBeNull()
        expect(result.judgeFacts?.aiNativeSummary.policyHints.join('')).not.toContain('附言')
    })

    it('adds narrow shu campaign momentum from early logistics-oriented policy reasoning', () => {
        const result = settleRound({
            round: 2,
            schemes: [],
            northStats: { ...NORTH_INITIAL },
            southStats: { ...SOUTH_INITIAL },
            npcs: INITIAL_NPCS.map(npc => ({ ...npc })),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: {},
            policyOptionIndex: 0,
            policyReason: '先把流民编入屯田、补足口粮，再把州郡转运和田亩清理一起压实，让新户尽快化成税粮与征发基础。',
            policyParse: {
                focusAlignment: 0.78,
                executionClarity: 0.8,
                costAwareness: 0.58,
                legitimacyAlignment: 0.52,
                policyStance: 'balanced',
                evidence: [],
            },
            shuMomentum: 0,
            huainanMomentum: 0,
        }) as any

        expect(result.shuMomentum).toBeGreaterThan(0)
        expect(result.huainanMomentum).toBe(0)
    })

    it('softly applies faction breach penalties without breaking the round flow', () => {
        const yuwendi = INITIAL_NPCS.find(npc => npc.name === '宇文棣')!
        const hebaqi = INITIAL_NPCS.find(npc => npc.name === '贺拔琪')!

        const result = settleRound({
            round: 1,
            schemes: [
                {
                    id: 'breach-trigger',
                    targetNpcId: yuwendi.id,
                    relatedNpcId: hebaqi.id,
                    schemeType: 'alienate',
                    playerSpeech: '太后久握朝权，帝党上下多有不平，你若不早作筹画，只会继续被后党掣肘。',
                    resolutionRoll: 0.05,
                    northParse: {
                        characterFit: 0.72,
                        eventFit: 0.68,
                        structuralPenetration: 0.74,
                        executability: 0.7,
                        exposureRisk: 0.12,
                        financeRelevance: 0,
                        grainRelevance: 0.18,
                        militaryRelevance: 0.24,
                        socialOrderRelevance: 0.66,
                        governanceRelevance: 0.72,
                        dominantIntent: 'divide',
                        evidence: [],
                    },
                },
            ],
            northStats: { ...NORTH_INITIAL },
            southStats: { ...SOUTH_INITIAL },
            npcs: INITIAL_NPCS.map(npc => ({
                ...npc,
                trust: npc.id === yuwendi.id ? 70 : npc.trust,
            })),
            factions: INITIAL_FACTIONS.map(faction =>
                faction.id === 'emperor'
                    ? { ...faction, courtInfluence: 19, internalStability: 19 }
                    : { ...faction },
            ),
            intelProgress: {},
            policyOptionIndex: null,
            policyReason: '',
        }) as any

        expect(result.factionCollapseReports?.[0]?.severity).toBe('breach')
        expect(result.factionCollapseReports?.[0]?.summary).toContain('帝党')
        expect(result.gameResult).toBe('NONE')
        expect(result.judgeFacts?.factionSummary).toContain('崩口')
    })

    it('turns exposed scheme speech into next-round backlash instead of only a weaker immediate result', () => {
        const yuwendi = INITIAL_NPCS.find(npc => npc.name === '宇文棣')!

        const result = settleRound({
            round: 4,
            schemes: [
                {
                    id: 'shock',
                    targetNpcId: yuwendi.id,
                    schemeType: 'advise',
                    playerSpeech: '你若立刻夺权起兵，便可借边患逼宫，一举翻掉太后。',
                    resolutionRoll: 0.02,
                },
            ],
            northStats: { ...NORTH_INITIAL },
            southStats: { ...SOUTH_INITIAL },
            npcs: INITIAL_NPCS.map(npc => ({ ...npc, trust: npc.name === '宇文棣' ? 72 : npc.trust })),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: {},
            policyOptionIndex: null,
            policyReason: '',
        }) as any

        expect(result.delayedBacklash.length).toBeGreaterThan(0)
        expect(result.delayedBacklash[0]?.type).toMatch(/guarded|misdirected|shock|exposed/)
    })

    it('stores shu campaign result on round 10 and applies immediate north hit', () => {
        const result = settleRound({
            round: 10,
            schemes: [],
            northStats: { ...NORTH_INITIAL },
            southStats: { ...SOUTH_INITIAL, finance: 66, grain: 74, military: 72, socialOrder: 62, governance: 70 },
            npcs: INITIAL_NPCS.map(npc => ({ ...npc })),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: {},
            policyOptionIndex: 1,
            policyReason: '先断粮道再逼蜀地松动，并把后续接管预案一并准备。',
            shuCampaign: idleCampaign,
            huainanCampaign: idleCampaign,
        }) as any

        expect(result.shuCampaign?.state).toBe('gained')
        expect(result.northStatsAfter.governance).toBeLessThan(NORTH_INITIAL.governance - 1)
    })

    it('lets prepared shu conversion push a successful line from stalemate to gained', () => {
        const pressuredNpcs = INITIAL_NPCS.map(npc => (
            npc.powerBase === 'external'
                ? { ...npc, externalStatus: 'loyal' as const }
                : { ...npc }
        ))
        const pressuredFactions = INITIAL_FACTIONS.map(faction => (
            faction.id === 'emperor'
                ? { ...faction, internalStability: 22, courtInfluence: 21 }
                : faction.id === 'empress'
                    ? { ...faction, internalStability: 24, courtInfluence: 20 }
                    : { ...faction }
        ))

        const result = settleRound({
            round: 10,
            schemes: [],
            northStats: { finance: 60, grain: 63, military: 70, socialOrder: 54, governance: 58 },
            southStats: { finance: 57, grain: 58, military: 57, socialOrder: 56, governance: 60 },
            npcs: pressuredNpcs,
            factions: pressuredFactions,
            intelProgress: {},
            policyOptionIndex: 1,
            policyReason: '先断粮道、稳转运、压实接管次序，再把蜀地战果变成可持续的占领。',
            policyParse: {
                focusAlignment: 0.88,
                executionClarity: 0.84,
                costAwareness: 0.66,
                legitimacyAlignment: 0.5,
                policyStance: 'balanced',
                evidence: [],
            },
            shuMomentum: 4.8,
            huainanMomentum: 0,
        } as any)

        expect(result.shuCampaign.state).toBe('gained')
    })

    it('lets strong mainline shu preparation push round 10 into gained', () => {
        const zuting = INITIAL_NPCS.find(npc => npc.name === '祖廷')!
        const linghu = INITIAL_NPCS.find(npc => npc.name === '令狐律光')!
        const pressuredNpcs = INITIAL_NPCS.map(npc => (
            npc.id === zuting.id
                ? { ...npc, trust: 70 }
                : npc.id === linghu.id
                    ? { ...npc, trust: 58 }
                    : npc.powerBase === 'external'
                        ? { ...npc, externalStatus: 'loyal' as const }
                        : { ...npc }
        ))
        const pressuredFactions = INITIAL_FACTIONS.map(faction => (
            faction.id === 'emperor'
                ? { ...faction, internalStability: 22, courtInfluence: 21 }
                : faction.id === 'empress'
                    ? { ...faction, internalStability: 24, courtInfluence: 20 }
                    : { ...faction }
        ))

        const result = settleRound({
            round: 10,
            schemes: [
                {
                    id: 'mainline-shu-advise',
                    targetNpcId: zuting.id,
                    schemeType: 'advise',
                    playerSpeech: '先把仓储、诏令与转运节次理顺，再定谁主战谁接管，否则蜀地纵得一城也守不稳。',
                    resolutionRoll: 0.03,
                    northParse: {
                        characterFit: 0.72,
                        eventFit: 0.66,
                        structuralPenetration: 0.74,
                        executability: 0.78,
                        exposureRisk: 0.16,
                        financeRelevance: 0.24,
                        grainRelevance: 0.86,
                        militaryRelevance: 0.42,
                        socialOrderRelevance: 0.18,
                        governanceRelevance: 0.84,
                        dominantIntent: 'strategize',
                        evidence: [],
                    },
                },
                {
                    id: 'mainline-shu-probe',
                    targetNpcId: linghu.id,
                    schemeType: 'probe',
                    playerSpeech: '都督眼下最怕的不是前线苦战，而是朝里先把调度、诏令和军粮拖成两套。',
                    resolutionRoll: 0.04,
                    northParse: {
                        characterFit: 0.64,
                        eventFit: 0.62,
                        structuralPenetration: 0.68,
                        executability: 0.58,
                        exposureRisk: 0.18,
                        financeRelevance: 0.12,
                        grainRelevance: 0.66,
                        militaryRelevance: 0.56,
                        socialOrderRelevance: 0.16,
                        governanceRelevance: 0.74,
                        dominantIntent: 'strategize',
                        evidence: [],
                    },
                },
            ],
            northStats: { finance: 60, grain: 63, military: 70, socialOrder: 54, governance: 58 },
            southStats: { finance: 57, grain: 58, military: 57, socialOrder: 56, governance: 60 },
            npcs: pressuredNpcs,
            factions: pressuredFactions,
            intelProgress: {},
            policyOptionIndex: 1,
            policyReason: '先断粮道、稳转运、压实接管次序，再把蜀地战果变成可持续的占领。',
            policyParse: {
                focusAlignment: 0.88,
                executionClarity: 0.84,
                costAwareness: 0.66,
                legitimacyAlignment: 0.5,
                policyStance: 'balanced',
                evidence: [],
            },
            shuMomentum: 4.6,
            huainanMomentum: 0,
        } as any)

        expect(result.shuCampaign.state).toBe('gained')
    })

    it('applies stored shu fallout on round 11', () => {
        const result = settleRound({
            round: 11,
            schemes: [],
            northStats: { ...NORTH_INITIAL },
            southStats: { ...SOUTH_INITIAL },
            npcs: INITIAL_NPCS.map(npc => ({ ...npc })),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: {},
            policyOptionIndex: null,
            policyReason: '',
            shuCampaign: {
                state: 'gained',
                sourceRound: 10,
                summary: '蜀地已得手',
                ongoingNorthImpact: { governance: -1.2 },
                ongoingSouthImpact: { grain: 1.1 },
                remainingRounds: 2,
            },
            huainanCampaign: idleCampaign,
        }) as any

        expect(result.northStatsAfter.governance).toBeLessThan(NORTH_INITIAL.governance)
        expect(result.southStatsAfter.grain).toBeGreaterThan(SOUTH_INITIAL.grain)
        expect(result.shuCampaign?.remainingRounds).toBe(1)
    })

    it('lets shu gained improve huainan conversion in round 16', () => {
        const baseParams = {
            round: 16,
            schemes: [],
            northStats: { finance: 60, grain: 64, military: 72, socialOrder: 52, governance: 58 },
            southStats: { finance: 60, grain: 63, military: 63, socialOrder: 58, governance: 60 },
            npcs: INITIAL_NPCS.map(npc => ({ ...npc })),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: {},
            policyOptionIndex: 3,
            policyReason: '先稳住渡口、军粮和接管秩序，再把淮南推进做成可持续的占领。',
            policyParse: {
                focusAlignment: 0.84,
                executionClarity: 0.8,
                costAwareness: 0.62,
                legitimacyAlignment: 0.46,
                policyStance: 'balanced' as const,
                evidence: [],
            },
            shuMomentum: 5,
            huainanMomentum: 3.9,
        }

        const withoutCarry = settleRound({
            ...baseParams,
            shuCampaign: {
                state: 'failed',
                resolvedState: 'failed',
                sourceRound: 10,
                summary: '蜀地受挫',
                ongoingNorthImpact: {},
                ongoingSouthImpact: {},
                remainingRounds: 0,
            },
            huainanCampaign: idleCampaign,
        } as any)

        const withCarry = settleRound({
            ...baseParams,
            shuCampaign: {
                state: 'idle',
                resolvedState: 'gained',
                sourceRound: 10,
                summary: '蜀地已得手',
                ongoingNorthImpact: {},
                ongoingSouthImpact: {},
                remainingRounds: 0,
            },
            huainanCampaign: idleCampaign,
        } as any)

        expect(withoutCarry.huainanCampaign.state).toBe('stalemate')
        expect(withCarry.huainanCampaign.state).toBe('gained')
    })

    it('lets strong mainline follow-through after shu gained push huainan into gained', () => {
        const zuting = INITIAL_NPCS.find(npc => npc.name === '祖廷')!
        const linghu = INITIAL_NPCS.find(npc => npc.name === '令狐律光')!

        const result = settleRound({
            round: 16,
            schemes: [
                {
                    id: 'mainline-huainan-advise',
                    targetNpcId: zuting.id,
                    schemeType: 'advise',
                    playerSpeech: '先把渡口、军粮和州郡承接次序理顺，再议谁主攻，免得淮南推进一快就把后面拖散。',
                    resolutionRoll: 0.03,
                    northParse: {
                        characterFit: 0.7,
                        eventFit: 0.68,
                        structuralPenetration: 0.74,
                        executability: 0.78,
                        exposureRisk: 0.14,
                        financeRelevance: 0.62,
                        grainRelevance: 0.78,
                        militaryRelevance: 0.72,
                        socialOrderRelevance: 0.18,
                        governanceRelevance: 0.72,
                        dominantIntent: 'strategize',
                        evidence: [],
                    },
                },
                {
                    id: 'mainline-huainan-probe',
                    targetNpcId: linghu.id,
                    schemeType: 'probe',
                    playerSpeech: '都督眼下最怕的不是淮南难攻，而是朝里先把军令、粮道和渡口节次拖成两套。',
                    resolutionRoll: 0.04,
                    northParse: {
                        characterFit: 0.66,
                        eventFit: 0.66,
                        structuralPenetration: 0.7,
                        executability: 0.64,
                        exposureRisk: 0.16,
                        financeRelevance: 0.46,
                        grainRelevance: 0.72,
                        militaryRelevance: 0.76,
                        socialOrderRelevance: 0.16,
                        governanceRelevance: 0.64,
                        dominantIntent: 'strategize',
                        evidence: [],
                    },
                },
            ],
            northStats: { finance: 60, grain: 64, military: 72, socialOrder: 52, governance: 58 },
            southStats: { finance: 60, grain: 63, military: 63, socialOrder: 58, governance: 60 },
            npcs: INITIAL_NPCS.map(npc => (
                npc.id === zuting.id
                    ? { ...npc, trust: 70 }
                    : npc.id === linghu.id
                        ? { ...npc, trust: 60 }
                        : { ...npc }
            )),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: {},
            policyOptionIndex: 3,
            policyReason: '先稳住渡口、军粮和接管秩序，再把淮南推进做成可持续的占领。',
            policyParse: {
                focusAlignment: 0.84,
                executionClarity: 0.8,
                costAwareness: 0.62,
                legitimacyAlignment: 0.46,
                policyStance: 'balanced',
                evidence: [],
            },
            shuMomentum: 5,
            huainanMomentum: 3.8,
            shuCampaign: {
                state: 'idle',
                resolvedState: 'gained',
                sourceRound: 10,
                summary: '蜀地已得手',
                ongoingNorthImpact: {},
                ongoingSouthImpact: {},
                remainingRounds: 0,
            },
            huainanCampaign: idleCampaign,
        } as any)

        expect(result.huainanCampaign.state).toBe('gained')
    })

    it('does not let a dead rebel keep inflating later campaign pressure', () => {
        const baselineNpcs = INITIAL_NPCS.map(npc => (
            npc.powerBase === 'external'
                ? { ...npc, externalStatus: 'loyal' as const, loyaltyToCourt: Math.max(npc.loyaltyToCourt, 70) }
                : { ...npc }
        ))
        const anSiming = baselineNpcs.find(npc => npc.id === 'ansiming')!
        const deadRebelNpcs = baselineNpcs.map(npc => (
            npc.id === anSiming.id
                ? { ...npc, isAlive: false, externalStatus: 'rebellion' as const, militaryPower: 0 }
                : npc
        ))

        const baseline = settleRound({
            round: 10,
            schemes: [],
            northStats: { finance: 66, grain: 68, military: 76, socialOrder: 50, governance: 60 },
            southStats: { finance: 56, grain: 58, military: 57, socialOrder: 55, governance: 56 },
            npcs: baselineNpcs,
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: {},
            policyOptionIndex: null,
            policyReason: '',
            shuCampaign: idleCampaign,
            huainanCampaign: idleCampaign,
        }) as any

        const withDeadRebel = settleRound({
            round: 10,
            schemes: [],
            northStats: { finance: 66, grain: 68, military: 76, socialOrder: 50, governance: 60 },
            southStats: { finance: 56, grain: 58, military: 57, socialOrder: 55, governance: 56 },
            npcs: deadRebelNpcs,
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: {},
            policyOptionIndex: null,
            policyReason: '',
            shuCampaign: idleCampaign,
            huainanCampaign: idleCampaign,
        }) as any

        expect(withDeadRebel.shuCampaign.state).toBe(baseline.shuCampaign.state)
        expect(withDeadRebel.shuCampaign.summary).toBe(baseline.shuCampaign.summary)
    })

    it('keeps a surviving rebellion marked as rebellion when the warlord beats back the suppression force', () => {
        const anSiming = INITIAL_NPCS.find(npc => npc.id === 'ansiming')!

        const result = settleRound({
            round: 12,
            schemes: [
                {
                    id: 'scheme-rebellion-survives',
                    targetNpcId: anSiming.id,
                    schemeType: 'rebellion' as any,
                    playerSpeech: '今夜举兵，不求直取洛阳，只要拖住平叛军，便能据地自守。',
                    resolutionRoll: 0.01,
                },
            ],
            northStats: { ...NORTH_INITIAL },
            southStats: { ...SOUTH_INITIAL },
            npcs: INITIAL_NPCS.map(npc => (
                npc.id === anSiming.id
                    ? {
                        ...npc,
                        trust: 92,
                        loyaltyToCourt: 8,
                        militaryPower: 58,
                        highActionBias: 'rebellion' as const,
                    }
                    : { ...npc }
            )),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: { [anSiming.id]: 3 },
            policyOptionIndex: null,
            policyReason: '',
        }) as any

        const updatedAnSiming = result.updatedNpcs?.find((npc: any) => npc.id === anSiming.id)

        expect(updatedAnSiming?.isAlive).toBe(true)
        expect(updatedAnSiming?.externalStatus).toBe('rebellion')
        expect(result.externalActionReports?.[0]?.action).toBe('rebellion')
        expect(result.externalActionReports?.[0]?.outcome).toContain('击退平叛军队后割据一方')
        expect(result.schemeResults[0]?.causalEvent?.postResolutionEvent?.kind).toBe('external_action')
        expect(result.schemeResults[0]?.causalEvent?.motionText).toMatch(/兵粮|平叛|起兵|折损/u)
    })

    it('lets frame and omen both erode dual court favor, but omen hits the nation harder', () => {
        const zuting = INITIAL_NPCS.find(npc => npc.id === 'zuting')!

        const frameResult = settleRound({
            round: 12,
            schemes: [
                {
                    id: 'court-frame',
                    targetNpcId: zuting.id,
                    schemeType: 'frame',
                    playerSpeech: '只要把失言坐实成越权口实，前朝与帷前都不会再替他圆场。',
                    resolutionRoll: 0.01,
                    northParse: {
                        characterFit: 0.78,
                        eventFit: 0.72,
                        structuralPenetration: 0.74,
                        executability: 0.75,
                        exposureRisk: 0.18,
                        financeRelevance: 0.2,
                        grainRelevance: 0.24,
                        militaryRelevance: 0.3,
                        socialOrderRelevance: 0.28,
                        governanceRelevance: 0.42,
                        dominantIntent: 'divide',
                        selfTrapPotential: 0.86,
                        scapegoatClarity: 0.81,
                        legitimacyCrack: 0,
                        omenPolarity: 'vague_or_ceremonial',
                        evidence: [],
                    },
                },
            ],
            northStats: { ...NORTH_INITIAL },
            southStats: { ...SOUTH_INITIAL },
            npcs: INITIAL_NPCS.map(npc => (
                npc.id === zuting.id ? { ...npc, trust: 72 } : { ...npc }
            )),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: {},
            policyOptionIndex: null,
            policyReason: '',
        }) as any

        const omenResult = settleRound({
            round: 14,
            schemes: [
                {
                    id: 'court-omen',
                    targetNpcId: zuting.id,
                    schemeType: 'omen',
                    playerSpeech: '异兆既落在他头上，只需把名分裂口点透，前朝与帷前自会同时起疑。',
                    resolutionRoll: 0.01,
                    northParse: {
                        characterFit: 0.76,
                        eventFit: 0.74,
                        structuralPenetration: 0.74,
                        executability: 0.72,
                        exposureRisk: 0.2,
                        financeRelevance: 0.26,
                        grainRelevance: 0.34,
                        militaryRelevance: 0.18,
                        socialOrderRelevance: 0.52,
                        governanceRelevance: 0.68,
                        dominantIntent: 'divide',
                        selfTrapPotential: 0,
                        scapegoatClarity: 0,
                        legitimacyCrack: 0.88,
                        omenPolarity: 'destabilizing',
                        evidence: [],
                    },
                },
            ],
            northStats: { ...NORTH_INITIAL },
            southStats: { ...SOUTH_INITIAL },
            npcs: INITIAL_NPCS.map(npc => (
                npc.id === zuting.id ? { ...npc, trust: 72 } : { ...npc }
            )),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: {},
            policyOptionIndex: null,
            policyReason: '',
        }) as any

        const framedTarget = frameResult.updatedNpcs.find((npc: any) => npc.id === zuting.id)
        const omenTarget = omenResult.updatedNpcs.find((npc: any) => npc.id === zuting.id)

        expect(framedTarget?.emperorFavor).toBe(18)
        expect(framedTarget?.empressDowagerFavor).toBe(74)
        expect(omenTarget?.emperorFavor).toBe(20)
        expect(omenTarget?.empressDowagerFavor).toBe(75)
        expect(omenResult.northStatsAfter.governance).toBeLessThan(frameResult.northStatsAfter.governance)
    })

    it('writes the external omen military-power delta onto the settled NPC', () => {
        const externalNpc = {
            ...INITIAL_NPCS.find(npc => npc.powerBase === 'external')!,
            trust: 76,
        }

        const result = settleRound({
            round: 15,
            schemes: [
                {
                    id: 'external-omen-settlement',
                    targetNpcId: externalNpc.id,
                    schemeType: 'omen',
                    playerSpeech: '异兆既落到边镇，朝中自然会先从粮道和关防上收紧一圈。',
                    resolutionRoll: 0.01,
                    northParse: {
                        characterFit: 0.82,
                        eventFit: 0.8,
                        structuralPenetration: 0.78,
                        executability: 0.74,
                        exposureRisk: 0.08,
                        financeRelevance: 0.2,
                        grainRelevance: 0.24,
                        militaryRelevance: 0.74,
                        socialOrderRelevance: 0.7,
                        governanceRelevance: 0.76,
                        dominantIntent: 'strategize',
                        omenAccusationClarity: 0.84,
                        centralSanctionLeverage: 0.82,
                        legitimacyCrack: 0.8,
                        suspicionDirection: 0.78,
                        omenPolarity: 'destabilizing',
                        evidence: [],
                    },
                },
            ],
            northStats: { ...NORTH_INITIAL },
            southStats: { ...SOUTH_INITIAL },
            npcs: INITIAL_NPCS.map(npc => (
                npc.id === externalNpc.id ? { ...npc, trust: externalNpc.trust } : { ...npc }
            )),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: {},
            policyOptionIndex: null,
            policyReason: '',
        }) as any

        const updatedExternalNpc = result.updatedNpcs.find((npc: any) => npc.id === externalNpc.id)
        const schemeDelta = result.schemeResults[0]?.personEffects.militaryPowerDelta ?? 0

        expect(schemeDelta).toBeLessThan(0)
        expect(updatedExternalNpc?.militaryPower).toBe(externalNpc.militaryPower + schemeDelta)
        expect(updatedExternalNpc?.loyaltyToCourt).toBeLessThan(externalNpc.loyaltyToCourt)
    })

    it('writes external advise military build-up onto the settled NPC', () => {
        const duguwenyue = {
            ...INITIAL_NPCS.find(npc => npc.id === 'duguwenyue')!,
            trust: 68,
        }

        const result = settleRound({
            round: 12,
            schemes: [
                {
                    id: 'external-advise-settlement',
                    targetNpcId: duguwenyue.id,
                    schemeType: 'advise',
                    playerSpeech: '先把军粮、部曲和调度都收在你自己手里，朝里再怎么催，也只能认你这一路边镇已经坐大。',
                    resolutionRoll: 0.01,
                    northParse: {
                        characterFit: 0.8,
                        eventFit: 0.76,
                        structuralPenetration: 0.78,
                        executability: 0.74,
                        exposureRisk: 0.12,
                        financeRelevance: 0.32,
                        grainRelevance: 0.82,
                        militaryRelevance: 0.86,
                        socialOrderRelevance: 0.18,
                        governanceRelevance: 0.68,
                        dominantIntent: 'strategize',
                        stateBenefit: -0.7,
                        targetBenefit: 0.84,
                        advicePolarity: 'pro_target_anti_state',
                        evidence: [],
                    },
                },
            ],
            northStats: { ...NORTH_INITIAL },
            southStats: { ...SOUTH_INITIAL },
            npcs: INITIAL_NPCS.map(npc => (
                npc.id === duguwenyue.id ? { ...npc, trust: duguwenyue.trust } : { ...npc }
            )),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: {},
            policyOptionIndex: null,
            policyReason: '',
        }) as any

        const updatedNpc = result.updatedNpcs.find((npc: any) => npc.id === duguwenyue.id)
        const schemeDelta = result.schemeResults[0]?.personEffects.militaryPowerDelta ?? 0

        expect(schemeDelta).toBeGreaterThan(0)
        expect(updatedNpc?.militaryPower).toBe(duguwenyue.militaryPower + schemeDelta)
        expect(updatedNpc?.loyaltyToCourt).toBeLessThan(duguwenyue.loyaltyToCourt)
    })

    it('applies second-target external military losses without granting the speaker a matching gain', () => {
        const duguwenyue = INITIAL_NPCS.find(npc => npc.id === 'duguwenyue')!
        const hebabogui = INITIAL_NPCS.find(npc => npc.name === '贺拔伯圭')!

        const result = settleRound({
            round: 16,
            schemes: [
                {
                    id: 'external-alienate-settlement',
                    targetNpcId: duguwenyue.id,
                    relatedNpcId: hebabogui.id,
                    schemeType: 'alienate',
                    playerSpeech: '若军令、粮道和补给口始终都捏在他手里，你这边越打越像替人垫兵、替人背责。',
                    resolutionRoll: 0.01,
                    northParse: {
                        characterFit: 0.76,
                        eventFit: 0.76,
                        structuralPenetration: 0.8,
                        executability: 0.72,
                        exposureRisk: 0.14,
                        financeRelevance: 0.22,
                        grainRelevance: 0.84,
                        militaryRelevance: 0.82,
                        socialOrderRelevance: 0.24,
                        governanceRelevance: 0.68,
                        dominantIntent: 'divide',
                        fractureTransmission: 0.86,
                        evidence: [],
                    },
                },
            ],
            northStats: { ...NORTH_INITIAL },
            southStats: { ...SOUTH_INITIAL },
            npcs: INITIAL_NPCS.map(npc => {
                if (npc.id === duguwenyue.id) return { ...npc, trust: 72 }
                if (npc.id === hebabogui.id) return { ...npc, trust: 60 }
                return { ...npc }
            }),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: {},
            policyOptionIndex: null,
            policyReason: '',
        }) as any

        const updatedSpeaker = result.updatedNpcs.find((npc: any) => npc.id === duguwenyue.id)
        const updatedSecondTarget = result.updatedNpcs.find((npc: any) => npc.id === hebabogui.id)
        const targetDelta = result.schemeResults[0]?.personEffects.militaryPowerDelta ?? 0
        const relatedDelta = result.schemeResults[0]?.personEffects.relatedMilitaryPowerDelta ?? 0

        expect(targetDelta).toBe(0)
        expect(relatedDelta).toBeLessThan(0)
        expect(updatedSpeaker?.militaryPower).toBe(duguwenyue.militaryPower + targetDelta)
        expect(updatedSecondTarget?.militaryPower).toBe(hebabogui.militaryPower + relatedDelta)
    })

    it('turns a high-relevance hit on 贺拔琪 into empress pressure led by court influence instead of favor loss', () => {
        const hebaqi = INITIAL_NPCS.find(npc => npc.name === '贺拔琪')!
        const yuwendi = INITIAL_NPCS.find(npc => npc.id === 'yuwendi')!
        const empressBefore = INITIAL_FACTIONS.find(faction => faction.id === 'empress')!

        const result = settleRound({
            round: 14,
            schemes: [
                {
                    id: 'hebaqi-pressure-settlement',
                    targetNpcId: yuwendi.id,
                    relatedNpcId: hebaqi.id,
                    schemeType: 'alienate',
                    playerSpeech: '太后既卡主战名分，又握诏令出口，真到东线出事时，后党只会先被认作压住了中枢调度。',
                    resolutionRoll: 0.01,
                    northParse: {
                        characterFit: 0.74,
                        eventFit: 0.72,
                        structuralPenetration: 0.78,
                        executability: 0.72,
                        exposureRisk: 0.16,
                        financeRelevance: 0.12,
                        grainRelevance: 0.18,
                        militaryRelevance: 0.3,
                        socialOrderRelevance: 0.74,
                        governanceRelevance: 0.82,
                        dominantIntent: 'divide',
                        fractureTransmission: 0.84,
                        evidence: [],
                    },
                },
            ],
            northStats: { ...NORTH_INITIAL },
            southStats: { ...SOUTH_INITIAL },
            npcs: INITIAL_NPCS.map(npc => (
                npc.id === yuwendi.id ? { ...npc, trust: 72 } : { ...npc }
            )),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: {},
            policyOptionIndex: null,
            policyReason: '',
        }) as any

        const empressAfter = result.factionsAfter.find((faction: any) => faction.id === 'empress')
        const updatedHebaqi = result.updatedNpcs.find((npc: any) => npc.id === hebaqi.id)
        const influenceLoss = empressBefore.courtInfluence - empressAfter.courtInfluence
        const stabilityLoss = empressBefore.internalStability - empressAfter.internalStability

        expect(empressAfter?.courtInfluence).toBeLessThan(empressBefore.courtInfluence)
        expect(empressAfter?.internalStability).toBeLessThan(empressBefore.internalStability)
        expect(influenceLoss).toBeGreaterThan(stabilityLoss)
        expect(updatedHebaqi?.emperorFavor).toBe(100)
        expect(updatedHebaqi?.empressDowagerFavor).toBe(100)
    })

    it('turns a strong omen on 宗艾 into emperor pressure without touching the dual-favor disposal chain', () => {
        const zongai = INITIAL_NPCS.find(npc => npc.id === 'zongai')!
        const emperorBefore = INITIAL_FACTIONS.find(faction => faction.id === 'emperor')!

        const result = settleRound({
            round: 14,
            schemes: [
                {
                    id: 'zongai-pressure-settlement',
                    targetNpcId: zongai.id,
                    schemeType: 'omen',
                    playerSpeech: '灾异若压到诏令和军令出口上，人人都会先疑你这个御前接口还能不能替皇帝把局面压住。',
                    resolutionRoll: 0.01,
                    northParse: {
                        characterFit: 0.78,
                        eventFit: 0.76,
                        structuralPenetration: 0.8,
                        executability: 0.72,
                        exposureRisk: 0.18,
                        financeRelevance: 0.12,
                        grainRelevance: 0.22,
                        militaryRelevance: 0.58,
                        socialOrderRelevance: 0.62,
                        governanceRelevance: 0.76,
                        dominantIntent: 'divide',
                        legitimacyCrack: 0.86,
                        suspicionDirection: 0.82,
                        omenPolarity: 'destabilizing',
                        evidence: [],
                    },
                },
            ],
            northStats: { ...NORTH_INITIAL },
            southStats: { ...SOUTH_INITIAL },
            npcs: INITIAL_NPCS.map(npc => (
                npc.id === zongai.id ? { ...npc, trust: 62 } : { ...npc }
            )),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: {},
            policyOptionIndex: null,
            policyReason: '',
        }) as any

        const emperorAfter = result.factionsAfter.find((faction: any) => faction.id === 'emperor')
        const updatedZongai = result.updatedNpcs.find((npc: any) => npc.id === zongai.id)
        const influenceLoss = emperorBefore.courtInfluence - emperorAfter.courtInfluence
        const stabilityLoss = emperorBefore.internalStability - emperorAfter.internalStability

        expect(emperorAfter?.courtInfluence).toBeLessThan(emperorBefore.courtInfluence)
        expect(emperorAfter?.internalStability).toBeLessThan(emperorBefore.internalStability)
        expect(influenceLoss).toBeGreaterThan(stabilityLoss)
        expect(updatedZongai?.emperorFavor).toBe(100)
        expect(updatedZongai?.empressDowagerFavor).toBe(100)
    })
    it('lets the valid executor use proxy to execute a dual-threshold court target', () => {
        const hebaqi = INITIAL_NPCS.find(npc => npc.id === 'hebaqí')!
        const yuwendi = INITIAL_NPCS.find(npc => npc.id === 'yuwendi')!

        const result = settleRound({
            round: 12,
            schemes: [
                {
                    id: 'court-execution',
                    targetNpcId: hebaqi.id,
                    relatedNpcId: yuwendi.id,
                    schemeType: 'proxy',
                    playerSpeech: '两边都已不肯保他，此刻只消借太后之手，把收网的名分坐实即可。',
                    resolutionRoll: 0.01,
                    northParse: {
                        characterFit: 0.78,
                        eventFit: 0.76,
                        structuralPenetration: 0.8,
                        executability: 0.72,
                        exposureRisk: 0.18,
                        financeRelevance: 0.14,
                        grainRelevance: 0.24,
                        militaryRelevance: 0.42,
                        socialOrderRelevance: 0.38,
                        governanceRelevance: 0.54,
                        dominantIntent: 'divide',
                        suspicionTransmission: 0.2,
                        fractureTransmission: 0.3,
                        proxyTransmission: 0.82,
                        evidence: [],
                    },
                },
            ],
            northStats: { ...NORTH_INITIAL },
            southStats: { ...SOUTH_INITIAL },
            npcs: INITIAL_NPCS.map(npc => {
                if (npc.id === hebaqi.id) {
                    return { ...npc, trust: 86 }
                }
                if (npc.id === yuwendi.id) {
                    return {
                        ...npc,
                        emperorFavor: 18,
                        empressDowagerFavor: 16,
                        courtStatus: 'active' as const,
                    }
                }
                return { ...npc }
            }),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: {},
            policyOptionIndex: null,
            policyReason: '',
        }) as any

        const updatedYuwendi = result.updatedNpcs.find((npc: any) => npc.id === yuwendi.id)

        expect(updatedYuwendi?.isAlive).toBe(false)
        expect(updatedYuwendi?.courtStatus).toBe('executed')
        expect(updatedYuwendi?.deathCause).toBe('court_execution')
        expect(updatedYuwendi?.deathByNpcName).toBe('贺拔琪')
        expect(result.borrowedBladeReports?.[0]?.outcome).toBe('executed')
        expect(result.schemeResults[0]?.causalEvent?.postResolutionEvent?.kind).toBe('borrowed_blade')
        expect(result.schemeResults[0]?.causalEvent?.motionText).toContain('处决')
    })

    it('skips later same-round schemes once a court target has been executed', () => {
        const hebaqi = INITIAL_NPCS.find(npc => npc.id === 'hebaqí')!
        const yuwendi = INITIAL_NPCS.find(npc => npc.id === 'yuwendi')!

        const result = settleRound({
            round: 12,
            schemes: [
                {
                    id: 'court-execution-first',
                    targetNpcId: hebaqi.id,
                    relatedNpcId: yuwendi.id,
                    schemeType: 'proxy',
                    playerSpeech: '两边都已不肯保他，此刻只消借太后之手，把收网的名分坐实即可。',
                    resolutionRoll: 0.01,
                    northParse: {
                        characterFit: 0.78,
                        eventFit: 0.76,
                        structuralPenetration: 0.8,
                        executability: 0.72,
                        exposureRisk: 0.18,
                        financeRelevance: 0.14,
                        grainRelevance: 0.24,
                        militaryRelevance: 0.42,
                        socialOrderRelevance: 0.38,
                        governanceRelevance: 0.54,
                        dominantIntent: 'divide',
                        suspicionTransmission: 0.2,
                        fractureTransmission: 0.3,
                        proxyTransmission: 0.82,
                        evidence: [],
                    },
                },
                {
                    id: 'executed-target-should-not-act',
                    targetNpcId: yuwendi.id,
                    schemeType: 'advise',
                    playerSpeech: '此后仍请殿下替我筹谋。',
                    resolutionRoll: 0.01,
                    northParse: {
                        characterFit: 0.9,
                        eventFit: 0.8,
                        structuralPenetration: 0.5,
                        executability: 0.8,
                        exposureRisk: 0.1,
                        financeRelevance: 0.4,
                        grainRelevance: 0.4,
                        militaryRelevance: 0.4,
                        socialOrderRelevance: 0.4,
                        governanceRelevance: 0.4,
                        dominantIntent: 'strategize',
                        evidence: [],
                    },
                },
            ],
            northStats: { ...NORTH_INITIAL },
            southStats: { ...SOUTH_INITIAL },
            npcs: INITIAL_NPCS.map(npc => {
                if (npc.id === hebaqi.id) return { ...npc, trust: 86 }
                if (npc.id === yuwendi.id) {
                    return {
                        ...npc,
                        trust: 50,
                        emperorFavor: 18,
                        empressDowagerFavor: 16,
                        courtStatus: 'active' as const,
                    }
                }
                return { ...npc }
            }),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: {},
            policyOptionIndex: null,
            policyReason: '',
        }) as any

        const updatedYuwendi = result.updatedNpcs.find((npc: any) => npc.id === yuwendi.id)

        expect(result.schemeResults).toHaveLength(1)
        expect(updatedYuwendi?.courtStatus).toBe('executed')
        expect(updatedYuwendi?.trust).toBeLessThan(50)
    })
})
