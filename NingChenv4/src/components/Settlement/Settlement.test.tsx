import { describe, expect, it } from 'vitest'
import settlementSource from './Settlement.tsx?raw'
import roundSettlementSource from '../../game/roundSettlement.ts?raw'
import settlementTypesSource from '../../game/settlementTypes.ts?raw'
import {
    buildSettlementAnomalyStream,
    buildSettlementPowerRows,
    formatChronicleVolumeNumber,
    getChronicleVolumeTitle,
    getSettlementBacklashText,
    selectSettlementPolicyAftereffectText,
    splitSettlementChronicleDateLead,
} from './Settlement'
import {
    buildSettlementDefaultEmpressReply,
    hasPolicyReason,
} from '../../game/empressReplyPresentation'

const fsSpecifier: string = 'fs'
const { readFileSync } = await import(fsSpecifier)
const settlementStyles = readFileSync(new URL('./Settlement.css', import.meta.url), 'utf8')

describe('Settlement fullscreen redesign contract', () => {
    it('uses the shared full-screen game canvas instead of a scrolling page background', () => {
        expect(settlementSource).toContain("import { GameViewport } from '../GameViewport/GameViewport'")
        expect(settlementSource).toContain('className="settlement-bleed"')
        expect(settlementSource).toContain('canvasClassName="settlement-design-canvas"')
        expect(settlementSource).toContain('settlement-canvas-content')
        expect(settlementSource).not.toContain('className="page-container settlement page-enter"')
        expect(settlementStyles).toContain('html:has(.settlement-viewport)')
        expect(settlementStyles).toContain('.settlement-bleed')
        expect(settlementStyles).toContain('.settlement-design-canvas')
        expect(settlementStyles).not.toContain('.settlement::before')
    })

    it('keeps the settlement HUD aligned with the round-start art HUD instead of CSS chrome', () => {
        const hudRule = settlementStyles.match(/\.settlement-volume-hud \{[\s\S]*?\n\}/)?.[0] ?? ''
        expect(hudRule).toContain('border: 0;')
        expect(hudRule).toContain('background: none;')
        expect(hudRule).toContain('filter: none;')
        expect(settlementStyles).toContain('.settlement-volume-hud .game-hud-icon-button')
        expect(settlementStyles).toContain("background-image: url('../../assets/ui/hud/hud-button-frame.webp');")
    })

    it('uses scheme feedback NPC-response parchment panels and internal scroll regions', () => {
        expect(settlementStyles).toContain('--settlement-panel-bg: rgba(239, 228, 204, 0.62);')
        expect(settlementStyles).toContain('--settlement-panel-ink: #2b261f;')
        expect(settlementStyles).toContain('backdrop-filter: blur(2.5px) saturate(0.96);')
        expect(settlementStyles).toContain('.narration-content')
        expect(settlementStyles).toContain('overflow-y: auto;')
    })

    it('removes redundant radar title labels and keeps settled values tabular with one decimal', () => {
        expect(settlementSource).not.toContain('label={`${title}五维`}')
        expect(settlementSource).toContain('formatPowerValue(row.currentValue, true)')
        expect(settlementSource).toContain('formatPowerValue(row.previousValue, false)')
        expect(settlementSource).toContain('value.toFixed(1)')
    })
})

