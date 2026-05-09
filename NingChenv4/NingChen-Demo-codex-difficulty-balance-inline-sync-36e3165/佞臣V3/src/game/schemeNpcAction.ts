import type { SchemeNpcActionNarrative, SchemeResult } from './schemeEngine'
import { deriveSpecialSchemeActionProfile } from './schemeSpecialActionProfile'
import type { NationDimensions, NPC, NorthSchemeParseResult, SchemeAction } from './types'

const DIMENSION_LABELS: Record<keyof NationDimensions, string> = {
    finance: '度支账册与库藏',
    grain: '粮道、仓廪与转运',
    military: '军令、军需与兵械调度',
    socialOrder: '民间风声与地方秩序',
    governance: '诏令、案牍与中枢督责',
}

const DIMENSION_KEYWORDS: Record<keyof NationDimensions | 'loyalty', RegExp> = {
    finance: /财政|度支|账|库|饷|钱|出入/u,
    grain: /粮|仓|转运|粮道|仓廪/u,
    military: /军|兵|兵械|军需|部曲|骑|号令/u,
    socialOrder: /民|流言|风声|秩序|州县|地方/u,
    governance: /诏|中枢|案牍|文书|督|调度|权责|名分/u,
    loyalty: /忠诚|离心|朝廷号令|节制|保境|归附/u,
}

const DAMAGE_MECHANISMS: Record<keyof NationDimensions, string> = {
    finance: '度支亏空与库藏断档露出',
    grain: '仓廪亏空与转运迟滞',
    military: '军令迟滞与军需短缺',
    socialOrder: '地方风声扰动',
    governance: '中枢调度受阻',
}

const BENEFIT_MECHANISMS: Record<keyof NationDimensions, string> = {
    finance: '度支拨付归拢、库藏出入更清',
    grain: '粮道转运顺畅、仓廪接续补足',
    military: '军需补给接续、军令更顺',
    socialOrder: '地方风声安定',
    governance: '中枢调度归拢、权责厘清',
}
const MAX_SCHEME_NPC_ACTION_TEXT_LENGTH = 220

type VisibleImpactResult = Pick<
    SchemeResult,
    'success' | 'nationEffects' | 'factionEffects' | 'personEffects' | 'specialAction'
> & Pick<Partial<SchemeResult>, 'relatedImpactSummary' | 'northParse' | 'revealedSecretThread'>

type SchemeNpcActionKind = NonNullable<SchemeNpcActionNarrative['kind']>

export interface SchemeNpcActionValidation {
    accepted: boolean
    reasons: string[]
}

