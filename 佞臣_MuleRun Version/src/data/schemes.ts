import type { Scheme } from '../game/types'

export const SCHEMES: Scheme[] = [
    {
        type: 'probe',
        name: '试探',
        description: '摸清立场、野心与暗线线索',
        trustThreshold: 0,
        riskLevel: 'low',
        needsSecondTarget: false,
    },
    {
        type: 'advise',
        name: '献策',
        description: '顺着对方算盘给路子，换取信任',
        trustThreshold: 0,
        riskLevel: 'low',
        needsSecondTarget: false,
    },
    {
        type: 'slander',
        name: '谗言',
        description: '向 A 灌输对 B 的恶感',
        trustThreshold: 30,
        riskLevel: 'medium',
        needsSecondTarget: true,
    },
    {
        type: 'alienate',
        name: '离间',
        description: '主动撕开两人或两线的裂缝',
        trustThreshold: 50,
        riskLevel: 'high',
        needsSecondTarget: true,
    },
    {
        type: 'frame',
        name: '设局嫁祸',
        description: '诱其失言、失态或误判，让他自己背上嫌疑',
        trustThreshold: 50,
        riskLevel: 'high',
        needsSecondTarget: false,
    },
    {
        type: 'proxy',
        name: '借刀',
        description: '借别人之势去压人或剪除阻力',
        trustThreshold: 70,
        riskLevel: 'extreme',
        needsSecondTarget: true,
    },
    {
        type: 'appeal',
        name: '求援',
        description: '让高信任角色替你保举遮掩',
        trustThreshold: 70,
        riskLevel: 'medium',
        needsSecondTarget: false,
    },
    {
        type: 'omen',
        name: '谶纬',
        description: '借灾异与名分重塑局势',
        trustThreshold: -1,
        riskLevel: 'extreme',
        needsSecondTarget: false,
    },
    {
        type: 'secession',
        name: '煽动割据',
        description: '逼外部强人明面奉朝、实则坐地自雄',
        trustThreshold: 65,
        riskLevel: 'extreme',
        needsSecondTarget: false,
        targetScope: 'externalOnly',
    },
    {
        type: 'rebellion',
        name: '煽动造反',
        description: '逼外部强人公开反旗，赌其乱局一搏',
        trustThreshold: 75,
        riskLevel: 'extreme',
        needsSecondTarget: false,
        targetScope: 'externalOnly',
    },
]

export function getSchemeByType(type: string): Scheme | undefined {
    return SCHEMES.find(scheme => scheme.type === type)
}
