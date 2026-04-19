# Court Favor Disposal Chain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the old `disposalStage + anyone-with-enough-trust-can-be-the-knife` court disposal chain with a historically grounded `皇帝恩宠 / 太后眷顾 + 贺拔琪/宗艾收网` model that supports dismissal, execution, differentiated nation damage, and coherent UI/prompt text.

**Architecture:** Add a small pure domain layer for court disposition state, thresholds, labels, and penalty tables; add a separate pure engine layer for favor damage and `借刀` resolution; then rewire settlement, persistence, prompts, intel, endings, and UI to consume the new model. Keep the rest of the game architecture intact: schemes still parse through `schemeEngine`, round consequences still centralize in `roundSettlement`, and display surfaces still read from Zustand state.

**Tech Stack:** TypeScript, React, Zustand, Vitest, existing `schemeEngine` / `roundSettlement` / `saveEngine` / `CourtView` / `SchemePanel` pipelines.

---

## File Map

### New domain and resolution helpers
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\courtDisposition.ts`
  - Target/executor ids, threshold constants, seed values, labels, penalty tables, migration helpers.
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\courtDispositionEngine.ts`
  - Pure favor-hit rules for `谗言 / 离间 / 设局嫁祸 / 谶纬` and `借刀` resolution.
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\courtDisposition.test.ts`
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\courtDispositionEngine.test.ts`

### Core state and settlement
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\types.ts`
  - Add court-status/favor types, extend `NPC`, update `BorrowedBladeOutcome`, update `deathCause`.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\data\npcs.ts`
  - Seed the 4 court targets with initial `emperorFavor / empressDowagerFavor / courtStatus`.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\schemeEngine.ts`
  - Gate `proxy` so only 贺拔琪 / 宗艾 can actively use it; retain second-target structure.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\roundSettlement.ts`
  - Remove old stage advancement, apply court favor hits, resolve dismissal/execution, apply direct nation damage and faction penalty.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\stores\gameStore.ts`
  - Seed/hydrate state through the new court disposition helper so old saves and new rounds normalize correctly.

### Persistence, prompts, intel, endings
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\saveEngine.ts`
  - Migrate old saves into the new court-favor fields.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\roundIntelEngine.ts`
  - Replace old “已被盯上 / 已成可处置目标” hints with new favor-threshold language.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\npcPromptContext.ts`
  - Surface “御前失势 / 帘前眷顾将尽 / 两边俱裂” into dynamic context.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\endingEngine.ts`
  - Replace old borrowed-blade fate language with dismissal/execution outcomes.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\ai\fallback.ts`
  - Update fallback copy for `proxy` so it no longer describes generic “借刀杀人”.

### UI and teaching copy
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\components\CourtView\CourtView.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\components\CourtView\CourtView.css`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\components\SchemePanel\SchemePanel.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\components\SchemePanel\SchemePanel.css`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\components\NPCDetail\NPCDetail.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\components\NPCDetail\NPCDetail.css`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\data\schemes.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\data\prologueContent.ts`

### Existing tests to update
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\roundSettlement.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\saveEngine.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\roundIntelEngine.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\npcPromptContext.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\endingEngine.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\components\SchemePanel\SchemePanel.test.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\components\CourtView\CourtView.external-line.test.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\components\NPCDetail\NPCDetail.test.tsx`

### Legacy files to remove after migration
- Delete: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\borrowedBladeEngine.ts`
- Delete: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\borrowedBladeEngine.test.ts`

## Task 1: Add the new court disposition domain model

**Files:**
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\courtDisposition.ts`
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\courtDisposition.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\types.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\data\npcs.ts`

- [ ] **Step 1: Write the failing domain tests**

Create `src/game/courtDisposition.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { INITIAL_NPCS } from '../data/npcs'
import {
    COURT_DISPOSITION_DISMISS_THRESHOLD,
    COURT_DISPOSITION_EXECUTE_THRESHOLD,
    COURT_DISPOSITION_EXECUTOR_IDS,
    COURT_DISPOSITION_TARGET_IDS,
    getCourtDispositionOpportunity,
    isCourtDispositionExecutor,
    isCourtDispositionTarget,
} from './courtDisposition'

describe('courtDisposition domain model', () => {
    it('defines the four court targets and the two valid executors', () => {
        expect(COURT_DISPOSITION_TARGET_IDS).toEqual(['zuting', 'yuwendi', 'linghuelvguang', 'weichimù'])
        expect(COURT_DISPOSITION_EXECUTOR_IDS).toEqual(['hebaqí', 'zongai'])
        expect(isCourtDispositionTarget('hebaqí')).toBe(false)
        expect(isCourtDispositionExecutor('linghuelvguang')).toBe(false)
    })

    it('uses the shared 35 / 18 thresholds', () => {
        expect(COURT_DISPOSITION_DISMISS_THRESHOLD).toBe(35)
        expect(COURT_DISPOSITION_EXECUTE_THRESHOLD).toBe(18)
    })

    it('seeds the four target courtiers with favor values and active status', () => {
        const zuting = INITIAL_NPCS.find(npc => npc.name === '祖廷')!
        const yuwendi = INITIAL_NPCS.find(npc => npc.name === '宇文棣')!

        expect(zuting.emperorFavor).toBe(26)
        expect(zuting.empressDowagerFavor).toBe(82)
        expect(zuting.courtStatus).toBe('active')
        expect(yuwendi.emperorFavor).toBe(78)
        expect(yuwendi.empressDowagerFavor).toBe(22)
    })

    it('derives dismissible and executable states from both favor tracks', () => {
        expect(getCourtDispositionOpportunity({ emperorFavor: 52, empressDowagerFavor: 30 } as any)).toBe('safe')
        expect(getCourtDispositionOpportunity({ emperorFavor: 35, empressDowagerFavor: 35 } as any)).toBe('dismissible')
        expect(getCourtDispositionOpportunity({ emperorFavor: 18, empressDowagerFavor: 17 } as any)).toBe('executable')
    })
})
```

- [ ] **Step 2: Run the new test and confirm it fails**

Run:

```powershell
npm.cmd test -- src\game\courtDisposition.test.ts
```

Expected:
- FAIL because `courtDisposition.ts` does not exist and `NPC` does not yet carry the new favor/status fields.

- [ ] **Step 3: Add new types to `types.ts`**

Insert these definitions in `src/game/types.ts` near the existing NPC / borrowed-blade declarations:

```ts
export type CourtStatus = 'active' | 'dismissed' | 'executed'
export type CourtDispositionOpportunity = 'safe' | 'dismissible' | 'executable'
export type BorrowedBladeOutcome = 'failed' | 'pressure' | 'dismissed' | 'executed'

