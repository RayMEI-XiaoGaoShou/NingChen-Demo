# Sample Library Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the live balance sample library so `expert / average / rookie` reliably represent skill level while `mainline / external / omen / aggressive` represent route choice, then verify that live AI results reflect that separation.

**Architecture:** Keep the existing live-balance harness intact and only rewrite the sample authoring layer plus its targeted tests. The implementation should first rename and restructure sample definitions, then replace the current templated speeches with level-specific scripts, and finally verify both fallback and live-parse behavior with focused regression checks.

**Tech Stack:** TypeScript, Vitest, tsx CLI scripts, existing live balance harness in `src/game/liveBalance/`

---

## File Map

- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\liveBalance\sampleLibrary.ts`
  - Replace current heavily templated generation with clearer per-level/per-strategy authoring helpers.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\liveBalance\types.ts`
  - Rename or extend strategy labels only if the new naming needs it.
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\liveBalance\sampleLibrary.test.ts`
  - Add fast structural tests for naming, level/strategy coverage, and obvious content-shape invariants.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\simulationRunner.test.ts`
  - Update targeted balance assertions to use renamed samples and new expected behavior.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\docs\superpowers\specs\2026-04-03-sample-library-level-strategy-design.md`
  - Only if implementation reveals one minor naming clarification worth folding back into the spec.

### Task 1: Lock the new naming and coverage rules

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\liveBalance\types.ts`
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\liveBalance\sampleLibrary.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { LIVE_BALANCE_SAMPLE_SET } from './sampleLibrary'

