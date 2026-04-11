# 《佞臣》施计教学与 AI 冯道之辅佐 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为施计系统补齐首回合总引导、首次谶纬专属教学，以及按难度限次的 AI 冯道之代拟辅佐，降低新玩家首局上手门槛。

**Architecture:** 以现有 `SchemePanel` 为主入口，在 store 中新增“引导已读状态”和“冯道之剩余辅佐次数”，并通过独立 helper/prompt 层提供 AI 冯道之代拟能力。教学内容继续走 modal + 右上角按钮复看；冯道之只读取玩家已见上下文，不访问未解锁暗线。

**Tech Stack:** React 18、TypeScript、Zustand、Vitest、既有 DeepSeek/Kimi 兼容 AI 服务层。

---

## File Map

### Existing files to modify
- `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\SchemePanel.tsx`
  - 施计页入口，挂首回合引导、谶纬专属教学、右上角按钮、冯道之代拟按钮与填充逻辑。
- `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\stores\gameStore.ts`
  - 新增引导已读状态、每回合冯道之剩余次数、请求冯道之代拟的动作与每回合重置逻辑。
- `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\data\prologueContent.ts`
  - 放首回合总引导与谶纬教学正文。
- `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\omenGuide.ts`
  - 从“是否弹谶纬提示”升级成“首次谶纬教学是否弹、何时转 inline”。
- `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\difficulty.ts`
  - 输出每个难度的冯道之辅佐次数配置。
- `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\types.ts`
  - 定义新的 guide seen map、冯道之使用状态、代拟请求/响应类型。
- `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\ai\prompts.ts`
  - 新增冯道之代拟 prompt builder，限制只用玩家已见信息。
- `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\npcPromptContext.ts`
  - 复用或提炼玩家已知上下文，给冯道之代拟使用。
- `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\ai\aiService.ts`
  - 如有需要，仅补 tag 或 helper 入口，不重写现有 chat API。

### New files to create
- `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\fengDaozhiAdvisor.ts`
  - 构建冯道之代拟请求所需上下文与公开信息裁剪。
- `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\SchemeOnboardingModal.tsx`
  - 首回合施计总引导弹窗。
- `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\OmenTeachingModal.tsx`
  - 首次谶纬教学弹窗。
- `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\FengDaozhiAssistPanel.tsx`
  - 冯道之代拟按钮、剩余次数与结果注入 UI。
- `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\fengDaozhiAdvisor.test.ts`
- `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\SchemePanel.onboarding.test.tsx`
- `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\FengDaozhiAssistPanel.test.tsx`

---

### Task 1: Add guide state and Feng Daozhi quotas to core types/store

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\types.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\difficulty.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\stores\gameStore.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\stores\gameStore.test.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\difficulty.test.ts`

- [ ] **Step 1: Write the failing tests for new guide flags and per-round quotas**

```ts
it('resets Feng Daozhi assists per round by difficulty', () => {
  expect(getDifficultyProfile('easy').onboarding.fengDaozhiAssistsPerRound).toBe(3)
  expect(getDifficultyProfile('normal').onboarding.fengDaozhiAssistsPerRound).toBe(2)
  expect(getDifficultyProfile('hard').onboarding.fengDaozhiAssistsPerRound).toBe(1)
  expect(getDifficultyProfile('hell').onboarding.fengDaozhiAssistsPerRound).toBe(0)
})

it('marks onboarding guides as seen and resets per-round assist budget on round advance', () => {
  const store = useGameStore.getState()
  store.markSchemeOnboardingSeen('scheme_master_guide')
  expect(useGameStore.getState().schemeOnboardingSeen.scheme_master_guide).toBe(true)

  store.setDifficulty('normal')
  store.startGame()
  expect(useGameStore.getState().fengDaozhiAssistsRemaining).toBe(2)
})
```

- [ ] **Step 2: Run focused tests to verify failure**

Run:
```powershell
npx.cmd vitest run "src/stores/gameStore.test.ts" "src/game/difficulty.test.ts"
```
Expected: FAIL because `schemeOnboardingSeen` and `fengDaozhiAssistsRemaining` do not exist yet.

- [ ] **Step 3: Add types and difficulty config**

```ts
export interface SchemeOnboardingSeenMap {
  scheme_master_guide: boolean
  first_omen_teaching: boolean
}

