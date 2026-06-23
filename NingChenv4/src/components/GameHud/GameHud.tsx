import { useGameStore } from '../../stores/gameStore'
import { useMediaStore } from '../../stores/mediaStore'
import { renderMixedTextWithNumberSpans } from '../../utils/renderMixedText'
import './GameHud.css'

const hudIcons = {
    soundOn: new URL('../../assets/ui/hud/hud-sound-on.webp', import.meta.url).href,
    soundOff: new URL('../../assets/ui/hud/hud-sound-off.webp', import.meta.url).href,
    help: new URL('../../assets/ui/hud/hud-help.webp', import.meta.url).href,
    save: new URL('../../assets/ui/hud/hud-save.webp', import.meta.url).href,
    menu: new URL('../../assets/ui/hud/hud-menu.webp', import.meta.url).href,
}

interface GameHudIconButtonProps {
    label: string
    iconSrc: string
    onClick: () => void
    className?: string
    pressed?: boolean
}

export function GameHudIconButton({
    label,
    iconSrc,
    onClick,
    className = '',
    pressed,
}: GameHudIconButtonProps) {
    return (
        <button
            type="button"
            className={`game-hud-icon-button ${className}`.trim()}
            onClick={onClick}
            title={label}
            aria-label={label}
            aria-pressed={pressed}
        >
            <img className="game-hud-icon-image" src={iconSrc} alt="" draggable={false} />
            <span className="game-hud-visually-hidden">{label}</span>
        </button>
    )
}

interface GameHudToolsProps {
    className?: string
    onOpenGuide?: () => void
}

export function GameHudTools({ className = '', onOpenGuide }: GameHudToolsProps) {
    const saveToSlot = useGameStore(state => state.saveToSlot)
    const returnToCover = useGameStore(state => state.returnToCover)
    const { isMuted, audioReady, setMuted, requestPlayback } = useMediaStore()
    const soundLabel = isMuted ? '开声' : '静音'
    const soundIcon = isMuted ? hudIcons.soundOff : hudIcons.soundOn

    return (
        <div className={`game-hud-tools ${className}`.trim()} aria-label="游戏工具">
            <GameHudIconButton
                label={soundLabel}
                iconSrc={soundIcon}
                className="page-audio-btn"
                pressed={!isMuted}
                onClick={() => {
                    if (isMuted || !audioReady) {
                        setMuted(false)
                        requestPlayback()
                        return
                    }

                    setMuted(true)
                }}
            />
            {onOpenGuide && (
                <GameHudIconButton label="信息摘要" iconSrc={hudIcons.help} onClick={onOpenGuide} />
            )}
            <GameHudIconButton label="存档" iconSrc={hudIcons.save} onClick={() => saveToSlot()} />
            <GameHudIconButton label="回到菜单" iconSrc={hudIcons.menu} onClick={returnToCover} />
        </div>
    )
}

interface HudStatusChipProps {
    label: string
    value: string
    valueClassName?: string
    title?: string
}

export function HudStatusChip({ label, value, valueClassName = '', title }: HudStatusChipProps) {
    return (
        <span className="game-hud-status-chip" title={title} aria-label={title ?? `${label}${value}`}>
            <span className="game-hud-status-label">{label}</span>
            <strong className={`game-hud-status-value ${valueClassName}`.trim()}>
                {renderMixedTextWithNumberSpans(value)}
            </strong>
        </span>
    )
}
