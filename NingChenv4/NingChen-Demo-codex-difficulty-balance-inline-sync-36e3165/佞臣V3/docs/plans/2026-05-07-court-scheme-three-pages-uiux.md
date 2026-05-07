# 朝堂施计三页 UI/UX 继续优化 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 基于当前 `codex/ningchen-ux-ui-polish` worktree，继续优化《佞臣》“朝堂势力 -> 人物案卷 -> 案卷内施计抽屉”三层流程，让它更像固定游戏屏幕，而不是可滚动网页。

**Architecture:** 保留当前 CourtView v3 的总览页高保真方向，向下延展到势力层、人物详情层与嵌入式 SchemeComposer。只改 UX/UI、CSS、组件组合和必要测试，不改计谋数值、AI prompt schema、AI 判定、store 业务机制。

**Tech Stack:** React + TypeScript + Vite + Zustand + CSS；现有测试为 Vitest / Testing Library。

---

## 新线程可直接复制的 Prompt

你正在接手《佞臣》AI Native 策略文字游戏的 UI/UX 优化任务。请基于当前独立 worktree 继续做“朝堂施计三页”的 UX/UI 优化，不要切回 main worktree。

当前 worktree：

`C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\ningchen-ux-ui-polish`

项目目录：

`C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\ningchen-ux-ui-polish\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3`

当前分支应为：

`codex/ningchen-ux-ui-polish`

请先执行：

```powershell
git branch --show-current
git status --short
npm.cmd install
npm.cmd run dev -- --host 127.0.0.1 --port 5175
```

如果 5175 被占用，可以换端口，但要告诉我本地预览地址。

## 背景与目标

《佞臣》是一款南北朝架空权谋策略文字游戏。玩家扮演南陈宗室萧宝颖，潜入北周朝堂，通过试探、献策、谗言、离间、设局嫁祸、借刀、谶纬、煽动割据、煽动造反等计谋，撬动北周 NPC、派系、地方军头与国力数值。

当前机制系统已经较扎实：NPC 长期记忆、NPC-NPC 关系记忆、AI GameMaster 数值判定、冯道之 AI 军师、女帝回信、《南北朝通鉴》式结算、战役记录等。你的任务只做 UX/UI 和前端呈现优化。

核心 UX 方向：

- 不要把所有信息平铺在一个长网页里。
- 采用“游戏屏幕逻辑”：一个核心视口内承载当前决策，不要求玩家反复上下滚动读核心信息。
- 朝堂页和施计页已经合并成“朝堂工作台”，主流程应为：总览 -> 势力层 -> 人物案卷 -> 案卷内落子抽屉。
- 玩家不是在一张表里找 NPC，而是在一层层翻开朝堂和边镇的权力结构，最终对某个人物落子。
- 保留黑金、阴冷宫廷、南北朝权谋质感，避免现代 SaaS 风、泛二游 UI 和通用 AI 网页卡片堆叠。

## 当前已经完成的基线

CourtView 总览页已经接入 v3 方向：

- 顶部 HUD 压成单行，使用高保真 ornate HUD 背景。
- 右上工具按钮已经图标化：开声/静音、玩法说明、存档、回到菜单。
- 总览页是两张大入口：`朝堂势力` 与 `地方军头`。
- 已接入朝堂/边镇场景图、金边框、note 书法图、北周肃杀背景图。
- 场景卡已有 hover 同步放大、图像遮罩、轻微氛围动效。
- `SchemePanel` 已抽出 `SchemeComposer`，CourtView 人物案卷内可以嵌入落子抽屉。
- `gameStore` 已有最小前端流程动作 `completeSchemingIfReady()`：计谋未满留在当前 phase，计谋满后进入 `EMPRESS_LETTER`。

不要把总览页重新打回低保真。你的重点是继续把总览之后的三层体验做完整、做顺。

## 这轮具体要优化的三页

### 1. 势力层

入口：玩家在总览页点击 `朝堂势力` 或 `地方军头`。

目标形态：

