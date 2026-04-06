import { beforeEach, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CourtView } from './CourtView'
import { useGameStore } from '../../stores/gameStore'
import { useUiStore } from '../../stores/uiStore'
import { INITIAL_NPCS } from '../../data/npcs'
import { INITIAL_FACTIONS } from '../../data/factions'

describe('CourtView external line onboarding', () => {
    beforeEach(() => {
        useGameStore.getState().resetGame()
        useUiStore.setState({
            showNpcDetail: false,
            detailNpcId: null,
        })
    })

    it('shows the first external-line teaching modal when an external target is near track', () => {
        useGameStore.setState({
            currentRound: 7,
            currentPhase: 'COURT_OBSERVE',
            difficulty: 'normal',
            firstRoundGuideSeen: {
                round_start: true,
                court_observe: true,
                scheme_phase: true,
                empress_letter: false,
                scheme_feedback: false,
                settlement: false,
            },
            schemeOnboardingSeen: {
                scheme_master_guide: true,
                first_omen_teaching: true,
                first_external_line_teaching: false,
            },
            npcs: INITIAL_NPCS.map(npc =>
                npc.id === 'hebabogui'
                    ? { ...npc, trust: 67, loyaltyToCourt: 34, externalStatus: 'watchful' }
                    : { ...npc },
            ),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: {
                ...Object.fromEntries(INITIAL_NPCS.map(npc => [npc.id, 0])),
                hebabogui: 1,
            },
        })

        const markup = renderToStaticMarkup(<CourtView />)

        expect(markup).toContain('外部势力线初解')
        expect(markup).toContain('这不是一回合见效的快刀')
    })

    it('renders stage and next-move cues on external cards', () => {
        useGameStore.setState({
            currentRound: 7,
            currentPhase: 'COURT_OBSERVE',
            difficulty: 'normal',
            firstRoundGuideSeen: {
                round_start: true,
                court_observe: true,
                scheme_phase: true,
                empress_letter: false,
                scheme_feedback: false,
                settlement: false,
            },
            schemeOnboardingSeen: {
                scheme_master_guide: true,
                first_omen_teaching: true,
                first_external_line_teaching: true,
            },
            npcs: INITIAL_NPCS.map(npc =>
                npc.id === 'hebabogui'
                    ? { ...npc, trust: 67, loyaltyToCourt: 34, externalStatus: 'watchful' }
                    : { ...npc },
            ),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: {
                ...Object.fromEntries(INITIAL_NPCS.map(npc => [npc.id, 0])),
                hebabogui: 1,
            },
        })

        const markup = renderToStaticMarkup(<CourtView />)

        expect(markup).toContain('探暗线')
        expect(markup).toContain('先试探')
    })
})
