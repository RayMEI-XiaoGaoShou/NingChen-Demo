import type { BalanceSample, RoundPolicySample, RoundSchemeSample, SampleSkillLevel, SampleStrategy } from './types'

export const SAMPLE_SET_VERSION = '2026-04-03-v1'

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

function rotate<T>(items: T[], round: number): T {
    return items[(round - 1) % items.length]!
}

function buildExpertMainlineSchemes(round: number): [RoundSchemeSample, RoundSchemeSample, RoundSchemeSample] {
    const leadAdvice = rotate([
        '先稳仓储、诏令与转运节次，再议前线轻重，莫让灾年把中枢拖散。',
        '先把接管次序、馆阁号令与地方仓廪理顺，再谈谁来主战。',
    ], round)
    const strategicProbe = rotate([
        '都督以为，眼下最伤国本的究竟是仓粮失次，还是朝中借南征争权？',
        '若先不分清主战与安内哪头更耗国力，西线再添兵也只是空转吧？',
    ], round)
    const closingMove = round <= 4
        ? rotate([
            '后党借流民与军粮之名扩张馆阁接口，长此以往，宫中名分只会更乱。',
            '宫里若总由摄政旧人借灾情伸手，陛下身边的出入口迟早都要被人替换。',
        ], round)
        : rotate([
            '河西若再被中朝拖住饷路与军令，边镇迟早会先替朝里的人背责。',
            '地方将帅最怕的不是敌军，而是中枢先乱了调度与赏罚。',
        ], round)

    return [
        makeScheme('zuting', 'advise', leadAdvice),
        makeScheme('linghuelvguang', 'probe', strategicProbe),
        round <= 4
            ? makeScheme('zongai', 'slander', closingMove)
            : makeScheme('duguwenyue', 'probe', closingMove),
    ]
}

function buildAverageMainlineSchemes(round: number): [RoundSchemeSample, RoundSchemeSample, RoundSchemeSample] {
    const leadAdvice = rotate([
        '现在先稳住钱粮和执行，再谈别的。',
        '先把中枢调度和地方接应稳住，局面才有转圜。',
    ], round)
    const strategicProbe = rotate([
        '朝里眼下最该先处理的是战事，还是先把内部理顺？',
        '都督觉得现在最拖后腿的是哪一头？',
    ], round)
    const closingMove = round <= 4
        ? rotate([
            '此人未必真会替你担责。',
            '他得势太快，未必不会借你的名义给自己铺路。',
        ], round)
        : rotate([
            '宫里如今谁最值得提防？',
            '边镇现在最怕朝里哪种牵制？',
        ], round)

    return [
        makeScheme('zuting', 'advise', leadAdvice),
        makeScheme('linghuelvguang', 'probe', strategicProbe),
        round <= 4
            ? makeScheme('zongai', 'slander', closingMove)
            : makeScheme('duguwenyue', 'probe', closingMove),
    ]
}

function buildRookieMainlineSchemes(round: number): [RoundSchemeSample, RoundSchemeSample, RoundSchemeSample] {
    const leadAdvice = rotate([
        '现在先稳一稳局面，总比硬往前冲好。',
        '朝里还是别再乱了，先把事情按住再说。',
    ], round)
    const strategicProbe = rotate([
        '你觉得现在最麻烦的是哪边？',
        '这事到底先顾哪头比较好？',
    ], round)
    const closingMove = round <= 4
        ? rotate([
            '他看着未必真靠得住。',
            '有些人嘴上答应，心里不一定这么想。',
        ], round)
        : rotate([
            '现在宫里是不是谁都不太安稳？',
            '边上最近是不是也不太顺？',
        ], round)

    return [
        makeScheme('zuting', 'advise', leadAdvice),
        makeScheme('linghuelvguang', 'probe', strategicProbe),
        round <= 4
            ? makeScheme('zongai', 'slander', closingMove)
            : makeScheme('duguwenyue', 'probe', closingMove),
    ]
}

