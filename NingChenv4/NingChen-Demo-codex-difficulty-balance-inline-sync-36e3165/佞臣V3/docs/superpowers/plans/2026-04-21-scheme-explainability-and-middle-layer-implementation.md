# Scheme Explainability and Middle-Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make北周计谋系统的“中间层”对玩家可见，并补齐地方军头军力与朝堂枢纽受击的关键机制钩子，让玩家能理解“这一步打中了谁、动了什么值、下一步会发生什么”。

**Architecture:** Ship this in three milestones. Milestone A surfaces hidden state using shared explainability helpers plus settlement/UI copy. Milestone B patches the core scheme engine so external military power and faction-leader pressure become first-class effects. Milestone C makes campaign momentum and reference surfaces readable so the new middle layer can actually be learned by players.

**Tech Stack:** React 18, TypeScript, Zustand, Vitest, Vite

---

## Scope Split

This plan intentionally groups the work into three independently shippable slices:

1. **Visible middle layer**
   Surface existing hidden logic through labels, tooltips, settlement explanations, and unlock hints.
2. **Mechanic hook-up**
   Extend scheme resolution so external `militaryPower` and faction-leader pressure are mechanically meaningful.
3. **Campaign and documentation alignment**
   Expose campaign momentum and refresh reference/help surfaces so players can learn the new logic.

If schedule pressure appears, ship in this exact order. Milestone A yields immediate player-facing gains even if B and C slip.

---

## File Map

### Existing files to modify

- `src/game/schemeEngine.ts`
  Current scheme result templates, faction effects, nation spillover, and external-line hooks all live here. This will remain the integration point.
- `src/game/roundSettlement.ts`
  Settlement aggregation, judge facts, relationship shock, faction collapse, and the text payload consumed by the UI are assembled here.
- `src/game/campaignMomentum.ts`
  Current momentum gain rules for Shu and Huainan live here.
- `src/components/Settlement/Settlement.tsx`
  Current “计谋筹算结果 / 朝局反噬 / 问政余波 / 大局推演” display lives here.
- `src/components/CourtView/CourtView.tsx`
  Current semi-visible faction/external surfaces live here, including faction summary, external cards, and current labels.
- `src/components/SchemePanel/SchemePanel.tsx`
  Current scheme selection, unlock state, and onboarding entry point live here.
- `src/components/SchemePanel/SchemeOnboardingModal.tsx`
  Current计谋说明主弹窗 lives here.
- `src/components/GameplayGuide/GameplayGuide.tsx`
  Current玩法总览页 lives here.
- `src/stores/gameStore.ts`
  Stores round state, onboarding state, settlement payloads, and can host any lightweight derived UI state if needed.
- `src/ai/prompts.ts`
  If settlement-facing language or Feng Daozhi references need consistent terms, prompt wording may need alignment.
- `src/data/prologueContent.ts`
  Guide and onboarding copy source.

### Existing tests to expand

- `src/game/roundSettlement.test.ts`
- `src/game/campaignMomentum.test.ts` if present, otherwise create it
- `src/components/Settlement/Settlement.test.tsx`
- `src/components/CourtView/CourtView.external-line.test.tsx`
- `src/components/SchemePanel/SchemePanel.onboarding.test.tsx`
- `src/stores/gameStore.test.ts`

### New helper files to create

- `src/game/explainability.ts`
  Shared conversion from raw numbers and thresholds into player-facing states such as favor pressure, faction stability bands, warlord military posture, and campaign wind labels.
- `src/game/explainability.test.ts`
  Unit tests for label thresholds and copy-safe helpers.
- `src/game/schemeOutcomeExplanation.ts`
  Shared function that converts resolved scheme results into three explanation buckets: direct damage, structural damage, and state progress.
- `src/game/schemeOutcomeExplanation.test.ts`
  Unit tests for explanation classification.

If, during implementation, `schemeEngine.ts` becomes too noisy, create `src/game/externalSchemePressure.ts` for external military hooks. Do not create that file unless the worker actually needs the split.

