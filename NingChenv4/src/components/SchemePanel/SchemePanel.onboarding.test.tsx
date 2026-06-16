import { beforeEach, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import {
    EXTERNAL_LINE_TEACHING_CONTENT,
    FIRST_OMEN_TEACHING_CONTENT,
    SCHEME_MASTER_GUIDE_CONTENT,
} from '../../data/prologueContent'
import { OmenTeachingModal } from './OmenTeachingModal'
import { getSchemeUnlockHint } from './SchemePanel'
import { useGameStore } from '../../stores/gameStore'
import { SchemeOnboardingModal } from './SchemeOnboardingModal'

describe('SchemePanel onboarding flows', () => {
    beforeEach(() => {
        useGameStore.getState().resetGame()
    })

    it('keeps the scheme master guide focused on the two visible explainability layers', () => {
        expect(SCHEME_MASTER_GUIDE_CONTENT.pages[1]?.bullets).toEqual(
            expect.arrayContaining([
                expect.stringContaining('国力影响'),
                expect.stringContaining('朝堂政局'),
            ]),
        )
        expect(SCHEME_MASTER_GUIDE_CONTENT.pages[1]?.bullets.join('')).not.toContain('局势伏线')
    })

    it('uses the renamed external-line teaching content', () => {
        const markup = renderToStaticMarkup(
            <SchemeOnboardingModal
                open
                title={EXTERNAL_LINE_TEACHING_CONTENT.title}
                pages={EXTERNAL_LINE_TEACHING_CONTENT.pages}
                onClose={() => undefined}
            />,
        )

        expect(markup).toContain('地方军头计谋玩法')
        expect(markup).toContain('first-round-guide-header')
        expect(EXTERNAL_LINE_TEACHING_CONTENT.pages[0]?.bullets).toEqual(
            expect.arrayContaining([
                expect.stringContaining('第一步：交心'),
            ]),
        )
        expect(EXTERNAL_LINE_TEACHING_CONTENT.pages[1]?.bullets).toEqual(
            expect.arrayContaining([
                expect.stringContaining('信任不够'),
                expect.stringContaining('暗线不够'),
                expect.stringContaining('忠诚仍高'),
            ]),
        )
    })

    it('uses helper-based external unlock copy for locked outside lines', () => {
        const npc = useGameStore.getState().npcs.find(item => item.id === 'duguwenyue')!

        const hint = getSchemeUnlockHint({
            schemeType: 'rebellion',
            npc,
            round: 5,
            unlockedSecrets: 0,
        })

        expect(hint).toContain('信任尚差')
        expect(hint).toContain('此人对朝廷还没冷透')
        expect(hint).toContain('暗线尚差')
    })

    it('renders the detailed omen teaching modal copy', () => {
        const markup = renderToStaticMarkup(
            <OmenTeachingModal
                open
                content={FIRST_OMEN_TEACHING_CONTENT}
                onClose={() => undefined}
            />,
        )

        expect(markup).toContain('谶（chèn）纬')
        expect(markup).toContain('first-round-guide-header')
        expect(FIRST_OMEN_TEACHING_CONTENT.steps).toEqual(
            expect.arrayContaining([
                expect.stringContaining('第一栏：编一个征兆'),
                expect.stringContaining('解释'),
            ]),
        )
        expect(FIRST_OMEN_TEACHING_CONTENT.impactNotes).toEqual(
            expect.arrayContaining([
                expect.stringContaining('北周统治'),
                expect.stringContaining('稳局'),
            ]),
        )
    })
})
