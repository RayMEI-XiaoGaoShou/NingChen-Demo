# Campaign Conversion Design

Date: 2026-04-04
Status: Proposed
Scope: `佞臣_MuleRun Version` normal difficulty, post-momentum-scaling battle conversion

## Goal

Shift the battle feel of successful normal-mode lines from:

- total-power victory
- `shu failed`
- `huainan failed`

toward the target approved for this pass:

- average successful lines should usually secure **at least one meaningful battle gain**
- expert successful lines should have a clearer path toward **one gained + one stalemate**, with double-positive outcomes reserved for stronger play
- rookie lines should still mostly fail, stall, or die

This is a campaign-conversion pass, not a general difficulty pass. The goal is to make strategic success feel reflected on the map without flattening the current skill gradient.

## Current Findings

After the previous momentum scaling pass:

### Fallback baseline

- `expert-mainline`: `VICTORY`, `shu failed`, `huainan failed`
- `expert-omen`: `VICTORY`, `shu failed`, `huainan failed`
- `average-mainline`: `DEFEAT_POWER`
- `average-external`: `DEFEAT_POWER`
- `average-omen`: `VICTORY`, `shu failed`, `huainan failed`
- `rookie-mainline`: `DEFEAT_POWER`
- `rookie-aggressive`: `DEFEAT_DEATH`

### Live DeepSeek smoke

Recent focused live runs show:

- `expert-mainline`: `VICTORY`, `shu stalemate`, `huainan failed`
- `expert-omen`: `VICTORY`, `shu stalemate`, `huainan failed`

This tells us three important things:

1. The momentum scaling direction is working.
2. Real DeepSeek parsing already pushes successful lines higher than fallback does.
3. Even after that lift, successful lines still do **not** reliably convert into a gained result.

So the system is no longer completely disconnected, but conversion is still one step too conservative.

## Design Target

The intended pattern for normal mode should be:

- `expert-mainline`: commonly `shu gained`, with `huainan stalemate/failed` depending on later play
- `expert-omen`: at least as battle-convertible as expert mainline, because it is a signature route
- `average-mainline`: usually reaches `single gained` or `gained + failed`, not double failure
- `average-omen`: often reaches `single gained`, occasionally stronger
- `average-external`: may still be swingier, but should not feel structurally locked out
- `rookie-mainline`: mostly `stalemate/failed`
- `rookie-aggressive`: still mostly punished

The key product requirement is this:

> If a player wins the wider strategic game through competent normal-mode play, the campaign map should usually show at least one concrete territorial or campaign success, not only abstract endgame superiority.

## What The Latest Results Suggest

The last pass already increased:

- campaign momentum cap
- campaign-specific momentum weighting
- narrow policy-sourced campaign prep

But expert live samples still stop at `shu stalemate`.

That means the next bottleneck is probably **not** “momentum exists or not,” but one of these:

1. `shuMomentum / huainanMomentum` still do not accumulate enough from successful lines.
2. The momentum that does accumulate is not translated aggressively enough into campaign score.
3. The normal-mode campaign thresholds remain slightly too strict even after the stronger transmission.

The focused threshold probe from this session matters here:

- simply rolling `gainedThreshold 11 -> 10` and `stalemateThreshold 3 -> 2` on fallback samples did **not** materially change outcomes

So threshold rollback alone is too blunt and too weak to be the main answer.

## Recommended Approach

### Approach A: Strengthen campaign-relevant accumulation from successful lines

This is the recommended primary direction.

Instead of giving all successful pressure more battle power, selectively raise the contribution of actions that should logically matter for campaign conversion:

- grain / transport / command-recentralization `advise`
- legitimacy-and-command fracture `omen`
- strong governance disruption that clearly affects frontline execution
- policy choices that genuinely prepare logistics, takeover, or expedition support

The goal is not “more momentum everywhere.”
The goal is “more momentum where campaign preparation is genuinely happening.”

### Approach B: Add a second conversion layer for *resolved preparation*

