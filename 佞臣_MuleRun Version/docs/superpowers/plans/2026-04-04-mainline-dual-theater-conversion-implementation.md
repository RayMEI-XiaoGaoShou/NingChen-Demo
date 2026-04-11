# Mainline Dual-Theater Conversion Implementation Plan

> Required execution mode: inline implementation in the current worktree, with narrow calibration and verification against both fallback and live DeepSeek mainline samples.

**Goal:** Push `average-mainline` from `shu stalemate` toward `shu gained`, and push `expert-mainline` from `shu gained / huainan stalemate` toward stronger second-theater conversion, without changing omen or external-route strength.

**Architecture:** Keep the existing mainline Shu helper, modestly retune it for average-quality mainline preparation, then add a second mainline-only Huainan continuation helper gated on `shu gained`. Thread both through `roundSettlement`, verify with fallback guardrails, and re-run the live DeepSeek mainline matrix.

**Tech Stack:** TypeScript, Vitest, Vite build, existing live balance harness

---

### Task 1: Add a Huainan continuation helper for mainline play

**Files:**
- Create or extend: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\mainlineCampaignBonus.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\mainlineCampaignBonus.test.ts`

- [ ] Add failing tests for a narrow `deriveMainlineHuainanBonus(...)`
- [ ] Require `shuResolvedState === 'gained'`
- [ ] Reward strong phase-two command/logistics preparation on `normal`
- [ ] Ensure weak or generic second-phase signals still return `0`

### Task 2: Slightly raise Shu conversion for competent average mainline

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\mainlineCampaignBonus.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\mainlineCampaignBonus.test.ts`

- [ ] Narrowly retune `deriveMainlineShuBonus(...)`
- [ ] Target the gap between `average-mainline` stalemate and gained
- [ ] Do not raise the ceiling so far that rookie-style lines inherit it

### Task 3: Thread the new Huainan continuation bonus through settlement

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\roundSettlement.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\roundSettlement.test.ts`

- [ ] Add a focused round-16 test showing `shu gained` + strong mainline phase-two prep can push Huainan upward
- [ ] Integrate `deriveMainlineHuainanBonus(...)` into the Huainan resolution path only
- [ ] Keep omen and existing carryover logic untouched

### Task 4: Update fallback guardrails

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\simulationRunner.test.ts`

- [ ] Tighten the expected fallback outcomes for:
  - `average-mainline`
  - `expert-mainline`
- [ ] Preserve rookie guardrails
- [ ] Do not change omen expectations in this pass

### Task 5: Run verification and live DeepSeek smoke

**Commands:**
- `npx.cmd vitest run`
- `npm.cmd run build`
- `npm.cmd run balance:live-ai -- --sample expert-mainline --sample average-mainline --sample expert-omen --sample average-omen`

- [ ] Verify the full fallback suite passes
- [ ] Verify the production build passes
- [ ] Run the focused live matrix
- [ ] Compare results against the intended shape:
  - `average-mainline` -> `shu gained`
  - `expert-mainline` -> stronger Huainan conversion
  - omen remains strong

### Task 6: Commit only the narrow mainline conversion work

**Files expected in scope:**
- `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\mainlineCampaignBonus.ts`
- `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\mainlineCampaignBonus.test.ts`
- `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\roundSettlement.ts`
- `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\roundSettlement.test.ts`
- `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\simulationRunner.test.ts`

- [ ] Stage only the narrow mainline conversion files
- [ ] Commit with a scoped message reflecting the dual-theater conversion improvement
