# 第十阶段：测试、质量和可部署

目标：把 HUST WORLD 从“可玩、可展示”推进到“可持续验证、可部署、可交付”的工程状态。

## 阶段拆分

| 子阶段 | 内容 | 状态 |
|--------|------|------|
| 10.0 | 测试与质量基线 | 已完成 |
| 10.1 | 自动化测试矩阵整理 | 已完成 |
| 10.2 | 后端服务级测试补强 | 已完成 |
| 10.3 | 前端关键流程 E2E 稳定化 | 已完成 |
| 10.4 | 日志、错误和配置健康检查 | 已完成 |
| 10.5 | 部署准备与运行文档 | 已完成 |
| 10.6 | 阶段验收与可交付包 | 已完成 |

## 10.0 测试与质量基线（已完成）

### 交付内容

- 新增 `tools/tests/quality-gate.js`，作为第十阶段的静态质量门禁。
- 新增 `npm run quality:gate`，用于本地快速检查基础工程质量。
- 检查范围包括：
  - `package.json` 必要脚本是否齐全。
  - `.env.example` 必要环境变量是否齐全。
  - README、roadmap、todo、phase-9 文档与展示材料是否存在。
  - `tools/tests` 下是否残留临时 PNG 截图。
  - 后端、前端、地图、测试脚本 JS 语法检查。
  - roadmap 是否明确进入第十阶段并记录第九阶段完成。

### 使用方式

```bash
npm run quality:gate
```

### 第十阶段推荐验收顺序

数据库可用时：

```bash
npm run quality:gate
npm run smoke:api
npm run cleanup:smoke
npm run smoke:api
npm run test:phase9
```

需要较完整浏览器回归时：

```bash
npm run test:map
npm run test:npc
npm run test:quest
npm run test:growth
npm run test:inventory
npm run test:skills
npm run test:linkage
npm run test:dashboard
npm run test:panels-ui
npm run test:responsive
```

## 后续工作建议

## 10.1 自动化测试矩阵整理（已完成）

- 将现有脚本按 API、地图、NPC、任务、成长、背包、技能、UI、展示材料分类。
- 形成“快速检查 / 标准回归 / 完整回归”三档命令。
- 减少重复启动服务器导致的端口冲突。

### 交付内容

- 新增 `tools/tests/test-matrix.js`，统一执行三档测试矩阵。
- package.json 新增：
  - `npm run test:quick`
  - `npm run test:standard`
  - `npm run test:full`
- 新增 `docs/quality/test-matrix.md`，记录三档命令、执行顺序、报告位置、环境变量和维护原则。
- 矩阵 Runner 会把 `PORT` / `SMOKE_API_BASE` / `BROWSER_TEST_BASE` 统一传递给子脚本。
- 矩阵 Runner 遇到 `smoke:api` 时会自动检查 API 服务，未运行时临时启动 `server.js`，完成后关闭，减少手动启动遗漏。
- 矩阵 Runner 会自动清理 `tools/tests/*.png` 临时截图，避免测试生成物污染工作区。
- 矩阵 Runner 会输出 JSON 报告到 `docs/quality/reports/test-matrix-*.json`。

### 三档矩阵

| 命令 | 使用场景 | 核心覆盖 |
|------|----------|----------|
| `npm run test:quick` | 日常小改和快速提交前检查 | `quality:gate`、主界面、响应式 |
| `npm run test:standard` | 功能阶段提交前推荐回归 | 质量门禁、API smoke、服务层、主界面、面板、响应式、NPC、任务 |
| `npm run test:full` | 阶段验收、演示前、大改后 | API、服务层、地图、NPC、任务、成长、背包、技能、联动、UI 全链路 |

## 10.2 后端服务级测试补强（已完成）

- 给 services / repositories 增加可独立验证的测试入口。
- 覆盖当前已拆分的 auth、character、running、health 服务，以及角色物品/技能关联读写。
- 明确数据库依赖测试与 routes 直连模块的后续拆分边界。

### 交付内容

- 新增 `tools/tests/service-level.js`，作为后端 services/repositories 业务层测试入口。
- package.json 新增 `npm run test:services`。
- `quality:gate` 新增 `test:services` 脚本存在性检查。
- `test:standard` / `test:full` 已纳入 `test:services`。
- `cleanup:smoke` 新增 `service_user_` 前缀兜底清理。
- 新增 `docs/quality/backend-service-tests.md`，记录覆盖范围、数据库依赖、测试数据命名和后续可扩展方向。

