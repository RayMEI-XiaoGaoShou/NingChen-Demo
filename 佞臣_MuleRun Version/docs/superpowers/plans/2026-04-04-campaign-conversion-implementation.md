# Campaign Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make successful normal-mode lines more reliably convert into at least one meaningful Shu or Huainan result without flattening the current live DeepSeek skill gradient.

**Architecture:** Keep the existing `shuMomentum / huainanMomentum` tracks and extend them in two focused ways: first, strengthen campaign-relevant accumulation from battle-bearing schemes; second, add a narrow resolution-time `preparedBonus` that rewards prepared lines without turning generic success into free territorial gain. Threshold rollback stays out of scope for this pass unless verification proves the stronger conversion layer is still insufficient.

**Tech Stack:** TypeScript, Zustand game state, existing `campaignEngine` / `roundSettlement` balance pipeline, Vitest, existing live DeepSeek balance harness

---

### Task 1: Strengthen campaign-relevant accumulation from successful lines

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\campaignMomentum.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\campaignMomentum.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it('pushes shu momentum above the previous plateau for strong grain-governance advice', async () => {
    const { deriveCampaignMomentumGain } = await import('./campaignMomentum')

    const result = deriveCampaignMomentumGain({
        round: 8,
        schemeType: 'advise',
        success: true,
        parse: {
            characterFit: 0.78,
            eventFit: 0.76,
            structuralPenetration: 0.74,
            executability: 0.66,
            exposureRisk: 0.18,
            financeRelevance: 0.16,
            grainRelevance: 0.88,
            militaryRelevance: 0.72,
            socialOrderRelevance: 0.18,
            governanceRelevance: 0.84,
            dominantIntent: 'strategize',
            evidence: [],
        },
    })

    expect(result.shuMomentumGain).toBeGreaterThan(1)
})

