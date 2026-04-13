# 《佞臣》计谋回报页一次性追问机制设计

日期：2026-04-13

## 背景

当前计谋回报页会在玩家完成 3 次北周施计后，生成 3 条 NPC 反馈。试玩中发现，部分 NPC 反馈以问句结尾。早期可将其视为 prompt 没有收束导致的文案问题，但实际体验上，问句结尾反而能增强“我正在和活人周旋”的沉浸感。

因此，这轮设计不再简单禁止问句，而是将其中一部分问句转化为玩法：每回合在 3 条计谋反馈中提供 1 次“追问机会”。玩家可以选择回应 NPC 的追问；这段回应会被 AI Native 解析为原计谋的一层补充解释，并对原计谋的成功率与效果产生小幅、受控的修正。NPC 随后给出一次陈述式最终回应，不再继续追问。

## 目标

### 体验目标

- 保留问句反馈带来的活人感，让 NPC 不只是单向播报结算态度。
- 让玩家在关键计谋上有一次“圆话、试探、压风险、补刀”的机会。
- 避免每次反馈都变成强制对话，保持回合节奏。
- 让追问之后的 NPC 最终回应收束为陈述句，防止形成无限对话期待。

### 数值目标

- 追问回应只修正原计谋，不新增一条完整计谋。
- 追问可以影响临界成败，但不能把明显失败的输入强行抬成高质量成功。
- 追问可以放大或削弱原计谋效果，但必须有明确上下限。
- 追问失败、跳过或 AI 解析失败时，不阻塞结算，回退到原计谋结果。

## 方案对比

### 方案 A：每回合 1 次可选追问机会（推荐）

内容：
- 系统在 3 条计谋反馈中挑选 1 条最适合追问的反馈。
- 被选中的 NPC 反馈以问句或明确留扣收束。
- 玩家可选择回应一次，也可跳过。
- 玩家回应经专属轻量解析后，作为原计谋修正项进入结算。
- NPC 对玩家回应给出一次陈述式最终回应，不再继续追问。

优点：
- 与用户试玩中喜欢的沉浸感一致。
- 玩法上有意义，玩家回应会真实影响结算。
- 只增加 1 次互动，不明显拖慢整回合。
- 数值边界容易控制。

缺点：
- 需要新增 UI 状态、解析 schema、prompt 与结算修正逻辑。
- 会带来一次额外 AI 解析和一次 NPC 最终回应生成。

### 方案 B：只控制文案，三条反馈中固定一条问句

优点：
- 实现最轻。
- 能稳定制造问句结尾。

缺点：
- 玩家不能回应，容易变成“假互动”。
- 对 AI Native 玩法没有贡献。
- 机械固定问句会削弱 NPC 的自然感。

### 方案 C：将追问回应作为第四条完整计谋重新解析

优点：
- 玩家输入影响最大。
- 逻辑上复用现有 `NorthSchemeParseResult` 与计谋结算链路较直接。

缺点：
- 会显著增强玩家强度，相当于每回合多一次施计。
- 容易破坏当前数值平衡。
- 会扩大天道裁判自由度，不利于我们之前对计谋语义和国力影响的收束。

### 结论

采用方案 A。追问机制应被定义为“原计谋的补充解释层”，不是新的施计次数。

## 核心规则

### 触发频率

- 每回合最多 1 次追问机会。
- 在玩家本回合完成 3 次施计后，于计谋回报页出现。
- 若本回合少于 1 条有效 NPC 反馈、AI 反馈失败或追问候选无法确定，则本回合可不出现追问机会。

说明：对玩家感知可说“每回合有 1 次追问机会”，但实现上应允许失败回退，避免为了硬凑问句导致卡流程。

### 追问候选选择

系统不应纯随机挑选，而应优先选择“最值得追问”的计谋反馈。建议评分口径：

