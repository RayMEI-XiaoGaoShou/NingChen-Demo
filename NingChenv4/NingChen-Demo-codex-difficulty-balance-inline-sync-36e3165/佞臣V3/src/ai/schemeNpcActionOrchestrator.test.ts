import { afterEach, describe, expect, it, vi } from 'vitest'
import { INITIAL_FACTIONS } from '../data/factions'
import { INITIAL_NPCS } from '../data/npcs'
import { generateSchemeNpcActionsForSettlement } from './schemeNpcActionOrchestrator'

function makeSettlement() {
    const zongai = INITIAL_NPCS.find(npc => npc.id === 'zongai')!
    const linghu = INITIAL_NPCS.find(npc => npc.id === 'linghuelvguang')!

    return {
        processedSchemes: [{
            id: 's1',
            targetNpcId: zongai.id,
            relatedNpcId: linghu.id,
            schemeType: 'alienate',
            playerSpeech: '先查令狐律光粮道与军需。',
        }],
        schemeResults: [{
            trustChange: 2,
            relatedTrustChange: -8,
            northDimensionChanges: { grain: -0.4, military: -0.5 },
            feedbackText: 'fallback feedback',
            success: true,
            personEffects: {
                trustDelta: 2,
                relatedTrustDelta: -8,
                loyaltyDelta: 0,
                relatedLoyaltyDelta: -1,
                militaryPowerDelta: 0,
                relatedMilitaryPowerDelta: -1,
                alignmentShift: null,
                intelDelta: 0,
                externalStatus: null,
            },
            factionEffects: {},
            nationEffects: { grain: -0.4, military: -0.5 },
            specialAction: null,
            northParse: {
                characterFit: 0.8,
                eventFit: 0.8,
                structuralPenetration: 0.8,
                executability: 0.8,
                exposureRisk: 0.1,
                financeRelevance: 0.1,
                grainRelevance: 0.8,
                militaryRelevance: 0.8,
                socialOrderRelevance: 0.2,
                governanceRelevance: 0.5,
                dominantIntent: 'divide',
                evidence: [],
            },
            delayedBacklash: [],
            relatedImpactSummary: '令狐律光的粮道与军需军令受牵动',
            npcAction: {
                text: '宗艾开始疏远令狐律光的粮道与军需调度。',
                source: 'fallback',
            },
            causalEvent: {
                actionId: 's1',
                actorNpcId: zongai.id,
                actorNpcName: zongai.name,
                relatedNpcId: linghu.id,
                relatedNpcName: linghu.name,
                schemeType: 'alienate',
                success: true,
                motionText: '宗艾开始疏远令狐律光的粮道与军需调度。',
                motionSource: 'fallback',
                primaryDimensions: ['grain', 'military'],
                secondaryDimensions: [],
                effectSummary: ['令狐律光军力-1', '北周粮赋-0.4', '北周军事-0.5'],
                relatedImpactSummary: '令狐律光的粮道与军需军令受牵动',
            },
        }],
    } as any
}

