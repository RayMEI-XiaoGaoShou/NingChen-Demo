# 佞臣 Demo 视觉与媒体资源接入实现计划

日期：2026-03-29  
对应设计：`docs/superpowers/specs/2026-03-29-visual-media-integration-design.md`

---

## 1. 实现目标

本轮实现三部分：

1. 全局 BGM 控制
2. 地图接入与战役状态切图
3. NPC 角色图接入

原则：

- 不重做主循环
- 不推翻现有页面结构
- 优先稳定接入与可回退

---

## 2. 实现顺序

### 阶段 A：媒体配置层

新增统一配置与纯函数：

- `src/data/mediaAssets.ts`
  - BGM 路径映射
  - NPC 图片路径映射
  - 地图路径映射
- `src/game/mapAssetEngine.ts`
  - 根据 `shuCampaign.state` 与 `huainanCampaign.state` 返回当前地图

目标：

- 把文件名映射集中管理
- 避免页面内硬编码

验收：

- 能正确返回 4 张地图中的对应资源
- `宇文棣` 正确映射 `拓跋棣.png`

---

### 阶段 B：全局 BGM 控制

新增：

- `src/stores/mediaStore.ts`
  - `isMuted`
  - `audioReady`
  - `currentTrack`
- `src/components/GlobalAudio/GlobalAudio.tsx`
  - 全局单实例 `audio`
  - 自动换曲
  - 自动播放失败回退

接入：

- 在 `App.tsx` 中挂载全局音频组件
- 按当前页面/phase 切换：
  - 序章/玩法说明/结算：`BGM 4`
  - 回合首页/朝局：`BGM 1`
  - 施计/暗线回报：`BGM 2`
  - 问政：`BGM 3`

UI：

- 在全局 utility 区提供一个轻量静音切换按钮

验收：

- 页面切换时曲目正确切换
- 不会多轨叠加
- 静音状态可切换并持久化

---

### 阶段 C：地图接入

改动页面：

- `src/components/Prologue/Prologue.tsx`
- `src/components/RoundStart/RoundStart.tsx`

改动内容：

- 序章页“纷乱之世”下新增地图卡，固定显示 `map_1_initial.png`
- 回合首页将“历史辅助 + 方位示意”合并成一张地图卡
- 删除旧的简化点位图
- 保留：
  - 地理提示
  - 势力提示
  - 战略提示

地图切换：

- 默认：`map_1_initial`
- 蜀地得手：`map_2_bashu`
- 蜀地+淮南得手：`map_3_bashu_huainan`
- 仅淮南得手：`map_4_huainan`

验收：

- 序章显示初始地图
- 回合首页按战役结果正确切图
- 首页信息密度不明显变差

---

### 阶段 D：NPC 小头像接入

改动页面：

- `src/components/CourtView/CourtView.tsx`
- `src/components/SchemePanel/SchemePanel.tsx`
- `src/components/SchemeFeedback/SchemeFeedback.tsx`

改动内容：

- 用小头像替换当前字母占位
- 保留回退占位样式
- 保证头像不压缩主要文本区域

样式目标：

- 小头像固定容器
- 使用 `object-fit`
- 保持现有信息可读性

验收：

- 朝局观察页群臣列传正常显示头像
- 施计页目标卡正常显示头像
- 暗线回报页正常显示头像

---

### 阶段 E：NPC 详情大图接入

改动页面：

- `src/components/NPCDetail/NPCDetail.tsx`
- `src/components/NPCDetail/NPCDetail.css`

改动内容：

- 在详情头部加入大图主视觉
- 与姓名、官职、阵营组合展示
- 使用 `contain`
- 保留缺图回退

可选补充：

- 女帝问政页接入 `陈倩.png` 作为轻量头图

验收：

- NPC 详情大图不变形
- 不挤压主要信息区
- 缺图时仍可正常打开弹窗

---

### 阶段 F：样式收口与验证

需要检查：

- 桌面端和窄屏是否都正常
- BGM 切换是否稳定
- 地图卡是否过大
- 头像是否导致布局错位

验证命令：

- `npm.cmd test`
- `npm.cmd run build`

必要时补定向测试：

- 地图选择纯函数测试
- 媒体映射测试

---

## 3. 风险控制

### 风险 A：浏览器禁止自动播放

处理：

- 捕获 `audio.play()` 失败
- 在第一次点击后自动恢复尝试

### 风险 B：图片命名与 NPC 名不完全一致

处理：

- 在统一映射层中显式映射
- 特别处理 `宇文棣 -> 拓跋棣.png`

### 风险 C：地图卡挤占首页空间

处理：

- 用“一张地图卡”替换“原两张辅助卡”
- 保持辅助文字为 3 段短句

### 风险 D：头像破坏原有信息层级

处理：

- 头像只作为识别辅助
- 文本仍保持主信息层

---

## 4. 预计改动文件

新增：

- `src/data/mediaAssets.ts`
- `src/game/mapAssetEngine.ts`
- `src/stores/mediaStore.ts`
- `src/components/GlobalAudio/GlobalAudio.tsx`
- `src/components/GlobalAudio/GlobalAudio.css`（如需要）

修改：

- `src/App.tsx`
- `src/components/Prologue/Prologue.tsx`
- `src/components/Prologue/Prologue.css`
- `src/components/RoundStart/RoundStart.tsx`
- `src/components/RoundStart/RoundStart.css`
- `src/components/CourtView/CourtView.tsx`
- `src/components/CourtView/CourtView.css`
- `src/components/SchemePanel/SchemePanel.tsx`
- `src/components/SchemePanel/SchemePanel.css`
- `src/components/SchemeFeedback/SchemeFeedback.tsx`
- `src/components/SchemeFeedback/SchemeFeedback.css`
- `src/components/NPCDetail/NPCDetail.tsx`
- `src/components/NPCDetail/NPCDetail.css`
- `src/components/EmpressLetter/EmpressLetter.tsx`（若接女帝头像）
- `src/game/saveEngine.ts`

文档回写：

- `佞臣策划案v1/前台交互与信息可见性设计.md`
- `佞臣策划案v1/世界观与故事框架.md`

---

## 5. 执行建议

推荐按以下节奏执行：

1. 先做配置层 + 地图纯函数
2. 再做 BGM
3. 再做地图卡替换
4. 最后做头像接入与样式收口

这样一旦某一块素材接入观感不理想，也容易单独回退，不会影响主循环逻辑。
