# HUST WORLD 项目路线图

## 当前阶段

**第十阶段：测试、质量和可部署（已完成）**

下一阶段：**第十一阶段：简历材料沉淀与答辩交付**

## 阶段概览

| 阶段 | 名称 | 状态 | 关键目标 |
|------|------|------|----------|
| 1 | 工程体检与基础修复 | 已完成 | 修复启动问题，确保基础 API 与数据库可用，补充文档 |
| 2 | 架构整理与模块边界 | 已完成 | 拆分路由、服务、仓库，统一错误处理与响应格式 |
| 3 | 账号、角色与存档系统 | 已完成 | 用户注册登录、JWT、角色创建、本地/远程存档、SaveManager/SessionManager |
| 4 | 核心玩法闭环 | 已完成 | 主线任务、支线任务（社团/跑步/探索）、任务日志、存档联动 |
| 5 | 地图系统升级 | 已完成 | POI 任务绑定、地图 UI/标记、室内场景、任务追踪 |
| 6 | NPC 与对话系统 | 已完成 | NPC 配置、对话系统、任务触发/交付、商店购买、地图联动 |
| 7 | 任务系统升级 | 已完成 | 统一任务配置、状态机、目标类型、奖励系统、日志与联动 |
| 8 | 成长、背包和技能系统 | 已完成 | 角色成长、背包物品、技能熟练度、系统联动与数值平衡 |
| 9 | UI/UX 产品化 | 已完成 | 统一视觉规范、基础组件、主界面/地图/对话/任务日志产品化、响应式与动效、展示材料 |
| HUST | HUST 校园特色填充 | 已完成 | POI、NPC 对话/梗、任务、物品、巴士、成就 |
| 10 | 测试、质量和可部署 | **进行中** | 单元/集成/E2E 测试、性能优化、CI/CD、部署文档 |
| 11 | 简历材料沉淀 | 待开始 | 展示页、演示视频、技术总结、课程设计报告、答辩 PPT |

## 第九阶段 9.0 / 9.1 总结

第九阶段已完成 9.0 UI/UX 现状体检、9.1 视觉规范与基础组件统一、9.2 游戏主界面产品化、9.3 地图 UI 产品化、9.4 玩法面板深度打磨、9.5 响应式与动效反馈和 9.6 浏览器验收与展示材料，交付内容如下：

- 9.0 UI/UX 现状体检：梳理当前主要界面清单、问题分类（视觉不统一、按钮/卡片/弹窗不统一、信息层级、移动端、状态反馈、加载空错误状态、中文文案、交互入口），并拆分 9.1~9.6 子阶段。
- 9.1 视觉规范与基础组件：建立 `game/css/ui-theme.css`（HUST 校园 RPG 主题：HUST 蓝 #005BAC、活力绿 #00C9A7、金色 #F5C542、深色背景、面板、卡片、按钮、标签、徽章、进度条、Toast、空/加载/错误状态、响应式基础），以及 `game/js/ui/UIFeedback.js`（无框架轻量反馈工具，含安全兜底）。
- 9.2 游戏主界面产品化：
  - 开始界面：按未登录无游客存档 / 未登录有游客存档 / 已登录无角色 / 已登录有角色 四类状态展示入口，统一使用 `.hw-button-primary` / `.hw-button-secondary` / `.hw-button-ghost`，引入状态标签，文案去调试味。
  - 游戏主 HUD：`game/js/ui/GameDashboardUI.js` + `game/css/game-dashboard.css` 渲染角色、学院、等级、经验/下一级经验、金币、体力、知识、社交、心情、学期/周次/时间、当前位置、追踪任务摘要；数据缺失时显示空状态或默认值，不展示 `undefined`/`null`。
  - 主导航入口：地图、任务日志、背包、成长、技能、保存、设置/返回首页，统一样式并保留现有系统能力。
  - 轻量面板：成长、背包、技能、设置面板；背包可使用物品并刷新 HUD；技能展示未解锁状态；手动保存通过 `UIFeedback` 反馈成功/失败，失败时提示本地兜底。
  - 浏览器测试：新增 `tools/tests/test-game-dashboard.html` / `test-game-dashboard-main.js` / `browser-test-game-dashboard.js` 与 `npm run test:game-dashboard` 命令，覆盖页面加载、HUD 渲染、面板打开、物品使用、手动保存与状态保留。

- 9.3 地图 UI 产品化：
  - 统一地图 HUD：`map/js/ui/MapHUDUI.js` + `map/css/map-ui.css` 渲染玻璃拟态顶部 HUD，展示角色/等级、当前位置/室内场景、追踪任务、体力/心情/金币与快捷操作按钮。
  - 统一 POI 地点面板与室内场景面板：使用 `hw-panel` / `hw-button` / `hw-badge` / `hw-tag` 规范，展示地点标题、类型、描述、NPC、任务列表、操作按钮与返回校园按钮。
  - 统一 NPC 提示：地图与室内场景靠近 NPC 时显示「按 E 与 xxx 交谈」，区分可接任务 / 可交付 / 可交谈状态。
  - 任务追踪标记：当前追踪任务在地图高亮并带脉冲阴影，追踪状态持久化到 `progress`，刷新后恢复。
  - 移动端适配：HUD 使用 `clamp()` / `min()` 压缩，侧栏呼出、缩放按钮、POI 点击区域放大，避免小屏溢出。
  - 测试覆盖：新增 `tools/tests/test-map-ui.html` / `test-map-ui-main.js` / `browser-test-map-ui.js` 与 `npm run test:map-ui` 脚本，并并入 `npm run test:map` 串联执行。

