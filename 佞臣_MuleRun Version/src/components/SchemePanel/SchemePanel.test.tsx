import { beforeEach, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { buildSchemeSpeechPayload, getSchemeSpeechFields, SchemePanel } from './SchemePanel'
import { useGameStore } from '../../stores/gameStore'
import { getOmenGuidePresentation } from '../../game/omenGuide'

describe('SchemePanel layout labels', () => {
    beforeEach(() => {
        useGameStore.getState().resetGame()
    })

    it('uses 叁 for 当前布局 before a second-target step is needed', () => {
        const markup = renderToStaticMarkup(<SchemePanel />)

        expect(markup).toContain('当前布局')
        expect(markup).toContain('叁')
    })

    it('computes omen onboarding for the first guided omen round', () => {
        const presentation = getOmenGuidePresentation({
            round: 13,
            difficulty: 'normal',
            firstRoundGuideSeen: {
                round_start: true,
                court_observe: true,
                scheme_phase: true,
                empress_letter: true,
                scheme_feedback: true,
                settlement: true,
            },
            schemeOnboardingSeen: {
                scheme_master_guide: true,
                first_omen_teaching: false,
            },
            omenGuideSeen: {
                first_omen_modal: false,
            },
        })

        expect(presentation).toBe('modal')
    })

    it('uses a two-stage input definition for omen speech', () => {
        const fields = getSchemeSpeechFields('omen')

        expect(fields.mode).toBe('omen')
        expect(fields.primaryLabel).toBe('谶辞 / 征兆')
        expect(fields.secondaryLabel).toBe('解释 / 指向')
        expect(fields.helperText).toContain('先给征兆')
    })

    it('builds merged player speech plus structured omen payload', () => {
        const payload = buildSchemeSpeechPayload({
            schemeType: 'omen',
            speech: '',
            omenSpeechInput: {
                omenText: '石人一只眼，挑动黄河天下反。',
                interpretationText: '此非独天灾，恐是名分失序之兆。',
            },
        })

        expect(payload.playerSpeech).toContain('石人一只眼，挑动黄河天下反。')
        expect(payload.playerSpeech).toContain('此非独天灾，恐是名分失序之兆。')
        expect(payload.omenSpeechInput?.omenText).toBe('石人一只眼，挑动黄河天下反。')
        expect(payload.omenSpeechInput?.interpretationText).toBe('此非独天灾，恐是名分失序之兆。')
    })
})
