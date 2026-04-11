# Advise And Omen Polarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redefine North `advise` and `omen` so AI parse distinguishes “利国” vs “利人害国 / 动摇法统”, and settlement applies nation effects according to that polarity instead of treating all relevant advice/omens as default anti-North actions.

**Architecture:** Extend the existing North parse result with directionality fields, teach the DeepSeek rubric to output them, normalize and fallback them in `aiNativeEngine`, then route `advise` and `omen` nation-layer settlement through polarity-aware helpers in `schemeEngine`. Keep the rest of the scheme system unchanged so existing `slander/alienate/frame/secession/rebellion` balance is not disturbed.

**Tech Stack:** TypeScript, React, Vitest, DeepSeek-backed structured parsing, existing local fallback parse helpers.

---

## File Map

- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\types.ts`
  - Extend `NorthSchemeParseResult` with polarity fields for `advise` and `omen`.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\ai\prompts.ts`
  - Update North parse prompt rubric and JSON schema.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\aiNativeEngine.ts`
  - Normalize live AI output and compute fallback polarity for local parsing.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\schemeEngine.ts`
  - Replace fixed negative `advise` / `omen` nation impacts with polarity-aware settlement.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\schemeEngine.test.ts`
  - Add behavior tests for pro-state / pro-target-anti-state / vague `advise`, and legitimizing / destabilizing / vague `omen`.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\ai\prompts.test.ts`
  - Add rubric/schema expectations for new polarity fields.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\aiNativeEngine.test.ts`
  - Add fallback polarity classification tests.

### Task 1: Add polarity types and parse fields

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\types.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\aiNativeEngine.test.ts`

- [ ] **Step 1: Write the failing test for fallback parse shape**

Add a shape-level test that expects new fields to exist on a parsed North result:

```ts
it('adds polarity fields to fallback north parse results', () => {
  const parsed = fallbackNorthParseFromSpeech({
    speech: '先稳住仓储与转运，再整饬诏令，免得前后失序。',
    npc: makeNpc(),
    round: 5,
    relatedNpc: null,
  })

  expect(parsed.advicePolarity).toBeDefined()
  expect(parsed.omenPolarity).toBeDefined()
  expect(typeof parsed.stateBenefit).toBe('number')
  expect(typeof parsed.targetBenefit).toBe('number')
  expect(typeof parsed.factionBenefit).toBe('number')
  expect(typeof parsed.legitimacyDirection).toBe('number')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npx.cmd vitest run "src/game/aiNativeEngine.test.ts"
```

Expected: FAIL because `NorthSchemeParseResult` and fallback parse do not expose the new fields yet.

- [ ] **Step 3: Extend `NorthSchemeParseResult` and add supporting string unions**

Update `src/game/types.ts` with explicit polarity enums:

```ts
export type AdvicePolarity = 'pro_state' | 'pro_target_anti_state' | 'neutral_or_vague'
export type OmenPolarity = 'legitimizing' | 'destabilizing' | 'vague_or_ceremonial'

export interface NorthSchemeParseResult {
  characterFit: number
  eventFit: number
  structuralPenetration: number
  executability: number
  exposureRisk: number
  financeRelevance: number
  grainRelevance: number
  militaryRelevance: number
  socialOrderRelevance: number
  governanceRelevance: number
  dominantIntent: NorthDominantIntent
  stateBenefit: number
  targetBenefit: number
  factionBenefit: number
  advicePolarity: AdvicePolarity
  legitimacyDirection: number
  omenPolarity: OmenPolarity
  evidence: string[]
}
```

- [ ] **Step 4: Run the targeted test to verify type-level failures are gone**

Run:

```powershell
npx.cmd vitest run "src/game/aiNativeEngine.test.ts"
```

Expected: still FAIL, but now because fallback parser/normalizer does not populate the new fields.

- [ ] **Step 5: Commit the type additions**