describe('live balance sample library coverage', () => {
  it('uses the normalized strategy-aligned sample ids', () => {
    expect(LIVE_BALANCE_SAMPLE_SET.map(sample => sample.id)).toEqual([
      'expert-mainline',
      'expert-external',
      'average-mainline',
      'average-omen',
      'average-external',
      'rookie-mainline',
      'rookie-omen-misuse',
      'rookie-aggressive',
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
npx.cmd vitest run src/game/liveBalance/sampleLibrary.test.ts -t "uses the normalized strategy-aligned sample ids"
```

Expected:
- FAIL because `rookie-scatter` still exists and `rookie-aggressive` does not.

- [ ] **Step 3: Write minimal implementation**

Update the sample ids and labels in `sampleLibrary.ts` first, without touching the actual speeches yet.

```ts
export const LIVE_BALANCE_SAMPLE_SET: BalanceSample[] = [
  makeSample('expert-mainline', '高手主线', 'expert', 'mainline', 0),
  makeSample('expert-external', '高手外部线', 'expert', 'external', 1),
  makeSample('average-mainline', '普通主线', 'average', 'mainline', 2),
  makeSample('average-omen', '普通谶纬线', 'average', 'omen', 3),
  makeSample('average-external', '普通外部线', 'average', 'external', 4),
  makeSample('rookie-mainline', '菜鸟主线', 'rookie', 'mainline', 5),
  makeSample('rookie-omen-misuse', '菜鸟误用谶纬', 'rookie', 'omen', 6),
  makeSample('rookie-aggressive', '菜鸟激进线', 'rookie', 'aggressive', 7),
]
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
npx.cmd vitest run src/game/liveBalance/sampleLibrary.test.ts -t "uses the normalized strategy-aligned sample ids"
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```powershell
git add src/game/liveBalance/types.ts src/game/liveBalance/sampleLibrary.ts src/game/liveBalance/sampleLibrary.test.ts
git commit -m "test: lock sample library naming coverage"
```

### Task 2: Rewrite sample speeches so level and strategy are truly separated

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\liveBalance\sampleLibrary.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\liveBalance\sampleLibrary.test.ts`

- [ ] **Step 1: Write the failing test**

Add structural tests that distinguish the content quality tiers instead of only checking ids.

```ts
it('keeps rookie aggressive speeches visibly less tailored than expert routes', () => {
  const rookieAggressive = LIVE_BALANCE_SAMPLE_SET.find(sample => sample.id === 'rookie-aggressive')!
  const expertMainline = LIVE_BALANCE_SAMPLE_SET.find(sample => sample.id === 'expert-mainline')!

  const rookieRoundTwoSpeech = rookieAggressive.rounds[1].schemes[1].speech
  const expertRoundTwoSpeech = expertMainline.rounds[1].schemes[0].speech

  expect(rookieRoundTwoSpeech).not.toMatch(/仓储|诏令|节次|接管|法统|灾异/)
  expect(expertRoundTwoSpeech).toMatch(/仓储|诏令|节次|接管|法统|灾异/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
npx.cmd vitest run src/game/liveBalance/sampleLibrary.test.ts -t "keeps rookie aggressive speeches visibly less tailored than expert routes"
```

Expected:
- FAIL because the current rookie aggressive speech still contains high-value strategic vocabulary.

- [ ] **Step 3: Write minimal implementation**

Replace the current single templated `buildSchemesForStrategy()` flow with explicit level-aware helpers so each level has its own speech quality.

Suggested shape:

```ts
function buildExpertMainlineSchemes(round: number): [RoundSchemeSample, RoundSchemeSample, RoundSchemeSample] {
  return [
    makeScheme('zuting', 'advise', '先稳仓储、诏令与转运节次，再议前线轻重，莫让灾年把中枢拖散。'),
    makeScheme('linghuelvguang', 'probe', '眼下主战与安内哪一头更伤国本，还请都督明言。'),
    makeScheme('zongai', 'slander', '后党借流民与军粮之名扩张馆阁接口，长此以往，宫中名分只会更乱。'),
  ]
}

function buildAverageMainlineSchemes(round: number): [RoundSchemeSample, RoundSchemeSample, RoundSchemeSample] {
  return [
    makeScheme('zuting', 'advise', '现在先稳住钱粮和执行，再谈别的。'),
    makeScheme('linghuelvguang', 'probe', '朝中眼下最该先处理的是哪一头？'),
    makeScheme('zongai', round <= 4 ? 'slander' : 'probe', round <= 4 ? '此人未必真会替你担责。' : '宫里如今谁最值得提防？'),
  ]
}

function buildRookieAggressiveSchemes(round: number): [RoundSchemeSample, RoundSchemeSample, RoundSchemeSample] {
  return [
    makeScheme('zuting', 'advise', '你现在总该先想办法把局面稳住。'),
    makeScheme('linghuelvguang', round === 1 ? 'slander' : 'alienate', round === 1 ? '他未必真心站在你这边。' : '别人若权太重，最后吃亏的可能就是你。', 'zongai'),
    makeScheme('duguwenyue', 'advise', '边上还是先顾好自己手里的兵。'),
  ]
}
```

Keep the same route coverage, but ensure:
- `rookie` speeches are more generic, less event-anchored, and less structurally precise
- `average` speeches are directionally correct but only lightly tailored
- `expert` speeches are the most precise and contextual

- [ ] **Step 4: Run targeted tests to verify they pass**

Run:
```powershell
npx.cmd vitest run src/game/liveBalance/sampleLibrary.test.ts
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```powershell
git add src/game/liveBalance/sampleLibrary.ts src/game/liveBalance/sampleLibrary.test.ts
git commit -m "feat: rewrite live balance sample speeches by level"
```

### Task 3: Reconnect downstream balance tests to the renamed and rewritten samples

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\simulationRunner.test.ts`

- [ ] **Step 1: Write the failing test**

Add or update one explicit test that references the renamed aggressive sample and encodes the intended shape:

```ts
it('keeps rookie aggressive pressure below a comfortable double-digit normal-mode victory', () => {
  const sample = LIVE_BALANCE_SAMPLE_SET.find(item => item.id === 'rookie-aggressive')
  expect(sample).toBeTruthy()
})
```

If the old test still references `rookie-scatter`, let that fail first.

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
npx.cmd vitest run src/game/simulationRunner.test.ts -t "keeps rookie aggressive pressure below a comfortable double-digit normal-mode victory"
```

Expected:
- FAIL because the sample id or expectations are stale.

- [ ] **Step 3: Write minimal implementation**

Update the sample lookup and rename the test.

```ts
const sample = LIVE_BALANCE_SAMPLE_SET.find(item => item.id === 'rookie-aggressive')
expect(sample).toBeTruthy()
```

Then keep the regression boundary aligned with the current balancing goal:

```ts
expect(result.finalState.southPower - result.finalState.northPower).toBeLessThan(10)
```

- [ ] **Step 4: Run the targeted simulation test**

Run:
```powershell
npx.cmd vitest run src/game/simulationRunner.test.ts
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```powershell
git add src/game/simulationRunner.test.ts
git commit -m "test: align simulation runner with rewritten samples"
```

### Task 4: Verify fallback balance shape after sample rewrite

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\simulationRunner.test.ts`
  - Only if the observed fallback shape requires one more assertion update.

- [ ] **Step 1: Add a narrow fallback regression check**

Use the existing sample runner pattern to verify that:
- `expert-mainline` is not weaker than `average-mainline`
- `average-mainline` is not weaker than `rookie-mainline`
- `rookie-aggressive` no longer dwarfs them through generic language alone

Minimal test scaffold:

```ts
it('preserves the intended fallback ordering across mainline and rookie aggressive samples', () => {
  const ids = ['expert-mainline', 'average-mainline', 'rookie-mainline', 'rookie-aggressive'] as const
  const margins = new Map<string, number>()

  for (const id of ids) {
    const sample = LIVE_BALANCE_SAMPLE_SET.find(item => item.id === id)!
    const result = simulateGame({
      throughRound: 20,
      initialState: { difficulty: sample.difficulty },
      resolveRound: ({ round }) => {
        const plan = sample.rounds.find(item => item.round === round)
        if (!plan) return {}
        return {
          schemes: plan.schemes.map((scheme, index) => ({
            id: `${sample.id}-r${round}-s${index + 1}`,
            targetNpcId: scheme.targetNpcId,
            relatedNpcId: scheme.relatedNpcId,
            schemeType: scheme.schemeType,
            playerSpeech: scheme.speech,
            resolutionRoll: 0.28,
          })),
          policyOptionIndex: plan.policy.optionIndex,
          policyReason: plan.policy.reason,
        }
      },
    })
    margins.set(id, result.finalState.southPower - result.finalState.northPower)
  }

  expect(margins.get('expert-mainline')!).toBeGreaterThanOrEqual(margins.get('average-mainline')!)
  expect(margins.get('average-mainline')!).toBeGreaterThanOrEqual(margins.get('rookie-mainline')!)
  expect(margins.get('rookie-aggressive')!).toBeLessThan(10)
})
```

- [ ] **Step 2: Run the test to verify it fails if ordering is still wrong**

Run:
```powershell
npx.cmd vitest run src/game/simulationRunner.test.ts -t "preserves the intended fallback ordering across mainline and rookie aggressive samples"
```

Expected:
- FAIL until the rewritten speeches actually create the desired separation.

- [ ] **Step 3: Adjust only the rewritten speeches until the test passes**

Do not change balance formulas here. Only revise sample wording if needed.

- [ ] **Step 4: Re-run the test to verify it passes**

Run:
```powershell
npx.cmd vitest run src/game/simulationRunner.test.ts -t "preserves the intended fallback ordering across mainline and rookie aggressive samples"
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```powershell
git add src/game/liveBalance/sampleLibrary.ts src/game/simulationRunner.test.ts
git commit -m "test: lock fallback ordering for rewritten samples"
```

### Task 5: Run live AI smoke validation on the rewritten samples

**Files:**
- No production file changes required unless the report location or sample ids need one tiny follow-up fix.

- [ ] **Step 1: Run a focused live AI smoke test**

Run:
```powershell
npm.cmd run balance:live-ai -- --sample average-mainline --sample rookie-aggressive
```

Expected:
- Report written to `docs/balance-reports/latest/`
- All parse records show `mode: "live"`

- [ ] **Step 2: Inspect the report and compare against the intended hierarchy**

Check:
- `average-mainline` should not be outperformed by `rookie-aggressive` purely because the rookie speeches still read like polished strategic pressure
- `rookie-aggressive` should no longer explode into a runaway win due to generic-but-effective wording

Suggested inspection command:

```powershell
Get-Content 'docs/balance-reports/latest/live-balance-report.md'
```

- [ ] **Step 3: If the hierarchy is still wrong, revise only sample wording and rerun once**

Do not tune formulas in this task. The purpose is to validate the rewritten sample library against live AI parse behavior.

- [ ] **Step 4: Commit the final sample rewrite state**

```powershell
git add src/game/liveBalance/sampleLibrary.ts src/game/liveBalance/sampleLibrary.test.ts src/game/simulationRunner.test.ts
git commit -m "feat: rewrite live sample library for level strategy separation"
```

### Task 6: Full verification and handoff

**Files:**
- Review only; no new file expected unless one tiny spec clarification is needed.

- [ ] **Step 1: Run the full automated suite**

Run:
```powershell
npx.cmd vitest run
```

Expected:
- All tests pass

- [ ] **Step 2: Run the production build**

Run:
```powershell
npm.cmd run build
```

Expected:
- Successful Vite build with no TypeScript errors

- [ ] **Step 3: Summarize the sample-library shift in handoff notes**

Capture:
- Which samples were renamed
- Which routes were rewritten most heavily
- Whether fallback and live hierarchies now align

- [ ] **Step 4: Commit any final cleanup**

```powershell
git add src/game/liveBalance/sampleLibrary.ts src/game/liveBalance/sampleLibrary.test.ts src/game/simulationRunner.test.ts docs/balance-reports/latest
git commit -m "chore: verify rewritten live balance samples"
```

## Self-Review

Spec coverage:
- Dual-axis `level × strategy` separation is covered in Tasks 1 and 2.
- Renaming `rookie-scatter` to `rookie-aggressive` is covered in Tasks 1 and 3.
- Current-sample mismatch review is covered by Task 2’s rewrite and Task 4’s ordering check.
- Live AI confirmation is covered in Task 5.

Placeholder scan:
- No `TODO`, `TBD`, or “implement later” placeholders remain.
- Each code-changing task includes a concrete test, command, and minimal code shape.

Type consistency:
- The plan consistently refers to `BalanceSample`, `SampleStrategy`, `LIVE_BALANCE_SAMPLE_SET`, and the renamed `rookie-aggressive` sample id.
