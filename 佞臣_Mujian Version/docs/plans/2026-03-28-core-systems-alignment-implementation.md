# Core Systems Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align the planning docs to the current shipped game truth, then add three missing pillars: NPC relationship chains, intel-driven clue quality, and layered ending reports.

**Architecture:** Keep the existing state-machine and settlement pipeline intact, and add three bounded layers beside it: a relationship data layer, an intel presentation layer, and an ending summary layer. Reuse `roundSettlement.ts` as the authoritative aggregator so UI and AI narration can read the same structured results.

**Tech Stack:** TypeScript, React, Zustand, Vitest, Markdown docs

---

### Task 1: Track Current Game Truth In Planning Docs

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣策划案v1\前台交互与信息可见性设计.md`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣策划案v1\天道判官结算规则.md`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣策划案v1\计谋系统.md`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣策划案v1\综合国力系统.md`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣策划案v1\NPC角色卡.md`

**Step 1: Write the doc delta checklist**

- List every already-shipped mechanic that still contradicts docs:
  - visible south stats
  - settlement-page empress reply
  - richer judge inputs
  - conditional `谶纬`
  - military spillover
  - revised external action thresholds
  - round-window invasion model

**Step 2: Update the docs**

- Rewrite only the affected sections so the docs now match the shipped game.
- Keep the tone and section hierarchy stable; do not rewrite unrelated content.

**Step 3: Self-review the doc changes**

- Check for contradictory wording like “南陈完全不可见”.
- Check that all mentioned mechanics exist in the current codebase.

### Task 2: Add Relationship Data And Failing Tests

**Files:**
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\data\npcRelationships.ts`
- Modify: `C:\Users\\happyelements\\Desktop\\佞臣 Demo\\佞臣-game\\src\\game\\types.ts`
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\relationshipEngine.ts`
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\relationshipEngine.test.ts`

**Step 1: Write the failing test**

```ts
it('breaks a key triangle when a relationship edge drops below threshold', () => {
  const result = applyRelationshipShock(...)
  expect(result.triggeredStructures).toContain('west_command_triangle')
})
```

**Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/game/relationshipEngine.test.ts`
Expected: FAIL because the relationship engine and data do not exist yet.

**Step 3: Write minimal implementation**

- Add relationship edge types and structure definitions.
- Seed only the key edges from the approved spec.
- Implement a minimal engine that:
  - applies edge delta
  - reports broken structures
  - exposes settlement-ready penalties

**Step 4: Run test to verify it passes**

Run: `npm.cmd test -- src/game/relationshipEngine.test.ts`
Expected: PASS

### Task 3: Wire Relationship Reactions Into Settlement

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\roundSettlement.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\stores\gameStore.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\roundSettlement.test.ts`

**Step 1: Write the failing test**

```ts
it('adds faction and nation penalties when a key structure is destabilized', () => {
  const result = settleRound(...)
  expect(result.relationshipReports[0]?.structureId).toBe('west_command_triangle')
  expect(result.judgeFacts.factionSummary).toContain('西线')
})
```

**Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/game/roundSettlement.test.ts`
Expected: FAIL because settlement does not yet include relationship reports.

**Step 3: Write minimal implementation**

- Pass relationship state into settlement.
- Apply relationship edge deltas from relevant schemes.
- When structures break, add:
  - relationship reports
  - extra faction penalties
  - extra nation penalties
  - extra judge facts

**Step 4: Run test to verify it passes**

Run: `npm.cmd test -- src/game/roundSettlement.test.ts`
Expected: PASS

### Task 4: Add Intel-Tiered Reactions

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\roundIntelEngine.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\CourtView\CourtView.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\roundIntelEngine.test.ts`

**Step 1: Write the failing test**

```ts
it('reveals sharper motive-facing reactions as intel depth increases', () => {
  expect(getNpcRoundReaction(7, npc, 0)).not.toEqual(getNpcRoundReaction(7, npc, 3))
})
```

**Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/game/roundIntelEngine.test.ts`
Expected: FAIL because intel depth is currently ignored.

**Step 3: Write minimal implementation**

- Keep the same round theme map.
- Split each output into:
  - public layer
  - hint layer
  - deep layer
- Use `intelProgress` to choose the layer.

**Step 4: Run test to verify it passes**

Run: `npm.cmd test -- src/game/roundIntelEngine.test.ts`
Expected: PASS

### Task 5: Add Event-Based Intel Unlocks

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\data\roundIntel.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\roundSettlement.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\roundSettlement.test.ts`

**Step 1: Write the failing test**

```ts
it('grants event-driven intel unlocks on configured rounds', () => {
  const result = settleRound(...)
  expect(result.intelUnlocks['zongai']).toBeGreaterThan(0)
})
```

**Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/game/roundSettlement.test.ts`
Expected: FAIL because intel growth only comes from `试探`.

**Step 3: Write minimal implementation**

- Add a tiny round->npc auto-unlock mapping for the strongest event-linked cases.
- Merge those unlocks into existing `intelUnlocks`.

**Step 4: Run test to verify it passes**

Run: `npm.cmd test -- src/game/roundSettlement.test.ts`
Expected: PASS

### Task 6: Add Layered Ending Logic

**Files:**
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\endingEngine.ts`
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\endingEngine.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\Ending\Ending.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\stores\gameStore.ts`

**Step 1: Write the failing test**

```ts
it('classifies a narrow power win as 险胜 and a large collapse win as 大胜', () => {
  expect(buildEndingReport(...).tier).toBe('险胜')
})
```

**Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/game/endingEngine.test.ts`
Expected: FAIL because no ending engine exists.

**Step 3: Write minimal implementation**

- Derive ending tier from:
  - final power gap
  - invasion/death result
  - external collapse markers
- Add:
  - cause summary
  - faction ending summary
  - npc fate snippets
  - round-stat summary

**Step 4: Run test to verify it passes**

Run: `npm.cmd test -- src/game/endingEngine.test.ts`
Expected: PASS

### Task 7: Integrate Ending Report Into UI

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\Ending\Ending.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\Ending\Ending.css`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\stores\gameStore.test.ts`

**Step 1: Write the failing test**

```ts
it('keeps the ending report available after game over', () => {
  expect(useGameStore.getState().endingReport).toBeTruthy()
})
```

**Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/stores/gameStore.test.ts`
Expected: FAIL because the report is not stored yet.

**Step 3: Write minimal implementation**

- Persist ending report in store when entering `ENDING`.
- Render the new sections in the ending page.

**Step 4: Run test to verify it passes**

Run: `npm.cmd test -- src/stores/gameStore.test.ts`
Expected: PASS

### Task 8: Full Verification

**Files:**
- Verify only

**Step 1: Run all tests**

Run: `npm.cmd test`
Expected: PASS

**Step 2: Run build**

Run: `npm.cmd run build`
Expected: PASS

**Step 3: Do a quick smoke audit**

- Check that:
  - docs match shipped behavior
  - court reactions now differ by intel depth
  - ending page shows layered report
  - relationship-triggered penalties appear in settlement facts
