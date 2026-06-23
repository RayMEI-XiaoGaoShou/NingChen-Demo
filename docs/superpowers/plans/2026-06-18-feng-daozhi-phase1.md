# Feng Daozhi Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Phase 1 reusable Feng Daozhi dialogue carrier, per-round advisor kit trigger, seen-state persistence, and Gameplay Guide summary module.

**Architecture:** Add one reusable dialogue overlay component that renders queued Feng Daozhi dialogue sequences. Keep copy/data preparation separate from UI: pure game helpers build first-round sequences and per-round advisor kits, React pages only decide when to show them and which seen keys to mark. Store a generic Feng Daozhi guide seen map in the existing game store and persisted snapshot so round kits do not reuse older first-round-only state.

**Tech Stack:** React 18, TypeScript, Zustand, Vite, Vitest, existing CSS modules by component folder, existing `react-dom/server` and source-contract test style.

---

## Source Context

- Current requirement doc: `docs/feng-daozhi-guide-ux-requirements.md`
- Current copy bank: `docs/feng-daozhi-first-round-omen-copy.md`
- Current audit: `docs/feng-daozhi-guide-kit-audit.md`
- Current first-round modal: `NingChenv4/src/components/FirstRoundGuide/FirstRoundGuideModal.tsx`
- Current court overview entry page: `NingChenv4/src/components/CourtView/CourtView.tsx`
- Current gameplay guide overlay: `NingChenv4/src/components/GameplayGuide/GameplayGuide.tsx`
- Current guide copy source: `NingChenv4/src/data/prologueContent.ts`
- Current round court-intel source: `NingChenv4/src/data/roundIntel.ts`
- Current external-line source: `NingChenv4/src/game/externalLineProgress.ts`
- Current Feng Daozhi portrait asset: `SCHEME_UI_ASSETS.fengDaozhiAssistPortrait`

## Phase 1 Scope

In scope:

- `FengDaozhiDialogueOverlay` component with dark page overlay, Feng Daozhi portrait at lower left, dialogue panel at lower right, click/touch/Space/Enter advancement, typewriter effect, reduced-motion support, and restrained skip.
- Generic dialogue sequence data shape with `portrait`, `mood`, `segmentLabel`, and optional `voiceAssetId` / `audioKey`.
- First-round guide adapter that can reuse current `FIRST_ROUND_GUIDE_CONTENT` as temporary content until optimized Feng Daozhi copy lands.
- Per-round advisor kit builder:
  - court block uses preset round core NPCs from `ROUND_INTEL`.
  - external block ranks live external warlord progress through `buildExternalLineProgress`.
  - summary only points out key people, split by court and external.
- New persisted seen map for Feng Daozhi dialogue/kit keys.
- CourtView overview trigger: first entry to overview per round shows the round kit once.
- Gameplay Guide overlay module: after a kit is seen, show current round key-person summary only; no replay button.
- Replace visible first-round center modal usages with the new overlay while keeping old files until references are gone.

Out of scope:

- Final rewritten Feng Daozhi prose.
- AIART portrait variant generation and background removal.
- Full Feng Daozhi voice playback.
- Deleting `FirstRoundGuideModal` and its CSS.
- Browser screenshot QA; keep this for implementation verification after code exists.

## File Structure

Create:

- `NingChenv4/src/game/fengDaozhiGuide.ts`
  - Owns dialogue sequence types that are not global game-domain types.
  - Builds seen keys.
  - Adapts first-round copy into dialogue sequences.
  - Builds per-round advisor kits from current state.
  - Builds CourtView overview queue.
- `NingChenv4/src/game/fengDaozhiGuide.test.ts`
  - Pure tests for seen keys, court/external key-person summary, queue priority, and no-repeat behavior.
- `NingChenv4/src/game/fengDaozhiDialoguePlayer.ts`
  - Pure state helpers for typewriter and line advancement.
- `NingChenv4/src/game/fengDaozhiDialoguePlayer.test.ts`
  - Tests click-to-complete-current-line, click-to-next-line, final close, and skip behavior.
- `NingChenv4/src/components/FengDaozhiDialogue/FengDaozhiDialogueOverlay.tsx`
  - Reusable React overlay component.
- `NingChenv4/src/components/FengDaozhiDialogue/FengDaozhiDialogueOverlay.css`
  - Dialogue-layer styling and responsive layout.
- `NingChenv4/src/components/FengDaozhiDialogue/FengDaozhiDialogueOverlay.test.tsx`
  - Source/SSR contract tests for portal, portrait asset, accessibility labels, segment label, and interaction wiring.

Modify:

- `NingChenv4/src/game/types.ts`
  - Add `FengDaozhiGuideSeenMap`.
- `NingChenv4/src/game/saveEngine.ts`
  - Persist and hydrate `fengDaozhiGuideSeen`.
- `NingChenv4/src/game/saveEngine.test.ts`
  - Cover persistence and legacy-save defaulting.
- `NingChenv4/src/stores/gameStore.ts`
  - Add `fengDaozhiGuideSeen`, `markFengDaozhiGuideSeen`, `markFengDaozhiGuideSeenMany`.
- `NingChenv4/src/stores/gameStore.test.ts`
  - Cover marking one key and multiple keys.
- `NingChenv4/src/components/RoundStart/RoundStart.tsx`
  - Replace first-round center modal with new dialogue overlay.
- `NingChenv4/src/components/CourtView/CourtView.tsx`
  - Replace first-round center modal.
  - Add CourtView overview queue and per-round kit trigger.
- `NingChenv4/src/components/EmpressLetter/EmpressLetter.tsx`
  - Replace first-round center modal.
- `NingChenv4/src/components/SchemeFeedback/SchemeFeedback.tsx`
  - Replace first-round center modal.
- `NingChenv4/src/components/Settlement/Settlement.tsx`
  - Replace first-round center modal.
- `NingChenv4/src/components/GameplayGuide/GameplayGuide.tsx`
  - Render the current round Feng Daozhi kit summary in overlay mode after it has been seen.
- `NingChenv4/src/components/GameplayGuide/GameplayGuide.css`
  - Add compact summary module styling.
- `NingChenv4/src/components/CourtView/CourtView.external-line.test.tsx`
  - Add CourtView source/SSR assertions for queue and round-kit trigger.
- `NingChenv4/src/components/GameplayGuide/GameplayGuide.test.tsx`
  - Add summary module tests.
- `NingChenv4/src/components/FirstRoundGuide/FirstRoundGuideModal.test.ts`
  - Update expectation to record that old modal remains but is no longer imported by active pages.

---

### Task 1: Add Feng Daozhi Guide Data And Advisor Kit Builder

**Files:**

- Create: `NingChenv4/src/game/fengDaozhiGuide.ts`
- Create: `NingChenv4/src/game/fengDaozhiGuide.test.ts`

- [ ] **Step 1: Write failing tests for keys, summary, and queue priority**

