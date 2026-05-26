// @ts-expect-error Vitest runs this source contract in Node; the app tsconfig omits Node types.
import { existsSync, readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

function projectUrl(path: string): URL {
    return new URL(`../../${path}`, import.meta.url)
}

function sourceText(path: string): string {
    const url = projectUrl(path)
    return existsSync(url) ? readFileSync(url, 'utf8') : ''
}

describe('empress letter/reply UIUX migration contract', () => {
    it('ships only the finished empress and scene transition art assets', () => {
        const requiredAssets = [
            'public/images/ui/empress-letter/chenqian-letter-foreground-v3.webp',
            'public/images/ui/empress-letter/empress-letter-badge.webp',
            'public/images/ui/empress-letter/empress-letter-bg-v2.webp',
            'public/images/ui/empress-letter/empress-letter-option.webp',
            'public/images/ui/empress-letter/empress-letter-scroll.webp',
            'public/images/ui/empress-letter/empress-letter-south-seal.webp',
            'public/images/ui/empress-letter/empress-letter-submit.webp',
            'public/images/ui/empress-reply/empress-reply-bg.webp',
            'public/images/ui/empress-reply/empress-reply-foreground.webp',
            'public/images/ui/empress-reply/empress-reply-scroll.webp',
            'public/images/ui/scene-transition/scene-cloud-back.webp',
            'public/images/ui/scene-transition/scene-cloud-front.webp',
        ]

        for (const asset of requiredAssets) {
            expect(existsSync(projectUrl(asset)), asset).toBe(true)
        }

        const retiredAssets = [
            'public/images/ui/empress-letter/empress-letter-bg.png',
            'public/images/ui/empress-letter/empress-letter-scroll.png',
            'public/images/ui/empress-letter/chenqian-letter-foreground.png',
            'public/images/ui/empress-letter/empress-letter-submit.png',
            'public/images/ui/empress-reply/empress-reply-bg.png',
            'public/images/ui/empress-reply/empress-reply-foreground.png',
            'public/images/ui/empress-reply/empress-reply-scroll.png',
        ]
        for (const asset of retiredAssets) {
            expect(existsSync(projectUrl(asset)), asset).toBe(false)
        }
    })

    it('wires dev-only empress previews and cloud transitions in App without dropping scheme previews', () => {
        const appSource = sourceText('src/App.tsx')

        expect(appSource).toContain("from './components/SceneTransition/SceneTransition'")
        expect(appSource).toContain("from './dev/empressPreview'")
        expect(appSource).toContain('applyEmpressPreviewFromSearch(window.location.search)')
        expect(appSource).toContain('shouldSkipAutosaveForEmpressPreview(window.location.search, import.meta.env.DEV)')
        expect(appSource).toContain('const empressPreview = isEmpressPreviewSearch(window.location.search)')
        expect(appSource).toContain('const isPreviewRoute = Boolean(schemePreview) || schemeFeedbackPreview || empressPreview')
        expect(appSource).toContain('empressPreviewKey')
        expect(appSource).toContain('<SceneTransitionProvider>')
        expect(appSource).toContain('<SceneTransitionLayer />')
        expect(appSource).toContain('getSchemePreviewRequest')
        expect(appSource).toContain('isSchemeFeedbackPreviewRequest')
    })

    it('moves the final scheme feedback proceed action through the empress-letter transition', () => {
        const schemeFeedbackSource = sourceText('src/components/SchemeFeedback/SchemeFeedback.tsx')

        expect(schemeFeedbackSource).toContain("from '../SceneTransition/SceneTransition'")
        expect(schemeFeedbackSource).toContain('const { runSceneTransition } = useSceneTransition()')
        expect(schemeFeedbackSource).toContain("variant: 'to-empress-letter'")
        expect(schemeFeedbackSource).toContain('onCovered: nextPhase')
        expect(schemeFeedbackSource).toContain("return params.terminalResult ? '查看终局' : '江南来信'")
    })

    it('renders the empress letter page as a layered 16:9 art stage', () => {
        const letterSource = sourceText('src/components/EmpressLetter/EmpressLetter.tsx')
        const letterStyles = sourceText('src/components/EmpressLetter/EmpressLetter.css')

        expect(letterSource).toContain("from '../SceneTransition/SceneTransition'")
        expect(letterSource).toContain("variant: 'from-empress-letter'")
        expect(letterSource).toContain('empress-letter-stage')
        expect(letterSource).toContain('/images/ui/empress-letter/empress-letter-scroll.webp')
        expect(letterSource).toContain('/images/ui/empress-letter/chenqian-letter-foreground-v3.webp')
        expect(letterSource).toContain('/images/ui/empress-letter/empress-letter-south-seal.webp')
        expect(letterSource).toContain('className="empress-letter-submit"')
        expect(letterSource).not.toContain('NpcPortrait')
        expect(letterStyles).toContain('/images/ui/empress-letter/empress-letter-bg-v2.webp')
        expect(letterStyles).toContain('/images/ui/empress-letter/empress-letter-option.webp')
        expect(letterStyles).toContain('/images/ui/empress-letter/empress-letter-submit.webp')
        expect(letterStyles).toContain('aspect-ratio: 16 / 9')
        expect(letterStyles).toContain('container-type: size')
    })

    it('renders the empress reply page with the new lake pavilion scroll composition', () => {
        const replySource = sourceText('src/components/EmpressReply/EmpressReply.tsx')
        const replyStyles = sourceText('src/components/EmpressReply/EmpressReply.css')

        expect(replySource).toContain('generateEmpressReplyRecordForPolicy')
        expect(replySource).toContain('empress-reply-stage')
        expect(replySource).toContain('/images/ui/empress-reply/empress-reply-scroll.webp')
        expect(replySource).toContain('/images/ui/empress-reply/empress-reply-foreground.webp')
        expect(replySource).toContain("variant: 'to-settlement'")
        expect(replySource).toContain('onCovered: nextPhase')
        expect(replySource).toContain('/images/ui/empress-letter/empress-letter-south-seal.webp')
        expect(replySource).toContain('<span className="empress-reply-submit-label">查看本卷结算</span>')
        expect(replySource).toContain('南陈国力变化')
        expect(replySource).not.toContain('NpcPortrait')
        expect(replySource).not.toContain('chatCompletion(')
        expect(replySource).not.toContain('btn-primary btn-next')
        expect(replyStyles).toContain('/images/ui/empress-reply/empress-reply-bg.webp')
        expect(replyStyles).toContain('--empress-kaiti-font: var(--font-calligraphy);')
        expect(replyStyles).toContain('/images/ui/empress-letter/empress-letter-submit.webp')
        expect(replyStyles).toContain('aspect-ratio: 16 / 9')
        expect(replyStyles).toContain('container-type: size')
    })

    it('provides deterministic direct preview state for letter and reply routes', () => {
        const previewSource = sourceText('src/dev/empressPreview.ts')

        expect(previewSource).toContain('parseEmpressPreviewSearch')
        expect(previewSource).toContain('applyEmpressPreviewFromSearch')
        expect(previewSource).toContain('shouldSkipAutosaveForEmpressPreview')
        expect(previewSource).toContain("normalized === 'empress-letter'")
        expect(previewSource).toContain("normalized === 'empress-reply'")
        expect(previewSource).toContain("currentPhase: 'EMPRESS_LETTER'")
        expect(previewSource).toContain("currentPhase: 'EMPRESS_REPLY'")
        expect(previewSource).toContain('settleRound({')
    })
})
