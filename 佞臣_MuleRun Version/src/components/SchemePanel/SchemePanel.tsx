// ========================================
// 施计操作页
// 非阻塞模式：施计后立刻进入下一次
// AI 在后台异步生成 NPC 反馈
// ========================================

import { useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { FIRST_ROUND_GUIDE_CONTENT } from '../../data/prologueContent'
import { ROUND_EVENTS } from '../../data/rounds'
import { SCHEMES, getSchemeByType } from '../../data/schemes'
import { getOmenGuidePresentation } from '../../game/omenGuide'
import { getTrustLabel, getTrustLevel } from '../../game/types'
import { parseNorthSchemeInput } from '../../game/aiNativeEngine'
import { buildNpcPromptDynamicContext } from '../../game/npcPromptContext'
import { getAvailableSchemesForNpc, previewSchemeSuccess } from '../../game/schemeEngine'
import { getHighlightedNpcIds } from '../../game/roundIntelEngine'
import { chatCompletion, getAiMode, getAiModeLabel } from '../../ai/aiService'
import { buildNpcPrompt } from '../../ai/prompts'
import { FirstRoundGuideModal } from '../FirstRoundGuide/FirstRoundGuideModal'
import { NpcPortrait } from '../NpcPortrait/NpcPortrait'
import type { OmenSpeechInput, SchemeType, SchemeAction } from '../../game/types'
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
            helperText: '先给征兆，再解其意，最后暗示谁最该警惕。',
        }
    }

    return {
        mode: 'single',
        primaryLabel: '补一句说辞',
        helperText: '说辞若切中此人的立场与心结，将实际影响计谋成败与效果幅度。',
    }
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