- 不要再像信息列表或数据看板。
- 朝堂势力层建议拆成左右两块：帝党、后党。
- 地方军头层建议拆成左右两块或三块：边镇军头、草原/陇右、暗线势力，按现有数据实际情况收敛。
- 每个 block 上只呈现“玩家此刻需要判断的信息”：势力名、当前态势、三名关键人物座位/名签、极短的一句公开气味。
- 不要铺出长段解释。必要解释进入 hover/title、案卷字段或军师密札。
- 视觉上应延续总览：卷轴、案牍、殿内屏风、军帐图层，而不是普通卡片。

交互：

- 点击势力 block 进入该势力人物层。
- 点击人物名签/座位进入人物案卷。
- 提供清晰返回：人物案卷 -> 势力层 -> 总览。

### 2. 人物案卷层

入口：玩家点击某个 NPC。

目标形态：

- 这是一个“案卷/密档/人物奏档”，不是现代 profile card。
- 首屏优先呈现：人物画像或剪影、姓名、身份、所属势力、公开表态、玩家已知关系/风险、可落子入口。
- 公开表态和关系情报应节制成短句，不要堆长文。
- 用纵签、批注、印章、纸面层组织信息，但避免“卡片套卡片”。
- “对其施计”按钮应在案卷内，点击后同屏打开落子抽屉。

交互：

- 点击 `对其施计` 不应跳转到 standalone `SCHEME_PHASE` 页面。
- 点击后在当前人物案卷内打开“落子抽屉”。
- `更换目标` 关闭抽屉，并回到势力层或人物层，不要在抽屉里铺全 NPC 列表。

### 3. 案卷内施计抽屉

入口：人物案卷点击 `对其施计`。

目标形态：

- 使用现有 `SchemeComposer`，不要复制另一套施计逻辑。
- Embedded 模式默认锁定当前 NPC。
- 只显示当前落子必须项：计谋选择、关联人物选择、说辞输入、冯道之拟稿、提交。
- 施计抽屉要像“夹在案卷里的落子笺/密奏纸”，而不是现代 modal 或 textarea 面板。
- 提交按钮可做成“落印/封奏”感，但不要改业务逻辑。

状态：

- 已用计谋、次数不足、未选择、AI 处理中、提交中、错误状态都要有清晰但克制的视觉反馈。
- 第 1、2 次提交后仍留在 CourtView；第 3 次提交后进入女帝问政/女帝来信阶段。
- 移动端允许抽屉内部滚动，但不要让主流程变成长网页。

## 严格约束

- 不改 `src/game` 与 `src/ai` 的机制逻辑。
- 不改数值公式、成功率、AI prompt schema、结算规则、NPC 记忆结构。
- 不改变计谋提交的业务语义。
- 不新增会影响存档兼容的字段，除非先说明原因。
- 不删除当前可用的 legacy/standalone `SchemePanel`；它仍用于旧 phase 和存档兼容。
- 不把 UI 做成现代后台、SaaS 仪表盘、泛二游主界面或通用 AI 卡片堆。
- 不在页面上写“玩法说明式”的解释文案来替代 UX。

## 优先阅读文件

- `src/components/CourtView/CourtView.tsx`
- `src/components/CourtView/CourtView.css`
- `src/components/CourtView/CourtView.external-line.test.tsx`
- `src/components/SchemePanel/SchemePanel.tsx`
- `src/components/SchemePanel/SchemePanel.css`
- `src/components/SchemePanel/SchemePanel.test.tsx`
- `src/components/GameHud/GameHud.tsx`
- `src/components/GameHud/GameHud.css`
- `src/components/PageUtilityActions/PageUtilityActions.tsx`
- `src/stores/gameStore.ts`，只读为主，除非 UI phase 过渡确实需要最小修改。
- `src/game/types.ts`，只读为主。

## 可复用资产

