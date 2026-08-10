# HUST WORLD 项目任务清单

## 第一阶段：工程体检与基础修复（已完成）

- [x] 项目结构检查
- [x] 数据库连接检查
- [x] 基础 API 检查
- [x] 修复启动问题
- [x] 文档补充

## 第二阶段：架构整理与模块边界（已完成）

- [x] 路由拆分
- [x] 服务层抽象
- [x] 仓库层创建
- [x] 错误处理中间件
- [x] 响应格式统一

## 第三阶段：账号、角色与存档系统（已完成）

- [x] 用户注册/登录
- [x] JWT 鉴权
- [x] 角色创建
- [x] 存档加载/保存
- [x] 游客模式
- [x] 存档管理器
- [x] 会话管理器
- [x] 测试与文档

## 第四阶段：核心玩法闭环（已完成）

- [x] 主线任务系统
- [x] 支线任务系统（社团/跑步/探索）
- [x] 任务日志 UI
- [x] 任务与地图联动
- [x] 任务与存档联动
- [x] 测试与文档

## 第五阶段：地图系统升级（已完成）

- [x] POI 任务绑定
- [x] 地图任务 UI
- [x] 地图任务标记
- [x] 室内场景系统
- [x] 地图与任务追踪
- [x] 测试与文档

## 第六阶段：NPC 与对话系统（已完成）

- [x] NPC 配置系统
- [x] 对话配置系统
- [x] NpcDialogueUI 组件
- [x] NPC 任务触发/交付
- [x] 商店购买
- [x] NPC 与地图/室内场景联动
- [x] 测试与文档

## 第七阶段：任务系统升级（已完成）

- [x] 统一任务配置结构
- [x] 任务状态机
- [x] 任务目标类型
- [x] 统一奖励系统
- [x] 任务日志 UI 升级
- [x] 任务与 NPC/对话/地图联动
- [x] 测试与文档

## 第八阶段：成长、背包和技能系统（已完成）

- [x] 8.1 角色成长系统
  - [x] 统一属性模型
  - [x] 升级公式与连续升级
  - [x] 升级奖励
  - [x] 统一属性入口
  - [x] 旧 `physical` 迁移
- [x] 8.2 背包与物品使用系统
  - [x] 统一背包数据 `progress.inventory`
  - [x] 物品分类与效果
  - [x] InventoryManager 核心接口
  - [x] 旧 `items` / `inventoryCounts` 迁移
- [x] 8.3 技能与熟练度系统
  - [x] 统一技能数据 `progress.skills`
  - [x] 技能配置与解锁/升级
  - [x] 技能效果加成（exam/running/social/exploration）
  - [x] 旧 `unlockedSkills` / `proficiencies` 迁移
- [x] 8.4 联动与平衡
  - [x] 统一任务奖励入口
  - [x] NPC 对话成长反馈
  - [x] 地图场景日常成长
  - [x] 数值平衡调整
- [x] 8.5 测试与文档完善
  - [x] 审查测试脚本并统一风格
  - [x] 补齐缺失测试场景
  - [x] 检查调试页与 main.js 按钮函数
  - [x] 更新 README.md、phase-8-design.md、todo.md、roadmap.md
  - [x] 运行全部测试并通过
  - [x] 清理测试截图并提交

## 第九阶段：UI/UX 产品化（已完成）

- [x] 9.0 UI/UX 现状体检
- [x] 9.1 视觉规范与基础组件统一
- [x] 9.2 游戏主界面产品化（已完成）
  - [x] 开始界面产品化：四类状态清晰、按钮组件统一、状态标签
  - [x] 游戏主 HUD 产品化：角色/等级/经验/属性/学期/位置/任务摘要
  - [x] 主导航入口产品化：地图、任务、背包、成长、技能、保存、设置
  - [x] 成长/背包/技能轻量面板
  - [x] 手动保存与 UIFeedback 反馈
  - [x] 文案修正，移除调试味文案
  - [x] 浏览器测试 `test:game-dashboard`
- [x] 9.3 地图 UI 产品化（已完成）
  - [x] 统一地图 HUD、侧边面板、地点面板、NPC 提示的圆角/边框/阴影
  - [x] 地图 POI 地点面板和室内场景面板纳入 `hw-panel` 与 `hw-button` 规范
  - [x] 任务追踪标记样式统一、当前追踪任务高亮、引导提示
  - [x] 移动端地图触控适配：缩放按钮、侧栏呼出、NPC/POI 点击区域放大
  - [x] 新增地图 UI 浏览器测试 `test:map-ui` 并接入 `test:map`
- [x] 9.4 对话 / 任务 / 背包 / 技能面板深度打磨（已完成）
  - [x] NPC 对话增加进度、选项键位、条件不足说明和商店购买状态
  - [x] 任务日志增加追踪高亮、键盘选择和可用的详情操作按钮
  - [x] 背包增加分类筛选、数量汇总、效果预览、稀有度与不可用状态
  - [x] 技能增加分类筛选、解锁统计、效果汇总和解锁条件
  - [x] 新增共享 `gameplay-panels.css` 和浏览器测试 `test:panels-ui`
  - [x] 统一 `test:dashboard` / `test:game-dashboard` 脚本别名
