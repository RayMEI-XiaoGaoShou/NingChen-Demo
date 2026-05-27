export interface ChronicleTimeLabels {
    north: string
    south: string
}

const CHRONICLE_TIME_LABELS: ChronicleTimeLabels[] = [
    { north: '北周建文五年初春', south: '南陈天嘉元年季春' },
    { north: '北周建文五年仲秋', south: '南陈天嘉元年仲秋' },
    { north: '北周建文六年仲春', south: '南陈天嘉二年仲春' },
    { north: '北周建文六年季秋', south: '南陈天嘉二年季秋' },
    { north: '北周建文七年暮春', south: '南陈天嘉三年暮春' },
    { north: '北周建文七年初冬', south: '南陈天嘉三年初冬' },
    { north: '北周建文八年孟夏', south: '南陈天嘉四年孟夏' },
    { north: '北周建文八年仲秋', south: '南陈天嘉四年仲秋' },
    { north: '北周建文九年季春', south: '南陈天嘉五年季春' },
    { north: '北周建文九年孟冬', south: '南陈天嘉五年孟冬' },
    { north: '北周建文十年仲春', south: '南陈天嘉六年仲春' },
    { north: '北周建文十年孟冬', south: '南陈天嘉六年孟冬' },
    { north: '北周建文十一年暮春', south: '南陈天嘉七年暮春' },
    { north: '北周建文十一年季秋', south: '南陈天嘉七年季秋' },
    { north: '北周建文十二年仲春', south: '南陈天嘉八年仲春' },
    { north: '北周建文十二年孟秋', south: '南陈天嘉八年孟秋' },
    { north: '北周建文十三年暮春', south: '南陈天嘉九年暮春' },
    { north: '北周建文十三年季秋', south: '南陈天嘉九年季秋' },
    { north: '北周建文十四年仲春', south: '南陈天嘉十年仲春' },
    { north: '北周建文十四年孟冬', south: '南陈天嘉十年孟冬' },
]

export function getChronicleTimeLabels(round: number): ChronicleTimeLabels {
    return CHRONICLE_TIME_LABELS[round - 1] ?? {
        north: `北周建文年间第${round}回合`,
        south: `南陈天嘉年间第${round}回合`,
    }
}

export function sanitizeChronicleNarration(
    rawText: string,
    labels: ChronicleTimeLabels,
    maxChars = 300,
): string {
    const cleaned = rawText
        .trim()
        .replace(/^["“”'‘’\s]+|["“”'‘’\s]+$/g, '')
        .replace(/^《南北朝通鉴[^》]*》\s*/u, '')
        .replace(/^南北朝通鉴[^，。！？\n]*[：:，。]?\s*/u, '')

    const withNorthOpening = normalizeChronicleOpening(cleaned, labels)
    return truncateAtSentence(withNorthOpening, maxChars)
}

function normalizeChronicleOpening(text: string, labels: ChronicleTimeLabels): string {
    const withoutCombinedLabel = text
        .replace(/^北?周?建文[^，。！？；;、\s]*[上下]?\s*[/／]\s*南?陈?天嘉[^，。！？；;、\s]*[上下]?\s*/u, '')
        .replace(/^建文[^，。！？；;、\s]*[上下]?\s*[/／]\s*天嘉[^，。！？；;、\s]*[上下]?\s*/u, '')
        .replace(/^北周建文[^，。！？；;、\s]*[上下]\s*/u, '')
        .replace(/^建文[^，。！？；;、\s]*[上下]\s*/u, '')

    if (withoutCombinedLabel.startsWith(labels.north)) {
        return withoutCombinedLabel
    }

    const trimmed = stripDuplicateLeadingSeason(
        withoutCombinedLabel.replace(/^[，,、。\s]+/u, ''),
        labels.north,
    )
    return `${labels.north}，${trimmed}`
}

function stripDuplicateLeadingSeason(text: string, northLabel: string): string {
    const season = [
        '初春',
        '仲春',
        '暮春',
        '季春',
        '孟夏',
        '仲夏',
        '季夏',
        '孟秋',
        '仲秋',
        '季秋',
        '初冬',
        '孟冬',
        '仲冬',
        '季冬',
    ].find(item => northLabel.endsWith(item))

    if (!season) return text
    return text.replace(new RegExp(`^${season}[，,、。\\s]*`, 'u'), '')
}

function truncateAtSentence(text: string, maxChars: number): string {
    if (text.length <= maxChars) return ensureTerminalPunctuation(text)

    const candidate = text.slice(0, maxChars)
    const lastStop = Math.max(
        candidate.lastIndexOf('。'),
        candidate.lastIndexOf('！'),
        candidate.lastIndexOf('？'),
    )

    if (lastStop >= Math.max(20, Math.floor(maxChars * 0.55))) {
        return candidate.slice(0, lastStop + 1)
    }

    return ensureTerminalPunctuation(candidate.replace(/[，,、；;：:\s]+$/u, ''))
}

function ensureTerminalPunctuation(text: string): string {
    const trimmed = text.trim()
    if (!trimmed) return trimmed
    return /[。！？]$/u.test(trimmed) ? trimmed : `${trimmed}。`
}
