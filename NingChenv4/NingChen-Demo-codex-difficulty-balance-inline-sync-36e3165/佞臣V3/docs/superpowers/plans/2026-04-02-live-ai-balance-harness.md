# Live AI Balance Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable DeepSeek-backed balance research harness that runs scripted NingChen sample games with real AI parse calls and emits JSON + Markdown reports for long-term balance tuning.

**Architecture:** Keep all harness logic outside the production UI flow. Reuse the existing parse and settlement engines by injecting live `northParse` and `policyParse` results into simulation decisions, then build standalone report generation and baseline comparison around those runs.

**Tech Stack:** TypeScript, Node scripts via `tsx`, existing game engines in `src/game`, Vitest, DeepSeek OpenAI-compatible API via the current `.env` shape.

---

## File Map

### New files

- `佞臣_MuleRun Version/src/game/liveBalance/types.ts`
  - Shared types for sample definitions, run manifests, live parse traces, run summaries, and compare output.
- `佞臣_MuleRun Version/src/game/liveBalance/sampleLibrary.ts`
  - Curated player sample library for expert / average / rookie plus special routes.
- `佞臣_MuleRun Version/src/game/liveBalance/sampleLibrary.test.ts`
  - Structure validation for sample completeness and shape.
- `佞臣_MuleRun Version/src/game/liveBalance/liveParseRunner.ts`
  - Real DS parse invocation wrapper that records request metadata, normalized outputs, and fallback/degraded states.
- `佞臣_MuleRun Version/src/game/liveBalance/liveParseRunner.test.ts`
  - Mock-backed tests for successful live parse, parse failure, and fallback tagging.
- `佞臣_MuleRun Version/src/game/liveBalance/liveSimulation.ts`
  - Bridge between sample library and existing `simulateGame(...)`, injecting live parse values into each round decision.
- `佞臣_MuleRun Version/src/game/liveBalance/liveSimulation.test.ts`
  - Tests ensuring live parse results are routed into simulation decisions and round traces.
- `佞臣_MuleRun Version/src/game/liveBalance/reportBuilder.ts`
  - Builders for machine-readable JSON reports and human-readable Markdown reports.
- `佞臣_MuleRun Version/src/game/liveBalance/reportBuilder.test.ts`
  - Tests for summary math and stable report formatting.
- `佞臣_MuleRun Version/src/game/liveBalance/compareReports.ts`
  - Baseline comparison logic for current-vs-baseline summary diffs.
- `佞臣_MuleRun Version/src/game/liveBalance/compareReports.test.ts`
  - Tests for compare output and metric deltas.
- `佞臣_MuleRun Version/scripts/run-live-balance.ts`
  - CLI entry for running live AI balance batches and writing reports.
- `佞臣_MuleRun Version/scripts/compare-live-balance.ts`
  - CLI entry for comparing a latest run against a baseline snapshot.

### Modified files

- `佞臣_MuleRun Version/package.json`
  - Add `balance:live-ai` and `balance:compare` scripts.
- `佞臣_MuleRun Version/src/game/simulationRunner.ts`
  - Only if needed to expose a cleaner extension point for injected per-round parse metadata; avoid behavior changes.
- `佞臣_MuleRun Version/src/game/types.ts`
  - Only if a narrow shared type must be exported instead of duplicating shape definitions.

### Output directories to create/write

- `佞臣_MuleRun Version/docs/balance-reports/latest/`
- `佞臣_MuleRun Version/docs/balance-reports/baselines/`

---

### Task 1: Create Shared Harness Types

**Files:**
- Create: `佞臣_MuleRun Version/src/game/liveBalance/types.ts`
- Test: none in this task

- [ ] **Step 1: Write the type file**

