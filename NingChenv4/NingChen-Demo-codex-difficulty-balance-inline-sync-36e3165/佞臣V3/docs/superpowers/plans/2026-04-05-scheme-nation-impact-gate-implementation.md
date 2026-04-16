# Scheme Nation-Impact Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add scheme-specific nation-impact gates for `slander`, `alienate`, and `proxy` so generic intrigue text still affects relationships but no longer causes strong North-Zhou nation damage unless it establishes a believable state-layer transmission chain.

**Architecture:** Extend `NorthSchemeParseResult` with three narrow transmission fields, teach both DeepSeek prompts and fallback parsing to populate them conservatively, and route nation-layer spillover through a new gate in `schemeEngine.ts`. Relationship/person effects stay on ordinary success; only nation effects are additionally qualified. Live-balance samples remain backward-compatible and will be verified with focused and full tests before optional live smoke.

**Tech Stack:** React, TypeScript, Zustand, Vitest, Vite, DeepSeek-compatible structured parsing

---

## File Map

- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\types.ts`
  - Add `suspicionTransmission`, `fractureTransmission`, and `proxyTransmission` to `NorthSchemeParseResult`.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\ai\prompts.ts`
  - Add the new fields to the north-parse JSON schema and define conservative rubric text for `slander`, `alienate`, and `proxy`.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\aiNativeEngine.ts`
  - Normalize the new fields and add conservative fallback heuristics.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\schemeEngine.ts`
  - Add a nation-impact gate so `slander`, `alienate`, and `proxy` can still succeed relationally while nation spillover is clamped unless the relevant transmission field is high enough.
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\aiNativeEngine.test.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\ai\prompts.test.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\schemeEngine.test.ts`

### Task 1: Add transmission fields to the parse model

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\types.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\aiNativeEngine.test.ts`

- [ ] **Step 1: Write the failing normalization test**

Add this exact test near the existing north-parse normalization coverage:

```ts
it('normalizes intrigue transmission fields', () => {
  const normalized = normalizeNorthSchemeParse({
    suspicionTransmission: 0.64,
    fractureTransmission: 0.71,
    proxyTransmission: 0.58,
  } as any)

  expect(normalized.suspicionTransmission).toBeCloseTo(0.64, 2)
  expect(normalized.fractureTransmission).toBeCloseTo(0.71, 2)
  expect(normalized.proxyTransmission).toBeCloseTo(0.58, 2)
})
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```powershell
npx.cmd vitest run "src/game/aiNativeEngine.test.ts"
```

Expected: FAIL because the three fields are not preserved yet.

- [ ] **Step 3: Add the fields to the parse type**

Update `NorthSchemeParseResult` exactly like this:

```ts
export interface NorthSchemeParseResult {
  // existing fields...
  suspicionTransmission?: number
  fractureTransmission?: number
  proxyTransmission?: number
}
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run:

```powershell
npx.cmd vitest run "src/game/aiNativeEngine.test.ts"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/game/types.ts src/game/aiNativeEngine.test.ts
git commit -m "feat: add intrigue nation-gate parse fields"
```

### Task 2: Teach the prompt schema and fallback parser the new fields

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\ai\prompts.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\aiNativeEngine.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\ai\prompts.test.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\aiNativeEngine.test.ts`

- [ ] **Step 1: Write failing prompt assertions**

Add these expectations to the north-parse prompt test:

```ts
expect(prompt).toContain('suspicionTransmission')
expect(prompt).toContain('fractureTransmission')
expect(prompt).toContain('proxyTransmission')
expect(prompt).toContain('generic suspicion should not score high')
expect(prompt).toContain('relationship crack must reach command, logistics, or coordination')
expect(prompt).toContain('actor motive, means, and public consequence')
```

- [ ] **Step 2: Write failing fallback assertions**

Add this exact test to `aiNativeEngine.test.ts`:

```ts
it('keeps intrigue transmission conservative for generic pressure language', () => {
  const parse = fallbackNorthParseFromSpeech({
    speech: '他未必真心，朝里风向也不稳，谁都可能先保自己。',
    npc: makeNorthNpc({ name: '宗艾' }),
    round: 10,
    schemeType: 'slander',
    relatedNpc: makeNorthNpc({ name: '祖廷' }),
  })

  expect(parse.suspicionTransmission ?? 0).toBeLessThan(0.35)
})
```

- [ ] **Step 3: Run focused tests to verify they fail**

Run:

```powershell
npx.cmd vitest run "src/ai/prompts.test.ts" "src/game/aiNativeEngine.test.ts"
```

Expected: FAIL because the new fields and rubric are not implemented.

- [ ] **Step 4: Extend the prompt schema**

Add these fields to the north-parse JSON schema in `prompts.ts`:

```ts
"suspicionTransmission": number,
"fractureTransmission": number,
"proxyTransmission": number,
```

Add conservative rubric text, with these exact ideas:

```ts
'For slander, generic suspicion or mood should not score high; only score suspicionTransmission high when the speech clearly shows why distrust reaches command, logistics, access, or execution.',
'For alienate, only score fractureTransmission high when the speech creates a believable break over authority, precedence, logistics, grain, legal cover, or coordination.',
'For proxy, only score proxyTransmission high when the target has motive, means, and the resulting move would create a broader public consequence.'
```

- [ ] **Step 5: Extend fallback parsing conservatively**

Inside `fallbackNorthParseFromSpeech`, add exact conservative heuristics:

```ts
const suspicionTransmission = clamp01(
  scoreMatches(speech, ['军令', '粮道', '转运', '诏令', '边镇', '调度', '谁来担责']) * 0.34
)

