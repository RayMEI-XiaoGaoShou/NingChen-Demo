import type { BalanceSample, RoundPolicySample, RoundSchemeSample, SampleSkillLevel, SampleStrategy } from './types'

export const SAMPLE_SET_VERSION = '2026-04-03-v2'

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
        '先把接管次序、诏令出口与地方仓廪理顺，再谈谁来主战，别让后党借乱继续卡住中枢。',
    ], round)
    const strategicProbe = rotate([
        '都督以为，眼下最伤国本的，究竟是仓粮失次，还是朝中借南征争权夺调度？',
        '若先不分清主战与安内哪头更耗国力，西线再添兵也只是替中枢遮丑罢了？',
    ], round)
    const closingMove = round <= 4
        ? rotate([
            '后党借流民与军粮之名扩张领阁接口，长此以往，宫中名分只会更乱。',
            '宫里若总由摄政旧人借灾情伸手，陛下身边的出入口迟早都要被人替换。',
        ], round)
        : rotate([
            '宗艾若继续替后党打理宫中耳目，朝里许多锅最后都能顺手扣到帝党头上。',
            '地方将帅最怕的不是敌军，而是宫里先替后党改写调度与赏罚。',
        ], round)

    return [
        makeScheme('zuting', 'advise', leadAdvice),
        makeScheme('linghuelvguang', 'probe', strategicProbe),
        makeScheme('zongai', 'slander', closingMove),
    ]
}

