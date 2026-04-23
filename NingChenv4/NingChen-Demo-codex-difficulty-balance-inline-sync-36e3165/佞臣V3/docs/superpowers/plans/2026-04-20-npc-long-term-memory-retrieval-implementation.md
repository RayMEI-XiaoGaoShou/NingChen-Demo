# NPC Long-Term Memory Retrieval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing NPC long-term memory system so prompts retrieve the most relevant old debts for the current scheme type instead of using a mostly uniform summary.

**Architecture:** Keep the current `npcMemoryLedger` extraction pipeline intact, and add a thin retrieval layer on top of it. The new layer should enrich memory tags, score memories by scheme relevance, and expose a small helper consumed by both `npcPromptContext` and Feng Daozhi draft context builders. This is a retrieval upgrade, not a memory-storage rewrite.

**Tech Stack:** TypeScript, Zustand state, existing `npcMemoryLedger`/`npcPromptContext`/`fengDaozhiSituationSummary`/`prompts` pipeline, Vitest.

---

## File Map

### Core retrieval logic
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\npcMemoryLedger.ts`
  - Add tag normalization, scheme-to-tag mapping, scoring, and `selectRelevantNpcMemories`.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\types.ts`
  - Extend long-term memory tag typing if needed.
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\npcMemoryLedger.retrieval.test.ts`

### Prompt consumers
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\npcPromptContext.ts`
  - Replace generic long-term-memory selection with scheme-aware retrieval.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\fengDaozhiSituationSummary.ts`
  - Use the same retrieval helper for Feng Daozhi summary building.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\fengDaozhiAdvisor.ts`
  - Pass through selected old debts without re-ranking.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\ai\prompts.ts`
  - Keep prompt shape stable but distinguish generic summary from selected old debts.

### Tests to update
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\npcLongTermMemoryContext.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\ai\npcLongTermMemoryPrompts.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\fengDaozhiSituationSummary.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\fengDaozhiAdvisor.test.ts`

## Task 1: Add scheme-aware retrieval rules

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\npcMemoryLedger.ts`
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\npcMemoryLedger.retrieval.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\types.ts`

- [ ] Write failing tests for:
  - `advise` preferring `favor/saved_face`
  - `slander/alienate/frame` preferring `warning/betrayal`
  - `omen` preferring `legitimacy/pressure/court`
  - fallback behavior when no high-relevance memory exists
- [ ] Add or tighten type support for enriched tags such as `trust`, `face`, `pressure`, `court`, `military`, `grain`, `legitimacy`, `external`
- [ ] Implement scheme-to-tag/category mapping in `npcMemoryLedger.ts`
- [ ] Implement a scoring helper using:
  - `importance`
  - `recency`
  - `categoryMatch`
  - `tagMatch`
  - a light same-scheme bonus
- [ ] Implement `selectRelevantNpcMemories(entries, schemeType, limit)` that returns the best 1~2 entries
- [ ] Run targeted tests for the new retrieval helper

## Task 2: Wire scheme-aware retrieval into NPC prompt context

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\npcPromptContext.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\npcLongTermMemoryContext.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\ai\npcLongTermMemoryPrompts.test.ts`

- [ ] Write/adjust failing tests so the same NPC reads different old debts under different scheme types
- [ ] Replace the current generic long-term-memory selection with `selectRelevantNpcMemories`
- [ ] Preserve a concise summary field for compatibility, but also surface selected memory lines separately
- [ ] Verify prompt text still reads naturally when only one old debt is selected
- [ ] Verify fallback remains stable when no old debt qualifies

## Task 3: Wire scheme-aware retrieval into Feng Daozhi draft context

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\fengDaozhiSituationSummary.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\fengDaozhiAdvisor.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\fengDaozhiSituationSummary.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\fengDaozhiAdvisor.test.ts`

- [ ] Add failing tests proving Feng Daozhi sees different old debts for `advise` vs `slander` vs `omen`
- [ ] Reuse the same retrieval helper from Task 1 instead of introducing a second scoring system
- [ ] Pass selected long-term memories through the summary layer so draft prompts can reference them cleanly
- [ ] Ensure Feng Daozhi still works when the ledger is empty or when the target has only low-quality old debts

## Task 4: Final verification and cleanup

**Files:**
- Review all files touched above

- [ ] Run:
  - `npm.cmd test -- src\game\npcMemoryLedger.retrieval.test.ts src\game\npcLongTermMemoryContext.test.ts src\ai\npcLongTermMemoryPrompts.test.ts src\game\fengDaozhiSituationSummary.test.ts src\game\fengDaozhiAdvisor.test.ts`
- [ ] Run:
  - `npm.cmd run build`
- [ ] Spot-check that no prompt layer duplicates the same old debt twice
- [ ] Keep implementation narrow: retrieval only, no new persistence schema, no UI work

## Acceptance Checklist

- [ ] Same NPC selects different long-term old debts under different scheme types
- [ ] `advise` prefers `favor/saved_face`
- [ ] `slander/alienate/frame` prefer `warning/betrayal`
- [ ] `omen` prefers `legitimacy/pressure/court`
- [ ] NPC prompt context and Feng Daozhi draft both use the same retrieval rules
- [ ] No-ledger and low-signal fallbacks remain stable

