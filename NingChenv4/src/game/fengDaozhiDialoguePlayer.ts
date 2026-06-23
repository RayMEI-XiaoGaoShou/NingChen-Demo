import type { FengDaozhiDialogueLine } from './fengDaozhiGuide'

export interface DialoguePlayerState {
    lineIndex: number
    visibleCharacters: number
    done: boolean
    reducedMotion: boolean
}

export type DialoguePlayerAction = 'tick' | 'advance' | 'skip'

export function createInitialDialoguePlayerState(
    lines: Pick<FengDaozhiDialogueLine, 'text'>[],
    reducedMotion: boolean,
): DialoguePlayerState {
    const currentLine = lines[0]

    return {
        lineIndex: 0,
        visibleCharacters: currentLine && reducedMotion ? currentLine.text.length : 0,
        done: lines.length === 0,
        reducedMotion,
    }
}

export function getVisibleDialogueText(
    lines: Pick<FengDaozhiDialogueLine, 'text'>[],
    state: DialoguePlayerState,
): string {
    const currentLine = lines[state.lineIndex]
    if (!currentLine) return ''

    return currentLine.text.slice(0, Math.max(0, state.visibleCharacters))
}

export function stepDialoguePlayer(
    lines: Pick<FengDaozhiDialogueLine, 'text'>[],
    state: DialoguePlayerState,
    action: DialoguePlayerAction,
    tickSize = 1,
): DialoguePlayerState {
    if (state.done) return state

    if (action === 'skip') {
        return {
            ...state,
            done: true,
        }
    }

    const currentLine = lines[state.lineIndex]
    if (!currentLine) {
        return {
            ...state,
            done: true,
        }
    }

    const currentLineLength = currentLine.text.length

    if (action === 'tick') {
        return {
            ...state,
            visibleCharacters: Math.min(
                currentLineLength,
                Math.max(0, state.visibleCharacters) + Math.max(1, tickSize),
            ),
        }
    }

    if (state.visibleCharacters < currentLineLength) {
        return {
            ...state,
            visibleCharacters: currentLineLength,
        }
    }

    const nextLineIndex = state.lineIndex + 1
    const nextLine = lines[nextLineIndex]
    if (!nextLine) {
        return {
            ...state,
            visibleCharacters: currentLineLength,
            done: true,
        }
    }

    return {
        ...state,
        lineIndex: nextLineIndex,
        visibleCharacters: state.reducedMotion ? nextLine.text.length : 0,
    }
}