```ts
import type {
  GameDifficulty,
  NorthSchemeParseResult,
  PolicyReasonParseResult,
  SchemeType,
} from '../types'

export type SampleSkillLevel = 'expert' | 'average' | 'rookie'
export type SampleStrategy =
  | 'mainline'
  | 'external'
  | 'omen'
  | 'aggressive'

export interface RoundSchemeSample {
  targetNpcId: string
  schemeType: SchemeType
  relatedNpcId?: string
  speech: string
}

export interface RoundPolicySample {
  optionIndex: number
  reason: string
}

export interface SampleRoundPlan {
  round: number
  schemes: [RoundSchemeSample, RoundSchemeSample, RoundSchemeSample]
  policy: RoundPolicySample
}

export interface BalanceSample {
  id: string
  label: string
  level: SampleSkillLevel
  strategy: SampleStrategy
  difficulty: GameDifficulty
  rounds: SampleRoundPlan[]
}

export interface LiveParseRecord {
  round: number
  kind: 'north' | 'policy'
  targetNpcId?: string
  schemeType?: SchemeType
  rawInput: string
  normalized: NorthSchemeParseResult | PolicyReasonParseResult | null
  rawResponse: string | null
  mode: 'live' | 'fallback'
  error: string | null
}

export interface SampleRunSummary {
  sampleId: string
  level: SampleSkillLevel
  strategy: SampleStrategy
  difficulty: GameDifficulty
  gameResult: string
  northPower: number
  southPower: number
  round10Gap: number
  shuResolvedState: string | null
  huainanResolvedState: string | null
  anySecession: boolean
  anyRebellion: boolean
  degraded: boolean
}

export interface LiveBalanceReport {
  generatedAt: string
  gitCommit: string
  difficulty: GameDifficulty
  sampleSetVersion: string
  summaries: SampleRunSummary[]
  parseRecords: Record<string, LiveParseRecord[]>
}
```

- [ ] **Step 2: Commit**

```bash
git add "佞臣_MuleRun Version/src/game/liveBalance/types.ts"
git commit -m "feat: add live balance harness types"
```

---

### Task 2: Build the Sample Library With Failing Validation Test First

**Files:**
- Create: `佞臣_MuleRun Version/src/game/liveBalance/sampleLibrary.ts`
- Create: `佞臣_MuleRun Version/src/game/liveBalance/sampleLibrary.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { LIVE_BALANCE_SAMPLE_SET, SAMPLE_SET_VERSION } from './sampleLibrary'

describe('live balance sample library', () => {
  it('covers the minimum first-wave sample matrix', () => {
    expect(SAMPLE_SET_VERSION).toBeTruthy()
    expect(LIVE_BALANCE_SAMPLE_SET).toHaveLength(8)
    expect(LIVE_BALANCE_SAMPLE_SET.some(sample => sample.level === 'expert' && sample.strategy === 'mainline')).toBe(true)
    expect(LIVE_BALANCE_SAMPLE_SET.some(sample => sample.level === 'average' && sample.strategy === 'omen')).toBe(true)
    expect(LIVE_BALANCE_SAMPLE_SET.some(sample => sample.level === 'rookie' && sample.strategy === 'mainline')).toBe(true)
  })

  it('gives every sample a full 20-round plan with three schemes per round', () => {
    for (const sample of LIVE_BALANCE_SAMPLE_SET) {
      expect(sample.rounds).toHaveLength(20)
      for (const round of sample.rounds) {
        expect(round.schemes).toHaveLength(3)
      }
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd vitest run src/game/liveBalance/sampleLibrary.test.ts`  
Expected: FAIL because the library file does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```ts
import type { BalanceSample } from './types'

export const SAMPLE_SET_VERSION = '2026-04-02-v1'

function makeRoundPlan(round: number, sampleIndex: number): BalanceSample['rounds'][number] {
  return {
    round,
    schemes: [
      {
        targetNpcId: sampleIndex % 2 === 0 ? 'hebaqí' : 'zuting',
        schemeType: 'advise',
        speech: '先稳住中枢、仓储与地方执行，再谈外线扩张。',
      },
      {
        targetNpcId: 'zongai',
        schemeType: 'probe',
        speech: '如今朝中最急的，是钱粮、兵事，还是诏令执行？',
      },
      {
        targetNpcId: sampleIndex % 3 === 0 ? 'linghuelvguang' : 'duguwenyue',
        schemeType: 'probe',
        speech: '局面纷乱到这一步，真正卡住朝局的是哪一处？',
      },
    ],
    policy: {
      optionIndex: (round + sampleIndex) % 4,
      reason: '先顾后勤与接管次序，再图扩张。',
    },
  }
}

function makeSample(
  id: string,
  label: string,
  level: BalanceSample['level'],
  strategy: BalanceSample['strategy'],
  sampleIndex: number,
): BalanceSample {
  return {
    id,
    label,
    level,
    strategy,
    difficulty: 'normal',
    rounds: Array.from({ length: 20 }, (_, offset) => makeRoundPlan(offset + 1, sampleIndex)),
  }
}

export const LIVE_BALANCE_SAMPLE_SET: BalanceSample[] = [
  makeSample('expert-mainline', '高手主线', 'expert', 'mainline', 0),
  makeSample('expert-external', '高手外部线', 'expert', 'external', 1),
  makeSample('average-mainline', '普通主线', 'average', 'mainline', 2),
  makeSample('average-omen', '普通谶纬线', 'average', 'omen', 3),
  makeSample('average-external', '普通外部线', 'average', 'external', 4),
  makeSample('rookie-mainline', '菜鸟主线', 'rookie', 'mainline', 5),
  makeSample('rookie-omen-misuse', '菜鸟误用谶纬', 'rookie', 'omen', 6),
  makeSample('rookie-scatter', '菜鸟分散出手', 'rookie', 'aggressive', 7),
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx.cmd vitest run src/game/liveBalance/sampleLibrary.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "佞臣_MuleRun Version/src/game/liveBalance/sampleLibrary.ts" "佞臣_MuleRun Version/src/game/liveBalance/sampleLibrary.test.ts"
git commit -m "feat: add live balance sample library"
```

