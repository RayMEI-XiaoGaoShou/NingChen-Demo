import { useEffect, useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { FIRST_ROUND_GUIDE_CONTENT } from '../../data/prologueContent'
import { ROUND_EVENTS } from '../../data/rounds'
import { SCHEMES } from '../../data/schemes'
import { chatCompletion } from '../../ai/aiService'
import { buildJudgePrompt } from '../../ai/prompts'
import { RadarChart } from '../RadarChart/RadarChart'
import { FirstRoundGuideModal } from '../FirstRoundGuide/FirstRoundGuideModal'
import { PageUtilityActions } from '../PageUtilityActions/PageUtilityActions'
import { getRelativePowerLabel, getRelativePowerLevel } from '../../game/relativePower'
import { getRoundCampaignEventContext } from '../../game/campaignDisplayEngine'
import { buildCampaignRecordPanel } from '../../game/campaignRecordBoard'
import { buildSettlementDefaultEmpressReply, getSettlementPolicyFollowupText, hasPolicyReason } from '../../game/empressReplyPresentation'
import { buildSettlementSchemeCausalEvents, selectSettlementChronicleQuoteCandidate } from '../../game/settlementCausalNarrative'
import type { JudgeFacts, RoundSettlementResult } from '../../game/roundSettlement'
import type { DelayedBacklash, PlayerDangerStage } from '../../game/types'
import './Settlement.css'

const COURT_BACKLASH_TOOLTIP = '朝局反噬，是你每一手计谋在暗中留下的余毒。它未必当回合便发作，却会在下一回合悄然显形：或是某位权臣多了一层防你的心思，或是某条关系链继续朝坏处走，或是某一派的调度与秩序再失一寸。'
const POLICY_AFTEREFFECT_TOOLTIP = '问政余波，来自你在女帝问政页写下的附言。附言若真切中当回合议题，当回合得利自不必说，还会在下一回合继续带来好处。'
const WAR_TREND_TOOLTIP = '南征风向，是北周朝堂在“挥师南下”与“先安内政”之间的天平。帝党势盛则主战声起，后党稳固则南征搁浅。你要做的，是让这面天平始终不往最坏的方向倒。'
const SAFETY_RISK_TOOLTIP = '自身安危，是你在北周朝堂上的处境有多危险。戒备你的权臣越多、发酵中的关系链越多，你离被盯上甚至被审查的深渊就越近。'

export function getBacklashExplanation(backlash: DelayedBacklash): string {
    if (backlash.type === 'guarded') {
        return `${backlash.npcName}开始对你多了一层提防，下回合信任可能下降。${backlash.summary}`
    }

    if (backlash.type === 'shock') {
        return `${backlash.npcName}已被你的话锋惊动，并牵动朝议转烈；下回合他对你的信任与北周治理、秩序、军事都会承压。${backlash.summary}`
    }

    if (backlash.type === 'exposed') {
        return `你的行止已被${backlash.npcName}暗中记下，下回合他对你的信任可能下降。${backlash.summary}`
    }

    if (backlash.type === 'misdirected') {
        return `你的说辞让${backlash.npcName}所在的朝议方向被带偏，下回合北周治理、秩序或军事可能继续受损。${backlash.summary}`
    }

    return backlash.summary
}

function getSettlementSafetyRisk(stage: PlayerDangerStage | null | undefined) {
    if (stage === 'under_review') return { label: '祸生肘腋', className: 'risk-critical' }
    if (stage === 'under_watch') return { label: '风闻渐起', className: 'risk-warning' }
    return { label: '尚可斡旋', className: 'risk-safe' }
}

export function getSafeSettlementJudgeFacts(
    settlement: Pick<RoundSettlementResult, 'judgeFacts'> | null,
): JudgeFacts {
    const judgeFacts = settlement?.judgeFacts

    return {
        eventImpactSummary: judgeFacts?.eventImpactSummary ?? '本回合局势尚在调整，暂未显出新的波动。',
        factionSummary: judgeFacts?.factionSummary ?? '朝局暂稳，各方都还在等风向。',
        relationshipSummary: judgeFacts?.relationshipSummary ?? '',
        externalSummary: judgeFacts?.externalSummary ?? '边镇与外部势力仍在观望。',
        northSummary: judgeFacts?.northSummary ?? '北周国势暂无明显变化。',
        southSummary: judgeFacts?.southSummary ?? '南陈新政的后效仍在缓缓显形。',
        invasionSummary: judgeFacts?.invasionSummary ?? '风信未彰',
        survivalSummary: judgeFacts?.survivalSummary ?? '风声暂稳。',
        aiNativeSummary: {
            schemeHints: judgeFacts?.aiNativeSummary?.schemeHints ?? [],
            backlashHints: judgeFacts?.aiNativeSummary?.backlashHints ?? [],
            policyHints: judgeFacts?.aiNativeSummary?.policyHints ?? [],
        },
    }
}

export function getSettlementInvasionWindowLabel(ratio: number | null | undefined): string {
    if (!isFiniteNumber(ratio)) return '风信未彰'
    if (ratio >= 1.2) return '箭在弦上'
    if (ratio >= 0.8) return '朝议煎沸'
    return '偏安之局'
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value)
}

