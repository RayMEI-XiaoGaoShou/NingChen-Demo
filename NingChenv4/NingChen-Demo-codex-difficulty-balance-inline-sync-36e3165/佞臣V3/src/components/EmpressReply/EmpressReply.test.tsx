import { describe, expect, it } from 'vitest'
import empressReplySource from './EmpressReply.tsx?raw'

describe('EmpressReply source contract', () => {
    it('generates and caches the empress reply before settlement', () => {
        expect(empressReplySource).toContain('generateEmpressReplyRecordForPolicy')
        expect(empressReplySource).toContain("tag: 'empress_feedback_reply_page'")
        expect(empressReplySource).toContain("playerDangerStage: roundStartSnapshot?.playerDangerStage ?? 'safe'")
        expect(empressReplySource).toContain('setEmpressReplyRecord({')
        expect(empressReplySource).toContain("mode: 'fallback'")
        expect(empressReplySource).not.toContain('playerDangerStage: lastSettlement.playerDangerStage')
    })

    it('skips the AI call when the player did not author a policy reason', () => {
        expect(empressReplySource).toContain('generateEmpressReplyRecordForPolicy')
        expect(empressReplySource).toContain('buildSettlementDefaultEmpressReply(policyReport)')
    })

    it('shows the policy question, selected option, current effects, and authored-reason status', () => {
        expect(empressReplySource).toContain('policyReport.question')
        expect(empressReplySource).toContain('policyReport.optionLabel')
        expect(empressReplySource).toContain('本回合南陈变化')
        expect(empressReplySource).toContain('论证切题')
        expect(empressReplySource).toContain('未具附言')
    })
})
