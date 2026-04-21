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
        ).toBe('贺拔琪 虽未当面翻脸，心里却已记下了这笔账。下回合再试探他时，恐怕不会像今日这般好说话。')
    })

    it('prefers the guided policy aftereffect line when it would otherwise repeat the same idea', () => {
        expect(
            selectSettlementPolicyAftereffectText(
                '你的附言切中了此议真正的关节。这道新政不只当回合收效，下一回合还会继续生出余力。',
                '你上回合的奏对收益延续到了这一回合。',
            ),
        ).toEqual(['你的附言切中了此议真正的关节。这道新政不只当回合收效，下一回合还会继续生出余力。'])
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

    it('renders court disposition reports as their own settlement section', () => {
        expect(settlementSource).toContain('朝堂收网')
        expect(settlementSource).toContain('lastSettlement.borrowedBladeReports.map')
        expect(roundSettlementSource).toContain('朝堂收网${borrowedBladeReports.length}次')
    })

    it('renders three-part explainability rows for each settled scheme and a momentum surface', () => {
        expect(settlementSource).toContain('lastSettlement?.schemeOutcomeExplanations?.[i]')
        expect(settlementSource).toContain('直接伤国')
        expect(settlementSource).toContain('结构施压')
        expect(settlementSource).toContain('推进阈值')
        expect(settlementSource).toContain('战役动量')
        expect(roundSettlementSource).toContain('schemeOutcomeExplanations')
    })
})