describe('Settlement two-deck lower layout contract', () => {
    it('models the lower settlement area as a power deck and an anomaly deck', () => {
        expect(settlementSource).toContain("useState<'power' | 'anomaly'>('power')")
        expect(settlementSource).toContain('showPowerDeck')
        expect(settlementSource).toContain('showAnomalyDeck')
        expect(settlementSource).toContain('settlement-lower-deck')
        expect(settlementSource).toContain('settlement-deck-main')
        expect(settlementSource).toContain('settlement-power-grid')
        expect(settlementSource).toContain('settlement-anomaly-stream')
    })

    it('requires the anomaly deck to be opened before the next volume can be entered', () => {
        expect(settlementSource).toContain('viewedAnomaly')
        expect(settlementSource).toContain('setViewedAnomaly(true)')
        expect(settlementSource).toContain('canProceedToNextVolume')
        expect(settlementSource).toContain('aria-disabled={!canProceedToNextVolume}')
        expect(settlementSource).toContain('settlement-next-tooltip')
        expect(settlementSource).toContain('查看本卷异动后继续')
    })

    it('routes the next-volume action through the north court entry transition', () => {
        expect(settlementSource).toContain("import { useSceneTransition } from '../SceneTransition/SceneTransition'")
        expect(settlementSource).toContain("import { useGameSfx } from '../../audio/gameSfx'")
        expect(settlementSource).toContain('const { runSceneTransition } = useSceneTransition()')
        expect(settlementSource).toContain('const { playSfx } = useGameSfx()')
        expect(settlementSource).toContain("playSfx('settlement-next-volume')")
        expect(settlementSource).toContain("variant: 'north-court-entry'")
        expect(settlementSource).toContain('onCovered: nextPhase')
        expect(settlementSource).not.toContain('if (!canProceedToNextVolume) return\n        nextPhase()')
    })

    it('uses fixed-width vertical art tabs around a single flexible deck stage', () => {
        expect(settlementSource).toContain('settlement-deck-tab settlement-deck-tab-power')
        expect(settlementSource).toContain('settlement-deck-tab settlement-deck-tab-anomaly')
        expect(settlementSource).toContain('settlement-deck-tab-state')
        expect(settlementStyles).toContain('display: flex;')
        expect(settlementStyles).toContain('flex: 0 0 var(--settlement-tab-width);')
        expect(settlementStyles).toContain('width: var(--settlement-tab-width);')
        expect(settlementStyles).toContain('flex: 1 1 auto;')
        expect(settlementStyles).toContain('.settlement-lower-deck.is-anomaly .settlement-deck-tab-anomaly')
        expect(settlementStyles).not.toContain('grid-template-columns: var(--settlement-tab-width) var(--settlement-tab-width) minmax(0, 1fr);')
        expect(settlementStyles).not.toContain('transition: grid-template-columns')
    })

    it('removes the temporary HUD question mark buttons until hover help is redesigned', () => {
        expect(settlementSource).not.toContain('status-help')
        expect(settlementSource).not.toContain('WAR_TREND_TOOLTIP')
        expect(settlementSource).not.toContain('SAFETY_RISK_TOOLTIP')
        expect(settlementStyles).not.toContain('.status-help')
    })
})

