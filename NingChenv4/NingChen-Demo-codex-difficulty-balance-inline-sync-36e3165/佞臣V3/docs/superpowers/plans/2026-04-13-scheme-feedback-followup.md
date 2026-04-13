# Scheme Feedback Follow-Up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one optional NPC follow-up question per round on the scheme feedback page, parse the player's one-time reply, and apply a bounded modifier to the original scheme settlement.

**Architecture:** Store follow-up state on the existing `SchemeAction`, not as a new scheme. Add a focused pure helper module for candidate selection, parse normalization, question extraction, and settlement modifiers; then connect it to prompts, AI parsing, Zustand store actions, settlement, and the `SchemeFeedback` UI. The feature must fail open: if DeepSeek parsing or final NPC reply generation fails, the original scheme still settles normally with zero follow-up delta.

**Tech Stack:** React 18, TypeScript, Zustand, Vite, Vitest, existing DeepSeek-compatible `chatCompletion` / `chatCompletionJson` service.

---

## Working Directory

```powershell
# Run commands from the Vite app directory that contains package.json:
# NingChenv4/NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165/<game-app-folder>
```

## File Map

- Modify `src/game/types.ts`: add follow-up types and `SchemeAction.followUp`.
- Create `src/game/schemeFollowUp.ts`: pure helper module.
- Create `src/game/schemeFollowUp.test.ts`: helper tests.
- Modify `src/ai/prompts.ts` and `src/ai/prompts.test.ts`: add follow-up prompt mode, parse prompt, and final response prompt.
- Modify `src/game/aiNativeEngine.ts`: add `parseSchemeFollowUpInput`.
- Modify `src/stores/gameStore.ts` and `src/stores/gameStore.test.ts`: add store actions.
- Modify `src/game/saveEngine.test.ts`: guard follow-up persistence.
- Modify `src/game/schemeEngine.ts` and `src/game/schemeEngine.test.ts`: apply follow-up modifiers in settlement.
- Modify `src/components/SchemeFeedback/SchemeFeedback.tsx`, `src/components/SchemeFeedback/SchemeFeedback.css`, and `src/components/SchemeFeedback/SchemeFeedback.test.tsx`: add UI flow.

---

### Task 1: Types And Pure Helpers

**Files:**
- Modify: `src/game/types.ts`
- Create: `src/game/schemeFollowUp.ts`
- Create: `src/game/schemeFollowUp.test.ts`

- [ ] **Step 1: Write failing helper tests**

Create `src/game/schemeFollowUp.test.ts` with tests for:

```ts
import { describe, expect, it } from 'vitest'
import {
    applySchemeFollowUpToNorthParse,
    extractFinalQuestion,
    normalizeSchemeFollowUpParse,
    selectSchemeFollowUpCandidateId,
    shouldBlockSettlementForFollowUp,
} from './schemeFollowUp'
import type { NorthSchemeParseResult, SchemeAction } from './types'

function makeParse(overrides: Partial<NorthSchemeParseResult> = {}): NorthSchemeParseResult {
    return {
        characterFit: 0.52,
        eventFit: 0.56,
        structuralPenetration: 0.48,
        executability: 0.54,
        exposureRisk: 0.22,
        financeRelevance: 0.2,
        grainRelevance: 0.2,
        militaryRelevance: 0.2,
        socialOrderRelevance: 0.2,
        governanceRelevance: 0.2,
        dominantIntent: 'strategize',
        stateBenefit: 0,
        targetBenefit: 0,
        factionBenefit: 0,
        advicePolarity: 'neutral_or_vague',
        legitimacyDirection: 0,
        omenPolarity: 'vague_or_ceremonial',
        suspicionTransmission: 0,
        fractureTransmission: 0,
        proxyTransmission: 0,
        evidence: [],
        ...overrides,
    }
}

function makeAction(id: string, schemeType: SchemeAction['schemeType'], parse: NorthSchemeParseResult): SchemeAction {
    return { id, targetNpcId: `${id}-npc`, schemeType, playerSpeech: 'specific speech for testing', northParse: parse }
}

describe('scheme follow-up helpers', () => {
    it('normalizes bounded parse fields', () => {
        const parsed = normalizeSchemeFollowUpParse({ clarificationFit: 2, pressureControl: -1, exposureRiskDelta: 9, successRateDelta: -9, effectMultiplierDelta: 9, evidence: ['a', 'b', 'c', 'd'] })
        expect(parsed.clarificationFit).toBe(1)
        expect(parsed.pressureControl).toBe(0)
        expect(parsed.exposureRiskDelta).toBe(0.18)
        expect(parsed.successRateDelta).toBe(-0.08)
        expect(parsed.effectMultiplierDelta).toBe(0.18)
        expect(parsed.evidence).toEqual(['a', 'b', 'c'])
    })

    it('selects the most interrogable scheme', () => {
        const actions = [
            makeAction('too-strong', 'advise', makeParse({ characterFit: 0.92, eventFit: 0.9, executability: 0.88 })),
            makeAction('candidate', 'alienate', makeParse({ characterFit: 0.56, eventFit: 0.52, executability: 0.58, exposureRisk: 0.36 })),
            makeAction('too-weak', 'probe', makeParse({ characterFit: 0.08, eventFit: 0.06, executability: 0.12 })),
        ]
        expect(selectSchemeFollowUpCandidateId(actions)).toBe('candidate')
    })

    it('applies answered follow-up modifiers without mutating the original parse', () => {
        const base = makeParse({ characterFit: 0.5, executability: 0.5, exposureRisk: 0.2 })
        const adjusted = applySchemeFollowUpToNorthParse(base, {
            questionText: 'Why this route?',
            playerReply: 'This clarifies the route and reduces the visible edge.',
            status: 'answered',
            parse: normalizeSchemeFollowUpParse({ clarificationFit: 0.8, npcInterestFit: 0.9, pressureControl: 0.7, contradictionRisk: 0.1, exposureRiskDelta: -0.08, successRateDelta: 0.1, effectMultiplierDelta: 0.12, evidence: ['clearer route'] }),
        })
        expect(base.exposureRisk).toBe(0.2)
        expect(adjusted.exposureRisk).toBe(0.12)
        expect(adjusted.characterFit).toBeGreaterThan(base.characterFit)
    })

    it('extracts the last question and blocks only unresolved opportunities', () => {
        expect(extractFinalQuestion('This has some merit. What exactly do you want me to risk?')).toBe('What exactly do you want me to risk?')
        expect(extractFinalQuestion('This has some merit. I will consider it.')).toBeNull()
        expect(shouldBlockSettlementForFollowUp([{ ...makeAction('b', 'slander', makeParse()), followUp: { questionText: 'Who?', status: 'available' } }], false)).toBe(true)
        expect(shouldBlockSettlementForFollowUp([{ ...makeAction('b', 'slander', makeParse()), followUp: { questionText: 'Who?', status: 'skipped' } }], false)).toBe(false)
        expect(shouldBlockSettlementForFollowUp([], true)).toBe(true)
    })
})
```

- [ ] **Step 2: Run helper tests and verify they fail**

```powershell
npm test -- src/game/schemeFollowUp.test.ts
```

Expected: FAIL because `src/game/schemeFollowUp.ts` and follow-up types do not exist.

- [ ] **Step 3: Add follow-up types**

In `src/game/types.ts`, add before `SchemeAction`:

```ts
export type SchemeFollowUpStatus = 'available' | 'answered' | 'skipped'

export interface SchemeFollowUpParseResult {
    clarificationFit: number
    npcInterestFit: number
    pressureControl: number
    contradictionRisk: number
    exposureRiskDelta: number
    successRateDelta: number
    effectMultiplierDelta: number
    evidence: string[]
}

export interface SchemeFollowUp {
    questionText: string
    playerReply?: string
    parse?: SchemeFollowUpParseResult
    finalNpcReply?: string
    status: SchemeFollowUpStatus
}
```

Extend `SchemeAction` with:

```ts
followUp?: SchemeFollowUp
```

- [ ] **Step 4: Add helper module**

