import { useEffect, useState, type CSSProperties } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { FIRST_ROUND_GUIDE_CONTENT } from '../../data/prologueContent'
import { SCHEMES } from '../../data/schemes'
import { chatCompletion } from '../../ai/aiService'
import { buildJudgePrompt } from '../../ai/prompts'
import { RadarChart } from '../RadarChart/RadarChart'
import { FirstRoundGuideModal } from '../FirstRoundGuide/FirstRoundGuideModal'
import { PageUtilityActions } from '../PageUtilityActions/PageUtilityActions'
import { GameViewport } from '../GameViewport/GameViewport'
import { getRelativePowerLabel, getRelativePowerLevel } from '../../game/relativePower'
import { getRoundCampaignEventContext } from '../../game/campaignDisplayEngine'
import { buildCampaignRecordPanel } from '../../game/campaignRecordBoard'
import { buildSettlementDefaultEmpressReply, getSettlementPolicyFollowupText, hasPolicyReason } from '../../game/empressReplyPresentation'
import { buildSettlementSchemeCausalEvents, selectSettlementChronicleQuoteCandidate } from '../../game/settlementCausalNarrative'
import { selectWorldEventMemoriesForPrompt, summarizeWorldEventMemories } from '../../game/worldEventMemory'
import { getInvasionPressurePresentation, getPlayerDangerPresentation } from '../../game/pressureEngine'
import { getChronicleTimeLabels, sanitizeChronicleNarration } from '../../game/chronicleTime'
import type { ExternalActionReport, JudgeFacts, RoundSettlementResult, SettlementKeyChangeHighlight } from '../../game/roundSettlement'
import type { BorrowedBladeReport, DelayedBacklash, FactionCollapseReport, NationDimensions, PlayerDangerStage, RelationshipReport } from '../../game/types'
import './Settlement.css'

const SETTLEMENT_ASSETS = {
    background: new URL('../../assets/ui/settlement/settlement-bg-shiguan-andu-gpt.webp', import.meta.url).href,
    chronicleScrollLeft: new URL('../../assets/ui/settlement/chronicle-scroll-left.webp', import.meta.url).href,
    chronicleScrollCenter: new URL('../../assets/ui/settlement/chronicle-scroll-center.webp', import.meta.url).href,
    chronicleScrollRight: new URL('../../assets/ui/settlement/chronicle-scroll-right.webp', import.meta.url).href,
    volumeSeal: new URL('../../assets/ui/round-start/roundstart-volume-seal.webp', import.meta.url).href,
    finance: new URL('../../assets/ui/round-start/stat-finance-coin.webp', import.meta.url).href,
    governance: new URL('../../assets/ui/round-start/stat-governance.webp', import.meta.url).href,
    socialOrder: new URL('../../assets/ui/round-start/stat-social-order.webp', import.meta.url).href,
    grain: new URL('../../assets/ui/round-start/stat-grain.webp', import.meta.url).href,
    military: new URL('../../assets/ui/round-start/stat-military.webp', import.meta.url).href,
}

const SETTLEMENT_STAT_ICONS: Record<keyof NationDimensions, string> = {
    finance: SETTLEMENT_ASSETS.finance,
    governance: SETTLEMENT_ASSETS.governance,
    socialOrder: SETTLEMENT_ASSETS.socialOrder,
    grain: SETTLEMENT_ASSETS.grain,
    military: SETTLEMENT_ASSETS.military,
}

const SETTLEMENT_POWER_DIMENSIONS: Array<{ key: keyof NationDimensions; label: string }> = [
    { key: 'finance', label: '财政' },
    { key: 'grain', label: '粮草' },
    { key: 'military', label: '军事' },
    { key: 'socialOrder', label: '民生' },
    { key: 'governance', label: '统治' },
]

type SettlementStyle = CSSProperties & {
    '--settlement-bg'?: string
    '--chronicle-scroll-left'?: string
    '--chronicle-scroll-center'?: string
    '--chronicle-scroll-right'?: string
}

