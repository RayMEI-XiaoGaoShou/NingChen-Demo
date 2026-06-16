// ========================================
// 施计操作页
// 非阻塞模式：施计后立刻进入下一次
// AI 在后台异步生成 NPC 反馈
// ========================================

import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { SCHEMES, getSchemeByType } from '../../data/schemes'
import { getDifficultyProfile } from '../../game/difficulty'
import { isExternalEscalationOpen, isTerminalExternalNpc } from '../../game/externalStatus'
import { fallbackNorthParseFromSpeech, parseNorthSchemeInput } from '../../game/aiNativeEngine'
import { recordAiGameMasterDebug } from '../../game/aiGameMasterDebug'
import { buildNpcPromptDynamicContext } from '../../game/npcPromptContext'
import { getRoundCampaignEventContext } from '../../game/campaignDisplayEngine'
import { getAvailableSchemesForNpc, previewSchemeSuccess } from '../../game/schemeEngine'
import { forceStatementReplyText } from '../../game/schemeFollowUp'
import { buildExternalLineProgress } from '../../game/externalLineProgress'
import { explainExternalActionUnlock } from '../../game/explainability'
import { isOmenAvailableForNpc, roundSupportsExternalAction } from '../../data/roundRuleConfig'
import { clearSchemeReplyPrefetch, markSchemeReplyPrefetchStarted } from '../../game/schemeReplyPrefetch'
import {
    isCourtDispositionExecutor as isCourtDispositionExecutorId,
    isCourtDispositionTarget as isCourtDispositionTargetId,
} from '../../game/courtDisposition'
import { chatCompletion, getAiModeLabel } from '../../ai/aiService'
import { buildNpcPrompt, sanitizeNpcReplyText } from '../../ai/prompts'
import { FengDaozhiAssistPanel } from './FengDaozhiAssistPanel'
import { useSceneTransition } from '../SceneTransition/SceneTransition'
import { useGameSfx } from '../../audio/gameSfx'
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
    lockedNpcId?: string | null
    onAfterSubmit?: (result: SchemeSubmitResult) => void
}

export interface SchemeSubmitResult {
    targetNpcId: string
    targetPowerBase: NPC['powerBase']
    schemeCountAfterSubmit: number
    maxSchemes: number
}

export function useSchemeComposer({
    lockedNpcId = null,
    onAfterSubmit,
}: SchemeComposerProps = {}) {
    return {
        lockedNpcId,
        onAfterSubmit,
    }
}

