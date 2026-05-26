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
        background: '建康新朝甫立，府库未丰，州郡未安，旧族犹在观望。头一道政令便要定调子——既要让人信服，也要给百姓与各州一个可循的章法。',
        question: '宝颖，坐上这把椅子才三日，朕方知案上每一张纸底下都压着一桩难处。头一脚踩空了，后头便再难站稳。你替朕想想，眼下当以何事为先？',
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
        background: '江北烽烟未歇，流民沿江南渡，州县日日告急。流民是口粮负担，也是日后恢复田亩、充实兵源户籍的根本。',
        question: '江北逃来的人一日多过一日，沿江州县的急报堆了半张案子。朕不愿只把活人当累赘，可真放任不管，地方先得被拖垮。你在北边见过人怎样流离失所，替朕想一条路——既不失人心，又不乱根本。',
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
        background: '北方大旱，粮价牵动江南。南陈虽未重灾，财政、民生与商路皆受波及。灾年治国，最怕顾此失彼。',
        question: '旱气从北边漫过江来了，粮价一日三变，百姓有百姓的慌，士族有士族的算盘。阿颖，国库要撑、百姓要活，朕若只能先保一处根本，该保哪个？',
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
        background: '北周北线吃紧，短日内无暇南顾。这样的喘息不常有，若只守着太平日子过，便是把天赐的窗口白白丢了。',
        question: '北朝北线烽火正急，咱们南边难得松一口气。朕想趁这阵子整备军籍、修缮江防，又知练军耗饷、造船费时。你替朕掂量掂量，这口气该怎么使才不白费？',
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
        background: '河西商道受扰，北周西线一时难稳。若日后真要问蜀，今日便不能不在荆益粮道与前沿人心上下工夫。',
        question: '昨夜把荆益舆图铺在灯下看了半宿。粮道、山川、渡口，一笔一笔都是将来的关节。若当真要问蜀，此刻最该先把哪一桩做实了？',
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
        background: '益州生变，蜀地人心浮动，北周中枢未必按得住。南陈若贸然出手，容易惊动北朝；若一味旁观，又恐错失裂缝。',
        question: '蜀中的消息到时已近三更，宫灯都要灭了。朕知道战机诱人，可更怕走漏风声。宝颖，你离北庭更近，蜀中既已生乱，南朝当暗中伸手，还是按兵不动？',
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
        background: '巴东、荆州、江夏三处俱来索粮、索兵、索人，诸将各言其急。巴东扼入蜀咽喉，荆州居上游枢纽，江夏控长江中段与北岸通道。三处都要紧，国力却不是无底之仓。',
        question: '三处急报摊在案上，人人说自己最急。朕最怕哪处都匀一点，到头来哪处都不成势。眼下只能先压一处筹码——你以为当先投哪里？',
        options: [
            { label: 'A', content: '巴东优先', effects: { military: 2, grain: -1, socialOrder: -1 }, riskNote: '荆州防线会变薄' },
            { label: 'B', content: '荆州优先', effects: { socialOrder: 2, military: 1 }, riskNote: '战略机会偏保守' },
            { label: 'C', content: '江夏优先', effects: { governance: 2, grain: 1 }, riskNote: '均衡但爆发力不足' },
            { label: 'D', content: '三地均分', effects: { grain: 1, governance: 1, socialOrder: 1 }, riskNote: '可能处处都不够强' },
        ],
        aiScoringFocus: '是否有明确战略优先级，而非平均主义',
        nextRoundFeedback: '会影响仓储与后勤体系整顿',
    },
    {
        id: 'Q08',
        round: 8,
        topic: '仓储整顿',
        background: '北周秋涝清仓，倒叫朕想起江南仓廪与漕运也是积弊不少。仓账不清，战时调粮便是空谈；查得太急，地方又要闹起来。',
        question: '北朝那边忙着清仓，朕回头翻翻自家账册，才觉江南仓廪同样是一团乱麻。仓储之弊看似只是粮，实则牵着州县与漕运。此事要怎样整顿，才不至于查出一场乱子来？',
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
        background: '数年经营，江南稍有余力；北周西线未靖，朝中争执不休。乘势西进与继续养国的抉择，终于摆到了案前。',
        question: '这些年一点一点攒下的家底，终于到了要不要押出去的时候。朕想趁北朝的裂缝西进，又怕一仗打空数年心血。阿颖，你说是该问蜀，还是再忍一忍？',
        options: [
            { label: 'A', content: '立即征蜀', effects: { military: 1, finance: -2, grain: -2 }, riskNote: '高风险高回报' },
            { label: 'B', content: '继续养国', effects: { finance: 1, grain: 1, socialOrder: 1 }, riskNote: '可能错过窗口' },
            { label: 'C', content: '有限试探', effects: { military: 2, governance: 1, finance: -1, grain: -1 }, riskNote: '稳健但仍需开战' },
            { label: 'D', content: '以间代战', effects: { governance: 2, finance: -1 }, riskNote: '蜀地局势不可控' },
        ],
        aiScoringFocus: '是否对窗口期与战争消耗有清醒判断',
        nextRoundFeedback: '将引出征蜀具体方略',
    },
    {
        id: 'Q10',
        round: 10,
        topic: '征蜀方略',
        background: '征蜀军书已下，前线诸将各请一策。蜀道险、粮路长，士族人心亦不可轻忽，方略将定下战局走势。',
        question: '军书下了，鼓角催人。朕不想只听一句“速战”或“持重”，此战若要真个得手，路该怎么走？',
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
        background: '蜀地若新附，人心未定，军府、文官、本地豪族皆未可全信。得地只是头一步，能不能吃稳，才见国本。',
        question: '地得了不算赢，吃稳了才算。宝颖，新附之地人心浮动，军府与文官各有各的短处，你以为该用哪路章法来治？',
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
        background: '战事之后，度支日日来报军费，州县又言民力已疲。前线未必停得下来，后方却可能先被掏空。',
        question: '度支的簿册日日催命似的送来，一笔一笔都是钱粮。你在北边也见过仗是怎样吞钱的。征蜀之后国库大耗，战与养之间，该偏哪一头？',
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
        background: '疫疠之年，百姓多依佛寺避难，寺院借赈济之名扩张田亩与人户，已开始侵蚀朝廷税基与人口根本。',
        question: '疫年过后佛寺趁赈济做大，田亩与人户一股脑往寺门里流。朕若骤然压寺，怕伤了民心；放任不理，国本日空。阿颖，此事该怎样处置才妥当？',
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
        background: '北周帝后相疑，朝局裂声渐重。南陈若看不清北方心腹之变，迟早要在大局上走盲棋。',
        question: '北朝帝后相疑的风声越来越密，朕晓得你在其间，每个字都是拿命换回来的。若南朝要把北方的动向看得更清，这张网该怎样布？',
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
        background: '江南田亩兼并日甚，隐户渐多，税粮与兵源都在从朝廷账册上漏出去。若不查，国本迟早空掉；若查得太狠，门阀必反。',
        question: '隐户越来越多，税粮与兵源都在账册上一行行地漏。这一刀不下不行，下得歪了也不行。宝颖，你以为该从哪里下手？',
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
        background: '淮南军书将发，寿春是江北门户，亦是北伐跳板。诸将请战，度支忧粮，州郡忧役。',
        question: '淮南军书压到案前了。朕不愿错过兵机，也不敢把江南拖进泥潭里去。此战当以何种方略推进？',
        options: [
            { label: 'A', content: '急攻寿春', effects: { military: 3, grain: -2, finance: -2 }, riskNote: '若攻不克损失极大' },
            { label: 'B', content: '先扫外围', effects: { military: 2, governance: 1, grain: -1 }, riskNote: '给北周更多反应时间' },
            { label: 'C', content: '稳扎稳打', effects: { military: 1, socialOrder: 1 }, riskNote: '目标可能不够明确' },
            { label: 'D', content: '水陆夹击', effects: { military: 2, governance: 2, grain: -2, finance: -1 }, riskNote: '后勤与协调压力极高' },
        ],
        aiScoringFocus: '是否有清晰的战役目标与后勤意识',
        nextRoundFeedback: '将引出久战状态下的治国难题',
    },
    {
        id: 'Q17',
        round: 17,
        topic: '久战之治',
        background: '淮南久战不决，前线要粮要兵，后方疫气与疲敝一并涌来。只顾军粮，民心会散；只顾民生，前线会软。',
        question: '久战最磨人。前线要粮要兵，后方要命要活路。阿颖，你在北边看得比朕冷，军粮优先、民生优先，还是收缩战线？',
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
        background: '天下多事，边镇若无权则迟钝，权重又恐坐大。南陈若要为日后北伐预置边防体制，也不能给后世埋下藩镇之祸。',
        question: '边镇之议吵了三日，给权怕坐大，不给权又误军机。你在北朝诸人之间借力周旋，何尝不是日日行在同一条窄路上。宝颖，边防体制该怎样定？',
        options: [
            { label: 'A', content: '设都督府', effects: { governance: 2, military: 1, socialOrder: -1 }, riskNote: '都督坐大会酿新隐患' },
            { label: 'B', content: '招抚降人', effects: { military: 2, grain: 1, socialOrder: -1 }, riskNote: '忠诚不稳' },
            { label: 'C', content: '中央直控', effects: { governance: 2, military: -1 }, riskNote: '反应速度偏慢' },
            { label: 'D', content: '军屯自给', effects: { grain: 2, finance: 1, military: -1 }, riskNote: '军士疏于训练' },
        ],
        aiScoringFocus: '是否能在边镇效率与防藩镇化之间取平衡',
        nextRoundFeedback: '将影响非常时体制抉择',
    },
    {
        id: 'Q19',
        round: 19,
        topic: '非常时体制',
        background: '连年用兵之后，朝中急议渐多，常法未必撑得住眼下的局面。财赋、官制、兵役、人心，哪一处压得太狠都可能反噬。',
        question: '朝中催行急策的人越来越多，人人都说非常之时当用非常之法。朕却怕一口急气把该守的东西冲散了。宝颖，非常之时该行何等体制，才不至于赢了仗、散了国？',
        options: [
            { label: 'A', content: '战时财赋集中', effects: { finance: 3, military: 1, socialOrder: -2 }, riskNote: '地方严重失血' },
            { label: 'B', content: '官制集中', effects: { governance: 3, socialOrder: -1 }, riskNote: '地方治理粗放化' },
            { label: 'C', content: '全面总动员', effects: { military: 4, grain: -2, socialOrder: -3 }, riskNote: '败则万劫不复' },
            { label: 'D', content: '有限集中', effects: { military: 2, governance: 1, socialOrder: 1 }, riskNote: '支撑力不如全面总动员' },
        ],
        aiScoringFocus: '是否在极限动员与社会稳定间做了合理取舍',
        nextRoundFeedback: '将影响后续北伐总策',
    },
    {
        id: 'Q20',
        round: 20,
        topic: '北伐总策',
        background: '北伐之议一日紧似一日，朝中或请总动员，或主稳守经营。此策关乎江南国运，也关乎多年暗中经营能否真正成势。',
        question: '十年了。朕展你来札，许久没落朱笔。阿颖，北边的局势你比朕清楚——若大军北向，当总动员、稳守经营、行险求胜，还是以势迫和？',
        options: [
            { label: 'A', content: '北伐总动员', effects: { military: 3, governance: 1, finance: -2, socialOrder: -2 }, riskNote: '若国力仍逊则加速失败' },
            { label: 'B', content: '稳守经营', effects: { socialOrder: 2, grain: 1, military: -1 }, riskNote: '若优势已足则可能浪费机会' },
            { label: 'C', content: '险中求胜', effects: { military: 4, finance: -1, socialOrder: -1, grain: -1 }, riskNote: '高方差，大成大败' },
            { label: 'D', content: '以势迫和', effects: { socialOrder: 2, governance: 2 }, riskNote: '北周若不妥协则白费', legitimacyEffect: 'up' },
        ],
        aiScoringFocus: '是否根据当前国力差距作出合理北伐判断',
        nextRoundFeedback: '进入最终结算',
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
        background: '蜀地既下，军旗虽立，人心却未必归附。前线赢了只是半局，后方若接不住，战果很快会拖成祸根。',
        question: '蜀地来报时朕没敢马上高兴。赢了半局不算赢，后头接不住便白打了。宝颖，新得之地该用什么法子接稳？',
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
        background: '蜀地未定，前线仍有可争之势；可接管的章法若不预先备好，纵然得手也会乱作一团。',
        question: '蜀地还没落定，前线催得急，后方也不能干等。朕如今要在续战与预治之间分力，你看是该加压，还是先把章法搭好？',
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
        background: '征蜀未果，军心、财用与朝议都受震动。败后最难的不是面子，是不让士气一泄到底。',
        question: '败报传来那夜朕一个人坐了很久。阿颖，失手之后头一步该怎么走？先收军整补，还是撑住西线不让人窥出虚实？',
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
        question: '淮南捷报到了，朝中主战的声音比朕料想的还急。可赢了一阵不等于吃稳一地。当继续进取，还是先把新占区和粮运稳住？',
        options: [
            { label: 'A', content: '乘胜扩张', effects: { military: 3, grain: -2, finance: -1 }, riskNote: '过快推进会拉长补给线' },
            { label: 'B', content: '稳住新占区', effects: { governance: 2, socialOrder: 2 }, riskNote: '可能错失更大战果' },
            { label: 'C', content: '军政并推', effects: { military: 1, governance: 1, grain: -1 }, riskNote: '执行难度高' },
            { label: 'D', content: '以守待变', effects: { grain: 1, finance: 1, socialOrder: 1 }, riskNote: '士气与锐气会下滑' },
        ],
        aiScoringFocus: '是否理解战果扩大与稳占经营之间的取舍',
        nextRoundFeedback: '淮南得手后的经营将影响南陈后续持续支撑力',
    },
    stalemate: {
        id: 'Q17_STALEMATE',
        round: 17,
        topic: '久战之治',
        background: '淮南久战，前线与后方同受消耗，病疫、粮草、军心都在催人决断。',
        question: '淮南拖得太久了，前线后方一起在熬。阿颖，若战局不能速决，朕当军粮优先、民生优先，还是收缩战线？',
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
        question: '淮南的败报朕读了两遍，彻夜难眠。此时该先稳军心、收战线，还是强撑下去？',
        options: [
            { label: 'A', content: '稳军心再收线', effects: { socialOrder: 2, military: 1 }, riskNote: '进攻节奏会明显放缓' },
            { label: 'B', content: '强撑前线', effects: { military: 2, finance: -2, grain: -1 }, riskNote: '后方会迅速叫苦' },
            { label: 'C', content: '减压养民', effects: { socialOrder: 2, grain: 1, military: -1 }, riskNote: '北周压力暂时下降' },
            { label: 'D', content: '整顿军政秩序', effects: { governance: 2, finance: 1, military: -1 }, riskNote: '短期难见战果' },
        ],
        aiScoringFocus: '是否先守住国本，再为后续重整留空间',
        nextRoundFeedback: '失利后的止损效果会直接影响南陈后续再动员能力',
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
