import type { RoundPhase } from './types'

export type DowagerOfferingMedium = 'painting' | 'music'
export type DowagerOfferingFinalTier = 'excellent' | 'qualified' | 'barely' | 'disappointed' | 'offensive'
export type DowagerOptionFitTier = 'high' | 'partialStrong' | 'partialWeak' | 'drift' | 'risk'
export type DowagerFreeJudgementTier = DowagerOptionFitTier | 'severeOffense'
export type DowagerMediaTaskStatus = 'pending' | 'succeeded' | 'failed' | 'timeout' | 'abandoned'
export type DowagerMediaTaskProvider = 'doubao_seedream' | 'minimax_music' | 'mock'
export type DowagerMediaTaskType = 'dowager_painting' | 'dowager_music'
export type DowagerImageGenerationResponseFormat = 'url' | 'b64_json'
export type DowagerMusicGenerationOutputFormat = 'url' | 'hex'
export type DowagerMusicAudioFormat = 'mp3' | 'wav' | 'pcm'

export interface DowagerOfferingScheduleEntry {
    creationRound: number
    reviewRound: number
    poemId: string
    rubricVersion: string
    enabled: boolean
}

export interface DowagerOfferingOption {
    id: string
    label: string
    fitTier: DowagerOptionFitTier
    baseScore: number
    risk: 'none' | 'ordinary'
    canonicalKey: string
    aliases?: string[]
    evidence: string
    visualInstruction?: string
}

export interface DowagerOfferingCategory {
    id: string
    label: string
    maxSelections: number
    weight: number
    options: DowagerOfferingOption[]
}

export interface DowagerStyleReference {
    id: string
    label: string
    promptHint: string
    imageSrc: string
}

export interface DowagerImagePromptProfile {
    subjectTitle: string
    coreMeaning: string
    emotionalTone: string
    avoidTone: string
}

export interface DowagerMusicPromptProfile {
    subjectTitle: string
    coreMeaning: string
    emotionalArc: string
    tempoHint: string
    avoidTone: string
}

export interface DowagerPoemContent {
    id: string
    title: string
    sourceAuthor: string
    bodyLines: string[]
    imagePromptProfile: DowagerImagePromptProfile
    musicPromptProfile: DowagerMusicPromptProfile
    mediums: Record<DowagerOfferingMedium, {
        label: string
        categories: DowagerOfferingCategory[]
    }>
    styleReferences: DowagerStyleReference[]
}

export interface DowagerOfferingCategorySelection {
    presetOptionIds: string[]
    freeText?: string
}

export type DowagerOfferingSelections = Record<string, DowagerOfferingCategorySelection>

export interface DowagerOfferingScoreInput {
    poemId: string
    medium: DowagerOfferingMedium
    selections: DowagerOfferingSelections
    freeInputJudgements?: Record<string, Record<string, DowagerFreeInputJudgement>>
}

export interface DowagerFreeInputJudgement {
    tier: DowagerFreeJudgementTier
    evidence?: string
    visualInstruction?: string
}

export type DowagerFreeInputVisualInstructions = Record<string, Record<string, string>>
export type DowagerFreeInputMusicInstructions = Record<string, Record<string, string>>

export interface DowagerPaintingPromptInput {
    poemId: string
    styleReferenceId: string
    selections: DowagerOfferingSelections
    freeInputVisualInstructions?: DowagerFreeInputVisualInstructions
}

export interface DowagerMusicPromptInput {
    poemId: string
    selections: DowagerOfferingSelections
    freeInputMusicInstructions?: DowagerFreeInputMusicInstructions
}

export interface DowagerFreeInputSummary {
    categoryId: string
    tag: string
    score: number
    tier: DowagerFreeJudgementTier | 'fallbackDrift'
    rewardApplied: boolean
    mergedIntoPresetId?: string
    riskFlag?: 'ordinary' | 'severe'
    evidence: string
}

export interface DowagerCategoryScore {
    categoryId: string
    label: string
    score: number
    selectedCount: number
    selectedLabels: string[]
}

export interface DowagerOfferingScoreResult {
    poemId: string
    medium: DowagerOfferingMedium
    finalScore: number
    finalTier: DowagerOfferingFinalTier
    favorDelta: number
    categoryScores: Record<string, DowagerCategoryScore>
    freeInputSummaries: DowagerFreeInputSummary[]
    publicEvidence: string
    evaluationSummaryForDowager: string
    fallbackUsed: boolean
}

export interface DowagerMediaGenerationRequest {
    model: string
    prompt: string
    image?: string[]
    response_format?: DowagerImageGenerationResponseFormat
    size?: string
    watermark?: boolean
    output_format?: DowagerMusicGenerationOutputFormat
    stream?: boolean
    is_instrumental?: boolean
    lyrics_optimizer?: boolean
    audio_setting?: {
        sample_rate: number
        bitrate: number
        format: DowagerMusicAudioFormat
    }
}

export interface DowagerMediaTask {
    taskId: string
    status: DowagerMediaTaskStatus
    submittedAt: number
    displayText: string
    provider?: DowagerMediaTaskProvider
    taskType?: DowagerMediaTaskType
    promptVersion?: string
    styleReferenceId?: string | null
    referenceImageSrc?: string | null
    resultImageSrc?: string | null
    prompt?: string
    request?: DowagerMediaGenerationRequest
}

export interface PendingDowagerOffering {
    id: string
    creationRound: number
    validationRound: number
    poemId: string
    poemTitle: string
    rubricVersion: string
    medium: DowagerOfferingMedium
    selections: DowagerOfferingSelections
    styleReferenceId: string | null
    mediaTask: DowagerMediaTask
    scoreResult: DowagerOfferingScoreResult | null
    favorApplied: boolean
}

export interface DowagerOfferingRecord {
    id: string
    creationRound: number
    validationRound: number
    poemId: string
    poemTitle: string
    medium: DowagerOfferingMedium
    styleReferenceId?: string | null
    selectedPresetOptionIds: Record<string, string[]>
    freeInputTags: Record<string, string[]>
    mediaStatus: DowagerMediaTaskStatus
    mediaDisplayText: string
    mediaResultImageSrc?: string | null
    finalScore: number
    finalTier: DowagerOfferingFinalTier
    favorDelta: number
    favorAfter: number
    dowagerComment: string
    evaluationSummaryForDowager: string
    fallbackUsed: boolean
}

