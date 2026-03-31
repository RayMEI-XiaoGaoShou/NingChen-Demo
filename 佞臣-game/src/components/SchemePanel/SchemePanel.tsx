// ========================================
// 计谋操作页 — P4 更新
// 非阻塞模式：施计后立刻进入下一次
// AI 在后台异步生成 NPC 反馈
// ========================================

import { useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { FIRST_ROUND_GUIDE_CONTENT } from '../../data/prologueContent'
import { SCHEMES, getSchemeByType } from '../../data/schemes'
import { getTrustLabel, getTrustLevel } from '../../game/types'
import { parseNorthSchemeInput } from '../../game/aiNativeEngine'
import { getAvailableSchemesForNpc, previewSchemeSuccess } from '../../game/schemeEngine'
import { getHighlightedNpcIds } from '../../game/roundIntelEngine'
import { chatCompletion, getAiMode, getAiModeLabel } from '../../ai/aiService'
import { buildNpcPrompt } from '../../ai/prompts'
import { FirstRoundGuideModal } from '../FirstRoundGuide/FirstRoundGuideModal'
import { NpcPortrait } from '../NpcPortrait/NpcPortrait'
import type { SchemeType, SchemeAction } from '../../game/types'
import './SchemePanel.css'

export function SchemePanel() {
    const { currentRound, schemeCount, maxSchemes, addScheme, nextPhase, prevPhase, npcs, intelProgress, currentSchemes, addNpcFeedback, updateNpcFeedback, markSchemeParsePending, updateSchemeParse, firstRoundGuideSeen, markFirstRoundGuideSeen, openGameplayGuide } = useGameStore()

    const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null)
    const [selectedScheme, setSelectedScheme] = useState<SchemeType | null>(null)
    const [relatedNpcId, setRelatedNpcId] = useState<string | null>(null)
    const [speech, setSpeech] = useState('')
    const [justSubmitted, setJustSubmitted] = useState(false)

    const selectedNpc = npcs.find(n => n.id === selectedNpcId)
    const availableSchemeTypes = selectedNpc
        ? getAvailableSchemesForNpc(selectedNpc, {
            round: currentRound,
            unlockedSecrets: intelProgress[selectedNpc.id] ?? 0,
        })
        : []
    const currentSchemeData = selectedScheme ? getSchemeByType(selectedScheme) : undefined

    const usedNpcIds = new Set(currentSchemes.map(scheme => scheme.targetNpcId))
    const aliveNpcs = npcs.filter(n => n.isAlive)
    const highlightedNpcIds = new Set(getHighlightedNpcIds(currentRound, npcs))

    const schemeNames: Record<string, string> = {
        probe: '试探', advise: '献策', slander: '谗言', alienate: '离间',
        frame: '放风构陷', proxy: '借刀', appeal: '求援', omen: '谶纬',
        secession: '煽动割据', rebellion: '煽动造反',
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

        // ★ 异步后台：启动 NPC AI 反馈（不等待）
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

        // 后台发送结构化解析与 NPC AI 请求（fire and forget）
        const npcSnapshot = { ...selectedNpc }
        const speechSnapshot = speech
        const knownSecretThreads = npcSnapshot.secretThreads.slice(0, intelProgress[npcSnapshot.id] ?? 0)
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
                buildNpcPrompt({ npc: npcSnapshot, schemeType: selectedScheme, speech: speechSnapshot, success, knownSecretThreads }),
                { temperature: 0.75, maxTokens: 200, tag: `npc_${selectedScheme}_${success ? 'success' : 'failure'}` },
            )
        }).then(reply => {
            const source = getAiMode() === 'fallback' ? '本地兜底' : getAiModeLabel()
            updateNpcFeedback(actionId, reply.trim() || `${npcSnapshot.name}似有反应，却未置可否……`, source)
        }).catch(() => {
            updateNpcFeedback(actionId, `${npcSnapshot.name}似有反应，却未置可否……`, '本地兜底')
        })

        // 立刻重置表单进入下一次施计
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
        }, 800) // 短暂过渡动画
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
                    <h2 className="modal-title">施 计</h2>
                    <div className="scheme-counter">
                        今日第 <span className="highlight-number">{schemeCount + 1}</span> / {maxSchemes} 次计谋
                    </div>
                </div>

                <div className="scheme-body">
                    {justSubmitted ? (
                        <div className="feedback-card submitted animate-fade-in">
                            <p className="submitted-text">计谋已发，暗线运作中……</p>
                            <div className="ai-ripple"></div>
                        </div>
                    ) : (
                        <div className="scheme-steps">
                            {/* 步骤 1: 选择目标 NPC */}
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
                                            }}
                                        >
                                            <div className="npc-select-main">
                                                <NpcPortrait
                                                    name={npc.name}
                                                    className="npc-select-avatar"
                                                    framed
                                                    positionY="20%"
                                                    zoom={1.24}
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

                            {/* 步骤 2: 选择计谋 */}
                            {selectedNpc && (
                                <div className="step animate-slide-up">
                                    <h3 className="step-title"><span className="step-num">贰</span> 选择计谋</h3>
                                    <div className="scheme-select-grid">
                                        {SCHEMES.map(s => {
                                            if (s.targetScope === 'externalOnly' && selectedNpc.powerBase !== 'external') return null
                                            const available = availableSchemeTypes.includes(s.type)
                                            return (
                                                <button
                                                    key={s.type}
                                                    className={`scheme-btn ${selectedScheme === s.type ? 'selected' : ''} ${!available ? 'disabled' : ''}`}
                                                    disabled={!available}
                                                    onClick={() => setSelectedScheme(s.type)}
                                                >
                                                    <div className="scheme-info">
                                                        <span className="scheme-name">{s.name}</span>
                                                        <span className="scheme-desc">{s.description}</span>
                                                    </div>
                                                    {!available && (
                                                        <span className="scheme-lock">🔒 当前条件不足</span>
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* 步骤 3: 选择关联角色（如需要） */}
                            {currentSchemeData?.needsSecondTarget && (
                                <div className="step animate-slide-up">
                                    <h3 className="step-title"><span className="step-num">叁</span> 选择关联角色</h3>
                                    <div className="npc-select-grid">
                                        {aliveNpcs.filter(n => n.id !== selectedNpcId).map(npc => (
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
                                                        positionY="20%"
                                                        zoom={1.24}
                                                    />
                                                    <span className="npc-name">{npc.name}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 步骤 4: 补一句说辞 */}
                            {selectedScheme && (
                                <div className="step animate-slide-up">
                                    <h3 className="step-title">
                                        <span className="step-num">{currentSchemeData?.needsSecondTarget ? '肆' : '叁'}</span> 补一句说辞
                                    </h3>
                                    <div className="speech-input-wrapper">
                                        <textarea
                                            className="speech-input"
                                            value={speech}
                                            onChange={e => setSpeech(e.target.value)}
                                            placeholder="写一句话作为你的说辞（选填）..."
                                            maxLength={100}
                                        />
                                        <p className="speech-tip">说辞若命中此人的立场与心结，会实际影响计谋成败与效果幅度。</p>
                                        <div className="char-count">{speech.length}/100</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 确认执行 */}
                <div className="scheme-footer">
                    {!justSubmitted && selectedScheme && (
                        <button
                            className="btn-primary btn-execute animate-slide-up"
                            onClick={handleExecute}
                            disabled={currentSchemeData?.needsSecondTarget ? !relatedNpcId : false}
                        >
                            行 事
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
