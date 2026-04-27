import { describe, expect, it } from 'vitest'
import settlementSource from './Settlement.tsx?raw'
import roundSettlementSource from '../../game/roundSettlement.ts?raw'
import settlementTypesSource from '../../game/settlementTypes.ts?raw'
import {
    formatChronicleVolumeNumber,
    getChronicleVolumeTitle,
    getSettlementBacklashText,
    selectSettlementPolicyAftereffectText,
} from './Settlement'
import {
    buildSettlementDefaultEmpressReply,
    hasPolicyReason,
} from '../../game/empressReplyPresentation'

describe('Settlement helpers', () => {
    it('formats chronicle volume numbers for the twenty-round campaign', () => {
        expect(formatChronicleVolumeNumber(1)).toBe('一')
        expect(formatChronicleVolumeNumber(2)).toBe('二')
        expect(formatChronicleVolumeNumber(10)).toBe('十')
        expect(formatChronicleVolumeNumber(11)).toBe('十一')
        expect(formatChronicleVolumeNumber(20)).toBe('二十')
        expect(getChronicleVolumeTitle(1)).toBe('《南北朝通鉴-卷一》')
    })

    it('detects whether the player authored a policy reason', () => {
        expect(hasPolicyReason(null)).toBe(false)
        expect(hasPolicyReason({ reason: '' })).toBe(false)
        expect(hasPolicyReason({ reason: '   ' })).toBe(false)
        expect(hasPolicyReason({ reason: '先把粮道与户籍一起清出来。' })).toBe(true)
    })

    it('builds a terse default empress reply when no policy reason was authored', () => {
        expect(buildSettlementDefaultEmpressReply(null)).toBeNull()
        const reply = buildSettlementDefaultEmpressReply({ optionContent: '清点户籍仓廪' })
        expect(reply).toContain('朕知你在北庭周旋')
        expect(reply).toContain('朕已按“清点户籍仓廪”着手施行')
        expect(reply).not.toContain('+')
    })

    it('keeps fallback imperial and richer when the player did author a reason', () => {
        expect(
            buildSettlementDefaultEmpressReply({
                optionContent: '先整军令，再催粮道',
                reason: '先把节度与军令统一，前线才不会各唱各的调。',
                weakestDimensionLabel: '军事',
                warWindow: true,
                playerDangerStage: 'under_watch',
                concernOpening: '淮南军书压到案前，朕读你的字，倒更想起你也在另一处战场。',
                concernClosingHint: '结尾宜强调战役可进，后勤与性命不可轻掷。',
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
    it('keeps empress feedback generation out of settlement and feeds cached reply to judge narration', () => {
        expect(settlementSource).not.toContain('buildEmpressFeedbackPrompt')
        expect(settlementSource).not.toContain('buildEmpressFeedbackContext({')
        expect(settlementSource).not.toContain('<h3 className="section-title">南陈回信</h3>')
        expect(settlementSource).toContain('southEmpressReply')
        expect(settlementSource).toContain('empressReplyRecord?.sourceRound === currentRound')
        expect(settlementSource).not.toContain('眼下${lastSettlement.policyReport.effectSummary}')
    })

    it('keeps policy aftereffect in settlement after moving the empress reply card out', () => {
        expect(settlementSource).toContain('问政余波')
        expect(settlementSource).toContain('lastSettlement?.policyAftereffect')
    })

    it('stores the full policy question and policy parse in the settlement report', () => {
        expect(settlementTypesSource).toContain('question: string')
        expect(roundSettlementSource).toContain('question: question.question')
        expect(settlementTypesSource).toContain('policyParse: PolicyReasonParseResult | null')
    })

    it('keeps court disposition reports in settlement data but no longer renders them on settlement', () => {
        expect(settlementSource).not.toContain('lastSettlement.borrowedBladeReports.map')
        expect(settlementSource).not.toContain('<h3 className="section-title">朝堂收网</h3>')
        expect(roundSettlementSource).toContain('borrowedBladeReports')
    })

    it('moves scheme explainability rows out of settlement and routes campaign narration through the battle record board', () => {
        expect(settlementSource).not.toContain('lastSettlement?.schemeOutcomeExplanations?.[i]')
        expect(settlementSource).not.toContain('SCHEME_OUTCOME_LABEL_ORDER')
        expect(settlementSource).not.toContain('<h3 className="section-title">计谋筹算结果</h3>')
        expect(settlementSource).not.toContain('局势伏线')
        expect(settlementSource).toContain('buildCampaignRecordPanel({')
        expect(settlementSource).not.toContain('getCampaignMomentumPresentation')
        expect(roundSettlementSource).toContain('schemeOutcomeExplanations')
    })

    it('feeds causal scheme events into judge narration and renders key change highlights', () => {
        expect(settlementSource).toContain('buildSettlementSchemeCausalEvents')
        expect(settlementSource).toContain('schemeCausalEvents: schemeCausalEvents.map')
        expect(settlementSource).toContain('selectSettlementChronicleQuoteCandidate')
        expect(settlementSource).toContain('northQuoteCandidate')
        expect(settlementSource).toContain('chronicleTimeLabel')
        expect(settlementSource).toContain('《南北朝通鉴-卷')
        expect(settlementSource).not.toContain('<h3 className="judge-title">天道结算</h3>')
        expect(settlementSource).toContain('lastSettlement?.keyChangeHighlights')
        expect(roundSettlementSource).toContain('keyChangeHighlights')
        expect(roundSettlementSource).toContain('buildSettlementKeyChangeHighlights')
    })
})
