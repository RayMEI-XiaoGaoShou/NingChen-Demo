import type { CourtFactionId, NationDimensions, NPC } from './types'
import type { FactionVector } from './schemeEngine'

export interface ExternalActionReport {
    npcId: string
    npcName: string
    action: 'secession' | 'rebellion'
    outcome: string
    nationEffects: Partial<NationDimensions>
}

export function resolveExternalAction(targetNpc: NPC, action: 'secession' | 'rebellion'): {
    report: ExternalActionReport
    factionPenalty: Partial<Record<CourtFactionId, FactionVector>>
} | null {
    if (!targetNpc.isAlive) return null

    const leverage =
        targetNpc.militaryPower * 0.9 +
        targetNpc.trust * 0.18 +
        Math.max(0, 40 - targetNpc.loyaltyToCourt) * 0.9 +
        (targetNpc.highActionBias === action ? 8 : -4)

    if (action === 'secession') {
        if (leverage >= 58) {
            targetNpc.externalStatus = 'secession'
            const damage = damageByMilitaryTier(targetNpc.militaryPower, 'secession')
            return {
                report: {
                    npcId: targetNpc.id,
                    npcName: targetNpc.name,
                    action,
                    outcome: `${targetNpc.name}借乱局坐实地方自雄，明面仍奉朝廷，实则已成割据。`,
                    nationEffects: damage,
                },
                factionPenalty: linkedFactionPenalty(targetNpc, 1.4, 1.1),
            }
        }

        targetNpc.externalStatus = 'loyal'
        targetNpc.loyaltyToCourt = clamp(targetNpc.loyaltyToCourt + 6)
        return {
            report: {
                npcId: targetNpc.id,
                npcName: targetNpc.name,
                action,
                outcome: `${targetNpc.name}权衡之后仍未敢明牌，只是离心更重，暂观朝局。`,
                nationEffects: {
                    governance: -0.8,
                    socialOrder: -0.5,
                },
            },
            factionPenalty: linkedFactionPenalty(targetNpc, 0.6, 0.4),
        }
    }

    if (leverage >= 72) {
        targetNpc.externalStatus = 'rebellion'
        const damage = damageByMilitaryTier(targetNpc.militaryPower, 'rebellion')
        return {
            report: {
                npcId: targetNpc.id,
                npcName: targetNpc.name,
                action,
                outcome: `${targetNpc.name}击退平叛军队后割据一方，北周不得不正面应对其明旗反周之势。`,
                nationEffects: damage,
            },
            factionPenalty: linkedFactionPenalty(targetNpc, 2.4, 2.1),
        }
    }

    const fallbackForce = Math.max(18, targetNpc.militaryPower)
    targetNpc.isAlive = false
    targetNpc.externalStatus = 'rebellion'
    targetNpc.militaryPower = 0
    return {
        report: {
            npcId: targetNpc.id,
            npcName: targetNpc.name,
            action,
            outcome: `${targetNpc.name}起兵旋即为平叛军所剿，虽未坐大，却已逼北周为此折损兵粮。`,
            nationEffects: downshiftDamage(damageByMilitaryTier(fallbackForce, 'rebellion')),
        },
        factionPenalty: linkedFactionPenalty(targetNpc, 1.8, 1.5),
    }
}

function linkedFactionPenalty(
    npc: NPC,
    courtInfluenceLoss: number,
    militaryLoss: number,
): Partial<Record<CourtFactionId, FactionVector>> {
    if (npc.alignmentBias === 'emperor' || npc.alignmentBias === 'empress') {
        return {
            [npc.alignmentBias]: {
                militaryPower: -militaryLoss,
                courtInfluence: -courtInfluenceLoss,
                internalStability: -1.2,
            },
        }
    }

    if (npc.alignmentBias === 'swing') {
        return {
            emperor: {
                militaryPower: -round(militaryLoss * 0.5),
                courtInfluence: -round(courtInfluenceLoss * 0.5),
                internalStability: -0.6,
            },
            empress: {
                militaryPower: -round(militaryLoss * 0.5),
                courtInfluence: -round(courtInfluenceLoss * 0.5),
                internalStability: -0.6,
            },
        }
    }

    return {}
}

function damageByMilitaryTier(
    militaryPower: number,
    action: 'secession' | 'rebellion',
): Partial<NationDimensions> {
    const tier = militaryPower <= 35 ? 'light' : militaryPower <= 44 ? 'mid' : militaryPower <= 54 ? 'heavy' : 'extreme'
    const tables: Record<'secession' | 'rebellion', Record<'light' | 'mid' | 'heavy' | 'extreme', NationDimensions>> = {
        secession: {
            light: { finance: -2, grain: -1, military: -2, socialOrder: -1, governance: -3 },
            mid: { finance: -2, grain: -1, military: -2, socialOrder: -2, governance: -4 },
            heavy: { finance: -3, grain: -2, military: -3, socialOrder: -2, governance: -4 },
            extreme: { finance: -4, grain: -3, military: -4, socialOrder: -3, governance: -5 },
        },
        rebellion: {
            light: { finance: -3, grain: -2, military: -3, socialOrder: -2, governance: -4 },
            mid: { finance: -3, grain: -2, military: -4, socialOrder: -3, governance: -5 },
            heavy: { finance: -4, grain: -3, military: -5, socialOrder: -4, governance: -6 },
            extreme: { finance: -5, grain: -4, military: -6, socialOrder: -5, governance: -7 },
        },
    }
    return tables[action][tier]
}

function downshiftDamage(damage: Partial<NationDimensions>): Partial<NationDimensions> {
    const adjusted: Partial<NationDimensions> = {}
    for (const [key, value] of Object.entries(damage) as Array<[keyof NationDimensions, number | undefined]>) {
        adjusted[key] = value ? Math.min(-1, value + 1) : value
    }
    return adjusted
}

function clamp(value: number, min = 0, max = 100): number {
    return Math.max(min, Math.min(max, Math.round(value * 10) / 10))
}

function round(value: number): number {
    return Math.round(value * 10) / 10
}