---

## Milestone Order

1. Milestone A: Explainability surfaces
2. Milestone B: External military + faction-leader pressure
3. Milestone C: Campaign momentum + guide alignment

Do not begin Milestone B until Milestone A tests pass, because B depends on the new wording and helper labels.

---

### Task 1: Add shared explainability helpers

**Files:**
- Create: `src/game/explainability.ts`
- Create: `src/game/explainability.test.ts`
- Modify: `src/game/types.ts`

- [ ] Add helper functions for player-facing state bands instead of repeating ad hoc labels in components.
  Required outputs:
  - favor pressure labels for `emperorFavor` / `empressDowagerFavor`
  - faction condition labels for `courtInfluence`, `militaryPower`, `internalStability`
  - external military posture labels for warlords
  - campaign momentum labels for Shu and Huainan
  - external action unlock explanation text from `trust + loyalty + unlockedSecrets + round window`

- [ ] Keep the helpers numeric-threshold based, not string-keyword based, so they remain stable if copy changes.

- [ ] Extend `src/game/types.ts` only if a new UI-facing type is required, for example:
  - `FactionConditionLevel`
  - `CampaignMomentumLabel`
  - `ExplainabilityBucket`

- [ ] Write tests that lock the thresholds.
  Minimum cases:
  - favor values just above and just below dismiss/execution thresholds
  - faction values in stable / shaking / fractured / collapsed bands
  - external action unlock explanation for “差信任”“差忠诚”“差暗线”“差回合窗口”
  - campaign momentum labels for `0`, low gain, medium gain, clear-ready states

- [ ] Run targeted tests.
  Run: `npm run test -- src/game/explainability.test.ts`
  Expected: PASS

- [ ] Commit.
  Commit message: `feat: add shared explainability helpers`

**Acceptance notes:**
- No component should hardcode new threshold copy after this task.
- The helper API must be usable both in React components and settlement/game engines.

---

### Task 2: Surface “direct / structural / state-progress” in settlement

**Files:**
- Create: `src/game/schemeOutcomeExplanation.ts`
- Create: `src/game/schemeOutcomeExplanation.test.ts`
- Modify: `src/game/roundSettlement.ts`
- Modify: `src/components/Settlement/Settlement.tsx`
- Modify: `src/components/Settlement/Settlement.test.tsx`

- [ ] Add a settlement-facing explanation builder that classifies each resolved scheme into three buckets:
  - direct nation damage
  - structural pressure
  - state progress

- [ ] Use existing resolution data rather than re-parsing player text.
  Inputs should come from:
  - `personEffects`
  - `factionEffects`
  - direct `nationEffects`
  - court favor hits / borrowed blade opportunity
  - external status progress

- [ ] Define exact rules before wiring UI:
  - **Direct** if this scheme directly changed nation dimensions this round
  - **Structural** if it changed trust/loyalty/faction/relationship without a major state jump
  - **State progress** if it materially advanced dismiss/execution/secession/rebellion windows

- [ ] Extend the settlement payload so `Settlement.tsx` can render these explanations under each “计谋筹算结果” card without reproducing engine logic in the component.

- [ ] Update the UI copy to a consistent three-line pattern:
  - 打中了什么
  - 哪个中间值变化了
  - 这意味着后续什么更容易发生

- [ ] Add tests for representative cases:
  - court `advise` causing direct governance damage
  - `slander` causing structural faction pressure without immediate state jump
  - `frame` pushing a court target into “可罢黜/可处决”
  - `secession` or `rebellion` registering as state progress or completed state

- [ ] Run targeted tests.
  Run: `npm run test -- src/game/schemeOutcomeExplanation.test.ts src/game/roundSettlement.test.ts src/components/Settlement/Settlement.test.tsx`
  Expected: PASS

- [ ] Commit.
  Commit message: `feat: explain settlement middle-layer outcomes`

**Acceptance notes:**
- The settlement component must render explanation text even when AI judge narration fails.
- No duplicate explanation logic should live in both `roundSettlement.ts` and `Settlement.tsx`.

