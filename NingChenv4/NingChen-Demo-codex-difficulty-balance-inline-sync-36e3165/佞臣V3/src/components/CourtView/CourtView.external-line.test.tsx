import { beforeEach, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CourtView } from './CourtView'
import courtViewSource from './CourtView.tsx?raw'
import { useGameStore } from '../../stores/gameStore'
import { useUiStore } from '../../stores/uiStore'
import { INITIAL_NPCS } from '../../data/npcs'
import { INITIAL_FACTIONS } from '../../data/factions'

function renderCourtViewMarkup() {
    return renderToStaticMarkup(<CourtView />)
}

describe('CourtView card presentation', () => {
    beforeEach(() => {
        useGameStore.getState().resetGame()
        useUiStore.setState({
            showNpcDetail: false,
            detailNpcId: null,
        })
    })

    it('renders the simplified court header and aligned faction blocks', () => {
        useGameStore.setState({
            currentRound: 7,
            currentPhase: 'COURT_OBSERVE',
        })

        const markup = renderCourtViewMarkup()

        expect(markup).toContain('朝堂局势')
        expect(markup).not.toContain('朝堂观察')
        expect(markup).not.toContain('冯道之旁批')
        expect(markup).toContain('南征风向')
        expect(markup).toContain('自身安危')
        expect((markup.match(/status-help-seal/g) ?? []).length).toBe(2)
        expect(markup).toContain('title="南征风向，是北周朝堂在“挥师南下”与“先安内政”之间的天平。帝党势盛则主战声起，后党稳固则南征搁浅。你要做的，是让这面天平始终不往最坏的方向倒。')
        expect(markup).toContain('title="自身安危，是你在北周朝堂上的处境有多危险。戒备你的权臣越多、发酵中的关系链越多，你离被盯上甚至被审查的深渊就越近。')
        expect(markup).toContain('帝党：力主南征')
        expect(markup).toContain('后党：优先安内')
        expect(markup).toContain('陇右勋贵')
        expect(markup).toContain('内附草原势力')
        expect(markup).toContain('faction-block faction-longxi')
        expect(markup).toContain('faction-block faction-prairie')
        expect(markup).not.toContain('边镇势能')
        expect((markup.match(/class="faction-bar"/g) ?? []).length).toBe(2)
    })

    it('renders unframed portraits with compact court chips and no opinion label prefix', () => {
        useGameStore.setState({
            currentRound: 1,
            currentPhase: 'COURT_OBSERVE',
        })

        const markup = renderCourtViewMarkup()

        expect(markup).toContain('npc-card-portrait')
        expect(markup).toContain('external-card-portrait')
        expect(markup).toContain('暗线已明：')
        expect(markup).toContain('>帝党<')
        expect(markup).not.toContain('所属党派：')
        expect(markup).not.toContain('>态度<')
        expect(markup).not.toContain('本回合对朝局意见：')
        expect(markup).not.toContain('npc-portrait-shell')
    })

    it('renders court favor chips and includes threshold labels for disposition targets', () => {
        const markup = renderCourtViewMarkup()

        expect(markup).toContain('皇帝恩宠 26 · 圣眷将尽')
        expect(markup).toContain('太后眷顾 82 · 尚得看重')
        expect(courtViewSource).toContain('可罢黜')
        expect(courtViewSource).toContain('可处决')
    })

    it('marks dismissed or executed court targets as terminal cards with no reaction text', () => {
        expect(courtViewSource).toContain("courtStatus === 'active'")
        expect(courtViewSource).toContain("getCourtStatus(npc) !== 'active'")
        expect(courtViewSource).toContain('getCourtStatusLabel(courtStatus)')
        expect(courtViewSource).toContain('getCoreCourtStatusLabel')
    })

    it('shows three external metric blocks with hover explanations and no summary metrics row', () => {
        useGameStore.setState({
            currentRound: 7,
            currentPhase: 'COURT_OBSERVE',
            difficulty: 'normal',
            npcs: INITIAL_NPCS.map(npc =>
                npc.id === 'hebaboguì'
                    ? { ...npc, trust: 75, loyaltyToCourt: 34, externalStatus: 'watchful' }
                    : { ...npc },
            ),
            factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
            intelProgress: {
                ...Object.fromEntries(INITIAL_NPCS.map(npc => [npc.id, 0])),
                'hebaboguì': 1,
            },
        })

        const markup = renderCourtViewMarkup()

        expect(markup).toContain('>军力<')
        expect(markup).toContain('>忠诚度（对朝廷）<')
        expect(markup).toContain('>信任度（对主角）<')
        expect(markup).toContain('title="忠诚度——此人还甘不甘心替北周朝廷卖命。越低，他越容易离心、割据，甚至在你推波助澜之下公然举起反旗。')
        expect(markup).toContain('title="信任度——此人是否真把你当成能替他谋后路的人。越高，他越甘愿听你的话，你也越容易推动他走出下一步。')
        expect(markup).toContain('class="npc-reaction external-reaction"')
        expect(markup).not.toContain('养信：')
        expect(markup).not.toContain('在场军头')
        expect(markup).not.toContain('平均军力')
        expect(markup).not.toContain('平均忠诚')
    })

    it('renders semi-visible military posture labels and Feng Daozhi path hints for external lines', () => {
        const markup = renderCourtViewMarkup()

        expect(markup).toContain('兵势微损')
        expect(markup).toContain('冯道之密语：')
        expect(markup).toContain('下一手宜')
        expect(courtViewSource).toContain('getExternalMilitaryPostureLabel')
        expect(courtViewSource).toContain('buildExternalWhisper')
    })

    it('renders court power labels and updated external title aliases', () => {
        useGameStore.setState({
            currentRound: 7,
            currentPhase: 'COURT_OBSERVE',
        })

        const markup = renderCourtViewMarkup()

        expect(markup).toContain('综合实力 64.3')
        expect(markup).toContain('综合实力 69.6')
        expect(markup).not.toContain('综合势能')
        expect(markup).toContain('后将军、上柱国、澜侯【驻扎天水】')
        expect(markup).toContain('卫将军、上柱国、北地公、都督河西陇右诸军事【驻扎金城郡】')
        expect(markup).toContain('北庭节度使、上柱国【驻扎雁门】')
        expect(markup).toContain('卢龙节度使、上柱国【驻扎范阳】')
        expect(markup).toContain('class="external-title npc-title"')
        expect(markup).not.toContain('npc-location')
    })

    it('uses the updated historical summaries for external blocs', () => {
        useGameStore.setState({
            currentRound: 7,
            currentPhase: 'COURT_OBSERVE',
        })

        const markup = renderCourtViewMarkup()

        expect(markup).toContain('虎据陇右的军事贵族，家族把持地方军政数十载，控遏与西域的商贸往来，部下精锐私兵唯领袖马首是瞻')
        expect(markup).toContain('被高官厚禄引诱而归附北周的草原部落族长，然草原狼的野心岂是区区财帛、官位能满足的？')
    })
    it('renders terminal external warlords with a disabled overlay path in source', () => {
        expect(courtViewSource).toContain("const isTerminal = isTerminalExternalNpc(npc)")
        expect(courtViewSource).toContain("disabled={isTerminal}")
        expect(courtViewSource).toContain("{!isTerminal && (")
        expect(courtViewSource).toContain("getExternalTerminalLabel(npc.externalStatus)")
    })
})
