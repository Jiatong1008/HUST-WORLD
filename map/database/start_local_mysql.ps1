param(
  [string]$MysqlBaseDir = "F:\MySQL\Install Directory",
  [string]$DataDir = "$env:USERPROFILE\hust_mysql_data",
  [string]$Password = $env:DB_PASSWORD,
  [int]$Port = 3306
)

$ErrorActionPreference = "Stop"

$mysqld = Join-Path $MysqlBaseDir "bin\mysqld.exe"
$mysql = Join-Path $MysqlBaseDir "bin\mysql.exe"

if (!(Test-Path $mysqld)) {
  throw "找不到 mysqld.exe: $mysqld"
}

$listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($listener) {
  Write-Host "MySQL 已在 $Port 端口运行"
  exit 0
}

$firstInit = !(Test-Path $DataDir)
if ($firstInit) {
  New-Item -ItemType Directory -Path $DataDir | Out-Null
  & $mysqld --no-defaults --initialize-insecure --basedir="$MysqlBaseDir" --datadir="$DataDir" --console
  if ($LASTEXITCODE -ne 0) {
    throw "MySQL 数据目录初始化失败"
  }
}

$logPath = Join-Path $DataDir "mysql.err"
$args = "--no-defaults --basedir=`"$MysqlBaseDir`" --datadir=`"$DataDir`" --port=$Port --bind-address=127.0.0.1 --mysqlx=0 --log-error=`"$logPath`""
$process = Start-Process -FilePath $mysqld -ArgumentList $args -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 8

$listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if (!$listener) {
  if (Test-Path $logPath) {
    Get-Content -Tail 80 -Encoding UTF8 $logPath
  }
  throw "MySQL 启动失败"
}

if ($firstInit -and $Password) {
  & $mysql -h 127.0.0.1 -P $Port -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '$Password'; FLUSH PRIVILEGES;"
  if ($LASTEXITCODE -ne 0) {
    throw "root 密码设置失败"
  }
}

Write-Host "MySQL 已启动，端口 $Port"
