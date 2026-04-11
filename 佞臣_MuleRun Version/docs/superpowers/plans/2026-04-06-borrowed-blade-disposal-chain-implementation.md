# Borrowed Blade Disposal Chain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a disposal-stage system for key court NPCs so `proxy` can escalate from pressure to formal disposal and, at the top end, kill a target NPC through a staged “borrowed blade” chain.

**Architecture:** Introduce a lightweight disposal-state model for a small set of court NPCs, advance it from scheme outcomes in `roundSettlement`, and let `proxy` resolve into four tiers instead of plain trust/faction damage. Keep the final `isAlive = false` write centralized in settlement, not inside scheme parsing. Reuse existing relationship, intel, and ending pipelines instead of building parallel systems.

**Tech Stack:** TypeScript, Vitest, existing game-state pipeline (`schemeEngine`, `roundSettlement`, Zustand state, ending/intel UI).

---

## File Map

### Core state and resolution
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\types.ts`
  - Add disposal stage/result types and settlement report shapes.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\schemeEngine.ts`
  - Let `proxy` compute a disposal-oriented result tier input instead of only generic harm.
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\borrowedBladeEngine.ts`
  - Centralize disposal-stage advancement, proxy outcome rules, and kill eligibility checks.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\roundSettlement.ts`
  - Thread disposal stages, apply stage advancement, and kill NPCs in settlement.

### Persistence and presentation
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\stores\gameStore.ts`
  - Ensure disposal-stage state survives round transitions and save/load snapshots.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\endingEngine.ts`
  - Surface “died to borrowed blade” fates in ending output.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\roundIntelEngine.ts`
  - Include borrowed-blade disposal summaries in intel when relevant.

### Tests
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\borrowedBladeEngine.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\roundSettlement.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\endingEngine.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\roundIntelEngine.test.ts`

## Task 1: Add disposal-stage types and target list

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\types.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\borrowedBladeEngine.test.ts`

- [ ] **Step 1: Write the failing type-level/unit test scaffold**

Add a new test file with a target-list and stage sanity test:

```ts
import { describe, expect, it } from 'vitest'
import {
  BORROWED_BLADE_TARGET_IDS,
  canUseBorrowedBladeDisposalStage,
  initialBorrowedBladeStages,
} from './borrowedBladeEngine'

