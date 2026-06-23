import { useState, type CSSProperties } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { ROUND_EVENTS } from '../../data/rounds'
import { ROUND_START_RICH_BRIEFINGS } from '../../data/roundStartRichBriefings'
import { getRoundStartCampaignDisplay } from '../../game/campaignDisplayEngine'
import { buildFirstRoundGuideSequence } from '../../game/fengDaozhiGuide'
import type { NationDimensions } from '../../game/types'
import { RadarChart } from '../RadarChart/RadarChart'
import { FengDaozhiDialogueOverlay } from '../FengDaozhiDialogue/FengDaozhiDialogueOverlay'
import { PageUtilityActions } from '../PageUtilityActions/PageUtilityActions'
import { GameViewport } from '../GameViewport/GameViewport'
import { formatRoundVolumeLabel } from '../../utils/roundLabels'
import { useGameSfx } from '../../audio/gameSfx'
import { useSceneTransition } from '../SceneTransition/SceneTransition'
import './RoundStart.css'

const ROUND_START_ASSETS = {
    courtBackground: new URL('../../assets/ui/court-overview/court-bg-lacquer-v3.webp', import.meta.url).href,
    volumeSeal: new URL('../../assets/ui/round-start/roundstart-volume-seal.webp', import.meta.url).href,
    briefingScroll: new URL('../../assets/ui/round-start/roundstart-briefing-scroll-wide-aiart-v2.webp', import.meta.url).href,
    boardFrame: new URL('../../assets/ui/round-start/roundstart-board-frame.webp', import.meta.url).href,
    northPowerPlate: new URL('../../assets/ui/round-start/roundstart-power-north.webp', import.meta.url).href,
    southPowerPlate: new URL('../../assets/ui/round-start/roundstart-power-south.webp', import.meta.url).href,
}

export function resolveCompactRoundStartMapSrc(campaignMapSrc: string) {
    return campaignMapSrc
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

function buildRoundStartTitle(currentRound: number, eventTitle?: string, timeLabel?: string): string {
    const titleParts = [formatRoundVolumeLabel(currentRound)]

    if (eventTitle) titleParts.push(eventTitle)
    else if (timeLabel) titleParts.push(timeLabel)

    return titleParts.join('：')
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
    const { runSceneTransition } = useSceneTransition()
    const { playSfx } = useGameSfx()
    const {
        currentRound,
        nextPhase,
        northStats,
        southStats,
        firstRoundGuideSeen,
        markFirstRoundGuideSeen,
        openGameplayGuide,
        shuCampaign,
        huainanCampaign,
    } = useGameStore()

    const event = ROUND_EVENTS[currentRound - 1]
    const campaignDisplay = getRoundStartCampaignDisplay(currentRound, shuCampaign, huainanCampaign)
    const campaignMap = campaignDisplay.map
    const eventTitle = campaignDisplay.eventName ?? event?.eventName
    const roundBriefing = campaignDisplay.briefing ?? ROUND_START_RICH_BRIEFINGS[currentRound] ?? event?.briefing ?? ''
    const roundTitleLine = buildRoundStartTitle(currentRound, eventTitle, event?.timeLabel)
    const roundBriefingParagraphs = roundBriefing.split('\n').filter(Boolean)
    const handleEnterCourt = () => {
        playSfx('roundstart-to-court')
        void runSceneTransition({
            variant: 'north-court-entry',
            onCovered: nextPhase,
        })
    }
    const guideOverlay = currentRound === 1 && !firstRoundGuideSeen.round_start ? (
        <FengDaozhiDialogueOverlay
            sequences={[buildFirstRoundGuideSequence('round_start')]}
            onSequenceComplete={() => undefined}
            onComplete={() => markFirstRoundGuideSeen('round_start')}
        />
    ) : null
    const compactRootStyle = {
        '--roundstart-bg': `url(${ROUND_START_ASSETS.courtBackground})`,
    } as RoundStartStyle
    const compactBleed = (
        <div className="roundstart-bleed" style={compactRootStyle}>
            <span className="roundstart-bleed-shade" />
        </div>
    )
    const scrollBriefingStyle = {
        '--scroll-art': `url(${ROUND_START_ASSETS.briefingScroll})`,
    } as RoundStartStyle
    const compactMapSrc = resolveCompactRoundStartMapSrc(campaignMap.src)

    return (
        <GameViewport
            className="roundstart-viewport"
            canvasClassName="roundstart-design-canvas page-enter"
            bleed={compactBleed}
        >
            <div className="roundstart-canvas-content round-start round-start-compact roundstart-game-screen roundstart-single-screen-art">
                {guideOverlay}

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
                    style={scrollBriefingStyle}
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
                        backgroundImage={ROUND_START_ASSETS.northPowerPlate}
                        showStatIcons
                    />
                    <RoundPowerBoard
                        title="南陈国力"
                        tone="south"
                        stats={southStats}
                        backgroundImage={ROUND_START_ASSETS.southPowerPlate}
                        showStatIcons
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
                    <button className="btn-primary roundstart-enter-btn" onClick={handleEnterCourt}>
                        入朝听政
                    </button>
                </footer>
            </div>
        </GameViewport>
    )
}
