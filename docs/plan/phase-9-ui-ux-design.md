# 第九阶段：UI/UX 产品化

## 9.0 UI/UX 现状体检

### 当前主要界面清单

| 界面 | 入口 | 关键文件 |
|------|------|----------|
| 首页 / 开始界面 | `/`（`game/index.html`） | 内联 `start-screen`、`loading-screen`、角色创建面板 |
| 游戏主界面 | `/` 进入游戏后 | 地图 HUD、任务状态栏、任务追踪、任务提示、战斗 UI |
| 地图页 | `/map`（`map/index.html`） | 地图 HUD、侧边面板、巴士面板、地点面板、NPC 提示 |
| NPC 对话框 | 地图/游戏内点击 NPC | `game/js/ui/NpcDialogueUI.js` |
| 任务日志 | 按 `J` | `game/js/ui/QuestTriggerUI.js` |
| 背包 / 技能 / 成长面板 | 任务日志、调试页、NPC 商店 | 当前主要集成在任务日志和调试页中 |
| 商店界面 | NPC 对话内打开 | `NpcDialogueUI._openShop` |
| 调试页 | `/tools/tests/*.html` | 成长/背包/技能/任务/NPC/地图等调试页 |

### 当前 UI 问题分类

1. **视觉不统一**：开始界面为深色金色校园 RPG 风格，NPC 对话框为浅色办公风格（`#fff` 面板 + Arial），任务日志为深色科技风，地图 HUD 为蓝黑科幻风，缺乏统一的 HUST 校园主题。
2. **按钮/卡片/弹窗样式不统一**：存在 `start-btn`、`create-btn`、`quest-btn`、`poi-action-btn`、地图内联按钮、调试页原生按钮等多种风格，大小、圆角、颜色体系不一致。
3. **信息层级不清楚**：任务日志详情面板中地点、前置、奖励、目标堆叠在一起；地图地点面板缺少明确的分区和标题样式。
4. **移动端适配不足**：部分面板使用固定像素宽度、未使用 `min()` / `max()` 适配小屏；NPC 对话框和商店网格在手机上容易溢出。
5. **状态反馈不足**：Toast 分散在 `QuestTriggerUI`、地图 `QuestMapIntegration`、NPC 对话框、时间事件等各处，颜色和动画不统一；加载、空状态、错误状态缺少统一组件。
6. **加载/错误/空状态不完善**：加载屏只有进度条和文案；任务日志空状态只有一句话；地图面板缺少空状态样式。
7. **中文显示或文案不自然**：部分用户界面保留英文提示，如 NPC 对话框 footer `E/Enter continue, number keys choose, Esc close`、商店按钮 `Back`、Toast `Quest accepted`、任务日志 `当前分类暂无任务` 过于平淡。
8. **交互入口隐藏或不清晰**：地图侧滑面板、NPC 交谈、任务追踪、技能/背包入口等入口缺少统一图标和提示。

## 第九阶段拆分计划

| 子阶段 | 内容 | 状态 |
|--------|------|------|
| 9.0 | UI/UX 现状体检 | 已完成 |
| 9.1 | 视觉规范与基础组件统一 | 已完成 |
| 9.2 | 游戏主界面产品化 | 已完成 |
| 9.3 | 地图 UI 产品化 | 已完成 |
| 9.4 | 对话 / 任务 / 背包 / 技能面板深度打磨 | 已完成 |
| 9.5 | 响应式与动效反馈 | 已完成 |
| 9.6 | 浏览器验收、文档与截图材料 | 已完成 |

## 9.1 视觉规范与基础组件统一

### 设计原则

- **校园 RPG 风格**：以 HUST 蓝 + 金色高亮 + 活力绿为主色，整体保持深色沉浸感，但避免单调蓝黑。
- **可读性优先**：中文使用 `PingFang SC` / `Microsoft YaHei` / `Noto Sans SC`，标题可搭配 `Noto Serif SC`。
- **层次丰富**：使用渐变背景、微妙边框、光晕阴影，提升面板质感。
- **响应式基础**：关键组件使用 `min()`、`clamp()`、弹性布局，确保移动端不崩。
- **渐进增强**：本次只统一关键界面入口和按钮/面板/标签/Toast 样式，不推翻旧系统。

