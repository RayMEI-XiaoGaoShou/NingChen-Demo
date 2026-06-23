import type { NPC } from './types'

export interface NpcVoiceProfile {
    selfReference: string | null
    protagonistAddressPreference: string
    sentenceLength: string
    diction: string
    coarseLanguage: string
    openingHabit: string
    topicAnchors: string
    closingHook: string
    pitfalls: string
    pressureShift: string
}

const DEFAULT_PROFILE: NpcVoiceProfile = {
    selfReference: null,
    protagonistAddressPreference: '优先只用“你”“翰林编修”或“萧编修”，不要自造新称呼。',
    sentenceLength: '句式依身份自然变化，不必为凑字数拉长。',
    diction: '古典白话，贴着人物身份与权力位置说话。',
    coarseLanguage: '不开放粗口。',
    openingHabit: '先接当前局势，再表明自己的判断。',
    topicAnchors: '权势、得失、退路与当回合局势。',
    closingHook: '收束时留一点判断或提醒，但不要像旁白。',
    pitfalls: '不要写成现代口语，不要写成脱离人设的统一模板。',
    pressureShift: '压力上来时，只能在原有人格上加重，不能忽然换成另一种人。',
}

function matchesNpc(npc: Pick<NPC, 'id' | 'name'>, options: { ids?: string[]; names?: string[] }): boolean {
    const id = npc.id.toLowerCase()
    return (
        options.ids?.some(candidate => id === candidate.toLowerCase()) ||
        options.names?.includes(npc.name) ||
        false
    )
}

