import { Fragment, type ReactNode } from 'react'

const ARABIC_NUMBER_RUN_PATTERN = /[+-]?(?:(?:\d+(?:\.\d+)?|\.\d+)\/(?:\d+(?:\.\d+)?|\.\d+)|(?:\d+(?:\.\d+)?|\.\d+)(?:[%％])?)/g

export function renderMixedTextWithNumberSpans(text: string): ReactNode {
    const parts: ReactNode[] = []
    let lastIndex = 0

    for (const match of text.matchAll(ARABIC_NUMBER_RUN_PATTERN)) {
        const value = match[0]
        const index = match.index ?? 0

        if (index > lastIndex) {
            parts.push(text.slice(lastIndex, index))
        }

        parts.push(
            <span className="ui-number" key={`number-${index}-${value}`}>
                {value}
            </span>,
        )
        lastIndex = index + value.length
    }

    if (parts.length === 0) return text
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex))
    }

    return <Fragment>{parts}</Fragment>
}
