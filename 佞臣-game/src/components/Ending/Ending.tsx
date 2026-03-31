// ========================================
// 结局页 — P1 更新
// 从 gameStore 直接获取所有数据
// ========================================

import { useGameStore } from '../../stores/gameStore'
import { getPowerLabel } from '../../game/types'
import type { GameResult } from '../../game/types'
import './Ending.css'

const ENDING_TEXT: Record<GameResult, { title: string; description: string; flavor: string }> = {
    NONE: { title: '', description: '', flavor: '' },
    VICTORY: {
        title: '南 风 压 北',
        description: '二十年暗棋落定。南陈综合国力终于超越北周，女帝陈倩挥师北伐，一统天下。',
        flavor: '你，萧宝颖，这个潜伏在北周朝堂二十年的佞臣，终于完成了此生最大的使命。那些权谋、算计、背叛、隐忍……都在这一刻有了意义。',
    },
    DEFEAT_DEATH: {
        title: '身 死 朝 堂',
        description: '你的身份被识破，或你的敌人终于无法容忍你的存在。',
        flavor: '萧宝颖的故事在北周的朝堂上画上了句号。没有人知道他为南陈做了什么，也没有人会记得这个来自南方的佞臣。',
    },
    DEFEAT_INVASION: {
        title: '铁 骑 南 下',
        description: '北周提前发动南伐。南陈尚未做好准备，无力抵挡北方铁骑。',
        flavor: '你未能阻止北周的南征铁蹄。女帝的十年之约化为泡影，南陈的复兴之梦就此破灭。',
    },
    DEFEAT_POWER: {
        title: '力 有 未 逮',
        description: '二十回合结束，南陈综合国力仍未超越北周。北伐终成空谈。',
        flavor: '你尽力了，但不够。北周虽被你搅得风声鹤唳，终究根基太深。南陈的梦想，还要再等下一个二十年。',
    },
}

export function Ending() {
    const {
        gameResult,
        northPower,
        southPower,
        resetGame,
        restoreRoundStartSnapshot,
        roundStartSnapshot,
        lastSettlement,
        endingReport,
        battleReport,
    } = useGameStore()
    const ending = ENDING_TEXT[gameResult]
    const isVictory = gameResult === 'VICTORY'
    const canRetryCurrentRound =
        Boolean(roundStartSnapshot) &&
        (gameResult === 'DEFEAT_DEATH' || gameResult === 'DEFEAT_INVASION')

    return (
        <div className={`page-container ending animate-fade-in ${isVictory ? 'victory' : 'defeat'}`}>
            <div className="ending-overlay"></div>

            <div className="ending-content">
                <h1 className="ending-title animate-slide-up">
                    {ending.title.split('').map((char, i) => (
                        <span key={i} className="title-char" style={{ animationDelay: `${0.2 + i * 0.15}s` }}>
                            {char}
                        </span>
                    ))}
                </h1>

                <div className="ending-narrative animate-fade-in animate-delay-2">
                    <p className="ending-description">{ending.description}</p>
                    {endingReport && <p className="ending-tier">{endingReport.title} · {endingReport.tier}</p>}

                    {gameResult === 'DEFEAT_DEATH' && lastSettlement?.deathKiller && (
                        <p className="ending-detail death-reason">
                            <span className="blood-mark">『</span>
                            你被 {lastSettlement.deathKiller} 所害。
                            <span className="blood-mark">』</span>
                        </p>
                    )}

                    <p className="ending-flavor">{ending.flavor}</p>
                </div>

                <div className="power-comparison animate-slide-up animate-delay-4">
                    <div className="power-column north">
                        <span className="power-nation">北周国力</span>
                        <div className="power-value-box">
                            <span className="power-number">{northPower.toFixed(1)}</span>
                            <span className="power-tag">{getPowerLabel(northPower)}</span>
                        </div>
                    </div>

                    <div className="power-vs">
                        <div className="vs-line"></div>
                        <span className="vs-text">决</span>
                        <div className="vs-line"></div>
                    </div>

                    <div className="power-column south">
                        <span className="power-nation">南陈国力</span>
                        <div className="power-value-box">
                            <span className="power-number">{southPower.toFixed(1)}</span>
                            <span className="power-tag">{getPowerLabel(southPower)}</span>
                        </div>
                    </div>
                </div>

                {endingReport && (
                    <div className="ending-report animate-fade-in animate-delay-4">
                        <section className="report-panel">
                            <h3>终局成因</h3>
                            {endingReport.causeSummary.map(item => (
                                <p key={item} className="report-line">{item}</p>
                            ))}
                        </section>

                        <section className="report-panel">
                            <h3>势力终局</h3>
                            {endingReport.factionOutlook.map(item => (
                                <p key={item} className="report-line">{item}</p>
                            ))}
                        </section>

                        <section className="report-panel">
                            <h3>核心人物命运</h3>
                            {endingReport.npcFates.map(item => (
                                <p key={item.npcId} className="report-line">{item.summary}</p>
                            ))}
                        </section>

                        <section className="report-panel">
                            <h3>本局摘要</h3>
                            {endingReport.statsSummary.map(item => (
                                <p key={item} className="report-line">{item}</p>
                            ))}
                        </section>
                    </div>
                )}

                {battleReport && (
                    <div className="ending-report animate-fade-in animate-delay-4">
                        <section className="report-panel">
                            <h3>关键转折</h3>
                            {battleReport.pivotMoments.map(item => (
                                <p key={item} className="report-line">{item}</p>
                            ))}
                        </section>

                        <section className="report-panel">
                            <h3>施计轨迹</h3>
                            {battleReport.schemeSummary.map(item => (
                                <p key={item} className="report-line">{item}</p>
                            ))}
                        </section>

                        <section className="report-panel">
                            <h3>问政路线</h3>
                            {battleReport.policySummary.map(item => (
                                <p key={item} className="report-line">{item}</p>
                            ))}
                        </section>

                        <section className="report-panel">
                            <h3>危局节点</h3>
                            {battleReport.dangerMoments.map(item => (
                                <p key={item} className="report-line">{item}</p>
                            ))}
                        </section>
                    </div>
                )}

                <div className="action-footer animate-fade-in animate-delay-5">
                    {canRetryCurrentRound && (
                        <button className="btn-secondary btn-restart" onClick={restoreRoundStartSnapshot}>
                            回到本回合初
                        </button>
                    )}
                    <button className="btn-primary btn-restart" onClick={resetGame}>
                        重 启 宿 命
                    </button>
                </div>
            </div>
        </div>
    )
}
