# Campaign Momentum Scaling Design

Date: 2026-04-03
Status: Proposed
Scope: `佞臣_MuleRun Version` normal difficulty balance, campaign transmission only

## Goal

Keep the recently fixed skill gradient under real DeepSeek parsing, but make successful mainline and omen lines more likely to convert into at least one meaningful campaign result instead of ending as:

- strategic victory on total power
- `shu failed`
- `huainan failed`

The target is not "free double gain". The target is:

- expert success lines: often reach `single gained` or `gained + stalemate`
- average success lines: often reach `stalemate`, sometimes `single gained`
- rookie lines: still mostly fail or die

## Current Findings

Recent live DeepSeek smoke validation after campaign momentum landed shows:

- `expert-mainline`: victory, but `shu failed / huainan failed`
- `expert-omen`: victory, but `shu failed / huainan failed`
- `average-mainline`: victory, but `shu failed / huainan failed`
- `average-omen`: victory, but `shu failed / huainan failed`
- `rookie-mainline`: defeat
- `rookie-aggressive`: death defeat

This means the skill gradient is largely healthy now, but campaign conversion is still too weak.

Two reasons stand out:

1. `momentumBonus` is currently capped too low relative to normal-mode battle thresholds.
2. Policy choices still affect campaigns only through the existing `policyBoost`, not through a dedicated "campaign preparation" channel.

## Why The Current Numbers Still Under-Convert

Current normal profile in `src/game/difficulty.ts`:

- `scoreBias = -5`
- `gainedThreshold = 11`
- `stalemateThreshold = 3`

Current campaign score in `src/game/campaignEngine.ts`:

```ts
score = southPrep - northCommitment + scoreBias + momentumBonus
```

Current settlement wiring in `src/game/roundSettlement.ts`:

```ts
momentumBonus: Math.min(3, shuMomentum)
momentumBonus: Math.min(3, huainanMomentum)
```

This means that even a strong accumulated momentum track can only add `+3`, while successful live samples are often still around `-9` to `-14` on round-10 gap terms. In practice, campaign momentum is helping, but not enough to shift state boundaries.

## Design Decision

Do not immediately relax campaign thresholds.

Instead, use a two-step escalation:

1. Increase effective campaign momentum transmission.
2. Add a narrow policy-to-campaign momentum layer.
3. Only if live validation still shows systematic double failure, make a small normal-threshold rollback.

This preserves explanation quality:

- "You won because your earlier military-governance pressure and war preparation accumulated."

instead of:

- "You won because thresholds were quietly softened."

## Proposed Change 1: Raise Effective Momentum Transmission

### Current issue

Momentum is accumulated conservatively and then clipped to `3` at campaign resolution. That clip is too low for current normal-mode campaign gates.

### Proposed rule

For normal mode:

- round 10 resolution uses `Math.min(5, shuMomentum)`
- round 16 resolution uses `Math.min(5, huainanMomentum)`

Possible follow-up if still too weak:

- raise the cap to `6`, but only after live validation

### Expected effect

- expert lines can shift from `failed` to `stalemate`, or from `stalemate` to `gained`
- average lines can more often escape total battle failure
- rookie lines should still fail because they rarely build enough momentum in the first place

## Proposed Change 2: Make Momentum More Campaign-Specific

Current momentum accumulation already favors battle-relevant successful schemes, but it is still fairly generic.

Refine directionality:

### Shu momentum should care more about

- `grainRelevance`
- `governanceRelevance`
- `militaryRelevance`
- successful advice/probe/omen that mentions:
  - transport rhythm
  - granary control
  - command order
  - central takeover / re-centralization

### Huainan momentum should care more about

- `militaryRelevance`
- `grainRelevance`
- `financeRelevance`
- successful advice/probe/omen that mentions:
  - river crossing
  - ferry and supply line stability
  - frontline sustainability
  - southward expedition burden / defense overstretch

### Design note

This should be an adjustment to weighting, not a new sprawling subsystem. The current momentum helper is the right place to keep this logic.

## Proposed Change 3: Add Policy-Sourced Campaign Preparation

### Problem

Right now policy contributes to campaigns only through `policyBoost`, which is immediate and coarse. It does not model the idea that some policy choices are directly preparing a campaign over several rounds.

### Proposed rule

Add a small policy momentum contribution when the selected policy and parsed reason are clearly battle-preparatory.

Suggested shape:

- rounds `1-10`: policy can contribute to `shuMomentum`
- rounds `11-16`: policy can contribute to `huainanMomentum`

Contribution should be narrow:

- only if `policyParse.focusAlignment` and `executionClarity` are both solid
- and the chosen option/effect profile is actually war-relevant

Examples that should count:

- grain storage and transport reform
- local takeover / reception capacity
- military-finance pressure management
- frontline handoff and post-campaign governance preparation

Examples that should not count much:

- purely legitimacy-facing morale statements
- broad internal order talk with no campaign-bearing execution path

### Magnitude

Keep it small relative to scheme momentum:

- per qualifying policy round: around `+0.3` to `+0.8`

The purpose is not to replace north-line pressure, but to let good south-line preparation matter in a more persistent way.

## Threshold Rollback Policy

Do not change `normal` thresholds in the first implementation pass.

Only consider rollback if, after applying the two changes above and rerunning live DeepSeek smoke samples:

- expert victory lines still mostly end with `shu failed / huainan failed`
- and average victory lines still almost never reach `stalemate`

If rollback is needed, keep it minimal:

- `gainedThreshold: 11 -> 10`
- `stalemateThreshold: 3 -> 2`

Do not also reduce `scoreBias` in the same pass unless the smaller rollback still fails.

## Validation Standard

After implementation, rerun at minimum:

- `expert-mainline`
- `expert-omen`
- `average-mainline`
- `average-omen`
- `rookie-mainline`
- `rookie-aggressive`

Desired pattern:

- `expert-mainline`: no longer defaults to double failure
- `expert-omen`: at least as battle-convertible as expert mainline
- `average-mainline`: can still win narrowly, with `stalemate` becoming plausible
- `average-omen`: remains strong and flavorful, but not automatic double gain
- `rookie-mainline`: still mostly loses
- `rookie-aggressive`: still dies or loses badly

## Recommended Implementation Order

1. Raise campaign momentum resolution cap from `3` to `5`
2. Refine momentum weighting by campaign direction
3. Add narrow policy momentum contribution
4. Rerun fallback + live DeepSeek smoke matrix
5. Only then evaluate a threshold rollback

## Out of Scope

This spec does not propose:

- changing parse rubric again
- changing general north-line success rate
- changing south natural growth
- changing rebellion/secession thresholds
- changing campaign UI copy yet

Those are separate balance levers and should remain isolated from this pass.
