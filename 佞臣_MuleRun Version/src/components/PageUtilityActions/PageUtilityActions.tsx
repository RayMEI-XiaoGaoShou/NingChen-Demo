import { useGameStore } from '../../stores/gameStore'
import { useMediaStore } from '../../stores/mediaStore'

interface PageUtilityActionsProps {
    onOpenGuide?: () => void
}

export function PageUtilityActions({ onOpenGuide }: PageUtilityActionsProps) {
    const saveToSlot = useGameStore(state => state.saveToSlot)
    const returnToCover = useGameStore(state => state.returnToCover)
    const { isMuted, audioReady, setMuted, requestPlayback } = useMediaStore()

    return (
        <div className="page-utility-actions">
            <button
                className="btn-utility-secondary page-audio-btn"
                onClick={() => {
                    if (isMuted || !audioReady) {
                        setMuted(false)
                        requestPlayback()
                        return
                    }

                    setMuted(true)
                }}
            >
                {isMuted ? '开声' : '静音'}
            </button>
            {onOpenGuide && (
                <button className="btn-help" onClick={onOpenGuide}>
                    玩法说明
                </button>
            )}
            <button className="btn-utility-secondary" onClick={() => saveToSlot()}>
                存档
            </button>
            <button className="btn-utility-secondary" onClick={returnToCover}>
                回到菜单
            </button>
        </div>
    )
}