```powershell
git -C "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version" add "src/game/types.ts" "src/game/aiNativeEngine.test.ts"
git -C "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version" commit -m "feat: add advise and omen polarity parse types"
```

### Task 2: Teach the parse rubric and fallback parser about polarity

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\ai\prompts.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\aiNativeEngine.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\ai\prompts.test.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\aiNativeEngine.test.ts`

- [ ] **Step 1: Write failing tests for prompt schema and fallback polarity classification**

Add prompt schema assertions:

```ts
it('north parse prompt asks for advice and omen polarity fields', () => {
  const prompt = buildNorthSchemeParsePrompt({
    round: 5,
    npc: makeNpc(),
    schemeType: 'advise',
    speech: '先稳住仓储与转运，再整饬诏令，免得前后失序。',
    eventName: '测试事件',
    eventBriefing: '测试简报',
  })

  const userContent = prompt[1]?.content ?? ''
  expect(userContent).toContain('"stateBenefit"')
  expect(userContent).toContain('"advicePolarity"')
  expect(userContent).toContain('"legitimacyDirection"')
  expect(userContent).toContain('"omenPolarity"')
})
```

Add fallback parse behavior assertions:

```ts
it('classifies clearly pro-state advice as pro_state in fallback parsing', () => {
  const parsed = fallbackNorthParseFromSpeech({
    speech: '先稳住仓储与转运，再整饬诏令，免得前后失序。',
    npc: makeNpc(),
    round: 5,
    relatedNpc: null,
  })

  expect(parsed.advicePolarity).toBe('pro_state')
  expect(parsed.stateBenefit).toBeGreaterThan(0)
})

it('classifies private-benefit advice as pro_target_anti_state in fallback parsing', () => {
  const parsed = fallbackNorthParseFromSpeech({
    speech: '不妨先把兵粮与节钺抓在你自己手里，旁人有怨也只能听命。',
    npc: makeNpc(),
    round: 5,
    relatedNpc: null,
  })

  expect(parsed.advicePolarity).toBe('pro_target_anti_state')
  expect(parsed.targetBenefit).toBeGreaterThan(0)
  expect(parsed.stateBenefit).toBeLessThan(0)
})