export interface DowagerFavorPresentation {
    label: string
    className: 'risk-safe' | 'risk-warning' | 'risk-critical'
    summary: string
}

export const INITIAL_DOWAGER_FAVOR = 70
export const DOWAGER_FAVOR_DECAY = 10
export const DOWAGER_PAINTING_PROMPT_VERSION = 'dowager_painting_v1'
export const DOWAGER_MUSIC_PROMPT_VERSION = 'dowager_music_v1'
export const DOUBAO_SEEDREAM_IMAGE_MODEL = 'doubao-seedream-5-0-260128'
export const DOWAGER_IMAGE_GENERATION_SIZE = '2K'
export const MINIMAX_MUSIC_MODEL = 'music-2.6'

export const DOWAGER_OFFERING_SCHEDULE: DowagerOfferingScheduleEntry[] = [
    {
        creationRound: 1,
        reviewRound: 2,
        poemId: 'xiangjianhuan_linhua',
        rubricVersion: 'v1',
        enabled: true,
    },
]

const FIT_SCORE: Record<DowagerOptionFitTier, number> = {
    high: 100,
    partialStrong: 80,
    partialWeak: 70,
    drift: 55,
    risk: 25,
}

const FINAL_TIER_ORDER: DowagerOfferingFinalTier[] = [
    'offensive',
    'disappointed',
    'barely',
    'qualified',
    'excellent',
]

export const DOWAGER_FINAL_TIER_LABELS: Record<DowagerOfferingFinalTier, string> = {
    excellent: '优秀',
    qualified: '合格',
    barely: '勉强',
    disappointed: '失意',
    offensive: '冒犯',
}

export const DOWAGER_MEDIUM_LABELS: Record<DowagerOfferingMedium, string> = {
    painting: '作画',
    music: '音乐',
}

