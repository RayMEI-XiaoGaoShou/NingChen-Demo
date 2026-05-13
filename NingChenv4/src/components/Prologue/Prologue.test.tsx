import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Prologue } from './Prologue'
import { GameplayGuide } from '../GameplayGuide/GameplayGuide'
import { CharacterBios } from '../CharacterBios/CharacterBios'

describe('Prologue content', () => {
    it('renders the updated background prologue copy', () => {
        const markup = renderToStaticMarkup(<Prologue />)

        expect(markup).toContain('日暮途远，人间何世')
        expect(markup).not.toContain('你将借南梁宗室的名义投身敌国朝堂，去做一枚最危险的暗棋。陈倩求的不是一时偷安，而是十年蓄势，再以江左之力北望中原。')
        expect(markup).not.toContain('十年拆作二十回合')
        expect(markup).not.toContain('半岁一局')
        expect(markup).not.toContain('以身入局')
        expect(markup).toContain('narrative-utility-row')
        expect(markup).toContain('data-auto-scroll-speed="20"')
        expect(markup).toContain('十年之诺')
        expect(markup).toContain('常言，分久必合，合久必分。')
        expect(markup).toContain('你并非常臣子，也不只是寄人篱下的宗室遗孤；你既受陈氏养恩，也自知身上仍背着萧梁旧血。')
        expect(markup).toContain('你必须让自己看起来像个真正的佞臣：攀附权力，周旋贵胄，甚至不惜以姿色换取北周文明太后贺拔琪的信任。')
        expect(markup).toContain('每一回合，他会替你送来女帝来信，也会把你的话带回南陈。')
        expect(markup).toContain('你的任务从来不止一条。')
        expect(markup).toContain('继续')
    })

    it('renders the gameplay guide goals and entry action', () => {
        const markup = renderToStaticMarkup(<GameplayGuide mode="entry" />)

        expect(markup).toContain('玩法总览')
        expect(markup).toContain('每回合流程')
        expect(markup).toContain('查看北周群像')
    })

    it('renders the character bios grouped by factions', () => {
        const markup = renderToStaticMarkup(<CharacterBios />)

        expect(markup).toContain('北周群像')
        expect(markup).toContain('帝党')
        expect(markup).toContain('后党')
        expect(markup).toContain('陇右勋贵')
        expect(markup).toContain('内附草原势力')
        expect(markup).toContain('冯道之')
    })
})
