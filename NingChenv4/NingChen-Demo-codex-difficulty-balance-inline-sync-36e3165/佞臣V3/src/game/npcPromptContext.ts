import { INITIAL_FACTIONS } from '../data/factions'
import { INITIAL_NPCS } from '../data/npcs'
import {
    buildNpcLongTermMemorySummary as buildGenericNpcLongTermMemorySummary,
    rankNpcMemoryEntriesForScheme,
} from './npcMemoryLedger'
import { isCourtDispositionTarget, normalizeCourtDispositionNpc } from './courtDisposition'
import type { DelayedBacklash, Faction, NPC, NpcMemoryLedger, RoundHistoryEntry, SchemeType } from './types'

const SCHEME_NAMES: Record<SchemeType, string> = {
    probe: '试探',
    advise: '献策',
    slander: '谗言',
    alienate: '离间',
    frame: '设局嫁祸',
    proxy: '借刀',
    appeal: '求援',
    omen: '谶纬',
    secession: '煽动割据',
    rebellion: '煽动造反',
}

const SOFT_TOUCH_SCHEMES = new Set<SchemeType>(['probe', 'advise', 'appeal'])
const HARD_TOUCH_SCHEMES = new Set<SchemeType>(['slander', 'alienate', 'frame', 'proxy', 'omen', 'secession', 'rebellion'])

export interface NpcPromptDynamicContext {
    previousDealings: string
    relationshipTemperature: string
    recentCourtFortune: string
    factionPressure: string
    longTermMemorySummary: string
}

const initialNpcMap = new Map(INITIAL_NPCS.map(npc => [npc.id, npc]))
const initialFactionMap = new Map(INITIAL_FACTIONS.map(faction => [faction.id, faction]))

export function buildNpcPromptDynamicContext(params: {
    npc: NPC
    factions: Faction[]
    roundHistory: RoundHistoryEntry[]
    recentBacklash?: DelayedBacklash[]
    npcMemoryLedger?: NpcMemoryLedger
    currentRound?: number
    schemeType?: SchemeType
}): NpcPromptDynamicContext {
    const {
        npc,
        factions,
        roundHistory,
        recentBacklash = [],
        npcMemoryLedger = {},
        currentRound = (roundHistory[roundHistory.length - 1]?.round ?? 0) + 1,
        schemeType,
    } = params

    return {
        previousDealings: describePreviousDealings(npc, roundHistory),
        relationshipTemperature: describeRelationshipTemperature(npc, roundHistory),
        recentCourtFortune: describeRecentCourtFortune(npc, factions, recentBacklash),
        factionPressure: describeFactionPressure(npc, factions),
        longTermMemorySummary: buildNpcLongTermMemorySummaryForPrompt({
            npcId: npc.id,
            ledger: npcMemoryLedger,
            currentRound,
            schemeType,
        }),
    }
}

function buildNpcLongTermMemorySummaryForPrompt(params: {
    npcId: string
    ledger: NpcMemoryLedger
    currentRound: number
    schemeType?: SchemeType
    limit?: number
}): string {
    const limit = params.limit ?? 3
    const entries = params.ledger[params.npcId] ?? []
    if (entries.length === 0) return ''

    if (!params.schemeType) {
        return buildGenericNpcLongTermMemorySummary({
            npcId: params.npcId,
            ledger: params.ledger,
            currentRound: params.currentRound,
            limit,
        })
    }

    const ranked = rankNpcMemoryEntriesForScheme({
        entries,
        schemeType: params.schemeType,
        currentRound: params.currentRound,
        limit,
    })

    return ranked.map(entry => entry.summary).join('；')
}

function describePreviousDealings(npc: NPC, roundHistory: RoundHistoryEntry[]): string {
    const lastRound = roundHistory[roundHistory.length - 1]
    if (!lastRound) return '上一回合你尚未与他正面过手。'

    const schemeNote = lastRound.schemeDetails?.find(item => item.targetNpcId === npc.id)
    if (schemeNote) {
        return `上一回合你曾以“${SCHEME_NAMES[schemeNote.schemeType]}”试他，${schemeNote.success ? '而且已然得手。' : '却并未奏效。'}`
    }

    if (lastRound.keyTargets.includes(npc.name)) {
        return '上一回合你曾把手伸到他身上，只是这一手的得失已混在群臣反应里。'
    }

    return '上一回合你未曾专门碰他。'
}

