import { describe, expect, it } from 'vitest'
import settlementSource from './Settlement.tsx?raw'
import roundSettlementSource from '../../game/roundSettlement.ts?raw'
import {
    buildSettlementDefaultEmpressReply,
    getSettlementBacklashText,
    hasPolicyReason,
    selectSettlementPolicyAftereffectText,
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

    it('avoids repeating guarded backlash summaries that restate the same warning', () => {
        expect(
            getSettlementBacklashText({
                npcId: 'hebaqi',
                npcName: '贺拔琪',
                type: 'guarded',
                intensity: 2,
                sourceRound: 3,
                summary: '贺拔琪表面仍循旧章，然近来言语间已多了一层提防。',
            }),
        ).toBe('贺拔琪开始对你多了一层提防，下回合信任可能下降。')
    })

    it('prefers the guided policy aftereffect line when it would otherwise repeat the same idea', () => {
        expect(
            selectSettlementPolicyAftereffectText(
                '你的附言切中此议的真正关节，新政的收益也会延续到下一回合。',
                '你上回合的奏对收益延续到了这一回合。',
            ),
        ).toEqual(['你的附言切中此议的真正关节，新政的收益也会延续到下一回合。'])
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
