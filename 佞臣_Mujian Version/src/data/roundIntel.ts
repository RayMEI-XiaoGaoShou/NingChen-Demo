export type RoundTheme =
    | 'southDebate'
    | 'huainanFriction'
    | 'springDrought'
    | 'steppeRaid'
    | 'hexiHarassment'
    | 'yizhouRevolt'
    | 'westCampaignDebate'
    | 'autumnFloodAudit'
    | 'southWarRenewed'
    | 'chenShuCampaign'
    | 'westPostwar'
    | 'steppeTribute'
    | 'epidemicOmens'
    | 'regencyStruggle'
    | 'northernLandGrab'
    | 'huainanCampaign'
    | 'prolongedWar'
    | 'steppeBlackmail'
    | 'grandPurge'
    | 'finalShowdown'

export interface RoundIntelEntry {
    round: number
    theme: RoundTheme
    coreNpcIds: string[]
    reactions: Partial<Record<string, string>>
    autoUnlocks?: Partial<Record<string, number>>
}

export const ROUND_INTEL: RoundIntelEntry[] = [
    {
        round: 1,
        theme: 'southDebate',
        coreNpcIds: ['yuwendi', 'zuting', 'hebaqí', 'zongai'],
        reactions: {
            yuwendi: '借新朝初定之势再提南征，想先把议程抢到宗室手里。',
            zuting: '嘴上不反统一，手里却死死攥着中枢节奏，不肯让帝党借战抢权。',
            hebaqí: '更在意局面必须稳在自己掌中，谁想绕开摄政先出头，她都会记下。',
            zongai: '默默观察谁敢替皇帝说话、谁又只是借皇帝做旗子。',
        },
    },
    {
        round: 2,
        theme: 'huainanFriction',
        coreNpcIds: ['weichimù', 'yuwendi', 'zuting', 'zongai'],
        reactions: {
            weichimù: '把淮南摩擦当成前线请兵与扩防的证据，语气越发强硬。',
            yuwendi: '正想把边境摩擦解释成“不可再忍”的先声，再逼朝堂靠向主战。',
            zuting: '盯着流民、边报与钱粮，只怕有人借摩擦扩大战事。',
            zongai: '开始在边报与宫中之间做信息闸门，衡量谁更值得皇帝信任。',
        },
        autoUnlocks: {
            zongai: 1,
        },
    },
    {
        round: 3,
        theme: 'springDrought',
        coreNpcIds: ['zuting', 'linghuelvguang', 'yuwendi', 'hebaqí'],
        reactions: {
            zuting: '想把赈灾、清仓、减赋都收归中枢，借灾年坐实自己的必要性。',
            linghuelvguang: '认定灾年不宜躁进，更担心有人拿军功压过安内次序。',
            yuwendi: '不愿让“灾年不可战”在朝堂坐实，仍想维持对陈强硬的姿态。',
            hebaqí: '把主持赈务视作巩固摄政威望的窗口，外柔内紧。',
        },
    },
    {
        round: 4,
        theme: 'steppeRaid',
        coreNpcIds: ['erzhulié', 'ansiming', 'linghuelvguang', 'zongai'],
        reactions: {
            erzhulié: '借边患抬价，觉得北朝越紧张，自己越值钱。',
            ansiming: '先盯军械与补给，想把每一次边情都换成更实在的筹码。',
            linghuelvguang: '一面压南征，一面也防着草原人借守边之名坐大。',
            zongai: '趁皇帝关心北边，悄悄把边情接进宫中耳目系统。',
        },
    },
    {
        round: 5,
        theme: 'hexiHarassment',
        coreNpcIds: ['hebaboguì', 'duguwenyue', 'zuting', 'yuwendi'],
        reactions: {
            hebaboguì: '张口便要兵要饷，把河西危机说成只有自己镇得住。',
            duguwenyue: '表面附和贺拔，心里却在算如何让中枢觉得自己更可用。',
            zuting: '最怕西线借危机独立成国，正琢磨怎样卡住饷权与任命。',
            yuwendi: '不愿国家重心完全被西线拖走，暗暗防着贺拔和后党借机结盟。',
        },
        autoUnlocks: {
            hebaboguì: 1,
            duguwenyue: 1,
        },
    },
    {
        round: 6,
        theme: 'yizhouRevolt',
        coreNpcIds: ['hebaboguì', 'duguwenyue', 'zuting', 'hebaqí'],
        reactions: {
            hebaboguì: '把平蜀视作扩大战区与兵权的机会，根本不愿别人插手。',
            duguwenyue: '嘴上请战，实则等着抓贺拔一旦失手后的替代机会。',
            zuting: '平叛可以，军政接管绝不能落到地方军头手里。',
            hebaqí: '既要稳住西线，又不肯让亲弟真借乱成尾大不掉之势。',
        },
    },
    {
        round: 7,
        theme: 'westCampaignDebate',
        coreNpcIds: ['hebaboguì', 'duguwenyue', 'zuting', 'yuwendi', 'hebaqí'],
        reactions: {
            hebaboguì: '对帅印志在必得，口气里已把战后秩序也一并算了进去。',
            duguwenyue: '最恨自己被当贺拔副手，越是争帅越想显出独立身价。',
            zuting: '把焦点放在谁筹饷、谁节制军令，想用制度卡死西线坐大。',
            yuwendi: '不想让西征复制出另一个权势中心，言辞里处处带刺。',
            hebaqí: '表面做裁断者，心里想的是谁都不能借此脱离自己掌控。',
        },
    },
    {
        round: 8,
        theme: 'autumnFloodAudit',
        coreNpcIds: ['zuting', 'hebaqí', 'linghuelvguang', 'duguwenyue'],
        reactions: {
            zuting: '把查仓看成重新清点谁握着国家命脉的绝佳时机。',
            hebaqí: '愿意借清查稳局，但不肯让此事只变成祖廷一人的扩权工程。',
            linghuelvguang: '最关心军粮链别在清仓中断掉，对借整顿伤军心极为敏感。',
            duguwenyue: '趁中枢忙着查仓，正悄悄盘算把西线资源链藏得更深。',
        },
    },
    {
        round: 9,
        theme: 'southWarRenewed',
        coreNpcIds: ['yuwendi', 'linghuelvguang', 'weichimù', 'zongai'],
        reactions: {
            yuwendi: '再次把“不可久拖”挂在嘴边，想借时局把南征议题抬回桌面中央。',
            linghuelvguang: '冷眼看主战再起，只觉得北周根基未稳，绝不能被声势裹挟。',
            weichimù: '若真要打，他只关心前线是否有人、粮、令齐备。',
            zongai: '知道大战略之争背后其实是皇权与摄政再分配，听得格外细。',
        },
    },
    {
        round: 10,
        theme: 'chenShuCampaign',
        coreNpcIds: ['hebaboguì', 'duguwenyue', 'zuting', 'yuwendi'],
        reactions: {
            hebaboguì: '把南陈征蜀当成证明“西线必须归我总领”的最好由头。',
            duguwenyue: '不愿南陈一动就只成全贺拔，急着让朝中看到第二方案。',
            zuting: '更关心蜀地若有新局，中央该如何把接管预案先写在前面。',
            yuwendi: '拿南陈主动出兵当作攻击后党守势的口实，越发咄咄逼人。',
        },
    },
    {
        round: 11,
        theme: 'westPostwar',
        coreNpcIds: ['hebaboguì', 'duguwenyue', 'zuting', 'hebaqí', 'linghuelvguang'],
        reactions: {
            hebaboguì: '张口就是“功在一线者当守一线”，已经在为战后固权铺路。',
            duguwenyue: '想把自己变成战后分权的关键调停者，绝不让贺拔独赢。',
            zuting: '把文武分权挂在嘴边，实则要把西线重新编回中枢机器里。',
            hebaqí: '想赏功而不纵兵，左右权衡得比谁都谨慎。',
            linghuelvguang: '最怕地方重兵坐大成惯例，对“熟地当久任”的说法极警惕。',
        },
    },
    {
        round: 12,
        theme: 'steppeTribute',
        coreNpcIds: ['erzhulié', 'ansiming', 'linghuelvguang', 'zongai'],
        reactions: {
            erzhulié: '对岁赐互市开价更高，觉得朝廷总得拿真金白银承认自己价值。',
            ansiming: '对互市背后能换来多少甲具更感兴趣，情绪始终冷静。',
            linghuelvguang: '认定草原人不可纵，正想借此压一压他们的坐地起价。',
            zongai: '悄悄计算这条线能否被皇帝拿来做一只不见光的手。',
        },
    },
    {
        round: 13,
        theme: 'epidemicOmens',
        coreNpcIds: ['hebaqí', 'zuting', 'zongai', 'yuwendi'],
        reactions: {
            hebaqí: '最怕灾异被解释成摄政失德，嘴上镇定，手里已经在压谣。',
            zuting: '宁可重典止谣，也不愿让谶言把行政秩序冲散。',
            zongai: '觉得这是改写“天意在谁”的好时机，宫中耳目都活了起来。',
            yuwendi: '若谶言能削太后名分，他绝不会错过顺势添火的机会。',
        },
        autoUnlocks: {
            zongai: 1,
            hebaqí: 1,
            yuwendi: 1,
        },
    },
    {
        round: 14,
        theme: 'regencyStruggle',
        coreNpcIds: ['zongai', 'yuwendi', 'hebaqí', 'zuting'],
        reactions: {
            zongai: '在归政之争中忽然变得极值钱，因为谁都想借他通到皇帝身边。',
            yuwendi: '把归政说成宗室与皇权的天理，实则也要借此压后党。',
            hebaqí: '明知归政迟早要来，却绝不愿在自己失控的节奏里交权。',
            zuting: '口口声声要有次第，背后其实在守自己多年的中枢总阀门。',
        },
        autoUnlocks: {
            zongai: 1,
            yuwendi: 1,
        },
    },
    {
        round: 15,
        theme: 'northernLandGrab',
        coreNpcIds: ['zuting', 'linghuelvguang', 'hebaqí', 'yuwendi'],
        reactions: {
            zuting: '把检籍与抑兼并当成再把手伸进地方的机会，决意不肯放软。',
            linghuelvguang: '觉得地方都烂成这样了，再去躁进外战就是自坏根本。',
            hebaqí: '想整顿地方，却更怕改革过猛把反弹一并引爆。',
            yuwendi: '正把地方失控说成后党治国失当，好为自己的强力路线铺台阶。',
        },
    },
    {
        round: 16,
        theme: 'huainanCampaign',
        coreNpcIds: ['weichimù', 'yuwendi', 'linghuelvguang', 'zongai'],
        reactions: {
            weichimù: '要兵、要粮、要授权，一句都不绕弯，前线压力全写在脸上。',
            yuwendi: '把举国应战说成不容置疑的大义，顺手继续逼后党交资源。',
            linghuelvguang: '并非不救淮南，只是绝不肯为此掏空都城与北边。',
            zongai: '知道战报、捷报、忧报都会变成宫中权力，因此听得比谁都细。',
        },
    },
    {
        round: 17,
        theme: 'prolongedWar',
        coreNpcIds: ['weichimù', 'zuting', 'linghuelvguang', 'yuwendi'],
        reactions: {
            weichimù: '最怕久战无功后全朝把锅扣到前线，因此要援更急也更躁。',
            zuting: '开始盘算怎样把财政崩压重新定义成前线无度索取，而非中枢无能。',
            linghuelvguang: '觉得“安内为先”已被现实证明，只等谁先露出破绽。',
            yuwendi: '嘴上仍硬，心里已开始找谁能为久战负责、为自己卸压。',
        },
    },
    {
        round: 18,
        theme: 'steppeBlackmail',
        coreNpcIds: ['erzhulié', 'ansiming', 'linghuelvguang', 'zongai'],
        reactions: {
            erzhulié: '看准北周主力南顾，把自己从边将抬成“不可缺的国柱”来叫价。',
            ansiming: '一边收资源，一边把目光重新投回草原，不肯只做北周附庸。',
            linghuelvguang: '对边镇讹君最为反感，正想找机会狠狠压一次。',
            zongai: '若皇帝想自握一支暗线边军，此刻正是试探草原人的窗口。',
        },
    },
    {
        round: 19,
        theme: 'grandPurge',
        coreNpcIds: ['zuting', 'hebaqí', 'yuwendi', 'zongai', 'hebaboguì'],
        reactions: {
            zuting: '把大整肃视为最后一次重收机器与人事的机会，手会越来越狠。',
            hebaqí: '知道非常时要用非常法，却也怕整肃过头反噬自己经营多年的秩序。',
            yuwendi: '不反对整肃，但决不愿让刀子只落在帝党头上。',
            zongai: '大乱局最适合他穿针引线，只要谁更需要皇帝的声音，他就向谁靠近。',
            hebaboguì: '若中央真想借整肃碰西线，他会立刻把地方反噬摆上桌面。',
        },
        autoUnlocks: {
            zuting: 1,
            hebaqí: 1,
            hebaboguì: 1,
        },
    },
    {
        round: 20,
        theme: 'finalShowdown',
        coreNpcIds: ['yuwendi', 'hebaqí', 'zuting', 'linghuelvguang', 'weichimù', 'hebaboguì', 'duguwenyue', 'erzhulié', 'ansiming', 'zongai'],
        reactions: {
            yuwendi: '已把最后底牌尽数摊开，只想赢或找出该背锅的人。',
            hebaqí: '最终想守住的，既是国家中枢，也是自己一系的存续。',
            zuting: '仍然相信只要机器还攥在手里，局面就还有得救。',
            linghuelvguang: '到终局只问谁在救国、谁在救派系，心里已分得很清。',
            weichimù: '只求前线别在最后一口气上断粮断援。',
            hebaboguì: '先保地盘，再谈朝廷；这是他到终局也不会改的算盘。',
            duguwenyue: '不管谁赢都想留下自己继续谈条件的位置。',
            erzhulié: '还在算这场终局能给自己换来多高的中原身份。',
            ansiming: '越到最后越冷静，始终盯着真正能带走的资源。',
            zongai: '只要皇帝还需要看忠奸，他就仍有最后的交易价值。',
        },
    },
]

export function getRoundIntel(round: number): RoundIntelEntry | undefined {
    return ROUND_INTEL.find(entry => entry.round === round)
}
