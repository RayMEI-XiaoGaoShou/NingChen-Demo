import { describe, expect, it } from 'vitest'
import { settleRound } from './roundSettlement'
import { NORTH_INITIAL, SOUTH_INITIAL } from '../data/nationStats'
import { INITIAL_NPCS } from '../data/npcs'
import { INITIAL_FACTIONS } from '../data/factions'

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
        expect(result.factionsAfter?.find((faction: any) => faction.id === 'emperor')?.courtInfluence).toBeGreaterThan(60)
        expect(result.schemeResults[0]?.personEffects?.trustDelta).toBeGreaterThan(0)
        expect(result.schemeResults[0]?.factionEffects?.emperor?.courtInfluence).toBeGreaterThan(0)
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
        expect(Math.abs(boosted.schemeResults[0]?.factionEffects?.empress?.courtInfluence ?? 0)).toBeGreaterThan(
            Math.abs(bland.schemeResults[0]?.factionEffects?.empress?.courtInfluence ?? 0),
        )
        expect(Math.abs(boosted.schemeResults[0]?.nationEffects?.governance ?? 0)).toBeGreaterThan(
            Math.abs(bland.schemeResults[0]?.nationEffects?.governance ?? 0),
        )
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

    it('softly applies faction breach penalties without breaking the round flow', () => {
        const result = settleRound({
            round: 1,
            schemes: [],
            northStats: { ...NORTH_INITIAL },
            southStats: { ...SOUTH_INITIAL },
            npcs: INITIAL_NPCS.map(npc => ({ ...npc })),
            factions: INITIAL_FACTIONS.map(faction =>
                faction.id === 'emperor'
                    ? { ...faction, courtInfluence: 17, internalStability: 16 }
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
            southStats: { ...SOUTH_INITIAL, finance: 62, grain: 70, military: 68, socialOrder: 58, governance: 66 },
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

    it('turns a surviving rebellion into secession instead of opening a separate overthrow branch', () => {
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
        expect(updatedAnSiming?.externalStatus).toBe('secession')
        expect(result.externalActionReports?.[0]?.action).toBe('rebellion')
        expect(result.externalActionReports?.[0]?.outcome).toContain('据地自守')
    })
})