Create `NingChenv4/src/game/fengDaozhiGuide.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { INITIAL_NPCS } from '../data/npcs'
import {
    buildCourtOverviewFengDaozhiQueue,
    buildFengDaozhiAdvisorKit,
    buildFirstRoundGuideSequence,
    getFengDaozhiAdvisorKitSeenKey,
} from './fengDaozhiGuide'

const initialIntelProgress = Object.fromEntries(INITIAL_NPCS.map(npc => [npc.id, 0]))

describe('fengDaozhiGuide', () => {
    it('builds stable per-round advisor kit seen keys', () => {
        expect(getFengDaozhiAdvisorKitSeenKey(1)).toBe('round:1:advisor_kit:v1')
        expect(getFengDaozhiAdvisorKitSeenKey(12)).toBe('round:12:advisor_kit:v1')
    })

    it('builds a court/external split advisor kit with key people summaries', () => {
        const kit = buildFengDaozhiAdvisorKit({
            round: 5,
            npcs: INITIAL_NPCS,
            intelProgress: {
                ...initialIntelProgress,
                hebaboguì: 1,
                duguwenyue: 1,
            },
            difficulty: 'normal',
        })

        expect(kit.key).toBe('round:5:advisor_kit:v1')
        expect(kit.title).toContain('冯道之锦囊')
        expect(kit.court.keyNpcNames).toEqual(expect.arrayContaining(['祖廷', '宇文棣']))
        expect(kit.court.summary).toContain('朝堂势力')
        expect(kit.external.summary).toContain('地方军头')
        expect(kit.lines.map(line => line.segmentLabel)).toEqual(expect.arrayContaining(['朝堂势力', '地方军头']))
    })

    it('queues first-round guide before the per-round advisor kit on CourtView overview', () => {
        const firstRoundGuide = buildFirstRoundGuideSequence('court_observe')
        const kit = buildFengDaozhiAdvisorKit({
            round: 1,
            npcs: INITIAL_NPCS,
            intelProgress: initialIntelProgress,
            difficulty: 'normal',
        })

        const queue = buildCourtOverviewFengDaozhiQueue({
            firstRoundGuide,
            advisorKit: kit,
            firstRoundGuideSeen: false,
            advisorKitSeen: false,
        })

        expect(queue.map(item => item.key)).toEqual(['first-round:court_observe:v1', 'round:1:advisor_kit:v1'])
    })

    it('omits already seen queue items', () => {
        const firstRoundGuide = buildFirstRoundGuideSequence('court_observe')
        const kit = buildFengDaozhiAdvisorKit({
            round: 1,
            npcs: INITIAL_NPCS,
            intelProgress: initialIntelProgress,
            difficulty: 'normal',
        })

        const queue = buildCourtOverviewFengDaozhiQueue({
            firstRoundGuide,
            advisorKit: kit,
            firstRoundGuideSeen: true,
            advisorKitSeen: false,
        })

        expect(queue.map(item => item.key)).toEqual(['round:1:advisor_kit:v1'])
    })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run from `NingChenv4`:

```bash
npm test -- src/game/fengDaozhiGuide.test.ts
```

Expected: FAIL because `src/game/fengDaozhiGuide.ts` does not exist.

- [ ] **Step 3: Implement the guide data builder**

Create `NingChenv4/src/game/fengDaozhiGuide.ts`:

```ts
import { FIRST_ROUND_GUIDE_CONTENT } from '../data/prologueContent'
import { getRoundIntel } from '../data/roundIntel'
import { roundSupportsExternalAction } from '../data/roundRuleConfig'
import { buildExternalLineProgress, type ExternalLineProgress } from './externalLineProgress'
import { isExternalTerminalStatus } from './externalStatus'
import { getHighlightedNpcIds } from './roundIntelEngine'
import type { FirstRoundGuideKey, GameDifficulty, NPC } from './types'

export type FengDaozhiDialoguePortrait = 'default' | 'thinking' | 'warning' | 'stern' | 'soft'
export type FengDaozhiDialogueMood = 'calm' | 'advising' | 'warning' | 'urgent'
export type FengDaozhiDialogueSegment = '首回合引导' | '谶纬引导' | '朝堂势力' | '地方军头'

export interface FengDaozhiDialogueLine {
    id?: string
    text: string
    portrait?: FengDaozhiDialoguePortrait
    mood?: FengDaozhiDialogueMood
    segmentLabel?: FengDaozhiDialogueSegment
    voiceAssetId?: string
    audioKey?: string
}

export interface FengDaozhiDialogueSequence {
    key: string
    title: string
    lines: FengDaozhiDialogueLine[]
    version: number
    summary?: string
}

export interface FengDaozhiAdvisorKitSection {
    keyNpcIds: string[]
    keyNpcNames: string[]
    summary: string
    lines: FengDaozhiDialogueLine[]
}

export interface FengDaozhiAdvisorKit extends FengDaozhiDialogueSequence {
    round: number
    court: FengDaozhiAdvisorKitSection
    external: FengDaozhiAdvisorKitSection
}

const GUIDE_VERSION = 1

export function getFengDaozhiAdvisorKitSeenKey(round: number): string {
    return `round:${round}:advisor_kit:v${GUIDE_VERSION}`
}

export function getFirstRoundGuideSeenKey(key: FirstRoundGuideKey): string {
    return `first-round:${key}:v${GUIDE_VERSION}`
}

export function buildFirstRoundGuideSequence(key: FirstRoundGuideKey): FengDaozhiDialogueSequence {
    const content = FIRST_ROUND_GUIDE_CONTENT[key]
    return {
        key: getFirstRoundGuideSeenKey(key),
        title: content.title,
        version: GUIDE_VERSION,
        lines: content.body.map((text, index) => ({
            id: `${key}-${index + 1}`,
            text,
            segmentLabel: '首回合引导',
            mood: index === 0 ? 'advising' : 'calm',
        })),
    }
}

function namesFromIds(ids: string[], npcs: NPC[]): string[] {
    const npcById = new Map(npcs.map(npc => [npc.id, npc]))
    return ids
        .map(id => npcById.get(id))
        .filter((npc): npc is NPC => Boolean(npc && npc.isAlive))
        .map(npc => npc.name)
}

