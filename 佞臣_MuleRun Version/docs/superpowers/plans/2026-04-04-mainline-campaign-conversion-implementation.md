# Mainline Campaign Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strengthen mainline-only battle conversion so that average mainline lines more reliably break through in Shu while expert mainline lines gain a clearer path toward stronger two-theater outcomes, without reducing omen strength.

**Architecture:** Add a narrow mainline-specific Shu preparation helper that rewards court logistics, command-order, and recentralization play in rounds 1-10. Thread that helper into round-10 battle resolution only, keep Huainan mostly unchanged, and validate that the live gap closes specifically for mainline samples while omen remains strong.

**Tech Stack:** TypeScript, Vite, Vitest, existing live balance harness, campaign settlement pipeline

---

### Task 1: Add a mainline Shu preparation helper

**Files:**
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\mainlineCampaignBonus.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\mainlineCampaignBonus.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { deriveMainlineShuBonus } from './mainlineCampaignBonus'

describe('mainlineCampaignBonus', () => {
    it('rewards governance and grain heavy mainline advice on normal', () => {
        expect(deriveMainlineShuBonus({
            difficulty: 'normal',
            schemeSignals: [0.78, 0.66],
            commandSignal: 0.72,
            preparedBonus: 1.2,
        })).toBeGreaterThan(0)
    })

    it('does not hand out a bonus for weak generic lines', () => {
        expect(deriveMainlineShuBonus({
            difficulty: 'normal',
            schemeSignals: [0.22, 0.18],
            commandSignal: 0.2,
            preparedBonus: 0,
        })).toBe(0)
    })
})
```

- [ ] **Step 2: Run the targeted test to verify failure**

Run:
```powershell
npx.cmd vitest run src\game\mainlineCampaignBonus.test.ts
```

Expected: FAIL because the helper does not exist yet.

- [ ] **Step 3: Write the helper**

```ts
import type { GameDifficulty } from './types'

export function deriveMainlineShuBonus(params: {
    difficulty: GameDifficulty
    schemeSignals: number[]
    commandSignal: number
    preparedBonus: number
}): number {
    if (params.difficulty !== 'normal') return 0

    const strongest = Math.max(0, ...params.schemeSignals)
    const layered = params.schemeSignals.filter(value => value >= 0.55).length
    if (strongest < 0.55 && params.commandSignal < 0.6) return 0

    let bonus = 0
    if (strongest >= 0.7) bonus += 0.9
    else if (strongest >= 0.55) bonus += 0.5

    if (layered >= 2) bonus += 0.5
    if (params.commandSignal >= 0.7) bonus += 0.6
    else if (params.commandSignal >= 0.6) bonus += 0.3

    if (params.preparedBonus >= 1.2) bonus += 0.4

    return Math.min(2.2, Math.round(bonus * 10) / 10)
}
```

- [ ] **Step 4: Run the targeted test**

Run:
```powershell
npx.cmd vitest run src\game\mainlineCampaignBonus.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/game/mainlineCampaignBonus.ts src/game/mainlineCampaignBonus.test.ts
git commit -m "feat: add mainline shu preparation bonus helper"
```

### Task 2: Feed the mainline Shu bonus into round-10 settlement

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\roundSettlement.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\roundSettlement.test.ts`

- [ ] **Step 1: Add failing round-settlement assertions**

Add a test that models a strong mainline Shu-preparation state:

```ts
it('lets strong mainline shu preparation push round 10 into gained', () => {
    expect(result.shuCampaign.state).toBe('gained')
})
```

Use:
- successful court `advise`
- strong grain / governance / command-order parse
- solid prepared bonus
- no omen-specific crutch

- [ ] **Step 2: Run the targeted test to verify failure**

Run:
```powershell
npx.cmd vitest run src\game\roundSettlement.test.ts
```

Expected: FAIL on the new mainline-specific assertion.

- [ ] **Step 3: Implement the round-10 integration**

Add a helper call in `roundSettlement.ts` near the Shu resolution path:

```ts
const mainlineShuBonus = deriveMainlineShuBonus({
    difficulty,
    schemeSignals: collectMainlineShuSignals(schemeResults),
    commandSignal: deriveMainlineCommandSignal(schemeResults),
    preparedBonus: shuPreparedBonus,
})
```

