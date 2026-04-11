import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { FengDaozhiAssistPanel } from './FengDaozhiAssistPanel'

describe('FengDaozhiAssistPanel', () => {
    it('shows remaining uses and draft preview', () => {
        const html = renderToStaticMarkup(
            <FengDaozhiAssistPanel
                schemeType="advise"
                remaining={2}
                isLoading={false}
                draftPreview={{
                    primaryText: '先顺着他最在意的体面去写，再把中枢节次悄悄往别处引。',
                    source: 'ai',
                }}
                onDraft={vi.fn()}
            />,
        )

        expect(html).toContain('让冯道之帮你谋划')
        expect(html).toContain('本回合剩余 2 次')
        expect(html).toContain('冯道之密札')
        expect(html).toContain('AI 代拟')
    })

    it('renders omen dual-step preview when scheme is omen', () => {
        const html = renderToStaticMarkup(
            <FengDaozhiAssistPanel
                schemeType="omen"
                remaining={1}
                isLoading={false}
                draftPreview={{
                    primaryText: '石人一只眼，挑动黄河天下反。',
                    secondaryText: '此非独天灾，恐是朝中名分失序之兆。',
                    source: 'fallback',
                }}
                onDraft={vi.fn()}
            />,
        )

        expect(html).toContain('石人一只眼，挑动黄河天下反。')
        expect(html).toContain('此非独天灾，恐是朝中名分失序之兆。')
        expect(html).toContain('本地兜底')
    })
})