### 视觉规范

- 颜色：`--hw-hust-blue` `#005BAC` / `#1E6FDF`，`--hw-vivid-green` `#00C9A7`，`--hw-gold` `#F5C542`，`--hw-bg-dark` `#0F172A`，`--hw-panel` `#1E293B`。
- 间距：4, 8, 12, 16, 20, 24, 32, 48 px。
- 圆角：4, 8, 12, 16 px；卡片/面板 8~12 px。
- 阴影：`sm` / `md` / `lg` / `glow-blue` / `glow-gold`。
- 字体：中文 `PingFang SC, Microsoft YaHei, Noto Sans SC, sans-serif`；标题 `Noto Serif SC, serif`。
- z-index：`toast=10000` > `modal=9000` > `panel=8000`。
- 过渡：`0.15s` / `0.25s` / `0.35s` ease-out。

### 基础组件清单

- 按钮：`hw-button`、`hw-button-primary`、`hw-button-secondary`、`hw-button-ghost`、`hw-button-danger`、`hw-icon-button`。
- 面板/卡片：`hw-panel`、`hw-card`。
- 弹窗：`hw-modal`、`hw-dialog`。
- 标签页：`hw-tabs`、`hw-tab`、`hw-tab-active`。
- 徽章/标签：`hw-badge`、`hw-tag`。
- 进度条：`hw-progress`、`hw-progress-bar`。
- Toast：`hw-toast` + 状态变体。
- 空/加载/错误状态：`hw-empty-state`、`hw-loading-state`、`hw-error-state`。
- 文字：`hw-title`、`hw-subtitle`、`hw-text-muted`。

### 第一轮应用范围（9.1）

- `game/index.html`：引入 `ui-theme.css`，开始界面按钮替换为 `hw-button-primary` / `hw-button-secondary`。
- `NpcDialogueUI.js`：面板和选项使用 `hw-panel`、`hw-button`、`hw-tag`。
- `QuestTriggerUI.js`：卡片、徽章、空状态、按钮使用 `hw-card`、`hw-badge`、`hw-button`。
- 地图 `QuestMapIntegration.js` / `MapSceneManager.js`：地点面板、室内场景面板、按钮使用 `hw-panel`、`hw-button`。
- `map/index.html`：引入 `ui-theme.css`，作为全局基础变量和组件。
- 修正明显英文/调试味文案，保持用户界面不出现 `debugXXX` 字样（调试页除外）。

## 9.2 游戏主界面产品化

### 目标

把 `game/index.html` 的开始界面和进入游戏后的主界面从“调试入口”升级为“正式游戏产品界面”，信息层级清晰、入口明确、反馈统一，同时不破坏地图、任务、背包、技能、存档等现有系统。

### 开始界面

- 页面第一屏更像正式游戏入口：HUST WORLD 标题突出、副标题“华中科技大学 · 校园模拟”、底部操作提示。
- 统一使用 `.hw-button-primary` / `.hw-button-secondary` / `.hw-button-ghost` 三类按钮，并统一开始按钮宽度与悬停动效。
- 按四类状态清晰展示入口：
  1. 未登录无游客存档：显示「开始游戏」与「登录 / 注册」。
  2. 未登录有游客存档：显示「继续旅程」、「开始游戏」与「登录 / 注册」，并展示游客存档信息。
  3. 已登录无角色：显示「创建角色」与「退出登录」。
  4. 已登录有角色：显示「继续旅程」、「选择角色」与「退出登录」，并展示当前角色信息。
- 引入状态标签（状态圆点 + 状态文案），区分「游客模式」与「已登录」，并提示是否有存档/角色。
- 修正调试味文案：按钮文案改为「继续旅程 / 开始游戏 / 选择角色 / 登录 / 注册 / 退出登录」，不再使用 `debugXXX` 或明显英文调试词。

### 游戏主 HUD

