# Cover, Save Flow, and Surface Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a proper cover screen with single-slot save/load flow, move difficulty selection to the cover, and polish round-start/court/settlement surface UX and copy without regressing current balance logic.

**Architecture:** Reuse the existing localStorage snapshot pipeline in `saveEngine.ts` and Zustand state in `gameStore.ts`, but move save/load decisions from the startup overlay into an explicit cover-page flow. Keep onboarding and balance logic intact while layering new entry/menu UI, richer round-start copy, and naming/scroll/NPC-reply polish on top.

**Tech Stack:** React 18, Zustand, TypeScript, Vite, Vitest, localStorage persistence, HTML5 video

---

## File Map

- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\types.ts`
  - Extend `PrologueStep` to support a dedicated cover/menu phase if needed.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\stores\gameStore.ts`
  - Add actions for entering cover, starting a new game from cover, loading save from cover, manual save, and return-to-menu.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\saveEngine.ts`
  - Keep the single-slot storage model, but expose helper(s) for “has save” checks if missing.
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\Cover\Cover.tsx`
  - New cover screen with video background, difficulty chips, start/load buttons.
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\Cover\Cover.css`
  - Cover layout and video styling.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\App.tsx`
  - Route startup into cover instead of resume overlay and wire global scroll reset/menu helpers.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\Prologue\Prologue.tsx`
  - Remove difficulty picker, add “垂帘听政五年” context.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\GameplayGuide\GameplayGuide.tsx`
  - Sync “天道结算” terminology.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\data\prologueContent.ts`
  - Update gameplay guide text and any guide strings that still use old labels.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\data\rounds.ts`
  - Maintain richer round-start briefings and ensure round-start copy source is correct.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\RoundStart\RoundStart.tsx`
  - Keep richer briefings, two-paragraph advisor copy with explicit labels.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\CourtView\CourtView.tsx`
  - Add station labels for military NPCs, court-card intel count, first-time dark-thread modal, and top-right save/menu buttons.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\CourtView\CourtView.css`
  - Support the new inline location labels and card info.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\SchemePanel.tsx`
  - Add top-right save/menu buttons and keep existing guide buttons aligned.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\RoundStart\RoundStart.css`
  - Support two advisor paragraphs cleanly.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemeFeedback\SchemeFeedback.tsx`
  - Keep “计谋回报” naming and tighten NPC reply prompt for longer minimum length.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\Settlement\Settlement.tsx`
  - Rename panel copy to “天道结算” and add save/menu controls.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\EmpressLetter\EmpressLetter.tsx`
  - Add save/menu controls.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\RoundEnd\RoundEnd.tsx`
  - Add save/menu controls if this page exposes the shared header pattern.
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\Prologue\Prologue.test.tsx`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\CourtView\CourtView.external-line.test.tsx`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\SchemePanel.onboarding.test.tsx`
- Create Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\Cover\Cover.test.tsx`
- Create Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\stores\gameStore.cover-save.test.ts`

### Task 1: Add Cover Step and Save/Menu Store Actions

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\types.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\saveEngine.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\stores\gameStore.ts`
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\stores\gameStore.cover-save.test.ts`

- [ ] **Step 1: Write the failing store test**

```ts
import { describe, expect, it, beforeEach } from 'vitest'
import { clearGameSnapshot, saveGameSnapshot } from '../game/saveEngine'
import { useGameStore } from './gameStore'

describe('cover save flow', () => {
  beforeEach(() => {
    localStorage.clear()
    useGameStore.getState().resetGame()
  })

  it('returns to the cover after saving the latest progress', () => {
    useGameStore.setState({ currentPhase: 'COURT_OBSERVE', prologueStep: 'GAMEPLAY' as never, currentRound: 4 })
    useGameStore.getState().returnToCoverWithSave()

    expect(useGameStore.getState().prologueStep).toBe('COVER')
    expect(localStorage.getItem('ningchen-save-v1')).toBeTruthy()
  })

  it('loads a saved snapshot from the cover flow', () => {
    saveGameSnapshot({
      version: 1,
      ...useGameStore.getState(),
      currentRound: 6,
      currentPhase: 'SCHEME_PHASE',
      prologueStep: 'GAMEPLAY' as never,
      roundStartSnapshot: null,
    } as never)

    useGameStore.getState().loadSavedGameFromCover()

    expect(useGameStore.getState().currentRound).toBe(6)
    expect(useGameStore.getState().currentPhase).toBe('SCHEME_PHASE')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm.cmd test -- src/stores/gameStore.cover-save.test.ts
```

Expected: FAIL because `COVER`, `returnToCoverWithSave`, or `loadSavedGameFromCover` do not exist yet.

- [ ] **Step 3: Add the minimal store and type support**

Update `types.ts` so `PrologueStep` supports a dedicated cover step. Add store actions in `gameStore.ts`:

