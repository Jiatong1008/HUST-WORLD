# HUST WORLD Personal Edition

> 本仓库是基于小组课程设计 HUST WORLD 的个人延续版本；原有成果保留团队贡献说明，个人新增边界见 [个人版说明](docs/personal/README.md)。

个人版维护者：Jiatong（GitHub：[Jiatong1008](https://github.com/Jiatong1008)）。

## 个人版亮点：喻园第一周

在游戏主界面右下角打开“喻园第一周”，可体验一条完整的校园叙事闭环：报到、图书馆学习、醉晚亭夜游、帮助下一位新同学。四次选择会写入统一存档，生成记忆卡、三维倾向和结局。

- 叙事与设计说明：[喻园第一周](docs/personal/hust-week-design.md)
- 素材来源和公开发布前检查：[素材登记](docs/ASSET_ATTRIBUTION.md)
- 功能自动化验证：`npm run test:campus-week`

HUST WORLD 是一个以华中科技大学校园生活为主题的 Web 校园模拟 RPG。
玩家可以创建角色，在校园地图中移动、探索地点、与 NPC 对话、完成任务、加入社团、参加课程、跑步锻炼、触发考试/战斗，经历完整的大学成长周期。

## 技术栈

- 后端：Node.js + Express + mysql2
- 数据库：MySQL 8.0
- 鉴权：JWT + bcryptjs
- 前端：原生 HTML + CSS + JavaScript
- 游戏表现：Canvas/DOM 混合地图交互

## 前置要求

- Node.js 18+
- MySQL 8.0（本地或远程）
- Docker Desktop（可选，用于容器化部署）

部署、数据库配置与验收步骤详见 [运行与部署手册](docs/quality/deployment-runbook.md)。

## 安装与启动

1. 安装依赖

```bash
npm install
```

2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填入 MySQL 用户名、密码以及服务端口（PORT）
```

`.env` 中与运行直接相关的示例：

```env
PORT=8080
SMOKE_API_BASE=http://localhost:8080

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=123456
DB_NAME=hust_world
DB_PORT=3306
```

> 服务监听端口由 `.env` 中的 `PORT` 决定，未设置时默认 `8080`。
> 冒烟测试目标地址由 `.env` 中的 `SMOKE_API_BASE` 决定，未设置时默认 `http://localhost:8080`，与 `PORT` 保持一致。

3. 启动数据库

如果本地已有 MySQL 服务，请确保存在名为 `hust_world` 的数据库（字符集 `utf8mb4`）。

如果本地没有 MySQL 服务，可使用项目内置的 MariaDB/MySQL 开发实例启动脚本：

```bash
node tools/database/start-mysql-dev.js
```

该脚本会在 `.hust-world-mysql` 目录下初始化并启动一个开发数据库，默认连接参数与 `config/db.js` 的默认值一致。关闭终端即可停止；数据会保留在 `.hust-world-mysql` 中，下次启动时继续使用。

4. 启动服务

```bash
npm start
```

Windows 也可以直接运行 `start.bat`。

> 准备交付或部署时，请不要使用示例中的数据库密码和 JWT 密钥；完整的生产配置要求见运行与部署手册。

5. 访问项目

- 游戏首页：http://localhost:8080
- 地图页面：http://localhost:8080/map
- 健康检查：http://localhost:8080/api/health
- 跑步测试页面：http://localhost:8080/tools/tests/test-running-api.html
- 存档调试页面：http://localhost:8080/tools/tests/test-save-manager.html
- 主线任务调试页面：http://localhost:8080/tools/tests/test-main-quest.html
- 支线任务调试页面：http://localhost:8080/tools/tests/test-side-quests.html
- 地图 POI 调试页面：http://localhost:8080/tools/tests/test-map-poi.html
- 任务系统调试页面：http://localhost:8080/tools/tests/test-quest-system.html
- 角色成长系统调试页面：http://localhost:8080/tools/tests/test-growth-system.html
- 背包与物品使用系统调试页面：http://localhost:8080/tools/tests/test-inventory-system.html
- 技能与熟练度系统调试页面：http://localhost:8080/tools/tests/test-skills-system.html
- 地图 UI 调试页面：http://localhost:8080/tools/tests/test-map-ui.html

> 如果 `.env` 中修改了 `PORT`，请将示例 URL 中的 `8080` 替换为实际端口。

## 第九阶段 UI/UX 产品化

### 视觉规范与基础组件

- `game/css/ui-theme.css`：HUST 校园 RPG 主题设计 token 与基础组件，包含 HUST 蓝 / 活力绿 / 金色高亮色、深浅色板、间距、圆角、阴影、字体、z-index、过渡，以及 `.hw-button`、`.hw-panel`、`.hw-card`、`.hw-modal`、`.hw-tabs`、`.hw-badge`、`.hw-tag`、`.hw-progress`、`.hw-toast`、`.hw-empty-state`、`.hw-loading-state`、`.hw-error-state`、`.hw-title` 等组件类。
- `game/js/ui/UIFeedback.js`：轻量 UI 反馈工具，不依赖框架，暴露 `showToast(message, type, duration)`、`showLoading(target, text)`、`hideLoading(target)`、`showEmptyState(target, text)`、`showError(target, message)`、`confirmAction(message)`。具备 DOM 缺失安全兜底、旧状态清理和自动 Toast 容器管理。

第九阶段 9.2 游戏主界面产品化已完成。开始界面（`#start-screen`）按四类状态清晰展示入口：未登录无游客存档、未登录有游客存档、已登录无角色、已登录有角色；统一使用 `.hw-button-primary` / `.hw-button-secondary` / `.hw-button-ghost` 样式并引入状态标签。游戏主 HUD（`game/js/ui/GameDashboardUI.js` + `game/css/game-dashboard.css`）展示角色名、学院、等级、经验/下一级经验、金币、体力、知识、社交、心情、学期/周次/时间、当前位置、追踪任务摘要，数据缺失时显示空状态或默认值，不展示 `undefined`/`null`。

主导航入口（`#gd-nav-bar`）包含校园地图、任务日志、背包、角色成长、技能、保存、设置/返回首页，统一样式且保留现有地图、任务、保存系统能力。`GameDashboardUI` 负责渲染 HUD 并打开/关闭成长、背包、技能、设置面板。

第九阶段 9.3 地图 UI 产品化已完成。新增 `map/js/ui/MapHUDUI.js` + `map/css/map-ui.css`，统一地图 HUD、POI 地点面板、室内场景面板、NPC 提示、任务追踪标记与移动端适配：

- 地图 HUD：常驻玻璃拟态顶部栏，展示角色名/等级、当前位置/室内场景、追踪任务、体力/心情/金币、快捷操作按钮（返回首页、任务日志、重置视角、定位追踪任务、返回室外地图）。
- POI 地点面板：点击地图 POI 弹出 `hw-panel` 面板，统一标题、类型徽章、地点描述、相关 NPC、可接/进行中/可交付任务、操作按钮，默认使用 emoji 图标，缺失时安全 fallback 到文字/圆点。
- 室内场景面板：进入图书馆/宿舍/教室/社团活动中心/实验室/食堂等室内场景后，显示统一场景面板、可触发任务、NPC 列表与「返回校园」按钮。
- NPC 提示：在地图页和室内场景中靠近 NPC 时，底部显示「按 E 与 xxx 交谈」；NPC 状态区分可接任务、可交付、可交谈。
- 任务追踪标记：当前追踪任务在地图上高亮并带脉冲阴影，任务日志与地图面板同步刷新；追踪状态持久化到 `progress`，刷新后恢复。
- 移动端适配：HUD 元素使用 `clamp()` / `min()` 压缩，缩放按钮、侧栏呼出、POI 点击区域放大，避免小屏溢出。

所有操作优先调用现有 `QuestTriggerManager` / `SaveManager` / `InventoryManager` 接口，Manager 不存在时安全兜底，不破坏游客模式和登录远程模式。`map/index.html` 引入 `game/css/ui-theme.css` 共享设计 token，`map/js/main.js` 与 `map/js/UIManager.js` 负责地图 UI 初始化和状态同步。

第九阶段 9.4 玩法面板深度打磨已完成。新增 `game/css/gameplay-panels.css`，供 NPC 对话、任务日志、背包、成长和技能面板共享。NPC 对话现在显示对话进度、选项键位、条件不足原因以及商店余额和物品持有量；任务日志支持追踪任务高亮、键盘选择和可靠的详情操作按钮；背包支持分类筛选、数量汇总、使用效果与稀有度提示；技能面板支持分类筛选、解锁统计、熟练度、效果加成与解锁条件。专项验收命令为 `npm run test:panels-ui`。

- 成长面板：展示 level、experience、下一级经验、stamina/maxStamina、knowledge、social、mood、money、当前位置与追踪任务摘要。
- 背包面板：展示物品名称、数量、类型/效果，可使用物品显示「使用」按钮，使用后刷新 HUD 并调用 `SaveManager.save()` 持久化。
- 技能面板：展示技能等级、经验、效果与进度条，未解锁显示未解锁状态。
- 手动保存：导航栏与设置面板均提供保存按钮，保存成功/失败通过 `UIFeedback` 显示 Toast，失败时提示「进度已保留在本地」；保存状态标签显示 saving/已保存。

所有操作优先调用现有 `InventoryManager` / `SaveManager` / `QuestTriggerManager` 接口，Manager 不存在时安全兜底，不破坏游客模式和登录远程模式。

第九阶段 9.5 响应式与动效反馈已完成。新增 `game/css/responsive-motion.css`，统一游戏页、地图页和关键调试页的移动端边界、触控目标、键盘焦点、滚动容器、进入动效与 `prefers-reduced-motion` 降级规则。游戏主界面和地图页在 360px / 375px 移动端视口下无水平溢出，底部导航、地图工具按钮、任务/对话/面板按钮保留可触控尺寸；键盘聚焦时显示清晰描边；减少动态效果模式下动画和过渡自动降级。专项验收命令为 `npm run test:responsive`。

UI 全面升级继续复用现有界面系统：任务日志改为独立滚动的任务列表与详情区，任务卡片禁止 Flex 压缩，避免标题、状态和地点互相覆盖；主 HUD、弹出面板、NPC 对话与地图控件统一使用新的中文字体栈。`MapEnhancements.js` 提供共享校园小地图，显示 POI、玩家位置、当前视野和缩放倍率，支持点击定位与收起/展开。专项几何验收命令为 `npm run test:ui-layout`，覆盖桌面端、移动端、任务卡片、NPC 选项、Dashboard 和地图控制区重叠检查。

第九阶段 9.6 浏览器验收、文档与截图材料已完成。新增 `npm run test:phase9`，会自动启动服务、访问游戏主界面、移动端背包、校园地图、NPC 对话和任务日志，检查页面错误与水平溢出，并生成展示截图和验收报告。展示材料位于 `docs/showcase/`：

- `docs/showcase/ui-ux-showcase.md`：第九阶段 UI/UX 展示说明、截图清单和简历亮点。
- `docs/showcase/screenshots/`：可用于 README、简历项目页和演示材料的截图。
- `docs/showcase/reports/phase-9-ui-ux-final-report.json`：第九阶段最终浏览器验收报告。

### 应用范围

第九阶段 9.0~9.6 已全部完成。基础组件已应用到游戏首页、NPC 对话框、任务日志、地图 POI 地点面板、室内场景面板、地图 HUD、游戏主 HUD 与面板、开始界面等关键界面，统一了按钮、面板、标签、徽章、进度条、Toast、焦点反馈、触控尺寸和减少动态效果规则，并沉淀了可展示截图、验收报告和简历亮点说明。

## HUST 校园特色

项目以华中科技大学校园生活为蓝本，填充了以下校园特色元素：

### 主要校园地标（≥ 10 个）

- 南大门：华科主校门，迎新和毕业季最热闹的地方，从此走进“森林大学”。
- 青年园：校园中心绿地，银杏金黄时是华科最具代表性的画面。
- 主图书馆：华科知识殿堂，期末周座位一早被占满。
- 毛主席像：校园中轴线南端，毕业季合影圣地。
- 东九教学楼：亚洲第一大教学楼。
- 西十二教学楼：亚洲第三大教学楼，走廊长、教室多，迷路是新生必修课。
- 光电国家研究中心：华科光电领域核心阵地，实验室灯火通明。
- 精密重力测量中心：华科国家级科研平台之一。
- 醉晚亭：镜湖边古亭，夏夜常有人弹唱。
- 爱因斯坦广场：毕业季拍照打卡圣地。
- 建校纪念碑：承载森林大学历史记忆。
- 梧桐语问学中心：学术交流与讲座空间。
- 喻家山：校园背后的城市绿肺，被称为“森林大学”的天然氧吧。

### 任务线（按年级学期）

| 阶段 | 主线任务 | 支线任务 |
|------|----------|----------|
| 大一上 | 初入华中大、军训历练、高数第一课 | 森林初探、图书馆占座先锋、食堂隐藏菜单、超市补给 |
| 大一下 | 期末迎战 | — |
| 大二上 | 百团大战 | 社团破冰 |
| 大二下 | 森林大学夜跑、体测大作战 | 体测大作战 |
| 大三上 | 走进实验室 | 简历打磨 |
| 大三下 | 实习季 | — |
| 大四上 | 毕设开题 | 论文冲刺 |
| 大四下 | 毕业答辩、森林大学毕业典礼 | — |

### 特色物品

- 热干面：武汉早餐灵魂，芝麻酱香浓。
- 豆皮：糯米、肉丁、香菇和蛋皮煎成。
- 鸭血粉丝汤：冬日食堂里的安慰。
- 麻辣香锅：食堂顶流，自选配料重口味。
- 蛋酒：武汉特色早餐饮品，暖胃提神。
- 咖啡：考试周续命神器，图书馆人手一杯。
- 校园卡：华科学生身份象征，吃饭/借书/坐校车都离不开。
- 占座书：图书馆占座常见道具，承载期末精神。
- 实验室通行证：进入实验室的临时凭证。
- 学霸笔记、实验记录、论文草稿：任务道具。
- 社团纪念章、运动饮料、能量棒：社团与运动补给。

### 校园巴士

- 巴士站点：韵苑巴士站、紫菘巴士站、沁苑巴士站、图书馆巴士站、南大门巴士站、西十二巴士站、东九巴士站、集贸巴士站。
- 路线：校园环线、东西线、南北线，票价 1 元。
- 功能：在巴士站附近按 B 键打开路线选择，乘坐后扣除车费并移动角色。

### 成就（15 项）

- 森林大学第一步、军训硬核、学在华科、期末幸存者、校园 explorer、食堂猎人、百团之星、森林夜跑侠、体测通关、图书馆占座先锋、实验室新星、实习预备役、毕设骑士、答辩大师、森林大学毕业生、校车常客。

### 调试页地址与测试命令

调试页面默认在 `http://localhost:8080`（端口以 `.env` 中 `PORT` 为准）：

- 游戏首页：`http://localhost:8080`
- 地图页面：`http://localhost:8080/map`
- 健康检查：`http://localhost:8080/api/health`
- 任务系统调试页：`http://localhost:8080/tools/tests/test-quest-system.html`
- 地图 POI 调试页：`http://localhost:8080/tools/tests/test-map-poi.html`
- 地图室内场景调试页：`http://localhost:8080/tools/tests/test-map-scenes.html`
- 地图 UI 调试页：`http://localhost:8080/tools/tests/test-map-ui.html`
- NPC 对话调试页：`http://localhost:8080/tools/tests/test-npc-dialogue.html`
- 商店调试页：`http://localhost:8080/tools/tests/test-shop.html`
- 角色成长调试页：`http://localhost:8080/tools/tests/test-growth-system.html`
- 背包调试页：`http://localhost:8080/tools/tests/test-inventory-system.html`
- 技能调试页：`http://localhost:8080/tools/tests/test-skills-system.html`
- 联动调试页：`http://localhost:8080/tools/tests/test-linkage.html`
- 游戏主界面调试页：`http://localhost:8080/tools/tests/test-game-dashboard.html`

常用测试命令：

```bash
npm run test:quick      # 快速检查：质量门禁 + 主界面 + 响应式
npm run test:map        # 地图 POI + 场景 + UI
npm run test:npc        # NPC 对话 + 地图 NPC + 商店
npm run test:quest      # 任务系统
npm run test:dashboard  # 游戏主界面（含成就面板）
npm run test:growth     # 角色成长
npm run test:inventory  # 背包与物品使用
npm run test:skills     # 技能与熟练度
npm run test:linkage    # 联动与平衡
npm run smoke:api       # 核心 API 冒烟测试（需要数据库）
```

> 若 `.env` 中修改了 `PORT`，请将示例 URL 中的 `8080` 替换为实际端口。

## 数据库初始化

首次启动时，`config/db.js` 会自动创建数据库和表结构。

如需导入课程设计自带的完整数据（地图、NPC、社团等），可运行：

```bash
node map/database/import_database.js
```

> 注意：导入脚本会覆盖部分数据，建议在首次初始化后执行。

## 常用脚本

```bash
node tools/database/start-mysql-dev.js  # 启动本地 MariaDB/MySQL 开发实例
npm start                               # 启动 Node 服务
npm run smoke:api                       # 核心 API 冒烟测试（自动创建 smoke_user_* 测试数据）
npm run cleanup:smoke                   # 清理 smoke_user_/verify_user_/test_user_/service_user_/e2e_user_ 测试数据
npm run init:data                       # 初始化基础数据
npm run init:club-tasks                 # 初始化社团任务
npm run check:config                    # 检查 .env、端口、JWT 与数据库连接
npm run check:db                        # 检查数据库连接
npm run check:npcs                      # 检查 NPC 配置
npm run test:running                    # 测试跑步 API
npm run test:quest                      # 真实浏览器验收：任务系统调试页面
npm run test:growth                     # 真实浏览器验收：角色成长系统调试页面
npm run test:skills                     # 真实浏览器验收：技能与熟练度系统调试页面
npm run test:inventory                  # 真实浏览器验收：背包与物品使用系统调试页面
npm run test:linkage                    # 真实浏览器验收：联动与平衡
npm run test:side-quests                # 真实浏览器验收：支线任务调试页面
npm run test:map-poi                    # 真实浏览器验收：地图 POI 调试页面
npm run test:map-scenes                 # 真实浏览器验收：地图室内场景
npm run test:map-ui                     # 真实浏览器验收：地图 UI 产品化
npm run test:map                        # 依次运行地图 POI + 场景 + UI 浏览器验收
npm run test:npc-dialogue               # 真实浏览器验收：NPC 对话调试页面
npm run test:npc-map                    # 真实浏览器验收：/map NPC 交互
npm run test:shop                       # 真实浏览器验收：商店购买
npm run test:npc                        # 依次运行 NPC 对话 + 地图 NPC + 商店验收
npm run test:game-dashboard             # 真实浏览器验收：游戏主界面（别名为 test:dashboard）
npm run test:dashboard                  # 与 test:game-dashboard 等价
npm run test:panels-ui                  # 对话/任务/背包/技能面板产品化验收
npm run test:ui-layout                  # 桌面/移动端 UI 几何重叠与小地图验收
npm run test:responsive                 # 响应式、触控目标、焦点和减少动态效果验收
npm run test:phase9                     # 第九阶段 UI/UX 最终验收并生成展示截图
npm run quality:gate                    # 第十阶段质量门禁：配置、文档、截图残留、JS 语法
npm run test:services                   # 后端服务级测试：auth/character/running/health 与物品技能关联
npm run test:e2e                        # 前端关键流程 E2E：游客/登录/角色/存档/地图/任务/商店
npm run test:quick                      # 快速检查：质量门禁 + 主界面 + 响应式
npm run test:standard                   # 标准回归：质量门禁 + 配置健康 + API + 服务层 + UI/关键 E2E + NPC + 任务
npm run test:full                       # 完整回归：配置健康 + 服务层 + 地图/NPC/任务/成长/背包/技能/联动/UI/E2E 全链路
node tools/tests/browser-test-main-quest.js     # 自动打穿大学四年主线
node tools/tests/browser-test-game-quest.js     # 游戏主入口主线验收
node tools/tests/browser-test-side-quests.js    # 支线任务验收
node tools/tests/browser-test-map-poi.js        # 地图 POI 浏览器验收
node tools/tests/browser-test-map-scenes.js     # 地图场景浏览器验收
node tools/tests/browser-test-npc-dialogue.js   # NPC 对话浏览器验收
node tools/tests/browser-test-npc-map.js        # /map NPC 交互浏览器验收
node tools/tests/browser-test-shop.js           # 商店浏览器验收
node tools/tests/verify-save-flow.js            # 存档流程验收
node tools/tests/browser-test-linkage.js        # 联动与平衡浏览器验收
node tools/tests/browser-test-game-dashboard.js # 游戏主界面浏览器验收
```

> 测试前后建议执行一次 `npm run cleanup:smoke`，避免测试数据在数据库中累积。

## 项目结构

```text
course-design/
├── config/          # 数据库连接与初始化
├── game/            # 游戏主页面、战斗系统、前端资源
├── map/             # 校园地图、地图模块、地图资源和 SQL 脚本
├── routes/          # Express API 路由（只负责 HTTP 层）
├── services/        # 业务逻辑层
├── repositories/    # 数据库访问层
├── middlewares/     # 错误处理、参数校验、鉴权等中间件
├── utils/           # 响应格式、参数校验等工具
├── tools/           # 数据维护、检查和测试脚本
├── docs/            # 项目文档与规划
├── server.js        # 服务入口
├── start.bat        # Windows 启动脚本
└── package.json     # Node 依赖和常用命令
```

## 测试

### 启动验证

```bash
node tools/database/start-mysql-dev.js
npm start
```

确认控制台输出：

```
Database initialized successfully
Database connected and initialized successfully
HUST WORLD Server running on port 8080
Visit: http://localhost:8080
```

### 健康检查

```bash
curl http://localhost:8080/api/health
```

预期返回：

```json
{
  "success": true,
  "data": {
    "service": "HUST WORLD",
    "version": "1.0.0",
    "status": "ok",
    "database": "ok",
    "timestamp": "..."
  },
  "message": "服务运行正常"
}
```

### 冒烟测试

```bash
npm run smoke:api
```

预期 19 个核心 API 全部通过。测试会自动注册 `smoke_user_` 前缀的临时账号并创建角色，完整覆盖注册、登录、角色创建、角色存档、跑步统计等流程。

测试完成后建议清理临时数据：

```bash
npm run cleanup:smoke
```

### 清理测试数据

```bash
npm run cleanup:smoke
```

脚本会删除 `users` 表中 `username` 以 `smoke_user_`、`verify_user_`、`test_user_` 或 `service_user_` 开头的测试用户，并级联清理其角色、任务、社团、跑步等关联数据。运行前会输出待清理用户数，清理后输出实际清理数量。

### 主线任务流程验证

```bash
node tools/tests/verify-save-flow.js
```

验证游客与登录用户的角色存档、本地/远程 save API、重置流程。完成后可在浏览器中打开 `tools/tests/test-main-quest.html` 进行大学四年主线任务的手动调试，或打开 `tools/tests/test-side-quests.html` 调试社团/跑步/探索三条支线链。

### 浏览器自动化验收

```bash
node tools/tests/browser-test-main-quest.js    # 自动打穿大学四年主线
node tools/tests/browser-test-game-quest.js    # 游戏主入口主线验收
node tools/tests/browser-test-side-quests.js # 支线任务验收
npm run test:side-quests                       # 等价于上一行
```

`browser-test-side-quests.js` 验证 `test-side-quests.html` 可加载、全局调试函数已挂载、社团/跑步/探索三条支线链可一键完成、刷新后支线进度保留、主线完成列表不被支线 ID 污染。

## 存档管理器（SaveManager）

游戏前端统一使用 `game/js/core/SaveManager.js` 管理存档，提供游客模式与登录模式两套存储策略，并在失败时自动降级。后端存档统一使用 `characters` 表基础字段 + `game_progress JSON` 字段 + `last_saved_at` 时间戳，不存在单独的 `character_saves` 表。

### 存档模式

- **游客模式**：未登录或没有 `hust_world_token` 时，存档使用 `localStorage` 键 `hust_world_save_v1`。
- **登录模式**：检测到 JWT 与当前角色 `currentCharacterId` 同时存在时，自动通过 `Authorization: Bearer <token>` 调用后端 `/api/character/:id/save` 进行读写；网络或接口失败时 `console.warn` 并降级到本地 `localStorage`。
- **token 但无角色**：仅有 token 未选择/创建角色时，不会进入登录模式，避免后端 404/401 错误，保持与游客模式一致的本地存档体验。

### 统一存档结构

```json
{
  "version": "1",
  "savedAt": "2026-07-08T12:00:00.000Z",
  "mode": "guest | loggedIn",
  "character": {
    "characterId": 1,
    "characterName": "玩家",
    "gender": "male",
    "college": "计算机科学与技术学院",
    "level": 1,
    "experience": 0,
    "money": 1000,
    "stamina": 50,
    "social": 50,
    "knowledge": 50,
    "mood": 50,
    "grade": 1,
    "semester": 1,
    "week": 1
  },
  "gameTime": { "day": 1, "hour": 8, "minute": 0 },
  "position": { "mapId": 1, "x": 0, "y": 0 },
  "progress": {
    "currentPhaseIndex": 0,
    "activeQuest": null,
    "completedQuests": [],
    "questStatus": {},
    "visitedLocations": [],
    "unlockedSubjects": [],
    "unlockedSkills": [],
    "proficiencies": {},
    "stats": {},
    "gameTime": {}
  },
  "modules": {},
  "settings": {}
}
```

### 主要功能

- `load()` / `save()`：统一加载与保存，自动根据登录状态选择远端或本地。
- `startAutoSave()` / `stopAutoSave()`：每 60 秒自动保存，页面关闭前触发 `beforeunload` 同步保存。
- `reset()`：重置当前存档；登录模式会同步调用后端 reset，本地统一移除 `hust_world_save_v1`。
- `migrateOldSave()` / `ensureMigration()`：自动读取旧的 `hust_world_character`、`hust_world_time`、`hust_world_module_clubs`、`hust_world_module_exploration` 并合并到 `hust_world_save_v1`，旧 key 内容以 `hust_world_save_v1_backup_old_keys` 备份。
- `buildSnapshot()` / `normalizeSnapshot()`：捕获 `window.timeSystem.getTime()`、`window._character` 位置、任务进度、模块数据与设置，并兼容后端 `/api/character/:id/save` 的扁平返回字段。
- `saveLocalSync()`：同步保存一份本地快照，用于 `beforeunload` 等不可依赖异步结果的场景。
- `captureProgress()` / `applyProgress()`：与 `QuestTriggerManager` 交换任务进度，保存时写入 `progress`，加载时恢复。

### 调试接口

浏览器控制台中暴露了以下全局变量：

- `window.saveManager` — SaveManager 实例
- `window.questTriggerManager` — 主线任务触发管理器
- `window.debugSaveGame()` — 立即保存
- `window.debugLoadSave()` — 立即加载
- `window.debugResetSave()` — 重置存档
- `window.debugMainQuest()` — 查看主线进度
- `window.debugCompleteQuest()` — 完成当前选中的任务（在 test-main-quest.html 中）
- `window.debugResetMainQuest()` — 重置主线任务进度
- `window.debugSaveQuestProgress()` — 保存主线进度
- `window.debugLoadQuestProgress()` — 加载主线进度

## 会话管理器（SessionManager）

游戏前端统一使用 `game/js/core/SessionManager.js` 管理登录态与当前角色身份，是 `SaveManager` 判断登录模式的数据来源。

### 主要功能

- `getToken()` / `setToken()` / `clearToken()`：JWT 的读写与清除。
- `getUser()` / `setUser()` / `clearUser()`：登录用户基本信息的读写。
- `getCharacters()` / `setCharacters()` / `addCharacter()`：用户名下角色列表管理。
- `getCurrentCharacterId()` / `setCurrentCharacterId()` / `clearCurrentCharacterId()`：当前游玩角色的 ID 管理。
- `isLoggedIn()` / `hasCharacters()` / `getCurrentCharacter()`：常用派生状态。
- `loadSession()` / `saveSession()`：从 localStorage 恢复与持久化会话。
- `logout()`：清除 token/user/角色列表/当前角色，但保留本地游客存档和远程存档。

### 调试接口

- `window.sessionManager` — SessionManager 实例
- `window.authSystem` — AuthSystem 实例，处理登录、注册、角色创建、角色选择

## 游客模式与登录用户流程

### 游客模式

1. 未登录时点击「开始新游戏」，使用本地 `localStorage` 保存角色与进度。
2. 已有本地存档时，开始界面显示「继续游戏」与游客存档信息。
3. 游客可选择「登录/注册」，登录成功后游客本地存档仍保留，可选择创建云端角色或继续本地游玩。

### 登录用户

1. 首次登录：点击「登录/注册」后，输入用户名密码注册或登录。注册成功后自动登录。
2. 无角色：显示「创建角色」，进入角色创建流程，创建成功后自动同步到后端并保存 `currentCharacterId`。
3. 有角色：显示「选择角色」与「继续游戏」，可选择已有角色继续，或创建新角色。
4. 继续游戏：登录用户优先加载远程存档，失败时降级到本地；游客始终加载本地存档。
5. 退出登录：只清除前端会话，不删除本地游客存档和远程存档。

## 主线任务系统

主线任务基于现有 `QuestTriggerConfig.js`、`QuestTriggerManager.js`、`QuestTriggerUI.js`、`DialogueConfig.js`、`TimeSystem.js`、`SaveManager.js`、`ExamChallengeAdapter.js` 进行增强，未新建平行主线系统。

### 大学四年主线任务链

主线按照大学四年（8 个学期）划分，每个学期都有独立的阶段任务和阶段总结：

- **大一上学期**：`freshman_arrival` → `military_training` → `rest_dorm_1` → `math_intro` → `self_study_library_1` → `math_final_exam` → `freshman_1_summary`
- **大一下学期**：`second_class_math` → `math2_final_exam` → `second_class_probability` → `probability_final_exam` → `freshman_2_summary`
- **大二上学期**：`major_course_1` → `major1_final_exam` → `sophomore_1_summary`
- **大二下学期**：`major_course_2` → `major2_final_exam` → `sophomore_2_summary`
- **大三上学期**：`major_course_3` → `major3_final_exam` → `junior_1_summary`
- **大三下学期**：`major_course_4` → `major4_final_exam` → `junior_2_summary`
- **大四上学期**：`internship` → `senior_1_summary`
- **大四下学期**：`thesis_preparation` → `thesis_writing` → `thesis_defense` → `graduation` → `senior_2_summary`

每个学期的阶段总结任务（`*_summary`）均为 `DIALOGUE` 类型，地点为宿舍区寝室，只能在学期期末第 18–20 周触发，完成后自动推进到下一学期，并自动保存到 `SaveManager`。

### 触发条件

任务触发采用三重条件校验：

- 前置任务已完成（`prerequisites`）
- 玩家已到达指定地点（`locationType` 按学院动态解析）
- 当前时间满足任务开放周次（`timeRequirements`）

满足条件后任务状态变为 `AVAILABLE`，按 `E` 键触发。任务日志（快捷键 `J`）显示当前学期、阶段进度、可触发任务、推荐任务、待前往地点和奖励预览。

### 任务进度保存

`QuestTriggerManager` 通过 `exportProgress()` / `loadProgress()` 与 `SaveManager` 交换进度，完成任务、激活任务、阶段推进后自动调用 `saveManager.save()`。刷新页面后从 `SaveManager` 恢复，重置按钮（或 `debugResetMainQuest()`）可回到初始状态。

### 调试页面

`tools/tests/test-main-quest.html` 提供浏览器端调试面板：

- 显示当前阶段、角色属性、已解锁科目、已完成任务
- 选择任务并瞬移到任务地点
- 完成当前选中的任务
- 推进时间（+1 周）
- 保存 / 加载 / 重置主线进度
- **自动打穿大一上学期**：按顺序完成大一上学期所有主线任务
- **自动打穿大学四年**：按顺序完成 freshman_1 → freshman_2 → sophomore_1 → sophomore_2 → junior_1 → junior_2 → senior_1 → senior_2 所有阶段总结任务，并自动推进学期
- 暴露全局函数：`window.debugMainQuest`、`window.debugCompleteQuest`、`window.debugResetMainQuest`、`window.debugSaveQuestProgress`、`window.debugLoadQuestProgress`、`window.debugRunFreshmanSemester`、`window.debugRunAllSemesters`

### 考试挑战

`EXAM` 类型任务（期末考试）会调用 `game/js/combat/ExamChallengeAdapter.js` 进入最小考试挑战：

- 根据角色 `knowledge`、对应科目熟练度、`mood`、`stamina` 与考试 `difficulty` 计算考试成功率。
- 成功则完成任务并获得奖励，失败可重试。
- 考试结果会更新角色属性并写入 `SaveManager progress`，刷新后仍保留结果状态。
- 考试描述统一为：通过答题挑战完成考试（知识属性与科目熟练度决定成功率）。

考试挑战优先复用现有战斗 UI（如可用），否则使用轻量提示框交互。可在 `test-main-quest.html` 中直接通过「自动打穿大学四年」按钮体验完整大学四年主线闭环。

## 支线任务系统（第四阶段 4.4）

在主线系统的基础上，复用同一套 `QuestTriggerConfig.js` / `QuestTriggerManager.js` / `QuestTriggerUI.js` / `DialogueConfig.js` / `SaveManager.js` / `TimeSystem.js`，新增三条支线链，形成「主线 + 支线 + 日常活动」的校园 RPG 体验。

### 新增任务类型

- `club`：社团支线
- `running`：跑步/体能支线
- `exploration`：校园探索支线
- `activity` / `side`：预留通用支线类型

### 三条支线链

| 链 | 任务数 | 代表任务 | 奖励倾向 | 玩法集成 |
| --- | --- | --- | --- | --- |
| 社团 | 5 | 百团大战、第一次活动、项目协作、骨干竞选、告别活动 | social / mood / experience | `joinClub` / `attendClubActivity` / `completeClubProject` |
| 跑步 | 5 | 操场初跑、连续打卡 3 次、体测准备、体测挑战、毕业前夜跑 | stamina / mood / experience | `recordRun` / `takeFitnessTest`（体测受体能与历史跑步次数影响） |
| 探索 | 5 | 第一次探索、图书馆角落、食堂隐藏菜单、探访实验室、毕业回忆路线 | money / knowledge / mood / item | `exploreLocation` / `visitLibrary` / `visitLab` / `eatAtCanteen` |

所有支线均为可选，不阻断主线，前置按链式解锁，从 freshman 到大四逐步开放。

### 任务日志 UI 分类

按 `J` 键打开任务日志后，面板分为：

- **🎓 主线任务**：显示可触发 / 待前往任务，以及当前阶段进度条。
- **🌟 支线活动**：按社团 / 跑步 / 探索分类，显示每个任务的状态、地点、前置、奖励。
- 不同支线类型在地图标记上使用不同颜色与图标，避免遮挡主线推荐。

### 存档结构扩展

`progress` 在原有主线字段基础上新增 `sideQuests` 对象：

```json
{
  "progress": {
    "sideQuests": {
      "status": { "club_join": "COMPLETED", ... },
      "progress": { "runs": 0, "runStreak": 0, "studyVisits": 0, ... },
      "joinedClubs": ["通用社团"],
      "inventory": ["校园美食券"],
      "achievements": ["first_club", "club_leader", ...]
    },
    "clubProgress": { "joinedClubs": [...], "activities": 0, "projects": 0 },
    "runningProgress": { "runs": 0, "runStreak": 0 },
    "explorationProgress": { "visits": 0, "studyVisits": 0, ... },
    "activityProgress": { "clubActivities": 0, "runs": 0 },
    "items": ["校园美食券"],
    "achievements": ["first_club", ...]
  }
}
```

兼容旧存档：旧存档没有 `sideQuests` 时，系统会初始化默认值，并保留原有的主线进度不变。

### 调试页面

`tools/tests/test-side-quests.html` 提供：

- 查看当前主线 / 支线进度与属性
- 一键完成社团 / 跑步 / 探索支线链
- 重置支线进度（不影响主线）
- 导出完整 `progress` JSON
- 暴露全局函数：`window.debugRunClubQuestline` / `window.debugRunRunningQuestline` / `window.debugRunExplorationQuestline` / `window.debugResetSideQuests` / `window.debugExportFullProgress`

## NPC 与对话系统（第六阶段）

NPC 是地图、任务、支线、商店、社团和剧情的真实交互入口。玩家可以在地图 POI 或室内场景中看到 NPC，靠近/点击 NPC 打开统一对话组件，通过多轮对话触发任务、交付任务、获得奖励、购买物品、加入社团或推进剧情。

### 核心模块

- `game/js/config/NpcConfig.js`：NPC 配置系统。包含 12 个 NPC（迎新志愿者、军训教官、高数老师、图书馆管理员、社团负责人、跑步教练、食堂阿姨、实验室导师、实习学长、毕设导师、答辩老师、校园商店老板），每个 NPC 关联角色、头像、默认地点、POI、场景、可开放阶段、对话、任务、商店/社团/关系等。
- `game/js/config/DialogueConfig.js`：对话配置系统。保留原有 `LEGACY_DIALOGUES` 兼容层，新增 `npc_*` 结构化多轮对话，支持 `nodes/options/conditions/effects/next/questStart/questComplete/shopOpen/clubAction/rewards`。
- `game/js/ui/NpcDialogueUI.js`：通用 NPC 对话组件。显示 NPC 头像、姓名、身份、多轮对话、选项按钮、条件分支、任务触发/交付、奖励展示、商店入口、社团入口；支持键盘操作（E/Enter 下一句、数字键选择选项、Esc 关闭）和移动端防溢出。
- `game/js/config/ItemConfig.js`：物品与商店配置。包含饭卡套餐、咖啡、笔记本、运动饮料、社团纪念章、实验室通行证 6 种商品，支持价格、类型、效果。

### NPC 触发/交付任务

NpcDialogueUI 内部通过 `QuestTriggerManager` 完成真实任务逻辑：

- 主线任务：`tryActivateQuest` / `completeQuest`
- 支线任务：`tryActivateSideQuest` / `completeSideQuest`
- 不直接修改 localStorage，成功后由 `SaveManager` 自动保存

例如迎新志愿者对话可完成 `freshman_arrival`，社团负责人对话可完成 `club_join`，跑步教练对话可完成 `run_first`。

### 商店 NPC 与购买

商店 NPC 对话中打开商店入口，显示商品列表、价格和效果。购买时校验金币：

- 金币足够：扣款、写入 `progress.items`、消耗品立即影响属性、toast 提示成功
- 金币不足：toast 提示“金币不足”

购买后自动保存，刷新后 `items` 和 `money` 仍然保留。

### NPC 与地图/室内场景联动

- `map/js/features/QuestMapIntegration.js`：地点面板新增 NPC 列表，每个 NPC 显示“可接任务 / 可交付 / 可交谈”状态；靠近有 NPC 的 POI 时提示“按 E 与 xxx 交谈”。
- `map/js/features/MapSceneManager.js`：进入室内场景（图书馆、宿舍、教室、社团活动中心、实验室、食堂）后显示对应 NPC 与可触发任务，点击 NPC 即可打开 NpcDialogueUI。
- `map/index.html` 加载 `NpcMapUI.js`，负责在地图页面初始化 NpcDialogueUI。

### NPC 关系与记忆

`SaveManager.progress` 新增字段：

- `npcRelations`：记录与每个 NPC 的关系值，关键对话可增加关系，影响少量对话分支。
- `npcDialogueHistory`：记录每个 NPC 的 `lastTalkedAt` 和对话次数。

旧存档会自动兼容，没有这些字段时视为空对象。

### 调试页面

`tools/tests/test-npc-dialogue.html` 提供：

- 查看所有 NPC，按地点筛选
- 打开指定 NPC 对话
- 模拟接取/交付任务
- 测试商店购买
- 查看 `npcRelations` / `items` / `money`
- 重置 NPC 相关进度
- 导出 progress JSON

暴露全局调试函数：

- `window.debugListNpcs()`
- `window.debugOpenNpc(npcId)`
- `window.debugRunNpcDialogue(npcId, dialogueId)`
- `window.debugBuyItem(npcId, itemId)`
- `window.debugResetNpcProgress()`
- `window.debugExportNpcProgress()`

### 新增测试命令

```bash
npm run test:npc-dialogue   # 真实浏览器验收：NPC 对话调试页面
npm run test:npc-map        # 真实浏览器验收：/map NPC 交互
npm run test:shop           # 真实浏览器验收：商店购买
npm run test:npc            # 依次运行 NPC 对话 + 地图 NPC + 商店验收
```

## 阶段规划

第一阶段：工程体检与基础修复（已完成）
第二阶段：架构整理与模块边界（已完成）
第三阶段：账号、角色与存档系统（已完成）
第四阶段：核心玩法闭环（已完成）
第五阶段：地图系统升级
第六阶段：NPC 与对话系统
第七阶段：任务系统升级（已完成）
第八阶段：成长、背包和技能系统（已完成）
第九阶段：UI/UX 产品化（已完成）
第十阶段：测试、质量和可部署（当前阶段）
第十一阶段：简历材料沉淀

详见 `docs/plan/roadmap.md`。

## 任务系统升级（第七阶段）

任务系统升级在已有的主线与支线任务能力基础上，对配置、状态机、目标、奖励、日志、NPC/对话、地图/POI/室内场景和调试测试进行统一增强，未新建平行系统。升级核心复用 `QuestTriggerConfig.js` / `QuestTriggerManager.js` / `QuestTriggerUI.js` / `DialogueConfig.js` / `SaveManager.js` / `NpcConfig.js` / `NpcDialogueUI.js` / `NpcMapUI.js` / `MapEventConfig.js` / `QuestMapIntegration.js` / `QuestMapUI.js`。

### 统一任务配置结构

所有任务采用统一字段定义：

- `id`：唯一任务标识
- `title` / `description`：任务名称与描述
- `type`：任务类型，如 `main` / `side` / `club` / `running` / `exploration` / `daily` / `activity`
- `category`：分类标签，用于 UI 分组与过滤
- `phase`：所属阶段，如 `freshman_1` / `sophomore_2` 等
- `locationId` / `sceneId` / `npcId` / `poiId`：任务关联地点、室内场景、NPC 与 POI
- `prerequisites`：前置条件，支持前置任务、属性、阶段、周次等
- `objectives`：任务目标列表，每项包含类型、参数、目标数量/条件、进度字段
- `rewards`：奖励列表，统一由 `QuestTriggerManager.grantRewards` 发放
- `unlocks`：完成后解锁的任务、场景、NPC 对话等
- `recommendedStats`：推荐属性提示
- `timeCost` / `staminaCost`：时间与体力消耗
- `repeatable`：是否可重复完成
- `hidden`：是否在日志中默认隐藏
- `priority`：任务优先级，影响排序与推荐
- `tags`：额外标签，用于过滤和事件触发

主线任务与支线任务均使用同一结构；旧任务配置中缺少的新字段会在运行时自动补全默认值，旧存档中的 `currentPhaseIndex` / `activeQuest` / `completedQuests` / `questStatus` 等字段继续生效。

### 任务状态机

任务统一使用以下状态：

- `LOCKED`：未满足前置条件，对玩家不可见或仅显示锁定提示
- `AVAILABLE`：前置条件已满足，可接取
- `ACTIVE`：已接取，目标正在进行中
- `READY_TO_COMPLETE`：目标全部达成，可交付/完成
- `COMPLETED`：已完成，已发放奖励
- `FAILED`：失败，可能因时间耗尽、条件不满足或玩家选择失败
- `EXPIRED`：任务超出有效时间或阶段窗口

状态流转由 `QuestTriggerManager` 统一维护：接取任务时从 `AVAILABLE` 变为 `ACTIVE`，目标达成时变为 `READY_TO_COMPLETE`，交付时变为 `COMPLETED`；失败或超时时按规则进入 `FAILED` 或 `EXPIRED`。旧存档中的历史状态字段会在加载时自动迁移到新的状态机。

### 任务目标类型

统一支持的目标类型包括：

- `talk_to_npc`：与指定 NPC 对话
- `visit_location`：到达指定地点
- `enter_scene`：进入指定室内场景
- `complete_dialogue`：完成指定对话分支
- `join_club`：加入社团
- `attend_activity`：参加活动
- `run_distance`：完成指定跑步距离
- `pass_exam`：通过考试
- `collect_item`：收集指定物品
- `buy_item`：在商店购买指定物品
- `use_item`：使用指定物品
- `increase_stat`：提升指定属性到目标值
- `wait_time`：等待指定游戏时间
- `custom_event`：自定义事件，由 `QuestTriggerManager` 监听并推进

每种目标类型对应 `QuestTriggerManager` 中的统一处理器，目标进度自动写入 `SaveManager.progress` 并触发状态流转。

### 统一奖励系统

任务奖励统一通过 `QuestTriggerManager.grantRewards` 发放，支持：

- `money`：金币
- `experience`：经验值
- `stamina` / `social` / `knowledge` / `mood`：角色属性
- `item`：物品奖励，写入 `progress.items`
- `achievement`：成就解锁
- `unlockQuest`：解锁新任务
- `unlockScene`：解锁新场景
- `unlockNpcDialogue`：解锁 NPC 新对话分支

对于 `repeatable` 任务，重复完成时会进行防刷校验：在 `COMPLETED` 后重置为 `AVAILABLE` 时记录 `lastCompletedAt` 与 `repeatCount`，对奖励进行递减或次数限制，避免无限制刷取资源。

### 任务日志 UI

按 `J` 键打开任务日志，面板包含以下分类 Tab：

- 当前任务：显示 `ACTIVE` 与 `READY_TO_COMPLETE` 任务
- 主线：按学年学期展示主线任务
- 支线：所有非主线任务
- 社团：社团相关任务
- 跑步：跑步/体能相关任务
- 探索：校园探索任务
- 已完成：显示 `COMPLETED` 任务历史

每个任务卡片展示：状态标签、类型、所属阶段、目标进度、奖励预览、地点/POI/NPC 信息、前置任务、追踪按钮、放弃按钮（对非主线且允许放弃的任务）、地图定位按钮。任务追踪会在地图标记中高亮对应 POI，并支持平滑定位。

### 任务与 NPC/对话联动

同一 NPC 根据玩家当前任务状态会呈现不同对话分支。`DialogueConfig.js` 中通过 `conditions` 读取 `QuestTriggerManager` 的任务状态，支持以下常见分支：

- 未接任务：NPC 给出接取引导
- 进行中：NPC 提供任务提示或目标补充
- 可交付：NPC 提供完成/交付选项，调用 `completeQuest`
- 已完成：NPC 进入后续剧情或日常对话

已覆盖的关键 NPC 包括：迎新志愿者、军训教官、高数老师、图书馆管理员、社团负责人、跑步教练、实验室导师、商店 NPC。`NpcDialogueUI` 在对话中直接调用 `QuestTriggerManager` 的接取/交付/推进方法，成功后自动同步到 `SaveManager`。

### 任务与地图/POI/室内场景联动

- `MapEventConfig.js` 定义 POI 与室内场景的任务关联。
- `QuestMapIntegration.js` 在地点面板中区分「可接任务 / 进行中任务 / 可交付任务」三类状态，并用不同图标/颜色标记在地图上。
- 点击 POI 时优先展示任务交互面板：可接任务、进行中目标、可交付任务，其次才展示通用地点信息。
- 地图标记区分：主线金色 `M`、社团粉色 `C`、跑步青色 `R`、探索紫色 `E`、日常/通用任务灰色 `Q`；当前追踪任务带脉冲高亮。
- 室内场景（图书馆、宿舍、教室、社团活动中心、实验室、食堂）中仍支持按 `J` 打开任务日志，支持任务追踪和 NPC 对话触发任务。
- `QuestMapUI.js` 在 `/map` 中接入统一的任务日志 UI，与主游戏页面一致。

### 任务系统调试页

`tools/tests/test-quest-system.html` 提供完整的任务系统调试面板：

- 查看全部任务列表
- 按分类（主线/支线/社团/跑步/探索/已完成）过滤
- 接取、推进、完成、重置单个任务
- 追踪/取消追踪任务
- 导出当前 `progress` 中的任务状态 JSON
- 模拟指定 NPC 对话，观察任务状态变化
- 模拟指定 POI 触发，观察任务接取/交付
- 暴露全局调试函数：`window.debugListQuests()`、`window.debugFilterQuests(category)`、`window.debugStartQuest(questId)`、`window.debugAdvanceQuest(questId)`、`window.debugCompleteQuest(questId)`、`window.debugResetQuest(questId)`、`window.debugTrackQuest(questId)`、`window.debugExportQuestProgress()`、`window.debugSimulateNpcDialogue(npcId)`、`window.debugSimulatePoiTrigger(poiId)`

### 新增测试命令

```bash
npm run test:quest
npm run test:npc
npm run test:map
```

以上测试命令均使用 Playwright 在真实浏览器中运行，默认访问 `http://localhost:8080`。可通过环境变量覆盖默认端口和基础地址：

- `PORT`：服务端口，默认 `8080`
- `BROWSER_TEST_BASE`：浏览器测试基础 URL，默认 `http://localhost:8080`
- `SMOKE_API_BASE`：冒烟测试 API 基础地址，默认 `http://localhost:8080`

## 地图系统升级（第五阶段）

地图从“展示地图”升级为“真正承载玩法的核心舞台”。玩家可以在校园地图中移动、点击/靠近 POI、触发主线/支线/NPC/地点事件、进入室内场景、追踪任务目标，并通过地图完成真实游戏流程。

### 核心模块

- `map/js/features/QuestPoiBinder.js`：统一任务到 POI 绑定系统。从主线/支线任务配置、地图 POI 数据、特殊地点配置中解析出任务 → POI 映射关系，输出绑定状态报告，未配置地点不崩溃，仅标记为“待配置”。
- `map/js/features/QuestMapIntegration.js`：任务与地图联动。处理 POI 点击地点面板、玩家靠近 POI 的 proximity 检测与 `E` 键交互、地图任务标记渲染、任务追踪与视角定位。
- `map/js/features/MapSceneManager.js`：多地图/室内场景系统。支持 `campus` 主校园以及 `library_inside` / `dorm_inside` / `classroom_inside` / `club_center_inside` / `lab_inside` / `canteen_inside` 等室内场景，保存并恢复 `currentSceneId`。
- `map/js/features/QuestMapUI.js` / `QuestMapUIBootstrap.js`：在地图页面接入任务 UI（`QuestTriggerUI`），让 `/map` 页面也能按 `J` 键打开任务日志。
- `map/js/config/MapEventConfig.js`：POI 事件点配置化。定义 POI 类型、室内场景、模块入口、别名等，地图面板和 QuestPoiBinder 共享此配置。

### 地点交互面板

点击地图 POI 会弹出地点面板，显示：

- 地点名称与类型
- 当前可触发主线任务
- 当前可触发支线任务（社团/跑步/探索）
- 相关模块入口（社团、跑步、图书馆、食堂、实验室）
- 操作按钮：追踪、前往目标、触发任务、进入室内、关闭

所有触发任务都走 `QuestTriggerManager`；成功/失败均有 toast 或明确提示。

### 靠近 POI 触发任务

玩家进入 POI 交互半径（默认 120 像素）时，底部显示提示：

- 主线任务：“按 E 开始主线：xxx”
- 社团任务：“按 E 参加社团活动”
- 跑步任务：“按 E 开始跑步/体测”
- 探索任务：“按 E 探索此地点”

按 `E` 后支线走 `tryActivateSideQuest` / `completeSideQuest`，主线走现有主线逻辑；成功后更新任务日志、地图标记、角色属性并自动保存。

### 地图任务标记与追踪

- 主线标记：金色 `M`
- 社团标记：粉色 `C`
- 跑步标记：青色 `R`
- 探索标记：紫色 `E`
- 当前追踪任务：高亮并带有脉冲阴影
- 同一 POI 多个任务：显示数量角标
- 鼠标悬停显示简短任务提示

任务日志中每个未完成任务都有“定位”按钮，点击后地图平滑移动到对应 POI 并高亮。追踪状态保存到 `progress`：`trackedQuestId` / `trackedQuestKind` / `trackedQuestGroup` / `trackedPoiId`，刷新后恢复。

### 室内场景

主地图点击对应 POI 可进入室内场景。室内场景显示场景名称、可触发任务、NPC 和“返回校园”按钮。进入室内后仍可打开任务日志，任务触发仍走 `QuestTriggerManager`。

### 缩放、平移与定位

地图已支持：

- 鼠标滚轮缩放
- 右下角 `+` / `-` 按钮缩放
- 鼠标拖拽平移
- 点击“定位任务”平滑移动到目标 POI
- 点击 POI 显示“前往目标”

标记重绘使用 `renderer.questMarks` 和脏标记机制，避免反复创建大量 DOM。

### 地图调试页面

`tools/tests/test-map-poi.html` 提供：

- 显示所有 POI
- 显示所有主线/支线任务 POI 绑定状态
- 一键测试 POI 解析
- 一键模拟点击/靠近 POI
- 一键触发 `club_join` / `run_first` / `explore_first`
- 一键进入图书馆/宿舍/教室室内场景
- 显示 `currentSceneId`
- 导出 POI 绑定报告 JSON

暴露全局函数：

- `window.debugMapPoiBindings()`
- `window.debugClickPoi(poiId)`
- `window.debugApproachPoi(poiId)`
- `window.debugTrackQuest(questId, questKind)`
- `window.debugEnterScene(sceneId)`
- `window.debugReturnCampus()`
- `window.debugExportPoiReport()`

### 新增测试命令

```bash
npm run test:map-poi     # 真实浏览器验收：地图 POI 调试页面
npm run test:map-scenes  # 真实浏览器验收：地图室内场景
npm run test:map         # 依次运行地图 POI + 场景浏览器验收
```

## 角色成长系统（第八阶段 8.1）

角色成长系统基于现有 `QuestTriggerManager` / `SaveManager` / `GrowthConfig` 进行增强，未新建平行成长系统，所有属性变更统一走 `QuestTriggerManager` 的入口。

### 统一属性模型

角色成长使用扁平属性结构：

- `level`：角色等级
- `experience`：当前经验值
- `money`：金币
- `stamina`：体力，上限为 `maxStamina`
- `knowledge`：知识
- `social`：社交
- `mood`：心情

属性边界约定：

- `maxStamina` 默认 `100`，每升 1 级 `+10`
- `stamina` 范围 `0 ~ maxStamina`
- `knowledge` / `social` / `mood` 范围 `0 ~ 100`
- `money` 不允许为负，小于 0 时自动 clamp 到 `0`

### 升级公式

升到下一级所需经验使用指数公式：

```
nextLevelExp = floor(100 * 1.5^(level-2))
```

- 1 级 → 2 级需要 `100` 经验
- 2 级 → 3 级需要 `150` 经验
- 3 级 → 4 级需要 `225` 经验

支持连续升级：获得大量经验时一次性连续提升多级，并累计每级奖励。

### 升级奖励

每次升级自动获得：

- 体力上限 `+10`
- 当前体力回满到新的 `maxStamina`
- `knowledge` / `social` / `mood` 各 `+1`

### 统一属性入口

`QuestTriggerManager` 提供统一属性操作接口，所有任务奖励、道具效果、NPC 影响均通过这些入口修改角色属性：

- `applyStatChanges(changes, source)`：统一应用属性变化，支持 `experience` / `money` / `stamina` / `knowledge` / `social` / `mood`，调用后自动 clamp、自动结算升级
- `addExperience(amount, source)`：单独增加经验并触发 `checkLevelUp()`
- `checkLevelUp()`：循环检查经验是否满足升级条件，支持连续升级
- `clampCharacterStats()`：按属性边界统一 clamp 所有角色属性
- `getCharacterGrowthSummary()`：返回当前角色成长摘要，包括等级、经验、升级阈值、金币、体力、知识、社交、心情

### 任务奖励接入

任务配置的 `rewards` 中所有 `experience` / `money` / `stamina` / `social` / `knowledge` / `mood` 奖励，统一由 `grantRewards` 调用 `applyStatChanges` 发放，无需任务系统额外处理 clamp 与升级。

### 旧存档兼容

加载旧存档时，如果角色属性中存在 `physical` 字段，会将其映射为 `stamina` 并删除旧字段，确保旧游客 / 远程存档平滑过渡到新属性模型。

### 调试页面

`tools/tests/test-growth-system.html` 提供完整的角色成长系统调试面板：

- 查看当前角色成长摘要
- 批量增加任意属性
- 一键增加大量经验触发连续升级
- 查看升级阈值与历史升级记录
- 重置角色属性到初始状态
- 暴露全局调试函数：`window.debugGetGrowthSummary()`、`window.debugApplyStatChanges(changes)`、`window.debugAddExperience(amount)`、`window.debugCheckLevelUp()`、`window.debugResetGrowthStats()`

## 背包与物品使用系统（第八阶段 8.2）

背包与物品使用系统基于现有 `QuestTriggerManager` / `SaveManager` / `ItemConfig` 进行增强，未新建平行背包系统，所有物品获取、消耗、效果统一走 `InventoryManager` 入口。

### 统一背包数据结构

`SaveManager.progress` 使用 `inventory` 字段作为唯一背包数据，替代原先零散的 `items` / `inventoryCounts` / `sideQuests.inventory`：

```json
{
  "progress": {
    "inventory": {
      "coffee": 2,
      "sports_drink": 1,
      "meal_card": 3,
      "notebook": 1,
      "club_badge": 1,
      "lab_pass": 1,
      "study_notes": 0,
      "lab_record": 0,
      "thesis_draft": 0
    }
  }
}
```

`inventory` 为以 `itemId` 为键、数量为值的键值对。所有新增/移除/使用操作都通过 `InventoryManager` 修改此对象，并触发 `SaveManager.save()` 持久化。

### 物品分类

物品统一划分为以下类型：

- `consumable`：消耗品，使用后数量 `-1` 并立即生效
- `equipment`：装备，可重复穿戴，不消耗数量
- `collectible`：收藏品，仅用于收集与任务提交
- `ticket`：凭证/门票，用于进入特定地点或参与活动
- `quest`：任务道具，由任务发放与回收
- `material`：材料，用于合成、实验或论文
- `gift`：礼物，赠送给 NPC 提升关系

### 新增/完善物品

基于现有物品配置补充 9 种物品：

| 物品 ID | 名称 | 类型 | 效果 | 获取来源 |
| --- | --- | --- | --- | --- |
| `coffee` | 咖啡 | consumable | stamina +10, knowledge +5 | 校园商店购买、任务奖励 |
| `sports_drink` | 运动饮料 | consumable | stamina +15, mood +2 | 校园商店购买、跑步奖励 |
| `meal_card` | 饭卡套餐 | consumable | stamina +25, mood +5 | 食堂商店购买、探索奖励 |
| `notebook` | 笔记本 | equipment | knowledge +5（穿戴时） | 校园商店购买、任务奖励 |
| `club_badge` | 社团纪念章 | collectible | 无直接效果 | 社团任务奖励 |
| `lab_pass` | 实验室通行证 | ticket | 解锁实验室场景 | 实验室导师任务奖励 |
| `study_notes` | 学霸笔记 | material | knowledge +10, experience +5 | 图书馆任务奖励 |
| `lab_record` | 实验记录 | material | knowledge +15, experience +10 | 实验室任务奖励 |
| `thesis_draft` | 论文草稿 | material | experience +20 | 毕设任务奖励 |

物品定义集中在 `game/js/config/ItemConfig.js`，包含 `id`、`name`、`type`、`description`、`price`、`effects`、`icon`、是否可堆叠等字段。

### 物品效果

物品效果使用统一字段命名，支持 `consumable` 的即时效果和 `equipment` 的穿戴加成：

- `stamina`：体力
- `mood`：心情
- `knowledge`：知识
- `social`：社交
- `experience`：经验
- `money`：金币（仅部分任务/奖励道具）

`equipment` 类型在穿戴时把属性加成写入 `progress.equipmentBonuses`，卸下时扣除；`consumable` 在使用时直接调用 `QuestTriggerManager.applyStatChanges`。

### 核心接口

`InventoryManager` 提供以下核心接口：

- `addItem(itemId, amount)`：向背包增加物品，自动创建 itemId 条目、堆叠数量、保存并触发事件。若 `itemId` 不存在于 `ItemConfig` 中，按 `collectible` 类型兜底处理。
- `removeItem(itemId, amount)`：从背包移除指定数量，数量不足返回失败并提示，成功时触发保存。
- `useItem(itemId, amount)`：使用消耗品，校验数量与使用条件，调用 `applyItemEffects` 后扣除数量并保存。
- `applyItemEffects(itemId)`：根据 `ItemConfig` 解析效果，对 `consumable` 调用 `QuestTriggerManager.applyStatChanges` 即时生效；对 `equipment` 处理穿戴/卸下；对 `ticket`/`quest`/`collectible`/`material`/`gift` 触发对应事件或提示。

所有接口都支持 `source` 参数，用于日志和调试。

### 旧存档兼容

加载旧存档时自动迁移：

- 旧 `progress.items` 为数组（如 `["校园美食券"]`）时，按名称映射到 `ItemConfig` 对应 `itemId`，数量置为 1，未匹配项保留为 `collectible` 类型条目。
- 旧 `progress.items` 为对象（如 `{ "coffee": 2 }`）时，直接转换为 `inventory` 键值对。
- 旧 `progress.inventoryCounts` 存在时，合并到 `progress.inventory` 中。
- 旧 `progress.sideQuests.inventory` 存在时，合并到 `progress.inventory` 中。
- 迁移完成后写入 `SaveManager`，旧字段保留不删除，但后续操作只读写 `progress.inventory`。

### 商店购买和任务奖励接入统一背包接口

- 商店购买：NpcDialogueUI 中购买商品后统一调用 `InventoryManager.addItem(itemId, amount, { source: 'shop' })`，不再直接操作 `progress.items`。
- 任务奖励：`QuestTriggerManager.grantRewards` 中 `item` 类型奖励统一调用 `InventoryManager.addItem(itemId, amount, { source: 'quest' })`，与属性奖励一起发放。
- 旧存档已有 `progress.items` 的物品在 `InventoryManager` 初始化时自动迁移，保证购买/使用流程一致。

### 调试页面

`tools/tests/test-inventory-system.html` 提供完整的背包与物品系统调试面板：

- 查看当前 `progress.inventory` 列表与物品详情
- 一键添加/移除/使用任意物品
- 模拟商店购买、任务奖励发放
- 测试旧存档迁移（手动注入旧 `items` / `inventoryCounts` 后观察迁移结果）
- 重置背包数据
- 暴露全局调试函数：`window.debugGetInventory()`、`window.debugAddItem(itemId, amount)`、`window.debugRemoveItem(itemId, amount)`、`window.debugUseItem(itemId)`、`window.debugApplyItemEffects(itemId)`、`window.debugMigrateOldInventory()`、`window.debugResetInventory()`

## 技能与熟练度系统（第八阶段 8.3）

技能与熟练度系统基于现有 `QuestTriggerManager` / `SaveManager` / `SkillConfig` 进行增强，未新建独立 `SkillManager`，所有技能获取、升级、效果查询与玩法加成统一通过 `QuestTriggerManager` 的接口完成。

### 统一技能数据模型

`SaveManager.progress` 使用 `skills` 字段作为唯一技能数据源：

```json
{
  "progress": {
    "skills": {
      "unlocked": ["math_focus", "endurance_training"],
      "entries": {
        "math_focus": { "level": 2, "exp": 150, "unlockedAt": 1234567890000 }
      },
      "updatedAt": 1234567890000
    }
  }
}
```

`unlocked` 记录已解锁技能 ID 列表，`entries` 记录每个技能的当前等级与经验，`updatedAt` 记录最后变更时间。

### 技能定义

技能定义集中在 `game/js/config/SkillConfig.js`，包含 `id`、`name`、`description`、`category`、`maxLevel`、`unlockConditions`、`levelRequirements`、`effects`、`relatedStats`、`relatedItems`、`tags` 等字段。初始技能覆盖学习、体育、社交、探索、科研五个类别，共 8 个技能。

### 核心接口

`QuestTriggerManager` 提供以下技能接口：

- `getSkills()` / `getSkill(skillId)`：查询技能列表与详情。
- `isSkillUnlocked(skillId)` / `unlockSkill(skillId, source)`：检查与解锁技能。
- `addSkillExp(skillId, amount, source)` / `levelUpSkill(skillId, source)`：增加经验与手动升级。
- `getSkillEffect(effectKey)` / `getSkillSummary()`：获取技能效果加成与汇总。

经验不能为负，等级最高不超过 `maxLevel`。经验达到阈值时自动升级，触发 `skill:levelUp` 事件。

### 旧存档兼容

加载旧存档时自动迁移：

- 旧 `progress.unlockedSkills` 数组会迁移到 `progress.skills.unlocked`，并补齐初始经验为 0 的 `entries`。
- 旧 `progress.proficiencies` 中的科目熟练度会按映射规则迁移到对应技能经验（如 `高等数学` → `math_focus`），保留原有熟练度数值。
- 迁移后保留旧字段原值，但后续操作以新的 `progress.skills` 为准。

### 技能与任务奖励联动

任务完成或奖励发放时，根据任务 `type` / `category` / `tags` 给对应已解锁技能增加经验。例如 `exam` 类任务给 `math_focus` 增加经验，`running` 类任务给 `endurance_training` 增加经验。奖励配置中的 `unlockSkills` 也会调用 `unlockSkill()` 进行解锁。

### 技能与玩法轻量联动

技能效果对现有玩法做最小数值修正：

- **考试**：`ExamChallengeAdapter` 读取 `examBonus` 加成并叠加到成功率。
- **跑步**：`recordRun()` 根据 `staminaCostReduction` 降低体力消耗；`takeFitnessTest()` 根据 `runningBonus` 提高体测成功率。
- **探索**：`exploreLocation()` 根据 `explorationBonus` 额外增加少量 `knowledge` 与 `mood`。
- **社团**：`attendClubActivity()` / `completeClubProject()` 根据 `socialBonus` / `moodGainBonus` 额外增加 `social` / `mood`。

### 调试页面

`tools/tests/test-skills-system.html` 提供完整的技能与熟练度系统调试面板：

- 查看当前技能列表、状态、等级、经验与下一级所需经验
- 一键解锁技能、增加经验、手动升级
- 模拟学习/考试/跑步/社团/探索类任务，观察技能经验变化
- 显示技能效果加成汇总
- 保存并刷新，验证持久化
- 测试旧 `unlockedSkills` / `proficiencies` 迁移
- 暴露全局调试函数：`window.debugGetSkills()`、`window.debugUnlockSkill(skillId)`、`window.debugAddSkillExp(skillId, amount)`、`window.debugLevelUpSkill(skillId)`、`window.debugGetSkillSummary()`、`window.debugMigrateOldSkills()`、`window.debugResetSkills()`

## 联动与平衡（第八阶段 8.4）

第八阶段 8.4 在 8.1~8.3 的基础上，把角色成长、背包、技能三个系统与任务奖励、NPC 对话、地图场景真正联动起来，并做一轮数值平衡。

### 统一任务奖励入口

所有任务奖励（主线/支线/NPC 对话/地图事件）统一通过 `QuestTriggerManager._grantRewards()` 发放：

- 经验、金币、体力、心情、知识、社交等数值属性统一走 `applyStatChanges()`，自动 clamp 与结算升级。
- 物品奖励统一进入 `progress.inventory` 统一背包，不再分散在 `progress.items` 或 `sideQuests.inventory`。
- 成就、解锁科目、解锁技能、熟练度增量统一在 `_grantRewards()` 中处理，确保奖励一致性。
- 任务奖励预览在 `QuestTriggerUI` 中显示物品名称而非 ID。

### NPC 对话成长反馈

- `NpcDialogueUI` 在显示属性变化时展示最终生效值（已考虑 clamp 和上限）。
- 当对话 effects 触发升级时，额外弹出 `Level Up!` Toast。
- 支持 `effectsPreview` 预览，玩家在选择对话选项前可看到预期属性变化。
- 所有对话属性变化优先通过 `QuestTriggerManager.applyStatChanges()` 写入，统一触发升级与事件。

### 地图场景日常成长

- 图书馆：靠近停留 3 秒触发 `visitLibrary()`，知识 +5、心情 +2、对应科目熟练度 +10。
- 操场：靠近触发跑步事件，体力 +2 或消耗，跑步计数 +1。
- 食堂：靠近恢复体力 +10、心情 +5，金币 -5。
- 实验室：靠近增加知识 +5，并推进实验记录相关任务进度。
- 同一点有 60 秒冷却，数值较小，作为任务系统的日常成长补充。

### 数值平衡

- 升级后 `maxStamina` 增加 10（原为 2），体力回满。
- 每学期推进时 `maxStamina` 上限额外 +10，象征学期成长。
- 考试失败增加惩罚：体力 -10、心情 -5。
- 支线任务默认奖励保持 10 exp / 5 mood，避免数值膨胀。
- 所有数值变化仍通过 `applyStatChanges()` 统一入口，自动处理边界与升级。

### 新增测试

```bash
npm run test:linkage
node tools/tests/browser-test-linkage.js
```

## 测试与文档完善（第八阶段 8.5）

第八阶段 8.5 对 8.1~8.4 角色成长、背包、技能、联动与平衡的成果进行统一测试审查、脚本风格统一、缺失场景补齐和文档更新，确保所有功能稳定、测试可复现、文档完整。

### 测试矩阵（功能 -> 测试脚本）

| 功能域 | 测试脚本 | 覆盖点 |
|--------|----------|--------|
| 角色成长 | `test:growth` | 等级/经验/属性边界/连续升级/旧 `physical` 字段迁移 |
| 背包与物品 | `test:inventory` | 添加/移除/使用/堆叠/不可叠加物品/商店购买/任务奖励/旧 `items` / `inventoryCounts` 迁移 |
| 技能与熟练度 | `test:skills` | 解锁/升级/经验溢出/考试/跑步/社交/探索加成/任务联动/旧 `unlockedSkills` / `proficiencies` 迁移 |
| 任务系统 | `test:quest` | 接取/推进/完成/追踪/NPC 对话/POI 触发/旧存档迁移 |
| 联动与平衡 | `test:linkage` | 任务奖励统一接入成长/背包/技能、NPC 成长反馈、地图场景日常成长、升级后 `maxStamina` 提升 |
| NPC 与商店 | `test:npc` | 对话、地图 NPC、商店购买 |
| 地图系统 | `test:map` | POI 绑定、场景切换、地图 UI 产品化 |
| 游戏主界面 | `test:dashboard` | HUD 渲染、成长/背包/技能面板、保存按钮、使用物品 |
| 地图 UI 产品化 | `test:map-ui` | HUD、POI 面板、NPC 提示、任务追踪、移动端适配 |
| API 冒烟 | `smoke:api` | 注册/登录/角色/存档/跑步等核心接口 |

### 第八阶段命令列表

```bash
npm run test:map
npm run test:map-ui
npm run test:npc
npm run test:quest
npm run test:game-dashboard
npm run test:dashboard
npm run smoke:api
npm run cleanup:smoke
```

### 第八阶段调试页地址

- 角色成长：http://localhost:8080/tools/tests/test-growth-system.html
- 背包与物品：http://localhost:8080/tools/tests/test-inventory-system.html
- 技能与熟练度：http://localhost:8080/tools/tests/test-skills-system.html
- 地图 UI 产品化：http://localhost:8080/tools/tests/test-map-ui.html
- 游戏主界面：http://localhost:8080/tools/tests/test-game-dashboard.html
- 任务系统：http://localhost:8080/tools/tests/test-quest-system.html
- NPC 对话：http://localhost:8080/tools/tests/test-npc-dialogue.html
- 地图 POI：http://localhost:8080/tools/tests/test-map-poi.html
- 支线任务：http://localhost:8080/tools/tests/test-side-quests.html
- 主线任务：http://localhost:8080/tools/tests/test-main-quest.html

> 如果 `.env` 中修改了 `PORT`，请将示例 URL 中的 `8080` 替换为实际端口。

### 已知限制与注意事项

- 技能与熟练度数据目前只保存在前端 `progress` 中；后端 `skills` 表只提供静态技能配置，不保存角色等级/经验。
- `equipment` 类型物品（如 notebook）配置为 `usable: false`，尚未实现完整装备槽与穿戴属性加成逻辑。
- 背包 `progress.inventory` 已在运行时作为唯一权威数据，旧 `progress.items` / `inventoryCounts` / `sideQuests.inventory` 会在加载时自动迁移。
- 地图场景日常成长在 `QuestMapIntegration` 中通过 `applyStatChanges` 统一入口写入，数值较小，避免挤压任务奖励体验。

## 阶段规划

第一阶段：工程体检与基础修复（已完成）
第二阶段：架构整理与模块边界（已完成）
第三阶段：账号、角色与存档系统（已完成）
第四阶段：核心玩法闭环（已完成）
第五阶段：地图系统升级（已完成）
第六阶段：NPC 与对话系统（已完成）
第七阶段：任务系统升级（已完成）
第八阶段：成长、背包和技能系统（已完成）
第九阶段：UI/UX 产品化（已完成）
第十阶段：测试、质量和可部署（当前阶段）
第十一阶段：简历材料沉淀

详见 `docs/plan/roadmap.md`。

## 文档

- `docs/plan/roadmap.md`：项目路线图与阶段目标
- `docs/plan/todo.md`：各阶段任务清单
- `docs/plan/phase-9-ui-ux-design.md`：第九阶段（UI/UX 产品化）详细设计与验收文档
- `docs/plan/phase-10-quality-deploy.md`：第十阶段（测试、质量和可部署）设计基线文档
- `docs/quality/test-matrix.md`：自动化测试矩阵与三档回归命令说明
- `docs/quality/backend-service-tests.md`：后端服务级测试覆盖范围、数据库依赖与维护说明
- `docs/quality/frontend-e2e-tests.md`：前端关键流程 E2E 覆盖范围、测试数据与维护原则
- `docs/quality/runtime-health.md`：运行时日志、配置健康检查和常见错误诊断说明
- `docs/plan/phase-8-design.md`：第八阶段（成长、背包、技能）详细设计文档
- `docs/plan/phase-7-design.md`：第七阶段（任务系统升级）详细设计文档
- `docs/` 下还包含前期阶段设计文档与调研笔记

## 贡献与版权

本项目为华中科技大学课程设计作品，仅供学习交流使用。具体贡献者名单与版权约定以项目内部约定为准。

## 许可证

MIT License