export const XIANGJIANHUAN_LINHUA_CONTENT: DowagerPoemContent = {
    id: 'xiangjianhuan_linhua',
    title: '相见欢·林花谢了春红',
    sourceAuthor: '李煜',
    bodyLines: [
        '林花谢了春红，太匆匆。',
        '无奈朝来寒雨晚来风。',
        '胭脂泪，相留醉，几时重。',
        '自是人生长恨水长东。',
    ],
    imagePromptProfile: {
        subjectTitle: '相见欢·林花谢了春红',
        coreMeaning: '残春骤谢，寒雨晚风摧折旧景，胭脂泪与东流水象征留不住的长恨。',
        emotionalTone: '克制、清冷、哀而不艳，像献给北周摄政太后的内廷画稿。',
        avoidTone: '不要喜庆、祝寿、凯旋、宴乐、富贵吉祥、春色复荣。',
    },
    musicPromptProfile: {
        subjectTitle: '相见欢·林花谢了春红',
        coreMeaning: 'late spring flowers suddenly wither under cold rain and evening wind; rouge-like tears and east-flowing water express a grief that cannot be held back.',
        emotionalArc: 'begin in cold late-spring stillness, move through wind and rain breaking what remains, then fade into unresolved east-flowing regret.',
        tempoHint: 'slow, sparse, roughly 60-76 BPM, flexible rubato, under two minutes if possible.',
        avoidTone: 'No celebration, no banquet music, no triumphant victory mood, no bright festive suona lead, no modern pop beat, no vocals or lyrics.',
    },
    styleReferences: [
        {
            id: 'gongbi',
            label: '国风水彩工笔',
            promptHint: '细线勾勒，淡彩晕染，宫苑花木清晰',
            imageSrc: '/images/dowager-style-references/style-gongbi-watercolor.png',
        },
        {
            id: 'xieyi',
            label: '国风水彩写意',
            promptHint: '水色散开，留白充足，情绪先行',
            imageSrc: '/images/dowager-style-references/style-xieyi-watercolor.png',
        },
        {
            id: 'ink',
            label: '水墨画',
            promptHint: '墨色层次，冷雨与流水压低画面',
            imageSrc: '/images/dowager-style-references/style-ink-wash.png',
        },
    ],
    mediums: {
        painting: {
            label: '作画',
            categories: [
                {
                    id: 'scene',
                    label: '定景',
                    maxSelections: 2,
                    weight: 0.3,
                    options: [
                        option('painting.scene.forestFlowers', '林中花树', 'high', 'forestFlowers', ['林花', '花树'], '承接“林花谢了春红”的残春场景。', '主体空间是一片残春林中花树，花枝疏落，树下可见凋谢后的空意。'),
                        option('painting.scene.rainCourtyard', '雨后庭院', 'high', 'rainCourtyard', ['寒雨庭院', '雨庭'], '能容纳寒雨、落花与停留不得的情绪。', '主体空间是一处雨后宫苑庭院，地面有冷雨水迹，花树与廊柱带湿意。'),
                        option('painting.scene.riverbank', '江边', 'partialStrong', 'riverbank', ['水边', '江岸'], '有东流水的去势，但残春意味需要其他元素补足。', '主体空间临近江岸或水边，水面从画面一侧向远处流去，岸边有残春痕迹。'),
                        option('painting.scene.oldTower', '旧阁楼', 'partialStrong', 'oldTower', ['阁楼', '旧楼'], '有旧梦衰败之感，适合承接长恨。', '主体空间是一座旧阁楼或远处楼影，楼前留出冷清庭院与残花。'),
                        option('painting.scene.pavilion', '亭子', 'partialWeak', 'pavilion', ['小亭', '亭'], '可承载相留与饮酒，但本身不带风雨与东流。', '画面中安排一座空亭或半掩小亭，亭边有停留过后的空落感。'),
                        option('painting.scene.longCorridor', '长廊', 'partialWeak', 'longCorridor', ['回廊', '廊下'], '有空落感，仍需落花或雨水补题。', '画面中出现宫苑长廊，廊柱延伸形成视线纵深，廊下冷清无人。'),
                        option('painting.scene.moonCourtyard', '月下庭院', 'drift', 'moonCourtyard', ['月夜庭院'], '有孤清，但容易转成普通离愁。', '主体空间是月下庭院，月色清冷，庭院空旷，避免明亮浪漫。'),
                        option('painting.scene.boat', '小船', 'drift', 'boat', ['孤舟'], '有漂泊与水意，但偏江旅。', '画面中有一叶小船停在远处水面或岸边，作为漂泊与离去的空间暗示。'),
                        option('painting.scene.springBanquet', '春宴', 'risk', 'springBanquet', ['宴席', '欢宴'], '容易把相留醉误作热闹宴乐。', '画面中若出现宴席，只能是散尽后的冷清春宴，席面空落，不表现热闹欢饮。'),
                        option('painting.scene.palaceCeremony', '宫殿大典', 'risk', 'palaceCeremony', ['大典', '庆典'], '过于庄严喜庆，会压过词中的哀意。', '画面中若出现宫殿仪典痕迹，只能是远处冷清殿影或收场后的空阶，不表现庆典。'),
                    ],
                },
                {
                    id: 'motif',
                    label: '景物',
                    maxSelections: 4,
                    weight: 0.35,
                    options: [
                        option('painting.motif.redPetals', '红花瓣', 'high', 'redPetals', ['落花', '花瓣', '残红'], '直观贴合春红凋谢。', '地面、水面或台阶边散落红花瓣，花色已暗，形成残春视觉焦点。'),
                        option('painting.motif.eastFlowingWater', '东流水', 'high', 'eastFlowingWater', ['流水', '东流', '水流'], '对应长恨如水向东。', '画面中必须有向远处流去的东流水，水势带走落花，形成不可追回的去向。'),
                        option('painting.motif.tears', '泪痕', 'partialStrong', 'tears', ['眼泪', '泪珠'], '承接胭脂泪，比含混典故更易懂。', '用花瓣上的雨珠、石面水痕或淡红晕痕表现泪痕，不画夸张人物哭泣。'),
                        option('painting.motif.coldRain', '冷雨', 'partialStrong', 'coldRain', ['寒雨', '雨痕'], '表现朝来寒雨的摧折。', '画面中保留冷雨后的湿痕、细雨雾气或檐下雨线，整体温度偏冷。'),
                        option('painting.motif.eveningWind', '晚风', 'partialWeak', 'eveningWind', ['风', '夜风'], '抓到晚来风，但单独使用较泛。', '用微斜花枝、被风卷起的花瓣和衣袂般的帘影表现晚风。'),
                        option('painting.motif.wineCup', '酒杯', 'partialWeak', 'wineCup', ['杯盏', '杯'], '指向相留醉，但容易偏宴饮。', '画面中放置一只冷清杯盏，杯边有残酒或雨水，不表现热闹饮宴。'),
                        option('painting.motif.moon', '月亮', 'drift', 'moon', ['明月'], '有哀意，但不是本词核心。', '远处或云后出现清冷月影，光线克制，不让月亮成为浪漫主调。'),
                        option('painting.motif.emptyCup', '空杯', 'drift', 'emptyCup', ['空酒杯'], '可读作离愁，但偏普通别离。', '画面近景有空杯或倒置杯盏，强调酒尽人散后的空意。'),
                        option('painting.motif.auspiciousCloud', '瑞云', 'risk', 'auspiciousCloud', ['祥云'], '会把哀题转成吉祥祝颂。', '若出现云气，只能处理为低雾或冷云，不画吉祥祥云造型。'),
                        option('painting.motif.goldCup', '金杯', 'risk', 'goldCup', ['金盏'], '容易偏享乐与献媚。', '若出现金杯，只作为被冷落的暗淡器物，不表现奢华享乐。'),
                    ],
                },
                {
                    id: 'intent',
                    label: '立意',
                    maxSelections: 2,
                    weight: 0.35,
                    options: [
                        option('painting.intent.beautyCannotStay', '好景难留', 'high', 'beautyCannotStay', ['春色难留'], '直指春红凋谢与太匆匆。', '用凋谢的花树、散落的残红和空落空间表现好景难留，不画盛放春景。'),
                        option('painting.intent.waterNeverReturns', '流水不回', 'high', 'waterNeverReturns', ['逝水不回', '长恨如水'], '直指人生长恨与水长东。', '让流水从中景向远处离开，带走花瓣，形成无法追回的视觉方向。'),
                        option('painting.intent.windRainNoMercy', '风雨无情', 'partialStrong', 'windRainNoMercy', ['风雨摧花'], '能把自然摧折转成无奈。', '用雨痕、斜风和被摧折的花枝表现风雨无情，画面不出现人为热闹。'),
                        option('painting.intent.oldDreamHardReturn', '旧梦难重', 'partialStrong', 'oldDreamHardReturn', ['难再重逢'], '回应几时重的无望。', '通过远处旧楼、空亭或回廊尽头的虚淡空间表现旧梦难回。'),
                        option('painting.intent.springGoneSorrow', '春去人愁', 'partialWeak', 'springGoneSorrow', ['伤春'], '常规易懂，但略泛。', '用残花、湿地和低色调表现春去人愁，人物若出现只可作模糊背影。'),
                        option('painting.intent.keepByWine', '借酒留人', 'partialWeak', 'keepByWine', ['以酒相留'], '比“醉里相留”更自然。', '用孤杯、半残酒痕和无人落座的位置表现借酒留人却留不住。'),
                        option('painting.intent.waitReturn', '离人盼归', 'drift', 'waitReturn', ['盼归'], '有离别感，但希望感偏强。', '用远路、空门或临水望远的构图表现盼归，但整体希望感要压低。'),
                        option('painting.intent.moonLonely', '月下孤清', 'drift', 'moonLonely', ['孤清'], '表达自然，但偏普通清愁。', '通过冷月、疏影和空庭表现孤清，不要画成明亮月夜。'),
                        option('painting.intent.richFlowers', '花开富贵', 'risk', 'richFlowers', ['富贵花开'], '与春红谢了相反。', '若必须表现花开富贵，只能转译为已败的富贵花枝与褪色华丽，不画盛放吉庆。'),
                        option('painting.intent.peacePraise', '歌颂太平', 'risk', 'peacePraise', ['太平颂'], '把长恨转成祝颂。', '若必须表现太平颂，只能以远处空殿和压低仪仗暗示，不画凯乐或歌颂场面。'),
                    ],
                },
            ],
        },
        music: {
            label: '音乐',
            categories: [
                {
                    id: 'instrument',
                    label: '择器',
                    maxSelections: 4,
                    weight: 0.25,
                    options: [
                        option('music.instrument.guqin', '古琴', 'high', 'guqin', ['琴'], '低回含蓄，适合长恨余韵。'),
                        option('music.instrument.xiao', '洞箫', 'high', 'xiao', ['箫'], '气息感能承接晚风与清寂。'),
                        option('music.instrument.pipa', '琵琶', 'partialStrong', 'pipa', ['琵琶'], '可做碎音急雨，但需压住热闹。'),
                        option('music.instrument.xun', '埙', 'partialStrong', 'xun', ['埙'], '低哑哀音适合词意。'),
                        option('music.instrument.guzheng', '古筝', 'partialWeak', 'guzheng', ['筝'], '表现力强但较常规。'),
                        option('music.instrument.erhu', '二胡', 'partialWeak', 'erhu', ['胡琴'], '哀声易懂，但现代感稍强。'),
                        option('music.instrument.dizi', '笛子', 'drift', 'dizi', ['竹笛'], '容易偏明亮，需要压暗。'),
                        option('music.instrument.ruan', '阮', 'drift', 'ruan', ['阮琴'], '有旧曲感，但理解度一般。'),
                        option('music.instrument.bianzhong', '编钟', 'risk', 'bianzhong', ['钟'], '庙堂仪典感过强。'),
                        option('music.instrument.suona', '唢呐', 'risk', 'suona', ['唢呐'], '音色过亮过响。'),
                    ],
                },
                {
                    id: 'structure',
                    label: '定奏',
                    maxSelections: 2,
                    weight: 0.25,
                    options: [
                        option('music.structure.brokenContinuity', '断断续续', 'high', 'brokenContinuity', ['断续'], '表现留不住与无奈。'),
                        option('music.structure.blankEnding', '结尾留白', 'high', 'blankEnding', ['留白'], '让余恨落在沉默里。'),
                        option('music.structure.lowRepeat', '低回反复', 'partialStrong', 'lowRepeat', ['反复低回'], '表现追问与回环。'),
                        option('music.structure.rainRhythm', '雨点节奏', 'partialStrong', 'rainRhythm', ['雨点'], '具象清晰，适合音乐生成。'),
                        option('music.structure.slowDescend', '慢慢下行', 'partialWeak', 'slowDescend', ['下行'], '方向对，但较通用。'),
                        option('music.structure.drunkenSway', '醉步摇晃', 'partialWeak', 'drunkenSway', ['摇晃'], '易懂，但可能偏风月。'),
                        option('music.structure.threePartComplete', '三段完整', 'drift', 'threePartComplete', ['三段式'], '太完整，削弱无奈。'),
                        option('music.structure.lightQuickTune', '轻快小曲', 'drift', 'lightQuickTune', ['小曲'], '可听但哀意不足。'),
                        option('music.structure.triumphantRise', '凯旋上扬', 'risk', 'triumphantRise', ['凯旋'], '与长恨相反。'),
                        option('music.structure.livelyEnsemble', '热闹齐奏', 'risk', 'livelyEnsemble', ['齐奏'], '把哀题变成喜庆场面。'),
                    ],
                },
                {
                    id: 'timbre',
                    label: '音色',
                    maxSelections: 2,
                    weight: 0.2,
                    options: [
                        option('music.timbre.cold', '清冷', 'high', 'cold', ['冷'], '贴合寒雨晚风。'),
                        option('music.timbre.faint', '微哑', 'high', 'faint', ['哑'], '像哽咽但不直白。'),
                        option('music.timbre.damp', '湿润', 'partialStrong', 'damp', ['潮湿'], '表现雨后和泪意。'),
                        option('music.timbre.lowCircling', '低回', 'partialStrong', 'lowCircling', ['低沉'], '适合哀感循环。'),
                        option('music.timbre.dark', '暗哑', 'partialWeak', 'dark', ['暗'], '情绪对，但稍抽象。'),
                        option('music.timbre.thin', '单薄', 'partialWeak', 'thin', ['薄'], '表现凋残，但不自带诗意。'),
                        option('music.timbre.bright', '明亮', 'drift', 'bright', ['亮'], '容易过于轻。'),
                        option('music.timbre.ethereal', '空灵', 'drift', 'ethereal', ['空'], '容易偏仙气。'),
                        option('music.timbre.radiant', '辉煌', 'risk', 'radiant', ['辉煌'], '抹平败色。'),
                        option('music.timbre.fiery', '热烈', 'risk', 'fiery', ['热烈'], '与冷雨晚风相反。'),
                    ],
                },
                {
                    id: 'mood',
                    label: '意境',
                    maxSelections: 2,
                    weight: 0.3,
                    options: [
                        option('music.mood.endlessRegret', '长恨不尽', 'high', 'endlessRegret', ['长恨'], '直指人生长恨。'),
                        option('music.mood.fadingSplendor', '繁华凋落', 'high', 'fadingSplendor', ['凋落'], '抓住盛景转衰。'),
                        option('music.mood.rainWindMerciless', '风雨摧花', 'partialStrong', 'rainWindMerciless', ['风雨'], '能承接寒雨晚风。'),
                        option('music.mood.oldMeetingHard', '重逢无期', 'partialStrong', 'oldMeetingHard', ['无期'], '回应几时重。'),
                        option('music.mood.springSorrow', '春去人愁', 'partialWeak', 'springSorrow', ['伤春'], '方向对但泛。'),
                        option('music.mood.drunkFarewell', '醉中惜别', 'partialWeak', 'drunkFarewell', ['惜别'], '可解释相留醉。'),
                        option('music.mood.lonelyMoon', '月下孤清', 'drift', 'lonelyMoon', ['月下'], '偏普通清愁。'),
                        option('music.mood.boatDrifting', '孤舟远去', 'drift', 'boatDrifting', ['孤舟'], '偏漂泊旅情。'),
                        option('music.mood.praisePeace', '太平颂歌', 'risk', 'praisePeace', ['颂歌'], '与长恨冲突。'),
                        option('music.mood.banquetJoy', '宴乐欢腾', 'risk', 'banquetJoy', ['欢腾'], '误读为欢宴。'),
                    ],
                },
            ],
        },
    },
}

