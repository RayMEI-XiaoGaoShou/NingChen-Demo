import { describe, expect, it } from 'vitest'
import { buildCampaignRecordPanel } from './campaignRecordBoard'
import type { CampaignState } from './types'

function makeCampaignState(overrides: Partial<CampaignState> = {}): CampaignState {
    return {
        state: 'idle',
        resolvedState: null,
        sourceRound: null,
        summary: '',
        ongoingNorthImpact: {},
        ongoingSouthImpact: {},
        remainingRounds: 0,
        ...overrides,
    }
}

describe('buildCampaignRecordPanel', () => {
    it('stays hidden before the configured battle-record windows', () => {
        expect(buildCampaignRecordPanel({
            round: 1,
            surface: 'round_start',
            shuCampaign: makeCampaignState(),
            huainanCampaign: makeCampaignState(),
            shuMomentum: 0.6,
            huainanMomentum: 0,
            campaignReports: [],
        })).toEqual(expect.objectContaining({ visible: false }))
    })

    it('opens the bashu board from round 6 through round 10 only', () => {
        expect(buildCampaignRecordPanel({
            round: 6,
            surface: 'round_start',
            shuCampaign: makeCampaignState(),
            huainanCampaign: makeCampaignState(),
            shuMomentum: 0.56,
            huainanMomentum: 0,
            campaignReports: [],
        })).toEqual(expect.objectContaining({
            visible: true,
            title: '巴蜀之战',
            phase: '战前伏笔汇总',
            recapText: '此前几回合，你在朝中经营的人心、粮道与调度部署，如今已开始影响西线局势。',
        }))

        expect(buildCampaignRecordPanel({
            round: 10,
            surface: 'round_start',
            shuCampaign: makeCampaignState(),
            huainanCampaign: makeCampaignState(),
            shuMomentum: 0.88,
            huainanMomentum: 0,
            campaignReports: [],
        })).toEqual(expect.objectContaining({
            visible: true,
            title: '巴蜀之战',
            recapText: '巴蜀方向的局势已经摆到了台面上。谁在力主出兵、谁在拖延粮道、谁在掣肘调度，都在一步步左右这场战事的走向。',
        }))

        expect(buildCampaignRecordPanel({
            round: 11,
            surface: 'round_start',
            shuCampaign: makeCampaignState({ state: 'gained', resolvedState: 'gained' }),
            huainanCampaign: makeCampaignState(),
            shuMomentum: 0.88,
            huainanMomentum: 0,
            campaignReports: ['蜀地方向得手。'],
        })).toEqual(expect.objectContaining({ visible: false }))
    })

    it('absorbs the battle result into the settlement board when the campaign resolves', () => {
        expect(buildCampaignRecordPanel({
            round: 10,
            surface: 'settlement',
            shuCampaign: makeCampaignState({ state: 'gained', resolvedState: 'gained' }),
            huainanCampaign: makeCampaignState(),
            shuMomentum: 0.9,
            huainanMomentum: 0,
            campaignReports: ['南陈已在巴蜀抢下先手，北周西线顿失从容。'],
        })).toEqual(expect.objectContaining({
            visible: true,
            title: '巴蜀之战',
            phase: '战役结果',
            resultText: '南陈已在巴蜀抢下先手，北周西线顿失从容。',
        }))
    })

    it('shows the huainan board only on round 16 and hides it again afterwards', () => {
        expect(buildCampaignRecordPanel({
            round: 16,
            surface: 'round_start',
            shuCampaign: makeCampaignState({ state: 'failed', resolvedState: 'failed' }),
            huainanCampaign: makeCampaignState(),
            shuMomentum: 0,
            huainanMomentum: 0.72,
            campaignReports: [],
        })).toEqual(expect.objectContaining({
            visible: true,
            title: '淮南之战',
            phase: '战前伏笔汇总',
            recapText: '此前几回合，你在军令、粮草转运与边镇人心上做的布局，如今已一并传导到淮南前线。眼下要看的，是北周能否守住江北门户。',
        }))

        expect(buildCampaignRecordPanel({
            round: 16,
            surface: 'settlement',
            shuCampaign: makeCampaignState({ state: 'failed', resolvedState: 'failed' }),
            huainanCampaign: makeCampaignState({ state: 'gained', resolvedState: 'gained' }),
            shuMomentum: 0,
            huainanMomentum: 0.9,
            campaignReports: ['淮南防线已被撕开缺口，北周前线后方俱显疲态。'],
        })).toEqual(expect.objectContaining({
            visible: true,
            title: '淮南之战',
            phase: '战役结果',
            resultText: '淮南防线已被撕开缺口，北周前线后方俱显疲态。',
        }))

        expect(buildCampaignRecordPanel({
            round: 17,
            surface: 'round_start',
            shuCampaign: makeCampaignState({ state: 'failed', resolvedState: 'failed' }),
            huainanCampaign: makeCampaignState({ state: 'gained', resolvedState: 'gained' }),
            shuMomentum: 0,
            huainanMomentum: 0.9,
            campaignReports: ['淮南防线已被撕开缺口，北周前线后方俱显疲态。'],
        })).toEqual(expect.objectContaining({ visible: false }))
    })
})
