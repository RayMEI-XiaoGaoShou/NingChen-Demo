import { useEffect, useState } from 'react'
import { generateEmpressReplyRecordForPolicy } from '../../ai/empressReplyOrchestrator'
import { getRoundCampaignEventContext } from '../../game/campaignDisplayEngine'
import {
    buildSettlementDefaultEmpressReply,
    formatSignedDelta,
    formatSouthDimensionLabel,
    hasPolicyReason,
} from '../../game/empressReplyPresentation'
import { useGameStore } from '../../stores/gameStore'
import { NpcPortrait } from '../NpcPortrait/NpcPortrait'
import { PageUtilityActions } from '../PageUtilityActions/PageUtilityActions'
import './EmpressReply.css'

export function EmpressReply() {
    const {
        currentRound,
        nextPhase,
        lastSettlement,
        roundStartSnapshot,
        empressReplyRecord,
        setEmpressReplyRecord,
        openGameplayGuide,
        shuCampaign,
        huainanCampaign,
        worldMemoryLedger,
    } = useGameStore()
    const [isGenerating, setIsGenerating] = useState(false)

    const policyReport = lastSettlement?.policyReport ?? null
    const policyReasonAuthored = hasPolicyReason(policyReport)
    const activeReply = empressReplyRecord?.sourceRound === currentRound ? empressReplyRecord : null

    useEffect(() => {
        let cancelled = false

        async function generateReply() {
            if (!policyReport || !lastSettlement) return
            if (activeReply) return

            setIsGenerating(true)
            const event = getRoundCampaignEventContext(currentRound, shuCampaign, huainanCampaign)
            const replyRecord = await generateEmpressReplyRecordForPolicy({
                currentRound,
                policyReport,
                policyAftereffect: lastSettlement.policyAftereffect,
                southStatsAfter: lastSettlement.southStatsAfter,
                playerDangerStage: roundStartSnapshot?.playerDangerStage ?? 'safe',
                invasionSummary: lastSettlement.judgeFacts.invasionSummary,
                worldMemoryLedger,
                roundEvent: {
                    eventName: event.eventName,
                    eventBriefing: event.eventBriefing,
                },
                tag: 'empress_feedback_reply_page',
            })
            if (cancelled) return

            setEmpressReplyRecord({
                sourceRound: replyRecord.sourceRound,
                text: replyRecord.text,
                mode: replyRecord.mode,
            })
            setIsGenerating(false)
        }

        void generateReply().catch(() => {
            if (cancelled || !policyReport) return
            const defaultText = buildSettlementDefaultEmpressReply(policyReport) ?? '朕已知之。'
            setEmpressReplyRecord({
                sourceRound: currentRound,
                text: defaultText,
                mode: 'fallback',
            })
            setIsGenerating(false)
        })

        return () => {
            cancelled = true
        }
    }, [activeReply, currentRound, huainanCampaign, lastSettlement, policyReport, roundStartSnapshot?.playerDangerStage, setEmpressReplyRecord, shuCampaign, worldMemoryLedger])

    const replyText = activeReply?.text ?? (policyReport ? '女帝密批正在送达…' : '建康暂无回信，本回合南陈问政记录缺失。')
    const canContinue = !policyReport || Boolean(activeReply)

    return (
        <div className="page-container empress-reply page-enter">
            <div className="page-utility-row animate-slide-up">
                <PageUtilityActions onOpenGuide={() => openGameplayGuide('gameplay')} />
            </div>

            <div className="empress-reply-shell animate-slide-up">
                <div className="empress-reply-header">
                    <span className="empress-reply-from">南陈女帝 · 陈倩</span>
                    <span className="empress-reply-seal">密批已至</span>
                </div>

                <section className="empress-reply-scroll gold-panel decree-panel animate-slide-up animate-delay-1">
                    <NpcPortrait
                        name="陈倩"
                        alt="陈倩画像"
                        className="empress-reply-portrait"
                        positionY="14%"
                        zoom={1}
                    />

                    {policyReport ? (
                        <>
                            <div className="empress-reply-question">
                                <span className="empress-reply-kicker">建康回信</span>
                                <h2>{policyReport.question}</h2>
                                <p>
                                    本回合所取：
                                    <span className="empress-reply-option">
                                        {policyReport.optionLabel}. {policyReport.optionContent}
                                    </span>
                                </p>
                            </div>

                            <blockquote className="empress-reply-body">
                                {isGenerating && !activeReply ? (
                                    <span className="empress-reply-loading">
                                        <span className="ai-ripple"></span>
                                        女帝密批正在送达…
                                    </span>
                                ) : replyText}
                            </blockquote>

                            <div className="empress-reply-meta-grid">
                                <div className="empress-reply-meta-card">
                                    <span className="empress-reply-meta-label">附言判断</span>
                                    <strong className={policyReasonAuthored && policyReport.focusMatched ? 'positive' : 'muted'}>
                                        {!policyReasonAuthored
                                            ? '未具附言'
                                            : policyReport.focusMatched
                                                ? '论证切题'
                                                : '论证偏泛'}
                                    </strong>
                                    <p>
                                        {!policyReasonAuthored
                                            ? '本回合未写附言，因此只保留女帝默认短批，不额外调动女帝 Agent。'
                                            : policyReport.focusMatched
                                                ? '你的附言抓住了本题关节，后续问政余波会更容易发力。'
                                                : '你的附言有方向，但尚未完全扣住题眼，后续余波会被压轻。'}
                                    </p>
                                </div>

                                <div className="empress-reply-meta-card">
                                    <span className="empress-reply-meta-label">本回合南陈变化</span>
                                    <div className="empress-reply-effects">
                                        {Object.entries(policyReport.effects).map(([dimension, rawValue]) => {
                                            if (typeof rawValue !== 'number' || rawValue === 0) return null
                                            return (
                                                <span
                                                    key={dimension}
                                                    className={`effect-tag ${rawValue > 0 ? 'positive' : 'negative'}`}
                                                >
                                                    {formatSouthDimensionLabel(dimension)} {formatSignedDelta(rawValue)}
                                                </span>
                                            )
                                        })}
                                    </div>
                                    <p>{policyReport.effectSummary}</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="empress-reply-question">
                            <span className="empress-reply-kicker">建康回信</span>
                            <h2>本回合暂无问政记录</h2>
                            <p>可以继续进入天道结算，查看北周朝局与总体走势。</p>
                        </div>
                    )}
                </section>

                <div className="action-footer animate-slide-up animate-delay-2">
                    <button className="btn-primary btn-next" onClick={nextPhase} disabled={!canContinue}>
                        查看天道结算
                    </button>
                </div>
            </div>
        </div>
    )
}
