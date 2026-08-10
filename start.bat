@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo ========================================
echo    HUST WORLD - 启动服务
echo ========================================
echo.

REM 检查 Node.js 是否安装
echo [1/4] 检查 Node.js 环境...
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [错误] Node.js 未安装！请先从 https://nodejs.org/ 下载安装
    pause
    exit /b 1
)
echo [OK] Node.js 已安装
node -v

REM 检查依赖是否已安装
echo.
echo [2/4] 检查依赖包...
if not exist "node_modules" (
    echo 依赖缺失，正在安装...
    npm install
    if %ERRORLEVEL% neq 0 (
        echo [错误] 依赖安装失败！
        pause
        exit /b 1
    )
    echo [OK] 依赖安装完成
) else (
    echo [OK] 依赖已存在
)

REM 检查 .env 文件
echo.
echo [3/4] 检查配置文件...
if not exist ".env" (
    echo 配置文件不存在，正在创建默认配置...
    copy ".env.example" ".env"
    echo [OK] 配置文件已创建
) else (
    echo [OK] 配置文件已存在
)

REM 从 .env 中读取实际端口
echo.
for /f "delims=" %%a in ('node tools/get-port.js') do (
    set PORT=%%a
)

REM 启动服务器
echo.
echo [4/4] 启动服务器...
echo.
echo ========================================
echo    服务已启动！
echo    访问地址: http://localhost:%PORT%
echo    按 Ctrl+C 停止服务
echo ========================================
echo.

npm start

pause