# Campaign Momentum Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `shuMomentum / huainanMomentum` so battle-relevant court play can meaningfully improve campaign outcomes, then validate that winning samples no longer default to double campaign failure.

**Architecture:** Extend round settlement with two momentum tracks that accumulate only from battle-relevant successful schemes and selected policy outcomes, then feed those values into the round 10 / round 16 campaign formulas. Keep the first pass conservative: momentum should tilt marginal wins into `single gained / double stalemate`, not reintroduce free campaign snowballs. Add an `expert-omen` sample so live AI testing can measure the full omen gradient after the new transmission layer lands.

**Tech Stack:** TypeScript, React, Zustand, Vitest, existing live balance harness with DeepSeek-backed parse runs

---

### Task 1: Define momentum state and battle score plumbing

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\types.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\stores\gameStore.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\campaignEngine.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\campaignEngine.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it('adds shu momentum bonus into round 10 campaign scoring', () => {
  const withoutMomentum = evaluateShuCampaignOutcome({
    round: 10,
    southStats: { finance: 55, grain: 61, military: 60, socialOrder: 56, governance: 60 },
    northStats: { finance: 60, grain: 63, military: 70, socialOrder: 54, governance: 58 },
    northPressurePenalty: 4,
    policyBoost: 2,
    momentumBonus: 0,
  })

  const withMomentum = evaluateShuCampaignOutcome({
    round: 10,
    southStats: { finance: 55, grain: 61, military: 60, socialOrder: 56, governance: 60 },
    northStats: { finance: 60, grain: 63, military: 70, socialOrder: 54, governance: 58 },
    northPressurePenalty: 4,
    policyBoost: 2,
    momentumBonus: 3,
  })

  expect(withMomentum.state).not.toBe('failed')
  expect(withoutMomentum.state).toBe('failed')
})