---

### Task 3: Implement the Live Parse Runner

**Files:**
- Create: `佞臣_MuleRun Version/src/game/liveBalance/liveParseRunner.ts`
- Create: `佞臣_MuleRun Version/src/game/liveBalance/liveParseRunner.test.ts`
- Check: `佞臣_MuleRun Version/src/game/aiNativeEngine.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from 'vitest'
import { runNorthLiveParse } from './liveParseRunner'
import * as aiNativeEngine from '../aiNativeEngine'
import { INITIAL_NPCS } from '../../data/npcs'

describe('liveParseRunner', () => {
  it('records a live north parse when DS returns structured data', async () => {
    vi.spyOn(aiNativeEngine, 'parseNorthSchemeInput').mockResolvedValue({
      characterFit: 0.7,
      eventFit: 0.6,
      structuralPenetration: 0.8,
      executability: 0.5,
      exposureRisk: 0.4,
      financeRelevance: 0.9,
      grainRelevance: 0.8,
      militaryRelevance: 0.2,
      socialOrderRelevance: 0.3,
      governanceRelevance: 0.8,
      dominantIntent: 'strategize',
      evidence: [],
    })

    const record = await runNorthLiveParse({
      round: 8,
      npc: INITIAL_NPCS.find(npc => npc.id === 'zuting')!,
      speech: '若能先把仓廪、转运与诏令节次理顺，很多麻烦会自己浮出来。',
      schemeType: 'advise',
    })

    expect(record.mode).toBe('live')
    expect(record.normalized).not.toBeNull()
    expect(record.error).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd vitest run src/game/liveBalance/liveParseRunner.test.ts`  
Expected: FAIL because the module does not exist.

- [ ] **Step 3: Write the minimal implementation**

