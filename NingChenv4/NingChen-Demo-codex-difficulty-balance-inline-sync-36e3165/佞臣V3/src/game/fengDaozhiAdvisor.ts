import { getSchemeByType } from '../data/schemes'
import { buildFengDaozhiSituationSummary } from './fengDaozhiSituationSummary'
import type {
    CampaignState,
    DelayedBacklash,
    Faction,
    FengDaozhiDraftRequest,
    FengDaozhiDraftResult,
    NPC,
    NpcMemoryLedger,
    RelationMemoryLedger,
    PlayerDangerStage,
    RoundHistoryEntry,
} from './types'

export interface FengDaozhiDraftContext {
    round: number
    eventName: string
    eventBriefing: string
    campaignSummary?: string
    schemeLabel: string
    targetNpcName: string
    targetNpcTitle: string
    targetPersona: string
    currentPublicStatement?: string
    visibleSecrets: string[]
    previousDealings: string
    relationshipTemperature: string
    recentCourtFortune: string
    factionPressure: string
    longTermMemorySummary?: string
    relationMemorySummary?: string
    relationshipSummary?: string
    courtSituationSummary?: string
    playerDangerStage: PlayerDangerStage
}

export function buildFengDaozhiDraftContext(params: {
    request: FengDaozhiDraftRequest
    npc: NPC
    factions: Faction[]
    unlockedSecrets: number
    roundHistory: RoundHistoryEntry[]
    recentBacklash: DelayedBacklash[]
    shuCampaign: CampaignState
    huainanCampaign: CampaignState
    npcMemoryLedger?: NpcMemoryLedger
    relationMemoryLedger?: RelationMemoryLedger
}): FengDaozhiDraftContext {
    const {
        request,
        npc,
        factions,
        unlockedSecrets,
        roundHistory,
        recentBacklash,
        shuCampaign,
        huainanCampaign,
        npcMemoryLedger,
        relationMemoryLedger,
    } = params
    const situationSummary = buildFengDaozhiSituationSummary({
        round: request.round,
        npc,
        factions,
        unlockedSecrets,
        roundHistory,
        recentBacklash,
        shuCampaign,
        huainanCampaign,
        npcMemoryLedger,
        relationMemoryLedger,
        relatedNpcId: request.relatedNpcId,
        schemeType: request.schemeType,
    })

    return {
        round: request.round,
        eventName: situationSummary.eventName,
        eventBriefing: situationSummary.eventBriefing,
        campaignSummary: situationSummary.campaignSummary ?? '',
        schemeLabel: getSchemeByType(request.schemeType)?.name ?? request.schemeType,
        targetNpcName: npc.name,
        targetNpcTitle: npc.title,
        targetPersona: npc.publicPersona,
        currentPublicStatement: situationSummary.currentPublicStatement,
        visibleSecrets: npc.secretThreads.slice(0, Math.max(0, unlockedSecrets)),
        previousDealings: situationSummary.previousDealings,
        relationshipTemperature: situationSummary.relationshipTemperature,
        recentCourtFortune: situationSummary.recentCourtFortune,
        factionPressure: situationSummary.factionPressure,
        longTermMemorySummary: situationSummary.longTermMemorySummary,
        relationMemorySummary: situationSummary.relationMemorySummary,
        relationshipSummary: situationSummary.relationshipSummary,
        courtSituationSummary: situationSummary.courtSituationSummary,
        playerDangerStage: request.playerDangerStage,
    }
}

export function normalizeFengDaozhiDraft(
    raw: { primaryText?: string; secondaryText?: string; reasoning?: string } | null,
    schemeType: FengDaozhiDraftRequest['schemeType'],
): FengDaozhiDraftResult | null {
    if (!raw?.primaryText?.trim()) return null

    const primaryText = raw.primaryText.trim()
    const secondaryText = raw.secondaryText?.trim()
    const reasoning = raw.reasoning?.trim()

    return {
        primaryText,
        secondaryText: schemeType === 'omen' ? secondaryText ?? '' : undefined,
        reasoning,
        source: 'ai',
    }
}

export function buildFallbackFengDaozhiDraft(
    request: FengDaozhiDraftRequest,
    context: FengDaozhiDraftContext,
): FengDaozhiDraftResult {
    if (request.schemeType === 'omen') {
        const positionLabel = /诏令|中枢|宫中|法统|名分/.test(context.targetNpcTitle + context.targetPersona)
            ? '中枢'
            : '朝局边缘'
        return {
            primaryText: context.visibleSecrets[0]
                ? '异象既起，朝野自会把它与人事相连。'
                : '异象既现，人心未必还能照旧安稳。',
            secondaryText: '可顺着名分、法统与谁最该警惕去解释，不必急着把话挑明。',
            reasoning: `${context.targetNpcName}身在${positionLabel}，更容易被名分与法统压力牵动。`,
            source: 'fallback',
        }
    }

    return {
        primaryText: `可顺着${context.targetNpcName}眼下最在意的权柄、体面与退路去写，不必一口气把话说满。`,
        source: 'fallback',
    }
}
