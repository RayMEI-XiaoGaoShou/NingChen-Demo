import { useGameStore } from '../../stores/gameStore'
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { useMediaStore } from '../../stores/mediaStore'
import { useUiStore } from '../../stores/uiStore'
import { FIRST_ROUND_GUIDE_CONTENT } from '../../data/prologueContent'
import { getPowerLabel, getTrustLabel, getTrustLevel, type NPC, type SchemeType } from '../../game/types'
import { getCourtBalance } from '../../game/nationEngine'
import { getExternalTerminalLabel, isTerminalExternalNpc } from '../../game/externalStatus'
import { getHighlightedNpcIds, getNpcRoundReaction } from '../../game/roundIntelEngine'
import { buildExternalLineProgress } from '../../game/externalLineProgress'
import {
    explainExternalActionUnlock,
    getExternalPostureLabel,
    getExternalTiltLabel,
    getExternalMilitaryPostureLabel,
    getFactionConditionLabel,
    getFavorPressureLabel,
} from '../../game/explainability'
import {
    getCourtDispositionOpportunity as getCoreCourtDispositionOpportunity,
    getCourtStatusLabel as getCoreCourtStatusLabel,
    isCourtDispositionTarget as isCourtDispositionTargetId,
    normalizeCourtDispositionNpc,
} from '../../game/courtDisposition'
import { buildCourtDispositionHint } from '../../game/courtDispositionHint'
import { roundSupportsExternalAction } from '../../data/roundRuleConfig'
import {
    COURT_FACTION_UI_ASSETS,
    EXTERNAL_FACTION_UI_ASSETS,
    getNpcDetailAssetKey,
    getNpcDetailAvatarPath,
    getNpcDetailBackgroundPath,
    getNpcDetailPortraitPath,
    getNpcDetailVoicePath,
    getNpcPublicStatementAudioPath,
} from '../../data/mediaAssets'
import { getFengDaozhiAdvisorNote } from '../../data/fengDaozhiAdvisorNotes'
import { FirstRoundGuideModal } from '../FirstRoundGuide/FirstRoundGuideModal'
import { NpcPortrait } from '../NpcPortrait/NpcPortrait'
import { PageUtilityActions } from '../PageUtilityActions/PageUtilityActions'
import { SchemeComposer, type SchemeSubmitResult } from '../SchemePanel/SchemePanel'
import { GameHudTools, HudStatusChip } from '../GameHud/GameHud'
import { renderMixedTextWithNumberSpans } from '../../utils/renderMixedText'
import { formatRoundVolumeLabel } from '../../utils/roundLabels'
import { GameViewport } from '../GameViewport/GameViewport'
import './CourtView.css'

function getFactionDoctrine(factionId: 'emperor' | 'empress') {
    if (factionId === 'emperor') {
        return {
            title: '帝党',
            summary: '',
        }
    }

    return {
        title: '后党',
        summary: '',
    }
}

function getExternalBlocDoctrine(factionId: 'longxi' | 'prairie') {
    if (factionId === 'longxi') {
        return {
            title: '陇右勋贵',
            summary: '虎据陇右的军事贵族，家族把持地方军政数十载，控遏与西域的商贸往来，部下精锐私兵唯领袖马首是瞻',
        }
    }

    return {
        title: '内附草原势力',
        summary: '被高官厚禄引诱而归附北周的草原部落族长，然草原狼的野心岂是区区财帛、官位能满足的？',
    }
}

function getDisplayedNpcTitle(npc: NPC): string {
    const titleMap: Record<string, string> = {
        weichimu: '上柱国、梁国公、都督河南诸军事【驻扎彭城】',
        'weichimù': '上柱国、梁国公、都督河南诸军事【驻扎彭城】',
        linghuelvguang: '上柱国、秦国公、都督河北诸军事【驻扎邺城】',
        duguwenyue: '后将军、上柱国、澜侯【驻扎天水】',
        hebabogui: '卫将军、上柱国、北地公、都督河西陇右诸军事【驻扎金城郡】',
        'hebaboguì': '卫将军、上柱国、北地公、都督河西陇右诸军事【驻扎金城郡】',
        erzhulie: '北庭节度使、上柱国【驻扎雁门】',
        'erzhulié': '北庭节度使、上柱国【驻扎雁门】',
        ansiming: '卢龙节度使、上柱国【驻扎范阳】',
    }

    return titleMap[npc.id] ?? npc.title
}

const LOYALTY_TOOLTIP = '忠诚度——此人还甘不甘心替北周朝廷卖命。越低，他越容易离心、割据，甚至在你推波助澜之下公然举起反旗。'
const TRUST_TOOLTIP = '信任度——此人是否真把你当成能替他谋后路的人。越高，他越甘愿听你的话，你也越容易推动他走出下一步。'
const MILITARY_TOOLTIP = '军力——此人手里还能调动多少兵马与武备。兵势越重，他若割据或造反便闹得越大；兵势越轻，中枢便越不拿他当回事。你既可以替他壮大兵势，也可以借朝廷之手消磨他的实力。'
const WAR_TREND_TOOLTIP = '南征风向，是北周朝堂在“挥师南下”与“先安内政”之间的天平。帝党势盛则主战声起，后党稳固则南征搁浅。你要做的，是让这面天平始终不往最坏的方向倒。'
const SAFETY_RISK_TOOLTIP = '自身安危，是你在北周朝堂上的处境有多危险。戒备你的权臣越多、发酵中的关系链越多，你离被盯上甚至被审查的深渊就越近。'

type CourtStatus = 'active' | 'dismissed' | 'executed'
type CourtDispositionNpc = NPC & {
    emperorFavor: number
    empressDowagerFavor: number
    courtStatus?: CourtStatus
}

function isCourtDispositionTarget(npc: NPC): boolean {
    return isCourtDispositionTargetId(npc.id)
}

function getCourtStatus(npc: NPC): CourtStatus {
    return (npc as CourtDispositionNpc).courtStatus ?? 'active'
}

function getCourtStatusLabel(status: CourtStatus): string {
    return getCoreCourtStatusLabel(status)
}

function getCourtFavor(npc: NPC) {
    const courtNpc = normalizeCourtDispositionNpc(npc) as CourtDispositionNpc
    return {
        emperorFavor: courtNpc.emperorFavor,
        empressDowagerFavor: courtNpc.empressDowagerFavor,
    }
}

function getCourtDispositionOpportunity(npc: NPC): 'safe' | 'dismissible' | 'executable' {
    return getCoreCourtDispositionOpportunity(normalizeCourtDispositionNpc(npc))
}

function buildExternalWhisper(
    npc: NPC,
    progress: NonNullable<ReturnType<typeof buildExternalLineProgress>>,
    unlockedSecrets: number,
): string {
    const unlock = explainExternalActionUnlock({
        trustGap: progress.trustGap,
        loyaltyGap: progress.loyaltyGap,
        secretsGap: progress.secretsGap,
        roundWindowOpen: progress.windowOpen,
    })

    if (unlock.unlocked) {
        return `冯道之密语：${npc.name} 这条线，眼下卡在「可动之时」。条件已齐：信任够了、忠心已冷、暗线已明。眼下正是逼他走向 ${progress.targetLabel} 的时候——再拖下去，变数只会更多。下一手宜 ${progress.nextMoveLabel}。`
    }

    if (progress.trustGap > 0) {
        return `冯道之密语：${npc.name} 这条线，眼下卡在「养信」。离 ${progress.targetLabel} 还卡在第一步：信任尚差 ${progress.trustGap} 点。暗线已明 ${unlockedSecrets}/${unlockedSecrets + progress.secretsGap}，路还长。下一手宜 ${progress.nextMoveLabel}。`
    }

    if (progress.secretsGap > 0) {
        return `冯道之密语：${npc.name} 这条线，眼下卡在「探暗线」。信任已够，但底牌还没摸透——还差 ${progress.secretsGap} 条暗线。${npc.name} 最不肯明说的那层心思，不挖出来，${progress.targetLabel} 便无从谈起。下一手宜 ${progress.nextMoveLabel}。`
    }

    if (progress.loyaltyGap > 0) {
        return `冯道之密语：${npc.name} 这条线，眼下卡在「离心」。${npc.name} 已肯听你，底牌也露了大半，唯独对朝廷还没冷透。再压 ${progress.loyaltyGap} 点忠诚，才到试 ${progress.targetLabel} 的时候。下一手宜 ${progress.nextMoveLabel}。`
    }

    if (!progress.windowOpen) {
        return `冯道之密语：${npc.name} 这条线，眼下卡在「等窗口」。信任已够，忠心已冷，底牌已摸清——万事俱备，只差一个能逼他摊牌的时局窗口。下一手宜 ${progress.nextMoveLabel}。`
    }
    return `冯道之密语：${npc.name} 这条线，眼下卡在「等窗口」。信任已够，忠心已冷，底牌已摸清——万事俱备，只差一个能逼他摊牌的时局窗口。下一手宜 ${progress.nextMoveLabel}。`
}

function buildFallbackFengDaozhiAdvisorNote(
    npc: NPC,
    dispositionHint: ReturnType<typeof buildCourtDispositionHint> | null,
) {
    return [
        npc.publicPersona,
        npc.publicStance,
        dispositionHint?.shortText ?? '先看她今日表态，再挑一处最怕被人看见的心结。',
    ].filter(Boolean).join('。')
}

type CourtScope = 'overview' | 'court' | 'external'
type CourtStrengthPart = {
    label: string
    value: number
}
type ExternalMetricId = 'military' | 'loyalty' | 'trust'
type CourtFactionGroup = {
    id: 'emperor' | 'empress' | 'longxi' | 'prairie'
    title: string
    summary?: string
    artLabel?: string
    metricLabel: string
    members: NPC[]
    emblemLabel?: string
    strengthValue?: number
    strengthParts?: CourtStrengthPart[]
}

function getPipCount(value: number): number {
    if (value >= 80) return 5
    if (value >= 65) return 4
    if (value >= 50) return 3
    if (value >= 35) return 2
    if (value > 0) return 1
    return 0
}