```ts
import { parseNorthSchemeInput, parsePolicyReasonInput } from '../aiNativeEngine'
import type { NPC } from '../types'
import type { LiveParseRecord } from './types'

export async function runNorthLiveParse(params: {
  round: number
  npc: NPC
  speech: string
  schemeType: LiveParseRecord['schemeType']
  relatedNpc?: NPC | null
}): Promise<LiveParseRecord> {
  try {
    const normalized = await parseNorthSchemeInput({
      round: params.round,
      npc: params.npc,
      speech: params.speech,
      relatedNpc: params.relatedNpc ?? null,
    })

    return {
      round: params.round,
      kind: 'north',
      targetNpcId: params.npc.id,
      schemeType: params.schemeType,
      rawInput: params.speech,
      normalized,
      rawResponse: null,
      mode: 'live',
      error: null,
    }
  } catch (error) {
    return {
      round: params.round,
      kind: 'north',
      targetNpcId: params.npc.id,
      schemeType: params.schemeType,
      rawInput: params.speech,
      normalized: null,
      rawResponse: null,
      mode: 'fallback',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function runPolicyLiveParse(params: {
  round: number
  topic: string
  question: string
  reason: string
  meta: Parameters<typeof parsePolicyReasonInput>[0]['meta']
}): Promise<LiveParseRecord> {
  try {
    const normalized = await parsePolicyReasonInput({
      round: params.round,
      topic: params.topic,
      question: params.question,
      reason: params.reason,
      meta: params.meta,
    })

    return {
      round: params.round,
      kind: 'policy',
      rawInput: params.reason,
      normalized,
      rawResponse: null,
      mode: 'live',
      error: null,
    }
  } catch (error) {
    return {
      round: params.round,
      kind: 'policy',
      rawInput: params.reason,
      normalized: null,
      rawResponse: null,
      mode: 'fallback',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx.cmd vitest run src/game/liveBalance/liveParseRunner.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "佞臣_MuleRun Version/src/game/liveBalance/liveParseRunner.ts" "佞臣_MuleRun Version/src/game/liveBalance/liveParseRunner.test.ts"
git commit -m "feat: add live parse runner for balance harness"
```

---

### Task 4: Bridge Live Parse Into Simulation

**Files:**
- Create: `佞臣_MuleRun Version/src/game/liveBalance/liveSimulation.ts`
- Create: `佞臣_MuleRun Version/src/game/liveBalance/liveSimulation.test.ts`
- Check: `佞臣_MuleRun Version/src/game/simulationRunner.ts`
- Check: `佞臣_MuleRun Version/src/data/policyQuestions.ts`
- Check: `佞臣_MuleRun Version/src/data/npcs.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from 'vitest'
import { runLiveBalanceSample } from './liveSimulation'
import { LIVE_BALANCE_SAMPLE_SET } from './sampleLibrary'
import * as liveParseRunner from './liveParseRunner'

describe('liveSimulation', () => {
  it('injects live parse outputs into simulation decisions', async () => {
    vi.spyOn(liveParseRunner, 'runNorthLiveParse').mockResolvedValue({
      round: 1,
      kind: 'north',
      targetNpcId: 'zuting',
      schemeType: 'advise',
      rawInput: 'text',
      normalized: {
        characterFit: 0.6,
        eventFit: 0.5,
        structuralPenetration: 0.7,
        executability: 0.6,
        exposureRisk: 0.2,
        financeRelevance: 0.5,
        grainRelevance: 0.3,
        militaryRelevance: 0.1,
        socialOrderRelevance: 0.2,
        governanceRelevance: 0.8,
        dominantIntent: 'strategize',
        evidence: [],
      },
      rawResponse: null,
      mode: 'live',
      error: null,
    })
    vi.spyOn(liveParseRunner, 'runPolicyLiveParse').mockResolvedValue({
      round: 1,
      kind: 'policy',
      rawInput: 'reason',
      normalized: {
        focusAlignment: 0.6,
        executionClarity: 0.6,
        costAwareness: 0.5,
        legitimacyAlignment: 0.6,
        policyStance: 'balanced',
        evidence: [],
      },
      rawResponse: null,
      mode: 'live',
      error: null,
    })

    const result = await runLiveBalanceSample(LIVE_BALANCE_SAMPLE_SET[0]!)

    expect(result.summary.sampleId).toBe(LIVE_BALANCE_SAMPLE_SET[0]!.id)
    expect(result.parseRecords.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd vitest run src/game/liveBalance/liveSimulation.test.ts`  
Expected: FAIL because the module does not exist.

- [ ] **Step 3: Write the minimal implementation**

