export interface HistoricalAidEntry {
    geoHint: string
    factionHint: string
    strategyHint: string
    hotspots: string[]
}

export const HISTORICAL_AID: Record<number, HistoricalAidEntry> = {
    1: { geoHint: '关中是北周中枢，淮南则是南北缓冲前线。', factionHint: '帝党与后党都在抢“由谁定义国策”的先手。', strategyHint: '这一回合先学会看人、看党争、看谁值得下手。', hotspots: ['关中', '淮南', '建康'] },
    2: { geoHint: '淮南贴着南陈北境，江北流民南渡会直接冲击沿江州郡。', factionHint: '朝堂争的是赈济与边防名义，地方争的是谁来吃下流民负担。', strategyHint: '要么借乱放大北周内耗，要么帮南陈把人口变成资源。', hotspots: ['淮南', '江北', '建康'] },
    3: { geoHint: '春旱影响的是北方粮价与仓储，余波会传到整个南北贸易与流民链。', factionHint: '灾年最容易暴露中枢、地方、豪强之间的执行裂缝。', strategyHint: '灾年适合打仓廪、饷权与名分，不必急着直碰军权。', hotspots: ['河北', '关中', '建康'] },
    4: { geoHint: '草原方向压迫北周北线，给南陈腾出一段喘息窗口。', factionHint: '掌兵人物在这种回合更值钱，因为边议就是兵权议。', strategyHint: '这是练兵与布情报的窗口，不宜浪费在无关口舌上。', hotspots: ['草原', '河北', '建康'] },
    5: { geoHint: '河西商道连着西域贸易与军需输送，出问题会伤财也伤军。', factionHint: '陇右与外部掌兵者会借“西线负担”抬价。', strategyHint: '这类回合适合撬动外部权力人物，而不只是朝堂文臣。', hotspots: ['河西', '陇右', '关中'] },
    6: { geoHint: '益州与蜀地一旦生变，就会同时牵动西线军政与南陈荆益布局。', factionHint: '朝廷怕割据，地方豪强盯着趁乱自保，外部人物则看朝廷是否失控。', strategyHint: '适合试探暗线，先判断谁会借蜀局抬价。', hotspots: ['益州', '荆益', '关中'] },
    7: { geoHint: '巴东、江陵、荆州是一条后勤与军事联动线。', factionHint: '资源投哪一线，决定谁在之后的战议里更有话语权。', strategyHint: '这是“取舍”回合，不是“全都要”回合。', hotspots: ['巴东', '江陵', '荆州'] },
    8: { geoHint: '仓储、漕运和清仓都关系国家动员速度，不只是粮食多少。', factionHint: '谁掌仓，谁就掌一部分战时节奏。', strategyHint: '适合打治理链和执行链，让敌国机器慢下来。', hotspots: ['漕运线', '关中', '建康'] },
    9: { geoHint: '西线未靖时谈南征，本质是在赌北周能否双线承压。', factionHint: '帝党会借窗口抬南征声量，后党则会强调内政代价。', strategyHint: '这是南征压力抬头的节点，要密切盯住掌兵与掌饷者。', hotspots: ['关中', '淮南', '河西'] },
    10: { geoHint: '征蜀战场重后勤、重山道，不是平原猛冲。', factionHint: '军方、后勤与地方接应三条线都会被战事重新分配资源。', strategyHint: '军事建设与情报体系会在此后几回合持续发酵。', hotspots: ['蜀地', '荆益', '建康'] },
    11: { geoHint: '战后争兵权，往往比战时更像内战。', factionHint: '谁拿“善后”名义，谁就可能拿走未来的调兵权。', strategyHint: '这是拆关系结构的好时机。', hotspots: ['关中', '河北', '淮南'] },
    12: { geoHint: '互市与边患并存时，北周既要钱也要边防稳。', factionHint: '朝堂会围绕“继续打还是先养”重新分裂。', strategyHint: '若要拖慢北周，就该同时伤财政、军需与边镇信心。', hotspots: ['草原', '河北', '关中'] },
    13: { geoHint: '疫疠与谶言扩散最快的，是交通线与都市权力中心。', factionHint: '宫廷、寺院、朝臣都会抢解释权。', strategyHint: '谶纬最适合在这类回合出手，目标不是军力而是名分。', hotspots: ['关中', '河北', '建康'] },
    14: { geoHint: '归政暗斗发生在宫廷与中枢，不在边地。', factionHint: '帝党、后党都在抢“谁代表天命与法统”。', strategyHint: '这是谶纬、谗言与献策都很强的政治回合。', hotspots: ['宫中', '关中', '建康'] },
    15: { geoHint: '兼并与隐户看似地方问题，实际会啃空税基与兵源。', factionHint: '豪强、寺院、州县与中枢都在争“谁承担代价”。', strategyHint: '适合从治理和法统两端一起施压。', hotspots: ['州郡', '河北', '建康'] },
    16: { geoHint: '寿春与淮南是北伐跳板，谁掌这里谁就接近改写南北态势。', factionHint: '一旦战役开打，帝党会更强势，后党则会拿后勤与民力反制。', strategyHint: '这是南征高压窗口，外部人物和掌兵者的态度最关键。', hotspots: ['寿春', '淮南', '建康'] },
    17: { geoHint: '久战最伤的是前后方连接，不只是前线兵数。', factionHint: '兵、粮、财、民心会同时互相拖累。', strategyHint: '这类回合最容易出现体系性裂口，也是割据/造反的沃土。', hotspots: ['淮南', '关中', '建康'] },
    18: { geoHint: '草原抬价会把北周边贸、军需与政治妥协绑在一起。', factionHint: '外部人物会趁朝廷顾此失彼时重新谈价。', strategyHint: '若外部人物已离心，这一回合很适合逼他们明牌。', hotspots: ['草原', '河北', '关中'] },
    19: { geoHint: '大清查大整肃会把恐惧传遍中枢与地方。', factionHint: '所有人都会先自保，再谈站队。', strategyHint: '谶纬与构陷都可能在此回合造成极强放大效应。', hotspots: ['关中', '河北', '宫中'] },
    20: { geoHint: '终局不是单一战场，而是南北两套国家机器谁先撑不住。', factionHint: '朝堂、外部势力与南陈国力都在这里汇总结算。', strategyHint: '你要看的不是某一条线赢没赢，而是整体结构是否已经反超。', hotspots: ['关中', '淮南', '建康'] },
}