- 原计谋解析接近临界：`characterFit`、`eventFit`、`executability` 中等，存在被解释后变强或变弱的空间。
- NPC 当前态度为戒备、平淡、信赖初期时，追问更自然；深信时可以是提醒，敌意时可以是逼问。
- 计谋类型适合对话周旋：`probe`、`advise`、`slander`、`alienate`、`frame`、`proxy`、`omen` 优先。
- 高风险动作如 `rebellion`、`secession` 可以追问，但追问应更偏“试探底线”，数值修正要更保守。
- 如果某条反馈已经明显成功或明显失败，可降低优先级，除非它有高 `exposureRisk`，适合让 NPC 追问来制造风险感。

### 玩家选择

玩家在被选中的反馈下看到两个操作：

- `回应此问`：展开输入框，允许玩家输入一次补充回应。
- `暂不回应`：跳过追问，保持原计谋解析与结算。

玩家提交回应后，该输入不可再次编辑；本回合不再出现第二次追问机会。

### NPC 最终回应

NPC 在玩家回应后给出一次最终回应。要求：

- 以陈述句收束，不再抛出新问题。
- 体现 NPC 对玩家补充解释的接受、保留、警惕或反感。
- 不直接暴露数值、分数或系统判定。
- 长度短于首次反馈，建议 2 到 4 句。

## 解析设计

不建议复用完整 `NorthSchemeParseResult`。追问回应不是完整施计，而是原计谋说辞被质疑后的补充解释、风险控制或进一步推进。建议新增轻量 schema：

```ts
interface SchemeFollowUpParseResult {
    clarificationFit: number
    npcInterestFit: number
    pressureControl: number
    contradictionRisk: number
    exposureRiskDelta: number
    successRateDelta: number
    effectMultiplierDelta: number
    evidence: string[]
}
```

字段含义：

- `clarificationFit`：玩家是否解释清楚原计谋中含混、可疑或不落地的部分。
- `npcInterestFit`：回应是否继续顺着该 NPC 的个人利益、处境、恐惧或野心说话。
- `pressureControl`：是否能把话锋压住，避免过度逼迫或暴露真实目的。
- `contradictionRisk`：是否与原说辞、当前时局、NPC 人设或已知事实矛盾。
- `exposureRiskDelta`：对原计谋暴露风险的修正，建议范围 `-0.12` 到 `+0.18`。
- `successRateDelta`：对原计谋成功率的直接修正，建议范围 `-0.08` 到 `+0.12`。
- `effectMultiplierDelta`：对成功后效果倍率的修正，建议范围 `-0.10` 到 `+0.18`。
- `evidence`：最多 3 条判分依据。

## 数值落点

追问解析应进入原 `SchemeAction`，作为 `followUp` 字段的一部分，而不是单独加入 `currentSchemes`。

建议数据结构方向：

```ts
interface SchemeFollowUp {
    questionText: string
    playerReply?: string
    parse?: SchemeFollowUpParseResult
    finalNpcReply?: string
    status: 'available' | 'answered' | 'skipped'
}
```

`SchemeAction` 新增：

```ts
followUp?: SchemeFollowUp
```

结算时的应用原则：

- 成功率计算在原 `calculateParsedSuccessRate` 后应用 `successRateDelta`，并再次 clamp。
- 效果倍率在原 person/faction/nation multiplier 计算后应用 `effectMultiplierDelta`，但只影响该条计谋，不外溢到本回合其他计谋。
- `exposureRiskDelta` 应合并进用于延迟反噬、失败风险与 NPC 警惕的 parse 视图。
- 如果 `parse` 不存在或 `status !== 'answered'`，则完全使用原计谋解析。

## UI 流程

1. 玩家完成 3 次施计，进入计谋回报页。
2. 系统并行生成 3 条 NPC 反馈与原始 `northParse`。
3. 系统选定 1 条追问候选，并在该反馈生成 prompt 中加入“可用问句收束”的要求。
4. 玩家阅读反馈后，可在候选反馈下选择 `回应此问` 或 `暂不回应`。
5. 若玩家回应，页面进入“正在斟酌你的回应”状态。
6. 系统解析玩家回应，并生成 NPC 最终陈述回应。
7. 追问处理完成后，`查看结算` 按钮恢复可用。
8. 进入天道结算页，结算层读取带 `followUp` 的 `currentSchemes`。

## Prompt 设计

### 初次 NPC 反馈

新增一个可选参数，例如 `followUpMode`：

