import type { ExternalStatus, NPC } from './types'

export function isExternalTerminalStatus(status: ExternalStatus): boolean {
    return status === 'secession' || status === 'rebellion'
}

export function isExternalEscalationOpen(status: ExternalStatus): boolean {
    return !isExternalTerminalStatus(status)
}

export function normalizeNonTerminalExternalStatus(status: ExternalStatus): ExternalStatus {
    return isExternalTerminalStatus(status) ? status : 'loyal'
}

export function isTerminalExternalNpc(
    npc: Pick<NPC, 'powerBase' | 'externalStatus'>,
): boolean {
    return npc.powerBase === 'external' && isExternalTerminalStatus(npc.externalStatus)
}

export function getExternalTerminalLabel(status: ExternalStatus): string {
    if (status === 'secession') return '已割据'
    if (status === 'rebellion') return '已反叛'
    return ''
}

export function getExternalTerminalSummary(status: ExternalStatus): string {
    if (status === 'secession') {
        return '此人已坐实割据，不再受朝廷调遣，也不再适合作为施计对象。'
    }
    if (status === 'rebellion') {
        return '此人已明旗反叛，已走到与朝廷正面冲突的一步，也不再适合作为施计对象。'
    }
    return ''
}
