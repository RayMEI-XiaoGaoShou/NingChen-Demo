# Feng Daozhi Overlay UI Carrier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the reusable Feng Daozhi dialogue overlay from a boxed modal into a unified in-game narrative layer with a translucent dark-gold veil, bottom-anchored portrait, unboxed floating text, and click-to-continue prompt.

**Architecture:** Keep the existing sequence, seen-state, and page-trigger mechanisms from Phase 1. Change only the reusable `FengDaozhiDialogueOverlay` component and its visual contract so all Feng Daozhi first-round guides, omen teaching, and per-round kits inherit the same UI carrier. Preserve the current typewriter/player behavior, but remove visible skip affordances and segment-label UI.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, component-scoped CSS, existing `react-dom/server` markup tests, Playwright CLI/manual browser QA for visual validation.

---

## Source Context

- Requirements doc: `docs/feng-daozhi-dialogue-overlay-redesign-grill.md`
- Existing overlay component: `NingChenv4/src/components/FengDaozhiDialogue/FengDaozhiDialogueOverlay.tsx`
- Existing overlay styles: `NingChenv4/src/components/FengDaozhiDialogue/FengDaozhiDialogueOverlay.css`
- Existing overlay tests: `NingChenv4/src/components/FengDaozhiDialogue/FengDaozhiDialogueOverlay.test.tsx`
- Existing pure dialogue player: `NingChenv4/src/game/fengDaozhiDialoguePlayer.ts`
- Existing sequence data: `NingChenv4/src/game/fengDaozhiGuide.ts`
- Current portrait asset source: `SCHEME_UI_ASSETS.fengDaozhiAssistPortrait`
- Representative integration surfaces:
  - `NingChenv4/src/components/RoundStart/RoundStart.tsx`
  - `NingChenv4/src/components/CourtView/CourtView.tsx`
  - `NingChenv4/src/components/EmpressLetter/EmpressLetter.tsx`
  - `NingChenv4/src/components/SchemeFeedback/SchemeFeedback.tsx`
  - `NingChenv4/src/components/Settlement/Settlement.tsx`

## Phase 2 Scope

In scope:

- Convert the overlay markup from “dialogue box with segment chip and skip button” to “narrative layer with portrait, name rail, floating text, and centered prompt”.
- Remove visible `跳过` and remove the underlying skip handler.
- Keep click anywhere on the overlay, `Enter`, and `Space` as advancement methods.
- Keep `Escape` inert.
- Remove right/top segment-label UI from the overlay.
- Keep `segmentLabel` in data untouched for future copy/analytics use.
- Add dark translucent top/mid veil and stronger dark-gold lower veil.
- Anchor Feng Daozhi portrait to the bottom-left edge on desktop.
- Add centered gold `点击继续 >` prompt with restrained breathing animation.
- Respect `prefers-reduced-motion: reduce` by disabling the prompt animation.
- Do not alter first-round guide copy, omen copy, per-round kit copy, seen-key persistence, or page-trigger queue logic.
- Add visual contract tests and run browser screenshot QA.

Out of scope:

- Final rewritten Feng Daozhi prose.
- AIART portrait variants or cutout replacement.
- Voice playback.
- Gameplay Guide summary changes.
- Any change to advisor-kit data ranking or first-round guide queue logic.
- Detailed mobile polish beyond avoiding complete unreadability or severe overlap.

## File Structure

Modify:

- `NingChenv4/src/components/FengDaozhiDialogue/FengDaozhiDialogueOverlay.tsx`
  - Remove skip-specific code.
  - Replace the boxed layout markup with narrative-layer markup.
  - Keep portal, click advance, typewriter, reduced-motion detection, and keyboard handling.
- `NingChenv4/src/components/FengDaozhiDialogue/FengDaozhiDialogueOverlay.css`
  - Replace boxed modal styling with the dark-gold narrative layer.
  - Add portrait, text rail, hint animation, and reduced-motion rules.
