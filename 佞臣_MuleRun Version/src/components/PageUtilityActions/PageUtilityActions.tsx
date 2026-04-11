import { useGameStore } from '../../stores/gameStore'

interface PageUtilityActionsProps {
    onOpenGuide?: () => void
}

export function PageUtilityActions({ onOpenGuide }: PageUtilityActionsProps) {
    const saveToSlot = useGameStore(state => state.saveToSlot)
    const returnToCover = useGameStore(state => state.returnToCover)

    return (
        <div className="page-utility-actions">
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
