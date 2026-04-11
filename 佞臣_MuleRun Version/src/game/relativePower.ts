// ========================================
// 南北国力相对播报
// ========================================

/**
 * 根据北-南综合国力差，返回玩家可见的定性描述
 */
export function getRelativePowerLabel(northPower: number, southPower: number): string {
    const diff = northPower - southPower // 正值=北周强于南陈

    if (diff >= 30) return '极其弱势'
    if (diff >= 20) return '明显弱势'
    if (diff >= 10) return '略处下风'
    if (diff >= 5) return '势均力敌（略逊）'
    if (diff >= -5) return '势均力敌'
    if (diff >= -10) return '略占上风'
    return '南陈优势'
}

/**
 * 返回对应的 CSS 级别名（用于着色）
 */
export function getRelativePowerLevel(northPower: number, southPower: number): string {
    const diff = northPower - southPower
    if (diff >= 20) return 'danger'
    if (diff >= 5) return 'warning'
    if (diff >= -5) return 'neutral'
    return 'safe'
}
