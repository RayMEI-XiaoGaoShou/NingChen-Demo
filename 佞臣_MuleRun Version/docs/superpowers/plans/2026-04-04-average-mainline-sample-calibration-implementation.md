# Average Mainline Sample Calibration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recalibrate `average-mainline` so it represents a true medium-quality mainline player without loosening the real game systems.

**Architecture:** Keep the fix isolated to the live balance harness. Rewrite only the `average-mainline` sample copy and route emphasis in `sampleLibrary.ts`, then verify the change with targeted live DeepSeek smoke runs and existing regression tests.

**Tech Stack:** TypeScript, Vitest, tsx CLI live harness, DeepSeek API

---

### Task 1: Rewrite `average-mainline` sample copy

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\liveBalance\sampleLibrary.ts`

- [ ] **Step 1: Write the failing expectation into a test-friendly target**

Use this target as the implementation guard while editing sample text:

```ts
// Desired shape, not production code:
// - rounds 1-10 keep all three actions court/mainline relevant
// - action 1 mentions one or two concrete handles like 仓储/转运/诏令/州郡接应
// - action 2 still probes 令狐律光, but with moderate event/battle framing
// - action 3 no longer diffuses into weak external probing before Shu resolves
```

- [ ] **Step 2: Rewrite action 1 to medium-quality logistics/governance advice**

Replace generic lines such as:

```ts
'先别急着争强，把中枢和地方的事情顺一顺就好。'
```

with medium-quality mainline lines closer to:

```ts
'先把仓储、转运和州郡接应顺过来，再争谁来主战，才不至于前线先吃空。'
'先稳住诏令出口和后面的接应，再谈谁该出头，免得前线、州郡各听各的。'
```

- [ ] **Step 3: Rewrite action 2 to moderate battle-aware probing**

Keep `linghuelvguang + probe`, but use lines closer to:

```ts
'都督眼下最怕的，是前线军令拖成两套，还是朝里先把调度争乱了？'
'若粮道和调度先乱了，再谈主战与安内，是否只会把前线拖得更慢？'
```

- [ ] **Step 4: Keep action 3 court/mainline relevant through round 10**

Before round 10, replace weak/off-axis detours with a moderate third action such as:

```ts
makeScheme('zongai', 'probe', '宫里若先把诏令和赏罚改来改去，前线那边还肯不肯照旧听命？')
```

After round 10, allow slightly wider mainline variation, but keep it battle-adjacent.

- [ ] **Step 5: Commit**

```bash
git add src/game/liveBalance/sampleLibrary.ts
git commit -m "feat: recalibrate average mainline balance sample"
```

### Task 2: Update sample-facing regression checks

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\simulationRunner.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\liveBalance\sampleLibrary.ts`

- [ ] **Step 1: Add or adjust one regression expectation for the recalibrated sample intent**

Use a narrow expectation that protects the benchmark definition, for example:

```ts
expect(sample.rounds[0]?.schemes[0]?.speech).toContain('仓储')
expect(sample.rounds[0]?.schemes[1]?.targetNpcId).toBe('linghuelvguang')
```

- [ ] **Step 2: Run targeted tests**

Run:

```bash
npx vitest run src/game/simulationRunner.test.ts
```

Expected:

- PASS

- [ ] **Step 3: Commit**

```bash
git add src/game/simulationRunner.test.ts src/game/liveBalance/sampleLibrary.ts
git commit -m "test: lock average mainline sample calibration"
```

### Task 3: Validate with live DeepSeek smoke

**Files:**
- Read: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\docs\balance-reports\latest\live-balance-report.md`

- [ ] **Step 1: Run focused live matrix**

Run:

```bash
npm run balance:live-ai -- --sample expert-mainline --sample average-mainline
```

Expected:

- command completes successfully
- `degraded` remains `false` for both
- `average-mainline` improves materially relative to the pre-calibration baseline

- [ ] **Step 2: Compare outcomes against the previous baseline**

Check:

- `expert-mainline` should remain stronger than `average-mainline`
- `average-mainline` should move closer to `shu gained`
- if `average-mainline` still stays `shu failed`, stop and do not loosen systems yet

- [ ] **Step 3: Run full verification**

Run:

```bash
npx vitest run
npm run build
```

Expected:

- all tests green
- build passes

- [ ] **Step 4: Commit**

```bash
git add src/game/liveBalance/sampleLibrary.ts src/game/simulationRunner.test.ts
git commit -m "chore: validate recalibrated average mainline sample"
```
