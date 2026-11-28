# Per-user Task Scheduler: production server at logon, restart on failure.
# No admin elevation required (ONLOGON + LeastPrivilege).
$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$startCmd = Join-Path $PSScriptRoot "start-prod.cmd"
$taskName = "laprinta-site"
$xmlPath = Join-Path $env:TEMP "laprinta-site-task.xml"
$user = "$env:USERDOMAIN\$env:USERNAME"
$comSpec = $env:ComSpec

$xml = @"
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>laprinta Next.js production on 0.0.0.0:3000</Description>
    <Author>$([System.Security.SecurityElement]::Escape($user))</Author>
  </RegistrationInfo>
  <Triggers>
    <LogonTrigger>
      <Enabled>true</Enabled>
      <UserId>$([System.Security.SecurityElement]::Escape($user))</UserId>
    </LogonTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <UserId>$([System.Security.SecurityElement]::Escape($user))</UserId>
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>true</StartWhenAvailable>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <Priority>7</Priority>
    <RestartOnFailure>
      <Interval>PT1M</Interval>
      <Count>999</Count>
    </RestartOnFailure>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>$([System.Security.SecurityElement]::Escape($comSpec))</Command>
      <Arguments>/c "`"$([System.Security.SecurityElement]::Escape($startCmd))`""</Arguments>
      <WorkingDirectory>$([System.Security.SecurityElement]::Escape($root))</WorkingDirectory>
    </Exec>
  </Actions>
</Task>
"@

Set-Content -Path $xmlPath -Value $xml -Encoding Unicode
cmd /c "schtasks /Delete /TN $taskName /F >nul 2>&1"
$create = cmd /c "schtasks /Create /TN $taskName /XML `"$xmlPath`" /F"
Write-Host $create
if ($LASTEXITCODE -ne 0) { throw "schtasks /Create failed with $LASTEXITCODE" }

# Free :3000 before first run
foreach ($line in (netstat -ano | Select-String ":3000\s+.*LISTENING")) {
  $parts = ($line.ToString() -split '\s+') | Where-Object { $_ -ne '' }
  $pidVal = [int]$parts[-1]
  if ($pidVal -gt 0) { cmd /c "taskkill /PID $pidVal /T /F >nul 2>&1" }
}

Write-Host "Registered task '$taskName'. Starting…"
cmd /c "schtasks /Run /TN $taskName"
Write-Host "Done."