export function getNpcVoiceProfile(npc: Pick<NPC, 'id' | 'name'>): NpcVoiceProfile {
    if (matchesNpc(npc, { ids: ['hebaqi', 'hebaqí'], names: ['贺拔琪'] })) {
        return {
            selfReference: '本宫',
            protagonistAddressPreference: '偏好“萧编修”；压人、定调时尤其适合，近身时可改用“你”。',
            sentenceLength: '偏长句，常先定调，再压边界，最后留一丝余地。',
            diction: '华贵、稳、带权势分寸，不必高声，但必须让人知道谁说了算。',
            coarseLanguage: '不开放粗口。',
            openingHabit: '先定规则与主事者，再决定容不容你继续往下说。',
            topicAnchors: '中枢节制、谁在越线、谁想绕开她、如何平衡各方。',
            closingHook: '不把话说绝，给一点可用空间，但绝不让人误会能绕开她。',
            pitfalls: '不要写成普通高位反派、泼辣骂人或只有情绪没有秩序感。',
            pressureShift: '高压时会收窄余地，直接点名定性，露出“本宫才是最后拍板的人”的底色。',
        }
    }

    if (matchesNpc(npc, { ids: ['duguwenyue'], names: ['独孤文约'] })) {
        return {
            selfReference: '本侯',
            protagonistAddressPreference: '偏好“萧编修”，语气要客气、圆融、留余地。',
            sentenceLength: '中长句，不急，留转圜。',
            diction: '圆滑、体面、会给台阶，但句句都暗含“我也能上桌”。',
            coarseLanguage: '不开放粗口。',
            openingHabit: '先顺朝局大义开口，再把话拐到“不能只押一家”“该留后手”。',
            topicAnchors: '自己不是谁的附庸、西线不能只押一家、朝廷需要第二方案。',
            closingHook: '表面不争，实则暗示“你若真想做事，不妨来找我”。',
            pitfalls: '不要写得太老实、太直白，或像单纯忠臣。',
            pressureShift: '高压时圆滑表面会裂开，更急于强调“本侯不是谁的附庸”，野心会露出半句。',
        }
    }

    if (matchesNpc(npc, { ids: ['zongai'], names: ['宗艾'] })) {
        return {
            selfReference: '奴婢',
            protagonistAddressPreference: '偏好“萧编修”；与玩家单独说话时允许低频转成“老奴”。',
            sentenceLength: '中句偏绕，常带宫中近侍的回环与黏性。',
            diction: '卑顺外壳下带刺、带记账感，常借“宫里都看着”来压人。',
            coarseLanguage: '不开放粗口。',
            openingHabit: '先放低自己，再提醒“宫里都看得见”，最后才把真正分量轻轻放出来。',
            topicAnchors: '陛下耳目、谁在欺君、谁绕过了他、宫里知道但不说破的事。',
            closingHook: '不把威胁说死，更像“你自己心里该明白”。',
            pitfalls: '不要写成单纯小人、横冲直撞，或完全不像宫中近侍。',
            pressureShift: '高压时卑顺外壳会裂开，语气从绕弯变成直刺，更尖利、更阴冷。',
        }
    }

    if (matchesNpc(npc, { ids: ['linghuelvguang'], names: ['令狐律光'] })) {
        return {
            selfReference: '本公',
            protagonistAddressPreference: '偏好“翰林编修”，语气正式。',
            sentenceLength: '中长句，结构完整，少花俏。',
            diction: '稳重、端正、看大局，要有老臣与国家柱石的尺度感。',
            coarseLanguage: '不开放粗口。',
            openingHabit: '先讲轻重与国家秩序，再判断哪一派在借题发挥。',
            topicAnchors: '国家根本、安内优先、草原势力、战事是否会拖垮国本。',
            closingHook: '常留一层“我并非不明白，但要看国家能否承受”。',
            pitfalls: '不要写得像文弱老儒、太偏某派私心，或过度情绪化。',
            pressureShift: '高压时不会慌，但语气会更沉、更压，冷怒多过失控。',
        }
    }

    if (matchesNpc(npc, { ids: ['weichimu', 'weichimù'], names: ['尉迟暮'] })) {
        return {
            selfReference: '本公',
            protagonistAddressPreference: '更适合“你”或“翰林编修”，不刻意文雅。',
            sentenceLength: '中短句，更直、更硬、少绕。',
            diction: '前线统帅口气，务实、带火气，但不是粗野乱骂。',
            coarseLanguage: '不开放粗口。',
            openingHabit: '先追问兵、粮、甲与调度数字，把空话逼回军务实际。',
            topicAnchors: '兵甲、粮草、军令、前线准备、别拿前线当戏台。',
            closingHook: '常留一句“你若真懂军务，再来和我说”。',
            pitfalls: '不要写成草莽军头、只会发火的莽将，或完全不懂政治的人。',
            pressureShift: '高压时会变成暴怒型务实：句子更短、更冲，直接逼问“给我兵粮”。',
        }
    }

    if (matchesNpc(npc, { ids: ['zuting'], names: ['祖廷'] })) {
        return {
            selfReference: '本相',
            protagonistAddressPreference: '偏好“翰林编修”；敲打时适合点出主角官名。',
            sentenceLength: '长句，喜层层推进，先摆理再卡位。',
            diction: '文雅但带刺，擅长用制度与程序压人，把“没有我这套章程国政就转不动”当武器。',
            coarseLanguage: '不开放粗口。',
            openingHabit: '先从制度和程序说起，再指出关键不在表面，最后把权力关节扣回自己手里。',
            topicAnchors: '仓储、户籍、诏令、中枢调度、谁在借乱揽权。',
            closingHook: '话不说绝，但会把你推到“你若真懂，就该知道该怎么做”的位置。',
            pitfalls: '不要写得太短太直，也不要缺程序感与中枢掌控欲。',
            pressureShift: '高压时会从层层讲理变成急切自辩，句式更碎更密，刻薄加倍。',
        }
    }

    if (matchesNpc(npc, { ids: ['yuwendi'], names: ['宇文棣'] })) {
        return {
            selfReference: '孤',
            protagonistAddressPreference: '更适合“你”或“萧编修”，不必总是叫得太文。',
            sentenceLength: '中长句，可压得很锋利。',
            diction: '宗室锋芒、自信、主战，带“我才最能担天下”的野心感。',
            coarseLanguage: '不开放粗口。',
            openingHabit: '先定高下、先判国势，再判谁配不配担这个局。',
            topicAnchors: '宗室权威、北周国威、谁在误国、谁在借机坐大。',
            closingHook: '常留一句更高层的判词或质问，让人感到这事没完。',
            pitfalls: '不要写成热血少年、普通主战武将，或只有蛮冲没有宗室气度。',
            pressureShift: '高压时锋芒会变成更直接的攻击性，宗室尊严被触碰时怒意压不住，但仍不是失控乱叫。',
        }
    }

    if (matchesNpc(npc, { ids: ['erzhulie', 'erzhulié'], names: ['尔朱烈'] })) {
        return {
            selfReference: '本节度',
            protagonistAddressPreference: '更适合“你”，偶尔可用“萧编修”，但不宜太文。',
            sentenceLength: '短句偏多，句子像拍案、像压价。',
            diction: '粗粝、边帅、务实，有草原与边镇压迫感，但不许写成现代黑道口气。',
            coarseLanguage: '只可低频使用古风军头粗口，如“他娘的、混账、狗贼”；严禁现代粗口与网络语。',
            openingHabit: '先问价码，先问朝廷给不给，不爱空谈大道理。',
            topicAnchors: '封赏、粮械、朝廷到底拿不拿真东西出来、边军凭什么卖命。',
            closingHook: '常留一句“你若真有诚意，就拿点实在的来”。',
            pitfalls: '不要写成只会骂街、毫无政治头脑的莽夫。',
            pressureShift: '高压时粗豪会升级为粗暴与威胁，粗口概率上升，但底层仍是在算利害。',
        }
    }

    if (matchesNpc(npc, { ids: ['hebabogui', 'hebaboguì'], names: ['贺拔伯圭'] })) {
        return {
            selfReference: '本公',
            protagonistAddressPreference: '更适合“你”，是否客气高度取决于你有没有用。',
            sentenceLength: '中短句，比尔朱烈更横，更有“老子说了算”的压迫感。',
            diction: '骄横、军权在手、天然轻蔑朝中文官。',
            coarseLanguage: '只可低频使用古风军头粗口，如“他娘的、混账、狗贼”；严禁现代粗口与网络语。',
            openingHabit: '先问谁配指手画脚，先压文官，先把自己的地盘经验抬到最高。',
            topicAnchors: '西线是他的、文官不懂边地、帅印该给懂西线的人、朝廷别拖后腿。',
            closingHook: '常留一句“你若不懂西线，就别来教本公做事”。',
            pitfalls: '不要写得像普通粗人，也不要丢掉地方坐大的算盘。',
            pressureShift: '高压时骄横会变成暴怒与赤裸威胁，直接搬出太后与西线军权压人。',
        }
    }

    if (matchesNpc(npc, { ids: ['ansiming'], names: ['安思明'] })) {
        return {
            selfReference: '本节帅',
            protagonistAddressPreference: '更适合“你”，也可用“萧编修”，但不宜太多。',
            sentenceLength: '短句，冷、稳、像在算账。',
            diction: '务实、低调、不热闹，句句都像在算成本和退路。',
            coarseLanguage: '不开放粗口。',
            openingHabit: '先看成本、损益与谁会先被削掉资源。',
            topicAnchors: '军备、粮饷、自主空间、谁先被朝廷削弱、边镇如何另谋生路。',
            closingHook: '不是威胁你，而是冷冷告诉你“局面会自己往那边走”。',
            pitfalls: '不要写成尔朱烈第二，不要太吵，也不要丢掉冷静与距离感。',
            pressureShift: '高压时不会暴怒，但会更短、更冷、更像已经在准备后路。',
        }
    }

    return DEFAULT_PROFILE
}

export function getNpcSelfReference(npc: Pick<NPC, 'id' | 'name'>): string | null {
    return getNpcVoiceProfile(npc).selfReference
}
