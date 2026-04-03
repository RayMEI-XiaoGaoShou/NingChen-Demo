import type { BalanceSample, RoundSchemeSample, SampleStrategy } from './types'

export const SAMPLE_SET_VERSION = '2026-04-02-v1'

function makeScheme(
    targetNpcId: string,
    schemeType: RoundSchemeSample['schemeType'],
    speech: string,
    relatedNpcId?: string,
): RoundSchemeSample {
    return {
        targetNpcId,
        schemeType,
        speech,
        relatedNpcId,
    }
}

function buildSchemesForStrategy(round: number, strategy: SampleStrategy, sampleIndex: number): [RoundSchemeSample, RoundSchemeSample, RoundSchemeSample] {
    const probeSpeech = round % 2 === 0
        ? '如今朝中最急的，是钱粮、兵事，还是诏令执行？'
        : '局面纷乱到这一步，真正卡住朝局的是哪一处？'
    const softAdvice = round % 2 === 0
        ? '如今不宜再争虚名，先把中枢调度与地方执行稳住，后面才谈得上转圜。'
        : '眼下先稳住仓储、号令与人心，比争一时快意更要紧。'
    const structuralAdvice = round % 2 === 0
        ? '若能先把仓廪、转运与诏令节次理顺，很多麻烦会自己浮出来。'
        : '先稳住地方、钱粮和转运，再谈压人，不然朝中只会越搅越乱。'
    const slanderSpeech = round % 2 === 0
        ? '他表面附从，心里未必真肯替你担责，真到要紧时恐怕先顾自己。'
        : '此人近来得势太快，未必不会借你的名义扩自己的人脉。'
    const alienateSpeech = round % 2 === 0
        ? '前线兵权、粮道与转运若尽归一系，他日无论功过，责任都只会压到你头上。'
        : '若让一人独掌战线与后勤，战功未必归你，败责却多半会落到你身上。'
    const omenSpeech = round % 2 === 0
        ? '灾异既见，天心未稳，若朝中仍强自压下，只会让人心先散。'
        : '天命之疑一旦入耳，便不是一道诏令就能压住的。'
    const externalProbe = round % 2 === 0
        ? '边镇如今最怕的是朝中猜疑，还是本部兵粮不继？'
        : '公如今最难受的，是朝中牵制，还是边地后继乏力？'
    const externalAdvice = round % 2 === 0
        ? '边地先要稳住军心与粮道，别让朝中借机说你失序。'
        : '此时先把本部人马与粮道照看住，比急着争口舌更实在。'

    if (strategy === 'external') {
        return [
            makeScheme('duguwenyue', 'probe', externalProbe),
            makeScheme('ansiming', 'probe', externalProbe),
            makeScheme(sampleIndex % 2 === 0 ? 'zuting' : 'zongai', 'advise', softAdvice),
        ]
    }

    if (strategy === 'omen') {
        const omenTarget = round >= 13 ? 'zongai' : 'zuting'
        const omenType = round >= 13 ? 'omen' : 'probe'
        return [
            makeScheme(omenTarget, omenType, round >= 13 ? omenSpeech : probeSpeech),
            makeScheme('zuting', 'advise', structuralAdvice),
            makeScheme('linghuelvguang', 'probe', probeSpeech),
        ]
    }

    if (strategy === 'aggressive') {
        return [
            makeScheme('zuting', 'advise', structuralAdvice),
            makeScheme('linghuelvguang', round === 1 ? 'slander' : 'alienate', round === 1 ? slanderSpeech : alienateSpeech, 'zongai'),
            makeScheme('duguwenyue', 'advise', externalAdvice),
        ]
    }

    return [
        makeScheme(sampleIndex % 2 === 0 ? 'zuting' : 'zongai', 'advise', round <= 6 ? softAdvice : structuralAdvice),
        makeScheme('linghuelvguang', 'probe', probeSpeech),
        makeScheme(round <= 8 ? 'zongai' : 'duguwenyue', round <= 4 ? 'slander' : 'probe', round <= 4 ? slanderSpeech : externalProbe),
    ]
}

function makeSample(
    id: string,
    label: string,
    level: BalanceSample['level'],
    strategy: BalanceSample['strategy'],
    sampleIndex: number,
): BalanceSample {
    return {
        id,
        label,
        level,
        strategy,
        difficulty: 'normal',
        rounds: Array.from({ length: 20 }, (_, index) => ({
            round: index + 1,
            schemes: buildSchemesForStrategy(index + 1, strategy, sampleIndex),
            policy: {
                optionIndex: (index + sampleIndex) % 4,
                reason: index % 2 === 0
                    ? '先顾后勤与接管次序，再图扩张。'
                    : '先稳住钱粮和地方执行，别把局面推得太急。',
            },
        })),
    }
}

export const LIVE_BALANCE_SAMPLE_SET: BalanceSample[] = [
    makeSample('expert-mainline', '高手主线', 'expert', 'mainline', 0),
    makeSample('expert-external', '高手外部线', 'expert', 'external', 1),
    makeSample('average-mainline', '普通主线', 'average', 'mainline', 2),
    makeSample('average-omen', '普通谶纬线', 'average', 'omen', 3),
    makeSample('average-external', '普通外部线', 'average', 'external', 4),
    makeSample('rookie-mainline', '菜鸟主线', 'rookie', 'mainline', 5),
    makeSample('rookie-omen-misuse', '菜鸟误用谶纬', 'rookie', 'omen', 6),
    makeSample('rookie-aggressive', '菜鸟激进线', 'rookie', 'aggressive', 7),
]
