// ========================================
// 北周结算页 — P2 更新
// 天道判官 AI 叙事 + 真实结算数据
// ========================================

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
import './Settlement.css'

export function Settlement() {
    const {
        nextPhase, lastSettlement, northPower, southPower,
        currentSchemes, npcs, currentRound, northStats, southStats,
        firstRoundGuideSeen, markFirstRoundGuideSeen,
        openGameplayGuide,
    } = useGameStore()

    const [judgeNarration, setJudgeNarration] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [empressReply, setEmpressReply] = useState<string | null>(null)

    const schemeName = (type: string) =>
        SCHEMES.find(s => s.type === type)?.name ?? type

    // P2: 天道判官叙事生成
    useEffect(() => {
        async function generateNarration() {
            if (!lastSettlement) return

            const event = ROUND_EVENTS[currentRound - 1]

            // 构建信任变化摘要
            const trustSummary = Object.entries(lastSettlement.trustChanges)
                .map(([id, delta]) => {
                    const npc = npcs.find(n => n.id === id)
                    return `${npc?.name ?? id} ${delta > 0 ? '+' : ''}${delta}`
                })
                .join('，') || '无变化'



            const messages = buildJudgePrompt({
                round: currentRound,
                eventName: event?.eventName ?? '',
                eventImpactSummary: lastSettlement.judgeFacts.eventImpactSummary,
                schemeResults: lastSettlement.schemeResults.map((r, i) => ({
                    schemeName: schemeName(currentSchemes[i]?.schemeType ?? ''),
                    targetName: npcs.find(n => n.id === currentSchemes[i]?.targetNpcId)?.name ?? '',
                    success: r.success,
                    feedback: r.feedbackText,
                    playerSpeech: currentSchemes[i]?.playerSpeech ?? '',
                })),
                trustChangeSummary: trustSummary,
                northPowerChange: `综合国力 ${northPower.toFixed(1)}`,
                factionSummary: lastSettlement.judgeFacts.factionSummary,
                relationshipSummary: lastSettlement.judgeFacts.relationshipSummary,
                externalSummary: lastSettlement.judgeFacts.externalSummary,
                northSummary: lastSettlement.judgeFacts.northSummary,
                southSummary: lastSettlement.judgeFacts.southSummary,
                invasionSummary: lastSettlement.judgeFacts.invasionSummary,
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
                setJudgeNarration(narration)
                setEmpressReply(lastSettlement.policyReport ? southReply.trim() || null : null)
            } catch {
                setJudgeNarration(lastSettlement.summaryText)
                setEmpressReply(
                    lastSettlement.policyReport
                        ? `朕已按“${lastSettlement.policyReport.optionContent}”着手施行，眼下${lastSettlement.policyReport.effectSummary}，其后效仍须续观。`
                        : null,
                )
            } finally {
                setIsLoading(false)
            }
        }

        generateNarration()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="page-container settlement animate-fade-in">
            {currentRound === 1 && !firstRoundGuideSeen.settlement && (
                <FirstRoundGuideModal
                    title={FIRST_ROUND_GUIDE_CONTENT.settlement.title}
                    body={FIRST_ROUND_GUIDE_CONTENT.settlement.body}
                    onClose={() => markFirstRoundGuideSeen('settlement')}
                />
            )}
            <div className="page-utility-row animate-slide-up">
                <button className="btn-help" onClick={() => openGameplayGuide('gameplay')}>
                    玩法说明
                </button>
            </div>
            <h2 className="page-title animate-slide-up">北 周 结 算</h2>

            <div className="settlement-content">
                {/* 天道判官叙事 (卷轴样式) */}
                <div className="scroll-container animate-slide-up animate-delay-1">
                    <div className="judge-narration gold-panel">
                        <div className="scroll-decorator top"></div>
                        <h3 className="judge-title">📜 天道判官曰</h3>
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

                {/* 计谋结果 */}
                <div className="results-section animate-slide-up animate-delay-2">
                    <h3 className="section-title">计谋筹算结果</h3>
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
                                        {Object.entries(result.northDimensionChanges).map(([dim, val]) => {
                                            if (val === 0) return null
                                            const dimNames: Record<string, string> = {
                                                finance: '财政', grain: '粮赋', military: '军事',
                                                socialOrder: '社会', governance: '统治',
                                            }
                                            return (
                                                <span key={dim} className={`effect-tag ${(val as number) > 0 ? 'positive' : 'negative'}`}>
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

                {/* 国力变化 */}
                <div className="changes-summary animate-slide-up animate-delay-4">
                    <h3 className="section-title">大局推演</h3>
                    <div className="power-dashboard">
                        <div className="radar-section">
                            <RadarChart data={lastSettlement?.northStatsAfter ?? northStats} size={220} label="北周国力五维" />
                        </div>
                        <div className="radar-section">
                            <RadarChart data={lastSettlement?.southStatsAfter ?? southStats} size={220} label="南陈国力五维" />
                        </div>
                        <div className="relative-power-section glass-panel">
                            <h4 className="summary-label">南陈相对北周</h4>
                            <span className={`relative-badge level-${getRelativePowerLevel(northPower, southPower)}`}>
                                {getRelativePowerLabel(northPower, southPower)}
                            </span>

                            <div className="summary-item mt-md">
                                <span className="summary-label">南征风险评估</span>
                                <span className={`summary-value ${(lastSettlement?.invasionPoliticalRatio ?? 0) >= 1.0 ? 'danger' : 'safe'}`}>
                                    {(lastSettlement?.invasionPoliticalRatio ?? 0) >= 1.2 ? '危 急' :
                                        (lastSettlement?.invasionPoliticalRatio ?? 0) >= 0.8 ? '警 戒' : '暂 缓'}
                                </span>
                            </div>
                            <div className="summary-item mt-md">
                                <span className="summary-label">南征窗口</span>
                                <span className="summary-value">{lastSettlement?.judgeFacts?.invasionSummary.split('；')[0] ?? '待判'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {lastSettlement?.policyReport && (
                    <div className="results-section animate-slide-up animate-delay-4">
                        <h3 className="section-title">南陈回信</h3>
                        <div className="result-card glass-panel success empress-report">
                                <div className="result-header">
                                    <div className="result-info">
                                        <span className="result-scheme">本回合问政回批</span>
                                        <span className="result-index">{lastSettlement.policyReport.optionLabel}. {lastSettlement.policyReport.optionContent}</span>
                                    </div>
                                </div>
                            <p className="result-text">{isLoading ? '女帝密批正在送达……' : empressReply}</p>
                            <div className="result-effects">
                                {Object.entries(lastSettlement.policyReport.effects).map(([dim, val]) => {
                                    if (!val) return null
                                    const dimNames: Record<string, string> = {
                                        finance: '财政', grain: '粮赋', military: '军事',
                                        socialOrder: '民生秩序', governance: '统治穿透力',
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
                                    <p className="result-text">{lastSettlement.policyAftereffect.summary}</p>
                                    <div className="result-effects">
                                        {Object.entries(lastSettlement.policyAftereffect.effects).map(([dim, val]) => {
                                            if (!val) return null
                                            const dimNames: Record<string, string> = {
                                                finance: '财政', grain: '粮赋', military: '军事',
                                                socialOrder: '民生秩序', governance: '统治穿透力',
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

                <div className="action-footer animate-slide-up animate-delay-4">
                    <button className="btn-primary btn-next" onClick={nextPhase}>
                        继 续
                    </button>
                </div>
            </div>
        </div>
    )
}
