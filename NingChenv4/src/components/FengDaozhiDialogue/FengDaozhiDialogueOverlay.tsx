import './FengDaozhiDialogueOverlay.css'
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { getFengDaozhiFirstRoundGuideVoicePath, SCHEME_UI_ASSETS } from '../../data/mediaAssets'
import {
    createInitialDialoguePlayerState,
    getVisibleDialogueText,
    stepDialoguePlayer,
    type DialoguePlayerState,
} from '../../game/fengDaozhiDialoguePlayer'
import type { FengDaozhiDialogueSequence } from '../../game/fengDaozhiGuide'
import { useMediaStore } from '../../stores/mediaStore'

export interface FengDaozhiDialogueOverlayProps {
    sequences: FengDaozhiDialogueSequence[]
    isPlaybackBlocked?: boolean
    onSequenceComplete: (sequence: FengDaozhiDialogueSequence) => void
    onComplete: () => void
}

interface OverlayPlayerState {
    sequenceId: string
    state: DialoguePlayerState
}

const TYPEWRITER_INTERVAL_MS = 28
const ADVANCE_KEY_INTERACTIVE_TARGET_SELECTOR = [
    'button',
    'a',
    'input',
    'select',
    'textarea',
    '[role="button"]',
    '[role="link"]',
    '[contenteditable="true"]',
].join(', ')

interface FengDaozhiDialogueKeydownEvent {
    key: string
    target: unknown
}

function hasClosestSelector(target: unknown): target is { closest: (selector: string) => unknown } {
    return Boolean(target && typeof (target as { closest?: unknown }).closest === 'function')
}

export function shouldAdvanceFengDaozhiDialogueFromKeydown(event: FengDaozhiDialogueKeydownEvent): boolean {
    const isAdvanceKey = event.key === 'Enter' || event.key === ' '
    if (!isAdvanceKey) return false
    if (!hasClosestSelector(event.target)) return true

    return !event.target.closest(ADVANCE_KEY_INTERACTIVE_TARGET_SELECTOR)
}

export function shouldTrapFengDaozhiDialogueFocus(event: FengDaozhiDialogueKeydownEvent): boolean {
    return event.key === 'Tab'
}

function getSequenceId(sequence: FengDaozhiDialogueSequence, index: number): string {
    return `${index}:${sequence.key}:v${sequence.version}`
}

function createOverlayPlayerState(
    sequence: FengDaozhiDialogueSequence,
    index: number,
    reducedMotion: boolean,
): OverlayPlayerState {
    return {
        sequenceId: getSequenceId(sequence, index),
        state: createInitialDialoguePlayerState(sequence.lines, reducedMotion),
    }
}

function createEmptyPlayerState(reducedMotion: boolean): OverlayPlayerState {
    return {
        sequenceId: '',
        state: createInitialDialoguePlayerState([], reducedMotion),
    }
}

export function getFengDaozhiDialoguePortraitAsset(lineIndex: number): string {
    const portraits = SCHEME_UI_ASSETS.fengDaozhiDialoguePortraits
    if (!Number.isFinite(lineIndex) || lineIndex < 0) return portraits[0]

    return portraits[Math.floor(lineIndex) % portraits.length] ?? portraits[0]
}

export function getFengDaozhiDialoguePortraitQueueIndex(
    sequences: FengDaozhiDialogueSequence[],
    activeSequenceIndex: number,
    lineIndex: number,
): number {
    const normalizedSequenceIndex = Number.isFinite(activeSequenceIndex)
        ? Math.max(0, Math.floor(activeSequenceIndex))
        : 0
    const normalizedLineIndex = Number.isFinite(lineIndex)
        ? Math.max(0, Math.floor(lineIndex))
        : 0
    const previousLineCount = sequences
        .slice(0, normalizedSequenceIndex)
        .reduce((total, sequence) => total + sequence.lines.length, 0)

    return previousLineCount + normalizedLineIndex
}

export interface HighlightedDialogueTextPart {
    text: string
    highlighted: boolean
}