export interface CourtDispositionPenalty {
    nation: Partial<NationDimensions>
    faction: Partial<Record<CourtFactionId, {
        militaryPower: number
        courtInfluence: number
        internalStability: number
    }>>
}
```

Extend `NPC` with:

```ts
    emperorFavor?: number
    empressDowagerFavor?: number
    courtStatus?: CourtStatus
```

And change the death fields to:

```ts
    deathCause?: 'borrowed_blade' | 'court_execution' | null
```

- [ ] **Step 4: Create the pure court disposition helper**

Create `src/game/courtDisposition.ts`:

```ts
import type { CourtDispositionOpportunity, CourtDispositionPenalty, CourtStatus, NPC } from './types'

export const COURT_DISPOSITION_TARGET_IDS = ['zuting', 'yuwendi', 'linghuelvguang', 'weichimù'] as const
export const COURT_DISPOSITION_EXECUTOR_IDS = ['hebaqí', 'zongai'] as const
export const COURT_DISPOSITION_DISMISS_THRESHOLD = 35
export const COURT_DISPOSITION_EXECUTE_THRESHOLD = 18

export function isCourtDispositionTarget(npcId: string): boolean {
    return COURT_DISPOSITION_TARGET_IDS.includes(npcId as (typeof COURT_DISPOSITION_TARGET_IDS)[number])
}

export function isCourtDispositionExecutor(npcId: string): boolean {
    return COURT_DISPOSITION_EXECUTOR_IDS.includes(npcId as (typeof COURT_DISPOSITION_EXECUTOR_IDS)[number])
}

export function getCourtDispositionOpportunity(npc: Pick<NPC, 'emperorFavor' | 'empressDowagerFavor'>): CourtDispositionOpportunity {
    const emperorFavor = npc.emperorFavor ?? 100
    const empressDowagerFavor = npc.empressDowagerFavor ?? 100
    if (emperorFavor <= COURT_DISPOSITION_EXECUTE_THRESHOLD && empressDowagerFavor <= COURT_DISPOSITION_EXECUTE_THRESHOLD) {
        return 'executable'
    }
    if (emperorFavor <= COURT_DISPOSITION_DISMISS_THRESHOLD && empressDowagerFavor <= COURT_DISPOSITION_DISMISS_THRESHOLD) {
        return 'dismissible'
    }
    return 'safe'
}

export function getCourtStatusLabel(status: CourtStatus): string {
    if (status === 'dismissed') return '已被罢黜'
    if (status === 'executed') return '已被处决'
    return '在位'
}

export function seedCourtDispositionNpc(npc: NPC): NPC {
    if (!isCourtDispositionTarget(npc.id)) {
        return {
            ...npc,
            courtStatus: npc.courtStatus ?? 'active',
        }
    }

    const seeded = {
        zuting: { emperorFavor: 26, empressDowagerFavor: 82 },
        yuwendi: { emperorFavor: 78, empressDowagerFavor: 22 },
        linghuelvguang: { emperorFavor: 40, empressDowagerFavor: 74 },
        'weichimù': { emperorFavor: 72, empressDowagerFavor: 28 },
    } as const

    const favor = seeded[npc.id as keyof typeof seeded]
    return {
        ...npc,
        emperorFavor: npc.emperorFavor ?? favor.emperorFavor,
        empressDowagerFavor: npc.empressDowagerFavor ?? favor.empressDowagerFavor,
        courtStatus: npc.courtStatus ?? 'active',
    }
}

export const COURT_DISPOSITION_PENALTIES: Record<string, { dismissed: CourtDispositionPenalty; executed: CourtDispositionPenalty }> = {
    zuting: {
        dismissed: {
            nation: { finance: -2.0, grain: -1.4, military: -0.4, socialOrder: -0.9, governance: -2.5 },
            faction: { empress: { militaryPower: -0.8, courtInfluence: -3.0, internalStability: -2.2 } },
        },
        executed: {
            nation: { finance: -3.1, grain: -2.1, military: -0.7, socialOrder: -1.5, governance: -4.2 },
            faction: { empress: { militaryPower: -1.2, courtInfluence: -5.0, internalStability: -3.4 } },
        },
    },
    yuwendi: {
        dismissed: {
            nation: { finance: -0.6, grain: -0.8, military: -1.8, socialOrder: -1.0, governance: -1.2 },
            faction: { emperor: { militaryPower: -1.2, courtInfluence: -2.8, internalStability: -2.0 } },
        },
        executed: {
            nation: { finance: -1.0, grain: -1.2, military: -3.1, socialOrder: -1.8, governance: -1.8 },
            faction: { emperor: { militaryPower: -2.0, courtInfluence: -4.8, internalStability: -3.0 } },
        },
    },
    linghuelvguang: {
        dismissed: {
            nation: { finance: -0.8, grain: -1.0, military: -2.6, socialOrder: -1.0, governance: -1.2 },
            faction: { empress: { militaryPower: -2.6, courtInfluence: -2.4, internalStability: -1.8 } },
        },
        executed: {
            nation: { finance: -1.2, grain: -1.5, military: -4.2, socialOrder: -1.8, governance: -2.1 },
            faction: { empress: { militaryPower: -4.8, courtInfluence: -3.8, internalStability: -2.8 } },
        },
    },
    'weichimù': {
        dismissed: {
            nation: { finance: -0.7, grain: -0.9, military: -2.8, socialOrder: -1.2, governance: -1.0 },
            faction: { emperor: { militaryPower: -2.8, courtInfluence: -2.0, internalStability: -1.8 } },
        },
        executed: {
            nation: { finance: -1.0, grain: -1.4, military: -4.4, socialOrder: -2.0, governance: -1.8 },
            faction: { emperor: { militaryPower: -5.2, courtInfluence: -3.6, internalStability: -2.8 } },
        },
    },
}
```

- [ ] **Step 5: Seed the four targets in `data/npcs.ts`**

Update the 4 target NPC objects in `src/data/npcs.ts`:

```ts
        emperorFavor: 26,
        empressDowagerFavor: 82,
        courtStatus: 'active',