Momentum currently represents accumulated preparation pressure, but there is still only one direct battle insertion point:

- `momentumBonus`

Add a second, narrower conversion term that represents “prepared conditions have matured enough to matter at battle resolution.”

This term should not duplicate momentum. It should reward combinations like:

- sustained battle-relevant momentum
- plus policy-backed preparation
- plus at least one high-quality battle-relevant line in the late pre-resolution window

This keeps battle conversion tied to deliberate buildup, not just cumulative drift.

### Approach C: Small threshold rollback only if A/B still under-convert

Threshold rollback should remain a fallback, not the main lever.

If A/B land and expert/average successful lines still rarely secure even one gained result, then consider:

- `gainedThreshold: 11 -> 10`

Keep `stalemateThreshold` unchanged at first unless evidence shows stalemate is also still too hard.

This preserves more gradient than lowering both gates together.

## Recommended Design

Use a two-layer conversion model:

1. **Keep current momentum tracks**
   - `shuMomentum`
   - `huainanMomentum`

2. **Strengthen the accumulation of campaign-relevant successful play**
   - raise contribution from highly battle-relevant `advise`
   - raise contribution from high-quality `omen`
   - keep generic success from becoming free battle power

3. **Add a narrow “prepared conversion” bonus at round 10 / 16**
   - derived from:
     - accumulated momentum
     - recent battle-relevant scheme quality
     - narrow policy preparation
   - only kicks in for clearly prepared lines

4. **Only after that, reassess `gainedThreshold`**

This is the best balance between:

- explanation quality
- map satisfaction
- keeping the current live skill gradient

## Proposed Mechanic Shape

### 1. Stronger campaign-relevant accumulation

Boost contribution when all of these are true:

- the scheme succeeds
- parse quality is real
- battle relevance is concentrated, not generic

For Shu, bias toward:

- `grain`
- `governance`
- `military`

For Huainan, bias toward:

- `military`
- `grain`
- `finance`

### 2. Prepared conversion bonus

Introduce a small resolution-time bonus, conceptually:

```ts
preparedBonus = f(
  accumulatedMomentum,
  recentBattleRelevantSuccess,
  policyCampaignMomentum
)
```

This should be:

- smaller than the full momentum track
- large enough to move a successful line from `stalemate` to `gained`
- unavailable to weak or generic lines

The intended use case is:

- average/expert lines that already earned battle preparation
- but currently stop just short of meaningful conversion

### 3. Keep rookie protections

Do not let rookie lines benefit just because they happened to succeed a few times.

The same guards should still matter:

- quality gate
- campaign-specific relevance
- execution / focus clarity

That keeps the rookie failure pattern intact.

## Validation Standard

After implementation, rerun both fallback and live DeepSeek checks.

### Minimum fallback set

- `expert-mainline`
- `expert-omen`
- `average-mainline`
- `average-omen`
- `average-external`
- `rookie-mainline`
- `rookie-aggressive`

### Minimum live set

- `expert-mainline`
- `expert-omen`
- `average-mainline`
- `average-omen`

### Desired outcomes

- `expert-mainline`: usually `shu gained`
- `expert-omen`: at least `shu gained` or strong `stalemate`
- `average-mainline`: no longer structurally stuck at double failure when it wins
- `average-omen`: often single gained
- `rookie-mainline`: still usually not a clean winner
- `rookie-aggressive`: still punished

## Why Not Just Relax Thresholds

Because this would weaken the game’s internal explanation.

The desired player feeling is:

- “I destabilized the court, prepared grain and command order, and that finally let the front crack.”

Not:

- “The battle threshold was quietly lowered.”

Threshold rollback can still be used, but only after stronger conversion logic has been tried.

## Out of Scope

This spec does not propose:

- another general parse-rubric rewrite
- another overall success-rate pass
- changing south natural growth again
- changing rebellion / secession logic
- changing campaign UI copy yet

Those remain separate levers and should stay isolated from this conversion pass.
