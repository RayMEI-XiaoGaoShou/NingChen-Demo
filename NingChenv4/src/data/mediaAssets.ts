import type { CampaignOutcomeState } from '../game/types'

export type BgmTrackKey =
    | 'coverEnding'
    | 'roundCourtOverview'
    | 'externalDetailScheme'
    | 'courtDetailScheme'
    | 'empressQuestion'
    | 'schemeFeedback'
    | 'empressReply'
    | 'settlement'
export type SfxKey =
    | 'roundstart-to-court'
    | 'settlement-next-volume'
    | 'empress-next-page'
    | 'court-gate-hover'
    | 'external-gate-hover'
    | 'north-page-action'
    | 'north-inline-action'
    | 'empress-option-a'
    | 'empress-option-b'
    | 'empress-option-c'
    | 'empress-option-d'
    | 'feng-draft'
export type NpcPortraitVariant = 'courtFullbody' | 'externalFullbody'
export type NpcDetailAttitude = 'cold_guard' | 'watchful' | 'trusted' | 'relied' | 'devoted'
export type HebaQiDetailPortraitKey = NpcDetailAttitude

const NPC_COURT_FULLBODY_PORTRAIT_BASE = '/images/npc/court-fullbody'
const NPC_EXTERNAL_FULLBODY_PORTRAIT_BASE = '/images/npc/external-fullbody'
const NPC_DETAIL_BASE = '/images/npc/detail'
const NPC_DETAIL_AVATAR_BASE = '/images/npc/detail-avatars'
const NPC_DETAIL_VOICE_BASE = '/audio/generated/scheme_avatar'
const NPC_SCHEME_BASE = '/images/npc/scheme'
const COURT_FACTION_UI_BASE = '/images/ui/court-faction'
const EXTERNAL_FACTION_UI_BASE = '/images/ui/external-faction'
const BGM_BASE = '/bgm'
const SFX_BASE = '/audio/sfx'
const PUBLIC_STATEMENT_AUDIO_BASE = '/audio/generated/court_statements'
const FENG_DAOZHI_FIRST_ROUND_GUIDE_AUDIO_BASE = '/audio/generated/feng_daozhi_first_round_guide'

type PublicStatementAudioBranch = 'main' | 'a' | 'b' | 'c'

export interface PublicStatementAudioContext {
    shuCampaignState?: CampaignOutcomeState | null
    huainanCampaignState?: CampaignOutcomeState | null
}

function buildPublicAssetPath(path: string) {
    return encodeURI(path)
}

const NPC_DETAIL_ASSET_KEYS: Record<string, string> = {
    hebaqi: 'hebaqi',
    'hebaqí': 'hebaqi',
    贺拔琪: 'hebaqi',
    zongai: 'zongai',
    宗艾: 'zongai',
    linghuelvguang: 'linghulvguang',
    linghulvguang: 'linghulvguang',
    令狐律光: 'linghulvguang',
    weichimu: 'yuchimu',
    'weichimù': 'yuchimu',
    yuchimu: 'yuchimu',
    尉迟暮: 'yuchimu',
    zuting: 'zuting',
    祖廷: 'zuting',
    yuwendi: 'yuwendi',
    宇文棣: 'yuwendi',
    duguwenyue: 'duguwenyue',
    独孤文约: 'duguwenyue',
    hebabogui: 'hebabogui',
    'hebaboguì': 'hebabogui',
    贺拔伯圭: 'hebabogui',
    erzhulie: 'erzhulie',
    'erzhulié': 'erzhulie',
    尔朱烈: 'erzhulie',
    ansiming: 'ansiming',
    安思明: 'ansiming',
}

export function getNpcDetailAssetKey(npcIdOrName: string) {
    return NPC_DETAIL_ASSET_KEYS[npcIdOrName] ?? null
}

export function getNpcDetailPortraitKey(trust: number): NpcDetailAttitude {
    if (trust >= 90) return 'devoted'
    if (trust >= 70) return 'relied'
    if (trust >= 50) return 'trusted'
    if (trust >= 30) return 'watchful'
    return 'cold_guard'
}

export function getNpcDetailBackgroundPath(npcIdOrName: string) {
    const assetKey = getNpcDetailAssetKey(npcIdOrName)
    if (!assetKey) return null
    return buildPublicAssetPath(`${NPC_DETAIL_BASE}/${assetKey}/background.webp`)
}

