// ========================================
// 南陈问政题库
// 数据来源：南陈问政题库.md
// ========================================

import type { CampaignOutcomeState, PolicyQuestion } from '../game/types'

export const POLICY_QUESTIONS: PolicyQuestion[] = [
    {
        id: 'Q01',
        round: 1,
        topic: '新君初政',
        background: '女帝陈倩初临大政，南陈百废待兴。第一道政令决定新朝治理基调。',
        question: '陛下初临大政，国库未盈、地方未安，当以何者为先？',
        options: [
            { label: 'A', content: '清点户籍仓廪', effects: { grain: 2, finance: 2, governance: 1, socialOrder: -1 }, riskNote: '清查易激化地方门阀反弹' },
            { label: 'B', content: '稳固地方军政', effects: { governance: 2, socialOrder: 2, military: 1 }, riskNote: '财政改善有限' },
            { label: 'C', content: '并行推进', effects: { grain: 1, governance: 1, socialOrder: 1, finance: 1 }, riskNote: '铺得太广，样样打折' },
            { label: 'D', content: '先立威信', effects: { governance: 3, socialOrder: -1 }, riskNote: '若处置失当，社会秩序会进一步下滑', legitimacyEffect: 'up' },
        ],
        aiScoringFocus: '是否考虑新朝初立、地方门阀与执行成本',
        nextRoundFeedback: '首政成效将影响后续流民安置与地方控制',
    },
    {
        id: 'Q02',
        round: 2,
        topic: '流民安置',
        background: '江北战乱导致大量流民南渡。流民既是负担，也是恢复国力的人口资源。',
        question: '江北流民日增，沿江诸州不堪重负，当如何处置？',
        options: [
            { label: 'A', content: '编户屯田', effects: { grain: 3, finance: 1, governance: 1 }, riskNote: '短期口粮压力上升' },
            { label: 'B', content: '严控边境', effects: { socialOrder: 2 }, riskNote: '劳动力资源流失', legitimacyEffect: 'down' },
            { label: 'C', content: '分流州郡', effects: { socialOrder: 1, grain: 1, governance: -1 }, riskNote: '地方可能推诿责任' },
            { label: 'D', content: '军民一体', effects: { military: 2, socialOrder: 1, grain: -1 }, riskNote: '寺院势力可能借机扩张' },
        ],
        aiScoringFocus: '是否认识到流民是资源，不只是秩序问题',
        nextRoundFeedback: '流民政策会在灾年和粮赋恢复中体现后果',
    },
    {
        id: 'Q03',
        round: 3,
        topic: '灾年治国',
        background: '北方大旱导致粮价波动，南陈虽未重灾，也受到财政和民生连带影响。',
        question: '北方大旱致粮价飞涨，南朝亦有余波。灾年之中，当先保何者？',
        options: [
            { label: 'A', content: '减赋赈灾', effects: { socialOrder: 3, grain: -1, finance: -2 }, riskNote: '国库恢复周期拉长' },
            { label: 'B', content: '修渠劝农', effects: { grain: 2, socialOrder: 1, finance: -1 }, riskNote: '见效较慢' },
            { label: 'C', content: '保财政优先', effects: { finance: 2, socialOrder: -2 }, riskNote: '民怨积累' },
            { label: 'D', content: '抑兼并护小农', effects: { grain: 1, governance: 2, socialOrder: 1 }, riskNote: '得罪寺院与门阀', legitimacyEffect: 'up' },
        ],
        aiScoringFocus: '是否平衡短期民生与长期财政',
        nextRoundFeedback: '治灾成效将影响练兵窗口期',
    },
    {
        id: 'Q04',
        round: 4,
        topic: '借北线练兵',
        background: '北周北线吃紧，南陈获得难得的喘息窗口期。',
        question: '北虏犯边，北周自顾不暇。此喘息之机当如何利用？',
        options: [
            { label: 'A', content: '整军籍、编练新军', effects: { military: 3, finance: -1 }, riskNote: '练军耗费粮饷' },
            { label: 'B', content: '造战船、修水师', effects: { military: 2, grain: -1 }, riskNote: '见效需时' },
            { label: 'C', content: '修边防情报网', effects: { governance: 2, military: 1 }, riskNote: '情报网有暴露风险' },
            { label: 'D', content: '双管齐下', effects: { military: 2, governance: 1, finance: -1, grain: -1 }, riskNote: '资源分散' },
        ],
        aiScoringFocus: '是否理解窗口期稀缺性与军事建设优先级',
        nextRoundFeedback: '军备布局将影响荆益方向经营',
    },
    {
        id: 'Q05',
        round: 5,
        topic: '荆益方向经营',
        background: '北周西线受扰，南陈需提前经营未来征蜀的后勤基础。',
        question: '西贼扰敌河西，正是我朝经营荆益方向之良机。当以何为先？',
        options: [
            { label: 'A', content: '先修交通屯粮', effects: { grain: 2, military: 1, finance: -1 }, riskNote: '基建耗资大' },
            { label: 'B', content: '先压财政支出', effects: { finance: 2, grain: 1, socialOrder: -1 }, riskNote: '其他方向发展放缓' },
            { label: 'C', content: '招抚荆益豪族', effects: { governance: 2, socialOrder: 1 }, riskNote: '豪族或借机坐大' },
            { label: 'D', content: '设立前沿军镇', effects: { military: 2, governance: 1, finance: -1 }, riskNote: '可能引起北周警觉' },
        ],
        aiScoringFocus: '是否意识到荆益经营是征蜀前置条件',
        nextRoundFeedback: '将衔接蜀中变局与资源投放之争',
    },
    {
        id: 'Q06',
        round: 6,
        topic: '蜀中布局',
        background: '北周益州生变，蜀地割据风险上升，南陈可趁乱布局。',
        question: '北朝蜀中生变，我朝当如何应对此变局？',
        options: [
            { label: 'A', content: '暗中联络公孙', effects: { governance: 2, military: 1 }, riskNote: '走漏风声会刺激北周', legitimacyEffect: 'down' },
            { label: 'B', content: '收买蜀中地方势力', effects: { governance: 2, finance: 1 }, riskNote: '投入不菲，效果不定' },
            { label: 'C', content: '先观望，积蓄力量', effects: { finance: 1, grain: 1, socialOrder: 1 }, riskNote: '可能错失窗口期' },
            { label: 'D', content: '趁乱练兵', effects: { military: 2, governance: 1, grain: -1 }, riskNote: '演练消耗后勤' },
        ],
        aiScoringFocus: '是否区分直接介入与暗中布局的风险',
        nextRoundFeedback: '将反馈蜀中局势对南陈资源配置的影响',
    },
    {
        id: 'Q07',
        round: 7,
        topic: '战略资源投放',
        background: '巴东、江陵、荆州三线都需要投入，必须做取舍。',
        question: '国力有限，巴东、江陵、荆州三个方向，资源当优先投给何处？',
        options: [
            { label: 'A', content: '巴东优先', effects: { military: 2, grain: -1, socialOrder: -1 }, riskNote: '荆州防线会变薄' },
            { label: 'B', content: '荆州优先', effects: { socialOrder: 2, military: 1 }, riskNote: '战略机会偏保守' },
            { label: 'C', content: '江陵优先', effects: { governance: 2, grain: 1 }, riskNote: '均衡但爆发力不足' },
            { label: 'D', content: '三地均分', effects: { grain: 1, governance: 1, socialOrder: 1 }, riskNote: '可能处处都不够强' },
        ],
        aiScoringFocus: '是否有明确战略优先级，而非平均主义',
        nextRoundFeedback: '会影响仓储与后勤体系整顿',
    },
    {
        id: 'Q08',
        round: 8,
        topic: '仓储整顿',
        background: '北周秋涝清仓，南陈也需要借机整顿仓储与漕运。',
        question: '北朝水患而清查仓储，我朝仓廪亦多弊端。当如何整顿？',
        options: [
            { label: 'A', content: '统收统支', effects: { governance: 3, grain: 1, socialOrder: -1 }, riskNote: '地方阻力大' },
            { label: 'B', content: '漕运优先', effects: { grain: 2, military: 1, finance: -1 }, riskNote: '短期挤压财政' },
            { label: 'C', content: '地方自理', effects: { socialOrder: 1, governance: -2 }, riskNote: '中央失控风险上升' },
            { label: 'D', content: '清查加惩贪', effects: { governance: 2, finance: 1, grain: 1 }, riskNote: '官僚体系会抵触' },
        ],
        aiScoringFocus: '是否理解仓储制度和国家动员能力的关系',
        nextRoundFeedback: '会反馈到征蜀与国力积蓄抉择',
    },
    {
        id: 'Q09',
        round: 9,
        topic: '战略选择',
        background: '北周西线未靖，南陈已积蓄数年，面临征蜀还是继续养国的关键抉择。',
        question: '北朝西线未靖而朝堂争执不休，我朝已积蓄数年。是西进征蜀，还是继续养国？',
        options: [
            { label: 'A', content: '立即征蜀', effects: { military: 1, finance: -2, grain: -2 }, riskNote: '高风险高回报' },
            { label: 'B', content: '继续养国', effects: { finance: 1, grain: 1, socialOrder: 1 }, riskNote: '可能错过窗口' },
            { label: 'C', content: '先西后北', effects: { military: 2, governance: 1, finance: -1, grain: -1 }, riskNote: '稳健但仍需开战' },
            { label: 'D', content: '以间代战', effects: { governance: 2, finance: -1 }, riskNote: '蜀地局势不可控' },
        ],
        aiScoringFocus: '是否对窗口期与战争消耗有清醒判断',
        nextRoundFeedback: '将引出征蜀具体方略',
    },
    {
        id: 'Q10',
        round: 10,
        topic: '征蜀方略',
        background: '南陈正式发动征蜀行动，军事方略将决定战局走势。',
        question: '征蜀大军已动，当以何种方略推进？',
        options: [
            { label: 'A', content: '急攻', effects: { military: 3, grain: -2, finance: -1 }, riskNote: '若攻城不克损失极大' },
            { label: 'B', content: '断粮道', effects: { grain: 1, governance: 1, military: 1 }, riskNote: '耗时较长' },
            { label: 'C', content: '招抚士族', effects: { governance: 3, socialOrder: 1, finance: -2 }, riskNote: '降人可能反复' },
            { label: 'D', content: '水陆并进', effects: { military: 2, governance: 1, grain: -2, finance: -1 }, riskNote: '协同难度极高' },
        ],
        aiScoringFocus: '是否考虑蜀道之难与后勤现实',
        nextRoundFeedback: '将反馈蜀地初步战果与治理压力',
    },
    {
        id: 'Q11',
        round: 11,
        topic: '新地治理',
        background: '蜀地初定或战局胶着，新得之地如何治理决定其能否成为战略纵深。',
        question: '蜀地新定，人心未附。新得之地当以何策治理？',
        options: [
            { label: 'A', content: '军镇接管', effects: { governance: 3, socialOrder: -1 }, riskNote: '军管过久会失人心' },
            { label: 'B', content: '文官接管', effects: { socialOrder: 2, governance: 1 }, riskNote: '文官初到控制力弱' },
            { label: 'C', content: '混合安抚', effects: { governance: 2, socialOrder: 1, grain: 1 }, riskNote: '过渡管理复杂' },
            { label: 'D', content: '以蜀治蜀', effects: { socialOrder: 2, governance: -1 }, riskNote: '本地势力可能坐大' },
        ],
        aiScoringFocus: '是否考虑军政过渡的时间成本',
        nextRoundFeedback: '将引出战时财政的压力',
    },
    {
        id: 'Q12',
        round: 12,
        topic: '战时财政',
        background: '征蜀消耗巨大，战与养之间再度出现尖锐矛盾。',
        question: '征蜀之后国库大耗。战与养之间当如何取舍？',
        options: [
            { label: 'A', content: '边贸筹军', effects: { finance: 3, military: 1 }, riskNote: '互市可能被敌利用' },
            { label: 'B', content: '节流保战', effects: { finance: 1, military: 2, socialOrder: -1 }, riskNote: '官僚怨言上升' },
            { label: 'C', content: '继续集中练兵', effects: { military: 3, finance: -2, grain: -1 }, riskNote: '财政崩盘风险加大' },
            { label: 'D', content: '休养生息', effects: { finance: 2, socialOrder: 2, military: -1 }, riskNote: '可能错过北周吃紧窗口' },
        ],
        aiScoringFocus: '是否处理好战与养的动态平衡',
        nextRoundFeedback: '会引出灾疫与寺院经济问题',
    },
    {
        id: 'Q13',
        round: 13,
        topic: '寺院兼并',
        background: '疫疠之年，百姓多依佛寺避难，寺院借赈济之名扩张田亩与人户，开始侵蚀朝廷税基与人口控制。',
        question: '佛寺侵占田亩、隐占人口，当如何处置？',
        options: [
            { label: 'A', content: '借佛寺赈济安民', effects: { socialOrder: 3, governance: -1, grain: -1 }, riskNote: '寺院势力进一步膨胀' },
            { label: 'B', content: '官仓赈济为主', effects: { governance: 2, socialOrder: 1, finance: -1 }, riskNote: '朝廷储备压力大' },
            { label: 'C', content: '限寺还粮', effects: { grain: 3, finance: 1, socialOrder: -2 }, riskNote: '佛门反弹剧烈', legitimacyEffect: 'down' },
            { label: 'D', content: '分类处理', effects: { grain: 1, governance: 2, socialOrder: 1 }, riskNote: '执行复杂', legitimacyEffect: 'up' },
        ],
        aiScoringFocus: '是否理解寺院经济对税基与人口的侵蚀',
        nextRoundFeedback: '将引出情报体制建设',
    },
    {
        id: 'Q14',
        round: 14,
        topic: '情报体制',
        background: '北周帝后暗斗升级，南陈必须提高对北方内部动向的掌握能力。',
        question: '北朝内斗愈烈，我朝对其情报仍嫌不足。当如何建设情报体制？',
        options: [
            { label: 'A', content: '加大密探经费', effects: { governance: 2, military: 1, finance: -2 }, riskNote: '暗探有暴露风险' },
            { label: 'B', content: '布设边郡耳目', effects: { governance: 2, finance: -1 }, riskNote: '只能获取边境情报' },
            { label: 'C', content: '先守财政', effects: { finance: 2 }, riskNote: '情报短缺导致决策盲目' },
            { label: 'D', content: '间商并用', effects: { governance: 2, finance: 1 }, riskNote: '情报质量参差不齐' },
        ],
        aiScoringFocus: '是否意识到情报对战略决策的价值',
        nextRoundFeedback: '会衔接检籍抑兼并议题',
    },
    {
        id: 'Q15',
        round: 15,
        topic: '检籍抑兼并',
        background: '门阀士族隐占户口、兼并小农，正侵蚀南陈税基与兵源。',
        question: '田亩兼并日甚，隐户渐多，税基被侵。当以何策应对？',
        options: [
            { label: 'A', content: '推行土断', effects: { grain: 3, finance: 2, governance: 1, socialOrder: -2 }, riskNote: '阻力极大', legitimacyEffect: 'up' },
            { label: 'B', content: '扶持寒门', effects: { governance: 2, socialOrder: 1 }, riskNote: '见效很慢' },
            { label: 'C', content: '整编州县', effects: { governance: 2, finance: 1 }, riskNote: '官僚反弹' },
            { label: 'D', content: '求稳不动', effects: { military: 1, grain: -1, governance: -1 }, riskNote: '问题继续累积' },
        ],
        aiScoringFocus: '是否理解土断与检籍的长期价值',
        nextRoundFeedback: '会影响征淮南战役准备',
    },
    {
        id: 'Q16',
        round: 16,
        topic: '淮南战役方略',
        background: '南陈正式发动征淮南战役，目标直指北伐跳板。',
        question: '征淮南大军将动，寿春为淮南之钥。当以何种方略推进？',
        options: [
            { label: 'A', content: '急攻寿春', effects: { military: 3, grain: -2, finance: -2 }, riskNote: '若攻不克损失极大' },
            { label: 'B', content: '先扫外围', effects: { military: 2, governance: 1, grain: -1 }, riskNote: '给北周更多反应时间' },
            { label: 'C', content: '以攻代守', effects: { military: 1, socialOrder: 1 }, riskNote: '目标可能不够明确' },
            { label: 'D', content: '水陆夹击', effects: { military: 2, governance: 2, grain: -2, finance: -1 }, riskNote: '后勤与协调压力极高' },
        ],
        aiScoringFocus: '是否有清晰的战役目标与后勤意识',
        nextRoundFeedback: '将引出久战状态下的治国难题',
    },
    {
        id: 'Q17',
        round: 17,
        topic: '久战之治',
        background: '淮南久战，前线要粮要兵，后方民生日渐凋敝。',
        question: '淮南久战不决，前线后方皆疫。当军粮优先、民生优先，还是收缩战线？',
        options: [
            { label: 'A', content: '军粮优先', effects: { military: 2, socialOrder: -2, grain: -1 }, riskNote: '民变风险上升' },
            { label: 'B', content: '民生优先', effects: { socialOrder: 2, grain: 1, military: -2 }, riskNote: '前线可能失势' },
            { label: 'C', content: '局部收缩战线', effects: { military: 1, socialOrder: 1, governance: -1 }, riskNote: '士气会受损' },
            { label: 'D', content: '以战养战', effects: { military: 2, finance: 1, socialOrder: -1, governance: -1 }, riskNote: '占领区民心尽失', legitimacyEffect: 'down' },
        ],
        aiScoringFocus: '是否认识到久战对五维的全面消耗',
        nextRoundFeedback: '会带到边镇经营与多线治理',
    },
    {
        id: 'Q18',
        round: 18,
        topic: '边镇经营',
        background: '天下多事，南陈也需要为未来北伐经营边镇体制。',
        question: '天下多事，我朝边镇亦需经营。边防体制当如何规划？',
        options: [
            { label: 'A', content: '设都督府', effects: { governance: 2, military: 1, socialOrder: -1 }, riskNote: '都督坐大会酿新隐患' },
            { label: 'B', content: '招抚降人', effects: { military: 2, grain: 1, socialOrder: -1 }, riskNote: '忠诚不稳' },
            { label: 'C', content: '中央直控', effects: { governance: 2, military: -1 }, riskNote: '反应速度偏慢' },
            { label: 'D', content: '军屯自给', effects: { grain: 2, finance: 1, military: -1 }, riskNote: '军士疏于训练' },
        ],
        aiScoringFocus: '是否能在边镇效率与防藩镇化之间取平衡',
        nextRoundFeedback: '将影响终局前非常时体制抉择',
    },
    {
        id: 'Q19',
        round: 19,
        topic: '非常时体制',
        background: '终局将至，南陈必须决定是否进入高压战时体制。',
        question: '终局将至，非常之时当行何等体制？',
        options: [
            { label: 'A', content: '战时财赋集中', effects: { finance: 3, military: 1, socialOrder: -2 }, riskNote: '地方严重失血' },
            { label: 'B', content: '官制集中', effects: { governance: 3, socialOrder: -1 }, riskNote: '地方治理粗放化' },
            { label: 'C', content: '全面总动员', effects: { military: 4, grain: -2, socialOrder: -3 }, riskNote: '败则万劫不复' },
            { label: 'D', content: '有限集中', effects: { military: 2, governance: 1, socialOrder: 1 }, riskNote: '支撑力不如全面总动员' },
        ],
        aiScoringFocus: '是否在极限动员与社会稳定间做了合理取舍',
        nextRoundFeedback: '直接进入终局',
    },
    {
        id: 'Q20',
        round: 20,
        topic: '终局国策',
        background: '十年之期已至，南北两朝进入最后摊牌。',
        question: '十年之期已至，南北摊牌在即。最终北伐，当以何策定之？',
        options: [
            { label: 'A', content: '北伐总动员', effects: { military: 3, governance: 1, finance: -2, socialOrder: -2 }, riskNote: '若国力仍逊则加速失败' },
            { label: 'B', content: '稳守经营', effects: { socialOrder: 2, grain: 1, military: -1 }, riskNote: '若优势已足则可能浪费机会' },
            { label: 'C', content: '险中求胜', effects: { military: 4, finance: -1, socialOrder: -1, grain: -1 }, riskNote: '高方差，大成大败' },
            { label: 'D', content: '以势迫和', effects: { socialOrder: 2, governance: 2 }, riskNote: '北周若不妥协则白费', legitimacyEffect: 'up' },
        ],
        aiScoringFocus: '是否根据当前国力差距作出合理终局判断',
        nextRoundFeedback: '进入终局结算',
    },
]

