import { beforeEach, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { EXTERNAL_LINE_TEACHING_CONTENT, FIRST_OMEN_TEACHING_CONTENT } from '../../data/prologueContent'
import { OmenTeachingModal } from './OmenTeachingModal'
import { SchemePanel } from './SchemePanel'
import { useGameStore } from '../../stores/gameStore'
import { SchemeOnboardingModal } from './SchemeOnboardingModal'

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

    it('renders top-right buttons for reopening the scheme guide and gameplay guide', () => {
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
        expect(markup).toContain('玩法说明')
    })

    it('uses the renamed external-line teaching content', () => {
        const markup = renderToStaticMarkup(
            <SchemeOnboardingModal
                open
                title={EXTERNAL_LINE_TEACHING_CONTENT.title}
                pages={EXTERNAL_LINE_TEACHING_CONTENT.pages}
                onClose={() => undefined}
            />,
        )

        expect(markup).toContain('地方军头计谋玩法')
        expect(EXTERNAL_LINE_TEACHING_CONTENT.pages[0]?.bullets).toEqual(
            expect.arrayContaining([
                expect.stringContaining('养信'),
            ]),
        )
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
        expect(FIRST_OMEN_TEACHING_CONTENT.steps).toEqual(
            expect.arrayContaining([
                expect.stringContaining('先写'),
                expect.stringContaining('解释'),
                expect.stringContaining('暗示'),
            ]),
        )
        expect(FIRST_OMEN_TEACHING_CONTENT.impactNotes).toEqual(
            expect.arrayContaining([
                expect.stringContaining('北周治理'),
                expect.stringContaining('稳局'),
            ]),
        )
    })
})
