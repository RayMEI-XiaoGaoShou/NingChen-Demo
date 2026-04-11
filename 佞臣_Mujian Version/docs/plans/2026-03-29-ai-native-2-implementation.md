# AI Native 2.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade AI Native so that strong player input produces clearly stronger structural outcomes, while weak input on the North Zhou line can create delayed political backlash.

**Architecture:** Add a structured parsing layer for player text, but keep final authority in local rules. North Zhou scheme resolution will move from a single speech score to multi-axis parsing plus delayed backlash; Southern Chen policy resolution will move from a single modifier to four parsed dimensions that separately influence immediate gains and next-round fallout.

**Tech Stack:** React, Zustand, TypeScript, Vitest, existing AI service/fallback pipeline

---

## File Structure

- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\types.ts`
  - Add AI Native 2.0 parse result and backlash types.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\ai\prompts.ts`
  - Add structured parse prompts for North Zhou scheme speech and Southern Chen policy reasons.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\ai\aiService.ts`
  - Add JSON-safe helper for structured parse calls with fallback.
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\aiNativeEngine.ts`
  - Central parser/fallback/normalizer for AI Native structured outputs.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\schemeEngine.ts`
  - Replace single speech score path with parsed dimensions and backlash generation hooks.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\roundSettlement.ts`
  - Store scheme parse results, delayed backlash markers, and settlement-facing explanation facts.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\nationEngine.ts`
  - Replace single policy reason modifier path with four parsed dimensions.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\stores\gameStore.ts`
  - Carry delayed backlash state forward between rounds.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\Settlement\Settlement.tsx`
  - Show subtle, inferable AI Native outcome signals without surfacing raw scores.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\RoundStart\RoundStart.tsx`
  - Surface previous-round backlash consequences indirectly via summary copy if present.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\data\prologueContent.ts`
  - Optional microcopy support if needed for new settlement hints.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\schemeEngine.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\roundSettlement.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\nationEngine.test.ts`
  - Lock the new outcomes in tests.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣策划案v1\AI Native 玩法结算逻辑.md`
  - Sync finalized AI Native 2.0 logic after implementation.

### Task 1: Add AI Native 2.0 Types And Structured Parse Engine

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\types.ts`
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\aiNativeEngine.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\ai\prompts.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\ai\aiService.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\aiNativeEngine.test.ts`

- [ ] **Step 1: Write the failing parser fallback tests**

```ts
import { describe, expect, it } from 'vitest'
import { normalizeNorthSchemeParse, normalizePolicyReasonParse } from './aiNativeEngine'

describe('normalizeNorthSchemeParse', () => {
    it('falls back to safe defaults when AI output is invalid', () => {
        const parsed = normalizeNorthSchemeParse(null)

        expect(parsed.characterFit).toBe(0)
        expect(parsed.eventFit).toBe(0)
        expect(parsed.structuralPenetration).toBe(0)
        expect(parsed.executability).toBe(0)
        expect(parsed.exposureRisk).toBe(0)
        expect(parsed.dominantIntent).toBe('neutral')
        expect(parsed.evidence).toEqual([])
    })
})

