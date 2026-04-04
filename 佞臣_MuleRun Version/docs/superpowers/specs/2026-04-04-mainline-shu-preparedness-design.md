# Mainline Shu Preparedness Design

Date: 2026-04-04
Status: Proposed
Scope: `佞臣_MuleRun Version` normal difficulty, narrow mainline-only battle conversion follow-up

## Goal

Move `average-mainline` from `shu stalemate` toward `shu gained` without weakening `omen` or broadly lowering campaign thresholds.

This pass specifically changes **where** mainline help enters the Shu battle formula:

- stop relying on bigger end-of-score bonuses
- instead let competent mainline preparation feed Shu's **south-side preparedness**

## Current Finding

After the recent dual-theater conversion pass:

- `expert-mainline` can already reach `shu gained`
- `average-mainline` remains `shu stalemate`
- repeated increases to `mainlineShuBonus` do not reliably move `average-mainline`

At the same time, `average-mainline` live traces already show:

- strong accumulated `shuMomentum`
- battle-aware `advise / probe`
- adequate command-order and logistics semantics

So the issue is no longer “mainline gets no help.”  
The issue is “mainline help currently lands too late in the formula.”

## Why End-of-Score Bonus Is No Longer Enough

Current Shu formula is effectively:

```ts
score = southPrep - northCommitment + scoreBias + momentumBonus
```

Mainline support today mostly lands in `momentumBonus`.

That causes two problems:

1. It behaves like a late additive nudge instead of changing how battle-ready South actually is.
2. It gives poor marginal returns once the route already has large accumulated momentum.

For `average-mainline`, this means:

- the route looks battle-aware
- the route accumulates momentum
- but the result still sticks at `stalemate`

## Recommended Design

Add a narrow `mainlinePreparednessBonus` that feeds **Shu southPrep**, not the final score tail.

Conceptually:

```ts
shuSouthPrep =
  baseSouthPrep
  + mainlinePreparednessBonus
```

This bonus should represent:

- granary repair
- transport cadence
- decree flow
- command-order clarity
- takeover sequencing

In other words: not “North is weaker,” but “South is more ready to convert war opportunity into actual conquest.”

## Why This Fits Mainline Better Than Other Levers

### Better than lowering thresholds

Lowering thresholds would help all routes and weaken route identity.

### Better than reducing northCommitment

Mainline’s fantasy is not primarily “the enemy stops committing.”  
It is “I spend ten rounds making conquest executable.”

That maps more naturally to South’s battle readiness than to North’s willingness to commit.

### Better than another score-side bonus

Preparedness is easier to explain:

- omen fractures legitimacy
- external routes raise North’s pressure
- mainline makes South’s campaign machine work

## Mechanic Shape

Add a helper such as:

```ts
deriveMainlineShuPreparednessBonus({
  difficulty,
  existingMomentum,
  schemeSignals,
  commandSignal,
  preparedBonus,
})
```

This helper should:

- only run on `normal`
- only affect Shu
- require battle-relevant mainline signals
- reward sustained preparation, not one lucky line

Suggested ingredients:

- existing `shuMomentum`
- current-round logistics/governance-heavy `advise`
- current-round command-order `probe`
- existing `preparedBonus`

## Validation Standard

### Fallback

- `expert-mainline` should preserve `shu gained`
- `average-mainline` should become more likely to cross into `shu gained`
- `rookie-mainline` should remain below these outcomes

### Live DeepSeek

Focused check:

- `expert-mainline`
- `average-mainline`

Desired result:

- `expert-mainline`: preserve `shu gained`
- `average-mainline`: reach `shu gained`

## Out of Scope

This pass does not include:

- omen changes
- external route changes
- Huainan-specific follow-up changes
- global campaign threshold rollback
- south growth or success-rate changes
