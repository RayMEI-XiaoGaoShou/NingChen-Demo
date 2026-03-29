// ========================================
// NPC 反馈集中展示页
// 展示 3 条 NPC 对计谋的反馈
// ========================================

import { useEffect } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { FIRST_ROUND_GUIDE_CONTENT } from '../../data/prologueContent'
import { buildNpcPrompt } from '../../ai/prompts'
import { chatCompletion, getAiMode, getAiModeLabel } from '../../ai/aiService'
import { previewSchemeSuccess } from '../../game/schemeEngine'
import { FirstRoundGuideModal } from '../FirstRoundGuide/FirstRoundGuideModal'
import './SchemeFeedback.css'

export function SchemeFeedback() {
    const { npcFeedbacks, currentSchemes, npcs, addNpcFeedback, updateNpcFeedback, nextPhase, currentRound, firstRoundGuideSeen, markFirstRoundGuideSeen, openGameplayGuide } = useGameStore()
    const allDone = npcFeedbacks.every(f => !f.isLoading)

    useEffect(() => {
        if (npcFeedbacks.length > 0 || currentSchemes.length === 0) return

        const schemeNames: Record<string, string> = {
            probe: '试探', advise: '献策', slander: '谗言', alienate: '离间',
            frame: '放风构陷', proxy: '借刀', appeal: '求援', omen: '谶纬',
        }

        currentSchemes.forEach((action, index) => {
            const targetNpc = npcs.find(npc => npc.id === action.targetNpcId)
            if (!targetNpc) return

            const feedbackId = action.id ?? `rebuild_${index}_${targetNpc.id}`
            const previousActions = currentSchemes
                .slice(0, index)
                .filter(item => item.targetNpcId === action.targetNpcId).length
            const success = previewSchemeSuccess(action, targetNpc, previousActions, action.resolutionRoll ?? 0.5)

            addNpcFeedback({
                id: feedbackId,
                npcId: targetNpc.id,
                npcName: targetNpc.name,
                schemeType: action.schemeType,
                schemeName: schemeNames[action.schemeType] ?? action.schemeType,
                playerSpeech: action.playerSpeech,
                feedback: '',
                isLoading: true,
                source: getAiModeLabel(),
            })

            chatCompletion(
                buildNpcPrompt({
                    npc: targetNpc,
                    schemeType: action.schemeType,
                    speech: action.playerSpeech,
                    success,
                }),
                { temperature: 0.75, maxTokens: 200, tag: `npc_${action.schemeType}_${success ? 'success' : 'failure'}` },
            ).then(reply => {
                const source = getAiMode() === 'fallback' ? '本地兜底' : getAiModeLabel()
                updateNpcFeedback(feedbackId, reply.trim() || `${targetNpc.name}似有反应，却未置可否……`, source)
            }).catch(() => {
                updateNpcFeedback(feedbackId, `${targetNpc.name}似有反应，却未置可否……`, '本地兜底')
            })
        })
    }, [addNpcFeedback, currentSchemes, npcs, npcFeedbacks.length, updateNpcFeedback])

    return (
        <div className="page-container scheme-feedback animate-fade-in">
            {currentRound === 1 && !firstRoundGuideSeen.scheme_feedback && (
                <FirstRoundGuideModal
                    title={FIRST_ROUND_GUIDE_CONTENT.scheme_feedback.title}
                    body={FIRST_ROUND_GUIDE_CONTENT.scheme_feedback.body}
                    onClose={() => markFirstRoundGuideSeen('scheme_feedback')}
                />
            )}
            <div className="page-utility-row animate-slide-up">
                <button className="btn-help" onClick={() => openGameplayGuide('gameplay')}>
                    玩法说明
                </button>
            </div>
            <h2 className="page-title animate-slide-up">暗 线 回 报</h2>

            <div className="feedback-list">
                {npcFeedbacks.length === 0 && (
                    <div className="feedback-item glass-panel done">
                        <div className="feedback-body">
                            <div className="feedback-text-area">
                                <p className="feedback-text">本回合暂未收到暗线回报。若再次出现，请记录回合与目标，我会继续追查。</p>
                            </div>
                        </div>
                    </div>
                )}
                {npcFeedbacks.map((fb, i) => (
                    <div
                        key={fb.id}
                        className={`feedback-item glass-panel animate-slide-up ${fb.isLoading ? 'loading' : 'done'}`}
                        style={{ animationDelay: `${0.1 + i * 0.15}s` }}
                    >
                        <div className="feedback-header">
                            <div className="feedback-avatar">{fb.npcName.charAt(0)}</div>
                            <div className="feedback-meta">
                                <span className="feedback-npc-name">{fb.npcName}</span>
                                <span className="feedback-scheme-label">
                                    计谋：{fb.schemeName}
                                    {fb.playerSpeech && <span className="feedback-speech"> · "{fb.playerSpeech}"</span>}
                                </span>
                            </div>
                        </div>
                        <div className="feedback-body">
                            {fb.isLoading ? (
                                <div className="loading-state">
                                    <div className="ai-ripple"></div>
                                    <p className="loading-hint">{fb.npcName}正在思忖……</p>
                                </div>
                            ) : (
                                <div className="feedback-text-area animate-fade-in">
                                    <div className="quote-mark">「</div>
                                    <p className="feedback-text">{fb.feedback}</p>
                                    <div className="quote-mark end">」</div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="action-footer animate-slide-up animate-delay-4">
                <button
                    className="btn-primary btn-proceed"
                    onClick={nextPhase}
                    disabled={!allDone}
                >
                    {allDone ? '查 看 结 算' : '等待暗线回报…'}
                </button>
            </div>
        </div>
    )
}
