import type { Scheme } from '../game/types'

export const SCHEMES: Scheme[] = [
    {
        type: 'probe',
        name: '试探',
        description: '摸底牌、探口风，发掘该角色的隐藏立场',
        trustThreshold: 0,
        riskLevel: 'low',
        needsSecondTarget: false,
    },
    {
        type: 'advise',
        name: '献策',
        description: '对其晓以利害，顺其所欲献上利他而暗损北周国本之 “良策”',
        trustThreshold: 0,
        riskLevel: 'low',
        needsSecondTarget: false,
    },
    {
        type: 'slander',
        name: '谗言',
        description: '在 施计对象甲 心中种下对 关联人物乙 的疑心',
        trustThreshold: 30,
        riskLevel: 'medium',
        needsSecondTarget: true,
    },
    {
        type: 'alienate',
        name: '离间',
        description: '将 施计对象甲 对 关联人物乙 的疑心扩大为实质性裂痕',
        trustThreshold: 50,
        riskLevel: 'high',
        needsSecondTarget: true,
    },
    {
        type: 'frame',
        name: '设局嫁祸',
        description: '布一个让目标自己踩进去的陷阱，诱其失言、犯错，引来朝中其他人的攻讦',
        trustThreshold: 50,
        riskLevel: 'high',
        needsSecondTarget: false,
    },
    {
        type: 'proxy',
        name: '借刀',
        description: '待关联人物的皇帝恩宠与太后眷顾低于阈值，便可以借政党领袖之手正式收网',
        trustThreshold: 70,
        riskLevel: 'extreme',
        needsSecondTarget: true,
    },
    {
        type: 'appeal',
        name: '求援',
        description: '借高信任之人出面，替你保举或遮掩',
        trustThreshold: 70,
        riskLevel: 'medium',
        needsSecondTarget: false,
    },
    {
        type: 'omen',
        name: '谶纬',
        description: '以灾异天象动摇名分，重塑朝堂格局',
        trustThreshold: -1,
        riskLevel: 'extreme',
        needsSecondTarget: false,
    },
    {
        type: 'secession',
        name: '煽动割据',
        description: '引诱地方军头割据州郡，让中央丧失对当地的实质控制权',
        trustThreshold: 65,
        riskLevel: 'extreme',
        needsSecondTarget: false,
        targetScope: 'externalOnly',
    },
    {
        type: 'rebellion',
        name: '煽动造反',
        description: '煽动地方军头公然举旗反叛，以乱局搏变局',
        trustThreshold: 75,
        riskLevel: 'extreme',
        needsSecondTarget: false,
        targetScope: 'externalOnly',
    },
]

export function getSchemeByType(type: string): Scheme | undefined {
    return SCHEMES.find(scheme => scheme.type === type)
}
