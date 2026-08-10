# HUST WORLD 自动化测试矩阵

本矩阵用于第十阶段测试、质量和可部署工作。目标是把已有测试脚本整理成清晰、可复用、可解释的三档命令，减少临时截图残留和手动选择测试的成本。

## 三档命令

| 命令 | 使用场景 | 覆盖范围 | 预计耗时 |
|------|----------|----------|----------|
| `npm run test:quick` | 日常小改、提交前快速确认 | 静态质量门禁、游戏主界面、响应式与动效 | 较短 |
| `npm run test:standard` | 功能阶段提交前推荐回归 | 质量门禁、配置健康、API smoke、服务层、主界面、面板、响应式、关键 E2E、NPC、任务系统 | 中等 |
| `npm run test:full` | 大版本、演示前、阶段验收 | 质量门禁、配置健康、API smoke、服务层、地图、NPC、任务、成长、背包、技能、联动、UI 与关键 E2E 全部核心链路 | 较长 |

## 命令详情

### 快速检查

```bash
npm run test:quick
```

顺序：

1. `quality:gate`
2. `test:dashboard`
3. `test:ui-layout`
4. `test:responsive`

### 标准回归

```bash
npm run test:standard
```

顺序：

1. `quality:gate`
2. `check:config`
3. `smoke:api`
4. `cleanup:smoke`
5. `smoke:api`
6. `test:services`
7. `test:dashboard`
8. `test:panels-ui`
9. `test:ui-layout`
10. `test:responsive`
11. `test:e2e`
12. `test:npc`
13. `test:quest`
14. `cleanup:smoke`

### 完整回归

```bash
npm run test:full
```

顺序：

1. `quality:gate`
2. `check:config`
3. `smoke:api`
4. `cleanup:smoke`
5. `smoke:api`
6. `test:services`
7. `test:map`
8. `test:npc`
9. `test:quest`
10. `test:growth`
11. `test:inventory`
12. `test:skills`
13. `test:linkage`
14. `test:dashboard`
15. `test:panels-ui`
16. `test:ui-layout`
17. `test:responsive`
18. `test:e2e`
19. `cleanup:smoke`

## 报告输出

矩阵 Runner 会输出 JSON 报告到：

```text
docs/quality/reports/test-matrix-quick.json
docs/quality/reports/test-matrix-standard.json
docs/quality/reports/test-matrix-full.json
```

报告包含：

- 执行档位
- 开始/结束时间
- 使用端口与 base URL
- 每个脚本的退出码和耗时
- 是否通过
- 自动清理的临时截图列表

## 环境变量

矩阵 Runner 支持并传递以下变量：

- `PORT`：默认 `4000`
- `SMOKE_API_BASE`：默认 `http://localhost:${PORT}`
- `BROWSER_TEST_BASE`：默认 `http://localhost:${PORT}`

示例：

```bash
$env:PORT='4000'
npm run test:standard
```

## 维护原则

- 新增测试脚本后，先加入单项 `npm run test:*` 命令，再决定是否纳入 `quick` / `standard` / `full`。
- `quick` 必须适合高频运行，避免耗时过长。
- `standard` 是功能提交前推荐命令。
- `full` 面向阶段验收、演示前和重大重构后。
- 测试生成的临时 PNG 应留在 `tools/tests`，由矩阵 Runner 自动清理；正式展示截图放在 `docs/showcase/screenshots`。
- `test:phase9` 会刷新正式展示截图和展示报告，保留为第九阶段展示验收命令，不纳入默认矩阵，避免常规回归污染工作区。
- `test:e2e` 覆盖游客本地存档、登录/注册、角色创建、远程存档恢复、地图 POI、任务交付和商店购买，属于标准回归与完整回归的关键链路检查。
- `check:config` 会探测 MySQL 连接，因此只纳入 `standard` / `full`，不纳入无需数据库的 `quick`。
