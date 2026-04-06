import { useEffect, useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { FIRST_ROUND_GUIDE_CONTENT } from '../../data/prologueContent'
import { SCHEMES } from '../../data/schemes'
import { chatCompletion } from '../../ai/aiService'
import { buildEmpressFeedbackPrompt, buildJudgePrompt } from '../../ai/prompts'
import { ROUND_EVENTS } from '../../data/rounds'
import { RadarChart } from '../RadarChart/RadarChart'
import { FirstRoundGuideModal } from '../FirstRoundGuide/FirstRoundGuideModal'
import { getRelativePowerLabel, getRelativePowerLevel } from '../../game/relativePower'
import type { JudgeFacts, RoundSettlementResult } from '../../game/roundSettlement'
import './Settlement.css'

export function getSettlementPolicyFollowupText(focusMatched: boolean): string {
    return focusMatched
        ? '你的附言切中此议的真正关节，新政的收益也会延续到下一回合。'
        : '你的附言尚嫌宽泛，但新政的收益仍会延续到下一回合。'
}

export function getSafeSettlementJudgeFacts(
    settlement: Pick<RoundSettlementResult, 'judgeFacts'> | null,
): JudgeFacts {
    const judgeFacts = settlement?.judgeFacts

    return {
        eventImpactSummary: judgeFacts?.eventImpactSummary ?? '本回合局势尚在调整，暂未显现新的波动。',
        factionSummary: judgeFacts?.factionSummary ?? '朝局暂稳，各方都还在等风向。',
        relationshipSummary: judgeFacts?.relationshipSummary ?? '',
        externalSummary: judgeFacts?.externalSummary ?? '边镇与外部势力仍在观望。',
        northSummary: judgeFacts?.northSummary ?? '北周国势暂无明显变化。',
        southSummary: judgeFacts?.southSummary ?? '南陈新政的后效尚在逐步显形。',
        invasionSummary: judgeFacts?.invasionSummary ?? '南征窗口仍待后续观察。',
        survivalSummary: judgeFacts?.survivalSummary ?? '风声暂稳。',
        aiNativeSummary: {
            schemeHints: judgeFacts?.aiNativeSummary?.schemeHints ?? [],
            backlashHints: judgeFacts?.aiNativeSummary?.backlashHints ?? [],
            policyHints: judgeFacts?.aiNativeSummary?.policyHints ?? [],
        },
    }
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value)
}