### 第九阶段 9.3 关键文件

| 文件 | 说明 |
|------|------|
| `docs/plan/phase-9-ui-ux-design.md` | 第九阶段设计文档与拆分计划 |
| `game/css/ui-theme.css` | 统一视觉规范与基础组件 |
| `map/css/map-ui.css` | 地图 HUD、面板、地点面板、室内场景面板、NPC 提示样式 |
| `map/js/ui/MapHUDUI.js` | 地图 HUD UI 与面板交互 |
| `map/js/UIManager.js` | 地图 UI 总控与事件同步 |
| `map/js/features/QuestMapIntegration.js` | 任务与地图联动、追踪标记、POI 面板任务区 |
| `map/js/features/MapSceneManager.js` | 室内场景面板与场景切换 |
| `map/js/features/NpcMapUI.js` | 地图 NPC 提示与对话入口 |
| `map/js/main.js` | 地图页面入口，初始化地图 UI 与事件 |
| `map/index.html` | 地图页面结构，引入 `ui-theme.css` 与 `map-ui.css` |
| `tools/tests/test-map-ui.html` | 地图 UI 产品化调试页 |
| `tools/tests/test-map-ui-main.js` | 地图 UI 浏览器测试主逻辑 |
| `tools/tests/browser-test-map-ui.js` | 地图 UI Playwright 浏览器验收 |
| `tools/tests/test-server-helper.js` | 测试服务器启动与关闭辅助工具 |

| 文件 | 说明 |
|------|------|
| `docs/plan/phase-9-ui-ux-design.md` | 第九阶段设计文档与拆分计划 |
| `game/css/ui-theme.css` | 统一视觉规范与基础组件 |
| `game/css/game-dashboard.css` | 游戏主界面 / HUD / 面板 / 导航布局样式 |
| `game/js/ui/UIFeedback.js` | 轻量 UI 反馈工具 |
| `game/js/ui/GameDashboardUI.js` | 游戏主界面 UI：HUD、面板、导航、保存反馈 |
| `game/index.html` | 开始界面与游戏主入口结构 |
| `tools/tests/test-game-dashboard.html` | 游戏主界面调试页 |
| `tools/tests/test-game-dashboard-main.js` | 游戏主界面浏览器测试主逻辑 |
| `tools/tests/browser-test-game-dashboard.js` | 游戏主界面 Playwright 浏览器验收 |

## 第八阶段总结

第八阶段已完成并交付以下内容：

- 8.1 角色成长系统：统一属性模型、升级公式、连续升级、属性边界、旧 `physical` 迁移。
- 8.2 背包与物品使用系统：统一 `progress.inventory`、物品分类与效果、InventoryManager 核心接口、旧 `items` / `inventoryCounts` 迁移。
- 8.3 技能与熟练度系统：统一 `progress.skills`、技能配置与解锁升级、效果加成（exam/running/social/exploration）、旧 `unlockedSkills` / `proficiencies` 迁移。
- 8.4 联动与平衡：统一任务奖励入口、NPC 对话成长反馈、地图场景日常成长、数值平衡。
- 8.5 测试与文档完善：统一测试脚本风格、补齐缺失场景、检查调试页、更新 README / 设计文档 / todo / roadmap，运行全部测试并通过。

### 第八阶段测试矩阵

| 功能域 | 测试脚本 | 覆盖点 |
|--------|----------|--------|
| 角色成长 | `test:growth` | 等级/经验/属性边界/连续升级/旧 `physical` 字段迁移 |
| 背包与物品 | `test:inventory` | 添加/移除/使用/堆叠/不可叠加物品/商店购买/任务奖励/旧 `items` / `inventoryCounts` 迁移 |
| 技能与熟练度 | `test:skills` | 解锁/升级/经验溢出/考试/跑步/社交/探索加成/任务联动/旧 `unlockedSkills` / `proficiencies` 迁移 |
| 任务系统 | `test:quest` | 接取/推进/完成/追踪/NPC 对话/POI 触发/旧存档迁移 |
| 联动与平衡 | `test:linkage` | 任务奖励统一接入成长/背包/技能、NPC 成长反馈、地图场景日常成长、升级后 `maxStamina` 提升 |
| NPC 与商店 | `test:npc` | 对话、地图 NPC、商店购买 |
| 地图系统 | `test:map` | POI 绑定、场景切换、地图 UI 产品化 |
| 地图 UI 产品化 | `test:map-ui` | HUD、POI 面板、NPC 提示、任务追踪、移动端适配 |
| 游戏主界面 | `test:dashboard` | HUD 渲染、成长/背包/技能面板、保存按钮、使用物品 |
| API 冒烟 | `smoke:api` | 注册/登录/角色/存档/跑步等核心接口 |

