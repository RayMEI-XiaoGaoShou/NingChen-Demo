export interface CharacterCanon {
    id: string
    name: string
    identity: string
    allowedAddress: string[]
    forbiddenAddress: string[]
    note?: string
}

export const CHARACTER_CANON_BY_ID: Record<string, CharacterCanon> = {
    hebaqí: {
        id: 'hebaqí',
        name: '贺拔琪',
        identity: '北周太后、摄政者',
        allowedAddress: ['太后', '太后娘娘', '帘前', '贺拔琪'],
        forbiddenAddress: ['殿下', '皇后', '公主', '女帝'],
        note: '可自称“本宫”；她是北周摄政太后，不是南陈女帝。',
    },
    duguwenyue: {
        id: 'duguwenyue',
        name: '独孤文约',
        identity: '后将军、上柱国、澜侯',
        allowedAddress: ['独孤将军', '澜侯', '独孤文约'],
        forbiddenAddress: ['节度使', '王爷', '殿下'],
    },
    zongai: {
        id: 'zongai',
        name: '宗艾',
        identity: '中常侍、宫中信息节点',
        allowedAddress: ['中常侍', '宗常侍', '宗艾'],
        forbiddenAddress: ['公公', '大王', '殿下'],
        note: '可自称“奴婢”或“老奴”，但不应被写成文武重臣。',
    },
    linghuelvguang: {
        id: 'linghuelvguang',
        name: '令狐律光',
        identity: '上柱国、秦国公、都督河北诸军事',
        allowedAddress: ['秦国公', '令狐公', '令狐律光'],
        forbiddenAddress: ['节度使', '殿下', '王爷'],
    },
    weichimù: {
        id: 'weichimù',
        name: '尉迟暮',
        identity: '上柱国、梁国公、都督河南诸军事',
        allowedAddress: ['梁国公', '尉迟公', '尉迟暮'],
        forbiddenAddress: ['节度使', '殿下', '王爷'],
    },
    zuting: {
        id: 'zuting',
        name: '祖廷',
        identity: '右丞相、文安侯',
        allowedAddress: ['右丞相', '祖相', '祖廷'],
        forbiddenAddress: ['太傅', '国师', '殿下'],
        note: '可自称“本相”；不得被写成南陈官员。',
    },
    yuwendi: {
        id: 'yuwendi',
        name: '宇文棣',
        identity: '左丞相、燕王、宗室主战派',
        allowedAddress: ['燕王', '王爷', '左丞相', '宇文棣'],
        forbiddenAddress: ['太子', '少帝', '储君', '皇帝', '陛下'],
        note: '可自称“孤”；他不是太子、少帝或北周皇帝。',
    },
    erzhulié: {
        id: 'erzhulié',
        name: '尔朱烈',
        identity: '北庭节度使、上柱国',
        allowedAddress: ['尔朱节度', '北庭节度', '尔朱烈'],
        forbiddenAddress: ['王爷', '殿下', '丞相'],
    },
    hebaboguì: {
        id: 'hebaboguì',
        name: '贺拔伯圭',
        identity: '卫将军、上柱国、北地公、都督河西陇右诸军事',
        allowedAddress: ['北地公', '贺拔公', '贺拔伯圭'],
        forbiddenAddress: ['王爷', '殿下', '太子'],
    },
    ansiming: {
        id: 'ansiming',
        name: '安思明',
        identity: '卢龙节度使、上柱国',
        allowedAddress: ['安节帅', '卢龙节度', '安思明'],
        forbiddenAddress: ['王爷', '殿下', '丞相'],
    },
}

const EXTRA_CANON: Record<string, CharacterCanon> = {
    萧宝颖: {
        id: 'xiaobaoying',
        name: '萧宝颖',
        identity: '南陈暗线人物；公开身份是北周邺都朝廷的翰林编修',
        allowedAddress: ['你', '翰林编修', '萧编修', '萧宝颖'],
        forbiddenAddress: ['计相', '计编修', '相国', '将军'],
        note: '北周 NPC 常规情况下只知道公开身份，不知道她是南陈内应。',
    },
    陈倩: {
        id: 'chenqian',
        name: '陈倩',
        identity: '南陈女帝，身在建康/江南',
        allowedAddress: ['女帝', '陛下', '朕', '陈倩'],
        forbiddenAddress: ['太后', '殿下', '皇后', '北周女帝'],
        note: '她给萧宝颖写密批时自称“朕”，可偶尔称对方“阿颖”或“宝颖”。',
    },
    冯道之: {
        id: 'fengdaozhi',
        name: '冯道之',
        identity: '公开身份是北周国子监祭酒，暗中为南陈传信和献策',
        allowedAddress: ['冯祭酒', '冯道之', '先生'],
        forbiddenAddress: ['全知旁白', '系统裁判', '南陈公开使臣'],
        note: '只依据玩家已知信息献策，不得表现为全知系统旁白。',
    },
}

