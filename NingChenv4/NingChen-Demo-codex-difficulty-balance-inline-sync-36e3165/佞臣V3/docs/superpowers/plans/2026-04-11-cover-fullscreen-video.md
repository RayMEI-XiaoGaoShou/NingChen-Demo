# Cover Fullscreen Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current boxed cover with a true fullscreen video wallpaper cover, remove the top header during the `COVER` prologue step, and keep the large lower-left title/actions plus a floating mute button on top of the video.

**Architecture:** `App.tsx` will switch to a cover-specific shell when `prologueStep === 'COVER'`, so the cover no longer inherits the normal header and page padding. `Cover.tsx` will own its fullscreen layout and its own floating audio control while keeping the existing start/load/difficulty interaction state intact. The new MP4 asset will live in `public/` so Vite can serve it directly.

**Tech Stack:** React, TypeScript, Zustand, Vite, Vitest, CSS

---

## File Map

- Modify: `src/App.test.tsx`
  - Add a regression test that proves the normal app header is not rendered during `COVER`.
- Modify: `src/App.tsx`
  - Switch the cover step to a dedicated fullscreen app shell and keep the existing shell for all other phases.
- Modify: `src/components/Cover/Cover.tsx`
  - Move the audio button into the cover and preserve the existing button/difficulty/save behavior.
- Modify: `src/components/Cover/Cover.css`
  - Replace the boxed cover styling with a fullscreen cinematic layout.
- Create: `public/cover-menu-bg-v2.mp4`
  - New fullscreen video asset copied from `C:\Users\micha\Desktop\佞臣V3 阶段开发\封面v2.mp4`.
- Modify: `src/styles/global.css`
  - Add cover-shell-specific layout hooks without changing the non-cover pages.

## Task 1: Lock the cover shell behavior with a failing test

**Files:**
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Write the failing test**

Add this test under the existing `describe('App prologue flow', ...)` block:

```tsx
    it('does not render the global header during the fullscreen cover step', () => {
        const markup = renderToStaticMarkup(<App />)

        expect(markup).not.toContain('app-header')
        expect(markup).toContain('cover-audio-control')
        expect(markup).toContain('cover-page')
    })
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
& npm.cmd test -- src/App.test.tsx
```

Expected:
- `shows the cover page before the prologue when no save snapshot exists` still passes
- `shows the audio control as unmute when the game starts muted` still passes
- the new test fails because the current `App` always renders `app-header`

- [ ] **Step 3: Confirm the failure is the right one**

The failure should mention that `app-header` is still present in the static markup. Do not change the test if the failure is specifically about the global header still rendering on the cover.

## Task 2: Add the new cover video asset

**Files:**
- Create: `public/cover-menu-bg-v2.mp4`

- [ ] **Step 1: Copy the approved video into the public asset directory**

Run:

```powershell
Copy-Item -LiteralPath 'C:\Users\micha\Desktop\佞臣V3 阶段开发\封面v2.mp4' -Destination 'C:\Users\micha\Desktop\佞臣V3 阶段开发\NingChen-Demo-main\NingChen-Demo-main\佞臣_MuleRun Version\public\cover-menu-bg-v2.mp4' -Force
```

Expected:
- `public/cover-menu-bg-v2.mp4` exists beside the old `public/cover-menu-bg.mp4`

- [ ] **Step 2: Verify the file exists**

Run:

```powershell
Get-Item -LiteralPath 'public\cover-menu-bg-v2.mp4' | Select-Object Name,Length
```

Expected:
- output shows `cover-menu-bg-v2.mp4`
- the file size is non-zero

## Task 3: Switch `App` to a dedicated cover shell

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Update `App.tsx` to compute whether the app is showing the cover**

Use this structure near the existing derived state:

```tsx
    const isCoverStep = prologueStep === 'COVER'
```

- [ ] **Step 2: Update `App.tsx` so the header only renders outside the cover**

Replace the current top-level JSX return with this shape:

