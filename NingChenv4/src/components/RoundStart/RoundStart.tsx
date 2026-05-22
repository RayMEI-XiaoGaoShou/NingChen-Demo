import { useState, type CSSProperties } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { ROUND_EVENTS } from '../../data/rounds'
import { ROUND_START_RICH_BRIEFINGS } from '../../data/roundStartRichBriefings'
import { ROUND_CONTEXT_NOTES } from '../../data/roundContext'
import { FIRST_ROUND_GUIDE_CONTENT } from '../../data/prologueContent'
import { getRoundStartCampaignDisplay } from '../../game/campaignDisplayEngine'
import type { NationDimensions } from '../../game/types'
import { RadarChart } from '../RadarChart/RadarChart'
import { FirstRoundGuideModal } from '../FirstRoundGuide/FirstRoundGuideModal'
import { getRoundAdvisorHint } from '../../game/roundIntelEngine'
import { buildDominantExternalStageHint } from '../../game/externalActionHint'
import { buildOmenAdvisorHint } from '../../game/fengDaozhiHint'
import { buildCampaignRecordPanel } from '../../game/campaignRecordBoard'
import { NpcPortrait } from '../NpcPortrait/NpcPortrait'
import { PageUtilityActions } from '../PageUtilityActions/PageUtilityActions'
import { renderMixedTextWithNumberSpans } from '../../utils/renderMixedText'
import { GameViewport } from '../GameViewport/GameViewport'
import { formatRoundVolumeLabel } from '../../utils/roundLabels'
import './RoundStart.css'

const ROUND_START_ASSETS = {
    courtBackground: new URL('../../assets/ui/court-overview/court-bg-lacquer-v3.webp', import.meta.url).href,
    volumeSeal: new URL('../../assets/ui/round-start/roundstart-volume-seal.webp', import.meta.url).href,
    briefingScroll: new URL('../../assets/ui/round-start/roundstart-briefing-scroll-wide-aiart-v2.webp', import.meta.url).href,
    naturalBriefingScroll: new URL('../../assets/ui/round-start/roundstart-briefing-scroll.webp', import.meta.url).href,
    boardFrame: new URL('../../assets/ui/round-start/roundstart-board-frame.webp', import.meta.url).href,
    northPowerPlate: new URL('../../assets/ui/round-start/roundstart-power-north.webp', import.meta.url).href,
    southPowerPlate: new URL('../../assets/ui/round-start/roundstart-power-south.webp', import.meta.url).href,
    worldMapAiart: new URL('../../assets/ui/round-start/roundstart-world-map-aiart-v1.webp', import.meta.url).href,
    worldMapAiartBashu: new URL('../../assets/ui/round-start/roundstart-world-map-aiart-bashu-v1.webp', import.meta.url).href,
    worldMapAiartBashuHuainan: new URL('../../assets/ui/round-start/roundstart-world-map-aiart-bashu-huainan-v1.webp', import.meta.url).href,
    worldMapAiartHuainan: new URL('../../assets/ui/round-start/roundstart-world-map-aiart-huainan-v1.webp', import.meta.url).href,
}

const ROUND_START_COMPACT_MAP_ART = [
    { sourceNeedle: 'map_1_initial', src: ROUND_START_ASSETS.worldMapAiart },
    { sourceNeedle: 'map_2_bashu', src: ROUND_START_ASSETS.worldMapAiartBashu },
    { sourceNeedle: 'map_3_bashu_huainan', src: ROUND_START_ASSETS.worldMapAiartBashuHuainan },
    { sourceNeedle: 'map_4_huainan', src: ROUND_START_ASSETS.worldMapAiartHuainan },
] as const

export function resolveCompactRoundStartMapSrc(campaignMapSrc: string, useWireframeLayout: boolean) {
    if (useWireframeLayout) return campaignMapSrc

    return ROUND_START_COMPACT_MAP_ART.find(({ sourceNeedle }) => campaignMapSrc.includes(sourceNeedle))?.src ?? campaignMapSrc
}

