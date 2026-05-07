# 2026-05-07 《佞臣》UI/UX 新线程共用指引

这份文档供新的两个线程共用：一个继续做“朝堂施计三页”，一个做“回合首页 + 女帝问政页”。请把它和对应 Prompt 一起交给新线程。

## 1. 当前 worktree 与分支

必须基于当前独立 worktree 工作，不要在 main worktree 上继续改。

Git top-level：

`C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\ningchen-ux-ui-polish`

项目目录：

`C:\Users\happyelements\Desktop\佞臣 Demo\.worktrees\ningchen-ux-ui-polish\NingChenv4\NingChen-Demo-codex-difficulty-balance-inline-sync-36e3165\佞臣V3`

当前分支：

`codex/ningchen-ux-ui-polish`

新线程开始后先检查：

```powershell
git rev-parse --show-toplevel
git branch --show-current
git status --short
```

期望：

- top-level 指向 `.worktrees\ningchen-ux-ui-polish`
- branch 是 `codex/ningchen-ux-ui-polish`
- 不要切换到 main，也不要把这个 worktree 与 main worktree 混用。

## 2. 项目定位

《佞臣》是一款南北朝架空权谋策略文字游戏。玩家扮演南陈宗室萧宝颖，潜入北周朝堂，通过计谋影响 NPC、派系、地方军头与国家局势。

本阶段不是做机制扩展，而是把前端从“AI 生成网页感”推进到“精品文字游戏 / 权谋互动小说”的游戏屏幕质感。

核心原则：

- 固定游戏屏幕逻辑优先，减少长滚动阅读。
- 信息分层，不在单页平铺所有内容。
- 玩家在一屏内完成当下决策：看局势、进一层、选人物、落子。
- 黑金、肃杀、阴冷宫廷、南北朝权谋。
- 避免现代 SaaS 风、泛二游 UI、通用卡片堆叠、紫色默认审美。

## 3. 机制边界

严禁改动：

- 数值公式。
- 计谋成功率。
- AI prompt schema。
- AI GameMaster 判定。
- NPC 长期记忆和 NPC-NPC 关系记忆结构。
- 政策效果和回合结算机制。
- `src/game` 与 `src/ai` 的核心业务逻辑。

可以改动：

- React 组件结构。
- CSS。
- 纯 UI 资产引用。
- 只为展示服务的 class、DOM 层级、局部状态。
- 必要测试。

谨慎改动：

- `src/stores/gameStore.ts`：只允许最小 UI phase 入口或复用既有动作。
- `src/game/types.ts`：只允许必要类型补充，不能改变机制语义。

## 4. 当前分支已经完成的 UX/UI 基线

### CourtView 总览

当前总览页已经从网页式列表变成两张主入口：

- 朝堂势力。
- 地方军头。

已完成：

- 顶部单行 HUD。
- 图标化工具按钮。
- 黑金 ornate HUD 背景。
- 朝堂/边镇大场景图。
- 场景金边框。
- 书法 note 一体图。
- 北周肃杀金纹背景。
- hover 同步放大、图像遮罩、低成本 CSS 氛围动效。

### 朝堂与施计合并

已完成基础改造：

- `SchemePanel` 已抽出 `SchemeComposer`。
- `SchemeComposer` 支持 standalone 与 embedded 两种模式。
- CourtView 人物案卷内可以打开落子抽屉。
- `completeSchemingIfReady()` 已作为最小前端流程动作存在。
- 第 1、2 次计谋提交后应留在 CourtView；计谋满后进入 `EMPRESS_LETTER`。

## 5. 已接入运行时资产

HUD：

- `src/assets/ui/hud/hud-ornate-frame-candidate-03-panel.png`
- `src/assets/ui/hud/hud-button-frame.png`
- `src/assets/ui/hud/hud-sound-on.png`
- `src/assets/ui/hud/hud-sound-off.png`
- `src/assets/ui/hud/hud-help.png`
- `src/assets/ui/hud/hud-save.png`
- `src/assets/ui/hud/hud-menu.png`

Court overview：

- `src/assets/ui/court-overview/court-bg-lacquer-v3.jpg`
- `src/assets/ui/court-overview/court-gate-palace.png`
- `src/assets/ui/court-overview/court-gate-frontier.png`
- `src/assets/ui/court-overview/court-gate-frame.png`
- `src/assets/ui/court-overview/court-note-calligraphy-integrated-v2.png`
- `src/assets/ui/court-overview/frontier-note-calligraphy-integrated-v2.png`
- `src/assets/ui/court-overview/cinnabar-seal.png`

