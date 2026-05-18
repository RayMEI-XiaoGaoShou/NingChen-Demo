import { beforeEach, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { buildSchemeSpeechPayload, getSchemeSpeechFields, getSchemeUnlockHint, SchemeComposer, SchemePanel } from './SchemePanel'
import schemePanelSource from './SchemePanel.tsx?raw'
import { useGameStore } from '../../stores/gameStore'
import { INITIAL_NPCS } from '../../data/npcs'
import { SCHEMES } from '../../data/schemes'
import { getOmenGuidePresentation } from '../../game/omenGuide'
import { buildOmenTargetHint } from '../../game/omenTargetHint'

const nodeFsSpecifier: string = 'node:fs'
const { readFileSync } = await import(nodeFsSpecifier)
const schemePanelCss = readFileSync(new URL('./SchemePanel.css', import.meta.url), 'utf8') as string

describe('SchemePanel layout labels', () => {
    beforeEach(() => {
        useGameStore.getState().resetGame()
    })

    it('renders the embedded composer as a vertical scheme board with speech supplement', () => {
        const html = renderToStaticMarkup(
            <SchemeComposer mode="embedded" lockedNpcId="zongai" onChangeTarget={() => undefined} />,
        )

        expect(html).toContain('scheme-embedded-board')
        expect(html).toContain('scheme-embedded-choice-area')
        expect(html).toContain('scheme-vertical-name')
        expect(html).not.toContain('scheme-description-panel')
        expect(html).toContain('scheme-speech-supplement')
        expect(html).toContain('scheme-embedded-execute')
        expect(html).toContain('选择计谋')
        expect(html).toContain('scheme-section-step-badge')
        expect(html).toContain('>壹<')
        expect(html).toContain('>贰<')
        expect(html).toContain('>说辞<')
        expect(html).not.toContain('今日第')
        expect(html).not.toContain('说辞补充区')
        expect(html).not.toContain('说辞若切中此人的立场与心结')
    })

    it('uses the optimized scheme explanation copy from the handoff markdown', () => {
        expect(SCHEMES.find(scheme => scheme.type === 'probe')?.description).toBe('摸底牌、探口风，发掘该角色的隐藏立场')
        expect(SCHEMES.find(scheme => scheme.type === 'advise')?.description).toBe('对其晓以利害，顺其所欲献上利他而暗损北周国本之 “良策”')
        expect(SCHEMES.find(scheme => scheme.type === 'slander')?.description).toBe('在 施计对象甲 心中种下对 关联人物乙 的疑心')
    })

    it('hides target-ineligible schemes in the embedded art-backed composer', () => {
        const externalHtml = renderToStaticMarkup(
            <SchemeComposer mode="embedded" lockedNpcId="ansiming" onChangeTarget={() => undefined} />,
        )
        const ordinaryCourtHtml = renderToStaticMarkup(
            <SchemeComposer mode="embedded" lockedNpcId="linghuelvguang" onChangeTarget={() => undefined} />,
        )
        const leaderHtml = renderToStaticMarkup(
            <SchemeComposer mode="embedded" lockedNpcId="zongai" onChangeTarget={() => undefined} />,
        )

        expect(externalHtml).not.toContain('data-scheme-type="proxy"')
        expect(externalHtml).not.toContain('data-scheme-type="appeal"')
        expect(ordinaryCourtHtml).not.toContain('data-scheme-type="proxy"')
        expect(leaderHtml).toContain('data-scheme-type="proxy"')
    })

    it('uses circular avatar nodes for embedded second-target selection', () => {
        expect(schemePanelSource).toContain('getNpcDetailAvatarPath(npc.id)')
        expect(schemePanelSource).toContain('scheme-related-avatar')
        expect(schemePanelSource).toContain('scheme-related-avatar-name')
        expect(schemePanelSource).not.toContain('scheme-related-chip')
    })

    it('matches the dossier leader role suffixes in embedded headers', () => {
        const hebaqiHtml = renderToStaticMarkup(
            <SchemeComposer mode="embedded" lockedNpcId="hebaqí" onChangeTarget={() => undefined} />,
        )
        const zongaiHtml = renderToStaticMarkup(
            <SchemeComposer mode="embedded" lockedNpcId="zongai" onChangeTarget={() => undefined} />,
        )

        expect(hebaqiHtml).toContain('北周太后、摄政者【后党魁首】')
        expect(zongaiHtml).toContain('中常侍【代言皇帝】')
    })

    it('suppresses the duplicated embedded header surface', () => {
        expect(schemePanelCss).toContain('.scheme-modal-embedded .scheme-header-embedded {\n    display: none;')
        expect(schemePanelCss).toContain('grid-row: 1 / 3;')
    })

    it('keeps the embedded empty state light before a scheme is selected', () => {
        const html = renderToStaticMarkup(
            <SchemeComposer mode="embedded" lockedNpcId="hebaqí" onChangeTarget={() => undefined} />,
        )

        expect(html).not.toContain('先选一计，冯道之方能替你校准说辞。')
        expect(html).toContain('先选一枚计牌，再补一句能落到此人心坎上的说辞。')
        expect(html).toContain('scheme-speech-empty-hint')
        expect(html).not.toContain('class="scheme-speech-empty"')
    })

    it('keeps scheme tokens fixed when a related target picker opens', () => {
        const pickingRelatedRule = schemePanelCss.match(/\.scheme-embedded-choice-area\.is-picking-related \{[^}]+\}/)?.[0] ?? ''

        expect(pickingRelatedRule).toContain('gap: 8px;')
        expect(pickingRelatedRule).toContain('padding-bottom: 0;')
    })

    it('uses approved scheme token assets without the old embedded button paint', () => {
        const embeddedTokenRule = schemePanelCss.match(/\.scheme-modal-embedded \.scheme-vertical-btn \{[\s\S]*?\n\}/)?.[0] ?? ''
        const hoverTokenRule = schemePanelCss.match(/\.scheme-modal-embedded \.scheme-vertical-btn:hover:not\(\.disabled\) \{[\s\S]*?\n\}/)?.[0] ?? ''
        const selectedTokenRule = schemePanelCss.match(/\.scheme-modal-embedded \.scheme-vertical-btn\.selected \{[\s\S]*?\n\}/)?.[0] ?? ''
        const disabledTokenRule = schemePanelCss.match(/\.scheme-modal-embedded \.scheme-vertical-btn\.disabled \{[\s\S]*?\n\}/)?.[0] ?? ''
        const baseTokenRule = schemePanelCss.match(/\.scheme-vertical-btn \{[\s\S]*?\n\}/)?.[0] ?? ''
        const embeddedNameRule = schemePanelCss.match(/\.scheme-modal-embedded \.scheme-vertical-name \{[\s\S]*?\n\}/)?.[0] ?? ''
        const embeddedLockRule = schemePanelCss.match(/\.scheme-modal-embedded \.scheme-vertical-btn \.scheme-lock \{[\s\S]*?\n\}/)?.[0] ?? ''

        expect(baseTokenRule).not.toContain('linear-gradient')
        expect(baseTokenRule).not.toContain('box-shadow')
        expect(embeddedTokenRule).toContain("--scheme-token-bg-image: url('/images/ui/scheme-token/scheme-token-normal.webp');")
        expect(embeddedTokenRule).toContain('--scheme-token-bg-size: auto 94%;')
        expect(embeddedTokenRule).toContain('--scheme-token-bg-position: center 52%;')
        expect(embeddedTokenRule).toContain('--scheme-token-text-left: 47%;')
        expect(embeddedTokenRule).toContain('var(--scheme-token-bg-image) var(--scheme-token-bg-position) / var(--scheme-token-bg-size) no-repeat')
        expect(embeddedTokenRule).not.toContain('linear-gradient')
        expect(hoverTokenRule).not.toContain('linear-gradient')
        expect(selectedTokenRule).not.toContain('linear-gradient')
        expect(disabledTokenRule).not.toContain('linear-gradient')
        expect(hoverTokenRule).toContain("--scheme-token-bg-image: url('/images/ui/scheme-token/scheme-token-selected.webp');")
        expect(hoverTokenRule).toContain('border-color: transparent;')
        expect(selectedTokenRule).toContain("--scheme-token-bg-image: url('/images/ui/scheme-token/scheme-token-selected.webp');")
        expect(selectedTokenRule).toContain('animation: none;')
        expect(disabledTokenRule).toContain("--scheme-token-bg-image: url('/images/ui/scheme-token/scheme-token-disabled.webp');")
        expect(embeddedNameRule).toContain('position: absolute;')
        expect(embeddedNameRule).toContain('left: var(--scheme-token-text-left);')
        expect(embeddedNameRule).toContain('top: 50%;')
        expect(embeddedNameRule).toContain('transform: translate(-50%, -50%);')
        expect(embeddedNameRule).toContain('white-space: nowrap;')
        expect(embeddedNameRule).not.toContain('max-height')
        expect(embeddedLockRule).toContain('left: var(--scheme-token-text-left);')
        expect(embeddedLockRule).toContain('right: auto;')
        expect(embeddedLockRule).toContain('transform: translateX(-50%);')
        expect(embeddedLockRule).toContain('white-space: nowrap;')
    })

    it('renders embedded omen speech as a unified framed dual-field surface', () => {
        const html = renderToStaticMarkup(
            <SchemeComposer
                mode="embedded"
                lockedNpcId="hebaqí"
                initialSchemeType="omen"
                onChangeTarget={() => undefined}
            />,
        )

        const speechTitleIndex = html.indexOf('>说辞<')
        const omenPrimaryIndex = html.indexOf('谶辞 / 征兆')
        const speechTitleSlice = html.slice(speechTitleIndex, omenPrimaryIndex)

        expect(html).not.toContain('谶纬偏灾异、法统、天命与人心，不宜写成兵粮调度')
        expect(html).toContain('scheme-embedded-speech-field scheme-embedded-omen-field')
        expect(html).toContain('scheme-embedded-omen-inputs')
        expect(html).toContain('scheme-embedded-omen-label-row')
        expect(html).toContain('scheme-embedded-omen-count')
        expect(html).toContain('0/60')
        expect(html).toContain('0/100')
        expect(speechTitleSlice).not.toContain('0/100')
        expect(html).not.toContain('omen-helper-card')
        expect(html.indexOf('scheme-feng-assist')).toBeGreaterThan(html.indexOf('scheme-embedded-omen-field'))
    })

    it('keeps the embedded composer body and footer in the same height budget', () => {
        expect(schemePanelCss).toContain('grid-template-rows: auto minmax(0, 1fr) auto;')
        expect(schemePanelCss).toContain('.scheme-modal-embedded .scheme-body {\n    height: auto;')
        expect(schemePanelCss).toContain('.scheme-modal-embedded .scheme-footer-embedded {\n    margin-top: 6px;')
        expect(schemePanelCss).toContain('.scheme-modal-embedded .scheme-embedded-execute {\n    margin-top: 0;')
        expect(schemePanelCss).toContain('.scheme-modal-embedded .scheme-embedded-speech-input {\n    min-height: 0;')
        expect(schemePanelCss).toContain('.scheme-embedded-speech-field {\n        min-height: 168px;')
        expect(schemePanelCss).toContain('overflow-x: hidden;')
    })

    it('models embedded speech readiness around related target selection', () => {
        expect(schemePanelSource).toContain('initialSchemeType?: SchemeType | null')
        expect(schemePanelSource).toContain('const [selectedScheme, setSelectedScheme] = useState<SchemeType | null>(initialSchemeType ?? null)')
        expect(schemePanelSource).toContain('setSelectedScheme(initialSchemeType)')
        expect(schemePanelSource).toContain('const needsRelatedTarget = Boolean(currentSchemeData?.needsSecondTarget)')
        expect(schemePanelSource).toContain('const speechReady = Boolean(selectedScheme && (!needsRelatedTarget || (relatedNpcId && !relatedPickerOpen)))')
        expect(schemePanelSource).toContain('speechReady ? (')
        expect(schemePanelSource).toContain('const embeddedSpeechCount = selectedScheme === \'omen\'')
        expect(schemePanelSource).toContain('embeddedSpeechCount ? <span className="scheme-speech-label-count">{embeddedSpeechCount}</span> : null')
    })

    it('collapses the embedded related picker after choosing a related target', () => {
        expect(schemePanelSource).toContain('const [relatedPickerOpen, setRelatedPickerOpen] = useState(Boolean(initialSchemeType && getSchemeByType(initialSchemeType)?.needsSecondTarget))')
        expect(schemePanelSource).toContain('setRelatedPickerOpen(scheme.needsSecondTarget)')
        expect(schemePanelSource).toContain('setRelatedPickerOpen(false)')
        expect(schemePanelSource).not.toContain('has-collapsed-related')
        expect(schemePanelSource).toContain('is-reopening-related')
        expect(schemePanelSource).toContain('scheme-related-switch')
    })

    it('keeps embedded Feng Daozhi drafts inside the speech field', () => {
        expect(schemePanelSource).toContain('showPreview={false}')
        expect(schemePanelSource).toContain('scheme-speech-label-count')
    })

    it('uses a detail-matched embedded header and one-piece speech field material', () => {
        const embeddedHeaderRule = schemePanelCss.match(/\.scheme-modal-embedded \.scheme-header,\n\.scheme-header-embedded \{[^}]+\}/)?.[0] ?? ''
        const targetCopyRule = schemePanelCss.match(/\.scheme-embedded-target-copy \{[^}]+\}/)?.[0] ?? ''
        const targetTitleRule = schemePanelCss.match(/\.scheme-embedded-target-title \{[^}]+\}/)?.[0] ?? ''
        const targetNameRule = schemePanelCss.match(/\.scheme-embedded-target-name \{[^}]+\}/)?.[0] ?? ''

        expect(schemePanelCss).toContain('.scheme-header-embedded {\n    position: relative;')
        expect(embeddedHeaderRule).toContain('padding: 0 clamp(116px, 9vw, 160px) 30px 0;')
        expect(targetCopyRule).toContain('display: block;')
        expect(targetTitleRule).toContain('display: block;')
        expect(targetNameRule).toContain('display: block;')
        expect(targetNameRule).toContain('margin: 3px 0 0;')
        expect(targetNameRule).toContain('line-height: normal;')
        expect(schemePanelSource).not.toContain('scheme-embedded-change-target')
        expect(schemePanelCss).not.toContain('.scheme-embedded-change-target')
        expect(schemePanelCss).toContain('.scheme-embedded-speech-field {\n    isolation: isolate;')
        expect(schemePanelCss).toMatch(/\.scheme-modal-embedded \.scheme-embedded-speech-input \{[\s\S]*border: 0;[\s\S]*background: transparent;[\s\S]*box-shadow: none;/)
        expect(schemePanelCss).toMatch(/\.scheme-modal-embedded \.scheme-embedded-speech-input:focus \{[\s\S]*border-color: transparent;[\s\S]*background: transparent;[\s\S]*box-shadow: none;/)
        expect(schemePanelCss).toContain('.scheme-related-inline-collapsed {\n    display: inline-flex;')
        expect(schemePanelCss).not.toContain('.scheme-embedded-choice-area.has-collapsed-related')
        expect(schemePanelCss).toContain('.scheme-feng-assist {\n    overflow: visible;')
        expect(schemePanelCss).toMatch(/\.scheme-feng-assist \.feng-assist-trigger \{[\s\S]*overflow: visible;/)
        expect(schemePanelCss).toMatch(/\.scheme-feng-assist \.feng-assist-count \{[\s\S]*writing-mode: vertical-rl;/)
        expect(schemePanelCss).toMatch(/\.scheme-feng-assist \.feng-assist-portrait \{[\s\S]*object-fit: contain;/)
        expect(schemePanelCss).toMatch(/\.scheme-feng-assist \.feng-assist-hover-note \{[\s\S]*right: calc\(100% - 18px\);/)
        expect(schemePanelCss).toContain('.scheme-speech-label-count')
        expect(schemePanelCss).toContain('.scheme-speech-empty-hint')
        expect(schemePanelCss).toContain('.scheme-modal-embedded .scheme-embedded-omen-field')
        expect(schemePanelCss).toContain('.scheme-modal-embedded .scheme-embedded-omen-label-row')
        expect(schemePanelCss).toContain('.scheme-modal-embedded .scheme-embedded-omen-count')
    })

    it('keeps court embedded targets free of external-only escalation schemes', () => {
        const html = renderToStaticMarkup(
            <SchemeComposer mode="embedded" lockedNpcId="zongai" onChangeTarget={() => undefined} />,
        )

        expect(html).not.toContain('data-scheme-type="secession"')
        expect(html).not.toContain('data-scheme-type="rebellion"')
        expect(schemePanelSource).toContain('title={unlockHint}')
        expect(schemePanelSource).toContain('aria-label={unlockHint}')
    })

    it('does not show scheme hook chips in the current layout leverage points', () => {
        expect(schemePanelSource).toContain('selectedNpc.softSpot')
        expect(schemePanelSource).toContain('selectedNpc.triggerPoint')
        expect(schemePanelSource).not.toMatch(/leverageChips[\s\S]*selectedNpc\.schemeHooks/)
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
                first_external_line_teaching: false,
                first_follow_up_teaching: false,
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
        expect(fields.helperText).toContain('先编征兆')
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

    it('renders omen helper copy and target hint when omen is selected', () => {
        const npc = useGameStore.getState().npcs.find(item => item.id === 'zongai')!

        useGameStore.setState({
            currentPhase: 'SCHEME_PHASE',
            currentRound: 13,
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
                first_omen_teaching: true,
                first_external_line_teaching: false,
                first_follow_up_teaching: false,
            },
            omenGuideSeen: {
                first_omen_modal: true,
            },
            currentSchemes: [],
            npcs: useGameStore.getState().npcs.map(item =>
                item.id === npc.id
                    ? { ...item, trust: 60 }
                    : item,
            ),
        })

        const markup = renderToStaticMarkup(<SchemePanel />)

        expect(getSchemeSpeechFields('omen').primaryLabel).toBe('谶辞 / 征兆')
        expect(buildOmenTargetHint({ npc })).toContain('名分')
        expect(markup).toContain('计谋指南')
    })
    it('describes what is still missing for a locked scheme', () => {
        const npc = useGameStore.getState().npcs.find(item => item.id === 'duguwenyue')!

        const hint = getSchemeUnlockHint({
            schemeType: 'rebellion',
            npc,
            round: 5,
            unlockedSecrets: 0,
        })

        expect(hint).toContain('未解锁')
        expect(hint).toContain('此人对朝廷还没冷透')
        expect(hint).toContain('暗线尚差')
        expect(hint).toContain('信任尚差')
    })

    it('explains that proxy does not apply to external warlords', () => {
        const npc = useGameStore.getState().npcs.find(item => item.id === 'ansiming')!

        const hint = getSchemeUnlockHint({
            schemeType: 'proxy',
            npc,
            round: 9,
            unlockedSecrets: 2,
        })

        expect(hint).toContain('借刀是收网的手段，不是造势的手段')
    })

    it('shows proxy as locked on non-executor court NPCs', () => {
        const npc = INITIAL_NPCS.find(item => item.id === 'linghuelvguang')!

        const hint = getSchemeUnlockHint({
            schemeType: 'proxy',
            npc,
            round: 8,
            unlockedSecrets: 2,
        })

        expect(hint).toContain('借刀是收网的手段，不是造势的手段')
    })

    it('keeps proxy related targets limited to active court disposition targets in source', () => {
        expect(schemePanelSource).toContain("selectedScheme === 'proxy'")
        expect(schemePanelSource).toContain('isCourtDispositionTarget(npc)')
        expect(schemePanelSource).toContain("getCourtStatus(npc) === 'active'")
    })

    it('drops stale related targets when the selected scheme no longer needs one', () => {
        expect(schemePanelSource).toContain('if (!scheme.needsSecondTarget) setRelatedNpcId(null)')
        expect(schemePanelSource).toContain('const effectiveRelatedNpcId = currentSchemeData?.needsSecondTarget ? relatedNpcId : null')
        expect(schemePanelSource).toContain('relatedNpcId: effectiveRelatedNpcId ?? undefined')
    })

    it('references locked copy and the current round public stance in source', () => {
        expect(schemePanelSource).toContain('未解锁')
        expect(schemePanelSource).toContain('本回合公开表态')
        expect(schemePanelSource).toContain('const selectedRoundReaction = selectedNpc')
        expect(schemePanelSource).toContain('getNpcRoundReaction(currentRound, selectedNpc, selectedUnlockedSecrets, {')
        expect(schemePanelSource).toContain('shuCampaignState: shuCampaign.resolvedState ?? shuCampaign.state')
    })
    it('filters secessionist external warlords out of the target list in source', () => {
        expect(schemePanelSource).toContain("const aliveNpcs = npcs.filter(n => n.isAlive && !isTerminalExternalNpc(n) && getCourtStatus(n) === 'active')")
        expect(schemePanelSource).toContain("import { isExternalEscalationOpen, isTerminalExternalNpc } from '../../game/externalStatus'")
        expect(schemePanelSource).toContain("!npc.isAlive || !isExternalEscalationOpen(npc.externalStatus)")
    })
})

describe('SchemePanel execution path', () => {
    it('starts preliminary statement-only NPC reply generation inside the scheme page execution path', () => {
        expect(schemePanelSource).toContain('chatCompletion(')
        expect(schemePanelSource).toContain('buildNpcPrompt({')
        expect(schemePanelSource).toContain("followUpMode: 'statement_only'")
        expect(schemePanelSource).toContain('forceStatementReplyText(')
    })
})
