import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import overlayCss from './FengDaozhiDialogueOverlay.css?raw'
import {
    FengDaozhiDialogueOverlay,
    getFengDaozhiDialoguePortraitAsset,
    getFengDaozhiDialoguePortraitQueueIndex,
    shouldAdvanceFengDaozhiDialogueFromKeydown,
    shouldTrapFengDaozhiDialogueFocus,
    splitHighlightedDialogueText,
} from './FengDaozhiDialogueOverlay'
import overlaySourceRaw from './FengDaozhiDialogueOverlay.tsx?raw'
import type { FengDaozhiDialogueSequence } from '../../game/fengDaozhiGuide'

const overlayCssSource = overlayCss.replace(/\r\n/g, '\n')
const overlaySource = overlaySourceRaw.replace(/\r\n/g, '\n')

const sequence: FengDaozhiDialogueSequence = {
    key: 'test-sequence',
    title: '冯道之锦囊',
    version: 1,
    lines: [
        { text: '公子，先看朝堂。', segmentLabel: '朝堂势力' as const },
    ],
}

function createTargetClosestMock(matchSelector: string | null) {
    const closest = vi.fn((selector: string) => {
        if (!matchSelector) return null
        return selector.includes(matchSelector) ? { matched: matchSelector } : null
    })

    return { closest }
}