## 第九阶段目标（UI/UX 产品化）

- 制定统一视觉规范（颜色、字体、间距、圆角、阴影）
- 重新设计游戏主界面与导航
- 打磨地图 UI、地点面板、NPC 提示、任务追踪
- 打磨对话 UI、选项交互、奖励展示
- 打磨任务日志 UI、任务卡片、状态标识
- 移动端触控与布局适配
- 增加过渡动画、反馈 Toast、加载状态
- 建立可复用 UI 组件库

第九阶段 9.4 已完成：对话 UI、任务日志、背包与技能面板现已具备统一的视觉层级、筛选能力、状态提示、键盘操作和移动端布局，并新增 `test:panels-ui` 专项验收。

第九阶段 9.5 已完成：新增 `game/css/responsive-motion.css`，统一游戏页、地图页和关键调试页的移动端边界、触控目标、键盘焦点、滚动容器、进入动效与 `prefers-reduced-motion` 降级规则；新增 `npm run test:responsive`，覆盖 360px/375px 移动端无水平溢出、触控目标高度、焦点可见性、地图侧栏宽度和减少动态效果。下一阶段进入 9.6，重点做真实浏览器验收、文档截图材料与阶段收尾。

第九阶段 9.6 已完成：新增 `npm run test:phase9`，自动访问游戏主界面、移动端背包、校园地图、NPC 对话和任务日志，检查页面错误与水平溢出，并生成 `docs/showcase/screenshots/` 展示截图和 `docs/showcase/reports/phase-9-ui-ux-final-report.json` 验收报告；新增 `docs/showcase/ui-ux-showcase.md`，沉淀截图清单、展示话术和简历亮点。第九阶段至此全部完成，下一阶段进入测试、质量和可部署。

第十阶段 10.0 已完成：新增 `docs/plan/phase-10-quality-deploy.md` 和 `npm run quality:gate`，建立质量门禁，覆盖必要脚本、环境模板、核心文档、展示材料、临时截图残留、JS 语法检查和阶段状态检查；补齐 `.env.example` 的 `SMOKE_API_BASE`，为后续测试矩阵、服务级测试、E2E 稳定化和部署准备打基础。

第十阶段 10.1 已完成：新增 `tools/tests/test-matrix.js` 和三档命令 `test:quick` / `test:standard` / `test:full`，将现有测试整理为快速检查、标准回归和完整回归；新增 `docs/quality/test-matrix.md`，记录执行顺序、使用场景、报告路径和维护原则；矩阵 Runner 会统一传递端口与 base URL，输出 JSON 报告并清理临时截图。

第十阶段 10.2 已完成：新增 `tools/tests/service-level.js` 与 `npm run test:services`，直接调用 services/repositories 验证 auth、character save、running、health 以及角色物品/技能关联读写；`test:standard` 与 `test:full` 已纳入服务级测试，`cleanup:smoke` 增加 `service_user_` 兜底清理，并新增 `docs/quality/backend-service-tests.md` 记录覆盖范围、数据库依赖和后续 service 拆分边界。
第十阶段 10.3 已完成：新增 `tools/tests/browser-test-critical-flows.js` 与 `npm run test:e2e`，覆盖游客本地存档、登录/注册、角色创建、远程存档恢复、地图 POI、任务交付和商店购买；`test:standard` 与 `test:full` 已纳入关键 E2E，浏览器测试统一支持 `PORT` / `BROWSER_TEST_BASE` / `SMOKE_API_BASE`，并修复 E2E 暴露的游戏入口脚本加载、API 别名、地图旧模块统一响应解包和 `/api/exploration/campus` 兼容接口问题。
第十阶段 10.4 已完成：新增统一 `logger`、配置健康检查工具和 `npm run check:config`，服务启动时会明确非法端口、数据库不可用、端口占用等问题；`/api/health` 新增配置摘要，`test:standard` 与 `test:full` 纳入配置健康检查，并新增 `docs/quality/runtime-health.md` 记录日志格式和常见错误处理方式。
第十阶段 10.5 已完成：补充 `docs/quality/deployment-runbook.md`，覆盖 Windows / Node.js、开发数据库、远程 MySQL、端口与故障处理；新增 Dockerfile、Docker Compose、Docker 环境模板，并将 `DB_PORT` 接入数据库连接和配置校验。
第十阶段 10.6 已完成：2026-08-10 在 MySQL 在线环境执行标准矩阵 14/14 与完整矩阵 19/19；新增最终交付检查清单，工程交付已收口。Docker 实际启动需在安装 Docker Desktop 的交付设备上按运行手册完成一次环境验证。

## 长期愿景

将 HUST WORLD 打造成可演示、可部署、可沉淀的校园 RPG 课程设计作品，并在简历与答辩中清晰展示技术选型、架构设计、协作分工与成果。

---

*最后更新：2026-08-10*