it('lets strong omen pressure build huainan momentum more aggressively after round 10', async () => {
    const { deriveCampaignMomentumGain } = await import('./campaignMomentum')

    const result = deriveCampaignMomentumGain({
        round: 14,
        schemeType: 'omen',
        success: true,
        parse: {
            characterFit: 0.8,
            eventFit: 0.82,
            structuralPenetration: 0.78,
            executability: 0.4,
            exposureRisk: 0.44,
            financeRelevance: 0.22,
            grainRelevance: 0.34,
            militaryRelevance: 0.42,
            socialOrderRelevance: 0.72,
            governanceRelevance: 0.9,
            dominantIntent: 'divide',
            evidence: [],
        },
    })

    expect(result.huainanMomentumGain).toBeGreaterThan(1)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd vitest run src\game\campaignMomentum.test.ts`

Expected: FAIL because current `deriveCampaignMomentumGain` still tops out too early for strong expert-grade lines.

- [ ] **Step 3: Implement stronger expert/average accumulation without helping generic success**

```ts
const typeMultiplier =
    omenGate
        ? 1.6
        : lowRiskAdviceGate
            ? 1.48
            : 1

const momentumBaseline = omenGate ? 0.03 : lowRiskAdviceGate ? 0.2 : 0.32
const baseGain = Math.min(1.8, roundValue((battleSignal - momentumBaseline) * typeMultiplier))
```

```ts
const qualityGate =
    params.parse.characterFit >= 0.48
    && params.parse.eventFit >= 0.45
    && params.parse.structuralPenetration >= 0.38
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx.cmd vitest run src\game\campaignMomentum.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/campaignMomentum.ts src/game/campaignMomentum.test.ts
git commit -m "feat: strengthen campaign momentum accumulation"
```

### Task 2: Add a narrow prepared-conversion helper for round 10 / 16 resolution

**Files:**
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\campaignPreparedBonus.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\campaignPreparedBonus.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { deriveCampaignPreparedBonus } from './campaignPreparedBonus'

describe('campaignPreparedBonus', () => {
    it('awards a shu prepared bonus only when momentum and recent preparation are both strong', () => {
        const bonus = deriveCampaignPreparedBonus({
            campaign: 'shu',
            momentum: 4.8,
            recentBattleSignal: 0.82,
            policyMomentum: 0.6,
        })

        expect(bonus).toBeGreaterThan(1)
    })

    it('returns zero for generic low-preparation lines', () => {
        const bonus = deriveCampaignPreparedBonus({
            campaign: 'shu',
            momentum: 1.4,
            recentBattleSignal: 0.28,
            policyMomentum: 0,
        })

        expect(bonus).toBe(0)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd vitest run src\game\campaignPreparedBonus.test.ts`

Expected: FAIL because the helper does not exist yet.

- [ ] **Step 3: Implement the narrow prepared conversion**

```ts
export function deriveCampaignPreparedBonus(params: {
    campaign: 'shu' | 'huainan'
    momentum: number
    recentBattleSignal: number
    policyMomentum: number
}): number {
    const momentumGate = params.campaign === 'shu' ? 3.8 : 3.2
    const recentGate = params.recentBattleSignal >= 0.62
    if (params.momentum < momentumGate || !recentGate) {
        return 0
    }

    const base =
        (params.momentum - momentumGate) * 0.35 +
        params.recentBattleSignal * 0.7 +
        params.policyMomentum * 0.5

    return Math.max(0, Math.min(2.2, Math.round(base * 10) / 10))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx.cmd vitest run src\game\campaignPreparedBonus.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/campaignPreparedBonus.ts src/game/campaignPreparedBonus.test.ts
git commit -m "feat: add campaign prepared conversion bonus"
```

### Task 3: Thread prepared conversion through round settlement

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\roundSettlement.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\types.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\roundSettlement.test.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\simulationRunner.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it('lets prepared shu conversion push a successful line from stalemate to gained', () => {
    const result = settleRound({
        round: 10,
        schemes: [],
        northStats: { finance: 60, grain: 63, military: 70, socialOrder: 54, governance: 58 },
        southStats: { finance: 57, grain: 58, military: 57, socialOrder: 56, governance: 60 },
        npcs: INITIAL_NPCS.map(npc => ({ ...npc })),
        factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
        intelProgress: {},
        policyOptionIndex: 1,
        policyReason: '先把接管秩序、运粮和前线承接一道压实，再谈后续扩大战果。',
        policyParse: {
            focusAlignment: 0.8,
            executionClarity: 0.78,
            costAwareness: 0.62,
            legitimacyAlignment: 0.48,
            policyStance: 'balanced',
            evidence: [],
        },
        shuMomentum: 4.8,
        huainanMomentum: 0,
    }) as any

    expect(result.shuCampaign.state).toBe('gained')
})
```

```ts
it('improves expert omen battle conversion after round 10 in fallback simulation', () => {
    const sample = LIVE_BALANCE_SAMPLE_SET.find(item => item.id === 'expert-omen')!
    const result = simulateGame({
        throughRound: 20,
        initialState: { difficulty: sample.difficulty },
        resolveRound: ({ round }) => {
            const plan = sample.rounds.find(item => item.round === round)
            if (!plan) return {}

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

    expect(result.finalState.shuCampaign.resolvedState ?? result.finalState.shuCampaign.state).not.toBe('failed')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx.cmd vitest run src\game\roundSettlement.test.ts src\game\simulationRunner.test.ts`

Expected: FAIL because settlement does not yet compute or apply a prepared conversion layer.

- [ ] **Step 3: Implement the minimal integration**

```ts
const policyMomentumGain = derivePolicyCampaignMomentum({
    round,
    effects: policyEffect,
    policyParse: policyParse ?? null,
})
```

```ts
const shuPreparedBonus = deriveCampaignPreparedBonus({
    campaign: 'shu',
    momentum: shuMomentum,
    recentBattleSignal: recentShuBattleSignal,
    policyMomentum: policyMomentumGain.shuMomentumGain,
})
```

```ts
const evaluation = evaluateShuCampaignOutcome({
    round,
    difficulty,
    southStats,
    northStats,
    northPressurePenalty: deriveNorthPressurePenalty(updatedNpcs, factionsAfter, 'shu'),
    policyBoost: derivePolicyBoost(policyReport),
    momentumBonus: Math.min(5, shuMomentum) + shuPreparedBonus,
})
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx.cmd vitest run src\game\roundSettlement.test.ts src\game\simulationRunner.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/types.ts src/game/roundSettlement.ts src/game/roundSettlement.test.ts src/game/simulationRunner.test.ts
git commit -m "feat: apply prepared campaign conversion at battle resolution"
```

### Task 4: Verify fallback balance against the conversion targets

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\simulationRunner.test.ts`

- [ ] **Step 1: Add fallback guardrails for the intended pattern**

```ts
it('keeps rookie aggressive runs punitive after campaign conversion changes', () => {
    const sample = LIVE_BALANCE_SAMPLE_SET.find(item => item.id === 'rookie-aggressive')!
    const result = simulateGame({
        throughRound: 20,
        initialState: { difficulty: sample.difficulty },
        resolveRound: ({ round }) => {
            const plan = sample.rounds.find(item => item.round === round)
            if (!plan) return {}

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

    expect(result.finalState.gameResult).toBe('DEFEAT_DEATH')
})
```

```ts
it('does not leave expert mainline structurally locked into double battle failure', () => {
    const sample = LIVE_BALANCE_SAMPLE_SET.find(item => item.id === 'expert-mainline')!
    const result = simulateGame({
        throughRound: 20,
        initialState: { difficulty: sample.difficulty },
        resolveRound: ({ round }) => {
            const plan = sample.rounds.find(item => item.round === round)
            if (!plan) return {}

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

- [ ] **Step 2: Run tests to verify they fail or expose the current gap**

Run: `npx.cmd vitest run src\game\simulationRunner.test.ts`

Expected: At least the expert-mainline conversion check should fail before the prepared bonus is wired in.

- [ ] **Step 3: Re-run after Task 3 and keep the guardrails**

Run: `npx.cmd vitest run src\game\simulationRunner.test.ts`

Expected: PASS with rookie punishment preserved.

- [ ] **Step 4: Commit**

```bash
git add src/game/simulationRunner.test.ts
git commit -m "test: lock campaign conversion fallback guardrails"
```

### Task 5: Run full verification and live DeepSeek smoke

**Files:**
- Read/refresh: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\docs\balance-reports\latest\live-balance-report.md`
- Read/refresh: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\docs\balance-reports\latest\live-balance-report.json`

- [ ] **Step 1: Run the full automated verification**

Run: `npx.cmd vitest run`

Expected: PASS

- [ ] **Step 2: Run production build**

Run: `npm.cmd run build`

Expected: PASS

- [ ] **Step 3: Run focused live DeepSeek smoke**

Run: `npm.cmd run balance:live-ai -- --sample expert-mainline --sample expert-omen --sample average-mainline --sample average-omen`

Expected: report written to `docs/balance-reports/latest/`

- [ ] **Step 4: Check the live outcomes against the spec**

Look for:

- `expert-mainline`: usually at least one `gained`
- `expert-omen`: at least as battle-convertible as expert mainline
- `average-mainline`: no longer defaults to double battle failure when it wins
- `average-omen`: often single gained, not automatic double-positive

- [ ] **Step 5: Commit**

```bash
git add src/game/campaignMomentum.ts src/game/campaignMomentum.test.ts src/game/campaignPreparedBonus.ts src/game/campaignPreparedBonus.test.ts src/game/roundSettlement.ts src/game/roundSettlement.test.ts src/game/simulationRunner.test.ts
git commit -m "feat: improve campaign conversion for successful lines"
```
