import { beforeEach, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
// @ts-ignore - Vitest source-contract tests can read local CSS without adding Node types to the app.
import { readFileSync } from 'fs'
import { CourtView } from './CourtView'
import courtViewSource from './CourtView.tsx?raw'
import { useGameStore } from '../../stores/gameStore'
import { useUiStore } from '../../stores/uiStore'

const courtViewCss = readFileSync(new URL('./CourtView.css', import.meta.url), 'utf-8').replace(/\r\n/g, '\n')
const artBackedDetailSource = courtViewSource.slice(
    courtViewSource.indexOf('const renderArtBackedNpcDetail'),
    courtViewSource.indexOf('const renderNpcDetail'),
)

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

        expect(markup).toContain('game-viewport court-game-viewport')
        expect(markup).toContain('game-viewport__bleed')
        expect(markup).toContain('game-design-canvas court-design-canvas')
        expect(markup).toContain('court-view-game')
        expect(markup).toContain('court-overview-screen')
        expect(markup).toContain('朝堂势力')
        expect(markup).toContain('地方军头')
        expect(markup).toContain('court-top-bar')
        expect(markup).toContain('court-gate-visual')
        expect(markup).toContain('court-gate-art-mask')
        expect(markup).toContain('court-gate-frame')
        expect(markup).not.toContain('court-gate-frame-glow')
        expect(markup).not.toContain('court-gate-atmosphere')
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

    it('labels the overview HUD with the Chinese volume instead of the old numeric round', () => {
        useGameStore.setState({
            currentRound: 7,
            currentPhase: 'COURT_OBSERVE',
        })

        const markup = renderCourtViewMarkup()

        expect(markup).toContain('第一卷')
        expect(markup).not.toContain('第 <span class="ui-number">7</span> 回合')
        expect(markup).not.toContain('第 <span class="ui-number">1</span> 回合')
        expect(courtViewSource).toContain('formatRoundVolumeLabel(currentRound)')
        expect(courtViewSource).not.toContain('renderHud(`第 ${currentRound} 回合`)')
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
        expect(courtViewSource).toContain('court-character-detail-screen')
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

    it('uses compact slash-separated scheme quotas throughout court and scheme entry surfaces', () => {
        expect(renderToStaticMarkup(<CourtView />)).toContain('<span class="ui-number">3/3</span>')
        expect(renderToStaticMarkup(<CourtView />)).not.toContain('<span class="ui-number">3</span>/<span class="ui-number">3</span>')
        expect(courtViewSource).not.toContain('</span> / {maxSchemes}')
        expect(courtViewSource).not.toContain('} / {maxSchemes}')
    })

    it('labels court intel slots as known information with the two-slot frontend budget', () => {
        expect(courtViewSource).toContain('getKnownIntelBudget')
        expect(courtViewSource).toContain('已知情报 ${getKnownIntelBudget(knownIntel)}/2')
        expect(courtViewSource).not.toContain('暗线 ${knownIntel}/${npc.secretThreads.length}')
        expect(courtViewSource).not.toContain('暗线已明：{knownIntel}/{npc.secretThreads.length}')
    })

    it('routes all interactive NPCs through a generic art-backed detail layout', () => {
        expect(courtViewSource).toContain('renderArtBackedNpcDetail')
        expect(courtViewSource).toContain('getNpcDetailBackgroundPath(npc.id)')
        expect(courtViewSource).toContain('getNpcDetailPortraitPath(npc.id, npc.trust)')
        expect(courtViewSource).toContain('court-character-detail-screen')
        expect(courtViewSource).toContain('court-character-scene-art')
        expect(courtViewSource).toContain('court-character-portrait')
        expect(courtViewSource).toContain('COURT_FACTION_UI_ASSETS.imperialJadeSealBadge')
        expect(courtViewSource).toContain('COURT_FACTION_UI_ASSETS.phoenixCrownBadge')
        expect(courtViewSource).toContain('COURT_FACTION_UI_ASSETS.emperorPartyEmblem')
        expect(courtViewSource).toContain('COURT_FACTION_UI_ASSETS.empressPartyEmblem')
        expect(courtViewSource).toContain('EXTERNAL_FACTION_UI_ASSETS.tigerEmblem')
        expect(courtViewSource).toContain('EXTERNAL_FACTION_UI_ASSETS.wolfEmblem')
        expect(artBackedDetailSource).toContain('getFengDaozhiAdvisorNote(npc.id)')
        expect(artBackedDetailSource).toContain('court-hebaqi-glass-filter')
        expect(artBackedDetailSource).toContain('court-hebaqi-glass-warp')
        expect(artBackedDetailSource).toContain('court-hebaqi-glass-edge')
        expect(artBackedDetailSource).toContain('court-hebaqi-glass-specular')
        expect(artBackedDetailSource).toContain('handleHebaQiGlassPointerMove')
        expect(courtViewSource).toContain('court-hebaqi-intel-count')
        expect(courtViewSource).toContain('{knownThreads.length}/2')
        expect(courtViewSource).toContain('court-hebaqi-scheme-button')
        expect(courtViewSource).toContain('enterSchemeWithNpc(npc)')
        expect(courtViewSource).not.toContain('return renderHebaQiDetail')
    })

    it('returns embedded scheme submissions to the owner faction and lets the composer transition into empress letter', () => {
        expect(courtViewSource).toContain('handleEmbeddedSchemeAfterSubmit')
        expect(courtViewSource).toContain('schemeCountAfterSubmit >= maxSchemes')
        expect(courtViewSource).not.toContain('completeSchemingIfReady()')
        expect(courtViewSource).toContain("setScope(result.targetPowerBase === 'external' ? 'external' : 'court')")
        expect(courtViewSource).toContain('setSelectedNpcId(null)')
        expect(courtViewSource).toContain('onAfterSubmit={handleEmbeddedSchemeAfterSubmit}')
    })

    it('keeps the art-backed detail panel on the original Liquid Glass treatment without the smoke-paper experiment', () => {
        expect(courtViewSource).not.toContain('court-smoke-paper-glass-experiment')
        expect(courtViewSource).not.toContain('getCourtSmokeGlassExperimentClassName')
        expect(artBackedDetailSource).not.toContain('smokeGlassExperimentClassName')
        expect(courtViewCss).not.toContain('.court-smoke-paper-glass-experiment')
        expect(courtViewCss).toContain('backdrop-filter: blur(36px) saturate(1.72) brightness(1.12) contrast(1.05);')
        expect(courtViewCss).toContain('backdrop-filter: blur(38px) saturate(1.86) brightness(1.13) contrast(1.08);')
    })

    it('keeps the generic relation strips informational instead of navigational', () => {
        expect(artBackedDetailSource).not.toContain('完整档案')
        expect(artBackedDetailSource).not.toContain('返回势力')
        expect(artBackedDetailSource).not.toContain('返回地方')
        expect(artBackedDetailSource).not.toContain('本回合公开表态')
        expect(artBackedDetailSource).toContain('<h4>公开表态</h4>')
        expect(artBackedDetailSource).not.toContain('npc.publicPersona')
        expect(artBackedDetailSource).not.toContain('npc.publicStance')
        expect(artBackedDetailSource).not.toContain('openNpcDetail(npc.id)')
        expect(artBackedDetailSource).not.toContain('onClick={() => setSelectedNpcId(member.id)}')
        expect(artBackedDetailSource).not.toContain('renderPips(npc.trust)')
        expect(courtViewSource).toContain('renderCourtLeaderRelationStrip')
        expect(courtViewSource).toContain('renderCourtMetricRelationStrip')
        expect(courtViewSource).toContain('renderExternalMetricRelationStrip')
        expect(courtViewSource).toContain('court-hebaqi-peer-tip')
        expect(courtViewSource).toContain('court-hebaqi-trust-value')
        expect(courtViewSource).toContain('{npc.trust}')
    })

    it('keeps faction badges as a single floating panel emblem instead of a fourth metric', () => {
        expect(courtViewSource).not.toContain('renderDetailPartyNode')
        expect(courtViewSource).not.toContain('court-character-party-node')
        expect(courtViewSource).not.toContain('court-character-party-badge')
        expect(artBackedDetailSource).toContain('court-character-party-emblem court-hebaqi-party-emblem')
        expect(courtViewCss).not.toContain('.court-character-party-node')
        expect(courtViewCss).not.toContain('.court-character-party-badge')
    })

    it('uses dedicated WebP round avatars in leader relation strips', () => {
        const leaderStripSource = courtViewSource.slice(
            courtViewSource.indexOf('const renderCourtLeaderRelationStrip'),
            courtViewSource.indexOf('const renderCourtMetricRelationStrip'),
        )

        expect(courtViewSource).toContain('getNpcDetailAvatarPath')
        expect(leaderStripSource).toContain('getNpcDetailAvatarPath(member.id)')
        expect(leaderStripSource).toContain('court-hebaqi-peer-portrait')
        expect(leaderStripSource).not.toContain('<NpcPortrait')
    })

    it('keeps leader peer portraits clipped inside compact left-grouped frames', () => {
        expect(courtViewCss).toContain('grid-template-columns: repeat(4, 72px);')
        expect(courtViewCss).toContain('justify-content: start;')
        expect(courtViewCss).toContain('transform: translateX(clamp(-32px, -2.4vw, -16px));')
        expect(courtViewCss).toContain('left: 50%;')
        expect(courtViewCss).toContain('transform: translateX(-50%);')
        expect(courtViewCss).toContain('overflow: hidden;')
        expect(courtViewCss).toContain('display: block;')
    })

    it('adds leader role badges to the art-backed title kicker', () => {
        expect(artBackedDetailSource).toContain('displayedTitleWithRole')
        expect(artBackedDetailSource).toContain('【代言皇帝】')
        expect(artBackedDetailSource).toContain('【后党魁首】')
    })

    it('keeps the art-backed dossier title header visible while composing schemes', () => {
        const composerHeaderRule = courtViewCss.match(/\.court-hebaqi-panel-composer \.court-hebaqi-panel-head \{[^}]+\}/)?.[0] ?? ''

        expect(composerHeaderRule).not.toContain('display: none;')
        expect(composerHeaderRule).toContain('display: flex;')
        expect(courtViewCss).toContain('.court-hebaqi-panel-composer .court-hebaqi-composer-shell::before')
    })

    it('uses Arial-scoped number spans for detail metrics and intel counts', () => {
        expect(courtViewSource).toContain('court-character-number')
        expect(courtViewSource).toContain('court-hebaqi-intel-count court-character-number')
        expect(courtViewSource).toContain('court-hebaqi-trust-value court-character-number')
        expect(courtViewSource).toContain('valueClassName="court-character-number"')
        expect(courtViewCss).toContain('.court-character-detail-screen .court-character-number')
        expect(courtViewCss).toContain('font-family: Arial, Helvetica, sans-serif;')
    })

    it('styles the art-backed detail screen as a full-scene translucent dossier surface', () => {
        expect(courtViewCss).toContain('.court-character-detail-screen')
        expect(courtViewCss).toContain('.court-character-scene-art')
        expect(courtViewCss).toContain('background-image: var(--npc-detail-background)')
        expect(courtViewCss).toContain('.court-character-portrait')
        expect(courtViewCss).toContain('.court-character-panel')
        expect(courtViewCss).toContain('.court-hebaqi-detail-screen')
        expect(courtViewCss).toContain('backdrop-filter')
        expect(courtViewCss).toContain('.court-hebaqi-relation-strip')
        expect(courtViewCss).toContain('.court-hebaqi-intel-count')
        expect(courtViewCss).toContain('.court-hebaqi-panel::before')
        expect(courtViewCss).toContain('.court-hebaqi-panel::after')
        expect(courtViewCss).toContain('.court-hebaqi-party-emblem')
        expect(courtViewCss).toContain('filter: url(#court-hebaqi-panel-liquid-filter)')
        expect(courtViewCss).toContain('filter: url(#court-hebaqi-panel-edge-filter)')
        expect(courtViewCss).toContain('.court-hebaqi-peer-tip')
        expect(courtViewCss).toContain('.court-hebaqi-trust-value')
        expect(courtViewCss).toContain('.court-hebaqi-scheme-button')
        expect(courtViewCss).not.toContain('.court-hebaqi-detail-screen .court-top-bar')
        expect(courtViewCss).toContain('@media (max-width: 820px)')
    })

    it('treats the generic panel as borderless liquid glass with green and red favor halos', () => {
        const characterDetailScreenRule = courtViewCss.match(/\.court-character-detail-screen \{[^}]+\}/)?.[0] ?? ''
        const hebaQiPanelRule = courtViewCss.match(/\.court-hebaqi-panel \{[^}]+\}/)?.[0] ?? ''
        const hebaQiContentLayerRule = courtViewCss.match(/\.court-hebaqi-panel > :not\([^{]+\{[^}]+\}/)?.[0] ?? ''
        const hebaQiPartyEmblemRule = courtViewCss.match(/\.court-hebaqi-party-emblem \{[^}]+\}/)?.[0] ?? ''

        expect(characterDetailScreenRule).toContain('--font-heading: var(--font-calligraphy)')
        expect(hebaQiPanelRule).toContain('border: 0;')
        expect(hebaQiPanelRule).toContain('right: var(--court-safe-x);')
        expect(hebaQiPanelRule).toContain('backdrop-filter: blur(36px)')
        expect(hebaQiPanelRule).toContain('overflow: hidden')
        expect(hebaQiPanelRule).toContain('overflow-x: hidden')
        expect(hebaQiContentLayerRule).toContain(':not(.court-hebaqi-party-emblem)')
        expect(hebaQiContentLayerRule).toContain('z-index: 2;')
        expect(hebaQiPartyEmblemRule).toContain('position: absolute;')
        expect(hebaQiPartyEmblemRule).toContain('z-index: 4;')
        expect(hebaQiPartyEmblemRule).toContain('width: clamp(74px, 6vw, 112px);')
        expect(hebaQiPartyEmblemRule).toContain('aspect-ratio: 0.93;')
        expect(hebaQiPartyEmblemRule).toContain('pointer-events: none;')
        expect(hebaQiPartyEmblemRule).toContain('mix-blend-mode: normal;')
        expect(courtViewCss).toContain('.court-hebaqi-relation-strip::before')
        expect(courtViewCss).toContain('right: clamp(124px, 10vw, 168px);')
        expect(courtViewCss).toContain('.court-character-relation-strip-metrics')
        expect(courtViewCss).toContain('grid-template-columns: repeat(3, minmax(132px, 1fr));')
        expect(courtViewSource).toContain("if (value >= 70) return 'is-favored'")
        expect(courtViewSource).toContain("if (value >= 50) return 'is-neutral'")
        expect(courtViewCss).toContain('.court-hebaqi-peer.is-favored::before')
        expect(courtViewCss).toContain('rgba(110, 232, 154')
        expect(courtViewCss).toContain('.court-hebaqi-peer.is-neutral::before')
        expect(courtViewCss).toContain('.court-hebaqi-peer.is-distant::before')
        expect(courtViewCss).toContain('rgba(235, 82, 72')
        expect(courtViewCss).toContain('.court-faction-screen-external .court-seat.is-used')
        expect(courtViewCss).toContain('box-shadow: none;')
    })

    it('adds a dedicated liquid-glass warp stack with pointer-driven highlights', () => {
        expect(artBackedDetailSource).toContain('onPointerMove={handleHebaQiGlassPointerMove}')
        expect(artBackedDetailSource).toContain('onPointerLeave={handleHebaQiGlassPointerLeave}')
        expect(courtViewSource).toContain("'--hebaqi-glass-x'")
        expect(courtViewSource).toContain("'--hebaqi-glass-y'")
        expect(courtViewCss).toContain('.court-hebaqi-glass-warp')
        expect(courtViewCss).toContain('.court-hebaqi-glass-edge')
        expect(courtViewCss).toContain('.court-hebaqi-glass-specular')
        expect(courtViewCss).toContain('mask-image')
        expect(courtViewCss).toContain('mix-blend-mode: color-dodge')
        expect(artBackedDetailSource).toContain('rgbRed')
        expect(artBackedDetailSource).toContain('rgbBlue')
        expect(courtViewCss).toContain('var(--hebaqi-glass-x)')
        expect(courtViewCss).toContain('var(--hebaqi-glass-y)')
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

    it('centers the court faction strength label within the jade art button instead of letting it sit low', () => {
        const sharedStrengthTextRule = courtViewCss.match(/\.court-strength-label,[\s\S]*?\.court-faction-strength strong \{[\s\S]*?\n\}/)?.[0] ?? ''
        const strengthLabelRule = courtViewCss.match(/\.court-strength-label \{[\s\S]*?\n\}/)?.[0] ?? ''
        const strengthValueRule = courtViewCss
            .match(/\.court-faction-strength strong \{[\s\S]*?\n\}/g)
            ?.find((rule: string) => rule.includes('font-family: var(--font-heading)')) ?? ''

        expect(sharedStrengthTextRule).not.toContain('transform: translateY(1px);')
        expect(strengthLabelRule).toContain('transform: translateY(-3px);')
        expect(strengthValueRule).toContain('transform: translateY(-3px);')
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
        expect(courtViewCss).toContain('external-background-longxi.webp')
        expect(courtViewCss).toContain('external-background-prairie.webp')
        expect(courtViewCss).toContain('external-emblem-tiger.webp')
        expect(courtViewCss).toContain('external-emblem-wolf.webp')
        expect(courtViewCss).toContain('external-bottom-foreground-command-desk-v2.webp')
        expect(courtViewCss).toContain('external-metric-icon-military.webp')
        expect(courtViewCss).toContain('external-metric-icon-loyalty.webp')
        expect(courtViewCss).toContain('external-metric-icon-trust.webp')
        expect(courtViewCss).not.toContain('external-bottom-foreground-command-desk.webp\') center bottom / 100% 100% no-repeat')
        expect(courtViewCss).toContain('.court-faction-screen-external .court-seat-floating-text')
        expect(courtViewCss).toContain('.court-faction-screen-external .court-seat-advisor-mark')
        expect(courtViewCss).toContain('background-size: cover')
        expect(courtViewCss).toContain('.court-faction-screen-external .external-metric-card')
        expect(courtViewCss).toContain('.court-faction-screen-external .court-seat-reaction')
        expect(courtViewCss).toContain("url('/images/ui/court-faction/court-reaction-paper.webp')")
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
        expect(courtViewSource).toContain('catch(() => finalizePublicStatementAudio(audio))')
    })

    it('ducks BGM while public statement and detail-entry voices are active', () => {
        expect(courtViewSource).toContain('beginVoiceDucking')
        expect(courtViewSource).toContain('endVoiceDucking')
        expect(courtViewSource).toContain('publicStatementDuckingActiveRef')
        expect(courtViewSource).toContain('detailVoiceDuckingActiveRef')
        expect(courtViewSource).toContain('beginPublicStatementDucking()')
        expect(courtViewSource).toContain('endPublicStatementDucking()')
        expect(courtViewSource).toContain('beginDetailVoiceDucking()')
        expect(courtViewSource).toContain('endDetailVoiceDucking()')
        expect(courtViewSource).toContain('if (activeStatementAudioRef.current !== audio) return')
        expect(courtViewSource).toContain('if (detailVoiceAudioRef.current !== audio) return')
        expect(courtViewSource).toContain('audio.volume = 0.95')
        expect(courtViewSource).toContain('audio.volume = 1')
        expect(courtViewSource).toContain('audio.onended')
        expect(courtViewSource).toContain('audio.onpause')
    })

    it('keeps the court faction HUD quiet, aligned, and set in the shared calligraphy font', () => {
        const hudStateRule = courtViewCss.match(/\.court-screen-hud-state \{[^}]+\}/)?.[0] ?? ''
        const breadcrumbActionRule = courtViewCss.match(/\.court-hud-breadcrumb-action \{[^}]+\}/)?.[0] ?? ''
        const hudTitleRule = courtViewCss.match(/\.court-screen-hud-title,[\s\S]*?\.court-hud-link \{[^}]+\}/)?.[0] ?? ''

        expect(courtViewSource).toContain('backLabel="上一页"')
        expect(courtViewSource).not.toContain('backLabel={schemeDrawerNpcId ?')
        expect(courtViewSource).toContain('if (schemeDrawerNpcId) {')
        expect(courtViewSource).toContain('setSchemeDrawerNpcId(null)')
        expect(courtViewSource).toContain('breadcrumbActionLabel?: string')
        expect(courtViewSource).toContain('court-hud-breadcrumb-action')
        expect(courtViewSource).toContain('previewScheme?: CourtPreviewScheme')
        expect(courtViewSource).toContain('initialSchemeType={previewScheme?.targetNpcId === npc.id ? previewScheme.schemeType : undefined}')
        expect(renderToStaticMarkup(<CourtView />)).toContain('第一卷')
        expect(renderToStaticMarkup(<CourtView />)).toContain('class="ui-number">3/3</span>')
        expect(courtViewSource).toContain('isComposing ? \'更换目标\' : undefined')
        expect(courtViewSource).toContain('renderHud(`朝堂总览 > ${scopeTitle}`)')
        expect(courtViewSource).not.toContain('返回上一层')
        expect(courtViewSource).not.toContain('返回总览')
        expect(courtViewCss).toContain('font-family: var(--font-calligraphy)')
        expect(hudTitleRule).toContain('font-family: var(--font-calligraphy)')
        expect(courtViewCss).toContain('.court-top-bar .ui-number')
        expect(courtViewCss).toContain('font-family: Arial, Helvetica, sans-serif;')
        expect(breadcrumbActionRule).toContain('color: var(--color-accent-gold);')
        expect(hudStateRule).toContain('position: absolute;')
        expect(hudStateRule).toContain('left: 50%;')
        expect(hudStateRule).toContain('transform: translate(-50%, -50%);')
        expect(hudStateRule).toContain('width: max-content;')
        expect(courtViewCss).toContain('.court-top-bar::before')
        expect(courtViewCss).toContain('content: none')
        expect(courtViewCss).toContain('.court-faction-screen-court .court-top-bar')
        expect(courtViewCss).toContain('left: 38px')
        expect(courtViewCss).toContain('right: 38px')
        expect(courtViewCss).toContain('top: clamp(-76px, -4.4vw, -58px)')
    })

    it('plays detail-entry attitude voices only from user detail-entry clicks', () => {
        expect(courtViewSource).toContain('getNpcDetailVoicePath')
        expect(courtViewSource).toContain('detailVoiceAudioRef')
        expect(courtViewSource).toContain('playNpcDetailVoice(npc)')
        expect(courtViewSource).toContain('selectNpcDetail(npc)')
        expect(courtViewSource).toContain('selectNpcDetail(npc, { openOverlayDetail: true })')
        expect(courtViewSource).toContain('if (isMuted) return')
        expect(courtViewSource).toContain('stopPublicStatementAudio()')
        expect(courtViewSource).not.toContain('playNpcDetailVoice(previewNpc)')
    })

    it('raises the mobile embedded composer enough to keep its footer reachable', () => {
        expect(courtViewCss).toContain('.court-hebaqi-detail-composing.court-game-screen {\n        overflow-y: auto;')
        expect(courtViewCss).toContain('.court-hebaqi-detail-composing .court-hebaqi-panel-composer {\n        margin-top: 4vh;')
        expect(courtViewCss).not.toContain('.court-hebaqi-panel-composer .court-hebaqi-party-emblem {\n    top: clamp(92px, 7vw, 104px);')
        expect(courtViewCss).not.toContain('.court-hebaqi-detail-composing .court-hebaqi-panel-composer .court-hebaqi-party-emblem {\n        top: 62px;')
        expect(courtViewCss).not.toContain('.court-hebaqi-panel-composer .scheme-header-embedded')
    })

    it('keeps long art-backed dossier notes from pushing the scheme entry below the panel', () => {
        expect(courtViewCss).toContain('.court-hebaqi-panel:not(.court-hebaqi-panel-composer) .court-hebaqi-info-grid {\n    flex: 1 1 auto;')
        expect(courtViewCss).toContain('.court-hebaqi-panel:not(.court-hebaqi-panel-composer) .court-hebaqi-note,\n.court-hebaqi-panel:not(.court-hebaqi-panel-composer) .court-hebaqi-intel {\n    min-height: 0;')
    })

    it('aligns the overview HUD and brightens the overview background to match the round home line art', () => {
        expect(courtViewSource).toContain('GameViewport')
        expect(courtViewSource).toContain('canvasClassName="court-design-canvas"')
        expect(courtViewCss).toContain('.court-design-canvas')
        expect(courtViewCss).toContain('--court-safe-x: clamp(22px, calc(var(--game-canvas-vw) * 3.1), 72px);')
        expect(courtViewCss).toContain('--court-safe-y: clamp(18px, calc(var(--game-canvas-vh) * 2.4), 42px);')
        expect(courtViewCss).toContain('.court-overview-screen.court-game-screen')
        expect(courtViewCss).toContain('linear-gradient(180deg, rgba(5, 5, 6, 0.08), rgba(5, 5, 6, 0.36))')
        expect(courtViewCss).toContain('.court-scene-overview .court-art-background')
        expect(courtViewCss).toContain('filter: brightness(1.12) saturate(1.04) contrast(1.02);')
        expect(courtViewCss).toContain('.court-overview-screen .court-art-foreground')
        expect(courtViewCss).toContain('opacity: 0.42;')
        expect(courtViewCss).toContain('.court-overview-screen .court-top-bar,\n.court-faction-screen-court .court-top-bar')
    })

    it('uses full-page faction screens and an art-backed reaction paper', () => {
        const courtReactionRule = courtViewCss.match(/\.court-faction-screen-court \.court-seat-reaction \{[\s\S]*?\n\}/)?.[0] ?? ''
        const externalReactionRule = courtViewCss.match(/\.court-faction-screen-external \.court-seat-reaction \{[\s\S]*?\n\}/)?.[0] ?? ''

        expect(courtViewCss).not.toContain('court-page-dark-hall-background.webp')
        expect(courtViewCss).toContain('emperor-stage-plate.webp')
        expect(courtViewCss).toContain('empress-stage-plate.webp')
        expect(courtViewCss).toContain('background-size: 52% 104%, 50% 100%')
        expect(courtViewCss).toContain('background-position: -2% center, right center')
        expect(courtViewCss).toContain('court-reaction-paper.webp')
        expect(courtReactionRule).toContain("background: url('/images/ui/court-faction/court-reaction-paper.webp') center / 100% 100% no-repeat;")
        expect(externalReactionRule).toContain("background: url('/images/ui/court-faction/court-reaction-paper.webp') center / 100% 100% no-repeat;")
        expect(courtReactionRule).not.toContain('linear-gradient')
        expect(externalReactionRule).not.toContain('linear-gradient')
        expect(courtReactionRule).not.toContain('box-shadow')
        expect(externalReactionRule).not.toContain('box-shadow')
        expect(courtViewCss).not.toContain("content: '公开表态'")
        expect(courtViewCss).not.toContain("content: '新'")
        expect(courtViewCss).toContain('width: min(220px, 19vw)')
        expect(courtViewCss).toContain('.court-faction-screen-court .court-faction-scroll h3')
        expect(courtViewCss).toContain('.court-strength-label')
        expect(courtViewCss).toContain('font-family: var(--font-calligraphy)')
    })

    it('lets the overview gate buttons read as single art assets without CSS container paint', () => {
        const gateRule = courtViewCss.match(/\.court-gate \{[\s\S]*?\n\}/)?.[0] ?? ''
        const gateMaskRule = courtViewCss.match(/\.court-gate-art-mask \{[\s\S]*?\n\}/)?.[0] ?? ''
        const gateFrameRule = courtViewCss.match(/\.court-gate-frame \{[\s\S]*?\n\}/)?.[0] ?? ''

        expect(courtViewSource).not.toContain('court-gate-atmosphere')
        expect(courtViewSource).not.toContain('court-gate-frame-glow')
        expect(courtViewCss).not.toContain('.court-gate-atmosphere')
        expect(courtViewCss).not.toContain('.court-gate-frame-glow')
        expect(courtViewCss).not.toContain('.court-gate-art::after')
        expect(courtViewCss).not.toContain('.court-gate-art::before')
        expect(gateRule).toContain('background: transparent;')
        expect(gateRule).toContain('border: 0;')
        expect(gateRule).not.toContain('box-shadow')
        expect(gateMaskRule).not.toContain('background:')
        expect(gateMaskRule).not.toContain('border')
        expect(gateFrameRule).toContain("background: url('../../assets/ui/court-overview/court-gate-frame.webp') center / 100% 100% no-repeat;")
    })

    it('keeps court top action buttons art-backed without CSS fill layers', () => {
        const topButtonRule = courtViewCss.match(/\.court-top-button \{[\s\S]*?\n\}/)?.[0] ?? ''

        expect(topButtonRule).toContain("background-image: url('../../assets/ui/hud/hud-button-frame.webp');")
        expect(topButtonRule).toContain('background-position: center;')
        expect(topButtonRule).toContain('background-size: 100% 100%;')
        expect(topButtonRule).not.toContain('linear-gradient')
        expect(topButtonRule).not.toContain('radial-gradient')
        expect(topButtonRule).not.toContain('box-shadow')
    })

    it('uses a wide transparent foreground desk without forcing it into the viewport ratio', () => {
        expect(courtViewCss).toContain('.court-faction-screen-court .court-faction-bottom-foreground')
        expect(courtViewCss).toContain('court-bottom-foreground-desk-layer-v2.webp')
        expect(courtViewCss).toContain('background-size: cover')
        expect(courtViewCss).toContain('background-position: center bottom')
        expect(courtViewCss).not.toContain('court-bottom-foreground-desk-layer.webp\') center bottom / 100% 100% no-repeat')
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