- [x] 9.5 响应式与动效反馈（已完成）
  - [x] 新增共享 `responsive-motion.css`
  - [x] 统一游戏页、地图页和关键调试页的移动端水平溢出防护
  - [x] 统一按钮、导航、任务、对话和地图工具的触控目标尺寸
  - [x] 增加键盘 `focus-visible` 可见反馈
  - [x] 增加 `prefers-reduced-motion` 动效降级
  - [x] 新增浏览器测试 `test:responsive`
- [x] 9.7 UI 全面升级与小地图收口（已完成）
  - [x] 修复主线任务卡片 Flex 压缩导致的内容重叠
  - [x] 统一游戏、任务、NPC 与地图字体栈和视觉层级
  - [x] 主 Dashboard 打开面板时隐藏背景 HUD，消除视觉叠层
  - [x] 启用共享小地图：POI、玩家位置、视野框、点击定位、折叠
  - [x] 删除游戏页对 MapEnhancements 的重复脚本加载
  - [x] 新增 `test:ui-layout` 几何重叠回归测试
- [x] 9.6 浏览器验收、文档与截图材料（已完成）
  - [x] 新增第九阶段最终验收脚本 `test:phase9`
  - [x] 自动生成游戏主界面、移动端背包、地图、NPC 对话、任务日志截图
  - [x] 输出 `docs/showcase/reports/phase-9-ui-ux-final-report.json`
  - [x] 新增 `docs/showcase/ui-ux-showcase.md` 展示说明与简历亮点
  - [x] 修正迎新 NPC 展示文案中文化

## 第十阶段：测试、质量和可部署（进行中）

- [x] 10.0 测试与质量基线（已完成）
  - [x] 新增 `docs/plan/phase-10-quality-deploy.md`
  - [x] 新增质量门禁脚本 `tools/tests/quality-gate.js`
  - [x] package.json 新增 `quality:gate`
  - [x] 检查必要脚本、环境模板、核心文档、展示材料、临时截图残留和 JS 语法
  - [x] 补齐 `.env.example` 的 `SMOKE_API_BASE`
- [x] 10.1 自动化测试矩阵整理（已完成）
  - [x] 新增 `tools/tests/test-matrix.js`
  - [x] package.json 新增 `test:quick` / `test:standard` / `test:full`
  - [x] 新增 `docs/quality/test-matrix.md`
  - [x] 矩阵 Runner 输出 `docs/quality/reports/test-matrix-*.json`
  - [x] 自动清理 `tools/tests/*.png` 临时截图
  - [x] `quality:gate` 纳入矩阵命令和文档检查
- [x] 10.2 后端服务级测试补强（已完成）
  - [x] 新增 `tools/tests/service-level.js`
  - [x] package.json 新增 `test:services`
  - [x] 覆盖 authService 注册/登录/JWT/用户查询/错误密码
  - [x] 覆盖 characterService 创建/查询/存档更新/重置/物品技能关联
  - [x] 覆盖 runningService 跑步记录/校验/列表/统计
  - [x] 覆盖 healthService 数据库健康检查
  - [x] `test:standard` / `test:full` 纳入服务级测试
  - [x] 新增 `docs/quality/backend-service-tests.md`
- [x] 10.3 前端关键流程 E2E 稳定化（已完成）
  - [x] 新增 `tools/tests/browser-test-critical-flows.js`
  - [x] package.json 新增 `test:e2e`
  - [x] 覆盖游客本地存档、登录/注册、角色创建、远程存档恢复
  - [x] 覆盖地图 POI、任务接取/完成、商店购买关键链路
  - [x] 接入 `test:standard` / `test:full`
  - [x] cleanup 覆盖 `e2e_user_` 测试数据
- [x] 10.4 日志、错误和配置健康检查（已完成）
  - [x] 新增 `utils/logger.js` 统一日志格式并隐藏敏感字段
  - [x] 新增 `utils/configHealth.js` 集中配置校验和常见错误建议
  - [x] 新增 `npm run check:config`
  - [x] `/api/health` 新增配置健康摘要
  - [x] `server.js` 明确非法端口、数据库降级和端口占用提示
  - [x] `test:standard` / `test:full` 纳入配置健康检查
  - [x] 新增 `docs/quality/runtime-health.md`
- [x] HUST 校园特色填充（已完成）
  - [x] 填充 POI 地点描述与校园地标
  - [x] 新增/完善 NPC 对话与华科梗
  - [x] 按年级学期填充主线/支线任务
  - [x] 新增武汉特色食物与校园物品
  - [x] 成就配置 15 项与 GameDashboardUI 成就面板
  - [x] 新增 `docs/plan/hust-features-integration.md`
  - [x] 更新 README.md HUST 校园特色章节
  - [x] 清理 `.check.mjs` 与测试截图
  - [x] 运行指定测试命令并通过
- [x] 10.5 部署准备与运行文档
  - [x] 生产配置、Windows / Node.js / 远程 MySQL 运行手册
  - [x] Dockerfile、Docker Compose 与容器环境模板
  - [x] 数据库端口配置校验
- [x] 10.6 阶段验收与可交付包
  - [x] 在线标准回归 14/14 通过
  - [x] 在线完整回归 19/19 通过
  - [x] 最终交付检查清单与演示前检查项

## 第十一阶段：简历材料沉淀（待开始）

- [ ] 项目展示页
- [ ] 功能演示视频
- [ ] 技术亮点总结
- [ ] 个人贡献梳理
- [ ] 课程设计报告
- [ ] 答辩 PPT

---

*最后更新：2026-08-10*
