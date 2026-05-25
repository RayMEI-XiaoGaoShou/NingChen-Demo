import { describe, expect, it } from 'vitest'
import { buildSchemeResultEffectTags, getSchemeNpcActionDisplay } from './schemeResultDisplay'

const courtNpc = {
    id: 'court-a',
    name: '祖廷',
    powerBase: 'court',
}

const externalNpc = {
    id: 'external-a',
    name: '独孤文约',
    powerBase: 'external',
}

const relatedExternalNpc = {
    id: 'external-b',
    name: '令狐律光',
    powerBase: 'external',
}

describe('schemeResultDisplay', () => {
    it('builds nation and faction delta tags without after-values', () => {
        const tags = buildSchemeResultEffectTags({
            result: {
                trustChange: 0,
                relatedTrustChange: 0,
                northDimensionChanges: { finance: -0.2, governance: -1 },
                factionEffects: {
                    empress: {
                        courtInfluence: -2,
                        internalStability: -1,
                        militaryPower: 1,
                    },
                },
                personEffects: {
                    trustDelta: 0,
                    relatedTrustDelta: 0,
                    loyaltyDelta: 0,
                    relatedLoyaltyDelta: 0,
                    militaryPowerDelta: 0,
                    relatedMilitaryPowerDelta: 0,
                },
            },
            action: null,
            targetNpc: courtNpc as any,
            relatedNpc: null,
            factions: [{ id: 'empress', name: '后党' } as any],
        })

        expect(tags.map(tag => tag.label)).toEqual([
            '北周财政 -0.2',
            '北周治理穿透力 -1',
            '后党 朝堂影响 -2',
            '后党 内部稳定 -1',
            '后党 军事实力 +1',
        ])
        expect(tags.map(tag => tag.label).join('|')).not.toContain('当前')
    })

    it('builds external target and related npc person delta tags', () => {
        const tags = buildSchemeResultEffectTags({
            result: {
                trustChange: 4,
                relatedTrustChange: -2,
                northDimensionChanges: {},
                factionEffects: {},
                personEffects: {
                    trustDelta: 4,
                    relatedTrustDelta: -2,
                    loyaltyDelta: -3,
                    relatedLoyaltyDelta: -2,
                    militaryPowerDelta: 2,
                    relatedMilitaryPowerDelta: -1,
                },
            },
            action: { relatedNpcId: 'external-b' } as any,
            targetNpc: externalNpc as any,
            relatedNpc: relatedExternalNpc as any,
            factions: [],
        })

        expect(tags.map(tag => tag.label)).toEqual([
            '独孤文约 信任 +4',
            '令狐律光 信任 -2',
            '忠诚度 -3',
            '军力 +2',
            '令狐律光 忠诚度 -2',
            '令狐律光 军力 -1',
        ])
    })

    it('omits zero deltas and returns a delayed fallback placeholder', () => {
        expect(buildSchemeResultEffectTags({
            result: {
                trustChange: 0,
                relatedTrustChange: 0,
                northDimensionChanges: { finance: 0 },
                factionEffects: { emperor: { courtInfluence: 0, internalStability: 0, militaryPower: 0 } },
                personEffects: {
                    trustDelta: 0,
                    relatedTrustDelta: 0,
                    loyaltyDelta: 0,
                    relatedLoyaltyDelta: 0,
                    militaryPowerDelta: 0,
                    relatedMilitaryPowerDelta: 0,
                },
            },
            action: null,
            targetNpc: externalNpc as any,
            relatedNpc: null,
            factions: [],
        })).toEqual([])

        expect(getSchemeNpcActionDisplay({
            npcName: '宇文棣',
            npcAction: { text: 'FALLBACK_TEXT_SHOULD_WAIT', source: 'fallback' },
            delayFallback: true,
        })).toEqual({
            label: '宇文棣举措',
            text: '正在筹算宇文棣举措...',
            isPlaceholder: true,
        })
    })

    it('labels non-move npc narratives by kind and includes intel delta chips', () => {
        const tags = buildSchemeResultEffectTags({
            result: {
                trustChange: 3,
                relatedTrustChange: 0,
                northDimensionChanges: {},
                factionEffects: {},
                personEffects: {
                    trustDelta: 3,
                    relatedTrustDelta: 0,
                    loyaltyDelta: 0,
                    relatedLoyaltyDelta: 0,
                    militaryPowerDelta: 0,
                    relatedMilitaryPowerDelta: 0,
                    intelDelta: 1,
                },
            },
            action: null,
            targetNpc: courtNpc as any,
            relatedNpc: null,
            factions: [],
        })

        expect(tags.map(tag => tag.label)).toEqual([
            '祖廷 信任 +3',
            '暗线 +1',
        ])
        expect(getSchemeNpcActionDisplay({
            npcName: '祖廷',
            npcAction: { text: '祖廷露出口风。', source: 'fallback', kind: 'intel' } as any,
            delayFallback: false,
        })).toEqual({
            label: '祖廷口风',
            text: '祖廷露出口风。',
            isPlaceholder: false,
        })
        expect(getSchemeNpcActionDisplay({
            npcName: '祖廷',
            npcAction: { text: '祖廷按下话头。', source: 'fallback', kind: 'counter' } as any,
            delayFallback: true,
        })).toEqual({
            label: '祖廷反制',
            text: '正在筹算祖廷反制...',
            isPlaceholder: true,
        })
    })
})
