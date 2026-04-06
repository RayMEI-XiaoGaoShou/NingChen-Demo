import { describe, expect, it } from 'vitest'
import { getOmenGuidePresentation } from './omenGuide'

const seenSchemeGuide = {
    round_start: true,
    court_observe: true,
    scheme_phase: true,
    empress_letter: true,
    scheme_feedback: true,
    settlement: true,
}

const schemeOnboardingSeen = {
    scheme_master_guide: true,
    first_omen_teaching: false,
}

describe('getOmenGuidePresentation', () => {
    it('shows the full omen modal the first time guided difficulties hit an omen round', () => {
        expect(getOmenGuidePresentation({
            round: 13,
            difficulty: 'normal',
            firstRoundGuideSeen: seenSchemeGuide,
            schemeOnboardingSeen,
            omenGuideSeen: { first_omen_modal: false },
        })).toBe('modal')
    })

    it('falls back to the inline omen hint on harder difficulties', () => {
        expect(getOmenGuidePresentation({
            round: 13,
            difficulty: 'hard',
            firstRoundGuideSeen: seenSchemeGuide,
            schemeOnboardingSeen,
            omenGuideSeen: { first_omen_modal: false },
        })).toBe('inline')
    })

    it('does not show omen guidance before the scheme tutorial has been cleared', () => {
        expect(getOmenGuidePresentation({
            round: 13,
            difficulty: 'normal',
            firstRoundGuideSeen: {
                ...seenSchemeGuide,
                scheme_phase: false,
            },
            schemeOnboardingSeen,
            omenGuideSeen: { first_omen_modal: false },
        })).toBe('none')
    })
})
