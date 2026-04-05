# Scheme Semantics UI Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align scheme names, player-facing definitions, and onboarding copy so `frame` is understood as “设局嫁祸”, while `omen` is clearly distinguished from `alienate`.

**Architecture:** Keep the existing settlement mechanics and single-target interaction model. Implement this as a player-language and teaching pass across scheme metadata, in-UI labels, helper copy, onboarding copy, and tests. Avoid touching core balance formulas in this plan.

**Tech Stack:** React, TypeScript, Vitest, Vite, static content modules

---

## File Map

- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\data\schemes.ts`
  - Player-facing names and descriptions for schemes.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\SchemePanel.tsx`
  - Scheme labels and contextual helper copy shown while picking schemes.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemeFeedback\SchemeFeedback.tsx`
  - Scheme name shown in feedback cards.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\schemeEngine.ts`
  - Internal display name map used in generated feedback text.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\ai\prompts.ts`
  - Parse prompt labels and wording for `frame` / `omen`.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\npcPromptContext.ts`
  - Scheme name labels referenced in NPC context summaries.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\data\prologueContent.ts`
  - Gameplay-guide copy that defines what each scheme means.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\omenGuide.ts`
  - First-omen modal and inline hints; explicitly distinguish `谶纬` from `离间`.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\liveBalance\sampleLibrary.ts`
  - Replace `frame` sample language with “设局嫁祸” mental model where needed.
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\SchemePanel.test.tsx`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\ai\prompts.test.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\data\prologueContent.test.ts` (create if needed)
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\omenGuide.test.ts`