describe('Settlement visual feedback contract', () => {
    it('keeps the selected background art clear without a full-screen vignette overlay', () => {
        expect(settlementSource).not.toContain('settlement-bleed-shade')
        expect(settlementStyles).not.toContain('.settlement-bleed-shade')
        expect(settlementStyles).not.toContain('radial-gradient(circle at 50% 14%')
        expect(settlementStyles).not.toContain('transparent 78%, rgba(0, 0, 0, 0.5)')
    })

    it('centers the HUD status group against the full HUD and matches court HUD color rhythm', () => {
        const hudRule = settlementStyles.match(/\.settlement-volume-hud \{[\s\S]*?\n\}/)?.[0] ?? ''
        const statusRule = settlementStyles.match(/\.settlement-hud-status \{[\s\S]*?\n\}/)?.[0] ?? ''
        const chipRule = settlementStyles.match(/\.settlement-hud-status-chip \{[\s\S]*?\n\}/)?.[0] ?? ''
        const separatorRule = settlementStyles.match(/\.settlement-hud-status-chip:not\(:last-child\)::after \{[\s\S]*?\n\}/)?.[0] ?? ''
        const labelRule = settlementStyles.match(/\.settlement-hud-status-label \{[\s\S]*?\n\}/)?.[0] ?? ''
        const valueRule = settlementStyles.match(/\.settlement-hud-status-value \{[\s\S]*?\n\}/)?.[0] ?? ''
        const hudMarkup = settlementSource.slice(
            settlementSource.indexOf('settlement-hud-status'),
            settlementSource.indexOf('<PageUtilityActions'),
        )

        expect(hudRule).toContain('position: relative;')
        expect(statusRule).toContain('position: absolute;')
        expect(statusRule).toContain('left: 50%;')
        expect(statusRule).toContain('transform: translateX(-50%);')
        expect(statusRule).toContain('gap: 0;')
        expect(chipRule).toContain('color: rgba(224, 214, 190, 0.74);')
        expect(separatorRule).toContain('rgba(212, 181, 92, 0.72)')
        expect(labelRule).toContain('color: rgba(209, 201, 183, 0.7);')
        expect(labelRule).toContain('font-size: clamp(0.82rem, 0.7rem + 0.22vw, 1.04rem);')
        expect(labelRule).toContain('letter-spacing: 2px;')
        expect(valueRule).toContain('font-size: clamp(0.92rem, 0.78rem + 0.28vw, 1.12rem);')
        expect(valueRule).toContain('letter-spacing: 2px;')
        expect(hudMarkup.indexOf('南征风向')).toBeGreaterThan(hudMarkup.indexOf('南陈相对北周'))
        expect(hudMarkup.indexOf('南征风向')).toBeLessThan(hudMarkup.indexOf('自身安危'))
    })

    it('keeps lower deck panels mounted in one stage during switching to avoid the yellow flash', () => {
        expect(settlementStyles).not.toContain('.settlement-deck-main[aria-hidden="true"] {\n    display: none;')
        expect(settlementStyles).not.toContain('transform: translateX(18px);')
        expect(settlementStyles).not.toContain('opacity 220ms ease 80ms')
        expect(settlementSource).toContain('settlement-deck-main')
        expect(settlementSource).toContain('settlement-deck-view settlement-power-deck')
        expect(settlementSource).toContain('settlement-deck-view settlement-anomaly-panel settlement-anomaly-deck')
        expect(settlementStyles).toContain('position: absolute;')
        expect(settlementStyles).toContain('inset: 0;')
        expect(settlementStyles).toContain('visibility: hidden;')
        expect(settlementStyles).toContain('visibility: visible;')
        expect(settlementStyles).not.toContain('grid-template-areas:')
    })

    it('aligns deck tabs and reading panels with scheme feedback NPC-response materials', () => {
        const tabRule = settlementStyles.match(/\.settlement-deck-tab \{[\s\S]*?\n\}/)?.[0] ?? ''
        const panelRule = settlementStyles.match(/\.settlement-power-panel,[\s\S]*?\.settlement-anomaly-panel \{[\s\S]*?\n\}/)?.[0] ?? ''

        expect(tabRule).toContain('rgba(255, 247, 222, 0.94)')
        expect(tabRule).toContain('rgba(225, 207, 154, 0.9)')
        expect(tabRule).toContain('rgba(227, 204, 140, 0.86)')
        expect(panelRule).toContain('var(--settlement-panel-bg)')
        expect(settlementStyles).toContain('--settlement-panel-bg: rgba(239, 228, 204, 0.62);')
        expect(panelRule).toContain('backdrop-filter: blur(2.5px) saturate(0.96);')
        expect(panelRule).toContain('-webkit-backdrop-filter: blur(2.5px) saturate(0.96);')
    })

    it('styles the chronicle like the round-start court briefing and highlights only paragraph-leading reign dates', () => {
        const titleRule = settlementStyles.match(/\.judge-title \{[\s\S]*?\n\}/)?.[0] ?? ''
        const textRule = settlementStyles.match(/\.narration-text \{[\s\S]*?\n\}/)?.[0] ?? ''
        const dateRule = settlementStyles.match(/\.settlement-chronicle-date \{[\s\S]*?\n\}/)?.[0] ?? ''

        expect(titleRule).toContain('color: #5b2b1b;')
        expect(titleRule).toContain('font-size: clamp(1.24rem, 1.02rem + 0.44vw, 1.58rem);')
        expect(textRule).toContain('color: #24180d;')
        expect(textRule).toContain('font-size: clamp(1rem, 0.9rem + 0.24vw, 1.15rem);')
        expect(textRule).toContain('line-height: 1.48;')
        expect(dateRule).toContain('color: #a66b1e;')
        expect(dateRule).toContain('font-weight: 800;')
        expect(settlementSource).toContain('settlement-chronicle-date')
        expect(settlementSource).not.toContain('typewriter')
        expect(settlementStyles).not.toContain('.typewriter::after')
    })

    it('marks unread anomaly tab state as blinking red unread copy', () => {
        expect(settlementSource).toContain("viewedAnomaly ? '已阅' : '未阅'")
        expect(settlementSource).not.toContain("'未查看'")
        expect(settlementSource).not.toContain("'已查看'")
        expect(settlementSource).toContain("viewedAnomaly ? 'is-read' : 'is-unread'")
        expect(settlementStyles).toContain('.settlement-deck-tab-state.is-unread')
        expect(settlementStyles).toContain('animation: settlementUnreadPulse')
    })

    it('keeps the next-volume button at the same compact scale as round-start entry', () => {
        const nextRule = settlementStyles.match(/\.btn-next \{[\s\S]*?\n\}/)?.[0] ?? ''

        expect(nextRule).toContain('width: auto;')
        expect(nextRule).toContain('min-width: 176px;')
        expect(nextRule).toContain('min-height: 40px;')
        expect(nextRule).toContain('margin: 0;')
        expect(nextRule).toContain('padding: 8px 24px;')
        expect(nextRule).toContain('font-size: 1rem;')
    })

    it('moves crowded settlement radar labels outward without changing the shared radar component', () => {
        expect(settlementStyles).toContain('.settlement-power-radar .radar-chip-war-board.radar-chip-pos-top')
        expect(settlementStyles).toContain('.settlement-power-radar .radar-chip-war-board.radar-chip-pos-right')
        expect(settlementStyles).toContain('.settlement-power-radar .radar-chip-war-board.radar-chip-pos-left')
        expect(settlementStyles).toContain('translate(-50%, -118%)')
        expect(settlementStyles).toContain('translate(14px, -50%)')
        expect(settlementStyles).toContain('translate(calc(-100% - 14px), -50%)')
    })

    it('keeps national power value rows inside panels on narrow desktop viewports', () => {
        expect(settlementStyles).toContain('@media (max-width: 1280px)')
        expect(settlementStyles).toContain('grid-template-columns: minmax(158px, 0.82fr) minmax(186px, 1fr);')
        expect(settlementStyles).toContain('grid-template-columns: 28px minmax(42px, 0.62fr) minmax(104px, 1fr);')
        expect(settlementStyles).toContain('.settlement-power-value.previous {\n        width: 36px;')
        expect(settlementStyles).toContain('.settlement-power-value.current {\n        width: 44px;')
        expect(settlementStyles).toContain('transform: translate(-50%, -104%);')
        expect(settlementStyles).toContain('transform: translate(-22px, -50%);')
        expect(settlementStyles).toContain('.settlement-hud-status-chip {\n        padding: 0 6px;')
        expect(settlementStyles).toContain('.settlement-hud-status-label {\n        font-size: 0.72rem;')
        expect(settlementStyles).toContain('.settlement-hud-status-value {\n        font-size: 0.78rem;')
    })
})

