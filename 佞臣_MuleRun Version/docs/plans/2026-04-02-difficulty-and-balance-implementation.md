# Difficulty And Balance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebalance the default difficulty around a roughly 50% first-clear rate, add reusable difficulty profiles, improve external-action discoverability, and add first-time omen onboarding.

**Architecture:** Add a single difficulty-profile source of truth and thread it through the game store, scheme resolution, nation growth, and onboarding hints. Keep the current content and state machine intact; change only parameters, selection state, and hint surfaces. Implement `normal` first, but build the profile layer so `easy / hard / hell` can reuse the same hooks.

**Tech Stack:** React, Zustand, TypeScript, Vitest, Vite

---

### Task 1: Difficulty Profile Plumbing And Prologue Selection

**Files:**
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣_MuleRun Version\src\game\difficulty.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣_MuleRun Version\src\game\types.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣_MuleRun Version\src\stores\gameStore.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣_MuleRun Version\src\stores\gameStore.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣_MuleRun Version\src\components\Prologue\Prologue.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣_MuleRun Version\src\components\Prologue\Prologue.css`

- [ ] **Step 1: Write store and profile tests first**

```ts
import { describe, expect, it } from 'vitest'
import { getDifficultyProfile } from './difficulty'
import { useGameStore } from '../stores/gameStore'

describe('difficulty profiles', () => {
    it('returns normal as the default playable profile', () => {
        expect(getDifficultyProfile('normal').id).toBe('normal')
        expect(getDifficultyProfile('normal').scheme.baseRate).toBe(0.56)
    })
})

describe('gameStore difficulty selection', () => {
    it('defaults to normal and resets back to normal on full reset', () => {
        const store = useGameStore.getState()
        expect(store.difficulty).toBe('normal')
        store.setDifficulty('hard')
        expect(useGameStore.getState().difficulty).toBe('hard')
        store.resetGame()
        expect(useGameStore.getState().difficulty).toBe('normal')
    })
})
```

- [ ] **Step 2: Run the failing tests**

Run:

```powershell
npm.cmd test -- src/game/difficulty.test.ts src/stores/gameStore.test.ts
```

Expected:

- `Cannot find module '../game/difficulty'`
- `Property 'difficulty' does not exist`

- [ ] **Step 3: Add the type and profile source of truth**

```ts
// src/game/types.ts
export type GameDifficulty = 'easy' | 'normal' | 'hard' | 'hell'

// src/game/difficulty.ts
import type { GameDifficulty } from './types'

export interface DifficultyProfile {
    id: GameDifficulty
    label: string
    scheme: {
        baseRate: number
        probeModifier: number
        adviseModifier: number
        characterFitWeight: number
        executabilityWeight: number
        eventFitWeight: number
        exposurePenaltyWeight: number
    }
    southGrowthMultiplier: number
    policyAftereffectMultiplier: number
    externalThresholdOffset: {
        trust: number
        loyalty: number
    }
    onboarding: {
        showFullOmenGuide: boolean
    }
}

