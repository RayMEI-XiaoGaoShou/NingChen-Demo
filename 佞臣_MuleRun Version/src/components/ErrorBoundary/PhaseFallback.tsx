import { useMemo } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { getRelativePowerLabel } from '../../game/relativePower'
import { getSettlementPolicyFollowupText } from '../Settlement/Settlement'
import { RUNTIME_ERROR_STORAGE_KEY } from './PhaseErrorBoundary'

interface CapturedRuntimeError {
    phaseName?: string
    message?: string
    stack?: string
    componentStack?: string
    capturedAt?: string
}

function useCapturedRuntimeError(expectedPhaseName: string): CapturedRuntimeError | null {
    return useMemo(() => {
        try {
            const raw = localStorage.getItem(RUNTIME_ERROR_STORAGE_KEY)
            if (!raw) return null

            const parsed = JSON.parse(raw) as CapturedRuntimeError
            if (parsed.phaseName && parsed.phaseName !== expectedPhaseName) {
                return null
            }

            return parsed
        } catch {
            return null
        }
    }, [expectedPhaseName])
}

export function PhaseCrashFallback({ phaseName }: { phaseName: string }) {
    const currentRound = useGameStore(state => state.currentRound)
    const resetGame = useGameStore(state => state.resetGame)
    const capturedError = useCapturedRuntimeError(phaseName)

    return (
        <div className="page-container animate-fade-in">
            <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
                <h2 className="page-title">页面暂时异常</h2>
                <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
                    当前处于第 {currentRound} 回合的 {phaseName} 阶段。页面渲染时发生异常，建议先重开本局或刷新后继续上局。
                </p>
                <button className="btn-secondary" onClick={resetGame}>
                    重新开局
                </button>
                {capturedError?.message && (
                    <div style={{ marginTop: '16px', textAlign: 'left' }}>
                        <h3 className="section-title">错误信息</h3>
                        <p style={{ color: 'var(--color-danger-light)', lineHeight: 1.8 }}>
                            {capturedError.message}
                        </p>
                        {capturedError.stack && (
                            <pre style={{ whiteSpace: 'pre-wrap', color: 'var(--color-text-dim)', fontSize: '12px', lineHeight: 1.6 }}>
                                {capturedError.stack.split('\n').slice(0, 3).join('\n')}
                            </pre>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export function SettlementCrashFallback() {
    const nextPhase = useGameStore(state => state.nextPhase)
    const lastSettlement = useGameStore(state => state.lastSettlement)
    const northPower = useGameStore(state => state.northPower)
    const southPower = useGameStore(state => state.southPower)
    const capturedError = useCapturedRuntimeError('SETTLEMENT')

    return (
        <div className="page-container animate-fade-in">
            <div className="glass-panel" style={{ padding: '24px' }}>
                <h2 className="page-title">本回合结算</h2>
                <p style={{ color: 'var(--color-warning-light)', lineHeight: 1.8, marginBottom: '16px' }}>
                    结算页加载时出现异常，已切换为简化结算。这不会影响继续推进本局。
                </p>

                <div style={{ display: 'grid', gap: '16px' }}>
                    <section>
                        <h3 className="section-title">天道判辞</h3>
                        <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
                            {lastSettlement?.summaryText ?? '本回合结算已完成，可继续推进。'}
                        </p>
                    </section>

                    {lastSettlement?.policyReport && (
                        <section>
                            <h3 className="section-title">南陈回信</h3>
                            <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
                                本回合采纳 {lastSettlement.policyReport.optionLabel}. {lastSettlement.policyReport.optionContent}
                            </p>
                            <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
                                {lastSettlement.policyReport.effectSummary}
                            </p>
                            {lastSettlement.policyAftereffect && (
                                <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
                                    {getSettlementPolicyFollowupText(lastSettlement.policyReport.focusMatched)}
                                </p>
                            )}
                        </section>
                    )}

                    <section>
                        <h3 className="section-title">大局推演</h3>
                        <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
                            南陈相对北周：{getRelativePowerLabel(northPower, southPower)}
                        </p>
                    </section>
                </div>

                <button className="btn-primary" onClick={nextPhase}>
                    继续
                </button>
                {capturedError?.message && (
                    <div style={{ marginTop: '20px' }}>
                        <h3 className="section-title">错误信息</h3>
                        <p style={{ color: 'var(--color-danger-light)', lineHeight: 1.8 }}>
                            {capturedError.message}
                        </p>
                        {capturedError.stack && (
                            <pre style={{ whiteSpace: 'pre-wrap', color: 'var(--color-text-dim)', fontSize: '12px', lineHeight: 1.6 }}>
                                {capturedError.stack.split('\n').slice(0, 4).join('\n')}
                            </pre>
                        )}
                        {capturedError.componentStack && (
                            <pre style={{ whiteSpace: 'pre-wrap', color: 'var(--color-text-dim)', fontSize: '12px', lineHeight: 1.6 }}>
                                {capturedError.componentStack.split('\n').slice(0, 4).join('\n')}
                            </pre>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