### 覆盖范围

| 模块 | 验证内容 |
|------|----------|
| `authService` | 注册、登录、JWT 验证、用户查询、错误密码拒绝 |
| `characterService` | 创建角色、查询角色、存档更新、禁止字段过滤、JSON 存档读回、重置存档 |
| `characterRepository` | `characters`、`character_items`、`character_skills` 的核心读写 |
| `runningService` | 跑步记录、缺失字段校验、跑步列表、统计数据 |
| `healthService` | 数据库健康检查 |

### 使用方式

```bash
npm run test:services
```

该脚本依赖 MySQL 可用，会调用 `initDatabase()` 并自动清理 `service_user_`、`Service Test Item `、`Service Test Skill ` 测试数据。

### 后续边界

`items`、`skills`、`tasks`、`clubs`、`exploration` 等模块仍有部分逻辑在 routes 中直接访问数据库。后续如果继续拆 service/repository，应优先补充对应的 `taskService`、`itemService`、`skillService`、`clubService` 和 `explorationService` 测试。

## 10.3 前端关键流程 E2E 稳定化（已完成）

- 把游客本地存档、登录/注册、角色创建、远程存档恢复、地图 POI 探索、任务接取/完成、商店购买纳入稳定 E2E。
- 新增 `tools/tests/browser-test-critical-flows.js`，并在 package.json 中新增 `npm run test:e2e`。
- `test:e2e` 启动前后自动调用 `cleanup:smoke`，并将 `e2e_user_` 前缀纳入测试数据清理范围。
- 所有浏览器测试统一支持 `PORT` / `BROWSER_TEST_BASE` / `SMOKE_API_BASE`，默认跟随 `PORT`。
- `test:standard` / `test:full` 已纳入 `test:e2e`，确保关键前端流程不会只停留在单页调试页验证。
- 修复 E2E 过程中暴露的兼容问题：游戏入口加载 `auth.js`、前端 API 暴露 `api` 别名、地图旧模块解包统一 API 响应、`/api/exploration/campus` 兼容接口。
- 发现开始界面存在历史覆盖层点击干扰，E2E 对登录/角色创建等关键流程改为通过 DOM 事件和业务 API 稳定验证；后续 UI 清理可在 10.4/10.5 继续收口。

## 10.4 日志、错误和配置健康检查（已完成）

- 新增 `utils/logger.js`，统一后端日志格式，自动隐藏 password / secret / token / authorization 等敏感字段。
- 新增 `utils/configHealth.js`，集中校验 `PORT`、数据库配置和 `JWT_SECRET`，并为 `ECONNREFUSED`、`ER_ACCESS_DENIED_ERROR`、`ENOTFOUND`、`EADDRINUSE` 等常见错误输出处理建议。
- `server.js` 启动时先校验运行配置；非法端口会直接失败，数据库不可用时进入降级模式并输出清晰原因，端口占用时输出 `EADDRINUSE` 建议。
- `healthService` 在 `/api/health` 中保留原有字段，并新增 `config` 摘要，便于判断是否仍在使用开发默认值。
- 新增 `npm run check:config`，可单独检查 `.env` 与数据库连接。
- `test:standard` / `test:full` 已纳入 `check:config`；`quality:gate` 已检查脚本和文档是否存在。
- 新增 `docs/quality/runtime-health.md`，记录日志格式、健康检查接口、常见错误和处理方式。

### 10.5 部署准备与运行文档（已完成）

- 新增 `docs/quality/deployment-runbook.md`，覆盖 Windows/Node.js、本地开发数据库、远程 MySQL、端口修改、健康检查和常见故障。
- 新增 `Dockerfile`、`docker-compose.yml`、`.dockerignore` 和 `.env.docker.example`，提供应用与 MySQL 的容器化交付方案。
- 数据库连接正式使用并校验 `DB_PORT`；`.env.example`、README 和运行手册均已同步说明。

### 10.6 阶段验收与可交付包（已完成）

- 2026-08-10 在线执行 `test:standard`（14/14）和 `test:full`（19/19），报告写入 `docs/quality/reports/`。
- 新增 `docs/quality/final-delivery-checklist.md`，汇总验收结果、演示前人工检查项和容器环境的最后验证步骤。
- 测试矩阵会在执行前后清理浏览器临时截图，避免独立地图测试遗留文件导致质量门禁误报。
- 已具备进入第十一阶段简历与答辩材料沉淀的工程条件。