```

Use these values:

```ts
祖廷: 26 / 82
令狐律光: 40 / 74
宇文棣: 78 / 22
尉迟暮: 72 / 28
```

- [ ] **Step 6: Run the domain test again**

Run:

```powershell
npm.cmd test -- src\game\courtDisposition.test.ts
```

Expected:
- PASS

- [ ] **Step 7: Commit**

```powershell
git add src/game/types.ts src/data/npcs.ts src/game/courtDisposition.ts src/game/courtDisposition.test.ts
git commit -m "feat: add court favor disposition model"
```

## Task 2: Add a pure court disposition engine for favor hits and收网 resolution

**Files:**
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\courtDispositionEngine.ts`
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\courtDispositionEngine.test.ts`

- [ ] **Step 1: Write failing engine tests**

Create `src/game/courtDispositionEngine.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { NPC } from './types'
import {
    deriveCourtFavorHit,
    resolveCourtDispositionProxy,
} from './courtDispositionEngine'

const actor = (overrides: Partial<NPC>): NPC => ({
    id: 'yuwendi',
    name: '宇文棣',
    factionId: 'emperor',
    powerBase: 'court',
    title: '',
    publicPersona: '',
    publicStance: '',
    personality: '',
    softSpot: '',
    triggerPoint: '',
    schemeHooks: '',
    trust: 75,
    isAlive: true,
    canExecute: true,
    militaryPower: 20,
    loyaltyToCourt: 80,
    alignmentBias: 'emperor',
    externalStatus: 'loyal',
    availableSchemes: [],
    highRounds: [],
    secretThreads: [],
    courtStatus: 'active',
    ...overrides,
})

describe('courtDispositionEngine favor hits', () => {
    it('lets slander through an emperor-side listener reduce the target emperor favor only', () => {
        expect(
            deriveCourtFavorHit({
                schemeType: 'slander',
                actorNpc: actor({ factionId: 'emperor' }),
                targetNpc: actor({ id: 'zuting', name: '祖廷', emperorFavor: 40, empressDowagerFavor: 74 }),
                success: true,
                parse: { suspicionTransmission: 0.72, fractureTransmission: 0, legitimacyCrack: 0, omenPolarity: 'vague_or_ceremonial' } as any,
            }),
        ).toEqual({ emperorFavorDelta: -8, empressDowagerFavorDelta: 0 })
    })

    it('lets frame hit both favor tracks more strongly than omen', () => {
        expect(
            deriveCourtFavorHit({
                schemeType: 'frame',
                actorNpc: actor({ id: 'hebaqí', name: '贺拔琪', factionId: 'empress' }),
                targetNpc: actor({ id: 'zuting', name: '祖廷', emperorFavor: 40, empressDowagerFavor: 74 }),
                success: true,
                parse: { selfTrapPotential: 0.86, scapegoatClarity: 0.81, legitimacyCrack: 0, omenPolarity: 'vague_or_ceremonial' } as any,
            }),
        ).toEqual({ emperorFavorDelta: -7, empressDowagerFavorDelta: -7 })
    })
})

describe('courtDispositionEngine proxy resolution', () => {
    it('dismisses a target when both favor tracks are below 35', () => {
        const result = resolveCourtDispositionProxy({
            round: 10,
            executorNpc: actor({ id: 'hebaqí', name: '贺拔琪', factionId: 'empress', trust: 88 }),
            targetNpc: actor({ id: 'zuting', name: '祖廷', emperorFavor: 30, empressDowagerFavor: 32, courtStatus: 'active' }),
            success: true,
            parse: { proxyTransmission: 0.76 } as any,
        })

        expect(result?.outcome).toBe('dismissed')
        expect(result?.nextCourtStatus).toBe('dismissed')
        expect(result?.deathCause).toBeNull()
    })

    it('executes a target when both favor tracks are below 18', () => {
        const result = resolveCourtDispositionProxy({
            round: 12,
            executorNpc: actor({ id: 'zongai', name: '宗艾', factionId: 'emperor', trust: 86 }),
            targetNpc: actor({ id: 'weichimù', name: '尉迟暮', emperorFavor: 15, empressDowagerFavor: 16, courtStatus: 'active', militaryPower: 68 }),
            success: true,
            parse: { proxyTransmission: 0.84 } as any,
        })

        expect(result?.outcome).toBe('executed')
        expect(result?.nextCourtStatus).toBe('executed')
        expect(result?.deathCause).toBe('court_execution')
        expect((result?.nationPenalty.military ?? 0) < 0).toBe(true)
    })
})
```

- [ ] **Step 2: Run the new engine test and confirm it fails**

Run:

```powershell
npm.cmd test -- src\game\courtDispositionEngine.test.ts
```

Expected:
- FAIL because `courtDispositionEngine.ts` does not exist.

- [ ] **Step 3: Implement favor-hit rules**

Create `src/game/courtDispositionEngine.ts` with the favor-damage core:

```ts
import { COURT_DISPOSITION_PENALTIES, getCourtDispositionOpportunity, isCourtDispositionExecutor, isCourtDispositionTarget } from './courtDisposition'
import type { BorrowedBladeOutcome, CourtStatus, NPC, NorthSchemeParseResult, SchemeType } from './types'

