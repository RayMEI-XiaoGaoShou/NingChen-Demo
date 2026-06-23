import { describe, expect, it } from 'vitest'
import {
    DOWAGER_OFFERING_SCHEDULE,
    getDowagerCreationForRound,
    getDowagerFavorPresentation,
    getDowagerReviewForRound,
    buildDowagerPaintingPrompt,
    buildDowagerMusicPrompt,
    isDowagerDeathCheckEnabledForRound,
    isDowagerFavorDecayEnabledForRound,
    scoreDowagerOffering,
    splitDowagerFreeInputTags,
} from './dowagerOffering'

describe('dowager offering schedule', () => {
    it('enables only the first creation and second-round review in milestone 1', () => {
        expect(DOWAGER_OFFERING_SCHEDULE).toEqual([
            {
                creationRound: 1,
                reviewRound: 2,
                poemId: 'xiangjianhuan_linhua',
                rubricVersion: 'v1',
                enabled: true,
            },
        ])
        expect(getDowagerCreationForRound(1)?.poemId).toBe('xiangjianhuan_linhua')
        expect(getDowagerReviewForRound(2)?.poemId).toBe('xiangjianhuan_linhua')
        expect(getDowagerCreationForRound(3)).toBeNull()
        expect(getDowagerReviewForRound(4)).toBeNull()
        expect(isDowagerFavorDecayEnabledForRound(1)).toBe(false)
        expect(isDowagerFavorDecayEnabledForRound(2)).toBe(true)
        expect(isDowagerFavorDecayEnabledForRound(3)).toBe(false)
        expect(isDowagerDeathCheckEnabledForRound(2)).toBe(true)
        expect(isDowagerDeathCheckEnabledForRound(3)).toBe(false)
    })
})

describe('dowager favor presentation', () => {
    it('maps favor values to the personal-safety labels', () => {
        expect(getDowagerFavorPresentation(70).label).toBe('眷顾尚隆')
        expect(getDowagerFavorPresentation(40).label).toBe('恩意渐薄')
        expect(getDowagerFavorPresentation(39).label).toBe('失宠在即')
        expect(getDowagerFavorPresentation(19).label).toBe('危如累卵')
        expect(getDowagerFavorPresentation(0, { phase: 'DOWAGER_CREATION', round: 1 }).label).toBe('濒危献艺')
    })
})

describe('dowager offering scoring', () => {
    it('scores a richly matched painting as excellent and applies the excellent favor delta', () => {
        const result = scoreDowagerOffering({
            poemId: 'xiangjianhuan_linhua',
            medium: 'painting',
            selections: {
                scene: { presetOptionIds: ['painting.scene.forestFlowers', 'painting.scene.rainCourtyard'] },
                motif: { presetOptionIds: ['painting.motif.redPetals', 'painting.motif.eastFlowingWater', 'painting.motif.tears', 'painting.motif.coldRain'] },
                intent: { presetOptionIds: ['painting.intent.beautyCannotStay', 'painting.intent.waterNeverReturns'] },
            },
        })

        expect(result.finalTier).toBe('excellent')
        expect(result.finalScore).toBeGreaterThanOrEqual(85)
        expect(result.favorDelta).toBe(30)
        expect(result.evaluationSummaryForDowager).toContain('好景难留')
        expect(result.publicEvidence).toContain('作画')
    })

    it('caps the final tier when preset ordinary-risk options are selected', () => {
        const oneRisk = scoreDowagerOffering({
            poemId: 'xiangjianhuan_linhua',
            medium: 'painting',
            selections: {
                scene: { presetOptionIds: ['painting.scene.forestFlowers'] },
                motif: { presetOptionIds: ['painting.motif.redPetals', 'painting.motif.eastFlowingWater', 'painting.motif.auspiciousCloud'] },
                intent: { presetOptionIds: ['painting.intent.beautyCannotStay', 'painting.intent.waterNeverReturns'] },
            },
        })

        const twoRisks = scoreDowagerOffering({
            poemId: 'xiangjianhuan_linhua',
            medium: 'painting',
            selections: {
                scene: { presetOptionIds: ['painting.scene.springBanquet', 'painting.scene.forestFlowers'] },
                motif: { presetOptionIds: ['painting.motif.redPetals', 'painting.motif.goldCup'] },
                intent: { presetOptionIds: ['painting.intent.beautyCannotStay', 'painting.intent.peacePraise'] },
            },
        })

        expect(oneRisk.finalTier).toBe('barely')
        expect(oneRisk.favorDelta).toBe(8)
        expect(twoRisks.finalTier).toBe('disappointed')
        expect(twoRisks.favorDelta).toBe(0)
    })

    it('uses only full-width semicolons to split free input tags', () => {
        expect(splitDowagerFreeInputTags('亭子；落花；流水')).toEqual(['亭子', '落花', '流水'])
        expect(splitDowagerFreeInputTags('亭子、落花,流水/冷雨')).toEqual(['亭子、落花,流水/冷雨'])
    })

    it('treats free-input aliases as preset concepts without the free-input reward', () => {
        const result = scoreDowagerOffering({
            poemId: 'xiangjianhuan_linhua',
            medium: 'painting',
            selections: {
                scene: { presetOptionIds: ['painting.scene.rainCourtyard'] },
                motif: {
                    presetOptionIds: ['painting.motif.redPetals', 'painting.motif.eastFlowingWater'],
                    freeText: '落花',
                },
                intent: { presetOptionIds: ['painting.intent.beautyCannotStay', 'painting.intent.waterNeverReturns'] },
            },
        })

        expect(result.freeInputSummaries).toContainEqual(expect.objectContaining({
            tag: '落花',
            mergedIntoPresetId: 'painting.motif.redPetals',
            rewardApplied: false,
        }))
        expect(result.categoryScores.motif.selectedCount).toBe(2)
        expect(result.finalTier).toBe('excellent')
    })
})

