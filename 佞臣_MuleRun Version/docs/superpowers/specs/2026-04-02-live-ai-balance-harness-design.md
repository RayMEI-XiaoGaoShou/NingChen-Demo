# 《佞臣》真实 AI Native 强度测试 Harness 设计

## 背景

当前项目已经有两套与平衡相关的能力：

1. 本地规则层自动回归  
   通过 `simulateGame(...)`、`settleRound(...)`、`settleScheme(...)` 等链路批量跑局，适合快速检查底盘是否过宽、战役结果是否异常、地图与状态机是否一致。

2. 前台真实游玩  
   在浏览器里由玩家输入自由文本，北周计谋与南陈附言会调用 DeepSeek 做结构化解析，NPC 回复与部分叙事也会使用在线 AI。

目前缺少的是第三层：**一套仓库内、可半自动、真实调用 DeepSeek 的平衡测试 harness**。  
它的目标不是替代真人试玩，也不是替代现有本地回归，而是回答这样的问题：

- 高手/普通/菜鸟话术在真实 DS 解析下，差距到底有多大
- 某次调参之后，普通档是不是更接近“首通胜率过半”
- 谶纬、割据、叛乱这些高理解玩法，在真实 parse 下是否仍然可达
- 当前 prompt 与规则链路，是否真的能把“好输入”和“坏输入”区分开

## 目标

这套 harness 需要满足四个目标：

1. **长期可复用**  
   放在仓库里，作为《佞臣》长期数值平衡优化工具，而不是一次性脚本。

2. **真实调用 DS API**  
   北周线调用 `parseNorthSchemeInput(...)`，南陈线调用 `parsePolicyReasonInput(...)`，不走本地 fallback 作为主路径。

3. **半自动运行**  
   能在每次重要调参后手动触发一轮，稳定输出报告；后续也适合接成更顺手的“调完就跑一次”流程。

4. **不污染正式游戏逻辑**  
   它是研究工具，不应把大量测试态逻辑塞进 UI 组件或生产流程。

## 非目标

第一版不做这些事：

- 不直接驱动浏览器点页面  
  浏览器自动化是另一层能力，后续可以补，但不属于这套 harness 的第一阶段。

- 不验证 NPC 回复文本质量  
  本次聚焦“结构化解析对数值与结局的影响”，NPC 风味文案不是主目标。

- 不做成本优化系统  
  会记录调用次数，但不会在第一版加入复杂限流、缓存命中率面板或多模型路由。

- 不自动修改正式平衡参数  
  它负责出报告，不负责自己调参。

## 方案选择

### 方案 A：单次研究脚本

优点：
- 开发最快
- 容易验证 DS 调用是否通

缺点：
- 不利于长期维护
- 结果格式容易漂移
- 难以形成稳定对照基线

### 方案 B：仓库内正式 harness

优点：
- 最适合长期平衡工作
- 可以形成统一样本库与统一报告格式
- 方便和当前本地 fallback 回归并行使用

缺点：
- 需要先搭一套最小研究框架

### 方案 C：直接做浏览器自动化实测

优点：
- 最接近真实玩家

缺点：
- 太重
- 太慢
- 成本高
- 不适合作为高频调参反馈工具

### 推荐

采用 **方案 B**，并与现有本地 fallback 自动回归并行存在：

- 日常快速扫底盘：继续用现有本地回归
- 关键调参后做真实 AI 强度核验：跑新的 live AI harness

## 总体设计

第一版 harness 拆成 5 个部分：

1. `sample library`  
   定义可重复的玩家样本集。

2. `live parse runner`  
   负责真实调用 DS API，拿回 parse 结果。

3. `simulation bridge`  
   把 live parse 注入现有回合结算链，而不是自己重写一套结算逻辑。

4. `report generator`  
   产出机器可比对的 JSON 和人类可读的 Markdown。

5. `run manifests / baselines`  
   保存本次运行元数据和历史基线，方便参数调整前后对照。

## 目录与文件建议

建议在 `佞臣_MuleRun Version` 里增加以下结构：

```text
src/game/liveBalance/
  sampleLibrary.ts
  liveParseRunner.ts
  liveSimulation.ts
  reportBuilder.ts
  types.ts

scripts/
  run-live-balance.ts

docs/balance-reports/
  latest/
  baselines/
```

说明：

- `src/game/liveBalance/` 放研究工具逻辑，便于复用现有 types / engine
- `scripts/run-live-balance.ts` 作为入口
- `docs/balance-reports/latest/` 放最近一次结果
- `docs/balance-reports/baselines/` 放确认过的基线快照

## 样本库设计

### 样本维度

样本分两轴：

1. **玩家水平**
- 高手
- 普通
- 菜鸟

2. **策略路径**
- 稳健主路
- 外部势力主路
- 谶纬尝试线
- 激进高压线

### 第一版最小样本集

建议第一版先做 8 组：

- 高手 x 稳健主路
- 高手 x 外部势力
- 普通 x 稳健主路
- 普通 x 谶纬尝试
- 普通 x 外部势力尝试
- 菜鸟 x 稳健主路
- 菜鸟 x 误用谶纬
- 菜鸟 x 分散出手

每组样本建议提供：

- 每回合三次北周施计目标
- 每回合施计类型
- 每回合玩家说辞文本
- 每回合南陈选项
- 每回合附言文本

### 样本表示

样本库中的每条样本应是纯数据，不直接夹带执行逻辑，便于后续继续扩展与人工编辑。

## Live Parse Runner 设计

### 北周线

对每个 `SchemeAction`：

1. 取出目标 NPC、回合信息、相关人物
2. 调用 `parseNorthSchemeInput(...)`
3. 记录：
- 原始说辞
- 请求元数据（回合、NPC、计谋类型）
- AI 返回原始 JSON
- 归一化后的 parse