export interface FengDaozhiDraftRequest {
  round: number
  difficulty: GameDifficulty
  targetNpcId: string
  schemeType: SchemeType
  relatedNpcId?: string
  omenSpeechInput?: OmenSpeechInput
}

export interface FengDaozhiDraftResult {
  primaryText: string
  secondaryText?: string
  source: 'ai' | 'fallback'
}
```

```ts
onboarding: {
  ...existing,
  fengDaozhiAssistsPerRound: 3,
}
```

- [ ] **Step 4: Add store state and reset hooks**

```ts
schemeOnboardingSeen: {
  scheme_master_guide: false,
  first_omen_teaching: false,
},
fengDaozhiAssistsRemaining: 0,
markSchemeOnboardingSeen: (key) => set(state => ({
  schemeOnboardingSeen: { ...state.schemeOnboardingSeen, [key]: true },
})),
consumeFengDaozhiAssist: () => set(state => ({
  fengDaozhiAssistsRemaining: Math.max(0, state.fengDaozhiAssistsRemaining - 1),
})),
resetFengDaozhiAssistsForRound: () => set(state => ({
  fengDaozhiAssistsRemaining: getDifficultyProfile(state.difficulty).onboarding.fengDaozhiAssistsPerRound,
})),
```

- [ ] **Step 5: Run focused tests to verify pass**

Run:
```powershell
npx.cmd vitest run "src/stores/gameStore.test.ts" "src/game/difficulty.test.ts"
```
Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/game/types.ts src/game/difficulty.ts src/stores/gameStore.ts src/stores/gameStore.test.ts src/game/difficulty.test.ts
git commit -m "feat: add scheme onboarding and feng daozhi state"
```

### Task 2: Build the first-round scheme master guide modal

**Files:**
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\SchemeOnboardingModal.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\data\prologueContent.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\SchemePanel.tsx`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\SchemePanel.onboarding.test.tsx`

- [ ] **Step 1: Write failing UI tests for the new guide modal**

```tsx
it('shows the scheme master guide on first entry to scheme phase', () => {
  render(<SchemePanel />)
  expect(screen.getByText('施计总引导')).toBeInTheDocument()
  expect(screen.getByText('献策')).toBeInTheDocument()
  expect(screen.getByText('设局嫁祸')).toBeInTheDocument()
})

it('reopens the scheme guide from the top-right button after first dismissal', async () => {
  render(<SchemePanel />)
  await user.click(screen.getByRole('button', { name: '我知道了' }))
  await user.click(screen.getByRole('button', { name: '计谋指南' }))
  expect(screen.getByText('施计总引导')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run focused UI test to verify failure**

Run:
```powershell
npx.cmd vitest run "src/components/SchemePanel/SchemePanel.onboarding.test.tsx"
```
Expected: FAIL because no `计谋指南` flow exists yet.

- [ ] **Step 3: Add structured guide content to `prologueContent.ts`**

```ts
export const SCHEME_MASTER_GUIDE_CONTENT = {
  title: '施计总引导',
  pages: [
    {
      key: 'scheme-definitions',
      heading: '计谋都在做什么',
      bullets: [
        '试探：探口风、探弱点、探暗线。',
        '献策：利国则帮敌，利人害国才真有用。',
        '设局嫁祸：诱其失言失态，让嫌疑落回其身。',
      ],
    },
  ],
}
```

- [ ] **Step 4: Build reusable modal component**

```tsx
export function SchemeOnboardingModal({ open, pages, title, onClose }: Props) {
  const [index, setIndex] = useState(0)
  const page = pages[index]
  return open ? (
    <div className="first-round-guide-overlay">
      <div className="first-round-guide-modal glass-panel">
        <h2>{title}</h2>
        <h3>{page.heading}</h3>
        <ul>{page.bullets.map(item => <li key={item}>{item}</li>)}</ul>
        <div className="guide-actions">
          <button onClick={() => setIndex(i => Math.max(0, i - 1))}>上一页</button>
          {index < pages.length - 1 ? (
            <button onClick={() => setIndex(i => i + 1)}>下一页</button>
          ) : (
            <button onClick={onClose}>我知道了</button>
          )}
        </div>
      </div>
    </div>
  ) : null
}
```

- [ ] **Step 5: Wire modal and reopen button into `SchemePanel.tsx`**

```tsx
const shouldShowSchemeGuide = !schemeOnboardingSeen.scheme_master_guide

