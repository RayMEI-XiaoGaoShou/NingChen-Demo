# Narrative Causal Event Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make NPC actual actions explain visible numeric changes as concrete historical events, while keeping all numeric formulas internal and avoiding UI/UX or asset changes.

**Architecture:** Add a small causal-obligation layer that converts settled effects into narrative writing and validation requirements. Then make post-settlement outcomes such as borrowed-blade disposal and external warlord escalation feed back into `causalEvent`, so prompts, fallback text, chronicles, and memory all consume the same event facts.

**Tech Stack:** React + Vite + TypeScript, Vitest, existing AI prompt/orchestrator helpers, no live DeepSeek calls.

---

## Scope And Cut Line

This plan implements the current design document:

- `C:\Users\happyelements\Desktop\佞臣 Demo\叙事线与数值变化耦合性提升\叙事线与数值耦合后续优化设计_2026-04-29.md`

It does not change UI/UX, art, audio, or run live DeepSeek tests.

The recommended cut line for the first development pass is Tasks 1-4. Task 5 public world memory is valuable but touches more prompt entry points; keep it as a separate commit after Tasks 1-4 are green.

## File Structure

- Create `src/game/schemeNarrativeObligations.ts`
  - Builds per-dimension causal obligations from `SchemeResult` effects.
  - Validates action text for subject words, damage mechanism words, polarity conflicts, and vague action text.

- Test `src/game/schemeNarrativeObligations.test.ts`
  - Focused pure-function tests for finance/grain/governance obligations and external-action obligations.

- Modify `src/game/schemeCausalEvent.ts`
  - Add optional causal-obligation fields to `SchemeCausalEventDraft`.
  - Make `validateSchemeCausalEvent(...)` call the new obligation validator.

- Modify `src/game/schemeNpcAction.ts`
  - Use obligations when choosing fallback focus.
  - Make fallback text include at least one action, one instrument, and one damage mechanism.

- Modify `src/ai/prompts/schemeNpcAction.ts`
  - Inject “必须解释的维度” into the DS prompt.
  - Require one sentence for action and one clause for damage mechanism.

- Modify `src/ai/schemeNpcActionOrchestrator.ts`
  - Pass obligations and post-resolution event facts to prompt context.
  - Log detailed validation reasons, not only `sanitized_empty`.

- Create `src/game/schemePostResolutionEvent.ts`
  - Converts `BorrowedBladeReport` and `ExternalActionReport` into structured post-resolution events.
  - Attaches these events to `SchemeResult.causalEvent` without changing numeric fields.

- Test `src/game/schemePostResolutionEvent.test.ts`
  - Borrowed blade outcome patching.
  - External secession/rebellion outcome patching.
  - Numeric fields remain unchanged.

- Modify `src/game/roundSettlement.ts`
  - After `resolveCourtDispositionProxy(...)` and `resolveExternalAction(...)`, attach post-resolution event data to the matching current `SchemeResult`.

- Create `src/game/schemeSpecialActionProfile.ts`
  - Builds `frame/omen` action posture: target misstep, observer scope, damage mechanism, dimension obligations.

- Test `src/game/schemeSpecialActionProfile.test.ts`
  - Frame creates target-misstep + observer feedback.
  - Court omen creates name/legitimacy feedback.
  - External omen creates military/logistics feedback.

- Modify `src/game/npcMemoryLedger.ts`
  - Prefer causal/post-resolution event summaries for memory entries when present.

- Modify `src/game/settlementCausalNarrative.ts`
  - Prefer post-resolution event text for borrowed blade and external warlord chronology.

- Optional Phase 2 create `src/game/worldEventMemory.ts`
  - Derives scoped public world memories from `causalEvent`.

- Optional Phase 2 modify `src/game/types.ts`, `src/stores/gameStore.ts`, `src/ai/prompts/schemeNpcAction.ts`, `src/ai/prompts/fengDaozhi.ts`, `src/game/empressFeedbackContext.ts`
  - Store and consume `WorldEventMemory` only as prompt context and chronicle material.

---

### Task 1: Causal Obligation Core

**Files:**
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\schemeNarrativeObligations.ts`
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\schemeNarrativeObligations.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\schemeCausalEvent.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\schemeNpcAction.ts`

- [ ] **Step 1: Write failing tests for dimension obligations**

Add tests:

```ts
import { describe, expect, it } from 'vitest'
import {
    buildSchemeNarrativeObligations,
    validateNarrativeObligations,
} from './schemeNarrativeObligations'

describe('scheme narrative obligations', () => {
    it('requires damage mechanisms for grain finance and governance drops', () => {
        const obligations = buildSchemeNarrativeObligations({
            nationEffects: { grain: -0.2, finance: -0.1, governance: -0.1 },
            specialAction: null,
            schemeType: 'advise',
        })

        expect(obligations.map(item => item.dimension)).toEqual(['grain', 'finance', 'governance'])
        expect(validateNarrativeObligations('祖廷调取京畿三仓簿册，仓廪亏空露出，州县为补簿册停了转运，中书门下临时截住粮秣调度。', obligations).accepted).toBe(true)
        expect(validateNarrativeObligations('祖廷命人核验仓廪和户籍，再呈帘前定夺。', obligations).reasons).toContain('missing_damage_mechanism_grain')
    })

    it('rejects positive-polarity wording when a dimension is damaged', () => {
        const obligations = buildSchemeNarrativeObligations({
            nationEffects: { governance: -0.4 },
            specialAction: null,
            schemeType: 'frame',
        })

        expect(validateNarrativeObligations('宗艾急忙整顿案牍，使中枢调度更顺。', obligations).reasons).toContain('polarity_conflict_governance')
    })
})
```

- [ ] **Step 2: Run the new test to verify it fails**

Run:

```powershell
npm.cmd test -- src/game/schemeNarrativeObligations.test.ts
```

Expected: FAIL because `schemeNarrativeObligations.ts` does not exist.

- [ ] **Step 3: Implement obligation builder and validator**

Create `src/game/schemeNarrativeObligations.ts` with these exported interfaces and functions:

```ts
import type { NationDimensions, SchemeType } from './types'

export type NarrativeImpactDimension = keyof NationDimensions | 'loyalty' | 'special_action'

export interface SchemeNarrativeObligation {
    dimension: NarrativeImpactDimension
    direction: 'damage' | 'benefit'
    subjectLabel: string
    subjectKeywords: RegExp
    mechanismKeywords: RegExp
    polarityConflictKeywords: RegExp
    reasonCode: string
}

export function buildSchemeNarrativeObligations(input: {
    nationEffects: Partial<NationDimensions>
    specialAction: 'secession' | 'rebellion' | null
    schemeType: SchemeType
}): SchemeNarrativeObligation[] {
    const dimensions = (Object.keys(DIMENSION_RULES) as Array<keyof NationDimensions>)
        .filter(dimension => Boolean(input.nationEffects[dimension]))
        .sort((left, right) => Math.abs(input.nationEffects[right] ?? 0) - Math.abs(input.nationEffects[left] ?? 0))

    const obligations = dimensions.map(dimension => {
        const rule = DIMENSION_RULES[dimension]
        const direction = (input.nationEffects[dimension] ?? 0) < 0 ? 'damage' : 'benefit'
        return {
            dimension,
            direction,
            subjectLabel: rule.subjectLabel,
            subjectKeywords: rule.subjectKeywords,
            mechanismKeywords: direction === 'damage' ? rule.damageMechanismKeywords : rule.benefitMechanismKeywords,
            polarityConflictKeywords: direction === 'damage' ? rule.benefitMechanismKeywords : rule.damageMechanismKeywords,
            reasonCode: `missing_damage_mechanism_${dimension}`,
        }
    })

    if (input.specialAction === 'secession' || input.specialAction === 'rebellion') {
        obligations.unshift(EXTERNAL_ACTION_RULES[input.specialAction])
    }

    return dedupeByDimension(obligations).slice(0, 4)
}

export function validateNarrativeObligations(
    text: string,
    obligations: SchemeNarrativeObligation[],
): { accepted: boolean; reasons: string[] } {
    const normalized = text.replace(/\s+/g, '')
    const reasons: string[] = []

    if (!/[令命遣扣查调封截压收罢黜处决起兵平叛复核翻检]/u.test(normalized)) {
        reasons.push('vague_action')
    }

    for (const obligation of obligations.slice(0, 3)) {
        const hasSubject = obligation.subjectKeywords.test(normalized)
        const hasMechanism = obligation.mechanismKeywords.test(normalized)
        if (!hasSubject || !hasMechanism) reasons.push(obligation.reasonCode)
        if (obligation.polarityConflictKeywords.test(normalized)) {
            reasons.push(`polarity_conflict_${obligation.dimension}`)
        }
    }

    return { accepted: reasons.length === 0, reasons }
}

const DIMENSION_RULES = {
    finance: {
        subjectLabel: '财政/度支',
        subjectKeywords: /财政|度支|账|簿|库|钱|饷|支账|库藏/u,
        damageMechanismKeywords: /亏空|挪用|停拨|受阻|加派|露出|断档|追索|折损/u,
        benefitMechanismKeywords: /补足|归拢|疏通|整顿见效|拨付|充盈/u,
    },
    grain: {
        subjectLabel: '粮道/仓廪',
        subjectKeywords: /粮|仓|仓廪|粮道|转运|军粮|贡赋/u,
        damageMechanismKeywords: /迟滞|停转|截住|扣下|亏空|断粮|折损|受阻|拖慢/u,
        benefitMechanismKeywords: /转运顺畅|补足|疏通|开仓|续上/u,
    },
    military: {
        subjectLabel: '军府/军需',
        subjectKeywords: /军|兵|兵械|军需|部曲|监军|军令|关隘|骑/u,
        damageMechanismKeywords: /迟滞|扣押|短缺|掣肘|折损|改道|空虚|受阻|被剿/u,
        benefitMechanismKeywords: /整军|补械|集结|稳住|增援|军令更顺/u,
    },
    socialOrder: {
        subjectLabel: '州县/民间秩序',
        subjectKeywords: /民|州县|地方|流言|风声|官民|军心|驿路/u,
        damageMechanismKeywords: /扰动|不安|坐大|逃避|震动|摇动|哗然|失序/u,
        benefitMechanismKeywords: /安定|压住|平息|归附|稳住/u,
    },
    governance: {
        subjectLabel: '中枢/文书/权责',
        subjectKeywords: /诏|中枢|案牍|文书|权责|调度|州县|御史|尚书|中书/u,
        damageMechanismKeywords: /不通|壅塞|截权|推诿|重叠|断档|迟滞|掣肘|停摆/u,
        benefitMechanismKeywords: /更顺|疏通|归拢|整顿见效|厘清|收束/u,
    },
} satisfies Record<keyof NationDimensions, {
    subjectLabel: string
    subjectKeywords: RegExp
    damageMechanismKeywords: RegExp
    benefitMechanismKeywords: RegExp
}>

const EXTERNAL_ACTION_RULES: Record<'secession' | 'rebellion', SchemeNarrativeObligation> = {
    secession: {
        dimension: 'special_action',
        direction: 'damage',
        subjectLabel: '割据自保',
        subjectKeywords: /贡赋|军府|属官|关津|调令|税粮|州郡/u,
        mechanismKeywords: /扣留|延迟|另造|私署|封锁|不奉|迟滞/u,
        polarityConflictKeywords: /公开称帝|彻底反周/u,
        reasonCode: 'missing_damage_mechanism_secession',
    },
    rebellion: {
        dimension: 'special_action',
        direction: 'damage',
        subjectLabel: '举兵平叛',
        subjectKeywords: /朝使|驿路|起兵|关隘|平叛|监军|兵粮/u,
        mechanismKeywords: /扣押|截断|发檄|击退|被剿|折损|抽调|震动/u,
        polarityConflictKeywords: /略有离心|暂观朝局/u,
        reasonCode: 'missing_damage_mechanism_rebellion',
    },
}

function dedupeByDimension(items: SchemeNarrativeObligation[]): SchemeNarrativeObligation[] {
    const seen = new Set<NarrativeImpactDimension>()
    return items.filter(item => {
        if (seen.has(item.dimension)) return false
        seen.add(item.dimension)
        return true
    })
}
```

