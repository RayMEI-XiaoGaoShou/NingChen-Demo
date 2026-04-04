# Average Mainline Sample Calibration Design

## Context

Latest live DeepSeek smoke results after fixing structured-parse truncation show:

- `expert-mainline`: `VICTORY`, `shu gained`, `huainan stalemate`
- `average-mainline`: `VICTORY`, `shu failed`, `huainan failed`
- both samples are now `degraded: false`, so this gap is no longer explained by fallback parse

The remaining question is whether the game systems still under-convert average mainline success into battle outcomes, or whether the current `average-mainline` sample is below the intended “普通玩家中等质量输入” standard.

The data strongly suggests the sample is underpowered:

- `expert-mainline` rounds 1-10 north-parse means:
  - `characterFit 0.658`
  - `eventFit 0.683`
  - `structuralPenetration 0.597`
  - `executability 0.413`
  - `grainRelevance 0.495`
  - `governanceRelevance 0.547`
- `average-mainline` rounds 1-10 north-parse means:
  - `characterFit 0.467`
  - `eventFit 0.447`
  - `structuralPenetration 0.307`
  - `executability 0.260`
  - `grainRelevance 0.183`
  - `governanceRelevance 0.290`

This is not a small drop from expert to average. It is a collapse below the “battle-relevant mainline” gates.

## Problem Statement

The current `average-mainline` sample behaves more like “rookie-plus generic safe talk” than “普通玩家会写出的大方向正确、但不够锋利的主线输入”.

That makes it a poor benchmark for balance work:

- it encourages over-loosening the game systems
- it understates what a genuine average player would achieve with medium-quality AI-native input
- it makes `expert-mainline` vs `average-mainline` look like a system gap when much of the gap is sample quality

## Design Goal

Recalibrate `average-mainline` so it represents:

- mostly correct target selection
- mostly correct scheme selection
- moderate battle awareness
- moderate execution specificity
- some event awareness
- still clearly worse than `expert-mainline`

Target outcome after recalibration:

- `average-mainline` should more plausibly compete for `shu gained`
- `expert-mainline` should remain stronger and more likely to outperform it
- `average-mainline` must not become an `expert-lite` sample

## Approaches

### Option A: Rewrite sample copy only

Adjust only `average-mainline` speeches:

- make round 1-10 lines more explicitly battle-relevant
- keep wording moderate, not razor-sharp
- avoid unrelated external detours in the third action

Pros:

- safest
- does not distort real game systems
- directly fixes benchmark validity

Cons:

- if the game system is still slightly too strict, this alone may not reach `shu gained`

### Option B: Keep sample as-is and loosen conversion again

Pros:

- fast

Cons:

- likely overtunes the real game around a weak benchmark
- risks making true average players too strong once DS parses decent inputs

### Option C: Rewrite sample and loosen systems a little

Pros:

- can hit target faster

Cons:

- mixes two variables again
- makes it harder to know whether improvement came from better benchmark or easier systems

## Recommendation

Use **Option A** first.

The current evidence says the benchmark is the bigger problem. We should re-level `average-mainline` before further loosening battle conversion.

## Proposed Sample Changes

### 1. Keep the route court-centered through round 10

Current sample diffuses too early into weak or off-axis moves.

Design:

- action 1 stays `zuting + advise`
- action 2 stays `linghuelvguang + probe`
- action 3 should remain court/mainline relevant through Shu resolution

That means replacing later weak detours like generic `duguwenyue` probing with a still-moderate but battle-adjacent court pressure move.

### 2. Raise specificity from generic to medium-quality

Current `average-mainline` lines like “先把中枢和地方的事情顺一顺” are too vague.

Average-level copy should instead:

- mention one or two concrete handles
  - `仓储`
  - `转运`
  - `诏令`
  - `州郡接应`
  - `军令`
  - `粮道`
- avoid full expert-style chain construction
- remain shorter and less incisive than expert

### 3. Add event awareness without making it too polished

Average lines should occasionally reflect the current situation:

- `南征议程`
- `春旱欠收`
- `突厥试边`
- `征蜀`

But only lightly. The sample should feel like a player who understands the board, not one who writes custom high-end rhetoric every turn.

### 4. Preserve a clear gap from expert

Average copy must still be weaker by:

- fewer explicit power-chain references
- less accurate personalization
- fewer multi-step action chains
- more “correct direction” and less “precise dissection”

## Validation Standard

After rewriting `average-mainline`, rerun live DeepSeek for:

- `expert-mainline`
- `average-mainline`

Desired validation:

- `average-mainline` improves meaningfully toward `shu gained`
- `expert-mainline` remains stronger
- no need to touch `omen` strength in this pass

If `average-mainline` is still clearly stuck at `shu failed` after the rewrite, only then consider another narrow system-side adjustment.
