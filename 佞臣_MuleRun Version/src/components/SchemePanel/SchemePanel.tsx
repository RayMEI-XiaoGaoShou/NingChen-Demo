import { useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { FIRST_ROUND_GUIDE_CONTENT } from '../../data/prologueContent'
import { ROUND_EVENTS } from '../../data/rounds'
import { SCHEMES, getSchemeByType } from '../../data/schemes'
import { getTrustLabel, getTrustLevel } from '../../game/types'
import { parseNorthSchemeInput } from '../../game/aiNativeEngine'
import { buildNpcPromptDynamicContext } from '../../game/npcPromptContext'
import { getAvailableSchemesForNpc, previewSchemeSuccess } from '../../game/schemeEngine'
import { getHighlightedNpcIds } from '../../game/roundIntelEngine'
import { chatCompletion, getAiMode, getAiModeLabel } from '../../ai/aiService'
import { buildNpcPrompt } from '../../ai/prompts'
import { FirstRoundGuideModal } from '../FirstRoundGuide/FirstRoundGuideModal'
import { NpcPortrait } from '../NpcPortrait/NpcPortrait'
import type { SchemeType, SchemeAction, NPC } from '../../game/types'
import './SchemePanel.css'

function getFengNpcHint(npc: NPC, highlighted: boolean): string {
    if (highlighted) {
        return `此人正踩在本回合的风口上。若能借势落子，最容易把个人动摇放大成朝局波纹。`
    }

    if (npc.powerBase === 'external') {
        return npc.loyaltyToCourt <= 35
            ? '此人离心已显，若再推上一把，容易把边镇姿态从观望逼到自立。'
            : '此人更看重价码与体面，动他之前先想清楚你是要拉拢、试探，还是借他去压别人。'
    }

    if (npc.trust <= 25) {
        return '此人对你戒意甚深，出手太重容易反噬；若真要动，务必让说辞像替他着想，而不是逼他表态。'
    }

    return '此人不是今天最急的人，却可能是最好借势的人。若你需要稳一手，这是能下的一子。'
}

function getSchemeLockReason(npc: NPC | undefined, available: boolean, scheme: typeof SCHEMES[number]): string | null {
    if (available) return null
    if (!npc) return '先定目标人物'
    if (scheme.targetScope === 'externalOnly' && npc.powerBase !== 'external') return '此计只可用于地方军头'
    if (npc.trust < scheme.trustThreshold) return `至少需要 ${scheme.trustThreshold} 点信任`
    return '需更深暗线或当前局势不合'
}

export function SchemePanel() {
    const {
        currentRound,
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
        openGameplayGuide,
    } = useGameStore()

    const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null)
    const [selectedScheme, setSelectedScheme] = useState<SchemeType | null>(null)
    const [relatedNpcId, setRelatedNpcId] = useState<string | null>(null)
    const [speech, setSpeech] = useState('')
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

    const usedNpcIds = new Set(currentSchemes.map(scheme => scheme.targetNpcId))
    const aliveNpcs = npcs.filter(n => n.isAlive)
    const highlightedNpcIds = new Set(getHighlightedNpcIds(currentRound, npcs))

    const schemeNames: Record<string, string> = {
        probe: '试探',
        advise: '献策',
        slander: '谗言',
        alienate: '离间',
        frame: '放风构陷',
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

        const action: SchemeAction = {
            id: actionId,
            targetNpcId: selectedNpcId,
            schemeType: selectedScheme,
            relatedNpcId: relatedNpcId ?? undefined,
            playerSpeech: speech,
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
            playerSpeech: speech,
            feedback: '',
            isLoading: true,
            source: getAiModeLabel(),
        })

        const npcSnapshot = { ...selectedNpc }
        const speechSnapshot = speech
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
            speech: speechSnapshot,
            relatedNpc: relatedNpcSnapshot,
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

            <div className="page-utility-row utility-split animate-slide-up">
                <button className="btn-utility-secondary" onClick={prevPhase}>上一页</button>
                <button className="btn-help" onClick={() => openGameplayGuide('gameplay')}>
                    玩法说明
                </button>
            </div>

            <div className="scheme-modal glass-panel animate-slide-up">
                <div className="scheme-header">
                    <div className="scheme-title-wrap">
                        <span className="page-eyebrow">施计案台</span>
                        <h2 className="modal-title">先定人，再落子</h2>
                    </div>
                    <div className="scheme-counter">
                        今日第 <span className="highlight-number">{schemeCount + 1}</span> / {maxSchemes} 次计谋
                    </div>
                </div>

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

                <div className="scheme-body">
                    {justSubmitted ? (
                        <div className="feedback-card submitted animate-fade-in">
                            <p className="submitted-text">棋子已落，暗线已起……</p>
                            <div className="ai-ripple"></div>
                        </div>
                    ) : (
                        <div className="scheme-workbench">
                            <div className="scheme-steps">
                                <div className="advisor-panel scheme-advisor-panel">
                                    <div className="advisor-title">冯道之旁批</div>
                                    <p className="advisor-copy">
                                        {selectedNpc
                                            ? getFengNpcHint(selectedNpc, highlightedNpcIds.has(selectedNpc.id))
                                            : '先在名册里找“今日动他会有波纹”的人。暗金边框是我点名的人物，鼠标停上去还能看细注。'}
                                    </p>
                                </div>

                                <div className="step animate-slide-up animate-delay-1">
                                    <h3 className="step-title"><span className="step-num">壹</span> 选择目标</h3>
                                    <p className="focus-legend">暗金边框是冯道之点名的人。把鼠标停在人物上，可看旁批细注。</p>
                                    <div className="npc-select-grid">
                                        {aliveNpcs.map(npc => {
                                            const alreadyUsed = usedNpcIds.has(npc.id)
                                            const highlighted = highlightedNpcIds.has(npc.id)
                                            return (
                                                <button
                                                    key={npc.id}
                                                    className={`npc-select-btn ${selectedNpcId === npc.id ? 'selected' : ''} ${highlighted ? 'focus-npc' : ''} ${alreadyUsed ? 'disabled' : ''}`}
                                                    disabled={alreadyUsed}
                                                    onClick={() => {
                                                        setSelectedNpcId(npc.id)
                                                        setSelectedScheme(null)
                                                        setRelatedNpcId(null)
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
                                                        <div className="npc-select-copy">
                                                            <span className="npc-name">{npc.name}</span>
                                                            <span className="npc-select-meta">{npc.title}</span>
                                                        </div>
                                                    </div>
                                                    <span className={`trust-tag trust-${getTrustLevel(npc.trust)}`}>
                                                        {getTrustLabel(npc.trust)}
                                                    </span>
                                                    <div className="npc-hover-note">
                                                        <span className="npc-hover-note-label">旁批细注</span>
                                                        <p>{getFengNpcHint(npc, highlighted)}</p>
                                                    </div>
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
                                                const lockReason = getSchemeLockReason(selectedNpc, available, scheme)
                                                return (
                                                    <button
                                                        key={scheme.type}
                                                        className={`scheme-btn ${selectedScheme === scheme.type ? 'selected' : ''} ${!available ? 'disabled' : ''}`}
                                                        disabled={!available}
                                                        onClick={() => setSelectedScheme(scheme.type)}
                                                    >
                                                        <div className="scheme-info">
                                                            <span className="scheme-name">{scheme.name}</span>
                                                            <span className="scheme-desc">{scheme.description}</span>
                                                            {lockReason && <span className="scheme-reason">{lockReason}</span>}
                                                        </div>
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
                                                        <div className="npc-select-copy">
                                                            <span className="npc-name">{npc.name}</span>
                                                            <span className="npc-select-meta">{npc.title}</span>
                                                        </div>
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
                                                    {selectedScheme ? ` · ${schemeNames[selectedScheme]}` : ' · 尚未定计'}
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
                                        <p>先选定目标人物，再决定说辞和计谋方向。真正的“落子”从看人开始。</p>
                                    </div>
                                )}

                                {selectedScheme && (
                                    <div className="step animate-slide-up scheme-speech-step">
                                        <h3 className="step-title">
                                            <span className="step-num">{currentSchemeData?.needsSecondTarget ? '伍' : '肆'}</span>
                                            补一句说辞
                                        </h3>
                                        <div className="speech-input-wrapper">
                                            <textarea
                                                className="speech-input"
                                                value={speech}
                                                onChange={e => setSpeech(e.target.value)}
                                                placeholder="写一句话，让对方觉得你是替他着想，而不是逼他站队……"
                                                maxLength={100}
                                            />
                                            <p className="speech-tip">好说辞一般只做一件事：替他找一个更愿意顺着你走的理由。</p>
                                            <div className="char-count">{speech.length}/100</div>
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
                            落子
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
