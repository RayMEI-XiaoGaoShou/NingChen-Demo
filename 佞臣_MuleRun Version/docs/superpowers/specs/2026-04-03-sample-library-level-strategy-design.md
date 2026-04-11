# 《佞臣》Live Balance Sample Library 分层设计

## 背景
在最近一轮真实 DeepSeek API 回归中，`rookie-scatter` 的 live 结果明显高于预期，甚至高于 `average-mainline`。

这并不说明“rookie 玩家天然更强”，而说明当前样本库里，`level` 与 `strategy` 两个维度混在了一起，导致部分被标成 `rookie` 的样本，实际上在大模型看来更像一条高质量、高攻击性的可用路线。

因此，样本库需要从“按名字粗分”升级为“按水平与策略双轴分层”。

## 目标
- 让 `expert / average / rookie` 真正反映话术质量与判断水平
- 让 `mainline / external / omen / aggressive` 真正反映路线选择
- 让 live AI 回归更能回答：
  - 普通玩家在真实 AI 解析下是否偏强或偏弱
  - 某条具体策略路径是否异常强
  - Prompt 调整后，到底是“高手更强了”还是“菜鸟也被误判抬高了”

## 核心原则
`level` 决定“玩家说得有多准”，`strategy` 决定“玩家在走什么路线”。

这两个维度必须分开。

错误示例：
- `rookie-scatter` 被理解为“菜鸟乱打”
- 但样本文案实际持续碰到了兵权、粮道、转运、归责、集权风险等有效语义
- 于是 live DS 将其识别成了一条高质量 aggressive 路线

正确设计应当是：
- `rookie-aggressive`：想高压，但写不准、用不稳、常常说偏
- `average-aggressive`：有思路，但定制化和窗口感一般
- `expert-aggressive`：能精准压到人物软肋、事件窗口和结构裂缝

## 维度一：水平（level）定义
### expert
定义：
- 对象选择整体正确
- 计谋类型选择整体正确
- 话术能同时贴合人物、时局、计谋类型

识别标准：
- 能点到人物真实软肋或公开立场
- 能把回合事件带进说辞
- 能描述执行链、后果链或权力链
- 能区分不同计谋的语言风格

在 parse 上的预期表现：
- `characterFit` 高
- `eventFit` 高
- `structuralPenetration` 高
- 对应维度的 `relevance` 高
- `exposureRisk` 不一定低，但通常可控

### average
定义：
- 大方向基本正确
- 路线和对象多数合理
- 说辞不算差，但不够锋利，也不够个性化

识别标准：
- 会说出对的主题，但未必切中人物心结
- 会提到部分事件或局势，但整合度一般
- 会写执行感，但往往停留在“应该如何”而非“如何让此人愿意这样做”

在 parse 上的预期表现：
- `characterFit / eventFit / executability` 中等偏上
- `structuralPenetration` 中等
- `relevance` 通常有 1-2 项较高，但不应全面高

### rookie
定义：
- 经常凭表面印象选人或选计
- 即使路线大致对，也常把话术写偏
- 不擅长把人物、事件、结构三者连起来

识别标准：
- 常写成泛泛大道理
- 经常缺少人物定制
- 经常缺少事件锚点
- 经常把计谋类型写错味道
- 可能有关键词，但逻辑松散或对象不准

在 parse 上的预期表现：
- `characterFit / eventFit / structuralPenetration` 应明显低于 average
- `relevance` 不该经常多维同时偏高
- `exposureRisk` 可能偏高，也可能只是“低风险但低命中”

## 维度二：策略（strategy）定义
### mainline
目标：
- 围绕中枢、主战线、常规权谋主路推进

典型特征：
- 常用 `probe / advise`
- 偶尔 `slander`
- 不追求高烈度副线
- 更依赖主线问政与稳健施计

### external
目标：
- 围绕外部军头、割据、叛乱、副战线布局

典型特征：
- 会持续接触外部势力
- 有“养信 -> 离心 -> 探暗线 -> 等窗口”的阶段感
- 不是只偶尔点一下外部角色

### omen
目标：
- 围绕谶纬、法统、天命、灾异与名分裂缝做文章

典型特征：
- 真正的窗口回合才集中使用
- 说辞偏天命、名分、灾异、法统
- 不是把普通献策硬换个词

### aggressive
目标：
- 主动撕裂局面，偏高压施计

典型特征：
- 更常用 `slander / alienate / frame`
- 更愿意承担风险
- 会主动制造派系裂口或权力失衡