function buildExpertExternalSchemes(round: number): [RoundSchemeSample, RoundSchemeSample, RoundSchemeSample] {
    const duguProbe = rotate([
        '河西眼下最忌朝中空谈南征，却让边镇先替中枢垫上兵粮吧？',
        '若朝里还只会催兵不理粮道，公手里的部曲迟早先被拖疲。',
    ], round)
    const ansimingProbe = rotate([
        '草原旧部与中原调度若总被人拿来互相掣肘，将军最先保的会是哪一头？',
        '若朝廷只索兵马不管补给，边地谁还肯真替它卖命？',
    ], round)
    const courtBridge = rotate([
        '中枢若不先收紧号令与仓储，外镇迟早只会各顾各的。',
        '先把朝里钱粮和诏令稳住，外边的人才看得见章法。',
    ], round)

    return [
        makeScheme('duguwenyue', 'probe', duguProbe),
        makeScheme('ansiming', 'probe', ansimingProbe),
        makeScheme('zuting', 'advise', courtBridge),
    ]
}

function buildAverageExternalSchemes(round: number): [RoundSchemeSample, RoundSchemeSample, RoundSchemeSample] {
    const externalProbe = rotate([
        '边镇现在最怕的是朝里猜忌，还是后续跟不上？',
        '若朝里继续只催人出力，不管后面接不接得住，外边还能撑多久？',
    ], round)
    const courtBridge = rotate([
        '先把朝里钱粮和调度稳住，外边才不至于各唱各调。',
        '中枢先别乱，边上的人自然会少几分观望。',
    ], round)

    return [
        makeScheme('duguwenyue', 'probe', externalProbe),
        makeScheme('ansiming', 'probe', externalProbe),
        makeScheme(round % 2 === 0 ? 'zuting' : 'zongai', 'advise', courtBridge),
    ]
}

function buildAverageOmenSchemes(round: number): [RoundSchemeSample, RoundSchemeSample, RoundSchemeSample] {
    const omenTarget = round >= 13 ? 'zongai' : 'zuting'
    const omenType = round >= 13 ? 'omen' : 'probe'
    const omenSpeech = round >= 13
        ? rotate([
            '灾异既著，天心未安，若朝中仍强作镇定，人心反而更易先散。',
            '名分一旦与灾异牵在一处，就不是多下一道诏令能压住的了。',
        ], round)
        : rotate([
            '眼下朝里真正怕的，是兵事，还是人心先散？',
            '局面已经乱到这步，真正在拖朝局后腿的是哪一处？',
        ], round)
    const structuralAdvice = rotate([
        '先把仓储、转运和中枢节次稳住，再议别的。',
        '先稳住钱粮与诏令，再看谁能借势发难。',
    ], round)

    return [
        makeScheme(omenTarget, omenType, omenSpeech),
        makeScheme('zuting', 'advise', structuralAdvice),
        makeScheme('linghuelvguang', 'probe', '都督眼下最忧的是前线失序，还是朝里乱命？'),
    ]
}

function buildRookieOmenMisuseSchemes(round: number): [RoundSchemeSample, RoundSchemeSample, RoundSchemeSample] {
    const rookieOmen = round >= 13
        ? rotate([
            '现在天意好像也不太站在朝廷这边，你们是不是该小心一点？',
            '最近风声不对，朝里最好还是低调些。',
        ], round)
        : rotate([
            '你觉得现在是不是不太吉利？',
            '朝里这阵子是不是有点不顺？',
        ], round)

    return [
        makeScheme(round >= 13 ? 'zongai' : 'zuting', round >= 13 ? 'omen' : 'probe', rookieOmen),
        makeScheme('zuting', 'advise', rotate([
            '先别乱，总得把事情压一压。',
            '朝里先稳住，别让局面再坏下去。',
        ], round)),
        makeScheme('linghuelvguang', 'probe', rotate([
            '前线现在是不是挺难办的？',
            '都督觉得接下来会不会更麻烦？',
        ], round)),
    ]
}

