# Mainline Dual-Theater Conversion Design

Date: 2026-04-04
Status: Proposed
Scope: `佞臣_MuleRun Version` normal difficulty, mainline-only battle conversion after sample recalibration and Shu-first conversion tuning

## Goal

Narrowly improve battle conversion for the `mainline` route without weakening `omen` or external-force play.

Target outcome:

- `average-mainline` should usually reach **蜀地得手**
- `expert-mainline` should more often convert that first breakthrough into **淮南僵持偏得手**, with a real path to **双战都好**
- `omen` should remain the strongest battle-conversion route and should not be touched in this pass
- `rookie` punishment should remain intact

## Current Finding

Latest live DeepSeek checks after parse retry fixes and sample recalibration show:

- `expert-mainline`: `VICTORY`, `shu gained`, `huainan stalemate`
- `average-mainline`: `VICTORY`, `shu stalemate`, `huainan stalemate`

This means:

- the mainline route is no longer structurally disconnected from battle outcomes
- Shu conversion is now only **half a step short** for average play
- the next missing piece is not more global momentum, but **mainline-specific second-stage conversion**

## Why The Remaining Gap Is Narrow

`average-mainline` is now battle-aware enough to avoid Shu failure, so broad buffs are no longer justified.

The remaining issues are more specific:

1. `average-mainline` still needs a bit more recognition for competent western-war preparation
2. `expert-mainline` already breaks Shu, but does not carry that advantage into Huainan strongly enough

This suggests two distinct levers:

- a **small Shu uplift** for competent mainline prep
- a **mainline-only Huainan continuation bonus** that depends on having already converted Shu

## Approaches Considered

### Approach A: Separate Shu breakthrough and Huainan continuation bonuses

Recommended.

Treat the two missing steps separately:

- strengthen `average-mainline` Shu breakthrough through a modest uplift
- strengthen `expert-mainline` Huainan carryover only when Shu is already gained and the second phase continues to show command/logistics quality

This matches the desired ladder:

- average -> single gained
- expert -> stronger chance at double success

### Approach B: Raise the general mainline bonus everywhere

Rejected.

This would be simpler, but too blunt. It risks pushing `average-mainline` too far and would blur the line between first-theater setup and second-theater continuation.

### Approach C: Lower normal campaign thresholds again

Rejected for now.

This would affect all routes, including omen, and reduce the explanatory power of the system. The current issue is not threshold shape first; it is that mainline conversion remains underpowered in exactly two steps.

## Recommended Design

Use **Approach A**.

### 1. Modestly raise mainline Shu conversion

Increase the narrow mainline Shu bonus enough that competent average mainline preparation more often crosses from `stalemate` to `gained`.

This uplift should reward:

- grain + governance heavy `advise`
- decree-chain / command-order `probe`
- strong execution clarity
- layered preparation rather than a single lucky line

This is not a global war buff. It only applies to `mainline`-style Shu preparation in rounds `1-10`.

### 2. Add a mainline-only Huainan continuation bonus

Introduce a second helper for rounds `11-16` that rewards continued mainline preparation **only if Shu has already been gained**.

This continuation bonus should be narrow and should reward:

- military + grain + finance pressure relevant to Huainan
- successful `advise` / `probe` that continue command-order, transport, supply, or takeover-sequencing themes
- continuity of preparation after Shu rather than isolated single-round spikes

This bonus exists to move `expert-mainline` from `huainan stalemate` toward `huainan gained`, not to hand `average-mainline` a free double win.

### 3. Keep omen untouched

Do not nerf or compensate against omen.

If omen remains better at dual-theater conversion, that is desirable. This pass is about bringing mainline up one more step, not flattening route identity.

### 4. Preserve rookie protection

Neither bonus should fire on weak or generic lines.

Both the Shu uplift and the Huainan continuation bonus should still require:

- battle-relevant semantics
- enough structural quality
- enough execution clarity

That keeps rookie mainline from inheriting the same gains.

## Mechanic Shape

### Mainline Shu uplift

Current helper stays in place, but gains a modest uplift:

```ts
mainlineShuBonus = f(
  layeredShuPrepSignals,
  commandSignal,
  preparedBonus
)
```

Goal: move good `average-mainline` outcomes from `stalemate` to `gained`.

### Mainline Huainan continuation

Add a new helper:

```ts
mainlineHuainanBonus = f(
  shuResolvedState,
  successfulPhaseTwoSignals,
  commandSignal,
  huainanPreparedBonus
)
```

Gate it so that:

- `shuResolvedState` must be `gained`
- difficulty must be `normal`
- second-phase signals must be clearly battle-relevant

This lets `expert-mainline` convert one breakthrough into a stronger second campaign, without broadly inflating all routes.

## Validation Standard

After implementation:

### Fallback checks

- `average-mainline` should no longer be structurally stuck at `shu stalemate`
- `expert-mainline` should preserve `shu gained`
- `expert-mainline` should have a stronger Huainan outcome than before
- `rookie-mainline` should still remain clearly below these outcomes

### Live DeepSeek checks

Minimum:

- `expert-mainline`
- `average-mainline`
- `expert-omen`
- `average-omen`

Desired:

- `average-mainline`: `shu gained`, `huainan failed/stalemate`
- `expert-mainline`: `shu gained`, `huainan gained` or at least much closer to it
- `expert-omen`: preserve strong dual-theater conversion
- `average-omen`: preserve strong conversion identity

## Out of Scope

This pass does not include:

- changing omen parse rules
- changing external-force conversion
- changing global campaign thresholds first
- changing south growth or overall success rates
- rewriting sample copy again

Those remain separate levers.
