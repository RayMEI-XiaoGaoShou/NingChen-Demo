import type { NPC, SchemeType } from './types'

export function getRevealedSecretThreadForScheme(params: {
    npc: Pick<NPC, 'secretThreads'>
    schemeType: SchemeType
    success: boolean
    currentUnlockedSecrets: number
}): string | null {
    if (params.schemeType !== 'probe' || !params.success) return null

    const revealIndex = Math.max(0, Math.floor(params.currentUnlockedSecrets))
    const thread = params.npc.secretThreads[revealIndex]?.trim()
    return thread || null
}