describe('dowager painting prompt', () => {
    it('turns poem profile, style reference, preset options, and free input into visible image instructions', () => {
        const prompt = buildDowagerPaintingPrompt({
            poemId: 'xiangjianhuan_linhua',
            styleReferenceId: 'ink',
            selections: {
                scene: {
                    presetOptionIds: ['painting.scene.forestFlowers', 'painting.scene.rainCourtyard'],
                    freeText: '湿石阶',
                },
                motif: {
                    presetOptionIds: ['painting.motif.redPetals', 'painting.motif.eastFlowingWater'],
                },
                intent: {
                    presetOptionIds: ['painting.intent.beautyCannotStay', 'painting.intent.waterNeverReturns'],
                },
            },
            freeInputVisualInstructions: {
                scene: {
                    '湿石阶': '庭院近景铺有被冷雨打湿的石阶，水光微暗，石缝积着少量落花。',
                },
            },
        })

        expect(prompt).toContain('诗题：相见欢·林花谢了春红')
        expect(prompt).toContain('诗意核心：残春骤谢，寒雨晚风摧折旧景')
        expect(prompt).toContain('画面情绪：克制、清冷、哀而不艳')
        expect(prompt).toContain('避免方向：不要喜庆、祝寿、凯旋、宴乐、富贵吉祥、春色复荣')
        expect(prompt).toContain('参考图仅用于画风、笔触、纸面质感、设色方式和整体气韵')
        expect(prompt).toContain('不要复制参考图的具体构图或物件布局')
        expect(prompt).toContain('主体空间是一片残春林中花树')
        expect(prompt).toContain('主体空间是一处雨后宫苑庭院')
        expect(prompt).toContain('庭院近景铺有被冷雨打湿的石阶')
        expect(prompt).toContain('地面、水面或台阶边散落红花瓣')
        expect(prompt).toContain('画面中必须有向远处流去的东流水')
        expect(prompt).toContain('用凋谢的花树、散落的残红和空落空间表现好景难留')
        expect(prompt).toContain('让流水从中景向远处离开')
        expect(prompt).toContain('上述定景、景物、立意中的每一项都必须在画面中有明确可见表达，不得省略')
        expect(prompt).toContain('采用“水墨画”：墨色层次，冷雨与流水压低画面')
        expect(prompt).not.toContain('李煜')
    })
})

describe('dowager music prompt', () => {
    it('turns poem profile, preset options, and free input into audible instrumental instructions', () => {
        const prompt = buildDowagerMusicPrompt({
            poemId: 'xiangjianhuan_linhua',
            selections: {
                instrument: {
                    presetOptionIds: [
                        'music.instrument.guqin',
                        'music.instrument.xiao',
                        'music.instrument.pipa',
                        'music.instrument.xun',
                    ],
                    freeText: '雨丝',
                },
                structure: {
                    presetOptionIds: [
                        'music.structure.brokenContinuity',
                        'music.structure.blankEnding',
                    ],
                },
                timbre: {
                    presetOptionIds: [
                        'music.timbre.cold',
                        'music.timbre.faint',
                    ],
                },
                mood: {
                    presetOptionIds: [
                        'music.mood.endlessRegret',
                        'music.mood.fadingSplendor',
                    ],
                },
            },
            freeInputMusicInstructions: {
                instrument: {
                    '雨丝': 'A delicate rain-thread texture should be clearly audible as sparse, soft high-register ornaments.',
                },
            },
        })

        expect(prompt).toContain('Instrumental ancient Chinese chamber music')
        expect(prompt).toContain('Poem title: 相见欢·林花谢了春红')
        expect(prompt).toContain('Core poetic meaning: late spring flowers suddenly wither')
        expect(prompt).toContain('Emotional arc: begin in cold late-spring stillness')
        expect(prompt).toContain('Instrumental only. No vocals, no lyrics, no humming, no chanting, no spoken words.')
        expect(prompt).toContain('Every selected or freely entered player concept below must be clearly audible in the music.')
        expect(prompt).toContain('Guqin: primary sparse low-register plucked motif')
        expect(prompt).toContain('Xiao: breathy long tones answering the guqin')
        expect(prompt).toContain('Pipa: very restrained broken-note accents')
        expect(prompt).toContain('Xun: low hoarse shadow tone')
        expect(prompt).toContain('雨丝: A delicate rain-thread texture should be clearly audible')
        expect(prompt).toContain('Broken continuity: short phrases interrupted by silence')
        expect(prompt).toContain('Blank ending: the final phrase remains unresolved')
        expect(prompt).toContain('Cold: cool, dry, low-lit sound world')
        expect(prompt).toContain('Faintly hoarse: breathy edges')
        expect(prompt).toContain('Endless regret: recurring low motif that never fully resolves')
        expect(prompt).toContain('Fading splendor: hints of former beauty appear only as dim, decaying traces')
        expect(prompt).toContain('No celebration, no banquet music, no triumphant victory mood')
        expect(prompt).not.toContain('李煜')
    })
})