const DIFFICULTY_PROFILES: Record<GameDifficulty, DifficultyProfile> = {
    easy: {
        id: 'easy',
        label: '简单',
        scheme: {
            baseRate: 0.62,
            probeModifier: 0.17,
            adviseModifier: 0.15,
            characterFitWeight: 0.16,
            executabilityWeight: 0.1,
            eventFitWeight: 0.1,
            exposurePenaltyWeight: 0.09,
        },
        southGrowthMultiplier: 1.12,
        policyAftereffectMultiplier: 0.97,
        externalThresholdOffset: { trust: -2, loyalty: 2 },
        onboarding: { showFullOmenGuide: true },
    },
    normal: {
        id: 'normal',
        label: '普通',
        scheme: {
            baseRate: 0.56,
            probeModifier: 0.11,
            adviseModifier: 0.09,
            characterFitWeight: 0.14,
            executabilityWeight: 0.09,
            eventFitWeight: 0.09,
            exposurePenaltyWeight: 0.11,
        },
        southGrowthMultiplier: 1,
        policyAftereffectMultiplier: 0.88,
        externalThresholdOffset: { trust: 0, loyalty: 0 },
        onboarding: { showFullOmenGuide: true },
    },
    hard: {
        id: 'hard',
        label: '困难',
        scheme: {
            baseRate: 0.51,
            probeModifier: 0.07,
            adviseModifier: 0.05,
            characterFitWeight: 0.12,
            executabilityWeight: 0.08,
            eventFitWeight: 0.08,
            exposurePenaltyWeight: 0.12,
        },
        southGrowthMultiplier: 0.9,
        policyAftereffectMultiplier: 0.79,
        externalThresholdOffset: { trust: 0, loyalty: 0 },
        onboarding: { showFullOmenGuide: false },
    },
    hell: {
        id: 'hell',
        label: '地狱',
        scheme: {
            baseRate: 0.47,
            probeModifier: 0.03,
            adviseModifier: 0.01,
            characterFitWeight: 0.1,
            executabilityWeight: 0.07,
            eventFitWeight: 0.07,
            exposurePenaltyWeight: 0.13,
        },
        southGrowthMultiplier: 0.85,
        policyAftereffectMultiplier: 0.72,
        externalThresholdOffset: { trust: 0, loyalty: 0 },
        onboarding: { showFullOmenGuide: false },
    },
}

export function getDifficultyProfile(difficulty: GameDifficulty): DifficultyProfile {
    return DIFFICULTY_PROFILES[difficulty]
}
```

- [ ] **Step 4: Persist the difficulty in the main store and expose a setter**

```ts
// src/stores/gameStore.ts
interface GameState {
    difficulty: GameDifficulty
    setDifficulty: (difficulty: GameDifficulty) => void
}

const initialDifficulty: GameDifficulty = 'normal'

export const useGameStore = create<GameState>((set) => ({
    difficulty: initialDifficulty,
    setDifficulty: (difficulty) => set({ difficulty }),
    resetGame: () => set({
        difficulty: initialDifficulty,
        currentRound: 1,
        currentPhase: 'PROLOGUE',
        schemeCount: 0,
        currentSchemes: [],
        currentPolicy: null,
    }),
}))
```

- [ ] **Step 5: Add a simple four-option selector to the prologue footer**

```tsx
// src/components/Prologue/Prologue.tsx
const difficulty = useGameStore(state => state.difficulty)
const setDifficulty = useGameStore(state => state.setDifficulty)

<div className="prologue-difficulty">
    {[
        ['easy', '简单'],
        ['normal', '普通'],
        ['hard', '困难'],
        ['hell', '地狱'],
    ].map(([id, label]) => (
        <button
            key={id}
            className={`difficulty-chip ${difficulty === id ? 'active' : ''}`}
            onClick={() => setDifficulty(id as GameDifficulty)}
        >
            {label}
        </button>
    ))}
</div>
```

- [ ] **Step 6: Re-run the tests**

Run:

```powershell
npm.cmd test -- src/game/difficulty.test.ts src/stores/gameStore.test.ts src/components/Prologue/Prologue.test.tsx
```

Expected:

- PASS

- [ ] **Step 7: Commit**

```powershell
git add "佞臣_MuleRun Version/src/game/difficulty.ts" "佞臣_MuleRun Version/src/game/types.ts" "佞臣_MuleRun Version/src/stores/gameStore.ts" "佞臣_MuleRun Version/src/stores/gameStore.test.ts" "佞臣_MuleRun Version/src/components/Prologue/Prologue.tsx" "佞臣_MuleRun Version/src/components/Prologue/Prologue.css"
git commit -m "feat: add difficulty profile plumbing"
```

### Task 2: Rebalance North Scheme Success Around The Difficulty Profile

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣_MuleRun Version\src\game\schemeEngine.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣_MuleRun Version\src\game\schemeEngine.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣_MuleRun Version\src\game\simulationRunner.test.ts`

- [ ] **Step 1: Write the failing balance tests**