```ts
type PrologueStep = 'COVER' | 'PROLOGUE' | 'GAMEPLAY_GUIDE' | 'GAMEPLAY'
```

```ts
saveCurrentGame: () => {
  const snapshot = buildPersistedSnapshot({
    ...get(),
    roundStartSnapshot: get().roundStartSnapshot,
  })
  if (snapshot) saveGameSnapshot(snapshot)
},

returnToCoverWithSave: () => {
  get().saveCurrentGame()
  set({
    prologueStep: 'COVER',
    helpOverlayOpen: false,
    helpOverlaySource: null,
  })
},

loadSavedGameFromCover: () => {
  const snapshot = loadGameSnapshot()
  if (!snapshot) return
  get().hydrateSnapshot(snapshot)
},
```

Also add a small helper in `saveEngine.ts` if useful:

```ts
export function hasSavedGame(): boolean {
  return loadGameSnapshot() !== null
}
```

- [ ] **Step 4: Run the new store test**

Run:

```powershell
npm.cmd test -- src/stores/gameStore.cover-save.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/game/types.ts src/game/saveEngine.ts src/stores/gameStore.ts src/stores/gameStore.cover-save.test.ts
git commit -m "feat: add cover save flow actions"
```

### Task 2: Build the Cover Screen and Remove Startup Resume Overlay

**Files:**
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\Cover\Cover.tsx`
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\Cover\Cover.css`
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\Cover\Cover.test.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\App.tsx`

- [ ] **Step 1: Write the failing cover test**

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { useGameStore } from '../../stores/gameStore'
import { Cover } from './Cover'

describe('Cover', () => {
  it('shows start and load actions with difficulty controls', () => {
    useGameStore.setState({ difficulty: 'normal', prologueStep: 'COVER' as never })
    const html = renderToStaticMarkup(<Cover />)

    expect(html).toContain('开始游戏')
    expect(html).toContain('加载存档')
    expect(html).toContain('简单')
    expect(html).toContain('地狱')
  })
})
```

- [ ] **Step 2: Run the cover test to verify it fails**

Run:

```powershell
npm.cmd test -- src/components/Cover/Cover.test.tsx
```

Expected: FAIL because the component does not exist yet.

- [ ] **Step 3: Implement the cover**

Create `Cover.tsx` with:

```tsx
const VIDEO_PATH = '/Users/happyelements/Desktop/513896983.mp4'
```

Use a local `<video autoPlay muted loop playsInline>` background and left-bottom actions. The component should:

- read current difficulty from store
- show `加载存档` disabled when `hasSavedGame()` is false
- call `startNewGameFromCover()` on start
- call `loadSavedGameFromCover()` on load

Update `App.tsx` so:

- there is no resume overlay anymore
- the initial render goes to `Cover` when `prologueStep === 'COVER'`
- startup no longer blocks on “found a save”

- [ ] **Step 4: Run the cover test**

Run:

```powershell
npm.cmd test -- src/components/Cover/Cover.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/Cover/Cover.tsx src/components/Cover/Cover.css src/components/Cover/Cover.test.tsx src/App.tsx
git commit -m "feat: add cover screen and load flow"
```

### Task 3: Move Difficulty Picker out of Prologue and Add North-Zhou Regency Context

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\Prologue\Prologue.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\Prologue\Prologue.test.tsx`

- [ ] **Step 1: Write the failing prologue test**

Add assertions that:

```tsx
expect(html).toContain('太后贺拔琪已垂帘听政五年')
expect(html).not.toContain('简单')
expect(html).not.toContain('地狱')
```

- [ ] **Step 2: Run the focused prologue test**

Run:

```powershell
npm.cmd test -- src/components/Prologue/Prologue.test.tsx
```

Expected: FAIL because difficulty chips still render and new copy is absent.

- [ ] **Step 3: Update the prologue page**

In `Prologue.tsx`:

- remove the difficulty panel entirely
- keep only the continuation CTA
- update the summary block so it mentions:

```tsx
太后贺拔琪已垂帘听政五年
```

- [ ] **Step 4: Re-run the focused prologue test**

Run:

```powershell
npm.cmd test -- src/components/Prologue/Prologue.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/Prologue/Prologue.tsx src/components/Prologue/Prologue.test.tsx
git commit -m "feat: streamline prologue after cover flow"
```

### Task 4: Add Shared In-Round Save and Return-to-Menu Buttons

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\RoundStart\RoundStart.tsx`
- Modify: `C:\Users\\happyelements\\Desktop\\佞臣 Demo\\.worktrees\\codex-difficulty-balance-inline\\佞臣_MuleRun Version\\src\\components\\CourtView\\CourtView.tsx`
- Modify: `C:\Users\\happyelements\\Desktop\\佞臣 Demo\\.worktrees\\codex-difficulty-balance-inline\\佞臣_MuleRun Version\\src\\components\\SchemePanel\\SchemePanel.tsx`
- Modify: `C:\Users\\happyelements\\Desktop\\佞臣 Demo\\.worktrees\\codex-difficulty-balance-inline\\佞臣_MuleRun Version\\src\\components\\EmpressLetter\\EmpressLetter.tsx`
- Modify: `C:\Users\\happyelements\\Desktop\\佞臣 Demo\\.worktrees\\codex-difficulty-balance-inline\\佞臣_MuleRun Version\\src\\components\\SchemeFeedback\\SchemeFeedback.tsx`
- Modify: `C:\Users\\happyelements\\Desktop\\佞臣 Demo\\.worktrees\\codex-difficulty-balance-inline\\佞臣_MuleRun Version\\src\\components\\Settlement\\Settlement.tsx`
- Modify: `C:\Users\\happyelements\\Desktop\\佞臣 Demo\\.worktrees\\codex-difficulty-balance-inline\\佞臣_MuleRun Version\\src\\components\\RoundEnd\\RoundEnd.tsx`
- Modify: `C:\Users\\happyelements\\Desktop\\佞臣 Demo\\.worktrees\\codex-difficulty-balance-inline\\佞臣_MuleRun Version\\src\\components\\SchemePanel\\SchemePanel.onboarding.test.tsx`

