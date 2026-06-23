import type { ReactElement, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { FengDaozhiAssistPanel } from './FengDaozhiAssistPanel'

interface TestElementProps {
    className?: string
    children?: ReactNode
    disabled?: boolean
    onClick?: () => void
}

function findByClass(node: ReactNode, className: string): ReactElement<TestElementProps> | null {
    if (!node || typeof node !== 'object') return null
    const element = node as ReactElement<TestElementProps>
    if (typeof element.type === 'function') {
        return findByClass((element.type as (props: TestElementProps) => ReactNode)(element.props), className)
    }

    const elementClass = typeof element.props?.className === 'string' ? element.props.className : ''
    if (elementClass.split(/\s+/).includes(className)) return element

    const children = element.props?.children
    const childList = Array.isArray(children) ? children : [children]
    for (const child of childList) {
        const match = findByClass(child, className)
        if (match) return match
    }

    return null
}

describe('FengDaozhiAssistPanel', () => {
    it('uses the scheme WebP portrait asset, assist counter, and draft preview', () => {
        const html = renderToStaticMarkup(
            <FengDaozhiAssistPanel
                schemeType="advise"
                remaining={2}
                total={3}
                isLoading={false}
                draftPreview={{
                    primaryText: '先顺着他最在意的体面去写。',
                    source: 'ai',
                }}
                onDraft={vi.fn()}
            />,
        )

        expect(html).toContain('feng-assist-panel')
        expect(html).toContain('feng-assist-trigger')
        expect(html).toContain('feng-assist-portrait')
        expect(html).toContain('/images/npc/scheme/fengdaozhi-assist-0.webp')
        expect(html).toContain('feng-assist-count')
        expect(html).toContain('2/3')
        expect(html).toContain('feng-assist-hover-note')
        expect(html).toContain('冯道之只据你眼下已知的人物、时局与暗线落笔')
        expect(html).toContain('feng-assist-preview')
        expect(html).toContain('AI')
    })

    it('keeps the portrait action wired to the existing draft callback', () => {
        const onDraft = vi.fn()
        const element = (
            <FengDaozhiAssistPanel
                schemeType="advise"
                remaining={1}
                total={2}
                isLoading={false}
                draftPreview={null}
                onDraft={onDraft}
            />
        )
        const trigger = findByClass(element, 'feng-assist-trigger')

        expect(trigger?.props.disabled).toBe(false)
        trigger?.props.onClick?.()

        expect(onDraft).toHaveBeenCalledTimes(1)
    })

    it('disables the portrait action while loading or out of uses', () => {
        const loadingElement = (
            <FengDaozhiAssistPanel
                schemeType="advise"
                remaining={1}
                total={2}
                isLoading
                draftPreview={null}
                onDraft={vi.fn()}
            />
        )
        const emptyElement = (
            <FengDaozhiAssistPanel
                schemeType="advise"
                remaining={0}
                total={2}
                isLoading={false}
                draftPreview={null}
                onDraft={vi.fn()}
            />
        )

        expect(findByClass(loadingElement, 'feng-assist-trigger')?.props.disabled).toBe(true)
        expect(findByClass(emptyElement, 'feng-assist-trigger')?.props.disabled).toBe(true)
    })

    it('renders omen dual-step preview when scheme is omen', () => {
        const html = renderToStaticMarkup(
            <FengDaozhiAssistPanel
                schemeType="omen"
                remaining={1}
                total={2}
                isLoading={false}
                draftPreview={{
                    primaryText: '石人一只眼。',
                    secondaryText: '此非独天灾，恐是朝中名分失序之兆。',
                    source: 'fallback',
                }}
                onDraft={vi.fn()}
            />,
        )

        expect(html).toContain('石人一只眼')
        expect(html).toContain('朝中名分失序')
        expect(html).toContain('fallback')
    })

    it('can suppress the draft preview while keeping the portrait action', () => {
        const html = renderToStaticMarkup(
            <FengDaozhiAssistPanel
                schemeType="advise"
                remaining={1}
                total={3}
                isLoading={false}
                showPreview={false}
                draftPreview={{
                    primaryText: 'draft should go straight into the textarea',
                    source: 'ai',
                }}
                onDraft={vi.fn()}
            />,
        )

        expect(html).toContain('feng-assist-trigger')
        expect(html).toContain('1/3')
        expect(html).not.toContain('feng-assist-preview')
        expect(html).not.toContain('draft should go straight into the textarea')
    })
})
