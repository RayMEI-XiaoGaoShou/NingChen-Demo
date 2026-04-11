# Support Systems Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deepen policy gameplay, improve historical comprehension and onboarding, add faction-collapse soft consequences, enable save/resume, and ship a usable battle-report layer without breaking the current round loop.

**Architecture:** Keep `roundSettlement.ts` as the authoritative aggregation point and layer new behavior beside it rather than rewriting the state machine. Persist long-lived state in the Zustand store, derive presentation-oriented summaries in focused helper engines, and keep onboarding/history UI additive so the current playable loop remains intact.

**Tech Stack:** TypeScript, React, Zustand, Vitest, localStorage, Markdown docs

---

### Task 1: Extend Policy Data And Failing Tests

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\types.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\data\policyQuestions.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\nationEngine.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\nationEngine.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it('applies aiScoringFocus-specific bonuses to policy reasons', () => {
  const result = calculatePolicyEffect(
    { governance: 2, socialOrder: 1.5 },
    '先清查州县仓簿，再分两月推行新令，以免豪强立刻反弹。',
    {
      legitimacyEffect: 'up',
      aiScoringFocus: 'execution_path',
    },
  )

  expect((result.governance ?? 0)).toBeGreaterThan(2)
})

it('creates a delayed aftereffect descriptor from legitimacy and next-round feedback', () => {
  const effect = buildPolicyAftereffect({
    topic: '整饬盐政',
    legitimacyEffect: 'down',
    nextRoundFeedback: '地方豪强推诿执行，盐课入库慢于预期。',
    appliedEffects: { finance: 2.2, governance: 1.1 },
  })

  expect(effect.summary).toContain('地方豪强')
  expect(effect.tone).toBe('strained')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/game/nationEngine.test.ts`
Expected: FAIL because `calculatePolicyEffect` does not accept policy metadata and `buildPolicyAftereffect` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export interface PolicyResolutionMeta {
  legitimacyEffect?: 'up' | 'down' | 'steady'
  aiScoringFocus?: 'execution_path' | 'tradeoff' | 'timing' | 'local_resistance' | 'fiscal_capacity' | 'military_coordination'
}

export interface PolicyAftereffect {
  summary: string
  tone: 'steady' | 'favorable' | 'strained'
  followupEffects: Partial<NationDimensions>
}

export function calculatePolicyEffect(
  optionEffects: Partial<NationDimensions>,
  reasonText: string,
  meta: PolicyResolutionMeta = {},
): Partial<NationDimensions> {
  const focusBonus = calculatePolicyFocusBonus(meta.aiScoringFocus, reasonText)
  const legitimacyModifier =
    meta.legitimacyEffect === 'up' ? 1.08 :
    meta.legitimacyEffect === 'down' ? 0.94 : 1

  const baseModifier = calculateReasonModifier(optionEffects, reasonText)
  const result: Partial<NationDimensions> = {}

  for (const [key, value] of Object.entries(optionEffects)) {
    if (value === undefined) continue
    result[key as keyof NationDimensions] = Math.round(value * baseModifier * legitimacyModifier * focusBonus * 10) / 10
  }

  return result
}

export function buildPolicyAftereffect(input: {
  topic: string
  legitimacyEffect?: 'up' | 'down' | 'steady'
  nextRoundFeedback?: string
  appliedEffects: Partial<NationDimensions>
}): PolicyAftereffect {
  const tone =
    input.legitimacyEffect === 'up' ? 'favorable' :
    input.legitimacyEffect === 'down' ? 'strained' :
    'steady'

  return {
    summary: input.nextRoundFeedback?.trim() || `${input.topic}的后效仍在发酵。`,
    tone,
    followupEffects:
      tone === 'favorable'
        ? { governance: 0.4, socialOrder: 0.3 }
        : tone === 'strained'
          ? { governance: -0.4, socialOrder: -0.3 }
          : {},
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- src/game/nationEngine.test.ts`
Expected: PASS

---

### Task 2: Wire Deep Policy Resolution Into Round Settlement

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\roundSettlement.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\roundSettlement.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\data\policyQuestions.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it('stores same-round policy resolution metadata and next-round aftereffect', () => {
  const result = settleRound({
    round: 2,
    schemes: [],
    northStats: { ...NORTH_INITIAL },
    southStats: { ...SOUTH_INITIAL },
    npcs: INITIAL_NPCS.map(npc => ({ ...npc })),
    factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
    relationships: INITIAL_RELATIONSHIP_EDGES.map(edge => ({ ...edge })),
    intelProgress: {},
    policyOptionIndex: 0,
    policyReason: '先清查转运，再分批推行，以免州县立刻生乱。',
  })

  expect(result.policyReport?.focusHit).toBe(true)
  expect(result.policyAftereffect?.summary).toBeTruthy()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/game/roundSettlement.test.ts`
Expected: FAIL because `policyAftereffect` and `focusHit` are missing from settlement output.

- [ ] **Step 3: Write minimal implementation**

```ts
export interface PolicySettlementReport {
  // existing fields
  legitimacyEffect?: 'up' | 'down' | 'steady'
  aiScoringFocus?: string
  focusHit: boolean
}

export interface RoundSettlementResult {
  // existing fields
  policyAftereffect: PolicyAftereffect | null
}

const policyEffect = calculatePolicyEffect(option.effects, policyReason, {
  legitimacyEffect: option.legitimacyEffect,
  aiScoringFocus: question.aiScoringFocus,
})

policyReport = {
  sourceRound: round,
  topic: question.topic,
  optionLabel: option.label,
  optionContent: option.content,
  reason: policyReason,
  effects: policyEffect,
  effectSummary: summarizeDimensions(policyEffect),
  legitimacyEffect: option.legitimacyEffect,
  aiScoringFocus: question.aiScoringFocus,
  focusHit: didReasonHitFocus(question.aiScoringFocus, policyReason),
}

policyAftereffect = buildPolicyAftereffect({
  topic: question.topic,
  legitimacyEffect: option.legitimacyEffect,
  nextRoundFeedback: question.nextRoundFeedback,
  appliedEffects: policyEffect,
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- src/game/roundSettlement.test.ts`
Expected: PASS

---

### Task 3: Persist Policy Momentum And Show Delayed Feedback

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\stores\gameStore.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\stores\gameStore.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\RoundStart\RoundStart.tsx`

- [ ] **Step 1: Write the failing tests**

```ts
it('carries policy aftereffect into the next round start state', () => {
  useGameStore.setState({
    currentRound: 2,
    currentPhase: 'SCHEME_FEEDBACK',
    selectedPolicyOption: 0,
    policyReason: '先稳地方，再推新令。',
  })

  useGameStore.getState().nextPhase()
  useGameStore.getState().nextPhase()
  useGameStore.getState().nextPhase()

  expect(useGameStore.getState().lastPolicyAftereffect).toBeTruthy()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/stores/gameStore.test.ts`
Expected: FAIL because store does not persist delayed policy aftereffects.

- [ ] **Step 3: Write minimal implementation**

```ts
interface GameState {
  // existing fields
  lastPolicyAftereffect: PolicyAftereffect | null
}

set({
  lastSettlement: result,
  lastPolicyReport: result.policyReport ?? s.lastPolicyReport,
  lastPolicyAftereffect: result.policyAftereffect ?? s.lastPolicyAftereffect,
})
```

And in `RoundStart.tsx` render:

```tsx
{lastPolicyAftereffect && (
  <div className={`round-policy-followup tone-${lastPolicyAftereffect.tone}`}>
    <h3>南陈政务跟进</h3>
    <p>{lastPolicyAftereffect.summary}</p>
  </div>
)}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- src/stores/gameStore.test.ts`
Expected: PASS

---

### Task 4: Add Faction Collapse Reports To Settlement

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\types.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\roundSettlement.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\roundSettlement.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\nationEngine.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it('adds collapse reports when a faction crosses soft-collapse thresholds', () => {
  const result = settleRound({
    round: 19,
    schemes: [],
    northStats: { ...NORTH_INITIAL },
    southStats: { ...SOUTH_INITIAL },
    npcs: INITIAL_NPCS.map(npc => ({ ...npc })),
    factions: INITIAL_FACTIONS.map(faction =>
      faction.id === 'emperor'
        ? { ...faction, courtInfluence: 9, internalStability: 11, militaryPower: 12 }
        : { ...faction }),
    relationships: INITIAL_RELATIONSHIP_EDGES.map(edge => ({ ...edge })),
    intelProgress: {},
    policyOptionIndex: null,
    policyReason: '',
  })

  expect(result.factionCollapseReports[0]?.severity).toBe('collapse')
  expect(result.judgeFacts.factionSummary).toContain('崩盘')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/game/roundSettlement.test.ts`
Expected: FAIL because collapse reports are not part of settlement output.

- [ ] **Step 3: Write minimal implementation**

```ts
export interface FactionCollapseReport {
  factionId: string
  factionName: string
  severity: 'breach' | 'collapse'
  reason: string
}

function classifyFactionCollapse(factions: Faction[]): FactionCollapseReport[] {
  return factions.flatMap(faction => {
    const reasons: string[] = []
    const collapse =
      faction.militaryPower <= 10 ||
      faction.courtInfluence <= 10 ||
      faction.internalStability <= 10

    const breach =
      faction.militaryPower <= 20 ||
      faction.courtInfluence <= 18 ||
      faction.internalStability <= 18

    if (!collapse && !breach) return []

    if (faction.militaryPower <= (collapse ? 10 : 20)) reasons.push('军事实力塌陷')
    if (faction.courtInfluence <= (collapse ? 10 : 18)) reasons.push('朝堂影响失守')
    if (faction.internalStability <= (collapse ? 10 : 18)) reasons.push('内部稳定断裂')

    return [{
      factionId: faction.id,
      factionName: faction.name,
      severity: collapse ? 'collapse' : 'breach',
      reason: reasons.join('、'),
    }]
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- src/game/roundSettlement.test.ts`
Expected: PASS

---

### Task 5: Apply Soft Collapse Consequences

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\roundSettlement.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\nationEngine.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\Settlement\Settlement.tsx`

- [ ] **Step 1: Write the failing tests**

```ts
it('applies extra decay when a faction is in breach state', () => {
  const result = settleRound({
    round: 18,
    schemes: [],
    northStats: { ...NORTH_INITIAL },
    southStats: { ...SOUTH_INITIAL },
    npcs: INITIAL_NPCS.map(npc => ({ ...npc })),
    factions: INITIAL_FACTIONS.map(faction =>
      faction.id === 'empress'
        ? { ...faction, internalStability: 16, courtInfluence: 17, militaryPower: 32 }
        : { ...faction }),
    relationships: INITIAL_RELATIONSHIP_EDGES.map(edge => ({ ...edge })),
    intelProgress: {},
    policyOptionIndex: null,
    policyReason: '',
  })

  expect(result.northStatsAfter.governance).toBeLessThan(NORTH_INITIAL.governance)
  expect(result.factionCollapseReports[0]?.severity).toBe('breach')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/game/roundSettlement.test.ts`
Expected: FAIL because collapse reports currently do not affect nation or faction consequences.

- [ ] **Step 3: Write minimal implementation**

```ts
function collapsePenalty(report: FactionCollapseReport): Partial<NationDimensions> {
  if (report.severity === 'collapse') {
    return { governance: -1.4, socialOrder: -1.1, military: -0.8 }
  }
  return { governance: -0.7, socialOrder: -0.5 }
}

for (const report of factionCollapseReports) {
  northStats = applyDimensionChanges(northStats, collapsePenalty(report))
}
```

And render in settlement:

```tsx
{lastSettlement?.factionCollapseReports?.length ? (
  <div className="results-section">
    <h3 className="section-title">势力崩口</h3>
    {lastSettlement.factionCollapseReports.map(report => (
      <div key={report.factionId} className={`result-card glass-panel ${report.severity}`}>
        <p className="result-text">{report.factionName}：{report.reason}</p>
      </div>
    ))}
  </div>
) : null}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- src/game/roundSettlement.test.ts`
Expected: PASS

---

### Task 6: Add Tutorial State And Failing Store Tests

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\stores\gameStore.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\stores\gameStore.test.ts`
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\data\tutorial.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it('starts round one with tutorial metadata enabled', () => {
  const state = useGameStore.getState()
  expect(state.tutorialSeen.roundOneIntro).toBe(false)
  expect(state.currentRound).toBe(1)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/stores/gameStore.test.ts`
Expected: FAIL because tutorial state does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export interface TutorialSeenState {
  roundOneIntro: boolean
  systemsIntro: boolean
  aiNativeHint: boolean
}

interface GameState {
  // existing fields
  tutorialSeen: TutorialSeenState
  markTutorialSeen: (key: keyof TutorialSeenState) => void
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- src/stores/gameStore.test.ts`
Expected: PASS

---

### Task 7: Build Round-One Half-Tutorial UI

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\RoundStart\RoundStart.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\RoundStart\RoundStart.css`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\CourtView\CourtView.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\EmpressLetter\EmpressLetter.tsx`

- [ ] **Step 1: Write the failing component tests or assertions**

```ts
it('shows onboarding copy in round one only', () => {
  const isTutorialRound = shouldShowTutorial(1)
  const laterRound = shouldShowTutorial(3)

  expect(isTutorialRound).toBe(true)
  expect(laterRound).toBe(false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/stores/gameStore.test.ts`
Expected: FAIL because tutorial helper does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
export function shouldShowTutorial(round: number): boolean {
  return round === 1
}
```

In `RoundStart.tsx`, render a tutorial card:

```tsx
{currentRound === 1 && (
  <section className="round-tutorial-card">
    <h3>入局手札</h3>
    <p>你是潜伏北周朝堂的萧宝颖。此局有四个核心目标：保全自身、阻止提前南征、用计削弱北周、借问政扶南陈。</p>
    <p>北周线靠选人施计；南陈线靠问政扶国；你的补一句说辞与问政理由，都会实质影响结果。</p>
  </section>
)}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- src/stores/gameStore.test.ts`
Expected: PASS

---

### Task 8: Add Historical Context Data And Tests

**Files:**
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\data\historicalAid.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\data\roundContext.ts`
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\data\historicalAid.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it('returns a short geography and strategy explainer for configured rounds', () => {
  const aid = getHistoricalAid(5)
  expect(aid?.geography).toContain('河西')
  expect(aid?.whyItMatters).toBeTruthy()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/data/historicalAid.test.ts`
Expected: FAIL because historical-aid data and selector do not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export interface HistoricalAid {
  round: number
  geography: string
  forces: string
  whyItMatters: string
}

export const HISTORICAL_AID: HistoricalAid[] = [
  {
    round: 5,
    geography: '河西是北周西向商道与军粮转运要地。',
    forces: '此事主要牵动西线军头、中枢饷权与陇右话语权。',
    whyItMatters: '一旦河西失序，北周既丢钱粮，也更难兼顾南征。',
  },
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- src/data/historicalAid.test.ts`
Expected: PASS

---

### Task 9: Render Historical Aid And Mini Relationship/Map Helpers

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\RoundStart\RoundStart.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\RoundStart\RoundStart.css`

- [ ] **Step 1: Write the failing test or selector assertions**

```ts
it('formats map legend labels for major fronts', () => {
  expect(buildMapLegend(4)).toContain('草原')
  expect(buildMapLegend(16)).toContain('淮南')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/data/historicalAid.test.ts`
Expected: FAIL because the helper and map legend data do not exist.

- [ ] **Step 3: Write minimal implementation**

```tsx
<section className="historical-aid-card">
  <h3>局势旁注</h3>
  <p>{historicalAid.geography}</p>
  <p>{historicalAid.forces}</p>
  <p>{historicalAid.whyItMatters}</p>
  <div className="mini-map">
    <span>草原</span>
    <span>河北</span>
    <span>邺城</span>
    <span>河西</span>
    <span>淮南</span>
    <span>南陈</span>
  </div>
</section>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- src/data/historicalAid.test.ts`
Expected: PASS

---

### Task 10: Add Round History Snapshots

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\stores\gameStore.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\types.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\stores\gameStore.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it('appends a round history snapshot after settlement', () => {
  useGameStore.setState({
    currentRound: 1,
    currentPhase: 'SCHEME_FEEDBACK',
    currentSchemes: [],
  })

  useGameStore.getState().nextPhase()
  expect(useGameStore.getState().roundHistory.length).toBe(1)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/stores/gameStore.test.ts`
Expected: FAIL because round history is not tracked.

- [ ] **Step 3: Write minimal implementation**

```ts
export interface RoundHistoryEntry {
  round: number
  eventName: string
  northPower: number
  southPower: number
  schemeTargetIds: string[]
  relationshipBreaks: number
  externalBreaks: number
}
```

Push one snapshot when settlement resolves.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- src/stores/gameStore.test.ts`
Expected: PASS

---

### Task 11: Add Save/Resume Engine

**Files:**
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\saveEngine.ts`
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\saveEngine.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\stores\gameStore.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it('serializes and restores the core game state for resume', () => {
  const snapshot = serializeSaveState({
    currentRound: 6,
    currentPhase: 'ROUND_START',
    roundHistory: [{ round: 5, eventName: '西征议', northPower: 60, southPower: 46, schemeTargetIds: [], relationshipBreaks: 0, externalBreaks: 0 }],
  } as any)

  const restored = deserializeSaveState(snapshot)
  expect(restored.currentRound).toBe(6)
  expect(restored.roundHistory).toHaveLength(1)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/game/saveEngine.test.ts`
Expected: FAIL because save engine does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
const SAVE_KEY = 'ningchen-save-v1'

export function serializeSaveState(state: PersistedGameState): string {
  return JSON.stringify({ saveVersion: 1, savedAt: Date.now(), state })
}

export function deserializeSaveState(raw: string): PersistedGameState {
  return JSON.parse(raw).state
}

export function writeSave(state: PersistedGameState) {
  localStorage.setItem(SAVE_KEY, serializeSaveState(state))
}

export function readSave(): PersistedGameState | null {
  const raw = localStorage.getItem(SAVE_KEY)
  return raw ? deserializeSaveState(raw) : null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- src/game/saveEngine.test.ts`
Expected: PASS

---

### Task 12: Add Continue-Game Entry UI

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\App.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\stores\gameStore.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\RoundStart\RoundStart.tsx`

- [ ] **Step 1: Write the failing test or state assertions**

```ts
it('offers continue when a save is available', () => {
  localStorage.setItem('ningchen-save-v1', '{"saveVersion":1,"savedAt":1,"state":{"currentRound":4}}')
  expect(hasResumeSave()).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/game/saveEngine.test.ts`
Expected: FAIL because the helper and load path do not exist.

- [ ] **Step 3: Write minimal implementation**

```tsx
{hasResumeSave() && (
  <button className="btn-secondary" onClick={resumeSavedGame}>
    继续上局
  </button>
)}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- src/game/saveEngine.test.ts`
Expected: PASS

---

### Task 13: Build Battle Report From Round History

**Files:**
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\battleReportEngine.ts`
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\battleReportEngine.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\endingEngine.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\types.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it('summarizes the most-used target and key turning points from round history', () => {
  const report = buildBattleReport([
    { round: 3, eventName: '春旱', northPower: 63, southPower: 47, schemeTargetIds: ['zuting'], relationshipBreaks: 0, externalBreaks: 0 },
    { round: 7, eventName: '西征议', northPower: 58, southPower: 49, schemeTargetIds: ['hebaboguì', 'duguwenyue'], relationshipBreaks: 1, externalBreaks: 0 },
  ])

  expect(report.keyTurns[0]).toContain('西征议')
  expect(report.mostUsedTarget).toBeTruthy()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/game/battleReportEngine.test.ts`
Expected: FAIL because battle report engine does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export function buildBattleReport(history: RoundHistoryEntry[]) {
  const targetCount = new Map<string, number>()
  for (const entry of history) {
    for (const id of entry.schemeTargetIds) {
      targetCount.set(id, (targetCount.get(id) ?? 0) + 1)
    }
  }

  const mostUsedTarget = [...targetCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const keyTurns = history
    .filter(entry => entry.relationshipBreaks > 0 || entry.externalBreaks > 0)
    .map(entry => `第${entry.round}回合《${entry.eventName}》成为局势转折。`)

  return { mostUsedTarget, keyTurns }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- src/game/battleReportEngine.test.ts`
Expected: PASS

---

### Task 14: Render Battle Report In Ending Page

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\Ending\Ending.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\Ending\Ending.css`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\stores\gameStore.ts`

- [ ] **Step 1: Write the failing test or state assertion**

```ts
it('keeps battle report data available on the ending screen', () => {
  const state = useGameStore.getState()
  expect(state.endingReport?.statsSummary).toBeTruthy()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/stores/gameStore.test.ts`
Expected: FAIL because ending report does not yet include round-history-derived battle data.

- [ ] **Step 3: Write minimal implementation**

```ts
const battleReport = buildBattleReport(roundHistory)
endingReport = {
  ...endingReport,
  statsSummary: [
    ...endingReport.statsSummary,
    battleReport.mostUsedTarget ? `本局最常施计人物：${battleReport.mostUsedTarget}` : '本局暂无高频目标',
    ...battleReport.keyTurns,
  ],
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- src/stores/gameStore.test.ts`
Expected: PASS

---

### Task 15: Sync Updated Mechanics Back To Planning Docs

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣策划案v1\前台交互与信息可见性设计.md`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣策划案v1\天道判官结算规则.md`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣策划案v1\综合国力系统.md`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣策划案v1\计谋系统.md`

- [ ] **Step 1: Write the doc delta checklist**

Document and confirm these shipped changes:

```md
- 问政题库 now consumes legitimacyEffect / nextRoundFeedback / aiScoringFocus
- 首页 now has历史辅助层与第一回合引导卡
- 势力崩口 / 崩盘进入回合结算与终局报告
- 游戏 now supports本地单存档继续上局
- 终局 now includes round-history-derived战报摘要
```

- [ ] **Step 2: Update the docs**

Apply only the necessary text changes so docs match shipped behavior.

- [ ] **Step 3: Self-review the doc changes**

Check for contradictory statements like:

```md
- “问政只影响本回合”
- “无存档能力”
- “势力崩盘仅为策划概念”
```

---

### Task 16: Full Verification

**Files:**
- Verify only

- [ ] **Step 1: Run all tests**

Run: `npm.cmd test`
Expected: PASS

- [ ] **Step 2: Run build**

Run: `npm.cmd run build`
Expected: PASS

- [ ] **Step 3: Smoke audit**

Check these manually:

```md
- 第 1 回合可看到清晰的新手引导与 AI Native 提示
- 问政结算能区分 focusHit 与 legitimacyEffect 的后效
- 下一回合首页会出现南陈政务跟进
- 结算页会显示势力崩口 / 崩盘
- 刷新页面后能继续上局
- 终局页能看到战报摘要
```