- [ ] **Step 1: Extend an existing page-level test**

Add assertions like:

```tsx
expect(html).toContain('存档')
expect(html).toContain('回到菜单')
```

on one page-level render test, such as `SchemePanel.onboarding.test.tsx`.

- [ ] **Step 2: Run the focused test to verify failure**

Run:

```powershell
npm.cmd test -- src/components/SchemePanel/SchemePanel.onboarding.test.tsx
```

Expected: FAIL because the new buttons do not render yet.

- [ ] **Step 3: Add the shared buttons to each in-round page**

Each page’s utility row should include:

```tsx
<button className="btn-help" onClick={saveCurrentGame}>存档</button>
<button className="btn-help" onClick={returnToCoverWithSave}>回到菜单</button>
<button className="btn-help" onClick={() => openGameplayGuide('gameplay')}>玩法说明</button>
```

Preserve any existing back button if already present.

- [ ] **Step 4: Re-run the focused test**

Run:

```powershell
npm.cmd test -- src/components/SchemePanel/SchemePanel.onboarding.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/RoundStart/RoundStart.tsx src/components/CourtView/CourtView.tsx src/components/SchemePanel/SchemePanel.tsx src/components/EmpressLetter/EmpressLetter.tsx src/components/SchemeFeedback/SchemeFeedback.tsx src/components/Settlement/Settlement.tsx src/components/RoundEnd/RoundEnd.tsx src/components/SchemePanel/SchemePanel.onboarding.test.tsx
git commit -m "feat: add save and menu controls to round pages"
```

### Task 5: Enrich Round-Start Copy and Split Advisor Copy into Labeled Paragraphs

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\data\rounds.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\campaignDisplayEngine.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\roundIntelEngine.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\RoundStart\RoundStart.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\RoundStart\RoundStart.css`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\campaignDisplayEngine.test.ts`

- [ ] **Step 1: Update or add the failing assertions**

In `campaignDisplayEngine.test.ts`, keep assertions for:

```ts
expect(display.summary).toContain('胜机')
expect(display.summary).toContain('僵持')
```

and ensure round 11 / 17 branch summaries cover `gained`, `stalemate`, and `failed`.

- [ ] **Step 2: Run the focused campaign display test**

Run:

```powershell
npm.cmd test -- src/game/campaignDisplayEngine.test.ts
```

Expected: FAIL until the new branch copy is finalized.

- [ ] **Step 3: Apply the richer round-start surface copy**

Use `ROUND_START_BRIEFINGS` in `rounds.ts`, with average length roughly 230-250 Chinese characters per round, derived from the user’s Word稿. In `RoundStart.tsx`, render:

```tsx
<p>冯道之密语【朝局】……</p>
<p>冯道之密语【外部军头】……</p>
```

Do not truncate lines with ellipses in `roundIntelEngine.ts`.

- [ ] **Step 4: Re-run the focused test**

Run:

```powershell
npm.cmd test -- src/game/campaignDisplayEngine.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/data/rounds.ts src/game/campaignDisplayEngine.ts src/game/roundIntelEngine.ts src/components/RoundStart/RoundStart.tsx src/components/RoundStart/RoundStart.css src/game/campaignDisplayEngine.test.ts
git commit -m "feat: enrich round start copy and advisor hints"
```

### Task 6: Polish Court View Cards and Add First-Time Dark-Thread Teaching

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\CourtView\CourtView.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\CourtView\CourtView.css`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\data\prologueContent.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\CourtView\CourtView.external-line.test.tsx`