export function deriveCourtFavorHit(params: {
    schemeType: SchemeType
    actorNpc: NPC
    targetNpc: NPC
    success: boolean
    parse: NorthSchemeParseResult
}): { emperorFavorDelta: number; empressDowagerFavorDelta: number } | null {
    if (!params.success || !isCourtDispositionTarget(params.targetNpc.id) || params.targetNpc.courtStatus !== 'active') {
        return null
    }

    if (params.schemeType === 'slander') {
        return params.actorNpc.factionId === 'emperor'
            ? { emperorFavorDelta: -8, empressDowagerFavorDelta: 0 }
            : params.actorNpc.factionId === 'empress'
                ? { emperorFavorDelta: 0, empressDowagerFavorDelta: -8 }
                : null
    }

    if (params.schemeType === 'alienate') {
        return params.actorNpc.factionId === 'emperor'
            ? { emperorFavorDelta: -12, empressDowagerFavorDelta: 0 }
            : params.actorNpc.factionId === 'empress'
                ? { emperorFavorDelta: 0, empressDowagerFavorDelta: -12 }
                : null
    }

    if (params.schemeType === 'frame' && Math.max(params.parse.selfTrapPotential ?? 0, params.parse.scapegoatClarity ?? 0) >= 0.58) {
        return { emperorFavorDelta: -7, empressDowagerFavorDelta: -7 }
    }

    if (
        params.schemeType === 'omen' &&
        params.parse.omenPolarity === 'destabilizing' &&
        (params.parse.legitimacyCrack ?? 0) >= 0.62
    ) {
        return { emperorFavorDelta: -5, empressDowagerFavorDelta: -6 }
    }

    return null
}
```

- [ ] **Step 4: Implement `借刀`收网 resolution**

Add this to `courtDispositionEngine.ts`:

```ts
export function resolveCourtDispositionProxy(params: {
    round: number
    executorNpc: NPC
    targetNpc: NPC
    success: boolean
    parse: NorthSchemeParseResult
}): {
    outcome: BorrowedBladeOutcome
    nextCourtStatus: CourtStatus
    nationPenalty: Partial<Record<'finance' | 'grain' | 'military' | 'socialOrder' | 'governance', number>>
    factionPenalty: Record<string, { militaryPower: number; courtInfluence: number; internalStability: number }>
    deathCause: 'court_execution' | null
    summary: string
} | null {
    if (!params.success || !isCourtDispositionExecutor(params.executorNpc.id) || !isCourtDispositionTarget(params.targetNpc.id)) {
        return null
    }

    const transmission = params.parse.proxyTransmission ?? 0
    if (params.executorNpc.trust < 70 || transmission < 0.34 || params.targetNpc.courtStatus !== 'active') {
        return {
            outcome: 'failed',
            nextCourtStatus: params.targetNpc.courtStatus ?? 'active',
            nationPenalty: {},
            factionPenalty: {},
            deathCause: null,
            summary: `${params.executorNpc.name}并未真正接下这手收网。`,
        }
    }

    const opportunity = getCourtDispositionOpportunity(params.targetNpc)
    if (opportunity === 'safe') {
        return {
            outcome: 'pressure',
            nextCourtStatus: 'active',
            nationPenalty: {},
            factionPenalty: {},
            deathCause: null,
            summary: `${params.executorNpc.name}虽肯听话，但眼下还不足以正式收网。`,
        }
    }

    const penalty = COURT_DISPOSITION_PENALTIES[params.targetNpc.id][opportunity === 'executable' ? 'executed' : 'dismissed']
    return {
        outcome: opportunity === 'executable' ? 'executed' : 'dismissed',
        nextCourtStatus: opportunity === 'executable' ? 'executed' : 'dismissed',
        nationPenalty: penalty.nation,
        factionPenalty: penalty.faction as Record<string, { militaryPower: number; courtInfluence: number; internalStability: number }>,
        deathCause: opportunity === 'executable' ? 'court_execution' : null,
        summary: opportunity === 'executable'
            ? `${params.executorNpc.name}顺势下了杀心，${params.targetNpc.name}被正式处决。`
            : `${params.executorNpc.name}借势发落，${params.targetNpc.name}被正式罢黜。`,
    }
}
```

- [ ] **Step 5: Run the engine test again**

Run:

```powershell
npm.cmd test -- src\game\courtDispositionEngine.test.ts
```

Expected:
- PASS

- [ ] **Step 6: Commit**

```powershell
git add src/game/courtDispositionEngine.ts src/game/courtDispositionEngine.test.ts
git commit -m "feat: add court favor resolution engine"
```

## Task 3: Rewire scheme availability and round settlement

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\schemeEngine.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\roundSettlement.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\roundSettlement.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\data\schemes.ts`

- [ ] **Step 1: Add failing integration tests to `roundSettlement.test.ts`**

Append these tests:

```ts
it('lets emperor-side slander lower the related target emperor favor', () => {
    const actor = INITIAL_NPCS.find(npc => npc.name === '宇文棣')!
    const target = INITIAL_NPCS.find(npc => npc.name === '祖廷')!

    const result = settleRound({
        round: 6,
        schemes: [{
            id: 'favor-slander',
            targetNpcId: actor.id,
            relatedNpcId: target.id,
            schemeType: 'slander',
            playerSpeech: '燕王当知，祖廷近日借后党名义卡饷权，其实正把持中枢。',
            resolutionRoll: 0.01,
        }],
        northStats: { ...NORTH_INITIAL },
        southStats: { ...SOUTH_INITIAL },
        npcs: INITIAL_NPCS.map(npc => ({ ...npc, trust: npc.id === actor.id ? 60 : npc.trust })),
        factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
        intelProgress: { [actor.id]: 1 },
        policyOptionIndex: null,
        policyReason: '',
    }) as any

    const updated = result.updatedNpcs.find((npc: any) => npc.id === target.id)
    expect(updated.emperorFavor).toBeLessThan(target.emperorFavor)
    expect(updated.empressDowagerFavor).toBe(target.empressDowagerFavor)
})

it('lets 贺拔琪 dismiss a court target once both favor tracks are below 35', () => {
    const hebaqi = INITIAL_NPCS.find(npc => npc.name === '贺拔琪')!
    const zuting = INITIAL_NPCS.find(npc => npc.name === '祖廷')!

    const result = settleRound({
        round: 10,
        schemes: [{
            id: 'proxy-dismiss',
            targetNpcId: hebaqi.id,
            relatedNpcId: zuting.id,
            schemeType: 'proxy',
            playerSpeech: '太后，此人两边俱失其主，正可乘势罢去其位。',
            resolutionRoll: 0.01,
            northParse: { proxyTransmission: 0.82, evidence: [] } as any,
        }],
        northStats: { ...NORTH_INITIAL },
        southStats: { ...SOUTH_INITIAL },
        npcs: INITIAL_NPCS.map(npc => {
            if (npc.id === hebaqi.id) return { ...npc, trust: 92 }
            if (npc.id === zuting.id) return { ...npc, emperorFavor: 30, empressDowagerFavor: 32, courtStatus: 'active' }
            return { ...npc }
        }),
        factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
        intelProgress: {},
        policyOptionIndex: null,
        policyReason: '',
    }) as any

    const updated = result.updatedNpcs.find((npc: any) => npc.id === zuting.id)
    expect(updated.courtStatus).toBe('dismissed')
    expect(updated.isAlive).toBe(true)
    expect(result.borrowedBladeReports?.[0]?.outcome).toBe('dismissed')
})

it('lets 宗艾 execute a court target once both favor tracks are below 18', () => {
    const zongai = INITIAL_NPCS.find(npc => npc.name === '宗艾')!
    const weichimu = INITIAL_NPCS.find(npc => npc.name === '尉迟暮')!

    const result = settleRound({
        round: 12,
        schemes: [{
            id: 'proxy-execute',
            targetNpcId: zongai.id,
            relatedNpcId: weichimu.id,
            schemeType: 'proxy',
            playerSpeech: '御前若此刻不先下手，留此人反倒成后患。',
            resolutionRoll: 0.01,
            northParse: { proxyTransmission: 0.84, evidence: [] } as any,
        }],
        northStats: { ...NORTH_INITIAL },
        southStats: { ...SOUTH_INITIAL },
        npcs: INITIAL_NPCS.map(npc => {
            if (npc.id === zongai.id) return { ...npc, trust: 88 }
            if (npc.id === weichimu.id) return { ...npc, emperorFavor: 15, empressDowagerFavor: 16, courtStatus: 'active' }
            return { ...npc }
        }),
        factions: INITIAL_FACTIONS.map(faction => ({ ...faction })),
        intelProgress: {},
        policyOptionIndex: null,
        policyReason: '',
    }) as any

    const updated = result.updatedNpcs.find((npc: any) => npc.id === weichimu.id)
    expect(updated.courtStatus).toBe('executed')
    expect(updated.isAlive).toBe(false)
    expect(updated.deathCause).toBe('court_execution')
    expect(result.borrowedBladeReports?.[0]?.outcome).toBe('executed')
})
```

- [ ] **Step 2: Run the new settlement tests and confirm failure**

Run:

```powershell
npm.cmd test -- src\game\roundSettlement.test.ts
```

Expected:
- FAIL because settlement still mutates `disposalStage` and `proxy` still resolves through the old borrowed-blade logic.

- [ ] **Step 3: Gate `proxy` in `schemeEngine.ts`**

Patch `getAvailableSchemesForNpc` in `src/game/schemeEngine.ts` so `proxy` only remains available for 贺拔琪 / 宗艾:

```ts
import { isCourtDispositionExecutor } from './courtDisposition'

export function getAvailableSchemesForNpc(
    npc: NPC,
    context: Partial<SchemeContext> = {},
): SchemeType[] {
    const { round = 1, unlockedSecrets = 0 } = context
    if (isTerminalExternalNpc(npc)) return []

    const base = getAvailableSchemesForTrust(npc.trust).filter(type => {
        if (npc.powerBase === 'external' && type === 'proxy') return false
        if (type === 'proxy' && !isCourtDispositionExecutor(npc.id)) return false
        return true
    })
    // keep the rest of the function unchanged
}
```

Update `src/data/schemes.ts`:

```ts
{
    type: 'proxy',
    name: '借刀',
    description: '借太后或御前之手，对双失其主的朝臣正式收网',
    trustThreshold: 70,
    riskLevel: 'extreme',
    needsSecondTarget: true,
}
```

- [ ] **Step 4: Replace old stage logic inside `roundSettlement.ts`**

Use the new engine in `src/game/roundSettlement.ts`:

```ts
import { seedCourtDispositionNpc, isCourtDispositionTarget } from './courtDisposition'
import { deriveCourtFavorHit, resolveCourtDispositionProxy } from './courtDispositionEngine'
```

Normalize NPCs at the start of settlement:

```ts
let updatedNpcs = params.npcs.map(npc => seedCourtDispositionNpc({ ...npc }))
```

Replace the four old stage-advance branches with this pattern:

```ts
        const courtFavorHit = deriveCourtFavorHit({
            schemeType: action.schemeType,
            actorNpc: targetNpc,
            targetNpc: relatedNpc ?? targetNpc,
            success: result.success,
            parse: result.northParse,
        })

        if (courtFavorHit) {
            const courtTarget = relatedNpc && isCourtDispositionTarget(relatedNpc.id) ? relatedNpc : targetNpc
            courtTarget.emperorFavor = clamp((courtTarget.emperorFavor ?? 100) + courtFavorHit.emperorFavorDelta)
            courtTarget.empressDowagerFavor = clamp((courtTarget.empressDowagerFavor ?? 100) + courtFavorHit.empressDowagerFavorDelta)
        }
```

Replace the `proxy` branch with:

```ts
        if (action.schemeType === 'proxy' && relatedNpc) {
            const proxyResolution = resolveCourtDispositionProxy({
                round,
                executorNpc: targetNpc,
                targetNpc: relatedNpc,
                success: result.success,
                parse: result.northParse,
            })

            if (proxyResolution) {
                relatedNpc.courtStatus = proxyResolution.nextCourtStatus
                if (proxyResolution.nextCourtStatus === 'dismissed') {
                    relatedNpc.availableSchemes = []
                }
                if (proxyResolution.nextCourtStatus === 'executed') {
                    relatedNpc.isAlive = false
                    relatedNpc.militaryPower = 0
                    relatedNpc.deathCause = proxyResolution.deathCause
                }
                northStats = applyDimensionChanges(northStats, proxyResolution.nationPenalty)
                factionsAfter = applyFactionEffects(factionsAfter, proxyResolution.factionPenalty as any)
                borrowedBladeReports.push({
                    actorNpcId: targetNpc.id,
                    actorNpcName: targetNpc.name,
                    targetNpcId: relatedNpc.id,
                    targetNpcName: relatedNpc.name,
                    outcome: proxyResolution.outcome,
                    summary: proxyResolution.summary,
                })
            }
        }
```

- [ ] **Step 5: Run the targeted tests again**

Run:

```powershell
npm.cmd test -- src\game\courtDispositionEngine.test.ts src\game\roundSettlement.test.ts
```

Expected:
- PASS

- [ ] **Step 6: Commit**

```powershell
git add src/game/schemeEngine.ts src/data/schemes.ts src/game/roundSettlement.ts src/game/roundSettlement.test.ts
git commit -m "feat: rewire court disposition settlement"
```

## Task 4: Migrate saves, intel, prompt context, and ending semantics

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\saveEngine.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\stores\gameStore.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\roundIntelEngine.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\npcPromptContext.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\endingEngine.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\ai\fallback.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\saveEngine.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\roundIntelEngine.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\npcPromptContext.test.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\endingEngine.test.ts`

- [ ] **Step 1: Add failing migration and text tests**

Add the following cases:

```ts
// saveEngine.test.ts
it('hydrates missing court favor fields when loading an older snapshot', () => {
    const localStorage = createLocalStorageMock()
    vi.stubGlobal('localStorage', localStorage)
    localStorage.setItem('ningchen-save-v1', JSON.stringify({
        ...createBaseState(),
        version: 1,
        prologueStep: 'INGAME',
        npcs: INITIAL_NPCS.map(npc => ({ ...npc, emperorFavor: undefined, empressDowagerFavor: undefined, courtStatus: undefined })),
    }))

    const migrated = loadGameSnapshot()
    const zuting = migrated?.npcs.find(npc => npc.name === '祖廷')
    expect(zuting?.emperorFavor).toBe(26)
    expect(zuting?.courtStatus).toBe('active')
})

// roundIntelEngine.test.ts
it('builds a favor-based advisor hint instead of old disposal-stage wording', () => {
    const hint = buildBorrowedBladeAdvisorHint([
        { ...INITIAL_NPCS.find(npc => npc.name === '祖廷')!, emperorFavor: 18, empressDowagerFavor: 16, courtStatus: 'active' },
    ] as any)

    expect(hint).toContain('两边庇护俱裂')
    expect(hint).not.toContain('已被盯上')
})

// npcPromptContext.test.ts
it('mentions ruler favor deterioration when a court target is near dismissal', () => {
    const npc = { ...INITIAL_NPCS.find(item => item.name === '祖廷')!, emperorFavor: 28, empressDowagerFavor: 30 }
    const context = buildNpcPromptDynamicContext({ npc, factions: INITIAL_FACTIONS, roundHistory: [] })
    expect(context.recentCourtFortune).toContain('御前')
})

// endingEngine.test.ts
it('describes court execution without reusing old borrowed-blade phrasing', () => {
    const report = buildEndingReport({
        gameResult: 'VICTORY',
        currentRound: 20,
        northPower: 40,
        southPower: 55,
        npcs: INITIAL_NPCS.map(npc => npc.name === '祖廷' ? { ...npc, isAlive: false, courtStatus: 'executed', deathCause: 'court_execution' } : npc),
        factions: INITIAL_FACTIONS,
        intelProgress: {},
        lastSettlement: null,
    })

    expect(report.npcFates.some(item => item.summary.includes('已被处决'))).toBe(true)
    expect(report.npcFates.some(item => item.summary.includes('借刀之局'))).toBe(false)
})
```

- [ ] **Step 2: Run these tests and confirm they fail**

Run:

```powershell
npm.cmd test -- src\game\saveEngine.test.ts src\game\roundIntelEngine.test.ts src\game\npcPromptContext.test.ts src\game\endingEngine.test.ts
```

Expected:
- FAIL because the old save normalization, hint copy, and ending text still use the previous model.

- [ ] **Step 3: Add migration and state normalization**

Patch `src/game/saveEngine.ts`:

```ts
import { seedCourtDispositionNpc } from './courtDisposition'

function normalizeLoadedNpcs(npcs: NPC[]): NPC[] {
    return npcs.map(npc => seedCourtDispositionNpc({
        ...npc,
        courtStatus: npc.courtStatus ?? 'active',
    }))
}
```

Use it in `loadGameSnapshot()`:

```ts
        return {
            ...parsed,
            npcs: normalizeLoadedNpcs(parsed.npcs ?? []),
            npcMemoryLedger: parsed.npcMemoryLedger ?? {},
        }
```

And in `src/stores/gameStore.ts`, normalize both initial state and hydrated snapshots with `seedCourtDispositionNpc`.

- [ ] **Step 4: Replace old borrowed-blade hint/copy surfaces**

Update `src/game/roundIntelEngine.ts`:

```ts
import { getCourtDispositionOpportunity, isCourtDispositionTarget } from './courtDisposition'

