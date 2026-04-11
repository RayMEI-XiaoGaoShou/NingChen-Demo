# Prologue And Helpflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone story prologue, a standalone gameplay overview, a reusable in-game help overlay, and first-round one-time guidance modals without breaking the existing round loop or losing in-progress player actions.

**Architecture:** Extend the existing Zustand state with a small “front-door / help-layer / first-round guide” state slice instead of changing the round phase machine. Render prologue/help UI above the current phase tree so opening help never mutates gameplay state, and drive first-round onboarding with per-page one-time flags plus lightweight content data files.

**Tech Stack:** React, Zustand, TypeScript, Vitest, existing CSS module-per-component pattern

---

## File Structure

- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\types.ts`
  - Add prologue/help/guide state types.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\stores\gameStore.ts`
  - Add prologue step, help overlay state, return target, and first-round modal flags.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\stores\gameStore.test.ts`
  - Lock the non-destructive navigation behavior in tests.
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\data\prologueContent.ts`
  - Story prologue copy, gameplay overview copy, first-round popup copy.
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\Prologue\Prologue.tsx`
  - Standalone story prologue page.
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\Prologue\Prologue.css`
  - Prologue page styles.
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\GameplayGuide\GameplayGuide.tsx`
  - Shared gameplay overview page/overlay content.
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\GameplayGuide\GameplayGuide.css`
  - Gameplay guide styles.
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\FirstRoundGuide\FirstRoundGuideModal.tsx`
  - One-time first-round page guidance modal.
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\FirstRoundGuide\FirstRoundGuideModal.css`
  - Modal styles.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\App.tsx`
  - Insert prologue flow and help overlay above the phase renderer.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\RoundStart\RoundStart.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\CourtView\CourtView.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\SchemePanel\SchemePanel.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\EmpressLetter\EmpressLetter.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\SchemeFeedback\SchemeFeedback.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\Settlement\Settlement.tsx`
  - Add unified “玩法说明” button and first-round modal trigger points.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\styles\global.css`
  - Shared button/overlay helpers.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣策划案v1\世界观与故事框架.md`
  - Expand story background to match the new prologue.
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣策划案v1\前台交互与信息可见性设计.md`
  - Update page flow and onboarding/help description.

### Task 1: Add Front-Door And Help State

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\types.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\stores\gameStore.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\stores\gameStore.test.ts`

- [ ] **Step 1: Write the failing state tests**

```ts
it('opens and closes gameplay guide without clearing an in-progress scheme', () => {
    const targetNpcId = INITIAL_NPCS.find(npc => npc.name === '宇文棣')!.id

    useGameStore.setState({
        currentPhase: 'SCHEME_PHASE',
        currentSchemes: [{ id: 's1', targetNpcId, schemeType: 'advise', playerSpeech: '先夺边议。' }],
        schemeCount: 1,
    })

    useGameStore.getState().openGameplayGuide('SCHEME_PHASE')
    useGameStore.getState().closeGameplayGuide()

    const state = useGameStore.getState()
    expect(state.currentPhase).toBe('SCHEME_PHASE')
    expect(state.currentSchemes).toHaveLength(1)
    expect(state.schemeCount).toBe(1)
})

it('starts a fresh session at PROLOGUE before round one begins', () => {
    const state = useGameStore.getState()
    expect(state.prologueStep).toBe('PROLOGUE')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/stores/gameStore.test.ts`
Expected: FAIL with missing `prologueStep` / `openGameplayGuide`.

- [ ] **Step 3: Add minimal types**

```ts
export type PrologueStep = 'PROLOGUE' | 'GAMEPLAY_GUIDE' | 'INGAME'

export type HelpOverlayPage =
    | 'ROUND_START'
    | 'COURT_OBSERVE'
    | 'SCHEME_PHASE'
    | 'EMPRESS_LETTER'
    | 'SCHEME_FEEDBACK'
    | 'SETTLEMENT'

export type FirstRoundGuideKey =
    | 'round_start'
    | 'court_observe'
    | 'scheme_phase'
    | 'empress_letter'
    | 'scheme_feedback'
    | 'settlement'
```

- [ ] **Step 4: Add minimal store implementation**

```ts
prologueStep: 'PROLOGUE',
helpOverlayOpen: false,
helpOverlaySource: null,
firstRoundGuideSeen: {
    round_start: false,
    court_observe: false,
    scheme_phase: false,
    empress_letter: false,
    scheme_feedback: false,
    settlement: false,
},

openGameplayGuide: (source) => set({ helpOverlayOpen: true, helpOverlaySource: source }),
closeGameplayGuide: () => set({ helpOverlayOpen: false }),
advancePrologue: () => set(s => ({
    prologueStep:
        s.prologueStep === 'PROLOGUE'
            ? 'GAMEPLAY_GUIDE'
            : s.prologueStep === 'GAMEPLAY_GUIDE'
                ? 'INGAME'
                : 'INGAME',
})),
markFirstRoundGuideSeen: (key) => set(s => ({
    firstRoundGuideSeen: { ...s.firstRoundGuideSeen, [key]: true },
})),
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm.cmd test -- src/stores/gameStore.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/game/types.ts src/stores/gameStore.ts src/stores/gameStore.test.ts
git commit -m "feat: add prologue and help overlay state"
```

