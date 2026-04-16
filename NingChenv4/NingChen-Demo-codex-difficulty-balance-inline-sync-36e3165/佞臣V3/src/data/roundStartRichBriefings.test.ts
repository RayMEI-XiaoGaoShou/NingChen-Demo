import { describe, expect, it } from 'vitest'
import { ROUND_EVENTS } from './rounds'
import { ROUND_START_RICH_BRIEFINGS } from './roundStartRichBriefings'

describe('round start briefing copy', () => {
    it('uses the refined round start briefing copy for the final round', () => {
        expect(ROUND_EVENTS[19]?.eventName).toBe('终章：千古兴亡多少事，悠悠，不尽长江滚滚流')
        expect(ROUND_START_RICH_BRIEFINGS[20]).toContain('关中寒意透骨')
        expect(ROUND_START_RICH_BRIEFINGS[20]).toContain('这最后的落子，将决定江南究竟是止步于偏安，还是真正去叩问天命。')
    })
})
