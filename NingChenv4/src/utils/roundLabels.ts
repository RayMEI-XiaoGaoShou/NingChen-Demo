const CHINESE_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']

export function toChineseNumber(value: number): string {
    if (value <= 10) return CHINESE_DIGITS[value] ?? String(value)
    if (value < 20) return `十${CHINESE_DIGITS[value - 10]}`
    if (value < 100) {
        const tens = Math.floor(value / 10)
        const ones = value % 10
        return `${CHINESE_DIGITS[tens]}十${ones > 0 ? CHINESE_DIGITS[ones] : ''}`
    }

    return String(value)
}

export function formatRoundVolumeLabel(round: number): string {
    return `第${toChineseNumber(round)}卷`
}
