# Single-Gain Campaign Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make normal-mode successful lines convert more reliably into `蜀地得手`, while allowing expert lines to carry that advantage into `淮南` without flattening the rookie/average/expert gradient.

**Architecture:** Keep the existing momentum-based battle pipeline, but add two focused conversion layers: a Shu-first gain bias and a Huainan carry-through bonus from prior Shu results. The implementation should stay narrow: adjust campaign scoring inputs and prepared-conversion helpers rather than reworking global difficulty or parse systems.

**Tech Stack:** TypeScript, Vite, Vitest, existing live balance harness, game simulation/battle settlement pipeline

---

### Task 1: Add Shu-first / Huainan-carry conversion helpers

**Files:**
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\campaignCarryover.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\campaignCarryover.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { deriveShuGainBias, deriveHuainanCarryBonus } from './campaignCarryover'

describe('campaign carryover helpers', () => {
    it('gives Shu a stronger single-gain conversion bias on normal', () => {
        expect(deriveShuGainBias('normal', 3.6, 1.4)).toBeGreaterThan(1)
    })

    it('lets Shu gained help Huainan more than Shu stalemate', () => {
        expect(deriveHuainanCarryBonus('gained', 'normal')).toBeGreaterThan(
            deriveHuainanCarryBonus('stalemate', 'normal'),
        )
    })

    it('does not let Shu failure help Huainan', () => {
        expect(deriveHuainanCarryBonus('failed', 'normal')).toBe(0)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
npx.cmd vitest run src\game\campaignCarryover.test.ts
```

Expected: FAIL with module-not-found or missing export errors.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { CampaignState, GameDifficulty } from './types'

export function deriveShuGainBias(
    difficulty: GameDifficulty,
    momentumBonus: number,
    preparedBonus: number,
): number {
    const base = difficulty === 'normal' ? 1.2 : 1
    return Math.min(2.4, Math.round((base + momentumBonus * 0.12 + preparedBonus * 0.28) * 10) / 10)
}

export function deriveHuainanCarryBonus(
    shuState: CampaignState['resolvedState'],
    difficulty: GameDifficulty,
): number {
    if (shuState === 'gained') return difficulty === 'normal' ? 1.6 : 1.2
    if (shuState === 'stalemate') return difficulty === 'normal' ? 0.7 : 0.5
    return 0
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
npx.cmd vitest run src\game\campaignCarryover.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/game/campaignCarryover.ts src/game/campaignCarryover.test.ts
git commit -m "feat: add battle conversion carryover helpers"
```

### Task 2: Feed Shu-first / Huainan-carry bonuses into battle resolution

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\roundSettlement.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\campaignEngine.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\roundSettlement.test.ts`

- [ ] **Step 1: Write the failing tests**

Add tests that assert:

```ts
it('lets a strong Shu preparation line cross into gained on normal', () => {
    // fixture should have strong shuMomentum, positive prepared bonus,
    // and enough north pressure to be on the gained edge
    expect(result.shuCampaign.state).toBe('gained')
})

it('lets Shu gained improve Huainan conversion in the second phase', () => {
    // fixture should compare identical huainan setup with/without prior shu gained
    expect(withCarry.huainanCampaign.state).not.toBe('failed')
    expect(withoutCarry.huainanCampaign.state).toBe('failed')
})
```

- [ ] **Step 2: Run targeted tests to verify failure**

Run:
```powershell
npx.cmd vitest run src\game\roundSettlement.test.ts
```

Expected: FAIL on the newly added assertions.

- [ ] **Step 3: Update round settlement and campaign scoring**

Implement:
- Shu battle score gets a narrow `shuGainBias`
- Huainan battle score gets a narrow `huainanCarryBonus`
- keep bonuses small enough that rookie lines do not jump tiers

Code shape to add in `roundSettlement.ts`:

```ts
const shuGainBias = deriveShuGainBias(difficulty, Math.min(5, shuMomentum), shuPreparedBonus)
...
momentumBonus: Math.min(5, shuMomentum) + shuPreparedBonus + shuGainBias,
```

```ts
const huainanCarryBonus = deriveHuainanCarryBonus(shuCampaign.resolvedState, difficulty)
...
momentumBonus: Math.min(5, huainanMomentum) + huainanPreparedBonus + huainanCarryBonus,
```

If needed, add named scoring terms in `campaignEngine.ts` comments so later balancing is easy to read.

- [ ] **Step 4: Run targeted tests**

Run:
```powershell
npx.cmd vitest run src\game\roundSettlement.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/game/roundSettlement.ts src/game/campaignEngine.ts src/game/roundSettlement.test.ts
git commit -m "feat: bias shu gain and huainan carryover"
```

### Task 3: Tune fallback simulation expectations around single-gain conversion

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\simulationRunner.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\simulationMatrix.test.ts`

- [ ] **Step 1: Write failing assertions for the new target**

Add or replace guardrails so fallback expectations match the new goal:

```ts
expect(expertMainline.shuCampaign.state).toBe('gained')
expect(averageOmen.shuCampaign.state).not.toBe('failed')
```

Keep rookie expectations punitive:

```ts
expect(rookieAggressive.gameResult).toMatch(/DEFEAT_/)
```

- [ ] **Step 2: Run targeted tests to confirm current failure**

Run:
```powershell
npx.cmd vitest run src\game\simulationRunner.test.ts src\game\simulationMatrix.test.ts
```

Expected: FAIL on the new single-gain expectations until code changes settle.

- [ ] **Step 3: Adjust the tests to the actual calibrated target after Task 2**

Keep assertions narrow:
- average lines should avoid structural double-failure when winning
- expert lines should show clearer Shu breakthrough
- rookie lines stay punitive

- [ ] **Step 4: Run targeted tests**

Run:
```powershell
npx.cmd vitest run src\game\simulationRunner.test.ts src\game\simulationMatrix.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/game/simulationRunner.test.ts src/game/simulationMatrix.test.ts
git commit -m "test: update battle conversion guardrails"
```

### Task 4: Run full fallback verification

**Files:**
- Modify if needed: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\roundSettlement.test.ts`
- Modify if needed: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\simulationRunner.test.ts`
- Modify if needed: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\simulationMatrix.test.ts`

- [ ] **Step 1: Run the full test suite**

Run:
```powershell
npx.cmd vitest run
```

Expected: PASS, with existing skipped tests unchanged.

- [ ] **Step 2: Run production build**

Run:
```powershell
npm.cmd run build
```

Expected: PASS

- [ ] **Step 3: If failures appear, make only narrow calibration edits**

Allowed edits:
- test fixture numbers
- battle conversion helper constants
- comments that explain why Shu is favored as the single-gain default

Do not reopen global success rates or south natural growth in this task.

- [ ] **Step 4: Commit any needed calibration**

```powershell
git add src/game/roundSettlement.ts src/game/roundSettlement.test.ts src/game/simulationRunner.test.ts src/game/simulationMatrix.test.ts
git commit -m "fix: calibrate single-gain battle conversion"
```

Skip this commit if no calibration edits were needed.

### Task 5: Run live DeepSeek smoke matrix and summarize outcome

**Files:**
- Output: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\docs\balance-reports\latest\live-balance-report.md`
- Output: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\docs\balance-reports\latest\live-balance-report.json`

- [ ] **Step 1: Run the live smoke matrix**

Run:
```powershell
npm.cmd run balance:live-ai -- --sample expert-mainline --sample expert-omen --sample average-mainline --sample average-omen
```

Expected: report generation completes with DeepSeek live parsing, not fallback.

- [ ] **Step 2: Inspect the markdown report**

Check:
- whether `expert-mainline` reaches `shu gained`
- whether `expert-omen` reaches at least `shu gained` and possibly stronger Huainan conversion
- whether `average-mainline` and `average-omen` avoid structural double-failure when they win

- [ ] **Step 3: If the live result still stops short**

Only then consider one of these narrow follow-ups in a later plan:
- slightly increase `deriveShuGainBias`
- slightly increase `deriveHuainanCarryBonus` for `shu gained`

Do not change thresholds in this plan unless live and fallback both prove conversion is still one step too conservative.

- [ ] **Step 4: Commit final report-affecting code only if additional code changes were required**

```powershell
git add src/game/campaignCarryover.ts src/game/roundSettlement.ts src/game/roundSettlement.test.ts src/game/simulationRunner.test.ts src/game/simulationMatrix.test.ts
git commit -m "fix: finalize single-gain campaign conversion"
```

Skip this commit if no additional code changes were required after the live run.
