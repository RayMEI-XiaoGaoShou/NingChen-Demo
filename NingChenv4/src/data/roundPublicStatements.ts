import statementsMarkdown from './roundPublicStatements.md?raw'
import type { CampaignOutcomeState } from '../game/types'

type StatementVariantKey = 'default' | Exclude<CampaignOutcomeState, 'idle'>

type RoundStatementMap = Record<number, Partial<Record<StatementVariantKey, Record<string, string>>>>

export interface RoundStatementContext {
    shuCampaignState?: CampaignOutcomeState | null
    huainanCampaignState?: CampaignOutcomeState | null
}

function normalizeVariantFromHeading(heading: string): Exclude<StatementVariantKey, 'default'> {
    if (heading.includes('战胜')) return 'gained'
    if (heading.includes('僵持')) return 'stalemate'
    return 'failed'
}

function parseRoundPublicStatements(markdown: string): RoundStatementMap {
    const roundMap: RoundStatementMap = {}
    let currentRound: number | null = null
    let currentVariant: StatementVariantKey = 'default'

    for (const rawLine of markdown.split(/\r?\n/)) {
        const line = rawLine.trim()
        if (!line) continue

        const variantMatch = line.match(/^### 第 (\d+) 回合 [A-Z]：(.*)$/)
        if (variantMatch) {
            currentRound = Number(variantMatch[1])
            currentVariant = normalizeVariantFromHeading(variantMatch[2])
            continue
        }

        const roundMatch = line.match(/^## 第 (\d+) 回合/)
        if (roundMatch) {
            currentRound = Number(roundMatch[1])
            currentVariant = 'default'
            continue
        }

        if (!currentRound || !line.startsWith('|')) continue
        if (/^\|\s*角色\s*\|/.test(line) || /^\|\s*-+\s*\|/.test(line)) continue

        const cells = line
            .split('|')
            .slice(1, -1)
            .map(cell => cell.trim())

        if (cells.length < 3) continue

        const [roleName, , improvedStatement] = cells
        if (!roleName || !improvedStatement) continue

        const roundStatements = roundMap[currentRound] ?? (roundMap[currentRound] = {})
        const variantStatements = roundStatements[currentVariant] ?? (roundStatements[currentVariant] = {})
        variantStatements[roleName] = improvedStatement
    }

    return roundMap
}

function resolveRoundVariant(round: number, context: RoundStatementContext): StatementVariantKey {
    if (round === 11) {
        return context.shuCampaignState && context.shuCampaignState !== 'idle'
            ? context.shuCampaignState
            : 'stalemate'
    }

    if (round === 17) {
        return context.huainanCampaignState && context.huainanCampaignState !== 'idle'
            ? context.huainanCampaignState
            : 'stalemate'
    }

    return 'default'
}

const ROUND_PUBLIC_STATEMENTS = parseRoundPublicStatements(statementsMarkdown)

export function getRoundPublicStatement(
    round: number,
    roleName: string,
    context: RoundStatementContext = {},
): string | undefined {
    const statementsForRound = ROUND_PUBLIC_STATEMENTS[round]
    if (!statementsForRound) return undefined

    const variant = resolveRoundVariant(round, context)
    return statementsForRound[variant]?.[roleName] ?? statementsForRound.default?.[roleName]
}

export function getParsedRoundPublicStatements(): RoundStatementMap {
    return ROUND_PUBLIC_STATEMENTS
}
