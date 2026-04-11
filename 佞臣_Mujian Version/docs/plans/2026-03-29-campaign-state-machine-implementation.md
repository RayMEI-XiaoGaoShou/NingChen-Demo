# Campaign State Machine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add minimal persistent campaign states for the Shu and Huainan wars so campaign outcomes drive branching policy questions, immediate impact, and ongoing fallout.

**Architecture:** Extend the round settlement pipeline with two lightweight campaign state records, evaluate outcomes at rounds 10 and 16, apply immediate and ongoing dimension changes, and route rounds 11 and 17 policy questions through campaign-aware selectors. Keep the existing 20-round loop intact and layer the feature into current store/settlement/data patterns.

**Tech Stack:** React, TypeScript, Zustand, Vitest

---

### Task 1: Define campaign state types and persisted store fields

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\types.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\stores\gameStore.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\saveEngine.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\stores\gameStore.test.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\saveEngine.test.ts`

- [ ] **Step 1: Write failing store/save tests for campaign state persistence**

Add tests asserting the store starts with idle campaign states and that save/load preserves them.

```ts
it('starts with idle campaign states', () => {
  const state = useGameStore.getState()
  expect(state.shuCampaign.state).toBe('idle')
  expect(state.huainanCampaign.state).toBe('idle')
})

it('persists campaign state through save snapshots', () => {
  const snapshot = serializeGameState({
    ...baseState,
    shuCampaign: {
      state: 'gained',
      sourceRound: 10,
      summary: '蜀地已得手',
      ongoingNorthImpact: { governance: -1.2 },
      ongoingSouthImpact: { grain: 1.1 },
      remainingRounds: 2,
    },
  })
  expect(snapshot.shuCampaign?.state).toBe('gained')
})
```

- [ ] **Step 2: Run targeted tests and confirm failure**

Run:

```powershell
npm.cmd test -- gameStore.test.ts saveEngine.test.ts
```

Expected: FAIL with missing `shuCampaign` / `huainanCampaign` fields.

- [ ] **Step 3: Add campaign state types**

Add focused types in `types.ts`.

```ts
export type CampaignOutcomeState = 'idle' | 'gained' | 'stalemate' | 'failed'

export interface CampaignState {
  state: CampaignOutcomeState
  sourceRound: number | null
  summary: string
  ongoingNorthImpact: Partial<NationDimensions>
  ongoingSouthImpact: Partial<NationDimensions>
  remainingRounds: number
}
```

- [ ] **Step 4: Add store fields and reset/load/save wiring**

In `gameStore.ts`, add:

```ts
shuCampaign: {
  state: 'idle',
  sourceRound: null,
  summary: '',
  ongoingNorthImpact: {},
  ongoingSouthImpact: {},
  remainingRounds: 0,
},
huainanCampaign: {
  state: 'idle',
  sourceRound: null,
  summary: '',
  ongoingNorthImpact: {},
  ongoingSouthImpact: {},
  remainingRounds: 0,
},
```

Ensure these fields are:
- included in reset/new-game flows
- serialized in save snapshots
- restored in `loadSnapshot`

- [ ] **Step 5: Run targeted tests and confirm pass**

Run:

```powershell
npm.cmd test -- gameStore.test.ts saveEngine.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```powershell
git add "C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\types.ts" "C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\stores\gameStore.ts" "C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\saveEngine.ts" "C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\stores\gameStore.test.ts" "C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\saveEngine.test.ts"
git commit -m "feat: persist campaign state"
```

### Task 2: Add campaign evaluators and impact helpers

**Files:**
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\campaignEngine.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\campaignEngine.test.ts`

- [ ] **Step 1: Write failing evaluator tests**

Add tests for Shu/Huainan outcomes and ongoing fallout.

```ts
it('marks shu campaign as gained when south prep beats north effective commitment', () => {
  const result = evaluateShuCampaignOutcome({
    round: 10,
    southStats: { finance: 62, grain: 70, military: 68, socialOrder: 58, governance: 66 },
    northStats: { finance: 60, grain: 63, military: 74, socialOrder: 50, governance: 58 },
    northPressurePenalty: 8,
    policyBoost: 4,
  })
  expect(result.state).toBe('gained')
  expect((result.instantNorthImpact.governance ?? 0)).toBeLessThan(0)
})