- 新增 `game/js/ui/GameDashboardUI.js` + `game/css/game-dashboard.css`。
- HUD 常驻在页面顶部，采用玻璃拟态卡片 + 金色高亮，展示：
  - 角色卡片：姓名、学院、性别头像、等级、经验/下一级经验（进度条）。
  - 核心属性：金币、知识、社交、心情。
  - 体力卡片：体力 / 最大体力（进度条）。
  - 学期/时间：当前学期、周次、游戏时间。
  - 追踪任务：当前追踪任务标题与摘要。
  - 当前位置：地图或室内场景名称。
- 数据缺失时显示空状态或默认值，不展示 `undefined` / `null`。
- 移动端自动压缩：HUD 卡片缩小、导航栏只显示图标。

### 主导航入口

- 新增底部导航栏 `#gd-nav-bar`，包含：
  - 🗺️ 地图：切换地图侧栏（复用 `#panelToggle`）。
  - 📜 任务：打开任务日志（复用 `QuestTriggerUI`）。
  - 🎒 背包：打开背包面板。
  - 📈 成长：打开角色成长面板。
  - ✨ 技能：打开技能面板。
  - 💾 保存：手动保存并给出 Toast 反馈。
  - ⚙️ 首页：返回首页 / 设置面板。
- 统一样式，移动端只显示图标。

### 轻量面板

- **成长面板**：level、experience、下一级经验、金币、体力/最大体力、知识、社交、心情、当前位置、追踪任务摘要。
- **背包面板**：物品名称、数量、类型/效果，可使用物品显示「使用」按钮，使用后刷新 HUD 并调用 `SaveManager.save()` 持久化。
- **技能面板**：技能等级、经验、效果、进度条，未解锁显示未解锁状态。
- **设置面板**：保存按钮、返回首页按钮。
- 操作成功 `showToast`，失败 `showError`，统一走 `UIFeedback`。

### 手动保存与反馈

- 手动保存按钮在导航栏和设置面板中均存在。
- 保存成功显示 Toast「进度已保存」。
- 保存失败显示 Toast「保存失败：xxx，进度已保留在本地」。
- 加载存档时显示 loading 状态（未登录时从本地读取，已登录时优先远程）。
- 没有存档时显示 empty state。
- 不破坏 SaveManager 的游客模式与登录远程模式，失败时自动降级。

### 关键 UI 决策

- 新增 `game-dashboard.css` 专门承载 HUD、面板、导航布局，不把布局样式全部塞入 `ui-theme.css`，保持 `ui-theme.css` 只放通用 token 和组件。
- `GameDashboardUI` 通过全局变量读取现有 manager（`saveManager`、`questTriggerManager`、`timeSystem`），Manager 不存在时安全兜底，不新建平行系统。
- 开始界面的状态刷新复用已有的 `refreshStartScreen()` 逻辑，仅扩展状态标签与文案。

### 测试

新增 `tools/tests/test-game-dashboard.html` / `test-game-dashboard-main.js` / `browser-test-game-dashboard.js` 与 `package.json` 脚本 `test:game-dashboard`，覆盖：

- 页面加载无 JS error。
- HUD 渲染角色名、等级、金币、体力、学期、追踪任务、位置。
- 打开成长面板。
- 打开背包面板并显示使用按钮。
- 打开技能面板并显示未解锁状态。
- 使用一个可用物品后 HUD 刷新。
- 手动保存按钮可点击并出现 Toast。
- 刷新后状态保留（依赖现有 SaveManager 本地保存）。

### 9.3 地图 UI 产品化（已完成）

#### 目标

把 `map/index.html` 的地图页从“功能调试入口”升级为“校园探索核心舞台”，统一 HUD、POI 地点面板、室内场景面板、NPC 提示和任务追踪标记的视觉与交互，同时不破坏现有地图移动、POI 触发、室内场景、NPC 对话、任务追踪等系统。

#### 地图 HUD

- 新增 `map/js/ui/MapHUDUI.js` + `map/css/map-ui.css`。
- HUD 常驻在页面顶部，采用玻璃拟态卡片 + 金色高亮，展示：
  - 角色卡片：姓名、等级。
  - 当前位置：地图名或室内场景名。
  - 追踪任务：当前追踪任务标题（无追踪任务显示“无追踪任务”）。
  - 核心属性：体力、心情、金币。
  - 快捷操作按钮：返回游戏主界面、打开任务日志、重置视角、定位当前追踪任务、返回室外地图。