export function getNpcDetailPortraitPath(npcIdOrName: string, trust: number) {
    const assetKey = getNpcDetailAssetKey(npcIdOrName)
    if (!assetKey) return null
    const attitude = getNpcDetailPortraitKey(trust)
    return buildPublicAssetPath(`${NPC_DETAIL_BASE}/${assetKey}/${assetKey}-${attitude.replace('_', '-')}.webp`)
}

export function getNpcDetailAvatarPath(npcIdOrName: string) {
    const assetKey = getNpcDetailAssetKey(npcIdOrName)
    if (!assetKey) return null
    return buildPublicAssetPath(`${NPC_DETAIL_AVATAR_BASE}/${assetKey}.webp`)
}

export function getNpcDetailVoicePath(npcIdOrName: string, trust: number) {
    const assetKey = getNpcDetailAssetKey(npcIdOrName)
    if (!assetKey) return null
    const attitude = getNpcDetailPortraitKey(trust)
    return buildPublicAssetPath(`${NPC_DETAIL_VOICE_BASE}/${assetKey}/${attitude}.mp3`)
}

export function getFengDaozhiFirstRoundGuideVoicePath(audioKey: string) {
    const normalizedKey = audioKey.trim()
    if (!normalizedKey) return null

    return buildPublicAssetPath(`${FENG_DAOZHI_FIRST_ROUND_GUIDE_AUDIO_BASE}/${normalizedKey}.mp3`)
}

export const HEBAQI_DETAIL_ASSETS = {
    background: getNpcDetailBackgroundPath('hebaqi') ?? '',
    portraits: {
        cold_guard: buildPublicAssetPath(`${NPC_DETAIL_BASE}/hebaqi/hebaqi-cold-guard.webp`),
        watchful: buildPublicAssetPath(`${NPC_DETAIL_BASE}/hebaqi/hebaqi-watchful.webp`),
        trusted: buildPublicAssetPath(`${NPC_DETAIL_BASE}/hebaqi/hebaqi-trusted.webp`),
        relied: buildPublicAssetPath(`${NPC_DETAIL_BASE}/hebaqi/hebaqi-relied.webp`),
        devoted: buildPublicAssetPath(`${NPC_DETAIL_BASE}/hebaqi/hebaqi-devoted.webp`),
    },
} as const

export const SCHEME_UI_ASSETS = {
    fengDaozhiAssistPortrait: buildPublicAssetPath(`${NPC_SCHEME_BASE}/fengdaozhi-assist-0.webp`),
    fengDaozhiDialoguePortraits: [
        buildPublicAssetPath(`${NPC_SCHEME_BASE}/fengdaozhi-assist-0.webp`),
        buildPublicAssetPath(`${NPC_SCHEME_BASE}/fengdaozhi-assist-1.webp`),
        buildPublicAssetPath(`${NPC_SCHEME_BASE}/fengdaozhi-assist-2.webp`),
        buildPublicAssetPath(`${NPC_SCHEME_BASE}/fengdaozhi-assist-3.webp`),
    ],
} as const

export function getHebaQiDetailPortraitKey(trust: number): HebaQiDetailPortraitKey {
    return getNpcDetailPortraitKey(trust)
}

export function getHebaQiDetailPortraitPath(trust: number) {
    return HEBAQI_DETAIL_ASSETS.portraits[getHebaQiDetailPortraitKey(trust)]
}

export const BGM_TRACKS: Record<BgmTrackKey, string> = {
    coverEnding: buildPublicAssetPath(`${BGM_BASE}/bgm-cover-ending.mp3`),
    roundCourtOverview: buildPublicAssetPath(`${BGM_BASE}/bgm-round-court-overview.mp3`),
    externalDetailScheme: buildPublicAssetPath(`${BGM_BASE}/bgm-external-detail-scheme.mp3`),
    courtDetailScheme: buildPublicAssetPath(`${BGM_BASE}/bgm-court-detail-scheme.mp3`),
    empressQuestion: buildPublicAssetPath(`${BGM_BASE}/bgm-empress-question.mp3`),
    schemeFeedback: buildPublicAssetPath(`${BGM_BASE}/bgm-scheme-feedback.mp3`),
    empressReply: buildPublicAssetPath(`${BGM_BASE}/bgm-empress-reply.mp3`),
    settlement: buildPublicAssetPath(`${BGM_BASE}/bgm-settlement.mp3`),
}

