# HUST WORLD 后端服务级测试

本测试用于第十阶段 10.2，目标是在 HTTP 冒烟测试之下补一层更靠近业务代码的验证。它直接调用 `services/` 与 `repositories/`，用于发现路由层不容易定位的业务逻辑、数据库写入和清理问题。

## 命令

```bash
npm run test:services
```

## 覆盖范围

| 模块 | 覆盖点 |
|------|--------|
| `authService` | 注册、登录、JWT 解析、按 ID 查询用户、错误密码拒绝 |
| `characterService` | 创建角色、按用户/角色查询、存档更新、禁止字段过滤、JSON 存档读回、重置存档、缺失角色 404 |
| `characterRepository` | 角色基础表、`characters.game_progress`、`last_saved_at`、物品和技能关联表写入 |
| `runningService` | 跑步记录写入、缺失字段校验、跑步列表、统计数据 |
| `healthService` | 数据库连接健康检查 |

## 数据库依赖

该测试依赖 MySQL 可用，并会调用 `initDatabase()` 确保表结构存在。

默认读取 `.env` 中的：

- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

## 测试数据

脚本会创建临时数据：

- 用户名前缀：`service_user_`
- 物品名前缀：`Service Test Item `
- 技能名前缀：`Service Test Skill `

脚本开始和结束都会清理这些数据。`cleanup:smoke` 也已把 `service_user_` 纳入兜底清理，避免异常中断后留下测试用户。

## 与其他测试的关系

- `smoke:api`：验证 HTTP 层和统一响应格式。
- `test:services`：验证 services/repositories 业务层和数据库写入。
- `test:standard` / `test:full`：已纳入 `test:services`，功能提交和阶段验收时会自动覆盖服务层。

## 后续可扩展方向

当前 `items`、`skills`、`tasks`、`clubs`、`exploration` 等模块仍有部分逻辑在 routes 中直接访问数据库。后续如果继续拆分 service/repository，应优先补充：

- `taskService`：接取、完成、奖励发放、重复接取拒绝。
- `itemService`：商品查询、库存、购买/使用。
- `skillService`：技能查询、学习、升级。
- `clubService`：入社、活动、社团任务。
- `explorationService`：探索点、奖励、进度记录。
