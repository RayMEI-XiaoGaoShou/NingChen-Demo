import { describe, expect, it } from 'vitest'
import settlementSource from './Settlement.tsx?raw'
import roundSettlementSource from '../../game/roundSettlement.ts?raw'
import {
    buildSettlementDefaultEmpressReply,
    hasPolicyReason,
} from './Settlement'

describe('Settlement helpers', () => {
    it('detects whether the player authored a policy reason', () => {
        expect(hasPolicyReason(null)).toBe(false)
        expect(hasPolicyReason({ reason: '' })).toBe(false)
        expect(hasPolicyReason({ reason: '   ' })).toBe(false)
        expect(hasPolicyReason({ reason: '先把粮道与户籍一起清出来。' })).toBe(true)
    })

    it('builds a terse default empress reply when no policy reason was authored', () => {
        expect(buildSettlementDefaultEmpressReply(null)).toBeNull()
        expect(buildSettlementDefaultEmpressReply({ optionContent: '清点户籍仓廪' })).toBe(
            '朕已按“清点户籍仓廪”着手施行。',
        )
    })
})

describe('Settlement source contract', () => {
    it('keeps empress feedback AI gated behind authored policy reasoning', () => {
        expect(settlementSource).toContain('policyReasonAuthored && lastSettlement.policyReport')
        expect(settlementSource).toContain('buildEmpressFeedbackPrompt(lastSettlement.policyReport)')
        expect(settlementSource).toContain('buildSettlementDefaultEmpressReply(lastSettlement.policyReport)')
        expect(settlementSource).not.toContain('眼下${lastSettlement.policyReport.effectSummary}')
    })

    it('renders the full policy question as the empress reply title and highlights the selected option', () => {
        expect(settlementSource).toContain('{lastSettlement.policyReport.question}')
        expect(settlementSource).toContain('policy-option-highlight')
    })

    it('stores the full policy question in the settlement report', () => {
        expect(roundSettlementSource).toContain('question: string')
        expect(roundSettlementSource).toContain('question: question.question')
    })
})
