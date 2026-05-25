import { describe, expect, it, vi } from 'vitest'
import { generateEmpressReplyRecordForPolicy } from './empressReplyOrchestrator'
import type { PolicySettlementReport } from '../game/roundSettlement'
import type { WorldMemoryLedger } from '../game/types'

function makePolicyReport(overrides: Partial<PolicySettlementReport> = {}): PolicySettlementReport {
    return {
        sourceRound: 3,
        topic: '南陈问政',
        question: '江南仓储当如何整顿？',
        optionLabel: 'A',
        optionContent: '清点户籍仓廪',
        reason: '先核仓册，再定州县转运。',
        effects: { grain: 1, governance: 1 },
        effectSummary: '南陈粮赋与治理略有起色。',
        legitimacyTone: 'steady',
        focusMatched: true,
        scoringFocus: '是否兼顾仓储与州县执行',
        policyParse: {
            focusAlignment: 0.8,
            executionClarity: 0.8,
            costAwareness: 0.7,
            legitimacyAlignment: 0.7,
            policyStance: 'balanced',
            evidence: ['先核仓册'],
        },
        ...overrides,
    }
}

describe('generateEmpressReplyRecordForPolicy', () => {
    it('generates an ai reply from policy context without current scheme material', async () => {
        const chatCompletionImpl = vi.fn().mockResolvedValue('朕已阅。先核仓册，再定转运。')
        const currentRoundMemory: WorldMemoryLedger[number] = {
            id: 'current-round-secret',
            sourceRound: 3,
            sourceActionId: 'scheme-current',
            scope: 'south_intel',
            visibility: 'secret',
            involvedNpcIds: ['zuting'],
            affectedFactionIds: [],
            dimensions: ['grain'],
            schemeType: 'slander',
            summary: 'CURRENT_SCHEME_SENTINEL should not reach empress reply.',
            reliability: 0.8,
            secrecyRisk: 0.2,
            tags: ['south_intel'],
        }
        const oldMemory: WorldMemoryLedger[number] = {
            ...currentRoundMemory,
            id: 'old-secret',
            sourceRound: 2,
            sourceActionId: 'scheme-old',
            summary: 'OLD_SOUTH_INTEL_SENTINEL may reach empress reply.',
        }

        const record = await generateEmpressReplyRecordForPolicy({
            currentRound: 3,
            policyReport: makePolicyReport(),
            policyAftereffect: null,
            southStatsAfter: {
                finance: 60,
                grain: 61,
                military: 55,
                socialOrder: 58,
                governance: 62,
            },
            playerDangerStage: 'safe',
            invasionSummary: '南征风向仍待观察',
            worldMemoryLedger: [currentRoundMemory, oldMemory],
            roundEvent: {
                eventName: 'ROUND_EVENT_SENTINEL',
                eventBriefing: 'STATIC_ROUND_BRIEFING_SENTINEL',
            },
            chatCompletionImpl,
        })

        expect(record).toEqual({
            sourceRound: 3,
            text: '朕已阅。先核仓册，再定转运。',
            mode: 'ai',
        })
        const promptText = chatCompletionImpl.mock.calls[0]?.[0].map((message: { content: string }) => message.content).join('\n') ?? ''
        expect(promptText).toContain('OLD_SOUTH_INTEL_SENTINEL')
        expect(promptText.match(/STATIC_ROUND_BRIEFING_SENTINEL/g)?.length).toBe(1)
        expect(promptText).not.toContain('CURRENT_SCHEME_SENTINEL')
        expect(promptText).not.toContain('npcAction')
        expect(promptText).not.toContain('schemeResults')
    })

    it('uses the default short reply without calling ai when the player wrote no policy reason', async () => {
        const chatCompletionImpl = vi.fn()

        const record = await generateEmpressReplyRecordForPolicy({
            currentRound: 4,
            policyReport: makePolicyReport({ sourceRound: 4, reason: '' }),
            policyAftereffect: null,
            southStatsAfter: {
                finance: 60,
                grain: 61,
                military: 55,
                socialOrder: 58,
                governance: 62,
            },
            playerDangerStage: 'safe',
            invasionSummary: '南征风向仍待观察',
            worldMemoryLedger: [],
            roundEvent: {
                eventName: 'ROUND_EVENT_SENTINEL',
                eventBriefing: 'STATIC_ROUND_BRIEFING_SENTINEL',
            },
            chatCompletionImpl,
        })

        expect(record?.sourceRound).toBe(4)
        expect(record?.mode).toBe('default')
        expect(chatCompletionImpl).not.toHaveBeenCalled()
    })
})
