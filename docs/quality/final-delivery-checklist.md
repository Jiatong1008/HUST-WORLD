# HUST WORLD 最终交付检查清单

## 本次验收记录（2026-08-10）

| 项目 | 结果 | 证据 |
|---|---|---|
| 静态质量门禁 | 通过 | `npm run quality:gate` |
| 数据库健康检查 | 通过 | `npm run check:config`，本地 MySQL 3306 在线 |
| 标准在线回归 | 14/14 通过 | `docs/quality/reports/test-matrix-standard.json` |
| 完整在线回归 | 19/19 通过 | `docs/quality/reports/test-matrix-full.json` |
| 拍照成就 | 通过 | 地图 UI 浏览器验收覆盖首次及 5 个不同 POI 的里程碑 |

## 交付前人工检查

- [ ] 在演示设备上确认 Node.js 18+ 与 MySQL 或 Docker Desktop 可用。
- [ ] 使用非默认 `DB_PASSWORD` 与 `JWT_SECRET`；禁止提交 `.env`、`.env.docker`。
- [ ] 执行 `npm run test:full`，确认报告的 `passed` 为 `true`。
- [ ] 打开 `/api/health`，确认数据库正常而非降级模式。
- [ ] 演示游戏首页、地图 POI、NPC 对话、商店、任务、背包和成就。
- [ ] 准备 README、运行与部署手册、测试矩阵报告和展示截图。

## 容器交付说明

已提供 `Dockerfile`、`docker-compose.yml`、`.dockerignore` 和 `.env.docker.example`。当前验收主机未安装 Docker，因而未执行容器实际启动；在具备 Docker Desktop 的交付设备上，按 [运行与部署手册](deployment-runbook.md) 执行 `docker compose up --build -d` 后检查 `/api/health` 即可完成最后一项环境验证。