```tsx
    return (
        <div className={`app${isCoverStep ? ' app-cover-shell' : ''}`}>
            {!isCoverStep && (
                <header className="app-header">
                    <span className="app-header-spacer" />
                    <span className="app-logo">浣炶嚕</span>
                    <button
                        className="btn-audio"
                        onClick={() => {
                            if (isMuted || !audioReady) {
                                setMuted(false)
                                requestPlayback()
                                return
                            }

                            setMuted(true)
                        }}
                    >
                        {isMuted ? '寮€澹? : '闈欓煶'}
                    </button>
                </header>
            )}
            <PhaseErrorBoundary resetKey={`${prologueStep}:${currentPhase}`} phaseName={currentPhase} fallback={errorFallback}>
                <>
                    <main className={`app-content${isCoverStep ? ' app-content-cover' : ''}`}>
                        {renderContent()}
                        {helpOverlayOpen && (
                            <div className="help-overlay">
                                <div className="help-overlay-panel">
                                    <GameplayGuide mode="overlay" />
                                </div>
                            </div>
                        )}
                    </main>
                    <GlobalAudio />
                    <NPCDetail />
                </>
            </PhaseErrorBoundary>
        </div>
    )
```

- [ ] **Step 3: Add cover-shell layout hooks in `src/styles/global.css`**

Append these rules close to the existing `.app` and `.app-content` definitions:

```css
.app-cover-shell {
    width: 100%;
    max-width: none;
    padding: 0;
}

.app-content-cover {
    padding: 0;
}
```

- [ ] **Step 4: Run the targeted test again**

Run:

```powershell
& npm.cmd test -- src/App.test.tsx
```

Expected:
- the new cover-shell test now passes

## Task 4: Move the audio control into the cover and keep the existing game actions

**Files:**
- Modify: `src/components/Cover/Cover.tsx`

- [ ] **Step 1: Import the media store into the cover**

Add this import:

```tsx
import { useMediaStore } from '../../stores/mediaStore'
```

- [ ] **Step 2: Read the audio state/actions inside `Cover`**

Add these selectors near the existing store selectors:

```tsx
    const { isMuted, audioReady, setMuted, requestPlayback } = useMediaStore()
```

- [ ] **Step 3: Point the cover video at the new asset and give the floating mute button a stable class**

Update the top of the returned JSX to this shape:

```tsx
        <div className="cover-page animate-fade-in">
            <video
                className="cover-video"
                src="/cover-menu-bg-v2.mp4"
                autoPlay
                muted
                loop
                playsInline
            />
            <div className="cover-overlay" />
            <button
                className="cover-audio-control"
                onClick={() => {
                    if (isMuted || !audioReady) {
                        setMuted(false)
                        requestPlayback()
                        return
                    }

                    setMuted(true)
                }}
            >
                {isMuted ? '寮€澹? : '闈欓煶'}
            </button>
            <div className="cover-content">
```

- [ ] **Step 4: Keep the rest of the cover interaction intact**

Do not change:
- `showDifficulty`
- `selectedDifficulty`
- `hasSave`
- `latestSave`
- `startNewGame(selectedDifficulty)`
- `loadLatestSave()`

The only structural change inside the content block should be visual wrappers if needed for the fullscreen layout.

## Task 5: Replace the boxed cover CSS with a fullscreen cinematic layout

**Files:**
- Modify: `src/components/Cover/Cover.css`

- [ ] **Step 1: Replace the current `.cover-page` layout**

Update the root container styles to:

```css
.cover-page {
    position: relative;
    min-height: 100vh;
    width: 100%;
    overflow: hidden;
    display: flex;
    align-items: flex-end;
    padding: clamp(24px, 4vw, 56px);
    isolation: isolate;
}
```

- [ ] **Step 2: Remove the boxed-card feel and make the video truly fullscreen**

Ensure these rules exist:

```css
.cover-video,
.cover-overlay {
    position: absolute;
    inset: 0;
}

.cover-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center center;
}

.cover-overlay {
    background:
        linear-gradient(90deg, rgba(5, 6, 10, 0.88) 0%, rgba(5, 6, 10, 0.62) 30%, rgba(5, 6, 10, 0.22) 66%, rgba(5, 6, 10, 0.32) 100%),
        linear-gradient(180deg, rgba(5, 6, 10, 0.12), rgba(5, 6, 10, 0.58) 100%);
}
```

- [ ] **Step 3: Add the floating audio button style**

Add:

```css
.cover-audio-control {
    position: absolute;
    top: clamp(18px, 2vw, 28px);
    right: clamp(18px, 2vw, 28px);
    z-index: 2;
    padding: 8px 14px;
    border: 1px solid rgba(201, 176, 101, 0.34);
    background: rgba(10, 10, 14, 0.42);
    color: var(--color-accent-gold);
    border-radius: 999px;
    font-family: var(--font-heading);
    font-size: var(--font-size-xs);
    letter-spacing: 2px;
    cursor: pointer;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
}

.cover-audio-control:hover {
    background: rgba(201, 176, 101, 0.12);
    color: var(--color-text-primary);
    border-color: rgba(201, 176, 101, 0.55);
}
```