const fractureTransmission = clamp01(
  scoreMatches(speech, ['各听各的', '两套军令', '不再同心', '互相掣肘', '谁先保自己', '接应断开']) * 0.42
)

const proxyTransmission = clamp01(
  scoreMatches(speech, ['借他出手', '替你担名', '趁机压他', '公开收拾', '顺手夺权', '众人都会看见']) * 0.4
)
```

Clamp them into the returned parse:

```ts
suspicionTransmission,
fractureTransmission,
proxyTransmission,
```

Also normalize them in `normalizeNorthSchemeParse`:

```ts
suspicionTransmission: clamp01(result.suspicionTransmission ?? 0),
fractureTransmission: clamp01(result.fractureTransmission ?? 0),
proxyTransmission: clamp01(result.proxyTransmission ?? 0),
```

- [ ] **Step 6: Run focused tests to verify they pass**

Run:

```powershell
npx.cmd vitest run "src/ai/prompts.test.ts" "src/game/aiNativeEngine.test.ts"
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/ai/prompts.ts src/ai/prompts.test.ts src/game/aiNativeEngine.ts src/game/aiNativeEngine.test.ts
git commit -m "feat: add intrigue transmission parsing"
```

### Task 3: Gate nation spillover in `schemeEngine`

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\schemeEngine.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\schemeEngine.test.ts`

- [ ] **Step 1: Write the failing gate tests**

Add three exact tests:

```ts
it('keeps slander relational when suspicion does not transmit to the state layer', () => {
  const target = { ...INITIAL_NPCS.find(npc => npc.id === 'zongai')!, trust: 55 }
  const related = { ...INITIAL_NPCS.find(npc => npc.id === 'zuting')!, trust: 55 }

  const result = settleScheme(
    {
      id: 'low-signal-slander',
      targetNpcId: target.id,
      schemeType: 'slander',
      relatedNpcId: related.id,
      playerSpeech: '他未必真心，你最好别全信。',
      resolutionRoll: 0.01,
      northParse: makeNorthParse({
        suspicionTransmission: 0.12,
        governanceRelevance: 0.82,
      }),
    },
    target,
    related,
    0,
    { round: 10, unlockedSecrets: 1 },
  )

  expect(result.relatedTrustChange).toBeLessThan(0)
  expect(Math.abs(result.nationEffects.governance ?? 0)).toBeLessThan(0.2)
})
```

```ts
it('lets alienate damage nation only when the fracture reaches command or logistics', () => {
  const target = { ...INITIAL_NPCS.find(npc => npc.id === 'linghuelvguang')!, trust: 62 }
  const related = { ...INITIAL_NPCS.find(npc => npc.id === 'zuting')!, trust: 58 }

  const weak = settleScheme(
    {
      id: 'weak-alienate',
      targetNpcId: target.id,
      schemeType: 'alienate',
      relatedNpcId: related.id,
      playerSpeech: '你们未必真的一条心。',
      resolutionRoll: 0.01,
      northParse: makeNorthParse({
        fractureTransmission: 0.18,
        militaryRelevance: 0.8,
        governanceRelevance: 0.8,
      }),
    },
    target,
    related,
    0,
    { round: 12, unlockedSecrets: 1 },
  )

  const strong = settleScheme(
    {
      id: 'strong-alienate',
      targetNpcId: target.id,
      schemeType: 'alienate',
      relatedNpcId: related.id,
      playerSpeech: '若军令仍分成两套、粮道又各自捏在手里，真到前线吃紧时，你们谁都不会替谁先担责。',
      resolutionRoll: 0.01,
      northParse: makeNorthParse({
        fractureTransmission: 0.82,
        militaryRelevance: 0.8,
        governanceRelevance: 0.8,
      }),
    },
    target,
    related,
    0,
    { round: 12, unlockedSecrets: 1 },
  )

  expect(Math.abs(strong.nationEffects.governance ?? 0)).toBeGreaterThan(Math.abs(weak.nationEffects.governance ?? 0))
})
```