- `NingChenv4/src/components/FengDaozhiDialogue/FengDaozhiDialogueOverlay.test.tsx`
  - Update source/markup/CSS contract tests for the new visual carrier.
- `docs/feng-daozhi-dialogue-overlay-redesign-grill.md`
  - Keep as the source requirements doc; do not rewrite it during implementation except for factual corrections discovered during work.
- `docs/superpowers/plans/2026-06-18-feng-daozhi-overlay-ui-carrier.md`
  - Track implementation progress if executing from this plan.

No new production files are required.

---

### Task 1: Lock The New Overlay Contract In Tests

**Files:**

- Modify: `NingChenv4/src/components/FengDaozhiDialogue/FengDaozhiDialogueOverlay.test.tsx`

- [ ] **Step 1: Replace the legacy boxed-layout assertions with the new narrative-layer assertions**

In `NingChenv4/src/components/FengDaozhiDialogue/FengDaozhiDialogueOverlay.test.tsx`, replace the current test named `renders the advisor portrait, segment label, and speaker in static markup` with:

```tsx
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
    expect(markup).toContain('点击继续')
    expect(markup).not.toContain('feng-daozhi-dialogue-box')
    expect(markup).not.toContain('feng-daozhi-dialogue-segment')
    expect(markup).not.toContain('feng-daozhi-dialogue-skip')
    expect(markup).not.toContain('跳过')
})
```

- [ ] **Step 2: Replace the skip-handling source contract**

Replace the current test named `supports keyboard advance, reduced motion, and skip handling` with:

```tsx
it('supports keyboard advance and reduced motion without a visible skip path', () => {
    expect(overlaySource).toContain("event.key === 'Enter'")
    expect(overlaySource).toContain("event.key === ' '")
    expect(overlaySource).toContain('matchMedia')
    expect(overlaySource).toContain('prefers-reduced-motion: reduce')
    expect(overlaySource).not.toContain('handleSkip')
    expect(overlaySource).not.toContain('dialogue-skip')
    expect(overlaySource).not.toContain('跳过')
})
```

- [ ] **Step 3: Add CSS contract assertions for the translucent veil and unboxed text**

Replace the test named `keeps fixed overlay layout and mobile positioning styles` with:

```tsx
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
```

- [ ] **Step 4: Run the overlay tests and confirm they fail**

Run from `NingChenv4`:

```bash
npm.cmd test -- src/components/FengDaozhiDialogue/FengDaozhiDialogueOverlay.test.tsx
```

Expected: FAIL. The current implementation still renders `feng-daozhi-dialogue-box`, `feng-daozhi-dialogue-segment`, and `feng-daozhi-dialogue-skip`.

- [ ] **Step 5: Commit only if this task is executed independently and the implementation is already present**

Do not commit after a red-only test update if the next task will be implemented in the same worker pass. If a worker performs Task 1 alone, leave the tests uncommitted and report the red state to the coordinator.

---

### Task 2: Refactor The Overlay Markup And Interaction Surface

**Files:**

- Modify: `NingChenv4/src/components/FengDaozhiDialogue/FengDaozhiDialogueOverlay.tsx`
- Test: `NingChenv4/src/components/FengDaozhiDialogue/FengDaozhiDialogueOverlay.test.tsx`

- [ ] **Step 1: Remove the skip handler and skip-specific import type**

In `FengDaozhiDialogueOverlay.tsx`, keep the `MouseEvent` import for click advancement:

```ts
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
```

Delete the entire `handleSkip` callback:

```ts
const handleSkip = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()

    sequences.slice(activeSequenceIndex).forEach((sequence, offset) => {
        completeSequenceOnce(sequence, activeSequenceIndex + offset)
    })
    completeOverlayOnce()
}, [activeSequenceIndex, completeOverlayOnce, completeSequenceOnce, sequences])
```

Do not replace it with another direct-close handler.

- [ ] **Step 2: Replace the overlay JSX with the narrative-layer markup**

