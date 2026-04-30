import { describe, expect, it } from 'vitest'
import { buildEmpressFeedbackContext } from './empressFeedbackContext'
import type { NationDimensions, PolicyReasonParseResult } from './types'

const SOUTH_STATS: NationDimensions = {
    finance: 62,
    grain: 58,
    military: 49,
    socialOrder: 64,
    governance: 67,
}

const POLICY_PARSE: PolicyReasonParseResult = {
    focusAlignment: 0.82,
    executionClarity: 0.76,
    costAwareness: 0.68,
    legitimacyAlignment: 0.72,
    policyStance: 'balanced',
    evidence: ['先稳粮道，再行军令'],
}

describe('buildEmpressFeedbackContext', () => {
    it('derives a military war-window context from battle-facing questions', () => {
        const context = buildEmpressFeedbackContext({
            currentRound: 16,
            policyReport: {
                sourceRound: 16,
                topic: '淮南战焦策略',
                question: '江北将战，南陈该先稳粮道还是先压边镇？',
                optionLabel: 'B',
                optionContent: '先整军令，再催粮道',
                reason: '先把节度和军令统一，前线才不会各唱各的调。',
                effects: { military: 1.2, governance: 0.6 },
                effectSummary: '军事与治理先有起色。',
                legitimacyTone: 'steady',
                focusMatched: true,
                scoringFocus: '看是否切中战时节奏与执行链条',
            },
            policyAftereffect: {
                sourceRound: 16,
                topic: '淮南战焦策略',
                summary: '前线军令会继续吃到一点后效。',
                effects: { military: 0.6 },
                legitimacyTone: 'steady',
                focusMatched: true,
            },
            policyParse: POLICY_PARSE,
            southStatsAfter: SOUTH_STATS,
            northEventName: '淮南兵马将动',
            northEventBriefing: '北周正围绕江北军令与后勤谁先谁后争论不休。',
            northSummary: '北方兵锋已近，粮道与边镇都在压缩决断时辰。',
            invasionSummary: '南征风向渐紧',
            playerDangerStage: 'under_watch',
        })

        expect(context.policyDomain).toBe('military')
        expect(context.warWindow).toBe(true)
        expect(context.weakestDimension).toBe('military')
        expect(context.reasonQuality).toBe('high')
        expect(context.northMirrorSummary).toContain('淮南兵马将动')
        expect(context.playerPositionSummary).toContain('书信')
        expect(context.concernTitle).toBe('淮南军书')
        expect(context.concernOpening).toContain('淮南军书')
        expect(context.playerConcernOverlay).toContain('书信')
        expect(context.policyImplementationHint).toContain('粮道')
    })

    it('falls back to governance when no parse is available and no positive dimension dominates', () => {
        const context = buildEmpressFeedbackContext({
            currentRound: 3,
            policyReport: {
                sourceRound: 3,
                topic: '新君初政',
                question: '新朝百废待举，应先从何处立规矩？',
                optionLabel: 'A',
                optionContent: '先清点户籍仓廪',
                reason: '先摸清底账，后面才知道什么事该急什么事该缓。',
                effects: {},
                effectSummary: '朝廷先从底账着手。',
                legitimacyTone: 'up',
                focusMatched: false,
                scoringFocus: '看是否兼顾秩序与执行',
            },
            southStatsAfter: SOUTH_STATS,
            northEventName: '朝堂重提南征',
            northEventBriefing: '北周内部对是否立刻南下仍争执不下。',
            northSummary: '北方议论尚热。',
            invasionSummary: '南征风向仍待观察',
            playerDangerStage: 'safe',
        })

        expect(context.policyDomain).toBe('governance')
        expect(context.reasonQuality).toBe('low')
        expect(context.policyParseSummary).toContain('附言结构')
        expect(context.concernTitle).toBe('灾年粮价')
        expect(context.policyImplementationHint).toContain('度支')
    })

    it('adds south intel world memory as northbound news', () => {
        const context = buildEmpressFeedbackContext({
            currentRound: 8,
            policyReport: {
                sourceRound: 8,
                topic: '江北粮道',
                question: '江北粮道当如何筹措？',
                optionLabel: 'A',
                optionContent: '先核仓籍',
                reason: '先稳住粮簿。',
                effects: { grain: 1 },
                effectSummary: '粮赋略稳。',
                legitimacyTone: 'steady',
                focusMatched: true,
            },
            southStatsAfter: SOUTH_STATS,
            northEventName: '仓簿案起',
            northEventBriefing: '北周朝堂正在核粮。',
            northSummary: '北方粮簿一时不稳。',
            worldIntelSummary: '祖珽前曾押下仓簿，后党由此多疑。',
            invasionSummary: '南征风向仍待观察',
            playerDangerStage: 'safe',
        })

        expect(context.worldIntelSummary).toBe('祖珽前曾押下仓簿，后党由此多疑。')
        expect(context.northMirrorSummary).toContain('北来消息：祖珽前曾押下仓簿，后党由此多疑。')
    })

    it('removes intimate address from high-risk empress concern openings', () => {
        const context = buildEmpressFeedbackContext({
            currentRound: 20,
            policyReport: {
                sourceRound: 20,
                topic: '北伐总策',
                question: '若大军北向，当总动员、稳守经营、行险求胜，还是以势迫和？',
                optionLabel: 'A',
                optionContent: '北伐总动员',
                reason: '先定粮道与民役，再以军令分层推进。',
                effects: { military: 2 },
                effectSummary: '军事动员见效。',
                legitimacyTone: 'steady',
                focusMatched: true,
                scoringFocus: '是否根据当前国力差距作出合理北伐判断',
            },
            southStatsAfter: SOUTH_STATS,
            northEventName: '北伐总策',
            northEventBriefing: '南北战事压力渐重。',
            northSummary: '北方朝局仍在绷紧。',
            invasionSummary: '南征风向渐紧',
            playerDangerStage: 'under_review',
        })

        expect(context.concernOpening).not.toContain('阿颖')
        expect(context.concernOpening).not.toContain('宝颖')
        expect(context.playerConcernOverlay).toContain('不用“阿颖”')
    })
})