```ts
it('uses the normal difficulty profile to lower low-risk success rates', () => {
    const rate = calculateParsedSuccessRate(
        'advise',
        62,
        30,
        false,
        {
            characterFit: 0.8,
            executability: 0.8,
            eventFit: 0.7,
            exposureRisk: 0.1,
            structuralPenetration: 0.5,
            financeRelevance: 0.2,
            grainRelevance: 0.2,
            militaryRelevance: 0.2,
            socialOrderRelevance: 0.2,
            governanceRelevance: 0.2,
            dominantIntent: 'strategize',
            evidence: [],
        },
        'normal',
    )

    expect(rate).toBeLessThan(0.85)
})

it('keeps easy above hard for the same low-risk setup', () => {
    expect(sampleRate('easy')).toBeGreaterThan(sampleRate('hard'))
})
```

- [ ] **Step 2: Run the failing tests**

Run:

```powershell
npm.cmd test -- src/game/schemeEngine.test.ts src/game/simulationRunner.test.ts
```

Expected:

- signature mismatch on `calculateParsedSuccessRate`
- old success-rate assertions still reflect the pre-balance numbers

- [ ] **Step 3: Thread difficulty into success-rate calculation**

```ts
// src/game/schemeEngine.ts
import { getDifficultyProfile } from './difficulty'

function calculateSuccessRate(
    schemeType: SchemeType,
    trust: number,
    trustThreshold: number,
    sameNpcSameRound: boolean,
    difficulty: GameDifficulty,
): number {
    const profile = getDifficultyProfile(difficulty)
    let rate = profile.scheme.baseRate
    const trustBonus = Math.min(Math.max(trust - trustThreshold, 0) / 100, 0.24)
    rate += trustBonus

    const schemeModifiers: Record<SchemeType, number> = {
        probe: profile.scheme.probeModifier,
        advise: profile.scheme.adviseModifier,
        slander: 0.02,
        alienate: -0.06,
        frame: -0.08,
        proxy: -0.12,
        appeal: 0.12,
        omen: -0.18,
        secession: -0.08,
        rebellion: -0.18,
    }

    if (sameNpcSameRound) rate -= 0.18
    return clamp(rate + schemeModifiers[schemeType], 0.08, 0.96)
}
```

- [ ] **Step 4: Apply profile weights in parsed boosts and keep the game-store path on `state.difficulty`**

```ts
const profile = getDifficultyProfile(difficulty)
const characterBoost =
    parse.characterFit * profile.scheme.characterFitWeight
    + parse.executability * profile.scheme.executabilityWeight
const eventBoost = parse.eventFit * profile.scheme.eventFitWeight
return clamp(
    baseRate + characterBoost + eventBoost - parse.exposureRisk * profile.scheme.exposurePenaltyWeight,
    0.05,
    0.98,
)
```

- [ ] **Step 5: Update the strong-route regression so normal no longer trivially flips the board by round 10**

```ts
expect(result.finalState.northPower).toBeGreaterThanOrEqual(result.finalState.southPower)
expect(result.finalState.northPower - result.finalState.southPower).toBeLessThan(4)
```

- [ ] **Step 6: Re-run the tests**

Run:

```powershell
npm.cmd test -- src/game/schemeEngine.test.ts src/game/simulationRunner.test.ts
```

Expected:

- PASS

- [ ] **Step 7: Commit**

```powershell
git add "佞臣_MuleRun Version/src/game/schemeEngine.ts" "佞臣_MuleRun Version/src/game/schemeEngine.test.ts" "佞臣_MuleRun Version/src/game/simulationRunner.test.ts"
git commit -m "feat: rebalance scheme success by difficulty"
```

### Task 3: Rebalance South Natural Growth And Policy Aftereffects

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣_MuleRun Version\src\data\nationStats.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣_MuleRun Version\src\game\nationEngine.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣_MuleRun Version\src\game\nationEngine.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣_MuleRun Version\src\game\simulationRunner.test.ts`

- [ ] **Step 1: Write the failing south-growth tests**

```ts
it('uses the normal profile to trim South natural growth', () => {
    const grown = getSouthGrowthForDifficulty('normal')
    expect(grown.finance).toBe(0.54)
    expect(grown.governance).toBe(0.40)
})