function makeSlanderSettlement() {
    const hebaqi = INITIAL_NPCS.find(npc => npc.id === 'hebaqí')!
    const zuting = INITIAL_NPCS.find(npc => npc.id === 'zuting')!

    return {
        processedSchemes: [{
            id: 'slander-1',
            targetNpcId: hebaqi.id,
            relatedNpcId: zuting.id,
            schemeType: 'slander',
            playerSpeech: '祖廷借南征粮道掩住度支旧账，中枢调度早已不清。',
        }],
        schemeResults: [{
            trustChange: 4,
            relatedTrustChange: -6,
            northDimensionChanges: { finance: -0.8, governance: -0.9 },
            feedbackText: 'fallback feedback',
            success: true,
            personEffects: {
                trustDelta: 4,
                relatedTrustDelta: -6,
                loyaltyDelta: 0,
                relatedLoyaltyDelta: 0,
                militaryPowerDelta: 0,
                relatedMilitaryPowerDelta: 0,
                alignmentShift: null,
                intelDelta: 0,
                externalStatus: null,
            },
            factionEffects: {
                empress: {
                    courtInfluence: -6.4,
                    internalStability: -10.1,
                    militaryPower: 0,
                },
            },
            nationEffects: { finance: -0.8, governance: -0.9 },
            specialAction: null,
            delayedBacklash: [],
            relatedImpactSummary: '祖廷所在后党的度支账册与中枢调度受牵动',
            npcAction: {
                text: '贺拔琪顺着你的话头暗查祖廷，先扣住度支账册与中枢调度作疑点，使中枢调度受阻、度支亏空与库藏断档露出。',
                source: 'fallback',
            },
            causalEvent: {
                actionId: 'slander-1',
                actorNpcId: hebaqi.id,
                actorNpcName: hebaqi.name,
                relatedNpcId: zuting.id,
                relatedNpcName: zuting.name,
                schemeType: 'slander',
                success: true,
                motionText: '贺拔琪顺着你的话头暗查祖廷，先扣住度支账册与中枢调度作疑点，使中枢调度受阻、度支亏空与库藏断档露出。',
                motionSource: 'fallback',
                primaryDimensions: ['governance', 'finance'],
                secondaryDimensions: [],
                effectSummary: ['后党内部稳定-10.1', '北周财政-0.8', '北周治理穿透力-0.9'],
                relatedImpactSummary: '祖廷所在后党的度支账册与中枢调度受牵动',
                narrativeObligations: [
                    {
                        dimension: 'governance',
                        direction: 'damage',
                        subjectLabel: '中枢/文书/权责',
                        subjectKeywords: /诏|中枢|案牍|文书|权责|调度|州县|御史|尚书|中书/u,
                        mechanismKeywords: /不通|壅塞|截权|截住|推诿|重叠|断档|迟滞|掣肘|停摆/u,
                        polarityConflictKeywords: /更顺|疏通|归拢|整顿见效|厘清|收束/u,
                        reasonCode: 'missing_damage_mechanism_governance',
                    },
                    {
                        dimension: 'finance',
                        direction: 'damage',
                        subjectLabel: '财政/度支',
                        subjectKeywords: /财政|度支|账|簿|库|钱|饷|支账|库藏|贡赋|税粮/u,
                        mechanismKeywords: /亏空|挪用|停拨|受阻|加派|露出|断档|追索|折损|扣留/u,
                        polarityConflictKeywords: /补足|归拢|疏通|整顿见效|拨付|充盈/u,
                        reasonCode: 'missing_damage_mechanism_finance',
                    },
                ],
            },
        }],
    } as any
}

