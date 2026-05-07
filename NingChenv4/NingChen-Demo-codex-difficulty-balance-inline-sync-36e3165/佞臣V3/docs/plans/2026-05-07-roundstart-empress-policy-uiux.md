# 回合首页与女帝问政 UI/UX 优化 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 基于当前 `codex/ningchen-ux-ui-polish` worktree，优化《佞臣》回合首页与女帝问政页，让它们与朝堂总览 v3 的高保真游戏屏幕逻辑一致。

**Architecture:** 复用现有 GameHud、黑金宫廷视觉资产和固定游戏屏布局，把 RoundStart 做成“回合战情屏”，把 EmpressLetter 做成“女帝密札/问政奏对”屏。只改前端呈现和必要测试，不改政策效果、回合数据、AI 解析与 store 业务流。

**Tech Stack:** React + TypeScript + Vite + Zustand + CSS；现有测试为 Vitest / Testing Library。

---

## 新线程可直接复制的 Prompt

你正在接手《佞臣》AI Native 策略文字游戏的 UI/UX 优化任务。请基于当前独立 worktree 继续做“回合首页 + 女帝问政页”的 UX/UI 优化，不要切回 main worktree。

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

《佞臣》是一款南北朝架空权谋策略文字游戏。玩家扮演南陈宗室萧宝颖，在北周朝堂与边镇之间布局。当前朝堂总览页已经开始进入高保真黑金宫廷方向，但回合首页和女帝问政页仍需要跟上。

本轮目标：

- 回合首页不再像网页 briefing，而像一个固定游戏屏里的“回合战情屏”。
- 女帝问政页不再像表单/卡片，而像“女帝密札 / 问政奏对 / 朱批回奏”的仪式化决策屏。
- 保持一屏核心信息，不要求玩家反复 scroll 读取关键决策内容。
- 复用当前 HUD、背景、纸面、金线、印章等视觉系统，和朝堂总览 v3 统一。

## 严格约束

- 不改 `src/game` 与 `src/ai` 的机制逻辑。
- 不改政策问题、政策效果、计谋结算、AI prompt schema、AI 解析规则。
- 不改 `selectPolicy` 的业务语义。
- 不改 `getPolicyQuestionForRound`、`parsePolicyReasonInput` 等机制函数。
- 如果需要新增纯展示字段，先说明原因，不要直接改机制层。
- 不做现代 SaaS 风、不做泛二游 UI、不堆通用卡片。
- 不要用可见长段教学文案解释界面功能。

## 当前可复用基线

当前分支已经完成：

- `src/components/GameHud/GameHud.tsx` 与 `GameHud.css`：图标化工具按钮。
- `PageUtilityActions` 已改为复用 GameHudTools。
- CourtView 总览页已使用高保真 HUD、黑金背景、场景大图、note 书法图。
- 资产在 `src/assets/ui/` 下，可用于其他页面建立统一美术系统。

优先复用：

- `src/assets/ui/hud/hud-ornate-frame-candidate-03-panel.png`
- `src/assets/ui/hud/hud-button-frame.png`
- `src/assets/ui/hud/hud-sound-on.png`
- `src/assets/ui/hud/hud-sound-off.png`
- `src/assets/ui/hud/hud-help.png`
- `src/assets/ui/hud/hud-save.png`
- `src/assets/ui/hud/hud-menu.png`
- `src/assets/ui/court-overview/court-bg-lacquer-v3.jpg`
- `src/assets/ui/textures/paper-texture.jpg`
- `src/assets/ui/court-overview/cinnabar-seal.png`

## 页面一：RoundStart 回合首页

### 当前问题

回合首页容易变成网页式 briefing：多个信息块纵向铺开，玩家需要扫很多文本，且和朝堂页的高保真游戏屏风格断层。

### 目标形态

把 RoundStart 做成“回合战情屏 / 帷幄案前”：

- 顶部使用统一 HUD：上一页/回合/国力/南征/安危/计谋次数/工具按钮。
- 主视觉建议是战情案桌、地图、军报卷轴、北周疆域或殿前帷幕。
- 中央只放本回合最重要的战情摘要，控制在短段落或数条军报。
- 状态信息用横向状态牌或卷轴签，不要铺成很多卡片。
- 冯道之提示可以是角落密札或案边批注，但不要占据主流程。
- 主按钮是“入朝听政 / 入朝布局 / 前往朝堂”，要非常明确。

建议布局：

- 背景层：北周黑金漆纹、暗金线、烟尘。
- 主台层：地图/案桌/军报作为画面中心。
- 情报层：本回合标题、核心军报、三项局势状态。
- 行动层：进入朝堂按钮。
- 工具层：统一 HUD。

### 信息取舍

保留玩家开始本回合前必须知道的信息：

- 当前回合数。
- 当前国力、南征、安危。
- 本回合局势摘要。
- 上回合余波或关键事件，只保留最重要 1-2 条。
- 下一步入口。

可折叠或弱化：

- 过长的背景解释。
- 重复的数值说明。
- 与当前决策无关的扩展介绍。

## 页面二：EmpressLetter 女帝问政页

### 当前问题

女帝问政如果呈现为普通表单，会削弱“女帝来信、密奏问策、南陈遥控北周”的戏剧感。