export function buildBorrowedBladeAdvisorHint(npcs: NPC[]): string | null {
    const actionable = npcs
        .filter(npc => npc.isAlive && isCourtDispositionTarget(npc.id) && npc.courtStatus === 'active')
        .map(npc => ({ npc, opportunity: getCourtDispositionOpportunity(npc) }))
        .find(item => item.opportunity === 'executable')
        ?? npcs
            .filter(npc => npc.isAlive && isCourtDispositionTarget(npc.id) && npc.courtStatus === 'active')
            .map(npc => ({ npc, opportunity: getCourtDispositionOpportunity(npc) }))
            .find(item => item.opportunity === 'dismissible')

    if (!actionable) return null
    return actionable.opportunity === 'executable'
        ? `另有一人两边庇护俱裂，可图重手：${actionable.npc.name}。`
        : `另有一人已近双失其主，可图罢黜：${actionable.npc.name}。`
}
```

Update `src/game/npcPromptContext.ts`:

```ts
    if (npc.powerBase === 'court' && npc.courtStatus === 'active' && npc.emperorFavor !== undefined && npc.empressDowagerFavor !== undefined) {
        if (npc.emperorFavor <= 18 && npc.empressDowagerFavor <= 18) {
            return `${npc.name}近来已到两边都不愿保的地步，言行间难免露出穷途之气。`
        }
        if (npc.emperorFavor <= 35 && npc.empressDowagerFavor <= 35) {
            return `${npc.name}近来御前恩宠与帘前眷顾都在往下掉，说话时比往日更怕失足。`
        }
        if (npc.emperorFavor <= 35) {
            return `${npc.name}近来御前恩宠已薄，许多话都不敢再像从前那样说满。`
        }
        if (npc.empressDowagerFavor <= 35) {
            return `${npc.name}近来帘前眷顾将尽，格外在意太后与后党的脸色。`
        }
    }
```

Update `src/game/endingEngine.ts` and `src/ai/fallback.ts` so `dismissed / executed / court_execution` use new wording and do not mention old disposal stages or “借刀杀人”.

- [ ] **Step 5: Run the migration/text suite again**

Run:

```powershell
npm.cmd test -- src\game\saveEngine.test.ts src\game\roundIntelEngine.test.ts src\game\npcPromptContext.test.ts src\game\endingEngine.test.ts
```

Expected:
- PASS

- [ ] **Step 6: Commit**

```powershell
git add src/game/saveEngine.ts src/stores/gameStore.ts src/game/roundIntelEngine.ts src/game/npcPromptContext.ts src/game/endingEngine.ts src/ai/fallback.ts src/game/saveEngine.test.ts src/game/roundIntelEngine.test.ts src/game/npcPromptContext.test.ts src/game/endingEngine.test.ts
git commit -m "feat: migrate court disposition text and save semantics"
```

## Task 5: Update UI, onboarding copy, and remove legacy borrowed-blade artifacts

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\components\CourtView\CourtView.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\components\CourtView\CourtView.css`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\components\SchemePanel\SchemePanel.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\components\SchemePanel\SchemePanel.css`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\components\NPCDetail\NPCDetail.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\components\NPCDetail\NPCDetail.css`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\data\prologueContent.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\components\SchemePanel\SchemePanel.test.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\components\CourtView\CourtView.external-line.test.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\components\NPCDetail\NPCDetail.test.tsx`
- Delete: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\borrowedBladeEngine.ts`
- Delete: `C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\borrowedBladeEngine.test.ts`

- [ ] **Step 1: Add failing UI tests**

Add/adjust these expectations:

```ts
// SchemePanel.test.tsx
it('shows proxy as locked on non-executor court NPCs', () => {
    expect(getSchemeUnlockHint({
        schemeType: 'proxy',
        npc: INITIAL_NPCS.find(npc => npc.name === '令狐律光')!,
        round: 8,
        unlockedSecrets: 2,
    })).toContain('借刀只能借太后或御前之手')
})

// NPCDetail.test.tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { NPCDetail } from './NPCDetail'
import { useGameStore } from '../../stores/gameStore'
import { useUiStore } from '../../stores/uiStore'

function renderNpcDetailMarkup(npc: NPC) {
    useGameStore.getState().resetGame()
    useGameStore.setState({
        currentRound: 8,
        npcs: INITIAL_NPCS.map(item => item.id === npc.id ? npc : item),
    })
    useUiStore.setState({
        showNpcDetail: true,
        detailNpcId: npc.id,
    })
    return renderToStaticMarkup(<NPCDetail />)
}

it('renders emperor favor and empress dowager favor for court disposition targets', () => {
    const markup = renderNpcDetailMarkup({ ...INITIAL_NPCS.find(npc => npc.name === '祖廷')!, emperorFavor: 26, empressDowagerFavor: 82 })
    expect(markup).toContain('皇帝恩宠')
    expect(markup).toContain('太后眷顾')
})

// CourtView.external-line.test.tsx
it('marks dismissed or executed court targets as terminal cards with no reaction text', () => {
    expect(courtViewSource).toContain("npc.courtStatus === 'active' && (")
    expect(courtViewSource).toContain("npc.courtStatus !== 'active'")
    expect(courtViewSource).toContain("getCourtStatusLabel(npc.courtStatus!)")
})
```

- [ ] **Step 2: Run the UI tests and confirm failure**

Run:

```powershell
npm.cmd test -- src\components\SchemePanel\SchemePanel.test.tsx src\components\NPCDetail\NPCDetail.test.tsx src\components\CourtView\CourtView.external-line.test.tsx
```

Expected:
- FAIL because the current UI has no favor bars/statuses and still speaks the old proxy language.

- [ ] **Step 3: Add the new court-favor UI**

Update `src/components/CourtView/CourtView.tsx`:

```tsx
import { getCourtDispositionOpportunity, getCourtStatusLabel, isCourtDispositionTarget } from '../../game/courtDisposition'

{isCourtDispositionTarget(npc.id) && npc.courtStatus === 'active' && (
    <div className="npc-favor-row">
        <span className="npc-meta-chip">皇帝恩宠 {npc.emperorFavor}</span>
        <span className="npc-meta-chip">太后眷顾 {npc.empressDowagerFavor}</span>
        {getCourtDispositionOpportunity(npc) === 'dismissible' && <span className="npc-meta-chip npc-meta-chip-warning">可罢黜</span>}
        {getCourtDispositionOpportunity(npc) === 'executable' && <span className="npc-meta-chip npc-meta-chip-danger">可处决</span>}
    </div>
)}
{isCourtDispositionTarget(npc.id) && npc.courtStatus !== 'active' && (
    <div className="npc-dead-overlay">{getCourtStatusLabel(npc.courtStatus!)}</div>
)}
```