### 南陈线

对每回合附言：

1. 取出当回合问政题面
2. 调用 `parsePolicyReasonInput(...)`
3. 记录：
- 原始附言
- AI 返回原始 JSON
- 归一化后的 parse

### 失败策略

如果 DS 调用失败：

- 默认将该局标记为 `run degraded`
- 记录失败原因
- 可选是否回退到本地 fallback  

第一版推荐默认行为：
- **允许 fallback，但必须在报告里明确标记“本局非纯 live AI”**

这样既不会因为一次 API 波动整轮白跑，也不会误把 fallback 当成真 DS 结果。

## Simulation Bridge 设计

核心原则：**不重写结算链，只把 live parse 注入现有逻辑。**

做法：

- 仍使用现有 `simulateGame(...)` / `settleRound(...)`
- 但在每回合决策数据里，把真实 DS 得到的 `northParse` 与 `policyParse` 塞进去
- 这样后续所有：
  - 北周计谋成功率
  - 国力层伤害
  - 南陈问政收益
  - 战役演化
  - 最终胜负
  都仍然沿用正式逻辑

这保证 live harness 与正式游戏逻辑的一致性。

## 报告设计

### 双输出

第一版采用 **JSON + Markdown 双输出**。

#### JSON

给机器与后续脚本比对使用，建议包含：

- 运行时间
- git 提交 hash
- difficulty
- 样本集版本
- 每局逐回合明细
- 每次 DS parse 结果
- 每局终盘结果
- 汇总统计

#### Markdown

给人快速阅读，建议结构：

1. 总览
- 总样本数
- 各水平胜率
- 第 10 回合平均差距
- 终局平均差距
- 蜀地/淮南得手率
- 割据/叛乱触发率

2. 分组结果
- 高手
- 普通
- 菜鸟

3. 特殊玩法结果
- 谶纬
- 割据
- 叛乱

4. 可疑点
- 哪些样本出现“明显偏强”
- 哪些样本出现“AI parse 与直觉不符”

5. 明细链接
- 指向对应 JSON 文件

## 半自动运行方式

建议最终提供这几个入口：

```text
npm run balance:baseline
npm run balance:live-ai
npm run balance:compare
```

### `balance:baseline`
- 跑现有本地 fallback 自动回归

### `balance:live-ai`
- 跑真实 DS API harness
- 生成一份新的 JSON + Markdown 报告

### `balance:compare`
- 将最近一次 live 结果与指定基线对比
- 输出差异摘要

## 基线管理

每当某版平衡被人工确认“可接受”时，可以把对应 live 报告存成 baseline。

基线至少应记录：

- commit hash
- difficulty profile 摘要
- 样本库版本
- 汇总指标

后续每次调参后，可以与最近 baseline 做比较，而不是只看单次结果。

## 关键指标

第一版最重要的指标是：

1. 普通档总胜率
2. 普通样本第 10 回合平均南北差
3. 普通样本终局平均南北差
4. 高手与普通的胜率差
5. 普通与菜鸟的胜率差
6. 谶纬样本触发成功率
7. 割据样本触发率
8. 叛乱样本触发率

如果未来要做更深研究，再加：

- parse 维度分布
- 某类说辞的平均 `characterFit / executability / eventFit`
- 同一路线在不同模型下的波动

## 安全与成本

第一版控制策略：

- 每次 live 运行都明确显示预计样本数
- 支持只跑某个分组，例如“只跑普通”
- 每局每回合只调用必要的两个解析接口：
  - 北周 3 次
  - 南陈 1 次
- NPC 回复、结算叙事等非数值核心 AI 调用不纳入 harness

这样能把成本锁在“足够研究，但不浪费”的范围内。

## 测试策略

这套 harness 本身也需要测试，但测试目标与正式数值不同。

第一版至少应有：

1. 样本库结构校验
2. live runner 在 mock AI 返回下能正常组装 parse
3. simulation bridge 能把 parse 注入结算
4. report builder 能稳定输出 JSON / Markdown
5. compare 命令能对齐 baseline

在线 DS 真调用不进单元测试，只做手动/研究态运行。

## 实施顺序

推荐分 4 步：

1. 搭样本库与基础类型
2. 搭 live parse runner
3. 接 simulation bridge 与报告输出
4. 最后补 compare 与 baseline 管理

## 成功标准

这套 harness 完成后，应能做到：

- 一条命令跑完一批真实 DS 样本
- 自动生成 JSON + Markdown 报告
- 清楚区分高手 / 普通 / 菜鸟
- 明确看到谶纬 / 割据 / 叛乱的实际可达性
- 支持与既有基线做对照
- 不修改正式游戏运行逻辑

## 风险与应对

### 风险 1：DS 返回不稳定

应对：
- 记录原始返回
- 标注 fallback 与 live 的差异
- 用多样本平滑单次波动

### 风险 2：样本库本身偏差太大

应对：
- 样本库版本化
- 先从少量高质量样本开始
- 报告里明确当前样本版本

### 风险 3：研究工具侵入生产代码

应对：
- 所有 harness 逻辑都放在独立目录
- 通过注入 parse 复用正式结算，而不是改 UI 组件

## 结论

建议新增一套仓库内、长期可复用、真实调用 DeepSeek 的 live AI balance harness。  
它与现有本地 fallback 自动回归并行存在，分别负责：

- 本地回归：快速扫底盘
- live AI harness：验证真实 AI Native 强度

第一版以 **样本库 + live parse runner + simulation bridge + JSON/Markdown 报告** 为核心，先建立稳定研究能力，再逐步扩展到更复杂的对照与浏览器自动化。
