import { GameHudTools } from '../GameHud/GameHud'

interface PageUtilityActionsProps {
    onOpenGuide?: () => void
}

export function PageUtilityActions({ onOpenGuide }: PageUtilityActionsProps) {
    return <GameHudTools className="page-utility-actions" onOpenGuide={onOpenGuide} />
}