Update `src/components/NPCDetail/NPCDetail.tsx`:

```tsx
{isCourtDispositionTarget(npc.id) && (
    <div className="npc-detail-section">
        <h4>宫中风向</h4>
        <div className="detail-metrics">
            <span className="metric-chip">皇帝恩宠 {npc.emperorFavor}</span>
            <span className="metric-chip">太后眷顾 {npc.empressDowagerFavor}</span>
            <span className="metric-chip">{getCourtStatusLabel(npc.courtStatus ?? 'active')}</span>
        </div>
    </div>
)}
```

Update `src/components/SchemePanel/SchemePanel.tsx`:

```ts
import { isCourtDispositionExecutor, isCourtDispositionTarget, getCourtDispositionOpportunity } from '../../game/courtDisposition'

if (schemeType === 'proxy' && !isCourtDispositionExecutor(npc.id)) {
    return '未解锁：借刀只能借太后或御前之手'
}
```

Filter the `relatedNpc` picker for `proxy`:

```ts
const relatedNpcCandidates = selectedScheme === 'proxy'
    ? aliveNpcs.filter(npc => isCourtDispositionTarget(npc.id) && npc.courtStatus === 'active')
    : aliveNpcs.filter(npc => npc.id !== selectedNpcId)
```

Update onboarding copy in `src/data/prologueContent.ts`:

```ts
'借刀：收网。借太后或御前之手，对已同时失去皇帝恩宠与太后眷顾的朝臣正式收网。双边都低到阈值 A 可罢黜，低到阈值 B 可处决。'
```

- [ ] **Step 4: Delete the legacy borrowed-blade engine once imports are gone**

Run:

```powershell
rg -n "borrowedBladeEngine" src
```

Expected before deletion:
- No remaining runtime imports.

Then remove:

```powershell
Remove-Item -LiteralPath "C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\borrowedBladeEngine.ts"
Remove-Item -LiteralPath "C:\Users\happyelements\Desktop\佞臣 Demo\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3\src\game\borrowedBladeEngine.test.ts"
```

- [ ] **Step 5: Run the UI, build, and regression suite**

Run:

```powershell
npm.cmd test -- src\game\courtDisposition.test.ts src\game\courtDispositionEngine.test.ts src\game\roundSettlement.test.ts src\game\saveEngine.test.ts src\game\roundIntelEngine.test.ts src\game\npcPromptContext.test.ts src\game\endingEngine.test.ts src\components\SchemePanel\SchemePanel.test.tsx src\components\CourtView\CourtView.external-line.test.tsx src\components\NPCDetail\NPCDetail.test.tsx
npm.cmd run build
```

Expected:
- All listed tests PASS
- `build` succeeds with no remaining import errors from `borrowedBladeEngine.ts`

- [ ] **Step 6: Commit**

```powershell
git add src/components/CourtView/CourtView.tsx src/components/CourtView/CourtView.css src/components/SchemePanel/SchemePanel.tsx src/components/SchemePanel/SchemePanel.css src/components/NPCDetail/NPCDetail.tsx src/components/NPCDetail/NPCDetail.css src/data/prologueContent.ts src/components/SchemePanel/SchemePanel.test.tsx src/components/CourtView/CourtView.external-line.test.tsx src/components/NPCDetail/NPCDetail.test.tsx src/game/courtDisposition.ts src/game/courtDispositionEngine.ts src/game/roundSettlement.ts src/game/roundIntelEngine.ts src/game/npcPromptContext.ts src/game/endingEngine.ts src/game/saveEngine.ts src/stores/gameStore.ts src/ai/fallback.ts src/data/schemes.ts src/data/npcs.ts src/game/types.ts
git add -u
git commit -m "feat: ship court favor disposal chain"
```

## Task 6: Final verification and artifact check

**Files:**
- Verify only; no planned code changes unless regressions appear.

- [ ] **Step 1: Run the full test suite**

Run:

```powershell
npm.cmd test
```

Expected:
- Full Vitest suite passes.

- [ ] **Step 2: Run the production build**

Run:

```powershell
npm.cmd run build
```

Expected:
- Build succeeds.

- [ ] **Step 3: Search for stale stage-language**

Run:

```powershell
rg -n "disposalStage|已被盯上|已被孤立|已成可处置目标|借刀杀人" src
```

Expected:
- No runtime source hits except intentionally retained historical test fixtures that are being deleted in this plan.

- [ ] **Step 4: Search for stale executor logic**

Run:

```powershell
rg -n "canExecute \\|\\| npc\\.militaryPower|actorReady|killReady" src\game
```

Expected:
- No remaining court-disposition resolution code should rely on the old “trust + canExecute / militaryPower” borrowed-blade model.

- [ ] **Step 5: Commit any regression-only cleanup**

```powershell
git add -A
git commit -m "test: finalize court favor disposal migration"
```

## Self-Review

- Spec coverage check:
  - Dual favor axes: Task 1
  - `贺拔琪 / 宗艾` as sole `借刀` executors: Tasks 2 and 3
  - `谗言 / 离间 / 设局嫁祸 / 谶纬` favor effects: Tasks 2 and 3
  - `已被罢黜 / 已被处决` terminal states: Tasks 1, 3, and 5
  - Stronger differentiated nation damage + faction penalty: Tasks 1 and 3
  - Prompt/intel/ending text migration: Task 4
  - UI and onboarding migration: Task 5
  - Legacy borrowed-blade removal: Task 5 and Task 6
- Placeholder scan:
  - No `TODO / TBD / implement later` markers remain.
- Type consistency:
  - Plan consistently uses `emperorFavor`, `empressDowagerFavor`, `courtStatus`, `dismissed`, `executed`.
- Explicit non-goal:
  - This plan does **not** implement the future “谶纬回响 = 目标反应 + 朝议回响” presentation layer.
