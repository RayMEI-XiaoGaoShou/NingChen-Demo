import type { CSSProperties, ReactNode } from 'react'
import './GameViewport.css'

interface GameViewportProps {
    className?: string
    canvasClassName?: string
    bleed?: ReactNode
    overlay?: ReactNode
    children: ReactNode
    style?: CSSProperties
}

function joinClassNames(...classNames: Array<string | undefined>) {
    return classNames.filter(Boolean).join(' ')
}

export function GameViewport({
    className,
    canvasClassName,
    bleed,
    overlay,
    children,
    style,
}: GameViewportProps) {
    return (
        <div className={joinClassNames('game-viewport', className)} style={style}>
            {bleed ? (
                <div className="game-viewport__bleed" aria-hidden="true">
                    {bleed}
                </div>
            ) : null}
            <div className={joinClassNames('game-design-canvas', canvasClassName)}>
                {children}
            </div>
            {overlay ? <div className="game-viewport__overlay">{overlay}</div> : null}
        </div>
    )
}