Create `src/game/schemeFollowUp.ts` with:

```ts
import type { NorthSchemeParseResult, SchemeAction, SchemeFollowUp, SchemeFollowUpParseResult, SchemeType } from './types'

const INTERROGABLE_SCHEME_WEIGHT: Partial<Record<SchemeType, number>> = {
    probe: 0.08,
    advise: 0.1,
    slander: 0.12,
    alienate: 0.14,
    frame: 0.12,
    proxy: 0.1,
    omen: 0.12,
    secession: -0.05,
    rebellion: -0.05,
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
}

function clamp01(value: unknown): number {
    return clamp(typeof value === 'number' && Number.isFinite(value) ? value : 0, 0, 1)
}

function clampDelta(value: unknown, min: number, max: number): number {
    return Math.round(clamp(typeof value === 'number' && Number.isFinite(value) ? value : 0, min, max) * 100) / 100
}

export function normalizeSchemeFollowUpParse(input: unknown): SchemeFollowUpParseResult {
    const candidate = (input ?? {}) as Partial<SchemeFollowUpParseResult>
    const evidence = Array.isArray(candidate.evidence)
        ? candidate.evidence.filter(item => typeof item === 'string' && item.trim().length > 0).slice(0, 3)
        : []
    return {
        clarificationFit: clamp01(candidate.clarificationFit),
        npcInterestFit: clamp01(candidate.npcInterestFit),
        pressureControl: clamp01(candidate.pressureControl),
        contradictionRisk: clamp01(candidate.contradictionRisk),
        exposureRiskDelta: clampDelta(candidate.exposureRiskDelta, -0.12, 0.18),
        successRateDelta: clampDelta(candidate.successRateDelta, -0.08, 0.12),
        effectMultiplierDelta: clampDelta(candidate.effectMultiplierDelta, -0.1, 0.18),
        evidence,
    }
}

export function getSchemeFollowUpEffectMultiplier(followUp?: SchemeFollowUp): number {
    if (followUp?.status !== 'answered' || !followUp.parse) return 1
    return clamp(1 + followUp.parse.effectMultiplierDelta, 0.9, 1.18)
}

export function getSchemeFollowUpSuccessRateDelta(followUp?: SchemeFollowUp): number {
    if (followUp?.status !== 'answered' || !followUp.parse) return 0
    return followUp.parse.successRateDelta
}

export function applySchemeFollowUpToNorthParse(baseParse: NorthSchemeParseResult, followUp?: SchemeFollowUp): NorthSchemeParseResult {
    if (followUp?.status !== 'answered' || !followUp.parse) return baseParse
    const parse = followUp.parse
    const quality = (parse.clarificationFit + parse.npcInterestFit + parse.pressureControl) / 3
    const contradictionDrag = parse.contradictionRisk * 0.08
    return {
        ...baseParse,
        characterFit: clamp(baseParse.characterFit + quality * 0.08 - contradictionDrag, 0, 1),
        executability: clamp(baseParse.executability + parse.clarificationFit * 0.06 - contradictionDrag, 0, 1),
        eventFit: clamp(baseParse.eventFit + parse.clarificationFit * 0.04 - parse.contradictionRisk * 0.05, 0, 1),
        exposureRisk: clamp(baseParse.exposureRisk + parse.exposureRiskDelta, 0, 1),
        evidence: [...baseParse.evidence, ...parse.evidence.map(item => `follow-up: ${item}`)].slice(0, 5),
    }
}

export function extractFinalQuestion(reply: string): string | null {
    const matches = reply.trim().match(/[^.!?]*[?]/g)
    return matches?.length ? matches[matches.length - 1]!.trim() : null
}

function calculateCandidateScore(action: SchemeAction): number {
    if (!action.id || action.followUp || !action.northParse) return -1
    const parse = action.northParse
    const quality = (parse.characterFit + parse.eventFit + parse.executability) / 3
    const nearThreshold = 1 - Math.min(1, Math.abs(quality - 0.56) / 0.56)
    const riskInterest = parse.exposureRisk >= 0.28 && parse.exposureRisk <= 0.68 ? 0.08 : 0
    const tooSettledPenalty = quality >= 0.82 || quality <= 0.18 ? 0.3 : 0
    return nearThreshold + (INTERROGABLE_SCHEME_WEIGHT[action.schemeType] ?? 0) + riskInterest - tooSettledPenalty
}

export function selectSchemeFollowUpCandidateId(actions: SchemeAction[]): string | null {
    let bestId: string | null = null
    let bestScore = 0.25
    for (const action of actions) {
        const score = calculateCandidateScore(action)
        if (score > bestScore) {
            bestScore = score
            bestId = action.id ?? null
        }
    }
    return bestId
}

export function shouldBlockSettlementForFollowUp(actions: SchemeAction[], followUpSubmitting: boolean): boolean {
    return followUpSubmitting || actions.some(action => action.followUp?.status === 'available')
}
```