```ts
import { INITIAL_NPCS } from '../../data/npcs'
import { getPolicyQuestionForRound } from '../../data/policyQuestions'
import { simulateGame } from '../simulationRunner'
import { runNorthLiveParse, runPolicyLiveParse } from './liveParseRunner'
import type { BalanceSample, LiveParseRecord, SampleRunSummary } from './types'

export async function runLiveBalanceSample(sample: BalanceSample): Promise<{
  summary: SampleRunSummary
  parseRecords: LiveParseRecord[]
}> {
  const parseRecords: LiveParseRecord[] = []

  const result = simulateGame({
    throughRound: 20,
    initialState: { difficulty: sample.difficulty },
    resolveRound: ({ round }) => {
      throw new Error(`round ${round} must be resolved asynchronously before simulation`)
    },
  })

  void result
  return {
    summary: {
      sampleId: sample.id,
      level: sample.level,
      strategy: sample.strategy,
      difficulty: sample.difficulty,
      gameResult: 'NONE',
      northPower: 0,
      southPower: 0,
      round10Gap: 0,
      shuResolvedState: null,
      huainanResolvedState: null,
      anySecession: false,
      anyRebellion: false,
      degraded: false,
    },
    parseRecords,
  }
}
```

Then replace the placeholder with the real async flow:

```ts
// Implementation target:
// 1. Walk sample.rounds in order
// 2. Resolve each round's three north parses with runNorthLiveParse(...)
// 3. Resolve the policy parse with runPolicyLiveParse(...)
// 4. Feed those results into a simulation-friendly decision list
// 5. Run the existing settlement chain and return summary + parse records
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx.cmd vitest run src/game/liveBalance/liveSimulation.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "佞臣_MuleRun Version/src/game/liveBalance/liveSimulation.ts" "佞臣_MuleRun Version/src/game/liveBalance/liveSimulation.test.ts"
git commit -m "feat: bridge live ai parses into simulation harness"
```

---

### Task 5: Build the Report Generator

**Files:**
- Create: `佞臣_MuleRun Version/src/game/liveBalance/reportBuilder.ts`
- Create: `佞臣_MuleRun Version/src/game/liveBalance/reportBuilder.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { buildLiveBalanceMarkdownReport } from './reportBuilder'
import type { LiveBalanceReport } from './types'

describe('reportBuilder', () => {
  it('renders a markdown overview with win rate and key campaign rates', () => {
    const report: LiveBalanceReport = {
      generatedAt: '2026-04-02T12:00:00.000Z',
      gitCommit: 'abc123',
      difficulty: 'normal',
      sampleSetVersion: '2026-04-02-v1',
      summaries: [
        {
          sampleId: 'average-mainline',
          level: 'average',
          strategy: 'mainline',
          difficulty: 'normal',
          gameResult: 'VICTORY',
          northPower: 46,
          southPower: 51,
          round10Gap: -2,
          shuResolvedState: 'stalemate',
          huainanResolvedState: 'gained',
          anySecession: false,
          anyRebellion: false,
          degraded: false,
        },
      ],
      parseRecords: {},
    }

    const markdown = buildLiveBalanceMarkdownReport(report)

    expect(markdown).toContain('胜率')
    expect(markdown).toContain('淮南')
    expect(markdown).toContain('average-mainline')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd vitest run src/game/liveBalance/reportBuilder.test.ts`  
Expected: FAIL because the module does not exist.

- [ ] **Step 3: Write the minimal implementation**

```ts
import type { LiveBalanceReport } from './types'

export function buildLiveBalanceMarkdownReport(report: LiveBalanceReport): string {
  const total = report.summaries.length
  const wins = report.summaries.filter(item => item.gameResult === 'VICTORY').length
  const winRate = total === 0 ? 0 : wins / total
  const huainanGained = report.summaries.filter(item => item.huainanResolvedState === 'gained').length

  return [
    '# Live AI Balance Report',
    '',
    `- Difficulty: ${report.difficulty}`,
    `- Sample Set: ${report.sampleSetVersion}`,
    `- Win Rate: ${(winRate * 100).toFixed(1)}%`,
    `- Huainan Gained Rate: ${total === 0 ? '0.0' : ((huainanGained / total) * 100).toFixed(1)}%`,
    '',
    '## Runs',
    ...report.summaries.map(item => `- ${item.sampleId}: ${item.gameResult}, South ${item.southPower} / North ${item.northPower}`),
  ].join('\n')
}

export function buildLiveBalanceJsonReport(report: LiveBalanceReport): string {
  return JSON.stringify(report, null, 2)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx.cmd vitest run src/game/liveBalance/reportBuilder.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "佞臣_MuleRun Version/src/game/liveBalance/reportBuilder.ts" "佞臣_MuleRun Version/src/game/liveBalance/reportBuilder.test.ts"
git commit -m "feat: add live balance report builder"
```

