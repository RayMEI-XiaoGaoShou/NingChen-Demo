import { ROUND_START_RICH_BRIEFINGS } from '../data/roundStartRichBriefings'
import { getParsedRoundPublicStatements } from '../data/roundPublicStatements'

const ROUND_START_CHARS_PER_LINE = 66
const ROUND_START_SAFE_TOTAL_LINES = 7
const ROUND_START_SAFE_PARAGRAPH_CHARS = 260

const PUBLIC_STATEMENT_CHARS_PER_LINE = 10
const PUBLIC_STATEMENT_SAFE_LINES = 8
const PUBLIC_STATEMENT_SAFE_CHARS = 78

export interface RoundStartTextCapacityAuditItem {
    round: number
    paragraphCount: number
    totalChars: number
    maxParagraphChars: number
    estimatedLines: number
    maxEstimatedLines: number
    exceedsSafeBudget: boolean
}

export interface PublicStatementTextCapacityAuditItem {
    round: number
    variant: string
    roleName: string
    charCount: number
    estimatedLines: number
    exceedsSafeBudget: boolean
}

function getWeightedDisplayLength(text: string): number {
    const normalized = text
        .replace(/\*\*/g, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, '')

    return Array.from(normalized).reduce((total, char) => {
        if (/[\x00-\x7F]/.test(char)) return total + 0.55
        if (/[，。？！、；：“”‘’（）《》【】·]/.test(char)) return total + 0.78
        return total + 1
    }, 0)
}

function estimateLines(text: string, charsPerLine: number): number {
    return Math.max(1, Math.ceil(getWeightedDisplayLength(text) / charsPerLine))
}

export function getRoundStartTextCapacityAudit(): RoundStartTextCapacityAuditItem[] {
    return Object.entries(ROUND_START_RICH_BRIEFINGS)
        .map(([roundKey, briefing]) => {
            const paragraphs = briefing.split(/\r?\n/).map(paragraph => paragraph.trim()).filter(Boolean)
            const paragraphChars = paragraphs.map(getWeightedDisplayLength)
            const paragraphLines = paragraphs.map(paragraph => estimateLines(paragraph, ROUND_START_CHARS_PER_LINE))
            const totalChars = Math.ceil(paragraphChars.reduce((sum, value) => sum + value, 0))
            const maxParagraphChars = Math.ceil(Math.max(...paragraphChars, 0))
            const estimatedLines = paragraphLines.reduce((sum, value) => sum + value, 0)
            const maxEstimatedLines = Math.max(...paragraphLines, 0)

            return {
                round: Number(roundKey),
                paragraphCount: paragraphs.length,
                totalChars,
                maxParagraphChars,
                estimatedLines,
                maxEstimatedLines,
                exceedsSafeBudget:
                    estimatedLines > ROUND_START_SAFE_TOTAL_LINES ||
                    maxParagraphChars > ROUND_START_SAFE_PARAGRAPH_CHARS,
            }
        })
        .sort((a, b) => a.round - b.round)
}

export function getRoundPublicStatementTextCapacityAudit(): PublicStatementTextCapacityAuditItem[] {
    const statements = getParsedRoundPublicStatements()
    const audit: PublicStatementTextCapacityAuditItem[] = []

    for (const [roundKey, variants] of Object.entries(statements)) {
        for (const [variant, roleStatements] of Object.entries(variants)) {
            if (!roleStatements) continue

            for (const [roleName, statement] of Object.entries(roleStatements)) {
                const charCount = Math.ceil(getWeightedDisplayLength(statement))
                const estimatedLines = estimateLines(statement, PUBLIC_STATEMENT_CHARS_PER_LINE)

                audit.push({
                    round: Number(roundKey),
                    variant,
                    roleName,
                    charCount,
                    estimatedLines,
                    exceedsSafeBudget:
                        estimatedLines > PUBLIC_STATEMENT_SAFE_LINES ||
                        charCount > PUBLIC_STATEMENT_SAFE_CHARS,
                })
            }
        }
    }

    return audit.sort((a, b) => (
        a.round - b.round ||
        a.variant.localeCompare(b.variant) ||
        a.roleName.localeCompare(b.roleName)
    ))
}