- 数据缺失时显示空状态或默认值，不展示 `undefined` / `null`。
- 移动端自动压缩：HUD 元素使用 `clamp()` / `min()`，按钮只显示图标或缩小间距。

#### POI 地点面板

- 点击地图 POI 弹出地点面板，使用 `hw-panel` / `hw-button` 规范，展示：
  - 地点名称、类型徽章（教学楼/图书馆/宿舍/食堂/操场/社团/实验室/景点/其他）。
  - 地点描述与 emoji 图标（emoji 缺失时 fallback 到文字/圆点）。
  - 相关 NPC 列表，显示可接任务 / 可交付 / 可交谈状态。
  - 当前可接/进行中/可交付任务列表，使用 `hw-tag` / `hw-badge` 区分状态与类型。
  - 操作按钮：追踪任务、触发任务、进入室内、关闭。
- 面板 pointer-events 单独管理：打开面板时允许内部滚动和点击，点击外部地图关闭面板；地图缩放/平移按钮不受面板覆盖影响。

#### 室内场景面板

- 进入室内场景（`library_inside` / `dorm_inside` / `classroom_inside` / `club_center_inside` / `lab_inside` / `canteen_inside`）后显示场景面板：
  - 场景名称、场景类型徽章、场景描述。
  - 场景内可触发任务列表。
  - 场景内 NPC 列表与状态。
  - 「返回校园」按钮，点击后切换回 `campus` 主地图。
- 室内场景仍支持按 `J` 打开任务日志，任务追踪与地图联动保持一致。

#### NPC 提示

- 在地图页和室内场景中，玩家靠近 NPC 时底部显示：「按 E 与 xxx 交谈」。
- NPC 状态根据任务配置动态计算：
  - `hasQuestStart`：可接任务，显示绿色提示。
  - `hasQuestComplete`：可交付任务，显示金色提示。
  - 默认：可交谈，显示蓝色提示。
- 按 `E` 后打开 `NpcDialogueUI`，支持键盘和触控关闭。

#### 任务追踪标记

- 当前追踪任务在地图标记上高亮，并带有脉冲阴影。
- 任务日志中点击「定位」或 HUD 中点击「定位当前追踪任务」会平滑移动到对应 POI 并高亮。
- 追踪状态持久化到 `progress.trackedQuestId` / `trackedQuestKind` / `trackedQuestGroup` / `trackedPoiId`，刷新后从 `SaveManager` 恢复。
- 任务完成后自动清除追踪标记，切换追踪任务时同步刷新地图标记与面板。

#### 移动端适配

- 地图缩放按钮 `+` / `-` 加大触控区域。
- 侧栏呼出按钮固定可见，避免小屏被地图遮挡。
- POI 点击区域在触控设备上放大，减少误触。
- 面板在小屏下使用 `max-width: min(92vw, 420px)`，避免溢出。
- HUD 属性文字在超小屏下隐藏部分标签，只显示图标和数值。

#### 关键 UI 决策

- 新增 `map-ui.css` 专门承载地图 HUD、面板、地点面板、室内场景面板、NPC 提示样式，不把地图样式全部塞入 `ui-theme.css`，保持 `ui-theme.css` 只放通用 token 和组件。
- `MapHUDUI` 通过全局变量读取现有 manager（`questManager`、`saveManager`、`timeSystem`、`mapRenderer`），Manager 不存在时安全兜底，不新建平行系统。
- 地点面板与室内场景面板使用 `pointer-events: auto` 覆盖地图层的 `pointer-events: none`，确保内部按钮可点击；地图交互层保持 `pointer-events: none` 让点击穿透到 Canvas。
- emoji 图标统一使用 Twemoji / 系统 emoji，缺失时 fallback 到文字标签或纯色圆点，避免空白或乱码。
- 任务追踪状态变更后调用 `SaveManager.save()` 持久化，失败时降级到本地并显示 `UIFeedback` 提示。

#### 测试

