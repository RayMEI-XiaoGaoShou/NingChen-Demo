import { describe, expect, it } from 'vitest'
import npcDetailSource from './NPCDetail.tsx?raw'

describe('NPCDetail', () => {
    it('keeps leverage points but does not show suitable scheme hooks', () => {
        expect(npcDetailSource).toContain('npc.softSpot')
        expect(npcDetailSource).toContain('npc.triggerPoint')
        expect(npcDetailSource).not.toMatch(/className="metric-chip"[^>]*>[^<]*\{npc\.schemeHooks\}/)
    })
})
