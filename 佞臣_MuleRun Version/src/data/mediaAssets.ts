export type BgmTrackKey = 'bgm1' | 'bgm2' | 'bgm3' | 'bgm4'

const NPC_PORTRAIT_BASE = '/images/npc/确认【抠背景】'
const MAP_BASE = '/地图底稿'
const BGM_BASE = '/bgm'

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

export function getNpcPortraitPath(name: string) {
    const file = NPC_PORTRAIT_FILES[name]
    if (!file) return null
    return buildPublicAssetPath(`${NPC_PORTRAIT_BASE}/${file}`)
}

export function getBgmTrackPath(track: BgmTrackKey) {
    return BGM_TRACKS[track]
}

export function getEmpressPortraitPath() {
    return getNpcPortraitPath('陈倩')
}