Textures：

- `src/assets/ui/textures/paper-texture.jpg`

NPC 素材：

- `public/images/npc/确认【抠背景】/`

注意：AIART 原始资产可能体积偏大。本轮先不做全量 `optimized-assets`，等对应页面视觉定稿后再统一压缩、转格式与裁切。

## 6. 外部参考资料

项目设计文档：

- `C:\Users\happyelements\Desktop\佞臣 Demo\UXUI 优化\001-游戏屏幕逻辑与目标信息架构.md`
- `C:\Users\happyelements\Desktop\佞臣 Demo\UXUI 优化\002-层级推进式朝堂施计UX修订.md`
- `C:\Users\happyelements\Desktop\佞臣 Demo\UXUI 优化\003-四张低保真原型.md`
- `C:\Users\happyelements\Desktop\佞臣 Demo\UXUI 优化\004-三款参考视频拆解与低保真画板优化.md`
- `C:\Users\happyelements\Desktop\佞臣 Demo\UXUI 优化\005-朝堂施计UX落地记录.md`
- `C:\Users\happyelements\Desktop\佞臣 Demo\UXUI 优化\006-外部AI设计Agent朝堂工作台说明.md`
- `C:\Users\happyelements\Desktop\佞臣 Demo\UXUI 优化\008-朝堂总览高保真参考图落地与资产生成方案.md`
- `C:\Users\happyelements\Desktop\佞臣 Demo\UXUI 优化\009-HUD图标化与状态牌设计备忘.md`
- `C:\Users\happyelements\Desktop\佞臣 Demo\UXUI 优化\010-HUD与朝堂总览资产接入计划.md`
- `C:\Users\happyelements\Desktop\佞臣 Demo\UXUI 优化\design.md`

美术风格：

- `C:\Users\happyelements\Desktop\佞臣 Demo\美术音频资产\global_art_style_v1_2026-04-28.md`

视频参考目录：

- `C:\Users\happyelements\Desktop\佞臣美术风格和 UIUX 设计参考`

参考对象：

- 《我的三国》：游戏屏幕逻辑、历史策略信息层级、场景化入口。
- 《历史模拟器：崇祯》：历史策略视听氛围、地图/局势表达。
- 《明末饿殍千里行》：视觉小说式美术辨识度、纸面/插画/文字节奏。

## 7. 本地预览与测试

常用预览：

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5175
```

如果端口被占用，用 5176 或 Vite 自动端口，并在回复中明确 URL。

常用测试：

```powershell
npm.cmd test -- CourtView SchemePanel gameStore
npm.cmd test -- RoundStart EmpressLetter EmpressReply
npm.cmd test
npm.cmd run build
```

浏览器验收建议：

- 1920x1080：PC 高保真主目标。
- 1280x720：小屏笔记本/常见录屏尺寸，核心信息不滚动。
- 390x844：移动端可局部滚动，但不能溢出或遮挡主按钮。

## 8. 代码注意事项

- 使用 `rg` 搜索文件和文本。
- 不要用 PowerShell 乱码输出判断中文内容是否损坏；源文件通常是 UTF-8，必要时用编辑器、Node 或测试结果确认。
- 编辑代码和文档优先用 `apply_patch`。
- 不要重写大段机制代码。
- 如果遇到已有未提交改动，默认认为是本分支/用户改动，不能随意 revert。
- 修改 CSS 时检查 PC 和移动端，不要只看一个视口。
- 按钮态与状态态必须区分：
  - 按钮：可 hover、active、focus、click，有 cursor/pointer。
  - 状态：国力、南征、安危、计谋次数，只展示，不 hover 成可点击样式。

## 9. 新资产生成规则

如果必须生成新资产：

- 使用 AIART/OpenAPI 或用户指定工具，但不要把 API key 写进仓库或回复。
- 原始生成物放在 `C:\Users\happyelements\Desktop\佞臣 Demo\美术音频资产\AIART生成\...`。
- 运行时精选资产放进 `src/assets/ui/...`。
- 先生成 4 张候选让用户挑选，除非用户明确要求直接接入。
- 场景、HUD、note 等资产要裁掉无用透明/黑边，避免 CSS 中出现黑底矩形。
- 正式压缩和格式优化等页面定稿后再做。

## 10. 交付格式

每个新线程完成后至少说明：

- 修改了哪些页面和文件。
- 是否只动了 UI/UX，没有改机制。
- 本地预览 URL。
- 跑了哪些测试和 build。
- 截图验收结论。
- 遗留问题和下一步建议。
