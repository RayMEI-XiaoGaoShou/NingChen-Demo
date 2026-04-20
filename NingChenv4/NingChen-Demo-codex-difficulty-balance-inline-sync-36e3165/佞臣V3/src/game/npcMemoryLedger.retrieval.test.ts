import { describe, expect, it } from 'vitest'
import type { NpcMemoryEntry } from './types'
import * as npcMemoryLedger from './npcMemoryLedger'

function makeEntry(overrides: Partial<NpcMemoryEntry> & Pick<NpcMemoryEntry, 'category' | 'sourceRound' | 'importance' | 'summary'>): NpcMemoryEntry {
    return {
        npcId: 'npc-1',
        ...overrides,
    }
}

describe('npcMemoryLedger retrieval', () => {
    it('prefers favor and saved_face memories for advise retrieval', () => {
        const entries: NpcMemoryEntry[] = [
            makeEntry({
                category: 'betrayal',
                sourceRound: 12,
                importance: 3,
                summary: 'betrayal',
            }),
            makeEntry({
                category: 'favor',
                sourceRound: 8,
                importance: 1,
                summary: 'favor',
            }),
            makeEntry({
                category: 'saved_face',
                sourceRound: 7,
                importance: 1,
                summary: 'saved face',
            }),
        ]

        const ranked = (npcMemoryLedger as any).rankNpcMemoryEntriesForScheme({
            entries,
            schemeType: 'advise',
            currentRound: 13,
        }) as NpcMemoryEntry[]

        expect(ranked.slice(0, 2).map(entry => entry.category)).toEqual(['favor', 'saved_face'])
        expect(ranked[2].category).toBe('betrayal')
    })

    it('prefers warning and betrayal memories for slander retrieval', () => {
        const entries: NpcMemoryEntry[] = [
            makeEntry({
                category: 'favor',
                sourceRound: 12,
                importance: 3,
                summary: 'favor',
            }),
            makeEntry({
                category: 'warning',
                sourceRound: 8,
                importance: 1,
                summary: 'warning',
            }),
            makeEntry({
                category: 'betrayal',
                sourceRound: 7,
                importance: 1,
                summary: 'betrayal',
            }),
        ]

        const ranked = (npcMemoryLedger as any).rankNpcMemoryEntriesForScheme({
            entries,
            schemeType: 'slander',
            currentRound: 13,
        }) as NpcMemoryEntry[]

        expect(ranked.slice(0, 2).map(entry => entry.category)).toEqual(['warning', 'betrayal'])
        expect(ranked[2].category).toBe('favor')
    })

    it('prefers legitimacy pressure and court memories for omen retrieval', () => {
        const entries: NpcMemoryEntry[] = [
            makeEntry({
                category: 'favor',
                sourceRound: 12,
                importance: 3,
                summary: 'favor',
            }),
            makeEntry({
                category: 'power_shift',
                sourceRound: 7,
                importance: 1,
                summary: 'legitimacy',
                tags: ['legitimacy', 'court'],
            }),
            makeEntry({
                category: 'betrayal',
                sourceRound: 9,
                importance: 1,
                summary: 'pressure',
                tags: ['pressure'],
            }),
        ]

        const ranked = (npcMemoryLedger as any).rankNpcMemoryEntriesForScheme({
            entries,
            schemeType: 'omen',
            currentRound: 13,
        }) as NpcMemoryEntry[]

        expect(ranked.slice(0, 2).map(entry => entry.summary)).toEqual(['legitimacy', 'pressure'])
        expect(ranked[2].category).toBe('favor')
    })

    it('falls back to baseline ranking when no scheme-relevant memory exists', () => {
        const entries: NpcMemoryEntry[] = [
            makeEntry({
                category: 'power_shift',
                sourceRound: 10,
                importance: 1,
                summary: 'fresh low',
            }),
            makeEntry({
                category: 'power_shift',
                sourceRound: 8,
                importance: 1,
                summary: 'stale low',
            }),
            makeEntry({
                category: 'power_shift',
                sourceRound: 9,
                importance: 2,
                summary: 'mid high',
            }),
        ]

        const ranked = (npcMemoryLedger as any).rankNpcMemoryEntriesForScheme({
            entries,
            schemeType: 'advise',
            currentRound: 12,
        }) as NpcMemoryEntry[]

        expect(ranked.map(entry => entry.summary)).toEqual(['mid high', 'fresh low', 'stale low'])
    })
})
