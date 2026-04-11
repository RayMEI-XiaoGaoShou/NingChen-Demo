# Frame And Omen Special Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated trap/scapegoat parse layer for `frame`, and implement a two-stage omen input flow that captures omen text plus explanation/targeting for clearer AI parsing and player understanding.

**Architecture:** Keep the existing round/state machine and settlement pipeline. Extend scheme parsing data structures for `frame`, introduce a scheme-specific `omen` input shape at the UI/store layer, normalize it into AI parse prompts, and preserve backward compatibility for live-balance scripts by adapting them into the new omen format inside the harness.

**Tech Stack:** React, TypeScript, Zustand, Vitest, Vite

---

## File Map

- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\types.ts`
  - Add `frame` specialist parse fields and omen input structure.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\SchemePanel.tsx`
  - Add omen two-step inputs and `frame` helper copy.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\SchemePanel.css`
  - Support omen dual-input layout and helper text.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\stores\gameStore.ts`
  - Persist omen structured inputs in submitted actions.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\aiNativeEngine.ts`
  - Parse omen dual-input and `frame` specialist fields; fallback support.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\ai\prompts.ts`
  - Update parse prompt schema and omen-specific prompt structure.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\schemeEngine.ts`
  - Use `selfTrapPotential` and `scapegoatClarity` in `frame` settlement.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\liveBalance\sampleLibrary.ts`
  - Convert omen samples to the two-stage structure.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\liveBalance\liveParseRunner.ts`
  - Adapt harness to submit omen two-stage text.
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\SchemePanel.test.tsx`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\aiNativeEngine.test.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\ai\prompts.test.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\schemeEngine.test.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\liveBalance\sampleLibrary.test.ts`

### Task 1: Add structured omen input and `frame` specialist parse fields

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\types.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\aiNativeEngine.test.ts`

- [ ] **Step 1: Write the failing type-driven test**

Add a test that expects normalized north parse results to preserve `frame` specialist fields and omen-specific fields:

```ts
it('normalizes frame specialist fields and omen specialist fields', () => {
  const normalized = normalizeNorthSchemeParse({
    selfTrapPotential: 0.72,
    scapegoatClarity: 0.64,
    omenAnchorStrength: 0.81,
    legitimacyCrack: 0.75,
    suspicionDirection: 0.58,
  } as any)

  expect(normalized.selfTrapPotential).toBeCloseTo(0.72, 2)
  expect(normalized.scapegoatClarity).toBeCloseTo(0.64, 2)
  expect(normalized.omenAnchorStrength).toBeCloseTo(0.81, 2)
  expect(normalized.legitimacyCrack).toBeCloseTo(0.75, 2)
  expect(normalized.suspicionDirection).toBeCloseTo(0.58, 2)
})
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```powershell
npx.cmd vitest run "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\aiNativeEngine.test.ts"
```

Expected: FAIL because these fields do not exist yet.

- [ ] **Step 3: Add the new types**

Add exact fields to `NorthSchemeParseResult` and an omen input object:

```ts
export interface OmenSpeechInput {
  omenText: string
  interpretationText: string
}

export interface NorthSchemeParseResult {
  // existing fields...
  selfTrapPotential?: number
  scapegoatClarity?: number
  omenAnchorStrength?: number
  legitimacyCrack?: number
  suspicionDirection?: number
}