Then add it only to round-10 Shu resolution:

```ts
momentumBonus: Math.min(5, shuMomentum) + shuPreparedBonus + shuGainBias + mainlineShuBonus,
```

Do not add it to Huainan or omen-only bonus paths.

- [ ] **Step 4: Run the targeted test**

Run:
```powershell
npx.cmd vitest run src\game\roundSettlement.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/game/roundSettlement.ts src/game/roundSettlement.test.ts
git commit -m "feat: boost mainline shu battle conversion"
```

### Task 3: Add fallback guardrails for mainline-only conversion

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\simulationRunner.test.ts`

- [ ] **Step 1: Add failing assertions that reflect the new target**

Add or tighten assertions such as:

```ts
expect(expertMainline.shuCampaign.resolvedState ?? expertMainline.shuCampaign.state).toBe('gained')
expect(averageMainline.shuCampaign.resolvedState ?? averageMainline.shuCampaign.state).not.toBe('failed')
```

Do not change omen expectations here.

- [ ] **Step 2: Run the targeted test to confirm current failure**

Run:
```powershell
npx.cmd vitest run src\game\simulationRunner.test.ts
```

Expected: FAIL until the mainline conversion is strong enough.

- [ ] **Step 3: Calibrate the guardrail to the achieved target**

After Task 2, update the assertions to the actual calibrated outcome:
- expert mainline should show a real Shu breakthrough
- average mainline should no longer be structurally double-failed if it wins
- rookie outcomes remain punitive

- [ ] **Step 4: Run the targeted test**

Run:
```powershell
npx.cmd vitest run src\game\simulationRunner.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/game/simulationRunner.test.ts
git commit -m "test: update mainline campaign conversion guardrails"
```

### Task 4: Run full fallback verification

**Files:**
- Modify if needed: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\mainlineCampaignBonus.ts`
- Modify if needed: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\roundSettlement.ts`
- Modify if needed: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\roundSettlement.test.ts`
- Modify if needed: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\simulationRunner.test.ts`

- [ ] **Step 1: Run the full test suite**

Run:
```powershell
npx.cmd vitest run
```

Expected: PASS

- [ ] **Step 2: Run the production build**

Run:
```powershell
npm.cmd run build
```

Expected: PASS

- [ ] **Step 3: If fallback guardrails still miss the target, make only narrow calibration edits**

Allowed edits:
- `deriveMainlineShuBonus` constants
- helper thresholds for command / logistics recognition
- round-10 integration weights

Do not:
- change omen logic
- change global campaign thresholds
- change growth or general success rates

- [ ] **Step 4: Commit calibration if needed**

```powershell
git add src/game/mainlineCampaignBonus.ts src/game/roundSettlement.ts src/game/roundSettlement.test.ts src/game/simulationRunner.test.ts
git commit -m "fix: calibrate mainline shu conversion"
```

Skip this commit if no calibration changes were needed.

### Task 5: Run live DeepSeek verification focused on mainline vs omen

**Files:**
- Output: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\docs\balance-reports\latest\live-balance-report.md`
- Output: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\docs\balance-reports\latest\live-balance-report.json`

- [ ] **Step 1: Run the focused live matrix**

Run:
```powershell
npm.cmd run balance:live-ai -- --sample expert-mainline --sample average-mainline --sample expert-omen --sample average-omen
```

Expected: live report generation completes successfully.

- [ ] **Step 2: Inspect the report for the mainline delta**

Check:
- whether `expert-mainline` now reaches `shu gained`
- whether `average-mainline` now avoids `shu failed`
- whether omen remains strong and is not degraded

- [ ] **Step 3: Only if live still stops one step short**

Allowed future follow-ups, not part of this plan:
- slightly raise `deriveMainlineShuBonus`
- add a tiny second-order bonus for layered mainline court prep

Do not fold those into this plan unless the live result clearly proves this pass is still half a step short.

- [ ] **Step 4: Commit only if extra code changes were needed after live verification**

```powershell
git add src/game/mainlineCampaignBonus.ts src/game/roundSettlement.ts src/game/roundSettlement.test.ts src/game/simulationRunner.test.ts
git commit -m "fix: finalize mainline campaign conversion"
```

Skip this commit if no additional code changes were required after the live run.
