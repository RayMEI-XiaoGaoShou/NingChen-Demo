// ========================================
// 施计操作页
// 非阻塞模式：施计后立刻进入下一次
// AI 在后台异步生成 NPC 反馈
// ========================================

import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import {
    EXTERNAL_LINE_TEACHING_CONTENT,
    FIRST_OMEN_TEACHING_CONTENT,
    SCHEME_MASTER_GUIDE_CONTENT,
} from '../../data/prologueContent'
import { SCHEMES, getSchemeByType } from '../../data/schemes'
import { getOmenGuidePresentation } from '../../game/omenGuide'
import { buildOmenTargetHint } from '../../game/omenTargetHint'
import { getDifficultyProfile } from '../../game/difficulty'
import { isExternalEscalationOpen, isTerminalExternalNpc } from '../../game/externalStatus'
import { getTrustLabel, getTrustLevel } from '../../game/types'
import { fallbackNorthParseFromSpeech, parseNorthSchemeInput } from '../../game/aiNativeEngine'
import { recordAiGameMasterDebug } from '../../game/aiGameMasterDebug'
import { buildNpcPromptDynamicContext } from '../../game/npcPromptContext'
import { getRoundCampaignEventContext } from '../../game/campaignDisplayEngine'
import { getAvailableSchemesForNpc, previewSchemeSuccess } from '../../game/schemeEngine'
import { forceStatementReplyText } from '../../game/schemeFollowUp'
import { getHighlightedNpcIds, getNpcRoundReaction } from '../../game/roundIntelEngine'
import { buildExternalLineProgress } from '../../game/externalLineProgress'
import {
    explainExternalActionUnlock,
    getExternalMilitaryPostureLabel,
    getExternalPostureLabel as getSharedExternalPostureLabel,
    getExternalTiltLabel as getSharedExternalTiltLabel,
} from '../../game/explainability'
import { isOmenAvailableForNpc, roundSupportsExternalAction } from '../../data/roundRuleConfig'
import { clearSchemeReplyPrefetch, markSchemeReplyPrefetchStarted } from '../../game/schemeReplyPrefetch'
import {
    getCourtDispositionOpportunity as getCoreCourtDispositionOpportunity,
    isCourtDispositionExecutor as isCourtDispositionExecutorId,
    isCourtDispositionTarget as isCourtDispositionTargetId,
    normalizeCourtDispositionNpc,
} from '../../game/courtDisposition'
import { chatCompletion, getAiModeLabel } from '../../ai/aiService'
import { buildNpcPrompt, sanitizeNpcReplyText } from '../../ai/prompts'
import { FengDaozhiAssistPanel } from './FengDaozhiAssistPanel'
import { OmenTeachingModal } from './OmenTeachingModal'
import { NpcPortrait } from '../NpcPortrait/NpcPortrait'
import { SchemeOnboardingModal } from './SchemeOnboardingModal'
import { PageUtilityActions } from '../PageUtilityActions/PageUtilityActions'
import { getNpcDetailAvatarPath } from '../../data/mediaAssets'
import type { FengDaozhiDraftResult, GameDifficulty, NPC, OmenSpeechInput, SchemeType, SchemeAction } from '../../game/types'
import './SchemePanel.css'

export interface SchemeSpeechFields {
    mode: 'single' | 'omen'
    primaryLabel: string
    secondaryLabel?: string
    helperText: string
}

export function getSchemeSpeechFields(selectedScheme: SchemeType | null): SchemeSpeechFields {
    if (selectedScheme === 'omen') {
        return {
            mode: 'omen',
            primaryLabel: '谶辞 / 征兆',
            secondaryLabel: '解释 / 指向',
            helperText: '先编征兆，再指出它动摇了哪一层名分根基，最后暗示谁最该被天命所弃。谶纬不是指着人骂——是借天意的名义来拆人的根基。',
        }
    }

    return {
        mode: 'single',
        primaryLabel: '补一句说辞',
        helperText: '说辞若切中此人的立场与心结，不只决定成败，还决定这一手究竟是当回合直接削弱北周国力，还是先埋下一条日后才会发作的结构裂痕。',
    }
}

function getExternalTiltLabel(alignmentBias: 'emperor' | 'empress' | 'swing' | 'self'): string { return getSharedExternalTiltLabel(alignmentBias) }

function getExternalPostureLabel(externalStatus: 'loyal' | 'watchful' | 'secession' | 'rebellion', loyaltyToCourt: number, alignmentBias: 'emperor' | 'empress' | 'swing' | 'self'): string { return getSharedExternalPostureLabel({ powerBase: 'external', externalStatus, loyaltyToCourt, alignmentBias }) }

type CourtStatus = 'active' | 'dismissed' | 'executed'
type CourtDispositionNpc = NPC & { courtStatus?: CourtStatus }

function isCourtDispositionExecutor(npc: NPC): boolean {
    return isCourtDispositionExecutorId(npc.id)
}

function isCourtDispositionTarget(npc: NPC): boolean {
    return isCourtDispositionTargetId(npc.id)
}

function shouldShowEmbeddedScheme(scheme: (typeof SCHEMES)[number], npc: NPC): boolean {
    if (npc.powerBase === 'external') {
        return scheme.type !== 'proxy' && scheme.type !== 'appeal'
    }

    if (scheme.targetScope === 'externalOnly') return false
    if (scheme.type === 'proxy') return isCourtDispositionExecutor(npc)

    return true
}

function renderEmbeddedSectionLabel(step: '壹' | '贰', label: string, trailing?: ReactNode) {
    return (
        <div className="scheme-section-label">
            <span className="scheme-section-step-badge">{step}</span>
            <span className="scheme-section-label-text">{label}</span>
            {trailing ? <span className="scheme-section-label-trailing">{trailing}</span> : null}
        </div>
    )
}

function getCourtStatus(npc: NPC): CourtStatus {
    return (npc as CourtDispositionNpc).courtStatus ?? 'active'
}

function getEmbeddedTargetTitle(npc: NPC | null | undefined): string {
    if (!npc) return '官职'
    if (npc.id === 'zongai') return `${npc.title}【代言皇帝】`
    if (npc.id === 'hebaqi' || npc.id === 'hebaqí') return `${npc.title}【后党魁首】`
    return npc.title
}

function getCourtDispositionOpportunity(npc: NPC) {
    return getCoreCourtDispositionOpportunity(normalizeCourtDispositionNpc(npc))
}

function resolveExternalLineAction(
    npc: NPC,
    schemeType: SchemeType | null,
): 'secession' | 'rebellion' {
    if (schemeType === 'rebellion') return 'rebellion'
    if (schemeType === 'secession') return 'secession'
    return npc.highActionBias === 'rebellion' ? 'rebellion' : 'secession'
}

function buildExternalSchemeProgress(params: {
    npc: NPC
    schemeType: SchemeType | null
    round: number
    unlockedSecrets: number
    difficulty?: GameDifficulty
}) {
    if (params.npc.powerBase !== 'external') return null

    const action = resolveExternalLineAction(params.npc, params.schemeType)

    return buildExternalLineProgress({
        npc: { ...params.npc, highActionBias: action },
        unlockedSecrets: params.unlockedSecrets,
        difficulty: params.difficulty ?? 'normal',
        round: params.round,
        externalActionEnabled: roundSupportsExternalAction(params.round, action),
    })
}