export const SFX_ASSETS: Record<SfxKey, string> = {
    'roundstart-to-court': buildPublicAssetPath(`${SFX_BASE}/transitions/roundstart-to-court.mp3`),
    'settlement-next-volume': buildPublicAssetPath(`${SFX_BASE}/transitions/settlement-next-volume.mp3`),
    'empress-next-page': buildPublicAssetPath(`${SFX_BASE}/transitions/empress-next-page.mp3`),
    'court-gate-hover': buildPublicAssetPath(`${SFX_BASE}/court/court-gate-hover.mp3`),
    'external-gate-hover': buildPublicAssetPath(`${SFX_BASE}/court/external-gate-hover.mp3`),
    'north-page-action': buildPublicAssetPath(`${SFX_BASE}/buttons/north-page-action.mp3`),
    'north-inline-action': buildPublicAssetPath(`${SFX_BASE}/buttons/north-inline-action.mp3`),
    'empress-option-a': buildPublicAssetPath(`${SFX_BASE}/empress/option-a.mp3`),
    'empress-option-b': buildPublicAssetPath(`${SFX_BASE}/empress/option-b.mp3`),
    'empress-option-c': buildPublicAssetPath(`${SFX_BASE}/empress/option-c.mp3`),
    'empress-option-d': buildPublicAssetPath(`${SFX_BASE}/empress/option-d.mp3`),
    'feng-draft': buildPublicAssetPath(`${SFX_BASE}/scheme/feng-draft.mp3`),
}

const EMPRESS_OPTION_SFX_KEYS = [
    'empress-option-a',
    'empress-option-b',
    'empress-option-c',
    'empress-option-d',
] as const

const NPC_COURT_FULLBODY_PORTRAIT_FILES: Record<string, string> = {
    宇文棣: 'portrait_yuwendi_fullbody.webp',
    贺拔琪: 'portrait_hebaqi_fullbody.webp',
    宗艾: 'portrait_zongai_fullbody.webp',
    令狐律光: 'portrait_linghulvguang_fullbody.webp',
    尉迟暮: 'portrait_yuchimu_fullbody.webp',
    祖廷: 'portrait_zuting_fullbody.webp',
}

const NPC_EXTERNAL_FULLBODY_PORTRAIT_FILES: Record<string, string> = {
    独孤文约: 'portrait_duguwenyue_fullbody.webp',
    贺拔伯圭: 'portrait_hebabogui_fullbody.webp',
    尔朱烈: 'portrait_erzhulie_fullbody.webp',
    安思明: 'portrait_ansiming_fullbody.webp',
}

const PUBLIC_STATEMENT_AUDIO_SLUGS: Record<string, string> = {
    weichimu: 'yuchimu',
    'weichimù': 'yuchimu',
    zongai: 'zongai',
    yuwendi: 'yuwendi',
    linghuelvguang: 'linghulvguang',
    hebaqi: 'hebaqi',
    'hebaqí': 'hebaqi',
    zuting: 'zuting',
    duguwenyue: 'duguwenyue',
    hebabogui: 'hebabogui',
    'hebaboguì': 'hebabogui',
    erzhulie: 'erzhulie',
    'erzhulié': 'erzhulie',
    ansiming: 'ansiming',
}

const NPC_PORTRAIT_VARIANTS: Record<NpcPortraitVariant, { base: string; files: Record<string, string> }> = {
    courtFullbody: {
        base: NPC_COURT_FULLBODY_PORTRAIT_BASE,
        files: NPC_COURT_FULLBODY_PORTRAIT_FILES,
    },
    externalFullbody: {
        base: NPC_EXTERNAL_FULLBODY_PORTRAIT_BASE,
        files: NPC_EXTERNAL_FULLBODY_PORTRAIT_FILES,
    },
}

export const MAP_ASSETS = {
    initial: {
        src: new URL('../assets/ui/round-start/roundstart-world-map-aiart-v1.webp', import.meta.url).href,
        label: '南北初局',
    },
    bashu: {
        src: new URL('../assets/ui/round-start/roundstart-world-map-aiart-bashu-v1.webp', import.meta.url).href,
        label: '南陈得巴蜀',
    },
    bashuHuainan: {
        src: new URL('../assets/ui/round-start/roundstart-world-map-aiart-bashu-huainan-v1.webp', import.meta.url).href,
        label: '南陈得巴蜀与淮南',
    },
    huainan: {
        src: new URL('../assets/ui/round-start/roundstart-world-map-aiart-huainan-v1.webp', import.meta.url).href,
        label: '南陈得淮南',
    },
} as const

