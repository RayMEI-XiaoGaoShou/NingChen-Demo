import { describe, expect, it } from 'vitest'
import {
    COURT_FACTION_UI_ASSETS,
    EXTERNAL_FACTION_UI_ASSETS,
    SCHEME_UI_ASSETS,
    getHebaQiDetailPortraitKey,
    getNpcDetailAssetKey,
    getNpcDetailAvatarPath,
    getNpcDetailBackgroundPath,
    getNpcDetailPortraitKey,
    getNpcDetailPortraitPath,
    getNpcDetailVoicePath,
    HEBAQI_DETAIL_ASSETS,
    BGM_TRACKS,
    SFX_ASSETS,
    getEmpressOptionSfxKey,
    getNpcPortraitPath,
    getNpcPublicStatementAudioPath,
    getBgmTrackPath,
    getSfxPath,
    MAP_ASSETS,
    getFengDaozhiFirstRoundGuideVoicePath,
} from './mediaAssets'

describe('mediaAssets', () => {
    it('maps court fullbody portraits to selected AIART assets', () => {
        expect(decodeURI(getNpcPortraitPath('宇文棣', 'courtFullbody') ?? '')).toContain('court-fullbody/portrait_yuwendi_fullbody.webp')
        expect(decodeURI(getNpcPortraitPath('贺拔琪', 'courtFullbody') ?? '')).toContain('court-fullbody/portrait_hebaqi_fullbody.webp')
    })

    it('maps external fullbody portraits to selected AIART assets', () => {
        expect(decodeURI(getNpcPortraitPath('独孤文约', 'externalFullbody') ?? '')).toContain('external-fullbody/portrait_duguwenyue_fullbody.webp')
        expect(decodeURI(getNpcPortraitPath('贺拔伯圭', 'externalFullbody') ?? '')).toContain('external-fullbody/portrait_hebabogui_fullbody.webp')
        expect(decodeURI(getNpcPortraitPath('尔朱烈', 'externalFullbody') ?? '')).toContain('external-fullbody/portrait_erzhulie_fullbody.webp')
        expect(decodeURI(getNpcPortraitPath('安思明', 'externalFullbody') ?? '')).toContain('external-fullbody/portrait_ansiming_fullbody.webp')
    })

    it('returns null for unknown names', () => {
        expect(getNpcPortraitPath('不存在的人', 'courtFullbody')).toBeNull()
    })

    it('tracks campaign maps directly on the selected AIART round-start assets', () => {
        expect(MAP_ASSETS.initial.src).toContain('roundstart-world-map-aiart-v1.webp')
        expect(MAP_ASSETS.bashu.src).toContain('roundstart-world-map-aiart-bashu-v1.webp')
        expect(MAP_ASSETS.bashuHuainan.src).toContain('roundstart-world-map-aiart-bashu-huainan-v1.webp')
        expect(MAP_ASSETS.huainan.src).toContain('roundstart-world-map-aiart-huainan-v1.webp')

        for (const asset of Object.values(MAP_ASSETS)) {
            expect(decodeURI(asset.src)).not.toContain('地图底稿')
        }
    })

    it('tracks court faction UI assets used by the polished court screen', () => {
        expect(COURT_FACTION_UI_ASSETS.reactionPaper).toBe('/images/ui/court-faction/court-reaction-paper.webp')
        expect(COURT_FACTION_UI_ASSETS.bottomDeskForeground).toBe('/images/ui/court-faction/court-bottom-foreground-desk-layer-v2.webp')
        expect(COURT_FACTION_UI_ASSETS.imperialJadeSealBadge).toBe('/images/ui/court-faction/imperial-jade-seal-badge.webp')
        expect(COURT_FACTION_UI_ASSETS.phoenixCrownBadge).toBe('/images/ui/court-faction/phoenix-crown-badge.webp')
        expect(COURT_FACTION_UI_ASSETS.emperorPartyEmblem).toBe('/images/ui/court-faction/court-party-emblem-emperor-dragon.webp')
        expect(COURT_FACTION_UI_ASSETS.empressPartyEmblem).toBe('/images/ui/court-faction/court-party-emblem-empress-phoenix.webp')
    })

    it('tracks external faction UI assets used by the polished warlord screen', () => {
        expect(EXTERNAL_FACTION_UI_ASSETS.longxiBackground).toBe('/images/ui/external-faction/external-background-longxi.webp')
        expect(EXTERNAL_FACTION_UI_ASSETS.prairieBackground).toBe('/images/ui/external-faction/external-background-prairie.webp')
        expect(EXTERNAL_FACTION_UI_ASSETS.tigerEmblem).toBe('/images/ui/external-faction/external-emblem-tiger.webp')
        expect(EXTERNAL_FACTION_UI_ASSETS.wolfEmblem).toBe('/images/ui/external-faction/external-emblem-wolf.webp')
        expect(EXTERNAL_FACTION_UI_ASSETS.bottomCommandDesk).toBe('/images/ui/external-faction/external-bottom-foreground-command-desk-v2.webp')
        expect(EXTERNAL_FACTION_UI_ASSETS.metricMilitaryIcon).toBe('/images/ui/external-faction/external-metric-icon-military.webp')
        expect(EXTERNAL_FACTION_UI_ASSETS.metricLoyaltyIcon).toBe('/images/ui/external-faction/external-metric-icon-loyalty.webp')
        expect(EXTERNAL_FACTION_UI_ASSETS.metricTrustIcon).toBe('/images/ui/external-faction/external-metric-icon-trust.webp')
    })

    it('tracks scheme UI assets with stable ASCII filenames', () => {
        expect(SCHEME_UI_ASSETS.fengDaozhiAssistPortrait).toBe('/images/npc/scheme/fengdaozhi-assist-0.webp')
        expect(SCHEME_UI_ASSETS.fengDaozhiAssistPortrait).toMatch(/^[\x00-\x7F]+$/)
        expect(SCHEME_UI_ASSETS.fengDaozhiDialoguePortraits).toEqual([
            '/images/npc/scheme/fengdaozhi-assist-0.webp',
            '/images/npc/scheme/fengdaozhi-assist-1.webp',
            '/images/npc/scheme/fengdaozhi-assist-2.webp',
            '/images/npc/scheme/fengdaozhi-assist-3.webp',
        ])
        SCHEME_UI_ASSETS.fengDaozhiDialoguePortraits.forEach(path => {
            expect(path).toMatch(/^[\x00-\x7F]+$/)
        })
    })

    it('builds Feng Daozhi first-round guide voice paths from stable audio keys', () => {
        expect(getFengDaozhiFirstRoundGuideVoicePath('01_round_start_01')).toBe(
            '/audio/generated/feng_daozhi_first_round_guide/01_round_start_01.mp3',
        )
        expect(getFengDaozhiFirstRoundGuideVoicePath('40_empress_reply_01')).toBe(
            '/audio/generated/feng_daozhi_first_round_guide/40_empress_reply_01.mp3',
        )
        expect(getFengDaozhiFirstRoundGuideVoicePath('')).toBeNull()
    })

    it('tracks game SFX assets with stable ASCII filenames grouped by use case', () => {
        expect(SFX_ASSETS).toEqual({
            'roundstart-to-court': '/audio/sfx/transitions/roundstart-to-court.mp3',
            'settlement-next-volume': '/audio/sfx/transitions/settlement-next-volume.mp3',
            'empress-next-page': '/audio/sfx/transitions/empress-next-page.mp3',
            'court-gate-hover': '/audio/sfx/court/court-gate-hover.mp3',
            'external-gate-hover': '/audio/sfx/court/external-gate-hover.mp3',
            'north-page-action': '/audio/sfx/buttons/north-page-action.mp3',
            'north-inline-action': '/audio/sfx/buttons/north-inline-action.mp3',
            'empress-option-a': '/audio/sfx/empress/option-a.mp3',
            'empress-option-b': '/audio/sfx/empress/option-b.mp3',
            'empress-option-c': '/audio/sfx/empress/option-c.mp3',
            'empress-option-d': '/audio/sfx/empress/option-d.mp3',
            'feng-draft': '/audio/sfx/scheme/feng-draft.mp3',
        })

        for (const path of Object.values(SFX_ASSETS)) {
            expect(path).toMatch(/^[\x00-\x7F]+$/)
        }

        expect(getSfxPath('north-page-action')).toBe('/audio/sfx/buttons/north-page-action.mp3')
        expect(getEmpressOptionSfxKey(0)).toBe('empress-option-a')
        expect(getEmpressOptionSfxKey(3)).toBe('empress-option-d')
        expect(getEmpressOptionSfxKey(4)).toBeNull()
    })

    it('tracks the new BGM suite with stable ASCII filenames grouped by scene', () => {
        expect(BGM_TRACKS).toEqual({
            coverEnding: '/bgm/bgm-cover-ending.mp3',
            roundCourtOverview: '/bgm/bgm-round-court-overview.mp3',
            externalDetailScheme: '/bgm/bgm-external-detail-scheme.mp3',
            courtDetailScheme: '/bgm/bgm-court-detail-scheme.mp3',
            empressQuestion: '/bgm/bgm-empress-question.mp3',
            schemeFeedback: '/bgm/bgm-scheme-feedback.mp3',
            empressReply: '/bgm/bgm-empress-reply.mp3',
            settlement: '/bgm/bgm-settlement.mp3',
        })

        for (const path of Object.values(BGM_TRACKS)) {
            expect(path).toMatch(/^[\x00-\x7F]+$/)
        }

        expect(getBgmTrackPath('courtDetailScheme')).toBe('/bgm/bgm-court-detail-scheme.mp3')
    })

    it('tracks selected HebaQi detail assets with stable ASCII filenames', () => {
        expect(HEBAQI_DETAIL_ASSETS.background).toBe('/images/npc/detail/hebaqi/background.webp')
        expect(HEBAQI_DETAIL_ASSETS.portraits.cold_guard).toBe('/images/npc/detail/hebaqi/hebaqi-cold-guard.webp')
        expect(HEBAQI_DETAIL_ASSETS.portraits.watchful).toBe('/images/npc/detail/hebaqi/hebaqi-watchful.webp')
        expect(HEBAQI_DETAIL_ASSETS.portraits.trusted).toBe('/images/npc/detail/hebaqi/hebaqi-trusted.webp')
        expect(HEBAQI_DETAIL_ASSETS.portraits.relied).toBe('/images/npc/detail/hebaqi/hebaqi-relied.webp')
        expect(HEBAQI_DETAIL_ASSETS.portraits.devoted).toBe('/images/npc/detail/hebaqi/hebaqi-devoted.webp')
    })

    it('maps all NPC ids to generic detail asset keys, including accented ids', () => {
        const cases = [
            ['hebaqí', 'hebaqi'],
            ['hebaqi', 'hebaqi'],
            ['zongai', 'zongai'],
            ['linghuelvguang', 'linghulvguang'],
            ['weichimù', 'yuchimu'],
            ['weichimu', 'yuchimu'],
            ['zuting', 'zuting'],
            ['yuwendi', 'yuwendi'],
            ['duguwenyue', 'duguwenyue'],
            ['hebaboguì', 'hebabogui'],
            ['hebabogui', 'hebabogui'],
            ['erzhulié', 'erzhulie'],
            ['erzhulie', 'erzhulie'],
            ['ansiming', 'ansiming'],
        ] as const

        for (const [npcId, assetKey] of cases) {
            expect(getNpcDetailAssetKey(npcId)).toBe(assetKey)
        }
        expect(getNpcDetailAssetKey('unknown')).toBeNull()
    })

    it('builds WebP detail backgrounds and attitude portraits for all interactive NPCs', () => {
        const assetKeys = [
            'hebaqi',
            'zongai',
            'linghulvguang',
            'yuchimu',
            'zuting',
            'yuwendi',
            'duguwenyue',
            'hebabogui',
            'erzhulie',
            'ansiming',
        ] as const

        for (const assetKey of assetKeys) {
            expect(getNpcDetailBackgroundPath(assetKey)).toBe(`/images/npc/detail/${assetKey}/background.webp`)
            expect(getNpcDetailPortraitPath(assetKey, 14)).toBe(`/images/npc/detail/${assetKey}/${assetKey}-cold-guard.webp`)
            expect(getNpcDetailPortraitPath(assetKey, 30)).toBe(`/images/npc/detail/${assetKey}/${assetKey}-watchful.webp`)
            expect(getNpcDetailPortraitPath(assetKey, 50)).toBe(`/images/npc/detail/${assetKey}/${assetKey}-trusted.webp`)
            expect(getNpcDetailPortraitPath(assetKey, 70)).toBe(`/images/npc/detail/${assetKey}/${assetKey}-relied.webp`)
            expect(getNpcDetailPortraitPath(assetKey, 90)).toBe(`/images/npc/detail/${assetKey}/${assetKey}-devoted.webp`)
        }
        expect(getNpcDetailBackgroundPath('unknown')).toBeNull()
        expect(getNpcDetailPortraitPath('unknown', 50)).toBeNull()
    })

    it('builds ASCII WebP detail avatar paths for all interactive NPCs', () => {
        const assetKeys = [
            'hebaqi',
            'zongai',
            'linghulvguang',
            'yuchimu',
            'zuting',
            'yuwendi',
            'duguwenyue',
            'hebabogui',
            'erzhulie',
            'ansiming',
        ] as const

        for (const assetKey of assetKeys) {
            const avatarPath = getNpcDetailAvatarPath(assetKey)

            expect(avatarPath).toBe(`/images/npc/detail-avatars/${assetKey}.webp`)
            expect(avatarPath).toMatch(/^[\x00-\x7F]+$/)
        }
        expect(getNpcDetailAvatarPath('unknown')).toBeNull()
    })

    it('maps detail trust values to five attitude portraits across trust-level boundaries', () => {
        expect(getNpcDetailPortraitKey(14)).toBe('cold_guard')
        expect(getNpcDetailPortraitKey(15)).toBe('cold_guard')
        expect(getNpcDetailPortraitKey(29)).toBe('cold_guard')
        expect(getNpcDetailPortraitKey(30)).toBe('watchful')
        expect(getNpcDetailPortraitKey(49)).toBe('watchful')
        expect(getNpcDetailPortraitKey(50)).toBe('trusted')
        expect(getNpcDetailPortraitKey(69)).toBe('trusted')
        expect(getNpcDetailPortraitKey(70)).toBe('relied')
        expect(getNpcDetailPortraitKey(89)).toBe('relied')
        expect(getNpcDetailPortraitKey(90)).toBe('devoted')
        expect(getHebaQiDetailPortraitKey(90)).toBe(getNpcDetailPortraitKey(90))
    })

    it('builds detail-entry attitude voice paths for every interactive NPC', () => {
        const assetKeys = [
            'hebaqi',
            'zongai',
            'linghulvguang',
            'yuchimu',
            'zuting',
            'yuwendi',
            'duguwenyue',
            'hebabogui',
            'erzhulie',
            'ansiming',
        ] as const

        for (const assetKey of assetKeys) {
            expect(getNpcDetailVoicePath(assetKey, 14)).toBe(`/audio/generated/scheme_avatar/${assetKey}/cold_guard.mp3`)
            expect(getNpcDetailVoicePath(assetKey, 30)).toBe(`/audio/generated/scheme_avatar/${assetKey}/watchful.mp3`)
            expect(getNpcDetailVoicePath(assetKey, 50)).toBe(`/audio/generated/scheme_avatar/${assetKey}/trusted.mp3`)
            expect(getNpcDetailVoicePath(assetKey, 70)).toBe(`/audio/generated/scheme_avatar/${assetKey}/relied.mp3`)
            expect(getNpcDetailVoicePath(assetKey, 90)).toBe(`/audio/generated/scheme_avatar/${assetKey}/devoted.mp3`)
        }

        expect(getNpcDetailVoicePath('hebaq\u00ed', 90)).toBe('/audio/generated/scheme_avatar/hebaqi/devoted.mp3')
        expect(getNpcDetailVoicePath('unknown', 50)).toBeNull()
    })

    it('builds current-round public statement audio paths for normal and branch rounds', () => {
        expect(getNpcPublicStatementAudioPath('yuwendi', 1)).toBe('/audio/generated/court_statements/public_statement_r01_main_yuwendi.mp3')
        expect(getNpcPublicStatementAudioPath('weichimù', 11, { shuCampaignState: 'gained' })).toBe('/audio/generated/court_statements/public_statement_r11_a_yuchimu.mp3')
        expect(getNpcPublicStatementAudioPath('hebaqí', 17, { huainanCampaignState: 'failed' })).toBe('/audio/generated/court_statements/public_statement_r17_c_hebaqi.mp3')
        expect(getNpcPublicStatementAudioPath('unknown', 1)).toBeNull()
    })
})