function trimSentence(text: string): string {
    return text.replace(/[“”"']/g, '').split(/[；。！？]/)[0]?.trim() || text.trim()
}

function buildCourtSection(round: number, npcs: NPC[]): FengDaozhiAdvisorKitSection {
    const keyNpcIds = getHighlightedNpcIds(round, npcs)
    const keyNpcNames = namesFromIds(keyNpcIds, npcs)
    const intel = getRoundIntel(round)
    const summary = keyNpcNames.length
        ? `朝堂势力：${keyNpcNames.join('、')}`
        : '朝堂势力：本回合先看朝局明面上谁最急、谁最稳。'

    const reactionLines = keyNpcIds.slice(0, 3).map(id => {
        const npc = npcs.find(item => item.id === id)
        if (!npc) return null
        const reaction = trimSentence(intel?.reactions[id] ?? npc.publicStance)
        return `${npc.name}：${reaction}。`
    }).filter((line): line is string => Boolean(line))

    const lines: FengDaozhiDialogueLine[] = [
        {
            id: `round-${round}-court-summary`,
            text: keyNpcNames.length
                ? `公子，此回合朝堂先看 ${keyNpcNames.slice(0, 3).join('、')}。`
                : '公子，此回合朝局未明，先看谁急着把话说满。',
            segmentLabel: '朝堂势力',
            mood: 'advising',
        },
        ...reactionLines.map((text, index) => ({
            id: `round-${round}-court-${index + 1}`,
            text,
            segmentLabel: '朝堂势力' as const,
            mood: 'calm' as const,
        })),
    ]

    return { keyNpcIds, keyNpcNames, summary, lines }
}

function rankExternalProgress(input: {
    round: number
    npcs: NPC[]
    intelProgress: Record<string, number>
    difficulty: GameDifficulty
}): Array<{ npc: NPC; progress: ExternalLineProgress; score: number }> {
    return input.npcs
        .filter(npc =>
            npc.isAlive &&
            npc.powerBase === 'external' &&
            Boolean(npc.highActionBias) &&
            !isExternalTerminalStatus(npc.externalStatus),
        )
        .map(npc => {
            const unlockedSecrets = input.intelProgress[npc.id] ?? 0
            const progress = buildExternalLineProgress({
                round: input.round,
                npc,
                unlockedSecrets,
                difficulty: input.difficulty,
                externalActionEnabled: roundSupportsExternalAction(
                    input.round,
                    npc.highActionBias === 'rebellion' ? 'rebellion' : 'secession',
                ),
            })
            return {
                npc,
                progress,
                score: npc.trust + Math.max(0, 45 - npc.loyaltyToCourt) + unlockedSecrets * 10 + (npc.loyaltyToCourt <= 40 ? 8 : 0),
            }
        })
        .filter((item): item is { npc: NPC; progress: ExternalLineProgress; score: number } => Boolean(item.progress))
        .sort((left, right) => right.score - left.score)
}

function buildExternalSection(input: {
    round: number
    npcs: NPC[]
    intelProgress: Record<string, number>
    difficulty: GameDifficulty
}): FengDaozhiAdvisorKitSection {
    const ranked = rankExternalProgress(input)
    const top = ranked[0]

    if (!top) {
        return {
            keyNpcIds: [],
            keyNpcNames: [],
            summary: '地方军头：暂无明确临界人物。',
            lines: [{
                id: `round-${input.round}-external-none`,
                text: '地方军头此刻还未露出临界之势，先养信、探底，不急摊牌。',
                segmentLabel: '地方军头',
                mood: 'calm',
            }],
        }
    }

    return {
        keyNpcIds: [top.npc.id],
        keyNpcNames: [top.npc.name],
        summary: `地方军头：${top.npc.name}`,
        lines: [
            {
                id: `round-${input.round}-external-summary`,
                text: `${top.npc.name}这条线最该留意，眼下处在“${top.progress.phase}”。`,
                segmentLabel: '地方军头',
                mood: top.progress.windowOpen ? 'warning' : 'advising',
            },
            {
                id: `round-${input.round}-external-gap`,
                text: `${top.progress.summary}${top.progress.gapText} 下一手宜 ${top.progress.nextMoveLabel}。`,
                segmentLabel: '地方军头',
                mood: top.progress.windowOpen ? 'urgent' : 'calm',
            },
        ],
    }
}

export function buildFengDaozhiAdvisorKit(input: {
    round: number
    npcs: NPC[]
    intelProgress: Record<string, number>
    difficulty: GameDifficulty
}): FengDaozhiAdvisorKit {
    const court = buildCourtSection(input.round, input.npcs)
    const external = buildExternalSection(input)
    const lines = [...court.lines, ...external.lines]

    return {
        key: getFengDaozhiAdvisorKitSeenKey(input.round),
        round: input.round,
        title: `第 ${input.round} 回合冯道之锦囊`,
        version: GUIDE_VERSION,
        summary: `${court.summary}；${external.summary}`,
        court,
        external,
        lines,
    }
}

export function buildCourtOverviewFengDaozhiQueue(input: {
    firstRoundGuide: FengDaozhiDialogueSequence | null
    advisorKit: FengDaozhiAdvisorKit | null
    firstRoundGuideSeen: boolean
    advisorKitSeen: boolean
}): FengDaozhiDialogueSequence[] {
    const queue: FengDaozhiDialogueSequence[] = []
    if (input.firstRoundGuide && !input.firstRoundGuideSeen) queue.push(input.firstRoundGuide)
    if (input.advisorKit && !input.advisorKitSeen) queue.push(input.advisorKit)
    return queue
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run from `NingChenv4`:

```bash
npm test -- src/game/fengDaozhiGuide.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add NingChenv4/src/game/fengDaozhiGuide.ts NingChenv4/src/game/fengDaozhiGuide.test.ts
git commit -m "feat: add Feng Daozhi guide data builder"
```

---

### Task 2: Add Persisted Feng Daozhi Guide Seen State

**Files:**

- Modify: `NingChenv4/src/game/types.ts`
- Modify: `NingChenv4/src/stores/gameStore.ts`
- Modify: `NingChenv4/src/stores/gameStore.test.ts`
- Modify: `NingChenv4/src/game/saveEngine.ts`
- Modify: `NingChenv4/src/game/saveEngine.test.ts`

- [ ] **Step 1: Write failing store tests**

Append to `NingChenv4/src/stores/gameStore.test.ts`:

```ts
describe('gameStore Feng Daozhi guide seen state', () => {
    beforeEach(() => {
        resetStore()
    })

    it('marks one Feng Daozhi guide key as seen', () => {
        useGameStore.getState().markFengDaozhiGuideSeen('round:3:advisor_kit:v1')

        expect(useGameStore.getState().fengDaozhiGuideSeen).toMatchObject({
            'round:3:advisor_kit:v1': true,
        })
    })

    it('marks multiple Feng Daozhi guide keys as seen', () => {
        useGameStore.getState().markFengDaozhiGuideSeenMany([
            'first-round:court_observe:v1',
            'round:1:advisor_kit:v1',
        ])

        expect(useGameStore.getState().fengDaozhiGuideSeen).toMatchObject({
            'first-round:court_observe:v1': true,
            'round:1:advisor_kit:v1': true,
        })
    })
})
```

- [ ] **Step 2: Write failing save tests**

Add to `NingChenv4/src/game/saveEngine.test.ts`:

```ts
it('persists Feng Daozhi guide seen state', () => {
    const snapshot = buildPersistedSnapshot({
        ...createBaseState(),
        prologueStep: 'INGAME',
        fengDaozhiGuideSeen: {
            'round:4:advisor_kit:v1': true,
        },
    })

    expect(snapshot?.fengDaozhiGuideSeen).toEqual({
        'round:4:advisor_kit:v1': true,
    })
})

it('defaults missing Feng Daozhi guide seen state on legacy saves', () => {
    const storage = createLocalStorageMock()
    vi.stubGlobal('localStorage', storage)

    const legacySnapshot = {
        version: 1,
        ...createBaseState(),
        prologueStep: 'INGAME',
        roundStartSnapshot: null,
    }
    delete (legacySnapshot as { fengDaozhiGuideSeen?: unknown }).fengDaozhiGuideSeen
    localStorage.setItem('ningchen-save-v1', JSON.stringify(legacySnapshot))

    const loaded = loadGameSnapshot()

    expect(loaded?.fengDaozhiGuideSeen).toEqual({})
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run from `NingChenv4`:

```bash
npm test -- src/stores/gameStore.test.ts src/game/saveEngine.test.ts
```

Expected: FAIL because `fengDaozhiGuideSeen` and mark actions do not exist.

- [ ] **Step 4: Add type and store state**

In `NingChenv4/src/game/types.ts`, add near onboarding seen types:

```ts
export type FengDaozhiGuideSeenMap = Record<string, boolean>
```

In `NingChenv4/src/stores/gameStore.ts`:

- Import `FengDaozhiGuideSeenMap`.
- Add state field:

```ts
fengDaozhiGuideSeen: FengDaozhiGuideSeenMap
```

- Add actions:

```ts
markFengDaozhiGuideSeen: (key: string) => void
markFengDaozhiGuideSeenMany: (keys: string[]) => void
```

- Add initial constant:

```ts
const initialFengDaozhiGuideSeen: FengDaozhiGuideSeenMap = {}
```

- Include the field in initial state, `saveRoundStartSnapshot`, `restoreRoundStartSnapshot`, `hydrateSnapshot`, and `resetGame`.
- Implement actions:

```ts
markFengDaozhiGuideSeen: (key: string) => {
    set(state => ({
        fengDaozhiGuideSeen: {
            ...state.fengDaozhiGuideSeen,
            [key]: true,
        },
    }))
},

markFengDaozhiGuideSeenMany: (keys: string[]) => {
    set(state => {
        const nextSeen = { ...state.fengDaozhiGuideSeen }
        keys.forEach(key => {
            nextSeen[key] = true
        })
        return { fengDaozhiGuideSeen: nextSeen }
    })
},
```

- [ ] **Step 5: Persist and hydrate the seen map**

In `NingChenv4/src/game/saveEngine.ts`:

- Import `FengDaozhiGuideSeenMap`.
- Add to `GameSnapshotCore`:

```ts
fengDaozhiGuideSeen: FengDaozhiGuideSeenMap
```

- Add to `buildSnapshotCore`:

```ts
fengDaozhiGuideSeen: state.fengDaozhiGuideSeen ?? {},
```

- Add to parsed legacy shape:

```ts
fengDaozhiGuideSeen?: FengDaozhiGuideSeenMap
```

- Add to loaded return object:

```ts
fengDaozhiGuideSeen: parsed.fengDaozhiGuideSeen ?? {},
```

- Add to `roundStartSnapshot` hydration:

```ts
fengDaozhiGuideSeen: parsed.roundStartSnapshot.fengDaozhiGuideSeen ?? {},
```

- [ ] **Step 6: Run tests to verify they pass**

Run from `NingChenv4`:

```bash
npm test -- src/stores/gameStore.test.ts src/game/saveEngine.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add NingChenv4/src/game/types.ts NingChenv4/src/stores/gameStore.ts NingChenv4/src/stores/gameStore.test.ts NingChenv4/src/game/saveEngine.ts NingChenv4/src/game/saveEngine.test.ts
git commit -m "feat: persist Feng Daozhi guide seen state"
```

---

### Task 3: Add Dialogue Player State Helpers

**Files:**

- Create: `NingChenv4/src/game/fengDaozhiDialoguePlayer.ts`
- Create: `NingChenv4/src/game/fengDaozhiDialoguePlayer.test.ts`

- [ ] **Step 1: Write failing tests**

Create `NingChenv4/src/game/fengDaozhiDialoguePlayer.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createInitialDialoguePlayerState, getVisibleDialogueText, stepDialoguePlayer } from './fengDaozhiDialoguePlayer'

const lines = [
    { text: '第一句。' },
    { text: '第二句。' },
]

describe('fengDaozhiDialoguePlayer', () => {
    it('starts at the first line with zero visible characters when animated', () => {
        const state = createInitialDialoguePlayerState(lines, false)

        expect(state.lineIndex).toBe(0)
        expect(getVisibleDialogueText(lines, state)).toBe('')
    })

    it('completes the current line before advancing', () => {
        const state = createInitialDialoguePlayerState(lines, false)
        const completed = stepDialoguePlayer(lines, state, 'advance')

        expect(completed.lineIndex).toBe(0)
        expect(getVisibleDialogueText(lines, completed)).toBe('第一句。')

        const advanced = stepDialoguePlayer(lines, completed, 'advance')
        expect(advanced.lineIndex).toBe(1)
        expect(getVisibleDialogueText(lines, advanced)).toBe('')
    })

    it('closes after advancing past the final complete line', () => {
        let state = createInitialDialoguePlayerState(lines, true)
        state = stepDialoguePlayer(lines, state, 'advance')
        state = stepDialoguePlayer(lines, state, 'advance')

        expect(state.done).toBe(true)
    })

    it('closes immediately when skipped', () => {
        const state = createInitialDialoguePlayerState(lines, false)
        expect(stepDialoguePlayer(lines, state, 'skip').done).toBe(true)
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run from `NingChenv4`:

```bash
npm test -- src/game/fengDaozhiDialoguePlayer.test.ts
```

Expected: FAIL because helper file does not exist.

- [ ] **Step 3: Implement pure player helper**

Create `NingChenv4/src/game/fengDaozhiDialoguePlayer.ts`:

```ts
import type { FengDaozhiDialogueLine } from './fengDaozhiGuide'

export interface DialoguePlayerState {
    lineIndex: number
    visibleCharacters: number
    done: boolean
    reducedMotion: boolean
}

export type DialoguePlayerAction = 'tick' | 'advance' | 'skip'

export function createInitialDialoguePlayerState(
    lines: Pick<FengDaozhiDialogueLine, 'text'>[],
    reducedMotion: boolean,
): DialoguePlayerState {
    const firstLength = lines[0]?.text.length ?? 0
    return {
        lineIndex: 0,
        visibleCharacters: reducedMotion ? firstLength : 0,
        done: lines.length === 0,
        reducedMotion,
    }
}

export function getVisibleDialogueText(
    lines: Pick<FengDaozhiDialogueLine, 'text'>[],
    state: DialoguePlayerState,
): string {
    const line = lines[state.lineIndex]
    if (!line) return ''
    return line.text.slice(0, state.visibleCharacters)
}

export function stepDialoguePlayer(
    lines: Pick<FengDaozhiDialogueLine, 'text'>[],
    state: DialoguePlayerState,
    action: DialoguePlayerAction,
    tickSize = 1,
): DialoguePlayerState {
    if (state.done) return state
    if (action === 'skip') return { ...state, done: true }

    const currentLine = lines[state.lineIndex]
    if (!currentLine) return { ...state, done: true }

    if (action === 'tick') {
        return {
            ...state,
            visibleCharacters: Math.min(currentLine.text.length, state.visibleCharacters + Math.max(1, tickSize)),
        }
    }

    if (state.visibleCharacters < currentLine.text.length) {
        return {
            ...state,
            visibleCharacters: currentLine.text.length,
        }
    }

    const nextIndex = state.lineIndex + 1
    const nextLine = lines[nextIndex]
    if (!nextLine) return { ...state, done: true }

    return {
        lineIndex: nextIndex,
        visibleCharacters: state.reducedMotion ? nextLine.text.length : 0,
        done: false,
        reducedMotion: state.reducedMotion,
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run from `NingChenv4`:

```bash
npm test -- src/game/fengDaozhiDialoguePlayer.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add NingChenv4/src/game/fengDaozhiDialoguePlayer.ts NingChenv4/src/game/fengDaozhiDialoguePlayer.test.ts
git commit -m "feat: add Feng Daozhi dialogue player state"
```

---

### Task 4: Add The Reusable Feng Daozhi Dialogue Overlay

**Files:**

- Create: `NingChenv4/src/components/FengDaozhiDialogue/FengDaozhiDialogueOverlay.tsx`
- Create: `NingChenv4/src/components/FengDaozhiDialogue/FengDaozhiDialogueOverlay.css`
- Create: `NingChenv4/src/components/FengDaozhiDialogue/FengDaozhiDialogueOverlay.test.tsx`

- [ ] **Step 1: Write failing component contract tests**

Create `NingChenv4/src/components/FengDaozhiDialogue/FengDaozhiDialogueOverlay.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import overlaySource from './FengDaozhiDialogueOverlay.tsx?raw'
import overlayCss from './FengDaozhiDialogueOverlay.css?raw'
import { FengDaozhiDialogueOverlay } from './FengDaozhiDialogueOverlay'

const sequence = {
    key: 'test-sequence',
    title: '冯道之锦囊',
    version: 1,
    lines: [
        { text: '公子，先看朝堂。', segmentLabel: '朝堂势力' as const },
    ],
}

describe('FengDaozhiDialogueOverlay', () => {
    it('renders through a document body portal in the browser with an SSR fallback', () => {
        expect(overlaySource).toContain('createPortal(')
        expect(overlaySource).toContain('document.body')
        expect(overlaySource).toContain("typeof document === 'undefined'")
    })

    it('uses the existing Feng Daozhi portrait asset and exposes dialogue semantics', () => {
        const markup = renderToStaticMarkup(
            <FengDaozhiDialogueOverlay
                sequences={[sequence]}
                onSequenceComplete={() => undefined}
                onComplete={() => undefined}
            />,
        )

        expect(markup).toContain('feng-daozhi-dialogue-backdrop')
        expect(markup).toContain('feng-daozhi-dialogue-portrait')
        expect(markup).toContain('朝堂势力')
        expect(markup).toContain('冯道之')
        expect(overlaySource).toContain('SCHEME_UI_ASSETS.fengDaozhiAssistPortrait')
    })

    it('supports click, keyboard advance, skip, and reduced motion', () => {
        expect(overlaySource).toContain('onClick={handleAdvance}')
        expect(overlaySource).toContain("event.key === 'Enter'")
        expect(overlaySource).toContain("event.key === ' '")
        expect(overlaySource).toContain('matchMedia')
        expect(overlaySource).toContain('prefers-reduced-motion: reduce')
        expect(overlaySource).toContain('handleSkip')
    })

    it('uses fixed lower-left portrait and lower-right dialogue layout', () => {
        expect(overlayCss).toContain('position: fixed')
        expect(overlayCss).toContain('left: clamp(')
        expect(overlayCss).toContain('right: clamp(')
        expect(overlayCss).toContain('bottom: clamp(')
        expect(overlayCss).toContain('@media (max-width: 720px)')
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run from `NingChenv4`:

```bash
npm test -- src/components/FengDaozhiDialogue/FengDaozhiDialogueOverlay.test.tsx
```

Expected: FAIL because component files do not exist.

- [ ] **Step 3: Implement overlay component**

Create `NingChenv4/src/components/FengDaozhiDialogue/FengDaozhiDialogueOverlay.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { SCHEME_UI_ASSETS } from '../../data/mediaAssets'
import {
    createInitialDialoguePlayerState,
    getVisibleDialogueText,
    stepDialoguePlayer,
    type DialoguePlayerState,
} from '../../game/fengDaozhiDialoguePlayer'
import type { FengDaozhiDialogueSequence } from '../../game/fengDaozhiGuide'
import './FengDaozhiDialogueOverlay.css'

interface FengDaozhiDialogueOverlayProps {
    sequences: FengDaozhiDialogueSequence[]
    onSequenceComplete: (sequence: FengDaozhiDialogueSequence) => void
    onComplete: () => void
}

function useReducedMotion() {
    const [reducedMotion, setReducedMotion] = useState(false)

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
        const query = window.matchMedia('(prefers-reduced-motion: reduce)')
        setReducedMotion(query.matches)
        const handleChange = () => setReducedMotion(query.matches)
        query.addEventListener?.('change', handleChange)
        return () => query.removeEventListener?.('change', handleChange)
    }, [])

    return reducedMotion
}

export function FengDaozhiDialogueOverlay({
    sequences,
    onSequenceComplete,
    onComplete,
}: FengDaozhiDialogueOverlayProps) {
    const reducedMotion = useReducedMotion()
    const [sequenceIndex, setSequenceIndex] = useState(0)
    const activeSequence = sequences[sequenceIndex]
    const lines = useMemo(() => activeSequence?.lines ?? [], [activeSequence])
    const [playerState, setPlayerState] = useState<DialoguePlayerState>(() =>
        createInitialDialoguePlayerState(lines, reducedMotion),
    )

    useEffect(() => {
        setSequenceIndex(0)
    }, [sequences.map(sequence => sequence.key).join('|')])

    useEffect(() => {
        setPlayerState(createInitialDialoguePlayerState(lines, reducedMotion))
    }, [lines, reducedMotion])

    useEffect(() => {
        if (reducedMotion || playerState.done) return
        const timer = window.setInterval(() => {
            setPlayerState(state => stepDialoguePlayer(lines, state, 'tick', 2))
        }, 22)
        return () => window.clearInterval(timer)
    }, [lines, playerState.done, reducedMotion])

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                handleAdvance()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    })

    if (!activeSequence) return null

    const currentLine = lines[playerState.lineIndex]
    const visibleText = getVisibleDialogueText(lines, playerState)
    const segmentLabel = currentLine?.segmentLabel

    const completeActiveSequence = () => {
        onSequenceComplete(activeSequence)
        const nextSequenceIndex = sequenceIndex + 1
        if (nextSequenceIndex >= sequences.length) {
            onComplete()
            return
        }
        setSequenceIndex(nextSequenceIndex)
    }

    const handleAdvance = () => {
        setPlayerState(state => {
            const nextState = stepDialoguePlayer(lines, state, 'advance')
            if (nextState.done) {
                window.setTimeout(completeActiveSequence, 0)
                return state
            }
            return nextState
        })
    }

    const handleSkip = () => {
        sequences.slice(sequenceIndex).forEach(onSequenceComplete)
        onComplete()
    }

    const modal = (
        <div className="feng-daozhi-dialogue-backdrop" onClick={handleAdvance} role="presentation">
            <div className="feng-daozhi-dialogue-shade" aria-hidden="true" />
            <img
                className="feng-daozhi-dialogue-portrait"
                src={SCHEME_UI_ASSETS.fengDaozhiAssistPortrait}
                alt="冯道之"
                draggable={false}
            />
            <section
                className="feng-daozhi-dialogue-box"
                aria-live="polite"
                aria-label={activeSequence.title}
                onClick={event => {
                    event.stopPropagation()
                    handleAdvance()
                }}
            >
                <button
                    type="button"
                    className="feng-daozhi-dialogue-skip"
                    onClick={event => {
                        event.stopPropagation()
                        handleSkip()
                    }}
                >
                    略过
                </button>
                <div className="feng-daozhi-dialogue-speaker">冯道之</div>
                {segmentLabel && <div className="feng-daozhi-dialogue-segment">{segmentLabel}</div>}
                <p className="feng-daozhi-dialogue-text">{visibleText}</p>
                <div className="feng-daozhi-dialogue-continue">点击继续</div>
            </section>
        </div>
    )

    if (typeof document === 'undefined') return modal
    return createPortal(modal, document.body)
}
```

- [ ] **Step 4: Implement overlay styles**

Create `NingChenv4/src/components/FengDaozhiDialogue/FengDaozhiDialogueOverlay.css`:

```css
.feng-daozhi-dialogue-backdrop {
    position: fixed;
    inset: 0;
    z-index: 52;
    overflow: hidden;
    cursor: pointer;
}

.feng-daozhi-dialogue-shade {
    position: absolute;
    inset: 0;
    background: rgba(3, 3, 5, 0.72);
    backdrop-filter: blur(3px);
}

.feng-daozhi-dialogue-portrait {
    position: fixed;
    left: clamp(10px, 3.2vw, 44px);
    bottom: clamp(0px, 1.4vw, 24px);
    z-index: 53;
    width: min(34vw, 340px);
    max-height: min(78vh, 620px);
    object-fit: contain;
    object-position: left bottom;
    filter: drop-shadow(0 22px 34px rgba(0, 0, 0, 0.62));
    pointer-events: none;
}

.feng-daozhi-dialogue-box {
    position: fixed;
    right: clamp(16px, 4vw, 64px);
    bottom: clamp(24px, 6vh, 72px);
    z-index: 54;
    width: min(58vw, 760px);
    min-height: 168px;
    padding: 24px 32px 22px;
    border: 1px solid rgba(201, 176, 101, 0.58);
    background:
        linear-gradient(180deg, rgba(18, 15, 11, 0.94), rgba(7, 7, 9, 0.94)),
        rgba(8, 7, 6, 0.92);
    box-shadow:
        inset 0 0 28px rgba(201, 176, 101, 0.08),
        0 24px 52px rgba(0, 0, 0, 0.5);
    color: var(--color-text-primary);
    cursor: pointer;
}

.feng-daozhi-dialogue-speaker {
    color: var(--color-accent-gold);
    font-family: var(--font-heading);
    font-size: 1.18rem;
    letter-spacing: 2px;
    margin-bottom: 8px;
}

.feng-daozhi-dialogue-segment {
    display: inline-flex;
    margin-bottom: 12px;
    padding: 3px 10px;
    border: 1px solid rgba(201, 176, 101, 0.34);
    color: rgba(232, 201, 106, 0.86);
    font-size: 0.82rem;
    letter-spacing: 2px;
}

.feng-daozhi-dialogue-text {
    min-height: 62px;
    margin: 0;
    color: var(--color-text-primary);
    font-size: clamp(1rem, 1.45vw, 1.2rem);
    line-height: 1.85;
}

.feng-daozhi-dialogue-continue {
    margin-top: 12px;
    color: rgba(232, 201, 106, 0.62);
    font-size: 0.82rem;
    letter-spacing: 2px;
    text-align: right;
}

.feng-daozhi-dialogue-skip {
    position: absolute;
    top: 12px;
    right: 14px;
    border: 0;
    background: transparent;
    color: rgba(232, 220, 200, 0.58);
    cursor: pointer;
}

.feng-daozhi-dialogue-skip:hover,
.feng-daozhi-dialogue-skip:focus-visible {
    color: var(--color-accent-gold-light);
}

@media (max-width: 720px) {
    .feng-daozhi-dialogue-portrait {
        width: min(42vw, 190px);
        opacity: 0.92;
    }

    .feng-daozhi-dialogue-box {
        left: 14px;
        right: 14px;
        bottom: 16px;
        width: auto;
        min-height: 156px;
        padding: 20px 20px 18px;
    }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run from `NingChenv4`:

```bash
npm test -- src/components/FengDaozhiDialogue/FengDaozhiDialogueOverlay.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add NingChenv4/src/components/FengDaozhiDialogue NingChenv4/src/game/fengDaozhiDialoguePlayer.ts NingChenv4/src/game/fengDaozhiDialoguePlayer.test.ts
git commit -m "feat: add Feng Daozhi dialogue overlay"
```

---

### Task 5: Replace Visible First-Round Modal Entrypoints

**Files:**

- Modify: `NingChenv4/src/components/RoundStart/RoundStart.tsx`
- Modify: `NingChenv4/src/components/CourtView/CourtView.tsx`
- Modify: `NingChenv4/src/components/EmpressLetter/EmpressLetter.tsx`
- Modify: `NingChenv4/src/components/SchemeFeedback/SchemeFeedback.tsx`
- Modify: `NingChenv4/src/components/Settlement/Settlement.tsx`
- Modify: relevant component tests using source contracts.

- [ ] **Step 1: Add failing source-contract assertions**

In each existing page test, assert that active pages import `FengDaozhiDialogueOverlay` and do not import `FirstRoundGuideModal`.

Use this pattern in the relevant test files:

```ts
import pageSource from './RoundStart.tsx?raw'

expect(pageSource).toContain('FengDaozhiDialogueOverlay')
expect(pageSource).not.toContain('FirstRoundGuideModal')
expect(pageSource).toContain('buildFirstRoundGuideSequence')
```

For `CourtView.external-line.test.tsx`, add the same checks to the existing CourtView source-contract suite.

- [ ] **Step 2: Run affected page tests to verify they fail**

Run from `NingChenv4`:

```bash
npm test -- src/components/RoundStart/RoundStart.test.tsx src/components/CourtView/CourtView.external-line.test.tsx src/components/EmpressLetter/EmpressLetter.test.tsx src/components/SchemeFeedback/SchemeFeedback.test.tsx src/components/Settlement/Settlement.test.tsx
```

Expected: FAIL because active pages still import `FirstRoundGuideModal`.

- [ ] **Step 3: Replace simple first-round modal usages**

In `RoundStart.tsx`, `EmpressLetter.tsx`, `SchemeFeedback.tsx`, and `Settlement.tsx`:

- Remove `FirstRoundGuideModal` import.
- Import:

```ts
import { buildFirstRoundGuideSequence } from '../../game/fengDaozhiGuide'
import { FengDaozhiDialogueOverlay } from '../FengDaozhiDialogue/FengDaozhiDialogueOverlay'
```

- Replace each modal block with:

```tsx
{currentRound === 1 && !firstRoundGuideSeen.round_start && (
    <FengDaozhiDialogueOverlay
        sequences={[buildFirstRoundGuideSequence('round_start')]}
        onSequenceComplete={() => undefined}
        onComplete={() => markFirstRoundGuideSeen('round_start')}
    />
)}
```

Use the page's own first-round key:

- `RoundStart.tsx`: `round_start`
- `EmpressLetter.tsx`: `empress_letter`
- `SchemeFeedback.tsx`: `scheme_feedback`
- `Settlement.tsx`: `settlement`

- [ ] **Step 4: Keep CourtView first-round replacement for Task 6 queue**

Do not add the simple one-sequence replacement in `CourtView.tsx`. CourtView needs a combined queue with first-round guide and per-round advisor kit, implemented in Task 6.

- [ ] **Step 5: Run simple page tests**

Run from `NingChenv4`:

```bash
npm test -- src/components/RoundStart/RoundStart.test.tsx src/components/EmpressLetter/EmpressLetter.test.tsx src/components/SchemeFeedback/SchemeFeedback.test.tsx src/components/Settlement/Settlement.test.tsx
```

Expected: PASS after updating source-contract assertions.

- [ ] **Step 6: Commit**

```bash
git add NingChenv4/src/components/RoundStart/RoundStart.tsx NingChenv4/src/components/EmpressLetter/EmpressLetter.tsx NingChenv4/src/components/SchemeFeedback/SchemeFeedback.tsx NingChenv4/src/components/Settlement/Settlement.tsx NingChenv4/src/components/*/*.test.tsx
git commit -m "feat: route first-round guides through Feng Daozhi overlay"
```

---

### Task 6: Add CourtView Overview Queue And Per-Round Advisor Kit Trigger

**Files:**

- Modify: `NingChenv4/src/components/CourtView/CourtView.tsx`
- Modify: `NingChenv4/src/components/CourtView/CourtView.external-line.test.tsx`

- [ ] **Step 1: Write failing CourtView tests**

Add to `NingChenv4/src/components/CourtView/CourtView.external-line.test.tsx`:

```tsx
it('queues first-round guide before the round advisor kit on overview', () => {
    useGameStore.setState({
        currentRound: 1,
        currentPhase: 'COURT_OBSERVE',
        firstRoundGuideSeen: {
            round_start: true,
            court_observe: false,
            scheme_phase: false,
            empress_letter: false,
            scheme_feedback: false,
            settlement: false,
        },
        fengDaozhiGuideSeen: {},
    })

    const markup = renderCourtViewMarkup()

    expect(markup).toContain('feng-daozhi-dialogue-backdrop')
    expect(markup).toContain('首回合引导')
    expect(courtViewSource).toContain('buildCourtOverviewFengDaozhiQueue')
    expect(courtViewSource).toContain('markFengDaozhiGuideSeenMany')
})

it('does not auto-show a seen round advisor kit again', () => {
    useGameStore.setState({
        currentRound: 2,
        currentPhase: 'COURT_OBSERVE',
        firstRoundGuideSeen: {
            round_start: true,
            court_observe: true,
            scheme_phase: false,
            empress_letter: false,
            scheme_feedback: false,
            settlement: false,
        },
        fengDaozhiGuideSeen: {
            'round:2:advisor_kit:v1': true,
        },
    })

    const markup = renderCourtViewMarkup()

    expect(markup).not.toContain('feng-daozhi-dialogue-backdrop')
    expect(markup).toContain('朝堂势力')
    expect(markup).toContain('地方军头')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run from `NingChenv4`:

```bash
npm test -- src/components/CourtView/CourtView.external-line.test.tsx
```

Expected: FAIL because CourtView still renders `FirstRoundGuideModal` and has no advisor queue.

- [ ] **Step 3: Add CourtView queue**

In `NingChenv4/src/components/CourtView/CourtView.tsx`:

- Remove `FirstRoundGuideModal` import.
- Import:

```ts
import {
    buildCourtOverviewFengDaozhiQueue,
    buildFengDaozhiAdvisorKit,
    buildFirstRoundGuideSequence,
} from '../../game/fengDaozhiGuide'
import { FengDaozhiDialogueOverlay } from '../FengDaozhiDialogue/FengDaozhiDialogueOverlay'
```

- Pull these from `useGameStore()`:

```ts
difficulty,
fengDaozhiGuideSeen,
markFengDaozhiGuideSeenMany,
```

- Add near the existing `useRef` declarations:

```ts
const completedCourtOverviewSequencesRef = useRef<string[]>([])
```

- Build kit and queue after existing derived state:

```ts
const advisorKit = buildFengDaozhiAdvisorKit({
    round: currentRound,
    npcs,
    intelProgress,
    difficulty,
})
const courtOverviewFirstRoundGuide = currentRound === 1 ? buildFirstRoundGuideSequence('court_observe') : null
const courtOverviewDialogueQueue = scope === 'overview' && !selectedNpc
    ? buildCourtOverviewFengDaozhiQueue({
        firstRoundGuide: courtOverviewFirstRoundGuide,
        advisorKit,
        firstRoundGuideSeen: currentRound !== 1 || firstRoundGuideSeen.court_observe,
        advisorKitSeen: Boolean(fengDaozhiGuideSeen[advisorKit.key]),
    })
    : []
```

- Render near the root return, before the active screen:

```tsx
{courtOverviewDialogueQueue.length > 0 && (
    <FengDaozhiDialogueOverlay
        sequences={courtOverviewDialogueQueue}
        onSequenceComplete={sequence => {
            completedCourtOverviewSequencesRef.current.push(sequence.key)
        }}
        onComplete={() => {
            const completedKeys = completedCourtOverviewSequencesRef.current.length > 0
                ? completedCourtOverviewSequencesRef.current
                : courtOverviewDialogueQueue.map(sequence => sequence.key)

            if (courtOverviewFirstRoundGuide && completedKeys.includes(courtOverviewFirstRoundGuide.key)) {
                markFirstRoundGuideSeen('court_observe')
            }

            const kitSeenKeys = completedKeys.filter(key => key !== courtOverviewFirstRoundGuide?.key)
            if (kitSeenKeys.length > 0) markFengDaozhiGuideSeenMany(kitSeenKeys)
            completedCourtOverviewSequencesRef.current = []
        }}
    />
)}
```

- For skip behavior, `FengDaozhiDialogueOverlay` calls `onSequenceComplete` for every remaining sequence before `onComplete`. This means skip marks all queued CourtView items as seen when the layer closes and prevents an immediate re-open loop.
- Store writes happen in `onComplete`, not after each sequence, so the parent does not recalculate and shrink the active queue while the overlay is still playing.

- [ ] **Step 4: Run CourtView tests**

Run from `NingChenv4`:

```bash
npm test -- src/components/CourtView/CourtView.external-line.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add NingChenv4/src/components/CourtView/CourtView.tsx NingChenv4/src/components/CourtView/CourtView.external-line.test.tsx
git commit -m "feat: show Feng Daozhi round kit on court overview"
```

---

### Task 7: Add Current Round Kit Summary To Gameplay Guide Overlay

**Files:**

- Modify: `NingChenv4/src/components/GameplayGuide/GameplayGuide.tsx`
- Modify: `NingChenv4/src/components/GameplayGuide/GameplayGuide.css`
- Modify: `NingChenv4/src/components/GameplayGuide/GameplayGuide.test.tsx`

- [ ] **Step 1: Write failing summary tests**

Add to `NingChenv4/src/components/GameplayGuide/GameplayGuide.test.tsx`:

```tsx
it('shows the current round Feng Daozhi kit summary only after the kit has been seen', () => {
    useGameStore.setState({
        currentRound: 5,
        prologueStep: 'INGAME',
        fengDaozhiGuideSeen: {
            'round:5:advisor_kit:v1': true,
        },
    })

    const markup = renderToStaticMarkup(<GameplayGuide mode="overlay" />)

    expect(markup).toContain('本回合冯道之锦囊')
    expect(markup).toContain('朝堂势力')
    expect(markup).toContain('地方军头')
    expect(markup).not.toContain('重听锦囊')
})

it('hides the Feng Daozhi kit summary before the current round kit is seen', () => {
    useGameStore.setState({
        currentRound: 5,
        prologueStep: 'INGAME',
        fengDaozhiGuideSeen: {},
    })

    const markup = renderToStaticMarkup(<GameplayGuide mode="overlay" />)

    expect(markup).not.toContain('本回合冯道之锦囊')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run from `NingChenv4`:

```bash
npm test -- src/components/GameplayGuide/GameplayGuide.test.tsx
```

Expected: FAIL because summary module does not exist.

- [ ] **Step 3: Render summary module**

In `NingChenv4/src/components/GameplayGuide/GameplayGuide.tsx`:

- Import `buildFengDaozhiAdvisorKit`.
- Select `currentRound`, `npcs`, `intelProgress`, `difficulty`, `fengDaozhiGuideSeen`.
- Build the kit:

```ts
const currentRoundAdvisorKit = buildFengDaozhiAdvisorKit({
    round: currentRound,
    npcs,
    intelProgress,
    difficulty,
})
const showCurrentRoundAdvisorSummary =
    isOverlay &&
    Boolean(fengDaozhiGuideSeen[currentRoundAdvisorKit.key])
```

- Render before `guide-section-list`:

```tsx
{showCurrentRoundAdvisorSummary && (
    <section className="guide-feng-daozhi-summary" aria-label="本回合冯道之锦囊">
        <span className="guide-feng-daozhi-kicker">本回合冯道之锦囊</span>
        <p>{currentRoundAdvisorKit.court.summary}</p>
        <p>{currentRoundAdvisorKit.external.summary}</p>
    </section>
)}
```

- Do not add any replay button.

- [ ] **Step 4: Add compact summary styles**

In `NingChenv4/src/components/GameplayGuide/GameplayGuide.css`:

```css
.guide-feng-daozhi-summary {
    border: 1px solid rgba(201, 176, 101, 0.34);
    padding: 14px 18px;
    background: rgba(7, 6, 5, 0.52);
}

.guide-feng-daozhi-kicker {
    display: block;
    margin-bottom: 8px;
    color: var(--color-accent-gold);
    font-family: var(--font-heading);
    letter-spacing: 3px;
}

.guide-feng-daozhi-summary p {
    margin: 4px 0 0;
    color: var(--color-text-primary);
    line-height: 1.7;
}
```

- [ ] **Step 5: Run tests**

Run from `NingChenv4`:

```bash
npm test -- src/components/GameplayGuide/GameplayGuide.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add NingChenv4/src/components/GameplayGuide/GameplayGuide.tsx NingChenv4/src/components/GameplayGuide/GameplayGuide.css NingChenv4/src/components/GameplayGuide/GameplayGuide.test.tsx
git commit -m "feat: show Feng Daozhi kit summary in gameplay guide"
```

---

### Task 8: Add Omen Teaching Sequence Adapter

**Files:**

- Modify: `NingChenv4/src/game/fengDaozhiGuide.ts`
- Modify: `NingChenv4/src/game/fengDaozhiGuide.test.ts`
- Modify: `NingChenv4/src/components/SchemePanel/SchemePanel.onboarding.test.tsx`

- [ ] **Step 1: Write failing adapter test**

Add to `NingChenv4/src/game/fengDaozhiGuide.test.ts`:

```ts
import { buildFirstOmenTeachingSequence } from './fengDaozhiGuide'

it('adapts first omen teaching into Feng Daozhi dialogue lines', () => {
    const sequence = buildFirstOmenTeachingSequence()

    expect(sequence.key).toBe('onboarding:first_omen_teaching:v1')
    expect(sequence.title).toContain('谶')
    expect(sequence.lines.map(line => line.segmentLabel)).toEqual(expect.arrayContaining(['谶纬引导']))
    expect(sequence.lines.map(line => line.text).join('')).toContain('征兆')
    expect(sequence.lines.map(line => line.text).join('')).toContain('解释')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run from `NingChenv4`:

```bash
npm test -- src/game/fengDaozhiGuide.test.ts
```

Expected: FAIL because `buildFirstOmenTeachingSequence` does not exist.

- [ ] **Step 3: Implement omen adapter**

In `NingChenv4/src/game/fengDaozhiGuide.ts`, import `FIRST_OMEN_TEACHING_CONTENT` and add:

```ts
export function buildFirstOmenTeachingSequence(): FengDaozhiDialogueSequence {
    const content = FIRST_OMEN_TEACHING_CONTENT
    return {
        key: `onboarding:first_omen_teaching:v${GUIDE_VERSION}`,
        title: content.title,
        version: GUIDE_VERSION,
        lines: [
            {
                id: 'first-omen-intro',
                text: content.intro,
                segmentLabel: '谶纬引导',
                mood: 'advising',
            },
            ...content.steps.map((text, index) => ({
                id: `first-omen-step-${index + 1}`,
                text,
                segmentLabel: '谶纬引导' as const,
                mood: 'calm' as const,
            })),
            ...content.impactNotes.map((text, index) => ({
                id: `first-omen-impact-${index + 1}`,
                text,
                segmentLabel: '谶纬引导' as const,
                mood: 'warning' as const,
            })),
        ],
    }
}
```

- [ ] **Step 4: Update SchemePanel onboarding source-contract test**

`OmenTeachingModal` is currently not imported by active `SchemePanel.tsx`. Keep its existing test as historical copy coverage, and add a source assertion to `SchemePanel.onboarding.test.tsx` that the new adapter exists:

```ts
import { buildFirstOmenTeachingSequence } from '../../game/fengDaozhiGuide'

it('keeps first omen teaching available as Feng Daozhi dialogue data', () => {
    const sequence = buildFirstOmenTeachingSequence()

    expect(sequence.lines).not.toHaveLength(0)
    expect(sequence.lines.every(line => line.segmentLabel === '谶纬引导')).toBe(true)
})
```

- [ ] **Step 5: Run tests**

Run from `NingChenv4`:

```bash
npm test -- src/game/fengDaozhiGuide.test.ts src/components/SchemePanel/SchemePanel.onboarding.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add NingChenv4/src/game/fengDaozhiGuide.ts NingChenv4/src/game/fengDaozhiGuide.test.ts NingChenv4/src/components/SchemePanel/SchemePanel.onboarding.test.tsx
git commit -m "feat: adapt omen teaching for Feng Daozhi dialogue"
```

---

### Task 9: Update Legacy FirstRoundGuideModal Contract

**Files:**

- Modify: `NingChenv4/src/components/FirstRoundGuide/FirstRoundGuideModal.test.ts`

- [ ] **Step 1: Add old-component status assertion**

Update `FirstRoundGuideModal.test.ts` to make the intended status explicit:

```ts
import roundStartSource from '../RoundStart/RoundStart.tsx?raw'
import courtViewSource from '../CourtView/CourtView.tsx?raw'
import empressLetterSource from '../EmpressLetter/EmpressLetter.tsx?raw'
import schemeFeedbackSource from '../SchemeFeedback/SchemeFeedback.tsx?raw'
import settlementSource from '../Settlement/Settlement.tsx?raw'

it('is retained as legacy code but no active first-round page imports it', () => {
    const activePageSources = [
        roundStartSource,
        courtViewSource,
        empressLetterSource,
        schemeFeedbackSource,
        settlementSource,
    ]

    activePageSources.forEach(source => {
        expect(source).not.toContain('FirstRoundGuideModal')
        expect(source).toContain('FengDaozhiDialogueOverlay')
    })
})
```

- [ ] **Step 2: Run test**

Run from `NingChenv4`:

```bash
npm test -- src/components/FirstRoundGuide/FirstRoundGuideModal.test.ts
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add NingChenv4/src/components/FirstRoundGuide/FirstRoundGuideModal.test.ts
git commit -m "test: mark first-round modal as legacy"
```

---

### Task 10: Full Verification

**Files:**

- This task changes no source file directly.

- [ ] **Step 1: Run focused tests**

Run from `NingChenv4`:

```bash
npm test -- src/game/fengDaozhiGuide.test.ts src/game/fengDaozhiDialoguePlayer.test.ts src/components/FengDaozhiDialogue/FengDaozhiDialogueOverlay.test.tsx src/components/CourtView/CourtView.external-line.test.tsx src/components/GameplayGuide/GameplayGuide.test.tsx src/stores/gameStore.test.ts src/game/saveEngine.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full test suite**

Run from `NingChenv4`:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 3: Run production build**

Run from `NingChenv4`:

```bash
npm run build
```

Expected: TypeScript and Vite build complete successfully.

- [ ] **Step 4: Manual browser QA after implementation**

Run from `NingChenv4`:

```bash
npm run dev
```

Open the local Vite URL and verify:

- Round 1 RoundStart shows Feng Daozhi overlay, not center modal.
- Round 1 CourtView overview queues first-round guide before advisor kit.
- Advancing with mouse, touch, `Space`, and `Enter` works.
- Clicking during typewriter completes the sentence first.
- Skip closes the overlay and prevents immediate re-open.
- CourtView overview buttons are not clickable while overlay is open.
- After kit is seen, right-top Gameplay Guide shows only the key-person summary.
- No “重听锦囊” button appears.
- Desktop and narrow viewport do not show serious overlap between portrait, text box, and buttons.

- [ ] **Step 5: Final commit**

```bash
git status --short
git add NingChenv4/src docs/superpowers/plans/2026-06-18-feng-daozhi-phase1.md
git commit -m "feat: implement Feng Daozhi phase 1 guide carrier"
```

---

## Self-Review Checklist

- Requirements coverage:
  - Reusable dialogue overlay: Task 4.
  - Typewriter and click-to-complete: Task 3 and Task 4.
  - Skip as seen: Task 4 and Task 6.
  - Current portrait reuse: Task 4.
  - First-round visible guide replacement: Task 5 and Task 6.
  - CourtView overview round kit trigger: Task 6.
  - Court preset key people: Task 1.
  - External dynamic key person: Task 1.
  - Gameplay Guide summary only, no replay: Task 7.
  - Omen teaching data path: Task 8.
  - Persistence: Task 2.

- Scope control:
  - No AIART generation.
  - No voice playback.
  - No final rewritten copy dependency.
  - Old modal retained until the active imports are removed and verified.

- Verification:
  - Focused tests.
  - Full tests.
  - Production build.
  - Browser QA after code exists.
