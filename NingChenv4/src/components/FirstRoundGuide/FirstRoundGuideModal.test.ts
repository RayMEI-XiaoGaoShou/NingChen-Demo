import { describe, expect, it } from 'vitest'
import courtViewSource from '../CourtView/CourtView.tsx?raw'
import empressLetterSource from '../EmpressLetter/EmpressLetter.tsx?raw'
import empressReplySource from '../EmpressReply/EmpressReply.tsx?raw'
import roundStartSource from '../RoundStart/RoundStart.tsx?raw'
import schemeFeedbackSource from '../SchemeFeedback/SchemeFeedback.tsx?raw'
import modalSource from './FirstRoundGuideModal.tsx?raw'

describe('FirstRoundGuideModal overlay placement', () => {
    it('renders the guide overlay through the document body portal', () => {
        expect(modalSource).toContain('createPortal(')
        expect(modalSource).toContain('document.body')
        expect(modalSource).toContain("typeof document === 'undefined'")
    })

    it('uses the streamlined header without eyebrow or lead copy', () => {
        expect(modalSource).not.toContain('page-eyebrow')
        expect(modalSource).not.toContain('first-round-guide-lead')
        expect(modalSource).toContain('first-round-guide-header')
    })

    it('is retained as legacy code but no active first-round page imports it', () => {
        const activeFirstRoundPageSources = [
            roundStartSource,
            courtViewSource,
            empressLetterSource,
            empressReplySource,
            schemeFeedbackSource,
        ]

        for (const source of activeFirstRoundPageSources) {
            expect(source).not.toContain('FirstRoundGuideModal')
            expect(source).toContain('FengDaozhiDialogueOverlay')
        }
    })
})