function buildAverageMainlineSchemes(round: number): [RoundSchemeSample, RoundSchemeSample, RoundSchemeSample] {
    const leadAdvice = rotate([
        '先把仓储、转运和州郡接应顺过来，再争谁来主战，才不至于前线先吃空。',
        '先稳住诏令出口和后面的接应，再谈谁该出头，免得前线、州郡各听各的。',
    ], round)
    const strategicProbe = rotate([
        '都督眼下最怕的，是前线军令拖成两套，还是朝里先把调度争乱了？',
        '若粮道和调度先乱了，再谈主战与安内，是否只会把前线拖得更慢？',
    ], round)
    const earlyClosingMove = rotate([
        '宫里若先把诏令和赏罚改来改去，前线那边还肯不肯照旧听命？',
        '若有人只顾在宫里争谁说了算，前线最后多半先乱在军令和粮道上。',
    ], round)
    const lateClosingMove = rotate([
        '边上如今最怕的，不是兵少，而是朝里一句一变，叫地方不敢照旧接令。',
        '真到久战时，最拖人的往往不是敌军，而是朝里今天这样、明天那样。',
    ], round)

    return round <= 10
        ? [
            makeScheme('zuting', 'advise', leadAdvice),
            makeScheme('linghuelvguang', 'probe', strategicProbe),
            makeScheme('zongai', 'probe', earlyClosingMove),
        ]
        : [
            makeScheme('zuting', 'advise', leadAdvice),
            makeScheme('linghuelvguang', 'probe', strategicProbe),
            makeScheme('duguwenyue', 'probe', lateClosingMove),
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
        '若朝里还只会催兵不理粮道，公手里的部曲迟早先被拖瘦。',
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

function buildExpertOmenSchemes(round: number): [RoundSchemeSample, RoundSchemeSample, RoundSchemeSample] {
    const omenTarget = round >= 13 ? 'zongai' : 'zuting'
    const omenType = round >= 13 ? 'omen' : 'probe'
    const omenSpeech = round >= 13
        ? rotate([
            '灾异一旦压到皇统与摄政名分上，宫中越想强压，外朝越会怀疑军令究竟出自谁手，边上诸军也会先松掉那口气。',
            '天象若与法统裂口缠在一处，就不是一道安民诏能压住的事；朝里每多遮掩一分，前线对中枢的服气就少一分。',
        ], round)
        : rotate([
            '若灾年、军粮与摄政名分被人绑作一处，真正先乱的会是前线调度，还是宫中法统？',
            '眼下最该防的，不只边患，而是灾异一旦落到名分上，朝中谁还有资格下最后一道军令。',
        ], round)
    const structuralAdvice = rotate([
        '先把仓储、转运、诏令节次与州郡承接收回中枢，再谈压流言，否则名分裂口迟早会传到前线。',
        '若不先理顺钱粮、军令与地方接管，哪怕名义上压住灾异，外朝和诸军也会各作各的解释。',
    ], round)
    const commandProbe = rotate([
        '都督眼下最怕的，不是敌军强弱，而是朝里拿名分遮盖失序，最后把前线军令拖成两套。',
        '若宫中名分先乱，边上主帅最难守住的，是兵心、粮道，还是对中枢最后那点服气？',
    ], round)

    return [
        makeScheme(omenTarget, omenType, omenSpeech),
        makeScheme('zuting', 'advise', structuralAdvice),
        makeScheme('linghuelvguang', 'probe', commandProbe),
    ]
}

function buildAverageExternalSchemes(round: number): [RoundSchemeSample, RoundSchemeSample, RoundSchemeSample] {
    const externalProbe = rotate([
        '边镇现在最怕的是朝里猜忌，还是后面跟不上？',
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
            '局面已经乱到这步，真正拖后腿的是哪一处？',
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
    const bluntCourt =
        round % 2 === 0
            ? makeScheme('zuting', 'slander', rotate([
                '真闹起来，陛下未必会先替你说话。',
                '宫里一乱，谁都可能先把自己摘出去。',
            ], round), 'yuwendi')
            : makeScheme('zongai', 'slander', rotate([
                '她那边真出事时，未必会替你兜着。',
                '有些人现在看着近，翻脸时也快。',
            ], round), 'hebaqi')

    const bluntPressure = rotate([
        makeScheme('linghuelvguang', 'alienate', '朝里真乱起来，最后多半还是把锅扣到你头上。', 'zuting'),
        makeScheme('yuwendi', 'alienate', '再让她一直压着，最后丢脸的还是你。', 'hebaqi'),
        makeScheme('zongai', 'alienate', '别人要是越爬越高，先被顶掉的位置可能就是你。', 'zuting'),
    ], round)

    const externalAdvice =
        round % 2 === 0
            ? makeScheme('ansiming', 'probe', rotate([
                '外边的事先别急着站队，看看谁先翻脸。',
                '边上先拖一拖，别那么快把话说死。',
            ], round))
            : makeScheme('duguwenyue', 'advise', rotate([
                '边上的事先顾住自己再说。',
                '外边谁催都先别太快应下。',
            ], round))

    return [bluntCourt, bluntPressure, externalAdvice]
}

function buildSchemesForSample(level: SampleSkillLevel, strategy: SampleStrategy, round: number): [RoundSchemeSample, RoundSchemeSample, RoundSchemeSample] {
    switch (`${level}:${strategy}`) {
        case 'expert:mainline':
            return buildExpertMainlineSchemes(round)
        case 'expert:omen':
            return buildExpertOmenSchemes(round)
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

function getCuratedPolicyReason(
    level: SampleSkillLevel,
    strategy: SampleStrategy,
    round: number,
): RoundPolicySample | null {
    if (level === 'expert' && strategy === 'omen') {
        const curatedExpertOmenPolicy: Partial<Record<number, RoundPolicySample>> = {
            4: {
                optionIndex: 0,
                reason: '趁北线吃紧先整军练兵，补足征蜀推进前最怕短缺的军力与调度底子。',
            },
            5: {
                optionIndex: 0,
                reason: '先修交通、固粮与前运节点，把征蜀所需的粮道和后勤骨架搭稳。',
            },
            6: {
                optionIndex: 3,
                reason: '借蜀中生变之机练军整阵，但先把军政承接和补给次序压实。',
            },
            8: {
                optionIndex: 1,
                reason: '漕运优先，先把仓储、转运与前线补给线理顺，再谈更大的推进。',
            },
            9: {
                optionIndex: 2,
                reason: '先西后北，先把征蜀的军政承接、粮道和后续治理说透，再开战。',
            },
            10: {
                optionIndex: 1,
                reason: '先断粮道、稳转运、压实接管次序，宁可慢一步也别把补给线拖垮，再把蜀地战果变成可持续的占领。',
            },
            16: {
                optionIndex: 3,
                reason: '水陆并进，但先稳渡口、粮道与前线协同，别把淮南战果打成昙花一现。',
            },
        }

        return curatedExpertOmenPolicy[round] ?? null
    }

    return null
}

function buildPolicyReason(level: SampleSkillLevel, strategy: SampleStrategy, round: number): RoundPolicySample {
    const curated = getCuratedPolicyReason(level, strategy, round)
    if (curated) {
        return curated
    }

    if (level === 'expert') {
        return {
            optionIndex: round % 4,
            reason: rotate([
                '先稳接管次序、仓储与地方执行，再图扩张，别把眼前战果打成后患。',
                '先把钱粮、转运和地方治理卡住，再谈更激烈的推进。',
            ], round),
        }
    }

    if (level === 'average') {
        return {
            optionIndex: (round + 1) % 4,
            reason: rotate([
                '先稳后面的接应，再往前推。',
                '先把局面顾住，别一下子推得太急。',
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
            policy: buildPolicyReason(level, strategy, index + 1),
        })),
    }
}

export const LIVE_BALANCE_SAMPLE_SET: BalanceSample[] = [
    makeSample('expert-mainline', '高手主线', 'expert', 'mainline'),
    makeSample('expert-omen', '高手谶纬线', 'expert', 'omen'),
    makeSample('expert-external', '高手外部线', 'expert', 'external'),
    makeSample('average-mainline', '普通主线', 'average', 'mainline'),
    makeSample('average-omen', '普通谶纬线', 'average', 'omen'),
    makeSample('average-external', '普通外部线', 'average', 'external'),
    makeSample('rookie-mainline', '菜鸟主线', 'rookie', 'mainline'),
    makeSample('rookie-omen-misuse', '菜鸟误用谶纬', 'rookie', 'omen'),
    makeSample('rookie-aggressive', '菜鸟激进线', 'rookie', 'aggressive'),
]