### Task 1: Rename `frame` for players and keep mechanics untouched

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\data\schemes.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\SchemePanel.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemeFeedback\SchemeFeedback.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\schemeEngine.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\npcPromptContext.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\SchemePanel.test.tsx`

- [ ] **Step 1: Write/update the failing UI expectation**

Add an assertion like:

```tsx
it('shows frame as 设局嫁祸 in the scheme picker', () => {
  render(<SchemePanel {...propsWithFrameUnlocked} />)
  expect(screen.getByText('设局嫁祸')).toBeInTheDocument()
  expect(screen.queryByText('放风构陷')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```powershell
npx.cmd vitest run "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\SchemePanel.test.tsx"
```

Expected: FAIL because current UI still renders `放风构陷`.

- [ ] **Step 3: Update player-facing labels**

Apply these exact wording changes:

```ts
// schemes.ts
{
  type: 'frame',
  name: '设局嫁祸',
  description: '诱其失言、失态或误判，使其自己背上嫌疑',
  trustThreshold: 50,
  riskLevel: 'high',
  needsSecondTarget: false,
}
```

```ts
// shared label maps
frame: '设局嫁祸'
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run the same command as Step 2.  
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git -C "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version" add src\data\schemes.ts src\components\SchemePanel\SchemePanel.tsx src\components\SchemeFeedback\SchemeFeedback.tsx src\game\schemeEngine.ts src\game\npcPromptContext.ts src\components\SchemePanel\SchemePanel.test.tsx
git -C "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version" commit -m "feat: rename frame to setup scapegoat in player UI"
```

### Task 2: Clarify `omen` vs `alienate` in onboarding and scheme helper copy

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\data\prologueContent.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\SchemePanel.tsx`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\Prologue\Prologue.test.tsx`

- [ ] **Step 1: Add a failing guide assertion**

Add an assertion like:

```tsx
expect(screen.getByText(/谶纬不是直接挑拨谁和谁/)).toBeInTheDocument()
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```powershell
npx.cmd vitest run "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\Prologue\Prologue.test.tsx"
```

Expected: FAIL because the guide does not yet contain the new distinction.

- [ ] **Step 3: Add exact player-language distinctions**

Add copy equivalent to:

```ts
// prologueContent.ts
'离间，是直接撬开两人或两股势力的裂缝。'
'谶纬，不是直接挑拨谁和谁，而是借灾异、天命与名分，改变对方对局势正当性的理解。'
'若只是让人猜忌谁会先甩锅，更像离间；若是借天命与灾异动摇名分，更像谶纬。'
```

And in scheme helper copy:

```tsx
// SchemePanel helper
谶纬更适合写灾异、天命、名分与法统裂缝；离间更适合写责任、猜忌与甩锅。
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run the same command as Step 2.  
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git -C "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version" add src\data\prologueContent.ts src\components\SchemePanel\SchemePanel.tsx src\components\Prologue\Prologue.test.tsx
git -C "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version" commit -m "feat: clarify omen versus alienate in player guidance"
```

### Task 3: Update first-omen teaching to match the new semantic boundary

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\omenGuide.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\omenGuide.test.ts`

- [ ] **Step 1: Add a failing omen-guide assertion**

Add an assertion like:

```ts
expect(modal.body).toContain('先写征兆，再写名分裂缝')
expect(modal.body).toContain('若只是写谁会害谁，那更像离间')
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```powershell
npx.cmd vitest run "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\omenGuide.test.ts"
```

Expected: FAIL because the guide text does not yet contain the new explanation.

- [ ] **Step 3: Rewrite the omen guide text**

Update the guide copy to include:

```ts
'谶纬不是普通离间。'
'先写灾异、天命或征兆，再指出名分与法统哪里出了裂缝。'
'若只是说某人会害你、会甩锅，那更像离间。'
'适合写给位置敏感、名分焦虑强、靠近中枢的人。'
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run the same command as Step 2.  
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git -C "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version" add src\game\omenGuide.ts src\game\omenGuide.test.ts
git -C "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version" commit -m "feat: strengthen omen teaching copy"
```

### Task 4: Align parse prompt labels with the new player language

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\ai\prompts.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\ai\prompts.test.ts`

- [ ] **Step 1: Add failing prompt assertions**

Add assertions like:

```ts
expect(prompt).toContain('本次计谋类型：设局嫁祸')
expect(prompt).toContain('若只是泛泛挑拨谁会害谁，更像离间，不应据此给谶纬高分')
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```powershell
npx.cmd vitest run "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\ai\prompts.test.ts"
```

Expected: FAIL because the prompt still uses the old labels/cautions.

- [ ] **Step 3: Update scheme labels and scheme-specific cautions**

Update the prompt generation rules to include:

```ts
frame: '设局嫁祸'
```

And add caution text equivalent to:

```ts
'设局嫁祸要求能看出如何诱其失言、失态或误判，并令其本人背上嫌疑。'
'若谶纬文本只是泛泛说谁会害谁、谁会甩锅，应按离间理解，不应给谶纬高分。'
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run the same command as Step 2.  
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git -C "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version" add src\ai\prompts.ts src\ai\prompts.test.ts
git -C "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version" commit -m "feat: align parse prompts with scheme semantics"
```

### Task 5: Update sample-library language so future live-balance tests match the new semantics

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\liveBalance\sampleLibrary.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\liveBalance\sampleLibrary.test.ts`

- [ ] **Step 1: Add failing sample assertions**

Add assertions like:

```ts
expect(allFrameSamples.join('\n')).not.toContain('放风构陷')
expect(omenSamples.join('\n')).toContain('天命')
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```powershell
npx.cmd vitest run "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\liveBalance\sampleLibrary.test.ts"
```

Expected: FAIL because the sample wording has not been normalized yet.

- [ ] **Step 3: Rewrite only the wording, not the route structure**

For `frame` examples, replace “放风构陷” mental-model language with wording that feels like:

```ts
'先别急着替自己分辩，朝上若有人顺着这层口风往下查，你反倒最说不清。'
'真把这件事解释得太快，旁人只会觉得你心里有鬼。'
```

For `omen`, ensure representative lines include:

```ts
'灾异既著，恐怕不是寻常年成，而是名分失序之兆。'
'若朝中仍有人越分而断，民间自会把天意与人事连在一起。'
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run the same command as Step 2.  
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git -C "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version" add src\game\liveBalance\sampleLibrary.ts src\game\liveBalance\sampleLibrary.test.ts
git -C "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version" commit -m "chore: align live balance samples with scheme semantics"
```

### Task 6: Full verification and smoke pass

**Files:**
- Verify only; no new files required

- [ ] **Step 1: Run targeted unit tests**

Run:

```powershell
npx.cmd vitest run "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\SchemePanel.test.tsx" "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\Prologue\Prologue.test.tsx" "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\omenGuide.test.ts" "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\ai\prompts.test.ts" "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\liveBalance\sampleLibrary.test.ts"
```

Expected: PASS.

- [ ] **Step 2: Run full test suite**

Run:

```powershell
npx.cmd vitest run
```

Expected: PASS with existing skipped tests unchanged.

- [ ] **Step 3: Run production build**

Run:

```powershell
npm.cmd run build
```

Expected: Vite build completes successfully.

- [ ] **Step 4: Optional live smoke**

Run:

```powershell
npm.cmd run balance:live-ai -- --sample average-mainline --sample average-omen
```

Expected: successful report generation; no assertion on win/loss, only confirm labels and prompt wording no longer drift.

- [ ] **Step 5: Final commit**

```powershell
git -C "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version" add src\data\schemes.ts src\components\SchemePanel\SchemePanel.tsx src\components\SchemeFeedback\SchemeFeedback.tsx src\game\schemeEngine.ts src\game\npcPromptContext.ts src\data\prologueContent.ts src\game\omenGuide.ts src\ai\prompts.ts src\game\liveBalance\sampleLibrary.ts src\components\SchemePanel\SchemePanel.test.tsx src\components\Prologue\Prologue.test.tsx src\game\omenGuide.test.ts src\ai\prompts.test.ts src\game\liveBalance\sampleLibrary.test.ts
git -C "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version" commit -m "feat: align scheme semantics with player-facing ui"
```
