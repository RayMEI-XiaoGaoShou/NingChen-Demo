# NPC Relationship Memory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated NPC-to-NPC relationship-memory layer so recurring `A listens about B` schemes feel cumulative instead of resetting every round.

**Architecture:** Introduce a separate relation-memory ledger keyed by `holderNpcId -> subjectNpcId`, keep it distinct from the existing player-to-NPC long-term memory ledger, and write to it only from successful second-target schemes. Then expose a small retrieval helper to NPC prompt context and Feng Daozhi draft context so both can reference “old suspicion/old resentment” without changing the whole relationship engine.

**Tech Stack:** TypeScript, Zustand state, existing `schemeEngine`/`roundSettlement`/`relationshipEngine`/`npcPromptContext` pipeline, Vitest.

---

## File Map

### Core relation-memory model
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\types.ts`
  - Add relation-memory entry types and store shape.
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\npcRelationshipMemory.ts`
  - Add merge, scoring, retrieval, and summary helpers.
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\npcRelationshipMemory.test.ts`

### Write path
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\roundSettlement.ts`
  - Create relation-memory entries from successful `slander / alienate / frame / proxy` flows that include `relatedNpcId`.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\stores\gameStore.ts`
  - Persist relation-memory updates during settlement.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\saveEngine.ts`
  - Save/load relation-memory ledger.
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\npcRelationshipMemory.persistence.test.ts`

### Read path
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\npcPromptContext.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\fengDaozhiSituationSummary.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\ai\prompts.ts`
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\npcRelationshipMemoryContext.test.ts`
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\ai\npcRelationshipMemoryPrompts.test.ts`

## Task 1: Add a dedicated relation-memory ledger

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\types.ts`
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\npcRelationshipMemory.ts`
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\npcRelationshipMemory.test.ts`

- [ ] Write failing tests for:
  - creating `suspicion`, `resentment`, `fear`, and `reliance` entries
  - merging repeated `holder -> subject -> stance` memories
  - selecting the most relevant relation old debts for a repeated A/B line
- [ ] Add relation-memory types and a ledger shape distinct from `npcMemoryLedger`
- [ ] Implement helper functions for:
  - add/merge
  - score
  - select
  - summarize
- [ ] Keep the first version narrow: 1~2 selected relation memories per prompt max

## Task 2: Write relation memory during settlement

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\roundSettlement.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\stores\gameStore.ts`
- Create/Modify tests around settlement behavior as needed

- [ ] Add failing tests showing successful `slander` from A about B writes `A -> B -> suspicion`
- [ ] Add failing tests showing successful `alienate` writes stronger `resentment` or `suspicion`
- [ ] Add narrow handling for `frame` only when the result meaningfully makes A think B exposed a flaw
- [ ] Keep `omen` out of this first write path
- [ ] Ensure failed or low-signal schemes do not spam relation memory
- [ ] Ensure repeated similar entries merge instead of exploding ledger size

## Task 3: Persist relation memory in saves

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\saveEngine.ts`
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\npcRelationshipMemory.persistence.test.ts`

- [ ] Add failing persistence tests for save/load round trip
- [ ] Add migration-safe default behavior for old saves with no relation-memory ledger
- [ ] Verify relation memory survives save, reload, and next-round prompt generation

## Task 4: Read relation memory in NPC and Feng Daozhi prompts

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\npcPromptContext.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\fengDaozhiSituationSummary.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\ai\prompts.ts`
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\npcRelationshipMemoryContext.test.ts`
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\ai\npcRelationshipMemoryPrompts.test.ts`

- [ ] Add failing tests showing:
  - A reacts differently when B has prior suspicion attached
  - repeated A/B lines produce “old suspicion + new evidence” style context
  - Feng Daozhi can see a relation line is already loose and worth pressing
- [ ] Add a separate relation-memory summary field to prompt context
- [ ] Keep relation-memory summary structurally separate from player-to-NPC long-term memory
- [ ] Ensure no-related-memory flows still read naturally

## Task 5: Final verification and guardrails

**Files:**
- Review all files above

- [ ] Run:
  - `npm.cmd test -- src\game\npcRelationshipMemory.test.ts src\game\npcRelationshipMemory.persistence.test.ts src\game\npcRelationshipMemoryContext.test.ts src\ai\npcRelationshipMemoryPrompts.test.ts`
- [ ] Run:
  - `npm.cmd run build`
- [ ] Spot-check that relation memory is only written for successful/high-signal second-target schemes
- [ ] Confirm relation memory and player-to-NPC long-term memory remain separate ledgers and separate prompt sections

## Acceptance Checklist

- [ ] Repeated A/B scheme lines feel cumulative instead of reset
- [ ] Successful `slander` and `alienate` can create A->B relation old debts
- [ ] Repeated similar relation old debts merge instead of bloating
- [ ] Save/load preserves relation memory
- [ ] NPC prompt context and Feng Daozhi both see relation old debts
- [ ] Relation-memory summary stays separate from player-to-NPC long-term memory summary