function describeRelationshipTemperature(npc: NPC, roundHistory: RoundHistoryEntry[]): string {
    const recentNotes = roundHistory
        .slice(-2)
        .flatMap(entry => entry.schemeDetails ?? [])
        .filter(item => item.targetNpcId === npc.id)

    if (recentNotes.length === 0) {
        return '近两回合你对他尚未形成稳定手法，他还在重新掂量你的来意。'
    }

    const softCount = recentNotes.filter(item => SOFT_TOUCH_SCHEMES.has(item.schemeType)).length
    const hardCount = recentNotes.filter(item => HARD_TOUCH_SCHEMES.has(item.schemeType)).length
    const successCount = recentNotes.filter(item => item.success).length

    if (softCount >= 2 && hardCount === 0) {
        return successCount >= 1
            ? '近两回合你多以安抚和引导近他，所以他对你的口风会更留心几分。'
            : '近两回合你多以温手法试探拉拢，他未必尽信，却已察觉你不是来硬碰的。'
    }

    if (hardCount >= 2 && softCount === 0) {
        return successCount >= 1
            ? '近两回合你连番敲打逼压，他嘴上未必认，心里却不会全当作耳旁风。'
            : '近两回合你对他多是敲打与逼压，所以他大抵会先防着你再开口。'
    }

    if (softCount > 0 && hardCount > 0) {
        return '近两回合你时而拉拢、时而敲打，他眼下最拿不准的正是你究竟想把他往哪边推。'
    }

    return '近两回合你对他的试探仍偏零碎，他会先看你这一回合究竟是来示好，还是来逼宫。'
}

function describeRecentCourtFortune(
    npc: NPC,
    factions: Faction[],
    recentBacklash: DelayedBacklash[],
): string {
    const backlash = recentBacklash.find(item => item.npcId === npc.id)
    if (backlash) {
        return `近来${stripTailPunctuation(backlash.summary)}。`
    }

    const courtFavorFortune = describeCourtFavorFortune(npc)
    if (courtFavorFortune) return courtFavorFortune

    const initialNpc = initialNpcMap.get(npc.id)
    const ownFaction = npc.factionId === 'emperor' || npc.factionId === 'empress'
        ? factions.find(item => item.id === npc.factionId)
        : null
    const initialFaction = ownFaction ? initialFactionMap.get(ownFaction.id) : null

    if (npc.powerBase === 'court' && ownFaction && initialFaction) {
        const momentum =
            (ownFaction.courtInfluence - initialFaction.courtInfluence) +
            (ownFaction.internalStability - initialFaction.internalStability)

        if (momentum >= 8) {
            return `${ownFaction.name}近来在朝中声势上扬，他说话的底气也比往日更足。`
        }
        if (momentum <= -8) {
            return `${ownFaction.name}近来在朝中吃了亏，他如今比往日更在意先看风向。`
        }
    }

    if (npc.powerBase === 'external') {
        if (npc.externalStatus === 'secession') {
            return `${npc.name}如今已坐实地方自雄，朝廷对他更多是名义羁縻。`
        }
        if (npc.externalStatus === 'rebellion') {
            return `${npc.name}近来已把局面闹到明处，朝廷与边镇都在盯着他的下一步。`
        }
        if (npc.externalStatus === 'watchful') {
            return `${npc.name}近来边心浮动，既想抬价，也不愿过早把底牌全摊出来。`
        }
    }

    if (initialNpc) {
        const loyaltyDelta = npc.loyaltyToCourt - initialNpc.loyaltyToCourt
        if (loyaltyDelta <= -12) {
            return `${npc.name}近来对朝廷离心更重，口风也比往日更硬。`
        }
        if (loyaltyDelta >= 10) {
            return `${npc.name}近来重新向中枢靠拢，说话时比往日更顾朝廷体面。`
        }
    }

    return npc.powerBase === 'external'
        ? `${npc.name}手里仍握着地方兵权，眼下并不愿让朝中看轻自己。`
        : `${npc.name}近来并无大起大落，但座次与脸面仍要处处计较。`
}