- `src/assets/ui/hud/hud-ornate-frame-candidate-03-panel.png`
- `src/assets/ui/hud/hud-button-frame.png`
- `src/assets/ui/hud/hud-sound-on.png`
- `src/assets/ui/hud/hud-sound-off.png`
- `src/assets/ui/hud/hud-help.png`
- `src/assets/ui/hud/hud-save.png`
- `src/assets/ui/hud/hud-menu.png`
- `src/assets/ui/court-overview/court-bg-lacquer-v3.jpg`
- `src/assets/ui/court-overview/court-gate-palace.png`
- `src/assets/ui/court-overview/court-gate-frontier.png`
- `src/assets/ui/court-overview/court-gate-frame.png`
- `src/assets/ui/court-overview/court-note-calligraphy-integrated-v2.png`
- `src/assets/ui/court-overview/frontier-note-calligraphy-integrated-v2.png`
- `src/assets/ui/textures/paper-texture.jpg`
- NPC 头像/抠图素材可先查 `public/images/npc/确认【抠背景】/`。

## 设计验收标准

- 1920x1080 与 1280x720 下，核心路径不需要页面滚动：
  `总览 -> 朝堂势力 -> 帝党/后党 -> 人物案卷 -> 对其施计 -> 抽屉提交`。
- 390x844 移动端不溢出；可以局部滚动，但流程要清楚。
- 朝堂/边镇/案卷/施计抽屉视觉统一，像同一套游戏美术系统。
- 信息密度下降，玩家一眼知道下一步该点哪里。
- 视觉层级清晰：背景层、场景/案卷层、氛围层、UI 层、交互态。
- 按钮态和状态态要明确区分：按钮能 hover/active/click；国力、南征、安危、计谋次数等状态只展示，不表现成可点击。

## 测试计划

优先补/更新测试：

- CourtView 渲染不包含已删除的底部旁批文案。
- 总览、势力层、人物案卷层、施计抽屉关键元素可被测试定位。
- CourtView 源码不通过 `prepareSchemeFromNpc + nextPhase()` 进入施计页。
- `SchemeComposer` standalone 与 embedded 都可渲染。
- `completeSchemingIfReady()` 未满计谋次数时不跳转，满次数时进入 `EMPRESS_LETTER`。

运行：

```powershell
npm.cmd test -- CourtView SchemePanel gameStore
npm.cmd test
npm.cmd run build
```

浏览器验收：

- 打开本地预览，截图 1920x1080、1280x720、390x844。
- 路径验证：总览 -> 朝堂势力 -> 任一人物 -> 对其施计 -> 同屏抽屉 -> 提交。
- 确认第 1、2 次提交后留在 CourtView，第 3 次提交后进入女帝问政/女帝来信。

## 建议执行顺序

1. 读 CourtView 与 SchemeComposer，画出当前层级状态与 class 结构。
2. 写或更新 CourtView 的层级渲染测试，让测试先描述你要的三层 UI。
3. 先做势力层布局，不碰施计逻辑。
4. 做人物案卷层的信息重排。
5. 做案卷内施计抽屉的视觉和交互状态。
6. 做移动端适配。
7. 跑定向测试。
8. 本地浏览器截图验收。
9. 跑全量测试和 build。

## 参考文档

- `C:\Users\happyelements\Desktop\佞臣 Demo\UXUI 优化\001-游戏屏幕逻辑与目标信息架构.md`
- `C:\Users\happyelements\Desktop\佞臣 Demo\UXUI 优化\002-层级推进式朝堂施计UX修订.md`
- `C:\Users\happyelements\Desktop\佞臣 Demo\UXUI 优化\006-外部AI设计Agent朝堂工作台说明.md`
- `C:\Users\happyelements\Desktop\佞臣 Demo\UXUI 优化\008-朝堂总览高保真参考图落地与资产生成方案.md`
- `C:\Users\happyelements\Desktop\佞臣 Demo\UXUI 优化\009-HUD图标化与状态牌设计备忘.md`
- `C:\Users\happyelements\Desktop\佞臣 Demo\UXUI 优化\010-HUD与朝堂总览资产接入计划.md`
- `C:\Users\happyelements\Desktop\佞臣 Demo\UXUI 优化\design.md`
- `C:\Users\happyelements\Desktop\佞臣 Demo\美术音频资产\global_art_style_v1_2026-04-28.md`