const ROUND_START_STAT_ICONS: Record<keyof NationDimensions, string> = {
    finance: new URL('../../assets/ui/round-start/stat-finance-coin.webp', import.meta.url).href,
    governance: new URL('../../assets/ui/round-start/stat-governance.webp', import.meta.url).href,
    socialOrder: new URL('../../assets/ui/round-start/stat-social-order.webp', import.meta.url).href,
    grain: new URL('../../assets/ui/round-start/stat-grain.webp', import.meta.url).href,
    military: new URL('../../assets/ui/round-start/stat-military.webp', import.meta.url).href,
}

type RoundStartStyle = CSSProperties & {
    '--roundstart-bg'?: string
    '--hud-art'?: string
    '--scroll-art'?: string
    '--board-bg'?: string
    '--board-frame'?: string
}

function stripAdvisorPrefix(text: string | null | undefined): string {
    if (!text) return ''

    let cleaned = text.trim()

    cleaned = cleaned
        .replace(/^冯道之密语[：:\s-]*/u, '')
        .replace(/^密语[：:\s-]*/u, '')
        .replace(/^[·•\s]*【[^】]+】[：:\s-]*/u, '')
        .replace(/^[·•\s：:\-]+/u, '')
        .trim()

    return cleaned
}

function buildRoundStartTitle(currentRound: number, eventTitle?: string, timeLabel?: string): string {
    const titleParts = [formatRoundVolumeLabel(currentRound)]

    if (eventTitle) titleParts.push(eventTitle)
    else if (timeLabel) titleParts.push(timeLabel)

    return titleParts.join('：')
}

export function shouldUseCompactRoundStartLayout(currentRound: number) {
    return currentRound >= 1
}

export function getRoundStartLayoutMode(search?: string): 'art' | 'wireframe' | 'natural' {
    const query = search ?? (typeof window === 'undefined' ? '' : window.location.search)
    const params = new URLSearchParams(query)
    const mode = params.get('roundStartLayout')

    if (mode === 'wireframe') return 'wireframe'
    if (mode === 'natural') return 'natural'

    return 'art'
}

export function splitRoundStartBriefingDateLead(paragraph: string): { lead: string; rest: string } | null {
    const match = paragraph.match(/^((?:北周|南陈)[^。]{1,32}年[^。]{0,24}。)(.*)$/u)

    if (!match) return null

    return {
        lead: match[1],
        rest: match[2] ?? '',
    }
}

function renderRoundStartBriefingParagraph(paragraph: string) {
    const dateLead = splitRoundStartBriefingDateLead(paragraph)

    return (
        <p key={paragraph}>
            {dateLead ? (
                <>
                    <span className="roundstart-briefing-date">{dateLead.lead}</span>
                    {dateLead.rest}
                </>
            ) : paragraph}
        </p>
    )
}

interface RoundPowerBoardProps {
    title: string
    tone: 'north' | 'south'
    stats: NationDimensions
    backgroundImage?: string
    showStatIcons?: boolean
}

function RoundPowerBoard({
    title,
    tone,
    stats,
    backgroundImage,
    showStatIcons = true,
}: RoundPowerBoardProps) {
    const boardStyle = backgroundImage
        ? ({
            '--board-bg': `url(${backgroundImage})`,
            '--board-frame': `url(${ROUND_START_ASSETS.boardFrame})`,
        } as RoundStartStyle)
        : undefined

    return (
        <article
            className={`roundstart-war-board roundstart-power-board roundstart-power-board-${tone}`}
            style={boardStyle}
        >
            <div className="roundstart-board-content">
                <header className="roundstart-board-header">
                    <h2>{title}</h2>
                </header>

                <div className="roundstart-power-core">
                    <RadarChart
                        data={stats}
                        size={330}
                        variant="warBoard"
                        tone={tone}
                        dimensionIcons={showStatIcons ? ROUND_START_STAT_ICONS : undefined}
                    />
                </div>
            </div>
        </article>
    )
}

