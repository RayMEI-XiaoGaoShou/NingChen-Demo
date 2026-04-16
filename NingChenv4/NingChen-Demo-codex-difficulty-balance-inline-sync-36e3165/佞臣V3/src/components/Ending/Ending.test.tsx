import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const mockState = {
    gameResult: 'DEFEAT_DEATH' as const,
    northStats: {
        finance: 68,
        grain: 70,
        military: 73,
        socialOrder: 62,
        governance: 65,
    },
    southStats: {
        finance: 52,
        grain: 51,
        military: 49,
        socialOrder: 55,
        governance: 50,
    },
    northPower: 65.5,
    southPower: 41.4,
    resetGame: vi.fn(),
    restoreRoundStartSnapshot: vi.fn(),
    roundStartSnapshot: { currentRound: 8 },
    endingReport: {
        title: '弃子求安',
        tier: '惨败' as const,
        causeSummary: ['你死于邺城赐鸩。'],
        factionOutlook: [],
        npcFates: [],
        statsSummary: [],
        openingLines: ['建文九年，佞臣萧宝颖死于邺城。'],
        epilogueLines: ['南陈女帝闻讯，独坐含章殿，竟夕不言。'],
        sceneLabel: '贺拔琪 · 弃子求安',
        invasionDriver: null,
        triggerRound: null,
        standoutNpc: null,
        northFailureSummary: null,
    },
    battleReport: null,
}

vi.mock('../../stores/gameStore', () => ({
    useGameStore: () => mockState,
}))

import { Ending } from './Ending'

describe('Ending', () => {
    it('shows the retry-current-round button for death endings and keeps 再启宿命 as the main action', () => {
        const markup = renderToStaticMarkup(<Ending />)

        expect(markup).toContain('回到本回合初')
        expect(markup).toContain('再启宿命')
        expect(markup).toContain('贺拔琪')
        expect(markup).toContain('弃子求安')
    })
})
