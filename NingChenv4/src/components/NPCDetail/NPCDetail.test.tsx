import { describe, expect, it } from 'vitest'
import npcDetailSource from './NPCDetail.tsx?raw'

describe('NPCDetail', () => {
    it('keeps leverage points but does not show suitable scheme hooks', () => {
        expect(npcDetailSource).toContain('npc.softSpot')
        expect(npcDetailSource).toContain('npc.triggerPoint')
        expect(npcDetailSource).not.toMatch(/className="metric-chip"[^>]*>[^<]*\{npc\.schemeHooks\}/)
    })

    it('uses terminal external labels and explains when a warlord line has already closed', () => {
        expect(npcDetailSource).toContain('getExternalTerminalSummary')
        expect(npcDetailSource).toContain('isTerminalExternalNpc')
        expect(npcDetailSource).toContain('态势：{getExternalPostureLabel(npc)}')
        expect(npcDetailSource).toContain("getExternalTerminalSummary(npc.externalStatus)")
    })

    it('renders emperor favor and empress dowager favor for court disposition targets', () => {
        expect(npcDetailSource).toContain('宫中风向')
        expect(npcDetailSource).toContain('皇帝恩宠')
        expect(npcDetailSource).toContain('太后眷顾')
        expect(npcDetailSource).toContain('getCourtFavor(npc)')
    })

    it('makes dismissed court targets read as terminal instead of actionable', () => {
        expect(npcDetailSource).toContain('getCoreCourtStatusLabel')
        expect(npcDetailSource).toContain('已经退出朝堂处置链，不再适合继续布局。')
        expect(npcDetailSource).toContain('!isTerminalCourt ? (')
        expect(npcDetailSource).toContain('此人已离开可操作名单，后续不再显示可用计谋。')
    })
})