function formatDelta(value: unknown): string | null {
    if (!isFiniteNumber(value) || value === 0) return null
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}`
}

function sanitizeDeltaRecord(record: Record<string, unknown> | null | undefined): Record<string, number> {
    if (!record) return {}

    return Object.fromEntries(
        Object.entries(record).map(([key, value]) => [key, isFiniteNumber(value) ? value : 0]),
    )
}

export function Settlement() {
    const {
        nextPhase,
        lastSettlement,
        northPower,
        southPower,
        currentSchemes,
        npcs,
        currentRound,
        northStats,
        southStats,
        firstRoundGuideSeen,
        markFirstRoundGuideSeen,
        openGameplayGuide,
    } = useGameStore()

    const [judgeNarration, setJudgeNarration] = useState<string | null>(lastSettlement?.summaryText ?? null)
    const [isLoading, setIsLoading] = useState(Boolean(lastSettlement))
    const [empressReply, setEmpressReply] = useState<string | null>(null)
    const settlementGuide = FIRST_ROUND_GUIDE_CONTENT.settlement ?? { title: '', body: [] }
    const judgeFacts = getSafeSettlementJudgeFacts(lastSettlement)

    const schemeName = (type: string) => SCHEMES.find(s => s.type === type)?.name ?? type
    const schemeHints = judgeFacts.aiNativeSummary.schemeHints
    const backlashHints = judgeFacts.aiNativeSummary.backlashHints
    const invasionWindowLabel = lastSettlement?.judgeFacts?.invasionSummary?.split?.('；')?.[0] ?? '待判'
    const settlementPolicyFollowup =
        lastSettlement?.policyAftereffect && lastSettlement.policyReport
            ? getSettlementPolicyFollowupText(lastSettlement.policyReport.focusMatched)
            : null

    useEffect(() => {
        let cancelled = false

        async function generateNarration() {
            if (!lastSettlement) {
                setJudgeNarration('结算文书正在整理，请稍候。')
                setEmpressReply(null)
                setIsLoading(false)
                return
            }

            setIsLoading(true)

            if (!lastSettlement.judgeFacts) {
                setJudgeNarration(lastSettlement.summaryText || '本回合局势已有变化，可先看下方结算。')
                setEmpressReply(
                    lastSettlement.policyReport
                        ? `朕已按“${lastSettlement.policyReport.optionContent}”着手施行，眼下${lastSettlement.policyReport.effectSummary}。`
                        : null,
                )
                setIsLoading(false)
                return
            }

            const event = ROUND_EVENTS[currentRound - 1]
            const trustSummary = Object.entries(lastSettlement.trustChanges)
                .map(([id, delta]) => {
                    const npc = npcs.find(n => n.id === id)
                    return `${npc?.name ?? id} ${delta > 0 ? '+' : ''}${delta}`
                })
                .join('；') || '无变化'

            const messages = buildJudgePrompt({
                round: currentRound,
                eventName: event?.eventName ?? '',
                eventImpactSummary: judgeFacts.eventImpactSummary,
                schemeResults: lastSettlement.schemeResults.map((r, i) => ({
                    schemeName: schemeName(currentSchemes[i]?.schemeType ?? ''),
                    targetName: npcs.find(n => n.id === currentSchemes[i]?.targetNpcId)?.name ?? '',
                    success: r.success,
                    feedback: r.feedbackText,
                    playerSpeech: currentSchemes[i]?.playerSpeech ?? '',
                })),
                trustChangeSummary: trustSummary,
                northPowerChange: `综合国力 ${northPower.toFixed(1)}`,
                factionSummary: judgeFacts.factionSummary,
                relationshipSummary: judgeFacts.relationshipSummary,
                externalSummary: judgeFacts.externalSummary,
                northSummary: judgeFacts.northSummary,
                southSummary: judgeFacts.southSummary,
                invasionSummary: lastSettlement.judgeFacts.invasionSummary ?? '南征窗口仍待后续观察。',
            })

            try {
                const [narration, southReply] = await Promise.all([
                    chatCompletion(messages, {
                        temperature: 0.9,
                        maxTokens: 300,
                        tag: 'judge',
                    }),
                    lastSettlement.policyReport
                        ? chatCompletion(buildEmpressFeedbackPrompt(lastSettlement.policyReport), {
                            temperature: 0.75,
                            maxTokens: 180,
                            tag: 'empress_feedback_settlement',
                        })
                        : Promise.resolve(''),
                ])
                if (cancelled) return
                setJudgeNarration(narration)
                setEmpressReply(lastSettlement.policyReport ? southReply.trim() || null : null)
            } catch {
                if (cancelled) return
                setJudgeNarration(lastSettlement.summaryText || '本回合局势已有变化，可先看下方结算。')
                setEmpressReply(
                    lastSettlement.policyReport
                        ? `朕已按“${lastSettlement.policyReport.optionContent}”着手施行，眼下${lastSettlement.policyReport.effectSummary}。`
                        : null,
                )
            } finally {
                if (cancelled) return
                setIsLoading(false)
            }
        }

        void generateNarration().catch(() => {
            if (cancelled) return
            setJudgeNarration(lastSettlement?.summaryText || '本回合局势已有变化，可先看下方结算。')
            setEmpressReply(
                lastSettlement?.policyReport
                    ? `朕已按“${lastSettlement.policyReport.optionContent}”着手施行，眼下${lastSettlement.policyReport.effectSummary}。`
                    : null,
            )
            setIsLoading(false)
        })
        return () => {
            cancelled = true
        }
    }, [currentRound, currentSchemes, lastSettlement, northPower, npcs])

    return (
        <div className="page-container settlement animate-fade-in">
            {currentRound === 1 && !firstRoundGuideSeen.settlement && (
                <FirstRoundGuideModal
                    title={settlementGuide.title}
                    body={settlementGuide.body}
                    onClose={() => markFirstRoundGuideSeen('settlement')}
                />
            )}

            <div className="page-utility-row animate-slide-up">
                <button className="btn-help" onClick={() => openGameplayGuide('gameplay')}>
                    玩法说明
                </button>
            </div>

            <div className="settlement-header animate-slide-up">
                <span className="page-eyebrow">天道判卷</span>
                <h2 className="page-title">本 回 合 结 算</h2>
            </div>

            <div className="page-mission-strip animate-slide-up animate-delay-1">
                <div className="page-mission-item">
                    <span className="page-mission-label">先看什么</span>
                    <p className="page-mission-text">先看天道判词，确认这一回合真正赢在哪、坏在哪。</p>
                </div>
                <div className="page-mission-item">
                    <span className="page-mission-label">再看什么</span>
                    <p className="page-mission-text">再看施计结果、女帝回信与大局推演，别一上来就钻细项。</p>
                </div>
                <div className="page-mission-item">
                    <span className="page-mission-label">最后做什么</span>
                    <p className="page-mission-text">确认南征窗口、自身风险与南陈余势，再决定如何迎接下一回合。</p>
                </div>
            </div>

            <div className="settlement-content">
                <div className="scroll-container animate-slide-up animate-delay-1">
                    <div className="judge-narration gold-panel decree-panel">
                        <div className="scroll-decorator top"></div>
                        <h3 className="judge-title">天道判官卷</h3>
                        <div className="narration-content">
                            {isLoading ? (
                                <div className="loading-state">
                                    <div className="ai-ripple"></div>
                                    <p className="narration-loading">天道判官正在审视本回合的得失</p>
                                </div>
                            ) : (
                                <p className="narration-text typewriter">{judgeNarration}</p>
                            )}
                        </div>
                        <div className="scroll-decorator bottom"></div>
                    </div>
                </div>

                <div className="results-section animate-slide-up animate-delay-2">
                    <h3 className="section-title">计谋筹算结果</h3>
                    {schemeHints.length ? (
                        <div className="glass-panel subtle-hints">
                            {schemeHints.map(hint => (
                                <p key={hint} className="result-text">{hint}</p>
                            ))}
                        </div>
                    ) : null}
                    <div className="results-list">
                        {lastSettlement?.schemeResults.map((result, i) => {
                            const action = currentSchemes[i]
                            const npc = npcs.find(n => n.id === action?.targetNpcId)
                            return (
                                <div
                                    key={i}
                                    className={`result-card glass-panel animate-slide-up ${result.success ? 'success' : 'failure'}`}
                                    style={{ animationDelay: `${0.8 + i * 0.2}s` }}
                                >
                                    <div className="result-header">
                                        <div className="result-info">
                                            <span className="result-index">计谋 {i + 1}</span>
                                            <span className="result-scheme">{schemeName(action?.schemeType ?? '')}</span>
                                        </div>
                                        <div className={`result-badge ${result.success ? 'success' : 'failure'}`}>
                                            {result.success ? '成' : '败'}
                                        </div>
                                    </div>
                                    <p className="result-text">{result.feedbackText}</p>
                                    <div className="result-effects">
                                        {result.trustChange !== 0 && (
                                            <span className={`effect-tag ${result.trustChange > 0 ? 'positive' : 'negative'}`}>
                                                {npc?.name} 信任 {result.trustChange > 0 ? '+' : ''}{result.trustChange}
                                            </span>
                                        )}
                                        {Object.entries(sanitizeDeltaRecord(result.northDimensionChanges)).map(([dim, val]) => {
                                            const formattedDelta = formatDelta(val)
                                            if (!formattedDelta) return null
                                            const dimNames: Record<string, string> = {
                                                finance: '财政',
                                                grain: '粮赋',
                                                military: '军事',
                                                socialOrder: '社会秩序',
                                                governance: '统治穿透力',
                                            }
                                            return (
                                                <span key={dim} className={`effect-tag ${Number(val) > 0 ? 'positive' : 'negative'}`}>
                                                    北周{dimNames[dim]} {(val as number) > 0 ? '+' : ''}{(val as number).toFixed(1)}
                                                </span>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {lastSettlement?.policyReport && (
                    <div className="results-section animate-slide-up animate-delay-3">
                        <h3 className="section-title">南陈回信</h3>
                        <div className="result-card glass-panel success empress-report">
                            <div className="result-header">
                                <div className="result-info">
                                    <span className="result-scheme">本回合问政回批</span>
                                    <span className="result-index">
                                        {lastSettlement.policyReport.optionLabel}. {lastSettlement.policyReport.optionContent}
                                    </span>
                                </div>
                            </div>
                            <p className="result-text">{isLoading ? '女帝密批正在送达……' : empressReply}</p>
                            <div className="result-effects">
                                {Object.entries(sanitizeDeltaRecord(lastSettlement.policyReport.effects)).map(([dim, val]) => {
                                    if (!val) return null
                                    const dimNames: Record<string, string> = {
                                        finance: '财政',
                                        grain: '粮赋',
                                        military: '军事',
                                        socialOrder: '民生秩序',
                                        governance: '统治穿透力',
                                    }
                                    return (
                                        <span key={`south-${dim}`} className={`effect-tag ${val > 0 ? 'positive' : 'negative'}`}>
                                            南陈{dimNames[dim]} {val > 0 ? '+' : ''}{val.toFixed(1)}
                                        </span>
                                    )
                                })}
                                <span className={`effect-tag ${lastSettlement.policyReport.focusMatched ? 'positive' : 'negative'}`}>
                                    {lastSettlement.policyReport.focusMatched ? '论证切题' : '论证偏泛'}
                                </span>
                                <span className={`effect-tag ${lastSettlement.policyReport.legitimacyTone === 'down' ? 'negative' : 'positive'}`}>
                                    {lastSettlement.policyReport.legitimacyTone === 'up'
                                        ? '法统余势向上'
                                        : lastSettlement.policyReport.legitimacyTone === 'down'
                                            ? '法统余势受损'
                                            : '法统影响平稳'}
                                </span>
                            </div>
                            {lastSettlement.policyAftereffect && (
                                <div className="policy-aftereffect">
                                    {settlementPolicyFollowup && <p className="result-text">{settlementPolicyFollowup}</p>}
                                    <div className="result-effects">
                                        {Object.entries(sanitizeDeltaRecord(lastSettlement.policyAftereffect.effects)).map(([dim, val]) => {
                                            if (!val) return null
                                            const dimNames: Record<string, string> = {
                                                finance: '财政',
                                                grain: '粮赋',
                                                military: '军事',
                                                socialOrder: '民生秩序',
                                                governance: '统治穿透力',
                                            }
                                            return (
                                                <span key={`south-after-${dim}`} className={`effect-tag ${val > 0 ? 'positive' : 'negative'}`}>
                                                    下回合余波：南陈{dimNames[dim]} {val > 0 ? '+' : ''}{val.toFixed(1)}
                                                </span>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="changes-summary animate-slide-up animate-delay-4">
                    <h3 className="section-title">大局推演</h3>
                    {lastSettlement?.campaignReports?.length ? (
                        <div className="glass-panel subtle-hints">
                            {lastSettlement.campaignReports.map(report => (
                                <p key={report} className="result-text">{report}</p>
                            ))}
                        </div>
                    ) : null}

                    <div className="power-dashboard">
                        <div className="radar-section">
                            <RadarChart data={lastSettlement?.northStatsAfter ?? northStats} size={220} label="北周国力五维" />
                        </div>
                        <div className="radar-section">
                            <RadarChart data={lastSettlement?.southStatsAfter ?? southStats} size={220} label="南陈国力五维" />
                        </div>
                    </div>

                    <div className="summary-grid glass-panel">
                        <div className="summary-item">
                            <span className="summary-label">南陈相对北周</span>
                            <span className={`relative-badge level-${getRelativePowerLevel(northPower, southPower)}`}>
                                {getRelativePowerLabel(northPower, southPower)}
                            </span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">南征风险评估</span>
                            <span className={`summary-value ${(lastSettlement?.invasionPoliticalRatio ?? 0) >= 1.0 ? 'danger' : 'safe'}`}>
                                {(lastSettlement?.invasionPoliticalRatio ?? 0) >= 1.2
                                    ? '危急'
                                    : (lastSettlement?.invasionPoliticalRatio ?? 0) >= 0.8
                                        ? '警戒'
                                        : '暂缓'}
                            </span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">南征窗口</span>
                            <span className="summary-value">{invasionWindowLabel}</span>
                        </div>
                    </div>
                </div>

                {lastSettlement?.externalActionReports && lastSettlement.externalActionReports.length > 0 && (
                    <div className="results-section animate-slide-up animate-delay-4">
                        <h3 className="section-title">外部势力明牌</h3>
                        <div className="results-list">
                            {lastSettlement.externalActionReports.map(report => (
                                <div key={`${report.npcId}-${report.action}`} className="result-card glass-panel success">
                                    <div className="result-header">
                                        <div className="result-info">
                                            <span className="result-scheme">{report.action === 'rebellion' ? '煽动造反' : '煽动割据'}</span>
                                        </div>
                                    </div>
                                    <p className="result-text">{report.outcome}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {lastSettlement?.relationshipReports && lastSettlement.relationshipReports.length > 0 && (
                    <div className="results-section animate-slide-up animate-delay-4">
                        <h3 className="section-title">关系链失衡</h3>
                        <div className="results-list">
                            {lastSettlement.relationshipReports.map(report => (
                                <div key={`${report.structureId}-${report.edgeId}`} className="result-card glass-panel failure">
                                    <div className="result-header">
                                        <div className="result-info">
                                            <span className="result-scheme">{report.structureName}</span>
                                        </div>
                                    </div>
                                    <p className="result-text">{report.summary}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {lastSettlement?.factionCollapseReports && lastSettlement.factionCollapseReports.length > 0 && (
                    <div className="results-section animate-slide-up animate-delay-4">
                        <h3 className="section-title">朝堂势力裂口</h3>
                        <div className="results-list">
                            {lastSettlement.factionCollapseReports.map(report => (
                                <div
                                    key={`${report.factionId}-${report.severity}`}
                                    className={`result-card glass-panel ${report.severity === 'collapse' ? 'failure' : 'success'}`}
                                >
                                    <div className="result-header">
                                        <div className="result-info">
                                            <span className="result-scheme">{report.factionName}</span>
                                            <span className="result-index">{report.severity === 'collapse' ? '崩盘' : '崩口'}</span>
                                        </div>
                                    </div>
                                    <p className="result-text">{report.summary}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {backlashHints.length ? (
                    <div className="results-section animate-slide-up animate-delay-4">
                        <h3 className="section-title">余波暗动</h3>
                        <div className="results-list">
                            {backlashHints.map(hint => (
                                <div key={hint} className="result-card glass-panel failure">
                                    <p className="result-text">{hint}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

                <div className="action-footer animate-slide-up animate-delay-4">
                    <button className="btn-primary btn-next" onClick={nextPhase}>
                        继续
                    </button>
                </div>
            </div>
        </div>
    )
}