In `FengDaozhiDialogueOverlay.tsx`, replace the current `const overlay = (...)` block with:

```tsx
const overlay = (
    <div className="feng-daozhi-dialogue-backdrop" onClick={handleAdvance}>
        <img
            src={SCHEME_UI_ASSETS.fengDaozhiAssistPortrait}
            alt=""
            className="feng-daozhi-dialogue-portrait"
            draggable={false}
            aria-hidden="true"
        />

        <section
            className="feng-daozhi-dialogue-script"
            role="dialog"
            aria-modal="true"
            aria-labelledby="feng-daozhi-dialogue-speaker"
            onClick={handleAdvance}
        >
            <div className="feng-daozhi-dialogue-name-rail">
                <span id="feng-daozhi-dialogue-speaker" className="feng-daozhi-dialogue-speaker">
                    冯道之
                </span>
                <span className="feng-daozhi-dialogue-ornament" aria-hidden="true" />
            </div>

            <p className="feng-daozhi-dialogue-line" aria-live="polite">
                {visibleDialogueText}
            </p>

            <span className="feng-daozhi-dialogue-hint" aria-hidden="true">
                点击继续 &gt;
            </span>
        </section>
    </div>
)
```

This intentionally does not render `currentLine.segmentLabel`.

- [ ] **Step 3: Confirm keyboard behavior still matches the requirement**

Do not change `shouldAdvanceFengDaozhiDialogueFromKeydown`.

The existing assertions should remain:

```ts
expect(shouldAdvanceFengDaozhiDialogueFromKeydown({ key: 'Enter', target })).toBe(true)
expect(shouldAdvanceFengDaozhiDialogueFromKeydown({ key: ' ', target })).toBe(true)
expect(shouldAdvanceFengDaozhiDialogueFromKeydown({ key: 'Escape', target })).toBe(false)
```

- [ ] **Step 4: Run the overlay tests and confirm markup-related failures remain only CSS-related**

Run from `NingChenv4`:

```bash
npm.cmd test -- src/components/FengDaozhiDialogue/FengDaozhiDialogueOverlay.test.tsx
```

Expected: FAIL if Task 3 CSS is not implemented yet. The failures should be about CSS contract strings, not about `handleSkip`, `dialogue-skip`, or `dialogue-segment`.

- [ ] **Step 5: Commit after Task 3 is also green**

Do not commit this task alone unless CSS has also been implemented and focused tests pass.

---

### Task 3: Replace Boxed Modal CSS With The Dark-Gold Narrative Layer

**Files:**

- Modify: `NingChenv4/src/components/FengDaozhiDialogue/FengDaozhiDialogueOverlay.css`
- Test: `NingChenv4/src/components/FengDaozhiDialogue/FengDaozhiDialogueOverlay.test.tsx`

- [ ] **Step 1: Replace the CSS file with the narrative-layer styles**

Replace the full contents of `FengDaozhiDialogueOverlay.css` with:

```css
.feng-daozhi-dialogue-backdrop {
    position: fixed;
    inset: 0;
    z-index: 58;
    overflow: hidden;
    background:
        linear-gradient(180deg,
            rgba(4, 4, 5, 0.42) 0%,
            rgba(5, 5, 7, 0.58) 42%,
            rgba(16, 12, 8, 0.78) 72%,
            rgba(6, 5, 4, 0.94) 100%),
        radial-gradient(circle at 46% 96%,
            rgba(130, 83, 31, 0.26) 0%,
            rgba(78, 45, 18, 0.48) 38%,
            rgba(8, 7, 6, 0) 72%);
    cursor: pointer;
}

.feng-daozhi-dialogue-backdrop::before {
    content: "";
    position: absolute;
    inset: 0;
    background:
        linear-gradient(90deg,
            rgba(0, 0, 0, 0.32) 0%,
            rgba(0, 0, 0, 0.04) 36%,
            rgba(0, 0, 0, 0.16) 100%),
        linear-gradient(0deg,
            rgba(95, 60, 22, 0.24) 0%,
            rgba(95, 60, 22, 0.08) 28%,
            rgba(95, 60, 22, 0) 62%);
    pointer-events: none;
}

.feng-daozhi-dialogue-portrait {
    position: fixed;
    left: clamp(18px, 4.4vw, 72px);
    bottom: 0;
    width: clamp(240px, 19vw, 390px);
    max-width: 24vw;
    max-height: 50vh;
    object-fit: contain;
    object-position: left bottom;
    filter: drop-shadow(0 26px 34px rgba(0, 0, 0, 0.76));
    pointer-events: none;
    user-select: none;
}

.feng-daozhi-dialogue-script {
    position: fixed;
    left: clamp(286px, 24vw, 430px);
    right: clamp(56px, 6vw, 112px);
    bottom: clamp(34px, 7.2vh, 86px);
    width: auto;
    max-width: 1080px;
    display: grid;
    grid-template-rows: auto auto auto;
    gap: 12px;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    color: var(--color-text-primary);
    cursor: pointer;
}

.feng-daozhi-dialogue-name-rail {
    display: grid;
    grid-template-columns: max-content minmax(160px, 1fr);
    align-items: center;
    column-gap: 16px;
    width: min(100%, 760px);
}

.feng-daozhi-dialogue-speaker {
    color: var(--color-accent-gold);
    font-family: var(--font-heading);
    font-size: clamp(1.2rem, 1.55vw, 1.58rem);
    line-height: 1.2;
    letter-spacing: 0;
    text-shadow: 0 2px 14px rgba(0, 0, 0, 0.72);
}

.feng-daozhi-dialogue-ornament {
    position: relative;
    height: 1px;
    min-width: 160px;
    background: linear-gradient(90deg,
        rgba(224, 189, 109, 0.72),
        rgba(224, 189, 109, 0.36) 62%,
        rgba(224, 189, 109, 0));
}

.feng-daozhi-dialogue-ornament::before,
.feng-daozhi-dialogue-ornament::after {
    content: "";
    position: absolute;
    top: 50%;
    width: 6px;
    height: 6px;
    border: 1px solid rgba(224, 189, 109, 0.58);
    transform: translateY(-50%) rotate(45deg);
    background: rgba(24, 18, 10, 0.56);
}

.feng-daozhi-dialogue-ornament::before {
    left: 0;
}

.feng-daozhi-dialogue-ornament::after {
    left: min(46vw, 610px);
}

.feng-daozhi-dialogue-line {
    max-width: 1080px;
    margin: 0;
    color: rgba(255, 245, 218, 0.96);
    font-family: var(--font-heading);
    font-size: clamp(1.03rem, 1.35vw, 1.28rem);
    line-height: 1.9;
    letter-spacing: 0;
    text-shadow:
        0 2px 12px rgba(0, 0, 0, 0.86),
        0 0 18px rgba(107, 68, 24, 0.36);
}

.feng-daozhi-dialogue-hint {
    justify-self: center;
    color: rgba(224, 181, 83, 0.9);
    font-family: var(--font-heading);
    font-size: clamp(0.9rem, 1.05vw, 1.04rem);
    line-height: 1.3;
    letter-spacing: 0;
    text-shadow: 0 0 14px rgba(174, 116, 35, 0.46);
    animation: feng-daozhi-hint-breathe 1600ms ease-in-out infinite;
}

@keyframes feng-daozhi-hint-breathe {
    0%,
    100% {
        opacity: 0.54;
        transform: translateY(0);
        text-shadow: 0 0 10px rgba(174, 116, 35, 0.32);
    }

    50% {
        opacity: 1;
        transform: translateY(1px);
        text-shadow: 0 0 18px rgba(224, 181, 83, 0.66);
    }
}

@media (prefers-reduced-motion: reduce) {
    .feng-daozhi-dialogue-hint {
        animation: none;
        opacity: 0.86;
        transform: none;
    }
}

@media (max-width: 720px) {
    .feng-daozhi-dialogue-portrait {
        left: clamp(8px, 4vw, 20px);
        bottom: 0;
        width: min(40vw, 170px);
        max-width: 42vw;
        max-height: 38vh;
        opacity: 0.86;
    }

    .feng-daozhi-dialogue-script {
        left: clamp(118px, 34vw, 172px);
        right: 16px;
        bottom: 18px;
        max-width: none;
        gap: 10px;
    }

    .feng-daozhi-dialogue-name-rail {
        grid-template-columns: max-content minmax(64px, 1fr);
        column-gap: 10px;
        width: 100%;
    }

    .feng-daozhi-dialogue-speaker {
        font-size: 1.04rem;
    }

    .feng-daozhi-dialogue-ornament {
        min-width: 64px;
    }

    .feng-daozhi-dialogue-ornament::after {
        display: none;
    }

    .feng-daozhi-dialogue-line {
        font-size: 0.94rem;
        line-height: 1.72;
    }

    .feng-daozhi-dialogue-hint {
        justify-self: center;
        font-size: 0.86rem;
    }
}
```