it('marks huainan campaign as failed when south prep is too weak', () => {
  const result = evaluateHuainanCampaignOutcome({
    round: 16,
    southStats: { finance: 45, grain: 48, military: 50, socialOrder: 46, governance: 50 },
    northStats: { finance: 68, grain: 70, military: 77, socialOrder: 60, governance: 61 },
    northPressurePenalty: 1,
    policyBoost: 0,
  })
  expect(result.state).toBe('failed')
  expect((result.instantSouthImpact.military ?? 0)).toBeLessThan(0)
})
```

- [ ] **Step 2: Run test and confirm failure**

Run:

```powershell
npm.cmd test -- campaignEngine.test.ts
```

Expected: FAIL with missing module/function errors.

- [ ] **Step 3: Implement the campaign engine**

Create `campaignEngine.ts` with:
- outcome score helpers
- north effective commitment calculation
- immediate impact tables
- ongoing fallout tables

Core shape:

```ts
export interface CampaignEvaluationResult {
  state: CampaignOutcomeState
  summary: string
  instantNorthImpact: Partial<NationDimensions>
  instantSouthImpact: Partial<NationDimensions>
  ongoingNorthImpact: Partial<NationDimensions>
  ongoingSouthImpact: Partial<NationDimensions>
  remainingRounds: number
}
```

Add:

```ts
export function evaluateShuCampaignOutcome(...) { ... }
export function evaluateHuainanCampaignOutcome(...) { ... }
export function tickCampaignFallout(campaign: CampaignState) { ... }
```

Rules to encode:
- `gained`: strong north immediate hit + 2 rounds of fallout
- `stalemate`: mild immediate swing + 1-2 rounds of mild fallout
- `failed`: south-only setback, no north territorial fallout

- [ ] **Step 4: Run campaign engine tests and confirm pass**

Run:

```powershell
npm.cmd test -- campaignEngine.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add "C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\campaignEngine.ts" "C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\campaignEngine.test.ts"
git commit -m "feat: add campaign outcome engine"
```

### Task 3: Route policy questions by campaign state

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\data\policyQuestions.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\data\policyQuestions.test.ts`

- [ ] **Step 1: Write failing tests for round 11 and 17 routing**

```ts
it('returns branch-specific round 11 question based on shu state', () => {
  const gained = getPolicyQuestionForRound(11, { shuCampaignState: 'gained', huainanCampaignState: 'idle' })
  const failed = getPolicyQuestionForRound(11, { shuCampaignState: 'failed', huainanCampaignState: 'idle' })
  expect(gained?.topic).toContain('新地')
  expect(failed?.topic).toContain('止损')
})

it('returns branch-specific round 17 question based on huainan state', () => {
  const stalemate = getPolicyQuestionForRound(17, { shuCampaignState: 'idle', huainanCampaignState: 'stalemate' })
  expect(stalemate?.topic).toContain('久战')
})
```

- [ ] **Step 2: Run test and confirm failure**

Run:

```powershell
npm.cmd test -- policyQuestions.test.ts
```

Expected: FAIL with missing `getPolicyQuestionForRound`.

- [ ] **Step 3: Extend policy question data with branch sets**

Keep existing round data and add branch-specific variants for:
- round 11: `gained/stalemate/failed`
- round 17: `gained/stalemate/failed`

Add a new selector:

```ts
export function getPolicyQuestionForRound(
  round: number,
  campaigns: { shuCampaignState: CampaignOutcomeState; huainanCampaignState: CampaignOutcomeState },
): PolicyQuestion | null { ... }
```

Use base questions for all non-branch rounds.

- [ ] **Step 4: Run policy question tests and confirm pass**

Run:

```powershell
npm.cmd test -- policyQuestions.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add "C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\data\policyQuestions.ts" "C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\data\policyQuestions.test.ts"
git commit -m "feat: branch campaign policy questions"
```

### Task 4: Integrate campaign outcomes into settlement

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\roundSettlement.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\stores\gameStore.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\roundSettlement.test.ts`

- [ ] **Step 1: Write failing settlement tests for rounds 10/11 and 16/17**

```ts
it('stores shu campaign result on round 10 and applies immediate north hit', () => {
  const result = settleRound({
    round: 10,
    schemes: [],
    northStats: baseNorth,
    southStats: strongSouth,
    npcs: baseNpcs,
    factions: baseFactions,
    intelProgress: {},
    policyOptionIndex: 1,
    policyReason: '先断粮道再逼蜀地松动',
    shuCampaign: idleCampaign,
    huainanCampaign: idleCampaign,
  })
  expect(result.shuCampaign.state).toBe('gained')
  expect(result.northStatsAfter.governance).toBeLessThan(baseNorth.governance - 1)
})

