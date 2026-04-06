import { ROUND_EVENTS } from '../data/rounds'
import { getSchemeByType } from '../data/schemes'
import { buildNpcPromptDynamicContext } from './npcPromptContext'
import type {
    DelayedBacklash,
    Faction,
    FengDaozhiDraftRequest,
    FengDaozhiDraftResult,
    NPC,
    PlayerDangerStage,
    RoundHistoryEntry,
} from './types'

export interface FengDaozhiDraftContext {
    round: number
    eventName: string
    eventBriefing: string
    schemeLabel: string
    targetNpcName: string
    targetNpcTitle: string
    targetPersona: string
    visibleSecrets: string[]
    previousDealings: string
    relationshipTemperature: string
    recentCourtFortune: string
    factionPressure: string
    playerDangerStage: PlayerDangerStage
}

export function buildFengDaozhiDraftContext(params: {
    request: FengDaozhiDraftRequest
    npc: NPC
    factions: Faction[]
    unlockedSecrets: number
    roundHistory: RoundHistoryEntry[]
    recentBacklash: DelayedBacklash[]
}): FengDaozhiDraftContext {
    const { request, npc, factions, unlockedSecrets, roundHistory, recentBacklash } = params
    const roundEvent = ROUND_EVENTS[request.round - 1]
    const dynamicContext = buildNpcPromptDynamicContext({
        npc,
        factions,
        roundHistory,
        recentBacklash,
    })

    return {
        round: request.round,
        eventName: roundEvent?.eventName ?? '',
        eventBriefing: roundEvent?.briefing ?? '',
        schemeLabel: getSchemeByType(request.schemeType)?.name ?? request.schemeType,
        targetNpcName: npc.name,
        targetNpcTitle: npc.title,
        targetPersona: npc.publicPersona,
        visibleSecrets: npc.secretThreads.slice(0, Math.max(0, unlockedSecrets)),
        previousDealings: dynamicContext.previousDealings,
        relationshipTemperature: dynamicContext.relationshipTemperature,
        recentCourtFortune: dynamicContext.recentCourtFortune,
        factionPressure: dynamicContext.factionPressure,
        playerDangerStage: request.playerDangerStage,
    }
}

export function normalizeFengDaozhiDraft(
    raw: { primaryText?: string; secondaryText?: string } | null,
    schemeType: FengDaozhiDraftRequest['schemeType'],
): FengDaozhiDraftResult | null {
    if (!raw?.primaryText?.trim()) return null

    const primaryText = raw.primaryText.trim()
    const secondaryText = raw.secondaryText?.trim()

    return {
        primaryText,
        secondaryText: schemeType === 'omen' ? secondaryText ?? '' : undefined,
        source: 'ai',
    }
}

export function buildFallbackFengDaozhiDraft(
    request: FengDaozhiDraftRequest,
    context: FengDaozhiDraftContext,
): FengDaozhiDraftResult {
    if (request.schemeType === 'omen') {
        return {
            primaryText: context.visibleSecrets[0]
                ? '异象既起，朝野自会把它与人事相连。'
                : '异象既现，人心未必还能照旧安稳。',
            secondaryText: '可顺着名分、法统与谁最该警惕去解释，不必急着把话挑明。',
            source: 'fallback',
        }
    }

    return {
        primaryText: `可顺着${context.targetNpcName}眼下最在意的权柄、体面与退路去写，不必一口气把话说满。`,
        source: 'fallback',
    }
}
