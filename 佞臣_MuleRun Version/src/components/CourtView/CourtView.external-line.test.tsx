import { beforeEach, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CourtView } from './CourtView'
import { useGameStore } from '../../stores/gameStore'
import { useUiStore } from '../../stores/uiStore'
import { INITIAL_NPCS } from '../../data/npcs'
import { INITIAL_FACTIONS } from '../../data/factions'

describe('CourtView external line grouping', () => {
    beforeEach(() => {
        useGameStore.getState().resetGame()
        useUiStore.setState({
            showNpcDetail: false,
            detailNpcId: null,
        })
    })

    it('renders grouped court and external doctrine cards', () => {
        useGameStore.setState({
            currentRound: 7,
            currentPhase: 'COURT_OBSERVE',
        })

        const markup = renderToStaticMarkup(<CourtView />)

        expect(markup).toContain('帝党：力主南征')
        expect(markup).toContain('后党：优先安内')
        expect(markup).toContain('地方军头')
        expect(markup).toContain('贺拔伯圭')
        expect(markup).toContain('尔朱烈')
    })

    it('renders concrete next-step cues on external cards', () => {
        useGameStore.setState({
            currentRound: 7,
            currentPhase: 'COURT_OBSERVE',
            difficulty: 'normal',
            npcs: INITIAL_NPCS.map(npc =>
                npc.id === 'hebaboguì'
                    ? { ...npc, trust: 75, loyaltyToCourt: 34, externalStatus: 'watchful' }
                    : { ...npc },
            ),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: {
                ...Object.fromEntries(INITIAL_NPCS.map(npc => [npc.id, 0])),
                'hebaboguì': 1,
            },
        })

        const markup = renderToStaticMarkup(<CourtView />)

        expect(markup).toContain('先试探')
        expect(markup).toContain('还差 22 点信任，才能煽动割据；暗线已明 0/2。')
    })
})