- [ ] **Step 2: Run focused overlay tests**

Run from `NingChenv4`:

```bash
npm.cmd test -- src/components/FengDaozhiDialogue/FengDaozhiDialogueOverlay.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Commit the overlay visual carrier**

Run from the git root:

```bash
git add NingChenv4/src/components/FengDaozhiDialogue/FengDaozhiDialogueOverlay.tsx NingChenv4/src/components/FengDaozhiDialogue/FengDaozhiDialogueOverlay.css NingChenv4/src/components/FengDaozhiDialogue/FengDaozhiDialogueOverlay.test.tsx
git commit -m "feat: redesign Feng Daozhi dialogue overlay"
```

---

### Task 4: Update Integration Contracts For No-Skip Shared Overlay

**Files:**

- Modify: `NingChenv4/src/components/RoundStart/RoundStart.test.tsx`
- Modify: `NingChenv4/src/components/CourtView/CourtView.external-line.test.tsx`
- Modify: `NingChenv4/src/components/SchemeFeedback/SchemeFeedback.test.tsx`
- Modify: `NingChenv4/src/components/EmpressLetter/EmpressLetter.test.ts`
- Modify: `NingChenv4/src/components/Settlement/Settlement.test.tsx`

- [ ] **Step 1: Add shared visual-carrier assertions to active page tests**

Where each file already asserts the page uses `FengDaozhiDialogueOverlay`, add source-level assertions that active pages do not provide a local skip path and still rely on the shared overlay:

```ts
expect(pageSource).toContain('FengDaozhiDialogueOverlay')
expect(pageSource).not.toContain('dialogue-skip')
expect(pageSource).not.toContain('handleSkip')
```

Use the actual source variable name in each file:

- `roundStartSource` in `RoundStart.test.tsx`
- `courtViewSource` in `CourtView.external-line.test.tsx`
- `schemeFeedbackSource` in `SchemeFeedback.test.tsx`
- `empressLetterSource` in `EmpressLetter.test.ts`
- `settlementSource` in `Settlement.test.tsx`

- [ ] **Step 2: Run integration source-contract tests**

Run from `NingChenv4`:

```bash
npm.cmd test -- src/components/RoundStart/RoundStart.test.tsx src/components/CourtView/CourtView.external-line.test.tsx src/components/SchemeFeedback/SchemeFeedback.test.tsx src/components/EmpressLetter/EmpressLetter.test.ts src/components/Settlement/Settlement.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Commit integration contract updates**

Run from the git root:

```bash
git add NingChenv4/src/components/RoundStart/RoundStart.test.tsx NingChenv4/src/components/CourtView/CourtView.external-line.test.tsx NingChenv4/src/components/SchemeFeedback/SchemeFeedback.test.tsx NingChenv4/src/components/EmpressLetter/EmpressLetter.test.ts NingChenv4/src/components/Settlement/Settlement.test.tsx
git commit -m "test: lock Feng Daozhi overlay carrier usage"
```