function buildExternalSchemeWhisper(npc: NPC, unlockedSecrets: number, progress: NonNullable<ReturnType<typeof buildExternalSchemeProgress>>): string {
    const unlock = explainExternalActionUnlock({
        trustGap: progress.trustGap,
        loyaltyGap: progress.loyaltyGap,
        secretsGap: progress.secretsGap,
        roundWindowOpen: progress.windowOpen,
    })

    if (unlock.unlocked) {
        return `冯道之密语：${npc.name} 这条线，眼下卡在「可动之时」。条件已齐：信任够了、忠心已冷、暗线已明。眼下正是逼他走向 ${progress.targetLabel} 的时候——再拖下去，变数只会更多。下一手宜 ${progress.nextMoveLabel}。`
    }

    if (progress.trustGap > 0) {
        return `冯道之密语：${npc.name} 这条线，眼下卡在「养信」。离 ${progress.targetLabel} 还卡在第一步：信任尚差 ${progress.trustGap} 点。暗线已明 ${unlockedSecrets}/${unlockedSecrets + progress.secretsGap}，路还长。下一手宜 ${progress.nextMoveLabel}。`
    }

    if (progress.secretsGap > 0) {
        return `冯道之密语：${npc.name} 这条线，眼下卡在「探暗线」。信任已够，但底牌还没摸透——还差 ${progress.secretsGap} 条暗线。${npc.name} 最不肯明说的那层心思，不挖出来，${progress.targetLabel} 便无从谈起。下一手宜 ${progress.nextMoveLabel}。`
    }

    if (progress.loyaltyGap > 0) {
        return `冯道之密语：${npc.name} 这条线，眼下卡在「离心」。${npc.name} 已肯听你，底牌也露了大半，唯独对朝廷还没冷透。再压 ${progress.loyaltyGap} 点忠诚，才到试 ${progress.targetLabel} 的时候。下一手宜 ${progress.nextMoveLabel}。`
    }

    return `冯道之密语：${npc.name} 这条线，眼下卡在「等窗口」。信任已够，忠心已冷，底牌已摸清——万事俱备，只差一个能逼他摊牌的时局窗口。下一手宜 ${progress.nextMoveLabel}。`
}

function buildSchemeRoleHint(params: {
    schemeType: SchemeType | null
    npc: NPC
    relatedNpc: NPC | null
}): string | null {
    const { schemeType, npc, relatedNpc } = params
    if (!schemeType) return null

    if (npc.powerBase === 'court') {
        if ((schemeType === 'slander' || schemeType === 'alienate') && relatedNpc) {
            return '此时若施谗言或离间，更容易先撬动他与同僚之间的疑心，再顺势影响他的皇帝恩宠或太后眷顾。'
        }

        if (schemeType === 'frame') {
            return '此时若设局嫁祸，最重的嫌疑更容易落回他自己头上——不需要你出面指证。'
        }

        if (schemeType === 'proxy' && relatedNpc && isCourtDispositionTarget(relatedNpc)) {
            return getCourtDispositionOpportunity(relatedNpc) === 'safe'
                ? '借刀是收网的手段，不是造势的手段。目标在御前、帘前两边的庇护还没压到线下，网便收不拢。先去拆他的庇护，再来谈借刀。'
                : '此人离罢黜之线已只剩一步。再压一层庇护，便可借刀收网。'
        }

        return null
    }

    if (schemeType === 'advise') {
        return '继续献策的话，主要是提升他对你的信任，同时也可能壮大他的兵势。'
    }

    if (schemeType === 'omen') {
        return '用谶纬的话，更容易引起朝廷对他的猜疑——忠诚会明显下降，兵势也会小幅削弱。'
    }

    if (schemeType === 'slander' || schemeType === 'alienate' || schemeType === 'frame') {
        return '继续施谗言或离间的话，主要是压低他对朝廷的忠诚，但还不至于直接逼他造反。'
    }

    return null
}

export function buildSchemeSpeechPayload(params: {
    schemeType: SchemeType
    speech: string
    omenSpeechInput?: OmenSpeechInput
}): Pick<SchemeAction, 'playerSpeech' | 'omenSpeechInput'> {
    if (params.schemeType === 'omen') {
        const omenText = params.omenSpeechInput?.omenText?.trim() ?? ''
        const interpretationText = params.omenSpeechInput?.interpretationText?.trim() ?? ''
        return {
            playerSpeech: [omenText, interpretationText].filter(Boolean).join('\n\n'),
            omenSpeechInput: {
                omenText,
                interpretationText,
            },
        }
    }

    return {
        playerSpeech: params.speech,
        omenSpeechInput: undefined,
    }
}

export function getSchemeUnlockHint(params: {
    schemeType: SchemeType
    npc: NPC
    round: number
    unlockedSecrets: number
    difficulty?: GameDifficulty
}): string {
    const { schemeType, npc, round, unlockedSecrets, difficulty = 'normal' } = params
    const scheme = getSchemeByType(schemeType)
    if (!scheme) return ''

    if (schemeType === 'proxy' && !isCourtDispositionExecutor(npc)) {
        return '未解锁：借刀是收网的手段，不是造势的手段。目标在御前、帘前两边的庇护还没压到线下，网便收不拢。先去拆他的庇护，再来谈借刀。'
    }

    if (scheme.targetScope === 'externalOnly' && npc.powerBase !== 'external') {
        return '未解锁：此计只可对地方军头施用，朝堂人物另有路数。'
    }

    if (round === 1 && !['probe', 'advise', 'slander'].includes(schemeType)) {
        return '未解锁：首回合仅开放试探、献策、谗言。'
    }

    if (schemeType === 'omen') {
        if (npc.powerBase !== 'court') {
            return '未解锁：谶纬只可对朝堂人物施用，地方军头另有路数。'
        }

        if (!isOmenAvailableForNpc(round, npc)) {
            return '未解锁：这一回合既无灾异可借、也无名分裂缝可乘，谶纬便无从落笔。等一个天象有变或人心生疑的回合再来。'
        }
    }

    if (schemeType === 'secession' || schemeType === 'rebellion') {
        if (!npc.isAlive || !isExternalEscalationOpen(npc.externalStatus)) {
            return `未解锁：当前态势已无法再沿${schemeType === 'rebellion' ? '造反' : '割据'}线推进。`
        }

        const progress = buildExternalSchemeProgress({
            npc,
            schemeType,
            round,
            unlockedSecrets,
            difficulty,
        })

        if (!progress) {
            return '未解锁：人、心、底牌、时机——四样缺一不可。'
        }

        const unlock = explainExternalActionUnlock({
            trustGap: progress.trustGap,
            loyaltyGap: progress.loyaltyGap,
            secretsGap: progress.secretsGap,
            roundWindowOpen: progress.windowOpen,
        })

        return unlock.unlocked ? '' : unlock.summary
    }

    const trustGap = Math.max(0, scheme.trustThreshold - npc.trust)
    if (trustGap > 0) {
        return `未解锁：还差 ${trustGap} 点信任。`
    }

    return ''
}

