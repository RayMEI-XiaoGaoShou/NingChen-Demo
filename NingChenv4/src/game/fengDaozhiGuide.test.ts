import { describe, expect, it } from 'vitest'
import { INITIAL_NPCS } from '../data/npcs'
import { FIRST_ROUND_GUIDE_CONTENT } from '../data/prologueContent'
import {
    buildCourtOverviewFengDaozhiQueue,
    buildFengDaozhiAdvisorKit,
    buildFirstRoundGuideSequence,
    getFengDaozhiAdvisorKitSeenKey,
} from './fengDaozhiGuide'

const initialIntelProgress = Object.fromEntries(INITIAL_NPCS.map(npc => [npc.id, 0]))

describe('fengDaozhiGuide', () => {
    it('builds stable per-round advisor kit seen keys', () => {
        expect(getFengDaozhiAdvisorKitSeenKey(1)).toBe('round:1:advisor_kit:v1')
        expect(getFengDaozhiAdvisorKitSeenKey(12)).toBe('round:12:advisor_kit:v1')
    })

    it('builds a court/external split advisor kit with key people summaries', () => {
        const kit = buildFengDaozhiAdvisorKit({
            round: 5,
            npcs: INITIAL_NPCS,
            intelProgress: initialIntelProgress,
            difficulty: 'normal',
        })

        expect(kit.key).toBe('round:5:advisor_kit:v1')
        expect(kit.title).toContain('冯道之锦囊')
        expect(kit.court.summary).toContain('朝堂势力')
        expect(kit.external.summary).toContain('地方军头')
        expect(kit.lines.map(line => line.segmentLabel)).toEqual(expect.arrayContaining(['朝堂势力', '地方军头']))
    })

    it('queues first-round guide before the per-round advisor kit on CourtView overview', () => {
        const firstRoundGuide = buildFirstRoundGuideSequence('court_observe')
        const kit = buildFengDaozhiAdvisorKit({
            round: 1,
            npcs: INITIAL_NPCS,
            intelProgress: initialIntelProgress,
            difficulty: 'normal',
        })

        const queue = buildCourtOverviewFengDaozhiQueue({
            firstRoundGuide,
            advisorKit: kit,
            firstRoundGuideSeen: false,
            advisorKitSeen: false,
        })

        expect(queue.map(item => item.key)).toEqual(['first-round:court_observe:v1', 'round:1:advisor_kit:v1'])
    })

    it('omits already seen queue items', () => {
        const firstRoundGuide = buildFirstRoundGuideSequence('court_observe')
        const kit = buildFengDaozhiAdvisorKit({
            round: 1,
            npcs: INITIAL_NPCS,
            intelProgress: initialIntelProgress,
            difficulty: 'normal',
        })

        const queue = buildCourtOverviewFengDaozhiQueue({
            firstRoundGuide,
            advisorKit: kit,
            firstRoundGuideSeen: true,
            advisorKitSeen: false,
        })

        expect(queue.map(item => item.key)).toEqual(['round:1:advisor_kit:v1'])
    })

    it('builds first-round guide lines from the Feng Daozhi markdown design', () => {
        const roundStart = buildFirstRoundGuideSequence('round_start')
        expect(roundStart.lines.map(line => line.text)).toEqual([
            '公子，先别急着出手。且先细读朝局简报，它会告诉你这半载的天下大势，后续施计均需围绕天下局势展开',
            '后续也可重温案卷，唯有对局势洞若观火，方能将毒针扎入北周要害',
        ])
        expect(roundStart.lines.map(line => line.audioKey)).toEqual([
            '01_round_start_01',
            '02_round_start_02',
        ])
        expect(roundStart.highlightTerms).toEqual(['朝局简报', '重温案卷'])

        const external = buildFirstRoundGuideSequence('external_faction')
        expect(external.lines).toHaveLength(4)
        expect(external.lines.map(line => line.audioKey)).toEqual([
            '05_external_faction_01',
            '06_external_faction_02',
            '07_external_faction_03',
            '08_external_faction_04',
        ])
        expect(external.lines.map(line => line.text).join('\n')).toContain('陇右勋贵是虎据西北的军事贵族')
        expect(external.highlightTerms).toEqual(expect.arrayContaining(['计谋', '忠诚度', '信任度', '军力', '割据', '叛乱']))

        const schemeCard = buildFirstRoundGuideSequence('scheme_card_omen')
        expect(schemeCard.lines).toHaveLength(5)
        expect(schemeCard.lines.map(line => line.audioKey)).toEqual([
            '30_scheme_card_omen_01',
            '31_scheme_card_omen_02',
            '32_scheme_card_omen_03',
            '33_scheme_card_omen_04',
            '34_scheme_card_omen_05',
        ])
        expect(schemeCard.lines.map(line => line.text).join('\n')).toContain('当前北周朝局诡谲')
        expect(FIRST_ROUND_GUIDE_CONTENT.scheme_card_omen.highlightTerms).toEqual(expect.arrayContaining(['谶纬', '皇帝恩宠', '太后眷顾']))
    })

    it('leaves dynamic per-round advisor kit lines without fixed first-round voice assets', () => {
        const kit = buildFengDaozhiAdvisorKit({
            round: 1,
            npcs: INITIAL_NPCS,
            intelProgress: initialIntelProgress,
            difficulty: 'normal',
        })

        expect(kit.lines.every(line => line.audioKey === undefined)).toBe(true)
    })
})