export function formatChronicleVolumeNumber(round: number): string {
    const numerals = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
    if (!Number.isInteger(round) || round < 1 || round > 20) return String(round)
    if (round < 10) return numerals[round] ?? String(round)
    if (round === 10) return '十'
    if (round < 20) return `十${numerals[round - 10]}`
    return '二十'
}

export function getChronicleVolumeTitle(round: number): string {
    return `《南北朝通鉴-卷${formatChronicleVolumeNumber(round)}》`
}

function sanitizeDeltaRecord(record: Record<string, unknown> | null | undefined): Record<string, number> {
    if (!record) return {}

    return Object.fromEntries(
        Object.entries(record).map(([key, value]) => [key, isFiniteNumber(value) ? value : 0]),
    )
}

function normalizeSettlementSummary(text: string): string {
    return text.replace(/[，。、“”！？；：,.!?;:\s]/g, '')
}

function shouldKeepSettlementSupplement(
    primary: string,
    secondary: string,
    keywords: string[],
    minimumKeywordHits = 1,
): boolean {
    if (!secondary.trim()) return false
    if (!primary.trim()) return true

    const normalizedPrimary = normalizeSettlementSummary(primary)
    const normalizedSecondary = normalizeSettlementSummary(secondary)

    if (
        normalizedPrimary === normalizedSecondary
        || normalizedPrimary.includes(normalizedSecondary)
        || normalizedSecondary.includes(normalizedPrimary)
    ) {
        return false
    }

    const keywordHits = keywords.filter(
        keyword => primary.includes(keyword) && secondary.includes(keyword),
    ).length

    return keywordHits < minimumKeywordHits
}

export function getSettlementBacklashText(backlash: DelayedBacklash): string {
    if (backlash.type === 'guarded') {
        const primary = `${backlash.npcName} 虽未当面翻脸，心里却已记下了这笔账。下回合再试探他时，恐怕不会像今日这般好说话。`
        if (backlash.summary.includes('提防')) {
            return primary
        }
        return shouldKeepSettlementSupplement(primary, backlash.summary, ['提防', '信任', '戒备'])
            ? `${primary}${backlash.summary}`
            : primary
    }

    if (backlash.type === 'shock') {
        const primary = `${backlash.npcName} 已被这一步真正惊动，朝议也随之转烈。下回合不只他会更防你——北周在治理、秩序或军政上，也可能顺着这道裂口继续失血。`
        return shouldKeepSettlementSupplement(primary, backlash.summary, ['朝议', '转烈', '承压', '惊动'])
            ? `${primary}${backlash.summary}`
            : primary
    }

    if (backlash.type === 'exposed') {
        const primary = `你这一步看似不露声色，${backlash.npcName} 却已暗暗记在心上。下回合若再起风波，他未必不会沿着今日的痕迹追查过来。`
        return shouldKeepSettlementSupplement(primary, backlash.summary, ['记下', '注目', '审查', '信任'])
            ? `${primary}${backlash.summary}`
            : primary
    }

    if (backlash.type === 'misdirected') {
        const primary = `你的说辞没有当场引发波澜，却把 ${backlash.npcName} 身边的朝议风向轻轻带偏了。下一回合，这股偏移很可能继续在治理、秩序或军政上结出苦果。`
        return shouldKeepSettlementSupplement(primary, backlash.summary, ['朝议', '方向', '带偏', '受损'])
            ? `${primary}${backlash.summary}`
            : primary
    }

    return backlash.summary
}