describe('FengDaozhiDialogueOverlay', () => {
    it('renders the overlay through the document body portal with an SSR fallback', () => {
        expect(overlaySource).toContain('createPortal(')
        expect(overlaySource).toContain('document.body')
        expect(overlaySource).toContain("typeof document === 'undefined'")
    })

    it('renders the advisor portrait and unboxed narrative text layer in static markup', () => {
        const markup = renderToStaticMarkup(
            <FengDaozhiDialogueOverlay
                sequences={[sequence]}
                onSequenceComplete={vi.fn()}
                onComplete={vi.fn()}
            />,
        )

        expect(markup).toContain('feng-daozhi-dialogue-backdrop')
        expect(markup).toContain('feng-daozhi-dialogue-portrait')
        expect(markup).toContain('feng-daozhi-dialogue-script')
        expect(markup).toContain('feng-daozhi-dialogue-name-rail')
        expect(markup).toContain('feng-daozhi-dialogue-speaker')
        expect(markup).toContain('feng-daozhi-dialogue-line')
        expect(markup).toContain('feng-daozhi-dialogue-hint')
        expect(markup).toContain('tabindex="-1"')
        expect(markup).toContain('aria-describedby="feng-daozhi-dialogue-line"')
        expect(markup).toContain('id="feng-daozhi-dialogue-line"')
        expect(markup).toContain('点击继续')
        expect(markup).not.toContain('feng-daozhi-dialogue-box')
        expect(markup).not.toContain('feng-daozhi-dialogue-segment')
        expect(markup).not.toContain('feng-daozhi-dialogue-skip')
        expect(markup).not.toContain('跳过')
    })

    it('cycles dialogue portrait assets by the current line index', () => {
        expect(getFengDaozhiDialoguePortraitAsset(0)).toBe('/images/npc/scheme/fengdaozhi-assist-0.webp')
        expect(getFengDaozhiDialoguePortraitAsset(1)).toBe('/images/npc/scheme/fengdaozhi-assist-1.webp')
        expect(getFengDaozhiDialoguePortraitAsset(2)).toBe('/images/npc/scheme/fengdaozhi-assist-2.webp')
        expect(getFengDaozhiDialoguePortraitAsset(3)).toBe('/images/npc/scheme/fengdaozhi-assist-3.webp')
        expect(getFengDaozhiDialoguePortraitAsset(4)).toBe('/images/npc/scheme/fengdaozhi-assist-0.webp')
        expect(getFengDaozhiDialoguePortraitAsset(-1)).toBe('/images/npc/scheme/fengdaozhi-assist-0.webp')
        expect(overlaySource).toContain('getFengDaozhiDialoguePortraitAsset(dialoguePortraitQueueIndex)')
        expect(overlaySource).toContain('onClick={handleAdvance}')
    })

    it('plays first-round guide voice lines through the shared ducking lifecycle', () => {
        expect(overlaySource).toContain('useMediaStore')
        expect(overlaySource).toContain('getFengDaozhiFirstRoundGuideVoicePath')
        expect(overlaySource).toContain('currentLine?.audioKey')
        expect(overlaySource).toContain('new Audio(dialogueVoicePath)')
        expect(overlaySource).toContain('audio.volume = 1')
        expect(overlaySource).toContain('beginVoiceDucking()')
        expect(overlaySource).toContain('endVoiceDucking()')
        expect(overlaySource).toContain('activeGuideVoiceRef.current !== audio')
        expect(overlaySource).toContain('audio.play().catch(() => finalizeGuideVoiceAudio(audio))')
    })

    it('waits for blocking transition SFX to finish before starting guide voice playback', () => {
        expect(overlaySource).toContain('sfxPlaybackLockCount')
        expect(overlaySource).toContain('sfxPlaybackLockCount > 0')
        expect(overlaySource).toContain('if (shouldHoldDialogueForAudio) return null')
        expect(overlaySource.indexOf('sfxPlaybackLockCount > 0')).toBeLessThan(
            overlaySource.indexOf('new Audio(dialogueVoicePath)'),
        )
    })

    it('keeps the portrait and text hidden while another foreground voice must play first', () => {
        expect(overlaySource).toContain('isPlaybackBlocked = false')
        expect(overlaySource).toContain('isPlaybackBlocked')
        expect(overlaySource).toContain('shouldHoldDialogueForAudio')
        expect(overlaySource.indexOf('shouldHoldDialogueForAudio')).toBeLessThan(
            overlaySource.indexOf('if (!activeSequence || !currentLine) return null'),
        )
    })

    it('continues portrait cycling across queued guide and advisor-kit sequences', () => {
        const firstRoundGuide: FengDaozhiDialogueSequence = {
            key: 'first-round-guide',
            title: 'First round guide',
            version: 1,
            lines: [{ text: 'line 1' }, { text: 'line 2' }, { text: 'line 3' }],
        }
        const advisorKit: FengDaozhiDialogueSequence = {
            key: 'advisor-kit',
            title: 'Advisor kit',
            version: 1,
            lines: [{ text: 'kit line 1' }, { text: 'kit line 2' }],
        }
        const queue = [firstRoundGuide, advisorKit]

        expect(getFengDaozhiDialoguePortraitQueueIndex(queue, 0, 2)).toBe(2)
        expect(getFengDaozhiDialoguePortraitAsset(getFengDaozhiDialoguePortraitQueueIndex(queue, 1, 0))).toBe(
            '/images/npc/scheme/fengdaozhi-assist-3.webp',
        )
        expect(getFengDaozhiDialoguePortraitAsset(getFengDaozhiDialoguePortraitQueueIndex(queue, 1, 1))).toBe(
            '/images/npc/scheme/fengdaozhi-assist-0.webp',
        )
        expect(overlaySource).toContain('getFengDaozhiDialoguePortraitQueueIndex(')
        expect(overlaySource).toContain('sequences,\n        activeSequenceIndex,\n        dialogueState.lineIndex')
    })

    it('splits dialogue text so guide keywords can be highlighted inline', () => {
        expect(splitHighlightedDialogueText(
            '先读朝局简报，再重温案卷。',
            ['朝局简报', '重温案卷'],
        )).toEqual([
            { text: '先读', highlighted: false },
            { text: '朝局简报', highlighted: true },
            { text: '，再', highlighted: false },
            { text: '重温案卷', highlighted: true },
            { text: '。', highlighted: false },
        ])
        expect(overlaySource).toContain('feng-daozhi-dialogue-highlight')
    })

    it('supports keyboard advance and reduced motion without a visible skip path', () => {
        expect(overlaySource).toContain("event.key === 'Enter'")
        expect(overlaySource).toContain("event.key === ' '")
        expect(overlaySource).toContain('matchMedia')
        expect(overlaySource).toContain('prefers-reduced-motion: reduce')
        expect(overlaySource).not.toContain('handleSkip')
        expect(overlaySource).not.toContain('dialogue-skip')
        expect(overlaySource).not.toContain('跳过')
    })

    it('focuses the modal dialogue carrier and restores the previous focus target', () => {
        expect(overlaySource).toContain('scriptRef')
        expect(overlaySource).toContain('document.activeElement')
        expect(overlaySource).toContain('scriptRef.current?.focus()')
        expect(overlaySource).toContain('previousActiveElement.focus()')
    })

    it('traps Tab and Shift+Tab focus without treating advance keys as focus-trap keys', () => {
        const target = createTargetClosestMock(null)
        const shiftTabEvent = Object.assign({ key: 'Tab', target }, { shiftKey: true })

        expect(shouldTrapFengDaozhiDialogueFocus({ key: 'Tab', target })).toBe(true)
        expect(shouldTrapFengDaozhiDialogueFocus(shiftTabEvent)).toBe(true)
        expect(shouldTrapFengDaozhiDialogueFocus({ key: 'Enter', target })).toBe(false)
        expect(shouldTrapFengDaozhiDialogueFocus({ key: ' ', target })).toBe(false)
    })

    it('prevents default and refocuses the dialogue script when trapping Tab focus', () => {
        expect(overlaySource).toContain('if (shouldTrapFengDaozhiDialogueFocus(event)) {')
        expect(overlaySource).toContain('event.preventDefault()\n                scriptRef.current?.focus()\n                return')
        expect(overlaySource.indexOf('if (shouldTrapFengDaozhiDialogueFocus(event)) {')).toBeLessThan(
            overlaySource.indexOf('if (!shouldAdvanceFengDaozhiDialogueFromKeydown(event)) return'),
        )
    })

    it('advances only for Enter and Space on non-interactive key targets', () => {
        const target = createTargetClosestMock(null)

        expect(shouldAdvanceFengDaozhiDialogueFromKeydown({ key: 'Enter', target })).toBe(true)
        expect(shouldAdvanceFengDaozhiDialogueFromKeydown({ key: ' ', target })).toBe(true)
        expect(shouldAdvanceFengDaozhiDialogueFromKeydown({ key: 'Escape', target })).toBe(false)
    })

    it.each([
        ['button'],
        ['a'],
        ['input'],
        ['select'],
        ['textarea'],
        ['[role="button"]'],
        ['[role="link"]'],
        ['[contenteditable="true"]'],
    ])('lets native keyboard activation continue for %s targets', interactiveSelector => {
        const target = createTargetClosestMock(interactiveSelector)

        expect(shouldAdvanceFengDaozhiDialogueFromKeydown({ key: 'Enter', target })).toBe(false)
        expect(shouldAdvanceFengDaozhiDialogueFromKeydown({ key: ' ', target })).toBe(false)
        expect(target.closest).toHaveBeenCalledWith(expect.stringContaining(interactiveSelector))
    })

    it('keeps a translucent dark-gold veil, bottom portrait, unboxed text, and reduced-motion hint styles', () => {
        expect(typeof overlayCss).toBe('string')
        if (overlayCssSource) {
            expect(overlayCssSource).toContain('.feng-daozhi-dialogue-backdrop')
            expect(overlayCssSource).toContain('linear-gradient(180deg')
            expect(overlayCssSource).toContain('rgba(4, 4, 5, 0.42)')
            expect(overlayCssSource).toContain('rgba(78, 45, 18, 0.48)')
            expect(overlayCssSource).toContain('.feng-daozhi-dialogue-portrait')
            expect(overlayCssSource).toContain('bottom: 0')
            expect(overlayCssSource).toContain('.feng-daozhi-dialogue-script')
            expect(overlayCssSource).toContain('background: transparent')
            expect(overlayCssSource).toContain('border: 0')
            expect(overlayCssSource).toContain('@keyframes feng-daozhi-hint-breathe')
            expect(overlayCssSource).toContain('@media (prefers-reduced-motion: reduce)')
            expect(overlayCssSource).not.toContain('.feng-daozhi-dialogue-skip')
            expect(overlayCssSource).not.toContain('.feng-daozhi-dialogue-segment')
        }
    })
})