export function sanitizeSchemeNpcActionText(text: string): string {
    const cleaned = text
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/[\r\n]+/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\bJSON\b/gi, '')
        .trim()

    if (cleaned.length < 8) return ''
    if (/[{}\[\]`]/.test(cleaned)) return ''
    if (/萧宝颖.*南陈暗线|南陈内应/.test(cleaned)) return ''

    return cleaned.length > MAX_SCHEME_NPC_ACTION_TEXT_LENGTH
        ? `${cleaned.slice(0, MAX_SCHEME_NPC_ACTION_TEXT_LENGTH - 1)}…`
        : cleaned
}

export function shouldGenerateSchemeNpcAction(result: VisibleImpactResult): boolean {
    return Boolean(getSchemeNpcActionKind(result))
}

function getSchemeNpcActionKind(result: VisibleImpactResult): SchemeNpcActionKind | null {
    if (!result.success) return 'counter'
    if (result.specialAction) return 'move'
    if (Object.values(result.nationEffects).some(isNonZero)) return 'move'
    if (Object.values(result.factionEffects).some(vector => (
        isNonZero(vector?.courtInfluence)
        || isNonZero(vector?.internalStability)
        || isNonZero(vector?.militaryPower)
    ))) return 'move'

    if (
        isNonZero(result.personEffects.loyaltyDelta)
        || isNonZero(result.personEffects.relatedLoyaltyDelta)
        || isNonZero(result.personEffects.militaryPowerDelta)
        || isNonZero(result.personEffects.relatedMilitaryPowerDelta)
    ) return 'move'

    if (isNonZero(result.personEffects.intelDelta)) return 'intel'
    if (isNonZero(result.personEffects.trustDelta) || isNonZero(result.personEffects.relatedTrustDelta)) return 'attitude'

    return null
}

export function validateSchemeNpcActionNarrative(input: {
    text: string
    result: VisibleImpactResult
    targetNpc: NPC
    relatedNpc: NPC | null
}): SchemeNpcActionValidation {
    const reasons: string[] = []
    const text = input.text.trim()

    if (!text) reasons.push('empty')
    if (/[{}\[\]`]/.test(text) || /\bJSON\b|\bsystem\b|prompt|只输出|作为AI/iu.test(text)) {
        reasons.push('json_or_system_text')
    }
    if (/萧宝颖.*南陈暗线|萧宝颖.*南陈内应|南陈内应|南陈暗线/u.test(text)) {
        reasons.push('forbidden_secret_leak')
    }
    if (/太子宇文棣|宇文棣.*(?:太子|少帝|储君|皇帝|陛下)|贺拔琪.*殿下/u.test(text)) {
        reasons.push('canon_title_violation')
    }
    if (!mentionsNpc(text, input.targetNpc)) {
        reasons.push('missing_target_npc')
    }
    if (hasRelatedNpcVisibleDamage(input.result) && input.relatedNpc && !mentionsNpc(text, input.relatedNpc)) {
        reasons.push('missing_related_npc')
    }
    if (getSchemeNpcActionKind(input.result) === 'move' && !matchesPrimaryImpactKeyword(text, input.result)) {
        reasons.push('missing_dimension_keyword')
    }

    return {
        accepted: reasons.length === 0,
        reasons,
    }
}

function mentionsNpc(text: string, npc: NPC): boolean {
    if (text.includes(npc.name)) return true
    return getNpcCanonicalAliases(npc).some(alias => text.includes(alias))
}

function getNpcCanonicalAliases(npc: NPC): string[] {
    switch (npc.id) {
        case 'hebaqí':
            return ['太后', '太后娘娘', '帘前', '本宫']
        case 'yuwendi':
            return ['燕王', '王爷', '左丞相']
        case 'zuting':
            return ['祖相', '右丞相']
        case 'zongai':
            return ['中常侍', '宗常侍']
        case 'linghuelvguang':
            return ['秦国公', '令狐公']
        case 'duguwenyue':
            return ['独孤将军', '澜侯']
        case 'weichimù':
            return ['梁国公', '尉迟公']
        case 'erzhulié':
            return ['尔朱节度', '北庭节度']
        case 'hebaboguì':
            return ['北地公', '贺拔公']
        case 'ansiming':
            return ['安节帅', '卢龙节度']
        default:
            return []
    }
}