---

### Task 3: Make external action unlock and hidden thresholds readable

**Files:**
- Modify: `src/components/SchemePanel/SchemePanel.tsx`
- Modify: `src/components/SchemePanel/SchemeOnboardingModal.tsx`
- Modify: `src/components/GameplayGuide/GameplayGuide.tsx`
- Modify: `src/components/CourtView/CourtView.tsx`
- Modify: `src/data/prologueContent.ts`
- Modify: `src/components/SchemePanel/SchemePanel.onboarding.test.tsx`
- Modify: `src/components/CourtView/CourtView.external-line.test.tsx`

- [ ] Replace vague unlock messaging with explainability helper output.
  Required player-facing cases:
  - “未解锁：还需 X 点信任”
  - “未解锁：忠诚度需再降低 X 点”
  - “未解锁：还需揭开 X 条暗线”
  - “未解锁：需等待可发动外部行动的回合”

- [ ] In `CourtView.tsx`, update external cards so “gapText” reads like an action path instead of a static warning.
  Example direction:
  - 从“还差 xx 点信任才能 xxx”
  - 升级成“再补 xx 点信任 / 再压 xx 点忠诚 / 再揭 1 条暗线即可试图割据”

- [ ] In `SchemePanel.tsx`, add hover/help text for hidden middle-layer values relevant to the selected NPC:
  - court targets: favor pressure and current disposal distance
  - external targets: loyalty posture, military posture, and external-action distance

- [ ] Update onboarding and gameplay guide text so it explicitly distinguishes:
  - direct damage
  - structural pressure
  - threshold actions

- [ ] Ensure these updates reuse helper functions from Task 1, not duplicated threshold text.

- [ ] Run targeted tests.
  Run: `npm run test -- src/components/SchemePanel/SchemePanel.onboarding.test.tsx src/components/CourtView/CourtView.external-line.test.tsx`
  Expected: PASS

- [ ] Commit.
  Commit message: `feat: expose unlock thresholds and middle-layer hints`

**Acceptance notes:**
- A first-time player should be able to tell why `试探` matters for secession/rebellion.
- This task should not yet change the underlying formulas.

---

### Task 4: Add external military power hooks to scheme resolution

**Files:**
- Modify: `src/game/schemeEngine.ts`
- Modify: `src/game/roundSettlement.ts`
- Modify: `src/game/roundSettlement.test.ts`
- Modify: `src/game/schemeEngine.test.ts` if present, otherwise create it

- [ ] Add first-stage `militaryPower` hooks for external targets without introducing a full supply-transfer subsystem.

- [ ] Implement these concrete mechanical changes:
  - `advise` on an external target may increase `militaryPower` when parse intent clearly implies illicit expansion, diverted supplies, retained tribute, or force consolidation
  - `frame` on an external target may decrease `militaryPower` when the trap plausibly triggers central restriction or internal command disorder
  - `slander` / `alienate` where the related NPC is external may optionally decrease the related target’s `militaryPower` when parse relevance is military/grain/governance heavy
  - `slander` / `alienate` between external actors should at minimum support “one side loses edge” without requiring symmetric power gain

- [ ] Keep the first implementation conservative.
  Bounds:
  - positive military gain should be smaller than the later damage from successful rebellion
  - punitive military loss should be smaller than the loyalty drop unless the parse is strongly centered on logistics/armament

- [ ] Update direct nation spillover logic if needed so newly added `militaryPowerDelta` has downstream meaning but does not double-count with existing loyalty spillover.

- [ ] Add tests covering:
  - external `advise` with explicit military build-up
  - external `frame` with central sanction implication
  - court-targeted `slander` against an external second target
  - external-to-external `alienate` where only one side loses military edge

- [ ] Run targeted tests.
  Run: `npm run test -- src/game/roundSettlement.test.ts`
  Expected: PASS

- [ ] Commit.
  Commit message: `feat: connect external military power to schemes`