it('scales aftereffects by difficulty profile', () => {
    const input = {
        sourceRound: 6,
        round: 7,
        topic: '军粮与河运',
        immediateEffects: {
            finance: 2.4,
            grain: 2.1,
            governance: 1.6,
        },
        legitimacyEffect: 'up' as const,
        reasonText: '先稳转运与清册，再定军粮分配，使地方知道先做什么。',
        policyParse: {
            focusAlignment: 0.82,
            executionClarity: 0.78,
            costAwareness: 0.61,
            legitimacyAlignment: 0.74,
            policyStance: 'balanced' as const,
            evidence: [],
        },
    }

    const normal = buildPolicyAftereffect({ ...input, difficulty: 'normal' })
    const easy = buildPolicyAftereffect({ ...input, difficulty: 'easy' })
    expect(normal.effects.finance ?? 0).toBeLessThan(easy.effects.finance ?? 0)
})
```

- [ ] **Step 2: Run the failing tests**

Run:

```powershell
npm.cmd test -- src/game/nationEngine.test.ts src/game/simulationRunner.test.ts
```

Expected:

- missing difficulty-aware south growth helper
- aftereffect assertions still follow the old global scale

- [ ] **Step 3: Introduce a difficulty-aware South growth helper**

```ts
// src/data/nationStats.ts
export function getSouthGrowthForDifficulty(difficulty: GameDifficulty): NationDimensions {
    const profile = getDifficultyProfile(difficulty)
    return {
        finance: roundOneDecimal(0.54 * profile.southGrowthMultiplier),
        grain: roundOneDecimal(0.46 * profile.southGrowthMultiplier),
        military: roundOneDecimal(0.42 * profile.southGrowthMultiplier),
        socialOrder: roundOneDecimal(0.46 * profile.southGrowthMultiplier),
        governance: roundOneDecimal(0.40 * profile.southGrowthMultiplier),
    }
}
```

- [ ] **Step 4: Thread difficulty into natural growth and aftereffect generation**

```ts
// src/game/nationEngine.ts
export function applyNaturalGrowth(
    current: NationDimensions,
    side: 'north' | 'south',
    difficulty: GameDifficulty = 'normal',
): NationDimensions {
    const growth = side === 'north' ? NORTH_GROWTH : getSouthGrowthForDifficulty(difficulty)
    return applyDimensionChanges(current, applyGrowthCap(current, growth))
}

const profile = getDifficultyProfile(params.difficulty ?? 'normal')
const factor = baseFactor * profile.policyAftereffectMultiplier
```

- [ ] **Step 5: Update the round-10 regression to assert “close or trailing” rather than an early free lead**

```ts
expect(result.finalState.southPower).toBeLessThanOrEqual(result.finalState.northPower + 1.5)
```

- [ ] **Step 6: Re-run the tests**

Run:

```powershell
npm.cmd test -- src/game/nationEngine.test.ts src/game/simulationRunner.test.ts
```

Expected:

- PASS

- [ ] **Step 7: Commit**

```powershell
git add "佞臣_MuleRun Version/src/data/nationStats.ts" "佞臣_MuleRun Version/src/game/nationEngine.ts" "佞臣_MuleRun Version/src/game/nationEngine.test.ts" "佞臣_MuleRun Version/src/game/simulationRunner.test.ts"
git commit -m "feat: rebalance south growth and aftereffects"
```

### Task 4: Add External-Action Stage Hints To 冯道之锦囊

**Files:**
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣_MuleRun Version\src\game\externalActionHint.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣_MuleRun Version\src\game\roundIntelEngine.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣_MuleRun Version\src\game\roundIntelEngine.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣_MuleRun Version\src\components\RoundStart\RoundStart.tsx`

- [ ] **Step 1: Write the failing advisor-hint tests**

```ts
it('adds a stage hint when an external target is close to secession but lacks trust', () => {
    const hint = buildExternalActionStageHint({
        round: 7,
        npc: {
            id: 'hebabogui',
            trust: 61,
            loyaltyToCourt: 26,
            externalStatus: 'watchful',
            isAlive: true,
            powerBase: 'external',
            highActionBias: 'secession',
        },
        unlockedSecrets: 2,
        difficulty: 'normal',
    })

    expect(hint).toContain('养信')
    expect(hint).toContain('尚差信任')
})
```