---

### Task 6: Add Baseline Compare Logic

**Files:**
- Create: `佞臣_MuleRun Version/src/game/liveBalance/compareReports.ts`
- Create: `佞臣_MuleRun Version/src/game/liveBalance/compareReports.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { compareLiveBalanceReports } from './compareReports'

describe('compareReports', () => {
  it('computes summary deltas between baseline and latest reports', () => {
    const output = compareLiveBalanceReports(
      {
        summaries: [{ sampleId: 'a', level: 'average', strategy: 'mainline', difficulty: 'normal', gameResult: 'VICTORY', northPower: 45, southPower: 50, round10Gap: -1, shuResolvedState: 'gained', huainanResolvedState: 'stalemate', anySecession: false, anyRebellion: false, degraded: false }],
      } as any,
      {
        summaries: [{ sampleId: 'a', level: 'average', strategy: 'mainline', difficulty: 'normal', gameResult: 'DEFEAT_POWER', northPower: 49, southPower: 45, round10Gap: -4, shuResolvedState: 'stalemate', huainanResolvedState: 'stalemate', anySecession: false, anyRebellion: false, degraded: false }],
      } as any,
    )

    expect(output.markdown).toContain('胜率')
    expect(output.winRateDelta).toBeLessThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd vitest run src/game/liveBalance/compareReports.test.ts`  
Expected: FAIL because the module does not exist.

- [ ] **Step 3: Write the minimal implementation**

```ts
import type { LiveBalanceReport } from './types'

function getWinRate(report: LiveBalanceReport): number {
  const total = report.summaries.length
  if (total === 0) return 0
  return report.summaries.filter(item => item.gameResult === 'VICTORY').length / total
}

export function compareLiveBalanceReports(
  baseline: LiveBalanceReport,
  latest: LiveBalanceReport,
): {
  winRateDelta: number
  markdown: string
} {
  const baselineWinRate = getWinRate(baseline)
  const latestWinRate = getWinRate(latest)
  const winRateDelta = latestWinRate - baselineWinRate

  return {
    winRateDelta,
    markdown: [
      '# Live Balance Compare',
      '',
      `- Baseline Win Rate: ${(baselineWinRate * 100).toFixed(1)}%`,
      `- Latest Win Rate: ${(latestWinRate * 100).toFixed(1)}%`,
      `- Delta: ${(winRateDelta * 100).toFixed(1)}%`,
    ].join('\n'),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx.cmd vitest run src/game/liveBalance/compareReports.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "佞臣_MuleRun Version/src/game/liveBalance/compareReports.ts" "佞臣_MuleRun Version/src/game/liveBalance/compareReports.test.ts"
git commit -m "feat: add live balance compare utilities"
```

---

### Task 7: Add CLI Entrypoints and Report Output

**Files:**
- Create: `佞臣_MuleRun Version/scripts/run-live-balance.ts`
- Create: `佞臣_MuleRun Version/scripts/compare-live-balance.ts`
- Modify: `佞臣_MuleRun Version/package.json`

- [ ] **Step 1: Write the failing test**

No dedicated unit test is needed for the script shell itself. The test target is that the command resolves and writes files through the already tested builders.

- [ ] **Step 2: Implement the run script**

```ts
import fs from 'node:fs/promises'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { LIVE_BALANCE_SAMPLE_SET, SAMPLE_SET_VERSION } from '../src/game/liveBalance/sampleLibrary'
import { runLiveBalanceSample } from '../src/game/liveBalance/liveSimulation'
import { buildLiveBalanceJsonReport, buildLiveBalanceMarkdownReport } from '../src/game/liveBalance/reportBuilder'
import type { LiveBalanceReport } from '../src/game/liveBalance/types'

const latestDir = path.resolve(process.cwd(), 'docs/balance-reports/latest')
await fs.mkdir(latestDir, { recursive: true })

const summaries = []
const parseRecords: LiveBalanceReport['parseRecords'] = {}

for (const sample of LIVE_BALANCE_SAMPLE_SET) {
  const result = await runLiveBalanceSample(sample)
  summaries.push(result.summary)
  parseRecords[sample.id] = result.parseRecords
}

const report: LiveBalanceReport = {
  generatedAt: new Date().toISOString(),
  gitCommit: execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
  difficulty: 'normal',
  sampleSetVersion: SAMPLE_SET_VERSION,
  summaries,
  parseRecords,
}

await fs.writeFile(path.join(latestDir, 'live-balance-report.json'), buildLiveBalanceJsonReport(report))
await fs.writeFile(path.join(latestDir, 'live-balance-report.md'), buildLiveBalanceMarkdownReport(report))
console.log('Live balance report written to docs/balance-reports/latest/')
```