**Acceptance notes:**
- This task must not implement full “military power transfer.” It only adds explainable gain/loss hooks.
- The relationship between loyalty and military power should remain asymmetric: loyalty usually swings harder.

---

### Task 5: Give 贺拔琪 / 宗艾 clear faction-pressure consequences

**Files:**
- Modify: `src/game/schemeEngine.ts`
- Modify: `src/components/CourtView/CourtView.tsx`
- Modify: `src/components/Settlement/Settlement.tsx`
- Modify: `src/game/roundSettlement.test.ts`
- Modify: `src/components/CourtView/CourtView.external-line.test.tsx` only if current court tests already live elsewhere; otherwise add/expand the relevant court-facing test file

- [ ] Add explicit faction-effect hooks when the target or relation chain centers on:
  - 贺拔琪 as后党枢纽
  - 宗艾 as帝党/御前接口枢纽

- [ ] First implementation should reuse existing faction vectors rather than creating new character-specific values.
  Required direction:
  - attacks on 贺拔琪 primarily damage `empress.courtInfluence`, secondarily `empress.internalStability`
  - attacks on 宗艾 primarily damage `emperor.courtInfluence`, secondarily `emperor.internalStability`

- [ ] Scope the hook to high-relevance scheme cases only:
  - `slander`
  - `alienate`
  - `frame`
  - `omen`

- [ ] Update settlement/CourtView wording so the player can read the result as:
  - “打到贺拔琪本人” is now “后党号召力 / 后党内部稳定被撬动”
  - “打到宗艾本人” is now “御前接口与帝党调度被撬动”

- [ ] Add regression tests:
  - attacking 贺拔琪 should change faction vectors even though she is not on the dual-favor disposal axis
  - attacking 宗艾 should do the symmetric emperor-side version
  - the court disposal chain for 祖珽 / 宇文棣 / 令狐律光 / 尉迟暮 must remain unchanged

- [ ] Run targeted tests.
  Run: `npm run test -- src/game/roundSettlement.test.ts`
  Expected: PASS

- [ ] Commit.
  Commit message: `feat: add faction pressure hooks for court leaders`

**Acceptance notes:**
- Do not add new persistent character stats in this milestone.
- The player must be able to see a concrete consequence even when no favor axis changes.

---

### Task 6: Make campaign momentum a learnable surface

**Files:**
- Modify: `src/game/campaignMomentum.ts`
- Modify: `src/components/RoundStart/RoundStart.tsx`
- Modify: `src/components/Settlement/Settlement.tsx`
- Modify: `src/game/campaignMomentum.test.ts` if present, otherwise create it
- Modify: `src/components/RoundStart/RoundStart.test.tsx`

- [ ] Keep current momentum formulas, but add output descriptors that tell the UI what kind of gain happened:
  - no gain
  - slight push
  - meaningful swing
  - ready-to-cash pressure

- [ ] Split the label by theater:
  - Shu rounds should not render Huainan guidance
  - Huainan rounds should not render Shu guidance

- [ ] In the settlement page, add a compact explanation for why a successful scheme did or did not help the current theater.
  Use existing parse factors:
  - military relevance
  - grain relevance
  - governance relevance
  - event fit
  - structural penetration

- [ ] In the round-start page, expose current theater wind in a non-numeric way.
  Example structure:
  - 蜀地：筹势未成 / 稍有转机 / 已见可乘 / 攻守将定
  - 淮南：同样四档

- [ ] Add tests for:
  - `advise` causing a Shu push in early rounds
  - `omen` causing a legitimacy-driven push when governance relevance is high
  - low-quality successful schemes yielding zero momentum and a readable “未真正推进战局” explanation

- [ ] Run targeted tests.
  Run: `npm run test -- src/game/campaignMomentum.test.ts src/components/RoundStart/RoundStart.test.tsx src/components/Settlement/Settlement.test.tsx`
  Expected: PASS

- [ ] Commit.
  Commit message: `feat: surface campaign momentum state`