describe('Settlement helpers', () => {
    it('splits chronicle paragraph-leading reign dates without highlighting later mentions', () => {
        expect(splitSettlementChronicleDateLead('北周建文十一年暮春，朝局微移。')).toEqual({
            lead: '北周建文十一年暮春',
            rest: '，朝局微移。',
        })
        expect(splitSettlementChronicleDateLead('南陈天嘉七年季秋。百废待兴。')).toEqual({
            lead: '南陈天嘉七年季秋',
            rest: '。百废待兴。',
        })
        expect(splitSettlementChronicleDateLead('朝局微移，北周建文十一年暮春再被提及。')).toBeNull()
    })

    it('builds national power detail rows with arrows only for changed dimensions', () => {
        const rows = buildSettlementPowerRows(
            { finance: 50, grain: 60, military: 70, socialOrder: 80, governance: 90 },
            { finance: 55, grain: 60, military: 68, socialOrder: 80, governance: 90 },
        )

        expect(rows).toHaveLength(5)
        expect(rows.find(row => row.key === 'finance')).toMatchObject({
            label: '财政',
            previousValue: 50,
            currentValue: 55,
            changed: true,
            direction: 'up',
        })
        expect(rows.find(row => row.key === 'grain')).toMatchObject({
            label: '粮草',
            currentValue: 60,
            changed: false,
            direction: 'steady',
        })
        expect(rows.find(row => row.key === 'grain')?.previousValue).toBeUndefined()
        expect(rows.find(row => row.key === 'military')).toMatchObject({
            currentValue: 68,
            changed: true,
            direction: 'down',
        })
    })

    it('builds one ordered anomaly stream with canonical labels and secondary labels', () => {
        const entries = buildSettlementAnomalyStream({
            delayedBacklash: [{
                npcId: 'zu',
                npcName: '祖珽',
                type: 'guarded',
                intensity: 2,
                summary: '祖珽已有提防。',
                sourceRound: 2,
            }],
            policyAftereffectTexts: ['南陈问政的后效仍在延续。'],
            externalActionReports: [{
                npcId: 'heba',
                npcName: '贺拔琪',
                action: 'rebellion',
                outcome: '贺拔琪起兵旋即为平叛军所剿，北周折损兵粮。',
                outcomeCode: 'rebellion_crushed',
                nationEffects: { military: -1 },
            }],
            relationshipReports: [{
                edgeId: 'edge-1',
                edgeLabel: '君臣裂痕',
                structureId: 'structure-1',
                structureName: '帝党旧盟',
                summary: '帝党旧盟中的关键关系被撕开。',
            }],
            factionCollapseReports: [{
                factionId: 'empress',
                factionName: '后党',
                severity: 'breach',
                reasons: ['内部稳定度下滑'],
                summary: '后党内部稳定度出现裂口。',
            }],
            keyChangeHighlights: [],
        })

        expect(entries.map(entry => entry.label)).toEqual([
            '人物命运',
            '朝局动荡',
            '朝局动荡',
            '朝局反噬',
            '问政余波',
        ])
        expect(entries[0]).toMatchObject({
            subLabel: '身死',
            secondaryLabel: '军镇异动',
        })
        expect(entries[1]).toMatchObject({ subLabel: '关系失衡' })
        expect(entries[2]).toMatchObject({ subLabel: '党内争端' })
    })

    it('admits only player-relevant ordinary key changes into the anomaly stream', () => {
        const entries = buildSettlementAnomalyStream({
            delayedBacklash: [],
            policyAftereffectTexts: [],
            externalActionReports: [],
            relationshipReports: [],
            factionCollapseReports: [],
            keyChangeHighlights: [
                {
                    id: 'external-trust',
                    category: 'external',
                    title: '贺拔琪动向',
                    text: '贺拔琪：信任度-3。只是言语层面的试探。',
                    tone: 'negative',
                },
                {
                    id: 'external-military',
                    category: 'external',
                    title: '独孤文约动向',
                    text: '独孤文约：军力-2。地方兵势已有波动。',
                    tone: 'negative',
                },
                {
                    id: 'court-favor',
                    category: 'court',
                    title: '祖珽处境',
                    text: '祖珽：皇帝恩宠-5。御前庇护正在改变。',
                    tone: 'negative',
                },
                {
                    id: 'faction-shift',
                    category: 'faction',
                    title: '帝党消长',
                    text: '帝党：朝堂影响力+1。派系层面的声势变化。',
                    tone: 'positive',
                },
                {
                    id: 'faction-extra',
                    category: 'faction',
                    title: '后党消长',
                    text: '后党：军力-1。派系层面的声势变化。',
                    tone: 'negative',
                },
            ],
        })

        expect(entries.map(entry => entry.id)).toEqual([
            'key-external-military',
            'key-court-favor',
            'key-faction-shift',
        ])
        expect(entries.every(entry => entry.label === '关键变化')).toBe(true)
    })

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

    it('builds a concerned default empress reply when no policy reason was authored', () => {
        expect(buildSettlementDefaultEmpressReply(null)).toBeNull()
        const reply = buildSettlementDefaultEmpressReply({ optionContent: '清点户籍仓廪' })

        expect(reply).toContain('建康夜雨未歇')
        expect(reply).toContain('朕已按“清点户籍仓廪”着手施行')
        expect(reply).toContain('你未多写附言')
        expect(reply).toContain('朕会先照此方向施行，你在北边先保周全。')
    })

    it('keeps fallback imperial and richer when the player did author a reason', () => {
        const report = {
            optionContent: '先整军令，再催粮道',
            reason: '先把节度与军令统一，前线才不会各唱各的调。',
            weakestDimensionLabel: '军事',
            warWindow: true,
            playerDangerStage: 'under_watch',
            concernOpening: '淮南军书压到案前，朕读你的字，倒更想起你也在另一处战场。',
            concernClosingHint: '结尾宜强调战役可进，后勤与性命不可轻掷。',
        } as const
        const reply = buildSettlementDefaultEmpressReply(report)

        expect(reply).toContain('淮南军书压到案前')
        expect(reply).toContain('朕已按“先整军令，再催粮道”着手施行。')
        expect(reply).toContain('眼下兵事将近，节候与后勤都不可轻纵。')
        expect(reply).toContain('北来书信隔了数重人手，往后行话宜更收三分。')
        expect(reply).not.toContain('你在北朝已渐有人留意')
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
        expect(settlementTypesSource).toContain('policyParse: PolicyReasonParseResult | null')
        expect(roundSettlementSource).toContain('question: question.question')
        expect(roundSettlementSource).toContain('policyParse: hasPolicyReason ? policyParse ?? null : null')
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

    it('uses the consolidated settlement HUD and anomaly stream instead of separate legacy result modules', () => {
        expect(settlementSource).toContain('settlement-volume-hud')
        expect(settlementSource).toContain('settlement-hud-status')
        expect(settlementSource).toContain('本卷异动')
        expect(settlementSource).toContain('settlement-anomaly-stream')
        expect(settlementSource).toContain('buildSettlementAnomalyStream')
        expect(settlementSource).toContain('buildSettlementPowerRows')
        expect(settlementSource).not.toContain('<h3 className="section-title">大局推演</h3>')
        expect(settlementSource).not.toContain('<h3 className="section-title">外部势力明牌</h3>')
        expect(settlementSource).not.toContain('<h3 className="section-title">关系链失衡</h3>')
        expect(settlementSource).not.toContain('<h3 className="section-title">朝堂势力裂口</h3>')
    })
})
