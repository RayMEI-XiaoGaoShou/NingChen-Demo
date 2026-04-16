# Omen Guidance Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the first-use teaching and in-flow writing support for `omen` so players better understand how to write it and who to use it on, without changing omen balance formulas.

**Architecture:** Keep the current dual-input omen flow and polarity settlement intact. Implement the work as a pure experience-layer upgrade across three surfaces: the first omen teaching modal, the SchemePanel omen input UI, and Feng Daozhi's omen-specific drafting copy. Use existing content/data-driven patterns in `prologueContent.ts`, reuse current modal components where possible, and avoid touching omen scoring logic in `schemeEngine.ts`.

**Tech Stack:** React, TypeScript, Zustand, Vitest, existing onboarding modal components, existing Feng Daozhi advisor flow.

---

### Task 1: Expand omen teaching content into a practical "battle card"

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\data\prologueContent.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\SchemePanel.onboarding.test.tsx`

- [ ] **Step 1: Write the failing test expectation for richer omen teaching copy**

Update the onboarding test so it expects the first omen modal content to expose:

```ts
expect(FIRST_OMEN_TEACHING_CONTENT.steps).toEqual(
  expect.arrayContaining([
    expect.stringContaining('先给'),
    expect.stringContaining('解释'),
    expect.stringContaining('暗示'),
  ]),
)
expect(FIRST_OMEN_TEACHING_CONTENT.impactNotes).toEqual(
  expect.arrayContaining([
    expect.stringContaining('北周治理'),
    expect.stringContaining('稳局'),
  ]),
)
```

- [ ] **Step 2: Run the focused onboarding test to verify the new expectations fail**

Run:

```powershell
npm.cmd test -- src/components/SchemePanel/SchemePanel.onboarding.test.tsx
```

Expected: FAIL because the current omen content is still too close to a general explanation page.

- [ ] **Step 3: Rewrite the omen teaching content into a tactical structure**

In `src/data/prologueContent.ts`, update `FIRST_OMEN_TEACHING_CONTENT` so it contains:

```ts
export const FIRST_OMEN_TEACHING_CONTENT = {
  title: '谶（chen）纬初解',
  intro: '谶纬不是普通挑拨，而是借征兆、灾异与天命解释去动摇他人对眼前秩序是否合法的判断。',
  steps: [
    '先写一条征兆、异象或谶辞。',
    '再解释这意味着哪一处名分、法统或秩序裂缝。',
    '最后暗示谁最该警惕，而不是直接点名定罪。',
  ],
  audienceHints: [
    '更适合身在宫廷中枢、对名分与法统敏感的人。',
    '若对方更偏军政务实，谶纬往往不是最优先手。',
  ],
  goodExample: {
    omen: '石人一只眼，挑动黄河天下反。',
    interpretation:
      '这不只是孤异怪谈，恐是朝中名分失序、越分侵权之兆。若仍有人借天命自重，朝野迟早会把灾异与人事连在一处。',
  },
  badExample: {
    omen: '最近天意不太好。',
    interpretation: '大家最好都小心一点。',
  },
  impactNotes: [
    '借征兆放大合法性裂缝时，北周治理、秩序与法统会受损。',
    '若你反把灾异解释成修德安民之机，可能会帮北周稳局。',
  ],
} as const
```

Also add a short `badExampleWhy` or equivalent string if the current modal structure needs a direct explanation line for the negative example.

- [ ] **Step 4: Run the focused onboarding test again**

Run:

```powershell
npm.cmd test -- src/components/SchemePanel/SchemePanel.onboarding.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add "src/data/prologueContent.ts" "src/components/SchemePanel/SchemePanel.onboarding.test.tsx"
git commit -m "feat: expand omen teaching content"
```

### Task 2: Redesign the omen teaching modal to present tactical guidance clearly

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\OmenTeachingModal.tsx`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\SchemePanel.onboarding.test.tsx`

- [ ] **Step 1: Add a rendering test for the new omen modal sections**

Extend the onboarding test to assert the modal now renders:

```ts
expect(screen.getByText(/谶（chen）纬初解/)).toBeInTheDocument()
expect(screen.getByText(/更适合身在宫廷中枢/)).toBeInTheDocument()
expect(screen.getByText(/石人一只眼/)).toBeInTheDocument()
expect(screen.getByText(/大家最好都小心一点/)).toBeInTheDocument()
```

- [ ] **Step 2: Run the focused test to verify the modal layout test fails**

Run:

```powershell
npm.cmd test -- src/components/SchemePanel/SchemePanel.onboarding.test.tsx
```

Expected: FAIL because `OmenTeachingModal.tsx` does not yet render the new fields.

- [ ] **Step 3: Update the omen modal component to render tactical sections**

Refactor `src/components/SchemePanel/OmenTeachingModal.tsx` to render:

```tsx
<p>{content.intro}</p>
<ol>{content.steps.map(...)}</ol>
<div className="omen-teaching-section">
  <h4>更适合谁</h4>
  <ul>{content.audienceHints.map(...)}</ul>