const SETTLEMENT_ART_STYLE = {
    '--settlement-bg': `url(${SETTLEMENT_ASSETS.background})`,
    '--chronicle-scroll-left': `url(${SETTLEMENT_ASSETS.chronicleScrollLeft})`,
    '--chronicle-scroll-center': `url(${SETTLEMENT_ASSETS.chronicleScrollCenter})`,
    '--chronicle-scroll-right': `url(${SETTLEMENT_ASSETS.chronicleScrollRight})`,
} as SettlementStyle

const SETTLEMENT_ANOMALY_EMPTY_TEXT = '本卷朝局未见剧变，可谁又知晓一片祥和之下有多少暗流涌动？'

export function splitSettlementChronicleDateLead(paragraph: string): { lead: string; rest: string } | null {
    const trimmed = paragraph.trimStart()
    const match = trimmed.match(/^((?:北周|南陈)[^，。！？；;：:\n]{1,36}年[^，。！？；;：:\n]{0,16})([，。！？；;：:\s]*)(.*)$/u)

    if (!match) return null

    return {
        lead: match[1],
        rest: `${match[2] ?? ''}${match[3] ?? ''}`,
    }
}

function renderSettlementChronicleText(text: string | null) {
    const paragraphs = (text ?? '')
        .split(/\n+/u)
        .map(paragraph => paragraph.trim())
        .filter(Boolean)
    const visibleParagraphs = paragraphs.length > 0 ? paragraphs : ['']

    return visibleParagraphs.map((paragraph, index) => {
        const dateLead = splitSettlementChronicleDateLead(paragraph)

        return (
            <p key={`${paragraph}-${index}`} className="narration-text">
                {dateLead ? (
                    <>
                        <span className="settlement-chronicle-date">{dateLead.lead}</span>
                        {dateLead.rest}
                    </>
                ) : paragraph}
            </p>
        )
    })
}

export interface SettlementPowerRow {
    key: keyof NationDimensions
    label: string
    iconSrc: string
    currentValue: number
    previousValue?: number
    changed: boolean
    direction: 'up' | 'down' | 'steady'
}

export type SettlementAnomalyLabel =
    | '人物命运'
    | '军镇异动'
    | '战役记录'
    | '朝局动荡'
    | '朝局反噬'
    | '问政余波'
    | '关键变化'

export interface SettlementAnomalyEntry {
    id: string
    label: SettlementAnomalyLabel
    subLabel?: string
    secondaryLabel?: SettlementAnomalyLabel
    title: string
    text: string
    tone: 'positive' | 'negative' | 'neutral'
    priority: number
    order: number
}

interface SettlementCampaignRecordSummary {
    visible: boolean
    title: string
    phase: string
    recapText: string
    statusText: string
    resultText?: string | null
}

interface SettlementAnomalyStreamParams {
    delayedBacklash?: DelayedBacklash[]
    backlashTexts?: string[]
    policyAftereffectTexts?: string[]
    externalActionReports?: ExternalActionReport[]
    relationshipReports?: RelationshipReport[]
    factionCollapseReports?: FactionCollapseReport[]
    borrowedBladeReports?: BorrowedBladeReport[]
    keyChangeHighlights?: SettlementKeyChangeHighlight[]
    campaignRecord?: SettlementCampaignRecordSummary | null
}

export function buildSettlementPowerRows(
    before: NationDimensions,
    after: NationDimensions,
): SettlementPowerRow[] {
    return SETTLEMENT_POWER_DIMENSIONS.map(({ key, label }) => {
        const previous = roundDisplayNumber(before[key])
        const current = roundDisplayNumber(after[key])
        const changed = previous !== current

        return {
            key,
            label,
            iconSrc: SETTLEMENT_STAT_ICONS[key],
            previousValue: changed ? previous : undefined,
            currentValue: current,
            changed,
            direction: changed ? (current > previous ? 'up' : 'down') : 'steady',
        }
    })
}

