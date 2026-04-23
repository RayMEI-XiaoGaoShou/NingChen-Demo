import { useEffect, useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { FIRST_ROUND_GUIDE_CONTENT } from '../../data/prologueContent'
import { SCHEMES } from '../../data/schemes'
import { chatCompletion } from '../../ai/aiService'
import { buildEmpressFeedbackPrompt, buildJudgePrompt } from '../../ai/prompts'
import { RadarChart } from '../RadarChart/RadarChart'
import { FirstRoundGuideModal } from '../FirstRoundGuide/FirstRoundGuideModal'
import { NpcPortrait } from '../NpcPortrait/NpcPortrait'
import { PageUtilityActions } from '../PageUtilityActions/PageUtilityActions'
import { getRelativePowerLabel, getRelativePowerLevel } from '../../game/relativePower'
import { getRoundCampaignEventContext } from '../../game/campaignDisplayEngine'
import { buildCampaignRecordPanel } from '../../game/campaignRecordBoard'
import { buildEmpressFeedbackContext, type EmpressFeedbackContext } from '../../game/empressFeedbackContext'
import type { JudgeFacts, RoundSettlementResult } from '../../game/roundSettlement'
import type { DelayedBacklash, PlayerDangerStage } from '../../game/types'
import './Settlement.css'

const COURT_BACKLASH_TOOLTIP = '朝局反噬，是你每一手计谋在暗中留下的余毒。它未必当回合便发作，却会在下一回合悄然显形：或是某位权臣多了一层防你的心思，或是某条关系链继续朝坏处走，或是某一派的调度与秩序再失一寸。'
const POLICY_AFTEREFFECT_TOOLTIP = '问政余波，来自你在女帝问政页写下的附言。附言若真切中当回合议题，当回合得利自不必说，还会在下一回合继续带来好处。'
const WAR_TREND_TOOLTIP = '南征风向，是北周朝堂在“挥师南下”与“先安内政”之间的天平。帝党势盛则主战声起，后党稳固则南征搁浅。你要做的，是让这面天平始终不往最坏的方向倒。'
const SAFETY_RISK_TOOLTIP = '自身安危，是你在北周朝堂上的处境有多危险。戒备你的权臣越多、发酵中的关系链越多，你离被盯上甚至被审查的深渊就越近。'
const SCHEME_OUTCOME_LABEL_ORDER = ['国力影响', '朝堂政局'] as const

export function getSettlementPolicyFollowupText(focusMatched: boolean): string {
    return focusMatched
        ? '你的附言切中了此议真正的关节。这道新政不只当回合收效，下一回合还会继续生出余力。'
        : '你的附言尚嫌隔靴搔痒，余波因此不会太强——不过这道新政的后效仍会留到下一回合，只是分量轻了。'
}

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
    if (stage === 'under_review') return { label: '祸在帷幄', className: 'risk-critical' }
    if (stage === 'under_watch') return { label: '暗流渐浓', className: 'risk-warning' }
    return { label: '朝中尚可周旋', className: 'risk-safe' }
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
        invasionSummary: judgeFacts?.invasionSummary ?? '南征风向仍待观察',
        survivalSummary: judgeFacts?.survivalSummary ?? '风声暂稳。',
        aiNativeSummary: {
            schemeHints: judgeFacts?.aiNativeSummary?.schemeHints ?? [],
            backlashHints: judgeFacts?.aiNativeSummary?.backlashHints ?? [],
            policyHints: judgeFacts?.aiNativeSummary?.policyHints ?? [],
        },
    }
}

