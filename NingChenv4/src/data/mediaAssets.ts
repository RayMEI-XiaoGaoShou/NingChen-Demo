import type { CampaignOutcomeState } from '../game/types'

export type BgmTrackKey = 'bgm1' | 'bgm2' | 'bgm3' | 'bgm4'
export type NpcPortraitVariant = 'default' | 'courtDark' | 'courtBright' | 'courtFullbody' | 'externalFullbody'

const NPC_PORTRAIT_BASE = '/images/npc/确认【抠背景】'
const NPC_COURT_DARK_PORTRAIT_BASE = '/images/npc/朝堂暗版'
const NPC_COURT_BRIGHT_PORTRAIT_BASE = '/images/npc/hover亮版_v1'
const NPC_COURT_FULLBODY_PORTRAIT_BASE = '/images/npc/court-fullbody'
const NPC_EXTERNAL_FULLBODY_PORTRAIT_BASE = '/images/npc/external-fullbody'
const COURT_FACTION_UI_BASE = '/images/ui/court-faction'
const EXTERNAL_FACTION_UI_BASE = '/images/ui/external-faction'
const MAP_BASE = '/地图底稿'
const BGM_BASE = '/bgm'
const PUBLIC_STATEMENT_AUDIO_BASE = '/audio/generated/court_statements'

type PublicStatementAudioBranch = 'main' | 'a' | 'b' | 'c'

export interface PublicStatementAudioContext {
    shuCampaignState?: CampaignOutcomeState | null
    huainanCampaignState?: CampaignOutcomeState | null
}

function buildPublicAssetPath(path: string) {
    return encodeURI(path)
}

export const BGM_TRACKS: Record<BgmTrackKey, string> = {
    bgm1: buildPublicAssetPath(`${BGM_BASE}/BGM_1_回合首页+朝堂页.mp3`),
    bgm2: buildPublicAssetPath(`${BGM_BASE}/BGM_2_施计.mp3`),
    bgm3: buildPublicAssetPath(`${BGM_BASE}/BGM_3_女帝问政.mp3`),
    bgm4: buildPublicAssetPath(`${BGM_BASE}/BGM_4_背景介绍+玩法介绍+每回合天道结算页.mp3`),
}

const NPC_PORTRAIT_FILES: Record<string, string> = {
    宇文棣: '拓跋棣.png',
    贺拔琪: '贺拔琪.png',
    宗艾: '宗艾.png',
    令狐律光: '令狐律光.png',
    尉迟暮: '尉迟暮.png',
    祖廷: '祖廷.png',
    贺拔伯圭: '贺拔伯圭.png',
    独孤文约: '独孤文约.png',
    尔朱烈: '尔朱烈.png',
    安思明: '安思明.png',
    冯道之: '冯道之.png',
    陈倩: '陈倩.png',
}

const NPC_COURT_DARK_PORTRAIT_FILES: Record<string, string> = {
    宇文棣: 'portrait_yuwendi_base_dark_cutout.png',
    贺拔琪: 'portrait_hebaqi_base_dark_cutout.png',
    宗艾: 'portrait_zongai_base_dark_cutout.png',
    令狐律光: 'portrait_linghulvguang_base_dark_cutout.png',
    尉迟暮: 'portrait_yuchimu_base_dark_cutout.png',
    祖廷: 'portrait_zuting_base_dark_cutout.png',
    贺拔伯圭: 'portrait_hebabogui_base_dark_cutout.png',
    独孤文约: 'portrait_duguwenyue_base_dark_cutout.png',
    尔朱烈: 'portrait_erzhulie_base_dark_cutout.png',
    安思明: 'portrait_ansiming_base_dark_cutout.png',
    冯道之: 'portrait_fengdaozhi_base_dark_cutout.png',
    陈倩: 'portrait_chenqian_base_dark_cutout.png',
}

const NPC_COURT_BRIGHT_PORTRAIT_FILES: Record<string, string> = {
    宇文棣: 'portrait_yuwendi_hover_bright_cutout.png',
    贺拔琪: 'portrait_hebaqi_hover_bright_cutout.png',
    宗艾: 'portrait_zongai_hover_bright_cutout.png',
    令狐律光: 'portrait_linghulvguang_hover_bright_cutout.png',
    尉迟暮: 'portrait_yuchimu_hover_bright_cutout.png',
    祖廷: 'portrait_zuting_hover_bright_cutout.png',
    贺拔伯圭: 'portrait_hebabogui_hover_bright_cutout.png',
    独孤文约: 'portrait_duguwenyue_hover_bright_cutout.png',
    尔朱烈: 'portrait_erzhulie_hover_bright_cutout.png',
    安思明: 'portrait_ansiming_hover_bright_cutout.png',
    冯道之: 'portrait_fengdaozhi_hover_bright_cutout.png',
    陈倩: 'portrait_chenqian_hover_bright_cutout.png',
}

