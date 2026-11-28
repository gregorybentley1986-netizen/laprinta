# Production Next.js server for laprinta-site (0.0.0.0:3000).
$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $root

$env:NODE_ENV = "production"
# Prefer .env.production.local (gitignored); fall back if missing.
$envFile = Join-Path $root ".env.production.local"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
    $kv = $_.Split("=", 2)
    if ($kv.Length -eq 2) {
      $name = $kv[0].Trim()
      $val = $kv[1].Trim()
      Set-Item -Path "Env:$name" -Value $val
    }
  }
}
if (-not $env:ADMIN_PASSWORD) {
  $env:ADMIN_PASSWORD = "laprinta"
}
if (-not $env:ADMIN_SESSION_SECRET) {
  $env:ADMIN_SESSION_SECRET = $env:ADMIN_PASSWORD
}

$logDir = Join-Path $root "storage\logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir ("next-start-{0:yyyyMMdd}.log" -f (Get-Date))

function Write-Log([string]$msg) {
  $line = "{0:u} {1}" -f (Get-Date), $msg
  Add-Content -Path $log -Value $line
  Write-Host $line
}

Write-Log "starting next start -H 0.0.0.0 -p 3000 in $root"
$node = (Get-Command node).Source
$nextCli = Join-Path $root "node_modules\next\dist\bin\next"
if (-not (Test-Path $nextCli)) {
  Write-Log "ERROR: missing $nextCli — run npm install && npm run build"
  exit 1
}

# Foreground — Task Scheduler keeps the process; crash → RestartOnFailure.
& $node $nextCli start -H 0.0.0.0 -p 3000 *>> $log 2>&1
$exit = $LASTEXITCODE
Write-Log "next start exited with code $exit"
exit $exit
