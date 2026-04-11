# Mainline Campaign Conversion Design

Date: 2026-04-04
Status: Proposed
Scope: `佞臣_MuleRun Version` normal difficulty, mainline-only battle conversion after Shu-first carryover tuning

## Goal

Improve battle conversion for `mainline` play without weakening the intended strength of the `omen` route.

Target outcome:

- `average-mainline` should usually secure **one battle gain**, with `蜀地得手` as the default outcome
- `expert-mainline` should commonly reach **蜀地得手**, with a clearer path toward **淮南僵持 / 得手**
- `omen` should remain a signature high-conversion route and should not be nerfed in this pass
- `rookie` punitive behavior should remain intact

## Current Finding

Latest live DeepSeek results show:

- `expert-mainline`: `VICTORY`, `shu stalemate`, `huainan stalemate`
- `expert-omen`: `VICTORY`, `shu gained`, `huainan gained`
- `average-mainline`: `VICTORY`, `shu failed`, `huainan failed`
- `average-omen`: `VICTORY`, `shu stalemate`, `huainan stalemate`

This tells us the new Shu-first / Huainan-carry layer is working, but mainly for routes that already accumulate strong battle-relevant legitimacy pressure.

The remaining gap is specifically:

- `mainline` does not convert court logistics / command-order / recentralization play into Shu breakthrough strongly enough
- `omen` already has a clear, readable battle-conversion lane

So the next pass should not broadly buff all routes. It should focus on what makes competent mainline play battle-relevant.

## Why Mainline Is Still Lagging

Current mainline samples do attempt battle-preparatory language:

- stabilizing granaries
- reorganizing transport cadence
- recovering decree flow and command order
- forcing “安内先于主战”

But in the current conversion pipeline, these lines still compete with omen on terms omen naturally wins:

- legitimacy fracture
- command confidence damage
- theater-wide doubt

Mainline instead needs stronger recognition for a different fantasy:

- command recentralization
- logistics repair
- western supply coordination
- war-readiness through administrative order

That fantasy is currently under-converted.

## Approaches Considered

### Approach A: Mainline-only Shu preparation bias

Recommended.

Add an additional conversion layer that rewards successful `mainline`-style preparation in rounds 1-10:

- grain + governance heavy `advise`
- command-order / decree-chain `probe`
- clear middle-management / logistics recentralization language

This should mainly help `蜀地`.

### Approach B: Rewrite average-mainline sample quality upward

Useful as a measurement correction, but not sufficient as the main fix.

The current `average-mainline` sample is probably slightly too soft compared with what an actually competent average player would type. But raising only the sample would hide a system issue rather than solve it.

### Approach C: Lower mainline-specific thresholds

Rejected for now.

This would make the system harder to explain and would risk hidden strategy-specific rules. Better to strengthen recognizable inputs than to add invisible strategy gates.

## Recommended Design

Use **Approach A**, plus a small measurement cleanup from B if needed later.

### 1. Add a mainline Shu preparation signal

Introduce a narrow helper that converts successful mainline-style preparation into extra Shu battle pressure.

This signal should reward lines that:

- strongly hit `grain + governance`
- show real execution clarity
- refer to transport cadence, granaries, decree flow, central command order, or takeover sequence

This is not generic success. It is specifically “court preparation that makes the western campaign executable.”

### 2. Keep the bonus mostly on Shu, not Huainan

This pass should not suddenly make mainline great in both theaters.

Instead:

- mainline gets a stronger Shu breakthrough lane
- Huainan still mostly depends on whether the player can continue preparing well after round 10

This supports the target shape:

- `average-mainline` => one breakthrough
- `expert-mainline` => one breakthrough plus stronger follow-through

### 3. Leave omen untouched

Do not nerf omen in this pass.

The current result that `expert-omen` can win both theaters is desirable. It marks omen as a signature route.

The problem is not “omen is too strong.”
The problem is “mainline is under-converted compared with omen.”

### 4. Preserve rookie protection

The new mainline Shu signal should still require:

- battle-relevant semantics
- structured preparation
- enough execution clarity

That way rookie mainline text does not get a free battle buff.

## Mechanic Shape

### Mainline Shu signal

Conceptually:

```ts
mainlineShuBonus = f(
  successfulBattleRelevantAdviseOrProbe,
  logisticsRecentralizationSignal,
  executionClarity
)
```

Only apply in rounds `1-10`.

Suggested sources:

- `advise` with strong `grain/governance` and high `executability`
- `probe` with clear command-order / decree-chain / main-theater prioritization pressure
- optionally a small bonus when both appear in the same preparation window

### Mainline Huainan effect

Keep narrow.

If anything, allow only a smaller second-phase continuation bonus tied to:

- strong Huainan-specific momentum already being present
- prior Shu result not being `failed`

But Shu should remain the mainline default breakthrough.

## Validation Standard

After implementation:

### Fallback checks

- `expert-mainline` should commonly reach at least `shu gained`
- `average-mainline` should no longer be structurally locked to double failure when it wins
- `rookie-mainline` should still not cleanly win the battle layer

### Live DeepSeek checks

Minimum:

- `expert-mainline`
- `average-mainline`
- `expert-omen`
- `average-omen`

Desired:

- `expert-mainline`: `shu gained`, with `huainan stalemate/failed`
- `average-mainline`: usually `shu gained`, `huainan failed/stalemate`
- `expert-omen`: preserve `shu gained`, keep strong chance at `huainan gained`
- `average-omen`: preserve at least `single gained` or strong double stalemate

## Out of Scope

This pass does not include:

- another global campaign threshold rollback
- changing omen parse rules
- changing average/expert sample library text yet
- changing south growth or general success rates
- changing rebellion / secession systems

Those remain separate levers.