注意：
- aggressive 不是“随便激进”
- 同样是 aggressive，也必须因 `level` 不同而体现出明显水平差

## 建议的样本命名体系
后续样本命名建议统一为：
- `expert-mainline`
- `average-mainline`
- `rookie-mainline`
- `expert-external`
- `average-external`
- `rookie-external`
- `expert-omen`
- `average-omen`
- `rookie-omen-misuse`
- `expert-aggressive`
- `average-aggressive`
- `rookie-aggressive`

说明：
- `rookie-omen-misuse` 可以保留特殊命名，因为它故意代表“菜鸟误用谶纬”
- 其余样本尽量不要再出现 `scatter` 这种带解释色彩、但不说明质量来源的名字

## 样本写作约束
### rookie 样本约束
rookie 样本至少应满足以下 2-3 条：
- 缺少明显人物定制
- 缺少明确回合事件锚点
- 有关键词，但逻辑链不完整
- 计谋语言风格写偏
- 对执行路径的描述含糊
- 对风险或后果的理解浅

### average 样本约束
average 样本至少应满足以下 3 条：
- 有部分人物定制
- 有部分回合事件锚点
- 有中等执行感
- 计谋语义整体正确
- 不够锋利，但方向基本对

### expert 样本约束
expert 样本至少应满足以下 4-5 条：
- 点中人物立场、软肋或顾虑
- 呼应当回合事件或战局
- 有明确结构和执行链
- 计谋类型语义准确
- 风险与收益表达更成熟
- 对人物所处派系或位置有针对性

## 当前 8 个样本的偏差判断
### expert-mainline
当前状态：
- 大体符合预期

问题：
- 仍需防止文案过度模板化，避免 expert 与 average 区别只剩“更稳定”

### expert-external
当前状态：
- 路线方向大体合理

问题：
- 需确认是否真正体现了“阶段感”，而不是单纯多点外部角色

### average-mainline
当前状态：
- 当前更像“中等偏上稳健主线”

问题：
- 在 live DS 下被整体打分偏高，说明其文案可能过于整齐、过于像有经验玩家

### average-omen
当前状态：
- 需确认它是否真的只是“普通水平谶纬线”

问题：
- 若 live 下经常窄胜，可能意味着它比 average-mainline 更像一条受模型偏爱的路线

### average-external
当前状态：
- 需要检查是否真的比 expert-external 更弱，而不是只换了路线不换质量

### rookie-mainline
当前状态：
- 当前结果较接近预期

问题：
- 仍需人工复审其文案，确认它不是“average 但保守”

### rookie-omen-misuse
当前状态：
- 命名上清楚，方向上也合理

问题：
- 需要确认误用是否真的能被 prompt 识别成“误用”，而不是被模型合理化

### rookie-scatter
当前状态：
- 当前是最明显的异常样本

问题：
- 它被标成 rookie，但文案持续碰到了权力集中、归责、兵粮、转运等有效语义
- 在 live DS 看来，它不像乱打，而像一条可用的 aggressive 路线

结论：
- 这条样本必须重写
- 同时建议更名为 `rookie-aggressive`

## 样本重写优先级
优先级从高到低：
1. `rookie-scatter -> rookie-aggressive`
2. `average-mainline`
3. `average-omen`
4. `expert / average / rookie external`

## 后续实施建议
第一步：
- 先不动 prompt
- 先把样本库按这份标准重审和重写

第二步：
- 用 live AI harness 再跑一次
- 看样本之间是否终于呈现：
  - `expert > average > rookie`
  - 同一 strategy 下差距清楚
  - 不同 strategy 之间不会因为误命名而混淆

第三步：
- 再根据 live 结果去收紧 `prompts.ts` 中 parse rubric

## 成功标准
样本库调整完成后，期望出现以下现象：
- `rookie-mainline` 不应稳定强于 `average-mainline`
- `rookie-aggressive` 不应被识别成高质量成熟离间链
- `expert` 样本在同策略下应稳定优于 `average`
- `average` 样本在同策略下应稳定优于 `rookie`
- `rookie-omen-misuse` 应明显弱于正确谶纬路线

## 本 spec 的定位
这份文档只定义样本分层标准和样本库重写方向。

它不直接规定：
- parse prompt 具体怎么改
- 数值公式具体怎么改
- live harness 的运行策略怎么改

这些属于后续独立实现步骤。