it('applies stored shu fallout on round 11', () => {
  const result = settleRound({
    round: 11,
    schemes: [],
    northStats: baseNorth,
    southStats: baseSouth,
    npcs: baseNpcs,
    factions: baseFactions,
    intelProgress: {},
    policyOptionIndex: null,
    policyReason: '',
    shuCampaign: {
      state: 'gained',
      sourceRound: 10,
      summary: '蜀地已得手',
      ongoingNorthImpact: { governance: -1.2 },
      ongoingSouthImpact: { grain: 1.1 },
      remainingRounds: 2,
    },
    huainanCampaign: idleCampaign,
  })
  expect(result.northStatsAfter.governance).toBeLessThan(baseNorth.governance)
  expect(result.shuCampaign.remainingRounds).toBe(1)
})
```

- [ ] **Step 2: Run targeted settlement tests and confirm failure**

Run:

```powershell
npm.cmd test -- roundSettlement.test.ts
```

Expected: FAIL with missing campaign params/results.

- [ ] **Step 3: Extend settlement input and output**

Update `settleRound` params and result to include:

```ts
shuCampaign: CampaignState
huainanCampaign: CampaignState
```

and result fields:

```ts
shuCampaign: CampaignState
huainanCampaign: CampaignState
campaignReports: string[]
```

- [ ] **Step 4: Apply campaign evaluation at rounds 10 and 16**

Inside `settleRound`:
- after policy effect, evaluate round 10 Shu or round 16 Huainan
- apply `instantNorthImpact` / `instantSouthImpact`
- store returned campaign state

- [ ] **Step 5: Apply ongoing fallout on rounds 11-12 and 17-18**

Use `tickCampaignFallout` before natural growth:
- apply ongoing north/south impacts
- decrement `remainingRounds`
- reset to idle once finished

- [ ] **Step 6: Wire game store to pass and persist campaign state through settlement**

Update `gameStore.ts` so `nextPhase` / settlement calls pass the two campaign state objects and save the returned ones back into store state.

- [ ] **Step 7: Run settlement tests and confirm pass**

Run:

```powershell
npm.cmd test -- roundSettlement.test.ts gameStore.test.ts
```

Expected: PASS

- [ ] **Step 8: Commit**

```powershell
git add "C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\roundSettlement.ts" "C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\stores\gameStore.ts" "C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\roundSettlement.test.ts" "C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\stores\gameStore.test.ts"
git commit -m "feat: integrate campaign outcomes into settlement"
```

### Task 5: Show branch-aware policy prompts and campaign summaries in UI

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\EmpressLetter\EmpressLetter.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\Settlement\Settlement.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\RoundStart\RoundStart.tsx`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\EmpressLetter\EmpressLetter.test.tsx`

- [ ] **Step 1: Write failing UI tests for branch-aware question selection**

```tsx
it('shows shu failed branch policy topic on round 11', () => {
  renderWithStore({
    round: 11,
    currentPhase: 'EMPRESS_LETTER',
    shuCampaign: { ...failedCampaign, state: 'failed' },
  })
  expect(screen.getByText(/止损/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run UI test and confirm failure**

Run:

```powershell
npm.cmd test -- EmpressLetter.test.tsx
```

Expected: FAIL because component still uses base round selector.

- [ ] **Step 3: Update EmpressLetter to use campaign-aware question selector**

Replace base round lookup with `getPolicyQuestionForRound(round, ...)`.

- [ ] **Step 4: Update settlement and round start displays**

Add compact campaign summaries:
- settlement: `征蜀得手/僵持/失利` or `征淮南得手/僵持/失利`
- round start: if fallout is active, show one short line like `蜀地方向余波仍在继续。`

- [ ] **Step 5: Run UI tests and build**

Run:

```powershell
npm.cmd test -- EmpressLetter.test.tsx
npm.cmd run build
```

Expected: PASS / build success

- [ ] **Step 6: Commit**

```powershell
git add "C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\EmpressLetter\EmpressLetter.tsx" "C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\Settlement\Settlement.tsx" "C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\RoundStart\RoundStart.tsx" "C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\EmpressLetter\EmpressLetter.test.tsx"
git commit -m "feat: surface campaign state in UI"
```

### Task 6: Sync planning docs and full verification

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣策划案v1\综合国力系统.md`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣策划案v1\天道判官结算规则.md`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣策划案v1\南陈问政题库.md`

- [ ] **Step 1: Update planning docs to match implemented campaign states**

Document:
- campaign states
- immediate strike + ongoing fallout
- branch questions for rounds 11 and 17
- north effective commitment concept

- [ ] **Step 2: Run full test suite**

Run:

```powershell
npm.cmd test
```

Expected: all tests pass.

- [ ] **Step 3: Run production build**

Run:

```powershell
npm.cmd run build
```

Expected: build completes successfully.

- [ ] **Step 4: Commit**

```powershell
git add "C:\Users\happyelements\Desktop\佞臣 Demo\佞臣策划案v1\综合国力系统.md" "C:\Users\happyelements\Desktop\佞臣 Demo\佞臣策划案v1\天道判官结算规则.md" "C:\Users\happyelements\Desktop\佞臣 Demo\佞臣策划案v1\南陈问政题库.md"
git commit -m "docs: align campaign-state design with implementation"
```

## Self-review

### Spec coverage

- Campaign states: covered in Tasks 1 and 4
- Outcome evaluation and effective commitment: covered in Task 2
- Immediate strike and ongoing fallout: covered in Tasks 2 and 4
- Round 11/17 branch policy routing: covered in Tasks 3 and 5
- UI and settlement summaries: covered in Task 5
- Planning doc alignment: covered in Task 6

### Placeholder scan

No `TODO / TBD / implement later` placeholders remain in this plan.

### Type consistency

This plan consistently uses:
- `CampaignOutcomeState`
- `CampaignState`
- `evaluateShuCampaignOutcome`
- `evaluateHuainanCampaignOutcome`
- `getPolicyQuestionForRound`