- [ ] **Step 5: Run helper tests and commit**

```powershell
npm test -- src/game/schemeFollowUp.test.ts
git add src/game/types.ts src/game/schemeFollowUp.ts src/game/schemeFollowUp.test.ts
git commit -m "feat: add scheme follow-up helpers"
```

Expected: tests pass before commit.

---

### Task 2: Prompts And AI Parser

**Files:**
- Modify: `src/ai/prompts.ts`
- Modify: `src/ai/prompts.test.ts`
- Modify: `src/game/aiNativeEngine.ts`

- [ ] **Step 1: Add failing prompt tests**

In `src/ai/prompts.test.ts`, import `buildSchemeFollowUpParsePrompt` and `buildNpcFollowUpFinalPrompt`. Add tests that assert:

```ts
expect(buildNpcPrompt({ npc, schemeType: 'slander', speech: 'test speech', success: true, followUpMode: 'question_candidate' })[1].content)
    .toContain('natural follow-up question')

expect(buildSchemeFollowUpParsePrompt({ round: 6, eventName: 'test event', eventBriefing: 'test briefing', npc, schemeType: 'slander', originalSpeech: 'original speech', originalParse: makeNorthParse(), npcQuestion: 'What do you mean?', playerReply: 'I mean a narrower political risk.' })[1].content)
    .toContain('"successRateDelta": -0.08 to 0.12')

expect(buildNpcFollowUpFinalPrompt({ npc, schemeType: 'slander', originalSpeech: 'original speech', npcQuestion: 'What do you mean?', playerReply: 'I mean a narrower political risk.', parseEvidence: ['clearer target'] })[0].content)
    .toContain('Do not ask the player another question')
```

Use the existing `INITIAL_NPCS` fixture and copy a local `makeNorthParse` helper if needed.

- [ ] **Step 2: Run prompt tests and verify they fail**

```powershell
npm test -- src/ai/prompts.test.ts
```

Expected: FAIL because follow-up prompt builders and `followUpMode` are missing.

- [ ] **Step 3: Extend `buildNpcPrompt`**

In `src/ai/prompts.ts`, add:

```ts
export type NpcFollowUpMode = 'none' | 'question_candidate' | 'statement_only'
```

Add `followUpMode?: NpcFollowUpMode` to `buildNpcPrompt` params and default it to `'none'`. Add this instruction into the user prompt:

```ts
const followUpInstruction = followUpMode === 'question_candidate'
    ? `Follow-up requirement: this response must end with one natural follow-up question. The question must fit this NPC's doubts, interests, or probing instinct; do not ask multiple questions; do not ask a generic "what do you think".`
    : followUpMode === 'statement_only'
        ? `Closure requirement: this response must end as a statement. Do not ask the player another question.`
        : ''
