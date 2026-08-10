param(
  [string]$MysqlExe = "mysql",
  [string]$HostName = "127.0.0.1",
  [int]$Port = 3306,
  [string]$User = "root",
  [string]$Database = "hust_world",
  [string]$Password = $env:DB_PASSWORD
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

if ($Password) {
  $plainPassword = $Password
} else {
  $securePassword = Read-Host "请输入 MySQL 密码" -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
  $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

function Invoke-Mysql {
  param(
    [string[]]$ArgsList,
    [string]$InputFile = $null
  )

  $common = @("-h", $HostName, "-P", "$Port", "-u", $User)
  if ($plainPassword) {
    $common += "-p$plainPassword"
  }

  if ($InputFile) {
    Get-Content -Raw -Encoding UTF8 $InputFile | & $MysqlExe @common @ArgsList
  } else {
    & $MysqlExe @common @ArgsList
  }
}

Write-Host "创建数据库 $Database ..."
Invoke-Mysql -ArgsList @("-e", "CREATE DATABASE IF NOT EXISTS ``$Database`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")

Write-Host "清理旧表 ..."
$dropSql = @"
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS
  character_club_tasks,
  character_clubs,
  character_explorations,
  campus_exploration,
  campus_runs,
  battle_records,
  character_elective_courses,
  character_innovation_projects,
  character_items,
  character_skills,
  character_sports_classes,
  character_tasks,
  club_tasks,
  clubs,
  npcs,
  teleport_stations,
  characters,
  users,
  elective_courses,
  innovation_projects,
  items,
  skills,
  sports_classes,
  tasks,
  maps,
  routines;
SET FOREIGN_KEY_CHECKS = 1;
"@
$dropArgs = @("-h", $HostName, "-P", "$Port", "-u", $User)
if ($plainPassword) {
  $dropArgs += "-p$plainPassword"
}
$dropArgs += $Database
$dropSql | & $MysqlExe @dropArgs

$files = @(
  "hust_world_users.sql",
  "hust_world_maps.sql",
  "hust_world_characters.sql",
  "hust_world_clubs.sql",
  "hust_world_club_tasks.sql",
  "hust_world_campus_exploration.sql",
  "hust_world_npcs.sql",
  "hust_world_teleport_stations.sql",
  "hust_world_items.sql",
  "hust_world_skills.sql",
  "hust_world_sports_classes.sql",
  "hust_world_elective_courses.sql",
  "hust_world_innovation_projects.sql",
  "hust_world_tasks.sql",
  "hust_world_routines.sql",
  "hust_world_character_clubs.sql",
  "hust_world_character_club_tasks.sql",
  "hust_world_character_explorations.sql",
  "hust_world_character_items.sql",
  "hust_world_character_skills.sql",
  "hust_world_character_sports_classes.sql",
  "hust_world_character_elective_courses.sql",
  "hust_world_character_innovation_projects.sql",
  "hust_world_character_tasks.sql",
  "hust_world_campus_runs.sql",
  "hust_world_battle_records.sql"
)

foreach ($file in $files) {
  $path = Join-Path $root $file
  if (!(Test-Path $path)) {
    Write-Warning "跳过不存在的文件: $file"
    continue
  }
  Write-Host "导入 $file ..."
  Invoke-Mysql -ArgsList @($Database) -InputFile $path
}

Write-Host "数据库初始化完成：$Database"
