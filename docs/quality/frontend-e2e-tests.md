# 前端关键流程 E2E 测试说明

本文档记录第十阶段 10.3 新增的前端关键流程 E2E，用于把分散的调试页验证升级为跨页面、跨系统的真实浏览器回归。

## 命令

```bash
npm run test:e2e
```

默认使用 `PORT=4000`，也可以通过环境变量指定：

```bash
$env:PORT='8080'
npm run test:e2e
```

脚本会优先读取 `BROWSER_TEST_BASE`，其次读取 `SMOKE_API_BASE`，最后使用 `http://localhost:${PORT}`。

## 覆盖范围

| 链路 | 验证内容 |
|------|----------|
| 游客继续游戏 | localStorage 存档识别、继续入口状态、SaveManager 本地读档 |
| 登录与角色 | 注册、SessionManager 会话写入、无角色状态、前端创建角色、currentCharacterId 持久化 |
| 远程存档 | 登录用户 SaveManager 远程模式、保存、读回、刷新后恢复 |
| 地图探索 | `/map` 地点列表、POI 点击、地点详情、浏览器错误检查 |
| 任务交付 | 调试页接取任务、推进任务、完成任务、导出 progress |
| 商店购买 | NPC 调试页购买物品、金币扣除、背包立即刷新 |

## 测试数据

- 测试用户统一使用 `e2e_user_` 前缀。
- 脚本启动前后都会执行 `npm run cleanup:smoke`。
- `cleanup:smoke` 已覆盖 `e2e_user_`，避免测试用户和角色残留。

## 维护原则

- 不写死 4000；新增浏览器测试必须支持 `PORT` / `BROWSER_TEST_BASE` / `SMOKE_API_BASE`。
- 页面错误默认视为失败；只有 favicon 这类无害资源可以显式忽略。
- 临时失败截图只保留在 `tools/tests/*.png`，提交前必须清理。
- 单页调试页测试用于模块覆盖，`test:e2e` 用于关键用户路径覆盖，两者不要互相替代。