it('stores shu and huainan momentum in game state', () => {
  const state = createInitialGameState()
  expect(state.shuMomentum).toBe(0)
  expect(state.huainanMomentum).toBe(0)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx.cmd vitest run src\game\campaignEngine.test.ts src\stores\gameStore.test.ts`

Expected: FAIL because `momentumBonus`, `shuMomentum`, and `huainanMomentum` do not exist yet.

- [ ] **Step 3: Add the minimal state and function signature changes**

```ts
export interface CampaignEvaluationInput {
  round: number
  difficulty?: GameDifficulty
  southStats: NationDimensions
  northStats: NationDimensions
  northPressurePenalty: number
  policyBoost: number
  momentumBonus?: number
}

export interface GameState {
  // ...
  shuMomentum: number
  huainanMomentum: number
}
```

```ts
const score =
  southPrep - northCommitment + profile.campaign.scoreBias + (input.momentumBonus ?? 0)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx.cmd vitest run src\game\campaignEngine.test.ts src\stores\gameStore.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/types.ts src/stores/gameStore.ts src/game/campaignEngine.ts src/game/campaignEngine.test.ts src/stores/gameStore.test.ts
git commit -m "feat: add campaign momentum state and scoring input"
```

### Task 2: Accumulate momentum from battle-relevant successful play

**Files:**
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\campaignMomentum.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\roundSettlement.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\campaignMomentum.test.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\roundSettlement.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it('adds shu momentum for successful grain-military-governance court schemes before round 10', () => {
  const result = deriveCampaignMomentumGain({
    round: 8,
    campaign: 'shu',
    schemeType: 'advise',
    success: true,
    parse: {
      characterFit: 0.7,
      eventFit: 0.7,
      structuralPenetration: 0.7,
      executability: 0.6,
      exposureRisk: 0.2,
      financeRelevance: 0.1,
      grainRelevance: 0.8,
      militaryRelevance: 0.7,
      socialOrderRelevance: 0.2,
      governanceRelevance: 0.8,
      dominantIntent: 'strategize',
      evidence: [],
    },
  })

  expect(result.shuMomentumGain).toBeGreaterThan(0)
  expect(result.huainanMomentumGain).toBe(0)
})

it('does not reward generic pressure speeches with momentum', () => {
  const result = deriveCampaignMomentumGain({
    round: 8,
    campaign: 'shu',
    schemeType: 'slander',
    success: true,
    parse: {
      characterFit: 0.4,
      eventFit: 0.4,
      structuralPenetration: 0.2,
      executability: 0.2,
      exposureRisk: 0.5,
      financeRelevance: 0.1,
      grainRelevance: 0.1,
      militaryRelevance: 0.1,
      socialOrderRelevance: 0.3,
      governanceRelevance: 0.2,
      dominantIntent: 'divide',
      evidence: [],
    },
  })

  expect(result.shuMomentumGain).toBe(0)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx.cmd vitest run src\game\campaignMomentum.test.ts src\game\roundSettlement.test.ts`

Expected: FAIL because `campaignMomentum.ts` does not exist and settlement does not track gains yet.

- [ ] **Step 3: Implement conservative momentum accumulation**

```ts
export function deriveCampaignMomentumGain(params: {
  round: number
  schemeType: SchemeType
  success: boolean
  parse?: NorthSchemeParseResult | null
}): { shuMomentumGain: number; huainanMomentumGain: number } {
  if (!params.success || !params.parse) {
    return { shuMomentumGain: 0, huainanMomentumGain: 0 }
  }

  const battleSignal =
    params.parse.militaryRelevance * 0.35 +
    params.parse.grainRelevance * 0.35 +
    params.parse.governanceRelevance * 0.3

  const qualityGate =
    params.parse.characterFit >= 0.45 &&
    params.parse.eventFit >= 0.4 &&
    params.parse.structuralPenetration >= 0.35

  if (!qualityGate || battleSignal < 0.42) {
    return { shuMomentumGain: 0, huainanMomentumGain: 0 }
  }

  const baseGain = Math.min(1.2, Number((battleSignal - 0.35).toFixed(2)))

  if (params.round <= 10) return { shuMomentumGain: baseGain, huainanMomentumGain: 0 }
  if (params.round <= 16) return { shuMomentumGain: 0, huainanMomentumGain: baseGain }
  return { shuMomentumGain: 0, huainanMomentumGain: 0 }
}
```

- [ ] **Step 4: Wire the gains into settlement**

```ts
let shuMomentum = params.shuMomentum ?? 0
let huainanMomentum = params.huainanMomentum ?? 0

for (const schemeResult of schemeResults) {
  const gain = deriveCampaignMomentumGain({
    round,
    schemeType: schemeResult.schemeType,
    success: schemeResult.success,
    parse: schemeResult.northParse ?? null,
  })
  shuMomentum = roundValue(shuMomentum + gain.shuMomentumGain)
  huainanMomentum = roundValue(huainanMomentum + gain.huainanMomentumGain)
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx.cmd vitest run src\game\campaignMomentum.test.ts src\game\roundSettlement.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/game/campaignMomentum.ts src/game/campaignMomentum.test.ts src/game/roundSettlement.ts src/game/roundSettlement.test.ts
git commit -m "feat: accumulate campaign momentum from battle-relevant schemes"
```

### Task 3: Let policy and omen successes amplify momentum instead of only raw battle score

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\campaignMomentum.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\roundSettlement.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\campaignMomentum.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it('gives omen a larger momentum gain only when legitimacy-oriented governance pressure is real', () => {
  const result = deriveCampaignMomentumGain({
    round: 14,
    schemeType: 'omen',
    success: true,
    parse: {
      characterFit: 0.75,
      eventFit: 0.8,
      structuralPenetration: 0.7,
      executability: 0.35,
      exposureRisk: 0.45,
      financeRelevance: 0.1,
      grainRelevance: 0.1,
      militaryRelevance: 0.2,
      socialOrderRelevance: 0.5,
      governanceRelevance: 0.85,
      dominantIntent: 'divide',
      evidence: [],
    },
  })

  expect(result.huainanMomentumGain).toBeGreaterThan(0.8)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd vitest run src\game\campaignMomentum.test.ts`

Expected: FAIL because omen is not yet treated specially.

- [ ] **Step 3: Add narrow type-based amplifiers**

```ts
const typeMultiplier =
  params.schemeType === 'omen' && params.parse.governanceRelevance >= 0.7 && params.parse.eventFit >= 0.65
    ? 1.25
    : params.schemeType === 'advise' && params.parse.executability >= 0.45
      ? 1.1
      : 1

const baseGain = Math.min(1.4, Number(((battleSignal - 0.35) * typeMultiplier).toFixed(2)))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx.cmd vitest run src\game\campaignMomentum.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/campaignMomentum.ts src/game/campaignMomentum.test.ts
git commit -m "feat: reward omen and logistic advice in campaign momentum"
```

### Task 4: Feed momentum into round 10 and round 16 campaign resolution

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\roundSettlement.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\campaignEngine.test.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\simulationRunner.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it('uses accumulated shu momentum during round 10 resolution', () => {
  const state = runSimulationWithInjectedMomentum({ shuMomentum: 2.8, huainanMomentum: 0 })
  const round10 = state.trace.find(item => item.round === 10)!
  expect(round10.campaignSummary).toContain('蜀地')
  expect(state.finalState.shuCampaign.resolvedState).not.toBe('failed')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd vitest run src\game\campaignEngine.test.ts src\game\simulationRunner.test.ts`

Expected: FAIL because momentum is not yet passed into campaign evaluation.

- [ ] **Step 3: Pass the bonus into both campaign calls**

```ts
const evaluation = evaluateShuCampaignOutcome({
  round,
  difficulty,
  southStats,
  northStats,
  northPressurePenalty: deriveNorthPressurePenalty(updatedNpcs, factionsAfter, 'shu'),
  policyBoost: derivePolicyBoost(policyReport),
  momentumBonus: Math.min(3, shuMomentum),
})
```

```ts
const evaluation = evaluateHuainanCampaignOutcome({
  round,
  difficulty,
  southStats,
  northStats,
  northPressurePenalty: deriveNorthPressurePenalty(updatedNpcs, factionsAfter, 'huainan'),
  policyBoost: derivePolicyBoost(policyReport),
  momentumBonus: Math.min(3, huainanMomentum),
})
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx.cmd vitest run src\game\campaignEngine.test.ts src\game\simulationRunner.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/roundSettlement.ts src/game/campaignEngine.test.ts src/game/simulationRunner.test.ts
git commit -m "feat: apply campaign momentum during battle resolution"
```

### Task 5: Add expert-omen sample and refresh balance expectations

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\liveBalance\sampleLibrary.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\liveBalance\sampleLibrary.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\simulationRunner.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it('includes expert-omen in the normalized sample ids', () => {
  expect(LIVE_BALANCE_SAMPLE_SET.map(sample => sample.id)).toContain('expert-omen')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd vitest run src\game\liveBalance\sampleLibrary.test.ts src\game\simulationRunner.test.ts`

Expected: FAIL because `expert-omen` does not exist.

- [ ] **Step 3: Add the sample with genuinely higher-quality omen wording**

```ts
function buildExpertOmenSchemes(round: number): [RoundSchemeSample, RoundSchemeSample, RoundSchemeSample] {
  // omen after round 13, with tighter legality / legitimacy / command-chain language
}
```

```ts
makeSample('expert-omen', '高手谶纬线', 'expert', 'omen')
```

- [ ] **Step 4: Update downstream expectations**

```ts
expect(sampleIds).toEqual([
  'expert-mainline',
  'expert-external',
  'expert-omen',
  'average-mainline',
  'average-omen',
  'average-external',
  'rookie-mainline',
  'rookie-omen-misuse',
  'rookie-aggressive',
])
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx.cmd vitest run src\game\liveBalance\sampleLibrary.test.ts src\game\simulationRunner.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/game/liveBalance/sampleLibrary.ts src/game/liveBalance/sampleLibrary.test.ts src/game/simulationRunner.test.ts
git commit -m "feat: add expert omen live balance sample"
```

### Task 6: Run fallback and live balance validation, then decide whether thresholds still need a small normal-mode nudge

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\docs\balance-reports\latest\live-balance-report.md`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\docs\balance-reports\latest\live-balance-report.json`

- [ ] **Step 1: Run the full local regression**

Run: `npx.cmd vitest run`

Expected: PASS, with existing suite still green.

- [ ] **Step 2: Run production build**

Run: `npm.cmd run build`

Expected: build succeeds.

- [ ] **Step 3: Run the live DS smoke matrix**

Run: `npm.cmd run balance:live-ai -- --sample expert-mainline --sample expert-omen --sample average-mainline --sample average-external --sample average-omen --sample rookie-mainline --sample rookie-aggressive`

Expected:
- `expert-mainline` and `expert-omen` are usually wins
- `average-mainline` is near coin-flip to slight win
- at least some winning samples no longer show `shu failed / huainan failed` together
- `rookie-mainline` remains a likely loss
- `rookie-aggressive` remains a clear loss

- [ ] **Step 4: Inspect the report and decide whether a threshold nudge is still needed**

Use:

```bash
type docs\balance-reports\latest\live-balance-report.md
```

If the result still shows "all winning samples double-fail both campaigns", add a follow-up implementation plan for:

- raising `normal.campaign.scoreBias` from `-5` to `-4`
or
- lowering `normal.campaign.gainedThreshold` from `11` to `10`

Do **not** change both in this plan unless the report clearly demands it.

- [ ] **Step 5: Commit verification artifacts only if the repository convention is to track latest reports**

```bash
git add docs/balance-reports/latest/live-balance-report.md docs/balance-reports/latest/live-balance-report.json
git commit -m "docs: refresh live balance report after campaign momentum"
```

If reports should stay uncommitted, skip this step and note the output paths in the handoff.

