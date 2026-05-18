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
    HEBAQI_DETAIL_ASSETS,
    getNpcPortraitPath,
    getNpcPublicStatementAudioPath,
} from './mediaAssets'

describe('mediaAssets', () => {
    it('maps 宇文棣 to 拓跋棣 portrait asset', () => {
        expect(decodeURI(getNpcPortraitPath('宇文棣') ?? '')).toContain('拓跋棣.png')
    })

    it('returns direct name-based portrait assets when available', () => {
        expect(decodeURI(getNpcPortraitPath('祖廷') ?? '')).toContain('祖廷.png')
        expect(decodeURI(getNpcPortraitPath('贺拔琪') ?? '')).toContain('贺拔琪.png')
    })

    it('maps court dark portraits to finalized cutout assets', () => {
        expect(decodeURI(getNpcPortraitPath('宇文棣', 'courtDark') ?? '')).toContain('朝堂暗版/portrait_yuwendi_base_dark_cutout.png')
        expect(decodeURI(getNpcPortraitPath('令狐律光', 'courtDark') ?? '')).toContain('朝堂暗版/portrait_linghulvguang_base_dark_cutout.png')
    })

    it('maps court bright portraits to hover cutout assets', () => {
        expect(decodeURI(getNpcPortraitPath('宇文棣', 'courtBright') ?? '')).toContain('hover亮版_v1/portrait_yuwendi_hover_bright_cutout.png')
        expect(decodeURI(getNpcPortraitPath('贺拔琪', 'courtBright') ?? '')).toContain('hover亮版_v1/portrait_hebaqi_hover_bright_cutout.png')
    })

    it('maps court fullbody portraits to selected AIART assets', () => {
        expect(decodeURI(getNpcPortraitPath('宇文棣', 'courtFullbody') ?? '')).toContain('court-fullbody/portrait_yuwendi_fullbody.png')
        expect(decodeURI(getNpcPortraitPath('贺拔琪', 'courtFullbody') ?? '')).toContain('court-fullbody/portrait_hebaqi_fullbody.png')
    })

    it('maps external fullbody portraits to selected AIART assets', () => {
        expect(decodeURI(getNpcPortraitPath('独孤文约', 'externalFullbody') ?? '')).toContain('external-fullbody/portrait_duguwenyue_fullbody.png')
        expect(decodeURI(getNpcPortraitPath('贺拔伯圭', 'externalFullbody') ?? '')).toContain('external-fullbody/portrait_hebabogui_fullbody.png')
        expect(decodeURI(getNpcPortraitPath('尔朱烈', 'externalFullbody') ?? '')).toContain('external-fullbody/portrait_erzhulie_fullbody.png')
        expect(decodeURI(getNpcPortraitPath('安思明', 'externalFullbody') ?? '')).toContain('external-fullbody/portrait_ansiming_fullbody.png')
    })

    it('returns null for unknown names', () => {
        expect(getNpcPortraitPath('不存在的人')).toBeNull()
    })

    it('tracks court faction UI assets used by the polished court screen', () => {
        expect(COURT_FACTION_UI_ASSETS.reactionPaper).toBe('/images/ui/court-faction/court-reaction-paper.png')
        expect(COURT_FACTION_UI_ASSETS.bottomDeskForeground).toBe('/images/ui/court-faction/court-bottom-foreground-desk-layer-v2.png')
        expect(COURT_FACTION_UI_ASSETS.imperialJadeSealBadge).toBe('/images/ui/court-faction/imperial-jade-seal-badge.png')
        expect(COURT_FACTION_UI_ASSETS.phoenixCrownBadge).toBe('/images/ui/court-faction/phoenix-crown-badge.png')
        expect(COURT_FACTION_UI_ASSETS.emperorPartyEmblem).toBe('/images/ui/court-faction/court-party-emblem-emperor-dragon.png')
        expect(COURT_FACTION_UI_ASSETS.empressPartyEmblem).toBe('/images/ui/court-faction/court-party-emblem-empress-phoenix.png')
    })

    it('tracks external faction UI assets used by the polished warlord screen', () => {
        expect(EXTERNAL_FACTION_UI_ASSETS.longxiBackground).toBe('/images/ui/external-faction/external-background-longxi.png')
        expect(EXTERNAL_FACTION_UI_ASSETS.prairieBackground).toBe('/images/ui/external-faction/external-background-prairie.png')
        expect(EXTERNAL_FACTION_UI_ASSETS.tigerEmblem).toBe('/images/ui/external-faction/external-emblem-tiger.png')
        expect(EXTERNAL_FACTION_UI_ASSETS.wolfEmblem).toBe('/images/ui/external-faction/external-emblem-wolf.png')
        expect(EXTERNAL_FACTION_UI_ASSETS.bottomCommandDesk).toBe('/images/ui/external-faction/external-bottom-foreground-command-desk-v2.png')
        expect(EXTERNAL_FACTION_UI_ASSETS.metricMilitaryIcon).toBe('/images/ui/external-faction/external-metric-icon-military.png')
        expect(EXTERNAL_FACTION_UI_ASSETS.metricLoyaltyIcon).toBe('/images/ui/external-faction/external-metric-icon-loyalty.png')
        expect(EXTERNAL_FACTION_UI_ASSETS.metricTrustIcon).toBe('/images/ui/external-faction/external-metric-icon-trust.png')
    })

    it('tracks scheme UI assets with stable ASCII filenames', () => {
        expect(SCHEME_UI_ASSETS.fengDaozhiAssistPortrait).toBe('/images/npc/scheme/fengdaozhi-assist.webp')
        expect(SCHEME_UI_ASSETS.fengDaozhiAssistPortrait).toMatch(/^[\x00-\x7F]+$/)
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

    it('builds current-round public statement audio paths for normal and branch rounds', () => {
        expect(getNpcPublicStatementAudioPath('yuwendi', 1)).toBe('/audio/generated/court_statements/public_statement_r01_main_yuwendi.mp3')
        expect(getNpcPublicStatementAudioPath('weichimù', 11, { shuCampaignState: 'gained' })).toBe('/audio/generated/court_statements/public_statement_r11_a_yuchimu.mp3')
        expect(getNpcPublicStatementAudioPath('hebaqí', 17, { huainanCampaignState: 'failed' })).toBe('/audio/generated/court_statements/public_statement_r17_c_hebaqi.mp3')
        expect(getNpcPublicStatementAudioPath('unknown', 1)).toBeNull()
    })
})
