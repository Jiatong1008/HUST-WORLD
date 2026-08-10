# HUST World 数据库初始化

本目录包含课程设计新增玩法所需的 MySQL 表结构和种子数据。

## 初始化

在项目根目录双击：

```text
init_database.bat
```

或在 PowerShell 中执行：

```powershell
.\database\init_database.ps1
```

脚本会创建 `hust_world` 数据库，清理旧表，并按外键依赖顺序导入本目录下的 SQL 文件。

## 启动后端

安装依赖并启动：

```powershell
npm install
$env:DB_PASSWORD="你的MySQL密码"
$env:DB_PASSWORD="你的MySQL密码"; npm run db:init
npm start
```

浏览器打开：

```text
http://localhost:3000/index.html
```

默认连接配置见项目根目录 `.env.example`。当前 `server.js` 直接读取环境变量，不强制依赖 `.env` 文件。

如果系统 MySQL 服务启动不了，可以使用项目提供的本地实例启动脚本：

```powershell
$env:DB_PASSWORD="你的MySQL密码"
.\database\start_local_mysql.ps1
```
