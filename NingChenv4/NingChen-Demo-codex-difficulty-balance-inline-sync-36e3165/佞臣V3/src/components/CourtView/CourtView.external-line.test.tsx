import { beforeEach, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CourtView } from './CourtView'
import courtViewSource from './CourtView.tsx?raw'
import { useGameStore } from '../../stores/gameStore'
import { useUiStore } from '../../stores/uiStore'

function renderCourtViewMarkup() {
    return renderToStaticMarkup(<CourtView />)
}

describe('CourtView layered game-screen flow', () => {
    beforeEach(() => {
        useGameStore.getState().resetGame()
        useUiStore.setState({
            showNpcDetail: false,
            detailNpcId: null,
        })
    })

    it('renders a low-chrome court overview instead of the old full roster page', () => {
        useGameStore.setState({
            currentRound: 7,
            currentPhase: 'COURT_OBSERVE',
        })

        const markup = renderCourtViewMarkup()

        expect(markup).toContain('court-view-game')
        expect(markup).toContain('court-overview-screen')
        expect(markup).toContain('朝堂势力')
        expect(markup).toContain('地方军头')
        expect(markup).toContain('court-top-bar')
        expect(markup).toContain('court-gate-visual')
        expect(markup).toContain('court-gate-art-mask')
        expect(markup).toContain('court-gate-atmosphere')
        expect(markup).toContain('court-gate-frame')
        expect(markup).toContain('court-gate-frame-glow')
        expect(markup).toContain('总为浮云能蔽日，邺都不见使人愁')
        expect(markup).toContain('八百里分麾下炙，五十弦翻塞外声')
        expect(markup).not.toContain('军师密奏')
        expect(markup).not.toContain('插画占位')
        expect(markup).not.toContain('court-gate-banner')
        expect(markup).not.toContain('帝党与后党争论南征')
        expect(markup).not.toContain('陇右与草原各怀异心')
        expect(markup).not.toContain('可动人物')
        expect(markup).not.toContain('暗线可推')
        expect(markup).not.toContain('court-bottom-line')
        expect(markup).not.toContain('court-main-grid')
        expect(markup).not.toContain('npc-card-portrait')
    })

    it('keeps global risk state visible in the light HUD', () => {
        useGameStore.setState({
            currentRound: 7,
            currentPhase: 'COURT_OBSERVE',
        })

        const markup = renderCourtViewMarkup()

        expect(markup).toContain('国力')
        expect(markup).toContain('南征')
        expect(markup).toContain('安危')
        expect(markup).toContain('计谋')
        expect(markup).toContain('game-hud-status-chip')
        expect(markup).toContain('title="南征风向，是北周朝堂在“挥师南下”与“先安内政”之间的天平。')
        expect(markup).toContain('title="自身安危，是你在北周朝堂上的处境有多危险。')
    })

    it('defines a progressive path from overview to factions to dossier to scheme entry', () => {
        expect(courtViewSource).toContain("type CourtScope = 'overview' | 'court' | 'external'")
        expect(courtViewSource).toContain('court-gate-grid')
        expect(courtViewSource).toContain('court-scroll-grid')
        expect(courtViewSource).toContain('court-dossier')
        expect(courtViewSource).toContain('SchemeComposer')
        expect(courtViewSource).toContain('setSchemeDrawerNpcId(npc.id)')
        expect(courtViewSource).not.toContain('prepareSchemeFromNpc(npc.id)')
        expect(courtViewSource).toContain('对其施计')
    })

    it('keeps court and external explainability available inside the dossier layer', () => {
        expect(courtViewSource).toContain('getFavorPressureLabel')
        expect(courtViewSource).toContain('buildCourtDispositionHint')
        expect(courtViewSource).toContain('getExternalMilitaryPostureLabel')
        expect(courtViewSource).toContain('buildExternalWhisper')
        expect(courtViewSource).toContain('getNpcRoundReaction')
    })

    it('preserves the legacy court view as an exported fallback during the UX rollout', () => {
        expect(courtViewSource).toContain('export function LegacyCourtView()')
        expect(courtViewSource).toContain('faction-block faction-${group.id} external-block')
        expect(courtViewSource).toContain('getExternalTerminalLabel(npc.externalStatus)')
    })
})