新增 `tools/tests/test-map-ui.html` / `test-map-ui-main.js` / `browser-test-map-ui.js` 与 `package.json` 脚本 `test:map-ui`，并入 `test:map` 串联执行，覆盖：

- 页面加载无 JS error。
- HUD 渲染角色名、等级、位置、追踪任务、属性按钮。
- 侧栏存在且地点列表渲染。
- 点击 POI 后地点面板可见。
- 移动端 HUD 不发生重叠。
- 刷新后页面无新增 JS error。

### 9.4 对话 / 任务 / 背包 / 技能面板深度打磨（已完成）

- 统一 `NpcDialogueUI` 对话框：使用 `hw-panel` / `hw-card` / `hw-button` 规范，优化头像/姓名/身份展示、选项按钮悬停效果、奖励预览、键盘提示文案。
- 统一 `QuestTriggerUI` 任务日志面板：任务卡片状态标识更清晰、奖励预览使用物品名称而非 ID、空/加载/错误状态使用统一组件、追踪按钮与高亮反馈。
- 统一背包面板：物品图标、数量角标、类型标签、使用效果预览、空背包状态。
- 统一技能面板：技能等级、经验进度条、解锁状态、效果加成汇总、未解锁提示。
- 保留现有系统能力，不破坏任务/NPC/背包/技能/存档逻辑。

完成结果：

- 新增 `game/css/gameplay-panels.css`，统一玩法面板的分段筛选、数据行、状态提示、移动端底部弹层与减少动效模式。
- `NpcDialogueUI` 增加对话进度、选项键位、不可选条件说明、商店余额/持有数量/金币不足状态。
- `QuestTriggerUI` 增加追踪任务高亮和键盘选择，并修复详情按钮缺少 `.quest-btn` 导致事件未绑定的问题。
- `GameDashboardUI` 的背包支持全部/可使用/任务物品/收藏装备筛选；技能支持学习/体育/社交/探索/职业筛选，并显示效果和解锁条件。
- `test:dashboard` 与 `test:game-dashboard` 统一为等价脚本；新增 `test:panels-ui` 验证面板筛选、对话层级和移动端水平溢出。

### 9.5 响应式与动效反馈（已完成）

- 新增 `game/css/responsive-motion.css`，统一游戏页、地图页和关键调试页的移动端边界、触控目标、键盘焦点、滚动容器、进入动效与 `prefers-reduced-motion` 降级规则。
- 游戏主界面和地图页在 360px / 375px 移动端视口下无水平溢出，面板宽度不会超过视口。
- 底部导航、地图工具按钮、任务按钮、NPC 对话选项等关键可点击元素保留 44px 以上触控尺寸。
- 键盘操作时按钮、标签、任务卡和对话选项显示清晰 `focus-visible` 反馈。
- 减少动态效果模式下动画和过渡统一降级，避免眩晕或视觉负担。
- 新增 `tools/tests/browser-test-responsive-motion.js` 与 `npm run test:responsive`，覆盖移动端水平溢出、触控目标、焦点反馈、地图侧栏宽度和 reduced motion。

### 9.6 浏览器验收、文档与截图材料（已完成）

- 新增 `tools/tests/browser-test-phase9-final.js` 与 `npm run test:phase9`，统一第九阶段最终浏览器验收。
- 脚本自动访问游戏主界面、移动端背包、校园地图、NPC 对话和任务日志，检查页面错误、水平溢出和截图有效性。
- 生成展示截图到 `docs/showcase/screenshots/`，包括主 HUD、移动端背包、地图、NPC 对话和任务日志。
- 生成验收报告 `docs/showcase/reports/phase-9-ui-ux-final-report.json`，记录验收 URL、检查项、截图列表和通过状态。
- 新增 `docs/showcase/ui-ux-showcase.md`，沉淀第九阶段展示材料、展示话术和简历亮点。
- 修正迎新 NPC 的展示名称、地点、对话和选项中文化，并在 `NpcDialogueUI` 中将角色枚举显示为中文。

第九阶段 UI/UX 产品化已全部完成。下一阶段进入第十阶段：测试、质量和可部署。

---

*文档版本：v1.3 | 最后更新：2026-07-12*