- [ ] **Step 2: Run the failing tests**

Run:

```powershell
npm.cmd test -- src/game/roundIntelEngine.test.ts
```

Expected:

- `Cannot find module './externalActionHint'`

- [ ] **Step 3: Add a focused stage-hint helper instead of bloating `roundIntelEngine.ts`**

```ts
// src/game/externalActionHint.ts
export function buildExternalActionStageHint(input: {
    round: number
    npc: Pick<NPC, 'name' | 'powerBase' | 'externalStatus' | 'trust' | 'loyaltyToCourt' | 'highActionBias' | 'isAlive'>
    unlockedSecrets: number
    difficulty: GameDifficulty
}): string | null {
    if (!input.npc.isAlive || input.npc.powerBase !== 'external') return null

    const profile = getDifficultyProfile(input.difficulty)
    const secessionTrust = 72 + profile.externalThresholdOffset.trust
    const rebellionTrust = 85 + profile.externalThresholdOffset.trust

    if (input.npc.highActionBias === 'secession' && input.npc.trust < secessionTrust) {
        return `冯道之密语：${input.npc.name}眼下可先养信，尚差信任火候，未到明牌之时。`
    }
    if ((input.unlockedSecrets ?? 0) < 2) {
        return `冯道之密语：${input.npc.name}未露到底，先探暗线，再谈割据与举兵。`
    }

    return `冯道之密语：${input.npc.name}已近可用，静待窗口回合再逼其明牌。`
}
```

- [ ] **Step 4: Merge the stage hint into the existing round-start advisor line**

```ts
// src/game/roundIntelEngine.ts
export function getRoundAdvisorHint(
    round: number,
    npcs: HintNpc[],
    externalStageHint?: string | null,
): string {
    const baseHint = /* existing hint builder */
    return externalStageHint ? `${baseHint} ${externalStageHint}` : baseHint
}
```

- [ ] **Step 5: Feed the hint into the round-start card**

```tsx
// src/components/RoundStart/RoundStart.tsx
const externalStageHint = buildDominantExternalStageHint({
    round: currentRound,
    npcs,
    intelProgress,
    difficulty,
})

const advisorHint = getRoundAdvisorHint(currentRound, npcs, externalStageHint)
```

- [ ] **Step 6: Re-run the tests**

Run:

```powershell
npm.cmd test -- src/game/roundIntelEngine.test.ts
```

Expected:

- PASS

- [ ] **Step 7: Commit**

```powershell
git add "佞臣_MuleRun Version/src/game/externalActionHint.ts" "佞臣_MuleRun Version/src/game/roundIntelEngine.ts" "佞臣_MuleRun Version/src/game/roundIntelEngine.test.ts" "佞臣_MuleRun Version/src/components/RoundStart/RoundStart.tsx"
git commit -m "feat: add external action stage hints"
```

### Task 5: Add First-Time Omen Onboarding In The Scheme Phase

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣_MuleRun Version\src\game\types.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣_MuleRun Version\src\stores\gameStore.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣_MuleRun Version\src\stores\gameStore.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣_MuleRun Version\src\components\SchemePanel\SchemePanel.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣_MuleRun Version\src\components\SchemePanel\SchemePanel.css`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣_MuleRun Version\src\components\SchemePanel\SchemePanel.test.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣_MuleRun Version\src\data\prologueContent.ts`

- [ ] **Step 1: Write the failing onboarding tests**

```ts
it('shows the omen onboarding the first time round 13 enters scheme phase', () => {
    const store = useGameStore.getState()
    store.hydrateSnapshot({
        ...useGameStore.getState(),
        currentRound: 13,
        currentPhase: 'SCHEME_PHASE',
        omenGuideSeen: false,
    } as never)

    render(<SchemePanel />)
    expect(screen.getByText('谶纬不是普通献策')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the failing tests**

Run:

```powershell
npm.cmd test -- src/stores/gameStore.test.ts src/components/SchemePanel/SchemePanel.test.tsx
```

Expected:

- missing `omenGuideSeen`
- missing scheme-phase onboarding copy

- [ ] **Step 3: Add a persistent one-time omen-guide flag**

```ts
// src/game/types.ts
export interface OmenGuideSeenMap {
    first_omen_modal: boolean
}