function buildRookieAggressiveSchemes(round: number): [RoundSchemeSample, RoundSchemeSample, RoundSchemeSample] {
    const bluntAdvice = rotate([
        '你现在总该先想办法把局面稳住。',
        '再这么拖下去，谁都不会有好下场。',
    ], round)
    const bluntPressure = round === 1
        ? rotate([
            '他未必真心站在你这边。',
            '有些人现在靠得太近，未必不是另有打算。',
        ], round)
        : rotate([
            '别人若权太重，最后吃亏的可能就是你。',
            '真出事的时候，他多半先把责任推给别人。',
        ], round)
    const externalAdvice = rotate([
        '边上还是先顾好自己手里的兵。',
        '外边的人先把自己这摊看住，比什么都强。',
    ], round)

    return [
        makeScheme('zuting', 'advise', bluntAdvice),
        makeScheme('linghuelvguang', round === 1 ? 'slander' : 'alienate', bluntPressure, 'zongai'),
        makeScheme('duguwenyue', 'advise', externalAdvice),
    ]
}

function buildSchemesForSample(level: SampleSkillLevel, strategy: SampleStrategy, round: number): [RoundSchemeSample, RoundSchemeSample, RoundSchemeSample] {
    switch (`${level}:${strategy}`) {
        case 'expert:mainline':
            return buildExpertMainlineSchemes(round)
        case 'expert:external':
            return buildExpertExternalSchemes(round)
        case 'average:mainline':
            return buildAverageMainlineSchemes(round)
        case 'average:external':
            return buildAverageExternalSchemes(round)
        case 'average:omen':
            return buildAverageOmenSchemes(round)
        case 'rookie:mainline':
            return buildRookieMainlineSchemes(round)
        case 'rookie:omen':
            return buildRookieOmenMisuseSchemes(round)
        case 'rookie:aggressive':
            return buildRookieAggressiveSchemes(round)
        default:
            return buildAverageMainlineSchemes(round)
    }
}

function buildPolicyReason(level: SampleSkillLevel, round: number): RoundPolicySample {
    if (level === 'expert') {
        return {
            optionIndex: round % 4,
            reason: rotate([
                '先稳接管次序、仓储与地方执行，再图扩张，别把眼前战果打成后患。',
                '先把钱粮、转运和地方吏治卡住，再谈更激烈的推进。',
            ], round),
        }
    }

    if (level === 'average') {
        return {
            optionIndex: (round + 1) % 4,
            reason: rotate([
                '先稳后勤和地方执行，再往前推。',
                '先把钱粮和接应顾住，别把局面推得太急。',
            ], round),
        }
    }

    return {
        optionIndex: (round + 2) % 4,
        reason: rotate([
            '先别乱，把后面顾住再说。',
            '先稳一稳，别一下子推太快。',
        ], round),
    }
}

function makeSample(
    id: string,
    label: string,
    level: BalanceSample['level'],
    strategy: BalanceSample['strategy'],
): BalanceSample {
    return {
        id,
        label,
        level,
        strategy,
        difficulty: 'normal',
        rounds: Array.from({ length: 20 }, (_, index) => ({
            round: index + 1,
            schemes: buildSchemesForSample(level, strategy, index + 1),
            policy: buildPolicyReason(level, index + 1),
        })),
    }
}

export const LIVE_BALANCE_SAMPLE_SET: BalanceSample[] = [
    makeSample('expert-mainline', '高手主线', 'expert', 'mainline'),
    makeSample('expert-external', '高手外部线', 'expert', 'external'),
    makeSample('average-mainline', '普通主线', 'average', 'mainline'),
    makeSample('average-omen', '普通谶纬线', 'average', 'omen'),
    makeSample('average-external', '普通外部线', 'average', 'external'),
    makeSample('rookie-mainline', '菜鸟主线', 'rookie', 'mainline'),
    makeSample('rookie-omen-misuse', '菜鸟误用谶纬', 'rookie', 'omen'),
    makeSample('rookie-aggressive', '菜鸟激进线', 'rookie', 'aggressive'),
]