export const DOWAGER_POEM_CONTENT: Record<string, DowagerPoemContent> = {
    [XIANGJIANHUAN_LINHUA_CONTENT.id]: XIANGJIANHUAN_LINHUA_CONTENT,
}

function option(
    id: string,
    label: string,
    fitTier: DowagerOptionFitTier,
    canonicalKey: string,
    aliases: string[],
    evidence: string,
    visualInstruction?: string,
): DowagerOfferingOption {
    return {
        id,
        label,
        fitTier,
        baseScore: FIT_SCORE[fitTier],
        risk: fitTier === 'risk' ? 'ordinary' : 'none',
        canonicalKey,
        aliases,
        evidence,
        visualInstruction,
    }
}

export function getDowagerCreationForRound(round: number): DowagerOfferingScheduleEntry | null {
    return DOWAGER_OFFERING_SCHEDULE.find(entry => entry.enabled && entry.creationRound === round) ?? null
}

export function getDowagerReviewForRound(round: number): DowagerOfferingScheduleEntry | null {
    return DOWAGER_OFFERING_SCHEDULE.find(entry => entry.enabled && entry.reviewRound === round) ?? null
}

export function isDowagerFavorDecayEnabledForRound(round: number): boolean {
    return round > 1 && DOWAGER_OFFERING_SCHEDULE.some(entry => entry.enabled && entry.reviewRound === round)
}

