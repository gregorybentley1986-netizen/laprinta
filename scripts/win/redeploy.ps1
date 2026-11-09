# git pull → install → build → restart scheduled production task
$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$taskName = "laprinta-site"
Set-Location $root

Write-Host "== git pull =="
git pull --ff-only origin cursor/laprinta-catalog-site-139e

Write-Host "== npm install =="
npm install

Write-Host "== npm run build =="
npm run build

Write-Host "== restart task $taskName =="
cmd /c "schtasks /Query /TN $taskName >nul 2>&1"
if ($LASTEXITCODE -ne 0) {
  Write-Host "Task missing — running install-autostart.ps1"
  & (Join-Path $PSScriptRoot "install-autostart.ps1")
} else {
  cmd /c "schtasks /End /TN $taskName >nul 2>&1"
  Start-Sleep -Seconds 2
  foreach ($line in (netstat -ano | Select-String ":3000\s+.*LISTENING")) {
    $parts = ($line.ToString() -split '\s+') | Where-Object { $_ -ne '' }
    $pidVal = [int]$parts[-1]
    if ($pidVal -gt 0) { cmd /c "taskkill /PID $pidVal /T /F >nul 2>&1" }
  }
  Start-Sleep -Seconds 1
  cmd /c "schtasks /Run /TN $taskName"
}

Write-Host "Waiting for :3000…"
$ok = $false
for ($i = 0; $i -lt 45; $i++) {
  Start-Sleep -Seconds 1
  $hit = netstat -ano | Select-String ":3000\s+.*LISTENING"
  if ($hit) { $ok = $true; break }
}
if (-not $ok) { throw "Port 3000 did not open after redeploy" }

try {
  $r = Invoke-WebRequest -Uri "http://127.0.0.1:3000/" -UseBasicParsing -TimeoutSec 20
  Write-Host ("OK http://127.0.0.1:3000/ -> {0}" -f [int]$r.StatusCode)
} catch {
  throw "Local probe failed: $($_.Exception.Message)"
}

Write-Host "Redeploy complete."
