# 清理 HUST WORLD 本地开发环境产生的临时/重复文件
# 用法：在 PowerShell 中执行： .\tools\cleanup-local-dev.ps1

$base = Split-Path -Parent $PSScriptRoot

$targets = @(
    # map 下重复的旧 MySQL 数据目录（项目真正使用的是根目录 mysql-data）
    Join-Path $base "map\.mysql-data"
    # 旧日志目录
    Join-Path $base "logs"
    # 根目录下的旧日志文件
    Join-Path $base "server.err.log"
    Join-Path $base "server.out.log"
    Join-Path $base "demo-server-4100.err.log"
    Join-Path $base "demo-server-4100.out.log"
)

foreach ($t in $targets) {
    if (Test-Path $t) {
        Remove-Item -LiteralPath $t -Recurse -Force -ErrorAction Stop
        Write-Host "已删除：$t"
    } else {
        Write-Host "已不存在，跳过：$t"
    }
}

Write-Host "清理完成。可释放约 180MB 空间（主要来自 map\.mysql-data）。"
