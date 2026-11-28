# Inbound TCP 3000 for Private profile (LAN phone access).
# Usually needs an elevated PowerShell — if this fails, run the printed command as Admin.
$ErrorActionPreference = "Stop"
$rule = "laprinta-next-3000"
$cmd = 'netsh advfirewall firewall add rule name="laprinta-next-3000" dir=in action=allow protocol=TCP localport=3000 profile=private'

# Remove old rule if present
netsh advfirewall firewall delete rule name=$rule 2>$null | Out-Null

$p = Start-Process -FilePath "netsh" -ArgumentList @(
  "advfirewall", "firewall", "add", "rule",
  "name=$rule", "dir=in", "action=allow", "protocol=TCP",
  "localport=3000", "profile=private"
) -Wait -PassThru -NoNewWindow
if ($p.ExitCode -ne 0) {
  Write-Host "FAILED (exit $($p.ExitCode)). Run elevated PowerShell:"
  Write-Host $cmd
  exit $p.ExitCode
}
Write-Host "OK: firewall rule '$rule' allows TCP 3000 on Private profile."
netsh advfirewall firewall show rule name=$rule
