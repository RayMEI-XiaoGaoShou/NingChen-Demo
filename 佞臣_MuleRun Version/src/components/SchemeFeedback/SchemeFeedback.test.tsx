import { describe, expect, it } from 'vitest'
import { shouldQueueRecoveryParse } from './SchemeFeedback'

describe('shouldQueueRecoveryParse', () => {
    it('does not queue a recovery parse while feedback cards are still being rebuilt', () => {
        expect(
            shouldQueueRecoveryParse({
                actionId: 'scheme-1',
                hasNorthParse: false,
                pendingStructuredSchemeIds: [],
                npcFeedbackCount: 0,
            }),
        ).toBe(false)
    })

    it('queues a recovery parse after feedback cards exist and the action is still missing structure', () => {
        expect(
            shouldQueueRecoveryParse({
                actionId: 'scheme-1',
                hasNorthParse: false,
                pendingStructuredSchemeIds: [],
                npcFeedbackCount: 2,
            }),
        ).toBe(true)
    })

    it('does not queue when the action is already pending or already parsed', () => {
        expect(
            shouldQueueRecoveryParse({
                actionId: 'scheme-1',
                hasNorthParse: false,
                pendingStructuredSchemeIds: ['scheme-1'],
                npcFeedbackCount: 2,
            }),
        ).toBe(false)

        expect(
            shouldQueueRecoveryParse({
                actionId: 'scheme-1',
                hasNorthParse: true,
                pendingStructuredSchemeIds: [],
                npcFeedbackCount: 2,
            }),
        ).toBe(false)
    })
})
