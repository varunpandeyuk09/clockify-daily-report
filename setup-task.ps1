# Auto-create Windows Task Scheduler job to run report daily
# Reads REPORT_HOUR/REPORT_MINUTE from .env, defaults to 09:30
$envPath = Join-Path $PSScriptRoot ".env"
$hour = "09"
$minute = "30"
if (Test-Path $envPath) {
  $lines = Get-Content $envPath
  foreach ($l in $lines) {
    if ($l -match "REPORT_HOUR\s*=\s*(\d+)") { $hour = $matches[1].PadLeft(2,'0') }
    if ($l -match "REPORT_MINUTE\s*=\s*(\d+)") { $minute = $matches[1].PadLeft(2,'0') }
  }
}
$time = "$hour`:$minute"
$taskName = "ClockifyDailyReport"
$projectPath = $PSScriptRoot
$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $nodePath) { $nodePath = "C:\Program Files\nodejs\node.exe" }
$nodePath = $nodePath.Replace('"','')
# Use schtasks for compatibility (no admin Principal needed)
$timeFormatted = "$hour`:$minute"
$tr = "daily"
$cmd = "schtasks /create /tn `"$taskName`" /tr `"'$nodePath' index.js`" /sc daily /st $timeFormatted /f"
# schtasks needs working dir via /it? We'll create via PowerShell with simple principal
try {
  $action = New-ScheduledTaskAction -Execute $nodePath -Argument "index.js" -WorkingDirectory $projectPath
  $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday,Tuesday,Wednesday,Thursday,Friday -At $time
  $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Auto Clockify report Mon-Fri 09:30 (Sat/Sun skip)" -Force | Out-Null
  Write-Host "✅ Task '$taskName' created: Mon-Fri at $time (via PowerShell)"
} catch {
  Write-Host "⚠️ PowerShell method failed, trying schtasks..."
  cmd /c "schtasks /create /tn `"$taskName`" /tr `"'$nodePath' index.js`" /sc weekly /d MON,TUE,WED,THU,FRI /st $timeFormatted /f" | Out-Null
  if ($LASTEXITCODE -eq 0) { Write-Host "✅ Task '$taskName' created via schtasks Mon-Fri at $time" }
  else { Write-Host "❌ Failed: $($_.Exception.Message)"; Write-Host "Run PowerShell as Admin and retry" }
}
Write-Host "   Test now: schtasks /run /tn $taskName"
Write-Host "   Remove: schtasks /delete /tn $taskName /f"
Write-Host "   Or double-click run.bat"