const NPC_COURT_FULLBODY_PORTRAIT_FILES: Record<string, string> = {
    宇文棣: 'portrait_yuwendi_fullbody.png',
    贺拔琪: 'portrait_hebaqi_fullbody.png',
    宗艾: 'portrait_zongai_fullbody.png',
    令狐律光: 'portrait_linghulvguang_fullbody.png',
    尉迟暮: 'portrait_yuchimu_fullbody.png',
    祖廷: 'portrait_zuting_fullbody.png',
}

const NPC_EXTERNAL_FULLBODY_PORTRAIT_FILES: Record<string, string> = {
    独孤文约: 'portrait_duguwenyue_fullbody.png',
    贺拔伯圭: 'portrait_hebabogui_fullbody.png',
    尔朱烈: 'portrait_erzhulie_fullbody.png',
    安思明: 'portrait_ansiming_fullbody.png',
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
    default: {
        base: NPC_PORTRAIT_BASE,
        files: NPC_PORTRAIT_FILES,
    },
    courtDark: {
        base: NPC_COURT_DARK_PORTRAIT_BASE,
        files: NPC_COURT_DARK_PORTRAIT_FILES,
    },
    courtBright: {
        base: NPC_COURT_BRIGHT_PORTRAIT_BASE,
        files: NPC_COURT_BRIGHT_PORTRAIT_FILES,
    },
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
        src: buildPublicAssetPath(`${MAP_BASE}/map_1_initial.png`),
        label: '南北初局',
    },
    bashu: {
        src: buildPublicAssetPath(`${MAP_BASE}/map_2_bashu.png`),
        label: '南陈得巴蜀',
    },
    bashuHuainan: {
        src: buildPublicAssetPath(`${MAP_BASE}/map_3_bashu_huainan.png`),
        label: '南陈得巴蜀与淮南',
    },
    huainan: {
        src: buildPublicAssetPath(`${MAP_BASE}/map_4_huainan.png`),
        label: '南陈得淮南',
    },
} as const

export const COURT_FACTION_UI_ASSETS = {
    reactionPaper: buildPublicAssetPath(`${COURT_FACTION_UI_BASE}/court-reaction-paper.png`),
    bottomDeskForeground: buildPublicAssetPath(`${COURT_FACTION_UI_BASE}/court-bottom-foreground-desk-layer-v2.png`),
} as const

export const EXTERNAL_FACTION_UI_ASSETS = {
    longxiBackground: buildPublicAssetPath(`${EXTERNAL_FACTION_UI_BASE}/external-background-longxi.png`),
    prairieBackground: buildPublicAssetPath(`${EXTERNAL_FACTION_UI_BASE}/external-background-prairie.png`),
    tigerEmblem: buildPublicAssetPath(`${EXTERNAL_FACTION_UI_BASE}/external-emblem-tiger.png`),
    wolfEmblem: buildPublicAssetPath(`${EXTERNAL_FACTION_UI_BASE}/external-emblem-wolf.png`),
    bottomCommandDesk: buildPublicAssetPath(`${EXTERNAL_FACTION_UI_BASE}/external-bottom-foreground-command-desk-v2.png`),
    metricMilitaryIcon: buildPublicAssetPath(`${EXTERNAL_FACTION_UI_BASE}/external-metric-icon-military.png`),
    metricLoyaltyIcon: buildPublicAssetPath(`${EXTERNAL_FACTION_UI_BASE}/external-metric-icon-loyalty.png`),
    metricTrustIcon: buildPublicAssetPath(`${EXTERNAL_FACTION_UI_BASE}/external-metric-icon-trust.png`),
} as const

export function getNpcPortraitPath(name: string, variant: NpcPortraitVariant = 'default') {
    const { base, files } = NPC_PORTRAIT_VARIANTS[variant]
    const file = files[name]
    if (!file) return null
    return buildPublicAssetPath(`${base}/${file}`)
}

export function getBgmTrackPath(track: BgmTrackKey) {
    return BGM_TRACKS[track]
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

export function getEmpressPortraitPath() {
    return getNpcPortraitPath('陈倩')
}