---

### Task 5: Browser QA And Visual Adjustment Pass

**Files:**

- Modify if visual QA finds issues:
  - `NingChenv4/src/components/FengDaozhiDialogue/FengDaozhiDialogueOverlay.css`
- Create local QA artifacts if useful:
  - `NingChenv4/output/playwright/feng-overlay-roundstart-desktop.png`
  - `NingChenv4/output/playwright/feng-overlay-court-kit-desktop.png`
  - `NingChenv4/output/playwright/feng-overlay-roundstart-narrow.png`

- [ ] **Step 1: Start the dev server**

Run from `NingChenv4`:

```powershell
Start-Process -FilePath 'npm.cmd' -ArgumentList @('run','dev','--','--host','127.0.0.1','--port','5173') -WorkingDirectory 'C:\Users\micha\Desktop\NingChenActive\worktrees\feng-first-round-guide-kit\NingChenv4' -WindowStyle Hidden
```

Expected: Vite serves the app at `http://127.0.0.1:5173/`.

- [ ] **Step 2: Capture the RoundStart desktop overlay**

Use browser automation or manual browser QA to navigate:

1. Open `http://127.0.0.1:5173/`.
2. Start a new game.
3. Advance through difficulty and prologue until Round 1 RoundStart.
4. Confirm the Feng Daozhi overlay appears.
5. Save a desktop screenshot to `NingChenv4/output/playwright/feng-overlay-roundstart-desktop.png`.

Expected visual checks:

- Background is still visible through a black/dark-gold translucent veil.
- Lower area is darker than top/middle.
- Portrait is attached to the bottom-left edge.
- There is no visible box, border, card, or skip button.
- `冯道之` name rail and gold line are visible.
- Text begins to the right of the portrait and spans most of the lower screen.
- `点击继续 >` is centered below the line text.

- [ ] **Step 3: Capture the CourtView advisor-kit desktop overlay**

Continue from RoundStart:

1. Click through the RoundStart guide until it closes.
2. Enter the court overview.
3. Click through the first CourtView guide lines until the advisor-kit lines appear.
4. Save a desktop screenshot to `NingChenv4/output/playwright/feng-overlay-court-kit-desktop.png`.

Expected visual checks:

- The same carrier is used on the court overview page.
- No right/top segment label appears.
- Advisor-kit text uses the same unboxed name rail and prompt.
- Court entry buttons remain visually behind the veil and are not the focus.

- [ ] **Step 4: Capture a narrow viewport sanity screenshot**

Resize to a narrow viewport such as `390x844`, reload a saved RoundStart state, and save `NingChenv4/output/playwright/feng-overlay-roundstart-narrow.png`.

Expected visual checks:

- The overlay is basically readable.
- The portrait remains bottom-attached.
- The text does not disappear off-screen.
- Severe overlap that hides both the portrait face and the dialogue text does not occur.

- [ ] **Step 5: Adjust CSS if QA reveals a concrete visual issue**

Use this adjustment rule:

- If the bottom veil is too opaque and the page becomes pure black, reduce bottom alpha values by `0.06`.
- If the text loses readability, increase text shadow opacity or bottom veil alpha by `0.06`.
- If the portrait is too small on desktop, increase `width: clamp(240px, 19vw, 390px)` to `width: clamp(260px, 20vw, 410px)`.
- If the portrait is too large on desktop, reduce it to `width: clamp(230px, 18vw, 360px)`.
- If text starts too far right, reduce `.feng-daozhi-dialogue-script` left from `clamp(286px, 24vw, 430px)` to `clamp(260px, 22vw, 392px)`.

After any CSS adjustment, rerun:

```bash
npm.cmd test -- src/components/FengDaozhiDialogue/FengDaozhiDialogueOverlay.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit the QA adjustment if CSS changed**

Run from the git root only if CSS changed after screenshot QA:

```bash
git add NingChenv4/src/components/FengDaozhiDialogue/FengDaozhiDialogueOverlay.css
git commit -m "fix: tune Feng Daozhi overlay visual balance"
```

---

### Task 6: Full Verification And Documentation Commit

**Files:**

- Add: `docs/feng-daozhi-dialogue-overlay-redesign-grill.md`
- Add: `docs/superpowers/plans/2026-06-18-feng-daozhi-overlay-ui-carrier.md`
- Verify code changes from prior tasks.

- [ ] **Step 1: Run focused tests**

Run from `NingChenv4`:

```bash
npm.cmd test -- src/components/FengDaozhiDialogue/FengDaozhiDialogueOverlay.test.tsx src/components/RoundStart/RoundStart.test.tsx src/components/CourtView/CourtView.external-line.test.tsx src/components/SchemeFeedback/SchemeFeedback.test.tsx src/components/EmpressLetter/EmpressLetter.test.ts src/components/Settlement/Settlement.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run the full test suite**

Run from `NingChenv4`:

```bash
npm.cmd test
```

Expected: all Vitest files pass, with the existing skipped tests unchanged.

- [ ] **Step 3: Run production build**

Run from `NingChenv4`:

```bash
npm.cmd run build
```

Expected: TypeScript and Vite build complete successfully.

- [ ] **Step 4: Check git status**

Run from the git root:

```bash
git status --short --branch
```

Expected: only intentional code and docs changes appear.

- [ ] **Step 5: Commit docs if they are still uncommitted**

Run from the git root:

```bash
git add docs/feng-daozhi-dialogue-overlay-redesign-grill.md docs/superpowers/plans/2026-06-18-feng-daozhi-overlay-ui-carrier.md
git commit -m "docs: plan Feng Daozhi overlay UI carrier"
```

- [ ] **Step 6: Final review**

Ask for a code review over the range that contains this Phase 2 work. The review should check:

- No skip path remains visible or callable from UI.
- No segment label is rendered as UI.
- Overlay is still shared by all active Feng Daozhi surfaces.
- Typewriter and completion behavior still mark sequences seen only when completed.
- CSS does not reintroduce a card/box as the main visual carrier.

Expected: reviewer reports no critical or important findings before final handoff.

---

## Self-Review Checklist

Spec coverage:

- Unified visual carrier for all Feng Daozhi overlays: Task 2, Task 3, Task 4.
- Remove visible skip button: Task 1, Task 2.
- No Esc skip: Task 1 confirms existing keyboard helper keeps Escape false.
- Click, Enter, Space advancement retained: Task 1 and Task 2.
- No right/top segment label: Task 1 and Task 2.
- Translucent dark-gold veil: Task 3.
- Bottom-attached portrait: Task 3 and Task 5.
- Unboxed text and horizontal text region: Task 2, Task 3, Task 5.
- Name rail and ornament: Task 2, Task 3.
- Centered breathing `点击继续 >`: Task 2, Task 3.
- Reduced-motion behavior: Task 1, Task 3.
- Browser screenshot QA: Task 5.
- Documentation and plan captured: Task 6.

Scope control:

- No copy rewrites.
- No sequence/queue/seen-state changes.
- No AIART asset generation.
- No voice work.
- Mobile is sanity-only, not detailed polish.

Placeholder scan:

- The plan intentionally avoids open-ended implementation placeholders.
- CSS replacement and TSX replacement are concrete.
- Test commands and expected outcomes are concrete.

Type consistency:

- New classes use the shared `feng-daozhi-dialogue-*` prefix.
- Existing `FengDaozhiDialogueOverlayProps` stays unchanged.
- Existing sequence data shape stays unchanged.
- Existing `shouldAdvanceFengDaozhiDialogueFromKeydown` behavior stays unchanged.