- [ ] **Step 4: Wire obligations into causal event validation**

Modify `src/game/schemeCausalEvent.ts`:

```ts
import {
    buildSchemeNarrativeObligations,
    validateNarrativeObligations,
    type SchemeNarrativeObligation,
} from './schemeNarrativeObligations'
```

Add to `SchemeCausalEventDraft`:

```ts
    narrativeObligations?: SchemeNarrativeObligation[]
```

In `buildSchemeCausalEventDraft(...)`, set:

```ts
        narrativeObligations: buildSchemeNarrativeObligations({
            nationEffects: Object.fromEntries(
                input.impactTrace.nationImpactSources.map(item => [item.dimension, item.value]),
            ) as Partial<NationDimensions>,
            specialAction: input.action.schemeType === 'secession' || input.action.schemeType === 'rebellion'
                ? input.action.schemeType
                : null,
            schemeType: input.action.schemeType,
        }),
```

In `validateSchemeCausalEvent(...)`, after existing checks:

```ts
    const obligationValidation = validateNarrativeObligations(event.motionText, event.narrativeObligations ?? [])
    reasons.push(...obligationValidation.reasons)
```

- [ ] **Step 5: Run tests**

Run:

```powershell
npm.cmd test -- src/game/schemeNarrativeObligations.test.ts src/game/schemeNpcAction.test.ts src/game/settlementCausalNarrative.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/game/schemeNarrativeObligations.ts src/game/schemeNarrativeObligations.test.ts src/game/schemeCausalEvent.ts src/game/schemeNpcAction.ts
git commit -m "feat: add scheme narrative obligation validation"
```

---

