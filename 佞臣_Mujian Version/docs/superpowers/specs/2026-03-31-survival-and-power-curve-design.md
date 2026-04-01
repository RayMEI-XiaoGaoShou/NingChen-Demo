# 生存回滚与国力曲线调优设计

## 目标

本轮只处理三个紧密关联的问题：

1. 中途败局时允许玩家“回到本回合初”
2. “保全自身”从单步处决改为二段式死亡链
3. 南北国力前中期节奏重调，避免北周前期统治崩得过快、南陈过早追平

## 范围

### 包 1：回到本回合初

- 在每回合开始时保存一份 `roundStartSnapshot`
- 仅在中途败局展示 `回到本回合初`
- 中途败局包含：
  - `DEFEAT_DEATH`
  - `DEFEAT_INVASION`
- 第 20 回合终局不展示该按钮
- 恢复后回到该回合的 `ROUND_START`

### 包 2：二段式死亡链

- 保留“低信任 + 可执行者 + 朝堂势力强”这条总逻辑
- 新增一个玩家危险阶段：
  - `safe`
  - `under_watch`
  - `under_review`
- 规则：
  - 首次满足高危条件时，只进入 `under_review`
  - 下一回合若仍满足极危条件，才触发处决
  - 未满足时逐步退回 `under_watch / safe`
- 冯道之与结算文案只做轻提示，不加硬弹窗

### 包 3：国力节奏重调

目标不是单削南陈，而是同时：

- 北周前中期更耐打
- 南陈成长更平滑

具体方向：

- 北周：
  - 下调前中期 `faction -> governance/socialOrder` 折算强度
  - 下调前几回合主线事件对 `governance` 的直接伤害
- 南陈：
  - 问政即时收益改为三段倍率：
    - `1-6` 低档
    - `7-12` 中档
    - `13-20` 高档
  - 问政后效同样走三段倍率
  - 微调南陈自然增长，优先看 `finance / grain / governance / socialOrder`

## 非目标

- 不新增多档手动存档
- 不重做天道结算 UI
- 不改 20 回合事件结构
- 不重写 AI Native 解析模型

## 受影响文件

- `src/stores/gameStore.ts`
- `src/stores/gameStore.test.ts`
- `src/game/saveEngine.ts`
- `src/game/saveEngine.test.ts`
- `src/game/nationEngine.ts`
- `src/game/nationEngine.test.ts`
- `src/game/roundSettlement.ts`
- `src/game/roundSettlement.test.ts`
- `src/components/Settlement/Settlement.tsx`
- `src/data/nationStats.ts`

## 成功标准

- 玩家在第 20 回合前失败时，能从结算页回到当前回合初
- 前中期不会再出现“上一回合刚危险、下一回合直接突然处决”的断崖感
- 第 4-6 回合时，南陈通常仍应明显弱于北周，而不是已经势均力敌
- 中后期仍保留追平和反超张力
