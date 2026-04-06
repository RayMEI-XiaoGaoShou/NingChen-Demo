import { beforeEach, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { FIRST_OMEN_TEACHING_CONTENT } from '../../data/prologueContent'
import { OmenTeachingModal } from './OmenTeachingModal'
import { SchemePanel } from './SchemePanel'
import { useGameStore } from '../../stores/gameStore'

describe('SchemePanel onboarding flows', () => {
    beforeEach(() => {
        useGameStore.getState().resetGame()
    })

    it('shows the scheme master guide on first entry to the scheme phase', () => {
        useGameStore.setState({
            currentPhase: 'SCHEME_PHASE',
            currentRound: 1,
        })

        const markup = renderToStaticMarkup(<SchemePanel />)

        expect(markup).toContain('施计总引导')
        expect(markup).toContain('献策')
        expect(markup).toContain('设局嫁祸')
    })

    it('renders a top-right button for reopening the scheme guide', () => {
        useGameStore.setState({
            currentPhase: 'SCHEME_PHASE',
            currentRound: 2,
            schemeOnboardingSeen: {
                scheme_master_guide: true,
                first_omen_teaching: false,
                first_external_line_teaching: false,
            },
            firstRoundGuideSeen: {
                round_start: true,
                court_observe: true,
                scheme_phase: true,
                empress_letter: false,
                scheme_feedback: false,
                settlement: false,
            },
        })

        const markup = renderToStaticMarkup(<SchemePanel />)

        expect(markup).toContain('计谋指南')
    })

    it('renders the detailed omen teaching modal copy', () => {
        const markup = renderToStaticMarkup(
            <OmenTeachingModal
                open
                content={FIRST_OMEN_TEACHING_CONTENT}
                onClose={() => undefined}
            />,
        )

        expect(markup).toContain('谶（chen）纬')
        expect(markup).toContain('先写一段谶辞或征兆')
    })
})
