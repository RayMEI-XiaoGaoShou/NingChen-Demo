import { useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { getPolicyQuestionForRound } from '../../data/policyQuestions'
import { parsePolicyReasonInput } from '../../game/aiNativeEngine'
import { FIRST_ROUND_GUIDE_CONTENT } from '../../data/prologueContent'
import { FirstRoundGuideModal } from '../FirstRoundGuide/FirstRoundGuideModal'
import { NpcPortrait } from '../NpcPortrait/NpcPortrait'
import { PageUtilityActions } from '../PageUtilityActions/PageUtilityActions'
import './EmpressLetter.css'

const optionIndexLabels = ['甲', '乙', '丙', '丁']

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
        const trimmedReason = reason.trim()
        const policyParse = trimmedReason ? await parsePolicyReasonInput({
            round: currentRound,
            topic: policyQ.topic,
            question: policyQ.question,
            reason: trimmedReason,
            meta: {
                legitimacyEffect: selectedOption?.legitimacyEffect ?? 'steady',
                aiScoringFocus: policyQ.aiScoringFocus,
            },
        }) : null

        selectPolicy(selected, trimmedReason, policyParse)
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
                <PageUtilityActions onOpenGuide={() => openGameplayGuide('gameplay')} />
            </div>

            <div className="letter-wrapper animate-slide-up">
                <div className="letter-header">
                    <span className="letter-from">南陈女帝 · 陈倩</span>
                    <span className="letter-label">密札</span>
                </div>

                <div className="letter-content glass-panel decree-panel animate-slide-up animate-delay-2">
                    <NpcPortrait
                        name="陈倩"
                        alt="陈倩画像"
                        className="letter-empress-portrait-float"
                        positionY="14%"
                        zoom={1}
                    />
                    {policyQ ? (
                        <>
                            <div className="letter-intro">
                                <div className="letter-intro-main">
                                    <p className="question-background question-background-prominent">{policyQ.background}</p>
                                    <p className="question-text">{policyQ.question}</p>
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
                                            <div className="option-index">{optionIndexLabels[i] ?? opt.label}</div>
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
                                        用一段短评补清你的判断依据。说清眼下最急的是什么、代价由谁承担、为什么现在就该这么做，
                                        天道结算会更容易放大这一策的真实效力。
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
                                            {isSubmitting ? '落笔成批…' : '呈递女帝'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <p className="question-text">本回合密札暂缺，尚待补录。</p>
                    )}
                </div>
            </div>
        </div>
    )
}
