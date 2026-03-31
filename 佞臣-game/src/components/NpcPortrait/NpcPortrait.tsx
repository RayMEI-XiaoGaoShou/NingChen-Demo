import type { CSSProperties } from 'react'
import { useMemo, useState } from 'react'
import { getNpcPortraitPath } from '../../data/mediaAssets'

interface NpcPortraitProps {
    name: string
    className?: string
    alt?: string
    positionY?: string
    zoom?: number
    framed?: boolean
}

export function NpcPortrait({
    name,
    className = '',
    alt,
    positionY,
    zoom,
    framed = false,
}: NpcPortraitProps) {
    const [failed, setFailed] = useState(false)
    const src = useMemo(() => getNpcPortraitPath(name), [name])
    const portraitStyle = {
        '--npc-portrait-position-y': positionY ?? '50%',
        '--npc-portrait-scale': String(zoom ?? 1),
    } as CSSProperties

    if (!src || failed) {
        return (
            <div className={`${className} npc-portrait-fallback`}>
                {name.charAt(0)}
            </div>
        )
    }

    if (framed) {
        return (
            <span className={`${className} npc-portrait-shell`} style={portraitStyle}>
                <img
                    src={src}
                    alt={alt ?? `${name}画像`}
                    className="npc-portrait-image"
                    onError={() => setFailed(true)}
                />
            </span>
        )
    }

    return (
        <img
            src={src}
            alt={alt ?? `${name}画像`}
            className={`${className} npc-portrait-image`}
            style={portraitStyle}
            onError={() => setFailed(true)}
        />
    )
}
