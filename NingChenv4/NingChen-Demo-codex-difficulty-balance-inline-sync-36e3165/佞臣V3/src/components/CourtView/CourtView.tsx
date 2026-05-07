import { useGameStore } from '../../stores/gameStore'
import { useState } from 'react'
import { useUiStore } from '../../stores/uiStore'
import { FIRST_ROUND_GUIDE_CONTENT } from '../../data/prologueContent'
import { getPowerLabel, getTrustLabel, getTrustLevel, type NPC } from '../../game/types'
import { getCourtBalance } from '../../game/nationEngine'
import { getExternalTerminalLabel, isTerminalExternalNpc } from '../../game/externalStatus'
import { getNpcRoundReaction } from '../../game/roundIntelEngine'
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
import { FirstRoundGuideModal } from '../FirstRoundGuide/FirstRoundGuideModal'
import { NpcPortrait } from '../NpcPortrait/NpcPortrait'
import { PageUtilityActions } from '../PageUtilityActions/PageUtilityActions'
import { SchemeComposer } from '../SchemePanel/SchemePanel'
import { GameHudTools, HudStatusChip } from '../GameHud/GameHud'
import './CourtView.css'

function getFactionDoctrine(factionId: 'emperor' | 'empress') {
    if (factionId === 'emperor') {
        return {
            title: '帝党：力主南征',
            summary: '帝党觉得，通过南征重塑皇室威严，统一全国军事调度，是小皇帝收权的必经之路。',
        }
    }

    return {
        title: '后党：优先安内',
        summary: '后党认为，先稳摄政秩序、中枢调度与地方控制，再谈大举南征，才不至于把全局推向失控。',
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

type CourtScope = 'overview' | 'court' | 'external'
type CourtFactionGroup = {
    id: 'emperor' | 'empress' | 'longxi' | 'prairie'
    title: string
    summary: string
    artLabel: string
    metricLabel: string
    members: NPC[]
}

function isActiveCourtNpc(npc: NPC): boolean {
    return npc.isAlive && getCourtStatus(npc) === 'active'
}

function isSelectableCourtNpc(npc: NPC): boolean {
    return isActiveCourtNpc(npc) && !(isCourtDispositionTarget(npc) && getCourtStatus(npc) !== 'active')
}

function isSelectableExternalNpc(npc: NPC): boolean {
    return npc.isAlive && !isTerminalExternalNpc(npc)
}

interface CourtTopBarProps {
    backLabel: string
    location: string
    actionLabel?: string
    powerLabel: string
    invasionRisk: { label: string; className: string }
    safetyRisk: { label: string; className: string }
    remainingSchemes: number
    maxSchemes: number
    onBack: () => void
    onAction?: () => void
    onOpenGuide: () => void
}

function CourtTopBar({
    backLabel,
    location,
    actionLabel,
    powerLabel,
    invasionRisk,
    safetyRisk,
    remainingSchemes,
    maxSchemes,
    onBack,
    onAction,
    onOpenGuide,
}: CourtTopBarProps) {
    return (
        <div className="court-top-bar">
            <button className="court-top-button court-back-button" onClick={onBack}>{backLabel}</button>
            <span className="court-screen-hud-title">{location}</span>
            <div className="court-screen-hud-state">
                <HudStatusChip label="国力" value={powerLabel} valueClassName={`power-level-${powerLabel}`} />
                <HudStatusChip label="南征" value={invasionRisk.label} valueClassName={invasionRisk.className} title={WAR_TREND_TOOLTIP} />
                <HudStatusChip label="安危" value={safetyRisk.label} valueClassName={safetyRisk.className} title={SAFETY_RISK_TOOLTIP} />
                <HudStatusChip label="计谋" value={`${remainingSchemes}/${maxSchemes}`} />
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

export function CourtView() {
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
    const [scope, setScope] = useState<CourtScope>('overview')
    const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null)
    const [schemeDrawerNpcId, setSchemeDrawerNpcId] = useState<string | null>(null)

    const powerLabel = getPowerLabel(northPower)
    const courtNpcs = npcs.filter(npc => npc.powerBase === 'court')
    const externalNpcs = npcs.filter(npc => npc.powerBase === 'external' && npc.isAlive)
    const emperorMembers = courtNpcs.filter(npc => npc.factionId === 'emperor')
    const empressMembers = courtNpcs.filter(npc => npc.factionId === 'empress')
    const longxiMembers = externalNpcs.filter(npc => npc.factionId === 'longxi')
    const prairieMembers = externalNpcs.filter(npc => npc.factionId === 'prairie')
    const usedNpcIds = new Set(currentSchemes.map(scheme => scheme.targetNpcId))
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
            artLabel: '军令 / 殿柱',
            metricLabel: `综合实力 ${emperorInfluence.toFixed(1)}`,
            members: emperorMembers,
        },
        {
            id: 'empress',
            ...getFactionDoctrine('empress'),
            artLabel: '帘幕 / 朱批',
            metricLabel: `综合实力 ${empressInfluence.toFixed(1)}`,
            members: empressMembers,
        },
    ]

    const externalGroups: CourtFactionGroup[] = [
        {
            id: 'longxi',
            ...getExternalBlocDoctrine('longxi'),
            artLabel: '边关 / 甲胄',
            metricLabel: `在场军头 ${longxiMembers.length}`,
            members: longxiMembers,
        },
        {
            id: 'prairie',
            ...getExternalBlocDoctrine('prairie'),
            artLabel: '帐幕 / 雪原',
            metricLabel: `在场军头 ${prairieMembers.length}`,
            members: prairieMembers,
        },
    ]

    const remainingSchemes = Math.max(0, maxSchemes - schemeCount)

    const goScope = (nextScope: Exclude<CourtScope, 'overview'>) => {
        setSelectedNpcId(null)
        setSchemeDrawerNpcId(null)
        setScope(nextScope)
    }

    const backToOverview = () => {
        setSelectedNpcId(null)
        setSchemeDrawerNpcId(null)
        setScope('overview')
    }

    const enterSchemeWithNpc = (npc: NPC) => {
        if (schemeCount >= maxSchemes || usedNpcIds.has(npc.id)) return
        setSchemeDrawerNpcId(npc.id)
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
            setSelectedNpcId(null)
            return
        }
        backToOverview()
    }

    const renderHud = (location: string, actionLabel?: string, onAction?: () => void) => (
        <CourtTopBar
            backLabel={schemeDrawerNpcId ? '返回案卷' : scope === 'overview' && !selectedNpc ? '上一页' : '返回上一层'}
            location={location}
            actionLabel={actionLabel}
            powerLabel={powerLabel}
            invasionRisk={invasionRisk}
            safetyRisk={safetyRisk}
            remainingSchemes={remainingSchemes}
            maxSchemes={maxSchemes}
            onBack={handleTopBack}
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

    const renderNpcSeat = (npc: NPC) => {
        const selectable = npc.powerBase === 'external'
            ? isSelectableExternalNpc(npc)
            : isSelectableCourtNpc(npc)
        const alreadyUsed = usedNpcIds.has(npc.id)
        const knownIntel = intelProgress[npc.id] ?? 0
        const reaction = getNpcRoundReaction(currentRound, npc, knownIntel, {
            shuCampaignState: shuCampaign.resolvedState ?? shuCampaign.state,
            huainanCampaignState: huainanCampaign.resolvedState ?? huainanCampaign.state,
        })

        return (
            <button
                key={npc.id}
                className={`court-seat trust-${getTrustLevel(npc.trust)} ${!selectable ? 'is-disabled' : ''} ${alreadyUsed ? 'is-used' : ''}`}
                onClick={() => selectable && setSelectedNpcId(npc.id)}
                disabled={!selectable}
            >
                <NpcPortrait name={npc.name} className="court-seat-portrait" positionY="14%" zoom={1.08} />
                <span className="court-seat-name">{npc.name}</span>
                <span className="court-seat-title">{getDisplayedNpcTitle(npc)}</span>
                <span className="court-seat-status">
                    {alreadyUsed ? '今日已落子' : `${getTrustLabel(npc.trust)} · 暗线 ${knownIntel}/${npc.secretThreads.length}`}
                </span>
                <span className="court-seat-reaction">{reaction}</span>
            </button>
        )
    }

    const renderFactionScreen = () => {
        const groups = scope === 'court' ? courtGroups : externalGroups
        const scopeTitle = scope === 'court' ? '朝堂势力' : '地方军头'

        return (
            <section className={`court-game-screen court-faction-screen court-faction-screen-${scope}`}>
                {renderSceneLayers(scope === 'court' ? 'court' : 'external')}
                {renderHud(`朝堂总览 > ${scopeTitle}`, '返回总览', backToOverview)}
                <div className="court-scroll-grid">
                    {groups.map(group => (
                        <article key={group.id} className={`court-faction-scroll court-faction-scroll-${group.id}`}>
                            <div className="court-faction-scroll-head">
                                <div>
                                    <h3>{group.title}</h3>
                                    <p>{group.summary}</p>
                                </div>
                                <span className="court-faction-mark">{group.artLabel}</span>
                            </div>
                            <div className="court-seat-rail">
                                {group.members.map(renderNpcSeat)}
                            </div>
                            <span className="court-faction-metric">{group.metricLabel}</span>
                        </article>
                    ))}
                </div>
            </section>
        )
    }

    const renderOverview = () => (
        <section className="court-game-screen court-overview-screen">
            {renderSceneLayers('overview')}
            {renderHud(`第 ${currentRound} 回合`)}
            <div className="court-gate-grid">
                <button className="court-gate court-gate-court" onClick={() => goScope('court')}>
                    <span className="court-gate-visual" aria-hidden="true">
                        <span className="court-gate-art-mask">
                            <span className="court-gate-art" />
                            <span className="court-gate-atmosphere" />
                        </span>
                        <span className="court-gate-frame" />
                        <span className="court-gate-frame-glow" />
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
                            <span className="court-gate-atmosphere" />
                        </span>
                        <span className="court-gate-frame" />
                        <span className="court-gate-frame-glow" />
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
        </section>
    )

    const renderNpcDetail = (npc: NPC) => {
        const knownIntel = intelProgress[npc.id] ?? 0
        const displayedTitle = getDisplayedNpcTitle(npc)
        const roundReaction = getNpcRoundReaction(currentRound, npc, knownIntel, {
            shuCampaignState: shuCampaign.resolvedState ?? shuCampaign.state,
            huainanCampaignState: huainanCampaign.resolvedState ?? huainanCampaign.state,
        })
        const knownThreads = npc.secretThreads.slice(0, knownIntel)
        const isExternal = npc.powerBase === 'external'
        const progress = isExternal ? externalProgressMap[npc.id] : null
        const courtFavor = !isExternal ? getCourtFavor(npc) : null
        const dispositionHint = !isExternal ? buildCourtDispositionHint(npc) : null
        const canScheme = remainingSchemes > 0 && !usedNpcIds.has(npc.id)
        const isComposing = schemeDrawerNpcId === npc.id

        return (
            <section className={`court-game-screen court-detail-screen ${isExternal ? 'court-detail-external' : 'court-detail-court'}`}>
                {renderSceneLayers('detail')}
                {renderHud(`${isExternal ? '地方军头' : '朝堂势力'} > ${npc.name}`, isExternal ? '返回地方' : '返回势力', () => {
                    setSchemeDrawerNpcId(null)
                    setSelectedNpcId(null)
                    setScope(isExternal ? 'external' : 'court')
                })}
                <div className="court-character-stand">
                    <NpcPortrait name={npc.name} className="court-detail-portrait" positionY="12%" zoom={1.04} />
                    <span>{npc.name}</span>
                </div>
                <article className={`court-dossier ${isComposing ? 'court-dossier-composer' : ''}`}>
                    {isComposing ? (
                        <SchemeComposer
                            mode="embedded"
                            lockedNpcId={npc.id}
                            onChangeTarget={() => {
                                setSchemeDrawerNpcId(null)
                                setSelectedNpcId(null)
                                setScope(isExternal ? 'external' : 'court')
                            }}
                            onAfterSubmit={() => {
                                setSchemeDrawerNpcId(null)
                                completeSchemingIfReady()
                            }}
                        />
                    ) : (
                        <>
                            <div className="court-dossier-head">
                                <div>
                                    <h3>{npc.name}</h3>
                                    <p>{displayedTitle}</p>
                                </div>
                                <div className="court-dossier-actions">
                                    <button className="court-small-link" onClick={() => openNpcDetail(npc.id)}>完整档案</button>
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
            </section>
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
                                                            暗线已明：{knownIntel}/{npc.secretThreads.length}
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
                    今日可用计谋：<span className="highlight-number">{maxSchemes - schemeCount}</span> / {maxSchemes}
                </div>
                <button className="btn-primary" onClick={nextPhase} disabled={schemeCount >= maxSchemes}>
                    {schemeCount >= maxSchemes ? '今日已无可落之子' : '看定人选，去落子'}
                </button>
            </div>
        </div>
    )
}
