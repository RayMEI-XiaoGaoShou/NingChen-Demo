import { getRoundCampaignEventContext, getRoundStartCampaignDisplay } from './campaignDisplayEngine'
import { buildNpcPromptDynamicContext } from './npcPromptContext'
import { getNpcRoundReaction } from './roundIntelEngine'
import type { CampaignState, DelayedBacklash, Faction, NPC, NpcMemoryLedger, RoundHistoryEntry } from './types'

export interface FengDaozhiSituationSummary {
    eventName: string
    eventBriefing: string
    campaignSummary?: string
    currentPublicStatement?: string
    previousDealings: string
    relationshipTemperature: string
    recentCourtFortune: string
    factionPressure: string
    longTermMemorySummary: string
    relationshipSummary: string
    courtSituationSummary: string
}

export function buildFengDaozhiSituationSummary(params: {
    round: number
    npc: NPC
    factions: Faction[]
    unlockedSecrets: number
    roundHistory: RoundHistoryEntry[]
    recentBacklash: DelayedBacklash[]
    shuCampaign: CampaignState
    huainanCampaign: CampaignState
    npcMemoryLedger?: NpcMemoryLedger
}): FengDaozhiSituationSummary {
    const {
        round,
        npc,
        factions,
        unlockedSecrets,
        roundHistory,
        recentBacklash,
        shuCampaign,
        huainanCampaign,
        npcMemoryLedger = {},
    } = params

    const roundEvent = getRoundCampaignEventContext(round, shuCampaign, huainanCampaign)
    const campaignDisplay = getRoundStartCampaignDisplay(round, shuCampaign, huainanCampaign)
    const dynamicContext = buildNpcPromptDynamicContext({
        npc,
        factions,
        roundHistory,
        recentBacklash,
        npcMemoryLedger,
        currentRound: round,
    })
    const currentPublicStatement = getNpcRoundReaction(round, npc, unlockedSecrets, {
        shuCampaignState: shuCampaign.resolvedState ?? shuCampaign.state,
        huainanCampaignState: huainanCampaign.resolvedState ?? huainanCampaign.state,
    })?.trim()
    const campaignSummary = campaignDisplay.summary?.trim()

    return {
        eventName: roundEvent.eventName,
        eventBriefing: roundEvent.eventBriefing,
        campaignSummary,
        currentPublicStatement,
        previousDealings: dynamicContext.previousDealings,
        relationshipTemperature: dynamicContext.relationshipTemperature,
        recentCourtFortune: dynamicContext.recentCourtFortune,
        factionPressure: dynamicContext.factionPressure,
        longTermMemorySummary: dynamicContext.longTermMemorySummary,
        relationshipSummary: compactJoin([
            `上回往来：${dynamicContext.previousDealings}`,
            `近两回合关系温度：${dynamicContext.relationshipTemperature}`,
            dynamicContext.longTermMemorySummary ? `长期旧账：${dynamicContext.longTermMemorySummary}` : null,
        ]),
        courtSituationSummary: compactJoin([
            `本回合局势：${roundEvent.eventBriefing}`,
            campaignSummary ? `战局走向：${campaignSummary}` : null,
            currentPublicStatement ? `公开表态：${currentPublicStatement}` : null,
            `近来得失：${dynamicContext.recentCourtFortune}`,
            `派系压力：${dynamicContext.factionPressure}`,
            dynamicContext.longTermMemorySummary ? `长期旧账：${dynamicContext.longTermMemorySummary}` : null,
        ]),
    }
}

function compactJoin(parts: Array<string | null | undefined>): string {
    return parts
        .map(part => part?.trim())
        .filter((part): part is string => Boolean(part))
        .join(' ')
}