function makePositiveAdviseSettlement() {
    const yuwendi = INITIAL_NPCS.find(npc => npc.id === 'yuwendi')!

    return {
        processedSchemes: [{
            id: 'advise-positive-1',
            targetNpcId: yuwendi.id,
            schemeType: 'advise',
            playerSpeech: '先补军需，再续粮道。此策虽利燕王，也会让北周军粮更顺。',
        }],
        schemeResults: [{
            trustChange: 11,
            relatedTrustChange: 0,
            northDimensionChanges: { grain: 0.1, military: 0.1 },
            feedbackText: 'fallback feedback',
            success: true,
            personEffects: {
                trustDelta: 11,
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
            nationEffects: { grain: 0.1, military: 0.1 },
            specialAction: null,
            delayedBacklash: [],
            relatedImpactSummary: null,
            npcAction: {
                text: '宇文棣把这番献策写成可入奏的条陈，先从军令、军需与粮道下手，借中枢名义重排相关权责。',
                source: 'fallback',
            },
            causalEvent: {
                actionId: 'advise-positive-1',
                actorNpcId: yuwendi.id,
                actorNpcName: yuwendi.name,
                schemeType: 'advise',
                success: true,
                motionText: '宇文棣把这番献策写成可入奏的条陈，先从军令、军需与粮道下手，借中枢名义重排相关权责。',
                motionSource: 'fallback',
                primaryDimensions: ['grain', 'military'],
                secondaryDimensions: [],
                effectSummary: ['宇文棣信任+11', '北周粮赋+0.1', '北周军事+0.1'],
                relatedImpactSummary: null,
                narrativeObligations: [
                    {
                        dimension: 'grain',
                        direction: 'benefit',
                        subjectLabel: '粮道/仓廪',
                        subjectKeywords: /粮|仓|仓廪|粮道|转运|军粮|贡赋/u,
                        mechanismKeywords: /转运顺畅|补足|疏通|开仓|续上/u,
                        polarityConflictKeywords: /迟滞|停转|截住|扣下|亏空|断粮|折损|受阻|拖慢|抽调/u,
                        reasonCode: 'missing_benefit_mechanism_grain',
                    },
                    {
                        dimension: 'military',
                        direction: 'benefit',
                        subjectLabel: '军府/军需',
                        subjectKeywords: /军|兵|兵械|军需|部曲|监军|军令|关隘|骑/u,
                        mechanismKeywords: /整军|补械|集结|稳住|增援|军令更顺/u,
                        polarityConflictKeywords: /迟滞|扣押|短缺|掣肘|折损|改道|空虚|受阻|被剿|抽调/u,
                        reasonCode: 'missing_benefit_mechanism_military',
                    },
                ],
            },
        }],
    } as any
}

function makeFailureCounterSettlement() {
    const zuting = INITIAL_NPCS.find(npc => npc.id === 'zuting')!

    return {
        processedSchemes: [{
            id: 'failure-counter-1',
            targetNpcId: zuting.id,
            schemeType: 'slander',
            playerSpeech: '拿旧账试探祖廷。',
        }],
        schemeResults: [{
            trustChange: -6,
            relatedTrustChange: 0,
            northDimensionChanges: {},
            feedbackText: 'fallback feedback',
            success: false,
            personEffects: {
                trustDelta: -6,
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
            nationEffects: {},
            specialAction: null,
            delayedBacklash: [],
            relatedImpactSummary: null,
            npcAction: {
                text: '祖廷按下话头，反令属吏收口并反查来路。',
                source: 'fallback',
                kind: 'counter',
            },
            causalEvent: {
                actionId: 'failure-counter-1',
                actorNpcId: zuting.id,
                actorNpcName: zuting.name,
                schemeType: 'slander',
                success: false,
                eventKind: 'failure',
                visibility: 'public',
                motionText: '祖廷按下话头，反令属吏收口并反查来路。',
                motionSource: 'fallback',
                primaryDimensions: [],
                secondaryDimensions: [],
                effectSummary: ['祖廷信任-6'],
                relatedImpactSummary: null,
            },
        }],
    } as any
}

function makeBorrowedBladeExecutionSettlement() {
    const zongai = INITIAL_NPCS.find(npc => npc.id === 'zongai')!
    const zuting = INITIAL_NPCS.find(npc => npc.id === 'zuting')!

    return {
        processedSchemes: [{
            id: 'proxy-execute-1',
            targetNpcId: zongai.id,
            relatedNpcId: zuting.id,
            schemeType: 'proxy',
            playerSpeech: '借宗艾之手收祖廷旧案。',
        }],
        schemeResults: [{
            trustChange: 3,
            relatedTrustChange: 0,
            northDimensionChanges: { finance: -3.1, governance: -4.2 },
            feedbackText: 'fallback feedback',
            success: true,
            personEffects: {
                trustDelta: 3,
                relatedTrustDelta: 0,
                loyaltyDelta: 0,
                relatedLoyaltyDelta: 0,
                militaryPowerDelta: 0,
                relatedMilitaryPowerDelta: 0,
                alignmentShift: null,
                intelDelta: 0,
                externalStatus: null,
            },
            factionEffects: {
                empress: {
                    courtInfluence: -5,
                    internalStability: -3.4,
                    militaryPower: -1.2,
                },
            },
            nationEffects: { finance: -3.1, governance: -4.2 },
            specialAction: null,
            delayedBacklash: [],
            relatedImpactSummary: null,
            npcAction: {
                text: '宗艾借势落下最后一手，祖廷已被朝廷处决，旧属与案牍随之断档。',
                source: 'fallback',
            },
            causalEvent: {
                actionId: 'proxy-execute-1',
                actorNpcId: zongai.id,
                actorNpcName: zongai.name,
                relatedNpcId: zuting.id,
                relatedNpcName: zuting.name,
                schemeType: 'proxy',
                success: true,
                motionText: '宗艾借势落下最后一手，祖廷已被朝廷处决，旧属与案牍随之断档。',
                motionSource: 'fallback',
                primaryDimensions: ['finance', 'governance'],
                secondaryDimensions: [],
                effectSummary: ['北周财政-3.1', '北周治理穿透力-4.2'],
                postResolutionEvent: {
                    kind: 'borrowed_blade',
                    outcome: 'executed',
                    outcomeCode: 'borrowed_blade_executed',
                    summary: '宗艾借势落下最后一手，祖廷已被朝廷处决。',
                    actionMechanism: ['处决', '收网'],
                    counterAction: ['御前/帘前处置'],
                    damageMechanism: ['职权断档', '派系震动', '政务受阻'],
                },
            },
        }],
    } as any
}

describe('generateSchemeNpcActionsForSettlement', () => {
    afterEach(() => {
        vi.useRealTimers()
    })

    it('replaces fallback npc action and causal motion when ai text is valid', async () => {
        const settlement = makeSettlement()
        const originalNationEffects = settlement.schemeResults[0].nationEffects
        const chatCompletionJsonDetailedImpl = vi.fn(async () => ({
            parsed: { text: '宗艾暗查令狐律光的粮道与军需调拨，先扣住兵械文书，再把疑点递向御前。' },
            text: '',
            mode: 'deepseek',
            source: 'ai',
            attempts: 1,
        }))

        const patched = await generateSchemeNpcActionsForSettlement({
            settlement,
            npcs: INITIAL_NPCS,
            factions: INITIAL_FACTIONS,
            currentRound: 14,
            intelProgress: {},
            roundHistory: [],
            getAiModeImpl: () => 'deepseek',
            chatCompletionJsonDetailedImpl: chatCompletionJsonDetailedImpl as any,
        })

        expect(chatCompletionJsonDetailedImpl).toHaveBeenCalledTimes(1)
        expect(patched.schemeResults[0].npcAction).toEqual({
            text: '宗艾暗查令狐律光的粮道与军需调拨，先扣住兵械文书，再把疑点递向御前。',
            source: 'ai',
        })
        expect(patched.schemeResults[0].causalEvent?.motionText).toBe('宗艾暗查令狐律光的粮道与军需调拨，先扣住兵械文书，再把疑点递向御前。')
        expect(patched.schemeResults[0].nationEffects).toEqual(originalNationEffects)
    })

    it('keeps fallback when ai text fails related npc validation', async () => {
        const settlement = makeSettlement()
        const patched = await generateSchemeNpcActionsForSettlement({
            settlement,
            npcs: INITIAL_NPCS,
            factions: INITIAL_FACTIONS,
            currentRound: 14,
            intelProgress: {},
            roundHistory: [],
            getAiModeImpl: () => 'deepseek',
            chatCompletionJsonDetailedImpl: vi.fn(async () => ({
                parsed: { text: '宗艾暗查粮道与军需调拨，却未提被牵连之人。' },
                text: '',
                mode: 'deepseek',
                source: 'ai',
                attempts: 1,
            })) as any,
        })

        expect(patched.schemeResults[0].npcAction?.source).toBe('fallback')
        expect(patched.schemeResults[0].causalEvent?.motionSource).toBe('fallback')
    })

    it('returns unchanged settlement in fallback mode', async () => {
        const settlement = makeSettlement()
        const chatCompletionJsonDetailedImpl = vi.fn()

        const patched = await generateSchemeNpcActionsForSettlement({
            settlement,
            npcs: INITIAL_NPCS,
            factions: INITIAL_FACTIONS,
            currentRound: 14,
            intelProgress: {},
            roundHistory: [],
            getAiModeImpl: () => 'fallback',
            chatCompletionJsonDetailedImpl,
        })

        expect(patched).toBe(settlement)
        expect(chatCompletionJsonDetailedImpl).not.toHaveBeenCalled()
    })

    it('uses DS-friendly default timeouts for moderately slow structured npc action responses', async () => {
        vi.useFakeTimers()
        const settlement = makeSettlement()
        const chatCompletionJsonDetailedImpl = vi.fn(() => new Promise(resolve => {
            globalThis.setTimeout(() => resolve({
                parsed: { text: '宗艾暗查令狐律光的粮道与军需调拨，先扣住兵械文书，再把疑点递向御前。' },
                text: '',
                mode: 'deepseek',
                source: 'ai',
                attempts: 1,
            }), 3000)
        }))

        const patchPromise = generateSchemeNpcActionsForSettlement({
            settlement,
            npcs: INITIAL_NPCS,
            factions: INITIAL_FACTIONS,
            currentRound: 14,
            intelProgress: {},
            roundHistory: [],
            getAiModeImpl: () => 'deepseek',
            chatCompletionJsonDetailedImpl: chatCompletionJsonDetailedImpl as any,
        })
        await vi.advanceTimersByTimeAsync(3000)
        const patched = await patchPromise

        expect(patched.schemeResults[0].npcAction?.source).toBe('ai')
    })

    it('keeps waiting beyond the visible fallback grace window for slow npc action responses', async () => {
        vi.useFakeTimers()
        const settlement = makeSettlement()
        const chatCompletionJsonDetailedImpl = vi.fn(() => new Promise(resolve => {
            globalThis.setTimeout(() => resolve({
                parsed: { text: '宗艾暗查令狐律光的粮道与军需调拨，先扣住兵械文书，再把疑点递向御前。' },
                text: '',
                mode: 'deepseek',
                source: 'ai',
                attempts: 1,
            }), 16000)
        }))

        const patchPromise = generateSchemeNpcActionsForSettlement({
            settlement,
            npcs: INITIAL_NPCS,
            factions: INITIAL_FACTIONS,
            currentRound: 14,
            intelProgress: {},
            roundHistory: [],
            getAiModeImpl: () => 'deepseek',
            chatCompletionJsonDetailedImpl: chatCompletionJsonDetailedImpl as any,
        })
        await vi.advanceTimersByTimeAsync(16000)
        const patched = await patchPromise

        expect(patched.schemeResults[0].npcAction?.source).toBe('ai')
    })

    it('accepts longer slander npc action text when required damage mechanisms come late', async () => {
        const settlement = makeSlanderSettlement()
        const aiText = `${'太后命中书省按住祖廷旧牍，'.repeat(8)}又令尚书省复核度支账簿，使账簿亏空与中枢调度迟滞。`

        const patched = await generateSchemeNpcActionsForSettlement({
            settlement,
            npcs: INITIAL_NPCS,
            factions: INITIAL_FACTIONS,
            currentRound: 14,
            intelProgress: {},
            roundHistory: [],
            getAiModeImpl: () => 'deepseek',
            chatCompletionJsonDetailedImpl: vi.fn(async () => ({
                parsed: { text: aiText },
                text: '',
                mode: 'deepseek',
                source: 'ai',
                attempts: 1,
            })) as any,
        })

        expect(patched.schemeResults[0].npcAction).toEqual({
            text: aiText,
            source: 'ai',
        })
        expect(patched.schemeResults[0].causalEvent?.motionText).toBe(aiText)
    })

    it('retries once with correction guidance when positive advise text fails validation first', async () => {
        const settlement = makePositiveAdviseSettlement()
        const chatCompletionJsonDetailedImpl = vi
            .fn()
            .mockResolvedValueOnce({
                parsed: { text: '宇文棣扣押军需与粮道文书，使兵械短缺、转运迟滞。' },
                text: '',
                mode: 'deepseek',
                source: 'ai',
                attempts: 1,
            })
            .mockResolvedValueOnce({
                parsed: { text: '宇文棣命军府复核兵械与军需，令仓廪开仓续上军粮，使粮道转运顺畅、军令更顺。' },
                text: '',
                mode: 'deepseek',
                source: 'ai',
                attempts: 1,
            })

        const patched = await generateSchemeNpcActionsForSettlement({
            settlement,
            npcs: INITIAL_NPCS,
            factions: INITIAL_FACTIONS,
            currentRound: 14,
            intelProgress: {},
            roundHistory: [],
            getAiModeImpl: () => 'deepseek',
            chatCompletionJsonDetailedImpl: chatCompletionJsonDetailedImpl as any,
        })

        expect(chatCompletionJsonDetailedImpl).toHaveBeenCalledTimes(2)
        expect(chatCompletionJsonDetailedImpl.mock.calls[1][0].map((message: any) => message.content).join('\n')).toContain('上一版未通过校验')
        expect(patched.schemeResults[0].npcAction).toEqual({
            text: '宇文棣命军府复核兵械与军需，令仓廪开仓续上军粮，使粮道转运顺畅、军令更顺。',
            source: 'ai',
        })
        expect(patched.schemeResults[0].causalEvent?.motionText).toBe('宇文棣命军府复核兵械与军需，令仓廪开仓续上军粮，使粮道转运顺畅、军令更顺。')
    })

    it('enhances failed counter narratives without losing their kind', async () => {
        const settlement = makeFailureCounterSettlement()
        const aiText = '祖廷听罢便按下旧账话头，命属吏封存来函并反查递话之人，从此对你多留一层戒心。'

        const patched = await generateSchemeNpcActionsForSettlement({
            settlement,
            npcs: INITIAL_NPCS,
            factions: INITIAL_FACTIONS,
            currentRound: 14,
            intelProgress: {},
            roundHistory: [],
            getAiModeImpl: () => 'deepseek',
            chatCompletionJsonDetailedImpl: vi.fn(async () => ({
                parsed: { text: aiText },
                text: '',
                mode: 'deepseek',
                source: 'ai',
                attempts: 1,
            })) as any,
        })

        expect(patched.schemeResults[0].npcAction).toEqual({
            text: aiText,
            source: 'ai',
            kind: 'counter',
        })
        expect(patched.schemeResults[0].causalEvent?.motionText).toBe(aiText)
        expect((patched.schemeResults[0].causalEvent as any)?.eventKind).toBe('failure')
    })

    it('rejects ai npc action text that weakens a post-resolution execution outcome', async () => {
        const settlement = makeBorrowedBladeExecutionSettlement()
        const chatCompletionJsonDetailedImpl = vi.fn(async () => ({
            parsed: { text: '宗艾压向祖廷旧案与度支账册，朝堂暂时只添压力。' },
            text: '',
            mode: 'deepseek',
            source: 'ai',
            attempts: 1,
        }))

        const patched = await generateSchemeNpcActionsForSettlement({
            settlement,
            npcs: INITIAL_NPCS,
            factions: INITIAL_FACTIONS,
            currentRound: 14,
            intelProgress: {},
            roundHistory: [],
            getAiModeImpl: () => 'deepseek',
            chatCompletionJsonDetailedImpl: chatCompletionJsonDetailedImpl as any,
        })

        expect(chatCompletionJsonDetailedImpl).toHaveBeenCalledTimes(2)
        expect(patched.schemeResults[0].npcAction?.source).toBe('fallback')
        expect(patched.schemeResults[0].npcAction?.text).toContain('处决')
    })

    it('allows ai correction to replace fallback after restoring the post-resolution execution outcome', async () => {
        const settlement = makeBorrowedBladeExecutionSettlement()
        const chatCompletionJsonDetailedImpl = vi
            .fn()
            .mockResolvedValueOnce({
                parsed: { text: '宗艾压向祖廷旧案与度支账册，朝堂暂时只添压力。' },
                text: '',
                mode: 'deepseek',
                source: 'ai',
                attempts: 1,
            })
            .mockResolvedValueOnce({
                parsed: { text: '宗艾正式收网，祖廷已被朝廷处决，旧属与度支案牍随之断档，中枢政务受阻。' },
                text: '',
                mode: 'deepseek',
                source: 'ai',
                attempts: 1,
            })

        const patched = await generateSchemeNpcActionsForSettlement({
            settlement,
            npcs: INITIAL_NPCS,
            factions: INITIAL_FACTIONS,
            currentRound: 14,
            intelProgress: {},
            roundHistory: [],
            getAiModeImpl: () => 'deepseek',
            chatCompletionJsonDetailedImpl: chatCompletionJsonDetailedImpl as any,
        })

        expect(chatCompletionJsonDetailedImpl).toHaveBeenCalledTimes(2)
        expect(chatCompletionJsonDetailedImpl.mock.calls[1][0].map((message: any) => message.content).join('\n')).toContain('missing_borrowed_blade_executed_outcome')
        expect(patched.schemeResults[0].npcAction).toEqual({
            text: '宗艾正式收网，祖廷已被朝廷处决，旧属与度支案牍随之断档，中枢政务受阻。',
            source: 'ai',
        })
        expect(patched.schemeResults[0].causalEvent?.motionText).toBe('宗艾正式收网，祖廷已被朝廷处决，旧属与度支案牍随之断档，中枢政务受阻。')
        expect(patched.schemeResults[0].nationEffects).toEqual(settlement.schemeResults[0].nationEffects)
    })
})
