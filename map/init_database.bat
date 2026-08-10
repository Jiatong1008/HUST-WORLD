@echo off
cd /d "%~dp0"
if "%DB_PASSWORD%"=="" set /p DB_PASSWORD=请输入 MySQL 密码:
npm run db:init
pause
