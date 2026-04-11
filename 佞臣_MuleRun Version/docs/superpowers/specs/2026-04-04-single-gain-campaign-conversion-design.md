# Single-Gain Campaign Conversion Design

Date: 2026-04-04
Status: Proposed
Scope: `佞臣_MuleRun Version` normal difficulty, battle conversion tuning after campaign momentum v3

## Goal

Move normal-mode battle outcomes toward this target:

- `average` successful lines should usually secure **one gained result**
- that gained result should default to **蜀地**, not random drift
- `expert` successful lines should commonly reach **蜀地得手** and have a real path toward **淮南得手**
- `rookie` lines should still mostly fail, stall, or die

This is still a battle-conversion pass, not a general difficulty reset.

## Current Problem

The latest live DeepSeek smoke now shows a healthier ladder:

- `expert-mainline`: `VICTORY`, `shu stalemate`, `huainan failed`
- `expert-omen`: `VICTORY`, `shu stalemate`, `huainan stalemate`
- `average-mainline`: `VICTORY`, `shu failed`, `huainan failed`
- `average-omen`: `VICTORY`, `shu stalemate`, `huainan stalemate`

This means:

1. Mainline success is finally reaching the battle layer.
2. Omen already converts better than generic mainline, which fits the intended fantasy.
3. The remaining gap is not “can success affect battles?” but “why does success stop one step short of gained?”

Right now, successful lines mostly convert from `failed -> stalemate`, not from `stalemate -> gained`.

## Design Requirement

The map should tell a more satisfying story than the current one:

- If a player wins the larger strategic contest with average-level competent play, they should usually see **one concrete military breakthrough**.
- If a player executes an expert line, especially one that keeps battle preparation coherent across both phases, they should feel that the first breakthrough helps unlock the second.

That means battle conversion should become more **theater-shaped**, not just globally higher.

## Approaches Considered

### Approach A: Shu-first conversion, Huainan follow-through

Recommended.

Treat the two battles differently:

- `蜀地` is the easier first breakthrough and should be the normal home of `single gained`
- `淮南` should convert more strongly only if the player both:
  - performed well in the second phase
  - and carried meaningful advantage forward from Shu or earlier preparation

This matches pacing, geography, and player expectation.

### Approach B: Global conversion increase

Raise all successful conversion equally across both battles.

This is faster, but too blunt. It would likely make `淮南` rise too easily and blur the difference between average and expert play.

### Approach C: Threshold rollback

Lower `gainedThreshold` and maybe `stalemateThreshold`.

Still useful as a fallback, but it weakens explanation quality. The player should feel “my setup broke the front,” not “the gate got lowered.”

## Recommended Design

Use a **Shu-first, Huainan-follow-through** model.

### 1. Make Shu the default single-gain destination

Successful average lines should have a better chance to convert into:

- `蜀地得手`
- `淮南失败` or `淮南僵持`

instead of:

- `蜀地失败`
- `淮南失败`

This should come from stronger conversion of:

- grain
- governance
- command recentralization
- legitimacy cracks that directly weaken western coordination

### 2. Gate Huainan on continuation quality

Huainan should not simply become easier for everyone.

Instead, it should respond more to:

- strong second-phase military / grain / finance preparation
- continued battle-relevant success in rounds 11-16
- prior Shu success or at least Shu stability

This allows `expert` lines to feel like they are snowballing real strategic leverage, while average lines usually top out at one gained battle.

### 3. Add campaign carry-through from Shu to Huainan

Right now the system treats the two battles too independently.

Add a narrow carry-through concept:

- `shu gained` should improve Huainan conversion modestly
- `shu stalemate` should provide a smaller but still helpful bridge
- `shu failed` should not help

This should be smaller than direct Huainan preparation, but strong enough that experts who stabilize or win Shu feel the second theater open up.

### 4. Keep rookie protections intact

Do not let weak lines benefit from these new routes simply because they succeeded a few generic actions.

The same battle-relevance guards should still matter:

- structured preparation
- battle-relevant parse
- meaningful timing
- policy support where appropriate

## Mechanic Shape

### Shu conversion

Increase the first-war payoff of:

- battle-relevant `advise`
- governance / grain heavy disruption
- high-quality `omen` that undermines legitimacy and command confidence
- war-prep policy support in rounds 1-10

This does **not** mean general success gets a flat buff. It means Shu should respond more strongly to clearly western-war-relevant preparation.

### Huainan conversion

Keep Huainan stricter, but add a continuation bonus based on:

- Huainan-specific momentum
- Huainan-specific prepared bonus
- prior Shu result

This should make `expert` lines more likely to reach:

- `shu gained + huainan stalemate`
- or `shu gained + huainan gained`

while average lines still more often land at:

- `shu gained + huainan failed`
- or `shu gained + huainan stalemate`

### Battle carry-through

Conceptually:

```ts
huainanCarryBonus = f(shuCampaign.resolvedState)
```

Suggested shape:

- `shu gained` => meaningful positive bonus
- `shu stalemate` => small positive bonus
- `shu failed` => no bonus

This bonus should be narrower than direct Huainan prep and should never rescue a weak second phase by itself.

## Validation Standard

After implementation, rerun fallback and live DeepSeek checks.

### Fallback minimum set

- `expert-mainline`
- `expert-omen`
- `average-mainline`
- `average-omen`
- `average-external`
- `rookie-mainline`
- `rookie-aggressive`

### Live minimum set

- `expert-mainline`
- `expert-omen`
- `average-mainline`
- `average-omen`

### Desired outcomes

- `average-mainline`: usually no longer double-fails when it wins
- `average-omen`: often reaches `single gained`
- `expert-mainline`: commonly reaches `shu gained`
- `expert-omen`: commonly reaches `shu gained`, with real path to `huainan gained`
- `rookie-mainline`: still mostly not cleanly successful in battle terms
- `rookie-aggressive`: still punished

## Out of Scope

This pass does not include:

- another global success-rate rebalance
- another parse rubric overhaul
- another south natural growth pass
- new campaign UI or map copy changes
- changes to rebellion / secession systems

Those remain separate levers.