{shouldShowSchemeGuide && (
  <SchemeOnboardingModal
    open
    title={SCHEME_MASTER_GUIDE_CONTENT.title}
    pages={SCHEME_MASTER_GUIDE_CONTENT.pages}
    onClose={() => markSchemeOnboardingSeen('scheme_master_guide')}
  />
)}

<button className="btn-help" onClick={() => setShowSchemeGuide(true)}>
  计谋指南
</button>
```

- [ ] **Step 6: Run focused UI test to verify pass**

Run:
```powershell
npx.cmd vitest run "src/components/SchemePanel/SchemePanel.onboarding.test.tsx"
```
Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/components/SchemePanel/SchemeOnboardingModal.tsx src/components/SchemePanel/SchemePanel.tsx src/data/prologueContent.ts src/components/SchemePanel/SchemePanel.onboarding.test.tsx
git commit -m "feat: add first-round scheme onboarding modal"
```

### Task 3: Upgrade omen guidance into a dedicated teaching modal

**Files:**
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\OmenTeachingModal.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\omenGuide.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\data\prologueContent.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\SchemePanel.tsx`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\omenGuide.test.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\SchemePanel.onboarding.test.tsx`

- [ ] **Step 1: Add failing tests for the new omen teaching presentation**

```ts
it('shows full omen teaching modal on first omen-available round for normal difficulty', () => {
  const presentation = getOmenGuidePresentation({
    round: 13,
    difficulty: 'normal',
    firstRoundGuideSeen: { scheme_phase: true },
    omenGuideSeen: { first_omen_modal: false },
    schemeOnboardingSeen: { first_omen_teaching: false, scheme_master_guide: true },
  })
  expect(presentation).toBe('modal')
})
```

```tsx
it('renders omen teaching with chen pronunciation and dual-step explanation', () => {
  render(<SchemePanel />)
  expect(screen.getByText('谶（chen）纬')).toBeInTheDocument()
  expect(screen.getByText(/先写一段谶辞/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run focused tests to verify failure**

Run:
```powershell
npx.cmd vitest run "src/game/omenGuide.test.ts" "src/components/SchemePanel/SchemePanel.onboarding.test.tsx"
```
Expected: FAIL because modal content is still old/simple.

- [ ] **Step 3: Add omen teaching content with good/bad examples**

```ts
export const FIRST_OMEN_TEACHING_CONTENT = {
  title: '谶（chen）纬初解',
  intro: '谶纬不是普通离间，而是借征兆与灾异动摇法统与名分。',
  goodExample: {
    omen: '石人一只眼，挑动黄河天下反。',
    interpretation: '灾异若与越分侵权之人相连，朝野自会把祸兆归到人事失序上。',
  },
  badExample: {
    omen: '最近天意不太好。',
    interpretation: '大家最好小心一点。',
  },
}
```

- [ ] **Step 4: Expand omen guide state machine to support detailed teaching modal and later inline reminder**

```ts
if (!schemeOnboardingSeen.first_omen_teaching && profile.onboarding.showFullOmenGuide) {
  return 'modal'
}
return 'inline'
```

- [ ] **Step 5: Render the new modal in `SchemePanel.tsx` and mark it seen separately from old state**

```tsx
{shouldShowOmenGuide && (
  <OmenTeachingModal
    open
    content={FIRST_OMEN_TEACHING_CONTENT}
    onClose={() => markSchemeOnboardingSeen('first_omen_teaching')}
  />
)}
```

- [ ] **Step 6: Run focused tests to verify pass**

Run:
```powershell
npx.cmd vitest run "src/game/omenGuide.test.ts" "src/components/SchemePanel/SchemePanel.onboarding.test.tsx"
```
Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/components/SchemePanel/OmenTeachingModal.tsx src/game/omenGuide.ts src/data/prologueContent.ts src/components/SchemePanel/SchemePanel.tsx src/game/omenGuide.test.ts src/components/SchemePanel/SchemePanel.onboarding.test.tsx
git commit -m "feat: add dedicated omen teaching modal"
```

