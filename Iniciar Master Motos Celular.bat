@echo off
setlocal

set "APP_DIR=%~dp0"
set "MOBILE_PORT=8183"

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$appDir = '%APP_DIR%';" ^
  "$port = '%MOBILE_PORT%';" ^
  "$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' } | Sort-Object InterfaceMetric | Select-Object -First 1 -ExpandProperty IPAddress);" ^
  "if (-not $ip) { $ip = 'IP-DE-TU-PC' };" ^
  "$url = 'http://' + $ip + ':' + $port + '/';" ^
  "$url | Set-Content -Path (Join-Path $appDir 'URL Master Motos Celular.txt') -Encoding UTF8;" ^
  "Write-Host 'Preparando version actualizada...';" ^
  "Push-Location $appDir;" ^
  "& 'C:\Program Files\nodejs\npm.cmd' run build;" ^
  "if ($LASTEXITCODE -ne 0) { Read-Host 'No se pudo generar el build. Presiona ENTER para cerrar'; exit $LASTEXITCODE };" ^
  "Pop-Location;" ^
  "$busy = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue;" ^
  "if (-not $busy) {" ^
  "  $env:HOST = '0.0.0.0';" ^
  "  $env:PORT = $port;" ^
  "  Start-Process -FilePath 'node.exe' -ArgumentList 'backend/server.js' -WorkingDirectory $appDir -WindowStyle Hidden;" ^
  "} else {" ^
  "  Write-Host ('El puerto ' + $port + ' ya esta ejecutando Master Motos o algun servidor.');" ^
  "};" ^
  "Start-Sleep -Seconds 2;" ^
  "Write-Host '';" ^
  "Write-Host 'Master Motos para celular iniciado.';" ^
  "Write-Host ('Abre esta URL en tu celular: ' + $url);" ^
  "Write-Host '';" ^
  "Write-Host 'El celular debe estar conectado a la misma red Wi-Fi del PC.';" ^
  "Write-Host 'Si Windows pregunta por firewall, permite Node.js en redes privadas.';" ^
  "Write-Host '';" ^
  "Read-Host 'Presiona ENTER para cerrar esta ventana'"
