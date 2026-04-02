import { RadarChart } from '../RadarChart/RadarChart'
import { useGameStore } from '../../stores/gameStore'
import type { EndingReport, GameResult } from '../../game/types'
import './Ending.css'

const FALLBACK_COPY: Record<GameResult, { title: string; lines: string[] }> = {
    NONE: { title: '', lines: [] },
    VICTORY: {
        title: '十年一剑',
        lines: ['十年伪装终有回响，南陈终于等来了可以北上的那一日。'],
    },
    DEFEAT_DEATH: {
        title: '身死朝堂',
        lines: ['身份败露之后，你终究没能活着走出邺城。'],
    },
    DEFEAT_INVASION: {
        title: '大江东去',
        lines: ['北周提早南下，十年筹谋被迫中断。'],
    },
    DEFEAT_POWER: {
        title: '功亏十年',
        lines: ['二十回合过去，南陈仍未能反超北周。'],
    },
}

export function Ending() {
    const {
        gameResult,
        northStats,
        southStats,
        northPower,
        southPower,
        resetGame,
        restoreRoundStartSnapshot,
        roundStartSnapshot,
        endingReport,
        battleReport,
    } = useGameStore()

    const report = ensureReport(gameResult, endingReport)
    const variant = getVariant(gameResult)
    const canRetryCurrentRound = Boolean(roundStartSnapshot) && gameResult !== 'VICTORY' && gameResult !== 'NONE'
    const pivotMoment = battleReport?.pivotMoments?.[0] ?? null

    return (
        <div className={`page-container ending ending--${variant} animate-fade-in`}>
            <div className="ending-backdrop" />

            <div className="ending-shell">
                <header className="ending-hero animate-slide-up">
                    <p className="ending-era">
                        {gameResult === 'VICTORY' ? '天嘉十年冬' : gameResult === 'DEFEAT_INVASION' ? '建文中期' : '终局判辞'}
                    </p>
                    <h1 className="ending-title">{report.title}</h1>
                    <p className="ending-tier">{report.tier}</p>
                    {report.sceneLabel && <p className="ending-scene">{report.sceneLabel}</p>}
                </header>

                <section className="ending-stage animate-fade-in animate-delay-2">
                    <div className="ending-story">
                        <div className="ending-block">
                            <h2>{getNarrativeHeading(gameResult)}</h2>
                            {report.openingLines.map(line => (
                                <p key={line}>{line}</p>
                            ))}
                        </div>

                        {report.epilogueLines.length > 0 && (
                            <div className="ending-block ending-block--accent">
                                <h2>{getEpilogueHeading(gameResult)}</h2>
                                {report.epilogueLines.map(line => (
                                    <p key={line}>{line}</p>
                                ))}
                            </div>
                        )}
                    </div>

                    <aside className="ending-side">
                        <div className="ending-metrics">
                            <div className="metric-card">
                                <span className="metric-label">南陈综合国力</span>
                                <strong className="metric-value metric-value--south">{southPower.toFixed(1)}</strong>
                            </div>
                            <div className="metric-card">
                                <span className="metric-label">北周综合国力</span>
                                <strong className="metric-value metric-value--north">{northPower.toFixed(1)}</strong>
                            </div>
                            {report.invasionDriver && (
                                <div className="metric-card">
                                    <span className="metric-label">南征关键推手</span>
                                    <strong className="metric-note">{report.invasionDriver}</strong>
                                </div>
                            )}
                            {report.triggerRound && (
                                <div className="metric-card">
                                    <span className="metric-label">触发回合</span>
                                    <strong className="metric-note">第 {report.triggerRound} 回合</strong>
                                </div>
                            )}
                            {report.standoutNpc && (
                                <div className="metric-card">
                                    <span className="metric-label">局中关键人物</span>
                                    <strong className="metric-note">{report.standoutNpc}</strong>
                                </div>
                            )}
                        </div>
                    </aside>
                </section>

                {(gameResult === 'VICTORY' || gameResult === 'DEFEAT_POWER') && (
                    <section className="ending-section animate-fade-in animate-delay-3">
                        <div className="section-heading">
                            <h2>{gameResult === 'VICTORY' ? '十年功业' : '十年回顾'}</h2>
                            <p>以五维对照回看这局棋局最后落在何处。</p>
                        </div>
                        <div className="ending-radar-grid">
                            <div className="ending-radar-card">
                                <RadarChart data={southStats} size={280} label="南陈五维" />
                            </div>
                            <div className="ending-radar-card">
                                <RadarChart data={northStats} size={280} label="北周五维" />
                            </div>
                        </div>
                    </section>
                )}

                <section className="ending-section animate-fade-in animate-delay-4">
                    <div className="ending-info-grid">
                        <article className="info-card">
                            <h3>{gameResult === 'VICTORY' ? '关键成因' : '关键败因'}</h3>
                            {report.causeSummary.map(item => (
                                <p key={item}>{item}</p>
                            ))}
                            {report.northFailureSummary && <p>{report.northFailureSummary}</p>}
                        </article>

                        <article className="info-card">
                            <h3>势力终局</h3>
                            {report.factionOutlook.map(item => (
                                <p key={item}>{item}</p>
                            ))}
                        </article>

                        <article className="info-card">
                            <h3>关键人物命运</h3>
                            {report.npcFates.map(item => (
                                <p key={item.npcId}>{item.summary}</p>
                            ))}
                        </article>

                        <article className="info-card">
                            <h3>本局摘要</h3>
                            {report.statsSummary.map(item => (
                                <p key={item}>{item}</p>
                            ))}
                            {pivotMoment && <p>关键转折：{pivotMoment}</p>}
                        </article>
                    </div>
                </section>

                <footer className="ending-actions animate-fade-in animate-delay-5">
                    {canRetryCurrentRound && (
                        <button className="btn-secondary ending-btn" onClick={restoreRoundStartSnapshot}>
                            回到本回合初
                        </button>
                    )}
                    <button className="btn-primary ending-btn" onClick={resetGame}>
                        再启宿命
                    </button>
                </footer>
            </div>
        </div>
    )
}

function ensureReport(gameResult: GameResult, report: EndingReport | null): EndingReport {
    if (report) return report

    const fallback = FALLBACK_COPY[gameResult]
    return {
        title: fallback.title,
        tier: gameResult === 'VICTORY' ? '稳胜' : '惨败',
        causeSummary: [],
        factionOutlook: [],
        npcFates: [],
        statsSummary: [],
        openingLines: fallback.lines,
        epilogueLines: [],
        sceneLabel: null,
        invasionDriver: null,
        triggerRound: null,
        standoutNpc: null,
        northFailureSummary: null,
    }
}

function getVariant(gameResult: GameResult): 'victory' | 'death' | 'invasion' | 'defeat' {
    if (gameResult === 'VICTORY') return 'victory'
    if (gameResult === 'DEFEAT_DEATH') return 'death'
    if (gameResult === 'DEFEAT_INVASION') return 'invasion'
    return 'defeat'
}

function getNarrativeHeading(gameResult: GameResult): string {
    if (gameResult === 'VICTORY') return '天下已见分晓'
    if (gameResult === 'DEFEAT_DEATH') return '邺城夜讯'
    if (gameResult === 'DEFEAT_INVASION') return '江上兵声'
    return '局终而愿未酬'
}

function getEpilogueHeading(gameResult: GameResult): string {
    if (gameResult === 'VICTORY') return '萧宝颖结语'
    if (gameResult === 'DEFEAT_DEATH') return '南陈闻讯'
    if (gameResult === 'DEFEAT_INVASION') return '乱后无名'
    return '余声未尽'
}