function findNextHighlight(
    text: string,
    startIndex: number,
    terms: string[],
): { index: number; term: string } | null {
    let nextMatch: { index: number; term: string } | null = null

    for (const term of terms) {
        const index = text.indexOf(term, startIndex)
        if (index < 0) continue
        if (!nextMatch || index < nextMatch.index || (index === nextMatch.index && term.length > nextMatch.term.length)) {
            nextMatch = { index, term }
        }
    }

    return nextMatch
}

export function splitHighlightedDialogueText(
    text: string,
    highlightTerms: string[] = [],
): HighlightedDialogueTextPart[] {
    const terms = Array.from(new Set(highlightTerms.map(term => term.trim()).filter(Boolean)))
        .sort((left, right) => right.length - left.length)
    if (!text || terms.length === 0) return [{ text, highlighted: false }]

    const parts: HighlightedDialogueTextPart[] = []
    let cursor = 0

    while (cursor < text.length) {
        const match = findNextHighlight(text, cursor, terms)
        if (!match) {
            parts.push({ text: text.slice(cursor), highlighted: false })
            break
        }

        if (match.index > cursor) {
            parts.push({ text: text.slice(cursor, match.index), highlighted: false })
        }

        parts.push({ text: match.term, highlighted: true })
        cursor = match.index + match.term.length
    }

    return parts.filter(part => part.text.length > 0)
}

