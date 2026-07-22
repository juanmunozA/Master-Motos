@echo off
setlocal

set "APP_DIR=%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command ^
  "$appDir = '%APP_DIR%';" ^
  "$edge = Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe';" ^
  "if (-not (Test-Path $edge)) { $edge = Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe' };" ^
  "Start-Process -FilePath 'node.exe' -ArgumentList 'backend/server.js' -WorkingDirectory $appDir -WindowStyle Hidden;" ^
  "Start-Sleep -Seconds 2;" ^
  "Start-Process -FilePath $edge -ArgumentList @('--app=http://127.0.0.1:8182/', ('--user-data-dir=' + (Join-Path $appDir '.desktop-profile')));"