### Task 4: Implement Feng Daozhi AI drafting helper with visibility-safe context

**Files:**
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\fengDaozhiAdvisor.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\ai\prompts.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\npcPromptContext.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\stores\gameStore.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\fengDaozhiAdvisor.test.ts`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\ai\prompts.test.ts`

- [ ] **Step 1: Add failing tests for visibility-safe Feng Daozhi context**

```ts
it('does not leak locked secret threads into Feng Daozhi context', () => {
  const npc = { ...INITIAL_NPCS.find(n => n.id === 'zuting')!, secretThreads: ['已知', '未解锁'] }
  const context = buildFengDaozhiDraftContext({
    round: 8,
    npc,
    unlockedSecrets: 1,
    recentBacklash: [],
    roundHistory: [],
  })
  expect(context.visibleSecrets).toEqual(['已知'])
  expect(context.visibleSecrets).not.toContain('未解锁')
})
```

```ts
it('builds omen draft prompts with dual-step output instructions', () => {
  const prompt = buildFengDaozhiDraftPrompt({ schemeType: 'omen', ...fixture })
  expect(prompt.system).toContain('先给出谶辞或征兆')
  expect(prompt.system).toContain('再给出解释或指向')
})
```

- [ ] **Step 2: Run focused tests to verify failure**

Run:
```powershell
npx.cmd vitest run "src/game/fengDaozhiAdvisor.test.ts" "src/ai/prompts.test.ts"
```
Expected: FAIL because helper/prompt do not exist yet.

- [ ] **Step 3: Create `fengDaozhiAdvisor.ts` context builder**

```ts
export function buildFengDaozhiDraftContext(input: BuildInput) {
  return {
    round: input.round,
    eventName: input.currentEvent?.eventName ?? '',
    eventBriefing: input.currentEvent?.briefing ?? '',
    visibleSecrets: input.npc.secretThreads.slice(0, input.unlockedSecrets),
    recentBacklash: input.recentBacklash.slice(0, 2).map(item => item.summary),
    playerDangerStage: input.playerDangerStage,
    factionPressure: deriveFactionPressureSummary(input.npc, input.factions),
  }
}
```

- [ ] **Step 4: Add Feng Daozhi prompt builder**

```ts
export function buildFengDaozhiDraftPrompt(input: FengDaozhiPromptInput) {
  const dualStepLine = input.schemeType === 'omen'
    ? '若为谶纬，先给出谶辞/征兆，再给出解释/指向。'
    : '给出一段可直接使用、可继续润色的短说辞。'

  return {
    system: [
      '你是冯道之，只能使用玩家当前已知信息，不得泄露未解锁暗线。',
      '不要给系统最优解，只代拟当下这一手。',
      dualStepLine,
    ].join('\n'),
    user: `目标：${input.targetNpc.name}；计谋：${input.schemeLabel}；时局：${input.eventBriefing}`,
  }
}
```

- [ ] **Step 5: Add store action for requesting a draft and consuming budget**