export function SchemePanel() {
    const {
        currentRound,
        difficulty,
        schemeCount,
        maxSchemes,
        addScheme,
        nextPhase,
        prevPhase,
        npcs,
        factions,
        intelProgress,
        currentSchemes,
        recentBacklash,
        roundHistory,
        addNpcFeedback,
        updateNpcFeedback,
        markSchemeParsePending,
        updateSchemeParse,
        firstRoundGuideSeen,
        markFirstRoundGuideSeen,
        omenGuideSeen,
        markOmenGuideSeen,
        openGameplayGuide,
    } = useGameStore()

    const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null)
    const [selectedScheme, setSelectedScheme] = useState<SchemeType | null>(null)
    const [relatedNpcId, setRelatedNpcId] = useState<string | null>(null)
    const [speech, setSpeech] = useState('')
    const [omenText, setOmenText] = useState('')
    const [interpretationText, setInterpretationText] = useState('')
    const [justSubmitted, setJustSubmitted] = useState(false)

    const selectedNpc = npcs.find(n => n.id === selectedNpcId)
    const relatedNpc = npcs.find(n => n.id === relatedNpcId)
    const availableSchemeTypes = selectedNpc
        ? getAvailableSchemesForNpc(selectedNpc, {
            round: currentRound,
            unlockedSecrets: intelProgress[selectedNpc.id] ?? 0,
        })
        : []
    const currentSchemeData = selectedScheme ? getSchemeByType(selectedScheme) : undefined
    const currentRoundEvent = ROUND_EVENTS[currentRound - 1]
    const omenGuidePresentation = getOmenGuidePresentation({
        round: currentRound,
        difficulty,
        firstRoundGuideSeen,
        omenGuideSeen,
    })
    const shouldShowOmenGuide = omenGuidePresentation === 'modal'
    const shouldShowOmenInlineHint = omenGuidePresentation === 'inline'
    const speechFields = getSchemeSpeechFields(selectedScheme)

    const usedNpcIds = new Set(currentSchemes.map(scheme => scheme.targetNpcId))
    const aliveNpcs = npcs.filter(n => n.isAlive)
    const highlightedNpcIds = new Set(getHighlightedNpcIds(currentRound, npcs))

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

    const handleExecute = async () => {
        if (!selectedNpcId || !selectedScheme || !selectedNpc) return
        const actionId = createActionId()
        const resolutionRoll = Math.random()
        const existingActions = 0
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
            relatedNpcId: relatedNpcId ?? undefined,
            playerSpeech: speechPayload.playerSpeech,
            omenSpeechInput: speechPayload.omenSpeechInput,
            resolutionRoll,
        }

        addScheme(action)
        markSchemeParsePending(actionId)

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
        const knownSecretThreads = npcSnapshot.secretThreads.slice(0, intelProgress[npcSnapshot.id] ?? 0)
        const dynamicContext = buildNpcPromptDynamicContext({
            npc: npcSnapshot,
            factions,
            roundHistory,
            recentBacklash,
        })
        const relatedNpcSnapshot = relatedNpcId ? npcs.find(npc => npc.id === relatedNpcId) ?? null : null
        parseNorthSchemeInput({
            round: currentRound,
            npc: npcSnapshot,
            schemeType: selectedScheme,
            speech: speechSnapshot,
            relatedNpc: relatedNpcSnapshot,
            omenSpeechInput: speechPayload.omenSpeechInput,
        }).then(parsed => {
            updateSchemeParse(actionId, parsed)
            const success = previewSchemeSuccess(
                { ...action, northParse: parsed },
                npcSnapshot,
                existingActions,
                resolutionRoll,
                {
                    round: currentRound,
                    unlockedSecrets: intelProgress[selectedNpc.id] ?? 0,
                    northParse: parsed,
                },
            )
            return chatCompletion(
                buildNpcPrompt({
                    npc: npcSnapshot,
                    schemeType: selectedScheme,
                    speech: speechSnapshot,
                    success,
                    round: currentRound,
                    eventName: currentRoundEvent?.eventName,
                    eventBriefing: currentRoundEvent?.briefing,
                    knownSecretThreads,
                    previousDealings: dynamicContext.previousDealings,
                    relationshipTemperature: dynamicContext.relationshipTemperature,
                    recentCourtFortune: dynamicContext.recentCourtFortune,
                    factionPressure: dynamicContext.factionPressure,
                }),
                { temperature: 0.75, maxTokens: 200, tag: `npc_${selectedScheme}_${success ? 'success' : 'failure'}` },
            )
        }).then(reply => {
            const source = getAiMode() === 'fallback' ? '本地兜底' : getAiModeLabel()
            updateNpcFeedback(actionId, reply.trim() || `${npcSnapshot.name}似有反应，却未能听清。`, source)
        }).catch(() => {
            updateNpcFeedback(actionId, `${npcSnapshot.name}似有反应，却未能听清。`, '本地兜底')
        })

        setJustSubmitted(true)
        setTimeout(() => {
            setSelectedNpcId(null)
            setSelectedScheme(null)
            setRelatedNpcId(null)
            setSpeech('')
            setJustSubmitted(false)

            if (schemeCount + 1 >= maxSchemes) {
                nextPhase()
            }
        }, 800)
    }

    return (
        <div className="page-container scheme-panel animate-fade-in">
            {currentRound === 1 && !firstRoundGuideSeen.scheme_phase && (
                <FirstRoundGuideModal
                    title={FIRST_ROUND_GUIDE_CONTENT.scheme_phase.title}
                    body={FIRST_ROUND_GUIDE_CONTENT.scheme_phase.body}
                    onClose={() => markFirstRoundGuideSeen('scheme_phase')}
                />
            )}

            {shouldShowOmenGuide && (
                <FirstRoundGuideModal
                    title={FIRST_ROUND_GUIDE_CONTENT.first_omen_modal.title}
                    body={FIRST_ROUND_GUIDE_CONTENT.first_omen_modal.body}
                    onClose={markOmenGuideSeen}
                />
            )}

            <div className="page-utility-row utility-split animate-slide-up">
                <button className="btn-utility-secondary" onClick={prevPhase}>上一页</button>
                <button className="btn-help" onClick={() => openGameplayGuide('gameplay')}>
                    玩法说明
                </button>
            </div>

            <div className="scheme-modal glass-panel animate-slide-up">
                <div className="scheme-header">
                    <h2 className="modal-title">施计</h2>
                    <div className="scheme-counter">
                        今日第 <span className="highlight-number">{schemeCount + 1}</span> / {maxSchemes} 次计谋
                    </div>
                </div>

                {shouldShowOmenInlineHint && (
                    <div className="scheme-inline-hint omen-hint">
                        谶纬偏灾异、法统、天命与人心，不宜写成兵粮调度。
                    </div>
                )}

                <div className="scheme-body">
                    {justSubmitted ? (
                        <div className="feedback-card submitted animate-fade-in">
                            <p className="submitted-text">计谋已发，暗线运作中……</p>
                            <div className="ai-ripple"></div>
                        </div>
                    ) : (
                        <div className="scheme-workbench">
                            <div className="scheme-steps">
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
                                                        setSelectedScheme(null)
                                                        setRelatedNpcId(null)
                                                        setSpeech('')
                                                        setOmenText('')
                                                        setInterpretationText('')
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

                                {selectedNpc && (
                                    <div className="step animate-slide-up">
                                        <h3 className="step-title"><span className="step-num">贰</span> 选择计谋</h3>
                                        <div className="scheme-select-grid">
                                            {SCHEMES.map(scheme => {
                                                if (scheme.targetScope === 'externalOnly' && selectedNpc.powerBase !== 'external') return null
                                                const available = availableSchemeTypes.includes(scheme.type)
                                                return (
                                                    <button
                                                        key={scheme.type}
                                                        className={`scheme-btn ${selectedScheme === scheme.type ? 'selected' : ''} ${!available ? 'disabled' : ''}`}
                                                        disabled={!available}
                                                        onClick={() => {
                                                            setSelectedScheme(scheme.type)
                                                            setSpeech('')
                                                            setOmenText('')
                                                            setInterpretationText('')
                                                        }}
                                                    >
                                                        <div className="scheme-info">
                                                            <span className="scheme-name">{scheme.name}</span>
                                                            <span className="scheme-desc">{scheme.description}</span>
                                                        </div>
                                                        {!available && <span className="scheme-lock">未满足条件</span>}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {currentSchemeData?.needsSecondTarget && (
                                    <div className="step animate-slide-up">
                                        <h3 className="step-title"><span className="step-num">叁</span> 选择关联人物</h3>
                                        <div className="npc-select-grid">
                                            {aliveNpcs.filter(npc => npc.id !== selectedNpcId).map(npc => (
                                                <button
                                                    key={npc.id}
                                                    className={`npc-select-btn ${relatedNpcId === npc.id ? 'selected' : ''}`}
                                                    onClick={() => setRelatedNpcId(npc.id)}
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
                                    </div>
                                )}
                            </div>

                            <div className="scheme-speech-column">
                                {selectedNpc ? (
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
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="step animate-slide-up animate-delay-1 scheme-empty-state">
                                        <h3 className="step-title"><span className="step-num">叁</span> 当前布局</h3>
                                        <p>先选定目标人物，再决定说辞和计谋方向。</p>
                                    </div>
                                )}

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
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="scheme-footer">
                    {!justSubmitted && selectedScheme && (
                        <button
                            className="btn-primary btn-execute animate-slide-up"
                            onClick={handleExecute}
                            disabled={currentSchemeData?.needsSecondTarget ? !relatedNpcId : false}
                        >
                            行事
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
