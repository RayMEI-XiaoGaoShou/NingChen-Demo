import { beforeEach, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { buildSchemeSpeechPayload, getSchemeSpeechFields, getSchemeUnlockHint, SchemePanel } from './SchemePanel'
import schemePanelSource from './SchemePanel.tsx?raw'
import { useGameStore } from '../../stores/gameStore'
import { getOmenGuidePresentation } from '../../game/omenGuide'
import { buildOmenTargetHint } from '../../game/omenTargetHint'

describe('SchemePanel layout labels', () => {
    beforeEach(() => {
        useGameStore.getState().resetGame()
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
        expect(fields.helperText).toContain('先给征兆')
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
        expect(hint).toContain('对朝廷忠诚仍偏高')
        expect(hint).toContain('暗线')
        expect(hint).toContain('还差')
    })

    it('references locked copy and the current round public stance in source', () => {
        expect(schemePanelSource).toContain('未解锁')
        expect(schemePanelSource).toContain('本回合公开表态')
        expect(schemePanelSource).toContain('getNpcRoundReaction(currentRound, selectedNpc, intelProgress[selectedNpc.id] ?? 0, {')
        expect(schemePanelSource).toContain('shuCampaignState: shuCampaign.resolvedState ?? shuCampaign.state')
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