export function isDowagerDeathCheckEnabledForRound(round: number): boolean {
    return DOWAGER_OFFERING_SCHEDULE.some(entry => entry.enabled && entry.reviewRound === round)
}

export function clampDowagerFavor(value: number): number {
    if (!Number.isFinite(value)) return 0
    return Math.max(0, Math.min(100, Math.round(value)))
}

export function getDowagerFavorPresentation(
    favor: number,
    context?: { phase?: RoundPhase; round?: number },
): DowagerFavorPresentation {
    const normalized = clampDowagerFavor(favor)
    if (normalized <= 0 && context?.phase === 'DOWAGER_CREATION') {
        return {
            label: '濒危献艺',
            className: 'risk-critical',
            summary: '太后的恩意已断，只剩这一回献艺尚可递到帘前。',
        }
    }

    if (normalized >= 70) {
        return {
            label: '眷顾尚隆',
            className: 'risk-safe',
            summary: '太后仍愿护你周全。',
        }
    }
    if (normalized >= 40) {
        return {
            label: '恩意渐薄',
            className: 'risk-warning',
            summary: '太后仍有旧恩，但耐心正在变薄。',
        }
    }
    if (normalized >= 20) {
        return {
            label: '失宠在即',
            className: 'risk-critical',
            summary: '太后已不再轻易替你遮掩。',
        }
    }
    return {
        label: '危如累卵',
        className: 'risk-critical',
        summary: '太后庇护几近断绝，再失一分便是杀机。',
    }
}

export function splitDowagerFreeInputTags(text: string | undefined): string[] {
    if (!text?.trim()) return []
    return text
        .split('；')
        .map(tag => tag.trim())
        .filter(Boolean)
}

export function getDowagerPoemContent(poemId: string): DowagerPoemContent {
    const content = DOWAGER_POEM_CONTENT[poemId]
    if (!content) throw new Error(`Unknown dowager poem content: ${poemId}`)
    return content
}

export function buildDowagerPaintingPrompt(input: DowagerPaintingPromptInput): string {
    const content = getDowagerPoemContent(input.poemId)
    const styleReference = content.styleReferences.find(style => style.id === input.styleReferenceId)
        ?? content.styleReferences[0]
    const paintingCategories = content.mediums.painting.categories

    const sceneInstructions = buildPaintingCategoryPromptLines(
        paintingCategories.find(category => category.id === 'scene'),
        input.selections.scene,
        input.freeInputVisualInstructions?.scene,
    )
    const motifInstructions = buildPaintingCategoryPromptLines(
        paintingCategories.find(category => category.id === 'motif'),
        input.selections.motif,
        input.freeInputVisualInstructions?.motif,
    )
    const intentInstructions = buildPaintingCategoryPromptLines(
        paintingCategories.find(category => category.id === 'intent'),
        input.selections.intent,
        input.freeInputVisualInstructions?.intent,
    )

    return [
        '参考图仅用于画风、笔触、纸面质感、设色方式和整体气韵，不要复制参考图的具体构图或物件布局。',
        '',
        '生成一幅横向 4:3 古风宫苑题画，用于《佞臣》的太后献艺验收页。',
        '不得出现现代物件、现代服饰、真实人物肖像、文字、题款、印章、边框、UI、字幕、水印。',
        '',
        `诗题：${content.imagePromptProfile.subjectTitle}`,
        `诗意核心：${content.imagePromptProfile.coreMeaning}`,
        `画面情绪：${content.imagePromptProfile.emotionalTone}`,
        `避免方向：${content.imagePromptProfile.avoidTone}`,
        '',
        '玩家构思必须全部呈现：',
        '定景：',
        ...sceneInstructions,
        '',
        '景物：',
        ...motifInstructions,
        '',
        '立意：',
        ...intentInstructions,
        '',
        '硬性呈现规则：',
        '1. 上述定景、景物、立意中的每一项都必须在画面中有明确可见表达，不得省略。',
        '2. 定景负责主体空间；景物负责可辨认物件；立意负责构图、光线、方向、天气或物件关系。',
        '3. 如果某个立意是抽象概念，必须转译成可见画面语言。',
        '4. 不要只堆砌元素，要让这些元素共同服务诗意核心。',
        `5. 避免方向：${content.imagePromptProfile.avoidTone}`,
        '',
        '画面整合要求：',
        '以定景作为主体空间，把景物安排成前景、中景、远景的层次；用立意约束构图重心、明暗、天气和视线方向。画面应像一幅完整题画，而不是素材拼贴。',
        '',
        '画风要求：',
        `采用“${styleReference.label}”：${styleReference.promptHint}。`,
        '整体线条、水色、留白和纸面质感应贴近参考图。',
    ].join('\n')
}

function buildPaintingCategoryPromptLines(
    category: DowagerOfferingCategory | undefined,
    selection: DowagerOfferingCategorySelection | undefined,
    freeInputVisualInstructions?: Record<string, string>,
): string[] {
    if (!category || !selection) return ['- 未取。']

    const lines: string[] = []
    for (const optionId of selection.presetOptionIds) {
        const option = category.options.find(item => item.id === optionId)
        if (!option) continue
        lines.push(`- ${option.label}：${option.visualInstruction ?? option.evidence}`)
    }

    for (const tag of splitDowagerFreeInputTags(selection.freeText)) {
        const aliasMatch = findAliasMatchedOption(category, tag)
        if (aliasMatch?.visualInstruction) {
            lines.push(`- ${tag}：${aliasMatch.visualInstruction}`)
            continue
        }
        const visualInstruction = freeInputVisualInstructions?.[tag]
            ?? `画面中必须清楚呈现「${tag}」，并将它转化为当前类别可见的空间、物件或构图关系。`
        lines.push(`- ${tag}：${visualInstruction}`)
    }

    return lines.length > 0 ? lines : ['- 未取。']
}