### 目标形态

把 EmpressLetter 做成“女帝密札 / 问政奏对”：

- 一屏呈现女帝问政主题、问题正文、选项、附言输入、提交。
- 中央主物件是书信/诏书/奏折，而不是白底表单。
- 选项像三到四枚奏签、玉牒、封条或可点击策略签。
- 附言输入像“附奏小笺”，不是现代 textarea 大框。
- 提交按钮像“封奏 / 落印 / 回奏”，但只改呈现。
- 右侧可有女帝信笺标识、朱批、南陈暗线感。

### 交互与状态

- 当前选项必须清楚可见：选中态可用金线、朱砂、印记。
- 未选项时提交禁用，要有克制提示。
- 附言字数/空白状态清楚，但不要现代产品化。
- 提交后仍走现有 store 逻辑，不改政策效果。

### 文案原则

- 保留原有问政文本，不要擅自重写机制内容。
- UI 标签可以更古典，但必须让玩家知道含义。
- 不写“请选择一个选项”这种现代表单式提示，尽量用“择一策回奏”等更贴合语气的短句。

## 可选延展：EmpressReply

本轮主目标是 `EmpressLetter`。如果样式断层明显，可以轻量调整 `EmpressReply` 的外观，使女帝回信与问政页统一；但不要扩大为完整重构。

## 优先阅读文件

- `src/components/RoundStart/RoundStart.tsx`
- `src/components/RoundStart/RoundStart.css`
- `src/components/RoundStart/RoundStart.test.tsx`
- `src/components/EmpressLetter/EmpressLetter.tsx`
- `src/components/EmpressLetter/EmpressLetter.css`
- `src/components/EmpressLetter/EmpressLetter.test.ts`
- `src/components/EmpressReply/EmpressReply.tsx`
- `src/components/EmpressReply/EmpressReply.css`
- `src/components/GameHud/GameHud.tsx`
- `src/components/GameHud/GameHud.css`
- `src/components/PageUtilityActions/PageUtilityActions.tsx`
- `src/stores/gameStore.ts`，只读为主。
- `src/game/policyQuestions.ts` 或实际政策问题数据文件，只读为主。

如果文件名与实际项目略有差异，先用：

```powershell
rg --files -g "*RoundStart*" -g "*Empress*"
rg "selectPolicy|Policy|policy|女帝|问政" src -n
```

## 设计验收标准

- 1920x1080 与 1280x720 下，RoundStart 和 EmpressLetter 的核心信息不需要页面滚动。
- 390x844 移动端不溢出；可以局部滚动，但主决策路径清楚。
- 两页和 CourtView 总览 v3 属于同一套视觉系统。
- 玩家能快速理解：本回合发生了什么、下一步去哪、女帝要我回答什么、我选了哪一策。
- 按钮态和状态态明确区分：工具/提交/选项可交互；国力/南征/安危等状态不表现为可点。

## 测试计划

优先补/更新测试：

- RoundStart 渲染统一 HUD 与核心战情摘要。
- RoundStart 不再依赖旧的密集卡片结构断言。
- EmpressLetter 渲染问政问题、策略选项、附言输入、提交按钮。
- EmpressLetter 选项选中态和提交禁用态可测试。
- 保证 `selectPolicy` 相关行为不变。

运行：

```powershell
npm.cmd test -- RoundStart EmpressLetter EmpressReply
npm.cmd test
npm.cmd run build
```

浏览器验收：

- 打开本地预览，截图 1920x1080、1280x720、390x844。
- 从回合首页进入朝堂，再完成三次施计进入女帝问政，确认流程不断。
- 在女帝问政页选择不同策略，确认选中态清楚且提交仍可用。

## 建议执行顺序

1. 读 RoundStart 与 EmpressLetter 当前 DOM/CSS，列出必须保留的数据字段。
2. 写/更新 RoundStart 测试，描述“战情屏”的关键可见元素。
3. 改 RoundStart 布局与 CSS，先完成 PC 1280x720。
4. 写/更新 EmpressLetter 测试，描述“女帝密札”的关键可见元素。
5. 改 EmpressLetter 布局与 CSS，保留业务调用。
6. 做移动端适配。
7. 跑定向测试。
8. 浏览器截图验收。
9. 跑全量测试和 build。

## 参考文档

- `C:\Users\happyelements\Desktop\佞臣 Demo\UXUI 优化\001-游戏屏幕逻辑与目标信息架构.md`
- `C:\Users\happyelements\Desktop\佞臣 Demo\UXUI 优化\004-三款参考视频拆解与低保真画板优化.md`
- `C:\Users\happyelements\Desktop\佞臣 Demo\UXUI 优化\006-外部AI设计Agent朝堂工作台说明.md`
- `C:\Users\happyelements\Desktop\佞臣 Demo\UXUI 优化\009-HUD图标化与状态牌设计备忘.md`
- `C:\Users\happyelements\Desktop\佞臣 Demo\UXUI 优化\010-HUD与朝堂总览资产接入计划.md`
- `C:\Users\happyelements\Desktop\佞臣 Demo\UXUI 优化\design.md`
- `C:\Users\happyelements\Desktop\佞臣 Demo\美术音频资产\global_art_style_v1_2026-04-28.md`