// src/stores/gameStore.ts
const initialOmenGuideSeen = { first_omen_modal: false }

markOmenGuideSeen: () =>
    set(state => ({
        omenGuideSeen: {
            ...state.omenGuideSeen,
            first_omen_modal: true,
        },
    }))
```

- [ ] **Step 4: Show the modal only on the first eligible omen round**

```tsx
// src/components/SchemePanel/SchemePanel.tsx
const difficulty = useGameStore(state => state.difficulty)
const omenGuideSeen = useGameStore(state => state.omenGuideSeen)
const markOmenGuideSeen = useGameStore(state => state.markOmenGuideSeen)

const shouldShowOmenGuide =
    [13, 14, 19, 20].includes(currentRound)
    && getDifficultyProfile(difficulty).onboarding.showFullOmenGuide
    && !omenGuideSeen.first_omen_modal

{shouldShowOmenGuide && (
    <FirstRoundGuideModal
        title="谶纬入局"
        body={FIRST_ROUND_GUIDE_CONTENT.first_omen_modal.body}
        onClose={markOmenGuideSeen}
    />
)}
```

- [ ] **Step 5: Add a light inline reminder for later omen rounds**

```tsx
{[14, 19, 20].includes(currentRound) && (
    <div className="scheme-inline-hint omen-hint">
        谶纬偏灾异、法统、天命与人心，不宜写成兵粮调度。
    </div>
)}
```

- [ ] **Step 6: Re-run the tests**

Run:

```powershell
npm.cmd test -- src/stores/gameStore.test.ts src/components/SchemePanel/SchemePanel.test.tsx
```

Expected:

- PASS

- [ ] **Step 7: Commit**

```powershell
git add "佞臣_MuleRun Version/src/game/types.ts" "佞臣_MuleRun Version/src/stores/gameStore.ts" "佞臣_MuleRun Version/src/stores/gameStore.test.ts" "佞臣_MuleRun Version/src/components/SchemePanel/SchemePanel.tsx" "佞臣_MuleRun Version/src/components/SchemePanel/SchemePanel.css" "佞臣_MuleRun Version/src/components/SchemePanel/SchemePanel.test.tsx" "佞臣_MuleRun Version/src/data/prologueContent.ts"
git commit -m "feat: add omen onboarding to the scheme phase"
```

### Task 6: Full Verification And Balance Readout

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣_MuleRun Version\docs\superpowers\specs\2026-04-02-difficulty-and-balance-design.md`

- [ ] **Step 1: Run the targeted balance tests**

Run:

```powershell
npm.cmd test -- src/game/schemeEngine.test.ts src/game/nationEngine.test.ts src/game/roundIntelEngine.test.ts src/game/simulationRunner.test.ts src/stores/gameStore.test.ts src/components/Prologue/Prologue.test.tsx src/components/SchemePanel/SchemePanel.test.tsx
```

Expected:

- PASS

- [ ] **Step 2: Run the full suite**

Run:

```powershell
npm.cmd test
```

Expected:

- PASS

- [ ] **Step 3: Run the production build**

Run:

```powershell
npm.cmd run build
```

Expected:

- Vite build completes without type or bundle errors

- [ ] **Step 4: Update the spec with the final tuned values if implementation drifted**

```md
## Implemented values

- Normal `baseRate`: `0.56`
- Normal `probe`: `+0.11`
- Normal `advise`: `+0.09`
- South growth multiplier: `1.0`
- Normal policy aftereffect multiplier: `0.88`
```

- [ ] **Step 5: Commit**

```powershell
git add "佞臣_MuleRun Version/docs/superpowers/specs/2026-04-02-difficulty-and-balance-design.md"
git commit -m "docs: sync implemented difficulty tuning values"
```