export interface SchemeComposerProps {
    mode?: 'standalone' | 'embedded'
    lockedNpcId?: string | null
    initialSchemeType?: SchemeType | null
    onChangeTarget?: () => void
    onAfterSubmit?: (result: SchemeSubmitResult) => void
}

export interface SchemeSubmitResult {
    targetNpcId: string
    targetPowerBase: NPC['powerBase']
    schemeCountAfterSubmit: number
    maxSchemes: number
}

export function useSchemeComposer({
    mode = 'standalone',
    lockedNpcId = null,
    initialSchemeType = null,
    onChangeTarget,
    onAfterSubmit,
}: SchemeComposerProps = {}) {
    return {
        mode,
        lockedNpcId,
        initialSchemeType,
        onChangeTarget,
        onAfterSubmit,
        isEmbedded: mode === 'embedded',
    }
}

export function SchemeComposer(props: SchemeComposerProps = {}) {
    const composer = useSchemeComposer(props)
    const { isEmbedded, lockedNpcId, initialSchemeType, onAfterSubmit } = composer
    const {
        currentRound,
        difficulty,
        schemeCount,
        maxSchemes,
        addScheme,
        completeSchemingIfReady,
        prevPhase,
        npcs,
        factions,
        intelProgress,
        currentSchemes,
        addNpcFeedback,
        updateNpcFeedback,
        markSchemeParsePending,
        updateSchemeParse,
        recentBacklash,
        roundHistory,
        npcMemoryLedger,
        relationMemoryLedger,
        firstRoundGuideSeen,
        schemeOnboardingSeen,
        markFirstRoundGuideSeen,
        markSchemeOnboardingSeen,
        omenGuideSeen,
        markOmenGuideSeen,
        openGameplayGuide,
        fengDaozhiAssistsRemaining,
        playerDangerStage,
        requestFengDaozhiDraft,
        shuCampaign,
        huainanCampaign,
    } = useGameStore()
    const [selectedNpcId, setSelectedNpcId] = useState<string | null>(lockedNpcId ?? null)
    const [targetLockedFromCourt, setTargetLockedFromCourt] = useState(Boolean(lockedNpcId))
    const [selectedScheme, setSelectedScheme] = useState<SchemeType | null>(initialSchemeType ?? null)
    const [relatedNpcId, setRelatedNpcId] = useState<string | null>(null)
    const [relatedPickerOpen, setRelatedPickerOpen] = useState(Boolean(initialSchemeType && getSchemeByType(initialSchemeType)?.needsSecondTarget))
    const [speech, setSpeech] = useState('')
    const [omenText, setOmenText] = useState('')
    const [interpretationText, setInterpretationText] = useState('')
    const [justSubmitted, setJustSubmitted] = useState(false)
    const [showSchemeGuide, setShowSchemeGuide] = useState(false)
    const [fengDraftPreview, setFengDraftPreview] = useState<FengDaozhiDraftResult | null>(null)
    const [fengDraftLoading, setFengDraftLoading] = useState(false)

    useEffect(() => {
        if (!initialSchemeType) return

        setSelectedScheme(initialSchemeType)
        setRelatedNpcId(null)
        setRelatedPickerOpen(Boolean(getSchemeByType(initialSchemeType)?.needsSecondTarget))
        setSpeech('')
        setOmenText('')
        setInterpretationText('')
        setFengDraftPreview(null)
    }, [initialSchemeType, lockedNpcId])

    const selectedNpc = npcs.find(n => n.id === selectedNpcId)
    const relatedNpc = npcs.find(n => n.id === relatedNpcId) ?? null
    const usedNpcIds = useMemo(() => new Set(currentSchemes.map(scheme => scheme.targetNpcId)), [currentSchemes])
    const aliveNpcs = npcs.filter(n => n.isAlive && !isTerminalExternalNpc(n) && getCourtStatus(n) === 'active')
    const highlightedNpcIds = new Set(getHighlightedNpcIds(currentRound, npcs))
    const availableSchemeTypes = selectedNpc
        ? getAvailableSchemesForNpc(selectedNpc, {
            round: currentRound,
            unlockedSecrets: intelProgress[selectedNpc.id] ?? 0,
        })
        : []
    const currentSchemeData = selectedScheme ? getSchemeByType(selectedScheme) : undefined
    const needsRelatedTarget = Boolean(currentSchemeData?.needsSecondTarget)
    const speechReady = Boolean(selectedScheme && (!needsRelatedTarget || (relatedNpcId && !relatedPickerOpen)))
    const isRelatedSelectionPending = Boolean(selectedScheme && needsRelatedTarget && (!relatedNpcId || relatedPickerOpen))
    const isReopeningRelated = Boolean(selectedScheme && needsRelatedTarget && relatedNpcId && relatedPickerOpen)
    const currentRoundEvent = getRoundCampaignEventContext(currentRound, shuCampaign, huainanCampaign)
    const omenGuidePresentation = getOmenGuidePresentation({
        round: currentRound,
        difficulty,
        firstRoundGuideSeen,
        schemeOnboardingSeen,
        omenGuideSeen,
    })
    const shouldShowOmenGuide = !isEmbedded && omenGuidePresentation === 'modal'
    const shouldShowOmenInlineHint = omenGuidePresentation === 'inline'
    const shouldShowSchemeGuide =
        !isEmbedded &&
        !shouldShowOmenGuide &&
        (((!schemeOnboardingSeen.scheme_master_guide && currentRound === 1) || showSchemeGuide))
    const shouldShowExternalLineGuide =
        !isEmbedded &&
        !shouldShowSchemeGuide &&
        !shouldShowOmenGuide &&
        currentRound === 1 &&
        aliveNpcs.some(npc => npc.powerBase === 'external') &&
        !schemeOnboardingSeen.first_external_line_teaching

    useEffect(() => {
        if (!isEmbedded) return
        if (!lockedNpcId) {
            setSelectedNpcId(null)
            setTargetLockedFromCourt(false)
            return
        }

        const entryNpc = npcs.find(npc => npc.id === lockedNpcId)
        const canUseEntryNpc =
            entryNpc?.isAlive &&
            !isTerminalExternalNpc(entryNpc) &&
            getCourtStatus(entryNpc) === 'active' &&
            !usedNpcIds.has(entryNpc.id)

        if (entryNpc && canUseEntryNpc) {
            setSelectedNpcId(entryNpc.id)
            setSelectedScheme(initialSchemeType ?? null)
            setRelatedNpcId(null)
            setRelatedPickerOpen(Boolean(initialSchemeType && getSchemeByType(initialSchemeType)?.needsSecondTarget))
            setSpeech('')
            setOmenText('')
            setInterpretationText('')
            setFengDraftPreview(null)
            setTargetLockedFromCourt(true)
        }
    }, [isEmbedded, lockedNpcId, initialSchemeType, npcs, usedNpcIds])
    const speechFields = getSchemeSpeechFields(selectedScheme)
    const omenTargetHint =
        selectedScheme === 'omen' && selectedNpc
            ? buildOmenTargetHint({ npc: selectedNpc })
            : null
    const selectedUnlockedSecrets = selectedNpc ? intelProgress[selectedNpc.id] ?? 0 : 0
    const selectedKnownIntel = selectedNpc
        ? selectedNpc.secretThreads.slice(0, selectedUnlockedSecrets)
        : []
    const selectedRoundReaction = selectedNpc
        ? getNpcRoundReaction(currentRound, selectedNpc, selectedUnlockedSecrets, {
            shuCampaignState: shuCampaign.resolvedState ?? shuCampaign.state,
            huainanCampaignState: huainanCampaign.resolvedState ?? huainanCampaign.state,
        })
        : ''
    const selectedExternalProgress = useMemo(() => {
        if (!selectedNpc || selectedNpc.powerBase !== 'external') return null
        return buildExternalSchemeProgress({
            npc: selectedNpc,
            schemeType: selectedScheme,
            unlockedSecrets: selectedUnlockedSecrets,
            difficulty,
            round: currentRound,
        })
    }, [currentRound, difficulty, selectedNpc, selectedScheme, selectedUnlockedSecrets])
    const fengAssistTotal = getDifficultyProfile(difficulty).onboarding.fengDaozhiAssistsPerRound
    const selectedSchemeDescription = currentSchemeData?.description ?? ''
    const selectedRoleHint = selectedNpc
        ? buildSchemeRoleHint({
            schemeType: selectedScheme,
            npc: selectedNpc,
            relatedNpc,
        })
        : null
    const leverageChips = selectedNpc
        ? [
            `打动：${selectedNpc.softSpot}`,
            `激怒：${selectedNpc.triggerPoint}`,
        ]
        : []
    const relatedNpcCandidates = currentSchemeData?.needsSecondTarget
        ? selectedScheme === 'proxy'
            ? aliveNpcs.filter(npc => npc.id !== selectedNpcId && isCourtDispositionTarget(npc) && getCourtStatus(npc) === 'active')
            : aliveNpcs.filter(npc => npc.id !== selectedNpcId)
        : []

    const schemeNames: Record<string, string> = {
        probe: '试探',
        advise: '献策',
        slander: '谗言',
        alienate: '离间',
        frame: '设局嫁祸',
        proxy: '借刀',
        appeal: '求援',
        omen: '谶纬',
        secession: '煽动割据',
        rebellion: '煽动造反',
    }

    const createActionId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const handleFengDaozhiDraft = async () => {
        if (!selectedNpcId || !selectedScheme || fengDaozhiAssistsRemaining <= 0 || fengDraftLoading) return
        const effectiveRelatedNpcId = currentSchemeData?.needsSecondTarget ? relatedNpcId : null

        setFengDraftLoading(true)
        try {
            const draft = await requestFengDaozhiDraft({
                round: currentRound,
                difficulty,
                targetNpcId: selectedNpcId,
                schemeType: selectedScheme,
                playerDangerStage,
                relatedNpcId: effectiveRelatedNpcId ?? undefined,
                omenSpeechInput: selectedScheme === 'omen'
                    ? { omenText, interpretationText }
                    : undefined,
            })

            if (!draft) return

            setFengDraftPreview(draft)
            if (selectedScheme === 'omen') {
                setOmenText(draft.primaryText)
                setInterpretationText(draft.secondaryText ?? '')
                setSpeech([draft.primaryText, draft.secondaryText].filter(Boolean).join('\n\n'))
            } else {
                setSpeech(draft.primaryText)
            }
        } finally {
            setFengDraftLoading(false)
        }
    }

    const handleExecute = async () => {
        if (!selectedNpcId || !selectedScheme || !selectedNpc) return
        const effectiveRelatedNpcId = currentSchemeData?.needsSecondTarget ? relatedNpcId : null
        const actionId = createActionId()
        const resolutionRoll = Math.random()
        const speechPayload = buildSchemeSpeechPayload({
            schemeType: selectedScheme,
            speech,
            omenSpeechInput: selectedScheme === 'omen'
                ? { omenText, interpretationText }
                : undefined,
        })

        const action: SchemeAction = {
            id: actionId,
            targetNpcId: selectedNpcId,
            schemeType: selectedScheme,
            relatedNpcId: effectiveRelatedNpcId ?? undefined,
            playerSpeech: speechPayload.playerSpeech,
            omenSpeechInput: speechPayload.omenSpeechInput,
            resolutionRoll,
        }

        addScheme(action)
        markSchemeParsePending(actionId)
        const schemeCountAfterSubmit = schemeCount + 1

        const schemeName = schemeNames[selectedScheme] || selectedScheme

        addNpcFeedback({
            id: actionId,
            npcId: selectedNpcId,
            npcName: selectedNpc.name,
            schemeType: selectedScheme,
            schemeName,
            playerSpeech: speechPayload.playerSpeech,
            feedback: '',
            isLoading: true,
            source: getAiModeLabel(),
        })

        const npcSnapshot = { ...selectedNpc }
        const speechSnapshot = speechPayload.playerSpeech
        const relatedNpcSnapshot = effectiveRelatedNpcId ? npcs.find(npc => npc.id === effectiveRelatedNpcId) ?? null : null
        const previousActions = currentSchemes.filter(item => item.targetNpcId === selectedNpcId).length
        const knownSecretThreads = npcSnapshot.secretThreads.slice(0, intelProgress[npcSnapshot.id] ?? 0)
        const dynamicContext = buildNpcPromptDynamicContext({
            npc: npcSnapshot,
            factions,
            roundHistory,
            recentBacklash,
            npcMemoryLedger,
            relationMemoryLedger,
            relatedNpcId: relatedNpcSnapshot?.id,
            currentRound,
            schemeType: action.schemeType,
        })

        const generatePreliminaryReply = async (parsed: SchemeAction['northParse']) => {
            if (!parsed) return
            const success = previewSchemeSuccess(
                { ...action, northParse: parsed },
                npcSnapshot,
                previousActions,
                resolutionRoll,
                {
                    round: currentRound,
                    unlockedSecrets: intelProgress[npcSnapshot.id] ?? 0,
                    northParse: parsed,
                },
            )

            markSchemeReplyPrefetchStarted(actionId)
            try {
                const reply = await chatCompletion(
                    buildNpcPrompt({
                        npc: npcSnapshot,
                        schemeType: action.schemeType,
                        speech: speechSnapshot,
                        success,
                        relatedNpc: relatedNpcSnapshot,
                        northParse: parsed,
                        followUpMode: 'statement_only',
                        round: currentRound,
                        eventName: currentRoundEvent.eventName,
                        eventBriefing: currentRoundEvent.eventBriefing,
                        knownSecretThreads,
                        previousDealings: dynamicContext.previousDealings,
                        relationshipTemperature: dynamicContext.relationshipTemperature,
                        recentCourtFortune: dynamicContext.recentCourtFortune,
                        factionPressure: dynamicContext.factionPressure,
                        longTermMemorySummary: dynamicContext.longTermMemorySummary,
                        relationMemorySummary: dynamicContext.relationMemorySummary,
                    }),
                    {
                        temperature: 0.75,
                        maxTokens: 420,
                        tag: `npc_pre_${action.schemeType}_${success ? 'success' : 'failure'}`,
                    },
                )
                const cleanedReply = forceStatementReplyText(sanitizeNpcReplyText(reply.trim()))
                const feedbackStillLoading = useGameStore.getState().npcFeedbacks
                    .find(item => item.id === actionId)?.isLoading
                if (feedbackStillLoading) {
                    updateNpcFeedback(actionId, cleanedReply || `${npcSnapshot.name}听罢，只把话收住，暂未露出更多声色。`, getAiModeLabel())
                }
            } catch {
                const feedbackStillLoading = useGameStore.getState().npcFeedbacks
                    .find(item => item.id === actionId)?.isLoading
                if (feedbackStillLoading) {
                    updateNpcFeedback(actionId, `${npcSnapshot.name}听罢，只把话收住，暂未露出更多声色。`, '本地兜底')
                }
            } finally {
                clearSchemeReplyPrefetch(actionId)
            }
        }

        void parseNorthSchemeInput({
            round: currentRound,
            npc: npcSnapshot,
            schemeType: selectedScheme,
            speech: speechSnapshot,
            relatedNpc: relatedNpcSnapshot,
            omenSpeechInput: speechPayload.omenSpeechInput,
            eventName: currentRoundEvent.eventName,
            eventBriefing: currentRoundEvent.eventBriefing,
        }).then(parsed => {
            updateSchemeParse(actionId, parsed)
            void generatePreliminaryReply(parsed)
        }).catch(() => {
            const fallbackParsed = fallbackNorthParseFromSpeech({
                speech: speechSnapshot,
                npc: npcSnapshot,
                round: currentRound,
                schemeType: selectedScheme,
                relatedNpc: relatedNpcSnapshot,
                omenSpeechInput: speechPayload.omenSpeechInput,
                eventName: currentRoundEvent.eventName,
                eventBriefing: currentRoundEvent.eventBriefing,
            })
            recordAiGameMasterDebug({
                chain: 'north_scheme',
                source: 'fallback',
                round: currentRound,
                npcId: npcSnapshot.id,
                npcName: npcSnapshot.name,
                schemeType: selectedScheme,
                summary: `${npcSnapshot.name} · ${selectedScheme}`,
                notes: ['parseNorthSchemeInput threw during scheme-page preparse; local fallback was used.'],
            })
            updateSchemeParse(actionId, fallbackParsed)
            void generatePreliminaryReply(fallbackParsed)
        })

        setJustSubmitted(true)
        setTimeout(() => {
            setSelectedNpcId(null)
            setSelectedScheme(null)
            setRelatedNpcId(null)
            setRelatedPickerOpen(false)
            setSpeech('')
            setOmenText('')
            setInterpretationText('')
            setFengDraftPreview(null)
            setTargetLockedFromCourt(false)
            setJustSubmitted(false)

            onAfterSubmit?.({
                targetNpcId: selectedNpcId,
                targetPowerBase: selectedNpc.powerBase,
                schemeCountAfterSubmit,
                maxSchemes,
            })
            if (schemeCountAfterSubmit >= maxSchemes) {
                completeSchemingIfReady()
            }
        }, 800)
    }

    const renderEmbeddedSchemeOptions = () => (
        <div className="scheme-select-grid scheme-vertical-grid">
            {selectedNpc && SCHEMES.map(scheme => {
                if (!shouldShowEmbeddedScheme(scheme, selectedNpc)) return null
                const available = scheme.type === 'proxy'
                    ? availableSchemeTypes.includes(scheme.type) && isCourtDispositionExecutor(selectedNpc)
                    : availableSchemeTypes.includes(scheme.type)
                const unlockHint = available
                    ? undefined
                    : getSchemeUnlockHint({
                        schemeType: scheme.type,
                        npc: selectedNpc,
                        round: currentRound,
                        unlockedSecrets: intelProgress[selectedNpc.id] ?? 0,
                        difficulty,
                    })

                return (
                    <div
                        key={scheme.type}
                        className={`scheme-btn-shell scheme-vertical-shell ${!available ? 'locked' : ''}`}
                        title={unlockHint}
                        aria-label={unlockHint}
                    >
                        <button
                            className={`scheme-art-token scheme-vertical-btn ${selectedScheme === scheme.type ? 'selected' : ''} ${!available ? 'disabled' : ''}`}
                            data-scheme-type={scheme.type}
                            disabled={!available}
                            onClick={() => {
                                setSelectedScheme(scheme.type)
                                setRelatedNpcId(null)
                                setRelatedPickerOpen(scheme.needsSecondTarget)
                                setSpeech('')
                                setOmenText('')
                                setInterpretationText('')
                                setFengDraftPreview(null)
                            }}
                        >
                            <span className="scheme-vertical-name">{scheme.name}</span>
                            {!available && <span className="scheme-lock">未解锁</span>}
                        </button>
                    </div>
                )
            })}
        </div>
    )

    const renderEmbeddedRelatedSelector = () => {
        if (!needsRelatedTarget) return null

        if (relatedNpc && !relatedPickerOpen) {
            const avatarPath = getNpcDetailAvatarPath(relatedNpc.id)
            return (
                <div className="scheme-related-inline scheme-related-inline-collapsed">
                    <button
                        type="button"
                        className="scheme-related-switch"
                        onClick={() => {
                            setRelatedPickerOpen(true)
                            setFengDraftPreview(null)
                        }}
                    >
                        切换关联人物
                    </button>
                    <span className="scheme-related-current" aria-label={`当前关联人物：${relatedNpc.name}`}>
                        <span className="scheme-related-current-frame" aria-hidden="true">
                            {avatarPath ? (
                                <img src={avatarPath} alt="" className="scheme-related-current-img" />
                            ) : (
                                <span className="scheme-related-current-fallback">{relatedNpc.name.slice(0, 1)}</span>
                            )}
                        </span>
                        <span className="scheme-related-current-name">{relatedNpc.name}</span>
                    </span>
                </div>
            )
        }

        return (
            <div className="scheme-related-inline">
                <span className="scheme-related-title">关联人物</span>
                <div className="scheme-related-inline-list">
                    {relatedNpcCandidates.map(npc => {
                        const avatarPath = getNpcDetailAvatarPath(npc.id)
                        return (
                            <button
                                key={npc.id}
                                className={`scheme-related-avatar ${relatedNpcId === npc.id ? 'selected' : ''}`}
                                onClick={() => {
                                    setRelatedNpcId(npc.id)
                                    setRelatedPickerOpen(false)
                                    setFengDraftPreview(null)
                                }}
                                title={`${npc.name} · ${npc.title}`}
                            >
                                <span className="scheme-related-avatar-frame" aria-hidden="true">
                                    {avatarPath ? (
                                        <img src={avatarPath} alt="" className="scheme-related-avatar-img" />
                                    ) : (
                                        <span className="scheme-related-avatar-fallback">{npc.name.slice(0, 1)}</span>
                                    )}
                                </span>
                                <span className="scheme-related-avatar-name">{npc.name}</span>
                            </button>
                        )
                    })}
                </div>
                {selectedScheme === 'proxy' && relatedNpcCandidates.length === 0 && (
                    <p className="scheme-related-empty">
                        眼下没有仍在位、且可被罢黜或处决的朝臣目标。
                    </p>
                )}
            </div>
        )
    }

    const embeddedSpeechCount = selectedScheme === 'omen'
        ? null
        : `${speech.length}/100`

    const renderEmbeddedSpeechSupplement = () => (
        <section className={`scheme-speech-supplement ${speechReady ? 'is-ready' : 'is-empty'} ${isRelatedSelectionPending ? 'is-waiting-related' : ''} ${isReopeningRelated ? 'is-reopening-related' : ''}`}>
            {renderEmbeddedSectionLabel('贰', '说辞', speechReady && embeddedSpeechCount ? <span className="scheme-speech-label-count">{embeddedSpeechCount}</span> : null)}
            {speechReady ? (
                <div className="speech-input-wrapper scheme-embedded-speech-wrapper">
                    {speechFields.mode === 'omen' ? (
                        <div className="scheme-embedded-speech-field scheme-embedded-omen-field">
                            <div className="omen-inputs scheme-embedded-omen-inputs">
                                <label className="omen-input-group">
                                    <span className="scheme-embedded-omen-label-row">
                                        <span className="omen-input-label">{speechFields.primaryLabel}</span>
                                        <span className="scheme-embedded-omen-count">{omenText.length}/60</span>
                                    </span>
                                    <textarea
                                        className="speech-input omen-speech-input scheme-embedded-speech-input"
                                        value={omenText}
                                        onChange={e => setOmenText(e.target.value)}
                                        placeholder="先写一句谶辞、征兆或灾异异象……"
                                        maxLength={60}
                                    />
                                </label>
                                <label className="omen-input-group">
                                    <span className="scheme-embedded-omen-label-row">
                                        <span className="omen-input-label">{speechFields.secondaryLabel}</span>
                                        <span className="scheme-embedded-omen-count">{interpretationText.length}/100</span>
                                    </span>
                                    <textarea
                                        className="speech-input omen-speech-input scheme-embedded-speech-input"
                                        value={interpretationText}
                                        onChange={e => setInterpretationText(e.target.value)}
                                        placeholder="再解释它意味着什么，以及谁最该警惕……"
                                        maxLength={100}
                                    />
                                </label>
                            </div>
                            {selectedNpc && (
                                <FengDaozhiAssistPanel
                                    schemeType={selectedScheme!}
                                    remaining={fengDaozhiAssistsRemaining}
                                    total={fengAssistTotal}
                                    isLoading={fengDraftLoading}
                                    draftPreview={fengDraftPreview}
                                    showPreview={false}
                                    onDraft={handleFengDaozhiDraft}
                                />
                            )}
                        </div>
                    ) : (
                        <div className="scheme-embedded-speech-field">
                            <textarea
                                className="speech-input scheme-embedded-speech-input"
                                value={speech}
                                onChange={e => setSpeech(e.target.value)}
                                placeholder="写一句话作为你的说辞（选填）……"
                                maxLength={100}
                            />
                            {selectedNpc && (
                                <FengDaozhiAssistPanel
                                    schemeType={selectedScheme!}
                                    remaining={fengDaozhiAssistsRemaining}
                                    total={fengAssistTotal}
                                    isLoading={fengDraftLoading}
                                    draftPreview={fengDraftPreview}
                                    showPreview={false}
                                    onDraft={handleFengDaozhiDraft}
                                />
                            )}
                        </div>
                    )}
                </div>
            ) : selectedScheme && needsRelatedTarget ? (
                null
            ) : (
                <div className="scheme-speech-empty-hint">
                    先选一枚计牌，再补一句能落到此人心坎上的说辞。
                </div>
            )}
        </section>
    )

    const embeddedChoiceClassName = `scheme-embedded-choice-area ${isRelatedSelectionPending ? 'is-picking-related' : ''}`

    const renderEmbeddedWorkbench = () => (
        <div className={`scheme-embedded-board ${isRelatedSelectionPending ? 'is-waiting-related' : ''}`}>
            <section className={embeddedChoiceClassName}>
                {renderEmbeddedSectionLabel('壹', '选择计谋')}
                {renderEmbeddedSchemeOptions()}
                {selectedSchemeDescription ? (
                    <div className="scheme-description-panel">
                        {selectedSchemeDescription}
                    </div>
                ) : null}
                {renderEmbeddedRelatedSelector()}
            </section>
            {renderEmbeddedSpeechSupplement()}
        </div>
    )

    return (
        <div className={isEmbedded ? 'scheme-composer scheme-composer-embedded' : 'page-container scheme-panel page-enter'}>
            {shouldShowSchemeGuide && (
                <SchemeOnboardingModal
                    open
                    title={SCHEME_MASTER_GUIDE_CONTENT.title}
                    pages={SCHEME_MASTER_GUIDE_CONTENT.pages}
                    onClose={() => {
                        markFirstRoundGuideSeen('scheme_phase')
                        markSchemeOnboardingSeen('scheme_master_guide')
                        setShowSchemeGuide(false)
                    }}
                />
            )}

            {shouldShowOmenGuide && (
                <OmenTeachingModal
                    open
                    content={FIRST_OMEN_TEACHING_CONTENT}
                    onClose={() => {
                        markOmenGuideSeen()
                        markSchemeOnboardingSeen('first_omen_teaching')
                    }}
                />
            )}

            {shouldShowExternalLineGuide && (
                <SchemeOnboardingModal
                    open
                    title={EXTERNAL_LINE_TEACHING_CONTENT.title}
                    pages={EXTERNAL_LINE_TEACHING_CONTENT.pages}
                    onClose={() => {
                        markSchemeOnboardingSeen('first_external_line_teaching')
                    }}
                />
            )}

            {!isEmbedded && (
            <div className="page-utility-row utility-split animate-slide-up">
                <button className="btn-utility-secondary" onClick={prevPhase}>上一页</button>
                <div className="scheme-toolbar-actions">
                    <button className="btn-help" onClick={() => setShowSchemeGuide(true)}>
                        计谋指南
                    </button>
                    <PageUtilityActions onOpenGuide={() => openGameplayGuide('gameplay')} />
                </div>
            </div>
            )}

            <div className={`scheme-modal ${isEmbedded ? 'scheme-modal-embedded' : 'glass-panel animate-slide-up'}`}>
                <div className={`scheme-header ${isEmbedded ? 'scheme-header-embedded' : ''}`}>
                    {isEmbedded ? (
                        <>
                            <div className="scheme-embedded-target-copy">
                                <span className="scheme-embedded-target-title">{getEmbeddedTargetTitle(selectedNpc)}</span>
                                <strong className="scheme-embedded-target-name">{selectedNpc?.name ?? '人名'}</strong>
                            </div>
                        </>
                    ) : (
                        <>
                            <h2 className="modal-title">施计</h2>
                            <div className="scheme-counter scheme-attempt-quota">
                                今日第 <span className="highlight-number">{schemeCount + 1}</span>/<span className="highlight-number">{maxSchemes}</span> 次计谋
                            </div>
                        </>
                    )}
                </div>

                {!isEmbedded && (
                <div className="page-mission-strip scheme-mission-strip">
                    <div className="page-mission-item">
                        <span className="page-mission-label">选谁</span>
                        <p className="page-mission-text">先锁定本回合真正会带出连锁反应的人，而不是最顺眼的人。</p>
                    </div>
                    <div className="page-mission-item">
                        <span className="page-mission-label">怎么动</span>
                        <p className="page-mission-text">再选计谋。是探底、挑拨、借势还是逼他表态，决定结果的方向。</p>
                    </div>
                    <div className="page-mission-item">
                        <span className="page-mission-label">如何落子</span>
                        <p className="page-mission-text">最后补一句说辞。切中人心时，计谋成败和影响幅度都会明显不同。</p>
                    </div>
                </div>
                )}

                {shouldShowOmenInlineHint && !isEmbedded && (
                    <div className="scheme-inline-hint omen-hint">
                        谶纬偏灾异、法统、天命与人心，不宜写成兵粮调度。
                    </div>
                )}

                {selectedNpc && targetLockedFromCourt && !isEmbedded && (
                    <div className="scheme-entry-lock animate-slide-up">
                        <div>
                            <span className="scheme-entry-lock-kicker">朝堂案卷已锁定</span>
                            <strong>{selectedNpc.name}</strong>
                            <p>目标来自人物详情页。此处只需选择计谋、关联人物与说辞。</p>
                        </div>
                        <button
                            className="btn-utility-secondary"
                            onClick={() => setTargetLockedFromCourt(false)}
                        >
                            改选目标
                        </button>
                    </div>
                )}

                <div className="scheme-body">
                    {justSubmitted ? (
                        <div className="feedback-card submitted animate-fade-in">
                            <p className="submitted-text">计谋已发，暗线运作中……</p>
                            <div className="ai-ripple"></div>
                        </div>
                    ) : isEmbedded ? (
                        renderEmbeddedWorkbench()
                    ) : (
                        <div className="scheme-workbench">
                            <div className="scheme-steps">
                                {!isEmbedded && (
                                <div className="step animate-slide-up animate-delay-1">
                                    <h3 className="step-title"><span className="step-num">壹</span> 选择目标</h3>
                                    <p className="focus-legend">暗金边框：冯道之锦囊点名的关键人物</p>
                                    <div className="npc-select-grid">
                                        {aliveNpcs.map(npc => {
                                            const alreadyUsed = usedNpcIds.has(npc.id)
                                            return (
                                                <button
                                                    key={npc.id}
                                                    className={`npc-select-btn ${selectedNpcId === npc.id ? 'selected' : ''} ${highlightedNpcIds.has(npc.id) ? 'focus-npc' : ''} ${alreadyUsed ? 'disabled' : ''}`}
                                                    disabled={alreadyUsed}
                                                    onClick={() => {
                                                        setSelectedNpcId(npc.id)
                                                        setTargetLockedFromCourt(false)
                                                        setSelectedScheme(null)
                                                        setRelatedNpcId(null)
                                                        setSpeech('')
                                                        setOmenText('')
                                                        setInterpretationText('')
                                                        setFengDraftPreview(null)
                                                    }}
                                                >
                                                    <div className="npc-select-main">
                                                        <NpcPortrait
                                                            name={npc.name}
                                                            className="npc-select-avatar"
                                                            framed
                                                            positionY="18%"
                                                            zoom={1.28}
                                                        />
                                                        <span className="npc-name">{npc.name}</span>
                                                    </div>
                                                    <span className={`trust-tag trust-${getTrustLevel(npc.trust)}`}>
                                                        {getTrustLabel(npc.trust)}
                                                    </span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                                )}

                                {selectedNpc && (
                                    <div className="step animate-slide-up">
                                        <h3 className="step-title"><span className="step-num">贰</span> 选择计谋</h3>
                                        <div className="scheme-select-grid">
                                            {SCHEMES.map(scheme => {
                                                if (scheme.targetScope === 'externalOnly' && selectedNpc.powerBase !== 'external') return null
                                                const available = scheme.type === 'proxy'
                                                    ? availableSchemeTypes.includes(scheme.type) && isCourtDispositionExecutor(selectedNpc)
                                                    : availableSchemeTypes.includes(scheme.type)
                                                const unlockHint = available
                                                    ? undefined
                                                    : getSchemeUnlockHint({
                                                        schemeType: scheme.type,
                                                        npc: selectedNpc,
                                                        round: currentRound,
                                                        unlockedSecrets: intelProgress[selectedNpc.id] ?? 0,
                                                        difficulty,
                                                    })
                                                return (
                                                    <div
                                                        key={scheme.type}
                                                        className={`scheme-btn-shell ${!available ? 'locked' : ''}`}
                                                        title={unlockHint}
                                                        aria-label={unlockHint}
                                                    >
                                                        <button
                                                            className={`scheme-btn ${selectedScheme === scheme.type ? 'selected' : ''} ${!available ? 'disabled' : ''}`}
                                                            data-scheme-type={scheme.type}
                                                            disabled={!available}
                                                            onClick={() => {
                                                                setSelectedScheme(scheme.type)
                                                                if (!scheme.needsSecondTarget) setRelatedNpcId(null)
                                                                setSpeech('')
                                                                setOmenText('')
                                                                setInterpretationText('')
                                                                setFengDraftPreview(null)
                                                            }}
                                                        >
                                                            <div className="scheme-info">
                                                                <span className="scheme-name">{scheme.name}</span>
                                                                <span className="scheme-desc">{scheme.description}</span>
                                                            </div>
                                                            {!available && <span className="scheme-lock">未解锁</span>}
                                                        </button>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {currentSchemeData?.needsSecondTarget && (
                                    <div className="step animate-slide-up">
                                        <h3 className="step-title"><span className="step-num">叁</span> 选择关联人物</h3>
                                        <div className="npc-select-grid">
                                            {relatedNpcCandidates.map(npc => (
                                                <button
                                                    key={npc.id}
                                                    className={`npc-select-btn ${relatedNpcId === npc.id ? 'selected' : ''}`}
                                                    onClick={() => {
                                                        setRelatedNpcId(npc.id)
                                                        setFengDraftPreview(null)
                                                    }}
                                                >
                                                    <div className="npc-select-main">
                                                        <NpcPortrait
                                                            name={npc.name}
                                                            className="npc-select-avatar"
                                                            framed
                                                            positionY="18%"
                                                            zoom={1.28}
                                                        />
                                                        <span className="npc-name">{npc.name}</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                        {selectedScheme === 'proxy' && relatedNpcCandidates.length === 0 && (
                                            <p className="scheme-related-empty">
                                                眼下没有仍在位、且可被罢黜或处决的朝臣目标。
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="scheme-speech-column">
                                {selectedNpc && !isEmbedded ? (
                                    <div className="step animate-slide-up animate-delay-1 scheme-preview-card">
                                        <h3 className="step-title"><span className="step-num">{currentSchemeData?.needsSecondTarget ? '肆' : '叁'}</span> 当前布局</h3>
                                        <div className="scheme-preview-main">
                                            <NpcPortrait
                                                name={selectedNpc.name}
                                                className="scheme-preview-portrait"
                                                positionY="18%"
                                                zoom={1.04}
                                            />
                                            <div className="scheme-preview-copy">
                                                <div className="scheme-preview-name">{selectedNpc.name}</div>
                                                <div className="scheme-preview-meta">{selectedNpc.title}</div>
                                                <div className="scheme-preview-meta">
                                                    {getTrustLabel(selectedNpc.trust)}
                                                    {selectedScheme ? ` · ${schemeNames[selectedScheme]}` : ''}
                                                </div>
                                                {relatedNpc && (
                                                    <div className="scheme-preview-meta">关联人物：{relatedNpc.name}</div>
                                                )}
                                                <div className="scheme-preview-sections">
                                                    <section className="scheme-preview-section">
                                                        <div className="scheme-preview-section-title">公开人设</div>
                                                        <p>{selectedNpc.publicPersona}</p>
                                                    </section>
                                                    <section className="scheme-preview-section">
                                                        <div className="scheme-preview-section-title">公开政治立场</div>
                                                        <p>{selectedNpc.publicStance}</p>
                                                    </section>
                                                    <section className="scheme-preview-section">
                                                        <div className="scheme-preview-section-title">本回合公开表态</div>
                                                        <p>{selectedRoundReaction}</p>
                                                    </section>
                                                    <section className="scheme-preview-section">
                                                        <div className="scheme-preview-section-title">可撬动点</div>
                                                        <div className="scheme-preview-chip-list">
                                                            {leverageChips.map(chip => (
                                                                <span key={chip} className="scheme-preview-chip">{chip}</span>
                                                            ))}
                                                        </div>
                                                    </section>
                                                    {selectedRoleHint && (
                                                        <section className="scheme-preview-section">
                                                            <div className="scheme-preview-section-title">中间层提示</div>
                                                            <p>{selectedRoleHint}</p>
                                                        </section>
                                                    )}
                                                    {selectedNpc.powerBase === 'external' && selectedExternalProgress && (
                                                        <section className="scheme-preview-section">
                                                            <div className="scheme-preview-section-title">外部筹码</div>
                                                            <div className="scheme-preview-chip-list">
                                                                <span className="scheme-preview-chip">
                                                                    军力 {selectedNpc.militaryPower} · {getExternalMilitaryPostureLabel(selectedNpc.militaryPower)}
                                                                </span>
                                                                <span className="scheme-preview-chip">忠诚 {selectedNpc.loyaltyToCourt}</span>
                                                                <span className="scheme-preview-chip">倾向：{getExternalTiltLabel(selectedNpc.alignmentBias)}</span>
                                                                <span className="scheme-preview-chip">态势：{getExternalPostureLabel(selectedNpc.externalStatus, selectedNpc.loyaltyToCourt, selectedNpc.alignmentBias)}</span>
                                                                <span className="scheme-preview-chip">阶段：{selectedExternalProgress.phase}</span>
                                                                <span className="scheme-preview-chip">目标：{selectedExternalProgress.targetLabel}</span>
                                                            </div>
                                                            <p>{buildExternalSchemeWhisper(selectedNpc, selectedUnlockedSecrets, selectedExternalProgress)}</p>
                                                        </section>
                                                    )}
                                                    <section className="scheme-preview-section">
                                                        <div className="scheme-preview-section-title">已知情报</div>
                                                        {selectedKnownIntel.length > 0 ? (
                                                            <div className="scheme-preview-chip-list">
                                                                {selectedKnownIntel.map((intel, index) => (
                                                                    <span
                                                                        key={`${selectedNpc.id}-intel-${index}`}
                                                                        className="scheme-preview-chip"
                                                                    >
                                                                        {intel}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p>暂无。可先用“试探”逐步摸清暗线。</p>
                                                        )}
                                                    </section>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : !isEmbedded ? (
                                    <div className="step animate-slide-up animate-delay-1 scheme-empty-state">
                                        <h3 className="step-title"><span className="step-num">叁</span> 当前布局</h3>
                                        <p>先选定目标人物，再决定说辞和计谋方向。</p>
                                    </div>
                                ) : null}

                                {selectedScheme && (
                                    <div className="step animate-slide-up scheme-speech-step">
                                        <h3 className="step-title">
                                            <span className="step-num">{currentSchemeData?.needsSecondTarget ? '伍' : '肆'}</span>
                                            {speechFields.primaryLabel}
                                        </h3>
                                        <div className="speech-input-wrapper">
                                            {speechFields.mode === 'omen' ? (
                                                <div className="omen-inputs">
                                                    <label className="omen-input-group">
                                                        <span className="omen-input-label">{speechFields.primaryLabel}</span>
                                                        <textarea
                                                            className="speech-input omen-speech-input"
                                                            value={omenText}
                                                            onChange={e => setOmenText(e.target.value)}
                                                            placeholder="先写一句谶辞、征兆或灾异异象……"
                                                            maxLength={60}
                                                        />
                                                        <div className="char-count">{omenText.length}/60</div>
                                                    </label>
                                                    <div className="omen-helper-card">
                                                        <div className="omen-helper-title">征兆可以这样写</div>
                                                        <p>可写：天灾异象、民间谶语、星变河象、礼制失常、龙气外泄。</p>
                                                    </div>
                                                    <label className="omen-input-group">
                                                        <span className="omen-input-label">{speechFields.secondaryLabel}</span>
                                                        <textarea
                                                            className="speech-input omen-speech-input"
                                                            value={interpretationText}
                                                            onChange={e => setInterpretationText(e.target.value)}
                                                            placeholder="再解释它意味着什么，以及谁最该警惕……"
                                                            maxLength={100}
                                                        />
                                                        <div className="char-count">{interpretationText.length}/100</div>
                                                    </label>
                                                    <div className="omen-helper-card">
                                                        <div className="omen-helper-title">解释时要做两件事</div>
                                                        <p>解释裂缝，再暗示谁最该警惕；不要直接写成普通挑拨或普通献策。</p>
                                                    </div>
                                                    {omenTargetHint && (
                                                        <div className="omen-helper-card omen-target-fit">
                                                            <div className="omen-helper-title">此人是否适合吃谶纬</div>
                                                            <p>{omenTargetHint}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <>
                                                    <textarea
                                                        className="speech-input"
                                                        value={speech}
                                                        onChange={e => setSpeech(e.target.value)}
                                                        placeholder="写一句话作为你的说辞（选填）……"
                                                        maxLength={100}
                                                    />
                                                    <div className="char-count">{speech.length}/100</div>
                                                </>
                                            )}
                                            <p className="speech-tip">{speechFields.helperText}</p>
                                            {selectedNpc && (
                                                <FengDaozhiAssistPanel
                                                    schemeType={selectedScheme}
                                                    remaining={fengDaozhiAssistsRemaining}
                                                    total={fengAssistTotal}
                                                    isLoading={fengDraftLoading}
                                                    draftPreview={fengDraftPreview}
                                                    onDraft={handleFengDaozhiDraft}
                                                />
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className={`scheme-footer ${isEmbedded ? 'scheme-footer-embedded' : ''}`}>
                    {!justSubmitted && (selectedScheme || isEmbedded) && (
                        <button
                            className={`btn-primary btn-execute animate-slide-up ${isEmbedded ? 'scheme-embedded-execute' : ''}`}
                            onClick={handleExecute}
                            disabled={!selectedScheme || (currentSchemeData?.needsSecondTarget ? !relatedNpcId : false)}
                        >
                            {isEmbedded ? '落子' : '行事'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export function SchemePanel() {
    return <SchemeComposer mode="standalone" />
}
