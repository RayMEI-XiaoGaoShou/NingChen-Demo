import type { PlayerDangerStage } from './types'

export interface EmpressConcernTemplate {
    round: number
    title: string
    opening: string
    closingHint: string
}

const DEFAULT_CONCERN: EmpressConcernTemplate = {
    round: 0,
    title: '常规密札',
    opening: '展信时，建康夜雨未歇。朕知你在北庭周旋，字字都不能写得太满，便先问你一句：近来可还安稳？',
    closingHint: '结尾宜叮嘱萧宝颖先保周全，再言后局。',
}

export const EMPRESS_CONCERN_TEMPLATES: EmpressConcernTemplate[] = [
    {
        round: 1,
        title: '新君初政',
        opening: '建康春寒未退，朕初临大政，案上奏牍堆得比宫墙还高。读你来札时，倒先想问你一句：北庭风声可还容你安坐？',
        closingHint: '结尾宜落在“朕会先稳住第一步，你也要稳住自己”这一层。',
    },
    {
        round: 2,
        title: '流民南渡',
        opening: '江北流民日日南下，朕看州县急报，便想起你也隔在乱局那头。阿颖，若北地风雪与人潮逼近你身边，先顾衣食。',
        closingHint: '结尾宜把安民与自保并写，不要只谈政令。',
    },
    {
        round: 3,
        title: '灾年粮价',
        opening: '闻北地旱气渐重，粮价牵动江南，朕读你来札，先念你身边粮药可足。国事虽急，人若先折在局中，便再无后着。',
        closingHint: '结尾宜提醒灾年治国不可急，也提醒萧宝颖避开饥疫乱象。',
    },
    {
        round: 4,
        title: '北线喘息',
        opening: '北周北线吃紧，江南暂得一口气。可朕知道，你在北庭未必就能喘息；越是别人忙乱，越容易有人忽然回头看你。',
        closingHint: '结尾宜写“南朝可趁机整备，你在北边也要藏住锋芒”。',
    },
    {
        round: 5,
        title: '荆益预置',
        opening: '荆益舆图铺在案上，朕看粮道山川，便想起你隔着千里替朕看北朝裂缝。阿颖，这些远计，都压在眼前一笔一划里。',
        closingHint: '结尾宜把远图与耐心相连，不许轻许速胜。',
    },
    {
        round: 6,
        title: '蜀中生变',
        opening: '蜀中风声传到建康时，宫灯已近三更。朕知战机诱人，可更知你在北朝听见的每一句乱言，都可能先伤到你自己。',
        closingHint: '结尾宜强调“可借势，不可露势”。',
    },
    {
        round: 7,
        title: '三线分力',
        opening: '巴东、江陵、荆州三处来报，人人都说自己最急。朕读你信时，却想你在北庭也日日被人拉扯，想来最懂取舍二字。',
        closingHint: '结尾宜落在“有所不取，才有一处能成”。',
    },
    {
        round: 8,
        title: '仓储漕运',
        opening: '江南仓账铺开，朕看得心烦，便暂搁笔读你的来札。你若在北边也听见清仓核账之声，切记先避其锋。',
        closingHint: '结尾宜把“清账要有次第”和“行事要有余地”并写。',
    },
    {
        round: 9,
        title: '征蜀取舍',
        opening: '这些年江南攒下的一点气力，终于到了要不要押出去的时候。阿颖，朕读你字里分寸，知道你也在替这一步心惊。',
        closingHint: '结尾宜写“战机可争，国本不可赌尽”。',
    },
    {
        round: 10,
        title: '征蜀军起',
        opening: '征蜀军书已下，前线鼓角催人。朕读你来札，先问的却不是胜负，是你在北边可曾被这阵风吹到身上。',
        closingHint: '结尾宜把后勤、节奏与萧宝颖自保并列。',
    },
    {
        round: 11,
        title: '蜀地余波',
        opening: '蜀地消息入建康，或喜或忧，都不敢轻写在脸上。阿颖，你在北边看这场战事余波，想必比朕更知人心反复。',
        closingHint: '结尾宜写“得地须得人，失手须止损”，并提醒主角暂避余波。',
    },
    {
        round: 12,
        title: '战后财用',
        opening: '度支簿册日日催朕，战后一笔一笔都是钱粮。朕读你的信，倒想起你在北边经营人心，也一样每一步都有代价。',
        closingHint: '结尾宜把战与养的分寸写成克制叮嘱。',
    },
    {
        round: 13,
        title: '疫疠寺院',
        opening: '北地疫气与流民相逼，朕最怕你在乱人乱事之间也受牵连。你回札说国政，朕却先问你一句：可曾避开病气？',
        closingHint: '结尾宜写“安民要借力，国本不可旁落”，并叮嘱主角避疫。',
    },
    {
        round: 14,
        title: '北朝暗斗',
        opening: '北朝帝后相疑的消息传来，朕看得越明白，越担心你身在漩涡。阿颖，情报二字贵在有用，也贵在不害其人。',
        closingHint: '结尾宜提醒情报要藏线索，也要藏人。',
    },
    {
        round: 15,
        title: '检籍土断',
        opening: '江南田亩户籍之弊，朕早知不能再拖。只是每查一户，便会惊动一方旧族；你在北边周旋，想来也懂这种刀背上的分寸。',
        closingHint: '结尾宜写“查得下去，也要让人心接得住”。',
    },
    {
        round: 16,
        title: '淮南军书',
        opening: '淮南军书压到案前，朕读你的字，倒更想起你也在另一处战场。南朝要争兵机，你在北边也要争一线生路。',
        closingHint: '结尾宜强调战役可进，后勤与性命不可轻掷。',
    },
    {
        round: 17,
        title: '久战疲态',
        opening: '久战最磨人，磨粮、磨兵，也磨心。朕知你在北边看得更冷，所以这封回批，既问国策，也问你还能撑几分。',
        closingHint: '结尾宜落在“守住民心，也守住自己”。',
    },
    {
        round: 18,
        title: '边镇经营',
        opening: '边镇之议最难，给权则恐坐大，不给权又误军机。朕想起你在北朝诸人之间借力，也正是日日行在这条窄桥上。',
        closingHint: '结尾宜写权力要有缰绳，行事要留退路。',
    },
    {
        round: 19,
        title: '非常时体制',
        opening: '十年局势逼到眼前，朕知你我都已不能回头。可越到此时，越要把心气压住，不能让最后一局毁在一口急气里。',
        closingHint: '结尾宜克制而沉重，提醒非常之策不可伤尽人心。',
    },
    {
        round: 20,
        title: '终局北伐',
        opening: '南北终局已近，朕展你来札，许久未落朱笔。阿颖，这些年你在北边忍下的风霜，朕都记得。',
        closingHint: '结尾宜有终局感：江南事由朕担住，北边最后一程仍望他保全自己。',
    },
]

export function getEmpressConcernTemplate(round: number): EmpressConcernTemplate {
    return EMPRESS_CONCERN_TEMPLATES.find(item => item.round === round) ?? DEFAULT_CONCERN
}

export function getPlayerDangerConcernOverlay(stage: PlayerDangerStage): string {
    if (stage === 'under_review') {
        return '萧宝颖眼下已被北周纳入审查，回信应先让他自保，少写满话。'
    }
    if (stage === 'under_watch') {
        return '萧宝颖眼下已被北周留意，回信应半是提醒、半是寄望，语气要更收。'
    }
    return '萧宝颖眼下尚可周旋，回信可多一分期许，但仍要提醒他别把自己也赔进局里。'
}
