# Omen And War Pressure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `谶纬` a conditional playable scheme, add context-sensitive military spillover for base schemes, rebalance external `割据 / 造反`, align early invasion checks with the updated round-pressure design, and expand judge prompt inputs to the richer settlement granularity.

**Architecture:** Keep the core scheme pipeline in `schemeEngine.ts` and `roundSettlement.ts`, but introduce round-context helpers so availability, spillover, and invasion checks all read from the same rule source. Extend settlement output with structured summaries so UI and AI prompts consume the same richer facts instead of rebuilding ad-hoc strings.

**Tech Stack:** TypeScript, React, Zustand, Vitest

---

### Task 1: Round Context Rules

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\types.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\data\rounds.ts`
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\data\roundRuleConfig.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\data\roundRuleConfig.test.ts`

**Step 1:** Write failing tests for omen windows and war-pressure helpers.
**Step 2:** Run `npm.cmd test -- src/data/roundRuleConfig.test.ts`.
**Step 3:** Implement minimal helper data for omen rounds, invasion pressure tiers, and war-context flags.
**Step 4:** Re-run the test until green.

### Task 2: Scheme Availability And Military Spillover

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\schemeEngine.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\SchemePanel\SchemePanel.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\NPCDetail\NPCDetail.tsx`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\schemeEngine.test.ts`

**Step 1:** Write failing tests for conditional `谶纬` availability and military spillover on eligible war-round schemes.
**Step 2:** Run `npm.cmd test -- src/game/schemeEngine.test.ts`.
**Step 3:** Implement round-aware availability and spillover calculation in `schemeEngine.ts`, then expose `谶纬` only when allowed in UI.
**Step 4:** Re-run the targeted tests until green.

### Task 3: External High Actions Rebalance

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\data\npcs.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\schemeEngine.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\roundSettlement.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\roundSettlement.test.ts`

**Step 1:** Write failing tests for stricter `割据 / 造反` gates and heavier military-facing consequences.
**Step 2:** Run `npm.cmd test -- src/game/roundSettlement.test.ts`.
**Step 3:** Implement new thresholds, secret requirements, round requirements, and revised damage bands.
**Step 4:** Re-run the targeted tests until green.

### Task 4: Early Invasion Alignment

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\nationEngine.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\roundSettlement.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\Settlement\Settlement.tsx`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\nationEngine.test.ts`

**Step 1:** Write failing tests for updated round-pressure windows and disaster gating.
**Step 2:** Run `npm.cmd test -- src/game/nationEngine.test.ts`.
**Step 3:** Implement the revised political-pressure model and return richer invasion diagnostics for display.
**Step 4:** Re-run the targeted tests until green.

### Task 5: Judge Prompt Input Expansion

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\roundSettlement.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\ai\prompts.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\Settlement\Settlement.tsx`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\roundSettlement.test.ts`

**Step 1:** Write failing tests for richer settlement summaries and judge input payload.
**Step 2:** Run the relevant vitest selection.
**Step 3:** Extend settlement result shape with event, faction, external, policy, and national-change summaries; wire them into `buildJudgePrompt`.
**Step 4:** Re-run the targeted tests until green.

### Task 6: Full Verification

**Files:**
- Verify only

**Step 1:** Run `npm.cmd test`.
**Step 2:** Run `npm.cmd run build`.
**Step 3:** Review any type or UI regressions and fix if needed.