- [ ] **Step 1: Extend the existing court view test**

Add assertions for:

```tsx
expect(html).toContain('朝堂局势：先辨阵营，再锁人心')
expect(html).toContain('暗线已明')
expect(html).toContain('驻地')
```

- [ ] **Step 2: Run the focused court-view test**

Run:

```powershell
npm.cmd test -- src/components/CourtView/CourtView.external-line.test.tsx
```

Expected: FAIL until the new card fields exist.

- [ ] **Step 3: Implement the card polish**

In `CourtView.tsx`:

- remove the page-mission strip
- remove explanatory subhead copy under the two major sections
- add station labels for military NPCs directly to card meta
- show `暗线已明：${intelProgress[npc.id] ?? 0}/${npc.secretThreads.length}`
- add a first-time modal using `FirstRoundGuideModal` or the existing onboarding modal pattern for the “试探揭暗线” explanation

- [ ] **Step 4: Re-run the focused court-view test**

Run:

```powershell
npm.cmd test -- src/components/CourtView/CourtView.external-line.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/CourtView/CourtView.tsx src/components/CourtView/CourtView.css src/data/prologueContent.ts src/components/CourtView/CourtView.external-line.test.tsx
git commit -m "feat: clarify court cards and dark-thread teaching"
```

### Task 7: Unify Naming and Restore Longer NPC Feedback

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\GameplayGuide\GameplayGuide.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\data\prologueContent.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemeFeedback\SchemeFeedback.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\SchemePanel.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\Settlement\Settlement.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\RoundEnd\RoundEnd.tsx`

- [ ] **Step 1: Add or update a feedback-oriented assertion**

Add a small test expectation or snapshot string for:

```tsx
expect(html).toContain('计谋回报')
expect(html).toContain('天道结算')
```

in the relevant existing component test file if one exists, otherwise extend a nearby test file already covering these views.

- [ ] **Step 2: Run the focused test**

Run:

```powershell
npm.cmd test -- src/components/SchemePanel/SchemePanel.onboarding.test.tsx
```

Expected: FAIL until naming and prompt settings are updated.

- [ ] **Step 3: Update copy and prompt softness**

In `SchemeFeedback.tsx` and `SchemePanel.tsx`, keep the higher token ceiling and add prompt guidance like:

```ts
// NPC feedback should usually be 2-4 sentences and land closer to 90-160 Chinese characters.
```

Also rename:

- `暗线回报` -> `计谋回报`
- `天道判官卷` / `天道判官` -> `天道结算`

Remove the extra “这一页不是结束……” copy in round-end if still present.

- [ ] **Step 4: Re-run the focused test**

Run:

```powershell
npm.cmd test -- src/components/SchemePanel/SchemePanel.onboarding.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/GameplayGuide/GameplayGuide.tsx src/data/prologueContent.ts src/components/SchemeFeedback/SchemeFeedback.tsx src/components/SchemePanel/SchemePanel.tsx src/components/Settlement/Settlement.tsx src/components/RoundEnd/RoundEnd.tsx
git commit -m "feat: unify settlement naming and restore fuller npc replies"
```

### Task 8: Full Verification

**Files:**
- No code changes expected unless verification reveals regressions.

- [ ] **Step 1: Run the full test suite**

Run:

```powershell
npm.cmd test
```

Expected: all existing tests pass.

- [ ] **Step 2: Run the production build**

Run:

```powershell
npm.cmd run build
```

Expected: build completes successfully.

- [ ] **Step 3: Manual smoke checklist**

Run:

```powershell
npm.cmd run dev -- --host 0.0.0.0
```

Then verify:

- cover shows video background
- start game uses selected difficulty
- load save works only when a save exists
- save and return-to-menu work from at least `ROUND_START`, `COURT_OBSERVE`, and `SCHEME_PHASE`
- round start shows longer briefings and labeled two-paragraph advisor hints
- court page shows station labels and dark-thread info
- settlement naming shows `天道结算`

- [ ] **Step 4: Commit any final test-fix adjustments**

```powershell
git add -A
git commit -m "test: verify cover save and surface polish flow"
```

## Self-Review

- Spec coverage:
  - Cover + single save flow: covered in Tasks 1-2 and 4.
  - Move difficulty to cover: covered in Tasks 2-3.
  - Round-start richer copy + advisor split: covered in Task 5.
  - Court view card and dark-thread teaching: covered in Task 6.
  - Naming and NPC reply length: covered in Task 7.
- Placeholder scan:
  - No `TODO` / `TBD` placeholders remain.
- Type consistency:
  - New flow uses `COVER`, `saveCurrentGame`, `returnToCoverWithSave`, and `loadSavedGameFromCover` consistently across tasks.