function describeCourtFavorFortune(npc: NPC): string | null {
    if (!isCourtDispositionTarget(npc.id)) return null

    const courtNpc = normalizeCourtDispositionNpc(npc)
    if (courtNpc.courtStatus === 'dismissed') {
        return `${courtNpc.name}已被罢黜离席，仍留性命，却再难在朝堂上替任何一边撑住局面。`
    }
    if (courtNpc.courtStatus === 'executed') {
        return `${courtNpc.name}已被处决，旧日席位只剩余波，旁人提起时也会格外避讳。`
    }

    if (courtNpc.emperorFavor <= 18 && courtNpc.empressDowagerFavor <= 18) {
        return `${courtNpc.name}近来已到两边都不愿保的地步，言行间难免露出穷途之气。`
    }
    if (courtNpc.emperorFavor <= 35 && courtNpc.empressDowagerFavor <= 35) {
        return `${courtNpc.name}近来御前恩宠与帘前眷顾都在往下掉，说话时比往日更怕失足。`
    }
    if (courtNpc.emperorFavor <= 35) {
        return `${courtNpc.name}近来御前恩宠已薄，许多话都不敢再像从前那样说满。`
    }
    if (courtNpc.empressDowagerFavor <= 35) {
        return `${courtNpc.name}近来帘前眷顾将尽，格外在意太后与后党脸色。`
    }

    return null
}

function describeFactionPressure(npc: NPC, factions: Faction[]): string {
    const emperor = factions.find(item => item.id === 'emperor')
    const empress = factions.find(item => item.id === 'empress')

    if (npc.powerBase === 'court' && npc.factionId === 'emperor' && emperor && empress) {
        const delta = factionPressureDelta(emperor, empress)
        if (delta <= -8) {
            return '他这一边眼下被后党压着，许多话都得先顾忌太后一系会不会借题反咬。'
        }
        if (delta >= 8) {
            return '他这一边眼下更占上风，但也得防着后党借一处纰漏翻盘。'
        }
        return '帝党与后党一时相持，他既要争势，也得防着先把话说满。'
    }

    if (npc.powerBase === 'court' && npc.factionId === 'empress' && emperor && empress) {
        const delta = factionPressureDelta(empress, emperor)
        if (delta <= -8) {
            return '后党眼下受帝党挤压，他说话时自然更顾忌宗室与主战一派的锋芒。'
        }
        if (delta >= 8) {
            return '后党眼下仍握着台面优势，但也怕帝党借军议与宗室名分夺势。'
        }
        return '两边仍在角力，他既想稳住本方位置，也不肯轻易把把柄交出去。'
    }

    if (npc.powerBase === 'external') {
        if (npc.alignmentBias === 'emperor') {
            return '朝中帝党想借他撑局，后党却也防他坐大，他一举一动都在两边眼皮底下。'
        }
        if (npc.alignmentBias === 'empress') {
            return '后党想把他当压舱石，帝党又盯着他手中兵权，他很难真把话说死。'
        }
        if (npc.alignmentBias === 'swing') {
            return '朝中两边都想拉他，也都防他倒向别人，所以他更习惯留价码与退路。'
        }
        return '朝中两边都想借他的兵权做文章，他既能抬价，也得防着谁先拿他开刀。'
    }

    return '他眼下仍处在彼此掣肘的朝局里，不会轻易把真心与底牌一并亮出来。'
}

function factionPressureDelta(ownFaction: Faction, rivalFaction: Faction): number {
    return (
        (ownFaction.courtInfluence - rivalFaction.courtInfluence) +
        (ownFaction.internalStability - rivalFaction.internalStability) * 0.7
    )
}

function stripTailPunctuation(text: string): string {
    return text.replace(/[。！？；，、\s]+$/u, '')
}