export function describeSchemeNpcActionEffects(input: {
    result: VisibleImpactResult
    targetNpc: NPC
    relatedNpc: NPC | null
}): string {
    const pieces: string[] = []

    for (const [dimension, value] of Object.entries(input.result.nationEffects) as Array<[keyof NationDimensions, number | undefined]>) {
        if (!isNonZero(value)) continue
        pieces.push(`北周${DIMENSION_LABELS[dimension]}${formatSigned(value)}`)
    }

    if (isNonZero(input.result.personEffects.loyaltyDelta) && input.targetNpc.powerBase === 'external') {
        pieces.push(`${input.targetNpc.name}忠诚${formatSigned(input.result.personEffects.loyaltyDelta)}`)
    }
    if (isNonZero(input.result.personEffects.militaryPowerDelta) && input.targetNpc.powerBase === 'external') {
        pieces.push(`${input.targetNpc.name}军力${formatSigned(input.result.personEffects.militaryPowerDelta)}`)
    }
    if (input.relatedNpc && isNonZero(input.result.personEffects.relatedLoyaltyDelta) && input.relatedNpc.powerBase === 'external') {
        pieces.push(`${input.relatedNpc.name}忠诚${formatSigned(input.result.personEffects.relatedLoyaltyDelta)}`)
    }
    if (input.relatedNpc && isNonZero(input.result.personEffects.relatedMilitaryPowerDelta) && input.relatedNpc.powerBase === 'external') {
        pieces.push(`${input.relatedNpc.name}军力${formatSigned(input.result.personEffects.relatedMilitaryPowerDelta)}`)
    }
    if (input.result.relatedImpactSummary) {
        pieces.push(input.result.relatedImpactSummary)
    }
    if (isNonZero(input.result.personEffects.trustDelta)) {
        pieces.push(`${input.targetNpc.name}信任${formatSigned(input.result.personEffects.trustDelta)}`)
    }
    if (input.relatedNpc && isNonZero(input.result.personEffects.relatedTrustDelta)) {
        pieces.push(`${input.relatedNpc.name}信任${formatSigned(input.result.personEffects.relatedTrustDelta)}`)
    }
    if (isNonZero(input.result.personEffects.intelDelta)) {
        pieces.push(`暗线${formatSigned(input.result.personEffects.intelDelta)}`)
    }
    if (input.result.specialAction === 'secession') pieces.push(`${input.targetNpc.name}转入割据`)
    if (input.result.specialAction === 'rebellion') pieces.push(`${input.targetNpc.name}转入造反`)

    return pieces.length > 0 ? pieces.join('；') : '无显性数值变化'
}

export function buildSchemeNpcActionNarrative(input: {
    action: SchemeAction
    result: VisibleImpactResult
    targetNpc: NPC
    relatedNpc: NPC | null
}): SchemeNpcActionNarrative | null {
    const kind = getSchemeNpcActionKind(input.result)
    if (!kind) return null

    return {
        text: buildFallbackSchemeNpcActionText(input, kind),
        source: 'fallback',
        kind,
    }
}

function buildFallbackSchemeNpcActionText(input: {
    action: SchemeAction
    result: VisibleImpactResult
    targetNpc: NPC
    relatedNpc: NPC | null
}, kind: SchemeNpcActionKind): string {
    const { action, result, targetNpc, relatedNpc } = input
    const actorName = targetNpc.name
    const relatedName = relatedNpc?.name
    const focus = buildImpactFocus(result)
    const relationClause = relatedName ? `，并把矛头引向${relatedName}` : ''
    const changeClause = buildChangeMechanismClause(result)
    const specialProfile = buildSpecialActionProfile(action, result, targetNpc)

    if (kind === 'counter') {
        return buildCounterActionText(action, actorName, relatedName)
    }

    if (kind === 'attitude') {
        return buildAttitudeActionText(result, actorName, relatedName)
    }

    if (kind === 'intel') {
        const secretCue = summarizeRevealedSecretThread(result.revealedSecretThread)
        return secretCue
            ? `${actorName}在问答间漏出与“${secretCue}”有关的半句口风，你由此摸到一条可追的旧线；这桩线索暂只落在私下，还未转成朝堂动作。`
            : `${actorName}在问答间露出半句口风，你由此摸到一条可追的旧线；这桩线索暂只落在私下，还未转成朝堂动作。`
    }

    if (specialProfile && (action.schemeType === 'frame' || action.schemeType === 'omen')) {
        return `${actorName}${specialProfile.targetMisstep}；${specialProfile.observerScope}借此追看，${specialProfile.damageMechanism}${changeClause}`
    }

    if (result.specialAction === 'secession') {
        return `${actorName}开始把兵粮、关隘与州郡文书分开处置，名义上仍奉北周号令，实则为自保另设一套调度${changeClause}`
    }

    if (result.specialAction === 'rebellion') {
        return `${actorName}召集亲信重排军府号令，先扣住兵粮与关隘，再试探麾下是否愿随他公开举兵${changeClause}`
    }

    switch (action.schemeType) {
        case 'advise':
            return targetNpc.powerBase === 'external'
                ? `${actorName}将所陈落到军府日用上，先改拨${focus}，让局势按对他有利的方向转动${changeClause}`
                : `${actorName}命属吏把所陈拟成可入奏的条陈，先从${focus}下手，借中枢名义重排相关权责${changeClause}`
        case 'slander':
            return relatedName
                ? `${actorName}接过疑点暗查${relatedName}，先扣住${focus}作疑点，再把这份疑心递向御前或帘前${changeClause}`
                : `${actorName}翻检旧账，先扣住${focus}作疑点，让朝中多出一条可被追究的暗线${changeClause}`
        case 'alienate':
            return relatedName
                ? `${actorName}开始疏远${relatedName}的来往文书与人手调度，先在${focus}上另设关口，使旧有协同难以照常运转${changeClause}`
                : `${actorName}把身边旧人重新分出亲疏，先在${focus}上设下关口，使朝堂协同更难维持${changeClause}`
        case 'frame':
            return `${actorName}急于切割自身嫌疑，转而抛出一串可查的${focus}线索${relationClause}，让局面沿着你铺好的方向滑下去${changeClause}`
        case 'proxy':
            return relatedName
                ? `${actorName}没有明言应允，却开始借自己的位置压向${relatedName}，先从${focus}处收紧手脚${changeClause}`
                : `${actorName}没有明言应允，却开始把手中权柄压向目标，先从${focus}处收紧手脚${changeClause}`
        case 'omen':
            return `${actorName}把这道征兆转成可供追查的名分，先令相关人等核验${focus}，使疑云真正落入政务${changeClause}`
        default:
            return `${actorName}把你的话转成可执行的动作，先从${focus}处落手，使这一步计谋不止停在口风上${changeClause}`
    }
}