- `none`：普通反馈，不强制问句，仍可自然留扣。
- `question_candidate`：这条反馈应以一个自然问句或明确追问收束。
- `statement_only`：用于最终回应，必须陈述句收束。

`question_candidate` 的提示应强调：

- 问句必须贴合该 NPC 的真实疑虑、利益或试探。
- 不要问泛泛问题，例如“你意下如何？”
- 不要连续发问，只留一个关键追问。
- 问句应围绕原计谋的薄弱处、风险处或对 NPC 的诱因处。

### 玩家追问回应解析

新增结构化 prompt，例如 `buildSchemeFollowUpParsePrompt`。输入包含：

- 回合与局势。
- NPC 人设、立场、软肋、逆鳞、已解锁暗线。
- 原计谋类型与原始玩家说辞。
- 原始 `northParse` 的关键字段。
- NPC 追问文本。
- 玩家追问回应。

输出只允许 JSON，对应 `SchemeFollowUpParseResult`。

### NPC 最终回应

新增 prompt，例如 `buildNpcFollowUpFinalPrompt`。要求：

- 代入同一 NPC。
- 回应玩家刚才的补充解释。
- 根据追问解析结果表现“被说动、暂且收下、仍有保留、被激怒或更警惕”。
- 输出 2 到 4 句古典白话。
- 必须陈述句收束，不得再问玩家问题。

## 错误处理

- 初次 NPC 反馈失败：使用现有 fallback，不生成追问机会。
- 追问解析失败：保存玩家回应文本，但不应用数值修正；允许进入结算。
- 最终 NPC 回应失败：显示本地 fallback 陈述句；允许进入结算。
- 玩家长时间不回应：不需要自动跳过，但 `暂不回应` 按钮应始终可见。
- 存档恢复时：如果追问已回答，应恢复 `playerReply`、`parse` 与 `finalNpcReply`；如果处于处理中，恢复后可视为未回答或允许重新提交，避免卡在 loading。

## 测试要求

### 单元测试

- 追问候选选择函数：在多种计谋组合中选出预期候选。
- 追问 parse normalize：所有数值字段被 clamp 到合法范围。
- 结算修正：`successRateDelta`、`effectMultiplierDelta`、`exposureRiskDelta` 只影响对应计谋。
- 跳过追问：原计谋结果与无追问版本一致。
- AI 失败回退：不阻塞进入结算。

### UI 测试

- 计谋回报页只出现 1 个追问入口。
- 回应后输入框不可重复提交。
- NPC 最终回应出现后，`查看结算` 按钮可用。
- `暂不回应` 后可直接进入结算。

### 数值回归

- 在 average mainline 样本中，追问机制不应显著提高全局胜率。
- 追问对临界样本应有可感影响，尤其在 `献策`、`谶纬`、`设局嫁祸`、`离间`、`借刀` 上。
- 对明显空泛输入，追问回应如果仍空泛，不应获得正向修正。

## 非目标

- 不做多轮 NPC 对话。
- 不让追问成为第四次施计。
- 不让玩家追问回应改变计谋类型或目标 NPC。
- 不在结算页展示具体 AI 分数。
- 不把所有 NPC 反馈都改成问句。

## 待实现文件范围预估

- `src/game/types.ts`：新增追问相关类型，扩展 `SchemeAction`。
- `src/stores/gameStore.ts`：新增追问状态更新 action，确保存档恢复不丢状态。
- `src/ai/prompts.ts`：新增追问候选反馈、追问解析、最终回应 prompt。
- `src/game/aiNativeEngine.ts`：新增追问回应解析函数和 normalize 逻辑。
- `src/game/schemeEngine.ts`：接入追问修正，确保只影响对应计谋。
- `src/game/roundSettlement.ts`：如需要，在结算调用处传入修正后的 parse 视图。
- `src/components/SchemeFeedback/SchemeFeedback.tsx`：新增追问 UI、提交、跳过、loading 与最终回应展示。
- `src/game/saveEngine.ts`：确认 `currentSchemes` 中的 `followUp` 可被持久化。
- 对应测试文件：覆盖候选选择、解析回退、结算修正和 UI 状态。

