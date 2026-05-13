import { describe, expect, it } from 'vitest'
import empressLetterSource from './EmpressLetter.tsx?raw'

describe('EmpressLetter layout copy', () => {
    it('removes redundant labels and uses Chinese option indexes', () => {
        expect(empressLetterSource).not.toContain('<span className="page-eyebrow">女帝问政</span>')
        expect(empressLetterSource).not.toContain('<p className="topic-chip">问政母题 · {policyQ.topic}</p>')
        expect(empressLetterSource).toContain("const optionIndexLabels = ['甲', '乙', '丙', '丁']")
        expect(empressLetterSource).toContain('{optionIndexLabels[i] ?? opt.label}')
        expect(empressLetterSource).toContain('className="question-background question-background-prominent"')
        expect(empressLetterSource).toContain('<NpcPortrait')
        expect(empressLetterSource).toContain('name="陈倩"')
        expect(empressLetterSource).toContain('letter-empress-portrait-float')
        expect(empressLetterSource).not.toContain('letter-empress-portrait-wrap')
    })
    it('skips policy reason parsing when the player leaves the note blank', () => {
        expect(empressLetterSource).toContain('const trimmedReason = reason.trim()')
        expect(empressLetterSource).toContain('trimmedReason ? await parsePolicyReasonInput')
        expect(empressLetterSource).toContain('selectPolicy(selected, trimmedReason, policyParse)')
    })
})