</div>
<div className="omen-teaching-example good">...</div>
<div className="omen-teaching-example bad">...</div>
<ul>{content.impactNotes.map(...)}</ul>
```

Do not add a new modal component. Keep using the current `OmenTeachingModal`.

- [ ] **Step 4: Run the onboarding test again**

Run:

```powershell
npm.cmd test -- src/components/SchemePanel/SchemePanel.onboarding.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add "src/components/SchemePanel/OmenTeachingModal.tsx" "src/components/SchemePanel/SchemePanel.onboarding.test.tsx"
git commit -m "feat: redesign omen teaching modal"
```

### Task 3: Add omen-specific writing scaffolding in the SchemePanel input area

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\SchemePanel.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\SchemePanel.css`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\SchemePanel.test.tsx`

- [ ] **Step 1: Add a failing UI test for omen writing scaffolding**

Extend `SchemePanel.test.tsx` with a case that selects `omen` and expects:

```tsx
expect(screen.getByText(/可写：天灾异象、民间谶语、星变河象/)).toBeInTheDocument()
expect(screen.getByText(/解释裂缝，再暗示谁最该警惕/)).toBeInTheDocument()
```

- [ ] **Step 2: Run the focused SchemePanel test to verify failure**

Run:

```powershell
npm.cmd test -- src/components/SchemePanel/SchemePanel.test.tsx
```

Expected: FAIL because the omen helper copy is not yet rendered.

- [ ] **Step 3: Add omen-specific helper blocks beside the dual inputs**

In `src/components/SchemePanel/SchemePanel.tsx`, under the `omen` input branch, render two helper blocks:

```tsx
<div className="omen-helper-card">
  <div className="omen-helper-title">征兆可以这样写</div>
  <p>可写：天灾异象、民间谶语、星变河象、礼制失常、龙气外泄。</p>
</div>
<div className="omen-helper-card">
  <div className="omen-helper-title">解释时要做两件事</div>
  <p>解释裂缝，再暗示谁最该警惕；不要直接写成普通挑拨或普通献策。</p>
</div>
```

In `src/components/SchemePanel/SchemePanel.css`, add minimal styles:

```css
.omen-helper-card {
  border: 1px solid rgba(212, 180, 94, 0.24);
  background: rgba(255, 245, 220, 0.06);
  border-radius: 12px;
  padding: 10px 12px;
}

.omen-helper-title {
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #d4b45e;
}
```

- [ ] **Step 4: Run the focused SchemePanel test again**

Run:

```powershell
npm.cmd test -- src/components/SchemePanel/SchemePanel.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add "src/components/SchemePanel/SchemePanel.tsx" "src/components/SchemePanel/SchemePanel.css" "src/components/SchemePanel/SchemePanel.test.tsx"
git commit -m "feat: add omen writing scaffolds"
```

### Task 4: Add target-fit hints for omen based on the selected NPC

**Files:**
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\omenTargetHint.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\omenTargetHint.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\SchemePanel.tsx`

- [ ] **Step 1: Write a failing unit test for omen target hints**

Create `src/game/omenTargetHint.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildOmenTargetHint } from './omenTargetHint'

describe('buildOmenTargetHint', () => {
  it('prefers legitimacy-sensitive central figures', () => {
    const hint = buildOmenTargetHint({
      npc: {
        id: 'zong-ai',
        name: '宗艾',
        powerBase: 'court',
        factionId: 'emperor',
        publicStance: '掌诏令与中枢节次',
        title: '中书令',
      } as any,
    })

    expect(hint).toContain('名分')
  })

  it('warns when the target is more practical than symbolic', () => {
    const hint = buildOmenTargetHint({
      npc: {
        id: 'linghu',
        name: '令狐律光',
        powerBase: 'court',
        factionId: 'emperor',
        publicStance: '务实治军',
        title: '大都督',
      } as any,
    })

    expect(hint).toContain('未必是最优先手')
  })
})
```

- [ ] **Step 2: Run the new unit test to verify failure**

Run:

```powershell
npm.cmd test -- src/game/omenTargetHint.test.ts
```

Expected: FAIL because the helper does not exist yet.

- [ ] **Step 3: Implement a focused omen target hint helper**

Create `src/game/omenTargetHint.ts`:

```ts
import type { NPC } from './types'

export function buildOmenTargetHint(input: { npc: Pick<NPC, 'name' | 'title' | 'powerBase' | 'publicStance' | 'factionId'> }): string {
  const text = `${input.npc.title} ${input.npc.publicStance}`
  const legitimacySensitive =
    input.npc.powerBase === 'court' &&
    /中枢|诏令|太后|皇帝|宫中|法统|名分|摄政|燕王/.test(text)

  if (legitimacySensitive) {
    return '此人身在中枢，对名分与法统压力更敏感，谶纬较易生效。'
  }

  return '此人更偏军政务实，谶纬未必是最优先手。'
}
```

- [ ] **Step 4: Render the hint in the SchemePanel omen section**

In `src/components/SchemePanel/SchemePanel.tsx`:

```tsx
import { buildOmenTargetHint } from '../../game/omenTargetHint'

const omenTargetHint =
  selectedScheme === 'omen' && selectedNpc
    ? buildOmenTargetHint({ npc: selectedNpc })
    : null
```

Then render:

```tsx
{omenTargetHint && (
  <div className="omen-helper-card omen-target-fit">
    <div className="omen-helper-title">此人是否适合吃谶纬</div>
    <p>{omenTargetHint}</p>
  </div>
)}
```

- [ ] **Step 5: Run the new unit test and the focused panel test**

Run:

```powershell
npm.cmd test -- src/game/omenTargetHint.test.ts
npm.cmd test -- src/components/SchemePanel/SchemePanel.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add "src/game/omenTargetHint.ts" "src/game/omenTargetHint.test.ts" "src/components/SchemePanel/SchemePanel.tsx"
git commit -m "feat: add omen target fit hints"
```

### Task 5: Make Feng Daozhi’s omen help teach structure instead of only returning a full draft

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\fengDaozhiAdvisor.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\FengDaozhiAssistPanel.tsx`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\fengDaozhiAdvisor.test.ts`

- [ ] **Step 1: Add a failing advisor test for omen-specific explanation**

Extend `fengDaozhiAdvisor.test.ts` with:

```ts
expect(result.primaryText.length).toBeGreaterThan(0)
expect(result.secondaryText?.length).toBeGreaterThan(0)
expect(result.reasoning).toContain('此人')
```

using an `omen` request context.

- [ ] **Step 2: Run the focused advisor test to verify failure**

Run:

```powershell
npm.cmd test -- src/game/fengDaozhiAdvisor.test.ts
```

Expected: FAIL because omen drafts do not yet enforce explanatory guidance.

- [ ] **Step 3: Update Feng Daozhi omen drafting to include target rationale**

In `src/game/fengDaozhiAdvisor.ts`, when `schemeType === 'omen'`, ensure the result includes:

```ts
return {
  primaryText: omenLine,
  secondaryText: interpretationLine,
  reasoning: `${npc.name}身在${positionLabel}，更容易被名分与法统压力牵动。`,
}
```

Do not expose hidden information. Only use the current round, selected NPC public context, and already player-visible pressure.

- [ ] **Step 4: Surface the omen-specific reasoning in the assist panel**

In `src/components/SchemePanel/FengDaozhiAssistPanel.tsx`, if the draft has `reasoning`, render it below the draft body:

```tsx
{draftPreview?.reasoning && (
  <p className="feng-assist-reasoning">{draftPreview.reasoning}</p>
)}
```

Add a small style rule if the file already owns its styling; otherwise reuse existing panel typography.

- [ ] **Step 5: Run the advisor test again**

Run:

```powershell
npm.cmd test -- src/game/fengDaozhiAdvisor.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add "src/game/fengDaozhiAdvisor.ts" "src/game/fengDaozhiAdvisor.test.ts" "src/components/SchemePanel/FengDaozhiAssistPanel.tsx"
git commit -m "feat: teach omen structure through feng daozhi"
```

### Task 6: Full verification and regression sweep

**Files:**
- Verify only

- [ ] **Step 1: Run the focused omen-related test set**

Run:

```powershell
npm.cmd test -- src/components/SchemePanel/SchemePanel.onboarding.test.tsx
npm.cmd test -- src/components/SchemePanel/SchemePanel.test.tsx
npm.cmd test -- src/game/omenGuide.test.ts
npm.cmd test -- src/game/omenTargetHint.test.ts
npm.cmd test -- src/game/fengDaozhiAdvisor.test.ts
```

Expected: PASS for all.

- [ ] **Step 2: Run the full test suite**

Run:

```powershell
npm.cmd test
```

Expected: PASS with the existing global suite.

- [ ] **Step 3: Run production build**

Run:

```powershell
npm.cmd run build
```

Expected: successful TypeScript compile and Vite build.

- [ ] **Step 4: Optional smoke check for the live path**

Run only if DS network is stable:

```powershell
npm.cmd run balance:live-ai -- --sample average-omen
```

Expected: complete successfully; result is for observation only, not a balance gate for this task.

- [ ] **Step 5: Commit the verification state**

```powershell
git add .
git commit -m "test: verify omen guidance experience"
```

Use a narrower `git add` if unrelated working tree changes are present.

## Self-Review

### Spec coverage

This plan covers every spec section:

- First omen modal as a tactical card: Task 1 + Task 2
- In-flow writing scaffolding: Task 3
- Target-fit hinting: Task 4
- Feng Daozhi as structure teacher: Task 5
- Regression and build verification: Task 6

### Placeholder scan

Checked for:

- `TODO`
- `TBD`
- vague “add validation”
- vague “write tests”

None remain. Each task includes file paths, commands, and concrete code snippets.

### Type consistency

Consistent names used throughout:

- `FIRST_OMEN_TEACHING_CONTENT`
- `buildOmenTargetHint`
- `reasoning`
- `OmenTeachingModal`
- `FengDaozhiAssistPanel`

No later task introduces a conflicting name for the same concept.