function getKnownIntelBudget(knownIntel: number): number {
    return Math.min(Math.max(knownIntel, 0), 2)
}

function isActiveCourtNpc(npc: NPC): boolean {
    return npc.isAlive && getCourtStatus(npc) === 'active'
}

function isSelectableCourtNpc(npc: NPC): boolean {
    return isActiveCourtNpc(npc) && !(isCourtDispositionTarget(npc) && getCourtStatus(npc) !== 'active')
}

function orderCourtFactionMembers(members: NPC[], centerName: string): NPC[] {
    const center = members.find(npc => npc.name === centerName)
    if (!center) return members

    const flankers = members.filter(npc => npc.id !== center.id)
    return [flankers[0], center, ...flankers.slice(1)].filter(Boolean) as NPC[]
}

function isSelectableExternalNpc(npc: NPC): boolean {
    return npc.isAlive && !isTerminalExternalNpc(npc)
}

type CourtLeaderIdentity = {
    emblem: 'emperor' | 'empress'
    lines: string[]
}

const COURT_TITLE_PLAQUES: Record<string, string> = {
    'weichimù': '都督河南诸军事',
    'zongai': '中常侍',
    'yuwendi': '燕王',
    'linghuelvguang': '都督河北诸军事',
    'hebaqí': '太后',
    'zuting': '左丞相',
}

const EXTERNAL_TITLE_PLAQUES: Record<string, string> = {
    'duguwenyue': '后将军【屯驻天水】',
    'hebaboguì': '卫将军【屯驻金城】',
    'erzhulié': '北庭节度使【屯驻雁门】',
    'ansiming': '卢龙节度使【屯驻范阳】',
}

function getCourtLeaderIdentity(npc: NPC): CourtLeaderIdentity | null {
    if (npc.name === '宗艾') return { emblem: 'emperor', lines: ['代言皇帝', '帝党魁首'] }
    if (npc.name === '贺拔琪') return { emblem: 'empress', lines: ['摄政', '后党魁首'] }
    return null
}

function getNpcTitlePlaque(npc: NPC): string | null {
    if (npc.powerBase === 'court') return COURT_TITLE_PLAQUES[npc.id] ?? getDisplayedNpcTitle(npc)
    if (npc.powerBase === 'external') return EXTERNAL_TITLE_PLAQUES[npc.id] ?? getDisplayedNpcTitle(npc)
    return null
}

function getCourtStrengthPartLabel(label: string): string {
    if (label === '内稳') return '内部稳定度'
    if (label === '朝堂影响') return '朝堂影响力'
    return label
}

function getCourtSeatLayoutClass(npc: NPC): string {
    const layoutClassMap: Record<string, string> = {
        'weichimù': 'court-seat-yuchimu',
        zongai: 'court-seat-zongai',
        yuwendi: 'court-seat-yuwendi',
        linghuelvguang: 'court-seat-linghulvguang',
        'hebaqí': 'court-seat-hebaqi',
        zuting: 'court-seat-zuting',
    }

    return layoutClassMap[npc.id] ?? ''
}

function getExternalSeatLayoutClass(npc: NPC): string {
    const layoutClassMap: Record<string, string> = {
        duguwenyue: 'external-seat-duguwenyue',
        'hebaboguì': 'external-seat-hebabogui',
        'erzhulié': 'external-seat-erzhulie',
        ansiming: 'external-seat-ansiming',
    }

    return layoutClassMap[npc.id] ?? ''
}

function getNpcSeatLayoutClass(npc: NPC): string {
    return npc.powerBase === 'external' ? getExternalSeatLayoutClass(npc) : getCourtSeatLayoutClass(npc)
}

interface CourtTopBarProps {
    backLabel: string
    location: string
    breadcrumbActionLabel?: string
    actionLabel?: string
    powerLabel: string
    invasionRisk: { label: string; className: string }
    safetyRisk: { label: string; className: string }
    remainingSchemes: number
    maxSchemes: number
    onBack: () => void
    onBreadcrumbAction?: () => void
    onAction?: () => void
    onOpenGuide: () => void
}

export type CourtPreviewScheme = {
    targetNpcId: string
    schemeType: SchemeType
}

interface CourtViewProps {
    previewScheme?: CourtPreviewScheme | null
}

function CourtTopBar({
    backLabel,
    location,
    breadcrumbActionLabel,
    actionLabel,
    powerLabel,
    invasionRisk,
    safetyRisk,
    remainingSchemes,
    maxSchemes,
    onBack,
    onBreadcrumbAction,
    onAction,
    onOpenGuide,
}: CourtTopBarProps) {
    return (
        <div className="court-top-bar">
            <button className="court-top-button court-back-button" onClick={onBack}>{backLabel}</button>
            <span className="court-hud-breadcrumb">
                <span className="court-screen-hud-title">{renderMixedTextWithNumberSpans(location)}</span>
                {breadcrumbActionLabel && onBreadcrumbAction ? (
                    <button className="court-top-button court-hud-breadcrumb-action" onClick={onBreadcrumbAction}>
                        {breadcrumbActionLabel}
                    </button>
                ) : null}
            </span>
            <div className="court-screen-hud-state">
                <HudStatusChip label="国力" value={powerLabel} valueClassName={`power-level-${powerLabel}`} />
                <HudStatusChip label="南征" value={invasionRisk.label} valueClassName={invasionRisk.className} title={WAR_TREND_TOOLTIP} />
                <HudStatusChip label="安危" value={safetyRisk.label} valueClassName={safetyRisk.className} title={SAFETY_RISK_TOOLTIP} />
                <HudStatusChip label="计谋" value={`${remainingSchemes}/${maxSchemes}`} valueClassName="court-character-number" />
            </div>
            {actionLabel && onAction ? (
                <button className="court-top-button court-hud-link" onClick={onAction}>{actionLabel}</button>
            ) : actionLabel ? (
                <span className="court-hud-link">{actionLabel}</span>
            ) : (
                <span className="court-hud-link court-hud-link-empty" aria-hidden="true" />
            )}
            <GameHudTools className="court-top-actions" onOpenGuide={onOpenGuide} />
        </div>
    )
}

