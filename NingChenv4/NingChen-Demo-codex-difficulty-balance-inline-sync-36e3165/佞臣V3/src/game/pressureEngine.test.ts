import { describe, expect, it } from 'vitest'
import { INITIAL_FACTIONS } from '../data/factions'
import { INITIAL_NPCS } from '../data/npcs'
import { NORTH_INITIAL } from '../data/nationStats'
import { checkDeathConditionWithPressure, checkEarlyInvasionWithPressure } from './nationEngine'
import {
    deriveRoundPressureUpdate,
    getInvasionPressurePresentation,
    getPlayerDangerPresentation,
    type PressureState,
} from './pressureEngine'
import type { NorthSchemeParseResult, SchemeAction } from './types'
import type { SchemeResult } from './schemeEngine'

const EMPTY_PARSE: NorthSchemeParseResult = {
    characterFit: 0.5,
    eventFit: 0.5,
    structuralPenetration: 0.5,
    executability: 0.5,
    exposureRisk: 0.2,
    financeRelevance: 0,
    grainRelevance: 0,
    militaryRelevance: 0,
    socialOrderRelevance: 0,
    governanceRelevance: 0,
    dominantIntent: 'neutral',
    evidence: [],
}

const EMPTY_PERSON_EFFECTS = {
    trustDelta: 0,
    relatedTrustDelta: 0,
    loyaltyDelta: 0,
    relatedLoyaltyDelta: 0,
    militaryPowerDelta: 0,
    relatedMilitaryPowerDelta: 0,
    alignmentShift: null,
    intelDelta: 0,
    externalStatus: null,
}

function parse(overrides: Partial<NorthSchemeParseResult>): NorthSchemeParseResult {
    return { ...EMPTY_PARSE, ...overrides }
}

function action(overrides: Partial<SchemeAction>): SchemeAction {
    return {
        targetNpcId: 'yuwendi',
        schemeType: 'advise',
        playerSpeech: '臣愿替大周筹画粮道军令。',
        ...overrides,
    }
}

function result(overrides: Partial<SchemeResult>): SchemeResult {
    return {
        trustChange: 0,
        relatedTrustChange: 0,
        northDimensionChanges: {},
        feedbackText: '',
        success: true,
        personEffects: { ...EMPTY_PERSON_EFFECTS },
        factionEffects: {},
        nationEffects: {},
        specialAction: null,
        northParse: EMPTY_PARSE,
        delayedBacklash: [],
        ...overrides,
    }
}

function derive(previous: PressureState, schemes: SchemeAction[], schemeResults: SchemeResult[]) {
    return deriveRoundPressureUpdate({
        round: 9,
        difficulty: 'normal',
        previous,
        schemes,
        schemeResults,
        npcsBefore: INITIAL_NPCS.map(npc => ({ ...npc })),
        npcsAfter: INITIAL_NPCS.map(npc => ({ ...npc })),
        factionsBefore: INITIAL_FACTIONS.map(faction => ({ ...faction })),
        factionsAfter: INITIAL_FACTIONS.map(faction => ({ ...faction })),
        northBefore: { ...NORTH_INITIAL },
        northAfter: { ...NORTH_INITIAL },
        delayedBacklash: [],
        invasionPoliticalRatio: 1.35,
        invasionWarCapabilityMet: 3,
    })
}

describe('pressureEngine', () => {
    it('raises suspicion when high-exposure schemes fail against heavy court figures', () => {
        const update = derive(
            { playerSuspicionHeat: 0, invasionPressure: 0 },
            [action({ targetNpcId: 'yuwendi', playerSpeech: '我是南陈内应，今日便要反周。' })],
            [result({ success: false, northParse: parse({ exposureRisk: 0.86 }) })],
        )

        expect(update.playerSuspicionHeat).toBeGreaterThan(12)
        expect(update.suspicionDelta.reasons.join('，')).toContain('宇文棣')
    })

    it('lets successful appeal cool personal danger while anti-war appeal also lowers invasion pressure', () => {
        const baseline = derive({ playerSuspicionHeat: 42, invasionPressure: 48 }, [], [])
        const update = derive(
            { playerSuspicionHeat: 42, invasionPressure: 48 },
            [action({ targetNpcId: 'hebaqí', schemeType: 'appeal', playerSpeech: '愿请太后为臣遮护，也暂缓南征议程。' })],
            [result({ success: true, trustChange: 3, northParse: parse({ exposureRisk: 0.22 }) })],
        )

        expect(update.playerSuspicionHeat).toBeLessThan(42)
        expect(update.invasionPressure).toBeLessThan(baseline.invasionPressure)
    })

    it('raises invasion pressure when pro-state military advice helps a pro-war actor', () => {
        const update = derive(
            { playerSuspicionHeat: 0, invasionPressure: 20 },
            [action({ targetNpcId: 'yuwendi', schemeType: 'advise', playerSpeech: '愿替燕王整顿粮道军令，调齐兵甲南征，趁南陈未稳渡江。' })],
            [
                result({
                    success: true,
                    trustChange: 5,
                    northParse: parse({
                        advicePolarity: 'pro_state',
                        militaryRelevance: 0.8,
                        grainRelevance: 0.65,
                    }),
                }),
            ],
        )

        expect(update.invasionPressure).toBeGreaterThan(34)
        expect(update.invasionDelta.reasons.join('，')).toContain('献策')
    })

    it('presents pressure as stages instead of raw numbers', () => {
        expect(getPlayerDangerPresentation(10).label).toBe('风声暂稳')
        expect(getPlayerDangerPresentation(70, 'under_review').label).toBe('案牍将成')
        expect(getInvasionPressurePresentation(72).label).toBe('南征箭在弦上')
    })
})

