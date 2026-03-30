import { useMemo, useState } from 'react'
import { getNpcPortraitPath } from '../../data/mediaAssets'

interface NpcPortraitProps {
    name: string
    className?: string
    alt?: string
}

export function NpcPortrait({ name, className = '', alt }: NpcPortraitProps) {
    const [failed, setFailed] = useState(false)
    const src = useMemo(() => getNpcPortraitPath(name), [name])

    if (!src || failed) {
        return (
            <div className={`${className} npc-portrait-fallback`}>
                {name.charAt(0)}
            </div>
        )
    }

    return (
        <img
            src={src}
            alt={alt ?? `${name}画像`}
            className={`${className} npc-portrait-image`}
            onError={() => setFailed(true)}
        />
    )
}
