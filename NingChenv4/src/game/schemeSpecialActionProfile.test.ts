import { describe, expect, it } from 'vitest'
import { deriveSpecialSchemeActionProfile } from './schemeSpecialActionProfile'
import type { NPC, NorthSchemeParseResult } from './types'

function makeParse(patch: Partial<NorthSchemeParseResult> = {}): NorthSchemeParseResult {
    return {
        characterFit: 0.7,
        eventFit: 0.7,
        structuralPenetration: 0.7,
        executability: 0.7,
        exposureRisk: 0.1,
        financeRelevance: 0.2,
        grainRelevance: 0.2,
        militaryRelevance: 0.2,
        socialOrderRelevance: 0.2,
        governanceRelevance: 0.2,
        dominantIntent: 'induce',
        evidence: [],
        ...patch,
    }
}

describe('special scheme action profile', () => {
    it('turns frame into target misstep plus observer feedback', () => {
        const profile = deriveSpecialSchemeActionProfile({
            schemeType: 'frame',
            targetNpc: { name: '宗艾', powerBase: 'court', factionId: 'emperor', title: '中常侍' } as unknown as NPC,
            parse: makeParse({
                selfTrapPotential: 0.8,
                scapegoatClarity: 0.7,
                governanceRelevance: 0.8,
                socialOrderRelevance: 0.6,
            }),
        })

        expect(profile?.targetMisstep).toMatch(/急辩|切割|扣人|压人|封口/u)
        expect(profile?.observerScope).toMatch(/御前|帝党|中枢法司|北周朝堂/u)
        expect(profile?.damageMechanism).toMatch(/案牍|风声|权责|推诿|壅塞/u)
        expect(profile?.promptLine).toContain('嫁祸落地链')
    })

    it('turns external omen into logistics or monitoring pressure', () => {
        const profile = deriveSpecialSchemeActionProfile({
            schemeType: 'omen',
            targetNpc: { name: '安思明', powerBase: 'external', title: '卢龙节度', factionId: null } as unknown as NPC,
            parse: makeParse({
                omenPolarity: 'destabilizing',
                centralSanctionLeverage: 0.8,
                grainRelevance: 0.7,
                militaryRelevance: 0.8,
            }),
        })

        expect(profile?.observerScope).toMatch(/中枢|御史|监军/u)
        expect(profile?.damageMechanism).toMatch(/粮道|军需|监军|转运/u)
        expect(profile?.promptLine).toContain('谶纬落地链')
    })
})
