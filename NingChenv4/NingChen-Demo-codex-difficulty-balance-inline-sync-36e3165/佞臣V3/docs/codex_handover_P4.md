# 《佞臣》项目交接文档 (Codex Handover - P4)

你好，Codex。这是一份关于《佞臣》（Nichen）基于 React 18 + Vite + TypeScript 开发的回合制策略叙事游戏的开发进度与基建交接文档。本项目已完成了 P0 到 P4 阶段的核心架构与玩法逻辑搭建，目前所有已知 Bug 均已修复，核心系统运转良好。

请仔细阅读本文档以了解当前的系统架构、数据流以及各项设计约束，从而接手后续的迭代工作。

---

## 1. 游戏架构与核心系统概览

本项目采用状态机驱动的回合制流水线设计。**没有任何后端服务器**，所有逻辑计算均在浏览器本地完成，并通过 `aiService.ts` 直连大模型 API (如 Kimi/Moonshot, 或平台内置 SDK `$mujian`) 生成叙事文本。

### 1.1 核心状态流转 (Game Loop)
游戏回合流由 Zustand Store (`useGameStore`) 控制，枚举定义在 `types.ts` 中的 `RoundPhase`：
1. `ROUND_START`: 回合开始，展示本回合固定事件、五维雷达图、相对国力播报，以及冯道之的“锦囊提示”。
2. `COURT_OBSERVE`: 朝局观察页，展示 10 位处于不同阵营的北周 NPC 列表（死活状态、官职、信任度）。
3. `SCHEME_PHASE`: 计谋操作页。玩家在一回合内需进行 **3 次** 针对不同 NPC 的施计。施计过程为 **非阻塞异步 (Fire-And-Forget)**，后台启动 AI 请求。
4. `EMPRESS_LETTER`: 施计 3 次后，女帝来信，玩家需撰写述职报告并选择一条国策。
5. `SCHEME_FEEDBACK` **(新增)**: 暗线回报页。集中展示前面 3 次施计的 NPC 反馈（等待所有 AI Promise Resolve）。
6. `SETTLEMENT`: 结算页。后台运行 `roundSettlement.ts` 数值引擎计算所有变化，并调用“天道判官”生成一段带有文言色彩的朝局演变叙事，最后展示数值变化与雷达图。
7. `ROUND_END` -> `ROUND_START` 或 `ENDING`。

### 1.2 状态管理 (Zustand)
- `stores/gameStore.ts`: 存储当前的回合数、阶段、南北国力数值 (`northStats`, `southPower`)、10位NPC实例及其信任度、当前回合记录的计谋 (`currentSchemes`) 以及异步反馈数组 (`npcFeedbacks`)。
- `stores/uiStore.ts`: 控制全局 UI 组件，如 `NPCDetail` 详情弹窗的开关。

### 1.3 AI 生成架构
所有的 Prompt 构造与大模型调用均已模块化：
- `ai/aiService.ts`: 封装的 `chatCompletion` 调用。支持多模式（Mujian SDK 代理注入/本地 Kimi API / Fallback 离线文本）。
- `ai/prompts.ts`: 集中放置 Prompt 生成器：
  - `buildNpcPrompt`: 结合计谋类型、信任度、成功与否生成 NPC 个性化暗线反馈。
  - `buildJudgePrompt`: 结合玩家本回合所有动作和真实的数值差，生成防幻觉的结算文言文段落。
  - `buildEmpressPrompt`: 基于国策生成女帝评语。

---

## 2. 截止 P4 阶段已完成的功能与重构

在刚刚结束的 P4 阶段中，我们解决了试玩暴露的 6 大核心痛点，并完成了一系列底层重构：

### 2.1 彻底的异步流水线重构
- **痛点**：过去玩家进行一次计谋后，UI 会被锁死，傻等大模型生成反馈。
- **现状**：`SchemePanel.tsx` 被重写为非阻塞流。玩家点击“行事”后，动作被立即记录到 `gameStore`，AI 请求被抛到后台不阻塞主线程。直到 `EMPRESS_LETTER` 环节结束后，系统进入全新的 `SchemeFeedback.tsx` 组件集中检查这些 Promise，若没生成完则显示 loading，生成完即展示。

### 2.2 数据可视化：原生 SVG 雷达图组件
- 完全零依赖、手写的 `<RadarChart />` SVG 组件 (`components/RadarChart`)，动态渲染【军事、统治、财政、社会、粮赋】五维属性。已集成于 `RoundStart` 和 `Settlement`。
- `relativePower.ts` 中封装了动态测算双边局势的文字播报（如：“势均力敌”、“明显弱势”等），并根据阈值附带了警示颜色 (`danger`, `safe` 等级)。

### 2.3 NPC 判定逻辑与 UI 体验升级
- **逻辑剥离**：为 `NPC` 接口引入了独立的 `isAlive: boolean` 字段。原来的 `canExecute: boolean` 现在纯粹代表“是否有权力处决主角（例如只有太后、大都督等高官才有）”，从而根治了无处决权角色（如基层武将）被UI误判为“已故”的 Bug。
- **UI 优化**：将 `CourtView` 里的 `gold-panel` 统一降级为偏黑的磨砂透明卡片 (`npc-card-dark` 设计模式)，极大提升了纯金汉字在卡片中的辨识对比度。
- **人设丰满**：全面扩写了 `npcs.ts` 中 10 位可互动角色的 `personality` 和 `publicStance` 字段，以 2-3 句话的饱满设定代替原来的一句短语，使大模型扮演时人设更加立体。

### 2.4 天道判官的“防幻觉”指令
- 针对结算叙事经常“无中生有”捏造剧情的 Bug，升级了 `buildJudgePrompt`，不仅强制降低了 AI `temperature` (0.7 左右)，还将“玩家说辞”、“计谋成功率”、“NPC 实际反馈文案”作为上下文一起压给了大模型，且明令禁止发散。

---

## 3. 核心文件索引清单

为加速你的接手过程，请重点关注以下文件及所负责的职责：
- **`src/App.tsx`**: 应用根渲染器，承载了基于 `currentPhase` 的页面路由 Switch。
- **`src/stores/gameStore.ts`**: 第一等公民，定义并持有所有的业务状态。了解 `npcFeedbacks` 数组的生命周期。
- **`src/game/roundSettlement.ts`**: **最核心的数值引擎**。所有的结算（事件的自然增长、计谋导致的信任度波动、对北周的破坏）全部在这个文件内推演闭环。
- **`src/game/types.ts`**: TypeScript Interface 的定义源。包括 `NPC` 与非交互型 `Advisor` 的隔离定义等。
- **`src/components/SchemePanel/`** & **`src/components/SchemeFeedback/`**: P4 刚完成的异步流水线的两端组件。

---

## 4. 后续任务安排方向预估 (Next Steps)

现在地基已经非常牢靠，我们预期的下一步 (P5及以后) 工作范畴可能包括：
1. **剧情填充与事件补全**：目前 `rounds.ts` 中的 20 回合独立事件可能还需要细化和润色。
2. **Ending 结局系统实装**：当前如果玩家死亡或触发时间线崩塌，会流转至 `ENDING` phase，但对应的结算视觉和多重结局文案尚未完全铺开。
3. **数值平衡微调**：由于我们刚刚改写过一轮计谋影响的计算参数，目前可能还需要试玩测试来调整 `calculateCompositePower` 中的权重。
4. **性能与细节打磨**：动画衔接细节、组件拆分及更深入的 CSS 样式梳理。

项目代码很整洁无警告，TS校验已通过 `tsc && vite build`，可随时开工。请继续接力！
