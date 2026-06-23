import type { NPC, NorthSchemeParseResult, SchemeAction, SchemeType } from './types'

const SCHEME_NAMES: Record<SchemeType, string> = {
    probe: '试探',
    advise: '献策',
    slander: '谗言',
    alienate: '离间',
    frame: '嫁祸',
    proxy: '借刀',
    appeal: '求援',
    omen: '谶纬',
    secession: '煽动割据',
    rebellion: '煽动造反',
}

export function generateFeedback(action: SchemeAction, npc: NPC, success: boolean, parse: NorthSchemeParseResult): string {
    const name = SCHEME_NAMES[action.schemeType]

    if (action.schemeType === 'omen' && success && npc.powerBase === 'external') {
        const omenLines = [
            `${npc.name}听罢便知中枢已起疑，粮道与军需多半要先紧一圈，御史监军也会跟着盯得更密；边镇兵势只是受了小挫，真正更重的是他心里那口怨气。`,
            `${npc.name}虽未当场失色，却已明白中枢这道谶纬会把朝里的猜忌引到边镇上来：先卡粮道与军需，再加御史监军，兵势只挨一点折，忠心却更难再稳。`,
            `${npc.name}一下就听出这不是空泛天象，而是中枢要借疑心收紧粮道、军需与眼线，再把御史监军压下去；边镇兵势未必大损，心里却先松了一层。`,
        ]
        return randomPick(omenLines)
    }

    if (action.schemeType === 'frame') {
        if (success) {
            const trapLines = [
                `${npc.name}先是一怔，旋即像是意识到自己话说得过了，你知道这步${name}已逼他露了口风。`,
                `${npc.name}神色微变，像是忽然察觉自己正往你设下的局里走去，可已来不及全身而退。`,
                `${npc.name}话里那点破绽已被你轻轻带出来，这步${name}最要命的嫌疑，终究还是会落回他自己身上。`,
            ]

            if (((parse.selfTrapPotential ?? 0) + (parse.scapegoatClarity ?? 0)) / 2 >= 0.55) {
                return randomPick(trapLines)
            }
        } else {
            const failTrapLines = [
                `${npc.name}没有顺着你的话失态，反而把口风收得更紧，你知道这步${name}没能把他逼进局里。`,
                `${npc.name}神色一沉便不再接话，显然已觉出你想借题让他背嫌疑。`,
            ]

            if ((parse.selfTrapPotential ?? 0) >= 0.28 || (parse.scapegoatClarity ?? 0) >= 0.28) {
                return randomPick(failTrapLines)
            }
        }
    }

    if (success) {
        const successLines = [
            `${npc.name}略作沉吟，显然已被你的${name}拨动了算盘。`,
            `${npc.name}不曾明言应允，但神色一松，你知道这步${name}已押中其心结。`,
            `${npc.name}听罢只淡淡应了一声，话没说透，路却已悄悄转了方向。`,
        ]
        return randomPick(successLines)
    }

    const failLines = [
        `${npc.name}听后并未接茬，反倒多看了你一眼，你知道这步${name}落空了。`,
        `${npc.name}面色微冷，显然已对你的意图起了戒心。`,
        `${npc.name}既不应承也不发怒，只把话题轻轻拨开，这比翻脸更说明问题。`,
    ]
    return randomPick(failLines)
}

function randomPick<T>(list: T[]): T {
    return list[Math.floor(Math.random() * list.length)]
}