### Task 2: Prompt And Fallback Use Obligations

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\ai\prompts\schemeNpcAction.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\ai\schemeNpcActionOrchestrator.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\ai\prompts.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\schemeNpcAction.test.ts`

- [ ] **Step 1: Add prompt tests**

Add tests in `src/ai/prompts.test.ts`:

```ts
it('injects narrative obligations into scheme npc action prompt', () => {
    const prompt = joinPrompt(buildSchemeNpcActionPrompt({
        npc: baseNpc,
        action: { schemeType: 'advise', playerSpeech: '借京畿三仓旧账压祖廷' },
        effectSummary: '北周粮赋-0.2；北周财政-0.1；北周治理穿透力-0.1',
        fallbackText: '祖廷调取账册。',
        narrativeObligations: [
            { dimension: 'grain', subjectLabel: '粮道/仓廪', direction: 'damage', reasonCode: 'missing_damage_mechanism_grain' },
            { dimension: 'finance', subjectLabel: '财政/度支', direction: 'damage', reasonCode: 'missing_damage_mechanism_finance' },
        ] as any,
    }))

    expect(prompt).toContain('必须解释的数值因果')
    expect(prompt).toContain('粮道/仓廪')
    expect(prompt).toContain('财政/度支')
    expect(prompt).toContain('动作 + 受损介质 + 损失机制')
})
```

- [ ] **Step 2: Run prompt test to verify it fails**

```powershell
npm.cmd test -- src/ai/prompts.test.ts -t "narrative obligations"
```

Expected: FAIL because `buildSchemeNpcActionPrompt` does not accept `narrativeObligations`.

- [ ] **Step 3: Extend prompt interface**

In `src/ai/prompts/schemeNpcAction.ts`, import:

```ts
import type { SchemeNarrativeObligation } from '../../game/schemeNarrativeObligations'
```

Add optional parameter:

```ts
    narrativeObligations?: Array<Pick<SchemeNarrativeObligation, 'dimension' | 'direction' | 'subjectLabel' | 'reasonCode'>>
```

Build text:

```ts
    const obligationLine = params.narrativeObligations?.length
        ? params.narrativeObligations
            .map(item => `- ${item.subjectLabel}：${item.direction === 'damage' ? '必须写出为何受损/阻滞/折损' : '必须写出为何改善/归拢/疏通'}`)
            .join('\n')
        : '- 无额外因果义务'
```

Add to user prompt:

```text
必须解释的数值因果：
${obligationLine}
写作硬规则：必须包含“动作 + 受损介质 + 损失机制”。如果数值下降，不得写成整顿见效、粮道畅通、政令更顺。
```

- [ ] **Step 4: Pass obligations from orchestrator**

In `src/ai/schemeNpcActionOrchestrator.ts`, pass:

```ts
            narrativeObligations: task.result.causalEvent?.narrativeObligations ?? [],
```

Also change invalid diagnostic:

```ts
            fallbackReason: 'validation_failed',
```

Keep `errorMessage` as joined validation reasons.

- [ ] **Step 5: Strengthen fallback tests**

In `src/game/schemeNpcAction.test.ts`, add:

```ts
it('fallback explains why grain finance and governance are damaged', () => {
    const narrative = buildSchemeNpcActionNarrative({
        action: { targetNpcId: 'zuting', schemeType: 'advise', playerSpeech: '查三仓旧账' },
        targetNpc: zuting,
        relatedNpc: null,
        result: makeResult({
            nationEffects: { grain: -0.2, finance: -0.1, governance: -0.1 },
            causalEvent: null,
        }),
    })

    expect(narrative?.text).toMatch(/粮|仓|仓廪|粮道|转运/u)
    expect(narrative?.text).toMatch(/亏空|迟滞|停转|断档|受阻|截住/u)
})
```

- [ ] **Step 6: Run focused tests**

```powershell
npm.cmd test -- src/ai/prompts.test.ts src/ai/schemeNpcActionOrchestrator.test.ts src/game/schemeNpcAction.test.ts src/game/schemeNarrativeObligations.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/ai/prompts/schemeNpcAction.ts src/ai/schemeNpcActionOrchestrator.ts src/ai/prompts.test.ts src/game/schemeNpcAction.test.ts
git commit -m "feat: make npc action prompts explain causal damage"
```

---

### Task 3: Post-Resolution Events For Borrowed Blade And External Warlords

**Files:**
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\schemePostResolutionEvent.ts`
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\schemePostResolutionEvent.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\schemeCausalEvent.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\roundSettlement.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\roundSettlement.test.ts`

- [ ] **Step 1: Write tests for patching causal events without changing numbers**

Add `src/game/schemePostResolutionEvent.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { attachBorrowedBladePostResolution, attachExternalActionPostResolution } from './schemePostResolutionEvent'
import type { SchemeResult } from './schemeEngine'

