# 冯道之首回合引导与锦囊查验报告

查验时间：2026-06-17

当前 worktree：`C:\Users\micha\Desktop\NingChenActive\worktrees\feng-first-round-guide-kit`

当前项目：`NingChenv4`

对照历史 worktree：`C:\Users\micha\Desktop\NingChenActive\worktrees\integrate-main-system-into-uiux`

## 总结

当前分支里，“回合首页的冯道之锦囊”已经不在前端显示路径里。20 回合的静态 `hint` 文案仍保留在 `src/data/rounds.ts`，旧样式也残留在 `RoundStart.css`，但当前 `RoundStart.tsx` 不再计算或渲染冯道之锦囊。测试还明确要求回合首页不要出现“冯道之锦囊”。

首回合引导仍部分可见：回合首页、朝堂观察、女帝问政、计谋回报、天道结算都有 `FirstRoundGuideModal` 接线；但 `scheme_phase` 的首回合施计引导只剩内容和状态字段，没有当前可见入口。

谶纬引导目前属于“内容和测试还在，生产入口断开”。`FIRST_OMEN_TEACHING_CONTENT`、`OmenTeachingModal`、`getOmenGuidePresentation` 都还在；历史分支里这些会由非嵌入式 `SchemePanel` 触发。当前分支已移除 `SCHEME_PHASE` 路由和旧的非嵌入式 `SchemePanel` 教学接线，只剩施计表单里的谶纬双栏输入、placeholder、解锁提示和冯道之代拟。

## 当前 worktree 查验

### 1. 回合首页锦囊

结论：当前回合首页不可见，且主要渲染机制已删除。

仍保留的内容：

- `NingChenv4/src/data/rounds.ts:39` 到 `:248`：`ROUND_EVENTS` 的 1-20 回合仍都有 `hint: '冯道之密语：...'`。
- `NingChenv4/src/components/RoundStart/RoundStart.css:68`、`:378`、`:426`：旧 `.hint-card` / `.roundstart-hint-card` 样式仍在，但当前 JSX 没有对应节点。
- `NingChenv4/src/game/roundIntelEngine.ts:44`：`getRoundAdvisorHint(...)` 仍存在。
- `NingChenv4/src/game/externalActionHint.ts:15`：地方军头阶段锦囊生成器仍存在。
- `NingChenv4/src/game/fengDaozhiHint.ts:1`：谶纬回合的冯道之提示生成器仍存在。

当前不可见或断开的点：

- `NingChenv4/src/components/RoundStart/RoundStart.tsx:143` 起只取 `eventName`、`briefing`、标题、地图和国力展示；没有消费 `event.hint`、`getRoundAdvisorHint`、`buildDominantExternalStageHint` 或 `buildOmenAdvisorHint`。
- `NingChenv4/src/components/RoundStart/RoundStart.test.tsx:67`、`:84` 明确断言页面不包含“冯道之锦囊”。
- `getRoundAdvisorHint`、`buildExternalActionStageHint`、`buildOmenAdvisorHint` 在当前生产代码中没有回合首页调用点，主要只被测试覆盖。

仍然可见但不属于回合首页锦囊的冯道之信息：

- `NingChenv4/src/components/CourtView/CourtView.tsx:410` 使用 `getHighlightedNpcIds` 计算本回合重点人物。
- `NingChenv4/src/components/CourtView/CourtView.tsx:968` 到 `:974` 在人物席位上显示“冯道之锦囊提及”的标记。
- `NingChenv4/src/components/CourtView/CourtView.tsx:1595` 到 `:1600` 在 NPC 详情中显示“冯道之密札”，其中地方军头会展示阶段差距提示，朝堂人物会展示旁批/默认提示。

### 2. 首回合引导

结论：首回合引导内容仍在，但只有部分阶段有当前入口。

内容源：

- `NingChenv4/src/data/prologueContent.ts:123`：`FIRST_ROUND_GUIDE_CONTENT` 仍包含 `round_start`、`court_observe`、`scheme_phase`、`empress_letter`、`scheme_feedback`、`settlement`。
- `NingChenv4/src/components/FirstRoundGuide/FirstRoundGuideModal.tsx:10`：弹窗组件仍存在，并通过 `createPortal` 渲染到 `document.body`。

当前可见入口：