describe('pressure-gated endings', () => {
    it('does not kill the player on low heat even if a court actor has power and low trust', () => {
        const result = checkDeathConditionWithPressure(
            [
                {
                    name: '宇文棣',
                    trust: 3,
                    canExecute: true,
                    factionId: 'emperor',
                    powerBase: 'court',
                    militaryPower: 25,
                    loyaltyToCourt: 90,
                },
            ],
            [{ id: 'emperor', courtInfluence: 68 }],
            8,
            'under_review',
            24,
            20,
        )

        expect(result.triggered).toBe(false)
        expect(result.nextStage).toBe('safe')
    })

    it('requires sustained high heat before the death ending can trigger', () => {
        const result = checkDeathConditionWithPressure(
            [
                {
                    name: '宇文棣',
                    trust: 3,
                    canExecute: true,
                    factionId: 'emperor',
                    powerBase: 'court',
                    militaryPower: 25,
                    loyaltyToCourt: 90,
                },
            ],
            [{ id: 'emperor', courtInfluence: 68 }],
            8,
            'under_review',
            90,
            75,
        )

        expect(result.triggered).toBe(true)
    })

    it('lets extreme sustained heat enter the death chain even before executor trust fully collapses', () => {
        const result = checkDeathConditionWithPressure(
            [
                {
                    name: '贺拔琪',
                    trust: 42,
                    canExecute: true,
                    factionId: 'empress',
                    powerBase: 'court',
                    militaryPower: 20,
                    loyaltyToCourt: 90,
                },
            ],
            [{ id: 'empress', courtInfluence: 66 }],
            8,
            'under_review',
            96,
            78,
        )

        expect(result.triggered).toBe(true)
        expect(result.killerName).toBe('贺拔琪')
    })

    it('does not trigger early invasion without pressure, even when politics and war capacity are ready', () => {
        const result = checkEarlyInvasionWithPressure(
            { ...NORTH_INITIAL, military: 82, finance: 75, grain: 74, socialOrder: 70 },
            [{ id: 'emperor', courtInfluence: 90 }, { id: 'empress', courtInfluence: 40 }],
            INITIAL_NPCS.map(npc => ({ ...npc })),
            false,
            16,
            { current: 20, previous: 20, difficulty: 'normal' },
        )

        expect(result.politicalWillRatio).toBeGreaterThan(1.3)
        expect(result.warCapabilityMet).toBeGreaterThanOrEqual(3)
        expect(result.triggered).toBe(false)
    })

    it('requires sustained high pressure before early invasion triggers', () => {
        const result = checkEarlyInvasionWithPressure(
            { ...NORTH_INITIAL, military: 82, finance: 75, grain: 74, socialOrder: 70 },
            [{ id: 'emperor', courtInfluence: 90 }, { id: 'empress', courtInfluence: 40 }],
            INITIAL_NPCS.map(npc => ({ ...npc })),
            false,
            16,
            { current: 90, previous: 72, difficulty: 'normal' },
        )

        expect(result.triggered).toBe(true)
    })

    it('allows extreme sustained invasion pressure to trigger with marginal politics and partial war capacity', () => {
        const result = checkEarlyInvasionWithPressure(
            { ...NORTH_INITIAL, military: 82, finance: 75, grain: 35, socialOrder: 35 },
            [{ id: 'emperor', courtInfluence: 58 }, { id: 'empress', courtInfluence: 58 }],
            [],
            false,
            16,
            { current: 96, previous: 80, difficulty: 'normal' },
        )

        expect(result.politicalWillRatio).toBeGreaterThanOrEqual(0.95)
        expect(result.warCapabilityMet).toBe(2)
        expect(result.triggered).toBe(true)
    })
})
