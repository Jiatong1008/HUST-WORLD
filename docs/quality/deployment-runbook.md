# HUST WORLD 运行与部署手册

本文档用于课程设计演示、交付复现和容器化部署。生产环境不得使用 `.env.example` 中的密码或 JWT 示例值。

## 1. 运行前检查

- Node.js 18+；使用 `node -v` 确认版本。
- MySQL 8.0，或 Docker Desktop（可选）。
- 复制 `.env.example` 为 `.env`，按实际环境填写配置。

必须配置的变量：

```env
PORT=8080
SMOKE_API_BASE=http://localhost:8080
DB_HOST=localhost
DB_PORT=3306
DB_USER=hust_app
DB_PASSWORD=<strong-password>
DB_NAME=hust_world
JWT_SECRET=<long-random-secret>
NODE_ENV=production
```

应用启动时会校验 `PORT`、`DB_PORT` 和必要配置。执行下列命令可验证数据库连接：

```bash
npm run check:config
```

## 2. Windows / Node.js 本地运行

```bash
npm ci
copy .env.example .env
# 编辑 .env
node tools/database/start-mysql-dev.js
npm start
```

也可双击 `start.bat` 完成 Node.js、依赖、`.env` 和服务启动检查。开发数据库脚本需保持运行；另开终端执行 `npm start`。服务启动后访问：

- 游戏首页：`http://localhost:8080`
- 地图：`http://localhost:8080/map`
- 健康检查：`http://localhost:8080/api/health`

已有远程 MySQL 时，将 `DB_HOST`、`DB_PORT`、`DB_USER`、`DB_PASSWORD` 和 `DB_NAME` 指向该实例。应用会自动建库、建表和执行现有迁移，因此数据库账号需拥有对应数据库的创建与建表权限。

## 3. Docker Compose 部署

项目提供 `Dockerfile`、`docker-compose.yml` 和 `.env.docker.example`。它会创建 MySQL 8.0 与 Node 应用两个容器，并通过数据库健康检查确保应用只在 MySQL 就绪后启动。

```bash
copy .env.docker.example .env.docker
# 编辑 .env.docker，替换所有示例密码和 JWT 密钥
docker compose up --build -d
docker compose ps
curl http://localhost:8080/api/health
```

查看日志和停止服务：

```bash
docker compose logs -f app
docker compose down
```

`docker compose down` 不会删除命名卷，数据库数据会保留。仅在确认无需保留容器数据库时，才使用 `docker compose down -v`。

## 4. 演示前验收

数据库在线后，按顺序执行：

```bash
npm run check:config
npm run quality:gate
npm run test:standard
npm run test:full
```

验收通过的最低标准：

- `/api/health` 中数据库状态正常，日志中没有 “degraded mode”。
- `quality:gate`、`test:standard`、`test:full` 全部以退出码 0 结束。
- 地图拍照成就遵循：首次拍照解锁 `first_poi_visit`，5 个不同 POI 解锁 `photo_pioneer`。
- 工作区无意外测试截图、临时报告或未提交改动。

## 5. 常见故障

| 现象 | 处理方式 |
|---|---|
| `ECONNREFUSED` | 启动 MySQL，确认 `DB_HOST` 与 `DB_PORT`；本地开发可运行 `node tools/database/start-mysql-dev.js`。 |
| `ER_ACCESS_DENIED_ERROR` | 检查数据库用户名、密码和授权范围。 |
| `EADDRINUSE` | 修改 `.env` 中的 `PORT`，同时更新 `SMOKE_API_BASE`。 |
| 健康检查显示降级 | 数据库尚不可用，不能作为最终交付验收结果。 |
