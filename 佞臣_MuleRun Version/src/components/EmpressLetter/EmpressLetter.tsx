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
                <div className="letter-heading-block">
                    <span className="page-eyebrow">女帝来札</span>
                    <div className="page-mission-strip letter-mission-strip">
                        <div className="page-mission-item">
                            <span className="page-mission-label">先读什么</span>
                            <p className="page-mission-text">先读清背景和真正的问题，不要把它当成普通三选一。</p>
                        </div>
                        <div className="page-mission-item">
                            <span className="page-mission-label">如何判断</span>
                            <p className="page-mission-text">这一页比的不是辞藻，而是你是否说清轻重、代价和当下为何该这样做。</p>
                        </div>
                        <div className="page-mission-item">
                            <span className="page-mission-label">如何落笔</span>
                            <p className="page-mission-text">先定立场，再补附言。附言越切题，问政收益和后续余波越稳。</p>
                        </div>
                    </div>
                </div>

                <div className="letter-header">
                    <span className="letter-from">南陈女帝 · 陈倩</span>
                    <span className="letter-label">密札</span>
                </div>

                <div className="letter-content glass-panel decree-panel animate-slide-up animate-delay-2">
                    {policyQ ? (
                        <>
                            <div className="letter-intro">
                                <div className="letter-intro-main">
                                    <p className="topic-chip">问政母题 · {policyQ.topic}</p>
                                    <p className="question-background">{policyQ.background}</p>
                                    <p className="question-text">{policyQ.question}</p>
                                </div>
                                <div className="letter-intro-side">
                                    <div className="brief-card">
                                        <span className="brief-label">批阅提示</span>
                                        <p>此处不是单纯择优，而是在取舍缓急、名分与后效。</p>
                                    </div>
                                    <div className="brief-card">
                                        <span className="brief-label">附言效用</span>
                                        <p>附言若能说清轻重缓急、代价取舍与可行之道，便能放大此策对南陈国力的影响。</p>
                                    </div>
                                </div>
                            </div>

                            <div className="letter-decision-grid">
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

                                <div className="reason-panel">
                                    <div className="reason-header">
                                        <span className="reason-label">奏折附言</span>
                                        <span className="char-count">{reason.length}/100</span>
                                    </div>
                                    <p className="reason-helper">
                                        用一段短评补清你的判断依据。好的附言通常会交代三件事：眼下最急的是什么、代价该由谁承担、为什么现在就得这样做。
                                    </p>
                                    <textarea
                                        className="reason-input"
                                        value={reason}
                                        onChange={e => setReason(e.target.value)}
                                        placeholder="臣以为……"
                                        maxLength={100}
                                    />

                                    <div className="reason-actions">
                                        <button
                                            className="btn-primary btn-submit"
                                            onClick={handleSubmit}
                                            disabled={selected === null || isSubmitting}
                                        >
                                            {isSubmitting ? '落笔成批…' : '朱批回奏'}
                                        </button>
                                    </div>
                                </div>
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