**Acceptance notes:**
- This task is presentation-aligned, not a balance retune.
- Do not change campaign outcome thresholds unless a test proves current labels cannot map to current logic.

---

### Task 7: Refresh the reference surfaces and matrix docs

**Files:**
- Modify: `docs/scheme_reference_2026-04-06.md`
- Modify: `src/components/GameplayGuide/GameplayGuide.tsx`
- Modify: `src/components/SchemePanel/SchemeOnboardingModal.tsx`
- Optional create: `docs/relationship-matrix-reference_2026-04-21.md`

- [ ] Update the written reference so it no longer describes the system as isolated per-scheme effects.
  It must explicitly teach the three outcome modes:
  - direct nation effect
  - structural pressure
  - state threshold progression

- [ ] Refresh the visible guide surfaces to match the post-implementation logic from Tasks 2–6.

- [ ] If a matrix reference doc is created, format it as a relation table rather than a per-character duplicated grid.
  Required fields:
  - 听话者
  - 被指向者
  - 主要数值落点
  - 后续导向

- [ ] Manual verification:
  - compare wording in guide modal, gameplay guide, and settlement explanations
  - ensure they use the same terminology for `信任 / 忠诚 / 军力 / 恩宠 / 眷顾 / 派系值 / 战役动量`

- [ ] Commit.
  Commit message: `docs: align scheme reference with middle-layer system`

**Acceptance notes:**
- This task should happen last so docs do not drift from implementation.

---

## Cross-Cutting Verification

- [ ] Run the targeted unit and component suite from all tasks:
  Run: `npm run test -- src/game/explainability.test.ts src/game/schemeOutcomeExplanation.test.ts src/game/roundSettlement.test.ts src/components/Settlement/Settlement.test.tsx src/components/CourtView/CourtView.external-line.test.tsx src/components/SchemePanel/SchemePanel.onboarding.test.tsx src/game/campaignMomentum.test.ts src/components/RoundStart/RoundStart.test.tsx`
  Expected: PASS

- [ ] Run full test suite:
  Run: `npm run test`
  Expected: PASS

- [ ] Run production build:
  Run: `npm run build`
  Expected: PASS

- [ ] Manual smoke checklist:
  - first external warlord seen in CourtView shows readable trust/loyalty/military posture
  - a court intrigue settlement shows three-part explanation instead of only flavor text
  - a faction-leader hit on 贺拔琪 or 宗艾 yields visible faction pressure copy
  - campaign momentum surfaces as wind/pressure instead of invisible gain

---

## Delivery Sequence

If one worker is implementing inline, use this order:

1. Task 1
2. Task 2
3. Task 3
4. Task 4
5. Task 5
6. Task 6
7. Task 7
8. Cross-cutting verification

If multiple workers are used in parallel after Task 1:

- Worker A: Tasks 2 + 3
- Worker B: Tasks 4 + 5
- Worker C: Task 6
- Main thread: Task 7 after merges are stable

---

## Self-Review

### Spec coverage check

- Visible explainability layer: covered by Tasks 1–3 and 6
- External military power coupling: covered by Task 4
- 贺拔琪 / 宗艾 pressure hooks: covered by Task 5
- Campaign momentum readability: covered by Task 6
- Guide/reference alignment: covered by Task 7

No major spec gap remains for the three confirmed design decisions:

- external military can grow as well as shrink
- faction leaders first hook into faction values rather than new character stats
- campaign momentum remains semi-visible, not fully numeric

### Placeholder scan

This plan does not use `TBD`, `TODO`, or “similar to previous task” shortcuts. Each task names exact files, concrete behaviors, and verification commands.

### Type consistency check

Planned helper layers are consistent with current codebase vocabulary:

- `emperorFavor`
- `empressDowagerFavor`
- `courtInfluence`
- `internalStability`
- `militaryPower`
- `loyaltyToCourt`
- `externalStatus`

No alternate naming has been introduced in the plan.

---

Plan complete and saved to `docs/superpowers/plans/2026-04-21-scheme-explainability-and-middle-layer-implementation.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