function summarizeRevealedSecretThread(thread: string | null | undefined): string | null {
    const cleaned = thread?.replace(/[“”"']/g, '').trim()
    if (!cleaned) return null

    const firstClause = cleaned.split(/[；。！？]/u)[0]?.trim() || cleaned
    return firstClause.length > 42 ? `${firstClause.slice(0, 41)}…` : firstClause
}

function buildCounterActionText(action: SchemeAction, actorName: string, relatedName?: string): string {
    switch (action.schemeType) {
        case 'slander':
        case 'alienate':
            return relatedName
                ? `${actorName}听罢先按下话头，命近人收口并反查你与${relatedName}之间的来路，对这份挑拨多留一层戒心。`
                : `${actorName}听罢先按下话头，命近人收口并反查来路，对这份说辞多留一层戒心。`
        case 'frame':
        case 'omen':
            return `${actorName}没有顺着疑云失态，反而冷处理此事，先命属吏封存相关口供与文书，免得自己被拖入局中。`
        case 'proxy':
            return relatedName
                ? `${actorName}没有接下借刀的暗示，反把话头收口，暂不向${relatedName}动手，也对你多了一层防备。`
                : `${actorName}没有接下借刀的暗示，反把话头收口，暂不替你压人，也对你多了一层防备。`
        case 'secession':
        case 'rebellion':
            return `${actorName}听出其中锋芒，先稳住部曲并向朝廷留足表面恭顺，反让你的劝动痕迹显得更扎眼。`
        default:
            return `${actorName}没有真正接下这步话，先把席前口风按住，转而反查来路，对你多留一层戒心。`
    }
}

function buildAttitudeActionText(result: VisibleImpactResult, actorName: string, relatedName?: string): string {
    const trustDelta = result.personEffects.trustDelta
    const relatedTrustDelta = result.personEffects.relatedTrustDelta
    if (isNegative(trustDelta) || isNegative(relatedTrustDelta)) {
        return relatedName
            ? `${actorName}把你这番话记作一层疑处，对${relatedName}未必立刻发作，却先把你放进更需提防的位置。`
            : `${actorName}把你这番话记作一层疑处，面上不动声色，心里却先把你放进更需提防的位置。`
    }

    return relatedName
        ? `${actorName}听出你并非只来索取，暂愿把你看作可用之人；至于${relatedName}，他仍只在心里多记了一笔。`
        : `${actorName}听出你并非只来索取，暂愿把你看作可用之人，把这份私下情面记在心里。`
}

function buildSpecialActionProfile(
    action: SchemeAction,
    result: VisibleImpactResult,
    targetNpc: NPC,
) {
    const parse = result.northParse ?? action.northParse
    if (!parse) return null

    return deriveSpecialSchemeActionProfile({
        schemeType: action.schemeType,
        targetNpc,
        parse: parse as NorthSchemeParseResult,
    })
}

function buildChangeMechanismClause(result: VisibleImpactResult): string {
    const mechanisms = Object.entries(result.nationEffects)
        .filter((entry): entry is [keyof NationDimensions, number] => isNonZero(entry[1]))
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .slice(0, 3)
        .map(([dimension, value]) => value < 0 ? DAMAGE_MECHANISMS[dimension] : BENEFIT_MECHANISMS[dimension])

    if (mechanisms.length === 0) return '。'
    return `，使${Array.from(new Set(mechanisms)).join('、')}。`
}

function buildImpactFocus(result: VisibleImpactResult): string {
    const relatedFocus = extractRelatedImpactFocus(result.relatedImpactSummary)
    if (relatedFocus) return relatedFocus

    const topDimensions = Object.entries(result.nationEffects)
        .filter((entry): entry is [keyof NationDimensions, number] => isNonZero(entry[1]))
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .slice(0, 2)
        .map(([dimension]) => DIMENSION_LABELS[dimension])

    if (topDimensions.length > 0) return topDimensions.join('、')

    if (
        isNonZero(result.personEffects.militaryPowerDelta)
        || isNonZero(result.personEffects.relatedMilitaryPowerDelta)
    ) {
        return '兵力调度与军府号令'
    }

    if (
        isNonZero(result.personEffects.loyaltyDelta)
        || isNonZero(result.personEffects.relatedLoyaltyDelta)
    ) {
        return '忠诚、保境与朝廷号令之间的裂缝'
    }

    return '权责、文书与人手调度'
}

function hasRelatedNpcVisibleDamage(result: VisibleImpactResult): boolean {
    return Boolean(
        result.relatedImpactSummary
        || isNegative(result.personEffects.relatedTrustDelta)
        || isNegative(result.personEffects.relatedLoyaltyDelta)
        || isNegative(result.personEffects.relatedMilitaryPowerDelta),
    )
}

function matchesPrimaryImpactKeyword(text: string, result: VisibleImpactResult): boolean {
    const primaryDimensions = getPrimaryImpactDimensions(result)
    if (primaryDimensions.length === 0) return true
    return primaryDimensions.some(dimension => DIMENSION_KEYWORDS[dimension].test(text))
}

function getPrimaryImpactDimensions(result: VisibleImpactResult): Array<keyof NationDimensions | 'loyalty'> {
    const topNationDimensions = Object.entries(result.nationEffects)
        .filter((entry): entry is [keyof NationDimensions, number] => isNonZero(entry[1]))
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .slice(0, 2)
        .map(([dimension]) => dimension)

    if (topNationDimensions.length > 0) return topNationDimensions

    if (
        isNonZero(result.personEffects.militaryPowerDelta)
        || isNonZero(result.personEffects.relatedMilitaryPowerDelta)
    ) {
        return ['military']
    }

    if (
        isNonZero(result.personEffects.loyaltyDelta)
        || isNonZero(result.personEffects.relatedLoyaltyDelta)
    ) {
        return ['loyalty']
    }

    if (result.specialAction === 'secession' || result.specialAction === 'rebellion') {
        return ['military', 'governance']
    }

    return []
}

function extractRelatedImpactFocus(summary: string | null | undefined): string {
    if (!summary) return ''
    const match = summary.match(/的(.+?)受牵动/u)
    return match?.[1]?.trim() ?? ''
}

function isNonZero(value: number | undefined): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value !== 0
}

function isNegative(value: number | undefined): boolean {
    return typeof value === 'number' && Number.isFinite(value) && value < 0
}

function formatSigned(value: number): string {
    return `${value > 0 ? '+' : ''}${Math.round(value * 10) / 10}`
}