```ts
requestFengDaozhiDraft: async (payload) => {
  if (get().fengDaozhiAssistsRemaining <= 0) return null
  const prompt = buildFengDaozhiDraftPrompt(payload)
  const reply = await chatCompletion(prompt, { temperature: 0.75, maxTokens: 220, tag: 'feng_daozhi_draft' })
  get().consumeFengDaozhiAssist()
  return normalizeFengDaozhiDraft(reply, payload.schemeType)
}
```

- [ ] **Step 6: Run focused tests to verify pass**

Run:
```powershell
npx.cmd vitest run "src/game/fengDaozhiAdvisor.test.ts" "src/ai/prompts.test.ts"
```
Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/game/fengDaozhiAdvisor.ts src/ai/prompts.ts src/game/npcPromptContext.ts src/stores/gameStore.ts src/game/fengDaozhiAdvisor.test.ts src/ai/prompts.test.ts
git commit -m "feat: add Feng Daozhi drafting helper"
```

### Task 5: Add Feng Daozhi assist UI to SchemePanel

**Files:**
- Create: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\FengDaozhiAssistPanel.tsx`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\SchemePanel.tsx`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\FengDaozhiAssistPanel.test.tsx`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\SchemePanel\SchemePanel.onboarding.test.tsx`

- [ ] **Step 1: Write failing UI tests for assist quota and text injection**

```tsx
it('shows the per-round Feng Daozhi quota after target and scheme are selected', () => {
  render(<SchemePanel />)
  selectNpcAndScheme('祖廷', '献策')
  expect(screen.getByRole('button', { name: /请冯道之代拟一手/ })).toBeInTheDocument()
})