const MUSIC_OPTION_PROMPT_LABELS: Record<string, string> = {
    'music.instrument.guqin': 'Guqin',
    'music.instrument.xiao': 'Xiao',
    'music.instrument.pipa': 'Pipa',
    'music.instrument.xun': 'Xun',
    'music.instrument.guzheng': 'Guzheng',
    'music.instrument.erhu': 'Erhu',
    'music.instrument.dizi': 'Dizi',
    'music.instrument.ruan': 'Ruan',
    'music.instrument.bianzhong': 'Bianzhong',
    'music.instrument.suona': 'Suona',
    'music.structure.brokenContinuity': 'Broken continuity',
    'music.structure.blankEnding': 'Blank ending',
    'music.structure.lowRepeat': 'Low recurring phrases',
    'music.structure.rainRhythm': 'Rain-point rhythm',
    'music.structure.slowDescend': 'Slow descent',
    'music.structure.drunkenSway': 'Drunken sway',
    'music.structure.threePartComplete': 'Three-part completeness',
    'music.structure.lightQuickTune': 'Light quick tune',
    'music.structure.triumphantRise': 'Triumphant rise',
    'music.structure.livelyEnsemble': 'Lively ensemble',
    'music.timbre.cold': 'Cold',
    'music.timbre.faint': 'Faintly hoarse',
    'music.timbre.damp': 'Damp',
    'music.timbre.lowCircling': 'Low circling',
    'music.timbre.dark': 'Dark and muted',
    'music.timbre.thin': 'Thin',
    'music.timbre.bright': 'Bright',
    'music.timbre.ethereal': 'Ethereal',
    'music.timbre.radiant': 'Radiant',
    'music.timbre.fiery': 'Fiery',
    'music.mood.endlessRegret': 'Endless regret',
    'music.mood.fadingSplendor': 'Fading splendor',
    'music.mood.rainWindMerciless': 'Merciless wind and rain',
    'music.mood.oldMeetingHard': 'No return to the old meeting',
    'music.mood.springSorrow': 'Spring departure sorrow',
    'music.mood.drunkFarewell': 'Drunken farewell',
    'music.mood.lonelyMoon': 'Lonely moonlit clarity',
    'music.mood.boatDrifting': 'Drifting lone boat',
    'music.mood.praisePeace': 'Peace-praising hymn',
    'music.mood.banquetJoy': 'Banquet joy',
}

const MUSIC_OPTION_AUDIO_INSTRUCTIONS: Record<string, string> = {
    'music.instrument.guqin': 'primary sparse low-register plucked motif, restrained and lingering.',
    'music.instrument.xiao': 'breathy long tones answering the guqin like cold evening wind.',
    'music.instrument.pipa': 'very restrained broken-note accents, like cold rain on petals, no lively strumming.',
    'music.instrument.xun': 'low hoarse shadow tone, appearing briefly to deepen the lament.',
    'music.instrument.guzheng': 'soft arpeggiated supporting texture, never bright or decorative.',
    'music.instrument.erhu': 'distant bowed lament in a subdued register, avoiding modern melodrama.',
    'music.instrument.dizi': 'a dim bamboo flute color kept low and breathy, never cheerful or bright.',
    'music.instrument.ruan': 'old plucked accompaniment with muted resonance and sparse strokes.',
    'music.instrument.bianzhong': 'far-off ritual bell color used briefly and quietly, not grand ceremony.',
    'music.instrument.suona': 'if present, only a distant, muted, short shadow of sound; never festive or piercing.',
    'music.structure.brokenContinuity': 'short phrases interrupted by silence, as if something cannot be held.',
    'music.structure.blankEnding': 'the final phrase remains unresolved and fades into near silence.',
    'music.structure.lowRepeat': 'a low motif circles back several times with small variations.',
    'music.structure.rainRhythm': 'sparse droplets and broken accents suggest cold rain without becoming a beat.',
    'music.structure.slowDescend': 'melodic lines gradually descend, lowering the emotional weight.',
    'music.structure.drunkenSway': 'a slight unsteady rubato sway, restrained and sorrowful rather than playful.',
    'music.structure.threePartComplete': 'a simple three-part arc, but keep the ending unresolved and understated.',
    'music.structure.lightQuickTune': 'if used, compress it into a brief fragile memory, not a cheerful tune.',
    'music.structure.triumphantRise': 'if used, invert it into a failed rise that collapses downward quickly.',
    'music.structure.livelyEnsemble': 'if used, keep ensemble entries distant, thin, and quickly withdrawn.',
    'music.timbre.cold': 'cool, dry, low-lit sound world with little warmth.',
    'music.timbre.faint': 'breathy edges, soft attacks, restrained dynamics.',
    'music.timbre.damp': 'soft reverb and blurred note tails, like rain-soaked stone and petals.',
    'music.timbre.lowCircling': 'low-register resonance and circling sustain without brightness.',
    'music.timbre.dark': 'muted attacks and shaded resonance, avoiding glossy production.',
    'music.timbre.thin': 'spare, narrow tone with visible emptiness between notes.',
    'music.timbre.bright': 'if used, dim the brightness into a distant memory, not a present cheerful color.',
    'music.timbre.ethereal': 'light air and space, grounded by sorrow so it does not become immortal or dreamy.',
    'music.timbre.radiant': 'if used, make the radiance faded and tarnished, never glorious.',
    'music.timbre.fiery': 'if used, reduce it to a brief inner sting, not passionate heat.',
    'music.mood.endlessRegret': 'recurring low motif that never fully resolves.',
    'music.mood.fadingSplendor': 'hints of former beauty appear only as dim, decaying traces.',
    'music.mood.rainWindMerciless': 'wind and rain feel like repeated pressure against fragile remnants.',
    'music.mood.oldMeetingHard': 'phrases reach toward return but stop short before resolution.',
    'music.mood.springSorrow': 'a general late-spring sorrow, kept restrained and unsentimental.',
    'music.mood.drunkFarewell': 'slightly blurred phrasing suggests farewell through wine without banquet warmth.',
    'music.mood.lonelyMoon': 'cold open space and isolated tones, not romantic moonlight.',
    'music.mood.boatDrifting': 'a distant drifting motion, used as a quiet image of departure.',
    'music.mood.praisePeace': 'if used, make any hymn-like gesture hollow and distant, not celebratory.',
    'music.mood.banquetJoy': 'if used, let joy appear only as an absent, already-ended memory.',
}

