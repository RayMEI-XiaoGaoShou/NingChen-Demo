# Survival And Power Curve Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add round-start rollback for mid-run defeats, convert self-preservation into a two-step execution chain, and retune the early-mid power curve.

**Architecture:** Store a single round-start snapshot in the main game store and persist it with the save payload. Move death handling from one-shot execution to a staged danger state evaluated across rounds. Smooth the macro curve by softening early North governance collapse and stretching South growth/ask effects across three phases.

**Tech Stack:** React, Zustand, TypeScript, Vitest, Vite

---

### Task 1: Round-Start Snapshot Plumbing

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\stores\gameStore.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\saveEngine.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\stores\gameStore.test.ts`

- [ ] Add a persisted `roundStartSnapshot` field plus `saveRoundStartSnapshot()` / `restoreRoundStartSnapshot()` store actions.
- [ ] Save the snapshot when entering each new `ROUND_START`.
- [ ] Restore to that snapshot with `currentPhase = 'ROUND_START'`, `isGameOver = false`, `gameResult = 'NONE'`.
- [ ] Add tests covering snapshot save/restore and persistence.

### Task 2: Settlement Defeat Actions

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\Settlement\Settlement.tsx`

- [ ] Show `回到本回合初` only when `gameResult` is `DEFEAT_DEATH` or `DEFEAT_INVASION`.
- [ ] Keep `重开一局`.
- [ ] Hide rollback action on final round ending states.

### Task 3: Two-Step Execution Chain

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\types.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\nationEngine.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\roundSettlement.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\stores\gameStore.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\nationEngine.test.ts`

- [ ] Introduce a player danger stage type.
- [ ] Update death checking so the first high-risk hit marks `under_review`, not immediate death.
- [ ] Only execute on the following round if extreme danger persists.
- [ ] Surface the current danger stage into settlement facts/store state.
- [ ] Add tests for stage progression and delayed execution.

### Task 4: Early North Durability

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\schemeEngine.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\nationEngine.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\schemeEngine.test.ts`

- [ ] Reduce early-round governance/socialOrder transmission from faction damage.
- [ ] Soften early event-driven governance hits.
- [ ] Keep later rounds unchanged.
- [ ] Add tests proving the same early input causes less nation-layer governance damage than midgame.

### Task 5: Smooth South Growth

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\data\nationStats.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\nationEngine.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\nationEngine.test.ts`

- [ ] Replace the current early-only ask slowdown with a three-phase scale for policy immediate effects.
- [ ] Apply the same three-phase curve to policy aftereffects.
- [ ] Trim South natural growth slightly on `finance / grain / governance / socialOrder`.
- [ ] Add tests proving round 2 < round 8 < round 15 for the same strong reasoning.

### Task 6: Verification

**Files:**
- None

- [ ] Run `npm.cmd test`
- [ ] Run `npm.cmd run build`
- [ ] Summarize the new balance levers and any residual tuning risk.