- [ ] **Step 4: Reposition the content as a lower-left overlay instead of a boxed hero**

Use this content block styling:

```css
.cover-content {
    position: relative;
    z-index: 1;
    width: min(520px, 100%);
    display: flex;
    flex-direction: column;
    gap: 28px;
    margin-bottom: clamp(8px, 2vh, 18px);
}
```

- [ ] **Step 5: Keep the title/actions readable over motion**

Retain the existing title and action classes, but update them to fit the fullscreen layout:

```css
.cover-title-wrap {
    display: flex;
    flex-direction: column;
    gap: 12px;
    animation: pageEnter 0.8s var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1)) both;
}

.cover-kicker {
    color: rgba(255, 240, 201, 0.82);
    letter-spacing: 4px;
    font-size: 13px;
}

.cover-title {
    font-family: var(--font-heading);
    font-size: clamp(4rem, 9vw, 7rem);
    line-height: 0.92;
    color: var(--color-accent-gold-light);
    letter-spacing: 14px;
}

.cover-subtitle {
    color: rgba(244, 238, 226, 0.92);
    line-height: 1.85;
    font-size: 15px;
    max-width: 460px;
}
```

- [ ] **Step 6: Preserve the difficulty panel, but make it feel like an overlay instead of a card dropped into a page**

Keep the current panel structure and add a more floating treatment:

```css
.cover-difficulty-panel {
    width: min(460px, 100%);
    padding: 24px;
    border-radius: 24px;
    display: flex;
    flex-direction: column;
    gap: 18px;
    background:
        linear-gradient(180deg, rgba(18, 19, 29, 0.82), rgba(11, 12, 18, 0.9)),
        var(--texture-ink);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid rgba(201, 176, 101, 0.18);
    box-shadow: 0 18px 36px rgba(0, 0, 0, 0.36);
}
```

- [ ] **Step 7: Add responsive tightening for mobile**

Append:

```css
@media (max-width: 640px) {
    .cover-page {
        padding: 20px 16px 28px;
        align-items: flex-end;
    }

    .cover-content {
        width: 100%;
        gap: 22px;
    }

    .cover-title {
        font-size: clamp(3.4rem, 18vw, 5rem);
        letter-spacing: 8px;
    }

    .cover-action,
    .cover-inline-btn {
        width: 100%;
    }

    .cover-difficulty-actions {
        flex-direction: column;
    }

    .cover-audio-control {
        top: 16px;
        right: 16px;
    }
}
```

## Task 6: Verify the test turns green and the build still works

**Files:**
- No code changes

- [ ] **Step 1: Run the focused app test**

Run:

```powershell
& npm.cmd test -- src/App.test.tsx
```

Expected:
- all tests in `src/App.test.tsx` pass

- [ ] **Step 2: Run the full test suite**

Run:

```powershell
& npm.cmd test
```

Expected:
- the suite passes at the project baseline, plus the new cover-shell assertion

- [ ] **Step 3: Run the production build**

Run:

```powershell
& npm.cmd build
```

Expected:
- Vite build completes successfully

- [ ] **Step 4: Manually verify the cover in the local preview**

Run:

```powershell
Invoke-WebRequest -Uri 'http://127.0.0.1:5173/' -UseBasicParsing | Select-Object -ExpandProperty StatusCode
```

Manual checks:
- the cover fills the entire viewport
- there is no top header during `COVER`
- the mute button floats at the top-right over the video
- the large title and main actions sit in the lower-left
- clicking `开始游戏` still reveals the difficulty panel in place

## Self-Review

### Spec coverage

- Fullscreen video wallpaper: covered by Task 3 and Task 5
- Remove top mini-title/header on cover: covered by Task 1 and Task 3
- Keep lower-left title and actions: covered by Task 4 and Task 5
- Keep difficulty interaction unchanged: covered by Task 4 and Task 5
- Keep floating mute button on video: covered by Task 1, Task 4, and Task 5
- Manual and automated verification: covered by Task 6

### Placeholder scan

- No `TODO` / `TBD`
- Each code-changing step includes exact code or command content
- No cross-task “similar to above” references for implementation details

### Type consistency

- `isCoverStep`, `app-cover-shell`, `app-content-cover`, and `cover-audio-control` are introduced consistently in the tasks above

## Notes for the current extracted workspace

- This local folder does not contain `.git`, so commit steps are intentionally omitted here.
- If implementation happens in the real repository worktree, commit after Task 3 and again after Task 6.