export function buildSettlementAnomalyStream(params: SettlementAnomalyStreamParams): SettlementAnomalyEntry[] {
    const entries: SettlementAnomalyEntry[] = []
    let order = 0

    const pushEntry = (entry: Omit<SettlementAnomalyEntry, 'order'>) => {
        entries.push({ ...entry, order })
        order += 1
    }

    for (const report of params.borrowedBladeReports ?? []) {
        if (report.outcome === 'failed') continue
        const isDeath = report.outcome === 'executed'
        pushEntry({
            id: `fate-${report.targetNpcId}-${report.outcome}`,
            label: '人物命运',
            subLabel: isDeath ? '身死' : '处置',
            title: isDeath ? `${report.targetNpcName}身死` : `${report.targetNpcName}遭处置`,
            text: report.summary,
            tone: 'negative',
            priority: 10,
        })
    }

    for (const report of params.externalActionReports ?? []) {
        if (isExternalActionHesitation(report)) continue

        if (isExternalActionCrushed(report)) {
            pushEntry({
                id: `external-fate-${report.npcId}-${report.action}`,
                label: '人物命运',
                subLabel: '身死',
                secondaryLabel: '军镇异动',
                title: `${report.npcName}兵败身死`,
                text: report.outcome,
                tone: 'negative',
                priority: 10,
            })
            continue
        }

        pushEntry({
            id: `external-${report.npcId}-${report.action}`,
            label: '军镇异动',
            title: report.action === 'rebellion' ? `${report.npcName}举兵` : `${report.npcName}割据`,
            text: report.outcome,
            tone: 'negative',
            priority: 20,
        })
    }

    if (params.campaignRecord?.visible) {
        pushEntry({
            id: 'campaign-record',
            label: '战役记录',
            title: params.campaignRecord.title,
            text: [
                params.campaignRecord.phase,
                params.campaignRecord.recapText,
                params.campaignRecord.statusText,
                params.campaignRecord.resultText,
            ].filter(Boolean).join(' '),
            tone: 'neutral',
            priority: 24,
        })
    }

    for (const report of params.relationshipReports ?? []) {
        pushEntry({
            id: `relationship-${report.structureId}-${report.edgeId}`,
            label: '朝局动荡',
            subLabel: '关系失衡',
            title: report.structureName,
            text: report.summary,
            tone: 'negative',
            priority: 30,
        })
    }

    for (const report of params.factionCollapseReports ?? []) {
        pushEntry({
            id: `faction-collapse-${report.factionId}-${report.severity}`,
            label: '朝局动荡',
            subLabel: '党内争端',
            title: report.factionName,
            text: report.summary,
            tone: report.severity === 'collapse' ? 'negative' : 'neutral',
            priority: 31,
        })
    }

    for (const backlash of params.delayedBacklash ?? []) {
        pushEntry({
            id: `backlash-${backlash.npcId}-${backlash.type}-${backlash.sourceRound}`,
            label: '朝局反噬',
            title: backlash.npcName,
            text: getSettlementBacklashText(backlash),
            tone: 'negative',
            priority: 40,
        })
    }

    ;(params.backlashTexts ?? []).filter(Boolean).forEach((text, index) => {
        pushEntry({
            id: `backlash-text-${index}`,
            label: '朝局反噬',
            title: '朝中余波',
            text,
            tone: 'negative',
            priority: 40,
        })
    })

    ;(params.policyAftereffectTexts ?? []).filter(Boolean).forEach((text, index) => {
        pushEntry({
            id: `policy-aftereffect-${index}`,
            label: '问政余波',
            title: '南陈问政后效',
            text,
            tone: 'positive',
            priority: 50,
        })
    })

    const highImpactCount = entries.length
    const keyLimit = highImpactCount >= 4 ? 0 : highImpactCount > 0 ? 2 : 3
    const coveredKeyNames = buildCoveredKeyChangeNames(params)
    const admittedKeyChanges = (params.keyChangeHighlights ?? [])
        .filter(highlight => shouldAdmitKeyChange(highlight, coveredKeyNames))
        .slice(0, keyLimit)

    for (const highlight of admittedKeyChanges) {
        pushEntry({
            id: `key-${highlight.id}`,
            label: '关键变化',
            title: highlight.title,
            text: highlight.text,
            tone: highlight.tone,
            priority: 70,
        })
    }

    return entries.sort((a, b) => a.priority - b.priority || a.order - b.order)
}

