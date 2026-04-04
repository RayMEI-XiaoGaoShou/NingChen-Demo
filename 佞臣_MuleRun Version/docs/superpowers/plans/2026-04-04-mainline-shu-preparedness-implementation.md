# Mainline Shu Preparedness Implementation Plan

**Goal:** Replace late-stage mainline Shu nudges with a narrow preparedness term that feeds the Shu `southPrep` side, so `average-mainline` can more reliably break through in Shu without touching omen or global thresholds.

**Architecture:** Add a dedicated `deriveMainlineShuPreparednessBonus(...)`, thread it into `evaluateShuCampaignOutcome(...)` as part of Shu-side prep, keep existing momentum and carryover logic intact, and verify the change with fallback plus focused live DeepSeek checks.

**Tech Stack:** TypeScript, Vitest, Vite build, existing live balance harness

---

### Task 1: Add a Shu preparedness helper

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\mainlineCampaignBonus.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\mainlineCampaignBonus.test.ts`

- [ ] Add a focused helper for mainline Shu preparedness
- [ ] Gate it to `normal`
- [ ] Require battle-relevant mainline signals plus sustained preparation
- [ ] Keep rookie-friendly generic lines at `0`

### Task 2: Thread preparedness into Shu evaluation

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\campaignEngine.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\roundSettlement.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\roundSettlement.test.ts`

- [ ] Extend Shu evaluation input with a preparedness term
- [ ] Add the new term on the Shu southPrep side, not as another tail bonus
- [ ] Keep Huainan logic unchanged in this pass
- [ ] Update round-10 tests to reflect the new path

### Task 3: Recalibrate fallback guardrails

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\simulationRunner.test.ts`

- [ ] Tighten expectations so `average-mainline` is no longer structurally locked to Shu stalemate when it wins
- [ ] Preserve expert and rookie guardrails

### Task 4: Verify

**Commands:**
- `npm.cmd test`
- `npm.cmd run build`
- `npm.cmd run balance:live-ai -- --sample expert-mainline --sample average-mainline`

- [ ] Run the full test suite
- [ ] Run the production build
- [ ] Run the focused live DeepSeek mainline matrix
- [ ] Confirm:
  - `expert-mainline` still reaches `shu gained`
  - `average-mainline` reaches `shu gained`

### Task 5: Commit only the narrow preparedness work

**Files expected in scope:**
- `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\mainlineCampaignBonus.ts`
- `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\mainlineCampaignBonus.test.ts`
- `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\campaignEngine.ts`
- `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\roundSettlement.ts`
- `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\roundSettlement.test.ts`
- `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\simulationRunner.test.ts`

- [ ] Stage only the preparedness-focused files
- [ ] Commit with a narrow mainline-preparedness message
