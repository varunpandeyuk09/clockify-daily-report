# Create scheduler for auto time sync on laptop open (startup + logon + unlock)
# MUST run as Administrator (right-click PowerShell -> Run as Administrator)
$taskName = "AutoTimeSyncOnLogon"
$scriptPath = Join-Path $PSScriptRoot "sync-time.ps1"

# 0. Admin check - time sync needs admin/SYSTEM
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Write-Host "❌ Please run this file as Administrator (right-click PowerShell -> Run as Administrator)"
  Write-Host "   Time change needs admin rights, normal user task will silently fail."
  exit 1
}

# 1. Remove old broken task (it ran as normal user + blocked on battery + logon-only)
try { Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue } catch {}
cmd /c "schtasks /delete /tn `"$taskName`" /f" 2>&1 | Out-Null

# 2. Ensure w32time service is Automatic so it is alive after reboot
try {
  Set-Service w32time -StartupType Automatic -ErrorAction SilentlyContinue
  Start-Service w32time -ErrorAction SilentlyContinue
  Write-Host "w32time service set to Automatic"
} catch { Write-Host "w32time service setup: $($_.Exception.Message)" }

$psPath = "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"
$action = New-ScheduledTaskAction -Execute $psPath -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""

# Triggers: startup (boot) + logon (fresh login) + unlock (lid open after sleep)
$triggerStartup = New-ScheduledTaskTrigger -AtStartup
$triggerLogon = New-ScheduledTaskTrigger -AtLogOn
$triggers = @($triggerStartup, $triggerLogon)

# Unlock trigger (lid open / Win+L unlock) - this was missing earlier, so sleep-resume never fired
try {
  $unlockTrigger = New-CimInstance -ClassName MSFT_TaskSessionStateChangeTrigger -Namespace Root/Microsoft/Windows/TaskScheduler -Property @{ StateChange = 8 } -ClientOnly
  $triggers += $unlockTrigger
  Write-Host "Added unlock trigger (lid open after sleep)"
} catch {
  Write-Host "⚠️ Unlock trigger could not be added: $($_.Exception.Message)"
  Write-Host "   Startup + Logon triggers will still work."
}

# Battery settings were the 2nd bug: old task had 'No Start On Batteries', so laptop on battery never synced
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 5)

# Run as SYSTEM with highest rights - can change system time without UAC prompt
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

try {
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $triggers -Settings $settings -Principal $principal -Description "Auto sync date/time on startup/logon/unlock (runs sync-time.ps1 as SYSTEM)" -Force | Out-Null
  Write-Host ""
  Write-Host "✅ Task '$taskName' created: Startup + Logon + Unlock, as SYSTEM, works on battery"
  Write-Host "   Log file: $(Join-Path $PSScriptRoot 'sync-time.log')"
  Write-Host "   Test now: powershell -NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
  Write-Host "   Verify: schtasks /query /tn $taskName /v /fo list"
  Write-Host "   Remove: schtasks /delete /tn $taskName /f"
  schtasks /query /tn $taskName /v /fo list 2>&1 | Select-String "TaskName|Schedule Type|Run As|Power" | Out-String | Write-Host
} catch {
  Write-Host "❌ Failed: $($_.Exception.Message)"
  Write-Host "Copy this full error and send me"
}
