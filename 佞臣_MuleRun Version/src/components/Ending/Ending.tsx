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
    const endingLead = getEndingLead(gameResult)
    const endingMemo = getEndingMemo(gameResult, report)

    return (
        <div className={`page-container ending ending--${variant} animate-fade-in`}>
            <div className="ending-backdrop" />

            <div className="ending-shell">
                <header className="ending-hero animate-slide-up">
                    <span className="page-eyebrow">终局戏台</span>
                    <p className="ending-era">
                        {gameResult === 'VICTORY' ? '天嘉十年冬' : gameResult === 'DEFEAT_INVASION' ? '建文中期' : '终局判辞'}
                    </p>
                    <h1 className="ending-title">{report.title}</h1>
                    <p className="ending-tier">{report.tier}</p>
                    {report.sceneLabel && <p className="ending-scene">{report.sceneLabel}</p>}
                    <p className="ending-lead">{endingLead}</p>
                </header>

                <section className="ending-decree decree-panel animate-fade-in animate-delay-2">
                    <div className="ending-decree-header">
                        <span className="ending-decree-kicker">终局判卷</span>
                        <div className={`ending-seal ending-seal--${variant}`}>{getSealLabel(gameResult)}</div>
                    </div>

                    <div className="ending-decree-body">
                        <div className="ending-block ending-block--opening">
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
                </section>

                <section className="ending-afterglow animate-fade-in animate-delay-3">
                    <article className="ending-afterglow-card">
                        <span className="ending-afterglow-label">终局余音</span>
                        <p>{endingMemo}</p>
                    </article>
                    {pivotMoment && (
                        <article className="ending-afterglow-card">
                            <span className="ending-afterglow-label">关键转折</span>
                            <p>{pivotMoment}</p>
                        </article>
                    )}
                    {report.standoutNpc && (
                        <article className="ending-afterglow-card">
                            <span className="ending-afterglow-label">局中关键人物</span>
                            <p>{report.standoutNpc}</p>
                        </article>
                    )}
                </section>

                <section className="ending-stage animate-fade-in animate-delay-4">
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
                        </div>
                    </aside>

                    <div className="ending-story ending-story--recap">
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
                        </article>
                    </div>
                </section>

                {(gameResult === 'VICTORY' || gameResult === 'DEFEAT_POWER') && (
                    <section className="ending-section animate-fade-in animate-delay-5">
                        <div className="section-heading">
                            <h2>{gameResult === 'VICTORY' ? '十年功业' : '十年回顾'}</h2>
                            <p>情绪落定之后，再回看这十年到底把南北两朝推到了哪里。</p>
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

function getEndingLead(gameResult: GameResult): string {
    if (gameResult === 'VICTORY') return '先让结局落在心上，再回看这十年究竟如何改了天下的气数。'
    if (gameResult === 'DEFEAT_DEATH') return '先看这一页如何收束你的命数，再回望是谁把局势逼到这一步。'
    if (gameResult === 'DEFEAT_INVASION') return '先听江上兵声如何压过十年筹谋，再回看是哪一环先让北周抢到了时机。'
    return '先承认这一局终究未能如愿，再静下来看十年之中究竟差在何处。'
}

function getEndingMemo(gameResult: GameResult, report: EndingReport): string {
    if (report.sceneLabel) return report.sceneLabel
    if (gameResult === 'VICTORY') return '终局不是骤然逆转，而是二十回合里每一次拖慢、每一次稳住、每一次把南陈往上推半步。'
    if (gameResult === 'DEFEAT_DEATH') return '有些结局不是败在最后一刀，而是此前许多回合里，你已经让太多人开始正眼看你。'
    if (gameResult === 'DEFEAT_INVASION') return '真正可怕的从来不是一场大战，而是北周终于找到了提前南下的借口与胆气。'
    return '十年里你并非毫无所得，只是这些所得终究还没重到足以压过北周的底子。'
}

function getSealLabel(gameResult: GameResult): string {
    if (gameResult === 'VICTORY') return '成'
    if (gameResult === 'DEFEAT_DEATH') return '绝'
    if (gameResult === 'DEFEAT_INVASION') return '溃'
    return '憾'
}
