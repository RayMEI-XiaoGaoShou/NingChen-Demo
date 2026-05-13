import { beforeEach, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
// @ts-ignore - Vitest source-contract tests can read local CSS without adding Node types to the app.
import { readFileSync } from 'fs'
import { CourtView } from './CourtView'
import courtViewSource from './CourtView.tsx?raw'
import { useGameStore } from '../../stores/gameStore'
import { useUiStore } from '../../stores/uiStore'

const courtViewCss = readFileSync(new URL('./CourtView.css', import.meta.url), 'utf-8')

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

    it('uses selected art-backed court faction chrome with restored strength details and floating text labels', () => {
        expect(courtViewSource).toContain('court-faction-emblem-${group.id}')
        expect(courtViewSource).toContain('court-strength-popover')
        expect(courtViewSource).toContain('court-strength-row')
        expect(courtViewSource).toContain('内部稳定度')
        expect(courtViewSource).toContain('朝堂影响力')
        expect(courtViewSource).toContain('court-seat-floating-text')
        expect(courtViewSource).toContain('court-seat-name-text')
        expect(courtViewSource).toContain('court-seat-title-text')
        expect(courtViewSource).not.toContain('court-seat-name-plaque')
        expect(courtViewSource).not.toContain('court-seat-office-plaque')
        expect(courtViewSource).not.toContain('court-seat-nobility-plaque')
        expect(courtViewSource).not.toContain('court-seat-title-plaque-stack')
        expect(courtViewSource).toContain("'weichimù': '都督河南诸军事'")
        expect(courtViewSource).toContain("'zongai': '中常侍'")
        expect(courtViewSource).toContain("'yuwendi': '燕王'")
        expect(courtViewSource).toContain("'linghuelvguang': '都督河北诸军事'")
        expect(courtViewSource).toContain("'hebaqí': '太后'")
        expect(courtViewSource).toContain("'zuting': '左丞相'")
    })

    it('uses an art-backed external warlord stage with fullbody portraits and three diamond metrics', () => {
        expect(courtViewSource).toContain("emblemLabel: '虎'")
        expect(courtViewSource).toContain("emblemLabel: '狼'")
        expect(courtViewSource).toContain('EXTERNAL_TITLE_PLAQUES')
        expect(courtViewSource).toContain("'duguwenyue': '后将军【屯驻天水】'")
        expect(courtViewSource).toContain("'hebaboguì': '卫将军【屯驻金城】'")
        expect(courtViewSource).toContain("'erzhulié': '北庭节度使【屯驻雁门】'")
        expect(courtViewSource).toContain("'ansiming': '卢龙节度使【屯驻范阳】'")
        expect(courtViewSource).toContain("npc.powerBase === 'external' ? 'externalFullbody' : 'courtFullbody'")
        expect(courtViewSource).toContain("duguwenyue: 'external-seat-duguwenyue'")
        expect(courtViewSource).toContain("'hebaboguì': 'external-seat-hebabogui'")
        expect(courtViewSource).toContain("'erzhulié': 'external-seat-erzhulie'")
        expect(courtViewSource).toContain("ansiming: 'external-seat-ansiming'")
        expect(courtViewSource).toContain("{ id: 'military', label: '军力', value: npc.militaryPower }")
        expect(courtViewSource).toContain("{ id: 'loyalty', label: '忠诚度', value: npc.loyaltyToCourt }")
        expect(courtViewSource).toContain("{ id: 'trust', label: '信任度', value: npc.trust }")
        expect(courtViewSource).toContain('external-faction-global-metric-track')
        expect(courtViewSource).toContain('external-seat-inline-metrics')
        expect(courtViewCss).toContain('external-background-longxi.png')
        expect(courtViewCss).toContain('external-background-prairie.png')
        expect(courtViewCss).toContain('external-emblem-tiger.png')
        expect(courtViewCss).toContain('external-emblem-wolf.png')
        expect(courtViewCss).toContain('external-bottom-foreground-command-desk-v2.png')
        expect(courtViewCss).toContain('external-metric-icon-military.png')
        expect(courtViewCss).toContain('external-metric-icon-loyalty.png')
        expect(courtViewCss).toContain('external-metric-icon-trust.png')
        expect(courtViewCss).not.toContain('external-bottom-foreground-command-desk.png\') center bottom / 100% 100% no-repeat')
        expect(courtViewCss).toContain('.court-faction-screen-external .court-seat-floating-text')
        expect(courtViewCss).toContain('.court-faction-screen-external .court-seat-advisor-mark')
        expect(courtViewCss).toContain('background-size: cover')
        expect(courtViewCss).toContain('.court-faction-screen-external .external-metric-card')
        expect(courtViewCss).toContain('.court-faction-screen-external .court-seat-reaction')
        expect(courtViewCss).toContain("url('/images/ui/court-faction/court-reaction-paper.png')")
    })

    it('keeps external name and title typography aligned with the court faction stage', () => {
        const externalNameRule = courtViewCss.match(/\.court-faction-screen-external \.court-seat-name-text \{[^}]+\}/)?.[0] ?? ''
        const externalTitleRule = courtViewCss.match(/\.court-faction-screen-external \.court-seat-title-text \{\s+color:[^}]+\}/)?.[0] ?? ''

        expect(externalNameRule).toContain('font-size: 1.5rem;')
        expect(externalTitleRule).toContain('font-size: 1.02rem;')
    })

    it('preloads current-page public statement voices and plays them from portrait hover', () => {
        expect(courtViewSource).toContain('useMediaStore')
        expect(courtViewSource).toContain('getNpcPublicStatementAudioPath')
        expect(courtViewSource).toContain("preload = 'auto'")
        expect(courtViewSource).toContain('playPublicStatementAudio(npc)')
        expect(courtViewSource).toContain('stopPublicStatementAudio')
        expect(courtViewSource).toContain('onMouseEnter={() => playPublicStatementAudio(npc)}')
        expect(courtViewSource).toContain('onMouseLeave={stopPublicStatementAudio}')
        expect(courtViewSource).toContain('catch(() => undefined)')
    })

    it('keeps the court faction HUD quiet, aligned, and set in KaiTi', () => {
        expect(courtViewSource).toContain("backLabel={schemeDrawerNpcId ? '返回案卷' : '上一页'}")
        expect(courtViewSource).toContain('renderHud(`朝堂总览 > ${scopeTitle}`)')
        expect(courtViewSource).not.toContain('返回上一层')
        expect(courtViewSource).not.toContain('返回总览')
        expect(courtViewCss).toContain('font-family: KaiTi, STKaiti, SimKai')
        expect(courtViewCss).toContain('.court-top-bar::before')
        expect(courtViewCss).toContain('content: none')
        expect(courtViewCss).toContain('.court-faction-screen-court .court-top-bar')
        expect(courtViewCss).toContain('left: 38px')
        expect(courtViewCss).toContain('right: 38px')
        expect(courtViewCss).toContain('top: clamp(-76px, -4.4vw, -58px)')
    })

    it('aligns the overview HUD and brightens the overview background to match the round home line art', () => {
        expect(courtViewCss).toContain('.court-overview-screen.court-game-screen')
        expect(courtViewCss).toContain('linear-gradient(180deg, rgba(5, 5, 6, 0.08), rgba(5, 5, 6, 0.36))')
        expect(courtViewCss).toContain('.court-scene-overview .court-art-background')
        expect(courtViewCss).toContain('filter: brightness(1.12) saturate(1.04) contrast(1.02);')
        expect(courtViewCss).toContain('.court-overview-screen .court-art-foreground')
        expect(courtViewCss).toContain('opacity: 0.42;')
        expect(courtViewCss).toContain('.court-overview-screen .court-top-bar,\n.court-faction-screen-court .court-top-bar')
    })

    it('uses full-page faction screens and an art-backed reaction paper', () => {
        expect(courtViewCss).not.toContain('court-page-dark-hall-background.png')
        expect(courtViewCss).toContain('emperor-stage-plate.png')
        expect(courtViewCss).toContain('empress-stage-plate.png')
        expect(courtViewCss).toContain('background-size: 52% 104%, 50% 100%')
        expect(courtViewCss).toContain('background-position: -2% center, right center')
        expect(courtViewCss).toContain('court-reaction-paper.png')
        expect(courtViewCss).not.toContain("content: '公开表态'")
        expect(courtViewCss).not.toContain("content: '新'")
        expect(courtViewCss).toContain('width: min(220px, 19vw)')
        expect(courtViewCss).toContain('.court-faction-screen-court .court-faction-scroll h3')
        expect(courtViewCss).toContain('.court-strength-label')
        expect(courtViewCss).toContain('font-family: KaiTi, STKaiti, SimKai, var(--font-heading), serif')
    })

    it('uses a wide transparent foreground desk without forcing it into the viewport ratio', () => {
        expect(courtViewCss).toContain('.court-faction-screen-court .court-faction-bottom-foreground')
        expect(courtViewCss).toContain('court-bottom-foreground-desk-layer-v2.png')
        expect(courtViewCss).toContain('background-size: cover')
        expect(courtViewCss).toContain('background-position: center bottom')
        expect(courtViewCss).not.toContain('court-bottom-foreground-desk-layer.png\') center bottom / 100% 100% no-repeat')
        expect(courtViewCss).toContain('.court-faction-screen-court .court-faction-global-intel-track')
    })

    it('keeps screen shading on the full faction background instead of the inner scroll panels', () => {
        expect(courtViewCss).toContain('.court-faction-screen-court .court-art-background::before')
        expect(courtViewCss).toContain('.court-faction-screen-court .court-art-background::after')
        expect(courtViewCss).toContain('background-size: 50% 100%, 50% 100%, 50% 100%, 50% 100%')
        expect(courtViewCss).toContain('background-position: left top, left top, right top, right top')
        expect(courtViewCss).toContain('.court-faction-screen-court .court-faction-scroll::before,')
        expect(courtViewCss).toContain('.court-faction-screen-court .court-faction-scroll::after {\n    content: none;')
        expect(courtViewCss).toContain('box-shadow: none;')
        expect(courtViewCss).not.toContain('.court-faction-screen-court .court-faction-scroll::before {\n    z-index: 1;')
        expect(courtViewCss).not.toContain('.court-faction-screen-court .court-faction-scroll::after {\n    z-index: 2;')
    })

    it('shows the Feng Daozhi pouch hint when hovering the flashing pouch', () => {
        expect(courtViewSource).toContain('aria-label="冯道之锦囊提及"')
        expect(courtViewSource).toContain('title="冯道之锦囊提及"')
        expect(courtViewSource).not.toContain('court-seat-advisor-tooltip')
        expect(courtViewSource).not.toContain('role="tooltip">冯道之锦囊提及')
        expect(courtViewCss).not.toContain('court-seat-advisor-tooltip')
        expect(courtViewCss).toContain('cursor: help')
        expect(courtViewCss).toContain('.court-faction-screen-court .court-faction-scroll-head {\n    pointer-events: none;')
        expect(courtViewCss).toContain('.court-faction-screen-court .court-faction-scroll-head .court-faction-strength {\n    pointer-events: auto;')
    })

    it('preserves the legacy court view as an exported fallback during the UX rollout', () => {
        expect(courtViewSource).toContain('export function LegacyCourtView()')
        expect(courtViewSource).toContain('faction-block faction-${group.id} external-block')
        expect(courtViewSource).toContain('getExternalTerminalLabel(npc.externalStatus)')
    })
})