export function getSettlementInvasionWindowLabel(ratio: number | null | undefined): string {
    if (!isFiniteNumber(ratio)) return '南征风向仍待观察'
    if (ratio >= 1.2) return '南征箭在弦上'
    if (ratio >= 0.8) return '南征议势升温'
    return '朝廷仍偏安内'
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

export function hasPolicyReason(policyReport: { reason?: string | null } | null | undefined): boolean {
    return Boolean(policyReport?.reason?.trim())
}

export function buildSettlementDefaultEmpressReply(
    policyReportOrContext:
        | (Pick<EmpressFeedbackContext, 'optionContent' | 'reason' | 'weakestDimensionLabel' | 'warWindow' | 'playerDangerStage'>)
        | { optionContent: string; reason?: string | null }
        | null
        | undefined,
): string | null {
    if (!policyReportOrContext) return null

    const optionContent = policyReportOrContext.optionContent
    const reason = policyReportOrContext.reason?.trim()

    if (!reason) {
        return `朕已按“${optionContent}”着手施行。`
    }

    const weakestDimensionLabel = 'weakestDimensionLabel' in policyReportOrContext
        ? policyReportOrContext.weakestDimensionLabel
        : null
    const warWindow = 'warWindow' in policyReportOrContext
        ? policyReportOrContext.warWindow
        : false
    const playerDangerStage = 'playerDangerStage' in policyReportOrContext
        ? policyReportOrContext.playerDangerStage
        : 'safe'

    const cautionLine = warWindow
        ? '眼下兵事将逼，节候与后勤都不可轻纵。'
        : weakestDimensionLabel
            ? `只是眼下更要先稳住${weakestDimensionLabel}这一头，锋芒不可尽露。`
            : '只是此事仍须按轻重徐徐收束，不可一味躁进。'
    const playerLine = playerDangerStage === 'under_review'
        ? '你在北朝自护为先，其余话不必说满。'
        : playerDangerStage === 'under_watch'
            ? '你在北朝已渐有人留意，往后行话宜更收三分。'
            : ''

    return `朕已按“${optionContent}”着手施行。${cautionLine}${playerLine}`
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
    } = useGameStore()

    const [judgeNarration, setJudgeNarration] = useState<string | null>(lastSettlement?.summaryText ?? null)
    const [isLoading, setIsLoading] = useState(Boolean(lastSettlement))
    const [empressReply, setEmpressReply] = useState<string | null>(null)
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
                setEmpressReply(null)
                setIsLoading(false)
                return
            }

            setIsLoading(true)

            if (!lastSettlement.judgeFacts) {
                setJudgeNarration(lastSettlement.summaryText || '本回合局势已有变化，可先看下方结算。')
                setEmpressReply(buildSettlementDefaultEmpressReply(lastSettlement.policyReport))
                setIsLoading(false)
                return
            }

            const event = getRoundCampaignEventContext(currentRound, shuCampaign, huainanCampaign)
            const empressFeedbackContext = lastSettlement.policyReport
                ? buildEmpressFeedbackContext({
                    currentRound,
                    policyReport: lastSettlement.policyReport,
                    policyAftereffect: lastSettlement.policyAftereffect,
                    policyParse: lastSettlement.policyReport.policyParse,
                    southStatsAfter: lastSettlement.southStatsAfter,
                    northEventName: event.eventName,
                    northEventBriefing: event.eventBriefing,
                    northSummary: judgeFacts.northSummary,
                    invasionSummary: judgeFacts.invasionSummary,
                    playerDangerStage: lastSettlement.playerDangerStage,
                })
                : null
            const trustSummary = Object.entries(lastSettlement.trustChanges)
                .map(([id, delta]) => {
                    const npc = npcs.find(n => n.id === id)
                    return `${npc?.name ?? id} ${delta > 0 ? '+' : ''}${delta}`
                })
                .join('；') || '无变化'
            const processedSchemes = lastSettlement.processedSchemes.length > 0
                ? lastSettlement.processedSchemes
                : currentSchemes

            const messages = buildJudgePrompt({
                round: currentRound,
                eventName: event.eventName,
                eventImpactSummary: judgeFacts.eventImpactSummary,
                schemeResults: lastSettlement.schemeResults.map((r, i) => ({
                    schemeName: schemeName(processedSchemes[i]?.schemeType ?? ''),
                    targetName: npcs.find(n => n.id === processedSchemes[i]?.targetNpcId)?.name ?? '',
                    success: r.success,
                    feedback: r.feedbackText,
                    playerSpeech: processedSchemes[i]?.playerSpeech ?? '',
                })),
                trustChangeSummary: trustSummary,
                northPowerChange: `综合国力 ${northPower.toFixed(1)}`,
                factionSummary: judgeFacts.factionSummary,
                relationshipSummary: judgeFacts.relationshipSummary,
                externalSummary: judgeFacts.externalSummary,
                northSummary: judgeFacts.northSummary,
                southSummary: judgeFacts.southSummary,
                invasionSummary: lastSettlement.judgeFacts.invasionSummary ?? '南征风向仍待观察',
            })

            try {
                const [narration, southReply] = await Promise.all([
                    chatCompletion(messages, {
                        temperature: 0.9,
                        maxTokens: 300,
                        tag: 'judge',
                    }),
                    policyReasonAuthored && empressFeedbackContext
                        ? chatCompletion(buildEmpressFeedbackPrompt(empressFeedbackContext), {
                            temperature: 0.75,
                            maxTokens: 220,
                            tag: 'empress_feedback_settlement',
                        })
                        : Promise.resolve(''),
                ])
                if (cancelled) return
                setJudgeNarration(narration)
                setEmpressReply(
                    policyReasonAuthored && empressFeedbackContext
                        ? southReply.trim() || null
                        : buildSettlementDefaultEmpressReply(empressFeedbackContext ?? lastSettlement.policyReport),
                )
            } catch {
                if (cancelled) return
                setJudgeNarration(lastSettlement.summaryText || '本回合局势已有变化，可先看下方结算。')
                setEmpressReply(buildSettlementDefaultEmpressReply(lastSettlement.policyReport))
            } finally {
                if (cancelled) return
                setIsLoading(false)
            }
        }

        void generateNarration().catch(() => {
            if (cancelled) return
            setJudgeNarration(lastSettlement?.summaryText || '本回合局势已有变化，可先看下方结算。')
            setEmpressReply(buildSettlementDefaultEmpressReply(lastSettlement?.policyReport))
            setIsLoading(false)
        })

        return () => {
            cancelled = true
        }
    }, [currentRound, currentSchemes, huainanCampaign, lastSettlement, northPower, npcs, policyReasonAuthored, shuCampaign])

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
                        <h3 className="judge-title">天道结算</h3>
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

                <div className="results-section animate-slide-up animate-delay-2">
                    <h3 className="section-title">计谋筹算结果</h3>
                    <div className="results-list scheme-results-list">
                        {lastSettlement?.schemeResults.map((result, i) => {
                            const action = lastSettlement?.processedSchemes?.[i] ?? currentSchemes[i]
                            const npc = npcs.find(n => n.id === action?.targetNpcId)
                            const explanation = lastSettlement?.schemeOutcomeExplanations?.[i]
                            const orderedExplanationSegments = SCHEME_OUTCOME_LABEL_ORDER
                                .map(label => explanation?.segments.find(segment => segment.label === label))
                                .filter((segment): segment is NonNullable<typeof explanation>['segments'][number] => Boolean(segment))
                            return (
                                <div
                                    key={i}
                                    className={`result-card glass-panel animate-slide-up ${result.success ? 'success' : 'failure'}`}
                                    style={{ animationDelay: `${0.8 + i * 0.2}s` }}
                                >
                                    {npc && (
                                        <NpcPortrait
                                            name={npc.name}
                                            alt={`${npc.name}画像`}
                                            className="settlement-card-portrait settlement-scheme-target-portrait"
                                            positionY="18%"
                                        />
                                    )}
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
                                    {explanation && (
                                        <div className="result-explanation-stack">
                                            {orderedExplanationSegments.map(segment => (
                                                <p key={`${i}-${segment.label}`} className="result-text">
                                                    <strong>{segment.label}</strong>
                                                    {'：'}
                                                    {segment.text}
                                                </p>
                                            ))}
                                        </div>
                                    )}
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
                                                governance: '治理穿透力',
                                            }
                                            return (
                                                <span key={dim} className={`effect-tag ${Number(val) > 0 ? 'positive' : 'negative'}`}>
                                                    北周{dimNames[dim]} {formattedDelta}
                                                </span>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {lastSettlement?.borrowedBladeReports && lastSettlement.borrowedBladeReports.length > 0 && (
                    <div className="results-section animate-slide-up animate-delay-3">
                        <h3 className="section-title">朝堂收网</h3>
                        <div className="results-list">
                            {lastSettlement.borrowedBladeReports.map(report => (
                                <div
                                    key={`${report.actorNpcId}-${report.targetNpcId}-${report.outcome}`}
                                    className={`result-card glass-panel ${report.outcome === 'executed' ? 'failure' : 'success'}`}
                                >
                                    <div className="result-header">
                                        <div className="result-info">
                                            <span className="result-scheme">{report.outcome === 'executed' ? '处决' : report.outcome === 'dismissed' ? '罢黜' : '施压'}</span>
                                            <span className="result-index">{report.actorNpcName} → {report.targetNpcName}</span>
                                        </div>
                                    </div>
                                    <p className="result-text">{report.summary}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {lastSettlement?.policyReport && (
                    <div className="results-section animate-slide-up animate-delay-3">
                        <h3 className="section-title">南陈回信</h3>
                        <div className="result-card glass-panel success empress-report">
                            <NpcPortrait
                                name="陈倩"
                                alt="陈倩画像"
                                className="settlement-card-portrait settlement-empress-portrait"
                                positionY="14%"
                            />
                            <div className="result-header">
                                <div className="result-info">
                                    <span className="result-scheme">{lastSettlement.policyReport.question}</span>
                                    <span className="result-index">
                                        选择 <span className="policy-option-highlight">{lastSettlement.policyReport.optionLabel}. {lastSettlement.policyReport.optionContent}</span>
                                    </span>
                                </div>
                            </div>
                            <p className="result-text">{isLoading ? '女帝密批正在送达…' : empressReply}</p>
                            <div className="result-effects">
                                {Object.entries(sanitizeDeltaRecord(lastSettlement.policyReport.effects)).map(([dim, val]) => {
                                    if (!val) return null
                                    const dimNames: Record<string, string> = {
                                        finance: '财政',
                                        grain: '粮赋',
                                        military: '军事',
                                        socialOrder: '民生秩序',
                                        governance: '治理穿透力',
                                    }
                                    return (
                                        <span key={`south-${dim}`} className={`effect-tag ${val > 0 ? 'positive' : 'negative'}`}>
                                            南陈{dimNames[dim]} {val > 0 ? '+' : ''}{val.toFixed(1)}
                                        </span>
                                    )
                                })}
                                {policyReasonAuthored && (
                                    <span className={`effect-tag ${lastSettlement.policyReport.focusMatched ? 'positive' : 'negative'}`}>
                                        {lastSettlement.policyReport.focusMatched ? '论证切题' : '论证偏泛'}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

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
