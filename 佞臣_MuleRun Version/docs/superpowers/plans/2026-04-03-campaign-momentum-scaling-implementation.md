# Campaign Momentum Scaling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Increase campaign momentum effectiveness and add narrow policy-sourced campaign preparation so successful mainline and omen lines can convert into meaningful Shu/Huainan results without flattening the current skill gradient.

**Architecture:** Keep the existing `campaignMomentum` helper as the single place that decides how much battle preparation is earned from successful north-line play. Add a second, narrow helper for policy-sourced campaign preparation, then feed both tracks into round 10 and 16 battle resolution before considering any threshold rollback. Validation should compare both fallback and live DeepSeek runs against the same smoke matrix so battle conversion changes stay isolated from unrelated balance levers.

**Tech Stack:** TypeScript, React, Zustand, Vitest, existing live balance harness with DeepSeek-backed parse runs

---

### Task 1: Raise effective campaign momentum transmission at resolution time

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\roundSettlement.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\simulationRunner.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it('lets stronger shu momentum push a marginal round-10 campaign out of failure', () => {
    const baseline = simulateGame({
        throughRound: 10,
        initialState: {
            currentRound: 10,
            difficulty: 'normal',
            northStats: { finance: 60, grain: 63, military: 70, socialOrder: 54, governance: 58 },
            southStats: { finance: 55, grain: 60, military: 58, socialOrder: 56, governance: 58 },
        },
    })

    const withMomentum = simulateGame({
        throughRound: 10,
        initialState: {
            currentRound: 10,
            difficulty: 'normal',
            shuMomentum: 4.8,
            northStats: { finance: 60, grain: 63, military: 70, socialOrder: 54, governance: 58 },
            southStats: { finance: 55, grain: 60, military: 58, socialOrder: 56, governance: 58 },
        },
    })

    expect(baseline.finalState.shuCampaign.resolvedState).toBe('failed')
    expect(withMomentum.finalState.shuCampaign.resolvedState).not.toBe('failed')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd vitest run src\game\simulationRunner.test.ts`

Expected: FAIL because round settlement still clamps `momentumBonus` to `3`.

- [ ] **Step 3: Apply the minimal implementation**

```ts
const evaluation = evaluateShuCampaignOutcome({
    round,
    difficulty,
    southStats,
    northStats,
    northPressurePenalty: deriveNorthPressurePenalty(updatedNpcs, factionsAfter, 'shu'),
    policyBoost: derivePolicyBoost(policyReport),
    momentumBonus: Math.min(5, shuMomentum),
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
    momentumBonus: Math.min(5, huainanMomentum),
})
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx.cmd vitest run src\game\simulationRunner.test.ts src\game\campaignEngine.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/roundSettlement.ts src/game/simulationRunner.test.ts
git commit -m "feat: raise campaign momentum resolution cap"
```

### Task 2: Make momentum accumulation more campaign-specific

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\campaignMomentum.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\campaignMomentum.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it('weights shu momentum toward grain-governance-military signals', () => {
    const result = deriveCampaignMomentumGain({
        round: 8,
        schemeType: 'advise',
        success: true,
        parse: {
            characterFit: 0.72,
            eventFit: 0.7,
            structuralPenetration: 0.68,
            executability: 0.62,
            exposureRisk: 0.18,
            financeRelevance: 0.2,
            grainRelevance: 0.86,
            militaryRelevance: 0.62,
            socialOrderRelevance: 0.2,
            governanceRelevance: 0.82,
            dominantIntent: 'strategize',
            evidence: [],
        },
    })

    expect(result.shuMomentumGain).toBeGreaterThan(0.7)
})

it('weights huainan momentum toward military-grain-finance signals', () => {
    const result = deriveCampaignMomentumGain({
        round: 14,
        schemeType: 'advise',
        success: true,
        parse: {
            characterFit: 0.7,
            eventFit: 0.68,
            structuralPenetration: 0.65,
            executability: 0.58,
            exposureRisk: 0.22,
            financeRelevance: 0.72,
            grainRelevance: 0.76,
            militaryRelevance: 0.84,
            socialOrderRelevance: 0.18,
            governanceRelevance: 0.34,
            dominantIntent: 'strategize',
            evidence: [],
        },
    })

    expect(result.huainanMomentumGain).toBeGreaterThan(0.7)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx.cmd vitest run src\game\campaignMomentum.test.ts`

Expected: FAIL because the helper still uses a generic shared weighting.

- [ ] **Step 3: Implement directional weighting**

```ts
const shuSignal =
    params.parse.grainRelevance * 0.38 +
    params.parse.governanceRelevance * 0.34 +
    params.parse.militaryRelevance * 0.28

const huainanSignal =
    params.parse.militaryRelevance * 0.4 +
    params.parse.grainRelevance * 0.34 +
    params.parse.financeRelevance * 0.26
```

```ts
const battleSignal =
    params.round <= 10
        ? Math.max(shuSignal, omenLegitimacySignal)
        : params.round <= 16
            ? Math.max(huainanSignal, omenLegitimacySignal)
            : 0
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx.cmd vitest run src\game\campaignMomentum.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/campaignMomentum.ts src/game/campaignMomentum.test.ts
git commit -m "feat: specialize campaign momentum by battle theater"
```

### Task 3: Add narrow policy-sourced campaign preparation

**Files:**
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\policyCampaignMomentum.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\roundSettlement.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\policyCampaignMomentum.test.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\roundSettlement.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it('awards shu policy momentum for early war-preparatory policy reasoning', async () => {
    const { derivePolicyCampaignMomentum } = await import('./policyCampaignMomentum')

    const gain = derivePolicyCampaignMomentum({
        round: 8,
        effects: { grain: 2.6, governance: 1.1, finance: 0.8 },
        policyParse: {
            focusAlignment: 0.78,
            executionClarity: 0.8,
            costAwareness: 0.58,
            legitimacyAlignment: 0.52,
            policyStance: 'balanced',
            evidence: [],
        },
    })

    expect(gain.shuMomentumGain).toBeGreaterThan(0)
    expect(gain.huainanMomentumGain).toBe(0)
})

it('does not award policy momentum to vague non-campaign reasoning', async () => {
    const { derivePolicyCampaignMomentum } = await import('./policyCampaignMomentum')

    const gain = derivePolicyCampaignMomentum({
        round: 8,
        effects: { socialOrder: 1.8 },
        policyParse: {
            focusAlignment: 0.36,
            executionClarity: 0.32,
            costAwareness: 0.2,
            legitimacyAlignment: 0.66,
            policyStance: 'conservative',
            evidence: [],
        },
    })

    expect(gain.shuMomentumGain).toBe(0)
    expect(gain.huainanMomentumGain).toBe(0)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx.cmd vitest run src\game\policyCampaignMomentum.test.ts src\game\roundSettlement.test.ts`

Expected: FAIL because the helper does not exist and settlement does not add policy momentum.

- [ ] **Step 3: Implement the helper**

```ts
export function derivePolicyCampaignMomentum(params: {
    round: number
    effects: Partial<NationDimensions>
    policyParse?: PolicyReasonParseResult | null
}): { shuMomentumGain: number; huainanMomentumGain: number } {
    if (!params.policyParse) {
        return { shuMomentumGain: 0, huainanMomentumGain: 0 }
    }

    const qualityGate =
        params.policyParse.focusAlignment >= 0.62 &&
        params.policyParse.executionClarity >= 0.62

    const warPrepSignal =
        (params.effects.grain ?? 0) * 0.45 +
        (params.effects.governance ?? 0) * 0.3 +
        (params.effects.finance ?? 0) * 0.25

    if (!qualityGate || warPrepSignal < 0.8) {
        return { shuMomentumGain: 0, huainanMomentumGain: 0 }
    }

    const gain = Math.min(0.8, Math.round(warPrepSignal * 10) / 20)
    if (params.round <= 10) return { shuMomentumGain: gain, huainanMomentumGain: 0 }
    if (params.round <= 16) return { shuMomentumGain: 0, huainanMomentumGain: gain }
    return { shuMomentumGain: 0, huainanMomentumGain: 0 }
}
```

- [ ] **Step 4: Wire policy momentum into settlement**

```ts
const policyMomentumGain = derivePolicyCampaignMomentum({
    round,
    effects: policyEffect,
    policyParse: policyParse ?? null,
})

shuMomentum = Math.round((shuMomentum + policyMomentumGain.shuMomentumGain) * 10) / 10
huainanMomentum = Math.round((huainanMomentum + policyMomentumGain.huainanMomentumGain) * 10) / 10
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx.cmd vitest run src\game\policyCampaignMomentum.test.ts src\game\roundSettlement.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/game/policyCampaignMomentum.ts src/game/policyCampaignMomentum.test.ts src/game/roundSettlement.ts src/game/roundSettlement.test.ts
git commit -m "feat: add policy sourced campaign preparation"
```

### Task 4: Validate fallback balance before touching thresholds

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\simulationRunner.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it('lets expert omen avoid automatic double campaign failure after momentum scaling', () => {
    const sample = LIVE_BALANCE_SAMPLE_SET.find(item => item.id === 'expert-omen')!
    const result = simulateGame({
        throughRound: 20,
        initialState: { difficulty: sample.difficulty },
        resolveRound: ({ round }) => {
            const plan = sample.rounds.find(item => item.round === round)!
            return {
                schemes: plan.schemes.map((scheme, index) => ({
                    id: `${sample.id}-r${round}-s${index + 1}`,
                    targetNpcId: scheme.targetNpcId,
                    relatedNpcId: scheme.relatedNpcId,
                    schemeType: scheme.schemeType,
                    playerSpeech: scheme.speech,
                    resolutionRoll: 0.28,
                })),
                policyOptionIndex: plan.policy.optionIndex,
                policyReason: plan.policy.reason,
            }
        },
    })

    const shu = result.finalState.shuCampaign.resolvedState ?? result.finalState.shuCampaign.state
    const huainan = result.finalState.huainanCampaign.resolvedState ?? result.finalState.huainanCampaign.state

    expect([shu, huainan]).not.toEqual(['failed', 'failed'])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd vitest run src\game\simulationRunner.test.ts`

Expected: FAIL before the new policy momentum and higher cap are both active.

- [ ] **Step 3: Adjust only the test expectations needed after implementation**

```ts
expect(result.finalState.gameResult).toBe('VICTORY')
expect([shu, huainan]).not.toEqual(['failed', 'failed'])
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx.cmd vitest run src\game\simulationRunner.test.ts src\game\campaignMomentum.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/simulationRunner.test.ts
git commit -m "test: lock fallback campaign conversion after momentum scaling"
```

### Task 5: Run full verification and decide whether thresholds stay untouched

**Files:**
- Review only: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\docs\balance-reports\latest\live-balance-report.md`
- Review only: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\docs\balance-reports\latest\live-balance-report.json`

- [ ] **Step 1: Run the full local verification**

Run: `npx.cmd vitest run`

Expected: PASS

- [ ] **Step 2: Run production build**

Run: `npm.cmd run build`

Expected: PASS

- [ ] **Step 3: Run live DeepSeek smoke matrix**

Run: `npm.cmd run balance:live-ai -- --sample expert-mainline --sample expert-omen --sample average-mainline --sample average-omen --sample rookie-mainline --sample rookie-aggressive`

Expected: report written to `docs/balance-reports/latest/`

- [ ] **Step 4: Evaluate whether threshold rollback is still needed**

Use this decision rule:

```text
If expert-mainline and expert-omen still both end as shu failed / huainan failed,
and average-mainline plus average-omen still almost never reach stalemate,
then the next follow-up spec may relax:
  gainedThreshold: 11 -> 10
  stalemateThreshold: 3 -> 2
Otherwise, keep thresholds unchanged.
```

- [ ] **Step 5: Commit verification-side updates if needed**

```bash
git add docs/balance-reports/latest
git commit -m "chore: refresh live balance reports after momentum scaling"
```
