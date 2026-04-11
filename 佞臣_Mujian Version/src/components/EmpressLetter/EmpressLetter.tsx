// ========================================
// 女帝来信页
// 固定题库驱动；上一回合回批已前置到结算页展示
// ========================================

import { useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { getPolicyQuestionForRound } from '../../data/policyQuestions'
import { parsePolicyReasonInput } from '../../game/aiNativeEngine'
import { FIRST_ROUND_GUIDE_CONTENT } from '../../data/prologueContent'
import { FirstRoundGuideModal } from '../FirstRoundGuide/FirstRoundGuideModal'
import './EmpressLetter.css'

export function EmpressLetter() {
    const {
        currentRound,
        nextPhase,
        selectPolicy,
        firstRoundGuideSeen,
        markFirstRoundGuideSeen,
        openGameplayGuide,
        shuCampaign,
        huainanCampaign,
    } = useGameStore()
    const [selected, setSelected] = useState<number | null>(null)
    const [reason, setReason] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const policyQ = getPolicyQuestionForRound(currentRound, {
        shuCampaignState: shuCampaign.state,
        huainanCampaignState: huainanCampaign.state,
    })

    const handleSubmit = async () => {
        if (selected === null || !policyQ || isSubmitting) return
        setIsSubmitting(true)
        const selectedOption = policyQ.options[selected]
        const policyParse = await parsePolicyReasonInput({
            round: currentRound,
            topic: policyQ.topic,
            question: policyQ.question,
            reason,
            meta: {
                legitimacyEffect: selectedOption?.legitimacyEffect ?? 'steady',
                aiScoringFocus: policyQ.aiScoringFocus,
            },
        })
        selectPolicy(selected, reason, policyParse)
        nextPhase()
    }

    return (
        <div className="page-container empress-letter animate-fade-in">
            {currentRound === 1 && !firstRoundGuideSeen.empress_letter && (
                <FirstRoundGuideModal
                    title={FIRST_ROUND_GUIDE_CONTENT.empress_letter.title}
                    body={FIRST_ROUND_GUIDE_CONTENT.empress_letter.body}
                    onClose={() => markFirstRoundGuideSeen('empress_letter')}
                />
            )}
            <div className="page-utility-row animate-slide-up">
                <button className="btn-help" onClick={() => openGameplayGuide('gameplay')}>
                    玩法说明
                </button>
            </div>
            <div className="letter-wrapper animate-slide-up">
                <div className="letter-header">
                    <span className="letter-from">南陈女帝 · 陈倩</span>
                    <span className="letter-label">密 信</span>
                </div>

                <div className="letter-content glass-panel animate-slide-up animate-delay-2">
                    {policyQ ? (
                        <>
                            <p className="topic-chip">问政母题 · {policyQ.topic}</p>
                            <p className="question-background">{policyQ.background}</p>
                            <p className="question-text">{policyQ.question}</p>

                            <div className="options-container">
                                {policyQ.options.map((opt, i) => (
                                    <button
                                        key={opt.label}
                                        className={`gold-panel option-btn ${selected === i ? 'selected' : ''}`}
                                        onClick={() => setSelected(i)}
                                    >
                                        <div className="option-index">{opt.label}</div>
                                        <div className="option-copy">
                                            <div className="option-text">{opt.content}</div>
                                            {opt.riskNote && <div className="option-risk">风险：{opt.riskNote}</div>}
                                        </div>
                                        {selected === i && <div className="option-stamp">准</div>}
                                    </button>
                                ))}
                            </div>

                            {selected !== null && (
                                <div className="reason-section animate-slide-up">
                                    <div className="reason-header">
                                        <span className="reason-label">奏折附言 (选填)</span>
                                        <span className="char-count">{reason.length}/100</span>
                                    </div>
                                    <p className="reason-helper">附言若能说清轻重缓急、代价取舍与可行之道，便能实际放大该选项对南陈国力的效用。</p>
                                    <textarea
                                        className="reason-input"
                                        value={reason}
                                        onChange={e => setReason(e.target.value)}
                                        placeholder="臣以为..."
                                        maxLength={100}
                                    />
                                </div>
                            )}

                            <div className="action-footer">
                                <button
                                    className="btn-primary btn-submit"
                                    onClick={handleSubmit}
                                    disabled={selected === null || isSubmitting}
                                >
                                    {isSubmitting ? '解析附言中…' : '奏 上'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <p className="question-text">本回合密信暂缺，尚待补录。</p>
                    )}
                </div>
            </div>
        </div>
    )
}
