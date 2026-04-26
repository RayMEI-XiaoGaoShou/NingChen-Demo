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
        background: '建康新朝甫立，府库未丰，州郡未安，旧族仍在观望。第一道政令既要立威，也要给百姓与诸州一个可循的章法。',
        question: '阿颖，朕初临大政，若第一步落错，后头便处处被动。你在北边看多了权力如何落地，替朕想想，此时当以何者为先？',
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
        background: '江北烽火未歇，流民沿江南下，州县日日告急。流民既是口粮负担，也是将来恢复田亩、兵源与户籍的人口根本。',
        question: '朕不愿只把流民看成麻烦，也不能让沿江诸州先被拖垮。若要既不失人心，又不乱地方，你以为当如何安置？',
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
        background: '北方大旱，粮价牵动江南，南陈虽未重灾，也受财政、民生与商路连带影响。灾年治国，最怕顾此失彼。',
        question: '阿颖，灾年里国库要撑，百姓要活，士族与寺院又各有盘算。若朕只能先稳一处根本，当先保何者？',
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
        background: '北周北线吃紧，短日内难以全力南顾。这样的喘息不常有，若只守着太平日子，便是把天赐窗口白白放过。',
        question: '朕欲趁此时整备江防与军籍，却也知练军耗饷、造船需时。你替朕看，此喘息之机当如何利用？',
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
        background: '河西商道受扰，北周西线一时难稳。若日后真要问蜀，今日便不能不经营荆益、粮道与前沿人心。',
        question: '阿颖，朕知荆益之事不能只等战机临门。此刻南朝若要预置后手，最该先把哪一桩事做实？',
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
        background: '益州生变，蜀地人心浮动，北周中枢未必能立刻按住。南陈若贸然出手，容易惊动北朝；若全然观望，又恐错失裂缝。',
        question: '你在北庭更近风声，替朕掂量：蜀中既乱，南朝当暗中布局、收买地方，还是先按兵蓄力？',
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
        background: '巴东、江陵、荆州皆来索粮、索兵、索人，诸将各言其急。三处都要紧，可国力不是无底之仓。',
        question: '朕最怕平均用力，最后处处都不成势。阿颖，若此时只能先压一处筹码，资源当优先投给何处？',
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
        background: '北周秋涝清仓，倒让朕想起江南仓廪、漕运也积弊不少。若仓账不清，战时调粮便只是纸上空谈；若查得太急，地方又会反弹。',
        question: '阿颖，仓储之弊看似是粮，实则牵动州县、漕运与官吏。此事当怎样整顿，才不伤根本？',
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
        background: '数年经营，江南稍有余力；北周西线未靖，朝中又争执不休。乘势西进与继续养国，终于摆到案前。',
        question: '朕既想趁北朝裂缝西进，又怕一战耗尽这些年攒下的国本。你替朕掂量，是当西进问蜀，还是再养一局？',
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
        background: '征蜀军书已下，前线诸将各请一策。蜀道险，粮路长，士族人心亦不可轻忽，军事方略将决定战局走势。',
        question: '朕不想只听一句速战或持重。阿颖，此战若要真得手，当以何种方略推进？',
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
        background: '蜀地若新附，人心未定，军府、文官、本地豪族皆不可全信。得地只是第一步，能不能吃稳，才见国本。',
        question: '阿颖，若要让新地成为纵深而非负担，朕该先取何策治理？',
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
        background: '战事之后，度支日日来报军费，州县又言民力已疲。前线未必能停，后方却可能先被掏空。',
        question: '你在北边也见过战争怎样吞钱粮。阿颖，征蜀之后国库大耗，战与养之间当如何取舍？',
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
        question: '朕若骤然压寺，恐伤人心；若放任不管，国本日空。阿颖，佛寺侵占田亩、隐占人口，当如何处置？',
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
        background: '北周帝后相疑，朝局裂声渐重。南陈若看不清北方心腹之变，迟早会在大战略上盲决。',
        question: '你身在其间，朕比谁都知道情报来得不易。若南朝要看清北方动向，情报体制当如何建设？',
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
        background: '江南田亩兼并日甚，隐户越来越多，税粮与兵源都从朝廷账册里漏出去。若不查，国本会空；若查得太狠，门阀必反。',
        question: '阿颖，检籍抑兼并这一步不能不走，却也不能乱走。田亩兼并日甚、税基被侵，当以何策应对？',
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
        background: '淮南军书将发，寿春是江北门户，也是北伐跳板。诸将请战，度支忧粮，州郡忧役。',
        question: '朕既不愿错过兵机，也不能把江南拖进泥潭。阿颖，征淮南大军将动，当以何种方略推进？',
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
        background: '淮南久战不决，前线要粮要兵，后方疫气与疲敝一并上来。若只顾军粮，民心会散；若只顾民生，前线会软。',
        question: '你在北边看得更冷。阿颖，久战之局已逼到眼前，朕当军粮优先、民生优先，还是收缩战线？',
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
        background: '天下多事，边镇若无权则迟钝，权重又恐坐大。南陈若为未来北伐预置边防体制，也不能给后世埋下藩镇之祸。',
        question: '阿颖，此间分寸最难。边防体制当如何规划，才能兼顾效率与中枢节制？',
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
        background: '终局渐近，常法未必支得住非常之局。财赋、官制、兵役、人心，哪一处压得太狠都可能反噬。',
        question: '朕若要进入战时体制，不能只凭一口急气。阿颖，非常之时当行何等体制，才不至崩坏？',
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
        background: '十年局势走到此处，南北终要见分晓。此策既关江南国运，也关萧宝颖多年潜身北周的苦心。',
        question: '阿颖，朕知你在北边也熬到了最险的时候。最后北伐，是当总动员、稳守、行险，还是以势迫和？',
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
        background: '蜀地既得，军旗虽立，人心却未必归附。前线赢了只是半局，后方若接不住，战果很快会拖成祸根。',
        question: '阿颖，新得之地人心未附、军政未稳，朕当以何策接稳蜀地？',
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
        background: '蜀地未定，前线仍有可争之势；可接管框架若不预置，纵然得手也会乱作一团。',
        question: '朕如今要在续战与预治之间分力。阿颖，是加压续战，还是先把接管框架搭好？',
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
        background: '征蜀未果，军心、财用与朝议都受震动。败后最难的是不为颜面强撑，也不让士气一泄到底。',
        question: '阿颖，失手之后，南朝第一步该如何止损？是先收军整补，还是强撑西线姿态？',
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
        background: '淮南既已得势，诸将多言乘胜，度支却忧粮运拉长，新占州县也未必真稳。',
        question: '朕若再进，是求大战果；若先稳，是保后劲。阿颖，淮南既已得势，当继续进取，还是先稳住新占区与粮运？',
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
        background: '淮南久战，前线与后方同受消耗，病疫、粮草、军心都在催朕决断。',
        question: '你在北边看得更冷。阿颖，若战局不能速决，朕当军粮优先、民生优先，还是收缩战线？',
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
        background: '淮南失势，前线来报多有不利，朝中却仍有人请再挤钱粮强撑。败后若处置失衡，军心与民生都会先乱。',
        question: '阿颖，此时当先稳军心、收战线，还是再挤资源强撑前线？',
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