export function SchemeComposer(props: SchemeComposerProps = {}) {
    const composer = useSchemeComposer(props)
    const { lockedNpcId, onAfterSubmit } = composer
    const { runSceneTransition } = useSceneTransition()
    const { playSfx } = useGameSfx()
    const {
        currentRound,
        difficulty,
        schemeCount,
        maxSchemes,
        addScheme,
        completeSchemingIfReady,
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
        worldMemoryLedger,
        fengDaozhiAssistsRemaining,
        playerDangerStage,
        playerSuspicionHeat,
        invasionPressure,
        requestFengDaozhiDraft,
        shuCampaign,
        huainanCampaign,
    } = useGameStore()
    const [selectedNpcId, setSelectedNpcId] = useState<string | null>(lockedNpcId ?? null)
    const [selectedScheme, setSelectedScheme] = useState<SchemeType | null>(null)
    const [relatedNpcId, setRelatedNpcId] = useState<string | null>(null)
    const [relatedPickerOpen, setRelatedPickerOpen] = useState(false)
    const [speech, setSpeech] = useState('')
    const [omenText, setOmenText] = useState('')
    const [interpretationText, setInterpretationText] = useState('')
    const [justSubmitted, setJustSubmitted] = useState(false)
    const [fengDraftPreview, setFengDraftPreview] = useState<FengDaozhiDraftResult | null>(null)
    const [fengDraftLoading, setFengDraftLoading] = useState(false)

    const selectedNpc = npcs.find(n => n.id === selectedNpcId)
    const relatedNpc = npcs.find(n => n.id === relatedNpcId) ?? null

    const usedNpcIds = useMemo(() => new Set(currentSchemes.map(scheme => scheme.targetNpcId)), [currentSchemes])
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
    useEffect(() => {
        if (!lockedNpcId) {
            setSelectedNpcId(null)
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
            setSelectedScheme(null)
            setRelatedNpcId(null)
            setRelatedPickerOpen(false)
            setSpeech('')
            setOmenText('')
            setInterpretationText('')
            setFengDraftPreview(null)
        }
    }, [lockedNpcId, npcs, usedNpcIds])
    const speechFields = getSchemeSpeechFields(selectedScheme)
    const fengAssistTotal = getDifficultyProfile(difficulty).onboarding.fengDaozhiAssistsPerRound
    const selectedSchemeDescription = currentSchemeData?.description ?? ''
    const relatedNpcCandidates = currentSchemeData?.needsSecondTarget
        ? selectedScheme === 'proxy'
            ? npcs.filter(npc => npc.id !== selectedNpcId && npc.isAlive && isCourtDispositionTarget(npc) && getCourtStatus(npc) === 'active')
            : npcs.filter(npc => npc.id !== selectedNpcId && npc.isAlive && !isTerminalExternalNpc(npc) && getCourtStatus(npc) === 'active')
        : []

    const schemeNames: Record<string, string> = {
        probe: '试探',
        advise: '献策',
        slander: '谗言',
        alienate: '离间',
        frame: '嫁祸',
        proxy: '借刀',
        appeal: '求援',
        omen: '谶纬',
        secession: '煽动割据',
        rebellion: '煽动造反',
    }

    const createActionId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const handleFengDaozhiDraft = async () => {
        if (!selectedNpcId || !selectedScheme || fengDaozhiAssistsRemaining <= 0 || fengDraftLoading) return
        playSfx('feng-draft')
        const effectiveRelatedNpcId = currentSchemeData?.needsSecondTarget ? relatedNpcId : null

        setFengDraftLoading(true)
        try {
            const draft = await requestFengDaozhiDraft({
                round: currentRound,
                difficulty,
                targetNpcId: selectedNpcId,
                schemeType: selectedScheme,
                playerDangerStage,
                playerSuspicionHeat,
                invasionPressure,
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
        playSfx('north-page-action')
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
            worldMemoryLedger,
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
                        worldMemorySummary: dynamicContext.worldMemorySummary,
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

        const resetAfterSubmit = () => {
            setSelectedNpcId(null)
            setSelectedScheme(null)
            setRelatedNpcId(null)
            setRelatedPickerOpen(false)
            setSpeech('')
            setOmenText('')
            setInterpretationText('')
            setFengDraftPreview(null)
            setJustSubmitted(false)

            onAfterSubmit?.({
                targetNpcId: selectedNpcId,
                targetPowerBase: selectedNpc.powerBase,
                schemeCountAfterSubmit,
                maxSchemes,
            })
        }

        setJustSubmitted(true)
        setTimeout(() => {
            if (schemeCountAfterSubmit >= maxSchemes) {
                resetAfterSubmit()
                void runSceneTransition({
                    variant: 'to-empress-letter',
                    onCovered: completeSchemingIfReady,
                })
                return
            }

            void runSceneTransition({
                variant: 'north-dark-cloud',
                onCovered: resetAfterSubmit,
            })
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
                            playSfx('north-inline-action')
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
                                    playSfx('north-inline-action')
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
        <div className="scheme-composer scheme-composer-embedded">
            <div className="scheme-modal scheme-modal-embedded">
                <div className="scheme-header scheme-header-embedded">
                    <div className="scheme-embedded-target-copy">
                        <span className="scheme-embedded-target-title">{getEmbeddedTargetTitle(selectedNpc)}</span>
                        <strong className="scheme-embedded-target-name">{selectedNpc?.name ?? '人名'}</strong>
                    </div>
                </div>

                <div className="scheme-body">
                    {justSubmitted ? (
                        <div className="feedback-card submitted animate-fade-in">
                            <p className="submitted-text">计谋已发，暗线运作中...</p>
                            <div className="ai-ripple"></div>
                        </div>
                    ) : renderEmbeddedWorkbench()}
                </div>

                <div className="scheme-footer scheme-footer-embedded">
                    {!justSubmitted && (
                        <button
                            className="btn-primary btn-execute animate-slide-up scheme-embedded-execute"
                            onClick={handleExecute}
                            disabled={!selectedScheme || (currentSchemeData?.needsSecondTarget ? !relatedNpcId : false)}
                        >
                            落子
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
