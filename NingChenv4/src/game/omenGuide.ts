import type { FirstRoundGuideSeenMap, GameDifficulty, OmenGuideSeenMap, SchemeOnboardingSeenMap } from './types'
import { getDifficultyProfile } from './difficulty'

export type OmenGuidePresentation = 'none' | 'modal' | 'inline'

interface OmenGuideContext {
    round: number
    difficulty: GameDifficulty
    firstRoundGuideSeen: FirstRoundGuideSeenMap
    schemeOnboardingSeen: SchemeOnboardingSeenMap
    omenGuideSeen: OmenGuideSeenMap
}

const OMEN_ROUNDS = new Set([13, 14, 19, 20])

export function getOmenGuidePresentation({
    round,
    difficulty,
    firstRoundGuideSeen,
    schemeOnboardingSeen,
    omenGuideSeen,
}: OmenGuideContext): OmenGuidePresentation {
    if (!OMEN_ROUNDS.has(round) || !firstRoundGuideSeen.scheme_phase) {
        return 'none'
    }

    const profile = getDifficultyProfile(difficulty)
    if (
        profile.onboarding.showFullOmenGuide &&
        !schemeOnboardingSeen.first_omen_teaching &&
        !omenGuideSeen.first_omen_modal
    ) {
        return 'modal'
    }

    return 'inline'
}