### Task 2: Build Story Prologue And Gameplay Overview Content

**Files:**
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\data\prologueContent.ts`
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\Prologue\Prologue.tsx`
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\Prologue\Prologue.css`
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\GameplayGuide\GameplayGuide.tsx`
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\GameplayGuide\GameplayGuide.css`

- [ ] **Step 1: Write a failing rendering smoke test**

```ts
it('renders the prologue heading and the ten-year vow section', () => {
    render(<Prologue />)
    expect(screen.getByText('纷乱之世')).toBeInTheDocument()
    expect(screen.getByText(/一年两回合，共 20 回合/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/components/Prologue/Prologue.test.tsx`
Expected: FAIL because component/file does not exist.

- [ ] **Step 3: Create content source**

```ts
export const PROLOGUE_SECTIONS = [
    { title: '纷乱之世', body: '...' },
    { title: '你是谁', body: '...' },
    { title: '你为何入周', body: '...' },
    { title: '女帝之托', body: '...' },
    { title: '十年之诺', body: '一年两回合，共二十回合。...' },
]

export const GAMEPLAY_GUIDE_SECTIONS = [
    { title: '你的目标', bullets: ['保全自身', '阻止提前南征', '用计谋削弱北周', '以问政辅佐女帝新政'] },
    { title: '每回合流程', bullets: ['朝局观察', '施计三次', '女帝问政', '暗线回报', '北周结算'] },
]
```

- [ ] **Step 4: Create minimal components**

```tsx
export function Prologue() {
    const { advancePrologue } = useGameStore()
    return (
        <div className="page-container prologue-page">
            {PROLOGUE_SECTIONS.map(section => (
                <section key={section.title} className="prologue-section">
                    <h3>{section.title}</h3>
                    <p>{section.body}</p>
                </section>
            ))}
            <button className="btn-primary" onClick={advancePrologue}>继续</button>
        </div>
    )
}
```

- [ ] **Step 5: Create matching gameplay guide component**

```tsx
export function GameplayGuide({ mode, onClose }: { mode: 'entry' | 'overlay'; onClose?: () => void }) {
    const { advancePrologue } = useGameStore()
    const action = mode === 'entry'
        ? <button className="btn-primary" onClick={advancePrologue}>开始入局</button>
        : <button className="btn-primary" onClick={onClose}>返回原页</button>
    return <div className="page-container gameplay-guide-page">{action}</div>
}
```

- [ ] **Step 6: Run tests**

Run: `npm.cmd test -- src/components/Prologue/Prologue.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/data/prologueContent.ts src/components/Prologue src/components/GameplayGuide
git commit -m "feat: add story prologue and gameplay overview pages"
```

### Task 3: Wire Prologue Flow Into App And Resume Logic

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\App.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\game\saveEngine.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\styles\global.css`

- [ ] **Step 1: Write failing flow test**

```ts
it('shows the prologue before the round loop when no resume snapshot exists', () => {
    render(<App />)
    expect(screen.getByText('纷乱之世')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/App.test.tsx`
Expected: FAIL because app still renders `RoundStart`.

- [ ] **Step 3: Update save shape to persist the new front-door state**

```ts
prologueStep: PrologueStep
helpOverlayOpen: boolean
helpOverlaySource: HelpOverlayPage | null
firstRoundGuideSeen: Record<FirstRoundGuideKey, boolean>
```

- [ ] **Step 4: Gate App rendering by prologue step**

```tsx
if (resumeSnapshot) { ... }

if (prologueStep === 'PROLOGUE') {
    return <Prologue />
}

if (prologueStep === 'GAMEPLAY_GUIDE') {
    return <GameplayGuide mode="entry" />
}

return (
    <>
        {renderPhase()}
        {helpOverlayOpen && <GameplayGuide mode="overlay" onClose={closeGameplayGuide} />}
    </>
)
```

- [ ] **Step 5: Run targeted tests**

Run: `npm.cmd test -- src/App.test.tsx src/stores/gameStore.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/game/saveEngine.ts src/styles/global.css
git commit -m "feat: wire prologue flow into app shell"
```

### Task 4: Add First-Round One-Time Guidance Modals

**Files:**
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\FirstRoundGuide\FirstRoundGuideModal.tsx`
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\FirstRoundGuide\FirstRoundGuideModal.css`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\data\prologueContent.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\RoundStart\RoundStart.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\CourtView\CourtView.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\SchemePanel\SchemePanel.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\EmpressLetter\EmpressLetter.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\SchemeFeedback\SchemeFeedback.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\Settlement\Settlement.tsx`

- [ ] **Step 1: Add popup copy source**

```ts
export const FIRST_ROUND_GUIDES = {
    round_start: { title: '先看大局', body: '先读朝局简报、历史辅助与冯道之锦囊，再决定本回合要对谁出手。' },
    court_observe: { title: '先看这些', body: '重点留意南征风险、自身安全，以及关键人物对事件的表态。' },
}
```

- [ ] **Step 2: Create a reusable modal**

```tsx
export function FirstRoundGuideModal({ title, body, onClose }: Props) {
    return (
        <div className="guide-modal-backdrop">
            <div className="guide-modal gold-panel">
                <h3>{title}</h3>
                <p>{body}</p>
                <button className="btn-primary" onClick={onClose}>知道了</button>
            </div>
        </div>
    )
}
```

- [ ] **Step 3: Inject one-time guards into each first-round page**

```tsx
const showGuide = currentRound === 1 && !firstRoundGuideSeen.round_start
{showGuide && (
    <FirstRoundGuideModal
        title={FIRST_ROUND_GUIDES.round_start.title}
        body={FIRST_ROUND_GUIDES.round_start.body}
        onClose={() => markFirstRoundGuideSeen('round_start')}
    />
)}
```

- [ ] **Step 4: Run the component and store tests**

Run: `npm.cmd test -- src/stores/gameStore.test.ts`
Expected: PASS with no reset regressions.

- [ ] **Step 5: Commit**

```bash
git add src/components/FirstRoundGuide src/data/prologueContent.ts src/components/RoundStart src/components/CourtView src/components/SchemePanel src/components/EmpressLetter src/components/SchemeFeedback src/components/Settlement
git commit -m "feat: add first-round one-time guidance modals"
```

### Task 5: Add Unified “玩法说明” Entry To Main Pages

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\RoundStart\RoundStart.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\CourtView\CourtView.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\SchemePanel\SchemePanel.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\EmpressLetter\EmpressLetter.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\SchemeFeedback\SchemeFeedback.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\components\Settlement\Settlement.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣-game\src\styles\global.css`

- [ ] **Step 1: Add a shared helper button style**

```css
.btn-help {
    position: absolute;
    right: 0;
    top: 0;
    padding: 8px 14px;
    border: 1px solid rgba(201, 176, 101, 0.35);
    background: rgba(10, 10, 14, 0.78);
}
```

- [ ] **Step 2: Add the trigger to every main page**

```tsx
const openGameplayGuide = useGameStore(s => s.openGameplayGuide)
<button className="btn-help" onClick={() => openGameplayGuide('SCHEME_PHASE')}>玩法说明</button>
```

- [ ] **Step 3: Verify state preservation manually**

Run:
```bash
npm.cmd test -- src/stores/gameStore.test.ts
```

Expected: PASS, especially the “keeps existing schemes” case.

- [ ] **Step 4: Commit**

```bash
git add src/components/RoundStart src/components/CourtView src/components/SchemePanel src/components/EmpressLetter src/components/SchemeFeedback src/components/Settlement src/styles/global.css
git commit -m "feat: add global gameplay guide entrypoints"
```

### Task 6: Sync Planner Docs With Implemented Flow

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣策划案v1\世界观与故事框架.md`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\佞臣策划案v1\前台交互与信息可见性设计.md`

- [ ] **Step 1: Expand the world/story doc to match the prologue**

```md
## 1. 纷乱之世
北周据有北地与蜀地，兵强马壮；南陈偏安江左，尚在恢复元气。

## 5. 十年之诺
陈倩给自己和你定下的是十年之约：一年两回合，共二十回合。
```

- [ ] **Step 2: Update the front-end flow doc**

```md
背景序章页 → 玩法总览页 → 回合开始页 → 朝局观察页 → ...
```

- [ ] **Step 3: Run final verification**

Run:
```bash
npm.cmd test
npm.cmd run build
```

Expected:
- `31+` passing tests
- Vite production build succeeds

- [ ] **Step 4: Commit**

```bash
git add "C:/Users/happyelements/Desktop/佞臣 Demo/佞臣策划案v1/世界观与故事框架.md" "C:/Users/happyelements/Desktop/佞臣 Demo/佞臣策划案v1/前台交互与信息可见性设计.md"
git commit -m "docs: align prologue and gameplay help flow"
```

## Self-Review

- **Spec coverage:** Covered the standalone story prologue, standalone gameplay overview, reusable gameplay help overlay, first-round one-time popups, non-destructive return behavior, and planning-doc sync.
- **Placeholder scan:** No `TODO`, `TBD`, or “similar to above” shortcuts remain.
- **Type consistency:** Uses one vocabulary throughout: `prologueStep`, `helpOverlayOpen`, `helpOverlaySource`, `firstRoundGuideSeen`.