describe('normalizePolicyReasonParse', () => {
    it('clamps parser output into the expected range', () => {
        const parsed = normalizePolicyReasonParse({
            focusAlignment: 2,
            executionClarity: -1,
            costAwareness: 0.6,
            legitimacyAlignment: 0.8,
            policyStance: 'balanced',
            evidence: ['a'],
        })

        expect(parsed.focusAlignment).toBe(1)
        expect(parsed.executionClarity).toBe(0)
        expect(parsed.costAwareness).toBe(0.6)
        expect(parsed.legitimacyAlignment).toBe(0.8)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/game/aiNativeEngine.test.ts`
Expected: FAIL because the file/functions do not exist yet.

- [ ] **Step 3: Add minimal types**

```ts
export interface NorthSchemeParseResult {
    characterFit: number
    eventFit: number
    structuralPenetration: number
    executability: number
    exposureRisk: number
    dominantIntent: 'neutral' | 'induce' | 'threaten' | 'divide' | 'empathize' | 'strategize'
    evidence: string[]
}

export interface PolicyReasonParseResult {
    focusAlignment: number
    executionClarity: number
    costAwareness: number
    legitimacyAlignment: number
    policyStance: 'neutral' | 'balanced' | 'aggressive' | 'conservative' | 'expedient'
    evidence: string[]
}

export interface DelayedBacklash {
    npcId: string
    type: 'guarded' | 'misdirected' | 'exposed' | 'shock'
    intensity: number
    summary: string
    sourceRound: number
}
```

- [ ] **Step 4: Implement parser normalizers and JSON-safe AI helper**

```ts
export function normalizeNorthSchemeParse(input: unknown): NorthSchemeParseResult {
    const candidate = (input ?? {}) as Partial<NorthSchemeParseResult>
    return {
        characterFit: clamp01(candidate.characterFit),
        eventFit: clamp01(candidate.eventFit),
        structuralPenetration: clamp01(candidate.structuralPenetration),
        executability: clamp01(candidate.executability),
        exposureRisk: clamp01(candidate.exposureRisk),
        dominantIntent: isNorthIntent(candidate.dominantIntent) ? candidate.dominantIntent : 'neutral',
        evidence: Array.isArray(candidate.evidence) ? candidate.evidence.filter(Boolean).slice(0, 3) : [],
    }
}

export function normalizePolicyReasonParse(input: unknown): PolicyReasonParseResult {
    const candidate = (input ?? {}) as Partial<PolicyReasonParseResult>
    return {
        focusAlignment: clamp01(candidate.focusAlignment),
        executionClarity: clamp01(candidate.executionClarity),
        costAwareness: clamp01(candidate.costAwareness),
        legitimacyAlignment: clamp01(candidate.legitimacyAlignment),
        policyStance: isPolicyStance(candidate.policyStance) ? candidate.policyStance : 'neutral',
        evidence: Array.isArray(candidate.evidence) ? candidate.evidence.filter(Boolean).slice(0, 3) : [],
    }
}
```

- [ ] **Step 5: Add parse prompts and AI fallback contract**

```ts
export function buildNorthSchemeParsePrompt(...) {
    return [
        { role: 'system', content: '你是结构化裁判，只输出 JSON。' },
        { role: 'user', content: `...字段要求：characterFit,eventFit,structuralPenetration,executability,exposureRisk,dominantIntent,evidence...` },
    ]
}
```

- [ ] **Step 6: Run parser test to verify it passes**

Run: `npm.cmd test -- src/game/aiNativeEngine.test.ts`
Expected: PASS

### Task 2: Upgrade North Zhou Scheme Resolution To Multi-Axis Parsing

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\schemeEngine.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\schemeEngine.test.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\schemeEngine.test.ts`

- [ ] **Step 1: Write the failing multi-axis scheme test**

```ts
it('lets structurally strong speech amplify nation effects more than merely flattering speech', () => {
    const npc = makeCourtNpc({ trust: 68, title: '右丞相', name: '祖廷' })

    const flattering = settleScheme(
        { id: 'a', targetNpcId: npc.id, schemeType: 'advise', playerSpeech: '丞相国之柱石，还望主持大局。', resolutionRoll: 0.01 },
        npc,
        null,
        0,
        { round: 3, unlockedSecrets: 1, northParse: { characterFit: 0.8, eventFit: 0.2, structuralPenetration: 0.1, executability: 0.4, exposureRisk: 0.1, dominantIntent: 'empathize', evidence: [] } },
    )

    const structural = settleScheme(
        { id: 'b', targetNpcId: npc.id, schemeType: 'advise', playerSpeech: '趁灾年把仓廪、饷权与赈务并收中枢，先堵河北豪右，再反压帝党。', resolutionRoll: 0.01 },
        npc,
        null,
        0,
        { round: 3, unlockedSecrets: 1, northParse: { characterFit: 0.7, eventFit: 0.9, structuralPenetration: 0.95, executability: 0.8, exposureRisk: 0.2, dominantIntent: 'strategize', evidence: [] } },
    )

    expect(structural.trustChange).toBeGreaterThanOrEqual(flattering.trustChange)
    expect(Math.abs(structural.nationEffects.governance ?? 0)).toBeGreaterThan(Math.abs(flattering.nationEffects.governance ?? 0))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/game/schemeEngine.test.ts`
Expected: FAIL because `SchemeContext` does not yet accept parse data.

- [ ] **Step 3: Replace single speech score influence with multi-axis influence**

```ts
const characterBoost = parse.characterFit * 0.18 + parse.executability * 0.12
const eventBoost = parse.eventFit * 0.12
const successRate = clamp(baseRate + characterBoost + eventBoost - parse.exposureRisk * 0.08, 0.05, 0.98)

const personMultiplier = clamp(0.9 + parse.characterFit * 0.85 + parse.executability * 0.35, 0.8, 2.1)
const factionMultiplier = clamp(0.85 + parse.eventFit * 0.55 + parse.structuralPenetration * 1.0, 0.75, 2.4)
const nationMultiplier = parse.structuralPenetration >= 0.45
    ? clamp(0.8 + parse.structuralPenetration * 1.4 + parse.eventFit * 0.4, 0.8, 2.8)
    : 0.65
```

- [ ] **Step 4: Keep old rule fallback**

```ts
const parse = context.northParse ?? fallbackNorthParseFromSpeech(action, targetNpc)
```

- [ ] **Step 5: Run scheme engine tests**

Run: `npm.cmd test -- src/game/schemeEngine.test.ts`
Expected: PASS

### Task 3: Add North Zhou Delayed Backlash Generation

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\schemeEngine.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\types.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\roundSettlement.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\stores\gameStore.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\roundSettlement.test.ts`

- [ ] **Step 1: Write the failing backlash test**

```ts
it('turns exposed scheme speech into next-round backlash instead of only a weaker immediate result', () => {
    const result = settleRound({
        round: 4,
        schemes: [{
            id: 'shock',
            targetNpcId: 'yuwendi',
            schemeType: 'advise',
            playerSpeech: '你若立刻夺权起兵，便可借边患逼宫，一举翻掉太后。',
            resolutionRoll: 0.02,
        }],
        ...
    }) as any

    expect(result.delayedBacklash.length).toBeGreaterThan(0)
    expect(result.delayedBacklash[0]?.type).toMatch(/guarded|misdirected|shock/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/game/roundSettlement.test.ts`
Expected: FAIL because no delayed backlash is produced or persisted.

- [ ] **Step 3: Generate backlash grade and convert it to delayed events**

```ts
function deriveBacklash(...) {
    if (parse.exposureRisk < 0.45 && parse.structuralPenetration >= 0.35) return []
    if (parse.exposureRisk >= 0.8 && highWeightTarget) return [{ type: 'shock', ... }]
    if (parse.exposureRisk >= 0.55) return [{ type: 'guarded', ... }]
    if (success && parse.structuralPenetration < 0.2 && parse.eventFit < 0.25) return [{ type: 'misdirected', ... }]
    return [{ type: 'exposed', ... }]
}
```

- [ ] **Step 4: Carry backlash into next-round state**

```ts
delayedBacklash: DelayedBacklash[]
pendingBacklash: DelayedBacklash[]
```

- [ ] **Step 5: Apply backlash softly at next round start**

```ts
if (backlash.type === 'guarded') npc.trust -= Math.max(2, backlash.intensity * 4)
if (backlash.type === 'misdirected') adjustWarPressure(...)
if (backlash.type === 'exposed') increaseSafetyRisk(...)
if (backlash.type === 'shock') applyStrongerWarAndSafetyPenalty(...)
```

- [ ] **Step 6: Run round settlement tests**

Run: `npm.cmd test -- src/game/roundSettlement.test.ts`
Expected: PASS

### Task 4: Upgrade Southern Chen Policy Resolution To Four-Axis Parsing

**Files:**
- Modify: `C:\Users\\happyelements\\Desktop\\佞臣 Demo\\佞臣-game\\src\\game\\nationEngine.ts`
- Modify: `C:\Users\\happyelements\\Desktop\\佞臣 Demo\\佞臣-game\\src\\game\\nationEngine.test.ts`
- Modify: `C:\Users\\happyelements\\Desktop\\佞臣 Demo\\佞臣-game\\src\\game\\roundSettlement.ts`

- [ ] **Step 1: Write the failing policy parse test**

```ts
it('lets clear execution and cost-aware policy reasons outperform generic righteous wording', () => {
    const strong = calculatePolicyEffect(
        { grain: 3, governance: 1 },
        '先把流民编户屯田，再分州郡定口粮与执行责任，避免地方推诿，先稳春耕后谈扩军。',
        {
            legitimacyEffect: 'up',
            aiScoringFocus: '是否认识到流民是资源，不只是秩序问题',
            policyParse: { focusAlignment: 0.92, executionClarity: 0.88, costAwareness: 0.84, legitimacyAlignment: 0.8, policyStance: 'balanced', evidence: [] },
        },
    )

    const weak = calculatePolicyEffect(
        { grain: 3, governance: 1 },
        '当以仁政安民。',
        {
            legitimacyEffect: 'up',
            aiScoringFocus: '是否认识到流民是资源，不只是秩序问题',
            policyParse: { focusAlignment: 0.25, executionClarity: 0.1, costAwareness: 0.05, legitimacyAlignment: 0.7, policyStance: 'conservative', evidence: [] },
        },
    )

    expect(strong.grain).toBeGreaterThan(weak.grain ?? 0)
    expect(strong.governance).toBeGreaterThan(weak.governance ?? 0)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/game/nationEngine.test.ts`
Expected: FAIL because `policyParse` is unsupported.

- [ ] **Step 3: Replace single modifier with four-axis blend**

```ts
const parse = meta.policyParse ?? fallbackPolicyParse(reasonText, meta)
const immediateModifier = clamp(
    0.7
    + parse.focusAlignment * 0.4
    + parse.executionClarity * 0.35
    + parse.legitimacyAlignment * 0.18,
    0.65,
    1.8,
)
```

- [ ] **Step 4: Split delayed aftereffect weighting**

```ts
const followUpFactor = clamp(
    0.14
    + parse.costAwareness * 0.16
    + parse.legitimacyAlignment * 0.12
    + parse.focusAlignment * 0.1,
    0.18,
    0.52,
)
```

- [ ] **Step 5: Run nation engine tests**

Run: `npm.cmd test -- src/game/nationEngine.test.ts`
Expected: PASS

### Task 5: Surface Subtle AI Native Outcome Feedback

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\Settlement\Settlement.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\RoundStart\RoundStart.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\roundSettlement.ts`

- [ ] **Step 1: Add settlement-facing explanation facts**

```ts
judgeFacts.aiNativeSummary = {
    schemeHints: ['这步话头借到了灾年与仓廪之势。'],
    backlashHints: ['朝中虽未明言，已有一线人心起疑。'],
    policyHints: ['附言讲清了执行路径，因此南陈收益更稳。'],
}
```

- [ ] **Step 2: Render them without raw scores**

```tsx
{lastSettlement?.judgeFacts.aiNativeSummary?.schemeHints?.map(hint => (
  <p key={hint} className="result-subhint">{hint}</p>
))}
```

- [ ] **Step 3: Surface previous-round backlash indirectly on RoundStart**

```tsx
{recentBacklash.length > 0 && (
  <div className="glass-panel aftereffect-card">
    <h3 className="section-title">朝中余波</h3>
    <p>{recentBacklash[0].summary}</p>
  </div>
)}
```

- [ ] **Step 4: Run focused tests/build**

Run: `npm.cmd test -- src/game/roundSettlement.test.ts src/game/nationEngine.test.ts`
Expected: PASS

### Task 6: Sync Docs And Run Full Verification

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣策划案v1\AI Native 玩法结算逻辑.md`
- Test: full suite

- [ ] **Step 1: Update planning doc to final implemented logic**

Add:
- structured parse axes
- delayed backlash grades
- north-vs-south behavior differences
- fallback behavior

- [ ] **Step 2: Run full test suite**

Run: `npm.cmd test`
Expected: PASS

- [ ] **Step 3: Run production build**

Run: `npm.cmd run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/game/types.ts src/game/aiNativeEngine.ts src/ai/prompts.ts src/ai/aiService.ts src/game/schemeEngine.ts src/game/roundSettlement.ts src/game/nationEngine.ts src/stores/gameStore.ts src/components/Settlement/Settlement.tsx src/components/RoundStart/RoundStart.tsx src/game/aiNativeEngine.test.ts src/game/schemeEngine.test.ts src/game/roundSettlement.test.ts src/game/nationEngine.test.ts "C:/Users/happyelements/Desktop/佞臣 Demo/佞臣策划案v1/AI Native 玩法结算逻辑.md"
git commit -m "feat: upgrade ai native resolution and backlash"
```

---

## Self-Review

### Spec coverage

- Structured parse layer: Task 1
- North Zhou multi-axis result amplification: Task 2
- North Zhou delayed backlash: Task 3
- Southern Chen four-axis policy parsing: Task 4
- Subtle explanation feedback: Task 5
- Doc sync and verification: Task 6

No spec gaps found.

### Placeholder scan

- No `TODO / TBD / implement later` placeholders remain.

### Type consistency

- `NorthSchemeParseResult`, `PolicyReasonParseResult`, and `DelayedBacklash` are introduced in Task 1 and reused consistently in later tasks.
- The same naming is used across parse prompts, engine normalization, resolution, state carry, and tests.