```

- [ ] **Step 4: Add prompt builders**

In `src/ai/prompts.ts`, add `buildSchemeFollowUpParsePrompt` and `buildNpcFollowUpFinalPrompt`. The parse prompt must output JSON fields:

```ts
{
  "clarificationFit": 0-1,
  "npcInterestFit": 0-1,
  "pressureControl": 0-1,
  "contradictionRisk": 0-1,
  "exposureRiskDelta": -0.12 to 0.18,
  "successRateDelta": -0.08 to 0.12,
  "effectMultiplierDelta": -0.10 to 0.18,
  "evidence": ["at most 3 short reasons"]
}
```

The final-response prompt must include:

```ts
`Extra rules:
- This is the NPC's final response to the player's follow-up reply.
- Output 2 to 4 sentences.
- End with a statement.
- Do not ask the player another question.
- Do not show scores, JSON, or system judgement.`
```

- [ ] **Step 5: Add `parseSchemeFollowUpInput`**

In `src/game/aiNativeEngine.ts`, import `buildSchemeFollowUpParsePrompt` and `normalizeSchemeFollowUpParse`. Add:

```ts
export async function parseSchemeFollowUpInput(params: {
    round: number
    eventName: string
    eventBriefing: string
    npc: NPC
    schemeType: SchemeType
    originalSpeech: string
    originalParse: NorthSchemeParseResult
    npcQuestion: string
    playerReply: string
}): Promise<SchemeFollowUpParseResult> {
    const fallback = normalizeSchemeFollowUpParse({
        clarificationFit: params.playerReply.trim().length >= 12 ? 0.35 : 0.12,
        npcInterestFit: 0.18,
        pressureControl: /kill|rebel|coup|uprising/.test(params.playerReply.toLowerCase()) ? 0.12 : 0.38,
        contradictionRisk: params.playerReply.trim().length < 8 ? 0.45 : 0.22,
        exposureRiskDelta: /kill|rebel|coup|uprising/.test(params.playerReply.toLowerCase()) ? 0.08 : 0,
        successRateDelta: params.playerReply.trim().length >= 20 ? 0.03 : 0,
        effectMultiplierDelta: params.playerReply.trim().length >= 20 ? 0.04 : 0,
        evidence: ['local fallback uses reply length and risk words conservatively'],
    })
    const aiParsed = await chatCompletionJson<SchemeFollowUpParseResult>(
        buildSchemeFollowUpParsePrompt(params),
        { temperature: 0.2, maxTokens: 180, tag: 'scheme_follow_up_parse' },
    )
    return aiParsed ? normalizeSchemeFollowUpParse(aiParsed) : fallback
}
```

- [ ] **Step 6: Verify and commit**

```powershell
npm test -- src/ai/prompts.test.ts
npm run build
git add src/ai/prompts.ts src/ai/prompts.test.ts src/game/aiNativeEngine.ts
git commit -m "feat: add scheme follow-up prompts"
```

Expected: tests and build pass before commit.

---

### Task 3: Store Actions And Save Guard

**Files:**
- Modify: `src/stores/gameStore.ts`
- Modify: `src/stores/gameStore.test.ts`
- Modify: `src/game/saveEngine.test.ts`

- [ ] **Step 1: Add failing store tests**

In `src/stores/gameStore.test.ts`, add a test that calls `setSchemeFollowUp`, `answerSchemeFollowUp`, and `skipSchemeFollowUp` on an existing action and asserts the matching `currentSchemes[0].followUp.status` becomes `available`, then `answered`, then `skipped`.

In `src/game/saveEngine.test.ts`, add a persisted snapshot test that builds a snapshot with `currentSchemes[0].followUp.status === 'answered'` and asserts the returned snapshot preserves `parse.successRateDelta`.

- [ ] **Step 2: Run store/save tests and verify they fail**

```powershell
npm test -- src/stores/gameStore.test.ts src/game/saveEngine.test.ts
```

Expected: FAIL because store actions are missing.

- [ ] **Step 3: Add store action signatures and implementations**

In `src/stores/gameStore.ts`, import `SchemeFollowUp` and `SchemeFollowUpParseResult`. Add to `interface GameState`:

```ts
setSchemeFollowUp: (actionId: string, followUp: SchemeFollowUp) => void
answerSchemeFollowUp: (actionId: string, playerReply: string, parse: SchemeFollowUpParseResult, finalNpcReply: string) => void
skipSchemeFollowUp: (actionId: string) => void
```

Add implementations near `updateSchemeParse`:

```ts
setSchemeFollowUp: (actionId: string, followUp: SchemeFollowUp) => {
    set(state => ({
        currentSchemes: state.currentSchemes.map(action =>
            action.id === actionId ? { ...action, followUp } : action,
        ),
    }))
},