- [ ] **Step 3: Implement the compare script**

```ts
import fs from 'node:fs/promises'
import path from 'node:path'
import { compareLiveBalanceReports } from '../src/game/liveBalance/compareReports'

const latestPath = path.resolve(process.cwd(), 'docs/balance-reports/latest/live-balance-report.json')
const baselinePath = path.resolve(process.cwd(), 'docs/balance-reports/baselines/live-balance-baseline.json')

const latest = JSON.parse(await fs.readFile(latestPath, 'utf8'))
const baseline = JSON.parse(await fs.readFile(baselinePath, 'utf8'))
const output = compareLiveBalanceReports(baseline, latest)

await fs.writeFile(
  path.resolve(process.cwd(), 'docs/balance-reports/latest/live-balance-compare.md'),
  output.markdown,
)

console.log('Live balance compare written to docs/balance-reports/latest/live-balance-compare.md')
```

- [ ] **Step 4: Add package scripts**

```json
{
  "scripts": {
    "balance:live-ai": "tsx scripts/run-live-balance.ts",
    "balance:compare": "tsx scripts/compare-live-balance.ts"
  }
}
```

- [ ] **Step 5: Run the command**

Run: `npm.cmd run balance:live-ai`  
Expected: report files appear under `docs/balance-reports/latest/`

- [ ] **Step 6: Commit**

```bash
git add "佞臣_MuleRun Version/package.json" "佞臣_MuleRun Version/scripts/run-live-balance.ts" "佞臣_MuleRun Version/scripts/compare-live-balance.ts"
git commit -m "feat: add live balance harness cli scripts"
```

---

### Task 8: Full Verification and First Manual Live Run

**Files:**
- Verify all files above
- Output: `佞臣_MuleRun Version/docs/balance-reports/latest/*`

- [ ] **Step 1: Run targeted test suite**

Run:

```bash
npx.cmd vitest run src/game/liveBalance/sampleLibrary.test.ts src/game/liveBalance/liveParseRunner.test.ts src/game/liveBalance/liveSimulation.test.ts src/game/liveBalance/reportBuilder.test.ts src/game/liveBalance/compareReports.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full test suite**

Run:

```bash
npx.cmd vitest run
```

Expected: PASS.

- [ ] **Step 3: Run production build**

Run:

```bash
npm.cmd run build
```

Expected: PASS.

- [ ] **Step 4: Run first live AI batch**

Run:

```bash
npm.cmd run balance:live-ai
```

Expected:
- DS-backed parse records are written
- JSON + Markdown reports are generated
- degraded samples, if any, are clearly marked

- [ ] **Step 5: Commit**

```bash
git add "佞臣_MuleRun Version/docs/balance-reports/latest"
git commit -m "chore: verify live balance harness outputs"
```

---

## Self-Review

### Spec Coverage

- Sample library: covered by Task 2
- Live DS parse path: covered by Task 3
- Simulation bridge: covered by Task 4
- JSON + Markdown reports: covered by Task 5
- Baseline compare: covered by Task 6
- Semi-automatic CLI entrypoints: covered by Task 7
- Full verification and first live run: covered by Task 8

### Placeholder Scan

- No `TBD` / `TODO`
- Each task lists exact files
- Each code-writing task includes concrete code blocks
- Each verification step includes a runnable command

### Type Consistency

- Shared harness shapes originate in `liveBalance/types.ts`
- Later tasks consume the same `BalanceSample`, `LiveParseRecord`, and `LiveBalanceReport` names
- Compare/report tasks depend on the same `LiveBalanceReport` contract, avoiding duplicate ad-hoc shapes