it('classifies destabilizing omen as anti-legitimacy in fallback parsing', () => {
  const parsed = fallbackNorthParseFromSpeech({
    speech: '灾异既著，名分已摇，若再强压，只会叫上下都疑心天命不在朝廷。',
    npc: makeNpc(),
    round: 13,
    relatedNpc: null,
  })

  expect(parsed.omenPolarity).toBe('destabilizing')
  expect(parsed.legitimacyDirection).toBeLessThan(0)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
npx.cmd vitest run "src/ai/prompts.test.ts" "src/game/aiNativeEngine.test.ts"
```

Expected: FAIL because prompt schema and fallback parser do not yet include polarity semantics.

- [ ] **Step 3: Update `buildNorthSchemeParsePrompt` to request polarity explicitly**

In `src/ai/prompts.ts`, add scheme-specific instructions:

```ts
const adviseDirectionRubric =
  params.schemeType === 'advise'
    ? `
- 若建议整体上有利于北周国家整体稳局、提效、补漏、安民、整饬秩序，应将 advicePolarity 判为 pro_state。
- 若建议主要有利于目标人物、派系、边镇或局部网络，但会伤害北周整体统治、财政、军令、粮道或法统，应将 advicePolarity 判为 pro_target_anti_state。
- 若只有空泛建议、方向两可、只像“说得像建议”，应判为 neutral_or_vague。
- stateBenefit / targetBenefit / factionBenefit 取值范围 -1 到 1，正数表示有利，负数表示有害。
`
    : ''

const omenDirectionRubric =
  params.schemeType === 'omen'
    ? `
- 若谶纬是在劝其修德、安民、整饬秩序、修补名分与法统，应将 omenPolarity 判为 legitimizing，legitimacyDirection 为正。
- 若谶纬是在借灾异放大天命不稳、名分裂缝、军心疑惧或朝廷失德，应将 omenPolarity 判为 destabilizing，legitimacyDirection 为负。
- 若只是空泛谈不祥、天意、风声，而未落到人物、局势与名分抓手，应判为 vague_or_ceremonial。
`
    : ''
```

And extend the JSON schema block:

```ts
"stateBenefit": -1 to 1,
"targetBenefit": -1 to 1,
"factionBenefit": -1 to 1,
"advicePolarity": "pro_state|pro_target_anti_state|neutral_or_vague",
"legitimacyDirection": -1 to 1,
"omenPolarity": "legitimizing|destabilizing|vague_or_ceremonial",
```

- [ ] **Step 4: Implement normalization and fallback polarity classification**

In `src/game/aiNativeEngine.ts`, extend `normalizeNorthSchemeParse` and fallback helpers:

```ts
function clampSigned(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return 0
  return roundValue(Math.max(-1, Math.min(1, numeric)))
}

function deriveAdvicePolarityFromSpeech(text: string): {
  stateBenefit: number
  targetBenefit: number
  factionBenefit: number
  advicePolarity: AdvicePolarity
} {
  const proState = scoreMatches(text, ['稳住仓储', '整饬诏令', '安民', '修补秩序', '先稳后动', '免得失序'])
  const proTarget = scoreMatches(text, ['抓在你自己手里', '先保住你的兵权', '先顾自家', '让别人替你背', '趁机坐实'])
  const antiState = scoreMatches(text, ['旁人有怨也只能听命', '先顾你这一线', '不必顾全大局', '宁可伤国也要保位'])

  if (proTarget >= 0.28 && antiState >= 0.2) {
    return {
      stateBenefit: roundValue(-(0.25 + antiState * 0.9)),
      targetBenefit: roundValue(0.3 + proTarget * 0.8),
      factionBenefit: roundValue(0.12 + proTarget * 0.55),
      advicePolarity: 'pro_target_anti_state',
    }
  }

  if (proState >= 0.22 && antiState < 0.16) {
    return {
      stateBenefit: roundValue(0.22 + proState * 0.8),
      targetBenefit: roundValue(0.08 + proState * 0.25),
      factionBenefit: roundValue(0.04 + proState * 0.15),
      advicePolarity: 'pro_state',
    }
  }

  return {
    stateBenefit: 0,
    targetBenefit: roundValue(Math.max(0.06, proTarget * 0.2)),
    factionBenefit: 0,
    advicePolarity: 'neutral_or_vague',
  }
}

function deriveOmenPolarityFromSpeech(text: string): {
  legitimacyDirection: number
  omenPolarity: OmenPolarity
} {
  const destabilizing = scoreMatches(text, ['天命不在', '名分已摇', '灾异既著', '人心先散', '上下疑惧'])
  const legitimizing = scoreMatches(text, ['修德', '安民', '整饬法统', '弭灾', '正名分', '收人心'])

  if (destabilizing >= 0.24 && destabilizing > legitimizing + 0.06) {
    return {
      legitimacyDirection: roundValue(-(0.26 + destabilizing * 0.86)),
      omenPolarity: 'destabilizing',
    }
  }

  if (legitimizing >= 0.22 && legitimizing > destabilizing + 0.06) {
    return {
      legitimacyDirection: roundValue(0.22 + legitimizing * 0.78),
      omenPolarity: 'legitimizing',
    }
  }

  return {
    legitimacyDirection: 0,
    omenPolarity: 'vague_or_ceremonial',
  }
}
```

Then merge these into `fallbackNorthParseFromSpeech(...)` and `normalizeNorthSchemeParse(...)`.

- [ ] **Step 5: Run tests to verify parsing now passes**

Run:

```powershell
npx.cmd vitest run "src/ai/prompts.test.ts" "src/game/aiNativeEngine.test.ts"
```

Expected: PASS.

- [ ] **Step 6: Commit the parsing changes**

```powershell
git -C "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version" add "src/ai/prompts.ts" "src/ai/prompts.test.ts" "src/game/aiNativeEngine.ts" "src/game/aiNativeEngine.test.ts"
git -C "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version" commit -m "feat: parse advise and omen polarity"
```

### Task 3: Make `advise` nation settlement polarity-aware

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\schemeEngine.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\schemeEngine.test.ts`

- [ ] **Step 1: Write failing settlement tests for three `advise` modes**

Add tests like:

```ts
it('pro-state court advice helps or stabilizes North dimensions', () => {
  const result = settleScheme(
    makeAction('advise'),
    makeCourtNpc(),
    null,
    0,
    {
      round: 5,
      difficulty: 'normal',
      northParse: {
        ...makeNorthParse(),
        governanceRelevance: 0.78,
        grainRelevance: 0.54,
        stateBenefit: 0.82,
        targetBenefit: 0.22,
        factionBenefit: 0.1,
        advicePolarity: 'pro_state',
      },
    },
  )

  expect(result.success).toBe(true)
  expect((result.nationEffects.governance ?? 0)).toBeGreaterThanOrEqual(0)
})

it('private-benefit advice harms North while increasing trust', () => {
  const result = settleScheme(
    makeAction('advise'),
    makeCourtNpc(),
    null,
    0,
    {
      round: 5,
      difficulty: 'normal',
      northParse: {
        ...makeNorthParse(),
        governanceRelevance: 0.82,
        financeRelevance: 0.55,
        stateBenefit: -0.72,
        targetBenefit: 0.86,
        factionBenefit: 0.52,
        advicePolarity: 'pro_target_anti_state',
      },
    },
  )

  expect(result.success).toBe(true)
  expect(result.trustChange).toBeGreaterThan(0)
  expect((result.nationEffects.governance ?? 0)).toBeLessThan(0)
})

it('vague advice mostly changes trust and barely touches North dimensions', () => {
  const result = settleScheme(
    makeAction('advise'),
    makeCourtNpc(),
    null,
    0,
    {
      round: 5,
      difficulty: 'normal',
      northParse: {
        ...makeNorthParse(),
        governanceRelevance: 0.31,
        stateBenefit: 0,
        targetBenefit: 0.12,
        factionBenefit: 0,
        advicePolarity: 'neutral_or_vague',
      },
    },
  )

  expect(result.success).toBe(true)
  expect(Math.abs(result.nationEffects.governance ?? 0)).toBeLessThanOrEqual(0.2)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npx.cmd vitest run "src/game/schemeEngine.test.ts"
```

Expected: FAIL because `deriveCourtAdviceImpact(...)` always assumes anti-North damage.

- [ ] **Step 3: Replace fixed negative advice damage with polarity-aware helpers**

In `src/game/schemeEngine.ts`, introduce a helper like:

```ts
function deriveCourtAdviceImpact(
  action: SchemeAction,
  targetNpc: NPC,
  success: boolean,
  parse: NorthSchemeParseResult,
): Partial<NationDimensions> {
  if (!success || action.schemeType !== 'advise' || targetNpc.powerBase !== 'court') return {}

  const agendaRelevance = getAgendaRelevance(parse)
  if (agendaRelevance < 0.24) return {}

  if (parse.advicePolarity === 'pro_state') {
    return applyDimensionRelevance({
      finance: 0.2,
      grain: 0.16,
      socialOrder: 0.18,
      governance: 0.6,
    }, parse, {
      finance: 0.42,
      grain: 0.4,
      socialOrder: 0.34,
      governance: 0.38,
    }, {
      finance: { min: 0.72, max: 1.04 },
      grain: { min: 0.72, max: 1.06 },
      socialOrder: { min: 0.68, max: 1.02 },
      governance: { min: 0.82, max: 1.2 },
    })
  }

  if (parse.advicePolarity === 'pro_target_anti_state') {
    return applyDimensionRelevance({
      finance: -0.25,
      grain: -0.18,
      socialOrder: -0.2,
      governance: -0.78,
    }, parse, {
      finance: 0.5,
      grain: 0.46,
      socialOrder: 0.4,
      governance: 0.42,
    }, {
      finance: { min: 0.72, max: 1.02 },
      grain: { min: 0.72, max: 1.08 },
      socialOrder: { min: 0.68, max: 1.02 },
      governance: { min: 0.8, max: 1.18 },
    })
  }

  return {}
}
```

Do not change person-level `trustDelta`; keep advice attractive to the target in both strong modes.

- [ ] **Step 4: Run the targeted tests**

Run:

```powershell
npx.cmd vitest run "src/game/schemeEngine.test.ts"
```

Expected: PASS.

- [ ] **Step 5: Commit the advise settlement changes**

```powershell
git -C "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version" add "src/game/schemeEngine.ts" "src/game/schemeEngine.test.ts"
git -C "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version" commit -m "feat: make advise settlement polarity-aware"
```

### Task 4: Make `omen` nation settlement polarity-aware

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\schemeEngine.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\schemeEngine.test.ts`

- [ ] **Step 1: Write failing tests for three `omen` modes**

Add tests like:

```ts
it('legitimizing omen can stabilize North governance instead of harming it', () => {
  const result = settleScheme(
    makeAction('omen'),
    makeCourtNpc(),
    null,
    0,
    {
      round: 13,
      difficulty: 'normal',
      northParse: {
        ...makeNorthParse(),
        governanceRelevance: 0.76,
        socialOrderRelevance: 0.58,
        legitimacyDirection: 0.74,
        omenPolarity: 'legitimizing',
      },
    },
  )

  expect(result.success).toBe(true)
  expect((result.nationEffects.governance ?? 0)).toBeGreaterThanOrEqual(0)
})

it('destabilizing omen damages North legitimacy-linked dimensions', () => {
  const result = settleScheme(
    makeAction('omen'),
    makeCourtNpc(),
    null,
    0,
    {
      round: 13,
      difficulty: 'normal',
      northParse: {
        ...makeNorthParse(),
        governanceRelevance: 0.82,
        socialOrderRelevance: 0.62,
        legitimacyDirection: -0.86,
        omenPolarity: 'destabilizing',
      },
    },
  )

  expect(result.success).toBe(true)
  expect((result.nationEffects.governance ?? 0)).toBeLessThan(0)
})

it('ceremonial omen does not create strong nation damage', () => {
  const result = settleScheme(
    makeAction('omen'),
    makeCourtNpc(),
    null,
    0,
    {
      round: 13,
      difficulty: 'normal',
      northParse: {
        ...makeNorthParse(),
        governanceRelevance: 0.32,
        socialOrderRelevance: 0.24,
        legitimacyDirection: 0,
        omenPolarity: 'vague_or_ceremonial',
      },
    },
  )

  expect(result.success).toBe(true)
  expect(Math.abs(result.nationEffects.governance ?? 0)).toBeLessThanOrEqual(0.2)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
npx.cmd vitest run "src/game/schemeEngine.test.ts"
```

Expected: FAIL because `omen` currently has no directionality-aware nation helper.

- [ ] **Step 3: Add a dedicated omen legitimacy impact helper and merge it into settlement**

In `src/game/schemeEngine.ts`, add:

```ts
function deriveOmenLegitimacyImpact(
  action: SchemeAction,
  targetNpc: NPC,
  success: boolean,
  parse: NorthSchemeParseResult,
): Partial<NationDimensions> {
  if (!success || action.schemeType !== 'omen' || targetNpc.powerBase !== 'court') return {}

  const legitimacySignal = Math.max(parse.governanceRelevance, parse.socialOrderRelevance)
  if (legitimacySignal < 0.26) return {}

  if (parse.omenPolarity === 'legitimizing') {
    return applyDimensionRelevance({
      socialOrder: 0.18,
      governance: 0.52,
    }, parse, {
      socialOrder: 0.34,
      governance: 0.38,
    }, {
      socialOrder: { min: 0.68, max: 1.06 },
      governance: { min: 0.82, max: 1.24 },
    })
  }

  if (parse.omenPolarity === 'destabilizing') {
    return applyDimensionRelevance({
      socialOrder: -0.28,
      governance: -0.72,
    }, parse, {
      socialOrder: 0.34,
      governance: 0.38,
    }, {
      socialOrder: { min: 0.7, max: 1.08 },
      governance: { min: 0.84, max: 1.24 },
    })
  }

  return {}
}
```

Merge this helper into `nationEffects` alongside existing faction/person/spillover effects.

- [ ] **Step 4: Run targeted tests**

Run:

```powershell
npx.cmd vitest run "src/game/schemeEngine.test.ts"
```

Expected: PASS.

- [ ] **Step 5: Commit the omen settlement changes**

```powershell
git -C "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version" add "src/game/schemeEngine.ts" "src/game/schemeEngine.test.ts"
git -C "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version" commit -m "feat: make omen settlement polarity-aware"
```

### Task 5: Full verification and live-balance follow-up

**Files:**
- Modify: none required unless tests or reports reveal regressions
- Test: existing suite plus live harness outputs

- [ ] **Step 1: Run focused unit tests**

Run:

```powershell
npx.cmd vitest run "src/ai/prompts.test.ts" "src/game/aiNativeEngine.test.ts" "src/game/schemeEngine.test.ts"
```

Expected: PASS.

- [ ] **Step 2: Run the full test suite**

Run:

```powershell
npx.cmd vitest run
```

Expected: PASS with existing known skip count unchanged.

- [ ] **Step 3: Run production build**

Run:

```powershell
npm.cmd run build
```

Expected: Vite build succeeds with no new type errors.

- [ ] **Step 4: Run a live AI smoke check focused on polarity**

Run:

```powershell
npm.cmd run balance:live-ai -- --sample expert-mainline --sample average-omen
```

Expected:
- report generation succeeds
- `advise` logs now show both pro-state and anti-state examples when sample text warrants it
- `omen` logs distinguish legitimizing vs destabilizing instead of treating all omen-like text as harmful

- [ ] **Step 5: Review the latest report manually**

Open:

```text
C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\docs\balance-reports\latest\live-balance-report.md
```

Check:
- whether clearly pro-state advice now stabilizes rather than harms North
- whether destabilizing omen still retains strong anti-North impact
- whether the change unintentionally nerfs your desired strong omen route

- [ ] **Step 6: Commit any final fixups after verification**

```powershell
git -C "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version" add "src/ai/prompts.ts" "src/ai/prompts.test.ts" "src/game/aiNativeEngine.ts" "src/game/aiNativeEngine.test.ts" "src/game/schemeEngine.ts" "src/game/schemeEngine.test.ts"
git -C "C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version" commit -m "feat: add polarity-aware advise and omen settlement"
```

## Self-Review

### Spec coverage

- `advise` directionality fields: covered in Task 1 and Task 2
- `omen` directionality fields: covered in Task 1 and Task 2
- prompt rubric update: covered in Task 2
- settlement differences by polarity: covered in Task 3 and Task 4
- tests for pro-state / anti-state / vague branches: covered in Task 3 and Task 4
- live DeepSeek follow-up: covered in Task 5

No spec gaps found.

### Placeholder scan

- No `TBD`, `TODO`, or “handle appropriately” placeholders remain.
- All tasks include exact files, commands, and code snippets.

### Type consistency

- `AdvicePolarity` / `OmenPolarity` are introduced first in Task 1 and reused consistently later.
- `stateBenefit`, `targetBenefit`, `factionBenefit`, `legitimacyDirection` are introduced in Task 1 and referenced consistently in Tasks 2–4.
- Settlement helper names are internally consistent:
  - `deriveCourtAdviceImpact`
  - `deriveOmenLegitimacyImpact`