- 回合首页：`RoundStart.tsx:157` 到 `:161`，第 1 回合且 `round_start` 未看过时显示。
- 朝堂观察：`CourtView.tsx:1612` 到 `:1616`，第 1 回合且 `court_observe` 未看过时显示。
- 女帝问政：`EmpressLetter.tsx:71` 到 `:75`，第 1 回合且 `empress_letter` 未看过时显示。
- 计谋回报：`SchemeFeedback.tsx:1347` 到 `:1351`，第 1 回合且 `scheme_feedback` 未看过时显示。
- 天道结算：`Settlement.tsx:800` 到 `:804`，第 1 回合且 `settlement` 未看过时显示。

当前断开的入口：

- `scheme_phase` 文案还在 `prologueContent.ts:138` 到 `:143`，状态字段也在 `game/types.ts:61` 到 `:68` 和 `stores/gameStore.ts:185` 到 `:192`。
- 但当前 `App.tsx` 不再 lazy-load `SchemePanel`，`RoundPhase` 也不再包含 `SCHEME_PHASE`：见 `App.tsx:11` 到 `:21`、`:96` 到 `:114`，以及 `game/types.ts:1` 到 `:9`。
- 当前施计入口嵌在 `CourtView` 的 NPC 详情里：`CourtView.tsx:37` 引入 `SchemeComposer`，`:1419`、`:1537` 处嵌入；这个嵌入式 `SchemeComposer` 没有首回合 `scheme_phase` 弹窗。

### 3. 谶纬引导

结论：旧弹窗式谶纬引导目前前端不可见；只剩施计表单内的局部帮助。

仍保留的内容和组件：

- `NingChenv4/src/data/prologueContent.ts:206`：`FIRST_OMEN_TEACHING_CONTENT` 仍在，包含标题、步骤、适用对象、正反例和影响说明。
- `NingChenv4/src/components/SchemePanel/OmenTeachingModal.tsx:10`：谶纬教学弹窗组件仍在。
- `NingChenv4/src/game/omenGuide.ts:16`：`getOmenGuidePresentation(...)` 仍在，逻辑上第 13/14/19/20 回合可决定 modal 或 inline。

当前断开的点：

- 全局搜索显示，`FIRST_OMEN_TEACHING_CONTENT`、`OmenTeachingModal`、`getOmenGuidePresentation` 在当前生产路径没有被 `SchemePanel.tsx` 或 `CourtView.tsx` 调用，只被测试或组件自身引用。
- `buildOmenAdvisorHint` 当前也没有生产调用点，主要被 `roundIntelEngine.test.ts` 覆盖。

当前仍可见的谶纬局部帮助：

- `SchemePanel.tsx:46` 到 `:48`：选择谶纬时，表单字段切换为“谶辞 / 征兆”和“解释 / 指向”，并显示 helperText。
- `SchemePanel.tsx:179` 到 `:183`：谶纬不可用时会给出“只可对朝堂人物”“无灾异/名分裂缝”等解锁提示。
- `SchemePanel.tsx:721`、`:734`：谶纬双栏输入框仍有 placeholder。
- `SchemePanel.tsx:740` 到 `:761`：冯道之代拟仍接在施计输入区。

### 4. 地方军头锦囊/外部线引导

结论：地方军头引导文案还在，但“回合首页的冯道之锦囊会明确告诉你每个军头差什么”这句当前不再符合 UI 事实。

仍保留：

- `prologueContent.ts:232`：`EXTERNAL_LINE_TEACHING_CONTENT` 仍在。
- `prologueContent.ts:247` 到 `:255` 明确写着“回合首页的冯道之锦囊会明确告诉你每个军头差什么”。
- `CourtView.tsx:130` 到 `:149` 仍有针对地方军头的密语构造逻辑，NPC 详情页可显示。
- `externalActionHint.ts:15` 起仍有面向“主导外部目标”的阶段提示生成器，但当前回合首页不调用。

需要注意：

- 当前玩家不是在回合首页看到“每个军头差什么”，而是在朝堂/地方人物详情或相关标记里获得提示。
- 后续如果重做回合首页锦囊，建议同步修正 `EXTERNAL_LINE_TEACHING_CONTENT`，避免引导文本再次指向不存在的 UI。

## 历史 worktree 对照

### 1. 历史回合首页锦囊

历史分支 `integrate-main-system-into-uiux` 中，`RoundStart.tsx` 还保留完整的旧锦囊计算和旧布局渲染。

证据：