it('fills omen dual fields when Feng Daozhi drafts for omen', async () => {
  mockDraft({ primaryText: '石人一只眼，挑动黄河天下反。', secondaryText: '这不是天灾独作，恐是名分失序之兆。' })
  render(<SchemePanel />)
  selectNpcAndScheme('宗艾', '谶纬')
  await user.click(screen.getByRole('button', { name: /请冯道之拟谶/ }))
  expect(screen.getByDisplayValue('石人一只眼，挑动黄河天下反。')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run focused UI tests to verify failure**

Run:
```powershell
npx.cmd vitest run "src/components/SchemePanel/FengDaozhiAssistPanel.test.tsx" "src/components/SchemePanel/SchemePanel.onboarding.test.tsx"
```
Expected: FAIL because assist panel does not exist yet.

- [ ] **Step 3: Build reusable assist panel**

```tsx
export function FengDaozhiAssistPanel({
  canUse,
  remaining,
  isOmen,
  isLoading,
  onDraft,
  previewText,
}: Props) {
  const label = isOmen ? `请冯道之拟谶（${remaining}）` : `请冯道之代拟一手（${remaining}）`
  return (
    <div className="feng-assist-panel glass-panel">
      <h4>冯道之</h4>
      <p>{previewText ?? '若你一时无从下笔，可请冯道之先为你点一手。'}</p>
      <button disabled={!canUse || isLoading} onClick={onDraft}>{label}</button>
    </div>
  )
}
```

- [ ] **Step 4: Wire it into `SchemePanel.tsx` and inject returned text into either single or omen fields**

```tsx
const handleRequestFengDaozhiDraft = async () => {
  const draft = await requestFengDaozhiDraft({ ...payload })
  if (!draft) return
  if (selectedScheme === 'omen') {
    setOmenText(draft.primaryText)
    setInterpretationText(draft.secondaryText ?? '')
  } else {
    setSpeech(draft.primaryText)
  }
}
```

- [ ] **Step 5: Run focused UI tests to verify pass**

Run:
```powershell
npx.cmd vitest run "src/components/SchemePanel/FengDaozhiAssistPanel.test.tsx" "src/components/SchemePanel/SchemePanel.onboarding.test.tsx"
```
Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/components/SchemePanel/FengDaozhiAssistPanel.tsx src/components/SchemePanel/SchemePanel.tsx src/components/SchemePanel/FengDaozhiAssistPanel.test.tsx src/components/SchemePanel/SchemePanel.onboarding.test.tsx
git commit -m "feat: add Feng Daozhi assist panel"
```

### Task 6: Strengthen Feng Daozhi’s stage-teacher role for external and omen lines

**Files:**
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\externalActionHint.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\roundIntelEngine.ts`
- Modify: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\components\RoundStart\RoundStart.tsx`
- Test: `C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\codex-difficulty-balance-inline\佞臣_MuleRun Version\src\game\roundIntelEngine.test.ts`

- [ ] **Step 1: Write failing tests for stronger stage-language hints**

```ts
it('states the external line stage explicitly as 养信 / 探暗线 / 离心 / 等窗口', () => {
  const hint = buildExternalActionStageHint(...)
  expect(hint).toMatch(/养信|探暗线|离心|窗口/)
})

it('mentions omen as a legality crack tool rather than ordinary division', () => {
  const hint = getRoundAdvisorHint(13, npcs, null)
  expect(hint).toContain('名分')
})
```

- [ ] **Step 2: Run focused tests to verify failure**

Run:
```powershell
npx.cmd vitest run "src/game/roundIntelEngine.test.ts"
```
Expected: FAIL because wording is still older/rougher.

- [ ] **Step 3: Tighten the advisor hint copy to match the spec**

```ts
return `冯道之密语：此线眼下仍在养信，莫急于明牌。`
```

```ts
return `冯道之密语：谶纬先动名分，不在直接挑拨谁与谁。`
```

- [ ] **Step 4: Run focused tests to verify pass**

Run:
```powershell
npx.cmd vitest run "src/game/roundIntelEngine.test.ts"
```
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/game/externalActionHint.ts src/game/roundIntelEngine.ts src/components/RoundStart/RoundStart.tsx src/game/roundIntelEngine.test.ts
git commit -m "feat: strengthen Feng Daozhi teaching hints"
```

### Task 7: Full verification and optional live smoke

**Files:**
- No new product files
- Update docs only if verification discovers user-facing rule drift

- [ ] **Step 1: Run full test suite**

Run:
```powershell
npx.cmd vitest run
```
Expected: PASS.

- [ ] **Step 2: Run production build**

Run:
```powershell
npm.cmd run build
```
Expected: build succeeds with no type errors.

- [ ] **Step 3: Run a focused local UX smoke for guide + assist**

Run:
```powershell
npm.cmd run dev
```
Expected manual checks:
- 首回合进入施计页自动出现“施计总引导”
- 右上角能重新打开“计谋指南”
- 第一次可用谶纬时出现专属教学
- 简单/普通/困难/地狱的冯道之次数分别为 3/2/1/0
- 冯道之代拟不会泄露未解锁暗线

- [ ] **Step 4: If DS network is healthy, run a tiny live smoke on one normal-difficulty sample with Feng Daozhi assist disabled by default**

Run:
```powershell
npm.cmd run balance:live-ai -- --sample average-mainline
```
Expected: command completes; report generated; no prompt regression or JSON breakage from new prompt builder.

- [ ] **Step 5: Commit any final doc/test adjustments**

```powershell
git add .
git commit -m "test: verify scheme onboarding and Feng Daozhi assist"
```

## Spec Coverage Check
- 首回合施计总引导弹窗：Task 2
- 首次谶纬专属教学弹窗：Task 3
- AI 冯道之按难度限次代拟：Task 1、Task 4、Task 5
- 冯道之只用玩家可见信息：Task 4
- 冯道之在割据/叛乱与谶纬中的阶段导师角色：Task 6
- 按钮与复看入口：Task 2、Task 3、Task 5

## Placeholder Scan
- 没有 `TODO/TBD`。
- 所有任务都给出文件、测试与命令。

## Type Consistency Check
- 引导状态统一命名为 `schemeOnboardingSeen`。
- 冯道之次数统一命名为 `fengDaozhiAssistsRemaining`。
- 冯道之代拟返回统一命名为 `FengDaozhiDraftResult`。
