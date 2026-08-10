# 运行时健康检查与错误诊断

本文档记录第十阶段 10.4 的运行时日志、配置健康检查和常见错误诊断约定。

## 命令

```bash
npm run check:config
```

该命令会完成两类检查：

- 读取 `.env` 并校验 `PORT`、`DB_HOST`、`DB_USER`、`DB_PASSWORD`、`DB_NAME`、`JWT_SECRET`。
- 使用当前数据库配置执行 `SELECT 1`，确认 MySQL 可连接。

## 日志格式

后端新增轻量 `logger`，输出格式统一为：

```text
[ISO_TIMESTAMP] [LEVEL] message {"key":"value"}
```

日志会自动隐藏 `password`、`secret`、`token`、`authorization` 等敏感字段。

可通过 `LOG_LEVEL` 控制输出级别：

```env
LOG_LEVEL=info
```

支持 `debug`、`info`、`warn`、`error`，默认 `info`。

## 启动诊断

`server.js` 启动时会先执行配置校验：

- `PORT` 非法时直接退出，并输出原因。
- 数据库连接失败时服务会以降级模式启动，`/api/health` 中 `database` 为 `error`。
- 端口被占用时会输出 `EADDRINUSE` 和处理建议。

常见错误说明：

| 错误码 | 含义 | 处理方式 |
|------|------|----------|
| `ECONNREFUSED` | MySQL 未启动或端口不可达 | 启动 MySQL80，或运行开发数据库脚本 |
| `ER_ACCESS_DENIED_ERROR` | MySQL 用户名或密码错误 | 检查 `.env` 中 `DB_USER` / `DB_PASSWORD` |
| `ENOTFOUND` | 数据库主机无法解析 | 检查 `.env` 中 `DB_HOST` |
| `EADDRINUSE` | 服务端口已被占用 | 结束占用进程，或修改 `.env` 中 `PORT` |
| `ER_BAD_DB_ERROR` | 数据库不存在或无权限创建 | 检查 `DB_NAME` 和 MySQL 用户权限 |

## 健康检查接口

```bash
curl http://localhost:8080/api/health
```

返回中保留原有字段，并新增配置摘要：

```json
{
  "success": true,
  "data": {
    "service": "HUST WORLD",
    "status": "ok",
    "database": "ok",
    "config": {
      "status": "warning",
      "warningCount": 2,
      "errorCount": 0,
      "port": 8080,
      "dbHost": "localhost",
      "dbName": "hust_world"
    }
  }
}
```

`config.status` 为 `warning` 时通常表示仍在使用开发默认值；本地开发可接受，部署前应修正。