export function selectSettlementPolicyAftereffectText(
    followup: string | null,
    summary: string | null,
): string[] {
    const primary = followup?.trim() ?? ''
    const secondary = summary?.trim() ?? ''

    if (!primary && !secondary) return []
    if (!primary) return [secondary]
    if (!secondary) return [primary]

    return shouldKeepSettlementSupplement(primary, secondary, ['收益', '延续', '回合', '后效'], 1)
        ? [primary, secondary]
        : [primary]
}

export function Settlement() {
    const {
        nextPhase,
        lastSettlement,
        northPower,
        southPower,
        currentSchemes,
        npcFeedbacks,
        npcs,
        currentRound,
        northStats,
        southStats,
        firstRoundGuideSeen,
        markFirstRoundGuideSeen,
        openGameplayGuide,
        shuCampaign,
        huainanCampaign,
        shuMomentum,
        huainanMomentum,
        empressReplyRecord,
    } = useGameStore()

    const [judgeNarration, setJudgeNarration] = useState<string | null>(lastSettlement?.summaryText ?? null)
    const [isLoading, setIsLoading] = useState(Boolean(lastSettlement))
    const settlementGuide = FIRST_ROUND_GUIDE_CONTENT.settlement ?? { title: '', body: [] }
    const judgeFacts = getSafeSettlementJudgeFacts(lastSettlement)

    const schemeName = (type: string) => SCHEMES.find(s => s.type === type)?.name ?? type
    const backlashHints = judgeFacts.aiNativeSummary.backlashHints
    const invasionWindowLabel = getSettlementInvasionWindowLabel(lastSettlement?.invasionPoliticalRatio)
    const safetyRisk = getSettlementSafetyRisk(lastSettlement?.playerDangerStage)
    const policyReasonAuthored = hasPolicyReason(lastSettlement?.policyReport ?? null)
    const settlementPolicyFollowup =
        policyReasonAuthored && lastSettlement?.policyAftereffect && lastSettlement.policyReport
            ? getSettlementPolicyFollowupText(lastSettlement.policyReport.focusMatched)
            : null
    const courtBacklashTexts = lastSettlement?.delayedBacklash?.length
        ? lastSettlement.delayedBacklash.map(getSettlementBacklashText)
        : backlashHints
    const campaignRecord = buildCampaignRecordPanel({
        round: currentRound,
        surface: 'settlement',
        shuCampaign,
        huainanCampaign,
        shuMomentum,
        huainanMomentum,
        campaignReports: lastSettlement?.campaignReports ?? [],
    })
    useEffect(() => {
        let cancelled = false

        async function generateNarration() {
            if (!lastSettlement) {
                setJudgeNarration('结算文书正在整理，请稍候。')
                setIsLoading(false)
                return
            }

            setIsLoading(true)

            if (!lastSettlement.judgeFacts) {
                setJudgeNarration(lastSettlement.summaryText || '本回合局势已有变化，可先看下方结算。')
                setIsLoading(false)
                return
            }

            const event = getRoundCampaignEventContext(currentRound, shuCampaign, huainanCampaign)
            const trustSummary = Object.entries(lastSettlement.trustChanges)
                .map(([id, delta]) => {
                    const npc = npcs.find(n => n.id === id)
                    return `${npc?.name ?? id} ${delta > 0 ? '+' : ''}${delta}`
                })
                .join('；') || '无变化'
            const processedSchemes = lastSettlement.processedSchemes.length > 0
                ? lastSettlement.processedSchemes
                : currentSchemes
            const schemeCausalEvents = buildSettlementSchemeCausalEvents({
                actions: processedSchemes,
                results: lastSettlement.schemeResults,
                explanations: lastSettlement.schemeOutcomeExplanations,
                npcs,
                npcFeedbacks,
            })
            const northQuoteCandidate = selectSettlementChronicleQuoteCandidate(schemeCausalEvents)
            const chronicleTimeLabel = ROUND_EVENTS[currentRound - 1]?.timeLabel ?? `第${currentRound}回合`
            const southEmpressReply = empressReplyRecord?.sourceRound === currentRound
                ? empressReplyRecord.text
                : buildSettlementDefaultEmpressReply(lastSettlement.policyReport)

            const messages = buildJudgePrompt({
                round: currentRound,
                eventName: event.eventName,
                chronicleTimeLabel,
                eventImpactSummary: judgeFacts.eventImpactSummary,
                schemeResults: lastSettlement.schemeResults.map((r, i) => ({
                    schemeName: schemeName(processedSchemes[i]?.schemeType ?? ''),
                    targetName: npcs.find(n => n.id === processedSchemes[i]?.targetNpcId)?.name ?? '',
                    success: r.success,
                    feedback: r.feedbackText,
                    playerSpeech: processedSchemes[i]?.playerSpeech ?? '',
                })),
                schemeCausalEvents: schemeCausalEvents.map(event => event.promptLine),
                northQuoteCandidate,
                trustChangeSummary: trustSummary,
                northPowerChange: `综合国力 ${northPower.toFixed(1)}`,
                factionSummary: judgeFacts.factionSummary,
                relationshipSummary: judgeFacts.relationshipSummary,
                externalSummary: judgeFacts.externalSummary,
                northSummary: judgeFacts.northSummary,
                southSummary: judgeFacts.southSummary,
                southEmpressReply,
                invasionSummary: lastSettlement.judgeFacts.invasionSummary ?? '风信未彰',
            })

            try {
                const narration = await chatCompletion(messages, {
                    temperature: 0.9,
                    maxTokens: 480,
                    tag: 'judge',
                })
                if (cancelled) return
                setJudgeNarration(narration)
            } catch {
                if (cancelled) return
                setJudgeNarration(lastSettlement.summaryText || '本回合局势已有变化，可先看下方结算。')
            } finally {
                if (cancelled) return
                setIsLoading(false)
            }
        }

        void generateNarration().catch(() => {
            if (cancelled) return
            setJudgeNarration(lastSettlement?.summaryText || '本回合局势已有变化，可先看下方结算。')
            setIsLoading(false)
        })

        return () => {
            cancelled = true
        }
    }, [currentRound, currentSchemes, empressReplyRecord, huainanCampaign, lastSettlement, northPower, npcFeedbacks, npcs, shuCampaign])

    return (
        <div className="page-container settlement page-enter">
            {currentRound === 1 && !firstRoundGuideSeen.settlement && (
                <FirstRoundGuideModal
                    title={settlementGuide.title}
                    body={settlementGuide.body}
                    onClose={() => markFirstRoundGuideSeen('settlement')}
                />
            )}

            <div className="page-utility-row animate-slide-up">
                <PageUtilityActions onOpenGuide={() => openGameplayGuide('gameplay')} />
            </div>

            <div className="settlement-header animate-slide-up">
                <h2 className="page-title">本回合结算</h2>
            </div>

            <div className="settlement-content">
                <div className="scroll-container animate-slide-up animate-delay-1">
                    <div className="judge-narration gold-panel decree-panel">
                        <div className="scroll-decorator top"></div>
                        <h3 className="judge-title">{getChronicleVolumeTitle(currentRound)}</h3>
                        <div className="narration-content">
                            {isLoading ? (
                                <div className="loading-state">
                                    <div className="ai-ripple"></div>
                                    <p className="narration-loading">天道正在结算本回合的得失</p>
                                </div>
                            ) : (
                                <p className="narration-text typewriter">{judgeNarration}</p>
                            )}
                        </div>
                        <div className="scroll-decorator bottom"></div>
                    </div>
                </div>

                <div className="changes-summary animate-slide-up animate-delay-4">
                    <h3 className="section-title">大局推演</h3>
                    {campaignRecord.visible && (
                        <div className="glass-panel subtle-hints">
                            <p className="result-text">
                                <span className="result-scheme">{campaignRecord.title}</span>
                                {' · '}
                                {campaignRecord.phase}
                            </p>
                            <p className="result-text">{campaignRecord.recapText}</p>
                            <p className="result-text">{campaignRecord.statusText}</p>
                            {campaignRecord.resultText && <p className="result-text">{campaignRecord.resultText}</p>}
                        </div>
                    )}

                    <div className="summary-grid glass-panel settlement-status-bar">
                        <div className="summary-item status-item">
                            <span className="summary-label">南陈相对北周</span>
                            <span className={`relative-badge level-${getRelativePowerLevel(northPower, southPower)}`}>
                                {getRelativePowerLabel(northPower, southPower)}
                            </span>
                        </div>
                        <div className="summary-item status-item">
                            <span className="summary-label status-label">
                                自身安危
                                <span className="status-help status-help-seal" title={SAFETY_RISK_TOOLTIP} aria-label={SAFETY_RISK_TOOLTIP}>
                                    ?
                                </span>
                            </span>
                            <span className={`summary-value status-value ${safetyRisk.className}`}>
                                {safetyRisk.label}
                            </span>
                        </div>
                        <div className="summary-item status-item">
                            <span className="summary-label status-label">
                                南征风向
                                <span className="status-help status-help-seal" title={WAR_TREND_TOOLTIP} aria-label={WAR_TREND_TOOLTIP}>
                                    ?
                                </span>
                            </span>
                            <span className="summary-value status-value">{invasionWindowLabel}</span>
                        </div>
                    </div>

                    <div className="power-dashboard">
                        <div className="radar-section">
                            <RadarChart data={lastSettlement?.northStatsAfter ?? northStats} size={220} label="北周综合国力" />
                        </div>
                        <div className="radar-section">
                            <RadarChart data={lastSettlement?.southStatsAfter ?? southStats} size={220} label="南陈综合国力" />
                        </div>
                    </div>
                </div>

                {lastSettlement?.keyChangeHighlights && lastSettlement.keyChangeHighlights.length > 0 && (
                    <div className="results-section animate-slide-up animate-delay-4">
                        <h3 className="section-title">关键变化</h3>
                        <div className="results-list single-column">
                            {lastSettlement.keyChangeHighlights.map(highlight => (
                                <div
                                    key={highlight.id}
                                    className={`result-card glass-panel ${highlight.tone === 'negative' ? 'failure' : 'success'}`}
                                >
                                    <div className="result-header">
                                        <div className="result-info">
                                            <span className="result-scheme">{highlight.title}</span>
                                            <span className="result-index">
                                                {highlight.category === 'external' ? '地方军头' : highlight.category === 'faction' ? '朝堂势力' : '朝臣处境'}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="result-text">{highlight.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {(courtBacklashTexts.length > 0 || lastSettlement?.policyAftereffect) && (
                    <div className="settlement-aftereffect-grid animate-slide-up animate-delay-4">
                        {courtBacklashTexts.length > 0 && (
                            <section className="results-section">
                                <h3 className="section-title section-title-with-help">
                                    朝局反噬
                                    <span className="status-help status-help-seal" title={COURT_BACKLASH_TOOLTIP} aria-label={COURT_BACKLASH_TOOLTIP}>
                                        ?
                                    </span>
                                </h3>
                                <div className="results-list single-column">
                                    {courtBacklashTexts.map(hint => (
                                        <div key={hint} className="result-card glass-panel failure">
                                            <p className="result-text">{hint}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {lastSettlement?.policyAftereffect && (
                            <section className="results-section">
                                <h3 className="section-title section-title-with-help">
                                    问政余波
                                    <span className="status-help status-help-seal" title={POLICY_AFTEREFFECT_TOOLTIP} aria-label={POLICY_AFTEREFFECT_TOOLTIP}>
                                        ?
                                    </span>
                                </h3>
                                <div className="result-card glass-panel success policy-aftereffect-card">
                                    {selectSettlementPolicyAftereffectText(
                                        settlementPolicyFollowup,
                                        lastSettlement.policyAftereffect.summary,
                                    ).map(text => (
                                        <p key={text} className="result-text">{text}</p>
                                    ))}
                                    <div className="result-effects">
                                        {Object.entries(sanitizeDeltaRecord(lastSettlement.policyAftereffect.effects)).map(([dim, val]) => {
                                            if (!val) return null
                                            const dimNames: Record<string, string> = {
                                                finance: '财政',
                                                grain: '粮赋',
                                                military: '军事',
                                                socialOrder: '民生秩序',
                                                governance: '治理穿透力',
                                            }
                                            return (
                                                <span key={`south-after-${dim}`} className={`effect-tag ${val > 0 ? 'positive' : 'negative'}`}>
                                                    下回合：南陈{dimNames[dim]} {val > 0 ? '+' : ''}{val.toFixed(1)}
                                                </span>
                                            )
                                        })}
                                    </div>
                                </div>
                            </section>
                        )}
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
                                            <span className="result-index">{report.severity === 'collapse' ? '崩盘' : '裂口'}</span>
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
                        继续
                    </button>
                </div>
            </div>
        </div>
    )
}