function roundDisplayNumber(value: number): number {
    return Math.round(value * 10) / 10
}

function formatPowerValue(value: number, forceDecimal = false): string {
    if (forceDecimal) return value.toFixed(1)
    return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function isExternalActionHesitation(report: ExternalActionReport): boolean {
    return report.outcomeCode === 'secession_hesitation'
}

function isExternalActionCrushed(report: ExternalActionReport): boolean {
    return report.outcomeCode === 'rebellion_crushed' || /所剿|平叛|身死|阵亡/.test(report.outcome)
}

function buildCoveredKeyChangeNames(params: SettlementAnomalyStreamParams): Set<string> {
    const names = new Set<string>()

    for (const report of params.externalActionReports ?? []) {
        if (!isExternalActionHesitation(report)) names.add(report.npcName)
    }

    for (const report of params.borrowedBladeReports ?? []) {
        if (report.outcome !== 'failed') names.add(report.targetNpcName)
    }

    for (const report of params.factionCollapseReports ?? []) {
        names.add(report.factionName)
    }

    return names
}

function shouldAdmitKeyChange(
    highlight: SettlementKeyChangeHighlight,
    coveredNames: Set<string>,
): boolean {
    for (const name of coveredNames) {
        if (highlight.title.includes(name) || highlight.text.includes(name)) return false
    }

    if (highlight.category === 'external') {
        const hasMeaningfulMilitaryChange = /军力|兵势|忠诚|离心|状态|割据|造反|举兵/.test(highlight.text)
        const isTrustOnly = /信任/.test(highlight.text) && !hasMeaningfulMilitaryChange
        return hasMeaningfulMilitaryChange && !isTrustOnly
    }

    if (highlight.category === 'court') {
        return /状态|皇帝|太后|恩宠|眷顾|庇护/.test(highlight.text)
    }

    if (highlight.category === 'faction') {
        return /朝堂影响|军事实力|内部稳定|军权|稳定度/.test(highlight.text)
    }

    return false
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

export function getSettlementSafetyRisk(stage: PlayerDangerStage | null | undefined) {
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

function SettlementPowerPanel({
    title,
    tone,
    stats,
    rows,
}: {
    title: string
    tone: 'north' | 'south'
    stats: NationDimensions
    rows: SettlementPowerRow[]
}) {
    return (
        <article className={`settlement-power-panel settlement-power-panel-${tone}`}>
            <header className="settlement-section-header settlement-power-header">
                <h3>{title}</h3>
            </header>
            <div className="settlement-power-body">
                <div className="settlement-power-radar">
                    <RadarChart
                        data={stats}
                        size={210}
                        variant="warBoard"
                        tone={tone}
                        dimensionIcons={SETTLEMENT_STAT_ICONS}
                    />
                </div>
                <div className="settlement-power-rows" aria-label={`${title}具体数值变化`}>
                    {rows.map(row => (
                        <div
                            key={row.key}
                            className={`settlement-power-row ${row.changed ? 'is-changed' : 'is-steady'} direction-${row.direction}`}
                        >
                            <img className="settlement-power-row-icon" src={row.iconSrc} alt="" draggable={false} />
                            <span className="settlement-power-row-label">{row.label}</span>
                            <span className="settlement-power-row-values">
                                {row.changed && row.previousValue !== undefined ? (
                                    <>
                                        <span className="settlement-power-value previous">{formatPowerValue(row.previousValue, false)}</span>
                                        <span className="settlement-power-arrow" aria-hidden="true">→</span>
                                        <span className="settlement-power-value current">{formatPowerValue(row.currentValue, true)}</span>
                                    </>
                                ) : (
                                    <span className="settlement-power-value current steady">{formatPowerValue(row.currentValue, true)}</span>
                                )}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </article>
    )
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
        worldMemoryLedger,
    } = useGameStore()

    const [judgeNarration, setJudgeNarration] = useState<string | null>(lastSettlement?.summaryText ?? null)
    const [isLoading, setIsLoading] = useState(Boolean(lastSettlement))
    const [activeSettlementDeck, setActiveSettlementDeck] = useState<'power' | 'anomaly'>('power')
    const [viewedAnomaly, setViewedAnomaly] = useState(false)
    const settlementGuide = FIRST_ROUND_GUIDE_CONTENT.settlement ?? { title: '', body: [] }
    const judgeFacts = getSafeSettlementJudgeFacts(lastSettlement)

    const schemeName = (type: string) => SCHEMES.find(s => s.type === type)?.name ?? type
    const backlashHints = judgeFacts.aiNativeSummary.backlashHints
    const invasionRisk = getInvasionPressurePresentation(lastSettlement?.invasionPressure ?? 0)
    const safetyRisk = getPlayerDangerPresentation(lastSettlement?.playerSuspicionHeat ?? 0, lastSettlement?.playerDangerStage)
    const policyReasonAuthored = hasPolicyReason(lastSettlement?.policyReport ?? null)
    const settlementPolicyFollowup =
        policyReasonAuthored && lastSettlement?.policyAftereffect && lastSettlement.policyReport
            ? getSettlementPolicyFollowupText(lastSettlement.policyReport.focusMatched)
            : null
    const campaignRecord = buildCampaignRecordPanel({
        round: currentRound,
        surface: 'settlement',
        shuCampaign,
        huainanCampaign,
        shuMomentum,
        huainanMomentum,
        campaignReports: lastSettlement?.campaignReports ?? [],
    })
    const settledNorthPower = lastSettlement?.northPowerAfter ?? northPower
    const settledSouthPower = lastSettlement?.southPowerAfter ?? southPower
    const settledNorthStats = lastSettlement?.northStatsAfter ?? northStats
    const settledSouthStats = lastSettlement?.southStatsAfter ?? southStats
    const northPowerRows = buildSettlementPowerRows(lastSettlement?.northStatsBefore ?? settledNorthStats, settledNorthStats)
    const southPowerRows = buildSettlementPowerRows(lastSettlement?.southStatsBefore ?? settledSouthStats, settledSouthStats)
    const policyAftereffectTexts = lastSettlement?.policyAftereffect
        ? selectSettlementPolicyAftereffectText(settlementPolicyFollowup, lastSettlement.policyAftereffect.summary)
        : []
    const anomalyEntries = buildSettlementAnomalyStream({
        delayedBacklash: lastSettlement?.delayedBacklash ?? [],
        backlashTexts: lastSettlement?.delayedBacklash?.length ? [] : backlashHints,
        policyAftereffectTexts,
        externalActionReports: lastSettlement?.externalActionReports ?? [],
        relationshipReports: lastSettlement?.relationshipReports ?? [],
        factionCollapseReports: lastSettlement?.factionCollapseReports ?? [],
        borrowedBladeReports: lastSettlement?.borrowedBladeReports ?? [],
        keyChangeHighlights: lastSettlement?.keyChangeHighlights ?? [],
        campaignRecord: campaignRecord.visible ? campaignRecord : null,
    })

    useEffect(() => {
        setActiveSettlementDeck('power')
        setViewedAnomaly(false)
    }, [currentRound])

    const showPowerDeck = () => {
        setActiveSettlementDeck('power')
    }

    const showAnomalyDeck = () => {
        setActiveSettlementDeck('anomaly')
        setViewedAnomaly(true)
    }

    const canProceedToNextVolume = viewedAnomaly
    const handleNextVolume = () => {
        if (!canProceedToNextVolume) return
        nextPhase()
    }

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
            const worldMemorySummary = summarizeWorldEventMemories(selectWorldEventMemoriesForPrompt({
                ledger: worldMemoryLedger,
                scopes: ['chronicle_fact'],
                currentRound,
                includeCurrentRound: true,
                limit: 3,
            }))
            const chronicleTimeLabels = getChronicleTimeLabels(currentRound)
            const southEmpressReply = empressReplyRecord?.sourceRound === currentRound
                ? empressReplyRecord.text
                : buildSettlementDefaultEmpressReply(lastSettlement.policyReport)

            const messages = buildJudgePrompt({
                round: currentRound,
                eventName: event.eventName,
                northChronicleTimeLabel: chronicleTimeLabels.north,
                southChronicleTimeLabel: chronicleTimeLabels.south,
                eventImpactSummary: judgeFacts.eventImpactSummary,
                schemeResults: lastSettlement.schemeResults.map((r, i) => ({
                    schemeName: schemeName(processedSchemes[i]?.schemeType ?? ''),
                    targetName: npcs.find(n => n.id === processedSchemes[i]?.targetNpcId)?.name ?? '',
                    success: r.success,
                    feedback: r.feedbackText,
                    playerSpeech: processedSchemes[i]?.playerSpeech ?? '',
                })),
                schemeCausalEvents: schemeCausalEvents.map(event => event.promptLine),
                worldMemorySummary,
                northQuoteCandidate,
                trustChangeSummary: trustSummary,
                northPowerChange: `综合国力 ${settledNorthPower.toFixed(1)}`,
                factionSummary: judgeFacts.factionSummary,
                relationshipSummary: judgeFacts.relationshipSummary,
                externalSummary: judgeFacts.externalSummary,
                northSummary: judgeFacts.northSummary,
                southSummary: judgeFacts.southSummary,
                southEmpressReply,
                invasionSummary: lastSettlement.judgeFacts.invasionSummary ?? '南征风向仍待观察',
            })

            try {
                const narration = await chatCompletion(messages, {
                    temperature: 0.9,
                    maxTokens: 320,
                    tag: 'judge',
                })
                if (cancelled) return
                setJudgeNarration(sanitizeChronicleNarration(narration, chronicleTimeLabels))
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
    }, [currentRound, currentSchemes, empressReplyRecord, huainanCampaign, lastSettlement, settledNorthPower, npcFeedbacks, npcs, shuCampaign, worldMemoryLedger])

    const settlementBleed = (
        <div className="settlement-bleed" style={SETTLEMENT_ART_STYLE}>
        </div>
    )

    return (
        <GameViewport
            className="settlement-viewport animate-fade-in"
            canvasClassName="settlement-design-canvas"
            bleed={settlementBleed}
        >
        <div className="settlement-canvas-content settlement page-enter" style={SETTLEMENT_ART_STYLE}>
            {currentRound === 1 && !firstRoundGuideSeen.settlement && (
                <FirstRoundGuideModal
                    title={settlementGuide.title}
                    body={settlementGuide.body}
                    onClose={() => markFirstRoundGuideSeen('settlement')}
                />
            )}

            <header className="settlement-volume-hud animate-slide-up">
                <div className="settlement-volume-title-plaque">
                    <img
                        className="settlement-volume-seal"
                        src={SETTLEMENT_ASSETS.volumeSeal}
                        alt=""
                        aria-hidden="true"
                        draggable={false}
                    />
                    <h1 className="settlement-title-line">本卷结算</h1>
                </div>
                <div className="settlement-hud-status" aria-label="本卷结算后的当前状态">
                    <div className="settlement-hud-status-chip">
                        <span className="settlement-hud-status-label">南陈相对北周</span>
                        <span className={`settlement-hud-status-value relative-badge level-${getRelativePowerLevel(settledNorthPower, settledSouthPower)}`}>
                            {getRelativePowerLabel(settledNorthPower, settledSouthPower)}
                        </span>
                    </div>
                    <div className="settlement-hud-status-chip">
                        <span className="settlement-hud-status-label">南征风向</span>
                        <span className={`settlement-hud-status-value ${invasionRisk.className}`}>{invasionRisk.label}</span>
                    </div>
                    <div className="settlement-hud-status-chip">
                        <span className="settlement-hud-status-label">自身安危</span>
                        <span className={`settlement-hud-status-value ${safetyRisk.className}`}>{safetyRisk.label}</span>
                    </div>
                </div>
                <PageUtilityActions onOpenGuide={() => openGameplayGuide('gameplay')} />
            </header>

            <div className="settlement-content">
                <div className="scroll-container settlement-chronicle-shell animate-slide-up animate-delay-1">
                    <div className="chronicle-scroll-art" aria-hidden="true">
                        <span className="chronicle-scroll-side chronicle-scroll-left"></span>
                        <span className="chronicle-scroll-paper"></span>
                        <span className="chronicle-scroll-side chronicle-scroll-right"></span>
                    </div>
                    <div className="judge-narration chronicle-narration">
                        <h3 className="judge-title">{getChronicleVolumeTitle(currentRound)}</h3>
                        <div className="narration-content">
                            {isLoading ? (
                                <div className="loading-state">
                                    <div className="ai-ripple"></div>
                                    <p className="narration-loading">天道正在结算本回合的得失</p>
                                </div>
                            ) : (
                                renderSettlementChronicleText(judgeNarration)
                            )}
                        </div>
                    </div>
                </div>

                <section className={`settlement-lower-deck is-${activeSettlementDeck} animate-slide-up animate-delay-2`} aria-label="本卷结算明细">
                    <button
                        type="button"
                        className={`settlement-deck-tab settlement-deck-tab-power ${activeSettlementDeck === 'power' ? 'is-active' : ''}`}
                        aria-pressed={activeSettlementDeck === 'power'}
                        onClick={showPowerDeck}
                    >
                        <span className="settlement-deck-tab-label">两朝国力对比</span>
                    </button>

                    <button
                        type="button"
                        className={`settlement-deck-tab settlement-deck-tab-anomaly ${activeSettlementDeck === 'anomaly' ? 'is-active' : ''}`}
                        aria-pressed={activeSettlementDeck === 'anomaly'}
                        onClick={showAnomalyDeck}
                    >
                        <span className="settlement-deck-tab-label">本卷异动</span>
                        <span className={`settlement-deck-tab-state ${viewedAnomaly ? 'is-read' : 'is-unread'}`}>
                            {viewedAnomaly ? '已阅' : '未阅'}
                        </span>
                    </button>

                    <div className="settlement-deck-main">
                        <div className="settlement-deck-view settlement-power-deck" aria-hidden={activeSettlementDeck !== 'power'}>
                            <div className="settlement-power-grid">
                                <SettlementPowerPanel
                                    title="北周国力"
                                    tone="north"
                                    stats={settledNorthStats}
                                    rows={northPowerRows}
                                />
                                <SettlementPowerPanel
                                    title="南陈国力"
                                    tone="south"
                                    stats={settledSouthStats}
                                    rows={southPowerRows}
                                />
                            </div>
                        </div>

                        <div className="settlement-deck-view settlement-anomaly-panel settlement-anomaly-deck" aria-hidden={activeSettlementDeck !== 'anomaly'}>
                            <div className="settlement-anomaly-stream" aria-label="本卷异动事件流">
                                {anomalyEntries.length > 0 ? (
                                    anomalyEntries.map(entry => (
                                        <article
                                            key={entry.id}
                                            className={`settlement-anomaly-entry tone-${entry.tone} priority-${entry.priority}`}
                                        >
                                            <div className="settlement-anomaly-labels">
                                                <span className="settlement-anomaly-label">{entry.label}</span>
                                                {entry.subLabel && <span className="settlement-anomaly-sub-label">{entry.subLabel}</span>}
                                                {entry.secondaryLabel && <span className="settlement-anomaly-sub-label">{entry.secondaryLabel}</span>}
                                            </div>
                                            <div className="settlement-anomaly-copy">
                                                <h4>{entry.title}</h4>
                                                <p>{entry.text}</p>
                                            </div>
                                        </article>
                                    ))
                                ) : (
                                    <p className="settlement-anomaly-empty">{SETTLEMENT_ANOMALY_EMPTY_TEXT}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                <div className={`action-footer animate-slide-up animate-delay-4 ${canProceedToNextVolume ? 'is-ready' : 'is-locked'}`}>
                    <button
                        className="btn-primary btn-next"
                        onClick={handleNextVolume}
                        aria-disabled={!canProceedToNextVolume}
                    >
                        下一卷
                    </button>
                    {!canProceedToNextVolume && (
                        <span className="settlement-next-tooltip" role="tooltip">
                            查看本卷异动后继续
                        </span>
                    )}
                </div>
            </div>
        </div>
        </GameViewport>
    )
}