export function getPolicyQuestionByRound(round: number): PolicyQuestion | null {
    return POLICY_QUESTIONS.find(question => question.round === round) ?? null
}

const ROUND_11_BRANCH_QUESTIONS: Record<Exclude<CampaignOutcomeState, 'idle'>, PolicyQuestion> = {
    gained: {
        id: 'Q11_GAINED',
        round: 11,
        topic: '新地治理',
        background: '蜀地方向已有战果，新得之地若不能迅速接稳，前线所得很快就会变成后方负担。',
        question: '蜀地新得，人心未附、军政未稳。新得之地当以何策治理？',
        options: [
            { label: 'A', content: '军镇接管', effects: { governance: 3, socialOrder: -1 }, riskNote: '军管过久会失人心' },
            { label: 'B', content: '文官接管', effects: { socialOrder: 2, governance: 1 }, riskNote: '文官初到控制力弱' },
            { label: 'C', content: '混合安抚', effects: { governance: 2, socialOrder: 1, grain: 1 }, riskNote: '过渡管理复杂' },
            { label: 'D', content: '以蜀治蜀', effects: { socialOrder: 2, governance: -1 }, riskNote: '本地势力可能坐大' },
        ],
        aiScoringFocus: '是否考虑军政过渡的时间成本',
        nextRoundFeedback: '新得蜀地的治理成效会继续反馈到南陈的国力积累中',
    },
    stalemate: {
        id: 'Q11_STALEMATE',
        round: 11,
        topic: '蜀地续战与接管并行',
        background: '蜀地战局未定，南陈既要维持前线压力，又要准备一旦得手后的接管秩序。',
        question: '蜀地未定而战机尚在，是加压续战，还是先把接管框架搭好？',
        options: [
            { label: 'A', content: '加压续战', effects: { military: 2, grain: -1, finance: -1 }, riskNote: '后方承压更重' },
            { label: 'B', content: '先搭接管框架', effects: { governance: 2, socialOrder: 1 }, riskNote: '前线推进会慢下来' },
            { label: 'C', content: '军政并推', effects: { military: 1, governance: 1, finance: -1 }, riskNote: '资源分散' },
            { label: 'D', content: '暂稳战线', effects: { socialOrder: 2, finance: 1, military: -1 }, riskNote: '可能错失蜀地窗口' },
        ],
        aiScoringFocus: '是否理解僵持局里续战与接管必须同步预置',
        nextRoundFeedback: '蜀地僵持会继续消耗南陈的资源调度能力',
    },
    failed: {
        id: 'Q11_FAILED',
        round: 11,
        topic: '征蜀失手后的止损',
        background: '征蜀未成，军心、财用与士气都受到震动，南陈必须迅速决定如何止损。',
        question: '征蜀未果之后，是先收军整补，还是强撑西线姿态？',
        options: [
            { label: 'A', content: '收军整补', effects: { military: 1, finance: 1, socialOrder: 1 }, riskNote: '会被视作失去进取之机' },
            { label: 'B', content: '强撑西线姿态', effects: { military: 1, governance: 1, finance: -2 }, riskNote: '易再伤国库' },
            { label: 'C', content: '安抚士卒与伤民', effects: { socialOrder: 2, military: -1 }, riskNote: '前线威慑下降' },
            { label: 'D', content: '转向内政整饬', effects: { governance: 2, finance: 1, military: -1 }, riskNote: '短期战机更难再起' },
        ],
        aiScoringFocus: '是否能在失利后先稳住国本与军心',
        nextRoundFeedback: '止损效果会影响南陈后续是否还能重新争取战略主动',
    },
}

