import { describe, expect, it } from 'vitest'
import {
    attachBorrowedBladePostResolution,
    attachExternalActionPostResolution,
} from './schemePostResolutionEvent'
import type { SchemeResult } from './schemeEngine'

function makeResult(patch: Partial<SchemeResult> = {}): SchemeResult {
    return {
        trustChange: 0,
        relatedTrustChange: 0,
        northDimensionChanges: { finance: -1 },
        feedbackText: '',
        success: true,
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
        factionEffects: {},
        nationEffects: { finance: -1 },
        specialAction: null,
        northParse: {} as SchemeResult['northParse'],
        delayedBacklash: [],
        npcAction: { text: '宗艾压向祖廷。', source: 'fallback' },
        causalEvent: {
            actionId: 'a1',
            actorNpcId: 'zongai',
            actorNpcName: '宗艾',
            relatedNpcId: 'zuting',
            relatedNpcName: '祖廷',
            schemeType: 'proxy',
            success: true,
            motionText: '宗艾压向祖廷。',
            motionSource: 'fallback',
            primaryDimensions: ['finance'],
            secondaryDimensions: [],
            effectSummary: ['北周财政-1'],
        },
        ...patch,
    }
}

describe('scheme post resolution events', () => {
    it('treats borrowed blade pressure as blocked protection instead of a formal disposal', () => {
        const baseResult = makeResult()
        const patched = attachBorrowedBladePostResolution(baseResult, {
            actorNpcId: 'hebaqí',
            actorNpcName: '贺拔琪',
            targetNpcId: 'yuwendi',
            targetNpcName: '宇文棣',
            outcome: 'pressure',
            summary: '贺拔琪虽已出面施压，但宇文棣尚未同时失去两边庇护，朝堂暂时只添压力。',
        })

        const motionText = patched.causalEvent?.motionText ?? ''
        expect(patched.causalEvent?.postResolutionEvent?.outcomeCode).toBe('borrowed_blade_blocked_by_protection')
        expect(motionText).toMatch(/施压|尚未收网|庇护未破/u)
        expect(motionText).not.toMatch(/罢黜|处决|府署被收|案牍.*断档|旧属.*断档/u)
    })

    it('records borrowed blade dismissal and execution as distinct final outcomes', () => {
        const dismissed = attachBorrowedBladePostResolution(makeResult(), {
            actorNpcId: 'zongai',
            actorNpcName: '宗艾',
            targetNpcId: 'zuting',
            targetNpcName: '祖廷',
            outcome: 'dismissed',
            summary: '宗艾顺势收网，祖廷已被朝廷正式罢黜。',
        })
        const executed = attachBorrowedBladePostResolution(makeResult(), {
            actorNpcId: 'zongai',
            actorNpcName: '宗艾',
            targetNpcId: 'zuting',
            targetNpcName: '祖廷',
            outcome: 'executed',
            summary: '宗艾借势落下最后一手，祖廷已被朝廷处决。',
        })

        expect(dismissed.causalEvent?.postResolutionEvent?.outcomeCode).toBe('borrowed_blade_dismissed')
        expect(dismissed.causalEvent?.motionText).toMatch(/罢黜|收权|府署|案牍/u)
        expect(dismissed.causalEvent?.motionText).not.toMatch(/处决|伏诛|赐死/u)
        expect(executed.causalEvent?.postResolutionEvent?.outcomeCode).toBe('borrowed_blade_executed')
        expect(executed.causalEvent?.motionText).toMatch(/处决|收网|伏诛|赐死/u)
        expect(executed.causalEvent?.motionText).toMatch(/旧属|案牍|派系|政务/u)
    })

    it('attaches borrowed blade outcome without changing numeric effects', () => {
        const baseResult = makeResult()
        const patched = attachBorrowedBladePostResolution(baseResult, {
            actorNpcId: 'zongai',
            actorNpcName: '宗艾',
            targetNpcId: 'zuting',
            targetNpcName: '祖廷',
            outcome: 'executed',
            summary: '宗艾借势落下最后一手，祖廷已被朝廷处决。',
        })

        expect(patched.nationEffects).toEqual(baseResult.nationEffects)
        expect(patched.personEffects).toEqual(baseResult.personEffects)
        expect(patched.causalEvent?.postResolutionEvent?.kind).toBe('borrowed_blade')
        expect(patched.causalEvent?.motionText).toContain('处决')
        expect(patched.causalEvent?.motionText).toMatch(/断档|受阻|震动/u)
    })

    it('attaches external action outcome without changing numeric effects', () => {
        const baseResult = makeResult({
            specialAction: 'rebellion',
            causalEvent: {
                ...makeResult().causalEvent!,
                actorNpcId: 'ansiming',
                actorNpcName: '安思明',
                relatedNpcId: undefined,
                relatedNpcName: undefined,
                schemeType: 'rebellion',
                primaryDimensions: ['military', 'grain'],
                effectSummary: ['北周军事-3', '北周粮赋-2'],
            },
        })
        const patched = attachExternalActionPostResolution(baseResult, {
            npcId: 'ansiming',
            npcName: '安思明',
            action: 'rebellion',
            outcome: '安思明起兵旋即为平叛军所剿，虽未坐大，却已逼北周为此折损兵粮。',
            nationEffects: { military: -3, grain: -2 },
        })

        expect(patched.specialAction).toBe('rebellion')
        expect(patched.nationEffects).toEqual(baseResult.nationEffects)
        expect(patched.causalEvent?.postResolutionEvent?.kind).toBe('external_action')
        expect(patched.causalEvent?.motionText).toContain('折损兵粮')
        expect(patched.causalEvent?.motionText).toMatch(/平叛|起兵|州县|军令/u)
    })

    it('records external action outcome codes and keeps secession/rebellion boundaries clear', () => {
        const secessionEstablished = attachExternalActionPostResolution(makeResult({
            specialAction: 'secession',
            causalEvent: {
                ...makeResult().causalEvent!,
                actorNpcId: 'ansiming',
                actorNpcName: '安思明',
                schemeType: 'secession',
            },
        }), {
            npcId: 'ansiming',
            npcName: '安思明',
            action: 'secession',
            outcome: '安思明借乱局坐实地方自雄，明面仍奉朝廷，实则已成割据。',
            outcomeCode: 'secession_established',
            nationEffects: { finance: -3, governance: -4 },
        })
        const rebellionCrushed = attachExternalActionPostResolution(makeResult({
            specialAction: 'rebellion',
            causalEvent: {
                ...makeResult().causalEvent!,
                actorNpcId: 'ansiming',
                actorNpcName: '安思明',
                schemeType: 'rebellion',
            },
        }), {
            npcId: 'ansiming',
            npcName: '安思明',
            action: 'rebellion',
            outcome: '安思明起兵旋即为平叛军所剿，虽未坐大，却已逼北周为此折损兵粮。',
            outcomeCode: 'rebellion_crushed',
            nationEffects: { military: -3, grain: -2 },
        })

        expect(secessionEstablished.causalEvent?.postResolutionEvent?.outcomeCode).toBe('secession_established')
        expect(secessionEstablished.causalEvent?.motionText).toMatch(/名义.*北周|明面仍奉/u)
        expect(secessionEstablished.causalEvent?.motionText).toMatch(/实则|割据|另设调度|扣留/u)
        expect(secessionEstablished.causalEvent?.motionText).not.toMatch(/起兵|称帝|明旗反周/u)
        expect(rebellionCrushed.causalEvent?.postResolutionEvent?.outcomeCode).toBe('rebellion_crushed')
        expect(rebellionCrushed.causalEvent?.motionText).toMatch(/起兵|平叛|被剿/u)
        expect(rebellionCrushed.causalEvent?.motionText).toMatch(/未坐大|折损兵粮/u)
        expect(rebellionCrushed.causalEvent?.motionText).not.toMatch(/击退平叛|割据一方|已坐大|坐大成势/u)
    })
})