describe('borrowedBladeEngine target scope', () => {
  it('only enables disposal stages for the first five supported court targets', () => {
    expect(BORROWED_BLADE_TARGET_IDS).toEqual([
      'zuting',
      'zongai',
      'yuwendi',
      'linghuelvguang',
      'weichimu',
    ])
    expect(canUseBorrowedBladeDisposalStage('zuting')).toBe(true)
    expect(canUseBorrowedBladeDisposalStage('hebaqi')).toBe(false)
  })

  it('starts supported targets at safe', () => {
    const stages = initialBorrowedBladeStages()
    expect(stages.zuting).toBe('safe')
    expect(stages.weichimu).toBe('safe')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npx.cmd vitest run "src/game/borrowedBladeEngine.test.ts"
```

Expected:
- FAIL because `borrowedBladeEngine.ts` does not exist.

- [ ] **Step 3: Define the shared types in `types.ts`**

Add these types near other round/ending support types:

```ts
export type BorrowedBladeDisposalStage = 'safe' | 'questioned' | 'isolated' | 'disposable'

export type BorrowedBladeOutcome = 'failed' | 'light' | 'heavy' | 'kill'

export interface BorrowedBladeReport {
  actorNpcId: string
  actorNpcName: string
  targetNpcId: string
  targetNpcName: string
  outcome: BorrowedBladeOutcome
  summary: string
}
```

Also extend settlement-facing state payloads with:

```ts
borrowedBladeStages?: Partial<Record<string, BorrowedBladeDisposalStage>>
borrowedBladeReports?: BorrowedBladeReport[]
```

- [ ] **Step 4: Create `borrowedBladeEngine.ts` with target list and initial state**

Create:

```ts
import type { BorrowedBladeDisposalStage } from './types'

export const BORROWED_BLADE_TARGET_IDS = [
  'zuting',
  'zongai',
  'yuwendi',
  'linghuelvguang',
  'weichimu',
] as const

export function canUseBorrowedBladeDisposalStage(npcId: string): boolean {
  return BORROWED_BLADE_TARGET_IDS.includes(npcId as (typeof BORROWED_BLADE_TARGET_IDS)[number])
}

export function initialBorrowedBladeStages(): Record<string, BorrowedBladeDisposalStage> {
  return Object.fromEntries(BORROWED_BLADE_TARGET_IDS.map(id => [id, 'safe'])) as Record<string, BorrowedBladeDisposalStage>
}
```

- [ ] **Step 5: Run the new test**

Run:

```powershell
npx.cmd vitest run "src/game/borrowedBladeEngine.test.ts"
```

Expected:
- PASS

- [ ] **Step 6: Commit**

```powershell
git add src/game/types.ts src/game/borrowedBladeEngine.ts src/game/borrowedBladeEngine.test.ts
git commit -m "feat: add borrowed blade disposal stage types"
```

## Task 2: Advance disposal stages from slander, alienate, frame, and omen

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\borrowedBladeEngine.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\roundSettlement.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\borrowedBladeEngine.test.ts`

- [ ] **Step 1: Add failing stage-advance tests**

Extend `borrowedBladeEngine.test.ts`:

```ts
import { advanceBorrowedBladeStage } from './borrowedBladeEngine'

it('lets slander move a supported target from safe to questioned', () => {
  expect(
    advanceBorrowedBladeStage('safe', {
      schemeType: 'slander',
      success: true,
      transmission: 0.62,
      scapegoat: 0,
      legitimacyCrack: 0,
    }),
  ).toBe('questioned')
})

it('lets alienate move a questioned target to isolated', () => {
  expect(
    advanceBorrowedBladeStage('questioned', {
      schemeType: 'alienate',
      success: true,
      transmission: 0.74,
      scapegoat: 0,
      legitimacyCrack: 0,
    }),
  ).toBe('isolated')
})

it('lets frame move an isolated target toward disposable when blame clearly falls back on them', () => {
  expect(
    advanceBorrowedBladeStage('isolated', {
      schemeType: 'frame',
      success: true,
      transmission: 0,
      scapegoat: 0.82,
      legitimacyCrack: 0,
    }),
  ).toBe('disposable')
})
```

- [ ] **Step 2: Run to verify failure**

Run:

```powershell
npx.cmd vitest run "src/game/borrowedBladeEngine.test.ts"
```

Expected:
- FAIL because `advanceBorrowedBladeStage` is missing.

- [ ] **Step 3: Implement stage advancement**

Add to `borrowedBladeEngine.ts`:

```ts
import type { BorrowedBladeDisposalStage, SchemeType } from './types'

export function advanceBorrowedBladeStage(
  current: BorrowedBladeDisposalStage,
  input: {
    schemeType: SchemeType
    success: boolean
    transmission: number
    scapegoat: number
    legitimacyCrack: number
  },
): BorrowedBladeDisposalStage {
  if (!input.success) return current

  if (input.schemeType === 'slander' && input.transmission >= 0.5) {
    return current === 'safe' ? 'questioned' : current
  }

  if (input.schemeType === 'alienate' && input.transmission >= 0.55) {
    if (current === 'safe') return 'questioned'
    if (current === 'questioned') return 'isolated'
  }

  if (input.schemeType === 'frame' && input.scapegoat >= 0.58) {
    if (current === 'safe') return 'questioned'
    if (current === 'questioned') return 'isolated'
    if (current === 'isolated') return 'disposable'
  }

  if (input.schemeType === 'omen' && input.legitimacyCrack >= 0.62) {
    if (current === 'questioned') return 'isolated'
    if (current === 'isolated') return 'disposable'
  }

  return current
}
```

- [ ] **Step 4: Wire stage advancement inside `roundSettlement.ts`**

When iterating action results, after scheme settlement is known and before final death/invasion checks, update a `borrowedBladeStages` map for supported target NPCs:

```ts
const nextStage = advanceBorrowedBladeStage(currentStage, {
  schemeType: action.schemeType,
  success: result.success,
  transmission:
    action.schemeType === 'slander'
      ? result.northParse?.suspicionTransmission ?? 0
      : action.schemeType === 'alienate'
        ? result.northParse?.fractureTransmission ?? 0
        : action.schemeType === 'proxy'
          ? result.northParse?.proxyTransmission ?? 0
          : 0,
  scapegoat: result.northParse?.scapegoatClarity ?? 0,
  legitimacyCrack: result.northParse?.legitimacyCrack ?? 0,
})
```

- [ ] **Step 5: Re-run stage tests**

Run:

```powershell
npx.cmd vitest run "src/game/borrowedBladeEngine.test.ts"
```

Expected:
- PASS

- [ ] **Step 6: Commit**

```powershell
git add src/game/borrowedBladeEngine.ts src/game/roundSettlement.ts src/game/borrowedBladeEngine.test.ts
git commit -m "feat: advance borrowed blade disposal stages"
```

## Task 3: Give proxy four outcome tiers instead of plain generic success

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\borrowedBladeEngine.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\schemeEngine.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\borrowedBladeEngine.test.ts`

- [ ] **Step 1: Add failing proxy-outcome tests**

```ts
import { resolveBorrowedBladeOutcome } from './borrowedBladeEngine'

it('keeps proxy at light success when target is only questioned', () => {
  expect(
    resolveBorrowedBladeOutcome({
      actorTrust: 78,
      targetStage: 'questioned',
      proxyTransmission: 0.82,
      canExecute: true,
      roundWindowOpen: true,
    }).outcome,
  ).toBe('light')
})

it('allows kill only from disposable with strong actor trust and public cover', () => {
  expect(
    resolveBorrowedBladeOutcome({
      actorTrust: 88,
      targetStage: 'disposable',
      proxyTransmission: 0.86,
      canExecute: true,
      roundWindowOpen: true,
    }).outcome,
  ).toBe('kill')
})
```

- [ ] **Step 2: Run to verify failure**

Run:

```powershell
npx.cmd vitest run "src/game/borrowedBladeEngine.test.ts"
```

Expected:
- FAIL because `resolveBorrowedBladeOutcome` is missing.

- [ ] **Step 3: Implement outcome resolver**

Add:

```ts
import type { BorrowedBladeDisposalStage, BorrowedBladeOutcome } from './types'

export function resolveBorrowedBladeOutcome(input: {
  actorTrust: number
  targetStage: BorrowedBladeDisposalStage
  proxyTransmission: number
  canExecute: boolean
  roundWindowOpen: boolean
}): { outcome: BorrowedBladeOutcome; summaryKey: string } {
  if (!input.canExecute || input.actorTrust < 70 || input.proxyTransmission < 0.45) {
    return { outcome: 'failed', summaryKey: 'failed' }
  }

  if (input.targetStage === 'safe' || input.targetStage === 'questioned') {
    return { outcome: 'light', summaryKey: 'light' }
  }

  if (input.targetStage === 'isolated') {
    return { outcome: 'heavy', summaryKey: 'heavy' }
  }

  if (input.targetStage === 'disposable' && input.roundWindowOpen && input.actorTrust >= 84 && input.proxyTransmission >= 0.72) {
    return { outcome: 'kill', summaryKey: 'kill' }
  }

  return { outcome: 'heavy', summaryKey: 'heavy' }
}
```

- [ ] **Step 4: Use the resolver in `schemeEngine.ts`**

Do not kill inside `schemeEngine`; instead, return enough proxy metadata for settlement to process. Add a new field on `SchemeResult`, for example:

```ts
proxyOutcome?: BorrowedBladeOutcome | null
```

Set it on `proxy` success/failure by calling the new resolver with:

- actor trust = `targetNpc.trust`
- target stage supplied later from settlement context if available, otherwise `safe`
- `proxyTransmission`
- `targetNpc.canExecute`
- rough round window check such as `round >= 7`

If the stage is not available inside `schemeEngine`, keep only a “candidate outcome” there and let settlement finalize it.

- [ ] **Step 5: Re-run tests**

Run:

```powershell
npx.cmd vitest run "src/game/borrowedBladeEngine.test.ts" "src/game/schemeEngine.test.ts"
```

Expected:
- PASS

- [ ] **Step 6: Commit**

```powershell
git add src/game/borrowedBladeEngine.ts src/game/schemeEngine.ts src/game/borrowedBladeEngine.test.ts src/game/schemeEngine.test.ts
git commit -m "feat: add borrowed blade outcome tiers"
```

## Task 4: Let settlement kill supported NPCs and emit reports

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\roundSettlement.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\types.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\roundSettlement.test.ts`

- [ ] **Step 1: Add failing settlement tests**

Add tests like:

```ts
it('does not let proxy kill a target that is only isolated', () => {
  // arrange target stage isolated, strong proxy parse
  // expect target stays alive
})

it('lets proxy kill a disposable supported target in an open round window', () => {
  // arrange zuting or zongai at disposable
  // expect updatedNpc.isAlive === false
  // expect borrowedBladeReports includes outcome kill
})
```

- [ ] **Step 2: Run to verify failure**

Run:

```powershell
npx.cmd vitest run "src/game/roundSettlement.test.ts"
```

Expected:
- FAIL because settlement does not yet process proxy kills.

- [ ] **Step 3: Implement settlement-side borrowed blade resolution**

Inside the per-action settlement loop:

```ts
if (action.schemeType === 'proxy' && result.success && relatedNpc && canUseBorrowedBladeDisposalStage(relatedNpc.id)) {
  const currentStage = borrowedBladeStages[relatedNpc.id] ?? 'safe'
  const resolved = resolveBorrowedBladeOutcome({
    actorTrust: targetNpc.trust,
    targetStage: currentStage,
    proxyTransmission: result.northParse?.proxyTransmission ?? 0,
    canExecute: Boolean(targetNpc.canExecute),
    roundWindowOpen: round >= 7,
  })

  if (resolved.outcome === 'kill' && currentStage === 'disposable' && relatedNpc.isAlive) {
    relatedNpc.isAlive = false
  }

  borrowedBladeReports.push(...)
}
```

The report text should distinguish:
- failed
- light
- heavy
- kill

- [ ] **Step 4: Ensure only the five supported NPCs can die this way**

Guard with:

```ts
if (!canUseBorrowedBladeDisposalStage(relatedNpc.id)) return
```

- [ ] **Step 5: Re-run settlement tests**

Run:

```powershell
npx.cmd vitest run "src/game/roundSettlement.test.ts"
```

Expected:
- PASS

- [ ] **Step 6: Commit**

```powershell
git add src/game/roundSettlement.ts src/game/types.ts src/game/roundSettlement.test.ts
git commit -m "feat: resolve borrowed blade kills in settlement"
```

## Task 5: Surface NPC death in intel and endings

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\roundIntelEngine.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\endingEngine.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\roundIntelEngine.test.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\endingEngine.test.ts`

- [ ] **Step 1: Add failing report tests**

```ts
it('mentions a borrowed-blade death in round intel', () => {
  // borrowedBladeReports includes kill
  // expect intel summary to reference the removal
})

it('adds a borrowed-blade fate line for dead supported NPCs', () => {
  // ending input includes npc isAlive false due to proxy report
  // expect npcFates to mention借刀/设局清除
})
```

- [ ] **Step 2: Run to verify failure**

Run:

```powershell
npx.cmd vitest run "src/game/roundIntelEngine.test.ts" "src/game/endingEngine.test.ts"
```

Expected:
- FAIL because borrowed-blade reports are ignored.

- [ ] **Step 3: Implement intel summary support**

In `roundIntelEngine.ts`, append summary lines such as:

```ts
if (report.outcome === 'kill') {
  lines.push(`冯道之：${report.actorNpcName} 已借局将 ${report.targetNpcName} 从朝局中抹去。`)
}
```

- [ ] **Step 4: Implement ending fate support**

In `endingEngine.ts`, when a tracked NPC is dead and there is a matching borrowed-blade report, add a fate like:

```ts
`${npc.name} 最终死于朝局借刀之手，既无人替其昭雪，也无人敢替其辩白。`
```

- [ ] **Step 5: Re-run report tests**

Run:

```powershell
npx.cmd vitest run "src/game/roundIntelEngine.test.ts" "src/game/endingEngine.test.ts"
```

Expected:
- PASS

- [ ] **Step 6: Commit**

```powershell
git add src/game/roundIntelEngine.ts src/game/endingEngine.ts src/game/roundIntelEngine.test.ts src/game/endingEngine.test.ts
git commit -m "feat: surface borrowed blade deaths in intel and endings"
```

## Task 6: Full verification

**Files:**
- No new files

- [ ] **Step 1: Run focused borrowed-blade suite**

```powershell
npx.cmd vitest run "src/game/borrowedBladeEngine.test.ts" "src/game/roundSettlement.test.ts" "src/game/roundIntelEngine.test.ts" "src/game/endingEngine.test.ts"
```

Expected:
- PASS

- [ ] **Step 2: Run full test suite**

```powershell
npx.cmd vitest run
```

Expected:
- All tests pass, existing skips remain skips.

- [ ] **Step 3: Run production build**

```powershell
npm.cmd run build
```

Expected:
- Build completes successfully.

- [ ] **Step 4: Commit final verification-only touch if needed**

Only if any verification-related fixture changed:

```powershell
git add <changed-files>
git commit -m "test: cover borrowed blade disposal chain"
```

## Self-review

Spec coverage check:
- Disposal-stage state machine: covered by Tasks 1-2
- Four proxy outcomes: covered by Task 3
- Settlement-side kill resolution: covered by Task 4
- First five supported NPCs only: covered by Tasks 1 and 4
- Intel/ending surfacing: covered by Task 5

Placeholder scan:
- No TODO/TBD placeholders left
- Every task includes exact files and commands

Type consistency:
- Uses one consistent naming set:
  - `BorrowedBladeDisposalStage`
  - `BorrowedBladeOutcome`
  - `BorrowedBladeReport`
  - `advanceBorrowedBladeStage`
  - `resolveBorrowedBladeOutcome`

