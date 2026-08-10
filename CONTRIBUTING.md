# Contributing

## Local setup

```bash
npm ci
Copy-Item .env.example .env
npm start
```

需要完整 API/数据库测试时，再启动本地 MySQL 开发实例：

```bash
node tools/database/start-mysql-dev.js
```

## Before opening a Pull Request

```bash
npm run test:quick
```

涉及地图、任务、存档或服务端逻辑时，请运行：

```bash
npm run test:standard
```

## Commit conventions

- `feat:` 新功能
- `fix:` 缺陷修复
- `docs:` 文档调整
- `test:` 测试调整
- `ci:` 自动化与仓库配置
- `refactor:` 不改变行为的代码整理

不要提交 `.env`、数据库数据目录、`node_modules` 或浏览器测试生成的临时截图。