- `RoundStart.tsx:5` 到 `:15` 引入 `ROUND_CONTEXT_NOTES`、`getRoundAdvisorHint`、`buildDominantExternalStageHint`、`buildOmenAdvisorHint`、`buildCampaignRecordPanel`、`NpcPortrait`。
- `RoundStart.tsx:65` 到 `:77` 有 `stripAdvisorPrefix(...)`，专门清理“冯道之密语”前缀。
- `RoundStart.tsx:197` 到 `:218` 计算 `externalStageHint`、`omenAdvisorHint`、`courtAdvisorHint`、`courtHintText`、`externalHintText`。
- `RoundStart.tsx:489` 到 `:507` 渲染旧的 `<h3>冯道之锦囊</h3>`，包含“朝堂势力”和“地方军头”两段。

但历史分支也已经有 UI/UX 重构后的紧凑布局：

- `RoundStart.tsx:259` 到 `:373`：如果使用 compact layout，会提前 return，只渲染标题、简报、两国国力、地图、入朝按钮；不会走到 `:489` 的旧锦囊布局。
- `RoundStart.test.tsx:55` 到 `:70`、`:73` 到 `:87`：测试要求紧凑布局不出现旧的 `context-list`、朝堂势力等内容。

对比当前分支：

- 当前 `RoundStart.tsx` 已不再引入或计算上述冯道之锦囊源。
- 当前只剩 `RoundStart.css` 里的旧样式和 `data/rounds.ts` 的静态 `hint` 文案。

### 2. 历史施计/谶纬引导

历史分支中，旧的非嵌入式 `SchemePanel` 仍接入完整教学。

证据：

- `SchemePanel.tsx:10` 到 `:16` 引入 `EXTERNAL_LINE_TEACHING_CONTENT`、`FIRST_OMEN_TEACHING_CONTENT`、`SCHEME_MASTER_GUIDE_CONTENT`、`getOmenGuidePresentation`、`buildOmenTargetHint`。
- `SchemePanel.tsx:431` 到 `:450` 计算谶纬弹窗、谶纬 inline hint、计谋指南、地方军头教学是否显示。
- `SchemePanel.tsx:979` 到 `:1012` 渲染计谋指南、谶纬教学弹窗、地方军头教学弹窗。
- `SchemePanel.tsx:1062` 到 `:1065` 渲染谶纬 inline hint。
- `App.tsx:29`、`:46` 到 `:49`、`:421` 到 `:427`：历史分支仍有 `SCHEME_PHASE` 路由，能进入非嵌入式 `SchemePanel`。
- `game/types.ts:1` 到 `:10`：历史 `RoundPhase` 包含 `SCHEME_PHASE`。

对比当前分支：

- 当前 `game/types.ts:1` 到 `:9` 已无 `SCHEME_PHASE`。
- 当前 `App.tsx:11` 到 `:21` 未 lazy-load `SchemePanel`，`:96` 到 `:114` 也没有 `SCHEME_PHASE` 分支。
- 当前 `SchemePanel.tsx` 仍保留施计作业台和谶纬输入，但没有上述教学导入/显示逻辑。

## 后续实现建议

1. 如果要恢复“回合首页锦囊”，优先在当前 compact `RoundStart` 中新增一个轻量 `FengDaozhiRoundKit` 区块，而不是恢复历史非 compact 大布局。可复用的源包括 `ROUND_EVENTS[].hint`、`getRoundAdvisorHint`、`buildDominantExternalStageHint`、`buildOmenAdvisorHint`。

2. 如果要补齐“首回合施计引导”，应在当前嵌入式 `SchemeComposer` 第一次打开时触发 `FIRST_ROUND_GUIDE_CONTENT.scheme_phase`，同时设置 `markFirstRoundGuideSeen('scheme_phase')`。这比恢复 `SCHEME_PHASE` 路由更贴合当前 UI/UX。

3. 如果要恢复“谶纬引导”，建议在当前嵌入式 `SchemeComposer` 中，当玩家首次进入谶纬可用回合并选择/看到谶纬时显示 `OmenTeachingModal` 或更轻的 inline 教学；同时复用 `getOmenGuidePresentation` 或重写为适配嵌入式流程的判断。

4. 如果继续使用“地方军头玩法”教学，需同步修改 `EXTERNAL_LINE_TEACHING_CONTENT` 中“回合首页的冯道之锦囊”这类指向；当前事实是 NPC 详情和席位标记可见，回合首页不可见。