export function FengDaozhiDialogueOverlay({
    sequences,
    isPlaybackBlocked = false,
    onSequenceComplete,
    onComplete,
}: FengDaozhiDialogueOverlayProps) {
    const [activeSequenceIndex, setActiveSequenceIndex] = useState(0)
    const [reducedMotion, setReducedMotion] = useState(false)
    const [player, setPlayer] = useState<OverlayPlayerState>(() => {
        const firstSequence = sequences[0]
        return firstSequence ? createOverlayPlayerState(firstSequence, 0, false) : createEmptyPlayerState(false)
    })
    const { isMuted, sfxPlaybackLockCount, beginVoiceDucking, endVoiceDucking } = useMediaStore()
    const completedSequencesRef = useRef<Set<string>>(new Set())
    const completedOverlayRef = useRef(false)
    const scriptRef = useRef<HTMLElement | null>(null)
    const activeGuideVoiceRef = useRef<HTMLAudioElement | null>(null)
    const guideVoiceDuckingActiveRef = useRef(false)

    const activeSequence = sequences[activeSequenceIndex] ?? null
    const activeSequenceId = activeSequence ? getSequenceId(activeSequence, activeSequenceIndex) : ''
    const queueKey = useMemo(
        () => sequences.map((sequence, index) => getSequenceId(sequence, index)).join('|'),
        [sequences],
    )
    const dialogueState = player.sequenceId === activeSequenceId
        ? player.state
        : activeSequence
            ? createInitialDialoguePlayerState(activeSequence.lines, reducedMotion)
            : createInitialDialoguePlayerState([], reducedMotion)
    const currentLine = activeSequence?.lines[dialogueState.lineIndex] ?? null
    const visibleDialogueText = activeSequence
        ? getVisibleDialogueText(activeSequence.lines, dialogueState)
        : ''
    const highlightedDialogueTextParts = splitHighlightedDialogueText(
        visibleDialogueText,
        activeSequence?.highlightTerms,
    )
    const dialoguePortraitQueueIndex = getFengDaozhiDialoguePortraitQueueIndex(
        sequences,
        activeSequenceIndex,
        dialogueState.lineIndex,
    )
    const dialoguePortrait = getFengDaozhiDialoguePortraitAsset(dialoguePortraitQueueIndex)
    const dialogueVoicePath = currentLine?.voiceAssetId
        ?? (currentLine?.audioKey ? getFengDaozhiFirstRoundGuideVoicePath(currentLine.audioKey) : null)
    const shouldHoldDialogueForAudio = Boolean(
        dialogueVoicePath &&
        !isMuted &&
        (sfxPlaybackLockCount > 0 || isPlaybackBlocked),
    )

    const beginGuideVoiceDucking = useCallback(() => {
        if (guideVoiceDuckingActiveRef.current) return

        guideVoiceDuckingActiveRef.current = true
        beginVoiceDucking()
    }, [beginVoiceDucking])

    const endGuideVoiceDucking = useCallback(() => {
        if (!guideVoiceDuckingActiveRef.current) return

        guideVoiceDuckingActiveRef.current = false
        endVoiceDucking()
    }, [endVoiceDucking])

    const finalizeGuideVoiceAudio = useCallback((audio: HTMLAudioElement) => {
        if (activeGuideVoiceRef.current !== audio) return

        audio.onended = null
        audio.onpause = null
        activeGuideVoiceRef.current = null
        endGuideVoiceDucking()
    }, [endGuideVoiceDucking])

    const stopGuideVoiceAudio = useCallback(() => {
        const activeAudio = activeGuideVoiceRef.current
        if (activeAudio) {
            activeAudio.pause()
            activeAudio.currentTime = 0
        }
        activeGuideVoiceRef.current = null
        endGuideVoiceDucking()
    }, [endGuideVoiceDucking])

    useEffect(() => {
        completedSequencesRef.current.clear()
        completedOverlayRef.current = false
        setActiveSequenceIndex(0)
    }, [queueKey])

    useEffect(() => {
        if (!activeSequence || typeof document === 'undefined') return

        const previousActiveElement = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null

        scriptRef.current?.focus()

        return () => {
            if (previousActiveElement) {
                previousActiveElement.focus()
            }
        }
    }, [queueKey])

    useEffect(() => {
        if (!activeSequence) return

        setPlayer(currentPlayer => {
            const currentReducedMotion = currentPlayer.state.reducedMotion
            if (currentPlayer.sequenceId === activeSequenceId && currentReducedMotion === reducedMotion) {
                return currentPlayer
            }

            return createOverlayPlayerState(activeSequence, activeSequenceIndex, reducedMotion)
        })
    }, [activeSequence, activeSequenceId, activeSequenceIndex, reducedMotion])

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
        const updateReducedMotion = () => setReducedMotion(mediaQuery.matches)

        updateReducedMotion()

        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', updateReducedMotion)
            return () => mediaQuery.removeEventListener('change', updateReducedMotion)
        }

        mediaQuery.addListener(updateReducedMotion)
        return () => mediaQuery.removeListener(updateReducedMotion)
    }, [])

    useEffect(() => {
        if (!activeSequence || reducedMotion || player.sequenceId !== activeSequenceId || player.state.done) return

        const activeLine = activeSequence.lines[player.state.lineIndex]
        if (!activeLine || player.state.visibleCharacters >= activeLine.text.length) return

        const timerId = window.setInterval(() => {
            setPlayer(currentPlayer => {
                if (currentPlayer.sequenceId !== activeSequenceId) return currentPlayer

                return {
                    ...currentPlayer,
                    state: stepDialoguePlayer(activeSequence.lines, currentPlayer.state, 'tick'),
                }
            })
        }, TYPEWRITER_INTERVAL_MS)

        return () => window.clearInterval(timerId)
    }, [activeSequence, activeSequenceId, player, reducedMotion])

    useEffect(() => {
        stopGuideVoiceAudio()

        if (!dialogueVoicePath || isMuted || shouldHoldDialogueForAudio || typeof Audio === 'undefined') return undefined

        const audio = new Audio(dialogueVoicePath)
        audio.preload = 'auto'
        audio.volume = 1
        audio.onended = () => finalizeGuideVoiceAudio(audio)
        audio.onpause = () => {
            if (activeGuideVoiceRef.current === audio) {
                finalizeGuideVoiceAudio(audio)
            }
        }

        activeGuideVoiceRef.current = audio
        beginGuideVoiceDucking()
        audio.play().catch(() => finalizeGuideVoiceAudio(audio))

        return () => {
            if (activeGuideVoiceRef.current !== audio) return

            audio.pause()
            audio.currentTime = 0
            finalizeGuideVoiceAudio(audio)
        }
    }, [
        beginGuideVoiceDucking,
        dialogueVoicePath,
        finalizeGuideVoiceAudio,
        isMuted,
        shouldHoldDialogueForAudio,
        stopGuideVoiceAudio,
    ])

    const completeOverlayOnce = useCallback(() => {
        if (completedOverlayRef.current) return

        stopGuideVoiceAudio()
        completedOverlayRef.current = true
        onComplete()
    }, [onComplete, stopGuideVoiceAudio])

    const completeSequenceOnce = useCallback((
        sequence: FengDaozhiDialogueSequence,
        sequenceIndex: number,
    ) => {
        const sequenceId = getSequenceId(sequence, sequenceIndex)
        if (completedSequencesRef.current.has(sequenceId)) return false

        completedSequencesRef.current.add(sequenceId)
        onSequenceComplete(sequence)
        return true
    }, [onSequenceComplete])

    const completeAndMoveToNextSequence = useCallback((
        sequence: FengDaozhiDialogueSequence,
        sequenceIndex: number,
    ) => {
        if (!completeSequenceOnce(sequence, sequenceIndex)) return

        const nextSequenceIndex = sequenceIndex + 1
        const nextSequence = sequences[nextSequenceIndex]
        if (!nextSequence) {
            completeOverlayOnce()
            return
        }

        setActiveSequenceIndex(nextSequenceIndex)
        setPlayer(createOverlayPlayerState(nextSequence, nextSequenceIndex, reducedMotion))
    }, [completeOverlayOnce, completeSequenceOnce, reducedMotion, sequences])

    useEffect(() => {
        if (!activeSequence || player.sequenceId !== activeSequenceId || !player.state.done) return

        completeAndMoveToNextSequence(activeSequence, activeSequenceIndex)
    }, [
        activeSequence,
        activeSequenceId,
        activeSequenceIndex,
        completeAndMoveToNextSequence,
        player.sequenceId,
        player.state.done,
    ])

    const handleAdvance = useCallback((event?: MouseEvent<HTMLElement>) => {
        event?.stopPropagation()
        if (!activeSequence) return

        setPlayer(currentPlayer => {
            if (currentPlayer.sequenceId !== activeSequenceId) {
                return createOverlayPlayerState(activeSequence, activeSequenceIndex, reducedMotion)
            }

            return {
                ...currentPlayer,
                state: stepDialoguePlayer(activeSequence.lines, currentPlayer.state, 'advance'),
            }
        })
    }, [activeSequence, activeSequenceId, activeSequenceIndex, reducedMotion])

    useEffect(() => {
        if (typeof window === 'undefined') return

        const handleKeyDown = (event: KeyboardEvent) => {
            if (shouldTrapFengDaozhiDialogueFocus(event)) {
                event.preventDefault()
                scriptRef.current?.focus()
                return
            }

            if (!shouldAdvanceFengDaozhiDialogueFromKeydown(event)) return

            event.preventDefault()
            handleAdvance()
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleAdvance])

    if (!activeSequence || !currentLine) return null
    if (shouldHoldDialogueForAudio) return null

    const overlay = (
        <div className="feng-daozhi-dialogue-backdrop" onClick={handleAdvance}>
            <img
                src={dialoguePortrait}
                alt=""
                className="feng-daozhi-dialogue-portrait"
                draggable={false}
                aria-hidden="true"
            />

            <section
                ref={scriptRef}
                className="feng-daozhi-dialogue-script"
                role="dialog"
                aria-modal="true"
                aria-labelledby="feng-daozhi-dialogue-speaker"
                aria-describedby="feng-daozhi-dialogue-line"
                tabIndex={-1}
                onClick={handleAdvance}
            >
                <div className="feng-daozhi-dialogue-name-rail">
                    <span id="feng-daozhi-dialogue-speaker" className="feng-daozhi-dialogue-speaker">
                        冯道之
                    </span>
                    <span className="feng-daozhi-dialogue-ornament" aria-hidden="true" />
                </div>

                <p id="feng-daozhi-dialogue-line" className="feng-daozhi-dialogue-line" aria-live="polite">
                    {highlightedDialogueTextParts.map((part, index) => (
                        part.highlighted ? (
                            <strong key={`${part.text}-${index}`} className="feng-daozhi-dialogue-highlight">
                                {part.text}
                            </strong>
                        ) : (
                            <span key={`${part.text}-${index}`}>{part.text}</span>
                        )
                    ))}
                </p>

                <span className="feng-daozhi-dialogue-hint" aria-hidden="true">
                    点击继续 &gt;
                </span>
            </section>
        </div>
    )

    if (typeof document === 'undefined') {
        return overlay
    }

    return createPortal(overlay, document.body)
}