const baseResult = {
    trustChange: 0,
    relatedTrustChange: 0,
    northDimensionChanges: { finance: -1 },
    feedbackText: '',
    success: true,
    personEffects: { trustDelta: 0, relatedTrustDelta: 0, loyaltyDelta: 0, relatedLoyaltyDelta: 0, militaryPowerDelta: 0, relatedMilitaryPowerDelta: 0, alignmentShift: null, intelDelta: 0, externalStatus: null },
    factionEffects: {},
    nationEffects: { finance: -1 },
    specialAction: null,
    northParse: {} as any,
    delayedBacklash: [],
    npcAction: { text: '宗艾压向祖廷。', source: 'fallback' },
    causalEvent: {
        actionId: 'a1',
        actorNpcId: 'zongai',
        actorNpcName: '宗艾',
        relatedNpcId: 'zuting',
        relatedNpcName: '祖廷',
        schemeType: 'proxy',
        success: true,
        motionText: '宗艾压向祖廷。',
        motionSource: 'fallback',
        primaryDimensions: ['finance'],
        secondaryDimensions: [],
        effectSummary: ['北周财政-1'],
    },
} satisfies SchemeResult

describe('scheme post resolution events', () => {
    it('attaches borrowed blade outcome without changing numeric effects', () => {
        const patched = attachBorrowedBladePostResolution(baseResult, {
            actorNpcId: 'zongai',
            actorNpcName: '宗艾',
            targetNpcId: 'zuting',
            targetNpcName: '祖廷',
            outcome: 'executed',
            summary: '宗艾借势落下最后一手，祖廷已被朝廷处决。',
        })

        expect(patched.nationEffects).toEqual(baseResult.nationEffects)
        expect(patched.causalEvent?.postResolutionEvent?.kind).toBe('borrowed_blade')
        expect(patched.causalEvent?.motionText).toContain('处决')
    })

    it('attaches external action outcome without changing numeric effects', () => {
        const patched = attachExternalActionPostResolution(
            { ...baseResult, specialAction: 'rebellion', causalEvent: { ...baseResult.causalEvent!, schemeType: 'rebellion' } },
            {
                npcId: 'ansiming',
                npcName: '安思明',
                action: 'rebellion',
                outcome: '安思明起兵旋即为平叛军所剿，虽未坐大，却已逼北周为此折损兵粮。',
                nationEffects: { military: -3, grain: -2 },
            },
        )

        expect(patched.specialAction).toBe('rebellion')
        expect(patched.causalEvent?.postResolutionEvent?.kind).toBe('external_action')
        expect(patched.causalEvent?.motionText).toContain('折损兵粮')
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
npm.cmd test -- src/game/schemePostResolutionEvent.test.ts
```

Expected: FAIL because helper file does not exist.

- [ ] **Step 3: Add post-resolution event types**

In `src/game/schemeCausalEvent.ts`, add:

```ts
export interface SchemePostResolutionEvent {
    kind: 'borrowed_blade' | 'external_action'
    outcome: string
    summary: string
    actionMechanism: string[]
    counterAction: string[]
    damageMechanism: string[]
}
```

Add to `SchemeCausalEventDraft`:

```ts
    postResolutionEvent?: SchemePostResolutionEvent | null
```

- [ ] **Step 4: Implement patch helpers**

Create `src/game/schemePostResolutionEvent.ts`:

```ts
import type { SchemeResult } from './schemeEngine'
import type { BorrowedBladeReport } from './types'
import type { ExternalActionReport } from './externalActionResolution'

export function attachBorrowedBladePostResolution(result: SchemeResult, report: BorrowedBladeReport): SchemeResult {
    if (!result.causalEvent) return result
    const event = {
        kind: 'borrowed_blade' as const,
        outcome: report.outcome,
        summary: report.summary,
        actionMechanism: report.outcome === 'executed' ? ['处决', '收网'] : report.outcome === 'dismissed' ? ['罢黜', '收权'] : ['施压'],
        counterAction: ['御前/帘前处置'],
        damageMechanism: report.outcome === 'pressure' ? ['两边庇护尚未同时崩塌'] : ['职权断档', '派系震动', '政务受阻'],
    }
    const motionText = `${report.summary}${event.damageMechanism.includes('职权断档') ? '其旧属与案牍随之断档，相关权责一时难以接续。' : ''}`
    return {
        ...result,
        npcAction: result.npcAction ? { ...result.npcAction, text: motionText } : result.npcAction,
        causalEvent: {
            ...result.causalEvent,
            motionText,
            postResolutionEvent: event,
        },
    }
}

export function attachExternalActionPostResolution(result: SchemeResult, report: ExternalActionReport): SchemeResult {
    if (!result.causalEvent) return result
    const actionMechanism = report.action === 'secession'
        ? ['扣留贡赋', '另设调度', '拖延调令']
        : ['起兵', '截断驿路', '平叛折损']
    const damageMechanism = report.action === 'secession'
        ? ['贡赋迟滞', '中枢调度不通', '州郡自雄']
        : ['兵粮折损', '州县震动', '军令改道']
    const motionText = `${report.outcome}${damageMechanism.join('、')}，使北周相关调度受损。`
    return {
        ...result,
        npcAction: result.npcAction ? { ...result.npcAction, text: motionText } : result.npcAction,
        causalEvent: {
            ...result.causalEvent,
            motionText,
            postResolutionEvent: {
                kind: 'external_action',
                outcome: report.action,
                summary: report.outcome,
                actionMechanism,
                counterAction: report.action === 'rebellion' ? ['调兵平叛'] : ['追索税粮'],
                damageMechanism,
            },
        },
    }
}
```

- [ ] **Step 5: Patch round settlement at post-resolution points**

In `src/game/roundSettlement.ts`, import:

```ts
import { attachBorrowedBladePostResolution, attachExternalActionPostResolution } from './schemePostResolutionEvent'
```

After pushing a `borrowedBladeReports` item, replace the current result:

```ts
                schemeResults[schemeResults.length - 1] = attachBorrowedBladePostResolution(
                    schemeResults[schemeResults.length - 1],
                    borrowedBladeReports[borrowedBladeReports.length - 1],
                )
```

After pushing an `externalActionReports` item:

```ts
                schemeResults[schemeResults.length - 1] = attachExternalActionPostResolution(
                    schemeResults[schemeResults.length - 1],
                    report.report,
                )
```

- [ ] **Step 6: Add round settlement regression tests**

Add or extend tests in `src/game/roundSettlement.test.ts`:

```ts
expect(result.borrowedBladeReports?.[0]?.outcome).toBe('executed')
expect(result.schemeResults[0]?.causalEvent?.postResolutionEvent?.kind).toBe('borrowed_blade')
expect(result.schemeResults[0]?.causalEvent?.motionText).toContain('处决')
```

For external action:

```ts
expect(result.externalActionReports?.[0]?.action).toBe('rebellion')
expect(result.schemeResults[0]?.causalEvent?.postResolutionEvent?.kind).toBe('external_action')
expect(result.schemeResults[0]?.causalEvent?.motionText).toMatch(/兵粮|平叛|起兵|折损/u)
```

- [ ] **Step 7: Run focused tests**

```powershell
npm.cmd test -- src/game/schemePostResolutionEvent.test.ts src/game/roundSettlement.test.ts src/game/settlementCausalNarrative.test.ts src/game/npcMemoryLedger.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add src/game/schemePostResolutionEvent.ts src/game/schemePostResolutionEvent.test.ts src/game/schemeCausalEvent.ts src/game/roundSettlement.ts src/game/roundSettlement.test.ts
git commit -m "feat: attach post-resolution scheme events"
```

---

### Task 4: Frame And Omen Special Action Profile

**Files:**
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\schemeSpecialActionProfile.ts`
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\schemeSpecialActionProfile.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\schemeNpcAction.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\ai\prompts\schemeNpcAction.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\ai\prompts.test.ts`

- [ ] **Step 1: Write profile tests**

Add `src/game/schemeSpecialActionProfile.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { deriveSpecialSchemeActionProfile } from './schemeSpecialActionProfile'

describe('special scheme action profile', () => {
    it('turns frame into target misstep plus observer feedback', () => {
        const profile = deriveSpecialSchemeActionProfile({
            schemeType: 'frame',
            targetNpc: { name: '宗艾', powerBase: 'court', factionId: 'emperor', title: '中常侍' } as any,
            parse: { selfTrapPotential: 0.8, scapegoatClarity: 0.7, governanceRelevance: 0.8, socialOrderRelevance: 0.6 } as any,
        })

        expect(profile?.targetMisstep).toMatch(/急辩|切割|扣人|压人|封口/u)
        expect(profile?.observerScope).toMatch(/御前|帝党|中枢法司|北周朝堂/u)
        expect(profile?.damageMechanism).toMatch(/案牍|风声|权责|推诿|壅塞/u)
    })

    it('turns external omen into logistics or monitoring pressure', () => {
        const profile = deriveSpecialSchemeActionProfile({
            schemeType: 'omen',
            targetNpc: { name: '安思明', powerBase: 'external', title: '卢龙节度', factionId: null } as any,
            parse: { omenPolarity: 'destabilizing', centralSanctionLeverage: 0.8, grainRelevance: 0.7, militaryRelevance: 0.8 } as any,
        })

        expect(profile?.observerScope).toMatch(/中枢|御史|监军/u)
        expect(profile?.damageMechanism).toMatch(/粮道|军需|监军|转运/u)
    })
})
```

- [ ] **Step 2: Run profile tests to verify failure**

```powershell
npm.cmd test -- src/game/schemeSpecialActionProfile.test.ts
```

Expected: FAIL because helper does not exist.

- [ ] **Step 3: Implement helper**

Create `src/game/schemeSpecialActionProfile.ts`:

```ts
import type { NPC, NorthSchemeParseResult, SchemeType } from './types'

export interface SpecialSchemeActionProfile {
    targetMisstep: string
    observerScope: string
    damageMechanism: string
    promptLine: string
}

export function deriveSpecialSchemeActionProfile(input: {
    schemeType: SchemeType
    targetNpc: NPC
    parse: NorthSchemeParseResult
}): SpecialSchemeActionProfile | null {
    if (input.schemeType === 'frame') {
        const observerScope = input.targetNpc.factionId === 'emperor'
            ? '御前与帝党众人'
            : input.targetNpc.factionId === 'empress'
                ? '帘前与后党众人'
                : '北周朝堂'
        const targetMisstep = (input.parse.selfTrapPotential ?? 0) >= 0.72
            ? '急于自辩并切割身边案牍'
            : '仓促压住口风'
        const damageMechanism = Math.max(input.parse.governanceRelevance, input.parse.socialOrderRelevance) >= 0.6
            ? '案牍壅塞、风声坐大，州县与中枢权责随之推诿'
            : '旧案被重新翻检，朝中疑心被坐实'
        return {
            targetMisstep,
            observerScope,
            damageMechanism,
            promptLine: `设局嫁祸落地链：目标先${targetMisstep}；${observerScope}随后借此追看；损失机制是${damageMechanism}。`,
        }
    }

    if (input.schemeType === 'omen') {
        const external = input.targetNpc.powerBase === 'external'
        const observerScope = external ? '中枢、御史与监军' : '御前、帘前与朝堂公议'
        const targetMisstep = external ? '先封口压谣又急调亲兵守仓' : '急令压住谶纬风声并自证名分'
        const damageMechanism = external
            ? '粮道、军需与监军压力拖慢转运'
            : '名分疑云坐大，案牍与权责被迫复核'
        return {
            targetMisstep,
            observerScope,
            damageMechanism,
            promptLine: `谶纬落地链：目标${targetMisstep}；${observerScope}随即反馈；损失机制是${damageMechanism}。`,
        }
    }

    return null
}
```

- [ ] **Step 4: Use profile in fallback and prompt context**

In `src/game/schemeNpcAction.ts`, for `frame` and `omen`, use the profile before generic fallback text:

```ts
const specialProfile = deriveSpecialSchemeActionProfile({
    schemeType: action.schemeType,
    targetNpc,
    parse: action.northParse ?? input.result.northParse,
})
if (specialProfile && (action.schemeType === 'frame' || action.schemeType === 'omen')) {
    return `${actorName}${specialProfile.targetMisstep}；${specialProfile.observerScope}借此追看，${specialProfile.damageMechanism}。`
}
```

If `action.northParse` is not available in this function, pass `northParse` through the `VisibleImpactResult` type from `SchemeResult`.

- [ ] **Step 5: Add prompt guidance**

In `src/ai/prompts/schemeNpcAction.ts`, include a context line when `schemeType` is `frame` or `omen`:

```text
设局嫁祸/谶纬特殊要求：不要写成“通过 A 打 B”。必须写目标自己的不合适举措，以及北周朝堂/御前/帘前/御史/军府如何反馈。
```

- [ ] **Step 6: Run tests**

```powershell
npm.cmd test -- src/game/schemeSpecialActionProfile.test.ts src/game/schemeNpcAction.test.ts src/ai/prompts.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/game/schemeSpecialActionProfile.ts src/game/schemeSpecialActionProfile.test.ts src/game/schemeNpcAction.ts src/ai/prompts/schemeNpcAction.ts src/ai/prompts.test.ts
git commit -m "feat: specialize frame and omen npc actions"
```

---

### Task 5: Public World Memory Seed Layer

**Files:**
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\worldEventMemory.ts`
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\worldEventMemory.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\types.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\npcMemoryLedger.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\settlementCausalNarrative.ts`

- [ ] **Step 1: Write world memory tests**

Add `src/game/worldEventMemory.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { deriveWorldEventMemories } from './worldEventMemory'

describe('world event memory', () => {
    it('derives scoped memories without leaking the southern identity', () => {
        const memories = deriveWorldEventMemories({
            round: 6,
            event: {
                actionId: 'a1',
                actorNpcId: 'zuting',
                actorNpcName: '祖廷',
                schemeType: 'advise',
                success: true,
                motionText: '祖廷翻检三仓旧账，仓廪亏空露出，州县转运迟滞。',
                motionSource: 'fallback',
                primaryDimensions: ['grain', 'finance'],
                secondaryDimensions: ['governance'],
                effectSummary: ['北周粮赋-0.2', '北周财政-0.1'],
            } as any,
        })

        expect(memories.some(item => item.scope === 'court_public')).toBe(true)
        expect(memories.some(item => item.scope === 'chronicle_fact')).toBe(true)
        expect(memories.map(item => item.summary).join('')).not.toMatch(/南陈暗线|南陈内应/u)
    })
})
```

- [ ] **Step 2: Run test to verify failure**

```powershell
npm.cmd test -- src/game/worldEventMemory.test.ts
```

Expected: FAIL because helper does not exist.

- [ ] **Step 3: Add types**

In `src/game/types.ts`, add:

```ts
export type WorldMemoryScope = 'court_public' | 'faction_private' | 'local_rumor' | 'south_intel' | 'chronicle_fact'

export interface WorldEventMemory {
    sourceRound: number
    actionId?: string
    scope: WorldMemoryScope
    visibility: 'public' | 'limited' | 'secret'
    involvedNpcIds: string[]
    affectedFactionIds: CourtFactionId[]
    dimensions: Array<keyof NationDimensions>
    summary: string
    reliability: number
    secrecyRisk: number
    tags: string[]
}
```

- [ ] **Step 4: Implement memory derivation**

Create `src/game/worldEventMemory.ts`:

```ts
import type { SchemeCausalEventDraft } from './schemeCausalEvent'
import type { WorldEventMemory } from './types'

export function deriveWorldEventMemories(input: {
    round: number
    event: SchemeCausalEventDraft
}): WorldEventMemory[] {
    const involvedNpcIds = [input.event.actorNpcId, input.event.relatedNpcId].filter(Boolean) as string[]
    const dimensions = [...input.event.primaryDimensions, ...input.event.secondaryDimensions]
    const cleanSummary = input.event.motionText.replace(/南陈暗线|南陈内应|萧宝颖.*南陈/u, '暗线')
    const base = {
        sourceRound: input.round,
        actionId: input.event.actionId,
        involvedNpcIds,
        affectedFactionIds: [],
        dimensions,
        reliability: 0.78,
        secrecyRisk: 0.12,
        tags: [input.event.schemeType],
    }
    return [
        { ...base, scope: 'chronicle_fact', visibility: 'public', summary: cleanSummary },
        { ...base, scope: 'court_public', visibility: 'public', summary: cleanSummary },
        { ...base, scope: 'south_intel', visibility: 'secret', reliability: 0.62, secrecyRisk: 0.28, summary: cleanSummary },
    ]
}
```

- [ ] **Step 5: Use memory as derived material without changing next-round scripts**

Do not alter fixed round event presets. Use memories only where a current function already accepts narrative material:

- In `npcMemoryLedger.ts`, when causal event exists, use `causalEvent.motionText` or `postResolutionEvent.summary`.
- In `settlementCausalNarrative.ts`, when selecting chronicle materials, prefer memories with `scope === 'chronicle_fact'`.

- [ ] **Step 6: Run tests**

```powershell
npm.cmd test -- src/game/worldEventMemory.test.ts src/game/npcMemoryLedger.test.ts src/game/settlementCausalNarrative.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/game/worldEventMemory.ts src/game/worldEventMemory.test.ts src/game/types.ts src/game/npcMemoryLedger.ts src/game/settlementCausalNarrative.ts
git commit -m "feat: derive public world memories from causal events"
```

---

## Final Verification

- [ ] Run directed tests:

```powershell
npm.cmd test -- src/game/schemeNarrativeObligations.test.ts src/game/schemePostResolutionEvent.test.ts src/game/schemeSpecialActionProfile.test.ts src/game/worldEventMemory.test.ts src/game/schemeNpcAction.test.ts src/game/roundSettlement.test.ts src/game/settlementCausalNarrative.test.ts src/ai/prompts.test.ts src/ai/schemeNpcActionOrchestrator.test.ts
```

Expected: PASS.

- [ ] Run build:

```powershell
npm.cmd run build
```

Expected: PASS.

- [ ] Run full test suite:

```powershell
npm.cmd test
```

Expected: PASS.

- [ ] Check diff hygiene:

```powershell
git diff --check
```

Expected: exit code 0, with no whitespace errors. Existing CRLF warnings can be noted if they appear without whitespace errors.

## Self-Review Notes

- Spec coverage:
  - Numeric-event reasonableness: Tasks 1-2.
  - Borrowed blade outcome awareness: Task 3.
  - Secession/rebellion outcome awareness: Task 3.
  - Frame/omen target misstep plus observer feedback: Task 4.
  - Public world memory: Task 5.
  - Player-facing formula opacity: preserved; obligations are prompt/validation internals.

- Risk controls:
  - All new fields are optional on `causalEvent`.
  - No required save schema migration.
  - AI text still cannot alter numeric fields.
  - No UI/UX or asset files touched.
  - No live DeepSeek test required.