const ROUND_17_BRANCH_QUESTIONS: Record<Exclude<CampaignOutcomeState, 'idle'>, PolicyQuestion> = {
    gained: {
        id: 'Q17_GAINED',
        round: 17,
        topic: '扩大战果还是稳住新占区',
        background: '淮南已有所得，南陈需要决定是继续扩大战果，还是先把新占区真正吃稳。',
        question: '淮南既已得势，当继续进取，还是先稳住新占区与粮运？',
        options: [
            { label: 'A', content: '乘胜扩张', effects: { military: 3, grain: -2, finance: -1 }, riskNote: '过快推进会拉长补给线' },
            { label: 'B', content: '稳住新占区', effects: { governance: 2, socialOrder: 2 }, riskNote: '可能错失更大战果' },
            { label: 'C', content: '军政并推', effects: { military: 1, governance: 1, grain: -1 }, riskNote: '执行难度高' },
            { label: 'D', content: '以守待变', effects: { grain: 1, finance: 1, socialOrder: 1 }, riskNote: '士气与锐气会下滑' },
        ],
        aiScoringFocus: '是否理解战果扩大与稳占经营之间的取舍',
        nextRoundFeedback: '淮南得手后的经营将影响南陈终局前的持续支撑力',
    },
    stalemate: {
        id: 'Q17_STALEMATE',
        round: 17,
        topic: '久战之治',
        background: '淮南久战，前线要粮要兵，后方民生日渐凋敝。',
        question: '淮南久战不决，前线后方皆疫。当军粮优先、民生优先，还是收缩战线？',
        options: [
            { label: 'A', content: '军粮优先', effects: { military: 2, socialOrder: -2, grain: -1 }, riskNote: '民变风险上升' },
            { label: 'B', content: '民生优先', effects: { socialOrder: 2, grain: 1, military: -2 }, riskNote: '前线可能失势' },
            { label: 'C', content: '局部收缩战线', effects: { military: 1, socialOrder: 1, governance: -1 }, riskNote: '士气会受损' },
            { label: 'D', content: '以战养战', effects: { military: 2, finance: 1, socialOrder: -1, governance: -1 }, riskNote: '占领区民心尽失', legitimacyEffect: 'down' },
        ],
        aiScoringFocus: '是否认识到久战对五维的全面消耗',
        nextRoundFeedback: '会带到边镇经营与多线治理',
    },
    failed: {
        id: 'Q17_FAILED',
        round: 17,
        topic: '前线受挫后的守线与止损',
        background: '淮南受挫后，南陈需在军心、民生与防线之间快速找回平衡。',
        question: '淮南失势之后，当先稳军心、收战线，还是再挤资源强撑前线？',
        options: [
            { label: 'A', content: '稳军心再收线', effects: { socialOrder: 2, military: 1 }, riskNote: '进攻节奏会明显放缓' },
            { label: 'B', content: '强撑前线', effects: { military: 2, finance: -2, grain: -1 }, riskNote: '后方会迅速叫苦' },
            { label: 'C', content: '减压养民', effects: { socialOrder: 2, grain: 1, military: -1 }, riskNote: '北周压力暂时下降' },
            { label: 'D', content: '整顿军政秩序', effects: { governance: 2, finance: 1, military: -1 }, riskNote: '短期难见战果' },
        ],
        aiScoringFocus: '是否先守住国本，再为后续重整留空间',
        nextRoundFeedback: '失利后的止损效果会直接影响南陈终局前的再动员能力',
    },
}

export function getPolicyQuestionForRound(
    round: number,
    campaigns: {
        shuCampaignState: CampaignOutcomeState
        huainanCampaignState: CampaignOutcomeState
    },
): PolicyQuestion | null {
    if (round === 11 && campaigns.shuCampaignState !== 'idle') {
        return ROUND_11_BRANCH_QUESTIONS[campaigns.shuCampaignState]
    }

    if (round === 17 && campaigns.huainanCampaignState !== 'idle') {
        return ROUND_17_BRANCH_QUESTIONS[campaigns.huainanCampaignState]
    }

    return getPolicyQuestionByRound(round)
}