export function buildDowagerMusicPrompt(input: DowagerMusicPromptInput): string {
    const content = getDowagerPoemContent(input.poemId)
    const profile = content.musicPromptProfile
    const musicCategories = content.mediums.music.categories

    const instrumentInstructions = buildMusicCategoryPromptLines(
        musicCategories.find(category => category.id === 'instrument'),
        input.selections.instrument,
        input.freeInputMusicInstructions?.instrument,
    )
    const structureInstructions = buildMusicCategoryPromptLines(
        musicCategories.find(category => category.id === 'structure'),
        input.selections.structure,
        input.freeInputMusicInstructions?.structure,
    )
    const timbreInstructions = buildMusicCategoryPromptLines(
        musicCategories.find(category => category.id === 'timbre'),
        input.selections.timbre,
        input.freeInputMusicInstructions?.timbre,
    )
    const moodInstructions = buildMusicCategoryPromptLines(
        musicCategories.find(category => category.id === 'mood'),
        input.selections.mood,
        input.freeInputMusicInstructions?.mood,
    )

    return [
        'Instrumental ancient Chinese chamber music for a palace dowager offering in the game Ningchen.',
        '',
        `Poem title: ${profile.subjectTitle}`,
        `Core poetic meaning: ${profile.coreMeaning}`,
        `Emotional arc: ${profile.emotionalArc}`,
        `Tempo and pacing: ${profile.tempoHint}`,
        '',
        'Hard requirements:',
        '- Instrumental only. No vocals, no lyrics, no humming, no chanting, no spoken words.',
        '- Keep the piece under two minutes if possible, around 90-110 seconds.',
        '- No modern pop beat, no electronic dance rhythm, no cinematic trailer percussion.',
        '- No celebration, no banquet music, no triumphant victory mood.',
        '- Every selected or freely entered player concept below must be clearly audible in the music.',
        '',
        'Player concept must be fully represented:',
        '',
        'Instrumentation:',
        ...instrumentInstructions,
        '',
        'Composition and structure:',
        ...structureInstructions,
        '',
        'Timbre and performance:',
        ...timbreInstructions,
        '',
        'Mood and poetic intent:',
        ...moodInstructions,
        '',
        'Integration:',
        'Use the selected instruments as a restrained inner-palace ensemble. Let the structure shape time, silence, recurrence, and ending. Let the timbre color every phrase. Let the mood govern the whole emotional direction. The result should feel like one complete instrumental offering, not a list of disconnected musical tags.',
        '',
        `Avoid: ${profile.avoidTone}`,
    ].join('\n')
}

function buildMusicCategoryPromptLines(
    category: DowagerOfferingCategory | undefined,
    selection: DowagerOfferingCategorySelection | undefined,
    freeInputMusicInstructions?: Record<string, string>,
): string[] {
    if (!category || !selection) return ['- Not selected.']

    const lines: string[] = []
    for (const optionId of selection.presetOptionIds) {
        const option = category.options.find(item => item.id === optionId)
        if (!option) continue
        const label = MUSIC_OPTION_PROMPT_LABELS[option.id] ?? option.label
        const instruction = MUSIC_OPTION_AUDIO_INSTRUCTIONS[option.id] ?? option.evidence
        lines.push(`- ${label}: ${instruction}`)
    }

    for (const tag of splitDowagerFreeInputTags(selection.freeText)) {
        const aliasMatch = findAliasMatchedOption(category, tag)
        if (aliasMatch) {
            const instruction = MUSIC_OPTION_AUDIO_INSTRUCTIONS[aliasMatch.id] ?? aliasMatch.evidence
            lines.push(`- ${tag}: ${instruction}`)
            continue
        }
        const instruction = freeInputMusicInstructions?.[tag]
            ?? `The music must make "${tag}" clearly audible by turning it into a concrete instrument, rhythm, timbre, or mood gesture in this category.`
        lines.push(`- ${tag}: ${instruction}`)
    }

    return lines.length > 0 ? lines : ['- Not selected.']
}

export function scoreDowagerOffering(input: DowagerOfferingScoreInput): DowagerOfferingScoreResult {
    const content = getDowagerPoemContent(input.poemId)
    const mediumConfig = content.mediums[input.medium]
    const categoryScores: Record<string, DowagerCategoryScore> = {}
    const freeInputSummaries: DowagerFreeInputSummary[] = []
    let weightedTotal = 0
    let presetOrdinaryRiskCount = 0
    let severeOffense = false
    let fallbackUsed = false

    for (const category of mediumConfig.categories) {
        const selection = input.selections[category.id] ?? { presetOptionIds: [] }
        const selectedByConcept = new Map<string, { label: string; score: number; presetId?: string }>()

        for (const optionId of selection.presetOptionIds) {
            const selectedOption = category.options.find(option => option.id === optionId)
            if (!selectedOption) continue
            selectedByConcept.set(selectedOption.canonicalKey, {
                label: selectedOption.label,
                score: selectedOption.baseScore,
                presetId: selectedOption.id,
            })
            if (selectedOption.risk === 'ordinary') presetOrdinaryRiskCount += 1
        }

        for (const tag of splitDowagerFreeInputTags(selection.freeText)) {
            const aliasMatch = findAliasMatchedOption(category, tag)
            if (aliasMatch) {
                selectedByConcept.set(aliasMatch.canonicalKey, {
                    label: aliasMatch.label,
                    score: aliasMatch.baseScore,
                    presetId: aliasMatch.id,
                })
                freeInputSummaries.push({
                    categoryId: category.id,
                    tag,
                    score: aliasMatch.baseScore,
                    tier: aliasMatch.fitTier,
                    rewardApplied: false,
                    mergedIntoPresetId: aliasMatch.id,
                    riskFlag: aliasMatch.risk === 'ordinary' ? 'ordinary' : undefined,
                    evidence: `已按「${aliasMatch.label}」计入。`,
                })
                if (aliasMatch.risk === 'ordinary' && !selection.presetOptionIds.includes(aliasMatch.id)) {
                    presetOrdinaryRiskCount += 1
                }
                continue
            }

            const judgement = input.freeInputJudgements?.[category.id]?.[tag]
            const judged = scoreFreeInputJudgement(judgement)
            fallbackUsed ||= judged.fallbackUsed
            severeOffense ||= judged.severeOffense
            selectedByConcept.set(`free:${tag}`, {
                label: tag,
                score: judged.score,
            })
            freeInputSummaries.push({
                categoryId: category.id,
                tag,
                score: judged.score,
                tier: judged.tier,
                rewardApplied: judged.rewardApplied,
                riskFlag: judged.riskFlag,
                evidence: judgement?.evidence ?? judged.evidence,
            })
        }

        const entries = Array.from(selectedByConcept.values()).slice(0, category.maxSelections)
        const average = entries.length
            ? entries.reduce((sum, entry) => sum + entry.score, 0) / entries.length
            : 0
        const score = Math.min(average, getRichnessCap(category.maxSelections, entries.length))
        categoryScores[category.id] = {
            categoryId: category.id,
            label: category.label,
            score: roundScore(score),
            selectedCount: entries.length,
            selectedLabels: entries.map(entry => entry.label),
        }
        weightedTotal += score * category.weight
    }

    let finalScore = roundScore(weightedTotal)
    let finalTier = getFinalTier(finalScore)

    if (presetOrdinaryRiskCount >= 2) {
        finalTier = capFinalTier(finalTier, 'disappointed')
        finalScore = Math.min(finalScore, 54)
    } else if (presetOrdinaryRiskCount === 1) {
        finalTier = capFinalTier(finalTier, 'barely')
        finalScore = Math.min(finalScore, 69)
    }

    if (severeOffense) {
        finalTier = 'offensive'
        finalScore = Math.min(finalScore, 34)
    }

    return {
        poemId: input.poemId,
        medium: input.medium,
        finalScore,
        finalTier,
        favorDelta: getDowagerFavorDelta(finalTier),
        categoryScores,
        freeInputSummaries,
        publicEvidence: buildPublicEvidence(input.medium, categoryScores),
        evaluationSummaryForDowager: buildEvaluationSummary(categoryScores, finalTier),
        fallbackUsed,
    }
}

