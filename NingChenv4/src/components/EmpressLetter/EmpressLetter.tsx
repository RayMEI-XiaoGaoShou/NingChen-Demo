import { useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { getPolicyQuestionForRound } from '../../data/policyQuestions'
import { parsePolicyReasonInput } from '../../game/aiNativeEngine'
import { buildFirstRoundGuideSequence } from '../../game/fengDaozhiGuide'
import { FengDaozhiDialogueOverlay } from '../FengDaozhiDialogue/FengDaozhiDialogueOverlay'
import { PageUtilityActions } from '../PageUtilityActions/PageUtilityActions'
import { useSceneTransition } from '../SceneTransition/SceneTransition'
import { useGameSfx } from '../../audio/gameSfx'
import { getEmpressOptionSfxKey } from '../../data/mediaAssets'
import optionApprovalSeal from '../../assets/ui/round-start/roundstart-volume-seal.webp'
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
    const { runSceneTransition } = useSceneTransition()
    const { playSfx } = useGameSfx()
    const [selected, setSelected] = useState<number | null>(null)
    const [reason, setReason] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const policyQ = getPolicyQuestionForRound(currentRound, {
        shuCampaignState: shuCampaign.state,
        huainanCampaignState: huainanCampaign.state,
    })

    const handleSelectOption = (optionIndex: number) => {
        const optionSfx = getEmpressOptionSfxKey(optionIndex)
        if (optionSfx) playSfx(optionSfx)
        setSelected(optionIndex)
    }

    const handleSubmit = async () => {
        if (selected === null || !policyQ || isSubmitting) return

        playSfx('empress-next-page')
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
        await runSceneTransition({
            variant: 'from-empress-letter',
            onCovered: nextPhase,
        })
    }

    return (
        <div className="page-container empress-letter animate-fade-in">
            {currentRound === 1 && !firstRoundGuideSeen.empress_letter && (
                <FengDaozhiDialogueOverlay
                    sequences={[buildFirstRoundGuideSequence('empress_letter')]}
                    onSequenceComplete={() => undefined}
                    onComplete={() => markFirstRoundGuideSeen('empress_letter')}
                />
            )}

            <div className="empress-letter-stage">
                <div className="empress-letter-bg-wash" aria-hidden="true" />

                <div className="empress-letter-design-frame">
                    <div className="page-utility-row empress-letter-utility-row animate-slide-up">
                        <PageUtilityActions onOpenGuide={() => openGameplayGuide('gameplay')} />
                    </div>

                    <header className="letter-header">
                        <h1 className="letter-from">南陈女帝 · 陈倩</h1>
                        <span className="letter-label">密札</span>
                    </header>

                    <div className="empress-letter-artboard">
                        {policyQ ? (
                            <>
                                <section className="empress-letter-scroll letter-content animate-slide-up animate-delay-2">
                                    <img
                                        src="/images/ui/empress-letter/empress-letter-scroll.webp"
                                        alt=""
                                        className="empress-letter-scroll-art"
                                        draggable={false}
                                    />
                                    <div className="letter-paper-grain" aria-hidden="true" />
                                    <img
                                        src="/images/ui/empress-letter/empress-letter-south-seal.webp"
                                        alt=""
                                        className="empress-letter-south-seal"
                                        draggable={false}
                                    />

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
                                                    className={`option-btn ${selected === i ? 'selected' : ''}`}
                                                    onClick={() => handleSelectOption(i)}
                                                >
                                                    <div className="option-index">{optionIndexLabels[i] ?? opt.label}</div>
                                                    <div className="option-copy">
                                                        <div className="option-text">{opt.content}</div>
                                                        {opt.riskNote && <div className="option-risk">风险：{opt.riskNote}</div>}
                                                    </div>
                                                    {selected === i && (
                                                        <img
                                                            src={optionApprovalSeal}
                                                            alt=""
                                                            className="option-stamp"
                                                            draggable={false}
                                                        />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </section>

                                <img
                                    src="/images/ui/empress-letter/chenqian-letter-foreground-v3.webp"
                                    alt=""
                                    className="empress-letter-chenqian"
                                    draggable={false}
                                />

                                <div className="reason-panel note-panel">
                                    <div className="note-panel__texture" aria-hidden="true" />
                                    <div className="reason-header">
                                        <span className="reason-label">奏折附言</span>
                                        <span className="char-count">{reason.length}/100</span>
                                    </div>
                                    <textarea
                                        className="reason-input"
                                        value={reason}
                                        onChange={e => setReason(e.target.value)}
                                        placeholder="臣以为……"
                                        maxLength={100}
                                    />
                                </div>

                                <div className="empress-letter-submit-wrap">
                                    <button
                                        className="empress-letter-submit"
                                        onClick={handleSubmit}
                                        disabled={selected === null || isSubmitting}
                                    >
                                        <span className="empress-letter-submit-label">
                                            {isSubmitting ? '落笔成批…' : '呈递女帝'}
                                        </span>
                                    </button>
                                </div>
                            </>
                        ) : (
                            <p className="question-text">本回合密札暂缺，尚待补录。</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
