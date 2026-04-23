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

    it('keeps fallback imperial and richer when the player did author a reason', () => {
        expect(
            buildSettlementDefaultEmpressReply({
                optionContent: '先整军令，再催粮道',
                reason: '先把节度与军令统一，前线才不会各唱各的调。',
                weakestDimensionLabel: '军事',
                warWindow: true,
                playerDangerStage: 'under_watch',
            }),
        ).toContain('朕已按“先整军令，再催粮道”着手施行。')
    })

    it('avoids repeating guarded backlash summaries that restate the same warning', () => {
        const text = getSettlementBacklashText({
            npcId: 'hebaqi',
            npcName: '贺拔琪',
            type: 'guarded',
            intensity: 2,
            sourceRound: 3,
            summary: '贺拔琪表面仍循旧章，然近来言语间已多了一层提防。',
        })

        expect(text).toContain('贺拔琪')
        expect(text).toContain('心里却已记下了这笔账')
        expect(text).toContain('不会像今日这般好说话')
    })

    it('prefers the guided policy aftereffect line when it would otherwise repeat the same idea', () => {
        expect(
            selectSettlementPolicyAftereffectText(
                '你的附言切中了此议真正的关节。这道新政不只当回合收效，下一个回合还会继续生出余力。',
                '你上回合的筹对收益延续到了这一回合。',
            ),
        ).toEqual(['你的附言切中了此议真正的关节。这道新政不只当回合收效，下一个回合还会继续生出余力。'])
    })
})

describe('Settlement source contract', () => {
    it('keeps empress feedback AI gated behind authored policy reasoning', () => {
        expect(settlementSource).toContain('policyReasonAuthored && empressFeedbackContext')
        expect(settlementSource).toContain('const empressFeedbackContext = lastSettlement.policyReport')
        expect(settlementSource).toContain('buildEmpressFeedbackContext({')
        expect(settlementSource).toContain('buildEmpressFeedbackPrompt(empressFeedbackContext)')
        expect(settlementSource).toContain('buildSettlementDefaultEmpressReply(lastSettlement.policyReport)')
        expect(settlementSource).not.toContain('眼下${lastSettlement.policyReport.effectSummary}')
    })

    it('renders the full policy question as the empress reply title and highlights the selected option', () => {
        expect(settlementSource).toContain('{lastSettlement.policyReport.question}')
        expect(settlementSource).toContain('policy-option-highlight')
    })

    it('stores the full policy question and policy parse in the settlement report', () => {
        expect(roundSettlementSource).toContain('question: string')
        expect(roundSettlementSource).toContain('question: question.question')
        expect(roundSettlementSource).toContain('policyParse: PolicyReasonParseResult | null')
    })

    it('renders court disposition reports as their own settlement section', () => {
        expect(settlementSource).toContain('lastSettlement.borrowedBladeReports.map')
        expect(roundSettlementSource).toContain('borrowedBladeReports')
    })

    it('renders two-part explainability rows and routes campaign narration through the battle record board', () => {
        expect(settlementSource).toContain('lastSettlement?.schemeOutcomeExplanations?.[i]')
        expect(settlementSource).toContain('SCHEME_OUTCOME_LABEL_ORDER')
        expect(settlementSource).not.toContain('局势伏线')
        expect(settlementSource).toContain('buildCampaignRecordPanel({')
        expect(settlementSource).not.toContain('getCampaignMomentumPresentation')
        expect(roundSettlementSource).toContain('schemeOutcomeExplanations')
    })
})
