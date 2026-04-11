# Scheme Nation-Impact Gate Design

## Goal

Tighten `slander`, `alienate`, and `proxy` so that casual or generic input no longer causes meaningful North-Zhou nation damage by default. These schemes should still affect trust, loyalty, and relationship structure, but they should only spill into nation dimensions when the speech clearly establishes a believable **relationship crack -> power/interest chain -> state-layer consequence**.

This design intentionally does **not** add a new UI flow. The current “choose an NPC, say something, get NPC feedback” interaction remains intact. The change is at the semantic-gating layer between parse and nation settlement.

## Problem

After tightening `advise`, `omen`, and `frame`, the remaining risk is that other intrigue schemes can still overperform at the nation layer when the player writes a vague but emotionally charged line.

Current symptoms:

- `slander` can damage North-Zhou governance or order even when the player only delivers generic suspicion.
- `alienate` can spill into military / grain / governance before the speech proves the crack will reach actual command, logistics, or faction coordination.
- `proxy` can hit too hard on nation dimensions even if the speech only expresses intent (“let him deal with X”) without showing why the actor would move and how that movement harms the state.

This creates the wrong play incentive:

- players can free-write generic pressure language,
- the parse still rates it as relevant enough,
- and the system grants state damage too easily.

The intended incentive is:

- casual input should mostly alter **relationship-level** state,
- only structurally specific intrigue should alter **nation-level** state.

## Recommended Approach

### Option A: Add a unified nation-impact gate for `slander`, `alienate`, and `proxy` (recommended)

Each of these schemes keeps its current success logic and relationship/person effects, but nation damage is additionally gated by a scheme-specific structural qualification layer.

Pros:

- preserves existing UI
- preserves intrigue variety
- directly solves “随便输入一句话就打国力”
- keeps player-readable logic: relationship effects are easier to earn; nation effects are harder

Cons:

- requires new parse fields and fallback heuristics
- adds another balancing layer

### Option B: Just reduce nation multipliers for these schemes

This would be simpler, but it only compresses output. It does not change the underlying logic that lets vague input qualify for nation damage.

Not recommended except as a follow-up balancing pass.

### Option C: Move these schemes entirely off nation damage

This would be clean, but too blunt. `alienate` and `proxy` should still be able to hurt the state when the player genuinely creates a crack in command, logistics, or faction execution.

Not recommended.

## Recommendation

Adopt **Option A**.

Use a new `nation-impact gate` concept:

- relationship/person effects remain available on ordinary success
- nation effects require an additional semantic threshold
- the threshold differs by scheme

This keeps the schemes expressive while preventing generic text from becoming free nation damage.

## Scheme-by-Scheme Design

### 1. `slander`

Player-facing meaning:

> 对施计对象说另一人的坏话，让他对那人起疑。

What it should always be able to do:

- change trust between target and related NPC
- create suspicion
- weaken future cooperation

What it should **not** do automatically:

- damage governance, military, grain, or order just because the line sounds accusatory

Nation impact should require all of the following:

1. **Named or clearly implied second-party hostility**
   - the speech clearly makes the target reassess a specific person or camp
2. **Concrete leverage point**
   - responsibility, command authority, grain transport, court access, border allocation, etc.
3. **State transmission**
   - the speech makes clear why this suspicion will disrupt a public function rather than only private trust

Suggested new parse field:

- `suspicionTransmission: 0-1`

Interpretation:

- low: this is just gossip or mood
- medium: this may affect cooperation
- high: this plausibly affects execution or command

Settlement rule:

- if `suspicionTransmission < threshold`, `slander` can still hurt relationship state, but nation damage should be zero or near-zero

### 2. `alienate`

Player-facing meaning:

> 让施计对象与另一方的裂缝扩大，彼此防备。

What it should always be able to do:

- damage trust between two actors
- lower stability across the involved camp(s)
- reduce external loyalty when the split is believable

What it should **not** do automatically:

- inflict heavy military / grain / governance damage from broad “you two are not really united” language

Nation impact should require all of the following:

1. **Specific pair or structure**
   - target vs related NPC, or target vs a clear institution/camp
2. **Clear interest fracture**
   - who loses face, authority, command precedence, grain control, legal cover, or succession standing
3. **Operational consequence**
   - why this fracture reaches army command, logistics, central coordination, or local compliance

Suggested new parse field:

- `fractureTransmission: 0-1`

Interpretation:

- low: emotional or political friction only
- medium: coordination friction
- high: real structural break with state-level consequences

Settlement rule:

- `alienate` keeps strong relationship effects
- nation-layer scaling should sharply depend on `fractureTransmission`
- military/grain/governance spillover should only appear when this field is clearly high

### 3. `proxy`

Player-facing meaning:

> 借施计对象之手去打另一个人。

What it should always be able to do:

- raise target trust when they feel used well
- damage the related NPC directly if the setup is believable
- alter faction alignment or external loyalty

What it should **not** do automatically:

- heavily damage nation state from generic “someone should deal with him” talk

Nation impact should require all of the following:

1. **Actor motivation**
   - why the target would actually move
2. **Action plausibility**
   - why the target can realistically pressure or punish the related NPC
3. **Public consequence**
   - why this strike causes broader instability rather than only personal rivalry

Suggested new parse field:

- `proxyTransmission: 0-1`

Interpretation:

- low: the player merely suggests hostility
- medium: target may act, but state consequences are weak
- high: target has motive, means, and the action will ripple into the state

Settlement rule:

- `proxy` still gets strong person/relationship output
- nation output should be gated by `proxyTransmission`

## Unified Gate Rule

The three schemes should share one high-level policy:

> **Passing the scheme does not automatically mean passing the nation-impact gate.**

Recommended pipeline:

1. roll success as normal
2. apply person / trust / loyalty / relationship effects
3. compute scheme-specific nation-impact gate
4. only if the gate passes, allow full nation spillover
5. otherwise clamp nation damage to zero or a very small residual amount

This means the player still feels the intrigue worked, but the state only suffers when the intrigue is structurally meaningful.

## Parse Additions

Recommended additions to `NorthSchemeParseResult`:

- `suspicionTransmission?: number`
- `fractureTransmission?: number`
- `proxyTransmission?: number`

These are intentionally narrow and scheme-aligned, unlike a generic “state damage confidence” field.

## Fallback Heuristic Direction

The fallback parser should not try to be perfect. It only needs to be conservative.

High scores should require language that clearly indicates:

- named or implied counterpart
- responsibility chain
- command / logistics / court-access / central coordination consequence

Generic warning language should score low:

- “他未必真心”
- “朝里风向不稳”
- “谁都可能先保自己”

These may justify trust damage, but should not justify strong nation damage.

## Testing Strategy

Required tests:

1. `slander`
   - generic accusation damages trust but not nation
   - structurally specific accusation can damage nation

2. `alienate`
   - vague emotional split mostly changes relationship state
   - command/logistics split can damage nation

3. `proxy`
   - vague instigation stays mostly personal
   - clear motive + means + public consequence can damage nation

4. fallback coverage
   - low-signal text should not accidentally pass the gate

5. live-balance follow-up
   - rerun `average-mainline` / `expert-mainline`
   - verify that generic intrigue no longer overcontributes to North-Zhou nation collapse

## Non-Goals

This design does **not**:

- add new UI flows for `slander`, `alienate`, or `proxy`
- change the trust thresholds of these schemes
- rebalance `advise`, `omen`, or `frame` again in this pass
- solve campaign conversion directly

## Expected Outcome

After this change:

- players can still use intrigue creatively
- casual intrigue text will mostly affect relationships, not nation dimensions
- only structurally meaningful intrigue will destabilize North-Zhou at the state layer
- “怎样一句话既打中人，又真正伤国” will become a clearer and more interesting skill test
