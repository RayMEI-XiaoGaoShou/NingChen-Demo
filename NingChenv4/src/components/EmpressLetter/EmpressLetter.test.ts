import { describe, expect, it } from 'vitest'
import empressLetterSource from './EmpressLetter.tsx?raw'

describe('EmpressLetter layout copy', () => {
    it('removes redundant labels and uses Chinese option indexes', () => {
        expect(empressLetterSource).not.toContain('<span className="page-eyebrow">女帝问政</span>')
        expect(empressLetterSource).not.toContain('<p className="topic-chip">问政母题 · {policyQ.topic}</p>')
        expect(empressLetterSource).toContain("const optionIndexLabels = ['甲', '乙', '丙', '丁']")
        expect(empressLetterSource).toContain('{optionIndexLabels[i] ?? opt.label}')
        expect(empressLetterSource).toContain('className="question-background question-background-prominent"')
        expect(empressLetterSource).toContain('chenqian-letter-foreground-v3.webp')
        expect(empressLetterSource).toContain('empress-letter-chenqian')
        expect(empressLetterSource).not.toContain('letter-empress-portrait-wrap')
    })
    it('skips policy reason parsing when the player leaves the note blank', () => {
        expect(empressLetterSource).toContain('const trimmedReason = reason.trim()')
        expect(empressLetterSource).toContain('trimmedReason ? await parsePolicyReasonInput')
        expect(empressLetterSource).toContain('selectPolicy(selected, trimmedReason, policyParse)')
    })
    it('routes the first-round guide through the Feng Daozhi dialogue overlay', () => {
        expect(empressLetterSource).toContain("import { buildFirstRoundGuideSequence } from '../../game/fengDaozhiGuide'")
        expect(empressLetterSource).toContain("import { FengDaozhiDialogueOverlay } from '../FengDaozhiDialogue/FengDaozhiDialogueOverlay'")
        expect(empressLetterSource).toContain('<FengDaozhiDialogueOverlay')
        expect(empressLetterSource).toContain("sequences={[buildFirstRoundGuideSequence('empress_letter')]}")
        expect(empressLetterSource).toContain("onComplete={() => markFirstRoundGuideSeen('empress_letter')}")
        expect(empressLetterSource).not.toContain('dialogue-skip')
        expect(empressLetterSource).not.toContain('handleSkip')
        expect(empressLetterSource).not.toContain("import { FirstRoundGuideModal } from '../FirstRoundGuide/FirstRoundGuideModal'")
        expect(empressLetterSource).not.toContain('<FirstRoundGuideModal')
    })
})