function findAliasMatchedOption(
    category: DowagerOfferingCategory,
    tag: string,
): DowagerOfferingOption | null {
    const normalized = normalizeTag(tag)
    return category.options.find(option => {
        const aliases = [option.label, option.canonicalKey, ...(option.aliases ?? [])]
        return aliases.some(alias => normalizeTag(alias) === normalized)
    }) ?? null
}

function normalizeTag(value: string): string {
    return value.trim().toLowerCase()
}

function scoreFreeInputJudgement(judgement: DowagerFreeInputJudgement | undefined): {
    score: number
    tier: DowagerFreeInputSummary['tier']
    rewardApplied: boolean
    riskFlag?: 'ordinary' | 'severe'
    fallbackUsed: boolean
    severeOffense: boolean
    evidence: string
} {
    if (!judgement) {
        return {
            score: 55,
            tier: 'fallbackDrift',
            rewardApplied: false,
            fallbackUsed: true,
            severeOffense: false,
            evidence: '未裁决，按略偏移兜底。',
        }
    }

    if (judgement.tier === 'severeOffense') {
        return {
            score: 0,
            tier: 'severeOffense',
            rewardApplied: false,
            riskFlag: 'severe',
            fallbackUsed: false,
            severeOffense: true,
            evidence: judgement.evidence ?? '自由输入严重冒犯题意。',
        }
    }

    const boosted = boostFreeInputTier(judgement.tier)
    return {
        score: FIT_SCORE[boosted.tier],
        tier: judgement.tier,
        rewardApplied: boosted.rewardApplied,
        riskFlag: judgement.tier === 'risk' ? 'ordinary' : undefined,
        fallbackUsed: false,
        severeOffense: false,
        evidence: judgement.evidence ?? (boosted.rewardApplied ? '自由输入切题，获得一档创作奖励。' : '自由输入按裁决计入。'),
    }
}

function boostFreeInputTier(tier: DowagerOptionFitTier): { tier: DowagerOptionFitTier; rewardApplied: boolean } {
    switch (tier) {
        case 'partialStrong':
            return { tier: 'high', rewardApplied: true }
        case 'partialWeak':
            return { tier: 'partialStrong', rewardApplied: true }
        case 'drift':
            return { tier: 'partialWeak', rewardApplied: true }
        case 'risk':
            return { tier: 'drift', rewardApplied: true }
        case 'high':
            return { tier: 'high', rewardApplied: false }
    }
}

function getRichnessCap(maxSelections: number, count: number): number {
    if (count <= 0) return 0
    if (maxSelections <= 2) return count >= 2 ? 100 : 90
    if (count >= 3) return 100
    if (count === 2) return 90
    return 80
}

function getFinalTier(score: number): DowagerOfferingFinalTier {
    if (score >= 85) return 'excellent'
    if (score >= 70) return 'qualified'
    if (score >= 55) return 'barely'
    if (score >= 35) return 'disappointed'
    return 'offensive'
}

function capFinalTier(
    tier: DowagerOfferingFinalTier,
    maxTier: DowagerOfferingFinalTier,
): DowagerOfferingFinalTier {
    return FINAL_TIER_ORDER.indexOf(tier) > FINAL_TIER_ORDER.indexOf(maxTier) ? maxTier : tier
}

export function getDowagerFavorDelta(tier: DowagerOfferingFinalTier): number {
    switch (tier) {
        case 'excellent':
            return 30
        case 'qualified':
            return 20
        case 'barely':
            return 8
        case 'disappointed':
            return 0
        case 'offensive':
            return -10
    }
}

function buildPublicEvidence(
    medium: DowagerOfferingMedium,
    categoryScores: Record<string, DowagerCategoryScore>,
): string {
    const parts = Object.values(categoryScores).map(category => (
        `${category.label}取「${category.selectedLabels.join('、') || '未取'}」`
    ))
    return `${DOWAGER_MEDIUM_LABELS[medium]}：${parts.join('；')}。`
}

function buildEvaluationSummary(
    categoryScores: Record<string, DowagerCategoryScore>,
    tier: DowagerOfferingFinalTier,
): string {
    const categories = Object.values(categoryScores)
    const representativeLabels = categories
        .map(category => category.selectedLabels[0])
        .filter((label): label is string => Boolean(label))
    const supportingLabels = categories.flatMap(category => category.selectedLabels.slice(1))
    const labels = [...representativeLabels, ...supportingLabels]
        .slice(0, 6)
        .join('、')
    return `${DOWAGER_FINAL_TIER_LABELS[tier]}：${labels || '未成章法'}。`
}

function roundScore(value: number): number {
    return Math.round(value * 10) / 10
}