export function CourtView({ previewScheme = null }: CourtViewProps = {}) {
    const {
        currentRound,
        difficulty,
        completeSchemingIfReady,
        northPower,
        schemeCount,
        maxSchemes,
        npcs,
        factions,
        intelProgress,
        currentSchemes,
        prevPhase,
        firstRoundGuideSeen,
        markFirstRoundGuideSeen,
        openGameplayGuide,
        shuCampaign,
        huainanCampaign,
    } = useGameStore()
    const { openNpcDetail } = useUiStore()
    const { isMuted, beginVoiceDucking, endVoiceDucking, resetVoiceDucking } = useMediaStore()
    const previewNpc = previewScheme ? npcs.find(npc => npc.id === previewScheme.targetNpcId) ?? null : null
    const [scope, setScope] = useState<CourtScope>(() => (
        previewNpc
            ? previewNpc.powerBase === 'external' ? 'external' : 'court'
            : 'overview'
    ))
    const [selectedNpcId, setSelectedNpcId] = useState<string | null>(previewScheme?.targetNpcId ?? null)
    const [schemeDrawerNpcId, setSchemeDrawerNpcId] = useState<string | null>(previewScheme?.targetNpcId ?? null)
    const statementAudioCacheRef = useRef<Map<string, HTMLAudioElement>>(new Map())
    const activeStatementAudioRef = useRef<HTMLAudioElement | null>(null)
    const activeStatementAudioSourceRef = useRef<string | null>(null)
    const detailVoiceAudioRef = useRef<HTMLAudioElement | null>(null)
    const publicStatementDuckingActiveRef = useRef(false)
    const detailVoiceDuckingActiveRef = useRef(false)
    const hebaQiGlassBaseStyle = {
        '--hebaqi-glass-x': '22%',
        '--hebaqi-glass-y': '14%',
        '--hebaqi-glass-angle': '118deg',
        '--hebaqi-glass-pull-x': '0px',
        '--hebaqi-glass-pull-y': '0px',
    } as CSSProperties

    useEffect(() => {
        if (!previewScheme) return

        const nextPreviewNpc = npcs.find(npc => npc.id === previewScheme.targetNpcId) ?? null
        setSelectedNpcId(previewScheme.targetNpcId)
        setSchemeDrawerNpcId(previewScheme.targetNpcId)
        setScope(nextPreviewNpc?.powerBase === 'external' ? 'external' : 'court')
    }, [previewScheme?.targetNpcId, npcs])

    const powerLabel = getPowerLabel(northPower)
    const courtNpcs = npcs.filter(npc => npc.powerBase === 'court')
    const externalNpcs = npcs.filter(npc => npc.powerBase === 'external' && npc.isAlive)
    const emperorMembers = orderCourtFactionMembers(
        courtNpcs.filter(npc => npc.factionId === 'emperor'),
        '宗艾',
    )
    const empressMembers = orderCourtFactionMembers(
        courtNpcs.filter(npc => npc.factionId === 'empress'),
        '贺拔琪',
    )
    const longxiMembers = externalNpcs.filter(npc => npc.factionId === 'longxi')
    const prairieMembers = externalNpcs.filter(npc => npc.factionId === 'prairie')
    const emperorFaction = factions.find(faction => faction.id === 'emperor')
    const empressFaction = factions.find(faction => faction.id === 'empress')
    const usedNpcIds = new Set(currentSchemes.map(scheme => scheme.targetNpcId))
    const highlightedNpcIds = new Set(getHighlightedNpcIds(currentRound, npcs))
    const selectedNpc = selectedNpcId ? npcs.find(npc => npc.id === selectedNpcId) ?? null : null
    const { emperorInfluence, empressInfluence, ratio: warRatio } = getCourtBalance(factions, npcs, currentRound)

    const externalProgressMap = Object.fromEntries(
        externalNpcs.map(npc => [
            npc.id,
            buildExternalLineProgress({
                npc,
                unlockedSecrets: intelProgress[npc.id] ?? 0,
                difficulty,
                round: currentRound,
                externalActionEnabled: roundSupportsExternalAction(
                    currentRound,
                    npc.highActionBias === 'rebellion' ? 'rebellion' : 'secession',
                ),
            }),
        ]),
    )

    const invasionRisk =
        warRatio >= 1.2
            ? { label: '箭在弦上', className: 'risk-critical' }
            : warRatio >= 0.8
                ? { label: '朝议煎沸', className: 'risk-warning' }
                : { label: '偏安之局', className: 'risk-safe' }

    const dangerNpcs = npcs.filter(
        npc =>
            npc.canExecute &&
            npc.powerBase === 'court' &&
            npc.trust <= 25 &&
            (factions.find(faction => faction.id === npc.factionId)?.courtInfluence ?? 0) >= 55,
    )

    const safetyRisk =
        dangerNpcs.some(npc => npc.trust <= 15)
            ? { label: '祸生肘腋', className: 'risk-critical' }
            : dangerNpcs.length > 0
                ? { label: '风闻渐起', className: 'risk-warning' }
                : { label: '尚可斡旋', className: 'risk-safe' }

    const courtGroups: CourtFactionGroup[] = [
        {
            id: 'emperor',
            ...getFactionDoctrine('emperor'),
            metricLabel: `综合实力 ${emperorInfluence.toFixed(1)}`,
            members: emperorMembers,
            emblemLabel: '龙',
            strengthValue: emperorInfluence,
            strengthParts: [
                { label: '军力', value: emperorFaction?.militaryPower ?? 0 },
                { label: '内稳', value: emperorFaction?.internalStability ?? 0 },
                { label: '朝堂影响', value: emperorFaction?.courtInfluence ?? 0 },
            ],
        },
        {
            id: 'empress',
            ...getFactionDoctrine('empress'),
            metricLabel: `综合实力 ${empressInfluence.toFixed(1)}`,
            members: empressMembers,
            emblemLabel: '凤',
            strengthValue: empressInfluence,
            strengthParts: [
                { label: '军力', value: empressFaction?.militaryPower ?? 0 },
                { label: '内稳', value: empressFaction?.internalStability ?? 0 },
                { label: '朝堂影响', value: empressFaction?.courtInfluence ?? 0 },
            ],
        },
    ]

    const externalGroups: CourtFactionGroup[] = [
        {
            id: 'longxi',
            ...getExternalBlocDoctrine('longxi'),
            artLabel: '边关 / 甲胄',
            metricLabel: `在场军头 ${longxiMembers.length}`,
            members: longxiMembers,
            emblemLabel: '虎',
        },
        {
            id: 'prairie',
            ...getExternalBlocDoctrine('prairie'),
            artLabel: '帐幕 / 雪原',
            metricLabel: `在场军头 ${prairieMembers.length}`,
            members: prairieMembers,
            emblemLabel: '狼',
        },
    ]

    const remainingSchemes = Math.max(0, maxSchemes - schemeCount)
    const publicStatementAudioContext = {
        shuCampaignState: shuCampaign.resolvedState ?? shuCampaign.state,
        huainanCampaignState: huainanCampaign.resolvedState ?? huainanCampaign.state,
    }

    const handleEmbeddedSchemeAfterSubmit = (result: SchemeSubmitResult) => {
        const { schemeCountAfterSubmit, maxSchemes } = result
        setSchemeDrawerNpcId(null)

        if (schemeCountAfterSubmit >= maxSchemes) {
            completeSchemingIfReady()
            return
        }

        setSelectedNpcId(null)
        setScope(result.targetPowerBase === 'external' ? 'external' : 'court')
    }

    const beginPublicStatementDucking = () => {
        if (publicStatementDuckingActiveRef.current) return
        publicStatementDuckingActiveRef.current = true
        beginVoiceDucking()
    }

    const endPublicStatementDucking = () => {
        if (!publicStatementDuckingActiveRef.current) return
        publicStatementDuckingActiveRef.current = false
        endVoiceDucking()
    }

    const beginDetailVoiceDucking = () => {
        if (detailVoiceDuckingActiveRef.current) return
        detailVoiceDuckingActiveRef.current = true
        beginVoiceDucking()
    }

    const endDetailVoiceDucking = () => {
        if (!detailVoiceDuckingActiveRef.current) return
        detailVoiceDuckingActiveRef.current = false
        endVoiceDucking()
    }

    const finalizePublicStatementAudio = (audio: HTMLAudioElement) => {
        if (activeStatementAudioRef.current !== audio) return
        activeStatementAudioRef.current = null
        activeStatementAudioSourceRef.current = null
        endPublicStatementDucking()
    }

    const finalizeDetailVoiceAudio = (audio: HTMLAudioElement) => {
        if (detailVoiceAudioRef.current !== audio) return
        detailVoiceAudioRef.current = null
        endDetailVoiceDucking()
    }

    const preparePublicStatementAudio = (audio: HTMLAudioElement) => {
        audio.volume = 0.95
        audio.onended = () => finalizePublicStatementAudio(audio)
        audio.onpause = () => {
            if (activeStatementAudioRef.current === audio) {
                finalizePublicStatementAudio(audio)
            }
        }
    }

    const stopPublicStatementAudio = () => {
        const activeAudio = activeStatementAudioRef.current
        if (activeAudio) {
            activeAudio.pause()
            activeAudio.currentTime = 0
        }
        activeStatementAudioRef.current = null
        activeStatementAudioSourceRef.current = null
        endPublicStatementDucking()
    }

    const stopNpcDetailVoice = () => {
        const activeAudio = detailVoiceAudioRef.current
        if (activeAudio) {
            activeAudio.pause()
            activeAudio.currentTime = 0
        }
        detailVoiceAudioRef.current = null
        endDetailVoiceDucking()
    }

    useEffect(() => {
        if (typeof Audio === 'undefined') return

        const stagedNpcs = scope === 'court'
            ? courtNpcs
            : scope === 'external'
                ? externalNpcs
                : []
        const nextSources = new Set(
            stagedNpcs
                .map(npc => getNpcPublicStatementAudioPath(npc.id, currentRound, publicStatementAudioContext))
                .filter((source): source is string => Boolean(source)),
        )
        const cache = statementAudioCacheRef.current

        nextSources.forEach(source => {
            if (cache.has(source)) return
            const audio = new Audio(source)
            audio.preload = 'auto'
            preparePublicStatementAudio(audio)
            audio.load()
            cache.set(source, audio)
        })

        cache.forEach((audio, source) => {
            if (nextSources.has(source)) return
            audio.pause()
            cache.delete(source)
        })
    }, [
        scope,
        currentRound,
        npcs,
        publicStatementAudioContext.shuCampaignState,
        publicStatementAudioContext.huainanCampaignState,
    ])

    useEffect(() => {
        if (!isMuted) return
        const activeAudio = activeStatementAudioRef.current
        if (activeAudio) {
            activeAudio.pause()
            activeAudio.currentTime = 0
        }
        activeStatementAudioRef.current = null
        activeStatementAudioSourceRef.current = null
        stopNpcDetailVoice()
        resetVoiceDucking()
        publicStatementDuckingActiveRef.current = false
        detailVoiceDuckingActiveRef.current = false
    }, [isMuted])

    useEffect(() => () => {
        statementAudioCacheRef.current.forEach(audio => {
            audio.pause()
            audio.currentTime = 0
        })
        statementAudioCacheRef.current.clear()
        activeStatementAudioRef.current = null
        activeStatementAudioSourceRef.current = null
        stopNpcDetailVoice()
        resetVoiceDucking()
        publicStatementDuckingActiveRef.current = false
        detailVoiceDuckingActiveRef.current = false
    }, [])

    const playPublicStatementAudio = (npc: NPC) => {
        if (isMuted || typeof Audio === 'undefined') return
        const source = getNpcPublicStatementAudioPath(npc.id, currentRound, publicStatementAudioContext)
        if (!source) return

        let audio = statementAudioCacheRef.current.get(source)
        if (!audio) {
            audio = new Audio(source)
            audio.preload = 'auto'
            statementAudioCacheRef.current.set(source, audio)
        }
        preparePublicStatementAudio(audio)

        if (activeStatementAudioSourceRef.current === source && !audio.paused) return
        stopPublicStatementAudio()

        activeStatementAudioRef.current = audio
        activeStatementAudioSourceRef.current = source
        audio.currentTime = 0
        beginPublicStatementDucking()
        audio.play().catch(() => finalizePublicStatementAudio(audio))
    }

    const playNpcDetailVoice = (npc: NPC) => {
        if (isMuted) return
        if (typeof Audio === 'undefined') return
        const source = getNpcDetailVoicePath(npc.id, npc.trust)
        if (!source) return

        stopNpcDetailVoice()
        const audio = new Audio(source)
        audio.preload = 'auto'
        audio.volume = 1
        audio.onended = () => finalizeDetailVoiceAudio(audio)
        audio.onpause = () => {
            if (detailVoiceAudioRef.current === audio) {
                finalizeDetailVoiceAudio(audio)
            }
        }
        detailVoiceAudioRef.current = audio
        beginDetailVoiceDucking()
        audio.play().catch(() => finalizeDetailVoiceAudio(audio))
    }

    const selectNpcDetail = (npc: NPC, options: { openOverlayDetail?: boolean } = {}) => {
        stopPublicStatementAudio()
        playNpcDetailVoice(npc)

        if (options.openOverlayDetail) {
            openNpcDetail(npc.id)
            return
        }

        setSelectedNpcId(npc.id)
    }

    const goScope = (nextScope: Exclude<CourtScope, 'overview'>) => {
        stopNpcDetailVoice()
        setSelectedNpcId(null)
        setSchemeDrawerNpcId(null)
        setScope(nextScope)
    }

    const backToOverview = () => {
        stopNpcDetailVoice()
        setSelectedNpcId(null)
        setSchemeDrawerNpcId(null)
        setScope('overview')
    }

    const enterSchemeWithNpc = (npc: NPC) => {
        if (schemeCount >= maxSchemes || usedNpcIds.has(npc.id)) return
        setSchemeDrawerNpcId(npc.id)
    }

    const handleHebaQiGlassPointerMove = (event: PointerEvent<HTMLElement>) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const x = ((event.clientX - rect.left) / rect.width) * 100
        const y = ((event.clientY - rect.top) / rect.height) * 100
        const clampedX = Math.max(0, Math.min(100, x))
        const clampedY = Math.max(0, Math.min(100, y))
        event.currentTarget.style.setProperty('--hebaqi-glass-x', `${clampedX}%`)
        event.currentTarget.style.setProperty('--hebaqi-glass-y', `${clampedY}%`)
        event.currentTarget.style.setProperty('--hebaqi-glass-angle', `${96 + clampedX * 0.72}deg`)
        event.currentTarget.style.setProperty('--hebaqi-glass-pull-x', `${(clampedX - 50) / 18}px`)
        event.currentTarget.style.setProperty('--hebaqi-glass-pull-y', `${(clampedY - 50) / 22}px`)
    }

    const handleHebaQiGlassPointerLeave = (event: PointerEvent<HTMLElement>) => {
        event.currentTarget.style.setProperty('--hebaqi-glass-x', '22%')
        event.currentTarget.style.setProperty('--hebaqi-glass-y', '14%')
        event.currentTarget.style.setProperty('--hebaqi-glass-angle', '118deg')
        event.currentTarget.style.setProperty('--hebaqi-glass-pull-x', '0px')
        event.currentTarget.style.setProperty('--hebaqi-glass-pull-y', '0px')
    }

    const handleTopBack = () => {
        if (schemeDrawerNpcId) {
            setSchemeDrawerNpcId(null)
            return
        }
        if (scope === 'overview' && !selectedNpc) {
            prevPhase()
            return
        }
        if (selectedNpc) {
            stopNpcDetailVoice()
            setSelectedNpcId(null)
            return
        }
        backToOverview()
    }

    const renderHud = (
        location: string,
        actionLabel?: string,
        onAction?: () => void,
        breadcrumbActionLabel?: string,
        onBreadcrumbAction?: () => void,
    ) => (
        <CourtTopBar
            backLabel="上一页"
            location={location}
            breadcrumbActionLabel={breadcrumbActionLabel}
            actionLabel={actionLabel}
            powerLabel={powerLabel}
            invasionRisk={invasionRisk}
            safetyRisk={safetyRisk}
            remainingSchemes={remainingSchemes}
            maxSchemes={maxSchemes}
            onBack={handleTopBack}
            onBreadcrumbAction={onBreadcrumbAction}
            onAction={onAction}
            onOpenGuide={() => openGameplayGuide('gameplay')}
        />
    )

    const renderSceneLayers = (variant: 'overview' | 'court' | 'external' | 'detail') => (
        <div className={`court-scene-layers court-scene-${variant}`} aria-hidden="true">
            <div className="court-art-layer court-art-background" />
            <div className="court-art-layer court-art-foreground" />
            <div className="court-art-layer court-art-atmosphere" />
            <div className="court-art-layer court-art-particles" />
        </div>
    )

    const renderPips = (value: number) => (
        <span className="court-pips" aria-label={`${getPipCount(value)}档`}>
            {Array.from({ length: 5 }, (_, index) => (
                <span key={index} className={`court-pip ${index < getPipCount(value) ? 'is-lit' : ''}`} />
            ))}
        </span>
    )

    const renderExternalMetrics = (npc: NPC) => {
        const metrics: Array<{ id: ExternalMetricId; label: string; value: number }> = [
            { id: 'military', label: '军力', value: npc.militaryPower },
            { id: 'loyalty', label: '忠诚度', value: npc.loyaltyToCourt },
            { id: 'trust', label: '信任度', value: npc.trust },
        ]

        return (
            <span className="external-seat-metrics" aria-label={`${npc.name}军力忠诚度信任度`}>
                {metrics.map(metric => (
                    <span
                        key={metric.id}
                        className={`external-metric-card external-metric-${metric.id}`}
                        aria-label={`${metric.label}${getPipCount(metric.value)}档`}
                    >
                        <span className="external-metric-head">
                            <span className={`external-metric-icon external-metric-icon-${metric.id}`} aria-hidden="true" />
                            <span className="external-metric-label">{metric.label}</span>
                        </span>
                        <span className="external-metric-pips">{renderPips(metric.value)}</span>
                    </span>
                ))}
            </span>
        )
    }

    const renderFactionStrength = (group: CourtFactionGroup) => {
        if (group.strengthValue === undefined) return null
        const roundedStrength = Math.round(group.strengthValue)

        return (
            <div
                className="court-faction-strength"
                tabIndex={0}
                aria-label={`${group.title}综合实力${roundedStrength}`}
            >
                <span className="court-strength-label">综合实力</span>
                <strong>{roundedStrength}</strong>
                {group.strengthParts && (
                    <div className="court-strength-popover" role="tooltip">
                        {group.strengthParts.map(part => (
                            <div key={part.label} className="court-strength-row">
                                <span className="court-strength-row-icon" aria-hidden="true" />
                                <span className="court-strength-row-label">{getCourtStrengthPartLabel(part.label)}</span>
                                <strong className="court-strength-row-value">{Math.round(part.value)}</strong>
                                {renderPips(part.value)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    const renderNpcSeatLabel = (npc: NPC) => {
        const titlePlaque = getNpcTitlePlaque(npc)
        if (!titlePlaque) {
            return (
                <span className="court-seat-label">
                    <span className="court-seat-name">{npc.name}</span>
                    <span className="court-seat-title">{getDisplayedNpcTitle(npc)}</span>
                </span>
            )
        }

        return (
            <span className="court-seat-label court-seat-floating-text">
                <span className="court-seat-name court-seat-name-text">{npc.name}</span>
                <span className="court-seat-title court-seat-title-text">{titlePlaque}</span>
            </span>
        )
    }

    const renderNpcIntel = (npc: NPC) => {
        const alreadyUsed = usedNpcIds.has(npc.id)
        const knownIntel = intelProgress[npc.id] ?? 0
        const courtFavor = getCourtFavor(npc)
        const leaderIdentity = getCourtLeaderIdentity(npc)

        return (
            <span className="court-seat-intel">
                <span className="court-seat-status">
                    {alreadyUsed ? '今日已落子' : `已知情报 ${getKnownIntelBudget(knownIntel)}/2`}
                </span>
                {leaderIdentity ? (
                    <span className={`court-seat-leader-lines court-seat-leader-lines-${leaderIdentity.emblem}`}>
                        {leaderIdentity.lines.map(line => <span key={line}>{line}</span>)}
                    </span>
                ) : (
                    <>
                        <span className="court-seat-pip-row">
                            <span>皇帝恩宠</span>
                            {renderPips(courtFavor.emperorFavor)}
                        </span>
                        <span className="court-seat-pip-row">
                            <span>太后眷顾</span>
                            {renderPips(courtFavor.empressDowagerFavor)}
                        </span>
                    </>
                )}
            </span>
        )
    }

    const renderNpcSeat = (npc: NPC, index = 0, showIntel = true) => {
        const selectable = npc.powerBase === 'external'
            ? isSelectableExternalNpc(npc)
            : isSelectableCourtNpc(npc)
        const alreadyUsed = usedNpcIds.has(npc.id)
        const knownIntel = intelProgress[npc.id] ?? 0
        const isAdvisorMentioned = highlightedNpcIds.has(npc.id)
        const reaction = getNpcRoundReaction(currentRound, npc, knownIntel, {
            shuCampaignState: shuCampaign.resolvedState ?? shuCampaign.state,
            huainanCampaignState: huainanCampaign.resolvedState ?? huainanCampaign.state,
        })
        const portraitVariant = npc.powerBase === 'external' ? 'externalFullbody' : 'courtFullbody'

        return (
            <button
                key={npc.id}
                className={`court-seat court-seat-index-${index} ${getNpcSeatLayoutClass(npc)} trust-${getTrustLevel(npc.trust)} ${!selectable ? 'is-disabled' : ''} ${alreadyUsed ? 'is-used' : ''} ${isAdvisorMentioned ? 'is-advisor-mentioned' : ''}`}
                onMouseEnter={() => playPublicStatementAudio(npc)}
                onMouseLeave={stopPublicStatementAudio}
                onFocus={() => playPublicStatementAudio(npc)}
                onBlur={stopPublicStatementAudio}
                onClick={() => {
                    selectable && selectNpcDetail(npc)
                }}
                disabled={!selectable}
            >
                <span className="court-seat-portrait-stack">
                    <NpcPortrait
                        name={npc.name}
                        className="court-seat-portrait court-seat-portrait-fullbody court-seat-portrait-dark"
                        positionY="50%"
                        zoom={1}
                        variant={portraitVariant}
                    />
                    <NpcPortrait
                        name={npc.name}
                        className="court-seat-portrait court-seat-portrait-fullbody court-seat-portrait-bright"
                        alt=""
                        positionY="50%"
                        zoom={1}
                        variant={portraitVariant}
                    />
                </span>
                {isAdvisorMentioned && (
                    <span
                        className="court-seat-advisor-mark"
                        aria-label="冯道之锦囊提及"
                        title="冯道之锦囊提及"
                    >
                        <span className="court-seat-advisor-spark" aria-hidden="true" />
                    </span>
                )}
                {renderNpcSeatLabel(npc)}
                {showIntel && renderNpcIntel(npc)}
                {npc.powerBase === 'external' && (
                    <span className="external-seat-inline-metrics">
                        {renderExternalMetrics(npc)}
                    </span>
                )}
                <span className="court-seat-reaction">{reaction}</span>
            </button>
        )
    }

    const renderFactionScreen = () => {
        const groups = scope === 'court' ? courtGroups : externalGroups
        const scopeTitle = scope === 'court' ? '朝堂势力' : '地方军头'
        const showCourtStageForeground = scope === 'court'
        const showExternalStageForeground = scope === 'external'

        return (
            <GameViewport
                className={`court-game-viewport court-game-screen court-faction-screen court-faction-screen-${scope}`}
                canvasClassName="court-design-canvas"
                bleed={renderSceneLayers(scope === 'court' ? 'court' : 'external')}
            >
                {renderHud(`朝堂总览 > ${scopeTitle}`)}
                <div className="court-scroll-grid">
                    {groups.map(group => (
                        <article key={group.id} className={`court-faction-scroll court-faction-scroll-${group.id}`}>
                            <div className="court-faction-scroll-head">
                                <div className="court-faction-heading">
                                    {group.emblemLabel && (
                                        <span className={`court-faction-emblem court-faction-emblem-${group.id}`} aria-hidden="true" />
                                    )}
                                    <div>
                                    <h3>{group.title}</h3>
                                    {group.summary && <p>{group.summary}</p>}
                                    </div>
                                </div>
                                {renderFactionStrength(group)}
                                {scope !== 'external' && !group.strengthParts && group.artLabel && <span className="court-faction-mark">{group.artLabel}</span>}
                            </div>
                            <div className="court-seat-rail">
                                {scope === 'court' ? (
                                    <>
                                        <div className="court-stage-actors">
                                            {group.members.map((member, index) => renderNpcSeat(member, index, false))}
                                        </div>
                                    </>
                                ) : scope === 'external' ? (
                                    <div className="court-stage-actors external-stage-actors">
                                        {group.members.map((member, index) => renderNpcSeat(member, index, false))}
                                    </div>
                                ) : (
                                    group.members.map((member, index) => renderNpcSeat(member, index))
                                )}
                            </div>
                            {scope !== 'external' && !group.strengthParts && <span className="court-faction-metric">{group.metricLabel}</span>}
                        </article>
                    ))}
                </div>
                {showCourtStageForeground && (
                    <>
                        <div className="court-faction-bottom-foreground" aria-hidden="true" />
                        <div className="court-faction-global-intel-track">
                            {courtGroups.map(group => (
                                <div key={`${group.id}-global-intel`} className={`court-faction-intel-group court-faction-intel-group-${group.id}`}>
                                    {group.members.map((member, index) => (
                                        <span
                                            key={`${member.id}-global-intel`}
                                            className={`court-stage-intel-slot court-stage-intel-slot-${index}`}
                                        >
                                            {renderNpcIntel(member)}
                                        </span>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </>
                )}
                {showExternalStageForeground && (
                    <>
                        <div className="external-faction-bottom-foreground" aria-hidden="true" />
                        <div className="external-faction-global-metric-track">
                            {externalGroups.map(group => (
                                <div key={`${group.id}-external-metrics`} className={`external-faction-metric-group external-faction-metric-group-${group.id}`}>
                                    {group.members.map((member, index) => (
                                        <span
                                            key={`${member.id}-external-metrics`}
                                            className={`external-stage-metric-slot external-stage-metric-slot-${index}`}
                                        >
                                            {renderExternalMetrics(member)}
                                        </span>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </GameViewport>
        )
    }

    const renderOverview = () => (
        <GameViewport
            className="court-game-viewport court-game-screen court-overview-screen"
            canvasClassName="court-design-canvas"
            bleed={renderSceneLayers('overview')}
        >
            {renderHud(formatRoundVolumeLabel(currentRound))}
            <div className="court-gate-grid">
                <button className="court-gate court-gate-court" onClick={() => goScope('court')}>
                    <span className="court-gate-visual" aria-hidden="true">
                        <span className="court-gate-art-mask">
                            <span className="court-gate-art" />
                        </span>
                        <span className="court-gate-frame" />
                    </span>
                    <span
                        className="court-gate-note"
                        role="img"
                        aria-label="总为浮云能蔽日，邺都不见使人愁"
                    />
                    <span className="court-gate-copy">
                        <strong>朝堂势力</strong>
                    </span>
                </button>
                <button className="court-gate court-gate-external" onClick={() => goScope('external')}>
                    <span className="court-gate-visual" aria-hidden="true">
                        <span className="court-gate-art-mask">
                            <span className="court-gate-art" />
                        </span>
                        <span className="court-gate-frame" />
                    </span>
                    <span
                        className="court-gate-note"
                        role="img"
                        aria-label="八百里分麾下炙，五十弦翻塞外声"
                    />
                    <span className="court-gate-copy">
                        <strong>地方军头</strong>
                    </span>
                </button>
            </div>
        </GameViewport>
    )

    const getFavorTone = (value: number) => {
        if (value >= 70) return 'is-favored'
        if (value >= 50) return 'is-neutral'
        return 'is-distant'
    }

    const getDetailFactionBadge = (npc: NPC) => {
        if (npc.factionId === 'emperor') {
            return { asset: COURT_FACTION_UI_ASSETS.emperorPartyEmblem, label: '帝党' }
        }
        if (npc.factionId === 'empress') {
            return { asset: COURT_FACTION_UI_ASSETS.empressPartyEmblem, label: '后党' }
        }
        if (npc.factionId === 'longxi') {
            return { asset: EXTERNAL_FACTION_UI_ASSETS.tigerEmblem, label: '陇右' }
        }
        if (npc.factionId === 'prairie') {
            return { asset: EXTERNAL_FACTION_UI_ASSETS.wolfEmblem, label: '草原' }
        }
        return null
    }

    const renderDetailMetricNode = (
        key: string,
        label: string,
        value: number | string,
        icon: string,
        title?: string,
    ) => (
        <div className="court-hebaqi-relation-node court-character-metric-node" title={title} data-metric-id={key}>
            <span className="court-character-metric-mark">
                <img src={icon} className="court-character-metric-icon" alt="" aria-hidden="true" />
                <span className="court-hebaqi-relation-label">{label}</span>
            </span>
            <strong className="court-hebaqi-trust-value court-character-metric-value court-character-number">{value}</strong>
        </div>
    )

    const renderCourtLeaderRelationStrip = (
        leaderMetric: 'emperorFavor' | 'empressDowagerFavor',
        npc: NPC,
    ) => {
        const metricIcon = leaderMetric === 'emperorFavor'
            ? COURT_FACTION_UI_ASSETS.imperialJadeSealBadge
            : COURT_FACTION_UI_ASSETS.phoenixCrownBadge
        const metricLabel = leaderMetric === 'emperorFavor' ? '皇帝恩宠' : '太后眷顾'
        const courtPeers = courtNpcs
            .filter(member => member.id !== 'hebaqi' && member.id !== 'hebaqí' && member.id !== 'zongai' && isSelectableCourtNpc(member))
            .slice(0, 4)

        return (
            <div className="court-hebaqi-relation-strip court-character-relation-strip court-character-relation-strip-leader">
                <div className="court-hebaqi-relation-node court-hebaqi-crown-node">
                    <img
                        src={metricIcon}
                        className="court-hebaqi-crown-icon"
                        alt=""
                        aria-hidden="true"
                    />
                    <span className="court-hebaqi-relation-label">{metricLabel}</span>
                </div>
                <div className="court-hebaqi-peer-row" aria-label={`朝臣受${metricLabel}程度`}>
                    {courtPeers.map(member => {
                        const memberFavor = getCourtFavor(member)[leaderMetric]
                        const memberFavorLabel = getFavorPressureLabel(leaderMetric, memberFavor)
                        const avatarPath = getNpcDetailAvatarPath(member.id)
                        return (
                            <span
                                key={member.id}
                                className={`court-hebaqi-peer ${getFavorTone(memberFavor)}`}
                                tabIndex={0}
                                aria-label={`${member.name} ${memberFavor} · ${memberFavorLabel}`}
                            >
                                <span className="court-hebaqi-peer-frame">
                                    {avatarPath ? (
                                        <img
                                            src={avatarPath}
                                            className="court-hebaqi-peer-portrait"
                                            alt=""
                                            aria-hidden="true"
                                        />
                                    ) : (
                                        <span className="court-hebaqi-peer-portrait court-hebaqi-peer-fallback" aria-hidden="true">
                                            {member.name.slice(0, 1)}
                                        </span>
                                    )}
                                </span>
                                <span className="court-hebaqi-peer-name">{member.name}</span>
                                <span className="court-hebaqi-peer-tip" role="tooltip">
                                    <span className="court-character-number">{memberFavor}</span>
                                    <span> · {memberFavorLabel}</span>
                                </span>
                            </span>
                        )
                    })}
                </div>
                <div className="court-hebaqi-relation-node court-hebaqi-trust-node">
                    <span className="court-hebaqi-trust-mark">
                        <img src={EXTERNAL_FACTION_UI_ASSETS.metricTrustIcon} className="court-character-metric-icon court-character-trust-icon" alt="" aria-hidden="true" />
                        <span className="court-hebaqi-relation-label">信任度</span>
                    </span>
                    <strong className="court-hebaqi-trust-value court-character-number">{npc.trust}</strong>
                </div>
            </div>
        )
    }

    const renderCourtMetricRelationStrip = (
        npc: NPC,
        courtFavor: ReturnType<typeof getCourtFavor>,
    ) => (
        <div className="court-hebaqi-relation-strip court-character-relation-strip court-character-relation-strip-metrics">
            {renderDetailMetricNode(
                'emperorFavor',
                '皇帝恩宠',
                courtFavor.emperorFavor,
                COURT_FACTION_UI_ASSETS.imperialJadeSealBadge,
                `${courtFavor.emperorFavor} · ${getFavorPressureLabel('emperorFavor', courtFavor.emperorFavor)}`,
            )}
            {renderDetailMetricNode(
                'empressDowagerFavor',
                '太后眷顾',
                courtFavor.empressDowagerFavor,
                COURT_FACTION_UI_ASSETS.phoenixCrownBadge,
                `${courtFavor.empressDowagerFavor} · ${getFavorPressureLabel('empressDowagerFavor', courtFavor.empressDowagerFavor)}`,
            )}
            {renderDetailMetricNode('trust', '信任度', npc.trust, EXTERNAL_FACTION_UI_ASSETS.metricTrustIcon)}
        </div>
    )

    const renderExternalMetricRelationStrip = (npc: NPC) => (
        <div className="court-hebaqi-relation-strip court-character-relation-strip court-character-relation-strip-metrics">
            {renderDetailMetricNode('military', '军力', npc.militaryPower, EXTERNAL_FACTION_UI_ASSETS.metricMilitaryIcon, getExternalMilitaryPostureLabel(npc.militaryPower))}
            {renderDetailMetricNode('loyalty', '忠诚度', npc.loyaltyToCourt, EXTERNAL_FACTION_UI_ASSETS.metricLoyaltyIcon, LOYALTY_TOOLTIP)}
            {renderDetailMetricNode('trust', '信任度', npc.trust, EXTERNAL_FACTION_UI_ASSETS.metricTrustIcon, TRUST_TOOLTIP)}
        </div>
    )

    const renderArtBackedNpcDetail = (
        npc: NPC,
        displayedTitle: string,
        roundReaction: string,
        knownThreads: string[],
        knownIntel: number,
        dispositionHint: ReturnType<typeof buildCourtDispositionHint> | null,
        progress: ReturnType<typeof buildExternalLineProgress> | null,
        canScheme: boolean,
        isComposing: boolean,
        backgroundPath: string,
        portraitPath: string,
    ) => {
        const assetKey = getNpcDetailAssetKey(npc.id) ?? 'unknown'
        const isExternal = npc.powerBase === 'external'
        const party = getDetailFactionBadge(npc)
        const courtFavor = !isExternal ? getCourtFavor(npc) : null
        const npcDetailStyle = {
            '--npc-detail-background': `url("${backgroundPath}")`,
            '--npc-detail-portrait': `url("${portraitPath}")`,
            '--hebaqi-detail-background': `url("${backgroundPath}")`,
            '--hebaqi-detail-portrait': `url("${portraitPath}")`,
        } as CSSProperties
        const fengDaozhiNote = getFengDaozhiAdvisorNote(npc.id)
            ?? (isExternal && progress ? buildExternalWhisper(npc, progress, knownIntel) : buildFallbackFengDaozhiAdvisorNote(npc, dispositionHint))
        const displayedTitleWithRole = npc.id === 'zongai'
            ? `${displayedTitle}【代言皇帝】`
            : (npc.id === 'hebaqi' || npc.id === 'hebaqí')
                ? `${displayedTitle}【后党魁首】`
                : displayedTitle
        const relationStrip = !isExternal && (npc.id === 'hebaqi' || npc.id === 'hebaqí')
            ? renderCourtLeaderRelationStrip('empressDowagerFavor', npc)
            : !isExternal && npc.id === 'zongai'
                ? renderCourtLeaderRelationStrip('emperorFavor', npc)
            : isExternal && party
                    ? renderExternalMetricRelationStrip(npc)
                    : courtFavor && party
                        ? renderCourtMetricRelationStrip(npc, courtFavor)
                        : null

        return (
            <GameViewport
                className={`court-game-viewport court-game-screen court-detail-screen court-character-detail-screen court-hebaqi-detail-screen court-character-detail-${assetKey} ${isComposing ? 'court-hebaqi-detail-composing' : ''}`}
                canvasClassName="court-design-canvas court-detail-design-canvas"
                bleed={(
                    <>
                        <div className="court-character-scene-art court-hebaqi-scene-art" />
                        <div className="court-hebaqi-scene-vignette" />
                    </>
                )}
                style={npcDetailStyle}
            >
                <svg className="court-hebaqi-glass-filter" aria-hidden="true" focusable="false">
                    <defs>
                        <filter id="court-hebaqi-panel-liquid-filter" x="-8%" y="-8%" width="116%" height="116%" colorInterpolationFilters="sRGB">
                            <feTurbulence type="fractalNoise" baseFrequency="0.009 0.018" numOctaves="2" seed="37" result="liquidNoise" />
                            <feDisplacementMap in="SourceGraphic" in2="liquidNoise" scale="5" xChannelSelector="R" yChannelSelector="G" result="liquidWarp" />
                            <feColorMatrix
                                in="liquidWarp"
                                type="matrix"
                                values="1 0 0 0 0
                                        0 0.96 0 0 0
                                        0 0 1.08 0 0
                                        0 0 0 0.72 0"
                                result="liquidTint"
                            />
                            <feGaussianBlur in="liquidTint" stdDeviation="0.15" />
                        </filter>
                        <filter id="court-hebaqi-panel-edge-filter" x="-18%" y="-18%" width="136%" height="136%" colorInterpolationFilters="sRGB">
                            <feTurbulence type="fractalNoise" baseFrequency="0.018 0.032" numOctaves="2" seed="91" result="edgeNoise" />
                            <feDisplacementMap in="SourceGraphic" in2="edgeNoise" scale="9" xChannelSelector="R" yChannelSelector="G" result="edgeWarp" />
                            <feOffset in="edgeWarp" dx="1.4" dy="0" result="rgbRed" />
                            <feColorMatrix
                                in="rgbRed"
                                type="matrix"
                                values="1 0 0 0 0
                                        0 0 0 0 0
                                        0 0 0 0 0
                                        0 0 0 0.62 0"
                                result="redChannel"
                            />
                            <feColorMatrix
                                in="edgeWarp"
                                type="matrix"
                                values="0 0 0 0 0
                                        0 1 0 0 0
                                        0 0 0 0 0
                                        0 0 0 0.55 0"
                                result="greenChannel"
                            />
                            <feOffset in="edgeWarp" dx="-1.2" dy="0.6" result="rgbBlue" />
                            <feColorMatrix
                                in="rgbBlue"
                                type="matrix"
                                values="0 0 0 0 0
                                        0 0 0 0 0
                                        0 0 1 0 0
                                        0 0 0 0.58 0"
                                result="blueChannel"
                            />
                            <feBlend in="redChannel" in2="greenChannel" mode="screen" result="rgbWarm" />
                            <feBlend in="rgbWarm" in2="blueChannel" mode="screen" />
                        </filter>
                    </defs>
                </svg>
                {renderHud(
                    `${isExternal ? '地方军头' : '朝堂势力'} > ${npc.name}`,
                    undefined,
                    undefined,
                    isComposing ? '更换目标' : undefined,
                    isComposing
                        ? () => {
                            setSchemeDrawerNpcId(null)
                            setSelectedNpcId(null)
                            setScope(isExternal ? 'external' : 'court')
                        }
                        : undefined,
                )}
                <div className="court-character-portrait-stage court-hebaqi-portrait-stage" aria-hidden="true">
                    <img src={portraitPath} className="court-character-portrait court-hebaqi-portrait" alt="" />
                    <span className="court-hebaqi-portrait-haze" />
                </div>
                <article
                    className={`court-character-panel court-hebaqi-panel ${isComposing ? 'court-hebaqi-panel-composer' : ''}`}
                    style={hebaQiGlassBaseStyle}
                    onPointerMove={handleHebaQiGlassPointerMove}
                    onPointerLeave={handleHebaQiGlassPointerLeave}
                >
                    <span className="court-hebaqi-glass-warp" aria-hidden="true" />
                    <span className="court-hebaqi-glass-edge" aria-hidden="true" />
                    <span className="court-hebaqi-glass-specular" aria-hidden="true" />
                    <header className="court-character-panel-head court-hebaqi-panel-head">
                        <div>
                            <span className="court-hebaqi-kicker">{displayedTitleWithRole}</span>
                            <h3>{npc.name}</h3>
                        </div>
                    </header>
                    {party ? (
                        <img
                            src={party.asset}
                            className="court-character-party-emblem court-hebaqi-party-emblem"
                            alt=""
                            aria-hidden="true"
                        />
                    ) : null}

                    {isComposing ? (
                        <div className="court-hebaqi-composer-shell">
                            <SchemeComposer
                                mode="embedded"
                                lockedNpcId={npc.id}
                                initialSchemeType={previewScheme?.targetNpcId === npc.id ? previewScheme.schemeType : undefined}
                                onAfterSubmit={handleEmbeddedSchemeAfterSubmit}
                            />
                        </div>
                    ) : (
                        <>
                            {relationStrip}

                            <section className="court-hebaqi-statement">
                                <h4>公开表态</h4>
                                <p>{roundReaction}</p>
                            </section>

                            <div className="court-hebaqi-info-grid">
                                <section className="court-hebaqi-note">
                                    <h4>冯道之旁批</h4>
                                    <p>{fengDaozhiNote}</p>
                                </section>
                                <section className="court-hebaqi-intel">
                                    <div className="court-hebaqi-section-head">
                                        <h4>已知情报</h4>
                                        <strong className="court-hebaqi-intel-count court-character-number">{knownThreads.length}/2</strong>
                                    </div>
                                    {knownThreads.length > 0 ? (
                                        <ul>
                                            {knownThreads.map((thread, index) => (
                                                <li key={`${npc.id}-detail-thread-${index}`}>{thread}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p>暗线未明，仍需试探。</p>
                                    )}
                                </section>
                            </div>

                            <button
                                className="btn-primary court-hebaqi-scheme-button"
                                onClick={() => enterSchemeWithNpc(npc)}
                                disabled={!canScheme}
                            >
                                {usedNpcIds.has(npc.id) ? '今日已落子' : remainingSchemes <= 0 ? '今日无子' : '对其施计'}
                            </button>
                        </>
                    )}
                </article>
            </GameViewport>
        )
    }

    const renderNpcDetail = (npc: NPC) => {
        const knownIntel = intelProgress[npc.id] ?? 0
        const displayedTitle = getDisplayedNpcTitle(npc)
        const roundReaction = getNpcRoundReaction(currentRound, npc, knownIntel, {
            shuCampaignState: shuCampaign.resolvedState ?? shuCampaign.state,
            huainanCampaignState: huainanCampaign.resolvedState ?? huainanCampaign.state,
        })
        const knownThreads = npc.secretThreads.slice(0, Math.min(knownIntel, 2))
        const isExternal = npc.powerBase === 'external'
        const progress = isExternal ? externalProgressMap[npc.id] : null
        const courtFavor = !isExternal ? getCourtFavor(npc) : null
        const dispositionHint = !isExternal ? buildCourtDispositionHint(npc) : null
        const canScheme = remainingSchemes > 0 && !usedNpcIds.has(npc.id)
        const isComposing = schemeDrawerNpcId === npc.id
        const detailBackgroundPath = getNpcDetailBackgroundPath(npc.id)
        const detailPortraitPath = getNpcDetailPortraitPath(npc.id, npc.trust)

        if (detailBackgroundPath && detailPortraitPath) {
            return renderArtBackedNpcDetail(
                npc,
                displayedTitle,
                roundReaction,
                knownThreads,
                knownIntel,
                dispositionHint,
                progress,
                canScheme,
                isComposing,
                detailBackgroundPath,
                detailPortraitPath,
            )
        }

        return (
            <GameViewport
                className={`court-game-viewport court-game-screen court-detail-screen ${isExternal ? 'court-detail-external' : 'court-detail-court'}`}
                canvasClassName="court-design-canvas court-detail-design-canvas"
                bleed={renderSceneLayers('detail')}
            >
                {renderHud(
                    `${isExternal ? '地方军头' : '朝堂势力'} > ${npc.name}`,
                    isExternal ? '返回地方' : '返回势力',
                    () => {
                        setSchemeDrawerNpcId(null)
                        setSelectedNpcId(null)
                        setScope(isExternal ? 'external' : 'court')
                    },
                    isComposing ? '更换目标' : undefined,
                    isComposing
                        ? () => {
                            setSchemeDrawerNpcId(null)
                            setSelectedNpcId(null)
                            setScope(isExternal ? 'external' : 'court')
                        }
                        : undefined,
                )}
                <div className="court-character-stand">
                    <NpcPortrait name={npc.name} className="court-detail-portrait" positionY="12%" zoom={1.04} />
                    <span>{npc.name}</span>
                </div>
                <article className={`court-dossier ${isComposing ? 'court-dossier-composer' : ''}`}>
                    {isComposing ? (
                        <SchemeComposer
                            mode="embedded"
                            lockedNpcId={npc.id}
                            initialSchemeType={previewScheme?.targetNpcId === npc.id ? previewScheme.schemeType : undefined}
                            onAfterSubmit={handleEmbeddedSchemeAfterSubmit}
                        />
                    ) : (
                        <>
                            <div className="court-dossier-head">
                                <div>
                                    <h3>{npc.name}</h3>
                                    <p>{displayedTitle}</p>
                                </div>
                                <div className="court-dossier-actions">
                                    <button className="court-small-link" onClick={() => selectNpcDetail(npc, { openOverlayDetail: true })}>完整档案</button>
                                    <button className="btn-primary court-seal-action court-dossier-scheme" onClick={() => enterSchemeWithNpc(npc)} disabled={!canScheme}>
                                        {usedNpcIds.has(npc.id) ? '今日已落子' : remainingSchemes <= 0 ? '今日无子' : '对其施计'}
                                    </button>
                                </div>
                            </div>
                            <div className="court-dossier-grid">
                                <section>
                                    <h4>本回合公开表态</h4>
                                    <p>{roundReaction}</p>
                                </section>
                                <section>
                                    <h4>可撬动点</h4>
                                    <p>{npc.softSpot}；{npc.triggerPoint}</p>
                                </section>
                                <section>
                                    <h4>{isExternal ? '边镇态势' : '御前牵制'}</h4>
                                    {isExternal ? (
                                        <p>
                                            军力 {npc.militaryPower} · {getExternalMilitaryPostureLabel(npc.militaryPower)}
                                            {' / '}
                                            忠诚 {npc.loyaltyToCourt}
                                            {' / '}
                                            {getExternalTiltLabel(npc.alignmentBias)}
                                        </p>
                                    ) : courtFavor ? (
                                        <p>
                                            皇帝恩宠 {courtFavor.emperorFavor} · {getFavorPressureLabel('emperorFavor', courtFavor.emperorFavor)}
                                            {' / '}
                                            太后眷顾 {courtFavor.empressDowagerFavor} · {getFavorPressureLabel('empressDowagerFavor', courtFavor.empressDowagerFavor)}
                                        </p>
                                    ) : null}
                                </section>
                                <section>
                                    <h4>已知情报</h4>
                                    {knownThreads.length > 0 ? (
                                        <ul>
                                            {knownThreads.map((thread, index) => (
                                                <li key={`${npc.id}-thread-${index}`}>{thread}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p>暗线未明，仍需试探。</p>
                                    )}
                                </section>
                                <section className="court-dossier-wide">
                                    <h4>冯道之密札</h4>
                                    <p>
                                        {isExternal && progress
                                            ? buildExternalWhisper(npc, progress, knownIntel)
                                            : dispositionHint?.shortText ?? '先看他今日表态，再挑一处最怕被人看见的心结。'}
                                    </p>
                                </section>
                            </div>
                        </>
                    )}
                </article>
            </GameViewport>
        )
    }

    return (
        <div className="page-container court-view court-view-game page-enter">
            {currentRound === 1 && !firstRoundGuideSeen.court_observe && (
                <FirstRoundGuideModal
                    title={FIRST_ROUND_GUIDE_CONTENT.court_observe.title}
                    body={FIRST_ROUND_GUIDE_CONTENT.court_observe.body}
                    onClose={() => markFirstRoundGuideSeen('court_observe')}
                />
            )}

            {selectedNpc ? renderNpcDetail(selectedNpc) : scope === 'overview' ? renderOverview() : renderFactionScreen()}
        </div>
    )
}

export function LegacyCourtView() {
    const {
        currentRound,
        difficulty,
        nextPhase,
        northPower,
        schemeCount,
        maxSchemes,
        npcs,
        factions,
        intelProgress,
        prevPhase,
        firstRoundGuideSeen,
        markFirstRoundGuideSeen,
        openGameplayGuide,
        shuCampaign,
        huainanCampaign,
    } = useGameStore()
    const { openNpcDetail } = useUiStore()

    const powerLabel = getPowerLabel(northPower)
    const courtNpcs = npcs.filter(npc => npc.powerBase === 'court')
    const externalNpcs = npcs.filter(npc => npc.powerBase === 'external' && npc.isAlive)
    const emperorMembers = courtNpcs.filter(npc => npc.factionId === 'emperor')
    const empressMembers = courtNpcs.filter(npc => npc.factionId === 'empress')
    const longxiMembers = externalNpcs.filter(npc => npc.factionId === 'longxi')
    const prairieMembers = externalNpcs.filter(npc => npc.factionId === 'prairie')
    const externalProgressMap = Object.fromEntries(
        externalNpcs.map(npc => [
            npc.id,
            buildExternalLineProgress({
                npc,
                unlockedSecrets: intelProgress[npc.id] ?? 0,
                difficulty,
                round: currentRound,
                externalActionEnabled: roundSupportsExternalAction(
                    currentRound,
                    npc.highActionBias === 'rebellion' ? 'rebellion' : 'secession',
                ),
            }),
        ]),
    )
    const { emperorInfluence, empressInfluence, ratio: warRatio } = getCourtBalance(factions, npcs, currentRound)

    const invasionRisk =
        warRatio >= 1.2
            ? { label: '箭在弦上', className: 'risk-critical' }
            : warRatio >= 0.8
                ? { label: '朝议煎沸', className: 'risk-warning' }
                : { label: '偏安之局', className: 'risk-safe' }

    const dangerNpcs = npcs.filter(
        npc =>
            npc.canExecute &&
            npc.powerBase === 'court' &&
            npc.trust <= 25 &&
            (factions.find(faction => faction.id === npc.factionId)?.courtInfluence ?? 0) >= 55,
    )

    const safetyRisk =
        dangerNpcs.some(npc => npc.trust <= 15)
            ? { label: '祸生肘腋', className: 'risk-critical' }
            : dangerNpcs.length > 0
                ? { label: '风闻渐起', className: 'risk-warning' }
                : { label: '尚可斡旋', className: 'risk-safe' }

    return (
        <div className="page-container court-view page-enter">
            {currentRound === 1 && !firstRoundGuideSeen.court_observe && (
                <FirstRoundGuideModal
                    title={FIRST_ROUND_GUIDE_CONTENT.court_observe.title}
                    body={FIRST_ROUND_GUIDE_CONTENT.court_observe.body}
                    onClose={() => markFirstRoundGuideSeen('court_observe')}
                />
            )}

            <div className="page-utility-row utility-split animate-slide-up">
                <button className="btn-utility-secondary" onClick={prevPhase}>
                    上一页
                </button>
                <PageUtilityActions onOpenGuide={() => openGameplayGuide('gameplay')} />
            </div>

            <div className="court-header animate-slide-up">
                <h2 className="page-title">朝堂局势</h2>

                <div className="glass-panel status-bar">
                    <div className="status-item">
                        <span className="status-label">北周国力</span>
                        <span className={`status-value power-level-${powerLabel}`}>{powerLabel}</span>
                    </div>
                    <div className="status-item">
                        <span className="status-label">
                            南征风向
                            <span
                                className="status-help status-help-seal"
                                title={WAR_TREND_TOOLTIP}
                                aria-label={WAR_TREND_TOOLTIP}
                            >
                                ?
                            </span>
                        </span>
                        <span className={`status-value ${invasionRisk.className}`}>{invasionRisk.label}</span>
                    </div>
                    <div className="status-item">
                        <span className="status-label">
                            自身安危
                            <span
                                className="status-help status-help-seal"
                                title={SAFETY_RISK_TOOLTIP}
                                aria-label={SAFETY_RISK_TOOLTIP}
                            >
                                ?
                            </span>
                        </span>
                        <span className={`status-value ${safetyRisk.className}`}>{safetyRisk.label}</span>
                    </div>
                </div>
            </div>

            <div className="court-main-grid animate-slide-up animate-delay-2">
                <section className="court-column">
                    <div className="section-heading-wrap">
                        <h3 className="section-heading">朝堂势力</h3>
                    </div>

                    {[
                        {
                            id: 'emperor' as const,
                            influence: emperorInfluence,
                            faction: factions.find(faction => faction.id === 'emperor'),
                            members: emperorMembers,
                        },
                        {
                            id: 'empress' as const,
                            influence: empressInfluence,
                            faction: factions.find(faction => faction.id === 'empress'),
                            members: empressMembers,
                        },
                    ].map(group => {
                        const doctrine = getFactionDoctrine(group.id)
                        return (
                            <div key={group.id} className={`gold-panel faction-block faction-${group.id}`}>
                                <div className="faction-summary-card">
                                    <div className="faction-card-header">
                                        <div>
                                            <span className="faction-name">{doctrine.title}</span>
                                            <p className="faction-doctrine">{doctrine.summary}</p>
                                        </div>
                                        <span className="faction-value">综合实力 {group.influence.toFixed(1)}</span>
                                    </div>
                                    <div className="faction-bar">
                                        <div
                                            className="faction-fill"
                                            style={{ width: `${Math.max(12, Math.min(100, group.influence))}%` }}
                                        />
                                    </div>
                                    <div className="faction-metrics">
                                        <span>
                                            朝堂影响 {group.faction?.courtInfluence ?? 0}
                                            {' · '}
                                            {getFactionConditionLabel('courtInfluence', group.faction?.courtInfluence ?? 0)}
                                        </span>
                                        <span>
                                            军事实力 {group.faction?.militaryPower ?? 0}
                                            {' · '}
                                            {getFactionConditionLabel('militaryPower', group.faction?.militaryPower ?? 0)}
                                        </span>
                                        <span>
                                            内部稳定 {group.faction?.internalStability ?? 0}
                                            {' · '}
                                            {getFactionConditionLabel('internalStability', group.faction?.internalStability ?? 0)}
                                        </span>
                                    </div>
                                </div>

                                <div className="npc-grid">
                                    {group.members.map((npc, index) => {
                                        const displayedTitle = getDisplayedNpcTitle(npc)
                                        const knownIntel = intelProgress[npc.id] ?? 0
                                        const courtStatus = getCourtStatus(npc)
                                        const isTerminalCourt = isCourtDispositionTarget(npc) && getCourtStatus(npc) !== 'active'
                                        const courtFavor = getCourtFavor(npc)
                                        const opportunity = getCourtDispositionOpportunity(npc)
                                        const dispositionHint = buildCourtDispositionHint(npc)
                                        return (
                                            <button
                                                key={npc.id}
                                                className={`npc-card trust-${getTrustLevel(npc.trust)} animate-slide-up ${(!npc.isAlive || isTerminalCourt) ? 'dead court-terminal' : ''}`}
                                                style={{ animationDelay: `${0.12 + index * 0.04}s` }}
                                                onClick={() => openNpcDetail(npc.id)}
                                                disabled={!npc.isAlive || isTerminalCourt}
                                            >
                                                <NpcPortrait
                                                    name={npc.name}
                                                    className="npc-card-portrait"
                                                    positionY="14%"
                                                    zoom={1.1}
                                                />
                                                <div className="npc-card-main">
                                                    <div className="npc-card-head">
                                                        <div className="npc-head-copy">
                                                            <span className="npc-name">{npc.name}</span>
                                                            <span className="npc-title">{displayedTitle}</span>
                                                        </div>
                                                        <div className="npc-attitude">
                                                            <div className="npc-trust-badge">{getTrustLabel(npc.trust)}</div>
                                                        </div>
                                                    </div>
                                                    <div className="npc-meta-row">
                                                        <span className="npc-meta-chip">{group.faction?.name}</span>
                                                        <span className="npc-meta-chip">
                                                            已知情报 {getKnownIntelBudget(knownIntel)}/2
                                                        </span>
                                                    </div>
                                                    {isCourtDispositionTarget(npc) && courtStatus === 'active' && (
                                                        <>
                                                            <div className="npc-favor-row">
                                                                <span className="npc-meta-chip npc-favor-chip">
                                                                    皇帝恩宠 {courtFavor.emperorFavor} · {getFavorPressureLabel('emperorFavor', courtFavor.emperorFavor)}
                                                                </span>
                                                                <span className="npc-meta-chip npc-favor-chip">
                                                                    太后眷顾 {courtFavor.empressDowagerFavor} · {getFavorPressureLabel('empressDowagerFavor', courtFavor.empressDowagerFavor)}
                                                                </span>
                                                                {opportunity === 'dismissible' && (
                                                                    <span className="npc-meta-chip npc-meta-chip-warning">可罢黜</span>
                                                                )}
                                                                {opportunity === 'executable' && (
                                                                    <span className="npc-meta-chip npc-meta-chip-danger">可处决</span>
                                                                )}
                                                            </div>
                                                            {dispositionHint && (
                                                                <div className={`npc-court-disposition-hint npc-court-disposition-hint--${dispositionHint.tone}`}>
                                                                    冯道之旁批：{dispositionHint.shortText}
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                    {npc.isAlive && courtStatus === 'active' && (
                                                        <span className="npc-reaction">
                                                            {getNpcRoundReaction(currentRound, npc, knownIntel, {
                                                                shuCampaignState: shuCampaign.resolvedState ?? shuCampaign.state,
                                                                huainanCampaignState: huainanCampaign.resolvedState ?? huainanCampaign.state,
                                                            })}
                                                        </span>
                                                    )}
                                                </div>
                                                {isTerminalCourt && (
                                                    <div className="npc-dead-overlay npc-court-status-overlay">
                                                        {getCourtStatusLabel(courtStatus)}
                                                    </div>
                                                )}
                                                {!isTerminalCourt && !npc.isAlive && <div className="npc-dead-overlay">已死</div>}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </section>

                <section className="court-column">
                    <div className="section-heading-wrap">
                        <h3 className="section-heading">地方军头</h3>
                    </div>

                    {[
                        {
                            id: 'longxi',
                            members: longxiMembers,
                        },
                        {
                            id: 'prairie',
                            members: prairieMembers,
                        },
                    ].map(group => {
                        const doctrine = getExternalBlocDoctrine(group.id as 'longxi' | 'prairie')
                        return (
                        <div key={group.id} className={`gold-panel faction-block faction-${group.id} external-block`}>
                            <div className="faction-summary-card faction-summary-card-external">
                                <div className="faction-card-header">
                                    <div>
                                        <span className="faction-name">{doctrine.title}</span>
                                        <p className="faction-doctrine">{doctrine.summary}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="external-grid">
                                {group.members.map((npc, index) => {
                                    const progress = externalProgressMap[npc.id]
                                    const unlockedSecrets = intelProgress[npc.id] ?? 0
                                    const displayedTitle = getDisplayedNpcTitle(npc)
                                    const isTerminal = isTerminalExternalNpc(npc)
                                    return (
                                        <button
                                            key={npc.id}
                                            className={`external-card animate-slide-up ${isTerminal ? 'dead' : ''}`}
                                            style={{ animationDelay: `${0.14 + index * 0.05}s` }}
                                            onClick={() => openNpcDetail(npc.id)}
                                            disabled={isTerminal}
                                        >
                                            <NpcPortrait
                                                name={npc.name}
                                                className="external-card-portrait"
                                                positionY="14%"
                                                zoom={1.08}
                                            />
                                            <div className="external-main">
                                                <div className="external-card-header">
                                                    <div className="external-name">{npc.name}</div>
                                                    <div className="external-title npc-title">{displayedTitle}</div>
                                                </div>
                                                <div className="external-kpi-row">
                                                    <div
                                                        className="external-kpi external-kpi-explained"
                                                        title={MILITARY_TOOLTIP}
                                                        aria-label={MILITARY_TOOLTIP}
                                                    >
                                                        <span className="external-kpi-label">军力</span>
                                                        <strong className="external-kpi-value">
                                                            {npc.militaryPower} · {getExternalMilitaryPostureLabel(npc.militaryPower)}
                                                        </strong>
                                                    </div>
                                                    <div
                                                        className="external-kpi external-kpi-explained"
                                                        title={LOYALTY_TOOLTIP}
                                                        aria-label={LOYALTY_TOOLTIP}
                                                    >
                                                        <span className="external-kpi-label">忠诚度（对朝廷）</span>
                                                        <strong className="external-kpi-value">{npc.loyaltyToCourt}</strong>
                                                    </div>
                                                    <div
                                                        className="external-kpi external-kpi-explained"
                                                        title={TRUST_TOOLTIP}
                                                        aria-label={TRUST_TOOLTIP}
                                                    >
                                                        <span className="external-kpi-label">信任度（对主角）</span>
                                                        <strong className="external-kpi-value">{npc.trust}</strong>
                                                    </div>
                                                </div>
                                                <div className="external-stats">
                                                    <span>{getExternalTiltLabel(npc.alignmentBias)}</span>
                                                    <span>{getExternalPostureLabel(npc)}</span>
                                                </div>
                                                {!isTerminal && (
                                                    <span className="npc-reaction external-reaction">
                                                        {getNpcRoundReaction(currentRound, npc, intelProgress[npc.id] ?? 0, {
                                                            shuCampaignState: shuCampaign.resolvedState ?? shuCampaign.state,
                                                            huainanCampaignState: huainanCampaign.resolvedState ?? huainanCampaign.state,
                                                        })}
                                                    </span>
                                                )}
                                                {!isTerminal && progress && (
                                                    <span className="npc-reaction external-reaction external-progress-copy">
                                                        {buildExternalWhisper(npc, progress, unlockedSecrets)}
                                                    </span>
                                                )}
                                            </div>
                                            {isTerminal && (
                                                <div className="npc-dead-overlay">{getExternalTerminalLabel(npc.externalStatus)}</div>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )})}
                </section>
            </div>

            <div className="action-footer animate-slide-up animate-delay-4">
                <div className="scheme-counter">
                    今日可用计谋：<span className="highlight-number">{maxSchemes - schemeCount}</span>/<span className="highlight-number">{maxSchemes}</span>
                </div>
                <button className="btn-primary" onClick={nextPhase} disabled={schemeCount >= maxSchemes}>
                    {schemeCount >= maxSchemes ? '今日已无可落之子' : '看定人选，去落子'}
                </button>
            </div>
        </div>
    )
}
