import { describe, expect, it } from 'vitest'
import schemeFeedbackSource from './SchemeFeedback.tsx?raw'

describe('SchemeFeedback follow-up contract', () => {
    it('uses the updated follow-up response label', () => {
        expect(schemeFeedbackSource).toContain('追问回应')
        expect(schemeFeedbackSource).not.toContain('追问回批')
    })
})