```ts
it('keeps proxy mostly personal unless the borrowed knife creates public consequences', () => {
  const target = { ...INITIAL_NPCS.find(npc => npc.id === 'yuwendi')!, trust: 74 }
  const related = { ...INITIAL_NPCS.find(npc => npc.id === 'zongai')!, trust: 60 }

  const weak = settleScheme(
    {
      id: 'weak-proxy',
      targetNpcId: target.id,
      schemeType: 'proxy',
      relatedNpcId: related.id,
      playerSpeech: '殿下若愿意出手，他自然不敢多言。',
      resolutionRoll: 0.01,
      northParse: makeNorthParse({
        proxyTransmission: 0.16,
        governanceRelevance: 0.88,
      }),
    },
    target,
    related,
    0,
    { round: 15, unlockedSecrets: 2 },
  )

  const strong = settleScheme(
    {
      id: 'strong-proxy',
      targetNpcId: target.id,
      schemeType: 'proxy',
      relatedNpcId: related.id,
      playerSpeech: '殿下若借整饬军令与粮道之名公开压他，不只他要退，朝里也会看清今后是谁真正能定前线节次。',
      resolutionRoll: 0.01,
      northParse: makeNorthParse({
        proxyTransmission: 0.86,
        governanceRelevance: 0.88,
      }),
    },
    target,
    related,
    0,
    { round: 15, unlockedSecrets: 2 },
  )

  expect(Math.abs(strong.nationEffects.governance ?? 0)).toBeGreaterThan(Math.abs(weak.nationEffects.governance ?? 0))
})
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```powershell
npx.cmd vitest run "src/game/schemeEngine.test.ts"
```

Expected: FAIL because nation spillover still ignores the new transmission fields.

- [ ] **Step 3: Implement the nation-impact gate**

Add these helpers in `schemeEngine.ts`:

```ts
function getIntrigueTransmission(
  schemeType: SchemeType,
  parse: NorthSchemeParseResult,
): number {
  if (schemeType === 'slander') return parse.suspicionTransmission ?? 0
  if (schemeType === 'alienate') return parse.fractureTransmission ?? 0
  if (schemeType === 'proxy') return parse.proxyTransmission ?? 0
  return 1
}

function getIntrigueNationGate(
  schemeType: SchemeType,
  parse: NorthSchemeParseResult,
): number {
  const transmission = getIntrigueTransmission(schemeType, parse)

  if (schemeType === 'slander') {
    if (transmission < 0.28) return 0
    return clamp(0.1 + transmission * 0.95, 0.1, 1)
  }

  if (schemeType === 'alienate') {
    if (transmission < 0.24) return 0
    return clamp(0.18 + transmission * 0.92, 0.18, 1)
  }

  if (schemeType === 'proxy') {
    if (transmission < 0.26) return 0
    return clamp(0.14 + transmission * 0.96, 0.14, 1)
  }

  return 1
}
```

Apply the gate after `deriveStrategicSpillover(...)` and before final nation merging:

```ts
const strategicSpillover = deriveStrategicSpillover(action, targetNpc, relatedNpc, round, success, northParse)
const intrigueGate = getIntrigueNationGate(action.schemeType, northParse)
const gatedStrategicSpillover =
  action.schemeType === 'slander' || action.schemeType === 'alienate' || action.schemeType === 'proxy'
    ? scaleDimensions(strategicSpillover, intrigueGate)
    : strategicSpillover

nationEffects = mergeDimensions(
  nationEffects,
  scaleDimensions(gatedStrategicSpillover, tunedNationMultiplier),
)
```

Do **not** gate person effects or faction effects. Only gate nation spillover.

- [ ] **Step 4: Run the focused test to verify it passes**

Run:

```powershell
npx.cmd vitest run "src/game/schemeEngine.test.ts"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/game/schemeEngine.ts src/game/schemeEngine.test.ts
git commit -m "feat: gate intrigue nation spillover"
```

### Task 4: Full verification and live-smoke readiness

**Files:**
- Verify only; no new files required

- [ ] **Step 1: Run focused suite**

Run:

```powershell
npx.cmd vitest run "src/ai/prompts.test.ts" "src/game/aiNativeEngine.test.ts" "src/game/schemeEngine.test.ts"
```

Expected: PASS.

- [ ] **Step 2: Run full tests**

Run:

```powershell
npx.cmd vitest run
```

Expected: PASS with the existing skip count unchanged.

- [ ] **Step 3: Run production build**

Run:

```powershell
npm.cmd run build
```

Expected: successful Vite build.

- [ ] **Step 4: Optional live sanity check**

Run:

```powershell
npm.cmd run balance:live-ai -- --sample average-mainline --sample expert-mainline
```

Expected: command completes if DeepSeek is reachable; if upstream networking fails, record the exact timeout/reset error and stop without changing code.

- [ ] **Step 5: Final commit**

```powershell
git add src/game/types.ts src/ai/prompts.ts src/ai/prompts.test.ts src/game/aiNativeEngine.ts src/game/aiNativeEngine.test.ts src/game/schemeEngine.ts src/game/schemeEngine.test.ts
git commit -m "feat: add intrigue nation-impact gates"
```