answerSchemeFollowUp: (actionId: string, playerReply: string, parse: SchemeFollowUpParseResult, finalNpcReply: string) => {
    set(state => ({
        currentSchemes: state.currentSchemes.map(action =>
            action.id === actionId
                ? { ...action, followUp: { questionText: action.followUp?.questionText ?? '', playerReply, parse, finalNpcReply, status: 'answered' } }
                : action,
        ),
    }))
},

skipSchemeFollowUp: (actionId: string) => {
    set(state => ({
        currentSchemes: state.currentSchemes.map(action =>
            action.id === actionId && action.followUp
                ? { ...action, followUp: { ...action.followUp, status: 'skipped' } }
                : action,
        ),
    }))
},
```

- [ ] **Step 4: Verify and commit**

```powershell
npm test -- src/stores/gameStore.test.ts src/game/saveEngine.test.ts
git add src/stores/gameStore.ts src/stores/gameStore.test.ts src/game/saveEngine.test.ts
git commit -m "feat: persist scheme follow-up state"
```

Expected: tests pass before commit.

---

### Task 4: Settlement Integration

**Files:**
- Modify: `src/game/schemeEngine.ts`
- Modify: `src/game/schemeEngine.test.ts`

- [ ] **Step 1: Add failing settlement tests**

In `src/game/schemeEngine.test.ts`, add one test where a base action has `resolutionRoll = baseRate + 0.03` and fails, while the same action with `followUp.parse.successRateDelta = 0.08` succeeds. Add a second test comparing the absolute nation effect of a successful action with and without `effectMultiplierDelta = 0.18`.

- [ ] **Step 2: Run settlement tests and verify they fail**

```powershell
npm test -- src/game/schemeEngine.test.ts
```

Expected: FAIL because `settleScheme` ignores `followUp`.

- [ ] **Step 3: Apply follow-up helpers in settlement**

In `src/game/schemeEngine.ts`, import:

```ts
import {
    applySchemeFollowUpToNorthParse,
    getSchemeFollowUpEffectMultiplier,
    getSchemeFollowUpSuccessRateDelta,
} from './schemeFollowUp'
```

In `previewSchemeSuccess`, compute:

```ts
const rawParse = getNorthParse(action, targetNpc, context.round ?? 1, null, context.northParse)
const parse = context.northParse ? rawParse : applySchemeFollowUpToNorthParse(rawParse, action.followUp)
const successRate = calculateParsedSuccessRate(action.schemeType, targetNpc.trust, trustThreshold, existingActionsOnTarget > 0, parse, context.difficulty ?? 'normal')
const followUpDelta = context.northParse ? 0 : getSchemeFollowUpSuccessRateDelta(action.followUp)
return roll < clamp(successRate + followUpDelta, 0.05, 0.98)
```

In `settleScheme`, compute:

```ts
const rawNorthParse = getNorthParse(action, targetNpc, round, relatedNpc, context.northParse)
const northParse = context.northParse ? rawNorthParse : applySchemeFollowUpToNorthParse(rawNorthParse, action.followUp)
const success = schemeAllowed && previewSchemeSuccess(action, targetNpc, existingActionsOnTarget, roll, { ...context, northParse })
const followUpEffectMultiplier = success ? getSchemeFollowUpEffectMultiplier(action.followUp) : 1
```

Multiply local person/faction/nation scaling by `followUpEffectMultiplier`. Do not apply this multiplier to other actions in the same round.

- [ ] **Step 4: Verify and commit**

```powershell
npm test -- src/game/schemeEngine.test.ts
git add src/game/schemeEngine.ts src/game/schemeEngine.test.ts
git commit -m "feat: apply scheme follow-up modifiers"
```

Expected: tests pass before commit.

---

### Task 5: Scheme Feedback UI Flow

**Files:**
- Modify: `src/components/SchemeFeedback/SchemeFeedback.tsx`
- Modify: `src/components/SchemeFeedback/SchemeFeedback.css`
- Modify: `src/components/SchemeFeedback/SchemeFeedback.test.tsx`

- [ ] **Step 1: Add failing proceed helper test**

In `src/components/SchemeFeedback/SchemeFeedback.test.tsx`, import and test `canProceedFromSchemeFeedback`:

```ts
expect(canProceedFromSchemeFeedback({ allDone: false, allParsed: true, followUpBlocked: false })).toBe(false)
expect(canProceedFromSchemeFeedback({ allDone: true, allParsed: false, followUpBlocked: false })).toBe(false)
expect(canProceedFromSchemeFeedback({ allDone: true, allParsed: true, followUpBlocked: true })).toBe(false)
expect(canProceedFromSchemeFeedback({ allDone: true, allParsed: true, followUpBlocked: false })).toBe(true)
```

- [ ] **Step 2: Run component helper test and verify it fails**

```powershell
npm test -- src/components/SchemeFeedback/SchemeFeedback.test.tsx
```

Expected: FAIL because `canProceedFromSchemeFeedback` does not exist.

- [ ] **Step 3: Add UI imports and proceed helper**

In `src/components/SchemeFeedback/SchemeFeedback.tsx`, use:

```ts
import { useEffect, useState } from 'react'
import { parseNorthSchemeInput, parseSchemeFollowUpInput } from '../../game/aiNativeEngine'
import { extractFinalQuestion, selectSchemeFollowUpCandidateId, shouldBlockSettlementForFollowUp } from '../../game/schemeFollowUp'
import { buildNpcFollowUpFinalPrompt, buildNpcPrompt, sanitizeNpcReplyText } from '../../ai/prompts'
```

Export:

```ts
export function canProceedFromSchemeFeedback(params: { allDone: boolean; allParsed: boolean; followUpBlocked: boolean }): boolean {
    return params.allDone && params.allParsed && !params.followUpBlocked
}
```

- [ ] **Step 4: Add local state and store actions**

Inside `SchemeFeedback`, destructure `setSchemeFollowUp`, `answerSchemeFollowUp`, and `skipSchemeFollowUp`. Add:

```ts
const [followUpDrafts, setFollowUpDrafts] = useState<Record<string, string>>({})
const [submittingFollowUpId, setSubmittingFollowUpId] = useState<string | null>(null)
const followUpBlocked = shouldBlockSettlementForFollowUp(currentSchemes, submittingFollowUpId !== null)
const canProceed = canProceedFromSchemeFeedback({ allDone, allParsed, followUpBlocked })
```

Use `disabled={!canProceed}` on the proceed button.

- [ ] **Step 5: Mark one feedback as follow-up candidate**

Refactor the initial `useEffect` to parse all current schemes first, select:

```ts
const candidateId = selectSchemeFollowUpCandidateId(validPlans.map(plan => plan.action))
```

When calling `buildNpcPrompt`, pass:

```ts
followUpMode: feedbackId === candidateId ? 'question_candidate' : 'none'
```

After the candidate reply is cleaned, call:

```ts
setSchemeFollowUp(feedbackId, {
    questionText: extractFinalQuestion(cleanedReply) ?? cleanedReply,
    status: 'available',
})
```

Keep existing local fallback behavior. If candidate generation fails, do not create a follow-up opportunity.

- [ ] **Step 6: Add submit and skip handlers**

Add `handleSkipFollowUp(actionId)` that calls `skipSchemeFollowUp(actionId)`. Add `handleSubmitFollowUp(actionId)` that:

```ts
const action = currentSchemes.find(item => item.id === actionId)
const targetNpc = action ? npcs.find(npc => npc.id === action.targetNpcId) : null
const playerReply = (followUpDrafts[actionId] ?? '').trim()
```

If action, target, original parse, follow-up, or reply is missing, return. Otherwise set `submittingFollowUpId`, call `parseSchemeFollowUpInput`, call `chatCompletion(buildNpcFollowUpFinalPrompt(...))`, then `answerSchemeFollowUp`. In `catch`, call `answerSchemeFollowUp` with all numeric deltas set to `0` and a short declarative fallback response. In `finally`, set `submittingFollowUpId` to `null`.

- [ ] **Step 7: Render controls and final reply**

After each feedback text, render:

```tsx
{action.followUp.status === 'answered' && <div className="follow-up-final"><span className="follow-up-label">Follow-up echo</span><p>{action.followUp.finalNpcReply}</p></div>}
{action.followUp.status === 'skipped' && <div className="follow-up-skipped">You hold your tongue; this scheme will settle from the original speech.</div>}
{action.followUp.status === 'available' && (
    <div className="follow-up-panel">
        <span className="follow-up-label">One reply available</span>
        <p className="follow-up-question">{action.followUp.questionText}</p>
        <textarea className="follow-up-input" value={draft} onChange={event => setFollowUpDrafts(previous => ({ ...previous, [fb.id]: event.target.value }))} disabled={submittingFollowUpId === fb.id} />
        <div className="follow-up-actions">
            <button className="btn-secondary" onClick={() => handleSkipFollowUp(fb.id)} disabled={submittingFollowUpId === fb.id}>Skip</button>
            <button className="btn-primary" onClick={() => handleSubmitFollowUp(fb.id)} disabled={!draft.trim() || submittingFollowUpId === fb.id}>{submittingFollowUpId === fb.id ? 'Thinking' : 'Reply'}</button>
        </div>
    </div>
)}
```

Actual player-facing labels should be localized back to Chinese in implementation.

- [ ] **Step 8: Add CSS**

In `src/components/SchemeFeedback/SchemeFeedback.css`, add `.follow-up-panel`, `.follow-up-final`, `.follow-up-skipped`, `.follow-up-label`, `.follow-up-question`, `.follow-up-input`, and `.follow-up-actions`. Use the existing gold-border glass style and mobile column stacking for `.follow-up-actions`.

- [ ] **Step 9: Verify and commit**

```powershell
npm test -- src/components/SchemeFeedback/SchemeFeedback.test.tsx
npm run build
git add src/components/SchemeFeedback/SchemeFeedback.tsx src/components/SchemeFeedback/SchemeFeedback.css src/components/SchemeFeedback/SchemeFeedback.test.tsx
git commit -m "feat: add scheme feedback follow-up UI"
```

Expected: tests and build pass before commit.

---

### Task 6: Full Verification And Manual Smoke

**Files:**
- No code files expected unless failures reveal a concrete bug.

- [ ] **Step 1: Run full automated verification**

```powershell
npm test
npm run build
```

Expected: all tests pass and build exits 0.

- [ ] **Step 2: Run local preview**

```powershell
npm run dev -- --host 0.0.0.0
```

Expected: Vite prints a local URL, usually `http://localhost:5173/` or another available port.

- [ ] **Step 3: Manual smoke checklist**

- Start a game and reach a scheme feedback page with 3 schemes.
- Exactly one feedback card shows the follow-up panel.
- Clicking skip removes the block and allows settlement.
- Answering the follow-up generates a final NPC response.
- The final NPC response is declarative and does not end with another question.
- Settlement stays disabled while the follow-up response is submitting.
- Settlement page still renders if DeepSeek fails and the local fallback is used.

- [ ] **Step 4: Inspect git status**

```powershell
git status --short
```

Expected: no unexpected files. Only intentional implementation files should be modified before any final commit.

---

## Self-Review Checklist

- Spec coverage: candidate selection, optional reply, skip path, final declarative NPC response, bounded parse deltas, settlement integration, save safety, fallback behavior, and UI blocking are all covered by tasks.
- No fourth scheme: follow-up state is stored inside `SchemeAction.followUp`; no task adds another item to `currentSchemes`.
- Bounded numbers: success delta, effect multiplier delta, and exposure delta are clamped in `normalizeSchemeFollowUpParse`.
- Failure mode: follow-up parse and final response failure call `answerSchemeFollowUp` with zero numeric delta and a local declarative fallback.
- Tests: each layer has a failing test before implementation and a targeted pass command before commit.