export function RoundStart() {
    const [isMapExpanded, setIsMapExpanded] = useState(false)
    const {
        currentRound,
        nextPhase,
        northStats,
        southStats,
        difficulty,
        npcs,
        intelProgress,
        lastPolicyAftereffect,
        recentBacklash,
        firstRoundGuideSeen,
        markFirstRoundGuideSeen,
        openGameplayGuide,
        shuCampaign,
        huainanCampaign,
        shuMomentum,
        huainanMomentum,
    } = useGameStore()

    const event = ROUND_EVENTS[currentRound - 1]
    const contextNotes = ROUND_CONTEXT_NOTES[currentRound] ?? []
    const externalStageHint = buildDominantExternalStageHint({
        round: currentRound,
        npcs,
        intelProgress,
        difficulty,
    })
    const omenAdvisorHint = buildOmenAdvisorHint(currentRound)
    const courtAdvisorHint = [getRoundAdvisorHint(currentRound, npcs, null), omenAdvisorHint]
        .filter(Boolean)
        .join(' ')
    const previousPolicyAftereffect =
        lastPolicyAftereffect && lastPolicyAftereffect.sourceRound === currentRound - 1
            ? lastPolicyAftereffect
            : null
    const campaignDisplay = getRoundStartCampaignDisplay(currentRound, shuCampaign, huainanCampaign)
    const campaignMap = campaignDisplay.map
    const eventTitle = campaignDisplay.eventName ?? event?.eventName
    const roundBriefing = campaignDisplay.briefing ?? ROUND_START_RICH_BRIEFINGS[currentRound] ?? event?.briefing ?? ''
    const courtHintText = stripAdvisorPrefix(courtAdvisorHint || event?.hint)
    const externalHintText = stripAdvisorPrefix(externalStageHint)
    const roundTitleLine = buildRoundStartTitle(currentRound, eventTitle, event?.timeLabel)
    const roundBriefingParagraphs = roundBriefing.split('\n').filter(Boolean)
    const campaignRecord = buildCampaignRecordPanel({
        round: currentRound,
        surface: 'round_start',
        shuCampaign,
        huainanCampaign,
        shuMomentum,
        huainanMomentum,
        campaignReports: [],
    })
    const showCompactLayout = shouldUseCompactRoundStartLayout(currentRound)
    const layoutMode = getRoundStartLayoutMode()
    const useWireframeLayout = showCompactLayout && layoutMode === 'wireframe'
    const useNaturalArtLayout = showCompactLayout && layoutMode === 'natural'
    const compactModeClass = useWireframeLayout
        ? ' roundstart-wireframe-screen'
        : useNaturalArtLayout
            ? ' roundstart-natural-art-screen'
            : ' roundstart-single-screen-art'
    const guideModal = currentRound === 1 && !firstRoundGuideSeen.round_start ? (
        <FirstRoundGuideModal
            title={FIRST_ROUND_GUIDE_CONTENT.round_start.title}
            body={FIRST_ROUND_GUIDE_CONTENT.round_start.body}
            onClose={() => markFirstRoundGuideSeen('round_start')}
        />
    ) : null
    const compactRootStyle = {
        '--roundstart-bg': `url(${ROUND_START_ASSETS.courtBackground})`,
    } as RoundStartStyle
    const compactBleed = useWireframeLayout ? undefined : (
        <div className="roundstart-bleed" style={compactRootStyle}>
            <span className="roundstart-bleed-shade" />
        </div>
    )
    const scrollBriefingStyle = {
        '--scroll-art': `url(${useNaturalArtLayout ? ROUND_START_ASSETS.naturalBriefingScroll : ROUND_START_ASSETS.briefingScroll})`,
    } as RoundStartStyle
    const compactMapSrc = resolveCompactRoundStartMapSrc(campaignMap.src, useWireframeLayout)

    if (showCompactLayout) {
        return (
            <GameViewport
                className="roundstart-viewport"
                canvasClassName={`roundstart-design-canvas page-enter`}
                bleed={compactBleed}
            >
                <div className={`roundstart-canvas-content round-start round-start-compact roundstart-game-screen${compactModeClass}`}>
                    {guideModal}

                <header className="roundstart-volume-hud animate-slide-up">
                    <div className="roundstart-volume-title-plaque">
                        <img
                            className="roundstart-volume-seal"
                            src={ROUND_START_ASSETS.volumeSeal}
                            alt=""
                            aria-hidden="true"
                            draggable={false}
                        />
                        <h1 className="roundstart-title-line">{roundTitleLine}</h1>
                    </div>
                    <PageUtilityActions onOpenGuide={() => openGameplayGuide('gameplay')} />
                </header>

                <section
                    className="roundstart-scroll-briefing animate-slide-up animate-delay-1"
                    style={useWireframeLayout ? undefined : scrollBriefingStyle}
                >
                    <div className="roundstart-scroll-copy">
                        <span className="roundstart-section-kicker">朝堂简报</span>
                        <div className="roundstart-scroll-paragraphs">
                            {roundBriefingParagraphs.map(renderRoundStartBriefingParagraph)}
                        </div>
                    </div>
                </section>

                <section className="roundstart-war-board-grid animate-slide-up animate-delay-2">
                    <RoundPowerBoard
                        title="北周国力"
                        tone="north"
                        stats={northStats}
                        backgroundImage={useWireframeLayout ? undefined : ROUND_START_ASSETS.northPowerPlate}
                        showStatIcons={!useWireframeLayout}
                    />
                    <RoundPowerBoard
                        title="南陈国力"
                        tone="south"
                        stats={southStats}
                        backgroundImage={useWireframeLayout ? undefined : ROUND_START_ASSETS.southPowerPlate}
                        showStatIcons={!useWireframeLayout}
                    />
                    <article
                        className="roundstart-war-board roundstart-world-board"
                        aria-label={`当前战局地图：${campaignMap.label}`}
                    >
                        <div className="roundstart-board-content">
                            <div className="roundstart-map-container">
                                <div className="roundstart-world-map-shell">
                                    <button
                                        type="button"
                                        className="roundstart-map-zoom-trigger"
                                        onClick={() => setIsMapExpanded(true)}
                                        aria-label={`放大天下形势图：${campaignMap.label}`}
                                    >
                                        <img
                                            className="roundstart-map-image"
                                            src={compactMapSrc}
                                            alt=""
                                            aria-hidden="true"
                                            draggable={false}
                                        />
                                        <span className="roundstart-map-corner-title" aria-hidden="true">天下形势图</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </article>
                </section>

                {isMapExpanded && (
                    <div className="roundstart-map-modal-backdrop" onClick={() => setIsMapExpanded(false)}>
                        <div
                            className="roundstart-map-modal"
                            role="dialog"
                            aria-modal="true"
                            aria-label={`天下形势图放大查看：${campaignMap.label}`}
                            onClick={event => event.stopPropagation()}
                        >
                            <header className="roundstart-map-modal-header">
                                <h3>天下形势图</h3>
                                <button
                                    type="button"
                                    className="roundstart-map-modal-close"
                                    onClick={() => setIsMapExpanded(false)}
                                >
                                    关闭
                                </button>
                            </header>
                            <img
                                className="roundstart-map-modal-image"
                                src={compactMapSrc}
                                alt={`当前战局地图：${campaignMap.label}`}
                            />
                        </div>
                    </div>
                )}

                <footer className="roundstart-action-bar animate-slide-up animate-delay-3">
                    <button className="btn-primary roundstart-enter-btn" onClick={nextPhase}>
                        入朝听政
                    </button>
                </footer>
                </div>
            </GameViewport>
        )
    }

    return (
        <div className="page-container round-start page-enter">
            {guideModal}

            <div className="page-utility-row animate-slide-up">
                <PageUtilityActions onOpenGuide={() => openGameplayGuide('gameplay')} />
            </div>

            <div className="round-header animate-slide-up">
                <span className="round-label">{renderMixedTextWithNumberSpans(`第 ${currentRound} 回合`)}</span>
                <span className="round-time">{event?.timeLabel}</span>
            </div>

            <h1 className="event-title animate-slide-up animate-delay-1">{eventTitle}</h1>

            <div className="glass-panel briefing-card animate-slide-up animate-delay-2">
                <h3 className="section-title">朝堂简报</h3>
                {roundBriefingParagraphs.map(paragraph => (
                    <p key={paragraph}>{paragraph}</p>
                ))}
                {contextNotes.length > 0 && (
                    <ul className="context-list">
                        {contextNotes.map((note, index) => (
                            <li key={`${currentRound}-context-${index}`}>{note}</li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="event-descriptions animate-slide-up animate-delay-3">
                <div className="gold-panel event-card north">
                    <h4 className="faction-title">北周风云</h4>
                    <p>{event?.northDescription}</p>
                </div>
                <div className="gold-panel event-card south">
                    <h4 className="faction-title">南陈暗线</h4>
                    <p>{event?.southDescription}</p>
                </div>
            </div>

            <div className="round-strategy-grid animate-slide-up animate-delay-3">
                <div className="historical-aid-grid">
                    <div className="gold-panel aid-map-card round-map-card">
                        <div className="aid-map-header">
                            <h3 className="section-title">天下形势图</h3>
                        </div>
                        <img className="aid-map-image" src={campaignMap.src} alt={`当前战局地图：${campaignMap.label}`} />
                    </div>
                </div>

                <div className="round-side-stack">
                    <div className="glass-panel round-radars-card">
                        <h3 className="section-title">南北国力对照</h3>
                        <div className="power-dashboard">
                            <div className="radar-section">
                                <RadarChart data={northStats} size={300} label="北周国力五维" />
                            </div>
                            <div className="radar-section">
                                <RadarChart data={southStats} size={300} label="南陈国力五维" />
                            </div>
                        </div>
                    </div>

                    {campaignRecord.visible && (
                        <div className="glass-panel aftereffect-card">
                            <h3 className="section-title">{campaignRecord.title}</h3>
                            <p>
                                <strong>{campaignRecord.phase}：</strong>
                                {campaignRecord.recapText}
                            </p>
                            <p>{campaignRecord.statusText}</p>
                            {campaignRecord.resultText && <p>{campaignRecord.resultText}</p>}
                        </div>
                    )}

                    {previousPolicyAftereffect && (
                        <div className="glass-panel aftereffect-card">
                            <h3 className="section-title">问政余波</h3>
                            <p>{previousPolicyAftereffect.summary}</p>
                            <div className="aftereffect-tags">
                                {Object.entries(previousPolicyAftereffect.effects).map(([dim, value]) => {
                                    if (!value) return null

                                    const dimNames: Record<string, string> = {
                                        finance: '财政',
                                        grain: '粮秣',
                                        military: '军事',
                                        socialOrder: '民生秩序',
                                        governance: '治理穿透力',
                                    }

                                    return (
                                        <span
                                            key={`aftereffect-${dim}`}
                                            className={`aftereffect-tag ${value > 0 ? 'positive' : 'negative'}`}
                                        >
                                            {renderMixedTextWithNumberSpans(`南陈${dimNames[dim]} ${value > 0 ? '+' : ''}${value.toFixed(1)}`)}
                                        </span>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {recentBacklash.length > 0 && (
                        <div className="glass-panel aftereffect-card">
                            <h3 className="section-title">朝局反噬</h3>
                            <p>{recentBacklash[0].summary}</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="glass-panel hint-card animate-slide-up animate-delay-4">
                <NpcPortrait
                    name="冯道之"
                    alt="冯道之画像"
                    className="roundstart-advisor-portrait roundstart-advisor-portrait-large"
                    positionY="18%"
                />
                <h3 className="section-title">冯道之锦囊</h3>
                <p>
                    <strong>朝堂势力：</strong>
                    {courtHintText}
                </p>
                {externalHintText && (
                    <p>
                        <strong>地方军头：</strong>
                        {externalHintText}
                    </p>
                )}
            </div>

            <div className="enter-action animate-slide-up animate-delay-4">
                <button className="btn-primary btn-enter" onClick={nextPhase}>
                    入朝
                </button>
            </div>
        </div>
    )
}
