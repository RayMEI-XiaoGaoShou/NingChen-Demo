import type { ReactElement } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { GameplayGuide } from './GameplayGuide'
import { useGameStore } from '../../stores/gameStore'
import { buildFengDaozhiAdvisorKit } from '../../game/fengDaozhiGuide'
import { ROUND_START_RICH_BRIEFINGS } from '../../data/roundStartRichBriefings'
import { GameHudTools } from '../GameHud/GameHud'

function renderToStaticMarkupWithCurrentStore(element: ReactElement) {
    const currentState = useGameStore.getState()
    const initialState = useGameStore.getInitialState()
    const previousInitialState = {
        currentRound: initialState.currentRound,
        npcs: initialState.npcs,
        intelProgress: initialState.intelProgress,
        difficulty: initialState.difficulty,
        fengDaozhiGuideSeen: initialState.fengDaozhiGuideSeen,
        shuCampaign: initialState.shuCampaign,
        huainanCampaign: initialState.huainanCampaign,
    }

    Object.assign(initialState, {
        currentRound: currentState.currentRound,
        npcs: currentState.npcs,
        intelProgress: currentState.intelProgress,
        difficulty: currentState.difficulty,
        fengDaozhiGuideSeen: currentState.fengDaozhiGuideSeen,
        shuCampaign: currentState.shuCampaign,
        huainanCampaign: currentState.huainanCampaign,
    })

    try {
        return renderToStaticMarkup(element)
    } finally {
        Object.assign(initialState, previousInitialState)
    }
}

describe('GameplayGuide copy', () => {
    beforeEach(() => {
        useGameStore.getState().resetGame()
    })

    it('labels the HUD help button as information summary', () => {
        const markup = renderToStaticMarkup(<GameHudTools onOpenGuide={() => undefined} />)

        expect(markup).toContain('title="信息摘要"')
        expect(markup).toContain('aria-label="信息摘要"')
        expect(markup).not.toContain('玩法说明')
    })

    it('shows only current-round information summary content', () => {
        const markup = renderToStaticMarkup(<GameplayGuide mode="entry" />)

        expect(markup).toContain('信息摘要')
        expect(markup).toContain('本回合朝堂简报')
        expect(markup).toContain(ROUND_START_RICH_BRIEFINGS[1].split('\n\n')[0])
        expect(markup).toContain(ROUND_START_RICH_BRIEFINGS[1].split('\n\n')[1])
        expect(markup).not.toContain('这是一场围绕人物、关系、派系与战局展开的二十回合权谋博弈。')
        expect(markup).not.toContain('玩法总览')
        expect(markup).not.toContain('先明规则，再入局')
        expect(markup).not.toContain('你的目标')
        expect(markup).not.toContain('每回合流程')
        expect(markup).not.toContain('计谋系统')
        expect(markup).not.toContain('天道结算')
        expect(markup).toContain('narrative-utility-row')
        expect(markup).toContain('page-audio-btn')
    })

    it('shows the current-round Feng Daozhi key people summary and briefing in overlay mode after it has been seen', () => {
        const state = useGameStore.getState()
        const currentRoundAdvisorKit = buildFengDaozhiAdvisorKit({
            round: state.currentRound,
            npcs: state.npcs,
            intelProgress: state.intelProgress,
            difficulty: state.difficulty,
        })
        useGameStore.setState({
            fengDaozhiGuideSeen: { [currentRoundAdvisorKit.key]: true },
        })

        const markup = renderToStaticMarkupWithCurrentStore(<GameplayGuide mode="overlay" />)

        expect(markup).toContain('guide-feng-daozhi-summary')
        expect(markup).toContain('本回合冯道之锦囊摘要')
        expect(markup).toContain('朝堂势力')
        expect(markup).toContain('地方军头')
        expect(markup).toContain('本回合朝堂简报')
        expect(markup).toContain(ROUND_START_RICH_BRIEFINGS[1].split('\n\n')[0])
        expect(markup).toContain(ROUND_START_RICH_BRIEFINGS[1].split('\n\n')[1])
        expect(markup).not.toContain('重听锦囊')
    })

    it('hides the current-round Feng Daozhi summary in overlay mode before it has been seen', () => {
        const markup = renderToStaticMarkupWithCurrentStore(<GameplayGuide mode="overlay" />)

        expect(markup).not.toContain('guide-feng-daozhi-summary')
    })

    it('hides the current-round Feng Daozhi summary in entry mode even after it has been seen', () => {
        const state = useGameStore.getState()
        const currentRoundAdvisorKit = buildFengDaozhiAdvisorKit({
            round: state.currentRound,
            npcs: state.npcs,
            intelProgress: state.intelProgress,
            difficulty: state.difficulty,
        })
        useGameStore.setState({
            fengDaozhiGuideSeen: { [currentRoundAdvisorKit.key]: true },
        })

        const markup = renderToStaticMarkupWithCurrentStore(<GameplayGuide mode="entry" />)

        expect(markup).not.toContain('guide-feng-daozhi-summary')
    })
})
