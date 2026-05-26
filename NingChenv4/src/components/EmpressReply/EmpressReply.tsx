import { useCallback, useEffect, useState } from 'react'
import { generateEmpressReplyRecordForPolicy } from '../../ai/empressReplyOrchestrator'
import { getRoundCampaignEventContext } from '../../game/campaignDisplayEngine'
import {
    buildSettlementDefaultEmpressReply,
    formatSignedDelta,
    formatSouthDimensionLabel,
    hasPolicyReason,
} from '../../game/empressReplyPresentation'
import { useGameStore } from '../../stores/gameStore'
import { PageUtilityActions } from '../PageUtilityActions/PageUtilityActions'
import { useSceneTransition } from '../SceneTransition/SceneTransition'
import './EmpressReply.css'

const formatReplySouthDimensionLabel = (dimension: string) => {
    const label = formatSouthDimensionLabel(dimension)
    return label === '民生秩序' ? '民生' : label
}

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
    const { runSceneTransition } = useSceneTransition()

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
                roundEvent: {
                    eventName: event.eventName,
                    eventBriefing: event.eventBriefing,
                },
                worldMemoryLedger,
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
    const effectEntries = policyReport
        ? Object.entries(policyReport.effects).filter(([, rawValue]) => typeof rawValue === 'number' && rawValue !== 0)
        : []
    const authoredReasonText = policyReport?.reason.trim()
    const handleContinue = useCallback(() => {
        if (!canContinue) return
        void runSceneTransition({
            variant: 'to-settlement',
            onCovered: nextPhase,
        })
    }, [canContinue, nextPhase, runSceneTransition])

    return (
        <div className="page-container empress-reply page-enter">
            <div className="empress-reply-stage">
                <div className="empress-reply-bg-wash" aria-hidden="true" />

                <div className="empress-reply-design-frame">
                    <div className="page-utility-row empress-reply-utility-row animate-slide-up">
                        <PageUtilityActions onOpenGuide={() => openGameplayGuide('gameplay')} />
                    </div>

                    <header className="empress-reply-header">
                        <h1 className="empress-reply-from">南陈女帝 · 陈倩</h1>
                        <span className="empress-reply-seal">密札</span>
                    </header>

                    <div className="empress-reply-artboard">
                        <section className="empress-reply-paper animate-slide-up animate-delay-1">
                            <img
                                src="/images/ui/empress-reply/empress-reply-scroll.webp"
                                alt=""
                                className="empress-reply-scroll-art"
                                draggable={false}
                            />

                            {policyReport ? (
                                <>
                                    <img
                                        src="/images/ui/empress-letter/empress-letter-south-seal.webp"
                                        alt=""
                                        className="empress-reply-south-seal"
                                        draggable={false}
                                    />

                                    <div className="empress-reply-summary-strip">
                                        <p className="empress-reply-summary-copy">
                                            <span>所取策令：{policyReport.optionLabel}. {policyReport.optionContent}</span>
                                            <span>奏折附言：{authoredReasonText || '未具附言'}</span>
                                        </p>
                                    </div>

                                    <div className="empress-reply-reply-panel">
                                        <div className="empress-reply-panel-heading">
                                            <span aria-hidden="true" />
                                            <h2>建康回批</h2>
                                            <span aria-hidden="true" />
                                        </div>

                                        <blockquote className="empress-reply-body">
                                            {isGenerating && !activeReply ? (
                                                <span className="empress-reply-loading">
                                                    <span className="ai-ripple"></span>
                                                    女帝密批正在送达…
                                                </span>
                                            ) : replyText}
                                        </blockquote>
                                    </div>

                                    <div className="empress-reply-lower-grid">
                                        <div className="empress-reply-verdict-panel empress-reply-scroll-panel">
                                            <div className="empress-reply-panel-heading empress-reply-panel-heading-small">
                                                <span aria-hidden="true" />
                                                <h3>附言判断</h3>
                                                <span aria-hidden="true" />
                                            </div>
                                             <strong className={policyReasonAuthored && policyReport.focusMatched ? 'positive' : 'muted'}>
                                                 {!policyReasonAuthored
                                                     ? '未具附言'
                                                     : policyReport.focusMatched
                                                        ? '言之有物'
                                                         : '论证偏泛'}
                                             </strong>
                                             <p>
                                                 {!policyReasonAuthored
                                                     ? '本回合未写附言，因此只保留女帝默认短批，不额外调动女帝 Agent。'
                                                     : policyReport.focusMatched
                                                        ? '你抓住了问题的关键，此谏言产生的影响会持续至后续卷'
                                                         : '你的附言有方向，但尚未完全扣住题眼，后续余波会被压轻。'}
                                             </p>
                                         </div>

                                        <div className="empress-reply-change-panel empress-reply-scroll-panel">
                                             <div className="empress-reply-panel-heading empress-reply-panel-heading-small">
                                                 <span aria-hidden="true" />
                                                <h3>南陈国力变化</h3>
                                                 <span aria-hidden="true" />
                                             </div>
                                             <div className="empress-reply-effects">
                                                {effectEntries.length > 0 ? effectEntries.map(([dimension, rawValue]) => (
                                                    <span
                                                        key={dimension}
                                                        className={`empress-reply-effect ${rawValue > 0 ? 'positive' : 'negative'}`}
                                                    >
                                                        {formatReplySouthDimensionLabel(dimension)} {formatSignedDelta(rawValue)}
                                                    </span>
                                                )) : (
                                                     <span className="empress-reply-effect muted">无显著波动</span>
                                                 )}
                                             </div>
                                         </div>
                                    </div>
                                </>
                            ) : (
                                <div className="empress-reply-reply-panel empress-reply-reply-panel-empty">
                                    <div className="empress-reply-panel-heading">
                                        <span aria-hidden="true" />
                                        <h2>建康回批</h2>
                                        <span aria-hidden="true" />
                                    </div>
                                    <h2>本回合暂无问政记录</h2>
                                    <p>可以继续进入天道结算，查看北周朝局与总体走势。</p>
                                </div>
                            )}
                        </section>

                        <div className="empress-reply-submit-wrap">
                            <button className="empress-reply-submit" onClick={handleContinue} disabled={!canContinue}>
                                <span className="empress-reply-submit-label">查看本卷结算</span>
                            </button>
                        </div>

                    </div>
                </div>

                <div className="empress-reply-foreground-bleed" aria-hidden="true">
                    <div className="empress-reply-foreground-proxy">
                        <img
                            src="/images/ui/empress-reply/empress-reply-foreground.webp"
                            alt=""
                            className="empress-reply-foreground"
                            draggable={false}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