export const COURT_FACTION_UI_ASSETS = {
    reactionPaper: buildPublicAssetPath(`${COURT_FACTION_UI_BASE}/court-reaction-paper.webp`),
    bottomDeskForeground: buildPublicAssetPath(`${COURT_FACTION_UI_BASE}/court-bottom-foreground-desk-layer-v2.webp`),
    imperialJadeSealBadge: buildPublicAssetPath(`${COURT_FACTION_UI_BASE}/imperial-jade-seal-badge.webp`),
    phoenixCrownBadge: buildPublicAssetPath(`${COURT_FACTION_UI_BASE}/phoenix-crown-badge.webp`),
    emperorPartyEmblem: buildPublicAssetPath(`${COURT_FACTION_UI_BASE}/court-party-emblem-emperor-dragon.webp`),
    empressPartyEmblem: buildPublicAssetPath(`${COURT_FACTION_UI_BASE}/court-party-emblem-empress-phoenix.webp`),
} as const

export const EXTERNAL_FACTION_UI_ASSETS = {
    longxiBackground: buildPublicAssetPath(`${EXTERNAL_FACTION_UI_BASE}/external-background-longxi.webp`),
    prairieBackground: buildPublicAssetPath(`${EXTERNAL_FACTION_UI_BASE}/external-background-prairie.webp`),
    tigerEmblem: buildPublicAssetPath(`${EXTERNAL_FACTION_UI_BASE}/external-emblem-tiger.webp`),
    wolfEmblem: buildPublicAssetPath(`${EXTERNAL_FACTION_UI_BASE}/external-emblem-wolf.webp`),
    bottomCommandDesk: buildPublicAssetPath(`${EXTERNAL_FACTION_UI_BASE}/external-bottom-foreground-command-desk-v2.webp`),
    metricMilitaryIcon: buildPublicAssetPath(`${EXTERNAL_FACTION_UI_BASE}/external-metric-icon-military.webp`),
    metricLoyaltyIcon: buildPublicAssetPath(`${EXTERNAL_FACTION_UI_BASE}/external-metric-icon-loyalty.webp`),
    metricTrustIcon: buildPublicAssetPath(`${EXTERNAL_FACTION_UI_BASE}/external-metric-icon-trust.webp`),
} as const

export function getNpcPortraitPath(name: string, variant: NpcPortraitVariant) {
    const { base, files } = NPC_PORTRAIT_VARIANTS[variant]
    const file = files[name]
    if (!file) return null
    return buildPublicAssetPath(`${base}/${file}`)
}

export function getBgmTrackPath(track: BgmTrackKey) {
    return BGM_TRACKS[track]
}

export function getSfxPath(key: SfxKey) {
    return SFX_ASSETS[key]
}

export function getEmpressOptionSfxKey(optionIndex: number): SfxKey | null {
    return EMPRESS_OPTION_SFX_KEYS[optionIndex] ?? null
}

function getCampaignBranch(state: CampaignOutcomeState | null | undefined): PublicStatementAudioBranch {
    if (state === 'gained') return 'a'
    if (state === 'failed') return 'c'
    return 'b'
}

function getPublicStatementAudioBranch(round: number, context: PublicStatementAudioContext): PublicStatementAudioBranch {
    if (round === 11) return getCampaignBranch(context.shuCampaignState)
    if (round === 17) return getCampaignBranch(context.huainanCampaignState)
    return 'main'
}

export function getNpcPublicStatementAudioPath(
    npcId: string,
    round: number,
    context: PublicStatementAudioContext = {},
) {
    const slug = PUBLIC_STATEMENT_AUDIO_SLUGS[npcId]
    if (!slug || !Number.isFinite(round)) return null

    const normalizedRound = Math.max(1, Math.trunc(round))
    const roundLabel = String(normalizedRound).padStart(2, '0')
    const branch = getPublicStatementAudioBranch(normalizedRound, context)
    return buildPublicAssetPath(`${PUBLIC_STATEMENT_AUDIO_BASE}/public_statement_r${roundLabel}_${branch}_${slug}.mp3`)
}