export interface SchemeAction {
  // existing fields...
  omenSpeechInput?: OmenSpeechInput
}
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run the same command as Step 2.  
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git -C "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version" add src\game\types.ts src\game\aiNativeEngine.test.ts
git -C "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version" commit -m "feat: add frame and omen specialist parse fields"
```

### Task 2: Implement the omen two-stage UI flow

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\SchemePanel.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\SchemePanel.css`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\SchemePanel.test.tsx`

- [ ] **Step 1: Write the failing UI test**

Add a test like:

```tsx
it('shows dual omen inputs when omen is selected', () => {
  render(<SchemePanel {...propsWithOmenSelected} />)
  expect(screen.getByLabelText('谶辞 / 征兆')).toBeInTheDocument()
  expect(screen.getByLabelText('解释 / 指向')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```powershell
npx.cmd vitest run "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\SchemePanel.test.tsx"
```

Expected: FAIL because omen still uses a single text input.

- [ ] **Step 3: Add the dual input UI**

Implement exact labels and helper text:

```tsx
{selectedScheme?.type === 'omen' ? (
  <div className="omen-inputs">
    <label>
      <span>谶辞 / 征兆</span>
      <textarea value={omenText} onChange={...} />
    </label>
    <label>
      <span>解释 / 指向</span>
      <textarea value={interpretationText} onChange={...} />
    </label>
    <p className="speech-tip">
      先给征兆，再解其意，最后暗示谁最该警惕。
    </p>
  </div>
) : (
  // existing single-input branch
)}
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run the same command as Step 2.  
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git -C "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version" add src\components\SchemePanel\SchemePanel.tsx src\components\SchemePanel\SchemePanel.css src\components\SchemePanel\SchemePanel.test.tsx
git -C "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version" commit -m "feat: add two-stage omen input flow"
```

### Task 3: Thread omen two-stage input through store submission

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\stores\gameStore.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\stores\gameStore.test.ts`

- [ ] **Step 1: Write the failing store test**

Add a test like:

```ts
it('stores omen structured input on scheme submission', () => {
  const action = submitOmenAction({
    targetNpcId: 'zongai',
    omenText: '石人一只眼，挑动黄河天下反',
    interpretationText: '此非独天灾，恐是名分失序之兆。',
  })

  expect(action.omenSpeechInput).toEqual({
    omenText: '石人一只眼，挑动黄河天下反',
    interpretationText: '此非独天灾，恐是名分失序之兆。',
  })
})
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```powershell
npx.cmd vitest run "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\stores\gameStore.test.ts"
```

Expected: FAIL because the store does not yet persist the new omen payload.

- [ ] **Step 3: Update submission logic**

Ensure scheme submission does:

```ts
const playerSpeech =
  schemeType === 'omen'
    ? `${omenText}\n\n${interpretationText}`
    : speech

const action: SchemeAction = {
  targetNpcId,
  schemeType,
  playerSpeech,
  omenSpeechInput: schemeType === 'omen'
    ? { omenText, interpretationText }
    : undefined,
}
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run the same command as Step 2.  
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git -C "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version" add src\stores\gameStore.ts src\stores\gameStore.test.ts
git -C "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version" commit -m "feat: persist omen structured speech input"
```

### Task 4: Extend parse prompts and fallback parsing for `frame` and `omen`

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\ai\prompts.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\aiNativeEngine.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\ai\prompts.test.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\aiNativeEngine.test.ts`

- [ ] **Step 1: Write the failing prompt/test expectations**

Add assertions like:

```ts
expect(prompt).toContain('selfTrapPotential')
expect(prompt).toContain('scapegoatClarity')
expect(prompt).toContain('omenAnchorStrength')
expect(prompt).toContain('legitimacyCrack')
expect(prompt).toContain('suspicionDirection')
expect(prompt).toContain('先看谶辞/征兆，再看解释/指向')
```

And fallback expectations:

```ts
expect(parse.selfTrapPotential).toBeGreaterThan(0)
expect(parse.omenAnchorStrength).toBeGreaterThan(0)
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run:

```powershell
npx.cmd vitest run "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\ai\prompts.test.ts" "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\aiNativeEngine.test.ts"
```

Expected: FAIL because the prompt schema and fallback parser do not yet cover the new fields.

- [ ] **Step 3: Update parse prompt and fallback parser**

Add to the structured parse schema:

```ts
"selfTrapPotential": 0-1,
"scapegoatClarity": 0-1,
"omenAnchorStrength": 0-1,
"legitimacyCrack": 0-1,
"suspicionDirection": 0-1,
```

Add omen rubric lines equivalent to:

```ts
'先看谶辞/征兆是否像真正的灾异、异象或谶语，再看解释/指向是否真的触及名分、法统或天命裂缝。'
'如果没有征兆层，只是普通政治话术，不应判成高质量谶纬。'
```

Add fallback heuristics:

```ts
const selfTrapPotential = clamp01(
  scoreMatches(speech, ['急着分辩', '越描越黑', '心虚', '失言', '失态', '解释太快']) * 0.95
)
const scapegoatClarity = clamp01(
  scoreMatches(speech, ['最说不清', '最可疑', '背锅', '担责', '口风压太快']) * 0.95
)
const omenAnchorStrength = clamp01(
  scoreMatches(omenText, ['石人', '龙气', '灾异', '异象', '天意', '谶']) * 0.9
)
const legitimacyCrack = clamp01(
  scoreMatches(interpretationText, ['名分', '法统', '天命', '越分', '失序']) * 0.95
)
const suspicionDirection = clamp01(
  scoreMatches(interpretationText, ['谁最该警惕', '越分侵权', '朝中重臣', '中枢', '边镇']) * 0.9
)
```

- [ ] **Step 4: Run the focused tests to verify they pass**

Run the same command as Step 2.  
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git -C "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version" add src\ai\prompts.ts src\game\aiNativeEngine.ts src\ai\prompts.test.ts src\game\aiNativeEngine.test.ts
git -C "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version" commit -m "feat: add frame and omen specialist parsing"
```

### Task 5: Use `frame` specialist fields inside settlement

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\schemeEngine.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\schemeEngine.test.ts`

- [ ] **Step 1: Write the failing settlement test**

Add a test like:

```ts
it('keeps frame weak when it cannot trap the target into self-incrimination', () => {
  const weak = settleScheme(frameAction, targetNpc, null, 0.9, {
    round: 10,
    unlockedSecrets: 0,
    northParse: {
      ...baseParse,
      selfTrapPotential: 0.1,
      scapegoatClarity: 0.15,
    },
  })

  const strong = settleScheme(frameAction, targetNpc, null, 0.9, {
    round: 10,
    unlockedSecrets: 0,
    northParse: {
      ...baseParse,
      selfTrapPotential: 0.82,
      scapegoatClarity: 0.78,
    },
  })

  expect(Math.abs((strong.northDimensionChanges.governance ?? 0))).toBeGreaterThan(
    Math.abs((weak.northDimensionChanges.governance ?? 0)),
  )
})
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```powershell
npx.cmd vitest run "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\schemeEngine.test.ts"
```

Expected: FAIL because `frame` settlement ignores the new specialist fields.

- [ ] **Step 3: Implement `frame` specialist scaling**

Add a helper equivalent to:

```ts
function getFrameTrapScale(parse: NorthSchemeParseResult): number {
  const trap = parse.selfTrapPotential ?? 0
  const scapegoat = parse.scapegoatClarity ?? 0
  if (trap < 0.2 || scapegoat < 0.2) return 0.45
  return clamp(0.45 + trap * 0.35 + scapegoat * 0.4, 0.45, 1.15)
}
```

Apply it only in the `frame` nation/person impact path.

- [ ] **Step 4: Run the focused test to verify it passes**

Run the same command as Step 2.  
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git -C "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version" add src\game\schemeEngine.ts src\game\schemeEngine.test.ts
git -C "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version" commit -m "feat: scale frame by self-trap and scapegoat clarity"
```

### Task 6: Update live-balance harness samples for the omen two-stage flow

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\liveBalance\sampleLibrary.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\liveBalance\liveParseRunner.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\liveBalance\sampleLibrary.test.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\liveBalance\liveParseRunner.test.ts`

- [ ] **Step 1: Write the failing harness tests**

Add assertions like:

```ts
expect(omenAction.omenSpeechInput?.omenText).toBeTruthy()
expect(omenAction.omenSpeechInput?.interpretationText).toBeTruthy()
```

and

```ts
expect(promptPayload.speech).toContain('石人一只眼')
expect(promptPayload.speech).toContain('名分失序')
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run:

```powershell
npx.cmd vitest run "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\liveBalance\sampleLibrary.test.ts" "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\liveBalance\liveParseRunner.test.ts"
```

Expected: FAIL because omen samples still use the old single-text shape.

- [ ] **Step 3: Rewrite omen samples into the new structure**

Represent omen samples like:

```ts
makeOmenScheme('zongai', {
  omenText: '石人一只眼，挑动黄河天下反。',
  interpretationText: '此非独天灾，恐是名分失序之兆。若仍有人越分侵权，朝野自会把灾异与人事相连。',
})
```

And adapt the harness bridge to merge the two strings into the outgoing prompt when needed.

- [ ] **Step 4: Run the focused tests to verify they pass**

Run the same command as Step 2.  
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git -C "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version" add src\game\liveBalance\sampleLibrary.ts src\game\liveBalance\liveParseRunner.ts src\game\liveBalance\sampleLibrary.test.ts src\game\liveBalance\liveParseRunner.test.ts
git -C "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version" commit -m "feat: thread omen dual-input through live balance harness"
```

### Task 7: Full verification and live smoke

**Files:**
- Verify only; no new files required

- [ ] **Step 1: Run targeted tests**

Run:

```powershell
npx.cmd vitest run "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\SchemePanel.test.tsx" "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\stores\gameStore.test.ts" "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\ai\prompts.test.ts" "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\aiNativeEngine.test.ts" "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\schemeEngine.test.ts" "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\liveBalance\sampleLibrary.test.ts" "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\liveBalance\liveParseRunner.test.ts"
```

Expected: PASS.

- [ ] **Step 2: Run full tests**

Run:

```powershell
npx.cmd vitest run
```

Expected: PASS with the existing skip count unchanged.

- [ ] **Step 3: Run production build**

Run:

```powershell
npm.cmd run build
```

Expected: successful Vite build.

- [ ] **Step 4: Run live smoke**

Run:

```powershell
npm.cmd run balance:live-ai -- --sample average-omen --sample expert-omen
```

Expected: report completes successfully, and the latest report preserves the new omen dual-input semantics.

- [ ] **Step 5: Final commit**

```powershell
git -C "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version" add src\game\types.ts src\components\SchemePanel\SchemePanel.tsx src\components\SchemePanel\SchemePanel.css src\stores\gameStore.ts src\game\aiNativeEngine.ts src\ai\prompts.ts src\game\schemeEngine.ts src\game\liveBalance\sampleLibrary.ts src\game\liveBalance\liveParseRunner.ts src\components\SchemePanel\SchemePanel.test.tsx src\stores\gameStore.test.ts src\game\aiNativeEngine.test.ts src\ai\prompts.test.ts src\game\schemeEngine.test.ts src\game\liveBalance\sampleLibrary.test.ts src\game\liveBalance\liveParseRunner.test.ts
git -C "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version" commit -m "feat: add frame and omen special interaction flows"
```