const CANON_BY_NAME: Record<string, CharacterCanon> = [
    ...Object.values(CHARACTER_CANON_BY_ID),
    ...Object.values(EXTRA_CANON),
].reduce<Record<string, CharacterCanon>>((acc, canon) => {
    acc[canon.name] = canon
    return acc
}, {})

const HIGH_RISK_NAMES = ['萧宝颖', '陈倩', '冯道之', '贺拔琪', '宇文棣']

export function buildWorldCanonBlock(): string {
    return [
        '世界观宪法：',
        '- 游戏正典优先于真实历史；不得引入现实南北朝人物、年号、官职关系来改写本游戏设定。',
        '- 萧宝颖真实身份是南陈暗线人物；萧宝颖公开身份是北周邺都朝廷的翰林编修。北周 NPC 常规情况下不得知道她是南陈内应。',
        '- 陈倩身在南陈建康/江南，是南陈女帝，自称“朕”。',
        '- 萧宝颖身在北周/北庭/邺都，危险来自北周朝堂和北边风声；不得写成“南风伤你”，也不得把她写成在南方受险。',
        '- 北周南征是北周向南压迫南陈；南陈征蜀、征淮南是南陈自南方推进，不得倒置攻守方向。',
        '- 冯道之公开身份是北周国子监祭酒，暗中为南陈传信和献策；不得表现为全知系统旁白。',
    ].join('\n')
}

export function buildAddressCanonBlock(names: Array<string | null | undefined> = []): string {
    const orderedNames = [...HIGH_RISK_NAMES, ...names.filter((name): name is string => Boolean(name))]
    const seen = new Set<string>()
    const lines = orderedNames
        .map(name => CANON_BY_NAME[name])
        .filter((canon): canon is CharacterCanon => Boolean(canon))
        .filter(canon => {
            if (seen.has(canon.id)) return false
            seen.add(canon.id)
            return true
        })
        .map(canon => {
            const base = `- ${canon.name}：可称${formatQuotedList(canon.allowedAddress)}；身份是${canon.identity}；禁称${formatQuotedList(canon.forbiddenAddress)}。`
            return canon.note ? `${base}${canon.note}` : base
        })

    return ['称谓白名单：', ...lines].join('\n')
}

export function buildChronicleCanonBlock(): string {
    return [
        '史书正典边界：',
        '- 《南北朝通鉴》只能据输入事实编修；不得新增具名南陈朝臣、虚构日期、虚构爵位或官职。',
        '- 宇文棣：左丞相、燕王、宗室主战派；可称“燕王”“王爷”“左丞相”“宇文棣”；禁称“太子”“少帝”“储君”“皇帝”“陛下”。',
        '- 贺拔琪：北周太后、摄政者；可称“太后”“太后娘娘”“帘前”；禁称“殿下”。',
        '- 陈倩：南陈女帝，身在建康/江南；不得写成北周太后、皇后或殿下。',
        '- 萧宝颖：史书叙事一律称“萧宝颖”，不要用“计相”“计编修”或自造官称。',
    ].join('\n')
}

export function buildCompactCanonBlock(): string {
    return [
        '正典速记：',
        '- 游戏正典优先于真实历史，不要引入现实人物、年号或官职关系改写设定。',
        '- 萧宝颖公开身份是北周邺都朝廷的翰林编修；北周 NPC 常规情况下不知道她是南陈内应。',
        '- 萧宝颖在北周/北庭/邺都，陈倩在南陈建康/江南，不得南北倒置。',
        '- 宇文棣是左丞相、燕王，不是太子/少帝/储君/皇帝。',
        '- 贺拔琪是北周太后/摄政者，不称殿下。',
    ].join('\n')
}

function formatQuotedList(items: string[]): string {
    return items.map(item => `“${item}”`).join('')
}
